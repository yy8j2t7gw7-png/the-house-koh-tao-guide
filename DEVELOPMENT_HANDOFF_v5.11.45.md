# THE HOUSE – KOH TAO
## Development Handoff v5.11.45 — Fix Unstable Version

### Authoritative baseline

v5.11.45 is rebuilt from exact committed **v5.11.42** (`4979b83`) as the last stable baseline.

Only two workstreams are included. Do not infer or reintroduce v5.11.43/v5.11.44 passport changes or any later unstable behavior.

## Included change A — Airbnb last-minute synchronization

Authoritative file: `airbnb-sync/Code.gs`.

- `installHouseReservationTrigger` installs exactly one `syncHouseReservations` trigger at **every 5 minutes**.
- Routine Gmail search uses recent mail from Airbnb without literal confirmation/reservation phrase dependency.
- HM codes accept `HM` plus 6–18 alphanumeric characters.
- Listing recognition remains restricted to active Airbnb listing IDs and Rooms **1–6, 8–11**; Room 7 is excluded.
- Trustworthy email reservation records containing listing, confirmation code, check-in and check-out are immediately posted to `/api/reservations/sync` with `complete:false`.
- `HOUSE_AIRBNB_LAST_CALENDAR_AT` enforces calendar reconciliation at least once every 60 minutes even with no qualifying email.
- A detected reservation email may trigger earlier iCal reconciliation.
- The existing 24-hour complete audit remains the only path allowed to send a cancellation-capable complete feed.
- Fast/email/hourly partial syncs cannot absence-cancel reservations.

Operational properties include:

- `HOUSE_AIRBNB_LAST_SYNC_AT`
- `HOUSE_AIRBNB_LAST_CALENDAR_AT`
- `HOUSE_AIRBNB_LAST_FAST_PATH_AT`
- `HOUSE_AIRBNB_LAST_AUDIT_AT`
- `HOUSE_AIRBNB_LAST_DIAGNOSTICS`

After Worker deployment, update the existing Google Apps Script project manually and run `installHouseReservationTrigger` once. Do not create a second project or duplicate trigger.

## Included change B — Meta staff action templates

Exact active mappings:

- service: `house_service_alert_actions_v3`
- booking: `house_booking_alert_actions_v2`
- luggage: `house_luggage_alert_actions_v2`
- urgent: `house_urgent_alert_actions_v2`
- lost key: `house_lost_key_alert_actions_v2`

`WHATSAPP_STAFF_ACTIONS_ENABLED=true` remains enabled.

Visible buttons are **Received / Resolved**. Runtime payloads remain:

- `HOUSE_ALERT|RECEIVED|<alert_id>`
- `HOUSE_ALERT|RESOLVE|<alert_id>`

Never change internal `RESOLVE` to `RESOLVED`.

The serializer in `src/whatsapp-alerts.js` preserves exact template-specific BODY orders while retaining old schemas as rollback compatibility. The quick-action feature fails closed unless all five approved mappings are exact.

## Explicit non-scope

Do not modify as part of this release:

- passport registration, upload, retention or nationality logic;
- room-access / registration UI;
- Concierge intent routing or response wording;
- chat launcher, sheet, CSS or mobile behavior;
- human-contact policy;
- stay-extension workflow;
- cleaning workflow;
- luggage workflow;
- emergency routing;
- lost-key security/release logic;
- room content/images;
- Explore flag.

No guest-facing HTML/CSS or Concierge routing implementation file is changed versus v5.11.42 except release/cache metadata.

## Regression coverage

Base v5.11.42 suite: 208 tests.

v5.11.45 adds six narrow tests covering:

1. broader trustworthy Airbnb HM/listing/date parsing;
2. Gmail search independence from literal confirmation wording;
3. immediate trustworthy email fast-path `complete:false` sync;
4. idle five-minute skip plus >60-minute ten-calendar reconciliation;
5. five-minute trigger installation;
6. exact Meta template BODY orders, `RECEIVED`/`RESOLVE` payloads and old-mapping fail-closed fallback.

Current result: **214 passed / 0 failed**.

### Environment deployment-tool limitation

A clean `npm ci` was attempted in this hosted environment but stalled on external npm package resolution, so Wrangler could not be installed here and `npx wrangler deploy --dry-run` was not completed. This is not recorded as a source failure. Before push/deploy, run locally:

- `npm ci`
- `npm test`
- `npx wrangler deploy --dry-run`

