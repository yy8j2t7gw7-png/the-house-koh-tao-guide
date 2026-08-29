# Release Notes v5.11.32

## Outcome

v5.11.32 fixes two real-device mobile presentation regressions found after deployed v5.11.31:

1. the anonymous compact sparkle launcher is replaced by an identifiable, stable and collision-aware mobile AI Concierge control;
2. the Room 11 hero again clearly contains the actual marked Room 11 entrance.

The release is presentation-only. It changes no Concierge intent, conversation state, service hours, Contact/Call policy, emergency route, lost-key authorization, spare-key security, booking/diving, cleaning, luggage, maintenance, WhatsApp, passport, stay verification, Airbnb synchronization, owner operations or alert lifecycle.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`

No Meta template, language, BODY schema/order, recipient, route, contact, secret or production configuration changed.

## Smart mobile Concierge architecture

The same existing launcher button and panel are retained. The button still opens and closes the established Concierge; no parallel chat route or state was created.

At 768 px and above, the v5.11.31 desktop appearance remains **✦ Concierge**. Below 768 px the same button has these presentation states:

| State | Appearance | Trigger |
| --- | --- | --- |
| Expanded | 148×52 px **💬 AI Concierge** pill | Idle and enough collision-free space |
| Scroll compact | 52×52 px **💬** bubble | Six cumulative pixels of downward movement |
| Collision compact | 52×52 px **💬** bubble | The expanded pill would overlap a visible action |
| Collision shifted | Right-aligned compact bubble moved upward | The compact bubble would also overlap a visible action |

Every state uses the exact accessible name **Open AI Concierge**, the same click listener, a 52 px minimum touch target and the existing focus-visible rule.

## Debounce, hysteresis and performance

`public/ai-concierge.js` accumulates small same-direction scroll movements, so slow downward scrolling still collapses after six total pixels without reacting to every one-pixel event.

- downward stop debounce: 650 ms;
- upward re-expansion debounce: 220 ms;
- collision entry gap: 10 px;
- collision release gap: 16 px;
- collision/layout throttle: 90 ms;
- layout work: one scheduled request-animation-frame read/write cycle;
- resize coverage: viewport, `visualViewport`, media-query and body `ResizeObserver` changes.

The different entry/release gaps provide hysteresis. The control does not switch sides; every collision solution remains right-aligned. Width, label and vertical-position transitions are short, and the existing `prefers-reduced-motion` rule reduces them to 0.01 ms.

## Collision detection

The collision controller measures visible:

- anchors and navigation cards;
- buttons and submit controls;
- text fields, textareas and selects;
- summaries, role buttons and focusable custom controls;
- footer and Admin Login links.

Concierge-panel controls and sticky-header controls are excluded from page-collision candidates; the calculated minimum top remains below the visible sticky header.

Each throttled evaluation:

1. computes the default expanded and compact launcher rectangles;
2. reads every visible candidate once with `getBoundingClientRect()`;
3. keeps the full pill only when its rectangle plus hysteresis gap is clear;
4. if the compact rectangle also collides, evaluates right-aligned candidate positions immediately above visible controls;
5. selects the nearest collision-free vertical position, or the least-overlapping bounded position when no perfect slot exists;
6. writes only the final compact/collision classes and one CSS lift variable.

## Safe area and dimensions

Mobile values:

- breakpoint: `max-width: 767px`;
- expanded pill: 148×52 px;
- compact bubble: 52×52 px;
- right: `12px + env(safe-area-inset-right)`;
- bottom: `12px + env(safe-area-inset-bottom) + collision lift`;
- page clearance: `72px + env(safe-area-inset-bottom)`.

The v5.11.31 header-owned language selector remains `position: static` on mobile. No independent floating language control was reintroduced.

## Room 11 hero crop correction

The protected Room 11 source is `public/assets/photo-07.jpeg`, 1034×664. The actual marked entrance occupies the lower-right portion of that image. The generic 208 px v5.11.31 crop made the marker too small and unclear on a real iPhone.

v5.11.32 uses:

- mobile Room hero: 232 px;
- general Room image focus: `50% 54%`;
- Room 11-specific focus: `72% 58%`;
- Room 11 overlay: left 18 px, maximum width 54%, with no right inset.

`public/room-app.js` places the already authorized Room number in `data-room-number` on the protected Room page. CSS uses only that presentation marker; no access decision or private content rule depends on it.

The reviewed crop calculation at 320, 360, 375, 390, 414 and 430 px keeps the complete marked Room 11 region inside the hero. At each width the overlay ends to the left of the marker. The approved Finding Room 11 Step 1/Step 2 sequence is unchanged.

## Files changed from v5.11.31

Presentation/runtime:

- `public/ai-concierge.css`
- `public/ai-concierge.js`
- `public/design-system.css`
- `public/room-app.js`

Tests:

- `tests/concierge.test.mjs`

Release metadata:

- `package-lock.json`
- `package.json`
- `public/ai-concierge-config.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/i18n.js`
- `public/module-registry.js`
- `src/concierge-api.js` (release constant only)

Documentation:

- `CHANGELOG.md`
- `DEVELOPMENT_HANDOFF_v5.11.32.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.32.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`

## Tests added

Two new contracts expand the suite from 179 to 181 tests:

1. mobile launcher markup/accessibility, dimensions, desktop preservation, expanded/compact states, scroll thresholds, 650/220 ms debounce, 10/16 px hysteresis, 90 ms throttle, visible-control selector, rectangle collision, nearest-safe vertical placement, safe-area values and reduced motion;
2. Room 11 protected-page presentation marker, 232 px hero, `72% 58%` focus, left overlay, removal of the broken 208 px crop and continued use of the approved marked source photo.

The v5.11.31 contract continues to protect the header-owned language control, tighter cards, verified/TM30 wording, root/module equality and **Open Concierge** stay-help label.

## Validation result

- source suite: 181 passed, 0 failed;
- independently extracted archive suite: 181 passed, 0 failed;
- 36 JavaScript/ES-module files and `airbnb-sync/Code.gs` passed syntax checks;
- all 12 JSON files parsed successfully;
- v5.11.32 version consistency, seven selected exact root/module mirrors and Git whitespace checks passed;
- 16 protected operational modules match v5.11.31 exactly;
- normalized comparison proves `src/concierge-api.js` changes only the release constant, `room-app.js` only adds the presentation marker and `ai-concierge.js` changes only launcher presentation/positioning code;
- requested-width crop/geometry checks passed at 320, 360, 375, 390, 414 and 430 px, plus compact landscape and unchanged 768+ desktop constraints;
- release-delta credential, private-contact, key-code and protected-media scans passed without logging protected values;
- ZIP CRC passed and the 241-file source/archive manifests match exactly.

The managed cloud browser rejected the local preview URL under its security policy, so no manual browser/device review is claimed from this workspace. The original Room 11 image was inspected at full resolution and the crop was verified geometrically at every requested width. Complete the real-iPhone smoke test immediately after deployment.

The Worker dry run could not execute here because the workspace command-approval connection disconnected before Wrangler started. Run `npx wrangler deploy --dry-run` before deployment and stop if it fails.

## Post-deployment smoke test

On one real iPhone:

1. idle page: require the clear **💬 AI Concierge** pill;
2. scroll down: require one clean collapse to the chat bubble;
3. stop: require expansion after the short debounce when space is safe;
4. pass navigation cards, Emergency, Report a Problem, Lost key, forms, stay-help, Google Maps, footer and Admin Login: require collapse/lift instead of obstruction;
5. Room 11 hero: require the actual marked Room 11 entrance to be clearly visible and not covered by the overlay;
6. tap both expanded and compact states: require the same existing Concierge panel.

No booking or lost-key functional smoke test is required unless an automated regression fails.

Stop after v5.11.32. Do not begin another release automatically.
