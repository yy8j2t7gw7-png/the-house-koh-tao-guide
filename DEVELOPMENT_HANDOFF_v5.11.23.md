# Development Handoff v5.11.23

## Authoritative checkpoint

v5.11.23 is complete as a narrow production conversation/state correction built directly on the deployed v5.11.22 source. Preserve the v5.11.22 and v5.11.23 release archives. Do not reconstruct completed v5.11.19–v5.11.23 work from the pushed v5.11.18 Git baseline.

This release corrects:

1. Conversational side questions and validation inside all seven progressive booking workflows.
2. Shared Bangkok booking-date parsing and flexible Fun Diving certification.
3. The exact Open Water local-contact correction and protected-delivery retry boundary.
4. Property issue category/instance isolation and content-aware deduplication.
5. Manual and keyboard hiding of unresolved urgent owner-console work.
6. Truthful controlled-test and physical-rotation spare-key lock resets.

The full public visual redesign remains out of scope.

## Booking implementation

`src/concierge-api.js` keeps one authoritative booking state. Side questions and preferences are classified before the current missing-field parser, acknowledged without promising third-party availability, retained only as sanitized notes and followed by the same next missing field. The shared parser in `src/alert-policy.js` returns structured valid/past/invalid/missing date status using `Asia/Bangkok`. Every rejected field receives a concise reason.

Fun Diving accepts useful sanitized certification text and common aliases. Open Water and Advanced Open Water are course selections and do not require existing certification. The exact sequence **I wanna go diving → tomorrow → 4 → Open Water → local contact → corrected international contact** preserves date, diver count and course; both visible guest contacts are redacted; the valid international value replaces the invalid attempt and remains transient.

The untouched v5.11.22 code accepts this structured Open Water state when Meta accepts delivery. The production no-send sentence therefore identifies the zero-accepted-delivery branch, not hidden certification or contact-state validation. Two deterministic state defects followed: record-before-send deduplication made the retry skip dispatch, and the failed workflow was returned as active collection with no missing fields, so every unrelated next message completed the old booking again. `src/concierge-store.js` now returns only delivery attempt/acceptance counts for a deduplicated alert. `src/whatsapp-alerts.js` may retry a booking with attempts and zero acceptances under the same alert ID, and suppresses another send when a prior attempt was accepted. `src/concierge-api.js` and `public/ai-concierge.js` retain completed safe fields as `delivery_failed`, route unrelated bar/property/information intents normally with no resend, and invoke the retry only for an explicit command. No contact or payload values enter stored metadata or ordinary history. Success remains conditional on at least one accepted provider message ID.

Complete requests still route once through `booking_with_owners` to Fah plus both owners and remain unconfirmed until availability, current price and payment are complete.

## Property state

Routine property notes carry forward only for the same category/issue instance or an odor clarification resolving to odor. Category transitions start clean. Exact reload repeats deduplicate using category plus clean content; later distinct same-category incidents can create a new alert. Recognizable same-issue follow-ups remain local monitoring detail and can stay deduplicated. Suppressed text never becomes latent input to the next issue.

The passed pest, sewage, equipment, dirty-room, burning/electrical and informational classifiers remain unchanged in intent and routing.

## Owner urgent visibility

An unresolved urgent/critical section is forced open at render time and at the native toggle boundary. Pointer, keyboard and **Collapse all** attempts cannot keep it closed. `aria-expanded`, `aria-disabled`, the explanatory title and **Urgent · stays open** badge remain synchronized. Ordinary independent collapse returns only after the existing status policy says forced visibility is no longer required.

## Lost-key reset modes

The verified 24/7 guest release sequence is unchanged. After code display, the protected owner console offers:

- `controlled_test` / **Controlled admin test — keep existing code**, requiring exact `KEEP EXISTING CODE` confirmation;
- `physical_rotation` / **Physical key-box code rotated**, requiring exact `CODE ROTATED` confirmation after the physical box and encrypted secret are actually updated.

`src/stay-api.js` accepts only those authenticated, confirmed modes. `src/concierge-store.js` clears only an existing room rotation lock and records `rotation_cleared_controlled_test` or `rotation_cleared_physical` without any code. Historical release and used-request evidence remains intact, so neither mode permits replay.

## Exact v5.11.23 files changed from v5.11.22

Documentation and release metadata:

- `AI_CONCIERGE_OPERATIONS.md`
- `AI_CONCIERGE_PRINCIPLES.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `CONCIERGE_KNOWLEDGE_GUIDE.md`
- `DEVELOPMENT_GUIDELINES.md`
- `DEVELOPMENT_HANDOFF_v5.11.23.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.23.md`
- `ROADMAP.md`
- `SECURE_24_HOUR_LOST_KEY_ACCESS.md`
- `WHATSAPP_ALERT_OPERATIONS.md`
- `WORK_HANDOVER_PROMPT.md`
- `package.json`
- `package-lock.json`

Guest and owner UI/metadata:

- `public/ai-concierge-config.js`
- `public/ai-concierge.js`
- `public/concierge-admin.css`
- `public/concierge-admin.html`
- `public/concierge-admin.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/i18n.js`
- `public/module-registry.js`

Server and tests:

- `src/alert-policy.js`
- `src/concierge-api.js`
- `src/concierge-core.js`
- `src/concierge-store.js`
- `src/stay-api.js`
- `src/whatsapp-alerts.js`
- `tests/concierge.test.mjs`

## Regression and security status

- Complete source suite: 148 tests, 0 failures.
- Independently extracted release ZIP: 148 tests, 0 failures; ZIP CRC clean; all 221 packaged files byte-for-byte identical to the release source; exact v5.11.22 delta confirmed at 33 files; Worker dry run passed.
- Open Water is covered through the real `handleConciergeRequest` entry, final alert validator, three-recipient template delivery, unrelated bar/property routing after failure, explicit retry and accepted-duplicate boundaries—not only a helper parser.
- Cleaning, property classifiers, urgent confirmation, seven booking categories and 16:00/23:00 lost-key behavior remain covered.
- No raw contact enters visible Concierge history, API responses, interaction storage, alert records, dashboard summaries or logs. A valid booking contact exists only in the transient protected template payload.
- No key-box code enters Concierge history, alerts, Meta payloads, audit activity, logs, diagnostics, source, screenshots or release files.
- Both lost-key reset modes preserve replay protection and new-request `feeAccepted=false` behavior.
- Production Meta mappings, recipient configuration, secrets and `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remain unchanged.

## Production deployment

1. Extract the ready-to-push v5.11.23 ZIP.
2. Run `npm install` and `npx wrangler deploy`.
3. Do not change production Meta names/languages/BODY shapes, recipients, secrets, webhook settings, emergency routing, passport/Airbnb configuration or `SPARE_KEY_CODES` for this code deployment.
4. Keep `WHATSAPP_STAFF_ACTIONS_ENABLED=false`. Never map `house_service_alert_actions_v1`; the intended future service-action template remains `house_service_alert_actions_v2`.
5. Run only the short changed-function checks below with non-sensitive test data, report the result and stop.

## Very short production smoke test

A. **Booking date:** Start diving and enter `30.08.2026`; confirm acceptance. In a separate request, enter a past date and confirm an explanatory response with no alert.

B. **Booking side question:** During diving ask **Can we go with French Kiss Divers instead?** Confirm acknowledgement, no availability promise, preserved state and continuation to the same next missing field.

C. **Certification:** Select Fun Diving and enter **Dive Instructor**. Confirm the workflow advances.

D. **Open Water contact retry:** Start a fresh Open Water request, enter a local-format contact and then a corrected international contact. Confirm both visible values are redacted, the fields remain intact, exactly one Fah-plus-owner alert is produced and the normal pending-booking confirmation appears. If protected delivery is deliberately simulated to fail, confirm no success. Ask **is there a good bar around** and confirm a normal Bamboo Beach Bar answer with no retry. After recovery say **try my diving booking again** and confirm the same alert record is used.

E. **Property isolation:** In one verified session report a rat, sewage odor and an AC that is not cold. Confirm each new alert contains only its own issue/category details.

F. **Urgent admin:** Use a non-sensitive unresolved urgent test item and confirm its top-level section cannot be hidden manually or with **Collapse all**.

G. **Controlled lost-key reset:** In an authorized owner-only test state, confirm the controlled-test/retain-code action requires deliberate typed confirmation, clears the lock, writes a truthful code-free activity entry and leaves the historical request unusable. Do not perform an unnecessary physical rotation for this smoke test.

## NEXT PLANNED MILESTONE

v5.11.24 — full visual polish.

Stop after the v5.11.23 deployment smoke result. Do not begin visual work automatically.

## Suggested commit

Title:

`Release v5.11.23: correct conversation and workflow state`

Description:

`Correct booking side-question/date/certification/contact-delivery state, isolate property issue instances, force unresolved urgent owner work open, add truthful protected lost-key reset modes, preserve production configuration and expand the complete suite to 148 passing tests.`
