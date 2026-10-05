import axios from 'axios';

const TOKEN_KEY = 'sugarloop.token';

// Storage can throw (private mode, blocked site data), so guard every access.
export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token) => {
    try {
      token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* session-only login */
    }
  },
};

const api = axios.create({ baseURL: '/api' });

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// Identifies this tab so live updates can skip changes it made itself.
// (crypto.randomUUID is missing on plain-http LAN addresses, hence the fallback.)
export const CLIENT_ID = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Client-Id'] = CLIENT_ID;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.startsWith('/auth/login')) onUnauthorized();
    return Promise.reject(err);
  }
);

export const errorMessage = (err, fallback = 'Something went wrong') => err?.response?.data?.message || fallback;

export default api;
