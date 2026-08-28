# Release Notes v5.11.27

## Outcome

v5.11.27 is the full visual-polish release built directly on the deployed and production-passed v5.11.26 source. It improves the guest and owner interfaces without changing business logic, production configuration or protected data boundaries.

The visual direction is a warm, calm boutique tropical residence: cream surfaces, House green, compact responsive typography, restrained borders and shadows, useful density and generous touch targets. It avoids oversized blocks, toy-like rounding, heavy animation and generic dashboard styling.

Production Meta mappings, languages, BODY schemas, routes, recipients, webhooks, secrets, Airbnb synchronization, passport behavior and key-box configuration are unchanged. Explore remains disabled and `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remains required.

## Visual system, spacing and typography

`public/design-system.css` is now the common presentation boundary for guest pages. It defines:

- a semantic House palette for brand, surface, muted information, attention and true danger states;
- an `1120px` maximum content width, `70ch` readable measure and consistent responsive gutters;
- a compact spacing scale, restrained `12–18px` radii and subtle elevation;
- one primary, secondary and destructive button hierarchy with `46px` minimum primary targets;
- shared card, notice, badge, form, focus-visible, disabled and reduced-motion treatment;
- page-level horizontal overflow protection and mobile behavior down to `320px`.

The established top navigation, logo and language selector are retained. `public/guide-app.js` now marks the matching link with `aria-current="page"` as a safe presentation enhancement.

## Public guest pages

- Room and House heroes are `292px` on desktop, `246px` on normal mobile and `232px` on the narrowest breakpoint, approximately 25–35% smaller than the prior treatment.
- Introductory copy, room identity and image overlays use a responsive hierarchy that brings useful information above the fold.
- House, room, activity, restaurant, café, beach, bar and shopping cards use consistent spacing, border and radius treatment. Root/module CSS mirrors remain identical.
- Registration and passport requirements are reorganized into three compact fact groups while retaining required registration, every foreign overnight guest, Thai-national exemption, private handling, 14-day-or-sooner deletion and secure upload/in-person alternatives.
- Legal, maintenance-report and room-access surfaces use the same compact form and card language.
- Explore source remains present but hidden by the existing feature gate.

## AI Concierge

The floating Concierge remains recognizable and close to its existing desktop width. Presentation changes include:

- a cleaner header and quieter feedback controls;
- two-column touch-friendly quick actions on desktop and mobile;
- wrapping course and agency choice actions with normal-size text and at least `42px` targets;
- differentiated guest/Concierge bubbles, `pre-wrap` long answers, comfortable line height and safe word wrapping;
- an aligned `16px` mobile input, sticky conversation controls and safe-area-aware bottom sheet;
- the existing subtle animated dots only, with reduced-motion support.

No collection state, classifier, booking, retry, contact, alert or model behavior changed.

## Lost-key consent

The protected page now presents:

> If your key has been lost, a **500 THB replacement fee** applies.

It is followed immediately by the explicit checkbox **I understand and want to continue.**, the primary **Request spare key** action and secondary **Cancel**. The amount appears once per page. **View spare key** remains hidden until the protected notification gate succeeds, then becomes the clear next action.

Every v5.11.26 gate remains unchanged: a current room/session-bound verified stay, fresh request state, explicit acceptance, Su-and-owner notification accepted before display, protected-page-only code isolation and immediate rotation lock.

## Owner dashboard

- Collapsible section headers use consistent counts, badges and chevrons while unresolved urgent work remains forced open by the existing logic.
- Alert cards include explicit priority and status labels in addition to color; urgent/critical remains strongest, acknowledged is quieter and resolved is visually complete.
- WhatsApp diagnostics separate provider, template, language, route, attempts, accepted count, HTTP, error category/code and timestamp into compact fields. Provider message/details remain sanitized and separate.
- Maintenance cards distinguish open, acknowledged and resolved states and expose clear private-photo status without storage identifiers.
- Resolve/Remove and Dismiss/Clear actions retain their established custom-dialog and authorization behavior.
- Recent-question tables become labelled stacked rows below `620px` rather than forcing unusable horizontal scrolling.

## Accessibility and responsive review

Semantic headings, labels, dialog behavior, `aria-expanded`, `aria-disabled` and the forced-open urgent state are preserved. Focus-visible outlines, disabled-state treatment, touch targets, long-label wrapping, reduced-motion behavior and current-page semantics are explicitly covered.

Deterministic responsive contracts cover `320`, `360`, `375`, `390`, `414` and `430px` through the `<=340`, `<=520`, `<=640/650` and `<=760` rules, and `1280`, `1440` and `1600+` desktop widths through the bounded content shell. Source/state review covered the House landing page, Room 11, registration/passport, lost key before and after authorization, Concierge information/booking/long-response states, owner collapsed/open alerts, diagnostics and maintenance.

The available cloud browser refused the local preview URL under its URL policy, so no rendered screenshot set is claimed. No alternate browser surface was used. The six-step production visual smoke test below is therefore a required deployment check.

## Files changed from v5.11.26

Documentation:

- `CHANGELOG.md`
- `DEVELOPMENT_HANDOFF_v5.11.27.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.27.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`

Presentation and guest/admin markup:

- `public/activity-experience.css`
- `public/ai-concierge.css`
- `public/bar-experience.css`
- `public/beach-experience.css`
- `public/cafe-experience.css`
- `public/concierge-admin.css`
- `public/concierge-admin.js`
- `public/design-system.css`
- `public/guide-app.js`
- `public/index.html`
- `public/legal.css`
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

Release metadata and tests:

- `package-lock.json`
- `package.json`
- `public/ai-concierge-config.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/i18n.js`
- `public/module-registry.js`
- `src/concierge-api.js`
- `tests/concierge.test.mjs`

## Tests added

Three practical visual-contract regressions expand the complete suite from 163 to 166 tests:

1. the shared visual system constrains width and hero height and covers overflow, focus, disabled, reduced-motion and current-navigation states;
2. registration/passport facts and lost-key consent remain scan-friendly, responsive and single-amount;
3. owner alert lifecycles, structured diagnostics, dialog sizing and narrow table rows retain their intended visual hierarchy.

The inherited suite continues to cover the entire v5.11.26 functional baseline, including mixed diving parties, course logic, RAID/Roctopus guidance, booking and WhatsApp delivery, Meta serialization, retry, cleaning, property isolation, urgent confirmation, 24/7 lost key, maintenance/photo cleanup, diagnostics, passport privacy and Airbnb synchronization.

Final validation result:

- source suite: 166 passed, 0 failed;
- independently extracted archive suite: 166 passed, 0 failed;
- syntax: 36 JavaScript/ES-module files plus the Airbnb Apps Script passed;
- JSON: all 12 files parsed successfully;
- version, mirrored-asset, whitespace and protected-functional-boundary checks passed;
- release-delta credential, contact, key-code and image/screenshot scans passed;
- Worker dry run completed successfully with all 165 public assets;
- ZIP CRC passed and all 231 source/archive file hashes matched exactly.

## Deployment

Extract `The-House-Koh-Tao-v5.11.27-ready-to-push.zip` and deploy to the existing Worker:

```sh
npm install
npx wrangler deploy
```

Do not change template names, languages, BODY counts/order, recipient routes, secrets, webhooks, emergency configuration, passport/Airbnb configuration or `SPARE_KEY_CODES`. Keep `EXPLORE_ENABLED=false` and `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.

## Very short production visual smoke test

1. Check the desktop Room page hero and layout.
2. Check the mobile Room page for overflow, navigation and usable cards.
3. Open Concierge and inspect quick actions, messages and booking choices.
4. Open lost-key help and confirm the amount appears once and explicit consent still works; do not release a spare key just for this test.
5. Check admin collapsed sections, alert cards, Resolve/Remove and Dismiss/Clear.
6. Complete one ordinary non-sensitive Concierge interaction.

Stop after v5.11.27. No subsequent milestone is authorized automatically.
