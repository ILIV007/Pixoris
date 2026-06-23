// =========================================================
// Pixoris v4 — Frontend Entry Point
// =========================================================
// This file imports all modules and initializes the app.
// Loaded via: <script type="module" src="js/script.js"></script>
// =========================================================

import { API_BASE } from './modules/api.js';
import { qs, qsa } from './modules/utils.js';
import { showToast } from './modules/toast.js';
import { Cart } from './modules/cart.js';
import { DynamicContent } from './modules/content.js';
import { PixelMode, AudioSystem, MobileMenu, ScrollReveal, NavActive, Auth, PasswordToggle } from './modules/ui.js';

// Expose globally for inline onclick handlers
window.API_BASE = API_BASE;
window.PixorisToast = showToast;

// ============= INIT =============
document.addEventListener('DOMContentLoaded', () => {
  Cart.updateCount();
  Auth.updateUI();
  Auth.initForm();
  PixelMode.init();
  AudioSystem.init();
  MobileMenu.init();
  ScrollReveal.init();
  NavActive.init();
  PasswordToggle.init();
  DynamicContent.init();
  Cart.renderPage();

  // Bind any static [data-add-to-cart] buttons
  qsa('[data-add-to-cart]').forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => Cart.add(btn.dataset.addToCart));
    }
  });
});
