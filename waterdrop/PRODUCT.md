# WaterDrop — Product Context

register: product

WaterDrop is a mobile-first PWA for stewardship of the San Marcos River paddling corridor (City Park, San Marcos → Zedler Mill Dam, Luling — roughly 45 river miles per the TG Canoes & Kayaks shuttle map). The interactive river map is the hero. One map serves two audiences who share the same corridor.

## Users

**The float planner (public).** A paddler standing on a gravel bar in bright Texas midday sun, phone out, deciding whether to put in. They want: where can I legally launch and take out, how far is the run, how many hours will it take, what hazards are between here and there, and is the river runnable right now. They are often non-technical, sometimes first-timers renting from an outfitter, frequently on cellular with one hand free. Glare, wet hands, and impatience are the real operating conditions.

**The river crew (authenticated).** A volunteer or staff steward who paddles the routes on a schedule and records what they find: photos, field notes, species sightings, water-quality samples (temp, pH, turbidity, dissolved O2, conductivity), and contamination flags. They work the same corridor at dawn or dusk under tree canopy, log from a moving boat or a bank, and need capture to be fast, GPS-stamped, and reliable offline. Their observations make the planner's map trustworthy.

The crew is a small, known group in v1 (passcode gate, local-first storage). Real accounts and sync arrive later (Supabase phase). The public never sees a login wall; crew tools reveal progressively.

## Product Purpose

Turn a hand-drawn shuttle map and scattered river knowledge into one living, trustworthy map of the corridor — so a stranger can plan a safe float in under a minute, and a steward can log the river's condition in the field without fighting the tool. Live USGS gauge data makes "is it runnable?" an answer, not a guess. Crew observations make stewardship visible over time.

## Brand Personality

Field-guide, not dashboard. Trail-sign clarity. The feeling of a well-made paper river map and a ranger's weatherproof notebook, rendered for a phone in sunlight. Calm, legible, outdoors-competent. Rooted in *this* river: the San Marcos is one of the clearest spring-fed rivers in Texas, a distinctive clear emerald-green over pale limestone, lined with bald cypress. The product should feel like it belongs to that place, not like a generic water/eco SaaS.

Tone of voice: plainspoken and trail-confident. "Runnable today." "Portage left — dam." "Too low to float." Never cute, never corporate. Numbers are honest (miles, hours, CFS, gage height).

## Anti-references

- Generic "water = sky-blue + teal gradient" eco/health SaaS. The San Marcos is emerald over limestone, not corporate cyan.
- Hero-metric marketing dashboards (giant number + gradient + supporting stats).
- Map apps that bury the map under chrome, cards, and panels. The map is the product; UI yields to it.
- Gamified outdoor apps (badges, streaks, confetti). Stewardship is earnest, not a game.
- Adventure-brand grunge (distressed textures, all-caps condensed shouting over photos).
- Identical icon-heading-text card grids.

## Design Principles (strategic)

1. **The map is the surface; everything else is an overlay.** Chrome is minimal and yields to the water. A bottom sheet, not a wall of cards.
2. **Sunlight-legible first.** Designed to be read outdoors at arm's length: high contrast, large touch targets, honest type sizes. This is a usability constraint, not a style choice.
3. **One glance to "can I float?"** Conditions resolve to a plain verdict (runnable / low / high) before any chart or number.
4. **Capture must never lose data.** Crew logging is local-first and offline-safe; a sample taken with no signal still saves.
5. **Familiar map affordances, place-specific identity.** Standard pan/zoom/sheet patterns; color and detail drawn from the real river, never reinvented controls for flavor.
6. **Honest over decorative.** Real distances, real flow, real hazards. No invented affordances, no decoration masquerading as data.

## Accessibility & Inclusion

- WCAG 2.1 AA minimum; target AAA contrast for primary readouts (verdicts, mileage, flow) because the device is used in direct sun.
- Touch targets ≥ 44px; primary field actions ≥ 56px for wet-hand / one-hand use.
- Color is never the only signal — conditions and hazards carry text/icon labels alongside hue (color-blind safe).
- Full keyboard path and visible focus for desktop/planning use; map controls operable without a mouse.
- Respect `prefers-reduced-motion`; motion only ever conveys state.
- Works offline and on slow cellular; degrades gracefully when USGS is unreachable (show last-known with timestamp, never a dead screen).
