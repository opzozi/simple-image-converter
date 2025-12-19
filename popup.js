const STORE_REVIEW_URL = 'https://chromewebstore.google.com/detail/simple-image-converter/clinbfiephmemllcffpddoabnknkaeki/reviews';

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('popup-title').textContent = chrome.i18n.getMessage('popupTitle');
  document.getElementById('popup-description').textContent = chrome.i18n.getMessage('popupDescription');
  document.getElementById('features-title').textContent = chrome.i18n.getMessage('popupFeatures');
  document.getElementById('feature-1').textContent = chrome.i18n.getMessage('featureConvert');
  document.getElementById('feature-2').textContent = chrome.i18n.getMessage('featureCopy');
  document.getElementById('feature-3').textContent = chrome.i18n.getMessage('featureQuality');
  document.getElementById('feature-4').textContent = chrome.i18n.getMessage('featurePrivacy');
  document.getElementById('donate-title').textContent = chrome.i18n.getMessage('donateTitle');
  document.getElementById('donate-description').textContent = chrome.i18n.getMessage('donateDescription');
  document.getElementById('donate-btn-text').textContent = chrome.i18n.getMessage('donateButton');
  document.getElementById('version-label').textContent = chrome.i18n.getMessage('version') + ':';
  document.getElementById('rate-text').textContent = chrome.i18n.getMessage('rateExtension') || 'Rate';
  
  const optLink = document.getElementById('open-options');
  optLink.textContent = chrome.i18n.getMessage('optionsLink') || 'Settings';
  optLink.addEventListener('click', e => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html');
    }
  });
  
  const rateLink = document.getElementById('rate-link');
  rateLink.addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: STORE_REVIEW_URL });
  });
  
  const manifest = chrome.runtime.getManifest();
  document.getElementById('version-number').textContent = manifest.version;
});

