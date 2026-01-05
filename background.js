// Chrome only - use chrome API
const browserAPI = chrome;

let creating;

browserAPI.runtime.onInstalled.addListener(async () => {
  await browserAPI.contextMenus.removeAll();
  
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
  getSettings().then(s => updateContextMenuTitles(s.outputFormat));
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

browserAPI.runtime.onStartup?.addListener(async () => {
  try {
    await browserAPI.contextMenus.removeAll();
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
    // Ignore if menu items already exist
  }
  const settings = await getSettings();
  updateContextMenuTitles(settings.outputFormat);
});

browserAPI.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync' && area !== 'local') return;
  if (changes.outputFormat) {
    updateContextMenuTitles(changes.outputFormat.newValue);
  }
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
  try {
    browserAPI.contextMenus.update('save-image-as-png', { title: saveTitle });
    browserAPI.contextMenus.update('copy-image-as-png', { title: copyTitle });
  } catch (err) {
    // Could not update context menu titles
  }
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
    const response = await convertImageUniversal(imageUrl, {
      fetchWithCredentials: !!settings.fetchWithCredentials,
      format: settings.outputFormat,
      jpegQuality: settings.jpegQuality,
      resizeMax: settings.resizeMax
    });
    
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
      // Image conversion failed
    }
  } catch (error) {
    // Error in convertAndDownloadImage
  }
}

async function copyImageToClipboard(imageUrl, tabId) {
  try {
    const settings = await getSettings();
    const convertResponse = await convertImageUniversal(imageUrl, {
      fetchWithCredentials: !!settings.fetchWithCredentials,
      format: settings.outputFormat,
      jpegQuality: settings.jpegQuality,
      resizeMax: settings.resizeMax
    });

    if (!convertResponse?.success || !convertResponse.dataUrl) {
      // Copy failed: conversion error
      return;
    }

    const targetTabId = tabId ?? (await getActiveTabId());
    if (!targetTabId) {
      // Copy failed: no target tab available
      return;
    }

    await ensureContentScript(targetTabId);

    browserAPI.tabs.sendMessage(
      targetTabId,
      {
        type: 'COPY_IMAGE_DATA',
        dataUrl: convertResponse.dataUrl,
        options: {
          toastEnabled: !!settings.toastEnabled,
          toastDurationMs: settings.toastDurationMs,
          focusWaitMs: settings.focusWaitMs,
        }
      },
      response => {
        const err = browserAPI.runtime.lastError;
        if (err) {
          // Copy failed (tabs.sendMessage)
          return;
        }
        if (!response || !response.success) {
          // Copy failed
        }
      }
    );
  } catch (error) {
    // Error in copyImageToClipboard
  }
}

async function getActiveTabId() {
  const [activeTab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
  return activeTab?.id;
}

async function ensureContentScript(tabId) {
  if (!tabId) return;
  await browserAPI.scripting.executeScript({
    target: { tabId },
    files: ['copy-helper.js']
  }).catch(err => {
    // Unable to inject content script
  });
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
