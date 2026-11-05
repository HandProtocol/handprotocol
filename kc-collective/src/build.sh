#!/usr/bin/env bash
# Builds the React islands for the KC Collective design directions.
# Sources:  kc-collective/src/<direction>/app.jsx   (this folder)
# Outputs:  web/kc-collective/styles/<direction>/app.js
# Vendor:   web/kc-collective/styles/vendor/react.js  (React 19 + react-dom/client, exposes window.React / window.ReactDOMClient)
#
# Needs esbuild and react in node_modules (npm i -D esbuild react react-dom). No other tooling.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
OUT="$ROOT/web/kc-collective/styles"
ESBUILD="${ESBUILD:-npx esbuild}"

$ESBUILD "$HERE/vendor/entry.js" --bundle --minify --format=iife \
  --define:process.env.NODE_ENV='"production"' \
  --outfile="$OUT/vendor/react.js" --log-level=warning

for d in garden oracle ripple scrapbook constellation nightbloom moonflower; do
  [ -f "$HERE/$d/app.jsx" ] || continue
  $ESBUILD "$HERE/$d/app.jsx" --bundle --minify --format=iife \
    --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment \
    --target=es2019 --outfile="$OUT/$d/app.js" --log-level=warning
  echo "built $d"
done
