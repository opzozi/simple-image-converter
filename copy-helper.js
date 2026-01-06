(function() {
'use strict';

const browserAPI = chrome;

if (window.__SIC_COPY_HELPER_LOADED) {
  return;
}
window.__SIC_COPY_HELPER_LOADED = true;

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ pong: true });
    return true;
  }
  if (message.type === 'COPY_IMAGE_DATA' && message.dataUrl) {
    const opts = normalizeOptions(message.options);
    const format = message.format || 'png';
    
    writeDataUrlToClipboard(message.dataUrl, format, opts)
      .then(() => {
        if (opts.toastEnabled) {
          const formatLabel = format === 'jpeg' ? 'JPEG' : 'PNG';
          showToast(t('copySuccessToast', `${formatLabel} copied`), false, opts.toastDurationMs);
        }
        if (sendResponse) {
          sendResponse({ success: true });
        }
      })
      .catch(err => {
        let errorMsg = err.message || 'Unknown error';
        if (err.name) {
          errorMsg = `${err.name}: ${errorMsg}`;
        }
        if (opts.toastEnabled) {
          const baseMsg = t('copyErrorToast', 'Copy failed');
          const fullMsg = errorMsg && errorMsg !== 'Unknown error' 
            ? `${baseMsg}: ${errorMsg}` 
            : baseMsg;
          showToast(fullMsg, true, Math.max(opts.toastDurationMs, 3000));
        }
        if (sendResponse) {
          sendResponse({ success: false, error: errorMsg });
        }
      });
    return true;
  }
  if (message.type === 'SHOW_TOAST') {
    const opts = normalizeOptions(message.options);
    if (opts.toastEnabled) {
      const text = message.message || t('copySuccessToast', 'Saved.');
      showToast(text, !message.success, opts.toastDurationMs);
    }
    if (sendResponse) {
      sendResponse({ ok: true });
    }
    return true;
  }
  return false;
});

async function writeDataUrlToClipboard(dataUrl, format, opts) {
  await ensureDocumentFocus(opts.focusWaitMs);
  
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
    throw new Error('Clipboard API not available');
  }
  
  try {
    const blob = dataUrlToBlob(dataUrl);
    const targetFormat = format === 'jpeg' ? 'jpeg' : 'png';
    const targetMime = targetFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    
    let finalBlob = blob;
    if (blob.type !== targetMime) {
      finalBlob = await convertBlobToFormat(blob, targetFormat);
    }
    
    if (!finalBlob || finalBlob.size === 0) {
      throw new Error('Invalid blob data');
    }
    
    const clipboardItem = new ClipboardItem({ [targetMime]: finalBlob });
    await navigator.clipboard.write([clipboardItem]);
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
      throw new Error('Permission denied - try clicking on the page first');
    } else if (err.name === 'DataError' || err.message?.includes('data')) {
      throw new Error('Invalid image data');
    } else if (err.name === 'TypeError' && err.message?.includes('ClipboardItem')) {
      throw new Error('ClipboardItem not supported - browser may be outdated');
    } else {
      throw new Error(err.message || 'Clipboard write failed');
    }
  }
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) {
    throw new Error('Invalid data URL');
  }
  const byteString = atob(parts[1]);
  const mimeMatch = parts[0].match(/data:([^;]+);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';

  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

async function ensureDocumentFocus(waitMs) {
  if (!document.hasFocus()) {
    window.focus();
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
}

function showToast(text, isError, durationMs) {
  const existing = document.getElementById('sic-toast');
  if (existing) {
    existing.remove();
  }
  const toast = document.createElement('div');
  toast.id = 'sic-toast';
  toast.textContent = text;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.zIndex = '2147483647';
  toast.style.padding = '10px 14px';
  toast.style.borderRadius = '6px';
  toast.style.background = isError ? '#c0392b' : '#2d8a34';
  toast.style.color = '#fff';
  toast.style.fontSize = '13px';
  toast.style.boxShadow = '0 4px 10px rgba(0,0,0,0.18)';
  toast.style.fontFamily = 'Arial, sans-serif';
  toast.style.maxWidth = '400px';
  toast.style.wordWrap = 'break-word';
  toast.style.whiteSpace = 'normal';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), durationMs);
}

function t(key, fallback) {
  if (browserAPI?.i18n && typeof browserAPI.i18n.getMessage === 'function') {
    const msg = browserAPI.i18n.getMessage(key);
    if (msg) return msg;
  }
  return fallback;
}

function normalizeOptions(raw = {}) {
  const defaults = {
    toastEnabled: true,
    toastDurationMs: 2000,
    focusWaitMs: 50,
  };
  return {
    toastEnabled: raw.toastEnabled ?? defaults.toastEnabled,
    toastDurationMs: clamp(raw.toastDurationMs, 500, 10000) ?? defaults.toastDurationMs,
    focusWaitMs: clamp(raw.focusWaitMs, 0, 500) ?? defaults.focusWaitMs,
  };
}

function clamp(val, min, max) {
  if (typeof val !== 'number' || Number.isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

async function convertBlobToFormat(blob, format) {
  const targetMime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const bmp = await createImageBitmap(blob);
  
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    const convertedBlob = await canvas.convertToBlob({ 
      type: targetMime,
      quality: format === 'jpeg' ? 0.92 : undefined
    });
    bmp.close();
    return convertedBlob;
  } else {
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          bmp.close();
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert blob'));
          }
        },
        targetMime,
        format === 'jpeg' ? 0.92 : undefined
      );
    });
  }
}

})();
