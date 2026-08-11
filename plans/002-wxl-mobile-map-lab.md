# 002: WXL mobile map lab

- **Status**: IMPLEMENTED AND PROMOTED TO MOBILE BASE
- **Preferred variant**: `command-bar`, selected for continued lab refinement on 2026-07-29
- **Route**: `/app/?mode=map-lab`
- **Public navigation**: Unlinked
- **Production writes**: None

## Goal

Compare three mobile control arrangements around one shared, production-shaped map experience without changing the public Find food route.

## Implemented scope

- The `mode=map-lab` branch is evaluated before simple and advanced app modes.
- The lab and Motion for React load through a separate lazy chunk.
- Bundled food locations, location types, icons, distance calculation, and navigation-link generation live in `wxl/src/foodLocations.ts` and are shared with the existing app.
- The lab reads public `command.food_spots` records through the existing read helper. A failed or unavailable read retains the full bundled directory and shows a quiet status message.
- The active Supabase session is displayed in the menu. The lab does not call sign-in, sign-out, engagement, nomination, request, alert, or other write helpers.
- Browser geolocation is opt-in, retained in React memory only, and used to center the map and sort results by distance. Denial, timeout, or unavailable browser support leaves the full Austin directory usable.
- `FoodMap` accepts optional `bottomInset` and `viewportCommand` inputs. Existing callers preserve their previous behavior.
- Marker selection uses the bottom inset to keep the selected location above the adaptive sheet.
- The OpenStreetMap attribution moves above the visible sheet area.

## Shared adaptive sheet

The sheet has `place`, `list`, and `menu` modes and `peek`, `half`, and `full` detents.

- Peek exposes 116px.
- Half exposes 48 percent of the current visual viewport.
- Full settles 12px below the top of the lab viewport.
- `visualViewport` resize and scroll events update the layout, including when an on-screen keyboard changes the available height.
- The drag handle waits for a 10px threshold, tracks the pointer directly, projects release position by 180ms of velocity, and selects the nearest detent.
- Drag release settles with Motion using `type: spring`, `bounce: 0`, and `duration: 0.32`.
- Programmatic transitions use 250ms and `cubic-bezier(0.23, 1, 0.32, 1)`.
- Reduced motion disables dragging and changes detents without transform animation.
- Place and list modes are nonmodal. Menu mode adds a scrim, background inertness, focus containment, Escape dismissal, and focus return.

## Variants

All variants use the same map, records, search, filters, location behavior, sheet, and motion.

1. `rail`: separate Menu control, wide top search, right-side Locate and List controls.
2. `command-bar`: Menu, search, and Locate in one top surface, plus a lower-right List pill.
3. `dock`: full-width top search and a compact Menu, Locate, and List dock above the sheet.

The prototype evaluator:

- switches variants;
- writes `variant=rail`, `variant=command-bar`, or `variant=dock` to the current URL;
- saves the current favorite in `localStorage` under `wxl:map-lab-favorite`;
- is explicitly labeled prototype tooling;
- is absent from public navigation.

## Accessibility and safety boundary

- Interactive controls maintain a 44px minimum target.
- Focus-visible uses the established amber outline.
- Result counts and location status are announced.
- Detents are keyboard-operable buttons with pressed state.
- Search matches place name, neighborhood, and type.
- Public navigation links open the platform map appropriate to the browser.
- Menu items are read-only handoffs to existing live routes.
- No lab control creates, updates, or deletes a production record.

## Files

- `wxl/src/map-lab/MapLab.tsx`
- `wxl/src/map-lab/map-lab.css`
- `wxl/src/foodLocations.ts`
- `wxl/src/FoodMap.tsx`
- `wxl/src/App.tsx`
- `wxl/src/App.test.tsx`

## Verification

- `npm test`: 82 tests passing across 8 files.
- `npm run build`: successful. Motion and map-lab CSS are emitted in the lazy MapLab chunk. The existing large main-chunk advisory remains non-blocking.
- `git diff --check`: passing.
- Automated coverage includes route isolation, variant URL switching, favorite persistence, search, marker-to-place transition, modal menu behavior, Escape dismissal, and geolocation denial fallback.

Manual evaluation should compare:

- 360 by 800
- 390 by 844
- 430 by 932
- 844 by 390
- desktop phone frame
- 200 percent text zoom
- reduced motion
- coarse-pointer drag and map panning

## Promotion status

The command bar is the current preferred direction. Its Menu control is now explicitly labeled, and its floating List control tracks the sheet one-to-one during dragging and detent changes. The dock controls use the same sheet-coupled movement in the comparison variant. No additional action was added because Menu, search, Locate, and List cover the current map tasks.

On 2026-07-29, the command-bar variant was promoted to the public Find food route for viewports up to 759px. The public version removes prototype evaluation controls and exposes Advanced mode in Menu. Desktop Find food, authentication screens, Advanced mode, and the remaining focused public intent layouts retain their current behavior. Future mobile work should migrate Contribute, Gather, and Requests into this shared shell without changing their safety or write boundaries.
