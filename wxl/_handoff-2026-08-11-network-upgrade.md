# Handoff — WXL:FOOD network upgrade execution (all phases)

Date: 2026-08-11
Mission: execute `plans/003-wxl-food-network-upgrade.md` phase by phase, starting at Phase 0.
Prior session: full-stack review of WXL (frontend, migrations 024–040, Netlify functions, coordination-api, matching-worker, all docs). Findings are baked in below — do not redo the review.
Shareable review+plan artifact (update in place via its URL): https://claude.ai/code/artifact/4d71fbef-8803-445b-ba0c-1d4917e253d2

## Ground rules

- Read `plans/003-wxl-food-network-upgrade.md` first — it is the canonical phase list. This handoff adds the file:line execution detail for Phases 0–1; Phases 2–5 follow the plan doc.
- Work phases in order: 0 → 1 → (2 and 5 may interleave) → 3 → 4. Phase 3 dispatch activation is gated on delivery-readiness evidence, not code.
- Never add a Supabase service-role key to the WXL Netlify site (`wxl/DEPLOY.md`, `wxl/HANDOFF.md` both mandate this).
- Vocabulary: Reciprocates / Contributors / Reciprocate groups. Never name specific AI models in public copy.
- Another Claude session may share this checkout: stage by explicit path, `git pull --rebase --autostash`, check reflog on anomalies.
- Do NOT commit unrelated worktree noise: the modified `netlify.toml`, `vercel.json`, `web/_redirects`, `web/sitemap.xml` (threehandshealing work), `DESIGN.md`, and untracked `clients/`, `services/onboarding`, `web/threehandshealing/`, `web/onboarding-wireframe/`, `funding/`, `.hermes/` belong to other workstreams.
- Tests: `cd wxl && npx vitest run` (baseline: 82 passing across 8 files). Build: `cd wxl && npm run build`.
- Commits: `feat(wxl):` / `fix(wxl):`, end body with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Deploys: wxl-food Netlify site (id `56ee91bf-bf15-472d-8c1c-d6c30af05d6c`) builds from `main`, base `wxl/`, publish `dist`. Verify deploys via the Netlify API, don't assume.

## Current git state (as of handoff)

- Branch: `agent/publish-wxlove-architecture`, fully pushed, **2 ahead / 4 behind** `origin/main`. The 2 WXL commits not on main: `ed9445b04` (mobile food experience) and `bba960892` (architecture map). Until merged, the live site lacks both.
- Untracked but load-bearing: `command/supabase/migrations/040_wxl_food_dropoffs.sql` (documented as applied to prod!), `plans/002-wxl-mobile-map-lab.md`, `plans/003-wxl-food-network-upgrade.md`, this handoff.

## Phase 0 checklist (do first, in this order)

**0.1 Land the branch**
- `git pull --rebase --autostash origin main` on this branch, resolve, then merge/PR to `main`. Confirm wxl-food Netlify deploy picks it up and `https://wxl.handprotocol.org/architecture/` goes live.

**0.2 Repo truth**
- `git add` migration 040 + plans/002 + plans/003 + this handoff; commit.
- Verify 040 against live Supabase schema (supabase MCP or psql) — docs claim it's applied; confirm before trusting DropoffBoard in prod.
- Create `.github/workflows/wxl-ci.yml`: on PR/push touching `wxl/**` → `npm ci && npx vitest run && npm run build` in `wxl/`. Docs (`wxl/HANDOFF.md:341`, `wxl/docs/LIVING-DOCS.md:424-430`) already claim this exists.
- Fix `wxl/DEPLOY.md:75`: `035_wxl_agent_protocols.sql` → `035_wxl_stripe_reconciliation.sql`.
- Write `wxl/docs/FOOD-SOURCE-AGENT.md` (battle-test gate for the source-intelligence agent; referenced at `wxl/HANDOFF.md:143`, `:599`, `LIVING-DOCS.md:23`) — content: human-review requirement + activation gate criteria.
- Refresh migration baseline 036→040 in `wxl/docs/COORDINATION-PROTOCOL.md` and `wxl/docs/DELIVERY-READINESS.md`.

**0.3 Frontend bug fixes** (all in `wxl/src/`)
- `App.tsx:358` — realtime alert toast calls `setToast` directly → never dismisses. Route through `notify()`.
- `App.tsx:505` — hand-builds new spot with `x:50,y:50` and drops lat/long → use `foodSpotToLocation` (`foodLocations.ts:65`).
- `App.tsx:525` + `:550` — `CommunityBoard` throws on empty `requests` array; guard both.
- `FoodMap.tsx:156-167` — visitor-position effect can append duplicate "you are here" markers; clear previous marker first.
- `App.tsx:786` — landing "I am a Contributor" link missing `mode=anonymous` (siblings have it).
- `CommunityTools.tsx:57-58` — AddSpotModal raw lat/long number inputs prefilled with Austin centroid → replace with the click-to-pin picker pattern from `DropoffBoard.tsx:37-119`.
- Add regression tests for each in the vitest suites.

**0.4 Backend hardening** — new migration `041_wxl_hardening.sql` + function edits
- Worker-guard tautology: `if current_user not in ('postgres','service_role')` inside SECURITY DEFINER always passes (current_user = owner). Fix in: `lease_food_outbox` (033:535), `complete_food_outbox` (033:552), `complete_food_match_run` (034:154), `begin_system_food_match_run` (034:183), `release_expired_food_match_holds` (034:195), `ingest_food_voice_message` (034:417), `plan_food_potluck` (034:442), `complete_food_a2a_task` (034:500), `enforce_food_retention` (034:513), `record_food_stripe_event` (035:11). Use a real caller check (JWT role claim / `session_user`) or rely purely on EXECUTE grants and delete the fake checks.
- Missing select policies: `food_match_runs`, `food_match_candidates`, `food_match_holds`, `food_agent_mandates` have RLS enabled (032:468-476) but no policy and no grant (032:491 grants only participants/needs/supplies/commitments). Add participant-scoped select policies + grants — this unblocks `/v1/matches|runs|mandates` and the `food_explain_match` tool (coordination-api `tools.ts:34-37`).
- `record_food_stripe_event` (035): the catch-all `exception when others` (035:54-57) rolls back the evidence insert (035:12), so the `processing_error` update matches zero rows while the API returns 200 → Stripe never retries and no evidence survives. Restructure so the evidence row persists (e.g. handler exception scope excludes the insert). Also stop setting `processed_at` (035:52) when no order/donation matched.
- Idempotency: add `request_hash` comparison (pattern at 032:393) to the nine commands that skip it — `create_food_potluck` (033:454), `request_food_match_run` (034:67), `transition_food_supply` (034:88), `create_food_location` (034:115), `create_food_venue` (034:135), `cancel_food_commitment` (034:212), `create_food_conversation` (034:304), `review_food_venue` (036:51), `create_food_subsidy_campaign` (036:107). Add the ≥8-char key check to `create_food_payment_order` (033:394).
- Re-issue bare `create policy` blocks idempotently (`drop policy if exists` first): 025:61-82, 029:339-342, 030:440-445, 031:377-380 — makes migrations README's replayability claim true.
- `wxl/netlify/functions/food-alert.mjs`: require caller to be the alert's author (it currently only checks the alert exists — any signed-in user can spam ops email for any active alert); add simple rate limiting to both functions (subscribe-updates is fully unauthenticated with only a honeypot).
- `wxl/netlify.toml`: add CSP, HSTS, X-Frame-Options, Referrer-Policy headers.
- Apply 041 to prod after review; note it in migrations README + DEPLOY.md.

## Phase 1 execution notes (the UX centerpiece)

Goal: a hungry person in Austin, any device, EN or ES, sees live data and live signals.

- **Live data**: `SimpleExperience` filters static `locations` (`App.tsx:135-139`, source `foodLocations.ts:27-36` — 8 hardcoded rows) → call `loadFoodSpots()` (`foodRepository.ts:399`) + merge, like `DashboardApp` (`App.tsx:347-351`) and `MapLab` (`MapLab.tsx:189-205`) already do.
- **One map**: `FoodMap.tsx` is the only real map. Retire the schematic CSS map on Overview (`App.tsx:465-474`) or clearly demote to illustration.
- **Alerts reach seekers**: realtime channel exists but is dashboard-only (`App.tsx:355-359`); surface FOOD IS HERE pins/banner in `SimpleExperience` + `MapLab product` with countdown from 6h expiry. Note `foodSpotToLocation` hardcodes `status:'plenty'` (`foodLocations.ts:72`).
- **EN/ES**: string-catalog i18n layer + context hook, browser detect + persisted toggle (HAND demos pattern, React-ified). All consumer surfaces + landing.
- **Router + structure**: real router (back button currently broken — no popstate handling, all cross-mode nav is full page loads), `AuthProvider` replacing three duplicated session effects (`App.tsx:141-149`, `:363-372`, `MapLab.tsx:207-215`), split `App.tsx` (948 lines, six components) into files. Preserve URL contract: `/app`, `?mode=`, `?intent=`, `?workspace=`, `localStorage['wxl:experience-mode']`.
- **Honest Overview**: replace sample metrics with real queries where they exist (open requests, active alerts, verified sources, drop-offs, completed runs); remove dead controls — Impact reports nav (`App.tsx:446`, no handler), unbound topbar search (`App.tsx:453`), "Build a basket" toast (`App.tsx:486`). Sidebar badge `count="18"` is a string constant (`App.tsx:440`); SourceBoard "42 verified sources" is a literal (`App.tsx:738`).
- **One vocabulary**: unify three filter taxonomies (simple `App.tsx:108,203` / map-lab / dashboard `App.tsx:463`) → All · Verified · Community reports · Food here now.

## Phases 2–5

Follow `plans/003-wxl-food-network-upgrade.md` sections. Key execution facts discovered in review:

- Phase 2: `food_events` is granted to `anon` for reads (033:596); `respond_food_event_invite` auto-waitlists (033:489). `food_partners` (024:5) currently has ZERO readers — it's the partner-directory backbone. Gather tab is 3 hardcoded tuples (`App.tsx:233`) with no backend.
- Phase 3: coordination-api + workers have Dockerfiles; deploy to the OVH box (kohlabs-ovh skill) at `coordination.wxl.handprotocol.org`. ProtocolBoard currently POSTs raw JSON-RPC to `/mcp` from the browser (`coordinationApi.ts:45-50`) with `crypto.randomUUID()` idempotency keys per attempt (defeats dedup) — move to REST routes + content-derived keys. `can_manage_food_operations()` (030:85) is just `role='admin'` — add a coordinator role. Boards are manual-refresh only; add Supabase realtime. Ops boards' "not configured" states leak migration numbers to users. Worker crash risk: `complete_food_outbox` raises on lost lease and neither worker loop has an outer try (`payment-worker.ts:57`, `event-worker.ts:22`).
- Phase 4: `routing.py` (CVRPTW) in matching-worker is written + tested but never imported — wire into harvest-run planning. `money.ts orderBreakdown` is dead code (fee math lives in DB constraints 033:78-82). Subsidy path (`apply_food_subsidy` 033:427) has no caller anywhere.
- Phase 5: implement `wxl/docs/WXLOVE-THEME-OPTIMIZATION.md` (draft, NOT implemented): forest accent, coral = wordmark X + heart only, amber ≤5%, add `--color-danger: #c0392b`. Consolidate: 5 button systems, 6 empty-state implementations, 3 modal-dismiss idioms. Dashboard has zero `:focus-visible` styles; dialogs lack focus traps/Escape; ≤720px dashboard media query (`styles.css:149`) shrinks type to 8–10px. Google Fonts `@import` at `styles.css:1` is render-blocking.

## Success measures (from completed records only — DELIVERY-READINESS rule)

- Time-to-food p50 < 60s, EN + ES · alert reach % · concurrent coordinator sessions without refresh · verified partners / active supplies / fulfilled matches / compost lbs returned.
