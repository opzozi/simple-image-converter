# Simple Image Converter

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/intro/)

A lightweight Chrome extension that converts and saves any image (WebP, AVIF, JPG) as PNG with a simple right-click.

## Features

- **Universal Conversion** — Convert WebP, AVIF, JPG, and other formats to PNG or JPEG
- **Copy to Clipboard** — Right-click → "Copy Image as PNG/JPEG"
- **Smart Filenames** — Automatically uses website name (not CDN) in filenames
- **Customizable Settings** — Modern UI with dark mode support
- **Fast & Efficient** — Uses Offscreen API for optimal performance
- **Privacy First** — 100% offline, no data collection
- **Multi-language** — English, German, Hungarian
- **Lightweight** — ~5-10 MB RAM usage

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store page](https://chrome.google.com/webstore/detail/clinbfiephmemllcffpddoabnknkaeki)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the extension directory

## How to Use

1. Navigate to any webpage with images
2. Right-click on any image
3. Choose **"Save Image as PNG/JPEG"** to download, or **"Copy Image as PNG/JPEG"** to put it in your clipboard
4. If you saved, pick the location; if you copied, paste where you need it
5. Done! The image is converted and ready

**Customize Settings**: Click the extension icon → Settings to configure output format, quality, filename patterns, and more.

## Technical Details

### Built With
- **Manifest V3** — Future-proof Chrome extension standard
- **Service Worker** — Modern background script architecture
- **Offscreen API** — Efficient Canvas access for image conversion
- **Internationalization (i18n)** — Multi-language support

### Architecture
```
User Right-Click → Context Menu → Service Worker (background.js)
                                      ↓
                            Offscreen Document (offscreen.js)
                                      ↓
                            Canvas API → PNG Conversion
                                      ↓
                            Downloads API → Save File
```

### Permissions

- **`contextMenus`** — Add right-click menu option
- **`downloads`** — Save converted images
- **`offscreen`** — Access Canvas API for conversion
- **`<all_urls>`** — Load images from any website (CORS handling)

[Read our Privacy Policy](PRIVACY.md)

## Supported Languages

- English
- Deutsch (German)
- Magyar (Hungarian)

## Why This Extension?

WebP and AVIF images are everywhere, but not all tools support them. Photoshop CS6? Nope. Some CMS platforms? Rejected. Email clients? Broken display.

This extension converts them to PNG with one click. Problem solved.

## Support

Like this extension? You can help:

- [Donate via PayPal](https://www.paypal.com/donate/?hosted_button_id=KSNA8YZWGMDFG)
- Star the repo on [GitHub](https://github.com/opzozi/simple-image-converter)
- Leave a review on Chrome Web Store

## Development

### Project Structure
```
simple-image-converter/
├── manifest.json           # Extension configuration
├── background.js           # Service Worker
├── offscreen.html          # Offscreen document for Canvas
├── offscreen.js            # Image conversion logic
├── popup.html/js/css       # Extension popup UI
├── options.html/js/css     # Settings page
├── copy-helper.js          # Content script for clipboard
├── _locales/               # Internationalization (en/de/hu)
├── icons/                  # Extension icons
├── CHANGELOG.md            # Version history
├── FEATURES.md             # Detailed feature documentation
└── PRIVACY.md              # Privacy policy
```

### Documentation

- **[FEATURES.md](FEATURES.md)** — Complete feature documentation
- **[CHANGELOG.md](CHANGELOG.md)** — Version history and changes

### Contributing

Pull requests welcome. Found a bug? Open an issue.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Issues

Found a bug? [Open an issue](https://github.com/opzozi/simple-image-converter/issues) on GitHub.

## Contact

GitHub: [@opzozi](https://github.com/opzozi)

---

Made by [Opzozi](https://github.com/opzozi)
