# Resume note (paused 2026-06-10 near token limits)

State when paused, what's NOT done, in priority order:

1. **Deploy to main NOT done for wave 2 + ring.** 174 new demos exist locally +
   in Supabase (status=built) but only the East 34 are live. Resume: stage
   biz/<slug>+web/demos/<slug> for slugs in campaign austin-food-trucks +
   atx-ring-food-trucks, commit, cherry-pick to main via detached worktree
   (skill Phase 5). Also deploy the Field Mode commit (7bb1ec3 content:
   biz-portfolio.js, web/demos/index.html, biz-pitch-response.js) with it.
2. **Photo pipeline is WIP, unverified.** scrape-photos.mts + site-template.ts +
   generate-site.mts changes were mid-verification when stopped (screenshot
   timing issue: give the headless shot a wait/virtual-time budget so images
   load). Only 3 slugs have photos (las-trancas, tonys-jamaican, mamas-tacos,
   regenerated with the NEW template, unverified — do NOT deploy those 3 demo
   files until visually checked). Backfill for the other 205 slugs not run.
3. **Migration 021** (pitch response channel) not applied to Supabase (CLI not
   linked; function tolerates absence).
4. **HandAI features** committed on nerve repo branch feat/develop-digest-field-mode,
   NOT pushed/deployed (deploy steps in that branch's session log / agent report).
5. **Premium /impeccable upgrades** for top leads not started (wait for photos).
6. Slug lists for the batches live in the campaign frontmatter (grep
   "^campaign:" biz/*/lead.md) — /tmp data may be gone.
7. **Census recheck pool**: 908 of 2,194 checks errored (timeouts + network
   drop), so the 196-qualified list undercounts; ~476 errored places showed no
   site on the discovery card. Re-shard rows with website_status=error from
   /tmp/atx-census/checked-*.ndjson (or the registry) through check-websites.mts.
