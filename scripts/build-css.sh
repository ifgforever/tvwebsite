#!/bin/sh
# Regenerate css/tailwind.min.css from the site's actual HTML/JS content.
#
# Run this any time Tailwind utility classes are added/changed anywhere in
# the site, then commit the updated css/tailwind.min.css -- Cloudflare Pages
# serves it as a static file, there is no build step at deploy time.
#
# Uses the Tailwind standalone CLI binary (scripts/bin/tailwindcss), not
# npm/node_modules, since this repo has no other JS tooling.
set -e
cd "$(dirname "$0")/.."

BIN=./scripts/bin/tailwindcss
if [ ! -x "$BIN" ]; then
  echo "Downloading Tailwind standalone CLI (v3.4.17, macOS arm64)..."
  mkdir -p ./scripts/bin
  curl -sL -o "$BIN" "https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-macos-arm64"
  chmod +x "$BIN"
fi

"$BIN" -i ./css/tailwind-input.css -o ./css/tailwind.min.css --minify
echo "Built css/tailwind.min.css"
