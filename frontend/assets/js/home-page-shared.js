'use strict';

(function () {
  function escapeHtml(value) {
    if (typeof window.sanitiseTrustedHtml === 'function') {
      return window.sanitiseTrustedHtml(value);
    }
    const s = String(value == null ? '' : value);
    const node = document.createElement('div');
    node.textContent = s;
    return node.innerHTML;
  }

  function feedAssetPath(url, prefix) {
    if (!url || !String(url).trim()) return '';
    const clean = String(url).trim();
    if (/^https?:\/\//i.test(clean)) return clean;
    const normalized = clean.replace(/^\//, '');
    return (prefix || '') + normalized;
  }

  function renderFeedList(ul, items, dateFormatter, storyHrefBuilder, pathPrefix) {
    if (!ul) return;
    ul.innerHTML = '';
    if (!items || !items.length) {
      ul.innerHTML = '<li class="glan-feed-item"><p style="margin:0;color:var(--clr-text-mid)">No items to show yet.</p></li>';
      return;
    }
    items.forEach(function (item) {
      const li = document.createElement('li');
      const src = feedAssetPath(item.imageUrl, pathPrefix || '');
      const img = src ? '<img class="glan-feed-thumb" src="' + escapeHtml(src) + '" alt="">' : '';
      li.className = 'glan-feed-item';
      li.innerHTML =
        '<div class="glan-feed-item-inner">' +
        img +
        '<div class="glan-feed-body"><span class="glan-feed-date">' +
        escapeHtml(dateFormatter(item.date)) +
        '</span><h4><a style="text-decoration:none;color:inherit" href="' +
        escapeHtml(storyHrefBuilder(item)) +
        '">' +
        escapeHtml(item.title) +
        '</a></h4><p>' +
        escapeHtml(item.excerpt || '') +
        '</p></div></div>';
      ul.appendChild(li);
    });
  }

  window.VCGHomePage = {
    escapeHtml: escapeHtml,
    feedAssetPath: feedAssetPath,
    renderFeedList: renderFeedList,
  };
})();
