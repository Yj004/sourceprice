const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const AUTH_STORAGE_KEY = 'sourceprice.auth.user';

const clearStoredAuth = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // no-op
  }
};

export const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
};

const authHeaders = () => {
  const auth = getStoredAuth();
  const headers = { 'Content-Type': 'application/json' };
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
  return headers;
};

const request = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      clearStoredAuth();
    }
    const msg = data.error || data.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
};

const publicRequest = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.error || data.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
};

export const api = {
  login: (email, password) =>
    publicRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getProducts: () => request('/products'),
  getHistory: () => request('/history'),
  updatePrice: (asin, newPrice, updatedBy) =>
    request(`/products/${encodeURIComponent(asin)}/price`, {
      method: 'PATCH',
      body: JSON.stringify({ newPrice, updatedBy }),
    }),
  updateProduct: (asin, updates, updatedBy, options = {}) =>
    request(`/products/${encodeURIComponent(asin)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        updates,
        updatedBy,
        suppressEmail: Boolean(options.suppressEmail),
      }),
    }),
  notifyCategoryTeamCostBatch: (payload) =>
    request('/notifications/category-team-cost', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getUsers: () => request('/users'),
  createUser: (email, password) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  deleteUser: (email) =>
    request(`/users/${encodeURIComponent(email)}`, { method: 'DELETE' }),
};

export default api;
