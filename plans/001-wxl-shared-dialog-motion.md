# 001: Add shared WXL dialog entry and exit motion

- **Status**: DONE
- **Commit**: d0773d40d
- **Severity**: MEDIUM
- **Category**: Missed opportunities and interruptibility
- **Estimated scope**: 8 files, about 180 lines

## Problem

WXL:FOOD has 12 centered dialogs across five React files. They are mounted behind boolean conditionals and removed as soon as their close callback changes the owning state. The backdrop and card therefore appear and disappear with no visual bridge.

Representative current render sites:

```tsx
// wxl/src/App.tsx:546-554, current
{authPromptOpen && <AuthPrompt onClose={() => setAuthPromptOpen(false)} />}
{locationPromptOpen && <LocationPrompt onLocated={useVisitorLocation} onSkip={skipVisitorLocation} />}
{addSpotOpen && <AddSpotModal onClose={() => setAddSpotOpen(false)} notify={notify} onAdded={...} />}
{foodHereOpen && <FoodHereModal onClose={() => setFoodHereOpen(false)} notify={notify} onCreated={...} />}
```

```tsx
// wxl/src/CommunityTools.tsx:75, current
return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
  if (event.target === event.currentTarget) onClose()
}}>
  <form className="create-modal tool-modal" role="dialog" aria-modal="true" ...>
```

```css
/* wxl/src/styles.css:144-146, current */
.modal-backdrop { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 18px; background: #183d2b88; }
.create-modal { width: min(500px, 100%); max-height: calc(100vh - 36px); overflow-y: auto; background: #fffefa; border: 1px solid #d6e2d5; border-radius: 10px; box-shadow: 0 18px 55px #183d2b35; padding: 24px; }
```

```css
/* wxl/src/styles.css:155, current */
.access-backdrop { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; padding: 18px; background: #10271db8; }
.access-card { position: relative; width: min(410px, 100%); padding: 32px; text-align: left; color: #253a2d; background: #f9fbf6; border: 1px solid #dbe9d8; border-radius: 10px; box-shadow: 0 18px 60px #071b124d; }
```

The affected instances are:

- `wxl/src/App.tsx:744`, create community request
- `wxl/src/App.tsx:745`, offer food or help
- `wxl/src/App.tsx:781`, account-required prompt
- `wxl/src/App.tsx:800`, location-consent prompt
- `wxl/src/CommunityTools.tsx:75`, add food spot
- `wxl/src/CommunityTools.tsx:105`, publish FOOD IS HERE
- `wxl/src/RescueBoard.tsx:296`, submit rescue
- `wxl/src/RescueBoard.tsx:302`, safety checkpoint
- `wxl/src/HarvestRunBoard.tsx:169`, stop outcome
- `wxl/src/HarvestRunBoard.tsx:177`, plan harvest run
- `wxl/src/HarvestRunBoard.tsx:183`, add run stop
- `wxl/src/InventoryBoard.tsx:132`, shared receive, reserve, and condition-check shell

Pure CSS can provide the entry treatment with `@starting-style`, but it cannot animate exit after React has unmounted the element. A small shared presence hook must hold the current dialog in the tree until its opacity transition ends. The existing WXL reduced-motion rule also forces every transition to `0.01ms`, so the dialog needs a scoped opacity-only exception.

## Target

All centered `.modal-backdrop` and `.access-backdrop` dialogs use the same restrained treatment:

- Backdrop enters from `opacity: 0` to `opacity: 1`.
- Centered card enters from `opacity: 0; transform: translateY(8px) scale(0.97)` to `opacity: 1; transform: translateY(0) scale(1)`.
- Entry and exit both last `250ms`.
- Entry and exit use `cubic-bezier(0.23, 1, 0.32, 1)`.
- The card uses `transform-origin: center`, which is correct for a centered modal.
- Exit reverses to the same hidden values and keeps the React subtree mounted until the backdrop opacity transition ends.
- Repeated close requests are idempotent.
- A `300ms` JavaScript fallback completes unmounting if `transitionend` is not delivered.
- During exit, form state and success content stay intact. Cleanup runs only after the visual exit completes.
- Reduced motion keeps a `150ms` opacity transition but removes translation and scale.
- Only `transform` and `opacity` animate.

Add these tokens to the existing `:root` in `wxl/src/styles.css`:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--duration-dialog: 250ms;
--duration-reduced-motion: 150ms;
```

Add this motion layer after the existing `.access-card` rule and before responsive overrides:

```css
.modal-backdrop,
.access-backdrop {
  opacity: 1;
  transition: opacity var(--duration-dialog) var(--ease-out);
}

.modal-backdrop > .create-modal,
.access-backdrop > .access-card {
  opacity: 1;
  transform: translateY(0) scale(1);
  transform-origin: center;
  transition:
    opacity var(--duration-dialog) var(--ease-out),
    transform var(--duration-dialog) var(--ease-out);
}

.modal-backdrop[data-dialog-state='closing'],
.access-backdrop[data-dialog-state='closing'] {
  opacity: 0;
}

.modal-backdrop[data-dialog-state='closing'] > .create-modal,
.access-backdrop[data-dialog-state='closing'] > .access-card {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
  pointer-events: none;
}

@starting-style {
  .modal-backdrop,
  .access-backdrop {
    opacity: 0;
  }

  .modal-backdrop > .create-modal,
  .access-backdrop > .access-card {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
}
```

Extend the existing reduced-motion block at `wxl/src/styles.css:366` after its universal rule:

```css
@media (prefers-reduced-motion: reduce) {
  .modal-backdrop,
  .access-backdrop,
  .modal-backdrop > .create-modal,
  .access-backdrop > .access-card {
    transition-duration: var(--duration-reduced-motion) !important;
  }

  .modal-backdrop > .create-modal,
  .access-backdrop > .access-card,
  .modal-backdrop[data-dialog-state='closing'] > .create-modal,
  .access-backdrop[data-dialog-state='closing'] > .access-card {
    transform: none;
  }

  @starting-style {
    .modal-backdrop > .create-modal,
    .access-backdrop > .access-card {
      opacity: 0;
      transform: none;
    }
  }
}
```

Create `wxl/src/useDialogMotion.ts` with this public contract:

```tsx
export type DialogMotionControls = {
  state: 'open' | 'closing'
  requestClose: (afterExit?: () => void) => void
  onTransitionEnd: TransitionEventHandler<HTMLElement>
}

export function useDialogMotion(onExited: () => void): DialogMotionControls
```

The implementation must:

1. Initialize `state` as `'open'`.
2. Use refs for `closing`, the fallback timer, and an optional `afterExit` callback.
3. Make `requestClose` return immediately if a close is already in progress.
4. Set `state` to `'closing'` and start a `300ms` fallback timer.
5. Finish only when the backdrop itself emits `transitionend` for `opacity`, meaning `event.target === event.currentTarget` and `event.propertyName === 'opacity'`.
6. Clear the fallback timer when finishing or unmounting.
7. Reset internal refs before invoking callbacks so repeated events cannot close twice.
8. Invoke `afterExit` when supplied; otherwise invoke `onExited`.

Every animated backdrop receives:

```tsx
data-dialog-state={dialogMotion.state}
onTransitionEnd={dialogMotion.onTransitionEnd}
```

Every backdrop click, cancel button, close button, and successful workflow closure calls `dialogMotion.requestClose()` instead of changing the owning boolean directly.

## Repo conventions to follow

- WXL is React 19, TypeScript, and Vite with plain CSS. Do not add a motion library.
- Motion already lives in `wxl/src/styles.css`.
- The current toast enters over `250ms ease-out` at `wxl/src/styles.css:145`; keep the dialog inside the same sub-300ms UI budget.
- The mobile sidebar uses CSS transitions and class state at `wxl/src/styles.css:149` and `wxl/src/styles.css:297-322`; the shared dialog should follow the same CSS-first approach.
- WXL already has a global reduced-motion rule at `wxl/src/styles.css:366-368`. Add the scoped opacity-only dialog exception after the universal declaration instead of deleting the existing rule.
- Preserve each dialog's current click semantics. `CommunityTools.tsx` closes on backdrop `mousedown`; other dialogs close on backdrop `click`; the location prompt does not close by clicking its backdrop.
- Preserve existing roles, accessible names, `aria-modal`, focus behavior, form values, and success notifications.

## Steps

1. Create `wxl/src/useDialogMotion.ts`.
   - Implement the exact contract and lifecycle described in Target.
   - Use `window.setTimeout(..., 300)` only as a missing-event fallback.
   - Export the controls type for modal component props.
   - Do not manage focus, keyboard dismissal, scroll locking, or portals in this hook.

2. Update `wxl/src/styles.css`.
   - Add the three motion tokens to the existing root token set without reformatting unrelated rules.
   - Add the shared backdrop and card transition selectors exactly as shown in Target.
   - Add the `@starting-style` entry values.
   - Extend the existing reduced-motion block with the opacity-only `150ms` treatment.
   - Do not animate backdrop color, box shadow, border, filter, layout, or scrolling.

3. Update `wxl/src/App.tsx`.
   - Import `useDialogMotion` and `DialogMotionControls`.
   - In both `SimpleApp` and `DashboardApp`, create location-dialog controls beside the existing `locationPromptOpen` state. The default exit callback sets `locationPromptOpen` to false.
   - Pass the controls into `LocationPrompt`.
   - In `LocationPrompt`, route successful geolocation through `requestClose(() => onLocated(latitude, longitude))` and route skip through `requestClose(onSkip)`. The parent data update must occur after the card finishes fading so the contents do not change during exit.
   - In `DashboardApp`, create controls for `authPromptOpen`, `addSpotOpen`, and `foodHereOpen`; pass them into `AuthPrompt`, `AddSpotModal`, and `FoodHereModal`.
   - In `CommunityBoard`, create separate controls for `showCreate` and `showOffer`.
   - Replace every direct `setShowCreate(false)` and `setShowOffer(false)` close path, including successful submission paths at current lines 670 and 723, with the matching `requestClose`.
   - Move form-field cleanup for successful request and offer submission into an `afterExit` callback. Do not clear visible form fields while the closing card is still on screen.
   - Add `data-dialog-state` and `onTransitionEnd` to the four backdrops rendered directly in this file.
   - Update `AuthPrompt` and `LocationPrompt` props to accept `motion: DialogMotionControls`; replace their direct close callbacks with `motion.requestClose`.

4. Update `wxl/src/CommunityTools.tsx`.
   - Import `DialogMotionControls`.
   - Add a `motion` prop to `AddSpotModal` and `FoodHereModal`.
   - Keep the current backdrop-only `onMouseDown` guard, but call `motion.requestClose()` instead of `onClose()`.
   - Change both close buttons and cancel buttons to call `motion.requestClose()`.
   - After a successful add or publish, run `onAdded` or `onCreated` and `notify` as today, then call `motion.requestClose()`. Do not call the owning state setter directly.
   - Add the backdrop data state and transition-end handler.

5. Update `wxl/src/RescueBoard.tsx`.
   - Create one motion control set for `showCreate` and one for `checkpointStage`.
   - Pass the matching controls into `RescueCreateModal` and `CheckpointModal`.
   - Replace direct dismissal handlers with `requestClose`.
   - At current lines 161 and 255, move boolean closure and form/checkpoint cleanup into `requestClose(() => { ... })` so the content remains stable through exit.
   - Add the backdrop data state and transition-end handler in both modal components.

6. Update `wxl/src/HarvestRunBoard.tsx`.
   - Create separate controls for `showCreate`, `showStop`, and `activeStopId`.
   - Pass controls into `RunCreateModal` and `StopModal`.
   - Apply the third control set directly to the stop-outcome backdrop.
   - Replace all direct close handlers at current lines 127, 140, 152, and 167-169.
   - Move run-form, stop-form, and outcome-field cleanup into `afterExit` callbacks.
   - Keep notifications and database refresh behavior unchanged.

7. Update `wxl/src/InventoryBoard.tsx`.
   - Create separate controls for receive, allocation, and condition dialogs.
   - Add a `motion: DialogMotionControls` prop to `SimpleModal` and `ReceiveModal`.
   - Pass the corresponding controls from all three render sites.
   - Replace direct closure and cleanup at current lines 93, 102, and 108 with `requestClose(() => { ... })`.
   - Ensure the cancel buttons inside allocation and condition children use the same control set as their enclosing `SimpleModal`.
   - Add the backdrop data state and transition-end handler once inside `SimpleModal`.

8. Add `wxl/src/useDialogMotion.test.tsx`.
   - Render a minimal harness using the hook.
   - Assert that requesting close changes `data-dialog-state` from `open` to `closing`.
   - Assert that `onExited` is not called before `transitionend`.
   - Dispatch a backdrop `transitionend` with `propertyName: 'opacity'` and assert `onExited` is called exactly once.
   - Dispatch a child transition event and assert it does not finish the dialog.
   - Request close twice and assert the exit callback still runs once.
   - With fake timers, omit `transitionend`, advance `300ms`, and assert the fallback completes once.

9. Update `wxl/src/App.test.tsx`.
   - The location tests at current lines 91-115 assume synchronous unmounting. Change the two absence assertions to `await waitFor(...)` so they observe exit completion.
   - Add one integration assertion for the account prompt: after clicking its close button, confirm the backdrop has `data-dialog-state="closing"`, dispatch the backdrop opacity transition end, then confirm the dialog is removed.
   - Do not weaken any existing role, privacy-copy, authentication, or navigation assertions.

## Boundaries

- Do not touch the bottom-edge `.simple-sheet`; it needs a different spatial treatment.
- Do not animate `.alert-center`, `.contact-panel`, `.toast`, account menus, navigation, maps, charts, lists, or tab content in this plan.
- Do not add Framer Motion, Motion, React Transition Group, or any other dependency.
- Do not convert dialogs to portals or the native `<dialog>` element.
- Do not change dialog copy, database calls, authentication gates, form validation, success notifications, or privacy rules.
- Do not add Escape handling, focus traps, focus restoration, or body scroll locking. Those are separate accessibility concerns.
- Do not animate `width`, `height`, `top`, `left`, padding, margin, border, box shadow, filter, or backdrop blur.
- Do not use keyframes. Closing must remain interruptible and completion must be tied to the current transition.
- Do not use `scale(0)`.
- If any owning state or success cleanup no longer matches the cited code at commit `d0773d40d`, stop and report the drift instead of improvising.

## Verification

- **Mechanical**:
  - Run `cd wxl && npm test`. All Vitest tests must pass.
  - Run `cd wxl && npm run build`. TypeScript and the Vite production build must complete without errors.
  - Run `rg -n "className=\"(modal-backdrop|access-backdrop)" wxl/src/*.tsx` and verify every result also supplies `data-dialog-state` and `onTransitionEnd`.
  - Run `rg -n "setShowCreate\\(false\\)|setShowOffer\\(false\\)|setShowStop\\(false\\)|setActiveStopId\\(null\\)|setShowReceive\\(false\\)|setShowAllocate\\(false\\)|setShowCondition\\(false\\)|setCheckpointStage\\(null\\)" wxl/src`. Any remaining result must be inside an exit-completion callback, never a click handler or immediate success path.

- **Feel check**:
  - Run `cd wxl && npm run dev`, then inspect `/app/?mode=anonymous&intent=food` and `/app/?mode=advanced`.
  - Open and close the location prompt, account-required prompt, add-food form, FOOD IS HERE form, community-request form, rescue form, checkpoint, harvest-run forms, and all inventory dialogs.
  - Confirm the backdrop begins responding immediately and the card settles from only `8px` and `0.97` scale. It must not bounce, overshoot, or appear to grow from nothing.
  - Confirm backdrop clicks, cancel buttons, close buttons, and successful submissions all use the same exit path.
  - Confirm form values and success content remain visible and unchanged until the card has fully faded.
  - Click a close control repeatedly. The animation must continue from its current state and the owning callback must run once.
  - In the browser Animations panel, set playback to 10 percent and confirm backdrop and card start together, finish together, and reverse through the same values.
  - In the Rendering panel, emulate `prefers-reduced-motion: reduce`. Confirm the dialog still fades for `150ms`, but does not translate or scale.
  - Test at 360px width and a short landscape viewport. Confirm the card remains centered, scrollable, and fully dismissible.

- **Done when**:
  - Every centered WXL dialog enters and exits with the shared treatment.
  - No close path unmounts its dialog before the opacity transition finishes.
  - No success path clears visible content during exit.
  - Reduced motion uses opacity only.
  - Tests and production build pass.
