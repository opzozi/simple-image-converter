document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('popup-title').textContent = chrome.i18n.getMessage('popupTitle');
  document.getElementById('popup-description').textContent = chrome.i18n.getMessage('popupDescription');
  document.getElementById('features-title').textContent = chrome.i18n.getMessage('popupFeatures');
  document.getElementById('feature-1').textContent = chrome.i18n.getMessage('featureConvert');
  document.getElementById('feature-2').textContent = chrome.i18n.getMessage('featureQuality');
  document.getElementById('feature-3').textContent = chrome.i18n.getMessage('featurePrivacy');
  document.getElementById('donate-title').textContent = chrome.i18n.getMessage('donateTitle');
  document.getElementById('donate-description').textContent = chrome.i18n.getMessage('donateDescription');
  document.getElementById('donate-btn-text').textContent = chrome.i18n.getMessage('donateButton');
  document.getElementById('version-label').textContent = chrome.i18n.getMessage('version') + ':';
  
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version-number').textContent = manifest.version;
});

