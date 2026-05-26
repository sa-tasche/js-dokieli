#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./manifest.json').version")
ZIP="dokieli-extension-${VERSION}.zip"

echo "Building dokieli extension v${VERSION}"

yarn minify

rm -f "$ZIP"
{
  git ls-files
  find scripts -maxdepth 1 -type f -name '*.js'
} | sort -u | zip -q "$ZIP" -@

echo "Wrote: $ZIP ($(du -h "$ZIP" | cut -f1))"
