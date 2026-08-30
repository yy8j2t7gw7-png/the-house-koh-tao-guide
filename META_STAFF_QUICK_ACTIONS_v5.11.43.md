# Meta Staff Quick Actions — v5.11.43

## Activation status

The owner confirmed all five newer human-friendly Utility templates are approved/Active and explicitly authorized v5.11.43 to activate them. Production mappings are:

- `house_service_alert_actions_v3`
- `house_booking_alert_actions_v2`
- `house_luggage_alert_actions_v2`
- `house_urgent_alert_actions_v2`
- `house_lost_key_alert_actions_v2`

All use generic English `en` and two static visible quick-reply buttons in this order:

1. **Received**
2. **Resolved**

The visible label **Resolved** does not rename the internal command. Runtime button payloads remain exactly:

- `HOUSE_ALERT|RECEIVED|<alert_id>`
- `HOUSE_ALERT|RESOLVE|<alert_id>`

No guest contact, room data, confirmation code, stay token, passport data or key-box code is placed in button payloads.

## Exact BODY parameter order

### Service — `house_service_alert_actions_v3`

1. request/problem
2. room
3. reported Bangkok date/time
4. protected details
5. alert reference

Guest-facing template wording:

```text
Su, please handle this request.

Request: {{1}}
Room: {{2}}
Reported: {{3}}

Details: {{4}}

Ref: {{5}}

Owners also notified.
```

### Booking — `house_booking_alert_actions_v2`

1. service/activity
2. room
3. requested date/time
4. guest count
5. protected details
6. alert reference

```text
Fah, please handle this booking request.

Booking: {{1}}
Room: {{2}}
Date / time: {{3}}
Guests: {{4}}

Details: {{5}}

Ref: {{6}}

Owners also notified.
```

For `stay_extension`, the booking label is **Stay extension**, date/time is **Current stay**, guests is **Not provided**, and the requested additional nights are included prominently in protected Details together with the transient reply contact. This avoids pretending the extension itself is already confirmed.

### Luggage — `house_luggage_alert_actions_v2`

1. arrival/departure type
2. room
3. bag count
4. requested date/time
5. protected details
6. alert reference

```text
Su, please handle this luggage request.

Type: {{1}}
Room: {{2}}
Bags: {{3}}
Requested: {{4}}

Details: {{5}}

Ref: {{6}}

Owners also notified.
```

### Urgent — `house_urgent_alert_actions_v2`

1. problem
2. room
3. reported Bangkok date/time
4. protected details
5. alert reference

```text
Fah, please handle this urgent request.

Problem: {{1}}
Room: {{2}}
Reported: {{3}}

Details: {{4}}

Ref: {{5}}

Owners also notified.
```

### Lost key — `house_lost_key_alert_actions_v2`

1. room
2. reported Bangkok date/time
3. alert reference

The approved wording avoids saying that a key/code was sent and instead states that the guest has already been assisted with room entry. No key-box code or stay confirmation code is ever included.

## Runtime and rollback

The existing signed Meta webhook, known-recipient authorization, exact alert-reference validation, actor exclusion, idempotency, status fanout, escalation-stop rules and typed `RECEIVED` / `ACK` / `RESOLVE` commands are unchanged.

`WHATSAPP_STAFF_ACTIONS_ENABLED=false` remains the one-variable emergency rollback to the established buttonless templates. Older action-template schemas remain code-supported rollback references but are not the v5.11.43 production mappings. `house_service_alert_actions_v1` remains invalid because it has no buttons.
