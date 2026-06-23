// =========================================================
// Pixoris CMS Admin Panel v2.2
// Fixes:
//   • No API_BASE duplicate (uses window.API_BASE)
//   • Enhanced RTE (code blocks, tables, blockquote)
//   • Products management tab
//   • Users management (super_admin)
//   • Audit logs viewer
//   • Settings management
//   • Better error handling
// =========================================================

// ============= API_BASE (idempotent) =============
window.API_BASE = window.API_BASE || 'https://dev.pixoris.workers.dev';

const $a = (sel, ctx = document) => ctx.querySelector(sel);
const $$a = (sel, ctx = document) => ctx.querySelectorAll(sel);

const showAdminToast = (msg, duration = 2200) => {
  const toast = $a('[data-toast]');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
};

const adminApiFetch = async (endpoint, options = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${window.API_BASE}${endpoint}`;
  const token = localStorage.getItem('pixorisAdminToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  try {
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('pixorisAdminToken');
      showAdminToast('نشست منقضی شده، لطفاً دوباره وارد شوید');
      setTimeout(() => location.reload(), 1500);
      return { success: false, error: 'Unauthorized' };
    }
    const data = await res.json();
    return data;
  } catch (err) {
    showAdminToast('خطای شبکه: ' + err.message);
    return { success: false, error: err.message };
  }
};

const escapeAdminHtml = (str) => String(str || '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const formatAdminDate = (dateStr) => {
  try { return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr)); }
  catch { return dateStr || ''; }
};

// ============= ENHANCED RICH TEXT EDITOR =============
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

  const insertHTML = (html) => {
    document.execCommand('insertHTML', false, html);
    editorEl.focus();
    syncContent();
  };

  toolbarEl.querySelectorAll('button[data-cmd]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      const val = btn.dataset.val || null;
      exec(cmd, val);
    });
  });

  // Image insert with media library
  const imgBtn = toolbarEl.querySelector('[data-cmd="insertImage"]');
  if (imgBtn) {
    imgBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Open media picker
      const picker = $a('[data-media-picker]');
      if (picker) {
        picker.style.display = 'block';
        picker.dataset.target = 'rte';
        loadMediaPicker();
      } else {
        const url = prompt('آدرس تصویر را وارد کنید:', 'https://');
        if (url) exec('insertImage', url);
      }
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

  // Code block insert
  const codeBtn = toolbarEl.querySelector('[data-cmd="insertCodeBlock"]');
  if (codeBtn) {
    codeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const code = prompt('کد را وارد کنید:', '');
      if (code) insertHTML(`<pre><code>${escapeAdminHtml(code)}</code></pre><p><br></p>`);
    });
  }

  // Table insert
  const tableBtn = toolbarEl.querySelector('[data-cmd="insertTable"]');
  if (tableBtn) {
    tableBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const rows = parseInt(prompt('تعداد سطرها:', '3'));
      const cols = parseInt(prompt('تعداد ستون‌ها:', '3'));
      if (!rows || !cols) return;
      let html = '<table style="width:100%;border-collapse:collapse;margin:12px 0">';
      for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) {
          html += `<td style="border:1px solid rgba(255,255,255,.15);padding:8px">${r === 0 ? 'عنوان' : ''}</td>`;
        }
        html += '</tr>';
      }
      html += '</table><p><br></p>';
      insertHTML(html);
    });
  }

  // Blockquote
  const quoteBtn = toolbarEl.querySelector('[data-cmd="insertQuote"]');
  if (quoteBtn) {
    quoteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      exec('formatBlock', 'BLOCKQUOTE');
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
        if (target === 'products') loadProducts();
        if (target === 'media') loadMedia();
        if (target === 'users') loadUsers();
        if (target === 'audit') loadAuditLogs();
        if (target === 'dashboard') loadStats();
        if (target === 'new-post') {
          setTimeout(initRTE, 50);
          loadCategoriesDropdown();
        }
        if (target === 'settings') loadSettings();
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
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'در حال ورود...';
    }
    showAdminToast('در حال ورود...');
    const result = await adminApiFetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        username: form.adminUser.value,
        password: form.adminPass.value
      })
    });
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'ورود به پنل';
    }
    if (result.success) {
      localStorage.setItem('pixorisAdminToken', result.token);
      localStorage.setItem('pixorisAdminRole', result.admin.role);
      localStorage.setItem('pixorisAdminName', result.admin.username);
      showAdminToast('ورود موفق ✅');
      updateAdminUI(result.admin);
      showCMS();
    } else {
      showAdminToast(result.error || 'ورود ناموفق');
    }
  });
};

const updateAdminUI = (admin) => {
  // Show/hide role-restricted tabs
  const role = admin.role;
  const isAdmin = ['admin', 'super_admin'].includes(role);
  const isSuperAdmin = role === 'super_admin';

  $$a('[data-role-min="admin"]').forEach(el => el.style.display = isAdmin ? '' : 'none');
  $$a('[data-role-min="super_admin"]').forEach(el => el.style.display = isSuperAdmin ? '' : 'none');

  const roleLabel = $a('[data-admin-role]');
  if (roleLabel) roleLabel.textContent = role;

  const nameLabel = $a('[data-admin-name]');
  if (nameLabel) nameLabel.textContent = admin.username;
};

const showCMS = () => {
  const loginScreen = $a('#admin-login-screen');
  const cmsScreen = $a('#admin-cms-screen');
  if (loginScreen) loginScreen.style.display = 'none';
  if (cmsScreen) cmsScreen.style.display = 'block';
  loadStats();
};

const checkAuth = async () => {
  const token = localStorage.getItem('pixorisAdminToken');
  if (!token) return;
  const result = await adminApiFetch('/api/admin/me');
  if (result.success) {
    updateAdminUI(result.admin);
    showCMS();
  } else {
    localStorage.removeItem('pixorisAdminToken');
    localStorage.removeItem('pixorisAdminRole');
  }
};

// ============= STATS / DASHBOARD =============
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
      <p>📊 ${stats.totalPosts?.toLocaleString('fa-IR') || 0} مقاله در سایت</p>
      <p>✅ ${stats.published?.toLocaleString('fa-IR') || 0} مقاله منتشر شده</p>
      <p>📝 ${stats.drafts?.toLocaleString('fa-IR') || 0} پیش‌نویس</p>
      <p>👁 ${stats.totalViews?.toLocaleString('fa-IR') || 0} بازدید کل</p>
      <p>🛒 ${stats.products?.toLocaleString('fa-IR') || 0} محصول فعال</p>
      <p>🖼 ${stats.media?.toLocaleString('fa-IR') || 0} فایل رسانه</p>
    `;
  }
  // Latest posts table
  const latestHost = $a('[data-dashboard-latest]');
  if (latestHost && result.latestPosts) {
    latestHost.innerHTML = result.latestPosts.map(p => `
      <div class="dashboard-post-row">
        <strong>${escapeAdminHtml(p.title)}</strong>
        <span class="post-status ${p.status === 'published' ? 'published' : 'draft'}">${p.status === 'published' ? 'منتشر شده' : 'پیش‌نویس'}</span>
        <span>${(p.views || 0).toLocaleString('fa-IR')} بازدید</span>
        <span class="muted">${formatAdminDate(p.updated_at)}</span>
      </div>
    `).join('') || '<p class="muted">هنوز مقاله‌ای ثبت نشده</p>';
  }
  // Top posts
  const topHost = $a('[data-dashboard-top]');
  if (topHost && result.topPosts) {
    topHost.innerHTML = result.topPosts.map((p, i) => `
      <div class="dashboard-post-row">
        <strong>${(i + 1).toLocaleString('fa-IR')}. ${escapeAdminHtml(p.title)}</strong>
        <span class="muted">${(p.views || 0).toLocaleString('fa-IR')} بازدید</span>
      </div>
    `).join('') || '<p class="muted">داده‌ای موجود نیست</p>';
  }
};

// ============= POSTS =============
const loadPosts = async () => {
  const list = $a('[data-admin-posts-list]');
  if (!list) return;
  list.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">در حال بارگذاری...</td></tr>';
  const result = await adminApiFetch('/api/admin/posts');
  if (!result.success) {
    list.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--pink)">${escapeAdminHtml(result.error || 'خطا')}</td></tr>`;
    return;
  }
  if (result.posts.length === 0) {
    list.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">هنوز مقاله‌ای ثبت نشده</td></tr>';
    return;
  }
  list.innerHTML = result.posts.map(post => `
    <tr>
      <td style="font-weight:800">${escapeAdminHtml(post.title)}</td>
      <td>${escapeAdminHtml(post.category_name || '-')}</td>
      <td><span class="post-status ${post.status === 'published' ? 'published' : post.status === 'scheduled' ? 'scheduled' : 'draft'}">${post.status === 'published' ? 'منتشر شده' : post.status === 'scheduled' ? 'زمان‌بندی' : 'پیش‌نویس'}</span></td>
      <td>${(post.views || 0).toLocaleString('fa-IR')}</td>
      <td style="font-size:12px;color:var(--muted)">${formatAdminDate(post.updated_at)}</td>
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
  form.featured_image_alt.value = post.featured_image_alt || '';
  form.excerpt.value = post.excerpt || '';
  form.seo_title.value = post.seo_title || '';
  form.seo_description.value = post.seo_description || '';
  form.canonical_url.value = post.canonical_url || '';
  form.meta_keywords.value = post.meta_keywords || '';
  form.featured.checked = post.featured === 1;
  // Status select
  const statusSelect = form.querySelector('[name="status"]');
  if (statusSelect) statusSelect.value = post.status || 'draft';
  if (rteEditor) rteEditor.setContent(post.content || '');
  const tagsInput = form.querySelector('input[name="tags"]');
  if (tagsInput && post.tags) tagsInput.value = post.tags.map(t => t.name).join(', ');
  form.dataset.editId = post.id;
  form.querySelector('.btn[type="submit"]').textContent = '💾 به‌روزرسانی';
};

// ============= CATEGORIES DROPDOWN =============
const loadCategoriesDropdown = async () => {
  const select = $a('select[name="category_id"]');
  if (!select) return;
  const result = await adminApiFetch('/api/admin/categories');
  if (result.success) {
    const current = select.value;
    select.innerHTML = '<option value="">انتخاب دسته‌بندی...</option>' +
      result.categories.map(c => `<option value="${c.id}">${escapeAdminHtml(c.name)}</option>`).join('');
    if (current) select.value = current;
  }
};

// ============= POST FORM =============
const initPostForm = () => {
  const form = $a('[data-post-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'در حال ذخیره...'; }
    const content = rteEditor ? rteEditor.getContent() : form.querySelector('textarea[name="content"]')?.value || '';
    const tagsStr = form.querySelector('input[name="tags"]')?.value || '';
    const statusSelect = form.querySelector('[name="status"]');
    const data = {
      title: form.title.value,
      slug: form.slug.value,
      category_id: parseInt(form.category_id.value) || null,
      image_url: form.image_url.value,
      featured_image_alt: form.featured_image_alt.value,
      excerpt: form.excerpt.value,
      content: content,
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      featured: form.featured.checked,
      status: statusSelect ? statusSelect.value : 'draft',
      seo_title: form.seo_title.value,
      seo_description: form.seo_description.value,
      canonical_url: form.canonical_url.value,
      meta_keywords: form.meta_keywords.value,
    };
    const editId = form.dataset.editId;
    const endpoint = editId ? `/api/admin/post/${editId}` : '/api/admin/post';
    const method = editId ? 'PUT' : 'POST';
    const result = await adminApiFetch(endpoint, { method, body: JSON.stringify(data) });
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editId ? '💾 به‌روزرسانی' : '💾 ذخیره و انتشار'; }
    if (result.success) {
      showAdminToast(editId ? 'مقاله به‌روزرسانی شد ✅' : 'مقاله ذخیره شد ✅');
      form.reset();
      if (rteEditor) rteEditor.setContent('');
      delete form.dataset.editId;
      form.querySelector('.btn[type="submit"]').textContent = '💾 ذخیره و انتشار';
      loadStats();
      $a('[data-admin-tab="posts"]').click();
    } else {
      showAdminToast(result.error || 'خطا در ذخیره');
    }
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
  const result = await adminApiFetch('/api/admin/categories');
  if (!result.success) { list.innerHTML = '<p style="color:var(--muted)">خطا</p>'; return; }
  list.innerHTML = result.categories.map(cat => `
    <div class="category-row">
      <span class="cat-color" style="background:${cat.color}"></span>
      <div class="cat-info">
        <strong>${escapeAdminHtml(cat.name)}</strong>
        <span class="muted">/${escapeAdminHtml(cat.slug)} • ${cat.post_count || 0} مقاله</span>
      </div>
      <div class="cat-meta">
        ${cat.is_featured ? '<span class="tag">ویژه</span>' : ''}
        ${!cat.is_active ? '<span class="tag" style="background:rgba(255,78,156,.2)">غیرفعال</span>' : ''}
        <span class="muted">ترتیب: ${cat.sort_order}</span>
      </div>
      <button class="btn btn-sm" onclick="window.editCategory(${cat.id})">✏️</button>
      <button class="btn btn-danger btn-sm" onclick="window.deleteCategory(${cat.id})">🗑</button>
    </div>
  `).join('');
};

const initCategoryForm = () => {
  const form = $a('[data-category-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editId = form.dataset.editId;
    const data = {
      name: form.cat_name.value,
      slug: form.cat_slug.value,
      color: form.cat_color.value,
      description: form.cat_description?.value || '',
      sort_order: parseInt(form.cat_sort_order?.value) || 0,
      is_featured: form.cat_featured?.checked || false,
      is_active: true
    };
    const endpoint = editId ? `/api/admin/category/${editId}` : '/api/admin/category';
    const method = editId ? 'PUT' : 'POST';
    const result = await adminApiFetch(endpoint, { method, body: JSON.stringify(data) });
    if (result.success) {
      showAdminToast(editId ? 'دسته‌بندی به‌روزرسانی شد ✅' : 'دسته‌بندی اضافه شد ✅');
      form.reset();
      delete form.dataset.editId;
      form.querySelector('button[type="submit"]').textContent = '➕ افزودن';
      loadCategories();
      loadStats();
    } else {
      showAdminToast(result.error || 'خطا');
    }
  });
};

window.editCategory = async (id) => {
  const result = await adminApiFetch('/api/admin/categories');
  if (!result.success) return;
  const cat = result.categories.find(c => c.id === id);
  if (!cat) return;
  const form = $a('[data-category-form]');
  form.cat_name.value = cat.name;
  form.cat_slug.value = cat.slug;
  form.cat_color.value = cat.color || '#4ee5ff';
  if (form.cat_description) form.cat_description.value = cat.description || '';
  if (form.cat_sort_order) form.cat_sort_order.value = cat.sort_order || 0;
  if (form.cat_featured) form.cat_featured.checked = cat.is_featured === 1;
  form.dataset.editId = id;
  form.querySelector('button[type="submit"]').textContent = '💾 به‌روزرسانی';
};

window.deleteCategory = async (id) => {
  if (!confirm('آیا مطمئن هستید؟ مقالات این دسته به "بدون دسته" منتقل می‌شوند.')) return;
  const result = await adminApiFetch(`/api/admin/category/${id}`, { method: 'DELETE' });
  if (result.success) { showAdminToast('حذف شد'); loadCategories(); loadStats(); }
};

// ============= PRODUCTS =============
const loadProducts = async () => {
  const list = $a('[data-admin-products-list]');
  if (!list) return;
  list.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted)">در حال بارگذاری...</td></tr>';
  const result = await adminApiFetch('/api/admin/products');
  if (!result.success) {
    list.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--pink)">${escapeAdminHtml(result.error || 'خطا')}</td></tr>`;
    return;
  }
  if (result.products.length === 0) {
    list.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted)">هنوز محصولی ثبت نشده</td></tr>';
    return;
  }
  list.innerHTML = result.products.map(p => `
    <tr>
      <td><img src="${p.image_url || 'assets/svg/card-shop.svg'}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover"></td>
      <td style="font-weight:800">${escapeAdminHtml(p.title)}</td>
      <td>${escapeAdminHtml(p.category || '-')}</td>
      <td>${toman(p.price)}</td>
      <td>${(p.stock || 0).toLocaleString('fa-IR')}</td>
      <td>${p.active ? '<span class="post-status published">فعال</span>' : '<span class="post-status draft">غیرفعال</span>'}</td>
      <td>
        <div class="post-actions">
          <button class="btn btn-sm" onclick="window.editProduct(${p.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="window.deleteProduct(${p.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
};

// NOTE: `toman` is declared globally in script.js (loaded before admin.js).
// We intentionally do NOT redeclare it here — that was the v2.2 bug that broke admin.js.
// If script.js failed to load (rare), define a fallback on window so admin functions still work.
if (typeof window.toman !== 'function') {
  window.toman = (num) => {
    const safe = Number(num) || 0;
    try { return new Intl.NumberFormat('fa-IR').format(safe) + ' ت'; }
    catch { return safe.toLocaleString() + ' ت'; }
  };
}

const initProductForm = () => {
  const form = $a('[data-product-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'در حال ذخیره...'; }
    const data = {
      title: form.p_title.value,
      slug: form.p_slug.value,
      description: form.p_description.value,
      price: parseInt(form.p_price.value) || 0,
      discount_price: form.p_discount_price.value ? parseInt(form.p_discount_price.value) : null,
      stock: parseInt(form.p_stock.value) || 0,
      sku: form.p_sku.value,
      image_url: form.p_image_url.value,
      category: form.p_category.value,
      featured: form.p_featured.checked,
      active: form.p_active.checked,
      sort_order: parseInt(form.p_sort_order.value) || 0,
      gallery: []
    };
    const editId = form.dataset.editId;
    const endpoint = editId ? `/api/admin/product/${editId}` : '/api/admin/product';
    const method = editId ? 'PUT' : 'POST';
    const result = await adminApiFetch(endpoint, { method, body: JSON.stringify(data) });
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editId ? '💾 به‌روزرسانی محصول' : '➕ افزودن محصول'; }
    if (result.success) {
      showAdminToast(editId ? 'محصول به‌روزرسانی شد ✅' : 'محصول اضافه شد ✅');
      form.reset();
      delete form.dataset.editId;
      loadProducts();
      loadStats();
    } else {
      showAdminToast(result.error || 'خطا');
    }
  });
};

window.editProduct = async (id) => {
  const result = await adminApiFetch('/api/admin/products');
  if (!result.success) return;
  const p = result.products.find(x => x.id === id);
  if (!p) return;
  const form = $a('[data-product-form]');
  form.p_title.value = p.title;
  form.p_slug.value = p.slug;
  form.p_description.value = p.description || '';
  form.p_price.value = p.price;
  form.p_discount_price.value = p.discount_price || '';
  form.p_stock.value = p.stock || 0;
  form.p_sku.value = p.sku || '';
  form.p_image_url.value = p.image_url || '';
  form.p_category.value = p.category || '';
  form.p_featured.checked = p.featured === 1;
  form.p_active.checked = p.active === 1;
  form.p_sort_order.value = p.sort_order || 0;
  form.dataset.editId = id;
  form.querySelector('button[type="submit"]').textContent = '💾 به‌روزرسانی محصول';
};

window.deleteProduct = async (id) => {
  if (!confirm('آیا مطمئن هستید؟')) return;
  const result = await adminApiFetch(`/api/admin/product/${id}`, { method: 'DELETE' });
  if (result.success) { showAdminToast('محصول حذف شد'); loadProducts(); loadStats(); }
};

// ============= MEDIA =============
const loadMedia = async () => {
  const grid = $a('[data-media-grid]');
  if (!grid) return;
  grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center">در حال بارگذاری...</p>';
  const searchInput = $a('[data-media-search]');
  const q = searchInput?.value || '';
  const result = await adminApiFetch(`/api/admin/media${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  if (!result.success) { grid.innerHTML = '<p style="color:var(--pink);grid-column:1/-1;text-align:center">خطا</p>'; return; }
  if (result.media.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);grid-column:1/-1;text-align:center">هنوز رسانه‌ای آپلود نشده</p>';
    return;
  }
  grid.innerHTML = result.media.map(m => `
    <div class="media-item">
      <img src="${m.url}" alt="${escapeAdminHtml(m.alt_text || m.filename)}" loading="lazy" onclick="window.selectMedia('${m.url}', '${escapeAdminHtml(m.filename)}')">
      <div class="media-name">${escapeAdminHtml(m.original_name || m.filename)}</div>
      <button class="btn btn-danger btn-sm media-delete-btn" onclick="event.stopPropagation(); window.deleteMedia(${m.id})">🗑</button>
    </div>
  `).join('');
};

window.deleteMedia = async (id) => {
  if (!confirm('این رسانه حذف شود؟')) return;
  const result = await adminApiFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
  if (result.success) { showAdminToast('حذف شد'); loadMedia(); loadStats(); }
  else showAdminToast(result.error || 'خطا');
};

const loadMediaPicker = async () => {
  const picker = $a('[data-media-picker]');
  if (!picker) return;
  const grid = picker.querySelector('[data-picker-grid]');
  if (!grid) return;
  grid.innerHTML = '<p style="color:var(--muted);text-align:center">در حال بارگذاری...</p>';
  const result = await adminApiFetch('/api/admin/media');
  if (!result.success) return;
  grid.innerHTML = result.media.map(m => `
    <div class="media-item" onclick="window.pickMedia('${m.url}')">
      <img src="${m.url}" alt="${escapeAdminHtml(m.filename)}" loading="lazy">
      <div class="media-name">${escapeAdminHtml(m.filename)}</div>
    </div>
  `).join('') || '<p style="color:var(--muted)">رسانه‌ای موجود نیست</p>';
};

window.pickMedia = (url) => {
  const picker = $a('[data-media-picker]');
  const target = picker?.dataset.target;
  if (target === 'rte' && rteEditor) {
    rteEditor.exec('insertImage', url);
  } else {
    const input = $a('#featured-image-input');
    if (input) input.value = url;
  }
  if (picker) picker.style.display = 'none';
  showAdminToast('تصویر انتخاب شد ✅');
};

window.selectMedia = (url, filename) => {
  const input = $a('#featured-image-input');
  if (input) input.value = url;
  showAdminToast('تصویر انتخاب شد ✅');
  $a('[data-admin-tab="new-post"]').click();
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

  // Media search
  const searchInput = $a('[data-media-search]');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadMedia(), 300);
    });
  }

  // Picker close
  const pickerClose = $a('[data-picker-close]');
  if (pickerClose) pickerClose.addEventListener('click', () => {
    $a('[data-media-picker]').style.display = 'none';
  });
};

const uploadFile = async (file) => {
  showAdminToast('در حال آپلود...');
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('pixorisAdminToken');
  try {
    const res = await fetch(`${window.API_BASE}/api/admin/upload`, {
      method: 'POST',
      headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      showAdminToast('آپلود شد ✅');
      loadMedia();
      loadStats();
    } else {
      showAdminToast(data.error || 'خطا در آپلود');
    }
  } catch (err) { showAdminToast('خطای شبکه'); }
};

// ============= USERS (super_admin only) =============
const loadUsers = async () => {
  const list = $a('[data-users-list]');
  if (!list) return;
  list.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted)">در حال بارگذاری...</td></tr>';
  const result = await adminApiFetch('/api/admin/users');
  if (!result.success) {
    list.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--pink)">${escapeAdminHtml(result.error || 'دسترسی ندارید')}</td></tr>`;
    return;
  }
  list.innerHTML = result.users.map(u => `
    <tr>
      <td style="font-weight:800">${escapeAdminHtml(u.username)}</td>
      <td>${escapeAdminHtml(u.email || '-')}</td>
      <td><span class="role-badge role-${u.role}">${u.role}</span></td>
      <td>${u.is_active ? '<span class="post-status published">فعال</span>' : '<span class="post-status draft">غیرفعال</span>'}</td>
      <td>${formatAdminDate(u.last_login) || '-'}</td>
      <td>
        <div class="post-actions">
          <button class="btn btn-sm" onclick="window.editUser(${u.id})">✏️</button>
          ${u.id !== 1 ? `<button class="btn btn-danger btn-sm" onclick="window.deleteUser(${u.id})">🗑</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
};

const initUserForm = () => {
  const form = $a('[data-user-form]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      username: form.u_username.value,
      email: form.u_email.value,
      role: form.u_role.value,
      is_active: form.u_active.checked,
      ...(form.u_password.value && { password: form.u_password.value })
    };
    const editId = form.dataset.editId;
    const endpoint = editId ? `/api/admin/user/${editId}` : '/api/admin/user';
    const method = editId ? 'PUT' : 'POST';
    const result = await adminApiFetch(endpoint, { method, body: JSON.stringify(data) });
    if (result.success) {
      showAdminToast(editId ? 'کاربر به‌روزرسانی شد ✅' : 'کاربر اضافه شد ✅');
      form.reset();
      delete form.dataset.editId;
      loadUsers();
    } else {
      showAdminToast(result.error || 'خطا');
    }
  });
};

window.editUser = async (id) => {
  const result = await adminApiFetch('/api/admin/users');
  if (!result.success) return;
  const u = result.users.find(x => x.id === id);
  if (!u) return;
  const form = $a('[data-user-form]');
  form.u_username.value = u.username;
  form.u_email.value = u.email || '';
  form.u_role.value = u.role;
  form.u_active.checked = u.is_active === 1;
  form.u_password.value = '';
  form.u_password.placeholder = 'برای تغییر نکن، خالی بگذار';
  form.dataset.editId = id;
};

window.deleteUser = async (id) => {
  if (!confirm('آیا مطمئن هستید؟')) return;
  const result = await adminApiFetch(`/api/admin/user/${id}`, { method: 'DELETE' });
  if (result.success) { showAdminToast('حذف شد'); loadUsers(); }
  else showAdminToast(result.error || 'خطا');
};

// ============= AUDIT LOGS =============
const loadAuditLogs = async () => {
  const list = $a('[data-audit-list]');
  if (!list) return;
  list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">در حال بارگذاری...</td></tr>';
  const result = await adminApiFetch('/api/admin/audit-logs?limit=100');
  if (!result.success) {
    list.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--pink)">${escapeAdminHtml(result.error || 'خطا')}</td></tr>`;
    return;
  }
  if (result.logs.length === 0) {
    list.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">رویدادی ثبت نشده</td></tr>';
    return;
  }
  list.innerHTML = result.logs.map(log => `
    <tr>
      <td style="font-weight:800">${escapeAdminHtml(log.action)}</td>
      <td>${escapeAdminHtml(log.admin_name || 'سیستم')}</td>
      <td>${escapeAdminHtml(log.entity_type || '-')} ${log.entity_id ? '#' + log.entity_id : ''}</td>
      <td style="font-size:12px;color:var(--muted)">${formatAdminDate(log.created_at)}</td>
      <td style="font-size:11px;color:var(--muted);max-width:300px;overflow:hidden;text-overflow:ellipsis">${escapeAdminHtml(log.details || '')}</td>
    </tr>
  `).join('');
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
    $$a('[name]', form).forEach(input => {
      if (input.name) data[input.name] = input.value;
    });
    const result = await adminApiFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify(data) });
    if (result.success) showAdminToast('تنظیمات ذخیره شد ✅');
    else showAdminToast(result.error || 'خطا');
  });
};

const initSettings = () => {
  const saveApiBtn = $a('[data-save-api]');
  if (saveApiBtn) {
    saveApiBtn.addEventListener('click', () => {
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
        localStorage.removeItem('pixorisAdminRole');
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
    localStorage.removeItem('pixorisAdminRole');
    location.reload();
  });
};

// ============= INIT =============
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initLogin();
  initPostForm();
  initCategoryForm();
  initProductForm();
  initMediaUpload();
  initUserForm();
  initSettingsForm();
  initSettings();
  initLogout();
  checkAuth();
});
