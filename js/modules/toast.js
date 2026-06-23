// =========================================================
// Pixoris v4 — Toast UI Module
// =========================================================

export const showToast = (msg, duration = 2200) => {
  const toast = document.querySelector('[data-toast]');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
};

export const showAdminToast = showToast; // alias for admin panel
