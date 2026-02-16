(async function loadRenderedHTML() {
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

  document.open();
  document.write(payload.html);
  document.close();
})();

function renderError(message) {
  document.body.innerHTML = `<p>${escapeHTML(message)}</p>`;
}

function escapeHTML(input) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
