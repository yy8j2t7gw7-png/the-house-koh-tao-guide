# The House – Koh Tao v5.11.68 — Operational Routing Hotfix

## Summary

v5.11.68 is a narrow server-side routing correction following live Owner App validation. It fixes two production issues without changing the v5.11.67 Concierge/review architecture:

1. housekeeping / maintenance / general service tasks could still notify Fah when the legacy `support` recipient secret contained the whole operating team;
2. reservation tasks created from Booking Details could route to the correct Fah + owner recipients but still use the service WhatsApp template whose fixed wording says `Su, please handle this request.`

## Recipient role isolation

The WhatsApp recipient parser now normalizes the legacy secret into operational roles before any task is dispatched:

- owners are taken from the protected `emergency` owner group;
- booking specialists are taken from `booking` after owner duplicates are removed;
- support specialists are taken from `support` after owner and booking-specialist duplicates are removed;
- legacy overlaps are handled by phone identity, so the current production secret does not need to be rewritten for this hotfix.

Canonical routing remains:

- housekeeping / maintenance / guest support / general service → **Su + owners**;
- reservations / bookings → **Fah + owners**;
- routine turnover → **Su only**;
- room-ready completion → **owners**;
- internal booking notes → **no WhatsApp notification**.

## WhatsApp template correction

`booking_task_reservations` is now classified as a booking alert for template selection. Reservation tasks therefore use the approved `house_booking_alert_actions_v2` template, whose fixed lead is:

```text
Fah, please handle this booking request.
```

Housekeeping / maintenance / guest-support tasks continue using the approved service template addressed to Su.

## Scope

This is intentionally a backend-only hotfix. **Taoedge Owner App v0.1.8 remains current** and requires no client rebuild for these corrections.

No changes are made to:

- multilingual/free-text Concierge understanding;
- AI draft review / Reject / Edit / Regenerate / Approve & Send;
- booking activity Received / Resolved synchronization;
- Finance;
- licensing/device enforcement;
- Beds24 Channel Manager staging;
- AI auto-send staging.

## Validation

Full backend automated suite: **342 passed / 0 failed**.
