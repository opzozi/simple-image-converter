# Changelog

## 1.2.0
- **Modern Settings UI**: Complete redesign of options page with iOS-style toggles, modern form elements, and dark mode support
  - Manual dark mode toggle (in addition to system preference)
  - Clean, professional card-based layout
  - Responsive design for all screen sizes
- **Smart Filename Generation**: Uses page URL (not CDN) as primary source for site name in filenames
  - Automatically detects website name even when images are hosted on CDNs (fbcdn, aws, shopify, etc.)
  - Removes common prefixes (www, m, cdn, static, media, img) and TLDs for cleaner filenames
- **Improved Error Handling**: Better user feedback for download errors
  - Separate messages for user cancellation vs. actual errors
  - Localized error messages (en/de/hu)
- **UI Improvements**:
  - Fixed popup scrollbar issue - now displays as clean static card
  - Added "Rate Extension" link in popup footer
  - Updated popup feature descriptions to reflect JPEG support and smart filenames
- **Bug Fixes**:
  - Fixed duplicate context menu ID errors on extension reload
  - Improved context menu initialization on browser startup
  - Better handling of edge cases in filename generation

## 1.1.1
- Bug fixes and stability improvements

## 1.1.0
- Added "Copy Image as PNG" context menu; PNG copy now CORS-safe via offscreen conversion
- Added localized toasts for copy success/error (en/de/hu)
- Updated popup features, README-k, és manifest to reflect the new capability
- Clipboard permission (`clipboardWrite`) added; content script registered for copy handling

## 1.0.0
- Initial release: convert and save images as PNG via context menu
