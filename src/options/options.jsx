import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './options.css';

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

const storage = chrome.storage.sync;

function t(key, fallback) {
  if (chrome?.i18n && typeof chrome.i18n.getMessage === 'function') {
    const msg = chrome.i18n.getMessage(key);
    if (msg) return msg;
  }
  return fallback;
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

function getSystemDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function OptionsApp() {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    async function load() {
      const stored = await storage.get(Object.keys(defaults));
      const normalized = normalizeSettings({ ...defaults, ...stored });
      const systemDark = normalized.darkMode !== undefined ? normalized.darkMode : getSystemDarkMode();
      setSettings(normalized);
      setDarkMode(systemDark);
      applyDarkMode(systemDark);

      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (normalized.darkMode === undefined) {
            applyDarkMode(e.matches);
            setDarkMode(e.matches);
          }
        });
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (settings) {
      applyDarkMode(darkMode);
    }
  }, [darkMode, settings]);

  function applyDarkMode(enabled) {
    if (enabled) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  async function handleSave() {
    if (!settings) return;

    const payload = {
      darkMode: darkMode,
      toastEnabled: settings.toastEnabled,
      toastDurationMs: clamp(parseInt(String(settings.toastDurationMs), 10), 500, 10000),
      focusWaitMs: clamp(parseInt(String(settings.focusWaitMs), 10), 0, 500),
      saveAsPrompt: settings.saveAsPrompt,
      fetchWithCredentials: settings.fetchWithCredentials,
      outputFormat: settings.outputFormat,
      jpegQuality: clamp(parseInt(String(settings.jpegQuality * 100), 10), 50, 100) / 100,
      resizeMax: clamp(parseInt(String(settings.resizeMax), 10), 0, 8000),
      filenamePattern: settings.filenamePattern || defaults.filenamePattern
    };

    await storage.set(payload);
    setStatus(t('optionsSaved', 'Saved.'));
    setTimeout(() => setStatus(''), 1500);
  }

  async function handleReset() {
    const normalized = normalizeSettings({ ...defaults });
    const systemDark = normalized.darkMode !== undefined ? normalized.darkMode : getSystemDarkMode();
    setSettings(normalized);
    setDarkMode(systemDark);
    await storage.set(normalized);
    setStatus(t('optionsResetDone', 'Defaults restored.'));
    setTimeout(() => setStatus(''), 1500);
  }

  if (!settings) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container">
      <header>
        <h1>{t('optionsTitle', 'Settings')}</h1>
        <p className="muted">{t('optionsDescription', 'Configure how the extension behaves.')}</p>
      </header>

      <section>
        <h3>{t('optionsSectionAppearance', 'Appearance')}</h3>
        
        <div className="form-group">
          <label className="toggle-row">
            <span className="label-text">{t('optionsDarkMode', 'Dark mode')}</span>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </section>

      <section>
        <h3>{t('optionsSectionBehavior', 'Behavior')}</h3>
        
        <div className="form-group">
          <label className="toggle-row">
            <span className="label-text">{t('optionsToastEnabled', 'Show toasts for copy/save')}</span>
            <input
              type="checkbox"
              checked={settings.toastEnabled}
              onChange={(e) => setSettings({ ...settings, toastEnabled: e.target.checked })}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="form-group">
          <label className="input-row">
            <span className="label-text">{t('optionsToastDuration', 'Toast duration (ms)')}</span>
            <div className="input-wrapper">
              <input
                type="number"
                min="500"
                max="10000"
                step="100"
                value={settings.toastDurationMs}
                onChange={(e) => setSettings({ ...settings, toastDurationMs: parseInt(e.target.value, 10) || 2000 })}
                className="input-sm"
              />
              <span className="input-suffix">ms</span>
            </div>
          </label>
        </div>

        <div className="form-group">
          <label className="input-row">
            <span className="label-text">{t('optionsFocusWait', 'Focus wait before clipboard (ms)')}</span>
            <div className="input-wrapper">
              <input
                type="number"
                min="0"
                max="500"
                step="10"
                value={settings.focusWaitMs}
                onChange={(e) => setSettings({ ...settings, focusWaitMs: parseInt(e.target.value, 10) || 50 })}
                className="input-sm"
              />
              <span className="input-suffix">ms</span>
            </div>
          </label>
        </div>

        <div className="form-group">
          <label className="input-row">
            <span className="label-text">{t('optionsFormat', 'Output format')}</span>
            <select
              value={settings.outputFormat}
              onChange={(e) => setSettings({ ...settings, outputFormat: e.target.value })}
              className="input-sm select-modern"
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
            </select>
          </label>
          <p className="hint">{t('optionsFormatHint', 'PNG = lossless, JPEG = smaller but lossy.')}</p>
        </div>

        {settings.outputFormat === 'jpeg' && (
          <div className="form-group">
            <label className="input-row">
              <span className="label-text">{t('optionsJpegQuality', 'JPEG quality (%)')}</span>
              <div className="input-wrapper">
                <input
                  type="number"
                  min="50"
                  max="100"
                  step="1"
                  value={Math.round(settings.jpegQuality * 100)}
                  onChange={(e) => setSettings({ ...settings, jpegQuality: parseInt(e.target.value, 10) / 100 || 0.9 })}
                  className="input-sm"
                />
                <span className="input-suffix">%</span>
              </div>
            </label>
            <p className="hint">{t('optionsJpegHint', '70-90% is usually enough. Higher = larger files.')}</p>
          </div>
        )}

        <div className="form-group">
          <label className="input-row">
            <span className="label-text">{t('optionsResizeMax', 'Max dimension (px, 0 = original)')}</span>
            <div className="input-wrapper">
              <input
                type="number"
                min="0"
                max="8000"
                step="50"
                value={settings.resizeMax}
                onChange={(e) => setSettings({ ...settings, resizeMax: parseInt(e.target.value, 10) || 0 })}
                className="input-sm"
              />
              <span className="input-suffix">px</span>
            </div>
          </label>
          <p className="hint">{t('optionsResizeHint', 'Max longer edge in pixels. 0 keeps original size.')}</p>
        </div>

        <div className="form-group">
          <label className="input-row">
            <span className="label-text">{t('optionsFilenamePattern', 'Filename pattern')}</span>
            <input
              type="text"
              value={settings.filenamePattern}
              onChange={(e) => setSettings({ ...settings, filenamePattern: e.target.value })}
              placeholder="{siteShort}-{name}-{date}-{time}.{ext}"
              className="input-lg"
            />
          </label>
          <p className="hint">{t('optionsPatternHint', 'Use {site}, {name}, {date}, {time}, {ext}. Example: example-image-2025-01-01.png')}</p>
        </div>

        <div className="form-group">
          <label className="toggle-row">
            <span className="label-text">{t('optionsSaveAs', 'Always ask where to save (Save As dialog)')}</span>
            <input
              type="checkbox"
              checked={settings.saveAsPrompt}
              onChange={(e) => setSettings({ ...settings, saveAsPrompt: e.target.checked })}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="form-group">
          <label className="toggle-row">
            <span className="label-text">{t('optionsFetchCredentials', 'Use credentials when fetching images (may help on some sites)')}</span>
            <input
              type="checkbox"
              checked={settings.fetchWithCredentials}
              onChange={(e) => setSettings({ ...settings, fetchWithCredentials: e.target.checked })}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </section>

      <div className="actions">
        <button onClick={handleSave} className="btn-primary">{t('optionsSaveButton', 'Save')}</button>
        <button onClick={handleReset} className="btn-ghost">{t('optionsResetButton', 'Reset to defaults')}</button>
        <span className="status-text">{status}</span>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<OptionsApp />);

