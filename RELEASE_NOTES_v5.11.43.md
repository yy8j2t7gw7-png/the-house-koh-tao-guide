# THE HOUSE – KOH TAO
## Release Notes v5.11.43

### Scope

v5.11.43 is a production-critical release on deployed v5.11.42 with three authorized workstreams:

1. harden Airbnb last-minute reservation synchronization so newly booked guests can use their Airbnb confirmation code promptly without manual stay creation;
2. activate the five newly approved human-friendly Meta staff action templates;
3. activate secure passport **Option 2 — Enter the required details** using exactly the six owner-supplied fields.

No Concierge workflow redesign is included. v5.11.42 human-contact routing and stay-extension behavior remain authoritative.

## Airbnb last-minute synchronization

A real last-minute Airbnb booking was still unavailable to guest-page verification roughly two hours after booking. The previous Apps Script could stop after a routine Gmail check when it did not recognize a new reservation email; in that case all ten iCal feeds could remain unchecked until the complete daily audit.

`airbnb-sync/Code.gs` now uses a bounded multi-layer path:

- recent Airbnb host mail is checked every **5 minutes**;
- Gmail search no longer requires literal confirmation/reservation wording;
- valid Airbnb HM confirmation codes use the broader safe `HM` + 6–18 alphanumeric pattern;
- The House room/listing wording is recognized in either order;
- common yearless English check-in/check-out dates are accepted with conservative year rollover;
- a trustworthy email record containing active listing, confirmation code and stay dates is immediately sent to the protected `/api/reservations/sync` endpoint with `complete:false` instead of waiting for iCal propagation;
- all ten active private Airbnb iCal feeds are reconciled at least once every **60 minutes**, even when Gmail detects no booking;
- a detected reservation email also triggers calendar reconciliation;
- the complete cancellation-safe audit remains every **24 hours**;
- idle five-minute checks do not download iCal feeds.

The Worker-side security model is unchanged: listing/room mapping is authoritative, readable confirmation codes are HMAC-hashed immediately on ingestion, and partial fast/hourly syncs cannot cancel absent reservations.

New/maintained Apps Script timestamps include `HOUSE_AIRBNB_LAST_SYNC_AT`, `HOUSE_AIRBNB_LAST_CALENDAR_AT`, `HOUSE_AIRBNB_LAST_FAST_PATH_AT`, `HOUSE_AIRBNB_LAST_AUDIT_AT` and `HOUSE_AIRBNB_LAST_DIAGNOSTICS`.

### Required external deployment step

Cloudflare deployment does **not** update the standalone Google Apps Script project. After v5.11.43 is deployed, replace the existing Apps Script project code with this release's `airbnb-sync/Code.gs`, save it, and run `installHouseReservationTrigger` once. Confirm exactly one `syncHouseReservations` trigger exists and runs every five minutes.

## Meta human-friendly action templates

v5.11.43 activates these exact approved templates:

- `house_service_alert_actions_v3`
- `house_booking_alert_actions_v2`
- `house_luggage_alert_actions_v2`
- `house_urgent_alert_actions_v2`
- `house_lost_key_alert_actions_v2`

All use generic English `en` and preserve the existing two quick-reply payload commands:

- visible **Received** → `HOUSE_ALERT|RECEIVED|<alert_id>`
- visible **Resolved** → `HOUSE_ALERT|RESOLVE|<alert_id>`

The internal command remains `RESOLVE`, not `RESOLVED`.

BODY orders are:

- Service v3: request, room, reported Bangkok date/time, protected details, alert reference.
- Booking v2: service/activity, room, requested date/time, guests, protected details, alert reference.
- Luggage v2: arrival/departure type, room, bags, requested date/time, protected details, alert reference.
- Urgent v2: problem, room, reported Bangkok date/time, protected details, alert reference.
- Lost-key v2: room, reported Bangkok date/time, alert reference.

The v5.11.42 `stay_extension` workflow uses Booking=`Stay extension`, Date/time=`Current stay`, Guests=`Not provided`, with the additional-night request plus protected reply contact in Details. It never claims availability is confirmed.

Recipient groups, signed webhook authorization, actor exclusion, idempotency, escalation-stop behavior, status fanout, typed `RECEIVED` / `ACK` / `RESOLVE`, private-contact handling and the one-variable `WHATSAPP_STAFF_ACTIONS_ENABLED=false` rollback remain unchanged.

## Secure passport Option 2

The private passport-registration page now offers two active alternatives through the same room/reservation-bound one-time link:

- **Option 1 — Upload passport image**
- **Option 2 — Enter the required details**

Option 2 collects exactly:

1. passport number;
2. full name;
3. birthday;
4. nationality;
5. gender / sex as shown on the passport;
6. phone / WhatsApp number.

No additional Immigration/TM30 fields are requested.

Manual details are validated server-side, stored only as a private JSON object in `PASSPORT_UPLOADS`, use a random object key, follow the existing maximum 14-day deletion lifecycle, and consume the same single-use private link after successful submission. The six values do not enter Concierge history, learning data, WhatsApp, normal logs or ordinary registration metadata.

The protected Admin view recognizes these records as **Passport details** and downloads them as `.json`; image submissions retain their normal image format. Existing authenticated retrieval and immediate-delete controls remain in place.

## Preserved invariants

- `EXPLORE_ENABLED=false`.
- Routine human contact remains Tuesday–Sunday 10:30–19:30 Bangkok; Monday/after-hours routine contact suppressed.
- The House Emergency Support remains separate from routine contact and exposes no private responder identity.
- v5.11.42 broad human-contact routing and stay-extension collection/delivery.
- v5.11.41 mobile conversation stability and emergency-call UX.
- v5.11.39 cleaning workflow/state isolation and context-free send-request protection.
- 24/7 protected lost-key flow, request-bound 500 THB consent, notification gate, rotation lock and `SPARE_KEY_CODES` secrecy.
- Numeric Wi-Fi password behavior for authorized guests.
- Snorkeling and French Kiss Divers deterministic behavior.
- Maintenance, direct/walk-in stays and Admin security boundaries.

## Automated validation

- `npm test`: **216 passed / 0 failed**.
- JavaScript syntax: **37 files passed**, including `airbnb-sync/Code.gs` through a temporary `.js` copy.
- JSON validation: **12 files passed**.
- release/version markers are v5.11.43.
- `EXPLORE_ENABLED=false` remains set.

The hosted build environment could not complete Wrangler dry-run because Wrangler was not locally available and `npx` package resolution did not complete. Run `npx wrangler deploy --dry-run` locally before deployment.
