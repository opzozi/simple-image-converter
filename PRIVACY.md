# Privacy Policy for Simple Image Converter

**Last Updated:** December 4, 2025

## Overview

Simple Image Converter is committed to protecting your privacy. This privacy policy explains our practices regarding data collection and use.

## Data Collection

**We DO NOT collect, store, or transmit any personal data.**

### What We Don't Collect:
- No personal information
- No browsing history
- No image data or content
- No usage statistics or analytics
- No cookies or tracking mechanisms

## How the Extension Works

The extension operates entirely locally on your device:

1. When you right-click on an image and select "Save Image as PNG"
2. The image is processed locally using Canvas API
3. The converted PNG is saved directly to your device
4. **No data leaves your computer**

## Permissions Explanation

The extension requires the following permissions:

### `contextMenus`
- **Purpose:** To add the "Save Image as PNG" option to the right-click menu
- **Data Access:** None

### `downloads`
- **Purpose:** To save the converted PNG file to your device
- **Data Access:** None (only triggers the browser's download dialog)

### `offscreen`
- **Purpose:** To create an offscreen document for Canvas API access (image conversion)
- **Data Access:** None

### `<all_urls>` (host_permissions)
- **Purpose:** To load images from any website for conversion (CORS handling)
- **Data Access:** Only the specific image you choose to convert
- **Note:** The image is processed locally and not sent anywhere

## Third-Party Services

This extension does NOT use any third-party services, analytics, or tracking tools.

## Data Storage

The extension does not store any data. All image processing happens in real-time and nothing is saved or cached.

## Updates to This Policy

Any changes to this privacy policy will be updated on this page with a new "Last Updated" date.

## Open Source

This extension is open source. You can review the complete source code to verify our privacy claims:
- GitHub: [https://github.com/opzozi/simple-image-converter](https://github.com/opzozi/simple-image-converter)

## Contact

If you have any questions about this privacy policy, please open an issue on our GitHub repository.

## Consent

By using this extension, you consent to this privacy policy.

