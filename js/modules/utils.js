// =========================================================
// Pixoris v4 — Utils Module
// =========================================================
// Global utility functions exposed on window.Pixoris.utils
// =========================================================

export const toman = (num) => {
  const safe = Number(num) || 0;
  try { return new Intl.NumberFormat('fa-IR').format(safe) + ' تومان'; }
  catch (e) { return safe.toLocaleString() + ' تومان'; }
};

export const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export const formatDate = (dateStr) => {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric', month: 'long', day: 'numeric'
    }).format(new Date(dateStr));
  } catch { return ''; }
};

export const formatDateTime = (dateStr) => {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateStr));
  } catch { return dateStr || ''; }
};

export const truncate = (str, max = 80) => {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
};

export const slugify = (str) => {
  return String(str).trim()
    .replace(/[\s\u0600-\u06FF]+/g, '-')
    .replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, '')
    .replace(/-+/g, '-')
    .toLowerCase();
};

export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const qs = (sel, ctx = document) => ctx.querySelector(sel);
export const qsa = (sel, ctx = document) => ctx.querySelectorAll(sel);
