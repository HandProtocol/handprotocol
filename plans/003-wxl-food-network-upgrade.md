# Plan 003 — WXL:FOOD network upgrade: best-in-class food distribution UX + backend

Status: PROPOSED
Date: 2026-08-10
Scope: `wxl/` app, `command/supabase/migrations/024–040`, `wxl/services/*`, docs

## Why

Full-stack review (2026-08-10) found a strong, honest foundation with a split personality:

- **Backend is ahead of the frontend.** Migrations 024–040 model the entire network — spots, alerts, requests/offers, rescues with safety checkpoints, contributor readiness, harvest runs with compost returns, inventory custody, drop-offs — all wired browser→RPC. A second-generation coordination protocol (032–036: needs/supplies, OR-Tools matching, commitments, payments, potlucks, agent mandates, voice) is implemented but undeployed.
- **The people the app serves see the least of it.** Desktop "find food" filters a static 8-location array and never loads live `food_spots`. "FOOD IS HERE" realtime alerts render only in the coordinator dashboard — never on the consumer map or mobile. The default advanced Overview is ~80% sample data. There is no Spanish anywhere.
- **Real defects found** (frontend: permanently pinned alert toast, new spots dropping coordinates, empty-array crash path; backend: tautological worker guards, dead select policies on match tables, Stripe reconciliation that swallows failed events and tells Stripe 200, inconsistent idempotency, `food-alert` email trigger any signed-in user can fire for any alert).
- **Repo drift**: migration 040 documented as applied to prod but untracked in git; claimed CI workflow doesn't exist; `docs/FOOD-SOURCE-AGENT.md` referenced three times but never written; DEPLOY.md names a nonexistent 035 file; the two newest WXL commits (mobile experience, architecture map) sit on `agent/publish-wxlove-architecture`, not `main`.

The plan follows the project's own delivery ladder (Directory → Signals → Partner pilot → Austin network) and its core rule: *agent judgment proposes, deterministic checks decide.*

## Phase 0 — Land what's built, fix what's broken (days)

Repo truth:
1. Rebase `agent/publish-wxlove-architecture` on `main` (2 ahead / 4 behind), merge. Live site then has the mobile food experience + `/architecture/` map.
2. `git add` migration `040_wxl_food_dropoffs.sql` + `plans/002`; verify 040 against live Supabase schema.
3. Create `.github/workflows/wxl-ci.yml` (vitest + production build on `wxl/**` changes) — docs already claim it exists; make it true.
4. Fix DEPLOY.md step naming `035_wxl_agent_protocols.sql` → `035_wxl_stripe_reconciliation.sql`. Write `docs/FOOD-SOURCE-AGENT.md` (the battle-test gate is load-bearing and referenced 3×) or strip the references. Refresh COORDINATION-PROTOCOL / DELIVERY-READINESS baselines from 036 → 040.

Frontend bugs:
5. Realtime alert toast uses `setToast` directly → never dismisses (`App.tsx:358`); route through `notify()`.
6. `AddSpotModal` flow drops lat/long and pins new spots at schematic center (`App.tsx:505`); use `foodSpotToLocation`. Replace raw lat/long number inputs with the click-to-pin picker that already exists in `DropoffBoard.tsx:37–119`.
7. `CommunityBoard` throws on empty `requests` (`App.tsx:525,550`); guard.
8. `FoodMap` visitor-position effect can append duplicate "you are here" markers (`FoodMap.tsx:156–167`); clear before add.
9. Landing "I am a Contributor" link missing `mode=anonymous` (`App.tsx:786`).

Backend hardening (migration 041 + function edits):
10. Replace the `current_user` worker guards (always-true inside SECURITY DEFINER) with `session_user` / JWT-role checks across the ten functions in 033–035.
11. Add the missing select policies for `food_match_runs`, `food_match_candidates`, `food_match_holds`, `food_agent_mandates` (or remove the `/v1/matches|runs|mandates` routes + `food_explain_match` tool until they exist).
12. Fix `record_food_stripe_event`: persist the evidence row and `processing_error` outside the rolled-back exception scope; stop setting `processed_at` when nothing matched.
13. `food-alert.mjs`: require the caller to be the alert author; add basic rate limiting to both Netlify functions.
14. Idempotency pass: add `request_hash` comparison to the nine receipt commands that skip it; add the missing ≥8-char key check to `create_food_payment_order`.
15. Re-issue the bare `create policy` statements in 025/029/030/031 idempotently (`drop policy if exists` first) so the migrations README's replayability claim is true.
16. Add security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy) to `wxl/netlify.toml`.

## Phase 1 — One live food-finding loop (1–2 weeks) — the UX centerpiece

Goal: a hungry person in Austin, on any device, in English or Spanish, sees live data and live signals.

1. **Live data everywhere.** `SimpleExperience` loads `food_spots` like MapLab and the dashboard already do. One Leaflet map component across simple/mobile/dashboard; retire the schematic CSS map (keep as illustration only, clearly labeled) or replace Overview's map with real Leaflet.
2. **Alerts reach food seekers.** "FOOD IS HERE" pins + banner on the simple finder and mobile MapLab, using the realtime channel that already exists for the dashboard. Freshness countdown from the 6-hour expiry.
3. **Bilingual EN/ES** across landing + consumer surfaces: lightweight i18n layer (string catalog + context hook), browser-language detect + persistent toggle — the proven HAND demos pattern, adapted for React. This is the single largest reach gap for an Austin food-access product.
4. **Routing + structure** (pulled forward from HANDOFF P3 because everything else lands on top of it): a real router (back button, deep links, no full-page reloads), an `AuthProvider` replacing the three duplicated session effects, `App.tsx` split into files per component. Keep the URL contract (`/app`, `?mode=`, `?intent=`) working.
5. **Honest Overview.** Wire real counts that already have queries — open requests, active alerts, verified sources, drop-offs this week, completed runs — and fold remaining fiction behind explicit "sample" framing per DELIVERY-READINESS. Remove or implement the dead controls (Impact reports nav item, unbound topbar search, "Build a basket").
6. **One vocabulary.** Unify the three filter taxonomies (simple / map-lab / dashboard) to: All · Verified · Community reports · Food here now.

## Phase 2 — Complete the community loop (2–3 weeks)

1. Notifications: per-neighborhood alert email opt-in (Resend audience already wired), request-activity notifications.
2. Moderation: coordinator takedown/queue for community spots, requests, drop-offs; a report control on public content.
3. Requests: editing, pagination, consent-based contact handoff (protocol already specifies the consent model).
4. **Gather becomes real.** Back the gather tab with `food_events`/`food_venues` (033 — already granted to `anon` for reads) or a thin Gen-1 gatherings table; RSVP via `respond_food_event_invite` with its auto-waitlist.
5. Nominations read-back: "your nominations" status list; surface `food_partners` (currently zero readers) as the verified partner directory feeding map pins.

## Phase 3 — Coordinator operations & dispatch readiness (3–4 weeks, evidence-gated)

1. **Deploy the coordination stack**: `coordination-api` + event/payment/retention workers + OR-Tools `matching-worker` as Docker services on the existing OVH box (Dockerfiles exist), at `coordination.wxl.handprotocol.org`. ProtocolBoard moves off browser JSON-RPC `/mcp` calls to the REST routes, with deterministic idempotency keys derived from form content (current `crypto.randomUUID()` per attempt defeats dedup).
2. **Realtime coordination**: Supabase realtime on rescues/runs/inventory so two coordinators see each other's changes; today every board is manual-refresh.
3. **Coordinator role** distinct from `admin` in `command.profiles`/`can_manage_food_operations` (the API's scope system and the DB role system also need to agree).
4. **Volunteer mobile flow**: claim → checkpoint (temperature checks) → complete, designed phone-first; responsive pass on the operational boards (currently 8–10px type under 720px).
5. **Delivery-readiness evidence march**: the 8-row evidence table, 12 runbooks, Austin Public Health Charitable Feeding Organization classification, acceptance SQL (`food_protocol_acceptance.sql`) run in CI. Dispatch stays gated until these pass — per the project's own rule.
6. **SMS lane** (the protocol's declared next scope): Twilio SMS adapter mirroring `voice.ts`; consent + quiet hours already modeled in `food_contact_channels`; remove the `sms` rejection in 036 behind a lane-readiness decision.

## Phase 4 — Farms, matching, and the full circle (4+ weeks)

1. **Farm/source intake**: recurring supply postings (`food_supplies`), pickup windows, gleaning events; onboarding flow that feeds `food_partners`.
2. **Activate matching**: needs↔supplies min-cost-flow live for the aid lane; fix the match-table select policies first so `food_explain_match` and `/v1/matches` actually return rows — explainable matching is a differentiator.
3. **Route optimization**: wire `routing.py` (CVRPTW — written, tested, never imported) into harvest-run planning: multi-stop ordering, time windows, capacity.
4. **Close the soil loop in the UX**: compost returns (037–039) surfaced to farms — food → table → soil → farm. Strong grant story.
5. **Paid marketplace + potluck lanes** activate only behind `food_lane_readiness` go decisions (already modeled); Stripe activation follows the reconciliation fix in Phase 0.
6. **Impact from completed records only**: meals/pounds/households computed from fulfillments, drop-offs, completed runs, compost weights — replacing every sample metric; public impact page.

## Phase 5 — Design system & WXLove polish (parallel, ongoing)

1. Implement the drafted `WXLOVE-THEME-OPTIMIZATION.md`: forest green accent, coral reserved for wordmark X + heart, HAND amber ≤5%, `--color-danger` token.
2. Consolidate tokens (hundreds of raw hex → scale), one button system (currently 5), one empty-state component (currently 6), one modal-dismiss idiom (currently 3).
3. Accessibility: `:focus-visible` across the dashboard (currently none), focus traps + Escape on all dialogs, minimum 12px type, WCAG 2.1 AA pass.
4. Replace the render-blocking Google Fonts `@import` with preconnect + `<link>`.

## Sequencing note

Phases 0–1 are prerequisites for everything and independently shippable. 2 and 5 can run parallel to 3. Phase 3's dispatch activation is gated on delivery-readiness evidence, not code. Phase 4 depends on Phase 3's service deployment.

## Success measures (from completed records, per DELIVERY-READINESS)

- Time-to-food: landing → directions to a verified open source, p50 under 60 seconds, EN and ES.
- Alert reach: % of active "FOOD IS HERE" alerts viewed by non-coordinator sessions while live.
- Coordination: two-coordinator concurrent board sessions without manual refresh; claim→completion cycle recorded end-to-end with checkpoints.
- Network: verified partners (real count), active supply postings, matched-and-fulfilled needs, compost pounds returned.
