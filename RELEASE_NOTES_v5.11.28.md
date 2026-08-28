# Release Notes v5.11.28

## Outcome

v5.11.28 is a focused visual-hierarchy and wording refinement built directly from the deployed v5.11.27 source. It keeps the compact responsive House design system and makes the public guest journey feel less administrative: registration is clearer, information treatments are less repetitive, actions describe their real destinations and Room 11 no longer repeats its room identity in the location-photo overlay.

One narrow functional exception was explicitly authorized after production review: clear lost-key and lockout phrases now enter the same protected 24/7 lost-key policy before generic service, knowledge or model routing. All fee, stay, notification, code-display and rotation safeguards are unchanged.

`EXPLORE_ENABLED=false` and `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remain required. No Meta template, language, BODY schema, parameter order, recipient route, secret or production integration changes in this release.

## Hierarchy and wording decisions

### Public landing page

- The compact `292px` desktop / `246px` mobile / `232px` narrow hero remains unchanged in size.
- No existing property image was suitable for public use. The room and arrival photographs are protected or room-specific, while the remaining images are unrelated or contain operational/contact information. The landing hero therefore stays House green and gains only restrained tonal depth; no stock image or protected asset was introduced.
- The primary heading is **Complete your guest registration** with the exact support line **Passport information is required for non-Thai overnight guests. Thai guests are exempt.**
- The eyebrow is **REQUIRED GUEST REGISTRATION**. The three required facts remain, but use flat divided columns instead of three framed cards inside another card.
- One four-step sequence now explains the journey: open the personal Room page, verify the stay, complete required registration and access private guest information.
- The lower access card is **Access your room guide** and avoids repeating the full registration explanation.
- The map and Concierge actions are labelled **Open Google Maps** and **Open Concierge**, matching what happens.

### Exact ambiguity correction

The misleading wording that could imply access becomes available after checkout was replaced with:

> Room location, arrival pictures, Wi-Fi and your full guest guide become available after your stay has been verified and the required guest registration is complete.

Search coverage confirms the obsolete equivalent no longer exists in operational source.

### Room page

- The page retains **Welcome to Room 11** as its identity. The location-image overlay now uses **ROOM LOCATION**, the room floor such as **Downstairs**, and the existing room-specific location note.
- Action cards and the two-column desktop grid remain unchanged.
- Simple guidance and room facts use transparent outer wrappers so warnings and operational facts do not sit inside unnecessary nested rounded containers.
- Toilet guidance is concise while preserving the prohibited-item condition and `1,000 THB` clearance fee.
- The approved island water/electricity explanation is shorter without adding a factual claim.
- The bottom primary action and floating launcher say **Open Concierge** because both open the Concierge first.

### Footer

Every public occurrence of “budget-friendly” was removed. The shared public positioning is:

> The House – Koh Tao · Simple, comfortable accommodation in Mae Haad.

## Lost-key production correction

### Root cause

The server policy router and the browser protected-operation boundary each contained the same overly narrow lost-key regular expression. It recognized a longer phrase such as **I lost my key**, but bare **lost key**, forgotten-key wording, spare-key wording and some lockout phrasing could bypass deterministic routing. The request could then reach approved/model output labelled as a lost-key service handoff and attempt a generic team alert, producing the observed “couldn’t reach The House team” failure instead of the protected fee prompt.

### Implementation

- `src/concierge-api.js`: the common `LOST_KEY_REQUEST` matcher now covers all approved clear phrase variants before public knowledge, service and model routing.
- `public/ai-concierge.js`: the equivalent `lostKeyRequest` matcher is used by `requiresProtectedServer()` so those requests cannot fall back to the device-only answer path.
- A repeated lost-key synonym while the guest is viewing the fee prompt deterministically returns the same protected policy response. It does not reset authorization, create an alert or submit a notification.

For a verified active stay, the result remains the existing `500 THB` fee prompt and protected Room-page action. For an unverified stay, verification remains required. A new request still starts without fee acceptance; explicit current-request acceptance, an accepted Su/Owner notification, protected-page-only code display and the rotation lock remain authoritative.

## Files changed from v5.11.27

Documentation and release metadata:

- `CHANGELOG.md`
- `DEVELOPMENT_HANDOFF_v5.11.28.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.28.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`
- `package-lock.json`
- `package.json`
- `public/ai-concierge-config.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/i18n.js`
- `public/module-registry.js`

Guest presentation and exact mirrors:

- `public/design-system.css`
- `public/index.html`
- `public/room-app.js`
- `public/room.html`
- `public/modules/house/room.html`
- `public/house.html`
- `public/modules/house/house.html`
- `public/report-problem.html`
- `public/checkout.html`
- `public/modules/departure/checkout.html`
- `public/emergency.html`
- `public/modules/emergency/emergency.html`
- `public/practical.html`
- `public/modules/practical/practical.html`
- `public/rooms.html`
- `public/modules/house/rooms.html`

Authorized routing correction and tests:

- `public/ai-concierge.js`
- `src/concierge-api.js`
- `tests/concierge.test.mjs`

## Tests added or updated

Three regressions expand the complete suite from 166 to 169 tests:

1. every approved lost-key/lockout phrase enters the same protected path before generic routing and creates no pre-acceptance alert;
2. a repeated synonym while fee consent is pending remains in the protected flow without reset or duplicate alert;
3. the landing/room hierarchy contract verifies exact registration/access wording, image safety, Room-floor overlay, concise guidance, accurate Concierge actions, one visible lost-key amount and removal of “budget-friendly”.

Existing localization, source-boundary and v5.11.27 visual contracts were updated only where their approved wording/version changed.

## Validation result

- source suite: 169 passed, 0 failed;
- independently extracted archive suite: 169 passed, 0 failed;
- JavaScript/ES-module and Airbnb Apps Script syntax checks passed;
- all JSON files parsed successfully;
- v5.11.28 version consistency, root/module mirrors and Git whitespace checks passed;
- release-delta credential, contact, key-code, protected-image and screenshot scans passed;
- protected business/security modules and inline protected Room/access/passport workflows remain unchanged from v5.11.27, except the authorized lost-key intent matchers;
- Worker dry run was not executed in this workspace: a compatible local Wrangler 4.122.0 was found, but the execution policy rejected the non-mutating `deploy --dry-run` command before Wrangler started. Run the command below before production push;
- ZIP CRC and source/archive manifest comparison passed.

## Responsive review

Deterministic source/state review covers `320`, `360`, `375`, `390`, `414`, `430`, `1280`, `1440` and `1600+` widths through the existing `<=340`, `<=520`, `<=760` breakpoints and bounded `1120px` shell. It verifies registration fact/step stacking, unchanged compact hero heights, wrapping CTA labels, room overlay readability, warning overflow protection, minimum button/launcher targets, focus-visible and reduced-motion behavior.

The browser-control surface was unavailable in this workspace, so no rendered screenshot set is claimed and no alternate automation stack was substituted. Complete the production visual smoke check below immediately after deployment and stop if clipping, overflow, contrast or hierarchy differs from the source contracts.

## Deployment and concise production smoke check

Extract `The-House-Koh-Tao-v5.11.28-ready-to-push.zip`, install dependencies and run `npx wrangler deploy --dry-run` before deploying to the existing Worker. Do not change production variables, routes, templates, recipients or secrets. Stop if the dry run fails.

1. At desktop and mobile widths, check the landing hero, registration facts/steps, bottom cards and footer.
2. Open the Room 11 guide with a production-safe verified fixture and confirm **ROOM LOCATION / Downstairs** plus the existing note.
3. Confirm toilet/resource guidance and the bottom **Open Concierge** action fit without overflow.
4. In a verified active stay, type **lost key** and confirm the `500 THB` prompt plus **Continue securely** appears with no generic failure. Stop before accepting the fee; do not release a spare key for smoke testing.
5. Confirm an unverified lost-key request asks for stay verification.
6. Complete one ordinary non-sensitive Concierge interaction and confirm normal routing.

Stop after v5.11.28. No later release is authorized automatically.
