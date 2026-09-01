# Privacy Policy

**Last Updated:** December 4, 2025

## Short Version

This extension doesn't collect, store, or send any data. Everything happens on your computer.

## What We Don't Do

- No personal information collection
- No browsing history tracking
- No image data storage
- No analytics or usage statistics
- No cookies or tracking
- No third-party services

## How It Works

When you right-click an image and select "Save Image as PNG":

1. The image is loaded from the website
2. It's converted to PNG using Canvas API (happens on your computer)
3. The PNG is saved to your device
4. Nothing is sent anywhere

All processing happens locally. No data leaves your computer.

## Permissions

**`contextMenus`** — Adds "Save Image as PNG" to right-click menu

**`downloads`** — Saves the converted PNG file

**`offscreen`** — Uses Canvas API to convert images (required by Chrome)

**`<all_urls>`** — Loads images from any website for conversion. Only the specific image you choose is accessed, and it's processed locally.

## Open Source

The code is open source. You can check it yourself:
- GitHub: [https://github.com/opzozi/simple-image-converter](https://github.com/opzozi/simple-image-converter)

## Questions?

Open an issue on GitHub if you have questions.
