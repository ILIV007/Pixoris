// =========================================================
// Pixoris v4 — API Client Module
// =========================================================
// Centralized API client with error handling, retry, and caching
// =========================================================

export const API_BASE = window.API_BASE || 'https://dev.pixoris.workers.dev';
window.API_BASE = API_BASE;

export const apiFetch = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('pixorisAdminToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Network error' }));
      return { success: false, error: errData.error || `HTTP ${res.status}` };
    }
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

export const apiFetchCached = async (endpoint, ttl = CACHE_TTL) => {
  const cached = cache.get(endpoint);
  if (cached && Date.now() - cached.ts < ttl) {
    return cached.data;
  }
  const data = await apiFetch(endpoint);
  if (data.success !== false) {
    cache.set(endpoint, { data, ts: Date.now() });
  }
  return data;
};

export const clearCache = (endpoint = null) => {
  if (endpoint) cache.delete(endpoint);
  else cache.clear();
};

// Admin API client (uses admin token)
export const adminApiFetch = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('pixorisAdminToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('pixorisAdminToken');
      localStorage.removeItem('pixorisAdminRole');
      return { success: false, error: 'نشست منقضی شده — لطفاً دوباره وارد شوید' };
    }
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: 'خطای شبکه: ' + err.message };
  }
};
