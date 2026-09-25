# Privacy Policy

**Last Updated:** September 25, 2026

## Short Version

This extension doesn't collect personal information, browsing history, or analytics. Conversion is 100% offline and happens on your computer. Fetching the image is a network request to the image URL.

## What We Don't Do

- No personal information collection
- No browsing history tracking
- No image data storage
- No analytics or usage statistics
- No tracking, and this extension does not set cookies
- No third-party analytics or cloud conversion

## How It Works

When you right-click an image and choose save or copy, as PNG or JPEG:

1. The image is loaded from its URL. For an http or https image, that download is a network request to the image host. **Use credentials when fetching images** is on by default, so the request can send your cookies to that host. Turn the setting off in Settings and the download goes out without cookies.
2. The image is converted to PNG or JPEG with the Canvas API on your computer.
3. Save writes the PNG or JPEG to your device. Copy places it on your clipboard.
4. The converted image stays on your device. It is not uploaded for conversion or analytics.

Conversion stays on your device. The network request is the one that fetches the image you chose.

## Permissions

**`contextMenus`** — Adds save and copy to the right-click menu. The label shows PNG or JPEG, matching your setting.

**`downloads`** — Saves the converted PNG or JPEG file.

**`clipboardWrite`** — Copies the converted PNG or JPEG to the clipboard.

**`offscreen`** — Uses the Canvas API to convert images, and can write the clipboard (required by Chrome).

**`scripting`** — Runs a small script in the page if offscreen conversion does not finish in time, and injects the copy helper so clipboard copy can run from your click. That injection is limited to normal websites, and skips Chrome-internal pages and the Chrome Web Store.

**`storage`** — Saves your settings in Chrome (`chrome.storage.sync`): format, quality, filename pattern, and similar options. Your images are not stored there. If Chrome sync is on, those settings can sync with your Google account.

**`<all_urls>`** — Loads the image you choose from any website so it can be converted. Only that image is fetched, and conversion stays on your computer.

## Open Source

The code is open source. You can check it yourself:
- GitHub: [https://github.com/opzozi/simple-image-converter](https://github.com/opzozi/simple-image-converter)

## Questions?

Open an issue on GitHub if you have questions.
