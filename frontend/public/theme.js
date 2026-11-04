// Apply the saved light/dark theme before the page shows, so it doesn't flash.
// A separate file (not inline in index.html) so the server's Content-Security-Policy can block inline scripts.
try {
  var saved = localStorage.getItem('theme');
  var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
} catch (e) {
  document.documentElement.dataset.theme = 'light';
}
