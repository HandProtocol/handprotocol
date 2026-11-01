#!/usr/bin/env bash
# Build the site at the root path and deploy it to its own Netlify project
# ("mysticheartshealing", serving https://mhh.handprotocol.org). The koordi address, the
# Mystic Hearts publishable key and the Say hello endpoint come from .env.production;
# passing them on the command line keeps .env.local (the local koordi) out of the export.
# Always --site scoped: the hand repo is linked to the handprotocol site, so a bare deploy
# would overwrite handprotocol.org.
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_ID=42024948-6847-476f-9878-ef1dd6601261
set -a; . ./.env.production; set +a
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://mysticheartshealing.com}"
NEXT_PUBLIC_BASE_PATH= npx next build
if grep -rqs "localhost:4747" out; then echo "the export points at a local koordi; stop" >&2; exit 1; fi
TOKEN="${NETLIFY_AUTH_TOKEN:-$(python3 -c "import json;print(json.load(open('$HOME/.config/netlify/config.json'))['users']['65ff678f80077666077c6c55']['auth']['token'])")}"
# Deploy from a copy outside the repo: inside it the CLI reads the hand repo's netlify.toml,
# runs that build and bundles HAND's functions and edge functions with this site.
STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
cp -a out "$STAGE/site"
(cd "$STAGE" && NETLIFY_AUTH_TOKEN="$TOKEN" timeout 600 netlify deploy --prod --no-build --dir site --site "$SITE_ID" --message "${1:-publish}")
