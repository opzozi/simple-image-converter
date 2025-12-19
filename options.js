const defaults = {
  toastEnabled: true,
  toastDurationMs: 2000,
  focusWaitMs: 50,
  saveAsPrompt: true,
  fetchWithCredentials: true,
  outputFormat: 'png',
  jpegQuality: 90,
  resizeMax: 0,
  filenamePattern: '{siteShort}-{name}-{date}-{time}.{ext}'
};

const storage = (chrome.storage && chrome.storage.sync) ? chrome.storage.sync : chrome.storage.local;

function t(key, fallback) {
  if (chrome?.i18n && typeof chrome.i18n.getMessage === 'function') {
    const msg = chrome.i18n.getMessage(key);
    if (msg) return msg;
  }
  return fallback;
}

function applyTexts() {
  document.getElementById('opt-title').textContent = t('optionsTitle', 'Settings');
  document.getElementById('opt-desc').textContent = t('optionsDescription', 'Configure how the extension behaves.');
  document.getElementById('section-appearance').textContent = t('optionsSectionAppearance', 'Appearance');
  document.getElementById('lbl-dark-mode').textContent = t('optionsDarkMode', 'Dark mode');
  document.getElementById('section-behavior').textContent = t('optionsSectionBehavior', 'Behavior');
  document.getElementById('lbl-toast-enabled').textContent = t('optionsToastEnabled', 'Show toasts for copy/save');
  document.getElementById('lbl-toast-duration').textContent = t('optionsToastDuration', 'Toast duration (ms)');
  document.getElementById('lbl-focus-wait').textContent = t('optionsFocusWait', 'Focus wait before clipboard (ms)');
  document.getElementById('lbl-format').textContent = t('optionsFormat', 'Output format');
  document.getElementById('lbl-jpeg-quality').textContent = t('optionsJpegQuality', 'JPEG quality (%)');
  document.getElementById('lbl-resize-max').textContent = t('optionsResizeMax', 'Max dimension (px, 0 = original)');
  document.getElementById('lbl-filename-pattern').textContent = t('optionsFilenamePattern', 'Filename pattern');
  document.getElementById('lbl-save-as').textContent = t('optionsSaveAs', 'Always ask where to save (Save As dialog)');
  document.getElementById('lbl-fetch-credentials').textContent = t('optionsFetchCredentials', 'Use credentials when fetching images (may help on some sites)');
  document.getElementById('save-btn').textContent = t('optionsSaveButton', 'Save');
  document.getElementById('reset-btn').textContent = t('optionsResetButton', 'Reset to defaults');
  document.getElementById('hint-format').textContent = t('optionsFormatHint', 'PNG = lossless, JPEG = smaller but lossy.');
  document.getElementById('hint-jpeg-quality').textContent = t('optionsJpegHint', '70-90% is usually enough. Higher = larger files.');
  document.getElementById('hint-resize-max').textContent = t('optionsResizeHint', 'Max longer edge in pixels. 0 keeps original size.');
  document.getElementById('hint-filename-pattern').textContent = t('optionsPatternHint', 'Use {site}, {name}, {date}, {time}, {ext}. Example: example-image-2025-01-01.png');
}

async function loadSettings() {
  const stored = await storage.get(Object.keys(defaults));
  return normalizeSettings({ ...defaults, ...stored });
}

async function saveSettings() {
  const darkMode = document.getElementById('dark-mode').checked;
  const toastEnabled = document.getElementById('toast-enabled').checked;
  const toastDurationMs = clamp(parseInt(document.getElementById('toast-duration').value, 10), 500, 10000);
  const focusWaitMs = clamp(parseInt(document.getElementById('focus-wait').value, 10), 0, 500);
  const outputFormat = document.getElementById('output-format').value === 'jpeg' ? 'jpeg' : 'png';
  const jpegQuality = clamp(parseInt(document.getElementById('jpeg-quality').value, 10), 50, 100) / 100;
  const resizeMax = clamp(parseInt(document.getElementById('resize-max').value, 10), 0, 8000);
  const filenamePattern = document.getElementById('filename-pattern').value || defaults.filenamePattern;
  const saveAsPrompt = document.getElementById('save-as-prompt').checked;
  const fetchWithCredentials = document.getElementById('fetch-with-credentials').checked;

  const payload = { darkMode, toastEnabled, toastDurationMs, focusWaitMs, saveAsPrompt, fetchWithCredentials, outputFormat, jpegQuality, resizeMax, filenamePattern };
  await storage.set(payload);
  applyDarkMode(darkMode);
  setStatus(t('optionsSaved', 'Saved.'));
}

async function resetSettings() {
  const normalized = normalizeSettings({ ...defaults });
  document.getElementById('dark-mode').checked = normalized.darkMode || false;
  document.getElementById('toast-enabled').checked = normalized.toastEnabled;
  document.getElementById('toast-duration').value = normalized.toastDurationMs;
  document.getElementById('focus-wait').value = normalized.focusWaitMs;
  document.getElementById('output-format').value = normalized.outputFormat;
  document.getElementById('jpeg-quality').value = Math.round(normalized.jpegQuality * 100);
  document.getElementById('resize-max').value = normalized.resizeMax;
  document.getElementById('filename-pattern').value = normalized.filenamePattern;
  document.getElementById('save-as-prompt').checked = normalized.saveAsPrompt;
  document.getElementById('fetch-with-credentials').checked = normalized.fetchWithCredentials;
  toggleJpegQuality(normalized.outputFormat);
  applyDarkMode(normalized.darkMode || false);
  await storage.set(normalized);
  setStatus(t('optionsResetDone', 'Defaults restored.'));
}

function clamp(val, min, max) {
  if (Number.isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

function normalizeSettings(raw) {
  const normalized = { ...raw };
  if (normalized.jpegQuality > 1) {
    normalized.jpegQuality = normalized.jpegQuality / 100;
  }
  normalized.jpegQuality = clamp(normalized.jpegQuality, 0.5, 1.0);
  normalized.outputFormat = normalized.outputFormat === 'jpeg' ? 'jpeg' : 'png';
  normalized.resizeMax = clamp(parseInt(normalized.resizeMax, 10), 0, 8000);
  normalized.toastDurationMs = clamp(parseInt(normalized.toastDurationMs, 10), 500, 10000);
  normalized.focusWaitMs = clamp(parseInt(normalized.focusWaitMs, 10), 0, 500);
  normalized.filenamePattern = normalized.filenamePattern || defaults.filenamePattern;
  normalized.darkMode = normalized.darkMode !== undefined ? !!normalized.darkMode : undefined;
  return normalized;
}

function setStatus(msg) {
  const el = document.getElementById('status');
  el.textContent = msg;
  setTimeout(() => {
    el.textContent = '';
  }, 1500);
}

function applyDarkMode(enabled) {
  if (enabled) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

function getSystemDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

async function init() {
  applyTexts();
  const settings = await loadSettings();
  
  const darkMode = settings.darkMode !== undefined ? settings.darkMode : getSystemDarkMode();
  document.getElementById('dark-mode').checked = darkMode;
  applyDarkMode(darkMode);
  
  document.getElementById('toast-enabled').checked = settings.toastEnabled;
  document.getElementById('toast-duration').value = settings.toastDurationMs;
  document.getElementById('focus-wait').value = settings.focusWaitMs;
  document.getElementById('output-format').value = settings.outputFormat;
  document.getElementById('jpeg-quality').value = Math.round(settings.jpegQuality * 100);
  document.getElementById('resize-max').value = settings.resizeMax;
  document.getElementById('filename-pattern').value = settings.filenamePattern;
  document.getElementById('save-as-prompt').checked = settings.saveAsPrompt;
  document.getElementById('fetch-with-credentials').checked = settings.fetchWithCredentials;

  toggleJpegQuality(settings.outputFormat);
  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('output-format').addEventListener('change', e => toggleJpegQuality(e.target.value));
  document.getElementById('reset-btn').addEventListener('click', resetSettings);
  document.getElementById('dark-mode').addEventListener('change', e => applyDarkMode(e.target.checked));
  
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (settings.darkMode === undefined) {
        applyDarkMode(e.matches);
        document.getElementById('dark-mode').checked = e.matches;
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', init);

function toggleJpegQuality(fmt) {
  const qualityGroup = document.getElementById('jpeg-quality-group');
  if (fmt === 'jpeg') {
    qualityGroup.style.display = 'block';
  } else {
    qualityGroup.style.display = 'none';
  }
}

