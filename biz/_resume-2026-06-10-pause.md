# Develop program state (handoff, updated 2026-06-11 end of session)

## Live and verified
- 208 demos live on handprotocol.org/demos/<slug>/ (campaigns: east-austin-food-trucks 34, austin-food-trucks 99, atx-ring-food-trucks 75), all on the new art-directed template, all with visit beacons. All verified 200.
- Image policy ENFORCED + encoded in the skill: public demos carry only licensed sample art (web/assets/biz-samples, LICENSES.md); scraped Maps photos live ONLY under gated pitch/img/ (top 40 leads pre-warmed, 401 without auth, verified).
- Field Mode v0 live on the gated /demos/ portfolio (hand/handme): Near me ranking, QR walk-up, proof pins.
- Migration 021 APPLIED (pitch_responses.channel; psql works: host db.<ref>.supabase.co, password is SUPABASE_DB_PASSWORD in command/.env.local).
- HandAI deployed on OVH (nerve main 5ca8a93): bulk digest (>5 events), 🔥 hot-lead alerts (3+ visits/24h on built), location-pin → top-5 nearest leads in Telegram.
- Census: biz/_prospects-austin-far-and-wide.md (196 qualified; work panaderias → auto repair → barbers). Registry: biz/_registry/checked-places.ndjson (3,117 places).
- Service ladder plan: biz/_plan-develop-service-ladder.md (social automation next at 3 closed clients, then rewards PWA).

## Open items (priority order)
1. **Phones are Maps-card sourced, human-unconfirmed** on all 208 demos' tel: links. Spot-check before/at each call (standing skill rule).
2. **Hand-built demo imagery audit (operator review)**: 10 of 12 hand-built demos (969foodtruck, eds-hair, etc.) show business imagery predating the policy; most were operator-provided, verify provenance per slug, swap any Maps-scraped ones to pitch/img.
3. **Census recheck pool**: 908 errored checks (~476 promising). Re-shard website_status=error rows from the registry through check-websites.mts.
4. **Spanish pitches**: --lang=es exists; generate for the taqueria-heavy campaigns when callers want them.
5. **Premium /impeccable upgrades** for top leads (use their pitch/img photos as the design seed AFTER close/permission, or sample art before).
6. **Backend hardening agent** (UI route parity + Supabase retry) may still be finishing; land its diff, run `cd command && npx tsc --noEmit && npx next build` + `npx tsx scripts/test-develop.ts`, cherry-pick to main.
7. **next wave discovery**: registry-aware (`discover-leads.mts --skip-known`).

## How to deploy (the settled machinery)
Feature branch → `git worktree add --detach /tmp/hp-deploy origin/main` → checkout paths from the feat commit → commit → `push origin HEAD:main` → worktree remove. Public site auto-deploys from main. Verify demo 200/beacon, pitch 401/200, pitch img 401, portfolio 401/200.
