// Chrome only - use chrome API
const browserAPI = chrome;

let creating;
let menuReadyPromise = null;

async function createContextMenus() {
  try {
    await browserAPI.contextMenus.removeAll();
  } catch (_) {
    // ignore
  }

  try {
    browserAPI.contextMenus.create({
      id: 'save-image-as-png',
      title: browserAPI.i18n.getMessage('contextMenuTitle'),
      contexts: ['image']
    });
    browserAPI.contextMenus.create({
      id: 'copy-image-as-png',
      title: browserAPI.i18n.getMessage('contextMenuCopyTitle'),
      contexts: ['image']
    });
  } catch (err) {
    throw err;
  }
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

// Ensure menus exist whenever the worker starts
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
  if (info.menuItemId === 'save-image-as-png') {
    const imageUrl = info.srcUrl;
    const pageUrl = tab?.url || info.pageUrl || '';
    if (imageUrl && isHttpLike(tab?.url)) {
      convertAndDownloadImage(imageUrl, pageUrl);
    }
  } else if (info.menuItemId === 'copy-image-as-png') {
    const imageUrl = info.srcUrl;
    if (imageUrl && isHttpLike(tab?.url)) {
      copyImageToClipboard(imageUrl, tab?.id);
    }
  }
});

browserAPI.storage.onChanged.addListener(async (changes, area) => {
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
  return true;
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
  const storage = browserAPI.storage.sync;
  const stored = await storage.get(Object.keys(defaultSettings));
  return normalizeSettings({ ...defaultSettings, ...stored });
}

function updateContextMenuTitles(fmt) {
  const fmtLabel = (fmt === 'jpeg' ? 'JPEG' : fmt === 'webp' ? 'WEBP' : 'PNG');
  const saveTitle = `${browserAPI.i18n.getMessage('contextMenuTitle') || 'Save image'} (${fmtLabel})`;
  const copyTitle = `${browserAPI.i18n.getMessage('contextMenuCopyTitle') || 'Copy image'} (${fmtLabel})`;
  const applyTitles = async () => {
    await ensureMenusReady();
    try {
      browserAPI.contextMenus.update('save-image-as-png', { title: saveTitle });
      browserAPI.contextMenus.update('copy-image-as-png', { title: copyTitle });
    } catch (err) {
      // If menus are missing, recreate and retry once
      menuReadyPromise = null;
      await ensureMenusReady();
      try {
        browserAPI.contextMenus.update('save-image-as-png', { title: saveTitle });
        browserAPI.contextMenus.update('copy-image-as-png', { title: copyTitle });
      } catch (_) {
        // give up silently
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
  updateContextMenuTitles(normalized.outputFormat);
  return normalized;
}

async function convertAndDownloadImage(imageUrl, pageUrl = '') {
  try {
    const settings = await getSettings();
    const targetTabId = await getActiveTabId();
    const response = await convertImageWithFallback(imageUrl, {
      fetchWithCredentials: !!settings.fetchWithCredentials,
      format: settings.outputFormat,
      jpegQuality: settings.jpegQuality,
      resizeMax: settings.resizeMax
    }, targetTabId);
    
    if (response.success) {
      const filename = getFilenameFromUrl(imageUrl, pageUrl, settings.outputFormat, settings.filenamePattern);
      browserAPI.downloads.download(
        {
          url: response.dataUrl,
          filename: filename,
          saveAs: !!settings.saveAsPrompt
        },
        downloadId => {
          const dlErr = browserAPI.runtime.lastError;
          if (dlErr) {
            if (settings.toastEnabled) {
              const isCancelled = dlErr.message && (
                dlErr.message.includes('USER_CANCELLED') || 
                dlErr.message.includes('USER_Cancelled') ||
                dlErr.message.includes('canceled')
              );
              const message = isCancelled
                ? (browserAPI.i18n.getMessage('saveCancelledToast') || 'Save cancelled')
                : (browserAPI.i18n.getMessage('saveErrorToast') || dlErr.message || 'Download failed.');
              sendToastToActive(false, message);
            }
            return;
          }
          if (!settings.toastEnabled || !downloadId) return;

          const onChanged = delta => {
            if (delta.id !== downloadId) return;
            if (delta.state && delta.state.current === 'complete') {
              sendToastToActive(true, browserAPI.i18n.getMessage('saveSuccessToast') || 'Saved.', settings);
              browserAPI.downloads.onChanged.removeListener(onChanged);
            } else if (delta.error && delta.error.current) {
              const errorCode = delta.error.current;
              const isCancelled = errorCode === 'USER_CANCELLED' || errorCode === 'USER_Cancelled';
              const message = isCancelled
                ? (browserAPI.i18n.getMessage('saveCancelledToast') || 'Save cancelled')
                : (browserAPI.i18n.getMessage('saveErrorToast') || errorCode || 'Download failed.');
              sendToastToActive(false, message, settings);
              browserAPI.downloads.onChanged.removeListener(onChanged);
            }
          };
          browserAPI.downloads.onChanged.addListener(onChanged);
        }
      );
    } else {
      const errorMsg = response.error || 'Conversion failed';
      sendToastToActive(false, browserAPI.i18n.getMessage('saveErrorToast') || errorMsg, settings);
    }
  } catch (error) {
    const settings = await getSettings();
    sendToastToActive(false, browserAPI.i18n.getMessage('saveErrorToast') || error.message || 'Download failed.', settings);
  }
}

async function copyImageToClipboard(imageUrl, tabId) {
  try {
    const settings = await getSettings();
    const convertResponse = await convertImageWithFallback(
      imageUrl,
      {
        fetchWithCredentials: !!settings.fetchWithCredentials,
        format: settings.outputFormat,
        jpegQuality: settings.jpegQuality,
        resizeMax: settings.resizeMax
      },
      tabId
    );

    if (!convertResponse?.success || !convertResponse.dataUrl) {
      sendToastToActive(false, browserAPI.i18n.getMessage('copyErrorToast') || convertResponse?.error || 'Copy failed.', settings);
      return;
    }

    const targetTabId = tabId ?? (await getActiveTabId());
    if (!targetTabId) {
      sendToastToActive(false, browserAPI.i18n.getMessage('copyErrorToast') || 'No active tab available.', settings);
      return;
    }

    try {
      await ensureContentScript(targetTabId);
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      // Content script may already be loaded
    }

    browserAPI.tabs.sendMessage(
      targetTabId,
      {
        type: 'COPY_IMAGE_DATA',
        dataUrl: convertResponse.dataUrl,
        format: settings.outputFormat,
        options: {
          toastEnabled: !!settings.toastEnabled,
          toastDurationMs: settings.toastDurationMs,
          focusWaitMs: settings.focusWaitMs,
        }
      },
      response => {
        const err = browserAPI.runtime.lastError;
        if (err) {
          sendToastToActive(false, `${browserAPI.i18n.getMessage('copyErrorToast') || 'Copy failed'}: ${err.message}`, settings);
          return;
        }
        if (!response || !response.success) {
          const errorMsg = response?.error || 'Copy failed';
          const baseMsg = browserAPI.i18n.getMessage('copyErrorToast') || 'Copy failed';
          const fullMsg = errorMsg && errorMsg !== 'Copy failed' 
            ? `${baseMsg}: ${errorMsg}` 
            : baseMsg;
          sendToastToActive(false, fullMsg, settings);
        }
      }
    );
  } catch (error) {
    const settings = await getSettings();
    sendToastToActive(false, browserAPI.i18n.getMessage('copyErrorToast') || error.message || 'Copy failed.', settings);
  }
}

async function getActiveTabId() {
  const [activeTab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
  return activeTab?.id;
}

async function convertImageWithFallback(imageUrl, opts, tabId) {
  // Check if offscreen API is available
  const hasOffscreen = browserAPI.offscreen && typeof browserAPI.offscreen.createDocument === 'function';
  
  let offscreenResult;
  if (hasOffscreen) {
    try {
      // Add timeout to offscreen conversion (3 seconds)
      offscreenResult = await Promise.race([
        convertImageUniversal(imageUrl, opts),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Offscreen conversion timeout')), 3000))
      ]);
      if (offscreenResult?.success && offscreenResult?.dataUrl) {
        return offscreenResult;
      }
    } catch (err) {
      // Offscreen failed or timed out, will try fallback
    }
  }
  
  // Fallback: Background script downloads image (no CORS), converts to Base64, then tab script does canvas conversion
  const targetTabId = tabId ?? (await getActiveTabId());
  if (!targetTabId) {
    throw new Error(offscreenResult?.error || 'No active tab available for fallback conversion');
  }
  
  try {
    // Step 1: Background script fetches image (no CORS restriction here)
    const fetchResponse = await fetch(imageUrl, {
      credentials: opts.fetchWithCredentials ? 'include' : 'omit'
    });
    if (!fetchResponse.ok) {
      throw new Error('Fetch failed: ' + fetchResponse.status);
    }
    const blob = await fetchResponse.blob();
    
    // Step 2: Convert blob to Base64 in background script (Service Worker compatible)
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    let binaryParts = [];
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binaryParts.push(String.fromCharCode.apply(null, Array.from(chunk)));
    }
    const binary = binaryParts.join('');
    const base64 = btoa(binary);
    const mimeType = blob.type || 'image/png';
    const base64DataUrl = `data:${mimeType};base64,${base64}`;
    
    // Step 3: Send Base64 to tab script for canvas conversion (no CORS issue with Base64)
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
          ctx.drawImage(img, 0, 0, w, h);
          const mime = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const dataUrl = canvas.toDataURL(mime, options.format === 'jpeg' ? options.jpegQuality : undefined);
          return { success: true, dataUrl };
        } catch (e) {
          return { success: false, error: e.message || 'Fallback conversion failed' };
        }
      },
      args: [base64DataUrl, opts]
    });
    if (result?.result?.success) return result.result;
    throw new Error(result?.result?.error || offscreenResult?.error || 'Conversion failed');
  } catch (fallbackErr) {
    throw new Error(fallbackErr.message || offscreenResult?.error || 'Both offscreen and fallback conversion failed');
  }
}

async function ensureContentScript(tabId) {
  if (!tabId) return;
  try {
    await browserAPI.scripting.executeScript({
      target: { tabId },
      files: ['copy-helper.js']
    });
    await new Promise(resolve => setTimeout(resolve, 50));
  } catch (err) {
    // Content script may already be loaded via manifest
  }
}


function isHttpLike(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

async function convertImageUniversal(imageUrl, opts = {}) {
  await setupOffscreenDocument();
  return await browserAPI.runtime.sendMessage({
    type: 'CONVERT_IMAGE',
    imageUrl: imageUrl,
    fetchWithCredentials: opts.fetchWithCredentials,
    format: opts.format,
    jpegQuality: opts.jpegQuality,
    resizeMax: opts.resizeMax
  });
}

async function setupOffscreenDocument() {
  if (!browserAPI.offscreen) {
    return;
  }
  
  if (await browserAPI.offscreen.hasDocument()) {
    return;
  }
  
  if (creating) {
    await creating;
  } else {
    creating = browserAPI.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['BLOBS'],
      justification: 'Convert images to PNG format using Canvas API'
    });
    
    await creating;
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
        const imageUrlObj = new URL(imageUrl);
        if (pageUrlObj.hostname !== imageUrlObj.hostname || pageUrl !== imageUrl) {
          siteUrl = pageUrl;
        }
      } catch (e) {
        siteUrl = imageUrl;
      }
    }
    
    if (!siteUrl) {
      siteUrl = imageUrl;
    }

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
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const timeStr = `${hh}-${mi}-${ss}`;

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

    if (!filename.endsWith(`.${ext}`)) {
      filename += `.${ext}`;
    }
    
    return filename;
  } catch (error) {
    // Error parsing URL
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
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) {
    return parts[0];
  }
  return parts[parts.length - 2];
}

function sendToastToActive(success, message, options) {
  browserAPI.tabs.query({ active: true, currentWindow: true }, tabs => {
    const activeId = tabs?.[0]?.id;
    const activeUrl = tabs?.[0]?.url;
    if (!activeId || !isHttpLike(activeUrl)) return;
    browserAPI.tabs.sendMessage(activeId, {
      type: 'SHOW_TOAST',
      success,
      message,
      options: options ? {
        toastEnabled: options.toastEnabled,
        toastDurationMs: options.toastDurationMs,
        focusWaitMs: options.focusWaitMs,
      } : undefined
    }, () => {
      const err = browserAPI.runtime.lastError;
      if (err) {
        return;
      }
    });
  });
}
