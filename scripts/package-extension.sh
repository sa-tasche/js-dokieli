#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./manifest.json').version")
DIST="dist"
ZIP="dokieli-extension-${VERSION}.zip"

echo "Building dokieli extension v${VERSION}"

yarn minify

rm -rf "$DIST"
mkdir -p "$DIST"

cp manifest.json popup.html new.html docs.html extension-content-script.js "$DIST/"

mkdir -p "$DIST/scripts"
find scripts -maxdepth 1 -type f ! -name '*.map' ! -name '*.sh' -exec cp {} "$DIST/scripts/" \;

cp -r media locales "$DIST/"

rm -f "$ZIP"
(cd "$DIST" && zip -qr "../$ZIP" .)

echo "Wrote: $ZIP ($(du -h "$ZIP" | cut -f1))"
