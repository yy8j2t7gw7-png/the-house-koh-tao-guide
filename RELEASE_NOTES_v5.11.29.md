# Release Notes v5.11.29

## Outcome

v5.11.29 is a narrow functional consistency patch built directly from the deployed v5.11.28 source. It fixes the mixed **Room 11 + Complete guest access** state, makes generic human-contact requests independent of stale conversation topics and hard-gates ordinary **Call Us** actions outside House service hours.

The approved v5.11.28 visual system is unchanged. The protected lost-key flow remains available 24 hours a day, while emergency support remains separate from routine human contact.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`

No Meta template, language, BODY schema, parameter order, recipient route, phone mapping, secret or production integration changed.

## Verified Room state correction

### Root cause

`public/ai-concierge.js` obtained the displayed room independently from the URL or `localStorage`, but selected the quick-action menu once from the static page attribute `document.body.dataset.guestAccess`. On `room-access.html`, the value `pending` describes incomplete guest registration, not an unverified stay. The Concierge therefore treated a registration state as an access-authorization state and could show a verified Room header with the public **Complete guest access** menu.

### Authoritative state

`src/stay-api.js` now exposes two separate dimensions from the protected, cookie-bound `/api/stay/status` response:

- `conciergeAccess`: `verified` or `unverified`, derived from the current verified stay session;
- `registrationIncomplete`: derived independently from the reservation registration status.

The status endpoint may resolve the room from the current protected session when no room query is supplied. A supplied room must still be active and match that session. No reservation identifier, token, passport data or other protected identifier is returned.

`public/ai-concierge.js` loads this response with same-origin credentials and uses its one room value for the Room header and its `conciergeAccess` value for the menu. A verified guest receives `quickActions`; an unverified guest receives `publicQuickActions`. The independent registration flag controls only the non-blocking **Registration incomplete** line.

The client refreshes this state after verification, when the Concierge reopens, on `pageshow` and after an explicit `house:stay-access-updated` event. A network/status failure falls back to the existing page access mode and does not grant new access.

### Resulting matrix

- unverified stay: pre-access controls such as **Complete guest access** and **Emergency help**;
- verified stay + incomplete registration: Room-bound verified menu plus **Registration incomplete**, with no **Complete guest access**;
- verified stay + complete registration: Room-bound verified menu without the reminder;
- verified Thai-exempt stay: Room-bound verified menu without an incorrect passport reminder.

Registration truth is not changed or fabricated. Passport/registration completion remains required only where the existing protected content rules explicitly require it. It does not downgrade verified-stay Concierge authorization and is not added as a prerequisite to lost-key self-service.

## Generic human-contact correction

### Root cause

A neutral request such as **I need to talk to a human** had no deterministic current-message route. It could reach history-aware knowledge/model handling, where old lost-key or other workflow text could become the answer topic. Routine phone actions were also not universally filtered at the final server action boundary or defended at browser click time, so generated metadata or a stale button could expose `houseCall` while service was closed.

### Current-message routing

`src/concierge-api.js` uses an anchored `GENERIC_HUMAN_CONTACT_REQUEST` matcher for the approved neutral human, staff, team, reception and call phrases. This policy executes before public-access, approved-knowledge and model routing, so unverified guests may still ask for safe help and old lost-key, booking, cleaning, maintenance, luggage or medical history cannot silently define the topic.

An immediately adjacent active lost-key fee prompt may be acknowledged. The acknowledgement does not accept the fee, create an alert, send a notification or authorize/display a code. Older, completed, cancelled, failed or abandoned workflow text is treated as history rather than the current topic.

### Routine contact hours

The server uses the established Bangkok-time `housekeepingAvailability(now)` policy:

- Tuesday–Sunday: 10:30–19:30;
- Monday: closed.

During open hours, a neutral request receives the established safe House WhatsApp and **Call Us** actions. Outside those hours, it receives Concierge availability plus a link to **Emergency help**, with neither routine WhatsApp handoff nor **Call Us**.

### Hard Call Us enforcement

The availability rule does not rely on response wording or model compliance:

1. `src/concierge-api.js` removes `houseCall` from every final result while routine service is closed, including model-derived handoff metadata and post-delivery result mutations.
2. `public/ai-concierge.js` recomputes Tuesday–Sunday 10:30–19:30 in `Asia/Bangkok` and refuses to render a routine call action while closed.
3. The delegated click handler detects both newly marked and old/stale routine House call links. If closed, it prevents navigation before the emergency handler, removes the stale action row and shows closed-hours wording with separate **Emergency help**.

Emergency telephone actions use their existing distinct routes and are not disabled. A generic request to call someone is not automatically classified as an emergency.

## Lost-key behavior retained

The v5.11.28 lost-key matcher and the established protected 24/7 workflow remain authoritative:

verified active stay → `500 THB` explanation → explicit current-request acceptance → accepted protected notification → protected Room-page display → rotation lock.

Routine service hours do not disable this self-service flow, and after-hours human contact is not substituted for it. No key-box code appears in Concierge, WhatsApp, alerts, diagnostics, logs, screenshots or release files.

## Files changed from v5.11.28

Runtime and guest UI:

- `src/concierge-api.js`
- `src/stay-api.js`
- `public/ai-concierge.js`
- `public/registration-entry.js`
- `public/ai-concierge.css`
- `public/i18n.js`

Tests:

- `tests/concierge.test.mjs`

Release metadata and documentation:

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
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/module-registry.js`

## Regression coverage

Seven new tests expand the suite from 169 to 176:

1. twelve neutral human/call phrases at Saturday 00:17, Saturday 15:00 and Monday 15:00 Bangkok time;
2. inactive lost-key, diving, cleaning, AC, luggage and medical history cannot contaminate a new generic call request;
3. an immediately active lost-key fee prompt is handled correctly in open and closed hours without acceptance, alert or release;
4. unverified, verified-incomplete, passport-pending, registration-complete and Thai-exempt stay-status states remain distinct;
5. Room header, verified menu and registration reminder refresh from one authoritative status response;
6. browser action rendering and stale-link click handling independently block routine calls outside hours;
7. the final server policy removes a model-derived `houseCall` action outside hours.

The existing lost-key phrase, booking, mixed-party, Meta sanitizer, explicit retry, property, cleaning, luggage, emergency, maintenance, diagnostics, passport privacy and Airbnb tests continue to pass.

## Validation result

- source suite: 176 passed, 0 failed;
- independently extracted archive suite: 176 passed, 0 failed;
- JavaScript/ES-module and Airbnb Apps Script syntax checks passed;
- all JSON files parsed successfully;
- v5.11.29 version consistency, seven root/module mirrors and Git whitespace checks passed;
- release-delta credential, contact, key-code, protected-image and screenshot scans passed;
- protected booking/Meta, recipient, emergency, passport-storage, Airbnb and key-code modules match v5.11.28;
- Worker dry run was not executed in this workspace: compatible local Wrangler 4.122.0 was found, but the command-approval connection rejected both non-mutating `deploy --dry-run` attempts before Wrangler started. Run the command in the deployment step and stop if it fails;
- ZIP CRC and source/archive manifest comparison passed.

## Production smoke test

1. Open verified Room 11 with registration incomplete: confirm **Room 11**, the verified menu and **Registration incomplete**, with no **Complete guest access**.
2. Check **I wanna call you** once during open hours and once during closed hours. Only the open-hours result may expose routine **Call Us**; closed hours must retain separate **Emergency help**.
3. After an old lost-key exchange, ask **I need to talk to a human** and confirm the answer is topic-neutral.
4. Type **lost key** and confirm the protected `500 THB` prompt. Stop before accepting; do not display a real spare-key code.

Stop after v5.11.29. No later release is authorized automatically.
