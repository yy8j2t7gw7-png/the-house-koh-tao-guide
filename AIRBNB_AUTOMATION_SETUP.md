# Airbnb Stay Verification Automation

## Outcome

Every active room has one permanent guest URL. Guests enter the Airbnb confirmation code shown in their trip details. A correct code unlocks:

- automatic secure passport registration for non-Thai guests;
- an exemption option when all overnight guests are Thai nationals;
- protected 24/7 spare-key access during the active stay.

The House does not create a guest link for each booking. Room 7 is reserved in the source but is not active or shown to guests.

## Permanent Room URLs

| Room | Airbnb listing ID | Permanent URL |
| --- | --- | --- |
| 1 | `1376393324098439141` | `https://the-house-koh-tao-guide.7mf56yd45g.workers.dev/room/1` |
| 2 | `1349840459014476583` | `https://the-house-koh-tao-guide.7mf56yd45g.workers.dev/room/2` |
| 3 | `1384302186705645424` | `https://the-house-koh-tao-guide.7mf56yd45g.workers.dev/room/3` |
| 4 | `1375985816338609953` | `https://the-house-koh-tao-guide.7mf56yd45g.workers.dev/room/4` |
| 5 | `1504732379219115485` | `https://the-house-koh-tao-guide.7mf56yd45g.workers.dev/room/5` |
| 6 | `1504212652507496103` | `https://the-house-koh-tao-guide.7mf56yd45g.workers.dev/room/6` |
| 8 | `1376397702280299752` | `https://the-house-koh-tao-guide.7mf56yd45g.workers.dev/room/8` |
| 9 | `1357684595355823468` | `https://the-house-koh-tao-guide.7mf56yd45g.workers.dev/room/9` |
| 10 | `1617732490715138330` | `https://the-house-koh-tao-guide.7mf56yd45g.workers.dev/room/10` |
| 11 | `1384311481900170410` | `https://the-house-koh-tao-guide.7mf56yd45g.workers.dev/room/11` |

When a custom domain is adopted, change only the origin in the ten Airbnb messages and the `HOUSE_WORKER_ORIGIN` Script Property. The server-side room/listing mapping stays unchanged.

## 1. Configure Cloudflare secrets

Add these as **Production secrets** on the existing Worker. Never put the values in Git, this document, a screenshot or a ZIP.

- `STAY_TOKEN_PEPPER`: a new random value. Generate it with `openssl rand -base64 48`.
- `RESERVATION_SYNC_TOKEN`: a different new random value. Generate it with the same command.
- `SPARE_KEY_CODES`: a JSON object containing the current code for every active room, for example `{"1":"ROOM1CODE","2":"ROOM2CODE"}`. Enter the real codes only in Cloudflare.

The official WhatsApp Business Platform alert secrets and the derived `lost_key_team` recipients (Su and both owners) must also be configured before automatic key release will activate. The system automatically sends the protected lost-key alert, and a key code is never released unless WhatsApp accepts at least one team-message submission. The guest does not approve this notification.

## 2. Update the automatic reservation synchronizer

The production synchronizer is the existing standalone Google Apps Script project **The House Airbnb Reservation Sync**. Do not create a second project. Worker deployment does not update this script automatically.

1. Open the existing Apps Script project under the Google account that receives the Airbnb host emails.
2. Replace the project code with the full contents of v5.11.43 `airbnb-sync/Code.gs` and save.
3. Keep the existing Script Properties and private iCal URLs. Required properties are `HOUSE_WORKER_ORIGIN`, `RESERVATION_SYNC_TOKEN`, and `AIRBNB_ICAL_ROOM_1` through `AIRBNB_ICAL_ROOM_6` plus `AIRBNB_ICAL_ROOM_8` through `AIRBNB_ICAL_ROOM_11`. Room 7 remains inactive.
4. In the Apps Script function selector choose `installHouseReservationTrigger`, then **Run** once. Authorize only if Google asks again.
5. The installer deletes any existing `syncHouseReservations` trigger, creates exactly one five-minute time trigger, and immediately performs a full audit. Confirm there is only one `syncHouseReservations` trigger afterward.
6. Confirm the Script Properties `HOUSE_AIRBNB_LAST_SYNC_AT`, `HOUSE_AIRBNB_LAST_CALENDAR_AT` and `HOUSE_AIRBNB_LAST_AUDIT_AT` update. `HOUSE_AIRBNB_LAST_FAST_PATH_AT` updates when a trustworthy email-only reservation is successfully posted. `HOUSE_AIRBNB_LAST_DIAGNOSTICS` should remain blank before relying on absence-based cancellation.

### v5.11.43 sync behavior

- Every five minutes the script searches only a small recent window of mail from Airbnb. The Gmail query does not depend on literal subject/body phrases such as **confirmation code** or **reservation code**.
- If a message contains a valid active listing, an HM confirmation code, check-in date and check-out date, that single reservation is immediately sent to `/api/reservations/sync` with `complete:false`; it does not wait for iCal propagation.
- A reservation email also triggers an immediate calendar reconciliation.
- Even when Gmail detects nothing, all ten active private iCal feeds are reconciled at least once every 60 minutes.
- Between those hourly reconciliations an idle five-minute run performs no calendar or Worker fetches.
- The full 24-hour audit remains the only path allowed to mark a room feed complete for absence-based cancellation. Fast-path and ordinary hourly syncs can add/update/cancel an explicitly identified code but cannot mass-cancel a good stay merely because a feed is incomplete.
- The Worker still fixes each Airbnb listing ID to one room and HMAC-hashes the readable confirmation code immediately on ingestion. Readable codes are never stored or logged by the Worker.

This structure keeps quota usage low: the frequent operation is the lightweight Gmail scan, while the ten private calendars are fetched at most hourly unless a booking email or full audit makes an earlier reconciliation necessary.

## 3. Add the Airbnb scheduled messages

Create one scheduled message rule per listing. Recommended timing: two days before check-in, with the option enabled to send to last-minute bookings. Use Airbnb’s **Insert details** control for the guest first name and confirmation code. Do not type a fake placeholder as plain text.

Copy the text from `AIRBNB_SCHEDULED_MESSAGES.md`, choosing the matching room. The confirmation code is included because guests may not know where to find it; the secure page still checks it against the synchronized listing, room and stay dates.

## 4. Test before enabling spare keys

1. Add a test/future reservation using the protected owner console if the live reservation has not synchronized yet.
2. Open that room’s permanent URL in a private browser window.
3. Confirm a code for another room fails.
4. Confirm the correct code verifies the stay.
5. Confirm the passport button opens `/passport-upload#token=...`, not WhatsApp.
6. Confirm the all-Thai-guests button closes the registration reminder and revokes an unused pending upload link.
7. Test spare-key release at both daytime and nighttime only with a temporary test key-box code. Confirm every new request asks for explicit 500 THB acceptance and the automatically triggered Su-and-owner message is accepted before display.
8. After a test release, change the physical code, update `SPARE_KEY_CODES`, deploy, then confirm rotation in the owner console.

## Security properties

- Confirmation codes are HMAC-hashed immediately and never stored or displayed in readable form.
- Verification cookies are `Secure`, `HttpOnly` and `SameSite=Strict` and expire at 11:00 AM on checkout day.
- A room URL alone never grants protected access.
- Spare-key release is available 24/7 but only during a current verified active stay bound to the room and protected session.
- Every new request starts without fee acceptance. The guest must explicitly confirm the 500 THB lost-key replacement fee for that request, and the system—not the guest—automatically sends the Su-and-owner notification.
- The request authorization is short-lived and single-use; acceptance from another request, session, stay, room or guest is never inherited.
- Key-box codes never enter the AI model, database, Git, logs or WhatsApp alert.
- Each release blocks the next automatic release until the physical code is rotated and an owner confirms that operation.
- Passport uploads remain single-use and the R2 14-day deletion rule remains the primary retention safeguard.
