(async function loadRenderedHTML() {
  const loading = document.getElementById('loading');
  const frame = document.getElementById('viewer-frame');

  const id = window.location.hash.slice(1);
  if (!id) {
    renderError('Missing render id in URL hash');
    return;
  }

  const key = `render:${id}`;
  const stored = await chrome.storage.local.get(key);
  const payload = stored[key];

  if (!payload || typeof payload.html !== 'string' || payload.html.length === 0) {
    renderError('Rendered content is missing or expired');
    return;
  }

  await chrome.storage.local.remove(key);
  frame.srcdoc = payload.html;
  frame.addEventListener('load', () => {
    attachPerLinkHandlers(frame.contentDocument);
    if (loading) {
      loading.style.display = 'none';
    }
  }, { once: true });
})();

function renderError(message) {
  document.body.innerHTML = `<div id="loading">${escapeHTML(message)}</div>`;
}

function escapeHTML(input) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function attachPerLinkHandlers(doc) {
  if (!doc) {
    return;
  }

  const anchors = Array.from(doc.querySelectorAll('a[href]'));
  for (const anchor of anchors) {
    const href = anchor.href;
    if (!href || !isNavigableURL(href)) {
      continue;
    }

    anchor.dataset.readerHref = href;
    anchor.setAttribute('href', '#');
    anchor.setAttribute('target', '_self');

    anchor.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      const targetHref = anchor.dataset.readerHref;
      if (!targetHref) {
        return;
      }

      showLoadingOverlay();
      chrome.runtime.sendMessage({ type: 'reader-open-link', href: targetHref });
    }, true);
  }
}

function showLoadingOverlay() {
  const loading = document.getElementById('loading');
  if (!loading) {
    return;
  }
  loading.textContent = 'Loading reader view...';
  loading.style.display = 'grid';
}

function isNavigableURL(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}
