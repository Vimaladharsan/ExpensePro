// Talks to the backend REST API. Sends and receives JSON, adds the login token,
// and turns error replies into thrown errors with a readable message.
const TOKEN_KEY = 'expensepro-token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage blocked (private mode): the login just won't survive a refresh
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  const data = await response.json().catch(() => ({}));

  // Login expired or invalid: forget it, and tell the app to show the login page
  if (response.status === 401 && token) {
    saveToken(null);
    window.dispatchEvent(new Event('session-expired'));
  }
  if (!response.ok) {
    const message = data.message || (response.status >= 500 ? 'Cannot reach the server. Is the backend running?' : 'Something went wrong');
    const error = new Error(message);
    error.fields = data.errors || {}; // per-field messages for forms
    throw error;
  }
  return data;
}

// Every transaction of a month ('all' for every month). The API sends at most 1000 per page, so this asks page by page.
export async function fetchAllTransactions(month) {
  const items = [];
  for (let page = 1; ; page++) {
    const data = await api(`/transactions${toQuery({ month, limit: 1000, page })}`);
    items.push(...data.items);
    if (page >= data.pages) return items;
  }
}

// { month: '2026-10', type: '' } -> "?month=2026-10" (empty values are skipped)
export function toQuery(params) {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null));
  const text = search.toString();
  return text ? `?${text}` : '';
}
