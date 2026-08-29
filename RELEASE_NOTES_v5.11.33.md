# Release Notes v5.11.33

## Outcome

v5.11.33 simplifies the mobile Concierge after real-iPhone testing of v5.11.32. The collision-aware launcher was technically functional but moved too often and made the interface feel unstable. The release restores a calm, fixed floating control and fixes the duplicate launcher remaining visible over the open chat.

No operational workflow changed. No Admin Dashboard WhatsApp diagnostics change is included; the owner confirmed the observed dashboard behavior was expected after dismissing individual diagnostic messages.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`

## Stable mobile Concierge

Below 768 px, the closed-state launcher is a fixed **148×52 px 💬 AI Concierge** pill at the bottom-right.

- right: `12px + env(safe-area-inset-right)`;
- bottom: `12px + env(safe-area-inset-bottom)`;
- page clearance: `72px + env(safe-area-inset-bottom)`;
- accessible name: **Open AI Concierge**.

It no longer changes position or presentation during scroll.

## Removed smart movement controller

The v5.11.32 launcher-only scroll/collision system was removed, including scroll thresholds, compact state, collision/release hysteresis, geometry scanning, nearest-safe vertical placement, collision lift and the launcher-specific ResizeObserver.

This removes the jumping behavior and also eliminates ongoing launcher-specific layout calculations during normal scrolling.

## Launcher hidden while chat is open

`openPanel()` now hides the existing launcher using the native `hidden` state and `aria-hidden=true` after the existing panel state is activated. The launcher is therefore absent from the open chat surface.

`closePanel()` unhides it before the existing focus-restoration step. `aria-expanded` and the existing Concierge panel/focus behavior remain intact.

## Preserved Room 11 crop

The v5.11.32 Room 11 correction is unchanged:

- 232 px mobile hero;
- Room 11 focal position `72% 58%`;
- left-side overlay constrained to 54%.

The separate Finding Room 11 photos remain unchanged.

## Dashboard clarification

No diagnostics state, clearing, dismissing, persistence or Admin UI code was modified in this release. The owner clarified before implementation that the diagnostics needed to be closed individually and that the dashboard was behaving as intended.

## Regression coverage

The existing smart-launcher contract was replaced with a stable-launcher contract, and a new contract verifies that the launcher is hidden when the panel opens and restored on close. The complete suite contains **182 tests**.

The pre-existing spare-key privacy assertions were also hardened to ignore opaque UUID/hash identifier fields before checking test-only key-code literals. This removes a nondeterministic false positive when a random UUID happens to contain the same four digits; production privacy behavior is unchanged.

Validation completed:

- **182 passed, 0 failed** on three consecutive source reruns;
- 35 `public/` + `src/` JavaScript files passed syntax checks;
- `airbnb-sync/Code.gs` passed syntax checking through a temporary `.js` copy;
- all 12 JSON files parsed successfully;
- `git diff --check` passed;
- version/runtime markers are v5.11.33;
- no Admin diagnostics, WhatsApp delivery, stay, passport or maintenance implementation file changed.

The Worker dry run was not completed because dependency installation did not finish inside the execution window. Run `npx wrangler deploy --dry-run` locally before production deployment.

## Production smoke test

On one real iPhone:

1. confirm the stable **💬 AI Concierge** pill;
2. scroll and confirm it does not move/collapse/lift;
3. open Concierge and confirm the launcher disappears;
4. close Concierge and confirm it returns in the same place;
5. confirm Room 11 remains visible in the location hero;
6. confirm the language selector remains header-owned.

No booking/lost-key/WhatsApp functional smoke test is required unless automated regressions fail.
