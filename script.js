// =========================================================
// Pixoris Frontend v2.2
// Fixes:
//   • API_BASE declared once via window (no duplicate error)
//   • Dynamic homepage / news / shop / product / article
//   • Skeleton loaders + error states
//   • SEO meta tag injection for articles
//   • Pagination support
//   • Better cart + auth UX
// =========================================================

// ============= API_BASE (idempotent — safe to include in both script.js and admin.js) =============
window.API_BASE = window.API_BASE || 'https://dev.pixoris.workers.dev';
const API_BASE = window.API_BASE;

// ============= UTILS =============
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

const toman = (num) => {
  const safe = Number(num) || 0;
  try { return new Intl.NumberFormat('fa-IR').format(safe) + ' تومان'; }
  catch (e) { return safe.toLocaleString() + ' تومان'; }
};

const showToast = (msg, duration = 2000) => {
  const toast = $('[data-toast]');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
};

const apiFetch = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('pixorisAdminToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
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

const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const formatDate = (dateStr) => {
  try {
    return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dateStr));
  } catch { return ''; }
};

// SEO meta tag injection
const setMeta = (name, content, attr = 'name') => {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const setSEO = ({ title, description, image, canonical, type = 'article' }) => {
  if (title) document.title = title;
  if (description) setMeta('description', description);
  setMeta('og:title', title || 'Pixoris', 'property');
  setMeta('og:description', description || '', 'property');
  setMeta('og:type', type, 'property');
  setMeta('og:image', image || '', 'property');
  setMeta('twitter:card', image ? 'summary_large_image' : 'summary');
  setMeta('twitter:title', title || 'Pixoris');
  setMeta('twitter:description', description || '');
  if (canonical) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonical;
  }
};

// ============= CART =============
const Cart = {
  get: () => {
    try { return JSON.parse(localStorage.getItem('pixorisCart') || '{}'); }
    catch { return {}; }
  },
  save: (cart) => {
    localStorage.setItem('pixorisCart', JSON.stringify(cart));
    Cart.updateCount();
  },
  updateCount: () => {
    const cart = Cart.get();
    const count = Object.values(cart).reduce((s, q) => s + q, 0);
    $$('[data-cart-count]').forEach(el => el.textContent = count);
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
    localStorage.removeItem('pixorisCart');
    Cart.updateCount();
    Cart.renderPage();
    showToast('سبد خرید خالی شد');
  },
  renderPage: async () => {
    const host = $('[data-cart-page]');
    if (!host) return;
    const cart = Cart.get();
    const ids = Object.keys(cart);
    if (!ids.length) {
      host.innerHTML = `<div class="empty-cart"><h3>سبد خریدت خالیه 👾</h3><p>از فروشگاه Pixoris چند آیتم گیکی انتخاب کن.</p><a class="btn" href="shop.html">رفتن به فروشگاه</a></div>`;
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
      return `<tr>
        <td><div class="cart-product"><img src="${p.image_url || 'assets/card-shop.svg'}" alt="${escapeHtml(p.title)}"><div><strong>${escapeHtml(p.title)}</strong><div class="meta"><span>${escapeHtml(p.category || '')}</span></div></div></div></td>
        <td>${toman(p.price)}</td>
        <td><div class="qty-control"><button onclick="PixorisCart.changeQty('${id}', -1)">−</button><strong>${qty}</strong><button onclick="PixorisCart.changeQty('${id}', 1)">+</button></div></td>
        <td>${toman(sub)}</td>
        <td><button class="remove-btn" onclick="PixorisCart.remove('${id}')">حذف</button></td>
      </tr>`;
    }).join('');
    host.innerHTML = `<table class="cart-table"><thead><tr><th>محصول</th><th>قیمت</th><th>تعداد</th><th>جمع</th><th></th></tr></thead><tbody>${rows}</tbody></table><div class="cart-summary"><div><p>جمع کل سبد خرید</p><strong>${toman(total)}</strong></div><div class="hero-actions"><button class="btn" onclick="PixorisCart.checkout()">ادامه خرید / پرداخت نمایشی</button><button class="btn btn-outline" onclick="PixorisCart.clear()">خالی کردن سبد</button></div></div>`;
  },
  checkout: () => {
    showToast('پرداخت فعلاً نمایشی است — به‌زودی درگاه واقعی متصل می‌شود.');
  }
};
window.PixorisCart = Cart;

// ============= AUTH (USER, client-side only) =============
const Auth = {
  getUsers: () => { try { return JSON.parse(localStorage.getItem('pixorisUsers') || '[]'); } catch { return []; } },
  saveUsers: (users) => localStorage.setItem('pixorisUsers', JSON.stringify(users)),
  getCurrentUser: () => { try { return JSON.parse(localStorage.getItem('pixorisCurrentUser') || 'null'); } catch { return null; } },
  saveCurrentUser: (user) => { localStorage.setItem('pixorisCurrentUser', JSON.stringify(user)); Auth.updateUI(); },
  updateUI: () => {
    const user = Auth.getCurrentUser();
    const authEntry = $('[data-auth-entry]');
    if (authEntry) {
      const label = authEntry.querySelector('.auth-label');
      if (label) label.textContent = user ? user.username : 'ورود / عضویت';
    }
    const accountPanel = $('[data-account-panel]');
    if (accountPanel && user) {
      accountPanel.innerHTML = `<h2>حساب فعال</h2><div class="current-account-card"><h3>${escapeHtml(user.username)}</h3><p>${escapeHtml(user.email || 'ورود با نام کاربری')}</p><span class="role-badge user">کاربر عادی</span><p>امکان خرید، دیدن خبرها، استفاده از Pac Mode و مدیریت سبد خرید.</p><button class="btn logout-btn" data-logout type="button">خروج از حساب</button></div>`;
      const logout = accountPanel.querySelector('[data-logout]');
      if (logout) logout.addEventListener('click', () => { localStorage.removeItem('pixorisCurrentUser'); showToast('از حساب خارج شدی'); location.reload(); });
    }
  },
  initForm: () => {
    const authForm = $('[data-auth-form]');
    if (!authForm) return;
    let authMode = 'login';
    const setMode = (mode) => {
      authMode = mode;
      authForm.dataset.authMode = mode;
      $$('[data-register-only]').forEach(el => el.hidden = mode !== 'register');
      const emailInput = $('input[name="email"]');
      if (emailInput) emailInput.required = mode === 'register';
      const submit = $('.auth-submit');
      if (submit) submit.textContent = mode === 'register' ? 'ساخت حساب جدید' : 'ورود به حساب';
      $$('[data-auth-tab]').forEach(tab => tab.classList.toggle('active', tab.dataset.authTab === mode));
    };
    $$('[data-auth-tab]').forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.authTab)));
    setMode('login');
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(authForm);
      const username = (data.get('username') || '').trim();
      const email = (data.get('email') || '').trim();
      const password = data.get('password') || '';
      if (!username || !password) { showToast('نام کاربری و رمز عبور را وارد کن'); return; }
      const users = Auth.getUsers();
      if (authMode === 'register') {
        if (!email) { showToast('برای عضویت جیمیل را وارد کن'); return; }
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) { showToast('این نام کاربری قبلاً ثبت شده'); return; }
        users.push({ username, email, password });
        Auth.saveUsers(users);
        Auth.saveCurrentUser({ username, email });
        showToast('ثبت‌نام و ورود انجام شد ✅');
        setTimeout(() => location.href = 'index.html', 800);
        return;
      }
      const found = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
      if (!found) { showToast('نام کاربری یا رمز عبور اشتباه است'); return; }
      Auth.saveCurrentUser({ username: found.username, email: found.email });
      showToast('ورود موفق ✅');
      setTimeout(() => location.href = 'index.html', 800);
    });
  }
};

// ============= PIXEL MODE =============
const PixelMode = {
  init: () => {
    const body = document.body;
    const toggleBtn = $('[data-pac-toggle]');
    const overlay = $('.pixel-overlay');
    let pixelMode = localStorage.getItem('pixorisPixelMode') === 'on';
    let animating = false;
    const setMode = (state) => {
      pixelMode = state;
      body.classList.toggle('pixel-mode', state);
      localStorage.setItem('pixorisPixelMode', state ? 'on' : 'off');
      if (toggleBtn) toggleBtn.querySelector('.label').textContent = state ? 'Normal Mode' : 'Pac Mode';
    };
    setMode(pixelMode);
    if (toggleBtn && overlay) {
      toggleBtn.addEventListener('click', () => {
        if (animating) return;
        animating = true;
        overlay.classList.remove('reverse');
        overlay.classList.add('show');
        if (!pixelMode) {
          setTimeout(() => setMode(true), 1350);
          setTimeout(() => { overlay.classList.remove('show'); animating = false; }, 2400);
        } else {
          overlay.classList.add('reverse');
          setTimeout(() => setMode(false), 1450);
          setTimeout(() => { overlay.classList.remove('show', 'reverse'); animating = false; }, 2400);
        }
      });
    }
  }
};

// ============= AUDIO =============
const AudioSystem = {
  init: () => {
    const bgAudio = document.getElementById('bgAudio');
    const soundBtn = $('[data-sound-toggle]');
    if (!bgAudio || !soundBtn) return;
    let soundEnabled = localStorage.getItem('pixorisSoundEnabled') === 'on';
    const updateBtn = () => {
      soundBtn.classList.toggle('muted', !soundEnabled);
      const label = soundBtn.querySelector('.sound-label');
      if (label) label.textContent = soundEnabled ? 'Music On' : 'Music Off';
    };
    const sync = async () => {
      bgAudio.loop = true; bgAudio.muted = !soundEnabled; bgAudio.volume = 0.55;
      if (soundEnabled) { try { await bgAudio.play(); } catch (e) {} }
      updateBtn();
    };
    updateBtn();
    soundBtn.addEventListener('click', async () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('pixorisSoundEnabled', soundEnabled ? 'on' : 'off');
      bgAudio.muted = !soundEnabled;
      if (soundEnabled) { try { await bgAudio.play(); } catch (e) {} }
      updateBtn();
      showToast(soundEnabled ? 'آهنگ فعال شد 🎵' : 'آهنگ بی‌صدا شد 🔇');
    });
    const TIME_KEY = 'pixorisAudioTime';
    const saveTime = () => { if (bgAudio.currentTime > 0) localStorage.setItem(TIME_KEY, String(bgAudio.currentTime)); };
    bgAudio.addEventListener('timeupdate', saveTime);
    window.addEventListener('beforeunload', saveTime);
    const saved = parseFloat(localStorage.getItem(TIME_KEY) || '0');
    if (saved > 0) bgAudio.currentTime = saved;
    sync();
  }
};

// ============= MOBILE MENU =============
const MobileMenu = {
  init: () => {
    const menuBtn = $('[data-menu-btn]');
    const mobileNav = $('.mobile-nav');
    if (menuBtn && mobileNav) menuBtn.addEventListener('click', () => mobileNav.classList.toggle('open'));
  }
};

// ============= SCROLL REVEAL =============
const ScrollReveal = {
  init: () => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: .12 });
    $$('.reveal').forEach(el => observer.observe(el));
  }
};

// ============= NAV ACTIVE =============
const NavActive = {
  init: () => {
    const page = document.body.dataset.page;
    $$('.nav-links a, .mobile-nav a').forEach(link => {
      if (link.dataset.page === page) link.classList.add('active');
    });
  }
};

// ============= DYNAMIC CONTENT LOADING =============
const DynamicContent = {
  init: () => {
    const page = document.body.dataset.page;
    if (page === 'home') {
      DynamicContent.loadFeatured();
      DynamicContent.loadLatest();
      DynamicContent.loadShopPreview();
      DynamicContent.loadTrending();
    }
    if (page === 'news') {
      DynamicContent.loadNews();
      DynamicContent.bindSearch();
    }
    if (page === 'shop') DynamicContent.loadShop();
    if (page === 'product') DynamicContent.loadProduct();
    if (page === 'article') DynamicContent.loadArticle();
    if (page === 'analysis') DynamicContent.loadAnalysis();
  },

  loadFeatured: async () => {
    const host = $('[data-featured-posts]');
    if (!host) return;
    host.innerHTML = '<div class="skeleton" style="height:200px"></div>';
    const result = await apiFetch('/api/featured?limit=2');
    if (result.success && result.posts.length > 0) {
      host.innerHTML = result.posts.map((post, i) => `
        <article class="post-card-clean ${i === 0 ? 'post-wide reveal' : 'reveal'}">
          <a class="post-media" href="article.html?slug=${post.slug}"><img src="${post.image_url || 'assets/card-game.svg'}" alt="${escapeHtml(post.title)}" loading="lazy"></a>
          <div class="post-content">
            <div class="meta"><span class="tag" style="background:${post.category_color || '#4ee5ff'}">${escapeHtml(post.category_name || 'News')}</span></div>
            <h3><a href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a></h3>
            <p>${escapeHtml(post.excerpt || '')}</p>
            ${i === 0 ? `<a class="read-more" href="article.html?slug=${post.slug}">خواندن خبر ←</a>` : ''}
          </div>
        </article>
      `).join('');
      ScrollReveal.init();
    } else {
      host.innerHTML = '<div class="empty-cart" style="grid-column:1/-1"><h3>هنوز خبری منتشر نشده</h3><p>به‌زودی محتوای جدید اضافه می‌شود.</p></div>';
    }
  },

  loadLatest: async () => {
    const host = $('[data-latest-posts]');
    if (!host) return;
    const result = await apiFetch('/api/posts?limit=3');
    if (result.success && result.posts.length > 0) {
      host.innerHTML = result.posts.map(post => `
        <article class="product-tile reveal">
          <a class="product-media" href="article.html?slug=${post.slug}"><img src="${post.image_url || 'assets/card-game.svg'}" alt="${escapeHtml(post.title)}" loading="lazy"></a>
          <div class="product-tile-body">
            <span class="tag">${escapeHtml(post.category_name || 'News')}</span>
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.excerpt || '')}</p>
          </div>
        </article>
      `).join('');
      ScrollReveal.init();
    }
  },

  loadShopPreview: async () => {
    const host = $('[data-shop-preview]');
    if (!host) return;
    const result = await apiFetch('/api/products?limit=3');
    if (result.success && result.products.length > 0) {
      host.innerHTML = result.products.map(p => `
        <article class="product-tile reveal">
          <a class="product-media" href="product.html?slug=${p.slug}"><img src="${p.image_url || 'assets/card-shop.svg'}" alt="${escapeHtml(p.title)}" loading="lazy"></a>
          <div class="product-tile-body">
            <span class="tag">${escapeHtml(p.category || 'Product')}</span>
            <h3>${escapeHtml(p.title)}</h3>
            <p>${escapeHtml(p.description || '')}</p>
            <strong class="product-price"><span>قیمت:</span> ${toman(p.price)}</strong>
            <button class="btn btn-sm" data-add-to-cart="${p.slug}">افزودن به سبد</button>
          </div>
        </article>
      `).join('');
      ScrollReveal.init();
      // Bind add-to-cart
      host.querySelectorAll('[data-add-to-cart]').forEach(btn => {
        btn.addEventListener('click', () => Cart.add(btn.dataset.addToCart));
      });
    }
  },

  loadTrending: async () => {
    const host = $('[data-trending]');
    if (!host) return;
    const result = await apiFetch('/api/trending');
    if (result.success && result.posts.length > 0) {
      host.innerHTML = result.posts.map((post, i) => `
        <a class="trending-item reveal" href="article.html?slug=${post.slug}">
          <span class="trending-rank">${(i + 1).toLocaleString('fa-IR')}</span>
          <div><strong>${escapeHtml(post.title)}</strong><span class="meta">${escapeHtml(post.category_name || '')} • ${post.views?.toLocaleString('fa-IR') || 0} بازدید</span></div>
        </a>
      `).join('');
      ScrollReveal.init();
    }
  },

  loadNews: async (page = 1) => {
    const host = $('[data-news-list]');
    if (!host) return;
    host.innerHTML = '<div class="article-loading">در حال بارگذاری خبرها...</div>';
    const result = await apiFetch(`/api/posts?page=${page}&limit=10`);
    if (result.success) {
      if (result.posts.length === 0) {
        host.innerHTML = '<div class="empty-cart"><h3>هنوز خبری منتشر نشده</h3><p>به زودی محتوای جدید اضافه می‌شود.</p></div>';
        return;
      }
      const featured = result.posts[0];
      const rest = result.posts.slice(1);
      let html = `
        <article class="post-card-clean post-featured reveal">
          <a class="post-media" href="article.html?slug=${featured.slug}"><img src="${featured.image_url || 'assets/card-game.svg'}" alt="${escapeHtml(featured.title)}" loading="lazy"></a>
          <div class="post-content">
            <div class="meta"><span class="tag" style="background:${featured.category_color || '#4ee5ff'}">${escapeHtml(featured.category_name || 'News')}</span><span>${formatDate(featured.published_at || featured.created_at)}</span></div>
            <h3><a href="article.html?slug=${featured.slug}">${escapeHtml(featured.title)}</a></h3>
            <p>${escapeHtml(featured.excerpt || '')}</p>
            <a class="read-more" href="article.html?slug=${featured.slug}">ادامه خبر ←</a>
          </div>
        </article>
        <div class="post-list">
          ${rest.map(post => `
            <article class="post-card-clean reveal">
              <a class="post-media" href="article.html?slug=${post.slug}"><img src="${post.image_url || 'assets/card-cinema.svg'}" alt="${escapeHtml(post.title)}" loading="lazy"></a>
              <div class="post-content">
                <div class="meta"><span class="tag" style="background:${post.category_color || '#4ee5ff'}">${escapeHtml(post.category_name || 'News')}</span></div>
                <h3><a href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a></h3>
                <p>${escapeHtml(post.excerpt || '')}</p>
              </div>
            </article>
          `).join('')}
        </div>
      `;
      // Pagination
      if (result.pagination && result.pagination.totalPages > 1) {
        const p = result.pagination;
        html += `<div class="pagination">`;
        if (page > 1) html += `<button data-page="${page - 1}">← قبلی</button>`;
        for (let i = 1; i <= p.totalPages; i++) {
          html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i.toLocaleString('fa-IR')}</button>`;
        }
        if (page < p.totalPages) html += `<button data-page="${page + 1}">بعدی →</button>`;
        html += `</div>`;
      }
      host.innerHTML = html;
      ScrollReveal.init();
      // Bind pagination
      host.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          DynamicContent.loadNews(parseInt(btn.dataset.page));
          window.scrollTo({ top: host.offsetTop - 80, behavior: 'smooth' });
        });
      });
    } else {
      host.innerHTML = `<div class="empty-cart"><h3>خطا در بارگذاری</h3><p>${escapeHtml(result.error || 'لطفاً بعداً تلاش کنید.')}</p></div>`;
    }
  },

  bindSearch: () => {
    const input = $('[data-search-input]');
    const btn = $('[data-search-btn]');
    if (!input || !btn) return;
    const doSearch = async () => {
      const q = input.value.trim();
      if (q.length < 2) { DynamicContent.loadNews(); return; }
      const host = $('[data-news-list]');
      host.innerHTML = '<div class="article-loading">در حال جستجو...</div>';
      const result = await apiFetch(`/api/search?q=${encodeURIComponent(q)}&type=posts`);
      if (result.success && result.posts.length > 0) {
        host.innerHTML = `<div class="post-list" style="grid-template-columns:1fr">${result.posts.map(post => `
          <article class="post-card-clean reveal">
            <div class="post-content">
              <div class="meta"><span class="tag">${escapeHtml(post.category_name || 'News')}</span></div>
              <h3><a href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a></h3>
              <p>${escapeHtml(post.excerpt || '')}</p>
            </div>
          </article>
        `).join('')}</div>`;
        ScrollReveal.init();
      } else {
        host.innerHTML = `<div class="empty-cart"><h3>نتیجه‌ای یافت نشد</h3><p>برای "${escapeHtml(q)}" چیزی پیدا نشد.</p></div>`;
      }
    };
    btn.addEventListener('click', doSearch);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });
  },

  loadShop: async () => {
    const host = $('[data-shop-grid]');
    if (!host) return;
    host.innerHTML = '<div class="article-loading" style="grid-column:1/-1">در حال بارگذاری محصولات...</div>';
    const result = await apiFetch('/api/products');
    if (result.success && result.products.length > 0) {
      host.innerHTML = result.products.map(p => `
        <article class="card reveal">
          <a class="media-thumb" href="product.html?slug=${p.slug}"><img src="${p.image_url || 'assets/card-shop.svg'}" alt="${escapeHtml(p.title)}" loading="lazy"></a>
          <div class="card-body">
            <div class="meta"><span class="tag">${escapeHtml(p.category || 'Product')}</span>${p.stock > 0 ? '<span>موجود</span>' : '<span style="color:var(--pink)">ناموجود</span>'}</div>
            <h3><a href="product.html?slug=${p.slug}">${escapeHtml(p.title)}</a></h3>
            <p>${escapeHtml((p.description || '').slice(0, 80))}${p.description && p.description.length > 80 ? '...' : ''}</p>
            <div class="product-price"><span>قیمت:</span> ${toman(p.price)}</div>
            <div class="product-actions">
              <button class="btn" data-add-to-cart="${p.slug}" ${p.stock <= 0 ? 'disabled' : ''}>افزودن به سبد</button>
              <a class="btn btn-outline" href="product.html?slug=${p.slug}">جزئیات</a>
            </div>
          </div>
        </article>
      `).join('');
      ScrollReveal.init();
      host.querySelectorAll('[data-add-to-cart]').forEach(btn => {
        btn.addEventListener('click', () => Cart.add(btn.dataset.addToCart));
      });
    } else {
      host.innerHTML = '<div class="empty-cart" style="grid-column:1/-1"><h3>هنوز محصولی ثبت نشده</h3><p>به‌زودی محصولات اضافه می‌شوند.</p></div>';
    }
  },

  loadProduct: async () => {
    const host = $('[data-product-detail]');
    if (!host) return;
    const slug = new URLSearchParams(location.search).get('slug') || new URLSearchParams(location.search).get('id');
    if (!slug) { host.innerHTML = '<div class="empty-cart"><h3>محصول پیدا نشد</h3><a class="btn" href="shop.html">بازگشت به فروشگاه</a></div>'; return; }
    host.innerHTML = '<div class="article-loading">در حال بارگذاری محصول...</div>';
    const result = await apiFetch(`/api/product/${slug}`);
    if (!result.success) {
      host.innerHTML = `<div class="empty-cart"><h3>محصول پیدا نشد</h3><p>${escapeHtml(result.error || '')}</p><a class="btn" href="shop.html">بازگشت به فروشگاه</a></div>`;
      return;
    }
    const p = result.product;
    setSEO({ title: `${p.title} | Pixoris`, description: p.description, image: p.image_url, type: 'product' });
    host.innerHTML = `
      <div class="product-detail-inner">
        <div class="product-gallery"><img src="${p.image_url || 'assets/card-shop.svg'}" alt="${escapeHtml(p.title)}"></div>
        <div class="product-info">
          <div class="article-info">
            <span class="tag">${escapeHtml(p.category || 'Product')}</span>
            <span class="tag">${p.stock > 0 ? 'موجود' : 'ناموجود'}</span>
          </div>
          <h1>${escapeHtml(p.title)}</h1>
          <p>${escapeHtml(p.description || '')}</p>
          <div class="product-price"><span>قیمت:</span> ${toman(p.discount_price || p.price)}</div>
          ${p.discount_price ? `<div class="product-price" style="background:rgba(255,78,156,.12);color:var(--pink)"><span>تخفیف:</span> ${toman(p.price - p.discount_price)} off</div>` : ''}
          <div class="hero-actions">
            <button class="btn" data-product-add="${p.slug}" ${p.stock <= 0 ? 'disabled' : ''}>افزودن به سبد خرید</button>
            <a class="btn btn-outline" href="cart.html">رفتن به سبد خرید</a>
          </div>
        </div>
      </div>
    `;
    const addBtn = host.querySelector('[data-product-add]');
    if (addBtn) addBtn.addEventListener('click', () => Cart.add(p.slug));

    // Related products
    const relatedHost = $('[data-related-products]');
    if (relatedHost && result.related && result.related.length > 0) {
      relatedHost.innerHTML = result.related.map(rp => `
        <article class="card reveal">
          <a class="media-thumb" href="product.html?slug=${rp.slug}"><img src="${rp.image_url || 'assets/card-shop.svg'}" alt="${escapeHtml(rp.title)}" loading="lazy"></a>
          <div class="card-body">
            <h3><a href="product.html?slug=${rp.slug}">${escapeHtml(rp.title)}</a></h3>
            <div class="product-price">${toman(rp.price)}</div>
            <button class="btn btn-sm" data-add-to-cart="${rp.slug}">افزودن</button>
          </div>
        </article>
      `).join('');
      relatedHost.querySelectorAll('[data-add-to-cart]').forEach(btn => {
        btn.addEventListener('click', () => Cart.add(btn.dataset.addToCart));
      });
      ScrollReveal.init();
    }
  },

  loadArticle: async () => {
    const host = $('[data-article-detail]');
    if (!host) return;
    const slug = new URLSearchParams(location.search).get('slug') || new URLSearchParams(location.search).get('id');
    if (!slug) {
      // Fallback to static article
      ArticleFallback.render(host);
      return;
    }
    host.innerHTML = '<div class="article-loading">در حال بارگذاری مقاله...</div>';
    const result = await apiFetch(`/api/post/${slug}`);
    if (!result.success) {
      host.innerHTML = `<div class="empty-cart"><h3>مقاله پیدا نشد</h3><p>${escapeHtml(result.error || '')}</p><a class="btn" href="news.html">بازگشت به خبرها</a></div>`;
      return;
    }
    const post = result.post;
    setSEO({
      title: `${post.title} | Pixoris`,
      description: post.excerpt || post.seo_description || '',
      image: post.image_url,
      canonical: post.canonical_url,
      type: 'article'
    });

    // Inject structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: post.title,
      description: post.excerpt || '',
      image: post.image_url || '',
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at,
      author: { '@type': 'Person', name: post.author_name || 'Pixoris' },
      publisher: { '@type': 'Organization', name: 'Pixoris' }
    };
    let sdScript = document.querySelector('script[type="application/ld+json"]');
    if (!sdScript) {
      sdScript = document.createElement('script');
      sdScript.type = 'application/ld+json';
      document.head.appendChild(sdScript);
    }
    sdScript.textContent = JSON.stringify(structuredData);

    const tagsHtml = post.tags && post.tags.length
      ? `<div class="article-tags">${post.tags.map(t => `<a class="tag" href="news.html?tag=${t.slug}">${escapeHtml(t.name)}</a>`).join('')}</div>`
      : '';

    host.innerHTML = `
      <div class="article-cover"><img src="${post.image_url || 'assets/card-game.svg'}" alt="${escapeHtml(post.featured_image_alt || post.title)}"></div>
      <div class="article-content">
        <nav class="breadcrumb"><a href="index.html">خانه</a> › <a href="news.html">خبرها</a> › <span>${escapeHtml(post.title)}</span></nav>
        <div class="article-info">
          <span class="tag" style="background:${post.category_color || '#4ee5ff'}">${escapeHtml(post.category_name || 'News')}</span>
          <span class="tag">${formatDate(post.published_at || post.created_at)}</span>
          <span class="tag">${(post.reading_time || 5).toLocaleString('fa-IR')} دقیقه مطالعه</span>
          <span class="tag">${(post.views || 0).toLocaleString('fa-IR')} بازدید</span>
        </div>
        <h1>${escapeHtml(post.title)}</h1>
        ${post.excerpt ? `<p><strong>${escapeHtml(post.excerpt)}</strong></p>` : ''}
        <div class="article-body">${post.content}</div>
        ${tagsHtml}
        <div class="article-share">
          <span>اشتراک‌گذاری:</span>
          <button class="btn btn-sm" onclick="navigator.share?.({title:'${escapeHtml(post.title)}', url: location.href})">📤 اشتراک</button>
          <button class="btn btn-sm" onclick="navigator.clipboard?.writeText(location.href); showToast('لینک کپی شد')">🔗 کپی لینک</button>
        </div>
        <div class="hero-actions">
          <a class="btn" href="news.html">بازگشت به خبرها</a>
          <a class="btn btn-outline" href="shop.html">مشاهده فروشگاه</a>
        </div>
      </div>
    `;

    // Related posts
    if (post.related && post.related.length > 0) {
      const relatedHost = $('[data-related-articles]');
      if (relatedHost) {
        relatedHost.innerHTML = post.related.map(rp => `
          <article class="card reveal">
            <a class="media-thumb" href="article.html?slug=${rp.slug}"><img src="${rp.image_url || 'assets/card-game.svg'}" alt="${escapeHtml(rp.title)}" loading="lazy"></a>
            <div class="card-body">
              <div class="meta"><span class="tag">${escapeHtml(post.category_name || 'News')}</span></div>
              <h3><a href="article.html?slug=${rp.slug}">${escapeHtml(rp.title)}</a></h3>
              <p>${escapeHtml(rp.excerpt || '')}</p>
              <a class="read-more" href="article.html?slug=${rp.slug}">بیشتر بخوان ←</a>
            </div>
          </article>
        `).join('');
        ScrollReveal.init();
      }
    }
  },

  loadAnalysis: async () => {
    const host = $('[data-analysis-list]');
    if (!host) return;
    const result = await apiFetch('/api/posts?category=reviews&limit=8');
    if (result.success && result.posts.length > 0) {
      host.innerHTML = result.posts.map(post => `
        <article class="card reveal">
          <div class="card-body">
            <div class="meta"><span class="tag">${escapeHtml(post.category_name || 'Review')}</span><span>${formatDate(post.published_at || post.created_at)}</span></div>
            <h3><a href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a></h3>
            <p>${escapeHtml(post.excerpt || '')}</p>
            <a class="read-more" href="article.html?slug=${post.slug}">بیشتر بخوان ←</a>
          </div>
        </article>
      `).join('');
      ScrollReveal.init();
    }
  }
};

// ============= STATIC ARTICLE FALLBACK =============
const ArticleFallback = {
  articles: {
    'game-trailer': { title: 'تاریخ انتشار بازی اکشن موردانتظار اعلام شد', category: 'Game News', time: '6 دقیقه مطالعه', image: 'assets/card-game.svg', intro: 'استودیو سازنده با انتشار یک ویدیو کوتاه، پنجره انتشار بازی جدید خود را اعلام کرد.', body: ['<p>این بازی با تمرکز روی مبارزات سریع، طراحی مراحل نیمه‌باز و سیستم شخصی‌سازی عمیق معرفی شده است.</p>', '<p>در تریلر جدید، نورپردازی نئونی، محیط‌های شهری و طراحی دشمنان بیش از هر چیز جلب توجه می‌کند.</p>', '<p>پیکسوریس در هفته‌های آینده جزئیات بیشتری از گیم‌پلی، سیستم پیشرفت و محتوای پس از انتشار منتشر خواهد کرد.</p>'] },
    'cinema-adaptation': { title: 'چرا بعضی فیلم‌های اقتباسی از بازی‌ها بالاخره جواب می‌دهند؟', category: 'Cinema Analysis', time: '8 دقیقه مطالعه', image: 'assets/card-cinema.svg', intro: 'سال‌ها اقتباس‌های گیمی با شکست همراه بودند، اما موج جدید نشان می‌دهد که سینما بالاخره زبان بازی‌ها را بهتر فهمیده است.', body: ['<p>اقتباس موفق الزاماً کپی مستقیم بازی نیست. مهم این است که سازندگان روح اثر اصلی را درست منتقل کنند.</p>', '<p>وقتی فیلم‌ساز به جای تقلید سطحی از مراحل بازی، منطق جهان و انگیزه شخصیت‌ها را درک کند، نتیجه قابل قبول‌تر می‌شود.</p>', '<p>از طرف دیگر، مخاطبان امروز به آثار گیکی جدی‌تر نگاه می‌کنند و همین باعث شده سرمایه‌گذاری روی کیفیت تولید بیشتر شود.</p>'] },
    'story-games': { title: 'چرا بازی‌های داستان‌محور هنوز برای گیمرها مهم‌اند؟', category: 'Deep Dive', time: '12 دقیقه مطالعه', image: 'assets/card-game.svg', intro: 'با وجود رشد بازی‌های آنلاین و رقابتی، بازی‌های داستان‌محور هنوز جایگاه عاطفی و فرهنگی مهمی دارند.', body: ['<p>داستان خوب باعث می‌شود بازی فراتر از مکانیک باشد و در ذهن بازیکن بماند.</p>', '<p>انتخاب‌های اخلاقی، شخصیت‌پردازی و موسیقی می‌توانند تجربه‌ای بسازند که حتی سال‌ها بعد به یاد آورده شود.</p>', '<p>در نهایت، ماندگاری یک بازی معمولاً از ترکیب هوشمندانه گیم‌پلی و روایت به وجود می‌آید.</p>'] },
    'graphics-gameplay': { title: 'گرافیک یا گیم‌پلی؟ کدام عامل بازی را ماندگار می‌کند؟', category: 'Versus', time: '7 دقیقه مطالعه', image: 'assets/card-game.svg', intro: 'گرافیک نگاه اول را می‌سازد، اما گیم‌پلی چیزی است که بازیکن را نگه می‌دارد.', body: ['<p>یک بازی زیبا می‌تواند توجه اولیه را جلب کند، اما اگر کنترل، ریتم و پاداش‌دهی درست نباشد، تجربه خیلی زود فراموش می‌شود.</p>', '<p>از طرف دیگر، بازی‌هایی با گرافیک ساده اما مکانیک دقیق، گاهی سال‌ها محبوب می‌مانند.</p>', '<p>بهترین آثار معمولاً تعادل دارند: هویت بصری قوی، سیستم بازی عمیق و تجربه کاربری روان.</p>'] },
    'geek-merch': { title: 'نقش محصولات گیکی در ساخت هویت برای یک برند رسانه‌ای', category: 'Culture', time: '11 دقیقه مطالعه', image: 'assets/card-shop.svg', intro: 'وقتی رسانه و فروشگاه کنار هم قرار می‌گیرند، تجربه کاربر کامل‌تر می‌شود.', body: ['<p>کاربر فقط خبر نمی‌خواند؛ او می‌خواهد بخشی از دنیای مورد علاقه‌اش را لمس کند، بخرد و در فضای خودش نمایش دهد.</p>', '<p>مرچ، فیگور و پوستر به برند کمک می‌کنند از یک سایت خبری ساده به یک جامعه طرفداری تبدیل شود.</p>', '<p>برای پیکسوریس، این ترکیب می‌تواند یک مزیت جدی نسبت به رسانه‌های صرفاً محتوایی باشد.</p>'] }
  },
  render: (host) => {
    const id = new URLSearchParams(location.search).get('id') || 'game-trailer';
    const article = ArticleFallback.articles[id] || ArticleFallback.articles['game-trailer'];
    host.innerHTML = `<div class="article-cover"><img src="${article.image}" alt="${article.title}"></div><div class="article-content"><div class="article-info"><span class="tag">${article.category}</span><span class="tag">${article.time}</span><span class="tag">Pixoris Editorial</span></div><h1>${article.title}</h1><p><strong>${article.intro}</strong></p>${article.body.join('')}<div class="hero-actions"><a class="btn" href="news.html">بازگشت به خبرها</a><a class="btn btn-outline" href="shop.html">مشاهده فروشگاه</a></div></div>`;
  }
};

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
  DynamicContent.init();
  Cart.renderPage();

  // Static add-to-cart buttons (for any hard-coded ones)
  $$('[data-add-to-cart]').forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => Cart.add(btn.dataset.addToCart));
    }
  });
});
