// Pixoris CMS Admin Panel v2.0
const API_BASE = localStorage.getItem('pixorisApiUrl') || 'https://dev.pixoris.workers.dev';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

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

// ============= TAB SWITCHING =============
const initTabs = () => {
  $$('[data-admin-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const target = tab.dataset.adminTab;
      $$('[data-admin-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.admin-tab').forEach(t => t.style.display = 'none');
      const targetEl = $(`[data-tab="${target}"]`);
      if (targetEl) {
        targetEl.style.display = 'block';
        if (target === 'posts') loadPosts();
        if (target === 'categories') loadCategories();
        if (target === 'media') loadMedia();
        if (target === 'dashboard') loadStats();
      }
    });
  });

  // Trigger buttons
  $$('[data-admin-tab-trigger]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.adminTabTrigger;
      const tab = $(`[data-admin-tab="${target}"]`);
      if (tab) tab.click();
    });
  });
};

// ============= LOGIN =============
const initLogin = () => {
  const form = $('[data-admin-login-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = await apiFetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        username: form.adminUser.value,
        password: form.adminPass.value
      })
    });
    if (result.success) {
      localStorage.setItem('pixorisAdminToken', result.token);
      showCMS();
    } else {
      showToast(result.error || 'ورود ناموفق');
    }
  });
};

const showCMS = () => {
  $('#admin-login-screen').style.display = 'none';
  $('#admin-cms-screen').style.display = 'block';
  loadStats();
  initTinyMCE();
};

const checkAuth = () => {
  const token = localStorage.getItem('pixorisAdminToken');
  if (token) {
    // Verify token is still valid
    apiFetch('/api/admin/stats').then(result => {
      if (result.success) showCMS();
      else localStorage.removeItem('pixorisAdminToken');
    });
  }
};

// ============= TINYMCE =============
let tinymceInitialized = false;
const initTinyMCE = () => {
  if (tinymceInitialized || typeof tinymce === 'undefined') return;
  tinymce.init({
    selector: '#rich-editor',
    directionality: 'rtl',
    height: 400,
    plugins: 'lists link image code table emoticons',
    toolbar: 'undo redo | formatselect | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist | link image | code | table | emoticons',
    skin: 'oxide-dark',
    content_css: 'dark',
    menubar: false,
    branding: false,
    language: 'fa',
    setup: (editor) => {
      editor.on('change', () => { editor.save(); });
    }
  });
  tinymceInitialized = true;
};

// ============= STATS =============
const loadStats = async () => {
  const result = await apiFetch('/api/admin/stats');
  if (!result.success) return;
  const stats = result.stats;
  $$('[data-stat]').forEach(el => {
    const key = el.dataset.stat;
    if (stats[key] !== undefined) {
      el.textContent = stats[key].toLocaleString('fa-IR');
    }
  });
  // Update activity
  const activity = $('[data-admin-activity]');
  if (activity) {
    activity.innerHTML = `
      <p>📊 ${stats.totalPosts} مقاله در سایت</p>
      <p>✅ ${stats.published} مقاله منتشر شده</p>
      <p>📝 ${stats.drafts} پیش‌نویس ذخیره شده</p>
      <p>👁 ${stats.totalViews.toLocaleString('fa-IR')} بازدید کل</p>
    `;
  }
};

// ============= POSTS =============
const loadPosts = async () => {
  const list = $('[data-admin-posts-list]');
  if (!list) return;
  list.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">در حال بارگذاری...</td></tr>';
  const result = await apiFetch('/api/admin/posts');
  if (!result.success) {
    list.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">خطا در بارگذاری</td></tr>';
    return;
  }
  if (result.posts.length === 0) {
    list.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">هنوز مقاله‌ای ثبت نشده</td></tr>';
    return;
  }
  list.innerHTML = result.posts.map(post => `
    <tr>
      <td style="font-weight:800">${post.title}</td>
      <td>${post.category_name || '-'}</td>
      <td><span class="post-status ${post.published ? 'published' : 'draft'}">${post.published ? 'منتشر شده' : 'پیش‌نویس'}</span></td>
      <td>${post.views?.toLocaleString('fa-IR') || 0}</td>
      <td style="font-size:12px;color:var(--muted)">${new Date(post.created_at).toLocaleDateString('fa-IR')}</td>
      <td>
        <div class="post-actions">
          <button class="btn btn-sm" onclick="editPost(${post.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deletePost(${post.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
};

const deletePost = async (id) => {
  if (!confirm('آیا مطمئن هستید؟')) return;
  const result = await apiFetch(`/api/admin/post/${id}`, { method: 'DELETE' });
  if (result.success) {
    showToast('مقاله حذف شد');
    loadPosts();
    loadStats();
  } else {
    showToast(result.error || 'خطا در حذف');
  }
};

const editPost = async (id) => {
  const result = await apiFetch(`/api/admin/post/${id}`);
  if (!result.success) { showToast('خطا در بارگذاری مقاله'); return; }
  const post = result.post;
  // Switch to new post tab and fill form
  $('[data-admin-tab="new-post"]').click();
  const form = $('[data-post-form]');
  form.title.value = post.title;
  form.slug.value = post.slug;
  form.category_id.value = post.category_id || '';
  form.image_url.value = post.image_url || '';
  form.excerpt.value = post.excerpt || '';
  form.featured.checked = post.featured === 1;
  form.published.checked = post.published === 1;
  if (tinymce.get('rich-editor')) {
    tinymce.get('rich-editor').setContent(post.content || '');
  }
  form.dataset.editId = post.id;
  form.querySelector('.btn[type="submit"]').textContent = '💾 به‌روزرسانی';
};

// ============= POST FORM =============
const initPostForm = () => {
  const form = $('[data-post-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = tinymce.get('rich-editor') ? tinymce.get('rich-editor').getContent() : form.content.value;
    const data = {
      title: form.title.value,
      slug: form.slug.value,
      category_id: parseInt(form.category_id.value) || null,
      image_url: form.image_url.value,
      excerpt: form.excerpt.value,
      content: content,
      tags: form.tags.value.split(',').map(t => t.trim()).filter(Boolean),
      featured: form.featured.checked,
      published: form.published.checked
    };
    const editId = form.dataset.editId;
    const endpoint = editId ? `/api/admin/post/${editId}` : '/api/admin/post';
    const method = editId ? 'PUT' : 'POST';
    const result = await apiFetch(endpoint, { method, body: JSON.stringify(data) });
    if (result.success) {
      showToast(editId ? 'مقاله به‌روزرسانی شد ✅' : 'مقاله منتشر شد ✅');
      form.reset();
      if (tinymce.get('rich-editor')) tinymce.get('rich-editor').setContent('');
      delete form.dataset.editId;
      form.querySelector('.btn[type="submit"]').textContent = '💾 ذخیره و انتشار';
      loadStats();
    } else {
      showToast(result.error || 'خطا در ذخیره');
    }
  });

  // Draft button
  $('[data-save-draft]')?.addEventListener('click', () => {
    const form = $('[data-post-form]');
    form.published.checked = false;
    form.dispatchEvent(new Event('submit'));
  });
};

// ============= CATEGORIES =============
const loadCategories = async () => {
  const list = $('[data-categories-list]');
  if (!list) return;
  const result = await apiFetch('/api/admin/categories');
  if (!result.success) { list.innerHTML = '<p style="color:var(--muted)">خطا</p>'; return; }
  list.innerHTML = result.categories.map(cat => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;background:rgba(255,255,255,.03)">
      <span style="width:20px;height:20px;border-radius:6px;background:${cat.color};display:inline-block"></span>
      <span style="flex:1;font-weight:800">${cat.name}</span>
      <span style="color:var(--muted);font-size:12px">/${cat.slug}</span>
      <button class="btn btn-danger btn-sm" onclick="deleteCategory(${cat.id})">🗑</button>
    </div>
  `).join('');
};

const initCategoryForm = () => {
  const form = $('[data-category-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = await apiFetch('/api/admin/category', {
      method: 'POST',
      body: JSON.stringify({
        name: form.cat_name.value,
        slug: form.cat_slug.value,
        color: form.cat_color.value,
        sort_order: 0
      })
    });
    if (result.success) {
      showToast('دسته‌بندی اضافه شد ✅');
      form.reset();
      loadCategories();
      loadStats();
    } else {
      showToast(result.error || 'خطا');
    }
  });
};

const deleteCategory = async (id) => {
  if (!confirm('آیا مطمئن هستید؟')) return;
  const result = await apiFetch(`/api/admin/category/${id}`, { method: 'DELETE' });
  if (result.success) { showToast('حذف شد'); loadCategories(); }
};

// ============= MEDIA =============
const loadMedia = async () => {
  const grid = $('[data-media-grid]');
  if (!grid) return;
  grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center">در حال بارگذاری...</p>';
  const result = await apiFetch('/api/admin/media');
  if (!result.success) { grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center">خطا</p>'; return; }
  if (result.media.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center">هنوز رسانه‌ای آپلود نشده</p>';
    return;
  }
  grid.innerHTML = result.media.map(m => `
    <div class="media-item" onclick="selectMedia('${m.url}', '${m.filename}')">
      <img src="${m.url}" alt="${m.filename}" loading="lazy">
      <div class="media-name">${m.filename}</div>
    </div>
  `).join('');
};

const initMediaUpload = () => {
  const zone = $('[data-upload-zone]');
  const input = $('[data-file-input]');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files.length) uploadFile(input.files[0]); });
};

const uploadFile = async (file) => {
  showToast('در حال آپلود...');
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('pixorisAdminToken');
  try {
    const res = await fetch(`${API_BASE}/api/admin/upload`, {
      method: 'POST',
      headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      showToast('آپلود شد ✅');
      loadMedia();
    } else {
      showToast(data.error || 'خطا در آپلود');
    }
  } catch (err) { showToast('خطای شبکه'); }
};

const selectMedia = (url, filename) => {
  const input = $('#featured-image-input');
  if (input) input.value = url;
  showToast('تصویر انتخاب شد ✅');
  // Go back to new post tab
  $('[data-admin-tab="new-post"]').click();
};

// ============= SETTINGS =============
const initSettings = () => {
  const saveBtn = $('[data-save-api]');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const url = $('[data-api-url]')?.value;
      if (url) { localStorage.setItem('pixorisApiUrl', url); showToast('ذخیره شد ✅'); }
    });
  }
  const clearBtn = $('[data-clear-cache]');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('تمام کش‌ها پاک شوند؟')) {
        localStorage.removeItem('pixorisAdminToken');
        localStorage.removeItem('pixorisApiUrl');
        showToast('کش پاک شد');
        location.reload();
      }
    });
  }
};

// ============= LOGOUT =============
const initLogout = () => {
  $('[data-admin-logout]')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('pixorisAdminToken');
    location.reload();
  });
};

// ============= INIT =============
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initLogin();
  initPostForm();
  initCategoryForm();
  initMediaUpload();
  initSettings();
  initLogout();
  checkAuth();
});
