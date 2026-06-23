// =========================================================
// Pixoris v4 — Cart Module
// =========================================================
// localStorage-based shopping cart
// =========================================================

import { apiFetch } from './api.js';
import { showToast } from './toast.js';
import { toman, escapeHtml, qs, qsa } from './utils.js';

const CART_KEY = 'pixorisCart';

export const Cart = {
  get: () => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '{}'); }
    catch { return {}; }
  },

  save: (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    Cart.updateCount();
  },

  updateCount: () => {
    const cart = Cart.get();
    const count = Object.values(cart).reduce((s, q) => s + q, 0);
    qsa('[data-cart-count]').forEach(el => el.textContent = count);
  },

  add: (id, qty = 1) => {
    const cart = Cart.get();
    cart[id] = (cart[id] || 0) + qty;
    Cart.save(cart);
    showToast('به سبد خرید اضافه شد ✅');
    Cart.renderPage();
  },

  changeQty: (id, delta) => {
    const cart = Cart.get();
    cart[id] = (cart[id] || 0) + delta;
    if (cart[id] <= 0) delete cart[id];
    Cart.save(cart);
    Cart.renderPage();
  },

  remove: (id) => {
    const cart = Cart.get();
    delete cart[id];
    Cart.save(cart);
    Cart.renderPage();
    showToast('محصول حذف شد');
  },

  clear: () => {
    localStorage.removeItem(CART_KEY);
    Cart.updateCount();
    Cart.renderPage();
    showToast('سبد خرید خالی شد');
  },

  checkout: () => {
    showToast('پرداخت فعلاً نمایشی است — به‌زودی درگاه واقعی متصل می‌شود.');
  },

  renderPage: async () => {
    const host = qs('[data-cart-page]');
    if (!host) return;

    const cart = Cart.get();
    const ids = Object.keys(cart);
    if (!ids.length) {
      host.innerHTML = `
        <div class="empty-cart">
          <h3>سبد خریدت خالیه 👾</h3>
          <p>از فروشگاه Pixoris چند آیتم گیکی انتخاب کن.</p>
          <a class="btn" href="shop.html">رفتن به فروشگاه</a>
        </div>`;
      return;
    }

    // Fetch product details from API
    const result = await apiFetch('/api/products');
    const allProducts = result.success ? result.products : [];
    let total = 0;

    const rows = ids.map(id => {
      const p = allProducts.find(x => x.slug === id);
      if (!p) return '';
      const qty = cart[id];
      const sub = p.price * qty;
      total += sub;
      return `
        <tr>
          <td>
            <div class="cart-product">
              <img src="${p.image_url || 'assets/svg/card-shop.svg'}" alt="${escapeHtml(p.title)}">
              <div>
                <strong>${escapeHtml(p.title)}</strong>
                <div class="meta"><span>${escapeHtml(p.category || '')}</span></div>
              </div>
            </div>
          </td>
          <td>${toman(p.price)}</td>
          <td>
            <div class="qty-control">
              <button onclick="PixorisCart.changeQty('${id}', -1)">−</button>
              <strong>${qty}</strong>
              <button onclick="PixorisCart.changeQty('${id}', 1)">+</button>
            </div>
          </td>
          <td>${toman(sub)}</td>
          <td><button class="remove-btn" onclick="PixorisCart.remove('${id}')">حذف</button></td>
        </tr>`;
    }).join('');

    host.innerHTML = `
      <table class="cart-table">
        <thead>
          <tr><th>محصول</th><th>قیمت</th><th>تعداد</th><th>جمع</th><th></th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="cart-summary">
        <div>
          <p>جمع کل سبد خرید</p>
          <strong>${toman(total)}</strong>
        </div>
        <div class="hero-actions">
          <button class="btn" onclick="PixorisCart.checkout()">ادامه خرید / پرداخت نمایشی</button>
          <button class="btn btn-outline" onclick="PixorisCart.clear()">خالی کردن سبد</button>
        </div>
      </div>`;
  }
};

// Expose globally for inline onclick handlers
window.PixorisCart = Cart;
