# THE HOUSE – KOH TAO
## Development Handoff v5.11.43

### Release status

v5.11.43 is developed directly from finalized/deployed v5.11.42.

Release scope is limited to three owner-authorized workstreams:

1. production-critical Airbnb last-minute reservation synchronization hardening;
2. activation of the five newly approved human-friendly Meta staff action templates;
3. activation of secure passport Option 2 using exactly the six owner-supplied registration fields.

Do not fold unrelated Concierge, Explore, lost-key or UI redesign into this release.

## 1. Airbnb production issue and root cause

Observed production failure: a guest booked last minute, but roughly two hours later the permanent Room page still rejected the Airbnb confirmation code. The owner had to create the stay manually.

The prior Apps Script ran hourly. On a routine run it searched Gmail for a reservation message using wording-specific search terms. If no qualifying email was recognized, it returned before downloading any private Airbnb calendars. Full calendar reconciliation was guaranteed only during the 24-hour audit. This created a blind spot if Airbnb email wording changed, the parser missed the message, or the iCal feed had not yet propagated.

## 2. v5.11.43 Airbnb synchronization architecture

Authoritative file: `airbnb-sync/Code.gs`.

### Fast poll

`installHouseReservationTrigger` creates one `syncHouseReservations` trigger using `everyMinutes(5)`.

Each routine run searches the small recent Airbnb sender window. The Gmail query no longer includes literal confirmation/reservation phrases. Messages are filtered after retrieval by the HM confirmation-code parser.

### Parser hardening

- confirmation code pattern accepts `HM` plus 6–18 alphanumeric characters;
- exact active listing IDs remain authoritative;
- listing-title fallback recognizes **The House ... Room N** and **Room N ... The House** for Rooms 1–6 and 8–11 only;
- labeled ISO dates remain supported;
- labeled English dates such as `Check-in Sun, Aug 30` / `Checkout Tue, Sep 1` work without an explicit year;
- conservative year rollover supports Dec → Jan stays;
- Room 7 remains inactive.

### Immediate email fast path

If an email record has all minimum trustworthy fields — valid active listing, confirmation code, check-in date and check-out date — `postEmailReservations_` immediately submits that normalized record to `/api/reservations/sync` with `complete:false`, before any iCal dependency.

The Worker still enforces listing→room mapping and immediately HMAC-hashes the readable confirmation code. The readable code is not stored or logged.

### Hourly iCal safety net

`HOUSE_AIRBNB_LAST_CALENDAR_AT` controls a 60-minute reconciliation ceiling. All ten active iCal feeds are fetched when:

- a reservation email is detected;
- 60 minutes have elapsed since the previous calendar reconciliation;
- the daily full audit is due;
- a manual full audit is run.

When no email is detected and the previous calendar reconciliation is less than 60 minutes old, the five-minute run performs no calendar or Worker fetches.

### Daily cancellation-safe audit

The existing 24-hour full audit remains. Only a complete full-audit feed with no unmatched reservation diagnostics may cause absent confirmed stays to be cancelled. Fast-path and hourly records use `complete:false` and cannot mass-cancel good reservations.

### Operational timestamps

- `HOUSE_AIRBNB_LAST_SYNC_AT`
- `HOUSE_AIRBNB_LAST_CALENDAR_AT`
- `HOUSE_AIRBNB_LAST_FAST_PATH_AT`
- `HOUSE_AIRBNB_LAST_AUDIT_AT`
- `HOUSE_AIRBNB_LAST_DIAGNOSTICS`

## 3. Critical Apps Script deployment requirement

Pushing/deploying the Worker does not update Google Apps Script.

After Worker deployment:

1. open the existing standalone **The House Airbnb Reservation Sync** Apps Script project;
2. replace its code with v5.11.43 `airbnb-sync/Code.gs`;
3. save;
4. run `installHouseReservationTrigger` once;
5. authorize only if Google asks again;
6. confirm there is exactly one `syncHouseReservations` time trigger and that it runs every five minutes;
7. confirm the immediate full audit completes and `HOUSE_AIRBNB_LAST_SYNC_AT`, `HOUSE_AIRBNB_LAST_CALENDAR_AT` and `HOUSE_AIRBNB_LAST_AUDIT_AT` are updated.

Do not create a second Apps Script project and do not duplicate the trigger.

## 4. Meta v5.11.43 activation

Owner confirmed all five newer human-friendly templates are approved/Active and explicitly authorized activation:

- `house_service_alert_actions_v3`
- `house_booking_alert_actions_v2`
- `house_luggage_alert_actions_v2`
- `house_urgent_alert_actions_v2`
- `house_lost_key_alert_actions_v2`

`wrangler.jsonc` maps those exact names and keeps `WHATSAPP_STAFF_ACTIONS_ENABLED=true`.

All schemas use `en`.

Visible buttons:

- **Received**
- **Resolved**

Runtime payload commands remain:

- `HOUSE_ALERT|RECEIVED|<alert_id>`
- `HOUSE_ALERT|RESOLVE|<alert_id>`

Never rename the internal `RESOLVE` command to `RESOLVED`.

### Exact BODY orders

Service v3: request, room, reported Bangkok datetime, protected details, ref.

Booking v2: booking/service, room, requested datetime, guests, protected details, ref.

Luggage v2: arrival/departure type, room, bags, requested datetime, protected details, ref.

Urgent v2: problem, room, reported Bangkok datetime, protected details, ref.

Lost-key v2: room, reported Bangkok datetime, ref.

For stay extension, use Booking=`Stay extension`, Date/time=`Current stay`, Guests=`Not provided`, with additional nights plus private reply contact in Details. Do not claim extension confirmation.

The older action schemas stay in code as deliberate rollback compatibility. `house_service_alert_actions_v1` remains invalid because it has no buttons. Setting only `WHATSAPP_STAFF_ACTIONS_ENABLED=false` returns delivery to established buttonless templates.

## 5. Secure passport Option 2

The owner supplied the exact guest-entered alternative fields from the TM30 workflow. v5.11.43 activates Option 2 on the existing private passport page.

It collects exactly:

1. passport number;
2. full name;
3. birthday;
4. nationality;
5. gender / sex as shown on the passport;
6. phone / WhatsApp number.

No address, visa, arrival-card, document-expiry or other Immigration fields are added.

### Security and lifecycle

- Option 2 uses the same reservation-bound, room-bound, expiring, single-use private token as passport image upload.
- Submission is POSTed only to `/api/passport-details`.
- The server validates authorization and every required field before storage.
- The six values are serialized only into a private JSON object in `PASSPORT_UPLOADS` under a random `passport-details/` key.
- No field value is copied into Concierge history, learning data, WhatsApp, normal logs or ordinary Durable Object registration records.
- The one-time link is consumed after successful storage exactly like image upload.
- Registration progress increments through the existing passport registration lifecycle.
- Automatic deletion follows the same maximum 14-day lifecycle; the R2 lifecycle configuration must cover both `passport/` and `passport-details/` prefixes.
- Owner retrieval remains authenticated. The Admin area identifies manual submissions as **Passport details** and downloads them as `.json` rather than pretending they are images.

## 6. Preserved production behavior

Do not regress:

- v5.11.42 broad human phrasing and stay-extension collector;
- Tuesday–Sunday 10:30–19:30 routine Contact Us / Call Us, Monday closed;
- generic guest-facing **The House team**, never private staff names for routine handoff;
- property emergency call through generic **The House Emergency Support**, private responder identity/number hidden;
- v5.11.41 mobile chat space and no drag-to-dismiss;
- v5.11.39 cleaning collector, bare-hour continuation, fresh-on-reload conversation and context-free send-request block;
- authorized numeric Wi-Fi password;
- deterministic snorkeling and French Kiss Divers preference;
- all existing structured booking/luggage routes and transient private contact handling;
- 24/7 protected lost-key flow and key-box secrecy;
- passport/maintenance isolation and retention;
- direct/walk-in stays and Admin behavior;
- signed Meta webhook authorization, recipient validation, actor exclusion, idempotency, status fanout and escalation stop;
- `EXPLORE_ENABLED=false`.

## 7. v5.11.43 regression matrix

Airbnb:

- Gmail query has no dependency on literal `confirmation code` / `reservation code` wording.
- The House/Room listing title works in either order.
- yearless labeled English check-in/check-out dates parse to the expected year.
- Dec/Jan year rollover parses correctly.
- valid broader HM code is recognized.
- installer creates a five-minute trigger.
- complete email record immediately posts one room-bound `complete:false` sync.
- incomplete/untrusted email does not fast-post.
- no-email run with calendar age >60 minutes reconciles all ten active calendars.
- no-email run with recent calendar reconciliation produces zero calendar/Worker fetches.
- Worker ingestion hashes the confirmation code and rejects listing/room mismatch.

Meta:

- status/config maps all five exact new template names.
- `staffQuickActionsEnabled` remains true only when all five schemas are exact.
- service v3 BODY order is request, room, reported, details, ref.
- booking v2 BODY order is booking, room, datetime, guests, details, ref.
- stay extension uses booking v2 without false confirmation.
- luggage v2 BODY order is type, room, bags, requested, details, ref.
- urgent v2 BODY order is problem, room, reported, details, ref.
- lost-key v2 BODY order is room, reported, ref.
- Received payload remains `RECEIVED`.
- Resolved visible button payload remains internal `RESOLVE`.
- old/partial/unknown mappings fail closed.

Passport:

- private session advertises both image and details methods.
- Option 2 contains exactly the six required fields.
- missing/invalid required values fail before storage.
- successful manual details submission stores only the private JSON object plus ordinary operational metadata.
- values do not enter interactions or registration metadata.
- successful submission consumes the one-time link.
- Admin download recognizes `application/json` as passport details and uses a `.json` filename.

## 8. Release validation

Completed in this working package:

- `npm test`: **216 passed / 0 failed**.
- JavaScript syntax validation: **37 files OK**, including `airbnb-sync/Code.gs` via a temporary `.js` copy.
- JSON parsing: **12 files OK**.
- package/config/public release consistency: v5.11.43.
- `EXPLORE_ENABLED=false` preserved.

The hosted environment could not complete Wrangler dry-run because Wrangler was not locally available and `npx` could not finish package resolution. Run `npx wrangler deploy --dry-run` locally before push/deploy.

Before packaging/push, also confirm no `node_modules`, `__MACOSX` or AppleDouble files are included and perform the usual secret/private-data scan.

## 9. Post-deployment smoke test

### Worker / Meta

- `/api/concierge/status` reports release `5.11.43` and all five new action mappings.
- Send one non-sensitive alert of each kind and verify the correct human-friendly template and both buttons.
- Press **Received** and verify ACKNOWLEDGED fanout excludes the actor and stops escalation.
- Press visible **Resolved** and verify the webhook executes internal `RESOLVE`, closes the alert and fans status out only to the other assigned recipients.
- Confirm typed `RECEIVED`, `ACK` and `RESOLVE` still work.

### Apps Script / Airbnb

- update `Code.gs` and run `installHouseReservationTrigger` once;
- verify exactly one five-minute sync trigger;
- verify Apps Script timestamp properties advance;
- use a controlled/new Airbnb booking and verify its confirmation code becomes usable on the correct permanent room page promptly without manual stay creation;
- verify a code for another room remains rejected;
- keep the manual owner-created stay only as fallback.

### Passport Option 2

- use a fictional/test registration only;
- verify both Option 1 and Option 2 are visible from one private link;
- submit all six fictional details through Option 2 and confirm registration progress advances;
- in Admin, confirm the item is labeled Passport details and downloads as JSON;
- delete it and confirm the private object is removed;
- do not test with a real passport until the production access/deletion path is confirmed.

## 10. Non-scope

Airbnb scheduled-message timing/content remains an external Airbnb dashboard task. This release fixes reservation availability for verification; it does not automatically create or enable Airbnb scheduled messages.
