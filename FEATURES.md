# Simple Image Converter - Feature Documentation

## Overview

Simple Image Converter is a lightweight Chrome extension that converts and saves images in various formats (WebP, AVIF, JPG, etc.) to PNG or JPEG format with a simple right-click. The extension operates 100% offline, ensuring complete privacy and no data collection.

## Core Features

### 1. Image Conversion
- **Universal Format Support**: Converts WebP, AVIF, JPG, PNG, and other image formats
- **Output Formats**: PNG (lossless) or JPEG (configurable quality)
- **Offscreen API**: Uses Chrome's Offscreen API for efficient Canvas-based conversion
- **CORS-Safe**: Handles cross-origin images properly through offscreen document

### 2. Save to Disk
- **Right-Click Context Menu**: "Save Image as PNG/JPEG" option appears on all images
- **Smart Filename Generation**: 
  - Uses page URL (not CDN) to determine website name
  - Customizable filename patterns with placeholders: `{siteShort}`, `{name}`, `{date}`, `{time}`, `{ext}`
  - Automatically removes CDN prefixes (cdn, static, media, img) and TLDs
  - Example: `facebook-image-2025-01-15-14-30-45.png`
- **Save As Dialog**: Optional prompt to choose save location
- **Download Tracking**: Toast notifications for successful saves or errors

### 3. Copy to Clipboard
- **Right-Click Context Menu**: "Copy Image as PNG/JPEG" option
- **User Gesture Handling**: Properly handles browser security requirements for clipboard access
- **Focus Management**: Automatically focuses document before clipboard write
- **Toast Notifications**: Visual feedback for successful copy or errors

### 4. Settings & Configuration

#### Behavior Settings
- **Toast Notifications**: Enable/disable success/error toasts
- **Toast Duration**: Configurable display time (500-10000ms)
- **Focus Wait**: Delay before clipboard operations (0-500ms)
- **Output Format**: PNG (lossless) or JPEG (compressed)
- **JPEG Quality**: 50-100% quality setting (only for JPEG format)
- **Max Dimension**: Optional image resizing (0-8000px, 0 = original size)
- **Filename Pattern**: Custom pattern for saved files
- **Save As Prompt**: Always show "Save As" dialog
- **Fetch Credentials**: Include credentials when fetching images (helps with some sites)

#### UI Features
- **Modern Design**: Clean, professional settings interface
- **iOS-Style Toggles**: Native-feeling switch controls
- **Dark Mode**: Automatic dark theme support (follows system preference)
- **Responsive Layout**: Works on all screen sizes
- **Multi-Language**: English, German, Hungarian

### 5. Technical Architecture

#### Service Worker (background.js)
- Manages context menu creation and updates
- Handles image conversion requests
- Coordinates downloads and clipboard operations
- Manages settings storage and synchronization

#### Offscreen Document (offscreen.js)
- Isolated environment for Canvas API access
- Performs actual image conversion
- Handles CORS-restricted images
- Supports both PNG and JPEG output

#### Content Script (copy-helper.js)
- Runs in page context for clipboard access
- Displays toast notifications
- Handles user gesture requirements
- Manages document focus

#### Popup UI (popup.html/js)
- Extension information and features
- Quick access to settings
- Version display
- Donation link

#### Options UI (options.html/js/css)
- Comprehensive settings interface
- Real-time validation
- Settings persistence
- Reset to defaults

## Filename Generation Logic

The extension uses intelligent filename generation that prioritizes the page URL over the image URL:

1. **Primary Source**: Uses `pageUrl` (the tab URL where the user is viewing)
   - This ensures correct website identification even when images are on CDNs
   - Example: Page on `facebook.com` → Image on `fbcdn.net` → Filename uses "facebook"

2. **Fallback**: Uses `imageUrl` only if:
   - `pageUrl` is empty
   - `pageUrl` matches `imageUrl` (direct image view)

3. **Cleanup Rules**:
   - Removes prefixes: `www.`, `m.`, `cdn.`, `static.`, `media.`, `img.`, `images?`
   - Removes TLD (top-level domain) to get brand name
   - Example: `www.cdn.facebook.com` → `facebook`

4. **Pattern Placeholders**:
   - `{siteShort}`: Brand name (e.g., "facebook")
   - `{site}`: Full cleaned hostname (e.g., "facebook.com")
   - `{name}`: Original image filename (without extension)
   - `{date}`: Date in YYYY-MM-DD format
   - `{time}`: Time in HH-MM-SS format
   - `{ext}`: File extension (png or jpg)

## Error Handling

### Download Errors
- **User Cancellation**: Detects when user cancels save dialog
  - Shows localized "Save cancelled" message
  - Not treated as an error
- **Actual Errors**: Network failures, permission issues, etc.
  - Shows localized "Save failed" message
  - Logs error details for debugging

### Copy Errors
- **Clipboard API Unavailable**: Graceful fallback
- **Conversion Errors**: Proper error messages
- **Focus Issues**: Automatic retry with configurable delay

## Privacy & Security

- **100% Offline**: All processing happens locally
- **No Data Collection**: No analytics, tracking, or external requests
- **Minimal Permissions**: Only requests necessary permissions
- **Open Source**: Code is transparent and auditable

## Internationalization

Full support for:
- **English** (en)
- **German** (de)
- **Hungarian** (hu)

All UI elements, error messages, and toasts are localized.

## Browser Compatibility

- **Chrome**: Full support (Manifest V3)
- **Chromium-based browsers**: Should work (Vivaldi, Edge, Brave, etc.)
- **Firefox**: Not supported (uses different extension API)
- **Safari**: Not supported (uses different extension API)

## Performance

- **Memory Usage**: ~5-10 MB RAM
- **Conversion Speed**: Near-instant for typical images
- **Offscreen API**: Efficient, doesn't block main thread
- **Lazy Loading**: Settings loaded on demand

## Limitations

- Requires Chrome/Chromium browser
- Images must be accessible via HTTP/HTTPS
- Some images may fail due to CORS restrictions (rare)
- Very large images (>50MB) may cause performance issues

## Future Enhancements (Potential)

- Batch download support
- Additional output formats (WebP, AVIF)
- Image editing features
- Cloud storage integration
- More filename pattern options

