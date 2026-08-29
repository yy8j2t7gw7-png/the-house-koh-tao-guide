# Release Notes v5.11.31

## Outcome

v5.11.31 is a focused mobile presentation and wording release built directly from deployed v5.11.30. It removes the two content-obscuring mobile floating controls, moderately tightens the verified Room page and corrects the logical/visible wording inconsistencies found in production.

No operational workflow changed. Concierge intent routing, human-contact hours, Contact/Call policy, lost-key authorization, spare-key security, booking/diving, cleaning, luggage, maintenance, WhatsApp, emergency, passport processing, stay verification, Airbnb synchronization, owner operations and alert lifecycle remain the approved v5.11.30 behavior.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`

No production Meta template, language, BODY schema/order, recipient, route, phone mapping, secret or integration configuration changed.

## Exact cause: floating language control

`public/i18n.js` previously created `language-floating-button` and appended it directly to `document.body`. The mobile rule in `public/design-system.css` then gave that body-level button `position: fixed`, a viewport `top/right` offset and a high z-index. Header padding merely reserved visual space for it; the control was not structurally owned by the header. It therefore stayed over page content independently of the approved sticky top bar.

`addHeaderLanguageButton()` now inserts `language-header-button` directly into `.topbar` before `.nav`. Below the existing 760 px navigation breakpoint it sits beside **Menu**, opens the unchanged selector inside the navigation menu and uses `position: static`. There is no body append and no standalone fixed/sticky language rule.

## Exact mobile Concierge solution

`public/ai-concierge.js` gives the launcher the exact accessible name **Open Concierge** and separate icon/label spans. `public/ai-concierge.css` retains the approved desktop pill but, at `max-width: 767px`, renders a centered 58×58 px softly rounded-square House-green control. The visible long label is accessibly clipped rather than removed, while the button retains focus-visible and reduced-motion rules.

Safe-area placement is centralized for every page using the Concierge:

- right: `calc(12px + env(safe-area-inset-right))`
- bottom: `calc(12px + env(safe-area-inset-bottom))`
- page clearance: `calc(76px + env(safe-area-inset-bottom))`

The 58 px control exceeds the 44×44 px touch-target requirement. The combination of a smaller launcher, sensible inset and modest global bottom clearance lets verification, Emergency, Room, notices, navigation, Finding Room, stay-help and footer content scroll fully clear.

## Mobile spacing and Room hierarchy

At the existing mobile layout breakpoint (`max-width: 760px`):

- section margin/padding changes from 16/18 px to 14/16 px;
- general card padding changes from 16 px to 15 px;
- Room navigation-card vertical padding changes from 16 px to 13 px, an 18.75% reduction;
- Room intro padding, H1 margins and supporting-copy line spacing are tightened without shrinking body copy;
- the Room-location hero changes from 246 px to 208 px, a 15.45% reduction;
- the Room image focal point is `50% 56%`, retaining the highlighted Room 11 area in the approved building photo.

Desktop/tablet rules remain unchanged. At 768 px and above the approved v5.11.30 presentation and desktop Concierge pill remain in effect.

## Exact wording corrections

The Room page now separates verified stay access from statutory guest registration:

> Your stay is verified. Non-Thai overnight guests must also complete the required TM30 guest registration.

Privacy remains a separate paragraph:

> Passport images are automatically deleted 14 days after upload, or sooner after processing.

The root and canonical module Room pages are byte-identical. Both sentences have reviewed translations for all seven supported languages.

The bottom stay-help route already opens the Concierge, but the shared platform action runtime inferred `contact` from its existing `houseWhatsapp` route and rewrote its text to **Contact Us**. The link now supplies the presentation-only `data-action-label="Open Concierge"`; the shared runtime honors and translates that explicit label. The route and click behavior are unchanged, and **Open Google Maps** remains unchanged.

## Files changed from v5.11.30

Presentation/runtime:

- `public/ai-concierge.css`
- `public/ai-concierge.js`
- `public/design-system.css`
- `public/i18n.js`
- `public/modules/house/room.html`
- `public/platform-action-runtime.js`
- `public/room.html`

Tests:

- `tests/concierge.test.mjs`

Release metadata:

- `package-lock.json`
- `package.json`
- `public/ai-concierge-config.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/module-registry.js`
- `src/concierge-api.js` (release constant only)

Documentation:

- `CHANGELOG.md`
- `DEVELOPMENT_HANDOFF_v5.11.31.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.31.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`

## Regression coverage

One focused test expands the complete suite from 178 to 179 tests. It verifies:

1. the launcher has the exact accessible name and 58×58 px compact rule below 768 px;
2. right/bottom safe-area offsets and page-bottom clearance exist at the global launcher boundary;
3. the launcher label remains accessible while visually compact;
4. language access is inserted into the header, is static on mobile and has no old body-level fixed implementation;
5. the Room hero and navigation-card mobile refinements remain within the requested moderate ranges;
6. root and canonical Room pages remain identical and contain the corrected verified/TM30/privacy copy;
7. **Open Concierge** survives shared action-label processing without a route change.

All existing operational tests remain active.

## Validation result

- source suite: 179 passed, 0 failed; two additional complete reruns also passed;
- independently extracted archive suite: 179 passed, 0 failed;
- 36 JavaScript/ES-module files and `airbnb-sync/Code.gs` passed syntax checks;
- all 12 JSON files parsed successfully;
- v5.11.31 version consistency, seven selected exact root/module mirrors and Git whitespace checks passed;
- 16 protected booking/Meta, recipient, stay, emergency, passport-storage, Airbnb, maintenance and key-code modules match v5.11.30 exactly;
- responsive source/computed-contract checks passed at 320, 360, 375, 390, 414 and 430 px, a lightweight landscape constraint, and the 768/1024/1280/1440 desktop breakpoints;
- release-delta credential, private-contact, key-code and protected-media scans passed without logging protected values;
- ZIP CRC passed and the 239-file source/archive manifests match exactly;
- the Worker dry run could not execute in this workspace: compatible local Wrangler 4.122.0 was found, but the command-approval connection disconnected before Wrangler started. Run `npx wrangler deploy --dry-run` before production deployment and stop if it fails.

The managed cloud browser was not permitted to open the local preview URL, so no local manual browser-width result is claimed. Responsive contracts and the approved Room 11 source image/crop were inspected; the requested final real-iPhone visual review remains the first post-deployment smoke test.

## Focused production smoke test

1. On the unverified mobile page, scroll **Open Help & Emergency** fully above the compact launcher.
2. On verified Room 11, confirm the compact launcher, accurate verified/TM30 copy and shorter Room-location hero.
3. Scroll through every navigation card and confirm no text or action remains covered.
4. Confirm both Finding Room 11 photos and captions remain clear.
5. At the page bottom, confirm **Open Concierge**, **Open Google Maps** and the footer are fully reachable.
6. Scroll the full page and confirm language access remains in the sticky header/menu and never floats independently over content.

No booking or lost-key smoke test is required for this presentation-only release unless an automated regression fails.

Stop after v5.11.31. Do not begin another release automatically.
