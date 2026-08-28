# Release Notes v5.11.24

## Outcome

v5.11.24 is a narrow booking retry/delivery-state correction built directly on the deployed v5.11.23 source. It does not begin the public visual redesign; that milestone moves to v5.11.25.

Production Meta mappings, recipients, secrets, webhooks and quick-action state are unchanged. `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remains required.

## Root causes and corrections

### Explicit retry misclassification

v5.11.23 recognized explicit retry only after approved-knowledge retrieval, deterministic/general result selection and the possible OpenAI call. The retry flag also required the browser to send its in-memory `delivery_failed` workflow. A page reload initializes that object to `null`, even though the failed alert remains in protected storage. The production phrase **try my diving booking again** therefore entered the general conversation path rather than the delivery operation.

v5.11.24 recognizes natural retry commands at the protected request boundary before knowledge retrieval, booking-information logic, progressive collection, broad history or model fallback. Supported forms include **retry**, **try again**, **try sending it again**, **retry my booking**, **send my booking again** and category-specific variants. Generic retry wording is not hijacked when no retryable booking exists.

### Stale medical-context leakage

The unrelated Rescue/1669 wording was not a hard-coded booking response. Once the late retry test failed, the ordinary model path received the broad recent transcript, which contained the earlier medical exchange. The generated answer combined that stale context with a new booking checklist.

The deterministic retry path now consumes only the bound booking snapshot, current retry command and transient contact. It never loads or passes general conversation history to the model. Medical, lost-key, property, cleaning and luggage context therefore cannot contaminate a booking delivery retry.

### Durable request binding and exact-alert delivery

A new `booking_retry_snapshots` Durable Object table retains only safe completed booking fields. Each record is bound to:

- the original booking alert ID;
- a one-way binding hash covering the verified reservation, room and protected browser session;
- the reservation and room required for indexed lookup;
- the verified stay/session expiry boundary;
- the booking category and safe activity/date/count/product/course/certification/provider/route/note fields.

No raw contact is stored. A retry is authorized only when the exact alert is an open or acknowledged `booking_request`, belongs to the same room and `booking_with_owners` route, has at least one prior delivery record and has zero accepted deliveries. Delivery runs under the same alert ID with stage `retry`; `createAlert` is not called. If any delivery was already accepted, the guest receives an already-sent response and no notification is resent. Multiple failed categories produce one concise choice.

### Contact handling across reloads

The browser may use the transient validated contact while the current protected page remains open. A reload intentionally removes that value. The server-side safe snapshot remains, so the Concierge asks only for the international WhatsApp/phone contact and preserves every completed non-sensitive field. A local attempt remains visibly redacted and rejected; its valid `+country-code` replacement is used for the same alert retry. Contacts remain excluded from browser history, interactions, snapshots, alerts, owner summaries, diagnostics, logs and release files.

### Unrelated new intents

The failed snapshot is dormant until an explicit retry command. Bar recommendations, check-out information and property reports route normally, do not repeat the old failure and do not send the booking. A later explicit retry can still recover the same failed alert.

### Booking delivery investigation and owner diagnostics

Static and runtime inspection confirms the established booking path still selects:

- template `house_booking_alert_v2`;
- language `en`;
- exactly six ordered BODY parameters;
- route `booking_with_owners`;
- Fah plus Owner 1 plus Owner 2 from the existing derived recipient group;
- provider success only when Graph accepts the request and returns a message ID.

No deterministic source-side template, language, parameter-count or route defect was found, and the production screenshot does not contain the Meta response. Therefore v5.11.24 does not invent a provider error or change production configuration. The exact external rejection remains unknown until a production attempt captures it.

The owner-only alert card now attaches the latest sanitized failure to its booking alert and shows only fields actually retained: WhatsApp/Meta, route, template, language, attempted and accepted counts, HTTP status, actual safe error code/category/message/details and Bangkok timestamp. Recipient numbers, guest contacts, parameter values, access tokens, request authorization, stay credentials, key codes and raw payloads remain excluded.

### Preferred-provider normalization

Provider extraction now removes leading conversational filler such as **or with**, **instead**, **rather** and related connective words. Known names preserve canonical casing for French Kiss Divers, Roctopus Dive and Master Divers. The production phrase **or with Master Divers would be even better** becomes **Preferred dive school: Master Divers** without an availability promise or arbitrary sentence-wide title-casing.

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

## Tests and validation

The complete source suite contains 155 tests, up from 148 in v5.11.23, with zero failures. New production-entry coverage includes:

- all seven required retry phrase variants before model/general routing;
- retry failure and accepted-message-ID success under the same alert ID;
- accepted-alert duplicate suppression;
- reload/privacy loss followed by contact-only recollection, local rejection and corrected international contact;
- verified stay, room and protected browser-session isolation;
- concise ambiguity handling for two failed categories;
- medical/property/lost-key history contamination resistance;
- bar, check-out and AC routing after delivery failure, followed by explicit retry;
- real SQLite snapshot schema, expiry lookup, contact sanitation and exact-alert delivery counts;
- alert-bound owner diagnostics with actual attempted/accepted totals and leak checks;
- Master Divers normalization while the active field and prior booking data remain intact;
- browser protection of retry commands from the device-only fallback.

The complete release validation also covers JavaScript and Apps Script syntax, JSON parsing, version consistency, secret/contact/key-code scans, Git integrity, Worker dry run, ZIP CRC, exact source/archive manifest comparison and the full suite from an independently extracted archive.

## Deployment

Deploy the ready-to-push v5.11.24 archive to the existing Worker:

```sh
npm install
npx wrangler deploy
```

Do not change the six production template mappings, recipients, secrets, webhook settings, `SPARE_KEY_CODES`, emergency routes, passport/Airbnb configuration or `WHATSAPP_STAFF_ACTIONS_ENABLED=false` as part of this release.

## Very short production smoke test

1. Create one non-sensitive completed diving request whose protected delivery is deliberately rejected.
2. Confirm the owner alert shows one alert ID, `booking_with_owners`, zero accepted deliveries and the sanitized real Meta/provider reason.
3. Say **try my diving booking again**. Confirm no checklist or stale medical text, the same alert ID and a real outbound retry attempt. Success must require an accepted provider message ID.
4. In a separate failed attempt, refresh and retry. Confirm only the international contact is requested and the same alert is used after it is supplied.
5. Ask **is there a good bar around** after failure. Confirm normal local guidance and no retry.
6. During a fresh diving collection say **or with Master Divers would be even better**. Confirm **Master Divers**, preserved state and no availability promise.
7. Stop and report the result. If delivery still fails, capture only the sanitized owner diagnostic.

## Next planned milestone

v5.11.25 — full visual polish.

Do not begin visual work automatically.
