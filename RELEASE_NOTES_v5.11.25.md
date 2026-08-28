# Release Notes v5.11.25

## Outcome

v5.11.25 is a narrow Meta template-parameter sanitization hotfix built directly on the deployed v5.11.24 source. It fixes the real provider rejection captured by the protected owner diagnostics and does not begin the public visual redesign. Full visual polish moves to v5.11.26.

Production mappings, languages, BODY parameter counts/order, routes, recipients, secrets, webhooks and quick-action state are unchanged. `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remains required.

## Confirmed production root cause

A complete diving booking correctly reached the official WhatsApp delivery boundary under:

- route `booking_with_owners`;
- template `house_booking_alert_v2`;
- language `en`;
- six ordered BODY parameters;
- three attempted recipients and zero accepted deliveries.

Meta returned HTTP `400`, error `132018`, with the actual provider rule that a textual template parameter cannot contain newline/tab characters or excessive consecutive spaces. The template selection, language, schema and routing were correct. The invalid formatting came from meaningful booking content being joined into a textual BODY value without a final Meta-specific single-line whitespace pass. `appendProtectedContact()` also deliberately separates the transient contact with a newline before serialization, so the correction belongs at the final common boundary rather than in one booking field or template.

## Exact implementation location

`src/whatsapp-alerts.js` now contains `normalizeTemplateTextParameter()` immediately above the existing shared `textParameters()` function.

`textParameters()` is the final BODY serialization boundary used by:

- service alerts;
- luggage alerts;
- booking alerts;
- urgent alerts;
- lost-key alerts;
- status notifications;
- future action-template BODY values when separately enabled.

For each textual value, the helper:

1. converts every Unicode whitespace run, including CR, LF and tabs, to one ordinary space;
2. trims leading and trailing whitespace;
3. preserves meaningful text and parameter position;
4. applies the existing 900-character maximum after normalization;
5. retains `Not provided` only for an actually empty value.

Meta error `132018` is also classified as `template_parameters`. Diagnostics remain value-free and never log or store the normalized parameter content.

## Preserved boundaries

- `house_booking_alert_v2`, `en`, six BODY values and `booking_with_owners` are unchanged.
- No BODY parameter is added, removed or reordered.
- Recipient resolution and three-recipient booking routing are unchanged.
- Raw guest contact remains transient and may appear only in its intended protected outbound parameter.
- Contacts, parameter values, key-box codes, tokens, secrets and raw payloads remain absent from interactions, alert storage, diagnostics, dashboards and logs.
- Lost-key notification-before-code and rotation safeguards remain fail closed.
- The v5.11.24 exact-alert retry, accepted-delivery suppression, safe reload snapshot and unrelated-intent behavior are unchanged.
- Staff quick actions remain disabled; button payloads are not text BODY parameters and are not altered.

## Exact files changed from v5.11.24

Implementation and tests:

- `src/whatsapp-alerts.js`
- `tests/concierge.test.mjs`

Release/runtime metadata:

- `package.json`
- `package-lock.json`
- `src/concierge-api.js`
- `public/ai-concierge-config.js`
- `public/concierge-admin.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/i18n.js`
- `public/module-registry.js`

Documentation:

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

## Tests added

Two production-boundary regressions expand the complete suite from 155 to 157 tests:

1. **Meta BODY serialization removes invalid whitespace without changing booking parameter order or privacy**
   - uses multiline Open Water booking text, CR/LF, tabs and long space runs;
   - proves exactly six ordered BODY parameters;
   - proves meaningful date, course and notes survive as one line;
   - confines the protected contact to the final outbound parameter.
2. **The centralized Meta text sanitizer protects service, status and future action-template BODY values**
   - proves the same function covers a second alert category, status and enabled action-template BODY construction;
   - proves no CR, LF, tab or repeated whitespace remains;
   - verifies `132018` classification without parameter/contact leakage.

The complete suite passes 157/157 with zero failures.

## Deployment

Extract `The-House-Koh-Tao-v5.11.25-ready-to-push.zip` and deploy to the existing Worker:

```sh
npm install
npx wrangler deploy
```

Do not change the six production template names, language mappings, BODY schemas, recipients, routes, secrets, webhook settings, `SPARE_KEY_CODES` or `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.

## One-step production booking smoke test

Create one fresh non-sensitive diving booking and complete it normally.

Expected result: exactly one booking alert record, three attempted WhatsApp recipients, at least one accepted delivery, one received booking message and the normal guest pending-booking confirmation. If Meta still rejects it, capture the new sanitized owner diagnostic and stop; do not guess or change configuration.

## Next planned milestone

v5.11.26 — full visual polish.

