import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';
import OptionsPanel from './OptionsPanel';

const STORE_REVIEW_URL = 'https://chromewebstore.google.com/detail/simple-image-converter/clinbfiephmemllcffpddoabnknkaeki/reviews';

const i18n = chrome.i18n;
const storage = chrome.storage.sync;

function PopupApp() {
  const [version, setVersion] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [currentFormat, setCurrentFormat] = useState('png');
  const [showHelp, setShowHelp] = useState(false);
  const [dismissedHelp, setDismissedHelp] = useState(false);

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

  async function loadDarkMode() {
    const stored = await storage.get(['darkMode']);
    // Default to dark mode if not set
    const currentDarkMode = stored.darkMode !== undefined ? stored.darkMode : true;
    setDarkMode(currentDarkMode);
    applyDarkMode(currentDarkMode);
  }

  async function loadCurrentFormat() {
    const stored = await storage.get(['outputFormat']);
    const format = stored.outputFormat === 'jpeg' ? 'jpeg' : 'png';
    setCurrentFormat(format);
  }

  async function loadHelpState() {
    const stored = await storage.get(['dismissedHelp']);
    setDismissedHelp(stored.dismissedHelp === true);
  }

  async function dismissHelp() {
    await storage.set({ dismissedHelp: true });
    setDismissedHelp(true);
  }

  async function toggleFormat() {
    const newFormat = currentFormat === 'png' ? 'jpeg' : 'png';
    await storage.set({ outputFormat: newFormat });
    setCurrentFormat(newFormat);
    // Notify background script to update context menu
    chrome.runtime.sendMessage({ type: 'FORMAT_CHANGED', format: newFormat });
  }

  useEffect(() => {
    const manifest = chrome.runtime.getManifest();
    setVersion(manifest.version);
    
    loadDarkMode();
    loadCurrentFormat();
    loadHelpState();

    const handleStorageChange = (changes, areaName) => {
      if (changes.darkMode) {
        const newDarkMode = changes.darkMode.newValue !== undefined ? changes.darkMode.newValue : getSystemDarkMode();
        setDarkMode(newDarkMode);
        applyDarkMode(newDarkMode);
      }
      if (changes.outputFormat) {
        const format = changes.outputFormat.newValue === 'jpeg' ? 'jpeg' : 'png';
        setCurrentFormat(format);
      }
    };
    
    storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    loadDarkMode();
  }, [activeTab]);

  function handleRateClick(e) {
    e.preventDefault();
    chrome.tabs.create({ url: STORE_REVIEW_URL });
  }

  return (
    <div className="popup-container">
      <div className="popup-header">
        <div className="header-content">
          <img src="icons/icon48.png" alt="Icon" className="header-icon" />
          <h1>{i18n.getMessage('popupTitle')}</h1>
        </div>
        
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            {i18n.getMessage('popupTabHome')}
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            {i18n.getMessage('popupTabSettings')}
          </button>
        </div>
      </div>

      <div className="popup-content">
        {activeTab === 'home' && (
          <div className="home-tab">
            {!dismissedHelp && (
              <div className="help-section">
                <div className="help-header">
                  <span className="help-title">💡 {i18n.getMessage('helpTitle', 'Help')}</span>
                  <button className="help-close" onClick={dismissHelp} title={i18n.getMessage('dismissHelp', 'Dismiss')}>×</button>
                </div>
                {showHelp && (
                  <div className="help-content">
                    <p>{i18n.getMessage('popupDescription')}</p>
                  </div>
                )}
                {!showHelp && (
                  <button className="help-toggle" onClick={() => setShowHelp(true)}>
                    {i18n.getMessage('showHelp', 'Show instructions')}
                  </button>
                )}
              </div>
            )}

            <div className="format-control-wrapper">
              <label className="format-label">{i18n.getMessage('outputFormatLabel', 'KIMENETI FORMÁTUM')}</label>
              <div className="format-segmented-control">
                <button
                  className={`format-segment ${currentFormat === 'jpeg' ? 'active' : ''}`}
                  onClick={() => currentFormat !== 'jpeg' && toggleFormat()}
                >
                  JPEG
                </button>
                <button
                  className={`format-segment ${currentFormat === 'png' ? 'active' : ''}`}
                  onClick={() => currentFormat !== 'png' && toggleFormat()}
                >
                  PNG
                </button>
              </div>
            </div>

            <button
              className="batch-button"
              disabled
              title={i18n.getMessage('batchProFeature')}
            >
              <span className="batch-icon">📁</span>
              <span>{i18n.getMessage('batchConvert')}</span>
              <span className="batch-badge">PRO</span>
            </button>
            <a
              href="https://sic.opzozidev.com"
              target="_blank"
              rel="noopener noreferrer"
              className="pro-link"
            >
              {i18n.getMessage('proDetails')}
            </a>

            <div className="features-compact">
              <div className="feature-item">
                <span className="feature-icon">🖼️</span>
                <span>{i18n.getMessage('featureConvert')}</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📋</span>
                <span>{i18n.getMessage('featureCopy')}</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚙️</span>
                <span>{i18n.getMessage('featureQuality')}</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span>{i18n.getMessage('featurePrivacy')}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <OptionsPanel darkMode={darkMode} onDarkModeChange={setDarkMode} />
        )}
      </div>

      <div className="popup-footer">
        <div className="footer-top">
          <span className="privacy-info">🔒 {i18n.getMessage('privacyBadge')}</span>
        </div>
        <div className="footer-bottom">
          <span>{i18n.getMessage('version')}:</span> <span>{version}</span>
          <span className="footer-separator">•</span>
          <a
            href="https://www.paypal.com/donate/?hosted_button_id=KSNA8YZWGMDFG"
            target="_blank"
            rel="noopener noreferrer"
            className="donate-link"
            title={i18n.getMessage('donateTitle')}
          >
            ❤️ {i18n.getMessage('donateButtonCompact')}
          </a>
          <span className="footer-separator">•</span>
          <a href="#" onClick={handleRateClick} className="rate-link">
            <span className="rate-icon">⭐</span>
            <span>{i18n.getMessage('rateExtension') || 'Rate'}</span>
          </a>
        </div>
        <div className="footer-links">
          <a 
            href="https://opzozidev.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="footer-link"
          >
            opzozidev.com
          </a>
          <span className="footer-separator">•</span>
          <a
            href="https://vaultpdf.opzozidev.com"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            🔒 Simple VaultPDF
          </a>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<PopupApp />);
