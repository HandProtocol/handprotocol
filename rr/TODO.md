# Reimagine Ranch — Build Roadmap & TODO

Living checklist for RR builds. Internal. Created 2026-05-30. Anchored on the compost latrine
(see [`research/compost-latrine.md`](./research/compost-latrine.md)); cooling/envelope/day-build
items below are **future work — captured, not yet started.**

---

## In flight (compost latrine)

- [x] Parameterized massing model — `compost_latrine.py` with `--layout` × `--vent` × `--upgrade`
- [x] Layout variants: **3×3** (3 bathrooms) and **2×2** (2 bathrooms)
- [x] Rainwater upgrade (gutter → tank → 1 shower per stall)
- [x] Powered vent versions: `stackfan` (small stacks — **preferred**), `solarchimney`, `cupola`
- [x] Angled louvered crown wrapping all four sides (replaces forward-facing slats)
- [ ] **Full render set for every option** (layouts × vents × upgrades) — *next*
- [ ] **Proposal page** (`web/reimagineranch/compost-latrine/`) with:
  - [ ] **Vent-options** section — lead with the small-stack `stackfan`
  - [ ] **2-vs-3 bathroom** layout options
- [ ] Commit model + renders + research docs; sync `compost-latrine.md` with layout/vent/upgrade flags
- [ ] Lumber buy → see [`research/lumber-procurement-proposal.md`](./research/lumber-procurement-proposal.md)

---

## NEXT UP — Louvered cedar wall panel (from reference photo)

- [ ] Recreate the **framed horizontal-louver wall** (reference photo, 2026-05-30): a full-height
  cedar **shutter-style louver panel** — closely-spaced **horizontal angled blades** (tilted
  down-and-out) filling a post-and-rail frame (2× side posts + top/bottom rails), standing on an
  **open base frame** (a 2× sill frame with a couple of cross members, panel raised slightly off
  the ground). Light construction-lumber frame, clear-cedar louvers.
  - Likely uses: the latrine's side privacy screen / a standalone wash-screen / a wall system.
  - Reuse the angled-blade geometry (the `_blade_x`/`_blade_y` louver idea from the crown work)
    at full-wall scale, framed. Probably its own small Blender script + a tweakable config like
    `crown_config.py`.

---

## LATER — Passive cooling & comfort (tiered, upgrade-in-place)

Goal: keep the rooms **cool passively, with no technical features** at the base, then offer
**minimal** upgrade tiers. Same "build once, upgrade in place" posture as the structure/vent.

- [ ] **Tier 1 — Permaculture passive (most sustainable, no tech).** Design brief to explore:
  earth-coupling / earth tubes, thermal mass, deep shade + big overhang, cross-ventilation + stack
  effect (pairs with the vent crown), evaporative cooling (water feature / olla / wet-screen),
  trellis + living shade, and orientation. **Must be CLOSEABLE** — a seasonal damper/shutter to
  *shut the cooling off* in winter. **Optional passive heating element** for cold snaps (thermal
  mass / Trombe-style solar gain / closeable south glazing).
- [ ] **Tier 2 — Slight tech.** Add small **cooling + heating elements** (e.g., low-watt solar
  fan-assist on the passive paths, a small radiant/resistive heat element). Minimal, off-grid-friendly.
- [ ] **Tier 3 — Premium.** More expensive active **cooling + heating** (e.g., mini-split / proper
  conditioned comfort). The funded, all-weather version.
- [ ] Model these as flags (e.g. `--comfort=passive|lite|premium`) like the vent/upgrade pattern.

## LATER — Envelope design

- [ ] Continue the **envelope design** (insulation, air-sealing, cladding) so it actually supports
  the cooling tiers above. Sequenced *after* the cooling concept is chosen.

## LATER — "Day Build" permaculture bathroom

- [ ] A **super low-tech, high-performing, highly deployable** bathroom **buildable in a day** —
  minimal materials, minimal/no power tools, permaculture cover system. A rapid-deploy sibling to
  the full latrine (own research doc + own massing model when started).

## LATER — Site / web

- [ ] **Info / design-index section** on the RR site that links to **all the designs** — a hub you
  can navigate to each build and each option (latrine layouts, vents, cooling tiers, day-build).

---

### Notes
- Tier language is deliberate: **Tier 1 = most sustainable/permaculture**, ascending to more tech +
  cost. Cooling must be **closeable**; heating is an **option at every tier**.
- Keep all of it honest to RR voice: lead with land/community/sustainability; only claim adjectives
  the design truly earns.
