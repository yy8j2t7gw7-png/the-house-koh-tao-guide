# Meta Staff Quick Actions — v5.11.20

## v5.11.35 activation status

The owner confirmed that all five intended templates are reviewed and Active. v5.11.35 is the separately authorized activation release: the exact mappings below are now present in `wrangler.jsonc` and `WHATSAPP_STAFF_ACTIONS_ENABLED=true`.

The accidentally created `house_service_alert_actions_v1` template has no buttons. It is not a valid action template, is rejected by the application schema and must never be mapped in production.

The activated definitions use generic English code `en`, the exact BODY variables and two quick-reply buttons in this order:

1. **Received**
2. **Resolve**

The six current production templates, all secrets, recipient groups, webhook configuration and typed `RECEIVED` / `ACK` / `RESOLVE` support remain unchanged.

## Intended templates

| Purpose | Intended template | BODY variables in exact order |
| --- | --- | --- |
| Routine service | `house_service_alert_actions_v2` | reference, room, request, Bangkok date/time, protected details |
| Luggage | `house_luggage_alert_actions_v1` | reference, room, arrival/departure, bag count, requested date/time, protected details |
| Booking | `house_booking_alert_actions_v1` | reference, room, service/activity, requested date/time, guest count, protected details |
| Urgent property | `house_urgent_alert_actions_v1` | reference, room, incident, Bangkok date/time, sanitized details |
| Verified lost key | `house_lost_key_alert_actions_v1` | reference, room, Bangkok date/time |

All templates use category **Utility**, generic English (`en`) and the two static quick-reply labels above. Never add guest contacts, credentials, confirmation codes, stay tokens or key-box codes to a template definition or button payload.

### Routine service v2 BODY

```text
THE HOUSE SERVICE ALERT
Reference: {{1}}
Room: {{2}}
Request: {{3}}
Bangkok time: {{4}}
Details: {{5}}
```

### Luggage v1 BODY

```text
THE HOUSE LUGGAGE ALERT
Reference: {{1}}
Room: {{2}}
Arrival / departure: {{3}}
Bags: {{4}}
Requested date / time: {{5}}
Details: {{6}}
```

### Booking v1 BODY

```text
THE HOUSE BOOKING ALERT
Reference: {{1}}
Room: {{2}}
Service / activity: {{3}}
Requested date / time: {{4}}
Guests: {{5}}
Details: {{6}}
```

### Urgent v1 BODY

```text
THE HOUSE URGENT ALERT
Reference: {{1}}
Room: {{2}}
Incident: {{3}}
Bangkok time: {{4}}
Details: {{5}}
```

### Lost-key v1 BODY

```text
THE HOUSE LOST KEY ALERT
Reference: {{1}}
Room: {{2}}
Bangkok time: {{3}}
```

## Runtime payloads

At send time, the Worker binds only signed operational identifiers:

| Button index | Label | Dynamic payload |
| --- | --- | --- |
| `0` | Received | `HOUSE_ALERT|RECEIVED|<alert_id>` |
| `1` | Resolve | `HOUSE_ALERT|RESOLVE|<alert_id>` |

The signed webhook passes each event through the established known-recipient authorization, exact alert-reference validation, actor exclusion, duplicate-event idempotency, status fanout and escalation-stop rules. Button payloads contain no guest data, room data, phone number or credential.

## Active v5.11.35 mapping

The authorized release uses these exact non-secret mappings:

```text
WHATSAPP_SERVICE_ACTION_TEMPLATE_NAME=house_service_alert_actions_v2
WHATSAPP_LUGGAGE_ACTION_TEMPLATE_NAME=house_luggage_alert_actions_v1
WHATSAPP_BOOKING_ACTION_TEMPLATE_NAME=house_booking_alert_actions_v1
WHATSAPP_URGENT_ACTION_TEMPLATE_NAME=house_urgent_alert_actions_v1
WHATSAPP_LOST_KEY_ACTION_TEMPLATE_NAME=house_lost_key_alert_actions_v1
WHATSAPP_STAFF_ACTIONS_ENABLED=true
```

The gate fails closed if the flag is false, any mapping is absent or a schema is not exact. Do not change the six current production template variables or any secret.

## Activation verification

1. Confirm `/api/concierge/status` reports `staffQuickActionsEnabled: true` and all five exact mappings.
2. Send one non-sensitive alert of each kind and verify both buttons and the intended recipient group.
3. Press **Received** and confirm one ACKNOWLEDGED update reaches each other assigned recipient, not the actor, and escalation stops.
4. Replay the same webhook and confirm no duplicate transition or status message.
5. Press **Resolve** and confirm one RESOLVED update reaches each other assigned recipient.
6. Confirm typed `RECEIVED`, `ACK` and `RESOLVE` still work.

## Rollback

Set only `WHATSAPP_STAFF_ACTIONS_ENABLED=false` and redeploy. The Worker returns to the six existing production templates, while typed commands continue to work.
