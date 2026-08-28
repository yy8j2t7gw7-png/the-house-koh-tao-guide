# The House – Koh Tao v5.11.20

## Release outcome

v5.11.20 is a narrow functional-fix release over the production v5.11.19 source. It repairs the real cleaning continuation, direct structured-booking entry and lost-key verification paths without beginning visual polish or changing production Meta configuration, recipients, secrets, emergency routing, passport retention or Airbnb synchronization.

## Confirmed root causes

### Cleaning

The deterministic housekeeping matcher recognized explicit cleaning phrases but not natural room-condition wording such as “my room is dirty.” The first turn could therefore be answered by the model, which asked for a time without creating the protected cleaning workflow state. On the next turn, “3:30pm” had no actionable workflow to complete and produced a manual-support suggestion instead of an alert.

v5.11.20 classifies natural dirty/messy/unclean room wording at the protected server boundary and in the browser protected-operation guard. The preferred-time continuation now reaches the existing structured cleaning submission, includes the preference in one service alert and cannot fall back to a device-only answer.

### Structured booking entry

The structured classifier required verbs such as book, reserve, arrange or check availability. Direct first-person activity intent such as “I want to go fishing” could therefore remain informational even though the category-specific collection machinery already existed.

v5.11.20 treats direct first-person fishing and snorkeling intent as actionable and keeps category-specific **Book with Us** prompts protected. Existing field extraction, missing-field prompts, Bangkok date normalization, transient contact handling, final validation and Fah-plus-owner routing remain the single completion path.

### Lost key

Lost-key handling sat behind the general private-guide access gate, whose `accessGranted` value includes passport-registration completion. The spare-key endpoint repeated that registration-complete check. As a result, active-stay verification and passport state were incorrectly coupled. A browser-only fallback could also answer a lost-key message without current protected verification context, and office-hours handling was not isolated as a dedicated lost-key policy before generic workflows.

v5.11.20 evaluates lost-key intent explicitly before the private-guide gate, authorizes it only from the current verified active-stay session and keeps passport completion separate. The verified access page exposes only the protected lost-key controls while the private guide remains locked. Office-hours requests create a dedicated `lost_key` alert; after-hours requests retain the 500 THB fee, accepted-notification-before-code and rotation gates. A final WhatsApp boundary independently refuses an unverified lost-key delivery.

## Guest and staff behavior

- **my room is dirty** asks only for a missing preferred time. A supplied clock time, `now` or `ASAP` creates exactly one Su-plus-owner service alert and returns a natural confirmation that the requested time is not yet confirmed.
- Cleaning remains recordable after hours and on Monday. Sunday after 19:30 and all Monday requests identify Tuesday from 10:30 as the next availability; routine **Call Us** is shown only while housekeeping is open.
- Direct fishing or snorkeling intent and every category-specific **Book with Us** action start structured collection. Informational questions create no alert, supplied fields are preserved and completed requests route once to Fah plus both owners.
- Booking contacts remain transient, are displayed only as `[contact supplied privately]` and enter only the protected delivery payload. Ferry collection never asks for passport data. Availability and current price must be checked, and no request is described as confirmed before payment.
- An unverified lost-key request creates no alert and exposes no spare-key path. A verified office-hours request creates one dedicated lost-key alert with no code flow. A verified after-hours request can display a code only on the protected page after fee acceptance and accepted team notification.
- Prior lost-key state cannot authorize a new session, stay or room. Codes remain excluded from Concierge history, alerts, WhatsApp/Meta payloads, logs and diagnostics.

## Meta quick-action status

Quick actions remain off by default. The intended service action template is `house_service_alert_actions_v2`. The accidentally created `house_service_alert_actions_v1` has no buttons, is rejected by the schema and must never be mapped.

The other intended names remain:

- `house_luggage_alert_actions_v1`
- `house_booking_alert_actions_v1`
- `house_urgent_alert_actions_v1`
- `house_lost_key_alert_actions_v1`

Do not set `WHATSAPP_STAFF_ACTIONS_ENABLED=true` or change Cloudflare mappings in this release. Follow `META_STAFF_QUICK_ACTIONS_v5.11.20.md` only in a separately authorized activation after all five intended templates are Active.

## Regression coverage

The complete suite has **126 passing tests and 0 failures**. New and adjusted coverage includes:

- exact natural cleaning conversation, preferred-time payload, single-alert behavior, `now` / `ASAP`, Monday and Sunday-evening scheduling, and open-hours-only **Call Us**;
- informational, direct-intent and **Book with Us** entry for supported booking categories, field preservation, missing-field-only prompts, one-alert completion, routing, contact privacy, unconfirmed wording and ferry passport exclusion;
- real cookie-backed verified stays with passport pending, dedicated office-hours lost-key delivery, after-hours fee and notification ordering, new-session/stay/room isolation, rotation lock and code leak scans;
- final lost-key verification enforcement, invalid buttonless service v1 rejection and default-off staff quick actions.

The release is also validated with JavaScript syntax checks, Google Apps Script syntax conversion, JSON parsing, version consistency, secret/contact/key-code scans, Git integrity and an exact source-to-ZIP manifest comparison.

## Deployment

1. Deploy the v5.11.20 ZIP through the existing production workflow.
2. Do not change the six current Meta template mappings, language behavior, access tokens, recipients, webhook configuration, `SPARE_KEY_CODES` or other secrets.
3. Keep `WHATSAPP_STAFF_ACTIONS_ENABLED=false`; do not add the pending action-template mappings during this deployment.
4. Confirm the deployed status endpoint reports release `5.11.20` and the existing WhatsApp connection remains configured.

## Production smoke test — changed functions only

1. **Cleaning:** From a verified room, send **my room is dirty**, then **3:30pm**. Confirm one service alert reaches Su plus both owners, contains the preferred time and gives no manual-support instruction. Repeat after hours or Monday and confirm no routine **Call Us** action.
2. **Booking entry:** Send **I want to go fishing**, and separately press a category **Book with Us** action. Confirm structured collection starts, supplied fields remain, only missing fields are requested and one completed alert reaches Fah plus both owners. Confirm visible contact redaction and that ferry asks for no passport data.
3. **Lost key:** Without verification, send **I lost my key** and confirm no alert or code. With an active verified stay and passport pending, test office hours and confirm one dedicated lost-key alert with no code path. After hours, confirm the 500 THB acceptance and accepted-notification gates precede protected-page code display, then confirm the rotation lock blocks another release.
