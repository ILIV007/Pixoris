// =========================================================
// Pixoris v4 — Dynamic Content Loader
// =========================================================
// Fetches posts/products from API and renders them on pages
// =========================================================

import { apiFetch } from './api.js';
import { toman, escapeHtml, formatDate, qs } from './utils.js';
import { Cart } from './cart.js';
import { ScrollReveal } from './ui.js';

export const DynamicContent = {
  init: () => {
    const page = document.body.dataset.page;
    if (page === 'home') {
      // Use bootstrap endpoint (1 API call instead of 4)
      DynamicContent.loadBootstrap();
      DynamicContent.loadShopPreview();
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

  // Single API call to load all homepage data (featured + latest + categories + trending)
  loadBootstrap: async () => {
    const result = await apiFetch('/api/bootstrap');
    if (!result.success) {
      // Fallback to individual calls
      DynamicContent.loadFeatured();
      DynamicContent.loadLatest();
      DynamicContent.loadTrending();
      return;
    }
    const data = result.data || result;

    // Featured posts
    const featuredHost = qs('[data-featured-posts]');
    if (featuredHost && data.featured?.length) {
      featuredHost.innerHTML = data.featured.slice(0, 2).map((post, i) => `
        <article class="post-card-clean ${i === 0 ? 'post-wide reveal' : 'reveal'}">
          <a class="post-media" href="article.html?slug=${post.slug}">
            <img src="${post.image_url || 'assets/svg/card-game.svg'}" alt="${escapeHtml(post.title)}" loading="lazy" decoding="async" width="400" height="200">
          </a>
          <div class="post-content">
            <div class="meta">
              <span class="tag" style="background:${post.category_color || '#4ee5ff'}">${escapeHtml(post.category_name || 'News')}</span>
            </div>
            <h3><a href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a></h3>
            <p>${escapeHtml(post.excerpt || '')}</p>
            ${i === 0 ? `<a class="read-more" href="article.html?slug=${post.slug}">خواندن خبر ←</a>` : ''}
          </div>
        </article>
      `).join('');
    }

    // Latest posts
    const latestHost = qs('[data-latest-posts]');
    if (latestHost && data.latest?.length) {
      latestHost.innerHTML = data.latest.slice(0, 3).map(post => `
        <article class="product-tile reveal">
          <a class="product-media" href="article.html?slug=${post.slug}">
            <img src="${post.image_url || 'assets/svg/card-game.svg'}" alt="${escapeHtml(post.title)}" loading="lazy" decoding="async" width="300" height="170">
          </a>
          <div class="product-tile-body">
            <span class="tag">${escapeHtml(post.category_name || 'News')}</span>
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.excerpt || '')}</p>
          </div>
        </article>
      `).join('');
    }

    // Trending
    const trendingHost = qs('[data-trending]');
    if (trendingHost && data.trending?.length) {
      trendingHost.innerHTML = data.trending.map((post, i) => `
        <a class="trending-item reveal" href="article.html?slug=${post.slug}">
          <span class="trending-rank">${(i + 1).toLocaleString('fa-IR')}</span>
          <div>
            <strong>${escapeHtml(post.title)}</strong>
            <span class="meta">${(post.views || 0).toLocaleString('fa-IR')} بازدید</span>
          </div>
        </a>
      `).join('');
    }

    // Re-init scroll reveal
    const { ScrollReveal } = await import('./ui.js');
    ScrollReveal.init();
  },

  loadFeatured: async () => {
    const host = qs('[data-featured-posts]');
    if (!host) return;
    host.innerHTML = '<div class="skeleton" style="height:200px"></div>';
    const result = await apiFetch('/api/featured?limit=2');
    if (result.success && result.posts.length > 0) {
      host.innerHTML = result.posts.map((post, i) => `
        <article class="post-card-clean ${i === 0 ? 'post-wide reveal' : 'reveal'}">
          <a class="post-media" href="article.html?slug=${post.slug}">
            <img src="${post.image_url || 'assets/svg/card-game.svg'}" alt="${escapeHtml(post.title)}" loading="lazy">
          </a>
          <div class="post-content">
            <div class="meta">
              <span class="tag" style="background:${post.category_color || '#4ee5ff'}">${escapeHtml(post.category_name || 'News')}</span>
            </div>
            <h3><a href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a></h3>
            <p>${escapeHtml(post.excerpt || '')}</p>
            ${i === 0 ? `<a class="read-more" href="article.html?slug=${post.slug}">خواندن خبر ←</a>` : ''}
          </div>
        </article>
      `).join('');
      ScrollReveal.init();
    } else {
      host.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>هنوز خبری منتشر نشده</h3><p>به‌زودی محتوای جدید اضافه می‌شود.</p></div>';
    }
  },

  loadLatest: async () => {
    const host = qs('[data-latest-posts]');
    if (!host) return;
    const result = await apiFetch('/api/posts?limit=3');
    if (result.success && result.posts.length > 0) {
      host.innerHTML = result.posts.map(post => `
        <article class="product-tile reveal">
          <a class="product-media" href="article.html?slug=${post.slug}">
            <img src="${post.image_url || 'assets/svg/card-game.svg'}" alt="${escapeHtml(post.title)}" loading="lazy">
          </a>
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
    const host = qs('[data-shop-preview]');
    if (!host) return;
    const result = await apiFetch('/api/products?limit=3');
    if (result.success && result.products.length > 0) {
      host.innerHTML = result.products.map(p => `
        <article class="product-tile reveal">
          <a class="product-media" href="product.html?slug=${p.slug}">
            <img src="${p.image_url || 'assets/svg/card-shop.svg'}" alt="${escapeHtml(p.title)}" loading="lazy">
          </a>
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
      host.querySelectorAll('[data-add-to-cart]').forEach(btn => {
        btn.addEventListener('click', () => Cart.add(btn.dataset.addToCart));
      });
    }
  },

  loadTrending: async () => {
    const host = qs('[data-trending]');
    if (!host) return;
    const result = await apiFetch('/api/trending');
    if (result.success && result.posts.length > 0) {
      host.innerHTML = result.posts.map((post, i) => `
        <a class="trending-item reveal" href="article.html?slug=${post.slug}">
          <span class="trending-rank">${(i + 1).toLocaleString('fa-IR')}</span>
          <div>
            <strong>${escapeHtml(post.title)}</strong>
            <span class="meta">${escapeHtml(post.category_name || '')} • ${post.views?.toLocaleString('fa-IR') || 0} بازدید</span>
          </div>
        </a>
      `).join('');
      ScrollReveal.init();
    }
  },

  loadNews: async (page = 1) => {
    const host = qs('[data-news-list]');
    if (!host) return;
    host.innerHTML = '<div class="article-loading">در حال بارگذاری خبرها...</div>';
    const result = await apiFetch(`/api/posts?page=${page}&limit=10`);
    if (result.success) {
      if (result.posts.length === 0) {
        host.innerHTML = '<div class="empty-state"><h3>هنوز خبری منتشر نشده</h3><p>به زودی محتوای جدید اضافه می‌شود.</p></div>';
        return;
      }
      const featured = result.posts[0];
      const rest = result.posts.slice(1);
      let html = `
        <article class="post-card-clean post-featured reveal">
          <a class="post-media" href="article.html?slug=${featured.slug}">
            <img src="${featured.image_url || 'assets/svg/card-game.svg'}" alt="${escapeHtml(featured.title)}" loading="lazy">
          </a>
          <div class="post-content">
            <div class="meta">
              <span class="tag" style="background:${featured.category_color || '#4ee5ff'}">${escapeHtml(featured.category_name || 'News')}</span>
              <span>${formatDate(featured.published_at || featured.created_at)}</span>
            </div>
            <h3><a href="article.html?slug=${featured.slug}">${escapeHtml(featured.title)}</a></h3>
            <p>${escapeHtml(featured.excerpt || '')}</p>
            <a class="read-more" href="article.html?slug=${featured.slug}">ادامه خبر ←</a>
          </div>
        </article>
        <div class="post-list">
          ${rest.map(post => `
            <article class="post-card-clean reveal">
              <a class="post-media" href="article.html?slug=${post.slug}">
                <img src="${post.image_url || 'assets/svg/card-cinema.svg'}" alt="${escapeHtml(post.title)}" loading="lazy">
              </a>
              <div class="post-content">
                <div class="meta">
                  <span class="tag" style="background:${post.category_color || '#4ee5ff'}">${escapeHtml(post.category_name || 'News')}</span>
                </div>
                <h3><a href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a></h3>
                <p>${escapeHtml(post.excerpt || '')}</p>
              </div>
            </article>
          `).join('')}
        </div>
      `;
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
      host.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          DynamicContent.loadNews(parseInt(btn.dataset.page));
          window.scrollTo({ top: host.offsetTop - 80, behavior: 'smooth' });
        });
      });
    } else {
      host.innerHTML = `<div class="empty-state"><h3>خطا در بارگذاری</h3><p>${escapeHtml(result.error || 'لطفاً بعداً تلاش کنید.')}</p></div>`;
    }
  },

  bindSearch: () => {
    const input = qs('[data-search-input]');
    const btn = qs('[data-search-btn]');
    if (!input || !btn) return;
    const doSearch = async () => {
      const q = input.value.trim();
      if (q.length < 2) { DynamicContent.loadNews(); return; }
      const host = qs('[data-news-list]');
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
        host.innerHTML = `<div class="empty-state"><h3>نتیجه‌ای یافت نشد</h3><p>برای "${escapeHtml(q)}" چیزی پیدا نشد.</p></div>`;
      }
    };
    btn.addEventListener('click', doSearch);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') doSearch(); });
  },

  loadShop: async () => {
    const host = qs('[data-shop-grid]');
    if (!host) return;
    host.innerHTML = '<div class="article-loading" style="grid-column:1/-1">در حال بارگذاری محصولات...</div>';
    const result = await apiFetch('/api/products');
    if (result.success && result.products.length > 0) {
      host.innerHTML = result.products.map(p => `
        <article class="card reveal">
          <a class="media-thumb" href="product.html?slug=${p.slug}">
            <img src="${p.image_url || 'assets/svg/card-shop.svg'}" alt="${escapeHtml(p.title)}" loading="lazy">
          </a>
          <div class="card-body">
            <div class="meta">
              <span class="tag">${escapeHtml(p.category || 'Product')}</span>
              ${p.stock > 0 ? '<span>موجود</span>' : '<span style="color:var(--pink)">ناموجود</span>'}
            </div>
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
      host.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>هنوز محصولی ثبت نشده</h3><p>به‌زودی محصولات اضافه می‌شوند.</p></div>';
    }
  },

  loadProduct: async () => {
    const host = qs('[data-product-detail]');
    if (!host) return;
    const slug = new URLSearchParams(location.search).get('slug') || new URLSearchParams(location.search).get('id');
    if (!slug) {
      host.innerHTML = '<div class="empty-state"><h3>محصول پیدا نشد</h3><a class="btn" href="shop.html">بازگشت به فروشگاه</a></div>';
      return;
    }
    host.innerHTML = '<div class="article-loading">در حال بارگذاری محصول...</div>';
    const result = await apiFetch(`/api/product/${slug}`);
    if (!result.success) {
      host.innerHTML = `<div class="empty-state"><h3>محصول پیدا نشد</h3><p>${escapeHtml(result.error || '')}</p><a class="btn" href="shop.html">بازگشت به فروشگاه</a></div>`;
      return;
    }
    const p = result.product;
    const { setSEO } = await import('./seo.js');
    setSEO({ title: `${p.title} | Pixoris`, description: p.description, image: p.image_url, type: 'product' });
    host.innerHTML = `
      <div class="product-detail-inner">
        <div class="product-gallery">
          <img src="${p.image_url || 'assets/svg/card-shop.svg'}" alt="${escapeHtml(p.title)}">
        </div>
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

    const relatedHost = qs('[data-related-products]');
    if (relatedHost && result.related && result.related.length > 0) {
      relatedHost.innerHTML = result.related.map(rp => `
        <article class="card reveal">
          <a class="media-thumb" href="product.html?slug=${rp.slug}">
            <img src="${rp.image_url || 'assets/svg/card-shop.svg'}" alt="${escapeHtml(rp.title)}" loading="lazy">
          </a>
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
    const host = qs('[data-article-detail]');
    if (!host) return;
    const slug = new URLSearchParams(location.search).get('slug') || new URLSearchParams(location.search).get('id');
    if (!slug) {
      const { ArticleFallback } = await import('./fallback.js');
      ArticleFallback.render(host);
      return;
    }
    host.innerHTML = '<div class="article-loading">در حال بارگذاری مقاله...</div>';
    const result = await apiFetch(`/api/post/${slug}`);
    if (!result.success) {
      host.innerHTML = `<div class="empty-state"><h3>مقاله پیدا نشد</h3><p>${escapeHtml(result.error || '')}</p><a class="btn" href="news.html">بازگشت به خبرها</a></div>`;
      return;
    }
    const post = result.post;
    const { setSEO, injectStructuredData } = await import('./seo.js');
    setSEO({
      title: `${post.title} | Pixoris`,
      description: post.excerpt || post.seo_description || '',
      image: post.image_url,
      canonical: post.canonical_url,
      type: 'article',
    });
    injectStructuredData({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: post.title,
      description: post.excerpt || '',
      image: post.image_url || '',
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at,
      author: { '@type': 'Person', name: post.author_name || 'Pixoris' },
      publisher: { '@type': 'Organization', name: 'Pixoris' },
    });

    const tagsHtml = post.tags && post.tags.length
      ? `<div class="article-tags">${post.tags.map(t => `<a class="tag" href="news.html?tag=${t.slug}">${escapeHtml(t.name)}</a>`).join('')}</div>`
      : '';

    host.innerHTML = `
      <div class="article-cover">
        <img src="${post.image_url || 'assets/svg/card-game.svg'}" alt="${escapeHtml(post.featured_image_alt || post.title)}">
      </div>
      <div class="article-content">
        <nav class="breadcrumb">
          <a href="index.html">خانه</a> ›
          <a href="news.html">خبرها</a> ›
          <span>${escapeHtml(post.title)}</span>
        </nav>
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
          <button class="btn btn-sm" onclick="navigator.clipboard?.writeText(location.href); PixorisToast('لینک کپی شد')">🔗 کپی لینک</button>
        </div>
        <div class="hero-actions">
          <a class="btn" href="news.html">بازگشت به خبرها</a>
          <a class="btn btn-outline" href="shop.html">مشاهده فروشگاه</a>
        </div>
      </div>
    `;

    if (post.related && post.related.length > 0) {
      const relatedHost = qs('[data-related-articles]');
      if (relatedHost) {
        relatedHost.innerHTML = post.related.map(rp => `
          <article class="card reveal">
            <a class="media-thumb" href="article.html?slug=${rp.slug}">
              <img src="${rp.image_url || 'assets/svg/card-game.svg'}" alt="${escapeHtml(rp.title)}" loading="lazy">
            </a>
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
    const host = qs('[data-analysis-list]');
    if (!host) return;
    const result = await apiFetch('/api/posts?category=reviews&limit=8');
    if (result.success && result.posts.length > 0) {
      host.innerHTML = result.posts.map(post => `
        <article class="card reveal">
          <div class="card-body">
            <div class="meta">
              <span class="tag">${escapeHtml(post.category_name || 'Review')}</span>
              <span>${formatDate(post.published_at || post.created_at)}</span>
            </div>
            <h3><a href="article.html?slug=${post.slug}">${escapeHtml(post.title)}</a></h3>
            <p>${escapeHtml(post.excerpt || '')}</p>
            <a class="read-more" href="article.html?slug=${post.slug}">بیشتر بخوان ←</a>
          </div>
        </article>
      `).join('');
      ScrollReveal.init();
    }
  },
};
