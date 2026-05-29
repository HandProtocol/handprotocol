# Compost Sawdust Latrine — Build Research

*Reimagine Ranch · first build · research compiled 2026-05-29*

Companion research for the three-stall (one accessible + two standard), raised, accessible
**dry-cover (sawdust) composting latrine**. This is the source of truth for *system choice, dimensions, code, and materials*.
The web build report (`web/reimagineranch/compost-latrine/`) is the visual summary; the Blender
massing model (`rr/blender/`) is built from the dimensions locked in §7 here.

It mirrors the depth of the Airstream insulation research — read this before any conversation
about the toilet system, the ramp, the structure, ventilation, or material sourcing.

---

## 0. The pitch, in one sentence

> A waterless, three-stall, wheelchair-accessible latrine that turns the simplest possible inputs
> — a bucket, a scoop of sawdust — into safe compost, built on a raised cedar deck the community
> can frame in a weekend.

Waterless because the land is off-grid and water is precious. Raised because the compost has to
live *under* the throne and be removable. Accessible because "community land" that only serves
the able-bodied isn't community land.

---

## 1. The system: dry-cover ("sawdust") composting, three credible forms

A dry-cover toilet captures excreta in a chamber and the user covers each deposit with a carbon
material (sawdust, wood shavings, peat-free coir, dry leaf mould, rice hulls). The cover layer
is the entire trick: it blocks odor, balances the carbon-to-nitrogen ratio, soaks up moisture,
and forms an aerobic biofilter. **No water, no chemicals, no electricity required.** The
distinction between systems is *where and how the composting finishes.*

### 1a. Bucket / "Humanure" batch system (Joseph Jenkins method)
- **How:** 5-gallon bucket under a wooden throne; cover after each use; when full, carry to an
  outdoor **3-bin thermophilic compost** system; cure 12+ months.
- **Pros:** Cheapest, simplest, most resilient, infinitely repairable, no moving parts. Proven
  at scale (festivals, off-grid homesteads, disaster relief). Composting happens *outside* the
  building where it can get hot (130–150 °F kills pathogens).
- **Cons:** Requires committed human handling (someone hauls buckets and tends bins). Best with
  a trained steward, not anonymous public drop-in use.
- **Fit for RR:** **Strong** for a community with an active steward. The credit-loop can pay the
  bin-tending labor. This is the recommended v1 unless throughput says otherwise.

### 1b. Batch / moldering vault (twin-vault, alternating)
- **How:** Two sealed vaults under the deck. Use vault A until full, seal it, switch to vault B;
  by the time B is full, A has moldered (cool, slow compost) for a year and is safe to empty.
- **Pros:** No daily hauling — the chamber *is* the composter. Handles intermittent crowds well.
  The classic public-land / trailhead solution (cf. moldering privies, USFS/AT designs).
- **Cons:** Bigger build, needs real under-deck clearance and a removable hatch per vault, slower
  and cooler so it relies on time + the alternation discipline rather than heat.
- **Fit for RR:** **Strong** if drop-in/event use will outrun a bucket steward. Drives a taller
  deck (vault height) — see §7.

### 1c. Commercial continuous composter (Clivus Multrum / Sun-Mar / Nature's Head class)
- **How:** A manufactured composting chamber, often with a sloped floor, mixer, and (sometimes)
  a small fan/heater. Liquid often diverted.
- **Pros:** Engineered, code-legible, lower hands-on burden, easier to permit in some counties.
- **Cons:** $1.5k–$9k per unit, often wants power, proprietary parts, less in the DIY/credit-loop
  spirit. Two accessible stalls = two units.
- **Fit for RR:** **Backup.** Use only if the local health department won't sign off on a
  site-built vault. Keep one accessible-rated unit in the back pocket.

> **Recommendation:** Build the *structure* to host **either 1a or 1b** — a raised deck with a
> removable chamber bay under each throne. Start operating as a **bucket system (1a)**; the same
> deck upgrades to **twin-vault (1b)** later by swapping buckets for sealed vaults. Design the
> under-deck clearance for the taller of the two (vault) so we never have to rebuild. This is the
> "build once, choose later" move — same philosophy as the Airstream's reversible insulation.

### Urine: divert or not
Urine is ~80% of the volume and most of the odor-and-moisture problem. **Urine diversion**
(a separating seat draining to a soakaway/mulch basin or a separate jug) keeps the solids pile
drier and far easier to compost. Recommended for at least the accessible stall.
**Open decision** — adds a separating fixture and a small drain run (see §Decisions).

---

## 2. Accessibility — the part that sets the geometry

Most of the building's dimensions are *driven by the accessible stall and its ramp*, so we fix
these first. Targets follow the **2010 ADA Standards** and ICC A117.1 as the design reference
(a private community latrine may not be legally bound to ADA, but we build to it on principle and
for grant credibility).

### 2a. Ramp (ADA 405)
| Parameter | Requirement | RR design value |
|---|---|---|
| Max running slope | **1:12** (8.33%) | 1:12 |
| Max rise per run | 30 in before a landing | 24 in deck → L: two runs with a corner landing |
| Clear width | ≥ 36 in between rails | **42 in** (comfortable) |
| Landings | Level (1:48 max), as wide as ramp, **60 in** long min; **60×60 in** where the ramp changes direction | 4 ft corner landing at the 90° turn |
| Handrails | Both sides if rise > 6 in; 34–38 in high; extend 12 in at top/bottom | both sides, 36 in, cedar |
| Edge protection | Curb/rail to stop a wheel running off | 4 in cedar curb both sides |
| Cross slope | ≤ 1:48 | flat |
| Surface | firm, stable, slip-resistant | grooved/decked cedar |

**Slope math (the number that sizes the whole footprint):** rise ÷ slope = run.
At 1:12, every **1 inch of deck height = 1 foot of ramp run.** A 24-in deck = **24 ft** of ramp.
That's long, so v1 folds it into a compact **L** — one run off the deck's east edge, a 90° corner
landing, then a perpendicular run down to grade — saving footprint = "efficient" per the build
brief. (If the deck drops to 18 in, a single straight 18 ft + landing also works — see Decisions.)

### 2b. Accessible stall / toilet room (ADA 603–604)
| Parameter | Requirement | RR design value |
|---|---|---|
| Turning space | 60-in diameter circle **or** T-turn, clear of door swing | 60-in circle |
| Clear floor at fixture | toilet centered **16–18 in** off side wall | 18 in |
| Side + rear grab bars | 42-in side bar, 36-in rear bar | both, cedar-backed |
| Door | 32-in min clear opening; maneuvering clearance outside | 36-in out-swing door |
| Interior (practical) | enough for circle + fixture + swing | **84 × 60 in (7 × 5 ft)** interior |

### 2c. Standard stalls (×2)
Two small stalls, each ~**3.5 × 4.5 ft** interior. Same throne height, no turning circle. Two of
them give the latrine real throughput for a gathering without inflating the accessible stall.

> **Why this matters for Blender:** the accessible stall (7×5 ft) + two standard stalls (~3.5×4.5 ft
> each) + a shared front patio + the ramp's corner landing are the "planes" the massing model
> lays down. Everything else hangs off these.

---

## 3. Structure — raised cedar platform

- **Why raised:** (1) the chamber lives underneath and must be removable; (2) keeps the floor dry
  and the framing off the soil; (3) gravity helps — the throne sits above the bucket/vault.
- **Deck height:** **24 in** finished floor above grade. Reasons: clears a standard 5-gal bucket
  plus a slide-out tray with handling room, *and* leaves headroom to retrofit a moldering vault
  later without rebuilding. (Min would be ~18 in for buckets only.)
- **Footing:** precast deck piers or helical screw piles — **no concrete pour** preferred
  (reversible, low-carbon, community-installable). Screw piles = best ground-disturbance story
  for grants.
- **Frame:** pressure-treated or naturally rot-resistant sills on piers; joists 16 in OC; decked
  in **cedar or cypress** (rot/insect resistance without chemical treatment up top where people
  touch).
- **Walls:** stud-framed, board-and-batten cedar or reclaimed siding; partial-height with a
  generous vented gap top and bottom (privacy + airflow — a latrine should breathe).
- **Roof:** single-slope (shed) **standing-seam metal**, pitched to the back, big front overhang
  to shade the patio. Metal = rainwater-harvest ready (future handwash), long life, fire-wise.
- **Under-deck:** skirted with a **removable louvered hatch** at each chamber bay for
  bucket/vault swap; critters out, air in.

---

## 4. Ventilation — passive stack, the second trick

After the cover material, the **vent stack** is what keeps a dry toilet odor-free.

- **One 4-in stack per chamber**, from the chamber top, straight up through the roof, terminating
  above the ridge with a rain cap and insect screen.
- **Paint it black / face it south:** solar gain warms the stack, drives a convective updraft
  that pulls air *down through the seat* and *up the stack* — odor leaves via the roof, never the
  room. A low-watt solar PV fan (e.g. 12 V muffin fan on a tiny panel) is the off-grid upgrade if
  passive isn't enough in still air.
- **Cross-vent the room:** louver low on the door side, louver high on the opposite wall.
- Keep stacks **straight and vertical** — every elbow kills draft.

---

## 5. Materials & sustainability posture

| System | Choice | Why |
|---|---|---|
| Foundation | Screw piles / precast piers | Reversible, no concrete, community-installable |
| Framing | Local/reclaimed dimensional lumber | Sourcing story + cost |
| Decking & touch surfaces | Cedar / cypress | Rot + insect resistance, no toxic treatment |
| Siding | Board-and-batten cedar or reclaimed | Breathable, repairable |
| Roof | Standing-seam metal | Longevity, rainwater-ready, fire-wise |
| Cover material | On-site or local sawdust / shavings | Free byproduct, closes a local loop |
| Fasteners | Stainless / hot-dip galv | Survive the damp + the salts |
| Finish | Raw or natural oil (tung/linseed) | Low-VOC, re-applyable |

Sustainability headline for grants: **waterless · off-grid · zero concrete · nutrient-cycling ·
locally sourced · accessible.** Every one of those is a fundable adjective and all are true here.

---

## 6. Two build paths (à la the Airstream tiers)

### Path A — "Community weekend" (indie) ≈ **$2.2k–$3.5k** materials
Bucket system (1a), screw piles, reclaimed/local lumber, cedar only where touched, passive
stacks, hand-built grab bars on solid blocking. Labor = community credit-loop. The accessible
stall + ramp are non-negotiable even here.

### Path B — "Proper / permit-ready" ≈ **$6k–$9k** materials
Twin-vault (1b) or one commercial accessible unit, urine diversion to a mulch basin, standing-seam
roof, solar vent fans, finished cedar throughout, code-rated handrails and hardware, signage,
and a small rain-catch handwash. The version that survives a health-department visit and a grant
site tour.

> **Recommended:** Frame the *structure* to Path B (deck height, vault bays, stack routing) and
> *operate* at Path A first. Upgrade in place as credits and crowds accumulate. Build once.

---

## 7. Locked dimensions (the Blender model is built from these)

These are the values the massing script uses. All in feet unless noted. Documented assumptions —
flag any you want changed and the script re-runs.

| Element | Dimension | Notes |
|---|---|---|
| Overall deck | **16 × 12 ft** | Three stalls + circulation + patio strip |
| Deck height (FFL) | **24 in (2.0 ft)** above grade | Vault-ready clearance |
| Accessible stall (interior) | **7 × 5 ft** | 60-in turn circle + fixture |
| Standard stalls (interior) | **~3.5 × 4.5 ft each, ×2** | Two small stalls |
| Stall wall height | **7 ft** | Partial vent gaps top/bottom |
| Covered patio (front porch) | **16 × 5 ft** | Shared approach, shade, waiting |
| Ramp | **1:12**, 48-in clear width | 24-in rise → L-shape |
| Ramp runs | one run + 90° corner + perpendicular run | folds into an L |
| Ramp landings | **5 × 5 ft** turn landing + top landing | ADA 405.7 |
| Roof | shed, **2:12 pitch**, 24-in front overhang | standing-seam metal |
| Vent stacks | **4-in dia**, 2 ×, through roof above ridge | painted black, south-faced |
| Footings | 9 screw piles on a ~6 ft grid | no concrete |

**The "planes" for the massing model**, in order of placement:
1. **Grade plane** — the ground.
2. **Deck plane** — 16 × 12 ft raised 2 ft (the floor).
3. **Patio plane** — front 16 × 5 ft strip (covered, same deck level).
4. **Stall floor planes** — accessible 7 × 5, two standard ~3.5 × 4.5, set behind the patio.
5. **Ramp planes** — an L: one sloped 1:12 run + corner landing + a perpendicular run to grade.

Then massing: stall walls, shed roof, vent stacks, handrails, skirt + hatches.

---

## 8. Open decisions (needed from koH)

1. **System at launch:** bucket (1a, recommended) vs twin-vault (1b)? Affects steward labor vs
   build size. *Structure supports both either way.*
2. **Urine diversion:** yes (drier, easier compost, +1 fixture + drain) or no (simpler)?
   Recommended **yes for the accessible stall** at minimum.
3. **Ramp geometry:** L-shape at 24-in deck (compact, recommended) **or** drop deck to 18 in
   for a single straight ramp (longer, simpler, less vault headroom)?
4. **Build path / tier:** confirm "frame to Path B, operate Path A."
5. **Capacity / siting:** expected peak users at a gathering, and where on the land (sun angle for
   the vent stacks, approach direction for the ramp).
6. **Permitting:** is health-department sign-off in scope? If yes, the commercial-unit fallback
   (1c) and urine handling get more weight.

---

## 9. Sources & standards (for follow-up)

- Joseph Jenkins, *The Humanure Handbook* (4th ed.) — bucket method, thermophilic 3-bin compost,
  pathogen/temperature data.
- 2010 **ADA Standards for Accessible Design** §403–405 (ramps), §603–604 (toilet rooms),
  §505 (handrails); ICC **A117.1** as the harmonized reference.
- USFS / Appalachian Trail Conservancy **moldering privy** and twin-vault design guides.
- Clivus Multrum, Sun-Mar, Nature's Head — commercial composting-toilet spec sheets (capacity,
  power, accessibility-rated models).
- WHO/Sphere dry-sanitation guidance — cover-material ratios, vent-stack sizing, separation
  distances from water sources.
- NSF/ANSI 41 (non-liquid saturated treatment systems) — relevant if seeking certification.

> Verify local county health code and water-table/setback rules before siting — the one thing no
> generic source can answer for the specific parcel.
