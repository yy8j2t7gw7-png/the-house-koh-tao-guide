# Development Handoff v5.11.32

## Authoritative checkpoint

v5.11.32 is complete and was built directly from deployed v5.11.31. Preserve both archives. Do not reconstruct v5.11.19–v5.11.32 from the older pushed v5.11.18 Git baseline.

This release changes mobile presentation only. All v5.11.31 operational behavior is approved and preserved.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`

Do not change production Meta templates, languages, BODY schemas/order, routes, recipients, contacts, secrets, passport storage, Airbnb configuration or `SPARE_KEY_CODES` during deployment.

## Exact smart launcher implementation

The existing launcher remains one button controlling the existing `aiConciergePanel`. It now has `aria-label="Open AI Concierge"` and separate desktop/mobile visual children:

- desktop: **✦ Concierge**, unchanged from v5.11.31;
- mobile idle: **💬 AI Concierge**, 148×52 px;
- mobile compact: **💬**, 52×52 px.

The same click handler, `aria-expanded`, panel focus management and all Concierge routes/state remain unchanged.

`public/ai-concierge.js` owns one `mobileLauncherLayout` presentation controller:

- cumulative downward threshold: 6 px;
- downward stop debounce: 650 ms;
- upward stop debounce: 220 ms;
- collision throttle: 90 ms;
- collision gap: 10 px;
- release gap: 16 px.

Small same-direction movements accumulate, while direction changes reset the accumulator. The larger release gap supplies collision hysteresis. Scroll events are passive. Expensive geometry work is scheduled through one request-animation-frame callback at most every 90 ms.

## Collision states

The controller measures visible anchors, buttons, inputs, textareas, selects, summaries, role buttons and focusable custom controls. This includes navigation cards, Emergency, Report a Problem, Lost key, verification/forms, stay-help, Google Maps, footer and Admin Login.

1. If the expanded rectangle is clear, idle state is the full pill.
2. Downward scrolling holds compact mode until the 650 ms stop debounce.
3. If the full pill would overlap an action, collision mode remains compact.
4. If the compact bubble also overlaps, `nearestSafeLauncherTop()` evaluates right-aligned positions above visible controls and selects the closest clear one.
5. If no fully clear slot exists, it chooses the bounded position with the smallest overlap area.
6. The minimum position stays below the visible sticky header. The control never switches to the left side.

Viewport, visual-viewport, media-query and body-size changes schedule a fresh geometry pass. Only the final state classes and `--ai-concierge-lift` are written after rectangle reads.

## Safe area, accessibility and motion

- mobile breakpoint: below 768 px;
- expanded: 148×52 px;
- compact: 52×52 px;
- right offset: `calc(12px + env(safe-area-inset-right))`;
- bottom offset: `calc(12px + env(safe-area-inset-bottom) + var(--ai-concierge-lift))`;
- page clearance: `calc(72px + env(safe-area-inset-bottom))`;
- accessible name in all states: **Open AI Concierge**;
- visible focus: existing three-pixel focus ring;
- reduced motion: launcher transitions reduced to 0.01 ms.

The v5.11.31 header-owned language selector is unchanged and never floats independently.

## Room 11 crop

The original protected source `public/assets/photo-07.jpeg` is 1034×664. Full-resolution inspection confirms the marked Room 11 entrance is lower-right.

The corrected mobile presentation is:

- hero height: 232 px;
- general focus: `50% 54%`;
- Room 11 focus: `72% 58%`;
- Room 11 overlay: left 18 px, maximum width 54%, no right inset.

`public/room-app.js` sets only `data-room-number` after validating the protected Room route. The CSS selector uses that presentation attribute for Room 11. It does not authorize access or change the returned content.

At 320, 360, 375, 390, 414 and 430 px, the computed Room 11 marker remains fully inside the 232 px hero and begins to the right of the overlay. The separate Finding Room 11 Step 1/Step 2 section is untouched.

## Files changed from v5.11.31

- `CHANGELOG.md`
- `DEVELOPMENT_HANDOFF_v5.11.32.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.32.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`
- `package-lock.json`
- `package.json`
- `public/ai-concierge-config.js`
- `public/ai-concierge.css`
- `public/ai-concierge.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/design-system.css`
- `public/i18n.js`
- `public/module-registry.js`
- `public/room-app.js`
- `src/concierge-api.js` (release constant only)
- `tests/concierge.test.mjs`

## Tests and validation

Two tests expand the suite from 179 to 181 and protect the smart-launcher state architecture plus Room 11 crop. The existing v5.11.31 language, spacing, wording, CTA and root/module contract remains active.

Completed validation:

- source suite: 181 passed, 0 failed;
- independently extracted ZIP suite: 181 passed, 0 failed;
- 36 JavaScript/ES-module files plus `airbnb-sync/Code.gs`: syntax passed;
- 12 JSON files: parse passed;
- v5.11.32 release/version consistency passed;
- seven selected root/module mirrors and Git whitespace passed;
- 16 protected operational modules match v5.11.31 exactly;
- normalized runtime comparison proves the server is version-only, Room app is presentation-marker-only and all Concierge changes are confined to launcher presentation/positioning;
- six requested phone-width crop/geometry checks, compact landscape and unchanged 768+ desktop constraints passed;
- release-delta credential, private-contact, key-code and protected-media scans passed;
- ZIP CRC and 241-file source/archive manifests passed.

The managed cloud browser was blocked from opening the local preview URL. No manual browser/device result is claimed. The original Room 11 image was inspected at full resolution and the exact mobile crop geometry was validated at all six requested widths. Run the real-iPhone smoke test below immediately after deployment.

Wrangler 4.122.0 was available, but the workspace command-approval connection disconnected before the Worker dry run started. Treat this as a pre-deploy stop condition.

## Deployment

1. Extract `The-House-Koh-Tao-v5.11.32-ready-to-push.zip`.
2. Run `npm install`.
3. Run `npx wrangler deploy --dry-run`; stop if it fails.
4. Deploy only the independently validated archive.
5. Keep all production configuration and feature switches unchanged.
6. No migration is required.

## One-step real-iPhone smoke test

Open the unverified page and verified Room 11 on one iPhone, then scroll top-to-footer: require a clear idle **AI Concierge** pill, one clean downward collapse, safe re-expansion after stopping, no obstruction of important controls, the actual marked Room 11 entrance in the hero, and the same Concierge panel when tapping either expanded or compact state.

No booking or lost-key functional test is required unless automated regressions fail.

## Suggested GitHub release text

Title:

`Release v5.11.32: smart mobile Concierge bubble and Room 11 crop`

Description:

`Replace the anonymous mobile sparkle square with a clear 148×52 px “AI Concierge” pill that collapses to a 52 px chat bubble while scrolling, uses debounced and throttled collision detection, and moves upward when compact mode would cover an important action. Restore the Room 11 hero to 232 px with a room-specific focal position that keeps the marked entrance clear of the overlay. Desktop and all operational workflows remain unchanged. All 181 tests pass.`

Stop after v5.11.32. Do not begin another release automatically.
