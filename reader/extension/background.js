const READER_ENDPOINT = 'https://reader.demin.dev/api/render';
const processingTabs = new Set();

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.id) {
      throw new Error('No active tab id');
    }
    await captureRenderAndOpen(tab.id);
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

async function captureRenderAndOpen(tabId) {
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

    const shareURL = await renderToShareURL(result.html, result.url);
    await chrome.tabs.update(tabId, { url: shareURL });
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

  const shareURL = await captureViaHiddenTab(href);
  await chrome.tabs.update(tabId, { url: shareURL });
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

    return await renderToShareURL(result.html, result.url);
  } finally {
    try {
      await chrome.tabs.remove(tempTabID);
    } catch (_) {
      // Ignore cleanup errors.
    }
  }
}

async function renderToShareURL(html, baseURL) {
  const response = await fetch(`${READER_ENDPOINT}?base_url=${encodeURIComponent(baseURL)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: html,
  });

  if (!response.ok) {
    throw new Error(`Reader API returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || typeof payload.url !== 'string' || payload.url.length === 0) {
    throw new Error('Reader API returned invalid response');
  }

  return payload.url;
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

function isSafeNavigationURL(url) {
  return url.startsWith('http://') || url.startsWith('https://');
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
