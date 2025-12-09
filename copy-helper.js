// Handles image copy to clipboard in the page context (has user gesture/focus)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COPY_IMAGE_DATA' && message.dataUrl) {
    writeDataUrlToClipboard(message.dataUrl)
      .then(() => {
        showToast(t('copySuccessToast', 'PNG copied'), false);
        sendResponse({ success: true });
      })
      .catch(err => {
        console.error('[SIC] Copy (content) failed:', err);
        showToast(t('copyErrorToast', 'Copy failed'), true);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

async function writeDataUrlToClipboard(dataUrl) {
  await ensureDocumentFocus();
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
    throw new Error('Clipboard API not available');
  }
  const pngBlob = dataUrlToBlob(dataUrl);
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

async function ensureDocumentFocus() {
  if (document.hasFocus()) {
    return;
  }
  // Attempt to focus and give the event loop a tick before writing
  window.focus();
  await new Promise(resolve => setTimeout(resolve, 50));
}

function showToast(text, isError) {
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
  setTimeout(() => toast.remove(), 2000);
}

function t(key, fallback) {
  if (chrome?.i18n && typeof chrome.i18n.getMessage === 'function') {
    const msg = chrome.i18n.getMessage(key);
    if (msg) return msg;
  }
  return fallback;
}


