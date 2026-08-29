# Release Notes v5.11.30

## Outcome

v5.11.30 is a narrow production correction built directly from deployed v5.11.29. It makes a generic human request a deterministic, current-message-only intent and closes the remaining after-hours **Contact Us** path at the server, render and click boundaries.

The release does not redesign the interface or change booking, Meta, recipient, emergency, passport, Airbnb or spare-key authorization behavior.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`

No Meta template, language, BODY schema, parameter order, recipient route, phone mapping, secret or production integration changed.

## Actual root cause: stale lost-key context

The v5.11.29 generic-human matcher was anchored correctly but incomplete. It accepted **I need to talk to a human** and `wanna` call phrases, but its talk/speak branch did not accept **I wanna talk to a human**. The exact production phrase therefore missed the deterministic policy and continued into history-aware knowledge/model handling. Old lost-key messages were included there, allowing the model to answer the new neutral request as though it were about a lost key.

v5.11.29 also inferred an “active” lost-key fee prompt from the last two transcript messages. That transcript shape was not authoritative structured state and could keep an old topic semantically active.

## State and routing fix

`src/concierge-api.js` now recognizes the complete approved neutral human/contact phrase set from the normalized current message before pending urgent clarification, public/approved knowledge and model handling. The matcher remains whole-message anchored, so **I need to talk to someone about my lost key** is topic-specific rather than generic.

The lost-key fee prompt now returns explicit safe workflow state:

`{ type: "lost_key", status: "awaiting_fee_acceptance" }`

`cleanWorkflowState()` accepts only that non-authorizing lost-key shape. `genericHumanContactResult()` may acknowledge the spare-key process only when this explicit state is present. The same visible transcript without that state is topic-neutral.

This state contains no stay ID, room authorization, fee acceptance, notification evidence, release token or key-box data. It cannot accept the fee, send an alert, authorize display or bypass the protected Room-page flow.

Current explicit safety and lost-key intent still take priority. A current topic-specific lost-key human request may acknowledge the lost-key topic, but routine human-contact availability still applies and secure self-service remains available 24/7.

## Actual root cause: after-hours Contact Us

The v5.11.29 final server filter always removed `houseCall` while closed but removed `houseWhatsapp` only when the current question matched `GENERIC_HUMAN_CONTACT_REQUEST`. The browser renderer repeated that conditional design. Because the exact production phrase missed the matcher, **Call Us** disappeared while routine **Contact Us** survived.

## CTA gate fix

Routine House contact is now one action class containing both:

- `houseWhatsapp` — routine **Contact Us**;
- `houseCall` — routine **Call Us**.

Outside Tuesday–Sunday 10:30–19:30 Bangkok time, with Monday closed:

1. `src/concierge-api.js` removes both routes from every final response, independent of intent classification or generated metadata.
2. `public/ai-concierge.js` refuses to resolve/render either route after independently calculating Bangkok availability.
3. Rendered routine links carry a shared marker, and the delegated click handler also recognizes old/cached links by their current House WhatsApp or telephone destinations. It prevents navigation, removes the stale action row and presents closed-hours wording plus separate **Emergency help**.

Emergency telephone and WhatsApp routes are not part of this routine class and remain governed by their existing policies.

## Files changed from v5.11.29

Runtime:

- `src/concierge-api.js`
- `public/ai-concierge.js`

Tests:

- `tests/concierge.test.mjs`

Release metadata and documentation:

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
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/i18n.js`
- `public/module-registry.js`

## Regression coverage

Two new tests expand the suite from 176 to 178, while existing v5.11.29 tests are strengthened:

1. the exact production phrase bypasses a deliberately stale lost-key model response before the model can be called;
2. a current topic-specific lost-key human request keeps 24/7 secure self-service while obeying open/closed human-contact hours;
3. the full approved generic phrase set receives deterministic Saturday 08:20, Saturday 15:00 and Monday 15:00 behavior;
4. lost-key, diving, cleaning, luggage, AC, maintenance and medical transcript history cannot contaminate a neutral request;
5. only explicit pending lost-key workflow state may be acknowledged; identical transcript text without state is neutral;
6. server, browser render and stale-click boundaries suppress both routine contact routes while preserving Emergency help.

All established verified-stay, registration, lost-key phrase/security, booking, mixed-diver, Meta sanitizer, explicit retry, property, cleaning, luggage, emergency, maintenance, diagnostics, passport privacy and Airbnb tests remain active.

## Validation result

- source suite: 178 passed, 0 failed;
- independently extracted archive suite: 178 passed, 0 failed;
- 36 JavaScript/ES-module files and `airbnb-sync/Code.gs` passed syntax checks;
- all 12 JSON files parsed successfully;
- v5.11.30 version consistency, seven exact root/module mirrors and Git whitespace checks passed;
- release-delta credential, private-contact, key-code and protected-media scans passed;
- 16 protected booking/Meta, recipient, stay, emergency, passport-storage, Airbnb, maintenance and key-code modules match v5.11.29;
- the Worker dry run could not execute in this workspace: compatible local Wrangler 4.122.0 was found, but the command-approval connection disconnected before Wrangler started. Run `npx wrangler deploy --dry-run` before production deployment and stop if it fails;
- ZIP CRC and the 237-file source/archive manifest comparison passed.

## Production smoke test

1. After an old lost-key conversation, ask **I wanna talk to a human** at a closed time. Require neutral closed-hours wording, **Emergency help**, no lost-key/500 THB language and neither routine **Contact Us** nor **Call Us**.
2. At an open time, ask the same phrase. Require neutral contact wording and the permitted routine controls, with no inherited topic.
3. Confirm Monday 15:00 is closed for both routine controls.
4. Ask **I need to talk to someone about my lost key** after hours. Require continuation of the protected spare-key process plus closed-hours wording and no routine contact controls. Stop before accepting the fee.

Stop after v5.11.30. No later release is authorized automatically.
