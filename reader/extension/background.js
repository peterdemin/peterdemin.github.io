const READER_ENDPOINT = 'https://reader.demin.dev/api/render';
const STORAGE_PREFIX = 'render:';
const STORAGE_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 10;

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.id) {
      throw new Error('No active tab id');
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        url: window.location.href,
        html: '<!doctype html>\n' + document.documentElement.outerHTML,
      }),
    });

    if (!result || !result.html || !result.url) {
      throw new Error('Failed to capture page HTML');
    }

    const response = await fetch(
      `${READER_ENDPOINT}?base_url=${encodeURIComponent(result.url)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
        body: result.html,
      }
    );

    if (!response.ok) {
      throw new Error(`Reader API returned HTTP ${response.status}`);
    }

    const renderedHtml = await response.text();
    const id = crypto.randomUUID();
    const key = `${STORAGE_PREFIX}${id}`;

    await chrome.storage.local.set({
      [key]: {
        html: renderedHtml,
        createdAt: Date.now(),
      },
    });

    await cleanupOldRenders();

    await chrome.tabs.create({
      url: chrome.runtime.getURL(`viewer.html#${id}`),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await openErrorTab(message);
  }
});

async function cleanupOldRenders() {
  const all = await chrome.storage.local.get(null);
  const now = Date.now();

  const renderEntries = Object.entries(all)
    .filter(([key, value]) => key.startsWith(STORAGE_PREFIX) && value && typeof value === 'object')
    .map(([key, value]) => ({
      key,
      createdAt: Number(value.createdAt) || 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  const toDelete = [];

  for (const entry of renderEntries) {
    if (now - entry.createdAt > STORAGE_TTL_MS) {
      toDelete.push(entry.key);
    }
  }

  for (let i = MAX_ENTRIES; i < renderEntries.length; i += 1) {
    toDelete.push(renderEntries[i].key);
  }

  if (toDelete.length > 0) {
    await chrome.storage.local.remove([...new Set(toDelete)]);
  }
}

async function openErrorTab(message) {
  const escaped = escapeHTML(message);
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Reader Error</title>
<style>
body { margin: 0; padding: 24px; font: 16px/1.5 -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; background: #002b36; color: #eee8d5; }
h1 { margin: 0 0 12px; font-size: 20px; }
p { margin: 0; color: #93a1a1; white-space: pre-wrap; }
</style></head>
<body><h1>Reader failed</h1><p>${escaped}</p></body></html>`;

  const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  await chrome.tabs.create({ url });
}

function escapeHTML(input) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
