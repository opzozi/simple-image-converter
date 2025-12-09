chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONVERT_IMAGE') {
    convertImageToPNG(message.imageUrl)
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

async function convertImageToPNG(imageUrl) {
  return new Promise((resolve, reject) => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    fetchImageAsBlob(imageUrl)
      .then(blob => blobToImage(blob))
      .then(img => {
        try {
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;

          ctx.drawImage(img, 0, 0);

          canvas.toBlob(blob => {
            if (!blob) {
              reject(new Error('Failed to create PNG blob.'));
              return;
            }

            const dataUrl = canvas.toDataURL('image/png');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            resolve({ dataUrl, blob });
          }, 'image/png');
        } catch (error) {
          reject(new Error('Failed to convert image: ' + error.message));
        }
      })
      .catch(err => reject(err));
  });
}

async function fetchImageAsBlob(imageUrl) {
  try {
    const res = await fetch(imageUrl, { mode: 'cors', credentials: 'include' });
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
