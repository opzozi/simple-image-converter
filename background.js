let creating;

chrome.runtime.onInstalled.addListener(() => {
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
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-image-as-png') {
    const imageUrl = info.srcUrl;
    if (imageUrl) {
      convertAndDownloadImage(imageUrl);
    }
  } else if (info.menuItemId === 'copy-image-as-png') {
    const imageUrl = info.srcUrl;
    if (imageUrl) {
      copyImageToClipboard(imageUrl, tab?.id);
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

async function copyImageToClipboard(imageUrl, tabId) {
  try {
    await setupOffscreenDocument();

    const convertResponse = await chrome.runtime.sendMessage({
      type: 'CONVERT_IMAGE',
      imageUrl
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

    chrome.tabs.sendMessage(targetTabId, { type: 'COPY_IMAGE_DATA', dataUrl: convertResponse.dataUrl }, response => {
      const err = chrome.runtime.lastError;
      if (err) {
        console.error('[SIC] Copy failed (tabs.sendMessage):', err.message || err);
        return;
      }
      if (!response || !response.success) {
        console.error('[SIC] Copy failed:', response?.error || 'unknown error');
      }
    });
  } catch (error) {
    console.error('[SIC] Error in copyImageToClipboard:', error);
  }
}

async function getActiveTabId() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return activeTab?.id;
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
