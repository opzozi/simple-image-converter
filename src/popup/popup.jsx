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
    const systemDark = getSystemDarkMode();
    const currentDarkMode = stored.darkMode !== undefined ? stored.darkMode : systemDark;
    setDarkMode(currentDarkMode);
    applyDarkMode(currentDarkMode);
  }

  useEffect(() => {
    const manifest = chrome.runtime.getManifest();
    setVersion(manifest.version);
    
    loadDarkMode();

    const handleStorageChange = (changes, areaName) => {
      if (changes.darkMode) {
        const newDarkMode = changes.darkMode.newValue !== undefined ? changes.darkMode.newValue : getSystemDarkMode();
        setDarkMode(newDarkMode);
        applyDarkMode(newDarkMode);
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
            <p className="description">{i18n.getMessage('popupDescription')}</p>
            
            <div className="features">
              <h3>{i18n.getMessage('popupFeatures')}</h3>
              <ul>
                <li>{i18n.getMessage('featureConvert')}</li>
                <li>{i18n.getMessage('featureCopy')}</li>
                <li>{i18n.getMessage('featureQuality')}</li>
                <li>{i18n.getMessage('featurePrivacy')}</li>
              </ul>
            </div>
            
            <div className="divider"></div>
            
            <div className="donate-section">
              <h3>{i18n.getMessage('donateTitle')}</h3>
              <p>{i18n.getMessage('donateDescription')}</p>
              <div className="buttons">
                <a
                  href="https://www.paypal.com/donate/?hosted_button_id=KSNA8YZWGMDFG"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.76-4.852.072-.455.462-.788.922-.788h.581c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.761-4.457z"/>
                  </svg>
                  <span>{i18n.getMessage('donateButton')}</span>
                </a>
              </div>
            </div>

            <div className="divider"></div>

            <div className="developer-section">
              <p className="developer-text">
                <span>More tools by </span>
                <a 
                  href="https://opzozidev.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="developer-link"
                >
                  opzozidev.com
                </a>
              </p>
              <div className="developer-links">
                <a
                  href="https://vaultpdf.opzozidev.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="developer-link-small"
                >
                  🔒 Simple VaultPDF
                </a>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <OptionsPanel darkMode={darkMode} onDarkModeChange={setDarkMode} />
        )}
      </div>

      <div className="popup-footer">
        <span>{i18n.getMessage('version')}:</span> <span>{version}</span>
        <span className="footer-separator">•</span>
        <a href="#" onClick={handleRateClick} className="rate-link">
          <span className="rate-icon">⭐</span>
          <span>{i18n.getMessage('rateExtension') || 'Rate'}</span>
        </a>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<PopupApp />);
