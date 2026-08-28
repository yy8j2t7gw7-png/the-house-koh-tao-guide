# Development Handoff v5.11.25

## Authoritative checkpoint

v5.11.25 is complete as a small Meta template-parameter sanitization hotfix built directly on deployed v5.11.24. Preserve the v5.11.24 and v5.11.25 release archives. Do not reconstruct completed v5.11.19–v5.11.25 work from the older pushed v5.11.18 Git baseline.

The public visual redesign remains out of scope and moves to v5.11.26.

## Confirmed production cause

The v5.11.24 owner diagnostic captured the real booking delivery rejection:

- Meta HTTP `400`;
- error code `132018`;
- template `house_booking_alert_v2`;
- language `en`;
- route `booking_with_owners`;
- three attempted, zero accepted;
- provider detail: textual parameters cannot contain newline/tab characters or excessive consecutive spaces.

The template name, language, six-BODY schema, order and recipient routing were correct. Meaningful booking notes and the deliberately separated protected reply contact could contain whitespace that remained valid internally but was invalid under Meta's template-parameter rules.

## Corrected common boundary

The implementation is in `src/whatsapp-alerts.js` at `normalizeTemplateTextParameter()` and the shared `textParameters()` BODY serializer.

Before the payload is JSON-serialized for Graph API submission, each textual parameter has every Unicode whitespace run converted to one ordinary space, is trimmed and then receives the existing 900-character limit. The same function is used by service, luggage, booking, urgent, lost-key and status payloads as well as future enabled action-template BODY values.

No template schema, parameter position, action payload, route, recipient or production configuration changed. Error `132018` now receives the safe diagnostic category `template_parameters`; raw values are not logged.

## Privacy and regression status

- Raw contact remains transient and confined to the intended protected outbound parameter.
- Stored alerts, interactions, retry snapshots, delivery records, diagnostics and owner pages remain contact-free.
- Key-box codes, access tokens, secrets, request authorization and raw payloads remain excluded.
- v5.11.24 same-alert retry, reload/contact-only recovery, accepted suppression, ambiguity handling and stale-history isolation remain unchanged.
- Existing service, luggage, booking, urgent, lost-key and status template counts/languages remain covered.
- Staff quick actions remain disabled and the accidental buttonless service action v1 remains unusable.

## Exact files changed from v5.11.24

- `AI_CONCIERGE_OPERATIONS.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `DEVELOPMENT_GUIDELINES.md`
- `DEVELOPMENT_HANDOFF_v5.11.25.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.25.md`
- `ROADMAP.md`
- `SECURE_24_HOUR_LOST_KEY_ACCESS.md`
- `WHATSAPP_ALERT_OPERATIONS.md`
- `WORK_HANDOVER_PROMPT.md`
- `package-lock.json`
- `package.json`
- `public/ai-concierge-config.js`
- `public/concierge-admin.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/i18n.js`
- `public/module-registry.js`
- `src/concierge-api.js`
- `src/whatsapp-alerts.js`
- `tests/concierge.test.mjs`

## Tests and validation

Two tests were added:

- production-style multiline Open Water content becomes six ordered, single-line Meta-safe BODY values with the protected contact confined to the final parameter;
- service, status and future action-template BODY construction share the same sanitizer, reject CR/LF/tab/repeated whitespace and keep `132018` diagnostics value-free.

The complete suite contains 157 tests and passes with zero failures. Release validation also covers JavaScript syntax, Apps Script syntax, JSON parsing, version consistency, secret/contact/key-code scans, Git integrity, Worker dry run, ZIP CRC, exact source/archive manifest comparison and a complete independently extracted ZIP test run.

## Production deployment

1. Extract `The-House-Koh-Tao-v5.11.25-ready-to-push.zip`.
2. Run `npm install` and `npx wrangler deploy`.
3. Do not change Meta names, languages, BODY counts/order, routes, recipients, secrets, webhook settings, emergency routing, passport/Airbnb configuration or `SPARE_KEY_CODES`.
4. Keep `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.

## One-step production booking smoke test

Create one fresh non-sensitive diving booking and complete it normally. Confirm exactly one booking alert, three WhatsApp attempts, at least one accepted delivery, one received booking message and the natural pending-booking guest confirmation.

If Meta still rejects the request, capture only the new sanitized owner diagnostic and stop. Do not infer another cause or change production configuration without that evidence.

## Next planned milestone

v5.11.26 — full visual polish. Stop after the v5.11.25 smoke test; do not begin visual work automatically.

## Suggested commit

Title:

`Release v5.11.25: sanitize Meta template text parameters`

Description:

`Normalize every outbound Meta template BODY text value at the shared serialization boundary, preserve all schemas and protected data rules, classify real error 132018 safely, and expand the complete suite to 157 passing tests.`

