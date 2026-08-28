# Development Handoff v5.11.27

## Authoritative checkpoint

v5.11.27 is complete and was built directly from the deployed and production-passed v5.11.26 archive. Preserve both release archives. Do not reconstruct completed v5.11.19–v5.11.27 work from the older pushed v5.11.18 Git baseline.

This is a visual/UX release. It does not change booking, diving, alert, cleaning, property, lost-key authorization, passport, Airbnb, maintenance or diagnostic lifecycle behavior.

## Design implementation

`public/design-system.css` owns the shared guest presentation tokens and primitives: House green and cream semantic colors, an `1120px` content shell, `70ch` readable text measure, compact spacing, restrained card elevation, standardized buttons, responsive heroes, focus-visible treatment and reduced motion. The desktop hero is `292px`; mobile steps down to `246px` and `232px`. Both `html` and `body` prevent page-level horizontal overflow.

The navigation structure and language controls are unchanged. `public/guide-app.js` adds only current-page `aria-current="page"` state.

Root and module experience styles remain exact mirrors for activities, bars, beaches, cafés, restaurants and shopping. Explore remains source-preserved and disabled.

## Guest journey

- `public/index.html` and `public/passport-upload.html` present the registration policy as three compact facts while retaining every required foreign-guest, Thai-exemption, privacy, deletion and secure upload/in-person rule.
- `public/room.html` and `public/modules/house/room.html` remain exact mirrors, use the compact hero and expose useful information sooner.
- `public/room-access.html`, `public/stay-access.css`, `public/passport-upload.css` and `public/report-problem.css` share the calmer form/card hierarchy and mobile action layout.
- The lost-key fee is stated exactly once per relevant page: **If your key has been lost, a 500 THB replacement fee applies.** The checkbox says **I understand and want to continue.** The button says **Request spare key**. This is presentation-only; required checkbox input, `feeAccepted:true` submission, fresh request binding, notification gate, protected code view and rotation lock are untouched.

## Concierge

`public/ai-concierge.css` retains the floating panel at `418px` maximum desktop width. It improves header density, message spacing, long-answer wrapping, two-column quick actions, multi-row choice buttons, mobile bottom-sheet behavior, safe-area padding, input size and focus/touch states. The thinking state still shows only three animated dots and respects reduced motion.

No Concierge JavaScript, collection state, booking schema, classifier, retry, contact or delivery boundary was altered for this release.

## Owner operations

`public/concierge-admin.css` and the presentation-only DOM construction in `public/concierge-admin.js` provide:

- compact section counts, chevrons and lifecycle badges;
- explicit critical/urgent, attention/open, acknowledged and resolved labels;
- structured value-safe diagnostic fields instead of a dense sentence;
- clear private-photo state and quiet completed maintenance cards;
- responsive custom dialogs and single-column actions on narrow screens;
- labelled stacked recent-question rows below `620px`.

Forced-open urgent behavior, action handlers, endpoint calls, authentication and lifecycle rules are unchanged.

## Preserved functional and security boundaries

- the v5.11.26 data-driven PADI/SSI/RAID catalog and exact mixed-party allocation;
- RAID recommended for safety and buoyancy-control focus together with Roctopus Dive as the preferred RAID centre;
- accurate PADI/SSI provider checks without implying Roctopus issues those certifications;
- `house_booking_alert_v2`, `en`, six ordered BODY parameters and `booking_with_owners`;
- common Meta whitespace sanitization, contact-last protected delivery and success only after at least one accepted provider message;
- exact-alert explicit retry, accepted-delivery suppression and unrelated-intent routing;
- contact redaction and contact-free stored state;
- 24/7 request-bound lost-key fee acceptance, accepted notification before protected code display and rotation lock;
- all passport, property, cleaning, emergency, maintenance, diagnostic and Airbnb safeguards;
- `EXPLORE_ENABLED=false` and `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.

## Files changed from v5.11.26

- `CHANGELOG.md`
- `DEVELOPMENT_HANDOFF_v5.11.27.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.27.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`
- `package-lock.json`
- `package.json`
- `public/activity-experience.css`
- `public/ai-concierge-config.js`
- `public/ai-concierge.css`
- `public/bar-experience.css`
- `public/beach-experience.css`
- `public/cafe-experience.css`
- `public/concierge-admin.css`
- `public/concierge-admin.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/design-system.css`
- `public/guide-app.js`
- `public/i18n.js`
- `public/index.html`
- `public/legal.css`
- `public/module-registry.js`
- `public/modules/activities/activity-experience.css`
- `public/modules/bars/bar-experience.css`
- `public/modules/beaches/beach-experience.css`
- `public/modules/cafes/cafe-experience.css`
- `public/modules/house/room.html`
- `public/modules/restaurants/restaurant-experience.css`
- `public/modules/shopping/shopping-experience.css`
- `public/passport-upload.css`
- `public/passport-upload.html`
- `public/report-problem.css`
- `public/restaurant-experience.css`
- `public/room-access.html`
- `public/room.html`
- `public/shopping-experience.css`
- `public/stay-access.css`
- `src/concierge-api.js`
- `tests/concierge.test.mjs`

## Tests and validation

Three new v5.11.27 visual-contract tests cover shared responsive constraints, scan-friendly registration/lost-key presentation and owner lifecycle/diagnostic/narrow-table styling. The complete suite contains 166 tests and passes with zero failures.

Release validation passed in full:

- source suite: 166 passed, 0 failed;
- independently extracted archive suite: 166 passed, 0 failed;
- syntax: 36 JavaScript/ES-module files plus `airbnb-sync/Code.gs` passed;
- JSON: all 12 files parsed successfully;
- v5.11.27 release consistency, seven root/module mirrors and Git whitespace checks passed;
- the 44-file delta contains no new credential-like, contact-like, key-code-literal or screenshot/image value;
- protected Worker/configuration modules and protected inline room/access/passport logic match v5.11.26;
- Worker dry run passed with all 165 public assets;
- ZIP CRC passed, and 231 source/archive file hashes matched exactly.

## Responsive and visual review

Responsive source/state contracts cover the required phone widths (`320`, `360`, `375`, `390`, `414`, `430px`) and bounded desktop layouts (`1280`, `1440`, `1600+`). Review includes the House landing page, Room 11, registration/passport, lost key before and after authorization, Concierge normal/booking/long-answer states, owner collapsed/open alert, WhatsApp diagnostic and maintenance report.

The configured cloud browser blocked the local preview URL under its URL policy. No rendered screenshot set is claimed and no alternate browser workaround was used. Run the production visual smoke check immediately after deployment and stop if any overflow, clipping, contrast or state-hierarchy issue is found.

## Production deployment

1. Extract `The-House-Koh-Tao-v5.11.27-ready-to-push.zip`.
2. Run `npm install` and `npx wrangler deploy`.
3. Do not change Meta names, languages, BODY counts/order, routes, recipients, secrets, webhooks, emergency routing, passport/Airbnb configuration or `SPARE_KEY_CODES`.
4. Keep `EXPLORE_ENABLED=false` and `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.
5. No data migration is required; this release changes no data schema.

## Very short production visual smoke test

1. Desktop Room page: hero and content balance look correct.
2. Mobile Room page: no overflow; navigation, cards and controls are usable.
3. Concierge: quick actions, messages, long answers and booking choices look clean.
4. Lost key: the amount appears once and explicit consent remains required; do not release a key merely for visual testing.
5. Admin: collapsed sections, alert cards, Resolve/Remove and Dismiss/Clear look correct.
6. Complete one ordinary non-sensitive Concierge interaction.

## Suggested GitHub release text

Title:

`Release v5.11.27: full guest and owner visual polish`

Description:

`Apply a responsive House visual system, compact room heroes, scan-friendly registration/passport guidance, a clearer mobile-first Concierge, single-amount lost-key consent and denser owner operations while preserving every v5.11.26 booking, RAID/Roctopus, Meta, privacy and 24/7 spare-key safeguard; 166 tests pass.`

Stop after v5.11.27. Do not begin another milestone automatically.
