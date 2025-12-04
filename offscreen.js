chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONVERT_IMAGE') {
    convertImageToPNG(message.imageUrl)
      .then(dataUrl => {
        sendResponse({ success: true, dataUrl: dataUrl });
      })
      .catch(error => {
        console.error('Conversion error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
});

async function convertImageToPNG(imageUrl) {
  return new Promise((resolve, reject) => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        
        ctx.drawImage(img, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/png');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        resolve(dataUrl);
      } catch (error) {
        reject(new Error('Failed to convert image: ' + error.message));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image from URL: ' + imageUrl));
    };
    
    img.src = imageUrl;
  });
}
