const browserAPI = chrome;

if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CONVERT_IMAGE') {
      convertImage(event.data.imageUrl, {
        fetchWithCredentials: event.data.fetchWithCredentials,
        format: event.data.format,
        jpegQuality: event.data.jpegQuality,
        resizeMax: event.data.resizeMax
      })
        .then(result => {
          event.source.postMessage({
            type: 'CONVERT_RESPONSE',
            success: true,
            dataUrl: result.dataUrl
          }, '*');
        })
        .catch(error => {
          // Conversion error
          event.source.postMessage({
            type: 'CONVERT_RESPONSE',
            success: false,
            error: error.message
          }, '*');
        });
    }
  });
}

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
        console.error('[SIC] Conversion error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});

async function convertImage(imageUrl, opts = {}) {
  const fetchWithCredentials = opts.fetchWithCredentials !== false;
  const format = opts.format === 'jpeg' ? 'jpeg' : 'png';
  const jpegQuality = typeof opts.jpegQuality === 'number' ? opts.jpegQuality : 0.92;
  const resizeMax = typeof opts.resizeMax === 'number' ? opts.resizeMax : 0;

  return new Promise((resolve, reject) => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    fetchImageAsBlob(imageUrl, fetchWithCredentials)
      .then(blob => blobToImage(blob))
      .then(img => {
        try {
          let targetWidth = img.naturalWidth || img.width;
          let targetHeight = img.naturalHeight || img.height;

          if (resizeMax > 0 && (targetWidth > resizeMax || targetHeight > resizeMax)) {
            const scale = Math.min(resizeMax / targetWidth, resizeMax / targetHeight);
            targetWidth = Math.round(targetWidth * scale);
            targetHeight = Math.round(targetHeight * scale);
          }

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          canvas.toBlob(blob => {
            if (!blob) {
              reject(new Error('Failed to create PNG blob.'));
              return;
            }

            const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const dataUrl = canvas.toDataURL(mime, format === 'jpeg' ? jpegQuality : undefined);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            resolve({ dataUrl, blob });
          }, format === 'jpeg' ? 'image/jpeg' : 'image/png', format === 'jpeg' ? jpegQuality : undefined);
        } catch (error) {
          reject(new Error('Failed to convert image: ' + error.message));
        }
      })
      .catch(err => reject(err));
  });
}

async function fetchImageAsBlob(imageUrl, fetchWithCredentials = true) {
  try {
    const res = await fetch(imageUrl, {
      mode: 'cors',
      credentials: fetchWithCredentials ? 'include' : 'omit'
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch image: ${res.status}`);
    }
    return await res.blob();
  } catch (error) {
    throw new Error('Failed to fetch image: ' + error.message);
  }
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
