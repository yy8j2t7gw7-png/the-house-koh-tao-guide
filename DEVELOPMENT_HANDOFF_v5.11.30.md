# Development Handoff v5.11.30

## Authoritative checkpoint

v5.11.30 is complete and was built directly from the deployed v5.11.29 archive. Preserve both archives. Do not reconstruct completed v5.11.19–v5.11.30 work from the older pushed v5.11.18 Git baseline.

This release is a narrow routing and action-policy correction. It does not redesign the approved interface or change protected booking, WhatsApp, emergency, registration or lost-key authorization boundaries.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`

Do not change production Meta templates, language codes, BODY schemas/order, routes, recipients, contact mappings, secrets, passport storage, Airbnb configuration or `SPARE_KEY_CODES` while deploying this archive.

## Exact production causes

### Generic request inherited lost-key history

The anchored `GENERIC_HUMAN_CONTACT_REQUEST` introduced in v5.11.29 did not support `wanna` in its talk/speak branch. The exact production phrase **I wanna talk to a human** therefore bypassed deterministic routing and reached history-aware model handling. Because an old lost-key exchange was included in model context, the model answered about a lost key even though the current message named no topic.

In addition, `activeLostKeyFeePrompt(history)` treated a pair of transcript messages as proof that a workflow was active. Visible conversation history is not authoritative workflow state.

### Contact Us survived closed hours

`applyRoutineContactAvailability()` removed `houseCall` whenever routine service was closed, but removed `houseWhatsapp` only if the current question matched the generic-human regex. `public/ai-concierge.js` used the same conditional in `resolveAction()`. When the exact production phrase missed the regex, **Call Us** was suppressed but routine **Contact Us** remained actionable.

## Exact state and routing fix

`src/concierge-api.js` expands the whole-message generic matcher to the approved human, person, someone, staff, team, reception, speak, talk, call and contact forms. It evaluates the current normalized message before pending urgent clarification, approved knowledge and model routing. Current explicit safety and lost-key classifications retain priority.

The lost-key fee prompt returns only:

`{ type: "lost_key", status: "awaiting_fee_acceptance" }`

The request boundary sanitizes that state and discards every other lost-key shape. The generic-human route may acknowledge a pending spare-key process only from this explicit state. A transcript that merely looks like a fee prompt has no effect. The browser retains the same explicit state until the protected flow changes or an ordinary result clears it.

This state is intentionally non-authorizing: it contains no fee acceptance, room/stay/session identifier, notification evidence, release capability, code or rotation data. Actual lost-key authorization remains entirely within the protected current-stay Room-page flow.

## Exact CTA gate fix

`src/concierge-api.js` now filters both routine routes whenever `housekeepingAvailability(now).open` is false:

- `houseWhatsapp`
- `houseCall`

The filter is unconditional on intent and therefore also catches approved-knowledge, fallback or model-derived metadata.

`public/ai-concierge.js` independently classifies both routes as `routineHouseContact`, suppresses them during action resolution while closed, marks rendered routine links and blocks new or stale/cached House contact links on click. The click check compares both the shared marker and the current configured House call/WhatsApp destinations before any navigation can begin.

Emergency routes are distinct and are not filtered. Routine availability remains Tuesday–Sunday 10:30–19:30 Bangkok time, with Monday closed.

## Files changed from v5.11.29

- `CHANGELOG.md`
- `DEVELOPMENT_HANDOFF_v5.11.30.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.30.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`
- `package-lock.json`
- `package.json`
- `public/ai-concierge-config.js`
- `public/ai-concierge.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/i18n.js`
- `public/module-registry.js`
- `src/concierge-api.js`
- `tests/concierge.test.mjs`

## Tests

Two new tests expand the complete suite from 176 to 178 tests. Existing v5.11.29 cases are also strengthened:

1. exact production **I wanna talk to a human** uses the deterministic route before a deliberately stale model response and makes zero model calls;
2. current topic-specific lost-key human requests retain 24/7 protected self-service and obey human-contact hours;
3. the full neutral phrase set is checked at Saturday 08:20, Saturday 15:00 and Monday 15:00 Bangkok time;
4. old lost-key, diving, cleaning, luggage, AC, maintenance and medical topics remain inert;
5. explicit pending lost-key state is distinguished from transcript-only history;
6. both routine routes are blocked at server, browser render and stale-click boundaries, while Emergency help remains available.

The full source suite passes: 178 passed, 0 failed.

## Validation

- source suite: 178 passed, 0 failed;
- independently extracted archive suite: 178 passed, 0 failed;
- 36 JavaScript/ES-module files and `airbnb-sync/Code.gs` passed syntax checks;
- all 12 JSON files parsed successfully;
- v5.11.30 version consistency, seven exact root/module mirrors and Git whitespace checks passed;
- release-delta credential, private-contact, key-code and protected-media scans passed;
- 16 protected booking/Meta, recipient, stay, emergency, passport-storage, Airbnb, maintenance and key-code modules match v5.11.29;
- Worker dry run was not executed: compatible local Wrangler 4.122.0 was found, but the command-approval connection disconnected before Wrangler started. Run the command below before production push and stop if it fails;
- ZIP CRC passed and the 237-file source/archive manifests match exactly.

## Deployment

1. Extract `The-House-Koh-Tao-v5.11.30-ready-to-push.zip`.
2. Run `npm install`, then `npx wrangler deploy --dry-run`. Stop if it fails.
3. Run `npx wrangler deploy` only after the dry run passes.
4. Do not change production templates, routes, recipients, secrets, contact mappings, passport/Airbnb configuration or `SPARE_KEY_CODES`.
5. Keep `EXPLORE_ENABLED=false` and `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.
6. No data migration is required.

## Very short production smoke test

1. At a closed time after an old lost-key exchange, ask **I wanna talk to a human**. Require neutral closed-hours wording and separate **Emergency help**, with no lost-key/500 THB language, **Contact Us** or **Call Us**.
2. At Saturday 15:00, ask the same phrase. Require neutral wording and the permitted routine contact controls, with no inherited topic.
3. At Monday 15:00, require the same closed-hours suppression of both routine controls.
4. Ask **I need to talk to someone about my lost key** after hours. Require protected spare-key continuation and no routine contact controls. Stop before fee acceptance; do not release a key for this smoke test.

## Suggested GitHub release text

Title:

`Release v5.11.30: isolate generic human intent and hard-gate routine contact`

Description:

`Route the exact production phrase “I wanna talk to a human” and all approved neutral variants from the current message before transcript-aware handling; replace transcript-shaped lost-key context with explicit non-authorizing workflow state; and suppress both routine Contact Us and Call Us at the final server, browser render and stale-click boundaries outside Tuesday–Sunday 10:30–19:30 Bangkok hours. Emergency help and protected 24/7 lost-key self-service remain separate. All 178 tests pass.`

Stop after v5.11.30. Do not begin another release automatically.
