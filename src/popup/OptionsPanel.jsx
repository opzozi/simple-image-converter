import React, { useState, useEffect } from 'react';

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
const i18n = chrome.i18n;

function t(key, fallback) {
  if (i18n && typeof i18n.getMessage === 'function') {
    const msg = i18n.getMessage(key);
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

function OptionsPanel({ darkMode: propDarkMode, onDarkModeChange }) {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState('');
  const [darkMode, setDarkMode] = useState(propDarkMode !== undefined ? propDarkMode : false);

  // Sync darkMode from prop
  useEffect(() => {
    if (propDarkMode !== undefined) {
      setDarkMode(propDarkMode);
    }
  }, [propDarkMode]);

  useEffect(() => {
    async function load() {
      const stored = await storage.get(Object.keys(defaults));
      const normalized = normalizeSettings({ ...defaults, ...stored });
      const systemDark = normalized.darkMode !== undefined ? normalized.darkMode : getSystemDarkMode();
      setSettings(normalized);
      
      // Use prop darkMode if available, otherwise use stored/system
      const initialDarkMode = propDarkMode !== undefined ? propDarkMode : systemDark;
      setDarkMode(initialDarkMode);
      applyDarkMode(initialDarkMode);

      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
          if (normalized.darkMode === undefined && propDarkMode === undefined) {
            applyDarkMode(e.matches);
            setDarkMode(e.matches);
            if (onDarkModeChange) {
              onDarkModeChange(e.matches);
            }
          }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    }
    load();
  }, [propDarkMode]);

  useEffect(() => {
    if (settings) {
      applyDarkMode(darkMode);
      if (onDarkModeChange) {
        onDarkModeChange(darkMode);
      }
    }
  }, [darkMode, settings, onDarkModeChange]);

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
    return <div className="loading">{t('optionsLoading', 'Loading...')}</div>;
  }

  return (
    <div className="options-panel">
      <div className="options-scroll">
        <div className="form-section">
          <h3 className="section-header">{t('optionsSectionAppearance', 'APPEARANCE')}</h3>
          
          <div className="form-group">
            <label className="toggle-row">
              <span className="label-text">{t('optionsDarkMode', 'Dark mode')}</span>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={async (e) => {
                  const newDarkMode = e.target.checked;
                  setDarkMode(newDarkMode);
                  applyDarkMode(newDarkMode);
                  // Notify parent component
                  if (onDarkModeChange) {
                    onDarkModeChange(newDarkMode);
                  }
                  // Save immediately when toggled
                  if (settings) {
                    const updatedSettings = { ...settings, darkMode: newDarkMode };
                    setSettings(updatedSettings);
                    await storage.set({ darkMode: newDarkMode });
                  }
                }}
                className="toggle-input"
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-header">{t('optionsSectionBehavior', 'BEHAVIOR')}</h3>
          
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

          <div className="form-group-grid">
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
                <span className="label-text">{t('optionsFocusWait', 'Focus wait (ms)')}</span>
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
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-header">{t('optionsSectionConversion', 'CONVERSION')}</h3>
          
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
                <span className="label-text">{t('optionsJpegQuality', 'JPEG quality')}</span>
                <div className="slider-wrapper">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="1"
                    value={Math.round(settings.jpegQuality * 100)}
                    onChange={(e) => setSettings({ ...settings, jpegQuality: parseInt(e.target.value, 10) / 100 || 0.9 })}
                    className="slider-input"
                  />
                  <span className="slider-value">{Math.round(settings.jpegQuality * 100)}%</span>
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
        </div>

        <div className="form-section">
          <h3 className="section-header">{t('optionsSectionFiles', 'FILES')}</h3>
          
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
            <div className="pattern-chips">
              {['{siteShort}', '{site}', '{name}', '{date}', '{time}', '{ext}'].map((variable) => (
                <button
                  key={variable}
                  type="button"
                  className="pattern-chip"
                  onClick={() => {
                    const input = document.querySelector('.input-lg');
                    if (input) {
                      const start = input.selectionStart || 0;
                      const end = input.selectionEnd || 0;
                      const newValue = settings.filenamePattern.slice(0, start) + variable + settings.filenamePattern.slice(end);
                      setSettings({ ...settings, filenamePattern: newValue });
                      setTimeout(() => {
                        input.focus();
                        input.setSelectionRange(start + variable.length, start + variable.length);
                      }, 0);
                    }
                  }}
                >
                  +{variable}
                </button>
              ))}
            </div>
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
        </div>
      </div>

      <div className="options-actions">
        <button onClick={handleSave} className="btn btn-primary">{t('optionsSaveButton', 'Save')}</button>
        <button onClick={handleReset} className="btn btn-outline">{t('optionsResetButton', 'Reset')}</button>
        <span className="status-text">{status}</span>
      </div>
    </div>
  );
}

export default OptionsPanel;

