# WhatsApp Concierge Alert Operations

## Purpose

v5.11.11 provides a protected server-side staff-alert channel through the official Meta WhatsApp Business Platform. Guests continue to use the website Concierge. Recipient telephone numbers, access tokens and app secrets stay in encrypted Cloudflare secrets and never appear in public files, Git or release archives.

Routing is role based:

- routine stay requests and actionable luggage requests route to Su plus both owners through derived `support_with_owners`;
- House-arranged booking requests route to Fah plus both owners through derived `booking_with_owners`;
- verified spare-key releases notify Su plus both owners through derived `lost_key_team` and do not use generic escalation;
- explicitly confirmed urgent or critical property incidents notify Fah plus both owners, without Su, through derived `urgent_response`;
- unacknowledged urgent or critical property alerts route to the configured future on-call `escalation` group after 10 minutes, with the owners as the current safe fallback.

A recommendation question alone does not create a booking alert. The guest must ask to book, reserve, arrange or check availability. A luggage-information question remains informational. An actionable luggage request enters a deterministic collection workflow and creates an alert only after arrival/departure context, requested time, bag count and a usable international reply contact are all available. Identical alerts from the same session are deduplicated for five minutes.

## Safety and privacy

- Recipient numbers are stored only in `WHATSAPP_ALERT_RECIPIENTS`.
- Delivery records contain recipient labels and salted one-way hashes, never telephone numbers.
- Guest descriptions are sanitized before storage or delivery.
- Passport data, confirmation codes, stay tokens, payment information and key-box codes are never included.
- A verified guest reply number may be added only to the transient urgent delivery payload; it is not stored in the alert record.
- Actionable booking, luggage and ordinary maintenance requests require a usable contact number. It is added only to the transient protected delivery payload and never to interaction, alert or application logs. Genuine urgent incidents are not blocked if no number is available.
- A displayed room number is guest-selected context unless the alert explicitly says the stay is verified.
- Automatic spare-key release remains separate and fail closed: a current verified room-bound session, the 19:30–10:30 Bangkok window, two-step 500 THB fee acceptance and at least one accepted protected team notification are all required. The guest does not approve the staff notification.
- Alert records and delivery metadata are removed after 30 days.
- The platform does not send automated outbound messages to Koh Tao Rescue, 1669, police, hospitals or clinics. Guest-facing emergency call actions remain direct.

## Production Meta templates

These English (`en_US`) Utility templates are the existing production templates in WhatsApp Manager. Their names, body text, parameter order and parameter counts remain exactly aligned with the code.

### `house_service_alert_v1`

```text
The House service request {{1}}. Room: {{2}}. Request: {{3}}. Time: {{4}} Bangkok time. Details: {{5}}. Please reply RECEIVED {{1}} to acknowledge this request.
```

### `house_booking_alert_v1`

```text
The House booking enquiry {{1}}. Room: {{2}}. Service requested: {{3}}. Preferred date or time: {{4}}. Number of guests: {{5}}. Notes: {{6}}. Please reply RECEIVED {{1}} to acknowledge this enquiry.
```

### `house_luggage_alert_v1`

```text
The House luggage request {{1}}. Room: {{2}}. Arrival or departure: {{3}}. Number of bags: {{4}}. Requested time: {{5}} Bangkok time. Notes: {{6}}. Please reply RECEIVED {{1}} to acknowledge this request.
```

### `house_urgent_alert_v1`

```text
URGENT — The House alert {{1}}. Room: {{2}}. Type: {{3}}. Time: {{4}} Bangkok time. Summary: {{5}}. Please respond immediately and reply RECEIVED {{1}} to acknowledge this alert.
```

### `house_lost_key_alert_v1`

```text
The House lost-key alert {{1}}. Room: {{2}}. Time: {{3}} Bangkok time. The guest has requested urgent assistance. Please reply RECEIVED {{1}} to acknowledge this alert.
```

Any replacement template or changed parameter list requires separate Meta approval before the code may use it.

### Reviewed replacement templates

The Worker is already compatible with `house_service_alert_v3`, `house_luggage_alert_v2`, `house_booking_alert_v2`, `house_urgent_alert_v2` and `house_lost_key_alert_v3` through the existing purpose-specific template-name variables. Keep the v1 values configured until every replacement reports **Active** in Meta; then change only the corresponding Cloudflare variable.

### Alert status template required before enabling status messages

Create one English (`en_US`) Utility template named `house_alert_status_v1` with five body variables in this exact order:

```text
{{5}} — {{2}}

{{3}}
{{4}} updated this request.

Ref: {{1}}
```

Parameter order is: alert reference, room, human-readable alert type, safe actor label and status (`ACKNOWLEDGED` or `RESOLVED`). Once Meta reports the template **Active**, add `WHATSAPP_STATUS_TEMPLATE_NAME=house_alert_status_v1` as a normal Worker variable and deploy. Until then, leave the variable absent; existing acknowledgement, resolution and escalation behavior continues without status messages.

One-tap acknowledgement requires separately reviewed interactive template versions with quick-reply buttons. Typed `RECEIVED`, `ACK` and `RESOLVE` remain the production fallback and are not changed by this release.

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
WHATSAPP_SERVICE_TEMPLATE_NAME=house_service_alert_v1
WHATSAPP_BOOKING_TEMPLATE_NAME=house_booking_alert_v1
WHATSAPP_LUGGAGE_TEMPLATE_NAME=house_luggage_alert_v1
WHATSAPP_URGENT_TEMPLATE_NAME=house_urgent_alert_v1
WHATSAPP_LOST_KEY_TEMPLATE_NAME=house_lost_key_alert_v1
WHATSAPP_ALERT_TEMPLATE_LANGUAGE=en_US
WHATSAPP_ALERT_ESCALATION_MINUTES=10
```

Review Meta's supported Graph API versions before changing the version. The Worker checks once per minute for overdue escalations.

## Production verification

1. Confirm business verification, the WhatsApp display name and all five templates are approved.
2. Add the secrets and recipient groups, then deploy.
3. Confirm `/api/concierge/status` reports `whatsappAlertsConfigured: true` and the owner console says **WhatsApp connected**.
4. Test with non-sensitive requests: room cleaning and luggage arrangement → Su plus both owners; snorkelling booking → Fah plus both owners; confirmed serious leak → Fah plus both owners without Su; verified lost-key release → Su plus both owners.
5. Confirm messages use the correct template and contain only the intended sanitized fields.
6. Reply `RECEIVED` with the exact reference and confirm escalation stops; then test `RESOLVE`.
7. Test one unacknowledged urgent event and confirm escalation after approximately 10 minutes.
8. Only after the protected channel passes should a temporary `SPARE_KEY_CODES` value be tested. Rotate it immediately afterward.

If configuration is incomplete, alerts remain visible in the protected owner console and ordinary Concierge use continues. Automatic spare-key release remains unavailable by design.
