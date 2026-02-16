const READER_ENDPOINT = 'https://reader.demin.dev/api/render';
const STORAGE_PREFIX = 'render:';
const STORAGE_TTL_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 10;
const processingTabs = new Set();

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.id) {
      throw new Error('No active tab id');
    }

    await captureRenderAndShow(tab.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await openErrorTab(message);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'reader-open-link') {
    handleReaderOpenLink(message, sender)
      .then(() => sendResponse({ ok: true }))
      .catch(async (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        await openErrorTab(msg);
        sendResponse({ ok: false, error: msg });
      });
    return true;
  }

  return false;
});

async function captureRenderAndShow(tabId) {
  if (processingTabs.has(tabId)) {
    return;
  }
  processingTabs.add(tabId);
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
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

    await chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL(`viewer.html#${id}`),
    });
  } finally {
    processingTabs.delete(tabId);
  }
}

async function handleReaderOpenLink(message, sender) {
  const tabId = sender.tab && sender.tab.id;
  if (!tabId) {
    throw new Error('Cannot determine source tab');
  }
  const href = typeof message.href === 'string' ? message.href : '';
  if (!isSafeNavigationURL(href)) {
    throw new Error('Unsupported link target');
  }

  const renderedHtml = await captureViaHiddenTab(href);
  const id = crypto.randomUUID();
  const key = `${STORAGE_PREFIX}${id}`;
  await chrome.storage.local.set({
    [key]: {
      html: renderedHtml,
      createdAt: Date.now(),
    },
  });
  await cleanupOldRenders();
  await chrome.tabs.update(tabId, {
    url: chrome.runtime.getURL(`viewer.html#${id}`),
  });
}

function isSafeNavigationURL(url) {
  return url.startsWith('http://') || url.startsWith('https://');
}

async function captureViaHiddenTab(targetURL) {
  const tempTab = await chrome.tabs.create({ url: targetURL, active: false });
  const tempTabID = tempTab.id;
  if (!tempTabID) {
    throw new Error('Failed to create temporary tab');
  }

  try {
    await waitForTabComplete(tempTabID, 25000);

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tempTabID },
      func: () => ({
        url: window.location.href,
        html: '<!doctype html>\n' + document.documentElement.outerHTML,
      }),
    });

    if (!result || !result.html || !result.url) {
      throw new Error('Failed to capture target page HTML');
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
    return await response.text();
  } finally {
    try {
      await chrome.tabs.remove(tempTabID);
    } catch (_) {
      // Ignore cleanup errors.
    }
  }
}

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeoutID = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error('Timed out waiting for target page to load'));
    }, timeoutMs);

    function onUpdated(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId) {
        return;
      }
      if (changeInfo.status === 'complete') {
        clearTimeout(timeoutID);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

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
