(function attachReaderLinkInterception() {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented) {
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const anchor = findAnchor(event.target);
    if (!anchor) {
      return;
    }

    const href = anchor.href;
    if (!href || !isNavigableURL(href)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    showLoadingOverlay();
    chrome.runtime.sendMessage({ type: 'reader-open-link', href });
  }, true);
})();

function findAnchor(target) {
  let node = target;
  if (node && node.nodeType === 3) {
    node = node.parentElement;
  }

  while (node && node.nodeType === 1) {
    if (typeof node.matches === 'function' && node.matches('a[href]')) {
      return node;
    }
    node = node.parentElement;
  }

  return null;
}

function isNavigableURL(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

function showLoadingOverlay() {
  if (document.getElementById('reader-loading-overlay')) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'reader-loading-overlay';
  overlay.setAttribute('style', [
    'position:fixed',
    'inset:0',
    'background:#002b36',
    'color:#93a1a1',
    'display:grid',
    'place-items:center',
    'font:16px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
    'z-index:2147483647'
  ].join(';'));
  overlay.textContent = 'Loading reader view...';
  document.documentElement.appendChild(overlay);
}
