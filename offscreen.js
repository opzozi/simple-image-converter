const browserAPI = chrome;

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONVERT_IMAGE') {
    convertImage(message.imageUrl, {
      fetchWithCredentials: message.fetchWithCredentials,
      format: message.format,
      jpegQuality: message.jpegQuality,
      resizeMax: message.resizeMax
    })
      .then(result => {
        sendResponse({ success: true, dataUrl: result.dataUrl });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.type === 'COPY_DATAURL_TO_CLIPBOARD') {
    copyDataUrlToClipboard(message.dataUrl, message.format)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  return false;
});

function fillJpegBackground(ctx, width, height, format) {
  if (format !== 'jpeg') return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
}

async function convertImage(imageUrl, opts = {}) {
  const fetchWithCredentials = opts.fetchWithCredentials !== false;
  const format = opts.format === 'jpeg' ? 'jpeg' : 'png';
  const jpegQuality = typeof opts.jpegQuality === 'number' ? opts.jpegQuality : 0.92;
  const resizeMax = typeof opts.resizeMax === 'number' ? opts.resizeMax : 0;

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const blob = await fetchImageAsBlob(imageUrl, fetchWithCredentials);
  const img = await blobToImage(blob);

  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;
  if (resizeMax > 0 && (targetWidth > resizeMax || targetHeight > resizeMax)) {
    const scale = Math.min(resizeMax / targetWidth, resizeMax / targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  fillJpegBackground(ctx, targetWidth, targetHeight, format);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(mime, format === 'jpeg' ? jpegQuality : undefined);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return { dataUrl };
}

async function fetchImageAsBlob(imageUrl, fetchWithCredentials = true) {
  const res = await fetch(imageUrl, {
    mode: 'cors',
    credentials: fetchWithCredentials ? 'include' : 'omit'
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status}`);
  }
  return res.blob();
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image from blob'));
    };
    img.src = URL.createObjectURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) {
    throw new Error('Invalid data URL');
  }
  const byteString = atob(parts[1]);
  const mimeMatch = parts[0].match(/data:([^;]+);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ia], { type: mime });
}

async function copyDataUrlToClipboard(dataUrl, format) {
  if (!navigator.clipboard || typeof navigator.clipboard.write !== 'function') {
    throw new Error('Clipboard API not available');
  }
  const blob = dataUrlToBlob(dataUrl);
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const clipboardBlob = blob.type && blob.type !== 'application/octet-stream'
    ? blob
    : new Blob([blob], { type: mime });
  try {
    window.focus();
  } catch (_) {
    // Offscreen documents may ignore focus.
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ [clipboardBlob.type || mime]: clipboardBlob })]);
  } catch (err) {
    if (mime === 'image/png') throw err;
    const pngBlob = await convertBlobToPng(clipboardBlob);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
  }
}

async function convertBlobToPng(blob) {
  const bmp = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return canvas.convertToBlob({ type: 'image/png' });
}
