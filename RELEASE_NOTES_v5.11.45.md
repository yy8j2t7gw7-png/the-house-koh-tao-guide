# THE HOUSE – KOH TAO
## Release Notes v5.11.45 — Fix Unstable Version

### Baseline and scope

v5.11.45 is rebuilt directly from the last stable **v5.11.42** source. It intentionally ports only two previously proven production changes:

1. Airbnb last-minute reservation synchronization hardening.
2. Activation of the five approved human-friendly Meta staff action templates.

No passport experiment or later registration-state change is included. No Concierge routing, chat behavior, guest-page usability, UI, lost-key logic, emergency logic, cleaning workflow, stay-extension workflow, Explore behavior or other v5.11.42 feature is redesigned.

## 1. Airbnb last-minute booking fix

`airbnb-sync/Code.gs` now provides a bounded three-layer synchronization model:

- checks recent Airbnb host email every **5 minutes**;
- does not depend on literal “confirmation code” / “reservation code” wording in Gmail search;
- recognizes trustworthy records only when active listing, valid HM confirmation code, check-in and check-out are all available;
- immediately posts such records to `/api/reservations/sync` with `complete:false`, without waiting for iCal propagation;
- reconciles all **10 active Airbnb calendars** for Rooms **1–6 and 8–11** at least every **60 minutes**;
- keeps **Room 7 excluded**;
- preserves the complete **24-hour audit** as the only feed-complete path that may cancel reservations missing from a complete reconciliation;
- partial email/hourly syncs cannot mass-cancel an otherwise valid reservation.

The Worker’s existing protection remains unchanged: listing-to-room mapping stays authoritative and readable Airbnb confirmation codes are HMAC-hashed immediately on ingestion rather than stored or logged.

### Required Apps Script step after Worker deployment

Cloudflare deployment does not update Google Apps Script. Replace the code in the existing **The House Airbnb Reservation Sync** project with this release’s `airbnb-sync/Code.gs`, save, and run `installHouseReservationTrigger` once. Confirm exactly one `syncHouseReservations` trigger exists and runs every five minutes.

## 2. Approved Meta action templates activated

The active mappings are exactly:

- `house_service_alert_actions_v3`
- `house_booking_alert_actions_v2`
- `house_luggage_alert_actions_v2`
- `house_urgent_alert_actions_v2`
- `house_lost_key_alert_actions_v2`

Visible template buttons remain:

- **Received**
- **Resolved**

Runtime commands remain:

- `HOUSE_ALERT|RECEIVED|<alert_id>`
- `HOUSE_ALERT|RESOLVE|<alert_id>`

The internal second command remains **`RESOLVE`**, never `RESOLVED`.

Approved BODY orders are preserved:

- Service v3: request, room, reported Bangkok datetime, protected details, ref.
- Booking v2: booking/service, room, requested datetime, guests, protected details, ref.
- Luggage v2: arrival/departure type, room, bags, requested datetime, protected details, ref.
- Urgent v2: problem, room, reported Bangkok datetime, protected details, ref.
- Lost-key v2: room, reported Bangkok datetime, ref.

Older action schemas remain available only as rollback compatibility. The fail-closed quick-action gate requires all five exact approved mappings.

## Preserved stable v5.11.42 behavior

This release deliberately leaves the following v5.11.42 behavior unchanged:

- broad deterministic human-contact routing;
- stay-extension collector and delivery semantics;
- Tuesday–Sunday 10:30–19:30 routine contact window and Monday closure;
- generic The House team / Emergency Support guest-facing identities;
- cleaning workflow and state isolation;
- luggage and booking collectors;
- 24/7 protected lost-key flow;
- passport registration model from v5.11.42;
- Admin and direct/walk-in stays;
- Wi-Fi, snorkeling and French Kiss Divers behavior;
- `EXPLORE_ENABLED=false`;
- all guest-facing HTML/CSS/chat UX.

## Current v5.11.45 follow-up corrections

The same stable-base v5.11.45 branch also includes these narrowly authorized corrections without changing unrelated guest workflows:

- removes the guest-facing manual passport-details Option 2 placeholder while preserving Thai-only registration and secure passport image upload;
- removes forced mobile camera capture so the device/browser can offer camera plus existing photo/file selection;
- broadens deterministic routine-pest recognition (including common singular/plural and typo variants) while preserving existing pest messages, protected alert delivery and dangerous-animal emergency separation;
- adds an authenticated **Delete** action for individual **Recent key-box reset activity** history entries in Owner Admin. This history-only deletion cannot alter the current rotation lock, key-box code, spare-key release history or lost-key authorization state.

Current complete automated suite: **219 passed / 0 failed**.

### Commercialization / white-label guardrail

The project remains intended for eventual sale/adaptation to other hospitality businesses. Narrow fixes should avoid adding new property-specific assumptions to reusable core logic. The current architecture remains suitable for per-property white-label deployments; a later deliberate platformization phase should centralize property-specific branding, rooms, timezone/hours, fees, contacts, integration mappings and local knowledge, and add an explicit tenant/property boundary for true multi-property SaaS.

## Validation

Focused/full automated suite: **219 passed / 0 failed**.

The two legacy assertions made calendar-independent for repeatable validation are test-only changes: Monday closed-hours housekeeping acknowledgement and the four-letter `Sept` date abbreviation. No runtime behavior was changed for those assertions.

### Environment deployment-tool limitation

A clean `npm ci` was attempted in this hosted environment but stalled on external npm package resolution, so Wrangler could not be installed here and `npx wrangler deploy --dry-run` was not completed. This is not recorded as a source failure. Before push/deploy, run locally:

- `npm ci`
- `npm test`
- `npx wrangler deploy --dry-run`

