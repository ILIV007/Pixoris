// =========================================================
// Pixoris v4 — UI Modules (PixelMode, Audio, MobileMenu, etc.)
// =========================================================

import { qs, qsa } from './utils.js';
import { showToast } from './toast.js';

export const PixelMode = {
  init: () => {
    const body = document.body;
    const toggleBtn = qs('[data-pac-toggle]');
    const overlay = qs('.pixel-overlay');
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

export const AudioSystem = {
  init: () => {
    const bgAudio = document.getElementById('bgAudio');
    const soundBtn = qs('[data-sound-toggle]');
    if (!bgAudio || !soundBtn) return;
    let soundEnabled = localStorage.getItem('pixorisSoundEnabled') === 'on';

    const updateBtn = () => {
      soundBtn.classList.toggle('muted', !soundEnabled);
      const label = soundBtn.querySelector('.sound-label');
      if (label) label.textContent = soundEnabled ? 'Music On' : 'Music Off';
    };

    const sync = async () => {
      bgAudio.loop = true;
      bgAudio.muted = !soundEnabled;
      bgAudio.volume = 0.55;
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

export const MobileMenu = {
  init: () => {
    const menuBtn = qs('[data-menu-btn]');
    const mobileNav = qs('.mobile-nav');
    if (menuBtn && mobileNav) {
      menuBtn.addEventListener('click', () => mobileNav.classList.toggle('open'));
    }
  }
};

export const ScrollReveal = {
  init: () => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.12 });
    qsa('.reveal').forEach(el => observer.observe(el));
  }
};

export const NavActive = {
  init: () => {
    const page = document.body.dataset.page;
    qsa('.nav-links a, .mobile-nav a').forEach(link => {
      if (link.dataset.page === page) link.classList.add('active');
    });
  }
};

export const Auth = {
  getUsers: () => {
    try { return JSON.parse(localStorage.getItem('pixorisUsers') || '[]'); }
    catch { return []; }
  },
  saveUsers: (users) => localStorage.setItem('pixorisUsers', JSON.stringify(users)),

  getCurrentUser: () => {
    try { return JSON.parse(localStorage.getItem('pixorisCurrentUser') || 'null'); }
    catch { return null; }
  },
  saveCurrentUser: (user) => {
    localStorage.setItem('pixorisCurrentUser', JSON.stringify(user));
    Auth.updateUI();
  },

  updateUI: () => {
    const user = Auth.getCurrentUser();
    const authEntry = qs('[data-auth-entry]');
    if (authEntry) {
      const label = authEntry.querySelector('.auth-label');
      if (label) label.textContent = user ? user.username : 'ورود / عضویت';
    }
    const accountPanel = qs('[data-account-panel]');
    if (accountPanel && user) {
      const { escapeHtml } = import('./utils.js'); // lazy
      accountPanel.innerHTML = `
        <h2>حساب فعال</h2>
        <div class="current-account-card">
          <h3>${user.username}</h3>
          <p>${user.email || 'ورود با نام کاربری'}</p>
          <span class="role-badge user">کاربر عادی</span>
          <p>امکان خرید، دیدن خبرها، استفاده از Pac Mode و مدیریت سبد خرید.</p>
          <button class="btn logout-btn" data-logout type="button">خروج از حساب</button>
        </div>`;
      const logout = accountPanel.querySelector('[data-logout]');
      if (logout) {
        logout.addEventListener('click', () => {
          localStorage.removeItem('pixorisCurrentUser');
          showToast('از حساب خارج شدی');
          location.reload();
        });
      }
    }
  },

  initForm: () => {
    const authForm = qs('[data-auth-form]');
    if (!authForm) return;
    let authMode = 'login';

    const setMode = (mode) => {
      authMode = mode;
      authForm.dataset.authMode = mode;
      qsa('[data-register-only]').forEach(el => el.hidden = mode !== 'register');
      const emailInput = qs('input[name="email"]');
      if (emailInput) emailInput.required = mode === 'register';
      const submit = qs('.auth-submit');
      if (submit) submit.textContent = mode === 'register' ? 'ساخت حساب جدید' : 'ورود به حساب';
      qsa('[data-auth-tab]').forEach(tab => tab.classList.toggle('active', tab.dataset.authTab === mode));
    };

    qsa('[data-auth-tab]').forEach(tab => {
      tab.addEventListener('click', () => setMode(tab.dataset.authTab));
    });
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

// Global aliases for inline onclick handlers
window.PixorisToast = showToast;
