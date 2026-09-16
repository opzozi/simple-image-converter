const browserAPI = chrome;

let creating;
let menuReadyPromise = null;
let badgeTimer = null;

async function createContextMenus() {
  try {
    await browserAPI.contextMenus.removeAll();
  } catch (_) {
    // ignore
  }

  return new Promise((resolve) => {
    let created = 0;
    const checkComplete = () => {
      created++;
      if (created === 2) resolve();
    };

    browserAPI.contextMenus.create({
      id: 'save-image-as-png',
      title: browserAPI.i18n.getMessage('contextMenuTitle'),
      contexts: ['image']
    }, () => {
      void browserAPI.runtime.lastError;
      checkComplete();
    });

    browserAPI.contextMenus.create({
      id: 'copy-image-as-png',
      title: browserAPI.i18n.getMessage('contextMenuCopyTitle'),
      contexts: ['image']
    }, () => {
      void browserAPI.runtime.lastError;
      checkComplete();
    });
  });
}

async function ensureMenusReady() {
  if (!menuReadyPromise) {
    menuReadyPromise = createContextMenus().catch(err => {
      menuReadyPromise = null;
      throw err;
    });
  }
  return menuReadyPromise;
}

ensureMenusReady();

browserAPI.runtime.onInstalled.addListener(async () => {
  menuReadyPromise = null;
  await ensureMenusReady();
});

browserAPI.runtime.onStartup?.addListener(async () => {
  menuReadyPromise = null;
  await ensureMenusReady();
  const settings = await getSettings();
  updateContextMenuTitles(settings.outputFormat);
});

browserAPI.contextMenus.onClicked.addListener((info, tab) => {
  const imageUrl = info.srcUrl;
  const pageUrl = tab?.url || info.pageUrl || '';
  if (!imageUrl) return;
  if (info.menuItemId === 'save-image-as-png') {
    convertAndDownloadImage(imageUrl, pageUrl, tab);
  } else if (info.menuItemId === 'copy-image-as-png') {
    copyImageToClipboard(imageUrl, tab);
  }
});

browserAPI.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' && area !== 'local') return;
  if (changes.outputFormat) {
    updateContextMenuTitles(changes.outputFormat.newValue);
  }
});

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FORMAT_CHANGED') {
    updateContextMenuTitles(message.format);
    sendResponse({ success: true });
  }
  return false;
});

const defaultSettings = {
  toastEnabled: true,
  toastDurationMs: 2000,
  focusWaitMs: 50,
  saveAsPrompt: true,
  fetchWithCredentials: true,
  outputFormat: 'png',
  jpegQuality: 0.9,
  resizeMax: 0,
  filenamePattern: '{siteShort}-{name}-{date}-{time}.{ext}',
};

async function getSettings() {
  const stored = await browserAPI.storage.sync.get(Object.keys(defaultSettings));
  return normalizeSettings({ ...defaultSettings, ...stored });
}

function updateContextMenuTitles(fmt) {
  const fmtLabel = fmt === 'jpeg' ? 'JPEG' : 'PNG';
  const saveTitle = `${browserAPI.i18n.getMessage('contextMenuTitle') || 'Save image'} (${fmtLabel})`;
  const copyTitle = `${browserAPI.i18n.getMessage('contextMenuCopyTitle') || 'Copy image'} (${fmtLabel})`;
  const applyTitles = async () => {
    await ensureMenusReady();
    try {
      await browserAPI.contextMenus.update('save-image-as-png', { title: saveTitle });
      await browserAPI.contextMenus.update('copy-image-as-png', { title: copyTitle });
    } catch (_) {
      menuReadyPromise = null;
      await ensureMenusReady();
      try {
        await browserAPI.contextMenus.update('save-image-as-png', { title: saveTitle });
        await browserAPI.contextMenus.update('copy-image-as-png', { title: copyTitle });
      } catch (_) {
        // Menus could not be updated; they will refresh on the next worker start.
      }
    }
  };
  applyTitles();
}

function normalizeSettings(raw) {
  const normalized = { ...raw };
  if (normalized.jpegQuality > 1) {
    normalized.jpegQuality = normalized.jpegQuality / 100;
  }
  normalized.jpegQuality = clamp(normalized.jpegQuality, 0.5, 1.0);
  normalized.outputFormat = normalized.outputFormat === 'jpeg' ? 'jpeg' : 'png';
  normalized.resizeMax = clamp(Number(normalized.resizeMax), 0, 8000);
  normalized.toastDurationMs = clamp(Number(normalized.toastDurationMs), 500, 10000);
  normalized.focusWaitMs = clamp(Number(normalized.focusWaitMs), 0, 500);
  normalized.filenamePattern = typeof normalized.filenamePattern === 'string' && normalized.filenamePattern.trim()
    ? normalized.filenamePattern
    : defaultSettings.filenamePattern;
  return normalized;
}

function tMsg(key, fallback) {
  return browserAPI.i18n.getMessage(key) || fallback;
}

async function convertAndDownloadImage(imageUrl, pageUrl = '', tab) {
  const settings = await getSettings();
  const tabInfo = tab || { id: await getActiveTabId(), url: pageUrl };
  const restrictedMsg = tMsg(
    'pageRestrictedSave',
    "Chrome protects this page, so the image couldn't be saved here."
  );

  try {
    if (!isFetchableImageUrl(imageUrl) && isRestrictedPage(pageUrl)) {
      notifyUser(false, restrictedMsg, settings, tabInfo);
      return;
    }

    const response = await convertImageWithFallback(imageUrl, {
      fetchWithCredentials: !!settings.fetchWithCredentials,
      format: settings.outputFormat,
      jpegQuality: settings.jpegQuality,
      resizeMax: settings.resizeMax
    }, tabInfo.id, pageUrl);

    if (!response.success) {
      notifyUser(false, isRestrictedPage(pageUrl) ? restrictedMsg : (tMsg('saveErrorToast', 'Save failed')), settings, tabInfo);
      return;
    }

    const filename = getFilenameFromUrl(imageUrl, pageUrl, settings.outputFormat, settings.filenamePattern);
    browserAPI.downloads.download(
      {
        url: response.dataUrl,
        filename,
        saveAs: !!settings.saveAsPrompt
      },
      downloadId => {
        const dlErr = browserAPI.runtime.lastError;
        if (dlErr) {
          const isCancelled = dlErr.message && /cancel/i.test(dlErr.message);
          const message = isCancelled
            ? tMsg('saveCancelledToast', 'Save cancelled')
            : (tMsg('saveErrorToast', 'Save failed') || dlErr.message);
          notifyUser(false, message, settings, tabInfo);
          return;
        }
        if (!downloadId) return;

        const onChanged = delta => {
          if (delta.id !== downloadId) return;
          if (delta.state && delta.state.current === 'complete') {
            notifyUser(true, tMsg('saveSuccessToast', 'Saved.'), settings, tabInfo);
            browserAPI.downloads.onChanged.removeListener(onChanged);
          } else if (delta.error && delta.error.current) {
            const errorCode = delta.error.current;
            const isCancelled = errorCode === 'USER_CANCELLED' || errorCode === 'USER_Cancelled';
            const message = isCancelled
              ? tMsg('saveCancelledToast', 'Save cancelled')
              : (tMsg('saveErrorToast', 'Save failed') || errorCode);
            notifyUser(false, message, settings, tabInfo);
            browserAPI.downloads.onChanged.removeListener(onChanged);
          }
        };
        browserAPI.downloads.onChanged.addListener(onChanged);
      }
    );
  } catch (error) {
    notifyUser(
      false,
      isRestrictedPage(pageUrl) ? restrictedMsg : (tMsg('saveErrorToast', 'Save failed') || error.message),
      settings,
      tabInfo
    );
  }
}

async function copyImageToClipboard(imageUrl, tab) {
  const settings = await getSettings();
  const tabId = tab?.id ?? (await getActiveTabId());
  const tabUrl = tab?.url || (await getTabUrl(tabId));
  const tabInfo = { id: tabId, url: tabUrl };
  const restrictedMsg = tMsg(
    'pageRestrictedCopy',
    "Chrome doesn't allow copying on this page. Use Save, or try a regular website."
  );

  try {
    if (!isFetchableImageUrl(imageUrl) && isRestrictedPage(tabUrl)) {
      notifyUser(false, restrictedMsg, settings, tabInfo);
      return;
    }

    const convertResponse = await convertImageWithFallback(
      imageUrl,
      {
        fetchWithCredentials: !!settings.fetchWithCredentials,
        format: settings.outputFormat,
        jpegQuality: settings.jpegQuality,
        resizeMax: settings.resizeMax
      },
      tabId,
      tabUrl
    );

    if (!convertResponse?.success || !convertResponse.dataUrl) {
      notifyUser(false, isRestrictedPage(tabUrl) ? restrictedMsg : tMsg('copyErrorToast', 'Copy failed.'), settings, tabInfo);
      return;
    }

    if (await canUseContentScript(tabId, tabUrl)) {
      const response = await tabsSendMessage(tabId, {
        type: 'COPY_IMAGE_DATA',
        dataUrl: convertResponse.dataUrl,
        format: settings.outputFormat,
        options: {
          toastEnabled: !!settings.toastEnabled,
          toastDurationMs: settings.toastDurationMs,
          focusWaitMs: settings.focusWaitMs,
        }
      });
      if (response?.success) return;
      if (response && !response.success) {
        const errorMsg = response.error || 'Copy failed';
        const baseMsg = tMsg('copyErrorToast', 'Copy failed');
        notifyUser(false, errorMsg !== 'Copy failed' ? `${baseMsg}: ${errorMsg}` : baseMsg, settings, tabInfo);
        return;
      }
    }

    try {
      await copyViaOffscreen(convertResponse.dataUrl, settings.outputFormat);
      notifyUser(true, tMsg('copySuccessToast', 'Image copied'), settings, tabInfo);
    } catch (_) {
      notifyUser(false, restrictedMsg, settings, tabInfo);
    }
  } catch (error) {
    notifyUser(
      false,
      isRestrictedPage(tabUrl) ? restrictedMsg : (tMsg('copyErrorToast', 'Copy failed.') || error.message),
      settings,
      tabInfo
    );
  }
}

async function getActiveTabId() {
  const [activeTab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
  return activeTab?.id;
}

async function getTabUrl(tabId) {
  if (!tabId) return '';
  try {
    const tab = await browserAPI.tabs.get(tabId);
    return tab?.url || '';
  } catch (_) {
    return '';
  }
}

function blobToDataUrl(blob) {
  return blob.arrayBuffer().then(arrayBuffer => {
    const uint8Array = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    const binaryParts = [];
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binaryParts.push(String.fromCharCode.apply(null, Array.from(chunk)));
    }
    const mimeType = blob.type || 'image/png';
    return `data:${mimeType};base64,${btoa(binaryParts.join(''))}`;
  });
}

async function convertImageWithFallback(imageUrl, opts, tabId, tabUrl) {
  const hasOffscreen = browserAPI.offscreen && typeof browserAPI.offscreen.createDocument === 'function';
  let offscreenResult;

  if (hasOffscreen) {
    try {
      offscreenResult = await Promise.race([
        convertImageUniversal(imageUrl, opts),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Offscreen conversion timeout')), 10000))
      ]);
      if (offscreenResult?.success && offscreenResult?.dataUrl) {
        return offscreenResult;
      }
    } catch (_) {
      // Continue with the in-tab fallback on pages that allow scripts.
    }
  }

  const targetTabId = tabId ?? (await getActiveTabId());
  const targetTabUrl = tabUrl || (await getTabUrl(targetTabId));
  if (!targetTabId || !canInjectIntoTab(targetTabUrl)) {
    throw new Error(offscreenResult?.error || 'Conversion failed');
  }

  try {
    const fetchResponse = await fetch(imageUrl, {
      credentials: opts.fetchWithCredentials ? 'include' : 'omit'
    });
    if (!fetchResponse.ok) {
      throw new Error('Fetch failed: ' + fetchResponse.status);
    }
    const blob = await fetchResponse.blob();
    const base64DataUrl = await blobToDataUrl(blob);

    const [result] = await browserAPI.scripting.executeScript({
      target: { tabId: targetTabId },
      func: async (base64Url, options) => {
        try {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = base64Url;
          });

          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (options.resizeMax && options.resizeMax > 0 && (w > options.resizeMax || h > options.resizeMax)) {
            const scale = Math.min(options.resizeMax / w, options.resizeMax / h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (options.format === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
          }
          ctx.drawImage(img, 0, 0, w, h);
          const mime = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
          return {
            success: true,
            dataUrl: canvas.toDataURL(mime, options.format === 'jpeg' ? options.jpegQuality : undefined)
          };
        } catch (e) {
          return { success: false, error: e.message || 'Fallback conversion failed' };
        }
      },
      args: [base64DataUrl, opts]
    });
    if (result?.result?.success) return result.result;
    throw new Error(result?.result?.error || offscreenResult?.error || 'Conversion failed');
  } catch (fallbackErr) {
    throw new Error(fallbackErr.message || offscreenResult?.error || 'Conversion failed');
  }
}

function tabsSendMessage(tabId, message) {
  return new Promise(resolve => {
    try {
      browserAPI.tabs.sendMessage(tabId, message, response => {
        if (browserAPI.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response || null);
      });
    } catch (_) {
      resolve(null);
    }
  });
}

async function ensureContentScript(tabId, tabUrl) {
  if (!tabId || !canInjectIntoTab(tabUrl)) return false;
  try {
    await browserAPI.scripting.executeScript({
      target: { tabId },
      files: ['copy-helper.js']
    });
    await new Promise(resolve => setTimeout(resolve, 50));
    return true;
  } catch (_) {
    return false;
  }
}

async function canUseContentScript(tabId, tabUrl) {
  if (!tabId || !canInjectIntoTab(tabUrl)) return false;
  const ping = await tabsSendMessage(tabId, { type: 'PING' });
  if (ping?.pong) return true;
  if (!(await ensureContentScript(tabId, tabUrl))) return false;
  const retry = await tabsSendMessage(tabId, { type: 'PING' });
  return !!retry?.pong;
}

function isHttpLike(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

function isFetchableImageUrl(url) {
  return typeof url === 'string' && (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  );
}

function isRestrictedPage(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  if (
    lower.startsWith('chrome://') ||
    lower.startsWith('chrome-extension://') ||
    lower.startsWith('chrome-search://') ||
    lower.startsWith('chrome-untrusted://') ||
    lower.startsWith('devtools://') ||
    lower.startsWith('edge://') ||
    lower.startsWith('about:') ||
    lower.startsWith('view-source:') ||
    lower.startsWith('moz-extension://')
  ) {
    return true;
  }
  if (!isHttpLike(url)) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'chrome.google.com' ||
      host === 'chromewebstore.google.com' ||
      host.endsWith('.chrome.google.com');
  } catch (_) {
    return true;
  }
}

function canInjectIntoTab(url) {
  return isHttpLike(url) && !isRestrictedPage(url);
}

async function convertImageUniversal(imageUrl, opts = {}) {
  await setupOffscreenDocument();
  return await browserAPI.runtime.sendMessage({
    type: 'CONVERT_IMAGE',
    imageUrl,
    fetchWithCredentials: opts.fetchWithCredentials,
    format: opts.format,
    jpegQuality: opts.jpegQuality,
    resizeMax: opts.resizeMax
  });
}

async function copyViaOffscreen(dataUrl, format) {
  await setupOffscreenDocument();
  return await new Promise((resolve, reject) => {
    browserAPI.runtime.sendMessage({
      type: 'COPY_DATAURL_TO_CLIPBOARD',
      dataUrl,
      format
    }, response => {
      const err = browserAPI.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      if (response?.success) {
        resolve(true);
        return;
      }
      reject(new Error(response?.error || 'Clipboard write failed'));
    });
  });
}

async function setupOffscreenDocument() {
  if (!browserAPI.offscreen) return;
  if (await browserAPI.offscreen.hasDocument()) return;
  if (creating) {
    await creating;
    return;
  }
  creating = browserAPI.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['BLOBS', 'CLIPBOARD'],
    justification: 'Convert images with Canvas and copy the result to the clipboard'
  });
  try {
    await creating;
  } finally {
    creating = null;
  }
}

function getFilenameFromUrl(imageUrl, pageUrl, fmt, pattern) {
  try {
    const imageUrlObj = new URL(imageUrl);
    const pathname = imageUrlObj.pathname;
    const parts = pathname.split('/');
    const rawName = parts[parts.length - 1] || 'image';
    let base = rawName.split('?')[0];
    base = base.replace(/\.[^.]+$/, '');
    const ext = fmt === 'jpeg' ? 'jpg' : 'png';

    let siteUrl = '';
    if (pageUrl && isHttpLike(pageUrl)) {
      try {
        const pageUrlObj = new URL(pageUrl);
        if (pageUrlObj.hostname !== imageUrlObj.hostname || pageUrl !== imageUrl) {
          siteUrl = pageUrl;
        }
      } catch (_) {
        siteUrl = imageUrl;
      }
    }

    if (!siteUrl) siteUrl = imageUrl;

    const urlObj = new URL(siteUrl);
    let hostname = urlObj.hostname || 'site';
    hostname = hostname
      .replace(/^www\./i, '')
      .replace(/^m\./i, '')
      .replace(/^cdn\./i, '')
      .replace(/^static\./i, '')
      .replace(/^media\./i, '')
      .replace(/^img\./i, '')
      .replace(/^images?\./i, '');

    const siteShort = getBaseDomain(hostname);
    const site = hostname;
    const now = new Date();
    const dateStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');
    const timeStr = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('-');

    const pat = typeof pattern === 'string' && pattern.trim()
      ? pattern
      : defaultSettings.filenamePattern;
    let filename = pat
      .replace(/\{name\}/g, base || 'image')
      .replace(/\{site\}/g, site || 'site')
      .replace(/\{siteShort\}/g, siteShort || site || 'site')
      .replace(/\{date\}/g, dateStr)
      .replace(/\{time\}/g, timeStr)
      .replace(/\{ext\}/g, ext);

    if (!filename.endsWith(`.${ext}`)) filename += `.${ext}`;
    return filename;
  } catch (_) {
    return fmt === 'jpeg' ? 'image.jpg' : 'image.png';
  }
}

function clamp(val, min, max) {
  const num = Number(val);
  if (Number.isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

function getBaseDomain(host) {
  if (!host) return '';
  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return parts[0] || '';
  const last = parts[parts.length - 1];
  const second = parts[parts.length - 2];
  if (last.length === 2 && second.length <= 3) {
    return parts[parts.length - 3] || second;
  }
  return second;
}

function notifyUser(success, message, options, tab) {
  if (options && options.toastEnabled === false) return;

  const deliver = (tabId, tabUrl) => {
    if (tabId && canInjectIntoTab(tabUrl)) {
      browserAPI.tabs.sendMessage(tabId, {
        type: 'SHOW_TOAST',
        success,
        message,
        options: {
          toastEnabled: true,
          toastDurationMs: options?.toastDurationMs,
          focusWaitMs: options?.focusWaitMs,
        }
      }, () => {
        if (browserAPI.runtime.lastError) {
          showBadgeFeedback(success, message);
        }
      });
      return;
    }
    showBadgeFeedback(success, message);
  };

  if (tab?.id) {
    deliver(tab.id, tab.url);
    return;
  }
  browserAPI.tabs.query({ active: true, currentWindow: true }, tabs => {
    deliver(tabs?.[0]?.id, tabs?.[0]?.url);
  });
}

function showBadgeFeedback(success, message) {
  const color = success ? '#2d8a34' : '#c0392b';
  try {
    browserAPI.action.setBadgeText({ text: success ? 'OK' : '!' });
    browserAPI.action.setBadgeBackgroundColor({ color });
    browserAPI.action.setTitle({ title: message });
  } catch (_) {
    return;
  }
  if (badgeTimer) clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => {
    try {
      browserAPI.action.setBadgeText({ text: '' });
      browserAPI.action.setTitle({ title: tMsg('extensionName', 'Simple Image Converter') });
    } catch (_) {}
  }, 5000);
}
