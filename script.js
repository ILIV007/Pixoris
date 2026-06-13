// Pixoris CMS v2.0 - Frontend JavaScript
// Modular, clean, API-connected

const API_BASE = 'https://dev.pixoris.workers.dev';

// ============= UTILS =============
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);
const toman = (num) => {
  const safe = Number(num) || 0;
  try { return new Intl.NumberFormat('fa-IR').format(safe) + ' تومان'; }
  catch (e) { return safe.toLocaleString() + ' تومان'; }
};

const showToast = (msg, duration = 1800) => {
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
    const data = await res.json();
    return data;
  } catch (err) {
    showToast('خطای شبکه: ' + err.message);
    return { success: false, error: err.message };
  }
};

// ============= CART =============
const Cart = {
  get: () => JSON.parse(localStorage.getItem('pixorisCart') || '{}'),
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
    if (!products[id]) return;
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
  renderPage: () => {
    const host = $('[data-cart-page]');
    if (!host) return;
    const cart = Cart.get();
    const ids = Object.keys(cart);
    if (!ids.length) {
      host.innerHTML = `<div class="empty-cart"><h3>سبد خریدت خالیه 👾</h3><p>از فروشگاه Pixoris چند آیتم گیکی انتخاب کن.</p><a class="btn" href="shop.html">رفتن به فروشگاه</a></div>`;
      return;
    }
    let total = 0;
    const rows = ids.map(id => {
      const p = products[id]; if (!p) return '';
      const qty = cart[id]; const sub = p.price * qty; total += sub;
      return `<tr><td><div class="cart-product"><img src="${p.image}" alt="${p.title}"><div><strong>${p.title}</strong><div class="meta"><span>${p.category}</span></div></div></div></td><td>${toman(p.price)}</td><td><div class="qty-control"><button onclick="Cart.changeQty('${id}', -1)">−</button><strong>${qty}</strong><button onclick="Cart.changeQty('${id}', 1)">+</button></div></td><td>${toman(sub)}</td><td><button class="remove-btn" onclick="Cart.remove('${id}')">حذف</button></td></tr>`;
    }).join('');
    host.innerHTML = `<table class="cart-table"><thead><tr><th>محصول</th><th>قیمت</th><th>تعداد</th><th>جمع</th><th></th></tr></thead><tbody>${rows}</tbody></table><div class="cart-summary"><div><p>جمع کل سبد خرید</p><strong>${toman(total)}</strong></div><div class="hero-actions"><button class="btn">ادامه خرید / پرداخت نمایشی</button><button class="btn btn-outline" onclick="Cart.clear()">خالی کردن سبد</button></div></div>`;
  }
};
window.PixorisCart = Cart;

// ============= PRODUCTS =============
const products = {
  'cyber-hero': { id: 'cyber-hero', title: 'اکشن‌فیگور Cyber Hero', category: 'Figure / Limited Edition', price: 1490000, priceText: '۱,۴۹۰,۰۰۰ تومان', image: 'assets/card-shop.svg', desc: 'یک اکشن‌فیگور سایبرپانکی با استند اختصاصی، رنگ‌آمیزی دقیق و طراحی مناسب دکور اتاق گیمینگ.', features: ['ارتفاع تقریبی ۱۸ سانتی‌متر', 'استند نمایش داخل جعبه', 'بسته‌بندی کلکسیونی', 'مناسب دکور اتاق گیم و استریم'] },
  'neon-poster': { id: 'neon-poster', title: 'پوستر سینمایی Neon Frame', category: 'Poster / Premium Print', price: 320000, priceText: '۳۲۰,۰۰۰ تومان', image: 'assets/hero-cinema.svg', desc: 'پوستر گیکی با ترکیب رنگ نئون، مناسب دیوار اتاق گیم و فضای استریم.', features: ['چاپ با کیفیت بالا', 'رنگ‌های زنده و نئونی', 'مناسب قاب A3', 'کاغذ ضخیم و مقاوم'] },
  'pixel-box': { id: 'pixel-box', title: 'Pixel Box Collection', category: 'Merch / Best Seller', price: 690000, priceText: '۶۹۰,۰۰۰ تومان', image: 'assets/hero-gaming.svg', desc: 'یک پک سورپرایزی برای عاشقان آیتم‌های پیکسلی؛ شامل کارت، استیکر، پین و آیتم‌های کوچک کلکسیونی.', features: ['شامل چند آیتم سورپرایزی', 'تم پیکسلی و آرکید', 'مناسب هدیه', 'طراحی اختصاصی Pixoris'] }
};

// ============= ARTICLES (Static fallback) =============
const articles = {
  'game-trailer': { title: 'تاریخ انتشار بازی اکشن موردانتظار اعلام شد', category: 'Game News', time: '6 دقیقه مطالعه', image: 'assets/card-game.svg', intro: 'استودیو سازنده با انتشار یک ویدیو کوتاه، پنجره انتشار بازی جدید خود را اعلام کرد.', body: ['این بازی با تمرکز روی مبارزات سریع، طراحی مراحل نیمه‌باز و سیستم شخصی‌سازی عمیق معرفی شده است.', 'در تریلر جدید، نورپردازی نئونی، محیط‌های شهری و طراحی دشمنان بیش از هر چیز جلب توجه می‌کند.', 'پیکسوریس در هفته‌های آینده جزئیات بیشتری از گیم‌پلی، سیستم پیشرفت و محتوای پس از انتشار منتشر خواهد کرد.'] },
  'cinema-adaptation': { title: 'چرا بعضی فیلم‌های اقتباسی از بازی‌ها بالاخره جواب می‌دهند؟', category: 'Cinema Analysis', time: '8 دقیقه مطالعه', image: 'assets/card-cinema.svg', intro: 'سال‌ها اقتباس‌های گیمی با شکست همراه بودند، اما موج جدید نشان می‌دهد که سینما بالاخره زبان بازی‌ها را بهتر فهمیده است.', body: ['اقتباس موفق الزاماً کپی مستقیم بازی نیست. مهم این است که سازندگان روح اثر اصلی را درست منتقل کنند.', 'وقتی فیلم‌ساز به جای تقلید سطحی از مراحل بازی، منطق جهان و انگیزه شخصیت‌ها را درک کند، نتیجه قابل قبول‌تر می‌شود.', 'از طرف دیگر، مخاطبان امروز به آثار گیکی جدی‌تر نگاه می‌کنند و همین باعث شده سرمایه‌گذاری روی کیفیت تولید بیشتر شود.'] },
  'figure-drop': { title: 'پیش‌فروش یک فیگور محدود آغاز شد', category: 'Shop News', time: '4 دقیقه مطالعه', image: 'assets/card-shop.svg', intro: 'فروشگاه پیکسوریس پیش‌فروش یک اکشن‌فیگور محدود با طراحی سایبرپانکی و بسته‌بندی کلکسیونی را شروع کرده است.', body: ['این فیگور برای طرفداران طراحی نئونی، شخصیت‌های آینده‌نگر و دکورهای گیمینگ ساخته شده است.', 'موجودی اولیه محدود خواهد بود و سفارش‌ها براساس زمان ثبت در اولویت ارسال قرار می‌گیرند.', 'در صفحه محصول می‌توان تصاویر، ویژگی‌ها و قیمت را مشاهده کرد و آن را به سبد خرید اضافه کرد.'] },
  'esports-weekend': { title: 'نتایج تورنمنت آخر هفته و ستاره‌های جدید صحنه رقابتی', category: 'Esports', time: '5 دقیقه مطالعه', image: 'assets/card-game.svg', intro: 'رقابت‌های آخر هفته با چند نتیجه غیرمنتظره و درخشش بازیکنان تازه‌وارد به پایان رسید.', body: ['تیم‌های تازه‌کار نشان دادند که فاصله با مدعیان کمتر از چیزی است که تصور می‌شد.', 'تمرکز روی هماهنگی تیمی، سرعت تصمیم‌گیری و کنترل نقشه، عوامل اصلی موفقیت تیم برنده بودند.', 'این نتایج می‌تواند ترکیب رده‌بندی فصل بعد را به شکل قابل توجهی تغییر دهد.'] },
  'scifi-series': { title: 'سریال علمی‌تخیلی جدید، رکورد آغاز فصل را شکست', category: 'Series', time: '8 دقیقه مطالعه', image: 'assets/card-cinema.svg', intro: 'قسمت اول فصل جدید با استقبال بالا منتشر شد و فضای شبکه‌های اجتماعی را درگیر کرد.', body: ['طراحی بصری سریال، موسیقی و پایان‌بندی قسمت اول از دلایل اصلی واکنش مثبت کاربران بوده است.', 'با این حال، برخی منتقدان معتقدند سریال باید در ادامه از نمایش صرف فاصله بگیرد و شخصیت‌ها را عمیق‌تر کند.', 'قسمت بعدی می‌تواند مشخص کند که این شروع قدرتمند ادامه‌دار خواهد بود یا نه.'] },
  'pixel-merch': { title: 'استیکرها و پین‌های پیکسلی جدید وارد فروشگاه شدند', category: 'Merch', time: '3 دقیقه مطالعه', image: 'assets/card-shop.svg', intro: 'لاین جدید مرچ‌های پیکسلی با الهام از بازی‌های آرکید کلاسیک به فروشگاه اضافه شد.', body: ['این مجموعه شامل استیکر، پین، کارت و آیتم‌های کوچک مناسب لپ‌تاپ، کیس و دکور اتاق است.', 'زبان بصری مجموعه به Pac-Man، پیکسل‌آرت و حال‌وهوای کنسول‌های قدیمی اشاره دارد.', 'این محصولات می‌توانند به‌عنوان آیتم اقتصادی و هدیه کوچک برای گیمرها گزینه خوبی باشند.'] },
  'story-games': { title: 'چرا بازی‌های داستان‌محور هنوز برای گیمرها مهم‌اند؟', category: 'Deep Dive', time: '12 دقیقه مطالعه', image: 'assets/card-game.svg', intro: 'با وجود رشد بازی‌های آنلاین و رقابتی، بازی‌های داستان‌محور هنوز جایگاه عاطفی و فرهنگی مهمی دارند.', body: ['داستان خوب باعث می‌شود بازی فراتر از مکانیک باشد و در ذهن بازیکن بماند.', 'انتخاب‌های اخلاقی، شخصیت‌پردازی و موسیقی می‌توانند تجربه‌ای بسازند که حتی سال‌ها بعد به یاد آورده شود.', 'در نهایت، ماندگاری یک بازی معمولاً از ترکیب هوشمندانه گیم‌پلی و روایت به وجود می‌آید.'] },
  'graphics-gameplay': { title: 'گرافیک یا گیم‌پلی؟ کدام عامل بازی را ماندگار می‌کند؟', category: 'Versus', time: '7 دقیقه مطالعه', image: 'assets/card-game.svg', intro: 'گرافیک نگاه اول را می‌سازد، اما گیم‌پلی چیزی است که بازیکن را نگه می‌دارد.', body: ['یک بازی زیبا می‌تواند توجه اولیه را جلب کند، اما اگر کنترل، ریتم و پاداش‌دهی درست نباشد، تجربه خیلی زود فراموش می‌شود.', 'از طرف دیگر، بازی‌هایی با گرافیک ساده اما مکانیک دقیق، گاهی سال‌ها محبوب می‌مانند.', 'بهترین آثار معمولاً تعادل دارند: هویت بصری قوی، سیستم بازی عمیق و تجربه کاربری روان.'] },
  'geek-merch': { title: 'نقش محصولات گیکی در ساخت هویت برای یک برند رسانه‌ای', category: 'Culture', time: '11 دقیقه مطالعه', image: 'assets/card-shop.svg', intro: 'وقتی رسانه و فروشگاه کنار هم قرار می‌گیرند، تجربه کاربر کامل‌تر می‌شود.', body: ['کاربر فقط خبر نمی‌خواند؛ او می‌خواهد بخشی از دنیای مورد علاقه‌اش را لمس کند، بخرد و در فضای خودش نمایش دهد.', 'مرچ، فیگور و پوستر به برند کمک می‌کنند از یک سایت خبری ساده به یک جامعه طرفداری تبدیل شود.', 'برای پیکسوریس، این ترکیب می‌تواند یک مزیت جدی نسبت به رسانه‌های صرفاً محتوایی باشد.'] }
};

// ============= RENDERERS =============
const Renderers = {
  article: () => {
    const host = $('[data-article-detail]');
    if (!host) return;
    const id = new URLSearchParams(location.search).get('id') || 'game-trailer';
    const article = articles[id] || articles['game-trailer'];
    host.innerHTML = `<div class="article-cover"><img src="${article.image}" alt="${article.title}"></div><div class="article-content"><div class="article-info"><span class="tag">${article.category}</span><span class="tag">${article.time}</span><span class="tag">Pixoris Editorial</span></div><h1>${article.title}</h1><p><strong>${article.intro}</strong></p>${article.body.map((p, i) => i === 1 ? `<h2>جزئیات بیشتر</h2><p>${p}</p>` : `<p>${p}</p>`).join('')}<div class="hero-actions"><a class="btn" href="news.html">بازگشت به خبرها</a><a class="btn btn-outline" href="shop.html">مشاهده فروشگاه</a></div></div>`;
  },
  product: () => {
    const host = $('[data-product-detail]');
    if (!host) return;
    const id = new URLSearchParams(location.search).get('id') || 'cyber-hero';
    const product = products[id] || products['cyber-hero'];
    host.innerHTML = `<div class="product-detail-inner"><div class="product-gallery"><img src="${product.image}" alt="${product.title}"></div><div class="product-info"><div class="article-info"><span class="tag">${product.category}</span><span class="tag">موجود</span></div><h1>${product.title}</h1><p>${product.desc}</p><div class="product-price"><span>قیمت:</span> ${product.priceText}</div><ul class="product-feature-list">${product.features.map(f => `<li>✓ ${f}</li>`).join('')}</ul><div class="hero-actions"><button class="btn" data-product-add="${product.id}">افزودن به سبد خرید</button><a class="btn btn-outline" href="cart.html">رفتن به سبد خرید</a></div></div></div>`;
    const addBtn = host.querySelector('[data-product-add]');
    if (addBtn) addBtn.addEventListener('click', () => Cart.add(product.id));
  }
};

// ============= AUTH =============
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
      if (label) label.textContent = user ? `${user.username}` : 'ورود / عضویت';
    }
    const accountPanel = $('[data-account-panel]');
    if (accountPanel && user) {
      accountPanel.innerHTML = `<h2>حساب فعال</h2><div class="current-account-card"><h3>${user.username}</h3><p>${user.email || 'ورود با نام کاربری انجام شده است'}</p><span class="role-badge user">کاربر عادی</span><p>امکان خرید، دیدن خبرها، استفاده از Pac Mode و مدیریت سبد خرید.</p><button class="btn logout-btn" data-logout type="button">خروج از حساب</button></div>`;
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
        const newUser = { username, email, password };
        users.push(newUser);
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
    // Persist audio time across pages
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

// ============= ADMIN PANEL =============
const AdminPanel = {
  init: () => {
    const adminForm = $('[data-admin-form]');
    const dashboard = $('[data-admin-dashboard]');
    if (!adminForm || !dashboard) return;
    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(adminForm);
      const username = data.get('adminUser');
      const password = data.get('adminPass');
      const result = await apiFetch('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (result.success) {
        localStorage.setItem('pixorisAdminToken', result.token);
        dashboard.classList.add('admin-unlocked');
        showToast('پنل ادمین باز شد ✅', 2200);
        AdminPanel.loadStats();
      } else {
        showToast(result.error || 'ورود ناموفق');
      }
    });
  },
  loadStats: async () => {
    const result = await apiFetch('/api/admin/stats');
    if (result.success) {
      const stats = result.stats;
      // Update stat cards if they exist
      $$('[data-stat]').forEach(el => {
        const key = el.dataset.stat;
        if (stats[key] !== undefined) el.textContent = stats[key];
      });
    }
  }
};

// ============= DYNAMIC CONTENT LOADING =============
const DynamicContent = {
  init: () => {
    // Load featured posts on homepage
    if (document.body.dataset.page === 'home') {
      DynamicContent.loadFeatured();
      DynamicContent.loadLatest();
    }
    // Load news page
    if (document.body.dataset.page === 'news') {
      DynamicContent.loadNews();
    }
  },
  loadFeatured: async () => {
    const host = $('[data-featured-posts]');
    if (!host) return;
    host.innerHTML = '<div class="skeleton" style="height:200px"></div>';
    const result = await apiFetch('/api/featured');
    if (result.success && result.posts.length > 0) {
      host.innerHTML = result.posts.map(post => `
        <article class="post-card-clean reveal">
          <a class="post-media" href="article.html?slug=${post.slug}"><img src="${post.image_url || 'assets/card-game.svg'}" alt="${post.title}" loading="lazy"></a>
          <div class="post-content">
            <div class="meta"><span class="tag" style="background:${post.category_color || ''}">${post.category_name || 'News'}</span></div>
            <h3><a href="article.html?slug=${post.slug}">${post.title}</a></h3>
            <p>${post.excerpt || ''}</p>
          </div>
        </article>
      `).join('');
    }
  },
  loadLatest: async () => {
    const host = $('[data-latest-posts]');
    if (!host) return;
    const result = await apiFetch('/api/posts?limit=3');
    if (result.success && result.posts.length > 0) {
      host.innerHTML = result.posts.map(post => `
        <article class="product-tile reveal">
          <a class="product-media" href="article.html?slug=${post.slug}"><img src="${post.image_url || 'assets/card-game.svg'}" alt="${post.title}" loading="lazy"></a>
          <div class="product-tile-body">
            <span class="tag">${post.category_name || 'News'}</span>
            <h3>${post.title}</h3>
            <p>${post.excerpt || ''}</p>
          </div>
        </article>
      `).join('');
    }
  },
  loadNews: async () => {
    const host = $('[data-news-list]');
    if (!host) return;
    host.innerHTML = '<div class="article-loading">در حال بارگذاری...</div>';
    const result = await apiFetch('/api/posts');
    if (result.success) {
      if (result.posts.length === 0) {
        host.innerHTML = '<div class="empty-cart"><h3>هنوز خبری منتشر نشده</h3><p>به زودی محتوای جدید اضافه می‌شود.</p></div>';
        return;
      }
      // Featured post
      const featured = result.posts[0];
      const rest = result.posts.slice(1);
      let html = `
        <article class="post-card-clean post-featured reveal">
          <a class="post-media" href="article.html?slug=${featured.slug}"><img src="${featured.image_url || 'assets/card-game.svg'}" alt="${featured.title}" loading="lazy"></a>
          <div class="post-content">
            <div class="meta"><span class="tag">${featured.category_name || 'News'}</span><span>امروز</span></div>
            <h3><a href="article.html?slug=${featured.slug}">${featured.title}</a></h3>
            <p>${featured.excerpt || ''}</p>
            <a class="read-more" href="article.html?slug=${featured.slug}">ادامه خبر ←</a>
          </div>
        </article>
        <div class="post-list">
          ${rest.map(post => `
            <article class="post-card-clean reveal">
              <a class="post-media" href="article.html?slug=${post.slug}"><img src="${post.image_url || 'assets/card-cinema.svg'}" alt="${post.title}" loading="lazy"></a>
              <div class="post-content">
                <div class="meta"><span class="tag">${post.category_name || 'News'}</span></div>
                <h3><a href="article.html?slug=${post.slug}">${post.title}</a></h3>
                <p>${post.excerpt || ''}</p>
              </div>
            </article>
          `).join('')}
        </div>
      `;
      host.innerHTML = html;
    } else {
      host.innerHTML = '<div class="empty-cart"><h3>خطا در بارگذاری</h3><p>لطفاً بعداً دوباره امتحان کنید.</p></div>';
    }
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
  AdminPanel.init();
  DynamicContent.init();
  Renderers.article();
  Renderers.product();
  Cart.renderPage();

  // Add to cart buttons
  $$('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', () => Cart.add(btn.dataset.addToCart));
  });
});
