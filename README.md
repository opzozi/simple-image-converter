# Simple Image Converter

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/intro/)

A lightweight Chrome extension that converts and saves any image (WebP, AVIF, JPG) as PNG with a simple right-click.

## 🌟 Features

- **🔄 Universal Conversion:** Automatically converts WebP, AVIF, JPG, and other formats to PNG
- **⚡ Fast & Efficient:** Uses modern Offscreen API for optimal performance
- **🔒 Privacy First:** 100% offline conversion, no data collection, no external servers
- **🌍 Multi-language:** Supports English, German, and Hungarian
- **🎨 Modern UI:** Beautiful gradient design with intuitive popup
- **📦 Lightweight:** Minimal resource usage (~5-10 MB RAM)

## 🚀 Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store page](#) *(coming soon)*
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the extension directory

## 📖 How to Use

1. Navigate to any webpage with images
2. Right-click on any image
3. Select **"Save Image as PNG"** from the context menu
4. Choose where to save the file
5. Done! Your image is converted and saved as PNG

## 🔧 Technical Details

### Built With
- **Manifest V3:** Future-proof Chrome extension standard
- **Service Worker:** Modern background script architecture
- **Offscreen API:** Efficient Canvas access for image conversion
- **Internationalization (i18n):** Multi-language support

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

- **`contextMenus`**: Add right-click menu option
- **`downloads`**: Save converted images
- **`offscreen`**: Access Canvas API for conversion
- **`<all_urls>`**: Load images from any website (CORS handling)

[Read our Privacy Policy](PRIVACY.md)

## 🌍 Supported Languages

- 🇬🇧 English
- 🇩🇪 Deutsch (German)
- 🇭🇺 Magyar (Hungarian)

## 🎯 Why Use This Extension?

Modern websites use WebP and AVIF formats for better performance, but these formats aren't universally supported by all software:

- ❌ Older versions of Photoshop don't support WebP
- ❌ Many CMS platforms reject WebP uploads
- ❌ Some email clients can't display WebP images
- ❌ Compatibility issues with various image editing tools

**This extension solves all these problems by converting images to universally compatible PNG format in one click.**

## 💖 Support Development

If you find this extension useful, consider supporting its development:

- ☕ [PayPal Donation](https://www.paypal.com/donate/?hosted_button_id=KSNA8YZWGMDFG)
- ⭐ Star this repository on [GitHub](https://github.com/opzozi/simple-image-converter)
- 📝 Leave a review on the Chrome Web Store

## 🛠️ Development

### Project Structure
```
simple-image-converter/
├── manifest.json           # Extension configuration
├── background.js           # Service Worker
├── offscreen.html          # Offscreen document for Canvas
├── offscreen.js            # Image conversion logic
├── popup.html              # Extension popup UI
├── popup.css               # Popup styles
├── popup.js                # Popup functionality
├── _locales/               # Internationalization
│   ├── en/
│   ├── de/
│   └── hu/
├── icons/                  # Extension icons
└── PRIVACY.md              # Privacy policy
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔮 Roadmap

- [ ] Add support for more output formats (JPEG, WebP)
- [ ] Image quality settings
- [ ] Batch conversion
- [ ] Image resize options
- [ ] Copy as PNG to clipboard

## 🐛 Bug Reports

If you encounter any issues, please [open an issue](https://github.com/opzozi/simple-image-converter/issues) on GitHub.

## 📞 Contact

- GitHub: [@opzozi](https://github.com/opzozi)

## 🙏 Acknowledgments

- Icons designed with modern gradient style
- Built with Chrome Extension Manifest V3
- Thanks to all contributors and users

---

Made with ❤️ by [Opzozi](https://github.com/opzozi)
