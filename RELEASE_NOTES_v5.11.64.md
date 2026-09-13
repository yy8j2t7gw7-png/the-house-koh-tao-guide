# The House – Koh Tao v5.11.64 — Booking Activity & Staff Tasks

## Summary

This release adds the server-side booking activity layer required by Taoedge Owner App v0.1.5. Calendar/bookings can open a reservation detail view with a durable internal timeline. Owners, managers and operational staff can add internal notes or create an actionable task.

## Operational task flow

1. A mobile user opens a reservation.
2. **Note only** creates an internal booking note and sends no alert.
3. **Assign task** records the task, task type and protected assignee group.
4. The backend creates a sanitized protected WhatsApp alert and sends it through the existing official Meta integration.
5. Approved quick-action templates expose **Received** and **Resolved** when staff quick actions are enabled.
6. A WhatsApp acknowledgement changes the linked booking task from `open` → `received`.
7. A WhatsApp resolution changes it to `resolved`.
8. The same status is visible in the booking activity timeline; app-side Received/Resolved uses the same protected alert state.

## Privacy / security

- WhatsApp recipient phone numbers remain in server configuration and are never returned to the mobile app.
- The app receives only safe assignment labels/member names.
- Provider/API secrets remain server-side.
- Booking-task alerts contain room + sanitized operational text; no passport documents, access codes or provider credentials are included.
- All mobile create/update actions remain permission + module gated and auditable.

## New mobile endpoints

- `GET /api/mobile/v1/bookings/detail?id=<reservation>`
- `POST /api/mobile/v1/bookings/activity`
- `POST /api/mobile/v1/bookings/activity/status`

## Preserved production boundaries

Keep the current validated security state. High-impact automations remain staged exactly as before until separately approved:

```text
MOBILE_LICENSE_ENFORCEMENT_ENABLED=true
MOBILE_DEVICE_BINDING_ENABLED=true
BEDS24_FINANCE_SYNC_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

## Validation

Automated backend suite: **330 passed / 0 failed**. All backend JavaScript files parse with `node --check`.
