# Development Handoff v5.11.24

## Authoritative checkpoint

v5.11.24 is complete as a narrow booking retry/delivery-state correction built directly on the deployed v5.11.23 source. Preserve the v5.11.23 and v5.11.24 release archives. Do not reconstruct completed v5.11.19–v5.11.24 work from the pushed v5.11.18 Git baseline.

This release corrects:

1. Explicit retry misclassification after browser-memory loss.
2. Stale medical/emergency context entering booking retry responses.
3. Duplicate-risk retry behavior after the five-minute alert dedupe window.
4. Contact-only recovery after refresh without losing completed fields.
5. Missing alert-bound owner evidence for zero-accepted booking delivery.
6. Awkward provider extraction such as **Or With Master Divers**.

The full public visual redesign remains out of scope and moves to v5.11.25.

## Exact root causes

The v5.11.23 server computed `explicitBookingRetry` only after loading approved knowledge, matching ordinary intents and potentially calling OpenAI with recent history. It also required the current request to contain the browser's in-memory `delivery_failed` object. `public/ai-concierge.js` deliberately persists redacted conversation history but not workflow state or raw contact. A reload therefore left the failed alert in storage while removing the only object that activated retry.

The production retry phrase consequently reached the general/model path. That path received broad recent transcript content, including the older medical exchange, which explains both the giant new-booking checklist and the unrelated Rescue/1669 text. The stale sentence was generated from leaked context; it was not a separate hard-coded retry rule.

The v5.11.23 duplicate path also recomputed an alert dedupe key. The Durable Object's production duplicate lookup is limited to five minutes, so a later retry could create a second alert. A correct retry must address the original alert directly.

## Corrected retry boundary

`src/concierge-api.js` now detects natural explicit retry immediately after protected guest-access resolution and before knowledge retrieval, booking information, progressive collection, broad history or model fallback. The operation reads only the bound retry snapshot, current command and transient contact. Generic **try again** remains ordinary Concierge input when no retryable booking exists.

`src/concierge-store.js` adds `booking_retry_snapshots`. It stores the alert ID, reservation, room, booking category, expiry and safe completed booking fields. Its `binding_hash` is derived from reservation, room and the high-entropy protected browser session under the existing server salt/pepper. Lookup requires the same binding, reservation and room and an unexpired open/acknowledged booking alert. Cancelled snapshots are excluded.

`src/whatsapp-alerts.js` adds exact-alert retry delivery. It does not call `createAlert`. It reloads the original booking alert, verifies room, type and `booking_with_owners`, requires prior attempts and zero acceptances, reconstructs only the transient validated payload and sends under stage `retry`. Any accepted delivery returns already-sent state with no resend.

If more than one failed category is applicable, the guest receives one concise category choice. If the transient contact is missing after reload, every safe field remains and the workflow asks only for an international contact. The contact is never written to the snapshot, interaction, alert, diagnostic, dashboard or log.

Unrelated bar, check-out, Wi-Fi, property and other intents continue normally after failure. They do not retry automatically, repeat the failure or destroy the safe retry snapshot.

## Booking-delivery investigation

The runtime code and production-shape tests confirm:

- template: `house_booking_alert_v2`;
- language: `en`;
- components: BODY only;
- BODY parameters: exactly six in the established order;
- route: `booking_with_owners`;
- recipients: Fah plus Owner 1 plus Owner 2 through existing configuration;
- success boundary: accepted Graph response plus provider message ID.

No deterministic code-side mismatch was found. The prior dashboard showed only zero accepted submissions and did not preserve enough alert-bound evidence to identify the external rejection. Do not claim a Meta error until production returns one. The owner booking alert now shows the retained sanitized real response: channel/provider, route, template, language, attempted/accepted totals, HTTP status, actual error code/category/message/details and Bangkok timestamp. It never shows recipient/guest numbers, parameters, authorization, tokens, secrets, stay credentials, key codes or raw payloads.

## Provider normalization

Leading conversational filler including **or with**, **instead**, **rather**, **via** and related connectives is stripped before provider validation. Canonical casing is preserved for French Kiss Divers, Roctopus Dive and Master Divers. Unknown provider-shaped names retain their useful source casing rather than sentence-wide title-casing. Availability remains unconfirmed.

## Exact files changed from v5.11.23

Documentation and release metadata:

- `AI_CONCIERGE_OPERATIONS.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `DEVELOPMENT_GUIDELINES.md`
- `DEVELOPMENT_HANDOFF_v5.11.24.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.24.md`
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
- `public/concierge-admin.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/i18n.js`
- `public/module-registry.js`

Server and tests:

- `src/concierge-api.js`
- `src/concierge-store.js`
- `src/whatsapp-alerts.js`
- `tests/concierge.test.mjs`

## Regression and security status

- Complete source suite: 155 tests, 0 failures, up from the v5.11.23 baseline of 148.
- Retry phrase variants, exact-alert failure/success, reload/contact loss, accepted suppression, ambiguity, verified context binding, stale-history isolation and unrelated-intent priority are covered through `handleConciergeRequest`.
- A real in-memory SQLite database initializes and exercises `booking_retry_snapshots`, expiry lookup, exact alert counts and contact sanitation.
- The owner API and UI are covered for alert-bound real attempt counts, template/language/route/HTTP/provider classification and private-value exclusion.
- Existing dotted dates, side questions, Fun Diving certification, Open Water certification exemption, local-contact replacement, cleaning validation, property isolation, urgent visibility and both 24/7 lost-key reset modes remain covered.
- Production Meta mappings, recipient configuration, secrets and `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remain unchanged.
- Complete source and independently extracted archive validation includes JavaScript and Apps Script syntax, JSON, version consistency, secret/contact/key-code scans, Git integrity, Worker dry run, ZIP CRC and exact manifest comparison.

## Production deployment

1. Extract the ready-to-push v5.11.24 ZIP.
2. Run `npm install` and `npx wrangler deploy`.
3. Do not change Meta names/languages/BODY shapes, recipients, secrets, webhook settings, emergency routing, passport/Airbnb configuration or `SPARE_KEY_CODES` for this deployment.
4. Keep `WHATSAPP_STAFF_ACTIONS_ENABLED=false`. Never map `house_service_alert_actions_v1`; the intended future service-action template remains `house_service_alert_actions_v2`.
5. Run only the short checks below with non-sensitive data, report the result and stop.

## Very short production smoke test

A. Create one non-sensitive completed diving request whose protected delivery is rejected. Confirm one owner alert and open its sanitized delivery reason.

B. Say **try my diving booking again**. Confirm no giant checklist, no stale medical text, the same alert ID and a real outbound retry attempt. If accepted, confirm one normal pending-booking response; if rejected, retain the real sanitized provider reason.

C. In a separate failed request, refresh before retry. Confirm only the international contact is requested and the same alert is used afterward.

D. Ask **is there a good bar around** after failure. Confirm normal local guidance and no retry.

E. During a fresh diving request say **or with Master Divers would be even better**. Confirm **Master Divers**, preserved state and no availability promise.

Stop. Do not begin visual work.

## Next planned milestone

v5.11.25 — full visual polish.

## Suggested commit

Title:

`Release v5.11.24: bind and isolate booking delivery retry`

Description:

`Move booking retry before general/model routing, bind contact-free safe snapshots to the verified protected context and original alert, recollect only transient contact after reload, expose sanitized alert-bound delivery evidence, normalize Master Divers preferences and expand the complete suite to 155 passing tests without changing production Meta configuration.`
