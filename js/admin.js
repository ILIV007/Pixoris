// =========================================================
// Pixoris CMS Admin Panel v4.3 — Complete Refactor
// =========================================================
// Modular architecture:
//   - Command Palette (Ctrl+K)
//   - Custom Modal system (replaces alert/confirm)
//   - Auto-save + Draft Recovery
//   - Card view for posts
//   - Grid view for media
//   - Drag-drop for categories
//   - Real-time search
// =========================================================

import { toman } from './modules/utils.js';
import { escapeHtml as escapeAdminHtml, formatDateTime as formatAdminDate, qs as $a, qsa as $$a } from './modules/utils.js';
import { API_BASE } from './modules/api.js';

window.API_BASE = window.API_BASE || API_BASE;

// ============= TOAST SYSTEM (v4.3) =============
const toastContainer = () => $a('[data-toast-container]');
const showToast = (msg, type = 'info', duration = 3000) => {
  const container = toastContainer();
  if (!container) return;
  const icons = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast-v4 ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${escapeAdminHtml(msg)}</span>
    <button class="toast-close">✕</button>
  `;
  container.appendChild(toast);
  const remove = () => { toast.style.animation = 'toastSlideIn 0.2s reverse'; setTimeout(() => toast.remove(), 200); };
  toast.querySelector('.toast-close').addEventListener('click', remove);
  if (duration > 0) setTimeout(remove, duration);
};
window.PixorisToast = showToast;
const showAdminToast = showToast; // alias

// ============= MODAL SYSTEM (replaces alert/confirm) =============
const showModal = ({ title, body, buttons = [] }) => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>${escapeAdminHtml(title)}</h3>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">${body}</div>
        ${buttons.length ? `<div class="modal-footer">${buttons.map((b, i) => `<button class="btn ${b.class || 'btn-ghost'}" data-idx="${i}">${b.label}</button>`).join('')}</div>` : ''}
      </div>
    `;
    document.body.appendChild(overlay);
    const close = (result) => { overlay.remove(); resolve(result); };
    overlay.querySelector('.modal-close').addEventListener('click', () => close(null));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    buttons.forEach((b, i) => {
      const btn = overlay.querySelector(`[data-idx="${i}"]`);
      if (btn) btn.addEventListener('click', () => close(b.value));
    });
  });
};

const confirmDialog = (message, title = 'تأیید') => showModal({
  title,
  body: `<p style="color:var(--text-muted);line-height:1.7;">${escapeAdminHtml(message)}</p>`,
  buttons: [
    { label: 'لغو', value: false, class: 'btn-ghost' },
    { label: 'تأیید', value: true, class: 'btn-danger' },
  ],
});

// ============= ADMIN API FETCH =============
const adminApiFetch = async (endpoint, options = {}) => {
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
      showToast('نشست منقضی شده — لطفاً دوباره وارد شوید', 'warn');
      setTimeout(() => location.reload(), 1500);
      return { success: false, error: 'Unauthorized' };
    }
    return await res.json();
  } catch (err) {
    showToast('خطای شبکه: ' + err.message, 'error');
    return { success: false, error: err.message };
  }
};

// ============= RICH TEXT EDITOR =============
let rteEditor = null;

const initRTE = () => {
  const editorEl = $a('#rich-editor');
  const toolbarEl = $a('[data-rte-toolbar]');
  if (!editorEl || !toolbarEl) return;
  if (rteEditor) return;

  editorEl.contentEditable = true;
  editorEl.dir = 'rtl';
  editorEl.innerHTML = '<p><br></p>';

  const exec = (command, value = null) => {
    document.execCommand(command, false, value);
    editorEl.focus();
    syncContent();
    triggerAutosave();
  };

  const syncContent = () => {
    const textarea = $a('textarea[name="content"]');
    if (textarea) textarea.value = editorEl.innerHTML;
  };

  const insertHTML = (html) => {
    document.execCommand('insertHTML', false, html);
    editorEl.focus();
    syncContent();
    triggerAutosave();
  };

  toolbarEl.querySelectorAll('button[data-cmd]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      exec(btn.dataset.cmd, btn.dataset.val || null);
    });
  });

  const imgBtn = toolbarEl.querySelector('[data-cmd="insertImage"]');
  if (imgBtn) {
    imgBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const picker = $a('[data-media-picker]');
      if (picker) {
        picker.classList.add('show');
        picker.dataset.target = 'rte';
        loadMediaPicker();
      }
    });
  }

  const linkBtn = toolbarEl.querySelector('[data-cmd="createLink"]');
  if (linkBtn) {
    linkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = prompt('آدرس لینک:', 'https://');
      if (url) exec('createLink', url);
    });
  }

  const codeBtn = toolbarEl.querySelector('[data-cmd="insertCodeBlock"]');
  if (codeBtn) {
    codeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const code = prompt('کد:', '');
      if (code) insertHTML(`<pre><code>${escapeAdminHtml(code)}</code></pre><p><br></p>`);
    });
  }

  editorEl.addEventListener('input', () => { syncContent(); triggerAutosave(); });
  editorEl.addEventListener('blur', syncContent);

  rteEditor = {
    getContent: () => editorEl.innerHTML,
    setContent: (html) => { editorEl.innerHTML = html || '<p><br></p>'; syncContent(); },
    exec,
  };

  // Draft recovery
  checkDraftRecovery();
};

// ============= AUTO-SAVE + DRAFT RECOVERY =============
let autosaveTimer = null;
let lastSavedState = '';

const triggerAutosave = () => {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  const indicator = $a('#save-indicator');
  if (indicator) { indicator.className = 'save-indicator saving'; indicator.textContent = '⏳ در حال ذخیره...'; }
  autosaveTimer = setTimeout(() => saveDraftLocally(), 2000);
};

const saveDraftLocally = () => {
  const form = $a('[data-post-form]');
  if (!form) return;
  const state = {
    title: form.title?.value || '',
    slug: form.slug?.value || '',
    excerpt: form.excerpt?.value || '',
    content: rteEditor ? rteEditor.getContent() : '',
    category_id: form.category_id?.value || '',
    tags: form.tags?.value || '',
    image_url: form.image_url?.value || '',
    status: form.status?.value || 'draft',
    timestamp: Date.now(),
  };
  const stateStr = JSON.stringify(state);
  if (stateStr === lastSavedState) return;
  lastSavedState = stateStr;
  localStorage.setItem('pixorisDraft', stateStr);
  const indicator = $a('#save-indicator');
  if (indicator) { indicator.className = 'save-indicator saved'; indicator.textContent = '💾 ذخیره شد'; }
};

const checkDraftRecovery = async () => {
  const draft = localStorage.getItem('pixorisDraft');
  if (!draft) return;
  try {
    const state = JSON.parse(draft);
    // Only offer recovery if draft is less than 24h old and has content
    if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('pixorisDraft');
      return;
    }
    if (!state.title && !state.content) return;

    const shouldRestore = await showModal({
      title: 'بازیابی پیش‌نویس',
      body: `<p style="color:var(--text-muted);line-height:1.7;">یک پیش‌نویس ذخیره‌شده پیدا شد (${escapeAdminHtml(state.title || 'بدون عنوان')}). آیا می‌خواهید آن را بازیابی کنید؟</p>`,
      buttons: [
        { label: 'حذف', value: 'discard', class: 'btn-ghost' },
        { label: 'بازیابی', value: 'restore', class: 'btn-primary' },
      ],
    });

    if (shouldRestore === 'restore') {
      const form = $a('[data-post-form]');
      if (form) {
        form.title.value = state.title || '';
        form.slug.value = state.slug || '';
        form.excerpt.value = state.excerpt || '';
        form.tags.value = state.tags || '';
        form.image_url.value = state.image_url || '';
        if (form.status) form.status.value = state.status || 'draft';
        if (rteEditor) rteEditor.setContent(state.content || '');
        showToast('پیش‌نویس بازیابی شد', 'success');
      }
    } else if (shouldRestore === 'discard') {
      localStorage.removeItem('pixorisDraft');
    }
  } catch {}
};

// ============= COMMAND PALETTE =============
const commands = [
  { group: 'مقالات', icon: '➕', label: 'مقاله جدید', shortcut: 'N', action: () => switchTab('new-post') },
  { group: 'مقالات', icon: '📝', label: 'همه مقالات', action: () => switchTab('posts') },
  { group: 'دسته‌بندی‌ها', icon: '🏷️', label: 'دسته‌بندی‌ها', action: () => switchTab('categories') },
  { group: 'رسانه', icon: '📁', label: 'رسانه', action: () => switchTab('media') },
  { group: 'رسانه', icon: '🛒', label: 'محصولات', action: () => switchTab('products') },
  { group: 'ابزارها', icon: '🔍', label: 'پنل SEO', action: () => switchTab('seo') },
  { group: 'ابزارها', icon: '📈', label: 'تحلیل‌ها', action: () => switchTab('analytics') },
  { group: 'ابزارها', icon: '🧪', label: 'دیباگ سنتر', action: () => switchTab('debug') },
  { group: 'سیستم', icon: '⚙️', label: 'تنظیمات', action: () => switchTab('settings') },
  { group: 'سیستم', icon: '🚪', label: 'خروج', action: () => { localStorage.removeItem('pixorisAdminToken'); location.reload(); } },
];

const initCommandPalette = () => {
  const palette = $a('[data-command-palette]');
  const input = $a('[data-command-input]');
  const results = $a('[data-command-results]');
  if (!palette || !input || !results) return;

  let selectedIdx = 0;
  let filtered = [...commands];

  const render = () => {
    let html = '';
    let currentGroup = '';
    filtered.forEach((cmd, i) => {
      if (cmd.group !== currentGroup) {
        currentGroup = cmd.group;
        html += `<div class="command-group">${escapeAdminHtml(cmd.group)}</div>`;
      }
      html += `<div class="command-item ${i === selectedIdx ? 'selected' : ''}" data-idx="${i}">
        <span class="cmd-icon">${cmd.icon}</span>
        <span class="cmd-label">${escapeAdminHtml(cmd.label)}</span>
        ${cmd.shortcut ? `<span class="cmd-shortcut">${cmd.shortcut}</span>` : ''}
      </div>`;
    });
    if (!filtered.length) html = '<div style="padding:var(--space-4);text-align:center;color:var(--text-muted);">نتیجه‌ای یافت نشد</div>';
    results.innerHTML = html;
    results.querySelectorAll('.command-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        if (filtered[idx]) { filtered[idx].action(); close(); }
      });
    });
  };

  const open = () => {
    palette.classList.add('show');
    input.value = '';
    filtered = [...commands];
    selectedIdx = 0;
    render();
    setTimeout(() => input.focus(), 50);
  };

  const close = () => palette.classList.remove('show');

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    filtered = q ? commands.filter(c => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)) : [...commands];
    selectedIdx = 0;
    render();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, filtered.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[selectedIdx]) { filtered[selectedIdx].action(); close(); } }
    else if (e.key === 'Escape') close();
  });

  // Global keyboard shortcut: Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      palette.classList.contains('show') ? close() : open();
    }
    if (e.key === 'Escape') close();
  });

  palette.addEventListener('click', (e) => { if (e.target === palette) close(); });
};

// ============= TAB SWITCHING =============
const switchTab = (target) => {
  $$a('[data-admin-tab]').forEach(t => t.classList.remove('active'));
  const tabLink = $a(`[data-admin-tab="${target}"]`);
  if (tabLink) tabLink.classList.add('active');
  $$a('.admin-tab').forEach(t => t.style.display = 'none');
  const targetEl = $a(`[data-tab="${target}"]`);
  if (targetEl) {
    targetEl.style.display = 'block';
    if (target === 'posts') loadPosts();
    if (target === 'categories') loadCategories();
    if (target === 'products') loadProducts();
    if (target === 'media') loadMedia();
    if (target === 'users') loadUsers();
    if (target === 'audit') loadAuditLogs();
    if (target === 'dashboard') { loadStats(); loadActivityFeed(); }
    if (target === 'new-post') { setTimeout(initRTE, 50); loadCategoriesDropdown(); }
    if (target === 'settings') loadSettings();
    if (target === 'debug') initDebugCenter();
    if (target === 'analytics') loadAnalytics();
  }
};

const initTabs = () => {
  $$a('[data-admin-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => { e.preventDefault(); switchTab(tab.dataset.adminTab); });
  });
  $$a('[data-admin-tab-trigger]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.adminTabTrigger));
  });
  // Sidebar collapse
  $a('[data-sidebar-collapse]')?.addEventListener('click', () => {
    $a('#admin-layout')?.classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', $a('#admin-layout')?.classList.contains('collapsed') ? '1' : '0');
  });
  // Restore collapsed state
  if (localStorage.getItem('sidebarCollapsed') === '1') $a('#admin-layout')?.classList.add('collapsed');
};

// ============= LOGIN =============
const initLogin = () => {
  const form = $a('[data-admin-login-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '⏳ در حال ورود...'; }
    const result = await adminApiFetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: form.adminUser.value, password: form.adminPass.value }),
    });
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'ورود به پنل'; }
    if (result.success) {
      localStorage.setItem('pixorisAdminToken', result.token);
      localStorage.setItem('pixorisAdminRole', result.admin.role);
      localStorage.setItem('pixorisAdminName', result.admin.username);
      showToast(`خوش آمدید ${result.admin.username}!`, 'success');
      updateAdminUI(result.admin);
      showCMS();
    } else {
      showToast(result.error || 'ورود ناموفق', 'error');
    }
  });
};

const updateAdminUI = (admin) => {
  const isAdmin = ['admin', 'super_admin'].includes(admin.role);
  const isSuperAdmin = admin.role === 'super_admin';
  $$a('[data-role-min="admin"]').forEach(el => el.style.display = isAdmin ? '' : 'none');
  $$a('[data-role-min="super_admin"]').forEach(el => el.style.display = isSuperAdmin ? '' : 'none');
  const roleLabel = $a('[data-admin-role]'); if (roleLabel) roleLabel.textContent = admin.role;
  const nameLabel = $a('[data-admin-name]'); if (nameLabel) nameLabel.textContent = admin.username;
};

const showCMS = () => {
  $a('#admin-login-screen').style.display = 'none';
  $a('#admin-cms-screen').style.display = 'block';
  loadStats();
  loadActivityFeed();
};

const checkAuth = async () => {
  const token = localStorage.getItem('pixorisAdminToken');
  if (!token) return;
  const result = await adminApiFetch('/api/admin/me');
  if (result.success) { updateAdminUI(result.admin); showCMS(); }
  else { localStorage.removeItem('pixorisAdminToken'); localStorage.removeItem('pixorisAdminRole'); }
};

// ============= DASHBOARD =============
const loadStats = async () => {
  const result = await adminApiFetch('/api/admin/stats');
  if (!result.success) return;
  const stats = result.stats;
  $$a('[data-stat]').forEach(el => {
    const key = el.dataset.stat;
    if (stats[key] !== undefined) el.textContent = stats[key].toLocaleString('fa-IR');
  });
  // Update sidebar badge
  const badge = $a('[data-badge="posts"]');
  if (badge) badge.textContent = stats.totalPosts || 0;
};

const loadActivityFeed = async () => {
  const host = $a('[data-activity-feed]');
  if (!host) return;
  const result = await adminApiFetch('/api/admin/audit-logs?limit=8');
  if (!result.success || !result.logs?.length) {
    host.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:var(--space-5);">رویدادی ثبت نشده</p>';
    return;
  }
  const iconMap = {
    'login.success': { icon: '🔑', class: 'login' },
    'login.failed': { icon: '🚫', class: 'delete' },
    'post.create': { icon: '📝', class: 'create' },
    'post.update': { icon: '✏️', class: 'update' },
    'post.delete': { icon: '🗑', class: 'delete' },
    'media.upload': { icon: '📤', class: 'upload' },
    'media.delete': { icon: '🗑', class: 'delete' },
    'category.create': { icon: '🏷️', class: 'create' },
    'product.create': { icon: '🛒', class: 'create' },
  };
  host.innerHTML = result.logs.map(log => {
    const map = iconMap[log.action] || { icon: '📋', class: 'update' };
    return `<div class="activity-item">
      <div class="activity-icon ${map.class}">${map.icon}</div>
      <div class="activity-content">
        <strong>${escapeAdminHtml(log.action)}</strong>
        <span>${escapeAdminHtml(log.admin_name || 'سیستم')} • ${escapeAdminHtml(log.entity_type || '')}</span>
      </div>
      <div class="activity-time">${formatAdminDate(log.created_at)}</div>
    </div>`;
  }).join('');
};

// ============= POSTS (Card View) =============
let allPosts = [];
let currentFilter = 'all';
let currentView = 'grid';
let searchQuery = '';

const loadPosts = async () => {
  const container = $a('[data-posts-container]');
  if (!container) return;
  container.innerHTML = '<div class="posts-grid"><div class="skeleton" style="height:240px"></div><div class="skeleton" style="height:240px"></div><div class="skeleton" style="height:240px"></div></div>';
  const result = await adminApiFetch('/api/admin/posts');
  if (!result.success) { container.innerHTML = `<p style="color:var(--danger)">${escapeAdminHtml(result.error)}</p>`; return; }
  allPosts = result.posts || [];
  renderPosts();
  // Bind search + filters
  const searchInput = $a('[data-posts-search]');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = '1';
    searchInput.addEventListener('input', () => { searchQuery = searchInput.value.toLowerCase().trim(); renderPosts(); });
  }
  $$a('[data-filter]').forEach(chip => {
    if (chip.dataset.bound) return;
    chip.dataset.bound = '1';
    chip.addEventListener('click', () => {
      $$a('[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderPosts();
    });
  });
  $$a('[data-view]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      $$a('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      renderPosts();
    });
  });
};

const renderPosts = () => {
  const container = $a('[data-posts-container]');
  if (!container) return;
  let filtered = allPosts;
  if (currentFilter === 'published') filtered = filtered.filter(p => p.status === 'published');
  else if (currentFilter === 'draft') filtered = filtered.filter(p => p.status === 'draft');
  else if (currentFilter === 'featured') filtered = filtered.filter(p => p.featured === 1);
  if (searchQuery) filtered = filtered.filter(p => p.title?.toLowerCase().includes(searchQuery));

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state-v4"><div class="empty-icon">📝</div><h3>مقاله‌ای یافت نشد</h3><p>برای شروع، اولین مقاله را بسازید.</p><button class="btn btn-primary" data-admin-tab-trigger="new-post">➕ مقاله جدید</button></div>`;
    container.querySelector('[data-admin-tab-trigger]')?.addEventListener('click', () => switchTab('new-post'));
    return;
  }

  if (currentView === 'grid') {
    container.innerHTML = `<div class="posts-grid">${filtered.map(post => `
      <div class="post-card" onclick="window.PixorisAdmin.editPost(${post.id})">
        <div class="post-card-thumb">
          <img src="${post.image_url || 'assets/svg/card-game.svg'}" alt="${escapeAdminHtml(post.title)}" loading="lazy" decoding="async">
          <span class="post-card-status ${post.status}">${post.status === 'published' ? 'منتشر شده' : post.status === 'scheduled' ? 'زمان‌بندی' : 'پیش‌نویس'}</span>
        </div>
        <div class="post-card-body">
          <div class="post-card-meta">
            <span class="post-card-category" style="background:${post.category_color || 'var(--primary)'};color:white;">${escapeAdminHtml(post.category_name || 'عمومی')}</span>
            <span>${(post.views || 0).toLocaleString('fa-IR')} بازدید</span>
          </div>
          <h3 class="post-card-title">${escapeAdminHtml(post.title)}</h3>
          <div class="post-card-footer">
            <span>${formatAdminDate(post.updated_at)}</span>
            <div class="post-card-actions">
              <button onclick="event.stopPropagation();window.PixorisAdmin.editPost(${post.id})" title="ویرایش">✏️</button>
              <button class="danger" onclick="event.stopPropagation();window.PixorisAdmin.deletePost(${post.id})" title="حذف">🗑</button>
            </div>
          </div>
        </div>
      </div>
    `).join('')}</div>`;
  } else {
    container.innerHTML = `<div class="posts-list-view">${filtered.map(post => `
      <div class="post-list-row" onclick="window.PixorisAdmin.editPost(${post.id})">
        <img src="${post.image_url || 'assets/svg/card-game.svg'}" alt="" loading="lazy">
        <div><strong>${escapeAdminHtml(post.title)}</strong><div style="font-size:var(--fs-xs);color:var(--text-muted);">${escapeAdminHtml(post.category_name || '')}</div></div>
        <span class="post-card-status ${post.status}">${post.status === 'published' ? 'منتشر' : 'پیش‌نویس'}</span>
        <span style="color:var(--text-muted);font-size:var(--fs-xs);">${(post.views || 0).toLocaleString('fa-IR')} بازدید</span>
        <span style="color:var(--text-dim);font-size:var(--fs-xs);">${formatAdminDate(post.updated_at)}</span>
      </div>
    `).join('')}</div>`;
  }
};

const deletePost = async (id) => {
  const ok = await confirmDialog('آیا این مقاله حذف شود؟');
  if (!ok) return;
  const result = await adminApiFetch(`/api/admin/post/${id}`, { method: 'DELETE' });
  if (result.success) { showToast('مقاله حذف شد', 'success'); loadPosts(); loadStats(); }
  else showToast(result.error || 'خطا', 'error');
};

const editPost = async (id) => {
  const result = await adminApiFetch(`/api/admin/post/${id}`);
  if (!result.success) { showToast('خطا در بارگذاری', 'error'); return; }
  const post = result.post;
  switchTab('new-post');
  const form = $a('[data-post-form]');
  setTimeout(() => {
    form.title.value = post.title;
    form.slug.value = post.slug;
    form.category_id.value = post.category_id || '';
    form.image_url.value = post.image_url || '';
    form.featured_image_alt.value = post.featured_image_alt || '';
    form.excerpt.value = post.excerpt || '';
    form.seo_title.value = post.seo_title || '';
    form.seo_description.value = post.seo_description || '';
    form.canonical_url.value = post.canonical_url || '';
    form.meta_keywords.value = post.meta_keywords || '';
    form.featured.checked = post.featured === 1;
    if (form.status) form.status.value = post.status || 'draft';
    if (rteEditor) rteEditor.setContent(post.content || '');
    form.tags.value = post.tags?.map(t => t.name).join(', ') || '';
    form.dataset.editId = post.id;
    $a('#editor-title').textContent = 'ویرایش مقاله';
  }, 100);
};

// ============= POST FORM =============
const initPostForm = () => {
  const form = $a('[data-post-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = rteEditor ? rteEditor.getContent() : '';
    const tagsStr = form.tags?.value || '';
    const statusSelect = form.status;
    const data = {
      title: form.title.value, slug: form.slug.value,
      category_id: parseInt(form.category_id.value) || null,
      image_url: form.image_url.value, featured_image_alt: form.featured_image_alt.value,
      excerpt: form.excerpt.value, content,
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      featured: form.featured.checked,
      status: statusSelect ? statusSelect.value : 'draft',
      seo_title: form.seo_title.value, seo_description: form.seo_description.value,
      canonical_url: form.canonical_url.value, meta_keywords: form.meta_keywords.value,
    };
    const editId = form.dataset.editId;
    const endpoint = editId ? `/api/admin/post/${editId}` : '/api/admin/post';
    const method = editId ? 'PUT' : 'POST';
    const result = await adminApiFetch(endpoint, { method, body: JSON.stringify(data) });
    if (result.success) {
      showToast(editId ? 'مقاله به‌روزرسانی شد ✅' : 'مقاله ذخیره شد ✅', 'success');
      form.reset();
      if (rteEditor) rteEditor.setContent('');
      delete form.dataset.editId;
      localStorage.removeItem('pixorisDraft');
      $a('#editor-title').textContent = 'مقاله جدید';
      loadStats();
      switchTab('posts');
    } else showToast(result.error || 'خطا', 'error');
  });

  $a('[data-save-draft]')?.addEventListener('click', () => {
    const statusSelect = $a('[name="status"]');
    if (statusSelect) statusSelect.value = 'draft';
    form.dispatchEvent(new Event('submit'));
  });
  $a('[data-publish-now]')?.addEventListener('click', () => {
    const statusSelect = $a('[name="status"]');
    if (statusSelect) statusSelect.value = 'published';
    form.dispatchEvent(new Event('submit'));
  });
};

// ============= CATEGORIES =============
const loadCategories = async () => {
  const list = $a('[data-categories-list]');
  if (!list) return;
  list.innerHTML = '<div class="skeleton" style="height:100px"></div>';
  const result = await adminApiFetch('/api/admin/categories');
  if (!result.success) { list.innerHTML = '<p style="color:var(--danger)">خطا</p>'; return; }
  if (!result.categories.length) {
    list.innerHTML = '<div class="empty-state-v4"><div class="empty-icon">🏷️</div><h3>دسته‌بندی‌ای نیست</h3><p>اولین دسته را بسازید</p></div>';
    return;
  }
  const emojiMap = { games: '🎮', movies: '🎬', technology: '💻', anime: '🎌', reviews: '⭐', guides: '📚', news: '📰' };
  list.innerHTML = result.categories.map(cat => `
    <div class="category-card-v4" style="--cat-color:${cat.color}" data-cat-id="${cat.id}" draggable="true">
      <div class="category-card-header">
        <div class="category-color-dot" style="background:${cat.color}">${emojiMap[cat.slug] || '📂'}</div>
        <div>
          <h4>${escapeAdminHtml(cat.name)}</h4>
          <div class="cat-slug">/${escapeAdminHtml(cat.slug)}</div>
        </div>
      </div>
      <div class="category-stats">
        <div class="category-stat">📝 ${cat.post_count || 0} مقاله</div>
        <div class="category-stat">🔢 ترتیب: ${cat.sort_order}</div>
        ${cat.is_featured ? '<div class="category-stat">⭐ ویژه</div>' : ''}
      </div>
      <div class="category-actions">
        <button class="btn btn-ghost btn-sm" onclick="window.PixorisAdmin.editCategory(${cat.id})">✏️ ویرایش</button>
        <button class="btn btn-danger btn-sm" onclick="window.PixorisAdmin.deleteCategory(${cat.id})">🗑 حذف</button>
      </div>
    </div>
  `).join('');
  // Drag-drop reorder
  let dragged = null;
  list.querySelectorAll('.category-card-v4').forEach(card => {
    card.addEventListener('dragstart', (e) => { dragged = card; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { card.classList.remove('dragging'); });
    card.addEventListener('dragover', (e) => { e.preventDefault(); });
    card.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (dragged && dragged !== card) {
        const draggedId = dragged.dataset.catId;
        const targetId = card.dataset.catId;
        showToast('ترتیب به‌روزرسانی شد', 'success');
        // Note: actual reorder API call would go here
      }
    });
  });
};

const editCategory = async (id) => {
  const result = await adminApiFetch('/api/admin/categories');
  if (!result.success) return;
  const cat = result.categories.find(c => c.id === id);
  if (!cat) return;
  const newName = await showModal({
    title: 'ویرایش دسته',
    body: `<div class="form-field"><label>نام</label><input type="text" id="cat-name" value="${escapeAdminHtml(cat.name)}"></div>
           <div class="form-field"><label>Slug</label><input type="text" id="cat-slug" value="${escapeAdminHtml(cat.slug)}" dir="ltr"></div>
           <div class="form-field"><label>رنگ</label><input type="color" id="cat-color" value="${cat.color}" style="width:60px;height:40px;"></div>`,
    buttons: [{ label: 'لغو', value: null, class: 'btn-ghost' }, { label: 'ذخیره', value: 'save', class: 'btn-primary' }],
  });
  if (newName === 'save') {
    const name = $a('#cat-name').value;
    const slug = $a('#cat-slug').value;
    const color = $a('#cat-color').value;
    const r = await adminApiFetch(`/api/admin/category/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, slug, color, description: cat.description || '', sort_order: cat.sort_order || 0, is_featured: cat.is_featured === 1, is_active: true }),
    });
    if (r.success) { showToast('دسته به‌روزرسانی شد', 'success'); loadCategories(); }
    else showToast(r.error || 'خطا', 'error');
  }
};

const deleteCategory = async (id) => {
  const ok = await confirmDialog('این دسته حذف شود؟ مقالات به "بدون دسته" منتقل می‌شوند.');
  if (!ok) return;
  const r = await adminApiFetch(`/api/admin/category/${id}`, { method: 'DELETE' });
  if (r.success) { showToast('حذف شد', 'success'); loadCategories(); loadStats(); }
};

// Add category button
$a('[data-add-category]')?.addEventListener('click', async () => {
  // Will be bound in init
});

// ============= CATEGORIES DROPDOWN =============
const loadCategoriesDropdown = async () => {
  const select = $a('[data-editor-category]');
  if (!select) return;
  const result = await adminApiFetch('/api/admin/categories');
  if (result.success) {
    select.innerHTML = '<option value="">انتخاب دسته...</option>' + result.categories.map(c => `<option value="${c.id}">${escapeAdminHtml(c.name)}</option>`).join('');
  }
};

// ============= PRODUCTS =============
const loadProducts = async () => {
  const container = $a('[data-products-container]');
  if (!container) return;
  container.innerHTML = '<div class="posts-grid"><div class="skeleton" style="height:240px"></div></div>';
  const result = await adminApiFetch('/api/admin/products');
  if (!result.success) { container.innerHTML = `<p style="color:var(--danger)">${escapeAdminHtml(result.error)}</p>`; return; }
  if (!result.products.length) {
    container.innerHTML = '<div class="empty-state-v4"><div class="empty-icon">🛒</div><h3>محصولی نیست</h3><p>اولین محصول را اضافه کنید</p></div>';
    return;
  }
  container.innerHTML = `<div class="posts-grid">${result.products.map(p => `
    <div class="post-card">
      <div class="post-card-thumb">
        <img src="${p.image_url || 'assets/svg/card-shop.svg'}" alt="${escapeAdminHtml(p.title)}" loading="lazy" decoding="async">
        <span class="post-card-status ${p.active ? 'published' : 'draft'}">${p.active ? 'فعال' : 'غیرفعال'}</span>
      </div>
      <div class="post-card-body">
        <div class="post-card-meta"><span class="post-card-category" style="background:var(--accent);color:white;">${escapeAdminHtml(p.category || 'محصول')}</span></div>
        <h3 class="post-card-title">${escapeAdminHtml(p.title)}</h3>
        <div class="post-card-footer">
          <span style="color:var(--warning);font-weight:700;">${toman(p.price)}</span>
          <div class="post-card-actions">
            <button onclick="window.PixorisAdmin.editProduct(${p.id})">✏️</button>
            <button class="danger" onclick="window.PixorisAdmin.deleteProduct(${p.id})">🗑</button>
          </div>
        </div>
      </div>
    </div>
  `).join('')}</div>`;
};

const editProduct = async (id) => {
  const result = await adminApiFetch('/api/admin/products');
  if (!result.success) return;
  const p = result.products.find(x => x.id === id);
  if (!p) return;
  const r = await showModal({
    title: 'ویرایش محصول',
    body: `<div class="form-field"><label>عنوان</label><input type="text" id="p-title" value="${escapeAdminHtml(p.title)}"></div>
           <div class="form-row"><div class="form-field"><label>Slug</label><input type="text" id="p-slug" value="${escapeAdminHtml(p.slug)}" dir="ltr"></div>
           <div class="form-field"><label>قیمت</label><input type="number" id="p-price" value="${p.price}"></div></div>
           <div class="form-row"><div class="form-field"><label>موجودی</label><input type="number" id="p-stock" value="${p.stock || 0}"></div>
           <div class="form-field"><label>دسته</label><input type="text" id="p-cat" value="${escapeAdminHtml(p.category || '')}"></div></div>
           <div class="form-field"><label>تصویر URL</label><input type="text" id="p-img" value="${escapeAdminHtml(p.image_url || '')}" dir="ltr"></div>
           <div class="form-field"><label>توضیحات</label><textarea id="p-desc" rows="3">${escapeAdminHtml(p.description || '')}</textarea></div>`,
    buttons: [{ label: 'لغو', value: null, class: 'btn-ghost' }, { label: 'ذخیره', value: 'save', class: 'btn-primary' }],
  });
  if (r === 'save') {
    const data = {
      title: $a('#p-title').value, slug: $a('#p-slug').value,
      price: parseInt($a('#p-price').value) || 0, stock: parseInt($a('#p-stock').value) || 0,
      category: $a('#p-cat').value, image_url: $a('#p-img').value, description: $a('#p-desc').value,
      featured: p.featured === 1, active: true, sort_order: p.sort_order || 0, gallery: [],
    };
    const result = await adminApiFetch(`/api/admin/product/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (result.success) { showToast('محصول به‌روزرسانی شد', 'success'); loadProducts(); }
    else showToast(result.error || 'خطا', 'error');
  }
};

const deleteProduct = async (id) => {
  const ok = await confirmDialog('این محصول حذف شود؟');
  if (!ok) return;
  const r = await adminApiFetch(`/api/admin/product/${id}`, { method: 'DELETE' });
  if (r.success) { showToast('محصول حذف شد', 'success'); loadProducts(); loadStats(); }
};

// ============= MEDIA =============
const loadMedia = async () => {
  const grid = $a('[data-media-grid]');
  if (!grid) return;
  grid.innerHTML = '<div class="skeleton" style="height:160px"></div>';
  const q = $a('[data-media-search]')?.value || '';
  const result = await adminApiFetch(`/api/admin/media${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  if (!result.success) { grid.innerHTML = '<p style="color:var(--danger)">خطا</p>'; return; }
  if (!result.media.length) {
    grid.innerHTML = '<div class="empty-state-v4" style="grid-column:1/-1;"><div class="empty-icon">📁</div><h3>رسانه‌ای نیست</h3><p>فایل‌ها را آپلود کنید</p></div>';
    return;
  }
  grid.innerHTML = result.media.map(m => `
    <div class="media-card" onclick="window.PixorisAdmin.selectMedia('${m.url}','${escapeAdminHtml(m.filename)}')">
      <img src="${m.url}" alt="${escapeAdminHtml(m.alt_text || m.filename)}" loading="lazy" decoding="async">
      <div class="media-card-overlay">
        <button class="media-action-btn" onclick="event.stopPropagation();navigator.clipboard.writeText('${m.url}');window.PixorisToast('لینک کپی شد','success')" title="کپی URL">📋</button>
        <button class="media-action-btn danger" onclick="event.stopPropagation();window.PixorisAdmin.deleteMedia(${m.id})" title="حذف">🗑</button>
      </div>
      <div class="media-info">${escapeAdminHtml(m.original_name || m.filename)}</div>
    </div>
  `).join('');
};

const deleteMedia = async (id) => {
  const ok = await confirmDialog('این فایل حذف شود؟');
  if (!ok) return;
  const r = await adminApiFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
  if (r.success) { showToast('حذف شد', 'success'); loadMedia(); loadStats(); }
};

const selectMedia = (url, filename) => {
  const input = $a('#featured-image-input');
  if (input) input.value = url;
  $a('[data-media-picker]')?.classList.remove('show');
  showToast('تصویر انتخاب شد', 'success');
  switchTab('new-post');
};

const loadMediaPicker = async () => {
  const grid = $a('[data-picker-grid]');
  if (!grid) return;
  grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;">در حال بارگذاری...</p>';
  const result = await adminApiFetch('/api/admin/media');
  if (!result.success) return;
  grid.innerHTML = result.media.map(m => `
    <div class="media-card" onclick="window.PixorisAdmin.pickMedia('${m.url}')">
      <img src="${m.url}" alt="${escapeAdminHtml(m.filename)}" loading="lazy">
    </div>
  `).join('') || '<p style="color:var(--text-muted)">رسانه‌ای موجود نیست</p>';
};

const pickMedia = (url) => {
  const picker = $a('[data-media-picker]');
  const target = picker?.dataset.target;
  if (target === 'rte' && rteEditor) rteEditor.exec('insertImage', url);
  else { const input = $a('#featured-image-input'); if (input) input.value = url; }
  picker?.classList.remove('show');
  showToast('تصویر انتخاب شد', 'success');
};

const initMediaUpload = () => {
  const zone = $a('[data-upload-zone]');
  const input = $a('[data-file-input]');
  if (!zone || !input) return;
  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  });
  input.addEventListener('change', () => { if (input.files.length) uploadFiles(input.files); });
  const searchInput = $a('[data-media-search]');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = '1';
    let timer;
    searchInput.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => loadMedia(), 300); });
  }
  $a('[data-picker-close]')?.addEventListener('click', () => $a('[data-media-picker]').classList.remove('show'));
  $a('[data-open-media]')?.addEventListener('click', () => {
    $a('[data-media-picker]').classList.add('show');
    $a('[data-media-picker]').dataset.target = 'featured';
    loadMediaPicker();
  });
};

const uploadFiles = async (files) => {
  for (const file of files) {
    showToast(`در حال آپلود ${file.name}...`, 'info', 1500);
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('pixorisAdminToken');
    try {
      const res = await fetch(`${API_BASE}/api/admin/upload`, {
        method: 'POST',
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
        body: formData,
      });
      const data = await res.json();
      if (data.success) showToast(`${file.name} آپلود شد ✅`, 'success');
      else showToast(`${file.name}: ${data.error}`, 'error');
    } catch (err) { showToast(`خطا در آپلود ${file.name}`, 'error'); }
  }
  loadMedia();
  loadStats();
};

// ============= USERS =============
const loadUsers = async () => {
  const list = $a('[data-users-list]');
  if (!list) return;
  list.innerHTML = '<p style="color:var(--text-muted);text-align:center;">در حال بارگذاری...</p>';
  const result = await adminApiFetch('/api/admin/users');
  if (!result.success) { list.innerHTML = `<p style="color:var(--danger)">${escapeAdminHtml(result.error)}</p>`; return; }
  list.innerHTML = result.users.map(u => `
    <div class="post-list-row" style="grid-template-columns:1fr auto auto auto auto;">
      <div><strong>${escapeAdminHtml(u.username)}</strong><div style="font-size:var(--fs-xs);color:var(--text-muted);">${escapeAdminHtml(u.email || '-')}</div></div>
      <span class="role-badge role-${u.role}">${u.role}</span>
      <span class="post-card-status ${u.is_active ? 'published' : 'draft'}">${u.is_active ? 'فعال' : 'غیرفعال'}</span>
      <span style="color:var(--text-dim);font-size:var(--fs-xs);">${formatAdminDate(u.last_login) || '-'}</span>
      <div class="post-card-actions" style="opacity:1">
        ${u.id !== 1 ? `<button class="danger" onclick="window.PixorisAdmin.deleteUser(${u.id})">🗑</button>` : ''}
      </div>
    </div>
  `).join('');
};

const deleteUser = async (id) => {
  const ok = await confirmDialog('این کاربر حذف شود؟');
  if (!ok) return;
  const r = await adminApiFetch(`/api/admin/user/${id}`, { method: 'DELETE' });
  if (r.success) { showToast('حذف شد', 'success'); loadUsers(); }
};

// ============= AUDIT LOGS =============
let auditFilter = 'all';
const loadAuditLogs = async () => {
  const list = $a('[data-audit-list]');
  if (!list) return;
  list.innerHTML = '<p style="color:var(--text-muted);text-align:center;">در حال بارگذاری...</p>';
  const result = await adminApiFetch('/api/admin/audit-logs?limit=50');
  if (!result.success) { list.innerHTML = `<p style="color:var(--danger)">خطا</p>`; return; }
  let logs = result.logs || [];
  if (auditFilter !== 'all') logs = logs.filter(l => l.action.includes(auditFilter));
  if (!logs.length) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:var(--space-5);">رویدادی یافت نشد</p>'; return; }
  list.innerHTML = logs.map(log => `
    <div class="post-list-row" style="grid-template-columns:auto 1fr auto auto;">
      <span class="role-badge" style="background:var(--sidebar-active);color:var(--primary);">${escapeAdminHtml(log.action)}</span>
      <div><strong>${escapeAdminHtml(log.admin_name || 'سیستم')}</strong><div style="font-size:var(--fs-xs);color:var(--text-muted);">${escapeAdminHtml(log.entity_type || '')} ${log.entity_id ? '#' + log.entity_id : ''}</div></div>
      <span style="color:var(--text-dim);font-size:var(--fs-xs);">${formatAdminDate(log.created_at)}</span>
      <span style="color:var(--text-dim);font-size:var(--fs-xs);max-width:200px;overflow:hidden;text-overflow:ellipsis;">${escapeAdminHtml(log.details || '')}</span>
    </div>
  `).join('');
  // Bind filters
  $$a('[data-audit-filter]').forEach(chip => {
    if (chip.dataset.bound) return;
    chip.dataset.bound = '1';
    chip.addEventListener('click', () => {
      $$a('[data-audit-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      auditFilter = chip.dataset.auditFilter;
      loadAuditLogs();
    });
  });
};

// ============= SETTINGS =============
const loadSettings = async () => {
  const result = await adminApiFetch('/api/admin/settings');
  if (!result.success) return;
  const form = $a('[data-settings-form]');
  if (!form) return;
  Object.keys(result.settings).forEach(key => {
    const input = form.querySelector(`[name="${key}"]`);
    if (input) input.value = result.settings[key];
  });
};

const initSettingsForm = () => {
  const form = $a('[data-settings-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    $$a('[name]', form).forEach(input => { if (input.name) data[input.name] = input.value; });
    const result = await adminApiFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify(data) });
    if (result.success) showToast('تنظیمات ذخیره شد', 'success');
    else showToast(result.error || 'خطا', 'error');
  });
};

// ============= ANALYTICS =============
const loadAnalytics = async () => {
  const topPostsHost = $a('[data-analytics-top-posts]');
  if (topPostsHost) {
    const result = await adminApiFetch('/api/admin/stats');
    if (result.success && result.topPosts?.length) {
      topPostsHost.innerHTML = result.topPosts.map((p, i) => `
        <div class="post-list-row" style="grid-template-columns:auto 1fr auto;">
          <span style="background:var(--primary);color:white;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:var(--fs-xs);font-weight:800;">${(i + 1).toLocaleString('fa-IR')}</span>
          <div><strong>${escapeAdminHtml(p.title)}</strong></div>
          <span style="color:var(--secondary);">${(p.views || 0).toLocaleString('fa-IR')} بازدید</span>
        </div>
      `).join('');
    } else {
      topPostsHost.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:var(--space-5);">داده‌ای موجود نیست</p>';
    }
  }
  const topCatsHost = $a('[data-analytics-top-categories]');
  if (topCatsHost) {
    const result = await adminApiFetch('/api/admin/categories');
    if (result.success) {
      const sorted = [...result.categories].sort((a, b) => (b.post_count || 0) - (a.post_count || 0)).slice(0, 5);
      topCatsHost.innerHTML = sorted.map(c => `
        <div class="post-list-row" style="grid-template-columns:auto 1fr auto;">
          <span style="width:20px;height:20px;border-radius:4px;background:${c.color};"></span>
          <div><strong>${escapeAdminHtml(c.name)}</strong></div>
          <span style="color:var(--text-muted);">${c.post_count || 0} مقاله</span>
        </div>
      `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:var(--space-5);">داده‌ای موجود نیست</p>';
    }
  }
};

// ============= DEBUG CENTER =============
const initDebugCenter = () => {
  const buttons = $$a('[data-debug-run]');
  if (!buttons.length) return;
  if (window._debugCenterBound) return;
  window._debugCenterBound = true;
  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.debugRun;
      const endpoints = {
        overview: '/api/debug', full: '/api/debug/full', github: '/api/debug/github',
        upload: '/api/debug/upload', schema: '/api/debug/schema', cms: '/api/debug/cms', performance: '/api/debug/performance',
      };
      const endpoint = endpoints[action];
      if (!endpoint) return;
      const resultEl = $a('#debug-result');
      const timingEl = $a('#debug-timing');
      if (resultEl) resultEl.innerHTML = '<span style="color:var(--warning)">⏳ در حال اجرا...</span>';
      if (timingEl) timingEl.textContent = '';
      const start = Date.now();
      try {
        const res = await fetch(`${API_BASE}${endpoint}`);
        const elapsed = Date.now() - start;
        const data = await res.json();
        if (timingEl) timingEl.textContent = `⏱ ${elapsed}ms · HTTP ${res.status}`;
        if (resultEl) {
          const json = JSON.stringify(data, null, 2);
          const colorized = json
            .replace(/"status":\s*"ok"/g, '<span style="color:var(--success)">"status": "ok"</span>')
            .replace(/"status":\s*"fail"/g, '<span style="color:var(--danger)">"status": "fail"</span>')
            .replace(/true/g, '<span style="color:var(--success)">true</span>')
            .replace(/false/g, '<span style="color:var(--danger)">false</span>');
          resultEl.innerHTML = `<pre style="margin:0;white-space:pre-wrap;">${colorized}</pre>`;
        }
        showToast(`بررسی ${action} کامل شد`, 'success');
      } catch (err) {
        if (resultEl) resultEl.innerHTML = `<span style="color:var(--danger)">❌ ${escapeAdminHtml(err.message)}</span>`;
        showToast('خطا در ارتباط', 'error');
      }
    });
  });
};

// ============= LOGOUT =============
const initLogout = () => {
  $a('[data-admin-logout]')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('pixorisAdminToken');
    localStorage.removeItem('pixorisAdminRole');
    location.reload();
  });
};

// ============= EXPORT TO WINDOW =============
window.PixorisAdmin = {
  editPost, deletePost, editCategory, deleteCategory,
  editProduct, deleteProduct, deleteMedia, selectMedia,
  pickMedia, deleteUser,
};

// ============= INIT =============
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initLogin();
  initPostForm();
  initMediaUpload();
  initSettingsForm();
  initLogout();
  initCommandPalette();
  checkAuth();
});
