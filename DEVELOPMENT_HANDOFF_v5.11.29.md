# Development Handoff v5.11.29

## Authoritative checkpoint

v5.11.29 is complete and was built directly from the deployed v5.11.28 archive. Preserve both archives. Do not reconstruct completed v5.11.19–v5.11.29 work from the older pushed v5.11.18 Git baseline.

This is a narrow functional consistency patch. It separates verified-stay authorization from passport/registration completion, makes generic human-contact intent current-message-only and hard-gates routine House calls outside service hours. It does not redesign the approved v5.11.28 interface.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`

Do not change production Meta templates, language codes, BODY schemas/order, routes, recipients, contact mappings, secrets, passport storage, Airbnb configuration or `SPARE_KEY_CODES` while deploying this archive.

## Exact production causes

### Verified Room with unverified menu

`public/ai-concierge.js` populated its Room header from the route or remembered room, but chose its quick menu once from `document.body.dataset.guestAccess`. The `pending` value on `room-access.html` represents incomplete registration. Treating that value as stay authorization conflated two independent dimensions and created the invalid **Room 11 + Complete guest access** state.

The authoritative UI source is now the protected, same-origin `/api/stay/status` response in `src/stay-api.js`. It validates the current signed stay-session cookie and resolves the session room. Its explicit fields keep the dimensions separate:

- `conciergeAccess` controls verified versus pre-access Concierge operations;
- `registrationStatus`, `accessGranted` and `registrationIncomplete` report registration truth independently.

`public/ai-concierge.js` uses the same response room for its header and `conciergeAccess` for its quick menu. `registrationIncomplete` controls only a visible, non-blocking reminder. It refreshes on initialization, after stay verification, when the panel reopens and on `pageshow`. No new authorization is stored in the browser.

### Stale lost-key wording on a generic human request

Generic human/contact phrases previously had no deterministic current-message route. They could reach broad, history-aware knowledge or model handling and inherit an old lost-key topic. `src/concierge-api.js` now recognizes an anchored set of topic-neutral phrases before public-access, knowledge and model routing.

Only an immediately adjacent, exact lost-key fee prompt counts as an active context worth acknowledging. Completed, cancelled, failed, abandoned or older workflow history does not define a later generic request. This recognition performs no fee acceptance, alert creation, notification or key release.

## Routine human-contact hours and hard gate

Routine House contact is available Tuesday–Sunday from 10:30 through 19:29 Bangkok time. Monday is closed.

The server uses the existing `housekeepingAvailability(now)` clock in `src/concierge-api.js`. `genericHumanContactResult()` returns existing routine contact routes while open and only Concierge wording plus **Emergency help** while closed. `applyRoutineContactAvailability()` filters `houseCall` from every closed-hours result at the early policy, generated-result and final post-delivery boundaries. This also catches unexpected model-derived action metadata.

`public/ai-concierge.js` independently calculates the same window using `Intl.DateTimeFormat` with `Asia/Bangkok`. `resolveAction()` refuses to render routine `houseCall` while closed. Rendered routine call anchors are marked, and the delegated click handler also compares stale House telephone links to the current route. It prevents the click and shows closed-hours behavior before any call can start.

Emergency actions retain their existing separate routes and click behavior. Generic call intent is not an emergency. The protected lost-key flow remains available 24/7 and never requires routine staff calling.

## Registration matrix

- unverified: public/pre-access menu; no verified-room operations;
- verified + `not_started` or `passport_pending`: verified menu plus **Registration incomplete**; no **Complete guest access**;
- verified + completed registration: verified menu; no incomplete reminder;
- verified + `thai_exempt`: verified menu; no erroneous passport reminder.

Registration status remains truthful. This patch does not mark passports complete, expose protected room content early or weaken any feature-specific registration rule.

## Files changed from v5.11.28

- `CHANGELOG.md`
- `DEVELOPMENT_HANDOFF_v5.11.29.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.29.md`
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
- `public/i18n.js`
- `public/module-registry.js`
- `public/registration-entry.js`
- `src/concierge-api.js`
- `src/stay-api.js`
- `tests/concierge.test.mjs`

## Tests

Seven new regressions expand the complete suite from 169 to 176 tests:

1. all approved neutral human/call phrases receive deterministic open/closed behavior at Saturday 00:17, Saturday 15:00 and Monday 15:00 Bangkok time;
2. old lost-key, diving, cleaning, AC, luggage and medical history cannot contaminate a generic call request;
3. an active lost-key fee prompt may be acknowledged without accepting the fee, creating an alert or displaying a code;
4. unverified, verified-incomplete, passport-pending, complete and Thai-exempt stay-status responses remain distinct;
5. the Room header, menu and reminder use and refresh one authoritative status;
6. browser rendering and stale-click handling independently hard-gate routine House calls;
7. final server action filtering removes a model-derived routine **Call Us** after hours.

Every v5.11.28 lost-key phrase test remains active. The complete booking, mixed-diver, Meta sanitizer, delivery retry, property, cleaning, luggage, emergency, maintenance, diagnostics, passport privacy and Airbnb coverage also remains active.

## Validation

- source suite: 176 passed, 0 failed;
- independently extracted archive suite: 176 passed, 0 failed;
- JavaScript/ES-module and `airbnb-sync/Code.gs` syntax checks passed;
- all JSON files parsed successfully;
- v5.11.29 version consistency, seven exact root/module mirrors and Git whitespace checks passed;
- release-delta credential/contact/key-code/protected-image/screenshot scans passed;
- protected booking/Meta, recipient, emergency, passport-storage, Airbnb and key-code modules match v5.11.28;
- Worker dry run was not executed in this workspace: compatible local Wrangler 4.122.0 was found, but the command-approval connection rejected both non-mutating `deploy --dry-run` attempts before Wrangler started. Run the command below before production push and stop if it fails;
- ZIP CRC passed and source/archive manifests match exactly.

## Deployment

1. Extract `The-House-Koh-Tao-v5.11.29-ready-to-push.zip`.
2. Run `npm install`, then `npx wrangler deploy --dry-run`. Stop if it fails.
3. Run `npx wrangler deploy` only after the dry run passes.
4. Do not change production templates, routes, recipients, secrets, contact mappings, passport/Airbnb configuration or `SPARE_KEY_CODES`.
5. Keep `EXPLORE_ENABLED=false` and `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.
6. No data migration is required.

## Very short production smoke test

1. Open verified Room 11 with incomplete registration: require the verified menu plus **Registration incomplete**, never **Complete guest access**.
2. Ask **I wanna call you** during open and closed hours: routine **Call Us** appears only while open; closed hours retain separate **Emergency help**.
3. After an old lost-key exchange, ask **I need to talk to a human**: require neutral wording.
4. Ask **lost key**: require the protected `500 THB` prompt, then stop before acceptance.

## Suggested GitHub release text

Title:

`Release v5.11.29: separate verified stay state and hard-gate routine calls`

Description:

`Keep verified Room guests on the verified Concierge menu while reporting incomplete registration separately; route neutral human-contact requests from the current message without stale workflow contamination; and enforce Tuesday–Sunday 10:30–19:30 Bangkok routine contact at the final server action, browser render and stale-click boundaries. Emergency help stays separate and protected lost-key self-service remains available 24/7. All 176 tests pass.`

Stop after v5.11.29. Do not begin another release automatically.
