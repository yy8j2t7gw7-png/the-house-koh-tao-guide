# Development Handoff v5.11.22

## Authoritative checkpoint

v5.11.22 is complete as the functional/conversational UX release built directly on the completed v5.11.21 source. Preserve the v5.11.21 and v5.11.22 release artifacts. Do not reconstruct completed v5.11.19–v5.11.22 work from v5.11.18.

This release implements:

1. One-question-at-a-time collection for all seven structured booking categories.
2. Deterministic implicit property-problem recognition with routine-versus-urgent handling.
3. Accessible collapsible navigation for the real top-level owner-console sections.
4. The superseding protected 24/7 lost-key flow with current-request fee evidence, notification-before-display and rotation enforcement.

The full public-site visual redesign remains out of scope.

## Booking implementation

`src/concierge-api.js` owns the shared progressive collector. Direct natural intent and category-specific **Book with Us** prompts converge on one workflow state. Each turn consumes supplied values, retains valid prior fields and asks only the first missing item. Finite diving/fishing/snorkeling/transport choices return buttons whose prompts pass through the same state as typed answers. The contact boundary remains last and transient.

Required category logic:

- Diving: date, divers, product, conditional certification or named course, contact.
- Fishing: date, guests, style, contact.
- Snorkeling: date, guests, trip type, contact.
- Taxi and motorbike taxi: date, time, pickup, destination, passengers, contact.
- Taxi/longtail boat: taxi fields plus one-way/return.
- Ferry: date, origin, destination, travelers and contact; time is retained when supplied and passport data is never requested.

Roctopus Dive remains the approved recommendation. Complete requests create exactly one `booking_with_owners` alert to Fah plus both owners and explicitly remain unconfirmed until current availability, price and payment are resolved.

## Property intelligence

The Concierge detects natural actionable reports across pest/animal, odor, plumbing/water, equipment/appliance/Wi-Fi, fixture/furniture and mold/damp/condition categories. Routine problems create one `support_with_owners` alert to Su plus both owners. Same-session, same-room, same-category follow-ups are deduplicated. Ambiguous odors get one concise clarification. Dirty-room variants retain the protected cleaning workflow.

Fire, smoke, burning/electrical danger, major flooding/water flow, structural danger and dangerous animals enter the existing explicit urgent confirmation boundary. Only the guest's **Send urgent alert** action creates the `urgent_response` alert to Fah plus both owners; no external emergency service is contacted automatically.

## Authoritative 24/7 lost-key policy

Earlier office-hours/after-hours lost-key rules are obsolete. Housekeeping hours remain unchanged but never gate spare-key self-service.

Every request requires a current verified active stay and is bound to its reservation, room and protected session. `/api/stay/status` returns a new signed 15-minute request token and `feeAccepted:false`; the browser keeps the token only in memory and resets its checkbox on render, cancel and completion. `/api/stay/spare-key` accepts only explicit `feeAccepted:true` for that token, sends the protected notification and returns a separate signed view authorization without returning the code.

Only after validation does the Worker send `lost_key_team` notification to Su and both owners. At least one Meta submission must be accepted before the protected **View spare key** control appears. `/api/stay/spare-key/view` revalidates the current signed view authorization, returns the code only to that protected page, records `verified_spare_key_release`, stores a one-way used-request marker and immediately sets the room rotation lock. A superseded or old token cannot be reused after reset.

The owner console must clear the lock only after staff change the physical code, update the encrypted `SPARE_KEY_CODES` secret and deploy it. Code values remain excluded from Concierge history, alerts, WhatsApp/Meta payloads, logs, diagnostics, source, screenshots and release archives.

## Owner-console navigation

The real top-level sections are native `<details>` groups for stays, alerts, maintenance, passport registration, learning, approved knowledge and recent activity. Stays and alerts default open. Counts come from data already loaded for each section. Expand/collapse state is stored only in the authorized browser under `houseConciergeAdminSections:v5.11.22`.

Unresolved urgent or critical content marks its section, forces it open and prevents **Collapse all** from hiding it. Native summary controls supply keyboard behavior; script mirrors `aria-expanded` and textual state. Focus, 52-pixel targets, mobile wrapping and overflow rules are present. Collapsing never mutates or reloads operational data.

## Exact v5.11.22 files changed from v5.11.21

Documentation and release metadata:

- `AIRBNB_AUTOMATION_SETUP.md`
- `AI_CONCIERGE_OPERATIONS.md`
- `AI_CONCIERGE_PRINCIPLES.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `CONCIERGE_KNOWLEDGE_GUIDE.md`
- `DEVELOPMENT_GUIDELINES.md`
- `DEVELOPMENT_HANDOFF_v5.11.22.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.22.md`
- `ROADMAP.md`
- `SECURE_24_HOUR_LOST_KEY_ACCESS.md`
- `SECURE_AFTER_HOURS_ACCESS.md`
- `WHATSAPP_ALERT_OPERATIONS.md`
- `WORK_HANDOVER_PROMPT.md`
- `package.json`
- `package-lock.json`

Guest and owner UI:

- `public/ai-concierge-config.js`
- `public/ai-concierge.js`
- `public/concierge-admin.css`
- `public/concierge-admin.html`
- `public/concierge-admin.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/i18n.js`
- `public/module-registry.js`
- `public/modules/house/room.html`
- `public/registration-entry.js`
- `public/room-access.html`
- `public/room.html`

Server and tests:

- `src/alert-policy.js`
- `src/concierge-api.js`
- `src/concierge-store.js`
- `src/stay-api.js`
- `src/whatsapp-alerts.js`
- `tests/concierge.test.mjs`

## Regression status

- Complete suite: 140 tests passed, 0 failed.
- Source and independently extracted release archive must pass the same complete suite.
- New/changed coverage exercises every production conversation entry path described in `RELEASE_NOTES_v5.11.22.md`, including literal 16:00 and 23:00 Bangkok lost-key cases.
- Release integrity includes JavaScript and Apps Script syntax, every JSON file, version metadata, secret/contact/key-code scans, Git checks, ZIP CRC and exact source/archive manifest comparison.

## Production deployment

1. Use the ready-to-push v5.11.22 ZIP and retain the existing dependency lock.
2. Run `npm install` and then `npx wrangler deploy` from the extracted release.
3. Do not change active Meta template names, languages, BODY shapes, recipients, secrets, webhook settings, emergency routing, passport/Airbnb configuration or `SPARE_KEY_CODES` as part of this code deployment.
4. Keep `WHATSAPP_STAFF_ACTIONS_ENABLED=false`. Never map `house_service_alert_actions_v1`; the intended future action template remains `house_service_alert_actions_v2`.
5. Run only the changed-function smoke matrix below with non-sensitive test data, report the result and stop.

## Short production smoke matrix

A. **Diving:** Send **I wanna go diving.** Confirm one progressive question and no checklist. Separately ask **Which dive school do you recommend?** and confirm Roctopus Dive with no commission language.

B. **Pest:** From a verified test room, send **There's a rat in my roof.** Confirm one natural response and one Su-plus-owner service alert.

C. **Odor:** Send **My bathroom smells like sewage.** Confirm one service alert without unnecessary clarification.

D. **Equipment:** Send **My AC isn't cold.** Confirm routine service handling.

E. **Urgent:** Send the safe test phrase **I smell burning from the socket.** Confirm urgent classification and the **Send urgent alert** boundary; do not press it unless the production test is authorized.

F. **Information control:** Ask **What animals live on Koh Tao?** Confirm information only and no service alert.

G. **Admin:** Collapse a long maintenance/report section, reach Passport requests immediately, independently open/close another section, refresh to verify saved preference and confirm unresolved urgent work remains open and prominent.

H. **Lost key:** With a non-sensitive verified active test stay and temporary physical code, test once at 16:00 and once at 23:00 Bangkok. Before acceptance, confirm no staff payload claims the fee and no code action is available. Accept the fee; confirm notification acceptance precedes protected view, display engages rotation, a second release is blocked and cancel/failure/stale request cases fail closed. Change the temporary physical code, update the secret, deploy and complete the authorized reset.

## Next planned milestone

v5.11.23 is the full visual-polish release. Do not begin it without a new explicit scope. Meta quick-action activation also remains a separate authorized change.

## Suggested commit

Title:

`Release v5.11.22 progressive concierge and 24/7 lost-key flow`

Description:

`Add progressive seven-category booking, deterministic property intelligence, accessible collapsible owner operations, and request-bound 24/7 lost-key recovery with explicit fee evidence, notification-before-display and rotation/replay protection; preserve production routing and configuration and expand the regression suite to 140 passing tests.`
