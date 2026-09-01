#!/usr/bin/env bash
set -euo pipefail

VERSION=$(node -p "require('./manifest.json').version")
PACKAGE="release/simple-image-converter-v${VERSION}.zip"
TEMP="temp-release-${VERSION}"

echo "Simple Image Converter — release package v${VERSION}"

if [[ ! -d dist ]]; then
  echo "ERROR: dist/ not found. Run: npm run build" >&2
  exit 1
fi

rm -rf "$TEMP"
mkdir -p "$TEMP" release

cp dist/manifest.json dist/background.js dist/offscreen.html dist/offscreen.js \
   dist/popup.html dist/popup.css dist/popup.js \
   dist/options.html dist/options.css dist/options.js \
   dist/copy-helper.js "$TEMP/"
cp -r dist/_locales dist/icons "$TEMP/"
cp LICENSE PRIVACY.md "$TEMP/"

for chunk in dist/client-*.js; do
  [[ -f "$chunk" ]] && cp "$chunk" "$TEMP/"
done

rm -f "$PACKAGE"
(cd "$TEMP" && zip -r "../$PACKAGE" . -q)
rm -rf "$TEMP"

SIZE=$(du -h "$PACKAGE" | cut -f1)
echo "Created: $PACKAGE ($SIZE)"
