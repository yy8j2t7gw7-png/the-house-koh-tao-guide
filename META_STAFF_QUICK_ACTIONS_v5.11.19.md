# Meta Staff Quick Actions — v5.11.19

## Status and safety gate

The application code is ready, but staff quick actions are **off by default**. Do not enable them until all five templates below are approved and show **Active** in WhatsApp Manager with the exact generic-English language code `en`, BODY variable count and button order.

The existing production templates, recipient routing, typed `RECEIVED` / `ACK` / `RESOLVE` commands and status template remain unchanged. No token, recipient number, phone-number ID, app secret or webhook secret belongs in a template or this document.

## Create the five templates

For each template in WhatsApp Manager:

1. Choose category **Utility**.
2. Choose language **English** using generic code `en`, not `en_US`.
3. Use the exact lowercase template name and exact BODY text below.
4. Add two **Quick reply** buttons in this order: **Received**, then **Resolve**.
5. Supply non-sensitive sample values for every BODY variable when Meta requests examples.
6. Submit the template and leave the application feature flag off while any template is Pending, Rejected or Paused.

### Routine service

Name: `house_service_alert_actions_v1`

```text
THE HOUSE SERVICE ALERT
Reference: {{1}}
Room: {{2}}
Request: {{3}}
Bangkok time: {{4}}
Details: {{5}}
```

BODY variables: reference, room, human-readable request, Bangkok date/time, protected details.

### Luggage

Name: `house_luggage_alert_actions_v1`

```text
THE HOUSE LUGGAGE ALERT
Reference: {{1}}
Room: {{2}}
Arrival / departure: {{3}}
Bags: {{4}}
Requested date / time: {{5}}
Details: {{6}}
```

BODY variables: reference, room, arrival/departure, bag count, requested date/time, protected notes including the validated reply contact.

### Booking

Name: `house_booking_alert_actions_v1`

```text
THE HOUSE BOOKING ALERT
Reference: {{1}}
Room: {{2}}
Service / activity: {{3}}
Requested date / time: {{4}}
Guests: {{5}}
Details: {{6}}
```

BODY variables: reference, room, service/activity, normalized date/time, guest/passenger/traveler count, protected booking notes including the validated reply contact.

### Urgent property or safety alert

Name: `house_urgent_alert_actions_v1`

```text
THE HOUSE URGENT ALERT
Reference: {{1}}
Room: {{2}}
Incident: {{3}}
Bangkok time: {{4}}
Details: {{5}}
```

BODY variables: reference, room, human-readable incident type, Bangkok date/time, sanitized protected summary.

### Verified lost key

Name: `house_lost_key_alert_actions_v1`

```text
THE HOUSE LOST KEY ALERT
Reference: {{1}}
Room: {{2}}
Bangkok time: {{3}}
```

BODY variables: reference, room, Bangkok date/time. Never add a key-box code.

## Runtime payloads

The quick-reply labels are static template definitions. At send time, the Worker binds these signed operational identifiers through Meta’s template button components:

| Button index | Label | Dynamic payload |
| --- | --- | --- |
| `0` | Received | `HOUSE_ALERT|RECEIVED|<alert_id>` |
| `1` | Resolve | `HOUSE_ALERT|RESOLVE|<alert_id>` |

The webhook accepts the resulting `message.button.payload` and passes it through the same known-recipient authorization, exact alert-reference validation, actor exclusion, duplicate-event idempotency, status fanout and escalation-stop logic as typed commands. A button never contains guest data, room data, a telephone number or a credential.

## Activation after approval

Only after all five templates are Active, add these exact non-secret Worker variables:

```text
WHATSAPP_SERVICE_ACTION_TEMPLATE_NAME=house_service_alert_actions_v1
WHATSAPP_LUGGAGE_ACTION_TEMPLATE_NAME=house_luggage_alert_actions_v1
WHATSAPP_BOOKING_ACTION_TEMPLATE_NAME=house_booking_alert_actions_v1
WHATSAPP_URGENT_ACTION_TEMPLATE_NAME=house_urgent_alert_actions_v1
WHATSAPP_LOST_KEY_ACTION_TEMPLATE_NAME=house_lost_key_alert_actions_v1
WHATSAPP_STAFF_ACTIONS_ENABLED=true
```

Do not change the six current template variables or any secret. Deploy, then confirm `/api/concierge/status` reports `staffQuickActionsEnabled: true` and shows all five exact action mappings.

## Production verification

1. Send one non-sensitive alert of each kind and verify the expected current recipient group receives the matching template with both buttons.
2. Press **Received** as one assigned recipient. Confirm the original alert becomes acknowledged, escalation stops and exactly one ACKNOWLEDGED status reaches each other assigned recipient—not the actor or an unrelated role.
3. Deliver the same webhook event again and confirm it creates no duplicate transition or status message.
4. Press **Resolve** and confirm the alert closes and exactly one RESOLVED status reaches each other assigned recipient.
5. Confirm typed `RECEIVED`, `ACK` and `RESOLVE` still work.
6. Leave one safe urgent test unacknowledged and confirm the established ten-minute escalation still runs.
7. Check protected diagnostics and application logs for errors without exposing any parameter value or recipient number.

## Rollback

Set only:

```text
WHATSAPP_STAFF_ACTIONS_ENABLED=false
```

Redeploy. The Worker immediately returns to the existing approved production templates; the five action-template mappings may remain configured, and typed commands continue to work. Do not delete or rename current production templates as part of this rollback.
