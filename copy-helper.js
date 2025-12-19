chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COPY_IMAGE_DATA' && message.dataUrl) {
    const opts = normalizeOptions(message.options);
    writeDataUrlToClipboard(message.dataUrl, opts)
      .then(() => {
        if (opts.toastEnabled) {
          showToast(t('copySuccessToast', 'PNG copied'), false, opts.toastDurationMs);
        }
        sendResponse({ success: true });
      })
      .catch(err => {
        console.error('[SIC] Copy (content) failed:', err);
        if (opts.toastEnabled) {
          showToast(t('copyErrorToast', 'Copy failed'), true, opts.toastDurationMs);
        }
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
  if (message.type === 'SHOW_TOAST') {
    const opts = normalizeOptions(message.options);
    if (opts.toastEnabled) {
      const text = message.message || t('copySuccessToast', 'Saved.');
      showToast(text, !message.success, opts.toastDurationMs);
    }
    sendResponse({ ok: true });
    return true;
  }
});

async function writeDataUrlToClipboard(dataUrl, opts) {
  await ensureDocumentFocus(opts.focusWaitMs);
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
    throw new Error('Clipboard API not available');
  }
  const blob = dataUrlToBlob(dataUrl);
  const pngBlob = (blob.type && blob.type !== 'image/png') ? await convertBlobToPng(blob) : blob;
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
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
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), durationMs);
}

function t(key, fallback) {
  if (chrome?.i18n && typeof chrome.i18n.getMessage === 'function') {
    const msg = chrome.i18n.getMessage(key);
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

async function convertBlobToPng(blob) {
  const bmp = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0);
  const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
  bmp.close();
  return pngBlob;
}


