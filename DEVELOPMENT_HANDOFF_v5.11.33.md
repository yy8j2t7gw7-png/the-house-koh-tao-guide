# Development Handoff v5.11.33

## Authoritative checkpoint

v5.11.33 is complete and was built directly from deployed v5.11.32. Preserve both archives. Do not reconstruct this release from an older Git/package baseline.

This is a presentation simplification release only. It does **not** change Concierge intent routing, human-contact hours, lost-key authorization, booking/diving, cleaning, luggage, maintenance, WhatsApp delivery, passport processing, stay verification, Airbnb synchronization, owner operations or alert lifecycle.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`

The previously discussed Admin Dashboard WhatsApp diagnostics change was explicitly cancelled by the owner before implementation. **No admin-diagnostics code was changed in v5.11.33.**

## Why v5.11.33 exists

Real-iPhone testing of v5.11.32 showed that the collision-aware launcher was technically correct but visually too active. The control collapsed and vertically repositioned as actionable cards entered its collision zone, which made the page feel unstable. The owner preferred the original calm, fixed floating-control behavior.

A second real-device issue was that the floating launcher remained visible on top of the open Concierge panel.

v5.11.33 therefore removes the entire mobile scroll/collision positioning controller and keeps one stable, clearly identified floating launcher.

## Final mobile launcher

Below 768 px, while the Concierge is closed:

- appearance: **💬 AI Concierge**
- size: **148×52 px**
- fixed bottom-right position
- right: `calc(12px + env(safe-area-inset-right))`
- bottom: `calc(12px + env(safe-area-inset-bottom))`
- page-bottom clearance: `calc(72px + env(safe-area-inset-bottom))`
- accessible name: **Open AI Concierge**

The launcher no longer changes width, collapses, lifts or moves in response to scrolling or nearby controls.

Desktop keeps the existing **✦ Concierge** presentation.

## Removed v5.11.32 movement architecture

`public/ai-concierge.js` no longer contains or runs the launcher-specific:

- mobile scroll threshold/state machine;
- downward/upward stop debounce;
- collision throttle;
- collision/release gaps;
- important-control geometry scan;
- `getBoundingClientRect()` launcher collision loop;
- `nearestSafeLauncherTop()` placement search;
- launcher `ResizeObserver`;
- `--ai-concierge-lift` variable;
- compact/collision-shifted classes.

No launcher-specific scroll listener remains.

## Open-panel visibility fix

The existing Concierge panel remains unchanged functionally.

When `openPanel()` runs:

1. the panel/backdrop and existing `ai-concierge-open` state are activated;
2. `aria-expanded` becomes `true`;
3. the launcher receives `hidden=true` and `aria-hidden=true`;
4. focus moves into the existing Concierge input as before.

When `closePanel()` runs:

1. the panel/backdrop close;
2. the launcher is unhidden and `aria-hidden` is removed;
3. `aria-expanded` becomes `false`;
4. existing focus restoration returns to the previously focused control.

CSS includes `.ai-concierge-launcher[hidden]{display:none}` so the launcher cannot appear over messages, input controls or the chat close button.

## Room 11 crop

The approved v5.11.32 Room 11 crop is intentionally unchanged:

- mobile hero: 232 px;
- general focus: `50% 54%`;
- Room 11 focus: `72% 58%`;
- Room 11 overlay: left 18 px, maximum width 54%.

The actual marked Room 11 entrance remains the acceptance criterion. The separate Finding Room 11 sequence is unchanged.

## Files changed from v5.11.32

Runtime/presentation:

- `public/ai-concierge.css`
- `public/ai-concierge.js`

Release/version metadata:

- `package.json`
- `package-lock.json`
- `public/ai-concierge-config.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/i18n.js`
- `public/module-registry.js`
- `src/concierge-api.js` (release constant only)

Tests/docs:

- `tests/concierge.test.mjs`
- `CHANGELOG.md`
- `README.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`
- `DEVELOPMENT_HANDOFF_v5.11.33.md`
- `RELEASE_NOTES_v5.11.33.md`

No `concierge-admin.*`, diagnostics persistence, WhatsApp delivery, recipient-routing or operational module is intentionally changed.

## Tests and validation

The launcher contract was rewritten for the simplified design and one focused panel-visibility contract was added. The full suite is **182 tests**.

The pre-existing spare-key privacy assertions were also hardened to ignore opaque UUID/hash identifier fields before checking test-only key-code literals. This removes a nondeterministic false positive when a random UUID happens to contain the same four digits; production privacy behavior is unchanged.

Completed validation:

- full source suite: **182 passed, 0 failed** on three consecutive reruns;
- 35 `public/` + `src/` JavaScript files passed `node --check`;
- `airbnb-sync/Code.gs` passed the same JavaScript syntax check via a temporary `.js` copy;
- all 12 JSON files parsed successfully;
- `git diff --check` passed;
- release/runtime markers are v5.11.33;
- no `concierge-admin`, WhatsApp delivery, stay, passport or maintenance implementation file is changed;
- release-delta review found no intentionally added secrets, private recipient values or key-box data.

A Worker dry run was **not** completed in this workspace. `npm ci` did not finish within the available execution window, so run `npx wrangler deploy --dry-run` locally before deployment and stop if it fails.

## Deployment

1. Extract `The-House-Koh-Tao-v5.11.33-ready-to-push.zip`.
2. Run `npm install` or `npm ci` as appropriate.
3. Run `npm test`.
4. Run `npx wrangler deploy --dry-run`; stop if it fails.
5. Deploy with production mappings, secrets and feature switches unchanged.
6. No data migration is required.

## Focused real-iPhone smoke test

After deployment, verify only:

1. closed Concierge: stable **💬 AI Concierge** pill;
2. scroll the Room page: pill does not collapse, lift or jump;
3. open Concierge: launcher disappears completely;
4. interact with chat: no duplicate launcher appears over the panel;
5. close Concierge: launcher returns in the same bottom-right position;
6. Room 11 hero still clearly shows the actual marked entrance;
7. language access remains header-owned and does not float independently.

No booking, lost-key or WhatsApp functional retest is needed unless the automated suite fails or protected operational code unexpectedly changes.

## Suggested GitHub release

Title:

`Release v5.11.33: stable mobile AI Concierge`

Description:

`Simplify the mobile Concierge back to a stable 148×52 px “💬 AI Concierge” bottom-right pill, remove the v5.11.32 scroll/collision/lift controller, and hide the launcher completely while the Concierge panel is open. Preserve the corrected Room 11 marked-entrance crop and all operational behavior. The owner confirmed no Admin Dashboard diagnostics change is required.`

Stop after v5.11.33. Do not begin another release automatically.
