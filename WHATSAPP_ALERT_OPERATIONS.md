# WhatsApp Concierge Alert Operations

## Purpose

v5.11.19 provides a protected server-side staff-alert channel through the official Meta WhatsApp Business Platform. Guests continue to use the website Concierge. Recipient telephone numbers, access tokens and app secrets stay in encrypted Cloudflare secrets and never appear in public files, Git or release archives.

Routing is role based:

- routine stay requests and actionable luggage requests route to Su plus both owners through derived `support_with_owners`;
- House-arranged booking requests route to Fah plus both owners through derived `booking_with_owners`;
- verified spare-key releases notify Su plus both owners through derived `lost_key_team` and do not use generic escalation;
- explicitly confirmed urgent or critical property incidents notify Fah plus both owners, without Su, through derived `urgent_response`;
- unacknowledged urgent or critical property alerts route to the configured future on-call `escalation` group after 10 minutes, with the owners as the current safe fallback.

Every luggage alert is independently validated at the final server-side creation boundary. That boundary refuses storage and WhatsApp delivery unless the individual request contains arrival/departure context, requested time, bag count and a usable international contact. Template fields come from this validated structure, so a newly created luggage alert must never contain `Not provided` for a required field.

Every structured booking alert is also validated at the final server-side creation boundary. Diving retains its preferred date, diver count, recognised experience/course choice, conditional certification or named-course detail and usable international contact. Fishing and snorkeling require date, guest count and trip style; taxi and motorbike taxi require date, time, pickup, destination and passenger count; taxi/longtail boat additionally requires one-way or return; ferry requires date, origin, destination and traveler count, with time accepted when supplied. Every category requires a usable international contact. Complete requests route through `booking_with_owners`; recommendation-only questions create no alert. The guest never receives a personal Fah WhatsApp action.

A recommendation question alone does not create a booking alert. The guest must ask to book, reserve, arrange or check availability. A luggage-information question remains informational. An actionable luggage request enters a deterministic collection workflow and creates an alert only after arrival/departure context, requested time, bag count and a usable international reply contact are all available. Identical alerts from the same session are deduplicated for five minutes.

Medical, personal-safety and critical-property classifications never create an alert by themselves. Generic urgent wording first asks for a meaningful incident description and exposes no send action. Immediate safety guidance remains available once the incident is known, but the protected operation can be called only after the guest presses **Send urgent alert**. The submission boundary rejects generic summaries such as “Emergency” or “Serious problem”. A model-produced label or single severe keyword cannot bypass this confirmation boundary.

## Safety and privacy

- Recipient numbers are stored only in `WHATSAPP_ALERT_RECIPIENTS`.
- Delivery records contain recipient labels and salted one-way hashes, never telephone numbers.
- Guest descriptions are sanitized before storage or delivery.
- Passport data, confirmation codes, stay tokens, payment information and key-box codes are never included.
- A verified guest reply number may be added only to the transient urgent delivery payload; it is not stored in the alert record.
- Actionable booking and luggage requests require a usable contact number. Routine towels, soap, toilet-paper and room-cleaning requests from a verified room do not. When a contact is required, it is added only to the transient protected delivery payload and never to visible chat, browser history, AI context, interaction, alert or application logs. Immediate visible redaction applies to every request type. Genuine urgent incidents are not blocked if no number is available.
- A displayed room number is guest-selected context unless the alert explicitly says the stay is verified.
- Automatic spare-key release remains separate and fail closed: a current verified room-bound session, the 19:30–10:30 Bangkok window, deliberate 500 THB fee acceptance and at least one accepted protected team notification are all required. The guest does not approve the staff notification.
- Alert records and delivery metadata are removed after 30 days.
- The platform does not send automated outbound messages to Koh Tao Rescue, 1669, police, hospitals or clinics. Guest-facing emergency call actions remain direct.

## Production Meta templates

The current Utility templates are Active in WhatsApp Manager as generic English (`en`). Meta treats `en` and `en_US` as separate translations. The Worker therefore resolves the language from the exact approved template schema instead of applying one global locale. It also validates every selected name against a fixed purpose and exact BODY-parameter count before sending. Static headers require no parameters.

| Purpose | Active template | Language | BODY parameters in exact order |
| --- | --- | --- | --- |
| Routine service | `house_service_alert_v3` | `en` | reference, room, human-readable request, Bangkok date/time, details |
| Luggage | `house_luggage_alert_v2` | `en` | reference, room, arrival/departure, bag count, requested time, protected guest notes |
| Booking | `house_booking_alert_v2` | `en` | reference, room, service/activity, normalized date/time, guest count, protected guest notes |
| Urgent property | `house_urgent_alert_v2` | `en` | reference, room, incident type, Bangkok date/time, sanitized guest summary |
| Verified lost key | `house_lost_key_alert_v3` | `en` | reference, room, Bangkok date/time |
| Staff status | `house_alert_status_v1` | `en` | reference, room, human-readable request, safe actor label, `ACKNOWLEDGED`/`RESOLVED` |

Luggage and booking templates have no dedicated reply-number variable. A validated international contact is therefore appended only to the transient protected notes parameter as `Guest reply: …`; it does not enter ordinary chat, alert, dashboard or log storage. The lost-key template is constructed only after the existing verified-stay, after-hours and explicit-fee gates and never receives the key-box code.

The previous five v1 names remain mapped in code solely as a deliberate rollback capability. Those older templates retain their approved English (US) translation (`en_US`). Do not switch production back without a separately authorized rollback decision. An unknown name, wrong purpose or wrong parameter count fails closed before the Graph API call.

## Failed-delivery diagnostics

v5.11.15 kept only a short error code when Meta rejected a submission, so its production response body cannot be reconstructed later. v5.11.16 added safe evidence capture at the common Graph API submission boundary. That evidence confirmed HTTP 404 / Meta `132001`: `house_service_alert_v3` did not have an `en_US` translation. v5.11.17 corrects only the template-aware language selection and retains the diagnostics.

For every failed initial, escalation or status submission, the Worker records for 30 days:

- selected template name and language;
- value-free component structure, such as `body(5)[1:text,2:text,3:text,4:text,5:text]`;
- HTTP status;
- Meta error code, subcode, type, sanitized message/details and trace ID when supplied;
- a broad failure category for triage.

The protected owner console displays these records under **WhatsApp delivery diagnostics**. Older v5.11.15 records display their retained numeric error code with a warning that full provider details were not captured by that release. Diagnostics never store recipient numbers, guest contacts, parameter values, tokens, passport data, stay/confirmation codes or key-box codes.

`house_alert_status_v1` is non-recursive. An authorized `RECEIVED`, `ACK` or `RESOLVE` reply updates the original alert and sends one status message only to the other recipients assigned to that alert. The actor and unrelated roles are excluded; duplicate webhook delivery is suppressed by the original alert state. Status messages create no alert and no escalation.

v5.11.19 contains a code-ready but default-off path for five separately reviewed Utility templates with **Received** and **Resolve** quick replies. Their exact Meta setup, payload strategy, activation gate and one-variable rollback are documented in `META_STAFF_QUICK_ACTIONS_v5.11.19.md`. Typed `RECEIVED`, `ACK` and `RESOLVE` remain available before and after activation.

## Cloudflare secrets

Add these values under Worker **Settings → Variables and Secrets** as encrypted secrets:

```text
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_WEBHOOK_VERIFY_TOKEN
META_APP_SECRET
WHATSAPP_ALERT_RECIPIENTS
```

Keep `CONCIERGE_HASH_SALT` configured. `WHATSAPP_PHONE_NUMBER_ID` is Meta's numeric phone-number ID, not the displayed telephone number. Never copy any secret into this document, Git, screenshots or a release ZIP.

Use this structure for `WHATSAPP_ALERT_RECIPIENTS`, replacing examples directly in Cloudflare:

```json
{
  "support": [{ "label": "Stay support", "phone": "66XXXXXXXXX" }],
  "booking": [{ "label": "Booking", "phone": "66XXXXXXXXX" }],
  "urgent": [{ "label": "Legacy lost-key recipient", "phone": "66XXXXXXXXX" }],
  "emergency": [
    { "label": "Owner 1", "phone": "66XXXXXXXXX" },
    { "label": "Owner 2", "phone": "66XXXXXXXXX" }
  ],
  "escalation": [
    { "label": "Future 24/7 responder", "phone": "66XXXXXXXXX" }
  ]
}
```

The same person may appear in multiple roles. Each group accepts at most 12 unique numbers. In production, `support` contains Su, `booking` contains Fah, and `emergency` contains only the two owners. The Worker combines these base groups for the composite routes above and deduplicates recipients. Do not put Su in `emergency`, because that group is also used to derive the serious-property route.

## Webhook and acknowledgements

Configure this callback in the Meta app:

```text
https://YOUR-WORKER-DOMAIN/api/whatsapp/webhook
```

Use `WHATSAPP_WEBHOOK_VERIFY_TOKEN` for verification and subscribe the WhatsApp Business Account to message and message-status webhooks. Incoming POST events are rejected unless `x-hub-signature-256` matches `META_APP_SECRET`.

Authorized recipients may reply:

```text
RECEIVED alert_REFERENCE
RESOLVE alert_REFERENCE
```

`ACK alert_REFERENCE` remains accepted for backwards compatibility. Acknowledgement stops escalation; resolution closes the alert. The protected owner console also provides both actions.

## Non-secret variables

`wrangler.jsonc` contains these defaults:

```text
WHATSAPP_GRAPH_API_VERSION=v23.0
WHATSAPP_SERVICE_TEMPLATE_NAME=house_service_alert_v3
WHATSAPP_BOOKING_TEMPLATE_NAME=house_booking_alert_v2
WHATSAPP_LUGGAGE_TEMPLATE_NAME=house_luggage_alert_v2
WHATSAPP_URGENT_TEMPLATE_NAME=house_urgent_alert_v2
WHATSAPP_LOST_KEY_TEMPLATE_NAME=house_lost_key_alert_v3
WHATSAPP_STATUS_TEMPLATE_NAME=house_alert_status_v1
WHATSAPP_ALERT_TEMPLATE_LANGUAGE=en_US
WHATSAPP_ALERT_ESCALATION_MINUTES=10
```

`WHATSAPP_ALERT_TEMPLATE_LANGUAGE` remains present for compatibility and does not need a Cloudflare change for v5.11.17. Every mapped production or rollback template now uses the language attached to its immutable schema entry.

The optional v5.11.19 action templates are intentionally absent from `wrangler.jsonc`, so deploying application code cannot activate unapproved Meta definitions. After all five templates are Active, configure these exact non-secret variables and then enable the gate:

```text
WHATSAPP_SERVICE_ACTION_TEMPLATE_NAME=house_service_alert_actions_v1
WHATSAPP_LUGGAGE_ACTION_TEMPLATE_NAME=house_luggage_alert_actions_v1
WHATSAPP_BOOKING_ACTION_TEMPLATE_NAME=house_booking_alert_actions_v1
WHATSAPP_URGENT_ACTION_TEMPLATE_NAME=house_urgent_alert_actions_v1
WHATSAPP_LOST_KEY_ACTION_TEMPLATE_NAME=house_lost_key_alert_actions_v1
WHATSAPP_STAFF_ACTIONS_ENABLED=true
```

If the flag is false, missing or any required action-template mapping is absent, the Worker continues to use the current production templates without buttons. To roll back the quick actions, set only `WHATSAPP_STAFF_ACTIONS_ENABLED=false` and redeploy; typed staff commands continue to work.

Review Meta's supported Graph API versions before changing the version. The Worker checks once per minute for overdue escalations.

## Production verification

1. Deploy v5.11.19 with `WHATSAPP_STAFF_ACTIONS_ENABLED=false` and confirm all six current template names above remain mapped in production.
2. Confirm the existing protected secrets and recipient groups remain present, then deploy.
3. Confirm `/api/concierge/status` reports `whatsappAlertsConfigured: true` and the owner console says **WhatsApp connected**.
4. Test with non-sensitive requests: room cleaning and luggage arrangement → Su plus both owners; diving booking → Fah plus both owners; confirmed serious leak → Fah plus both owners without Su; verified lost-key release → Su plus both owners.
5. Confirm every current delivery uses language `en`, the expected active template and the exact safe fields listed in the table. Meta `132001` must not recur.
6. Reply `RECEIVED` or `ACK` with an exact reference and confirm the other assigned recipients—but not the actor—receive one ACKNOWLEDGED status. Confirm escalation stops. Then test `RESOLVE` and one RESOLVED update per other assigned recipient.
7. Test one unacknowledged urgent event and confirm escalation after approximately 10 minutes.
8. Only after the protected channel passes should a temporary `SPARE_KEY_CODES` value be tested. Rotate it immediately afterward.

Quick-action activation is a separate post-approval change. Follow `META_STAFF_QUICK_ACTIONS_v5.11.19.md`, verify both buttons from every alert kind, confirm actor exclusion and duplicate-event idempotency, then repeat one unacknowledged urgent escalation test.

If configuration is incomplete, alerts remain visible in the protected owner console and ordinary Concierge use continues. Automatic spare-key release remains unavailable by design.
