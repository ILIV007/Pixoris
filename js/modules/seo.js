// =========================================================
// Pixoris v4 — SEO Module
// =========================================================
// Dynamic meta tag injection for articles/products
// =========================================================

export const setMeta = (name, content, attr = 'name') => {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

export const setSEO = ({ title, description, image, canonical, type = 'article' }) => {
  if (title) document.title = title;
  if (description) setMeta('description', description);

  setMeta('og:title', title || 'Pixoris', 'property');
  setMeta('og:description', description || '', 'property');
  setMeta('og:type', type, 'property');
  setMeta('og:image', image || '', 'property');
  setMeta('og:url', window.location.href, 'property');

  setMeta('twitter:card', image ? 'summary_large_image' : 'summary');
  setMeta('twitter:title', title || 'Pixoris');
  setMeta('twitter:description', description || '');
  setMeta('twitter:image', image || '');

  if (canonical) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;
  }
};

export const injectStructuredData = (data) => {
  let sdScript = document.querySelector('script[type="application/ld+json"]');
  if (!sdScript) {
    sdScript = document.createElement('script');
    sdScript.type = 'application/ld+json';
    document.head.appendChild(sdScript);
  }
  sdScript.textContent = JSON.stringify(data);
};
