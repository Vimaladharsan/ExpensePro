import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, saveToken } from '../api.js';

// Keeps the logged-in user available to every page
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken())); // checking a saved login on page load

  // On page load, check that the saved login token is still valid
  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then(setUser)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // api.js fires this when the server says the login expired
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('session-expired', onExpired);
    return () => window.removeEventListener('session-expired', onExpired);
  }, []);

  async function login(email, password) {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password) {
    const data = await api('/auth/register', { method: 'POST', body: { name, email, password } });
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    saveToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, register, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
