
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const toggleBtn = document.querySelector('[data-pac-toggle]');
  const overlay = document.querySelector('.pixel-overlay');
  const menuBtn = document.querySelector('[data-menu-btn]');
  const mobileNav = document.querySelector('.mobile-nav');
  const toast = document.querySelector('[data-toast]');
  const soundBtn = document.querySelector('[data-sound-toggle]');
  const bgAudio = document.getElementById('bgAudio');
  const authEntry = document.querySelector('[data-auth-entry]');
  const authForm = document.querySelector('[data-auth-form]');
  const accountPanel = document.querySelector('[data-account-panel]');
  const authTabs = document.querySelectorAll('[data-auth-tab]');
  const roleOptions = document.querySelectorAll('[data-role]');
  let pixelMode = localStorage.getItem('pixorisPixelMode') === 'on';
  let animating = false;


  let soundEnabled = localStorage.getItem('pixorisSoundEnabled') === 'on';

  const updateSoundButton = () => {
    if (!soundBtn) return;
    soundBtn.classList.toggle('muted', !soundEnabled);
    const label = soundBtn.querySelector('.sound-label');
    if (label) label.textContent = soundEnabled ? 'Music On' : 'Music Off';
  };

  const syncAudio = async (forcePlay = false) => {
    if (!bgAudio) return;
    bgAudio.loop = true;
    bgAudio.muted = !soundEnabled;
    bgAudio.volume = 0.55;
    if (soundEnabled || forcePlay) {
      try { await bgAudio.play(); } catch (e) {}
      if (!soundEnabled) bgAudio.muted = true;
    }
    updateSoundButton();
  };

  const products = {
    'cyber-hero': {
      id: 'cyber-hero',
      title: 'اکشن‌فیگور Cyber Hero',
      category: 'Figure / Limited Edition',
      price: 1490000,
      priceText: '۱,۴۹۰,۰۰۰ تومان',
      image: 'assets/card-shop.svg',
      desc: 'یک اکشن‌فیگور سایبرپانکی با استند اختصاصی، رنگ‌آمیزی دقیق و طراحی مناسب دکور اتاق گیمینگ. این محصول برای کلکسیونرها و طرفداران فضای نئونی طراحی شده است.',
      features: ['ارتفاع تقریبی ۱۸ سانتی‌متر', 'استند نمایش داخل جعبه', 'بسته‌بندی کلکسیونی', 'مناسب دکور اتاق گیم و استریم']
    },
    'neon-poster': {
      id: 'neon-poster',
      title: 'پوستر سینمایی Neon Frame',
      category: 'Poster / Premium Print',
      price: 320000,
      priceText: '۳۲۰,۰۰۰ تومان',
      image: 'assets/hero-cinema.svg',
      desc: 'پوستر گیکی با ترکیب رنگ نئون، مناسب دیوار اتاق گیم، فضای استریم، اتاق سینما و دکور مدرن.',
      features: ['چاپ با کیفیت بالا', 'رنگ‌های زنده و نئونی', 'مناسب قاب A3', 'کاغذ ضخیم و مقاوم']
    },
    'pixel-box': {
      id: 'pixel-box',
      title: 'Pixel Box Collection',
      category: 'Merch / Best Seller',
      price: 690000,
      priceText: '۶۹۰,۰۰۰ تومان',
      image: 'assets/hero-gaming.svg',
      desc: 'یک پک سورپرایزی برای عاشقان آیتم‌های پیکسلی؛ شامل کارت، استیکر، پین و آیتم‌های کوچک کلکسیونی با حال‌وهوای آرکید.',
      features: ['شامل چند آیتم سورپرایزی', 'تم پیکسلی و آرکید', 'مناسب هدیه', 'طراحی اختصاصی Pixoris']
    }
  };

  const articles = {
    'game-trailer': {
      title: 'تاریخ انتشار بازی اکشن موردانتظار اعلام شد',
      category: 'Game News',
      time: '6 دقیقه مطالعه',
      image: 'assets/card-game.svg',
      intro: 'استودیو سازنده با انتشار یک ویدیو کوتاه، پنجره انتشار بازی جدید خود را اعلام کرد و موج تازه‌ای از بحث‌ها را در جامعه گیمرها ساخت.',
      body: [
        'این بازی با تمرکز روی مبارزات سریع، طراحی مراحل نیمه‌باز و سیستم شخصی‌سازی عمیق معرفی شده است. طبق اطلاعات اولیه، سازندگان تلاش کرده‌اند تجربه‌ای بین اکشن سینمایی و گیم‌پلی رقابتی خلق کنند.',
        'در تریلر جدید، نورپردازی نئونی، محیط‌های شهری و طراحی دشمنان بیش از هر چیز جلب توجه می‌کند. نکته جذاب‌تر این است که بازی قرار است چند حالت مختلف برای بازیکنان تک‌نفره و چندنفره داشته باشد.',
        'پیکسورا در هفته‌های آینده جزئیات بیشتری از گیم‌پلی، سیستم پیشرفت و محتوای پس از انتشار منتشر خواهد کرد.'
      ]
    },
    'cinema-adaptation': {
      title: 'چرا بعضی فیلم‌های اقتباسی از بازی‌ها بالاخره جواب می‌دهند؟',
      category: 'Cinema Analysis',
      time: '8 دقیقه مطالعه',
      image: 'assets/card-cinema.svg',
      intro: 'سال‌ها اقتباس‌های گیمی با شکست همراه بودند، اما موج جدید نشان می‌دهد که سینما بالاخره زبان بازی‌ها را بهتر فهمیده است.',
      body: [
        'اقتباس موفق الزاماً کپی مستقیم بازی نیست. مهم این است که سازندگان روح اثر اصلی، جهان، شخصیت‌ها و حس تجربه را درست منتقل کنند.',
        'وقتی فیلم‌ساز به جای تقلید سطحی از مراحل بازی، منطق جهان و انگیزه شخصیت‌ها را درک کند، نتیجه برای مخاطب عام و طرفدار قدیمی قابل قبول‌تر می‌شود.',
        'از طرف دیگر، مخاطبان امروز به آثار گیکی جدی‌تر نگاه می‌کنند و همین باعث شده سرمایه‌گذاری روی کیفیت تولید، فیلمنامه و بازیگری بیشتر شود.'
      ]
    },
    'figure-drop': {
      title: 'پیش‌فروش یک فیگور محدود آغاز شد',
      category: 'Shop News',
      time: '4 دقیقه مطالعه',
      image: 'assets/card-shop.svg',
      intro: 'فروشگاه پیکسورا پیش‌فروش یک اکشن‌فیگور محدود با طراحی سایبرپانکی و بسته‌بندی کلکسیونی را شروع کرده است.',
      body: [
        'این فیگور برای طرفداران طراحی نئونی، شخصیت‌های آینده‌نگر و دکورهای گیمینگ ساخته شده است.',
        'موجودی اولیه محدود خواهد بود و سفارش‌ها براساس زمان ثبت در اولویت ارسال قرار می‌گیرند.',
        'در صفحه محصول می‌توان تصاویر، ویژگی‌ها و قیمت را مشاهده کرد و آن را به سبد خرید اضافه کرد.'
      ]
    },
    'esports-weekend': {
      title: 'نتایج تورنمنت آخر هفته و ستاره‌های جدید صحنه رقابتی',
      category: 'Esports',
      time: '5 دقیقه مطالعه',
      image: 'assets/card-game.svg',
      intro: 'رقابت‌های آخر هفته با چند نتیجه غیرمنتظره و درخشش بازیکنان تازه‌وارد به پایان رسید.',
      body: [
        'تیم‌های تازه‌کار نشان دادند که فاصله با مدعیان کمتر از چیزی است که تصور می‌شد.',
        'تمرکز روی هماهنگی تیمی، سرعت تصمیم‌گیری و کنترل نقشه، عوامل اصلی موفقیت تیم برنده بودند.',
        'این نتایج می‌تواند ترکیب رده‌بندی فصل بعد را به شکل قابل توجهی تغییر دهد.'
      ]
    },
    'scifi-series': {
      title: 'سریال علمی‌تخیلی جدید، رکورد آغاز فصل را شکست',
      category: 'Series',
      time: '8 دقیقه مطالعه',
      image: 'assets/card-cinema.svg',
      intro: 'قسمت اول فصل جدید با استقبال بالا منتشر شد و فضای شبکه‌های اجتماعی را درگیر کرد.',
      body: [
        'طراحی بصری سریال، موسیقی و پایان‌بندی قسمت اول از دلایل اصلی واکنش مثبت کاربران بوده است.',
        'با این حال، برخی منتقدان معتقدند سریال باید در ادامه از نمایش صرف فاصله بگیرد و شخصیت‌ها را عمیق‌تر کند.',
        'قسمت بعدی می‌تواند مشخص کند که این شروع قدرتمند ادامه‌دار خواهد بود یا نه.'
      ]
    },
    'pixel-merch': {
      title: 'استیکرها و پین‌های پیکسلی جدید وارد فروشگاه شدند',
      category: 'Merch',
      time: '3 دقیقه مطالعه',
      image: 'assets/card-shop.svg',
      intro: 'لاین جدید مرچ‌های پیکسلی با الهام از بازی‌های آرکید کلاسیک به فروشگاه اضافه شد.',
      body: [
        'این مجموعه شامل استیکر، پین، کارت و آیتم‌های کوچک مناسب لپ‌تاپ، کیس و دکور اتاق است.',
        'زبان بصری مجموعه به Pac-Man، پیکسل‌آرت و حال‌وهوای کنسول‌های قدیمی اشاره دارد.',
        'این محصولات می‌توانند به‌عنوان آیتم اقتصادی و هدیه کوچک برای گیمرها گزینه خوبی باشند.'
      ]
    },
    'story-games': {
      title: 'چرا بازی‌های داستان‌محور هنوز برای گیمرها مهم‌اند؟',
      category: 'Deep Dive',
      time: '12 دقیقه مطالعه',
      image: 'assets/card-game.svg',
      intro: 'با وجود رشد بازی‌های آنلاین و رقابتی، بازی‌های داستان‌محور هنوز جایگاه عاطفی و فرهنگی مهمی دارند.',
      body: [
        'داستان خوب باعث می‌شود بازی فراتر از مکانیک باشد و در ذهن بازیکن بماند.',
        'انتخاب‌های اخلاقی، شخصیت‌پردازی و موسیقی می‌توانند تجربه‌ای بسازند که حتی سال‌ها بعد به یاد آورده شود.',
        'در نهایت، ماندگاری یک بازی معمولاً از ترکیب هوشمندانه گیم‌پلی و روایت به وجود می‌آید.'
      ]
    },
    'graphics-gameplay': {
      title: 'گرافیک یا گیم‌پلی؟ کدام عامل بازی را ماندگار می‌کند؟',
      category: 'Versus',
      time: '7 دقیقه مطالعه',
      image: 'assets/card-game.svg',
      intro: 'گرافیک نگاه اول را می‌سازد، اما گیم‌پلی چیزی است که بازیکن را نگه می‌دارد.',
      body: [
        'یک بازی زیبا می‌تواند توجه اولیه را جلب کند، اما اگر کنترل، ریتم و پاداش‌دهی درست نباشد، تجربه خیلی زود فراموش می‌شود.',
        'از طرف دیگر، بازی‌هایی با گرافیک ساده اما مکانیک دقیق، گاهی سال‌ها محبوب می‌مانند.',
        'بهترین آثار معمولاً تعادل دارند: هویت بصری قوی، سیستم بازی عمیق و تجربه کاربری روان.'
      ]
    },
    'geek-merch': {
      title: 'نقش محصولات گیکی در ساخت هویت برای یک برند رسانه‌ای',
      category: 'Culture',
      time: '11 دقیقه مطالعه',
      image: 'assets/card-shop.svg',
      intro: 'وقتی رسانه و فروشگاه کنار هم قرار می‌گیرند، تجربه کاربر کامل‌تر می‌شود.',
      body: [
        'کاربر فقط خبر نمی‌خواند؛ او می‌خواهد بخشی از دنیای مورد علاقه‌اش را لمس کند، بخرد و در فضای خودش نمایش دهد.',
        'مرچ، فیگور و پوستر به برند کمک می‌کنند از یک سایت خبری ساده به یک جامعه طرفداری تبدیل شود.',
        'برای پیکسورا، این ترکیب می‌تواند یک مزیت جدی نسبت به رسانه‌های صرفاً محتوایی باشد.'
      ]
    }
  };

  const toman = (num) => {
    const safe = Number(num) || 0;
    try {
      return new Intl.NumberFormat('fa-IR').format(safe) + ' تومان';
    } catch (e) {
      return safe.toLocaleString() + ' تومان';
    }
  };

  const showToast = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1800);
  };

  const getCart = () => JSON.parse(localStorage.getItem('pixorisCart') || '{}');
  const saveCart = (cart) => {
    localStorage.setItem('pixorisCart', JSON.stringify(cart));
    updateCartCount();
  };

  const updateCartCount = () => {
    const cart = getCart();
    const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = count);
  };

  const addToCart = (id, qty = 1) => {
    if (!products[id]) return;
    const cart = getCart();
    cart[id] = (cart[id] || 0) + qty;
    saveCart(cart);
    showToast('به سبد خرید اضافه شد ✅');
    renderCartPage();
  };

  const changeQty = (id, delta) => {
    const cart = getCart();
    cart[id] = (cart[id] || 0) + delta;
    if (cart[id] <= 0) delete cart[id];
    saveCart(cart);
    renderCartPage();
  };

  const removeFromCart = (id) => {
    const cart = getCart();
    delete cart[id];
    saveCart(cart);
    renderCartPage();
    showToast('محصول حذف شد');
  };

  const clearCart = () => {
    localStorage.removeItem('pixorisCart');
    updateCartCount();
    renderCartPage();
    showToast('سبد خرید خالی شد');
  };

  const roles = {
    user: {
      title: 'کاربر عادی',
      desc: 'امکان خرید، دیدن خبرها، استفاده از Pac Mode و مدیریت سبد خرید.',
      access: ['مشاهده خبرها و تحلیل‌ها', 'افزودن محصول به سبد خرید', 'استفاده از سبد خرید و Pac Mode']
    },
    manager: {
      title: 'مدیر سایت',
      desc: 'دسترسی سطح بالا برای مدیریت سایت، محصولات، سفارش‌ها و کاربران.',
      access: ['مدیریت محصولات و قیمت‌ها', 'مدیریت سفارش‌ها و کاربران', 'مدیریت خبرها و تنظیمات سایت']
    }
  };

  const getUsers = () => {
    try { return JSON.parse(localStorage.getItem('pixorisUsers') || '[]'); }
    catch (e) { return []; }
  };

  const saveUsers = (users) => {
    localStorage.setItem('pixorisUsers', JSON.stringify(users));
  };

  const getCurrentUser = () => {
    try { return JSON.parse(localStorage.getItem('pixorisCurrentUser') || 'null'); }
    catch (e) { return null; }
  };

  const saveCurrentUser = (user) => {
    localStorage.setItem('pixorisCurrentUser', JSON.stringify(user));
    updateAuthUI();
  };

  const roleTitle = (role) => (roles[role] || roles.user).title;

  const updateAuthUI = () => {
    const user = getCurrentUser();
    if (authEntry) {
      const label = authEntry.querySelector('.auth-label');
      if (label) {
        label.textContent = user ? `${user.username} | ${roleTitle(user.role)}` : 'ورود / عضویت';
      }
    }

    if (accountPanel && user) {
      const role = roles[user.role] || roles.user;
      accountPanel.innerHTML = `
        <h2>حساب فعال</h2>
        <div class="current-account-card">
          <h3>${user.username}</h3>
          <p>${user.email ? user.email : 'ورود با نام کاربری انجام شده است'}</p>
          <span class="role-badge ${user.role}">${role.title}</span>
          <p>${role.desc}</p>
          <ul class="product-feature-list">
            ${role.access.map(item => `<li>✓ ${item}</li>`).join('')}
          </ul>
          <button class="btn logout-btn" data-logout type="button">خروج از حساب</button>
        </div>
      `;
      const logout = accountPanel.querySelector('[data-logout]');
      if (logout) {
        logout.addEventListener('click', () => {
          localStorage.removeItem('pixorisCurrentUser');
          showToast('از حساب خارج شدی');
          location.reload();
        });
      }
    }
  };

  let selectedRole = 'user';
  let authMode = 'login';

  const setAuthMode = (mode) => {
    authMode = mode;
    if (authForm) authForm.dataset.authMode = mode;

    document.querySelectorAll('[data-register-only]').forEach(el => {
      el.hidden = mode !== 'register';
    });

    const emailInput = document.querySelector('input[name="email"]');
    if (emailInput) emailInput.required = mode === 'register';

    const submit = document.querySelector('.auth-submit');
    if (submit) submit.textContent = mode === 'register' ? 'ساخت حساب جدید' : 'ورود به حساب';

    authTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.authTab === mode);
    });
  };

  roleOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRole = btn.dataset.role || 'user';
      roleOptions.forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setAuthMode(tab.dataset.authTab === 'register' ? 'register' : 'login');
    });
  });

  if (authForm) {
    setAuthMode('login');

    authForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const data = new FormData(authForm);
      const username = (data.get('username') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const password = (data.get('password') || '').toString();

      if (!username || !password) {
        showToast('نام کاربری و رمز عبور را وارد کن');
        return;
      }

      const users = getUsers();

      if (authMode === 'register') {
        if (!email) {
          showToast('برای عضویت جیمیل را وارد کن');
          return;
        }

        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
          showToast('این نام کاربری قبلاً ثبت شده');
          return;
        }

        const newUser = {
          username,
          email,
          password,
          role: selectedRole
        };

        users.push(newUser);
        saveUsers(users);

        const safeUser = { username, email, role: selectedRole };
        saveCurrentUser(safeUser);
        showToast(`${roleTitle(selectedRole)} ثبت‌نام و وارد شد ✅`);
        setTimeout(() => location.href = 'index.html', 900);
        return;
      }

      const found = users.find(u =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password
      );

      if (!found) {
        showToast('نام کاربری یا رمز عبور اشتباه است');
        return;
      }

      saveCurrentUser({
        username: found.username,
        email: found.email,
        role: found.role || 'user'
      });

      showToast(`${roleTitle(found.role || 'user')} وارد شد ✅`);
      setTimeout(() => location.href = 'index.html', 900);
    });
  }

  window.PixorisCart = { addToCart, changeQty, removeFromCart, clearCart };

  const setMode = (state) => {
    pixelMode = state;
    body.classList.toggle('pixel-mode', state);
    localStorage.setItem('pixorisPixelMode', state ? 'on' : 'off');
    if (toggleBtn) {
      toggleBtn.querySelector('.label').textContent = state ? 'Normal Mode' : 'Pac Mode';
    }
  };

  setMode(pixelMode);
  updateCartCount();
  updateAuthUI();
  updateSoundButton();
  if (bgAudio) { syncAudio(false); }

  if (soundBtn) {
    soundBtn.addEventListener('click', async () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('pixorisSoundEnabled', soundEnabled ? 'on' : 'off');
      if (bgAudio) {
        bgAudio.muted = !soundEnabled;
        if (soundEnabled) {
          try { await bgAudio.play(); } catch (e) {}
        }
      }
      updateSoundButton();
      showToast(soundEnabled ? 'آهنگ فعال شد 🎵' : 'آهنگ بی‌صدا شد 🔇');
    });
  }

  if (toggleBtn && overlay) {
    toggleBtn.addEventListener('click', () => {
      if (animating) return;
      animating = true;
      overlay.classList.remove('reverse');
      overlay.classList.add('show');
      if (!pixelMode) {
        setTimeout(() => setMode(true), 1350);
        setTimeout(() => {
          overlay.classList.remove('show');
          animating = false;
        }, 2400);
      } else {
        overlay.classList.add('reverse');
        setTimeout(() => setMode(false), 1450);
        setTimeout(() => {
          overlay.classList.remove('show', 'reverse');
          animating = false;
        }, 2400);
      }
    });
  }

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => mobileNav.classList.toggle('open'));
  }

  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(link => {
    if (link.dataset.page === body.dataset.page) link.classList.add('active');
  });

  document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.addToCart));
  });

  const renderArticle = () => {
    const host = document.querySelector('[data-article-detail]');
    if (!host) return;
    const id = new URLSearchParams(location.search).get('id') || 'game-trailer';
    const article = articles[id] || articles['game-trailer'];
    host.innerHTML = `
      <div class="article-cover"><img src="${article.image}" alt="${article.title}"></div>
      <div class="article-content">
        <div class="article-info">
          <span class="tag">${article.category}</span>
          <span class="tag">${article.time}</span>
          <span class="tag">Pixoris Editorial</span>
        </div>
        <h1>${article.title}</h1>
        <p><strong>${article.intro}</strong></p>
        ${article.body.map((p, i) => i === 1 ? `<h2>جزئیات بیشتر</h2><p>${p}</p>` : `<p>${p}</p>`).join('')}
        <div class="hero-actions">
          <a class="btn" href="news.html">بازگشت به خبرها</a>
          <a class="btn btn-outline" href="shop.html">مشاهده فروشگاه</a>
        </div>
      </div>`;
  };

  const renderProduct = () => {
    const host = document.querySelector('[data-product-detail]');
    if (!host) return;
    const id = new URLSearchParams(location.search).get('id') || 'cyber-hero';
    const product = products[id] || products['cyber-hero'];
    host.innerHTML = `
      <div class="product-detail-inner">
        <div class="product-gallery"><img src="${product.image}" alt="${product.title}"></div>
        <div class="product-info">
          <div class="article-info">
            <span class="tag">${product.category}</span>
            <span class="tag">موجود</span>
          </div>
          <h1>${product.title}</h1>
          <p>${product.desc}</p>
          <div class="product-price"><span>قیمت:</span> ${product.priceText}</div>
          <ul class="product-feature-list">
            ${product.features.map(f => `<li>✓ ${f}</li>`).join('')}
          </ul>
          <div class="hero-actions">
            <button class="btn" data-product-add="${product.id}">افزودن به سبد خرید</button>
            <a class="btn btn-outline" href="cart.html">رفتن به سبد خرید</a>
          </div>
        </div>
      </div>`;
    host.querySelector('[data-product-add]').addEventListener('click', () => addToCart(product.id));
  };

  const renderCartPage = () => {
    const host = document.querySelector('[data-cart-page]');
    if (!host) return;
    const cart = getCart();
    const ids = Object.keys(cart);

    if (!ids.length) {
      host.innerHTML = `
        <div class="empty-cart">
          <h3>سبد خریدت خالیه 👾</h3>
          <p>از فروشگاه Pixoris چند آیتم گیکی انتخاب کن و بعد اینجا مدیریت‌شون کن.</p>
          <a class="btn" href="shop.html">رفتن به فروشگاه</a>
        </div>`;
      return;
    }

    let total = 0;
    const rows = ids.map(id => {
      const p = products[id];
      if (!p) return '';
      const qty = cart[id];
      const sub = p.price * qty;
      total += sub;
      return `
        <tr>
          <td>
            <div class="cart-product">
              <img src="${p.image}" alt="${p.title}">
              <div>
                <strong>${p.title}</strong>
                <div class="meta"><span>${p.category}</span></div>
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
          <td><button class="remove-btn" onclick="PixorisCart.removeFromCart('${id}')">حذف</button></td>
        </tr>`;
    }).join('');

    host.innerHTML = `
      <table class="cart-table">
        <thead>
          <tr>
            <th>محصول</th>
            <th>قیمت</th>
            <th>تعداد</th>
            <th>جمع</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="cart-summary">
        <div>
          <p>جمع کل سبد خرید</p>
          <strong>${toman(total)}</strong>
        </div>
        <div class="hero-actions">
          <button class="btn">ادامه خرید / پرداخت نمایشی</button>
          <button class="btn btn-outline" onclick="PixorisCart.clearCart()">خالی کردن سبد</button>
        </div>
      </div>`;
  };

  renderArticle();
  renderProduct();
  renderCartPage();

  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: .12 });
  revealEls.forEach(el => observer.observe(el));
});






/* Pixoris v1.3 COMPLETE: audio persistence + resume across pages */
window.addEventListener('load', () => {
  const audio = document.getElementById('bgAudio');
  const soundBtn = document.querySelector('[data-sound-toggle]');
  if (!audio) return;

  const getSavedTime = () => parseFloat(localStorage.getItem('pixoris_audio_time') || '0');
  const isEnabled = () => localStorage.getItem('pixorisSoundEnabled') === 'on';
  const saveTime = () => {
    try {
      if (!Number.isNaN(audio.currentTime)) {
        localStorage.setItem('pixoris_audio_time', String(audio.currentTime));
      }
    } catch (e) {}
  };

  const applyLabel = () => {
    if (!soundBtn) return;
    const label = soundBtn.querySelector('.sound-label');
    soundBtn.classList.toggle('muted', !isEnabled());
    if (label) label.textContent = isEnabled() ? 'Music On' : 'Music Off';
  };

  const resumePlayback = async () => {
    const desiredTime = getSavedTime();
    const enabled = isEnabled();
    audio.loop = true;
    audio.volume = 0.55;
    audio.muted = !enabled;
    try {
      if (!Number.isNaN(desiredTime) && desiredTime > 0) {
        if (!audio.duration || desiredTime < audio.duration - 0.25) {
          audio.currentTime = desiredTime;
        }
      }
    } catch (e) {}
    if (enabled) {
      try { await audio.play(); } catch (e) {}
    } else {
      try { audio.pause(); } catch (e) {}
    }
    applyLabel();
  };

  if (audio.readyState >= 1) resumePlayback();
  else audio.addEventListener('loadedmetadata', resumePlayback, { once: true });

  audio.addEventListener('timeupdate', saveTime);
  window.addEventListener('beforeunload', saveTime);
  document.querySelectorAll('a[href]').forEach(link => link.addEventListener('click', saveTime, { capture: true }));

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      setTimeout(async () => {
        if (isEnabled()) {
          audio.muted = false;
          try { await audio.play(); } catch (e) {}
        } else {
          saveTime();
          try { audio.pause(); } catch (e) {}
          audio.muted = true;
        }
        applyLabel();
      }, 0);
    });
  }
});
