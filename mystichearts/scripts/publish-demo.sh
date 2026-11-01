#!/usr/bin/env bash
# Build the gated demo (handprotocol.org/mystichearts/demo) and copy it over web/.
# The production koordi address and the Mystic Hearts publishable key come from
# .env.production; passing them on the command line keeps .env.local (the local koordi
# and its demo key) out of the export. Commit web/mystichearts/demo afterwards; the
# public site deploys web/ from main.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.production; set +a
NEXT_PUBLIC_BASE_PATH=/mystichearts/demo npx next build
rsync -a --delete out/ ../web/mystichearts/demo/
if grep -rqs "localhost:4747" ../web/mystichearts/demo; then echo "the export points at a local koordi; stop" >&2; exit 1; fi
echo "demo export synced to web/mystichearts/demo"
