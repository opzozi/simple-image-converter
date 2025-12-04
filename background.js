let creating;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-image-as-png',
    title: chrome.i18n.getMessage('contextMenuTitle'),
    contexts: ['image']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-image-as-png') {
    const imageUrl = info.srcUrl;
    if (imageUrl) {
      convertAndDownloadImage(imageUrl);
    }
  }
});

async function convertAndDownloadImage(imageUrl) {
  try {
    await setupOffscreenDocument();
    
    const response = await chrome.runtime.sendMessage({
      type: 'CONVERT_IMAGE',
      imageUrl: imageUrl
    });
    
    if (response.success) {
      const filename = getFilenameFromUrl(imageUrl);
      
      chrome.downloads.download({
        url: response.dataUrl,
        filename: filename,
        saveAs: true
      });
    } else {
      console.error('Image conversion failed:', response.error);
    }
  } catch (error) {
    console.error('Error in convertAndDownloadImage:', error);
  }
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

function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    let filename = parts[parts.length - 1];
    
    filename = filename.split('?')[0];
    
    if (!filename || filename === '') {
      filename = 'image.png';
    } else {
      filename = filename.replace(/\.[^.]+$/, '.png');
      
      if (!filename.endsWith('.png')) {
        filename += '.png';
      }
    }
    
    return filename;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return 'image.png';
  }
}
