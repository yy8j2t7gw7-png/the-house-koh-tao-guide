# The House – Koh Tao v5.11.18

## Release purpose

v5.11.18 fixes three confirmed v5.11.17 production regressions without changing Meta or Cloudflare configuration:

1. pending luggage details could be lost after a local-format contact was rejected;
2. routine housekeeping could be consumed by an older contact-collection workflow;
3. vague urgent wording could expose **Send urgent alert** before the incident was known.

## Root causes and fixes

### Luggage correction

The server reconstructed luggage state from a small window of redacted visible conversation. This was fragile across a second contact-validation turn. The browser now carries a validated, contact-free workflow object while collection is active. It contains only arrival/departure, requested time, bag count and sanitized notes. A rejected local number does not clear those fields. The corrected international contact is attached transiently to that same request, exactly one alert is created, and the browser clears the workflow after completion.

### Routine housekeeping

Deterministic housekeeping classification ran before collection policies, but an older luggage or booking collection could still overwrite the result later in the request pipeline. Towels, soap, toilet paper and room cleaning now bypass ordinary collection policies. They never request a guest contact. Office-hours responses include the general **Call Us** fallback; after-hours responses confirm that the alert is already recorded for handling after 10:30 AM the next morning and need not be repeated.

### Vague urgency

The approved knowledge record for generic wording such as “There is a serious problem in my room” shared the critical-property intent, so the generic emergency confirmation policy exposed the send action without useful incident content. Generic urgency now starts a high-priority clarification workflow. No alert, WhatsApp submission, escalation, contact prompt or send action exists at that stage. The next meaningful message is classified from its actual content. A second server-side quality gate also rejects a direct urgent confirmation containing only generic urgency.

Confirmed flooding, fire, electrical and medical alerts use a useful human-readable incident label derived only from the guest’s sanitized description.

## Meta compatibility

- Current templates remain `en`:
  - `house_service_alert_v3` — 5 BODY parameters
  - `house_luggage_alert_v2` — 6 BODY parameters
  - `house_booking_alert_v2` — 6 BODY parameters
  - `house_urgent_alert_v2` — 5 BODY parameters
  - `house_lost_key_alert_v3` — 3 BODY parameters
  - `house_alert_status_v1` — 5 BODY parameters
- Deliberate v1 rollback templates remain `en_US`.
- `WHATSAPP_ALERT_TEMPLATE_LANGUAGE=en_US` may remain unchanged.
- No Meta template, WABA, app, phone-number ID, webhook, recipient mapping, Cloudflare variable or secret changed.

## Routing preserved

- Routine service and luggage: Su + Owner 1 + Owner 2; Fah excluded.
- Booking and confirmed critical property: Fah + Owner 1 + Owner 2; Su excluded.
- Lost key: Su + Owner 1 + Owner 2.
- House Emergency Support: West / Owner 2.
- Medical calls: Koh Tao Rescue first, then 1669; no external emergency service is contacted automatically.

## Security preserved

Raw guest contacts are redacted immediately in visible Concierge history. Contacts do not enter ordinary browser history, interaction records, alert records, delivery metadata, dashboards, learning data or application logs. Only a valid contact for the active luggage or booking request reaches the intended protected delivery payload. Recipient numbers, secrets, passports, Airbnb codes, stay tokens and key-box codes remain excluded from the release evidence.

## Validation

- Complete source suite: 111/111 passed.
- Complete independently extracted ZIP suite: 111/111 passed.
- JavaScript syntax, Google Apps Script syntax, JSON, Git integrity, whitespace/diff integrity, archive exclusions and credential-pattern checks passed.

## Deployment

Deploy application code only. Do not alter Meta or Cloudflare configuration. Confirm `/api/concierge/status` reports `5.11.18`, then follow the production checklist in the release handoff.
