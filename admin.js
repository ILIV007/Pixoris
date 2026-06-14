// Pixoris CMS Admin Panel v2.1 — Production Ready
// Fixed: no duplicate API_BASE, TinyMCE replaced with custom RTE

const $a = (sel, ctx = document) => ctx.querySelector(sel);
const $$a = (sel, ctx = document) => ctx.querySelectorAll(sel);

const showAdminToast = (msg, duration = 1800) => {
  const toast = $a('[data-toast]');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
};

const adminApiFetch = async (endpoint, options = {}) => {
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
    showAdminToast('خطای شبکه: ' + err.message);
    return { success: false, error: err.message };
  }
};

// ============= RICH TEXT EDITOR (Custom) =============
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
  };

  const syncContent = () => {
    const textarea = $a('textarea[name="content"]');
    if (textarea) textarea.value = editorEl.innerHTML;
  };

  toolbarEl.querySelectorAll('button[data-cmd]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      const val = btn.dataset.val || null;
      exec(cmd, val);
    });
  });

  // Image insert
  const imgBtn = toolbarEl.querySelector('[data-cmd="insertImage"]');
  if (imgBtn) {
    imgBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = prompt('آدرس تصویر را وارد کنید:', 'https://');
      if (url) exec('insertImage', url);
    });
  }

  // Link insert
  const linkBtn = toolbarEl.querySelector('[data-cmd="createLink"]');
  if (linkBtn) {
    linkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = prompt('آدرس لینک را وارد کنید:', 'https://');
      if (url) exec('createLink', url);
    });
  }

  editorEl.addEventListener('input', syncContent);
  editorEl.addEventListener('blur', syncContent);

  rteEditor = {
    getContent: () => editorEl.innerHTML,
    setContent: (html) => { editorEl.innerHTML = html || '<p><br></p>'; syncContent(); },
    exec
  };
};

// ============= TAB SWITCHING =============
const initTabs = () => {
  $$a('[data-admin-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const target = tab.dataset.adminTab;
      $$a('[data-admin-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$a('.admin-tab').forEach(t => t.style.display = 'none');
      const targetEl = $a(`[data-tab="${target}"]`);
      if (targetEl) {
        targetEl.style.display = 'block';
        if (target === 'posts') loadPosts();
        if (target === 'categories') loadCategories();
        if (target === 'media') loadMedia();
        if (target === 'dashboard') loadStats();
        if (target === 'new-post') setTimeout(initRTE, 50);
      }
    });
  });

  $$a('[data-admin-tab-trigger]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.adminTabTrigger;
      const tab = $a(`[data-admin-tab="${target}"]`);
      if (tab) tab.click();
    });
  });
};

// ============= LOGIN =============
const initLogin = () => {
  const form = $a('[data-admin-login-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showAdminToast('در حال ورود...');
    const result = await adminApiFetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        username: form.adminUser.value,
        password: form.adminPass.value
      })
    });
    if (result.success) {
      localStorage.setItem('pixorisAdminToken', result.token);
      showAdminToast('ورود موفق ✅');
      showCMS();
    } else {
      showAdminToast(result.error || 'ورود ناموفق');
    }
  });
};

const showCMS = () => {
  const loginScreen = $a('#admin-login-screen');
  const cmsScreen = $a('#admin-cms-screen');
  if (loginScreen) loginScreen.style.display = 'none';
  if (cmsScreen) cmsScreen.style.display = 'block';
  loadStats();
};

const checkAuth = () => {
  const token = localStorage.getItem('pixorisAdminToken');
  if (token) {
    adminApiFetch('/api/admin/stats').then(result => {
      if (result.success) showCMS();
      else {
        localStorage.removeItem('pixorisAdminToken');
        showAdminToast('نشست منقضی شده، لطفاً دوباره وارد شوید');
      }
    });
  }
};

// ============= STATS =============
const loadStats = async () => {
  const result = await adminApiFetch('/api/admin/stats');
  if (!result.success) return;
  const stats = result.stats;
  $$a('[data-stat]').forEach(el => {
    const key = el.dataset.stat;
    if (stats[key] !== undefined) {
      el.textContent = stats[key].toLocaleString('fa-IR');
    }
  });
  const activity = $a('[data-admin-activity]');
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
  const list = $a('[data-admin-posts-list]');
  if (!list) return;
  list.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">در حال بارگذاری...</td></tr>';
  const result = await adminApiFetch('/api/admin/posts');
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
          <button class="btn btn-sm" onclick="window.editPost(${post.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="window.deletePost(${post.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
};

window.deletePost = async (id) => {
  if (!confirm('آیا مطمئن هستید؟')) return;
  const result = await adminApiFetch(`/api/admin/post/${id}`, { method: 'DELETE' });
  if (result.success) {
    showAdminToast('مقاله حذف شد');
    loadPosts();
    loadStats();
  } else {
    showAdminToast(result.error || 'خطا در حذف');
  }
};

window.editPost = async (id) => {
  const result = await adminApiFetch(`/api/admin/post/${id}`);
  if (!result.success) { showAdminToast('خطا در بارگذاری مقاله'); return; }
  const post = result.post;
  $a('[data-admin-tab="new-post"]').click();
  const form = $a('[data-post-form]');
  form.title.value = post.title;
  form.slug.value = post.slug;
  form.category_id.value = post.category_id || '';
  form.image_url.value = post.image_url || '';
  form.excerpt.value = post.excerpt || '';
  form.featured.checked = post.featured === 1;
  form.published.checked = post.published === 1;
  if (rteEditor) {
    rteEditor.setContent(post.content || '');
  }
  const tagsInput = form.querySelector('input[name="tags"]');
  if (tagsInput && post.tags) tagsInput.value = post.tags.map(t => t.name).join(', ');
  form.dataset.editId = post.id;
  form.querySelector('.btn[type="submit"]').textContent = '💾 به‌روزرسانی';
};

// ============= POST FORM =============
const initPostForm = () => {
  const form = $a('[data-post-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = rteEditor ? rteEditor.getContent() : form.querySelector('textarea[name="content"]')?.value || '';
    const tagsStr = form.querySelector('input[name="tags"]')?.value || '';
    const data = {
      title: form.title.value,
      slug: form.slug.value,
      category_id: parseInt(form.category_id.value) || null,
      image_url: form.image_url.value,
      excerpt: form.excerpt.value,
      content: content,
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      featured: form.featured.checked,
      published: form.published.checked
    };
    const editId = form.dataset.editId;
    const endpoint = editId ? `/api/admin/post/${editId}` : '/api/admin/post';
    const method = editId ? 'PUT' : 'POST';
    const result = await adminApiFetch(endpoint, { method, body: JSON.stringify(data) });
    if (result.success) {
      showAdminToast(editId ? 'مقاله به‌روزرسانی شد ✅' : 'مقاله منتشر شد ✅');
      form.reset();
      if (rteEditor) rteEditor.setContent('');
      delete form.dataset.editId;
      form.querySelector('.btn[type="submit"]').textContent = '💾 ذخیره و انتشار';
      loadStats();
    } else {
      showAdminToast(result.error || 'خطا در ذخیره');
    }
  });

  $a('[data-save-draft]')?.addEventListener('click', () => {
    form.published.checked = false;
    form.dispatchEvent(new Event('submit'));
  });
};

// ============= CATEGORIES =============
const loadCategories = async () => {
  const list = $a('[data-categories-list]');
  if (!list) return;
  const result = await adminApiFetch('/api/admin/categories');
  if (!result.success) { list.innerHTML = '<p style="color:var(--muted)">خطا</p>'; return; }
  list.innerHTML = result.categories.map(cat => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;background:rgba(255,255,255,.03)">
      <span style="width:20px;height:20px;border-radius:6px;background:${cat.color};display:inline-block"></span>
      <span style="flex:1;font-weight:800">${cat.name}</span>
      <span style="color:var(--muted);font-size:12px">/${cat.slug}</span>
      <button class="btn btn-danger btn-sm" onclick="window.deleteCategory(${cat.id})">🗑</button>
    </div>
  `).join('');
};

const initCategoryForm = () => {
  const form = $a('[data-category-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = await adminApiFetch('/api/admin/category', {
      method: 'POST',
      body: JSON.stringify({
        name: form.cat_name.value,
        slug: form.cat_slug.value,
        color: form.cat_color.value,
        sort_order: 0
      })
    });
    if (result.success) {
      showAdminToast('دسته‌بندی اضافه شد ✅');
      form.reset();
      loadCategories();
      loadStats();
    } else {
      showAdminToast(result.error || 'خطا');
    }
  });
};

window.deleteCategory = async (id) => {
  if (!confirm('آیا مطمئن هستید؟')) return;
  const result = await adminApiFetch(`/api/admin/category/${id}`, { method: 'DELETE' });
  if (result.success) { showAdminToast('حذف شد'); loadCategories(); }
};

// ============= MEDIA =============
const loadMedia = async () => {
  const grid = $a('[data-media-grid]');
  if (!grid) return;
  grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center">در حال بارگذاری...</p>';
  const result = await adminApiFetch('/api/admin/media');
  if (!result.success) { grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center">خطا</p>'; return; }
  if (result.media.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center">هنوز رسانه‌ای آپلود نشده</p>';
    return;
  }
  grid.innerHTML = result.media.map(m => `
    <div class="media-item" onclick="window.selectMedia('${m.url}', '${m.filename}')">
      <img src="${m.url}" alt="${m.filename}" loading="lazy">
      <div class="media-name">${m.filename}</div>
    </div>
  `).join('');
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
    if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', () => { if (input.files.length) uploadFile(input.files[0]); });
};

const uploadFile = async (file) => {
  showAdminToast('در حال آپلود...');
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
      showAdminToast('آپلود شد ✅');
      loadMedia();
    } else {
      showAdminToast(data.error || 'خطا در آپلود');
    }
  } catch (err) { showAdminToast('خطای شبکه'); }
};

window.selectMedia = (url, filename) => {
  const input = $a('#featured-image-input');
  if (input) input.value = url;
  showAdminToast('تصویر انتخاب شد ✅');
  $a('[data-admin-tab="new-post"]').click();
};

// ============= SETTINGS =============
const initSettings = () => {
  const saveBtn = $a('[data-save-api]');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const url = $a('[data-api-url]')?.value;
      if (url) { localStorage.setItem('pixorisApiUrl', url); showAdminToast('ذخیره شد ✅'); }
    });
  }
  const clearBtn = $a('[data-clear-cache]');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('تمام کش‌ها پاک شوند؟')) {
        localStorage.removeItem('pixorisAdminToken');
        localStorage.removeItem('pixorisApiUrl');
        showAdminToast('کش پاک شد');
        location.reload();
      }
    });
  }
};

// ============= LOGOUT =============
const initLogout = () => {
  $a('[data-admin-logout]')?.addEventListener('click', (e) => {
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
