let creating;

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();
  
  chrome.contextMenus.create({
    id: 'save-image-as-png',
    title: chrome.i18n.getMessage('contextMenuTitle'),
    contexts: ['image']
  });
  chrome.contextMenus.create({
    id: 'copy-image-as-png',
    title: chrome.i18n.getMessage('contextMenuCopyTitle'),
    contexts: ['image']
  });
  getSettings().then(s => updateContextMenuTitles(s.outputFormat));
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
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

chrome.runtime.onStartup?.addListener(async () => {
  try {
    await chrome.contextMenus.removeAll();
    chrome.contextMenus.create({
      id: 'save-image-as-png',
      title: chrome.i18n.getMessage('contextMenuTitle'),
      contexts: ['image']
    });
    chrome.contextMenus.create({
      id: 'copy-image-as-png',
      title: chrome.i18n.getMessage('contextMenuCopyTitle'),
      contexts: ['image']
    });
  } catch (err) {
    // Ignore if menu items already exist
  }
  const settings = await getSettings();
  updateContextMenuTitles(settings.outputFormat);
});

chrome.storage.onChanged.addListener(async (changes, area) => {
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
  const stored = await chrome.storage.sync.get(Object.keys(defaultSettings));
  return normalizeSettings({ ...defaultSettings, ...stored });
}

function updateContextMenuTitles(fmt) {
  const fmtLabel = (fmt === 'jpeg' ? 'JPEG' : fmt === 'webp' ? 'WEBP' : 'PNG');
  const saveTitle = `${chrome.i18n.getMessage('contextMenuTitle') || 'Save image'} (${fmtLabel})`;
  const copyTitle = `${chrome.i18n.getMessage('contextMenuCopyTitle') || 'Copy image'} (${fmtLabel})`;
  try {
    chrome.contextMenus.update('save-image-as-png', { title: saveTitle });
    chrome.contextMenus.update('copy-image-as-png', { title: copyTitle });
  } catch (err) {
    console.warn('[SIC] Could not update context menu titles:', err);
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
    await setupOffscreenDocument();
    
    const response = await chrome.runtime.sendMessage({
      type: 'CONVERT_IMAGE',
      imageUrl: imageUrl,
      fetchWithCredentials: !!settings.fetchWithCredentials,
      format: settings.outputFormat,
      jpegQuality: settings.jpegQuality,
      resizeMax: settings.resizeMax
    });
    
    if (response.success) {
      const filename = getFilenameFromUrl(imageUrl, pageUrl, settings.outputFormat, settings.filenamePattern);
      chrome.downloads.download(
        {
          url: response.dataUrl,
          filename: filename,
          saveAs: !!settings.saveAsPrompt
        },
        downloadId => {
          const dlErr = chrome.runtime.lastError;
          if (dlErr) {
            if (settings.toastEnabled) {
              const isCancelled = dlErr.message && (
                dlErr.message.includes('USER_CANCELLED') || 
                dlErr.message.includes('USER_Cancelled') ||
                dlErr.message.includes('canceled')
              );
              const message = isCancelled
                ? (chrome.i18n.getMessage('saveCancelledToast') || 'Save cancelled')
                : (chrome.i18n.getMessage('saveErrorToast') || dlErr.message || 'Download failed.');
              sendToastToActive(false, message);
            }
            return;
          }
          if (!settings.toastEnabled || !downloadId) return;

          const onChanged = delta => {
            if (delta.id !== downloadId) return;
            if (delta.state && delta.state.current === 'complete') {
              sendToastToActive(true, chrome.i18n.getMessage('saveSuccessToast') || 'Saved.', settings);
              chrome.downloads.onChanged.removeListener(onChanged);
            } else if (delta.error && delta.error.current) {
              const errorCode = delta.error.current;
              const isCancelled = errorCode === 'USER_CANCELLED' || errorCode === 'USER_Cancelled';
              const message = isCancelled
                ? (chrome.i18n.getMessage('saveCancelledToast') || 'Save cancelled')
                : (chrome.i18n.getMessage('saveErrorToast') || errorCode || 'Download failed.');
              sendToastToActive(false, message, settings);
              chrome.downloads.onChanged.removeListener(onChanged);
            }
          };
          chrome.downloads.onChanged.addListener(onChanged);
        }
      );
    } else {
      console.error('Image conversion failed:', response.error);
    }
  } catch (error) {
    console.error('Error in convertAndDownloadImage:', error);
  }
}

async function copyImageToClipboard(imageUrl, tabId) {
  try {
    const settings = await getSettings();
    await setupOffscreenDocument();

    const convertResponse = await chrome.runtime.sendMessage({
      type: 'CONVERT_IMAGE',
      imageUrl,
      fetchWithCredentials: !!settings.fetchWithCredentials,
      format: settings.outputFormat,
      jpegQuality: settings.jpegQuality,
      resizeMax: settings.resizeMax
    });

    if (!convertResponse?.success || !convertResponse.dataUrl) {
      console.error('[SIC] Copy failed: conversion error', convertResponse?.error);
      return;
    }

    const targetTabId = tabId ?? (await getActiveTabId());
    if (!targetTabId) {
      console.error('[SIC] Copy failed: no target tab available');
      return;
    }

    await ensureContentScript(targetTabId);

    chrome.tabs.sendMessage(
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
        const err = chrome.runtime.lastError;
        if (err) {
          console.error('[SIC] Copy failed (tabs.sendMessage):', err.message || err);
          return;
        }
        if (!response || !response.success) {
          console.error('[SIC] Copy failed:', response?.error || 'unknown error');
        }
      }
    );
  } catch (error) {
    console.error('[SIC] Error in copyImageToClipboard:', error);
  }
}

async function getActiveTabId() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return activeTab?.id;
}

async function ensureContentScript(tabId) {
  if (!tabId) return;
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['copy-helper.js']
  }).catch(err => {
    console.warn('[SIC] Unable to inject content script:', err?.message || err);
  });
}

function isHttpLike(url) {
  return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

async function setupOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) {
    return;
  }
  
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
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
    console.error('Error parsing URL:', error);
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
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const activeId = tabs?.[0]?.id;
    const activeUrl = tabs?.[0]?.url;
    if (!activeId || !isHttpLike(activeUrl)) return;
    chrome.tabs.sendMessage(activeId, {
      type: 'SHOW_TOAST',
      success,
      message,
      options: options ? {
        toastEnabled: options.toastEnabled,
        toastDurationMs: options.toastDurationMs,
        focusWaitMs: options.focusWaitMs,
      } : undefined
    }, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        return;
      }
    });
  });
}
