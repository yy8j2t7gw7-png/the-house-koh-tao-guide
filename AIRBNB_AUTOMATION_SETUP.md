# Airbnb Stay Verification Automation

## Outcome

Every active room has one permanent guest URL. Guests enter the Airbnb confirmation code shown in their trip details. A correct code unlocks:

- automatic secure passport registration for non-Thai guests;
- an exemption option when all overnight guests are Thai nationals;
- protected after-hours spare-key access during the active stay.

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

The official WhatsApp Business Platform alert secrets and the `urgent` recipient group must also be configured before automatic key release will activate. This is deliberate: the system automatically sends the lost-key alert, and a key code is never released unless WhatsApp confirms at least one team-message submission. The guest does not approve this notification.

## 2. Install the automatic reservation synchronizer

1. Open [script.google.com](https://script.google.com) using the Google account that receives the Airbnb host emails.
2. Create a new standalone project named `The House Airbnb Reservation Sync`.
3. Replace the starter code with the full contents of `airbnb-sync/Code.gs`.
4. Open **Project Settings → Script Properties**.
5. Add `HOUSE_WORKER_ORIGIN` with `https://the-house-koh-tao-guide.7mf56yd45g.workers.dev`.
6. Add `RESERVATION_SYNC_TOKEN` with exactly the same secret value stored in Cloudflare.
7. In Airbnb, export the private calendar for each listing and add the URLs as:

   - `AIRBNB_ICAL_ROOM_1`
   - `AIRBNB_ICAL_ROOM_2`
   - `AIRBNB_ICAL_ROOM_3`
   - `AIRBNB_ICAL_ROOM_4`
   - `AIRBNB_ICAL_ROOM_5`
   - `AIRBNB_ICAL_ROOM_6`
   - `AIRBNB_ICAL_ROOM_8`
   - `AIRBNB_ICAL_ROOM_9`
   - `AIRBNB_ICAL_ROOM_10`
   - `AIRBNB_ICAL_ROOM_11`

8. In the Apps Script function selector, choose `installHouseReservationTrigger`, then select **Run**.
9. Approve the Gmail, external-request and trigger permissions. The script reads only Airbnb reservation emails and transmits only room, listing ID, confirmation code, stay dates and reservation status.
10. Return to **Project Settings → Script Properties** and check `HOUSE_AIRBNB_LAST_SYNC_AT` and `HOUSE_AIRBNB_LAST_AUDIT_AT`. `HOUSE_AIRBNB_LAST_DIAGNOSTICS` must be blank before relying on automatic cancellation detection.

The script runs once per hour to protect the Apps Script quota shared with the existing housekeeping-calendar automation. Most runs inspect only new Airbnb email since the preceding run and finish without fetching calendars when nothing changed. Once every 24 hours it performs a complete audit using the longer email history and all ten private calendars. If that audit cannot match a calendar event to a confirmation code, it records a diagnostic and sends only safe additions/updates; it does not cancel missing reservations.

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
7. Test spare-key release only with a temporary test key-box code and confirmation that the automatically triggered team message was submitted to WhatsApp.
8. After a test release, change the physical code, update `SPARE_KEY_CODES`, deploy, then confirm rotation in the owner console.

## Security properties

- Confirmation codes are HMAC-hashed immediately and never stored or displayed in readable form.
- Verification cookies are `Secure`, `HttpOnly` and `SameSite=Strict` and expire at 11:00 AM on checkout day.
- A room URL alone never grants protected access.
- Spare-key release is limited to 7:30 PM–10:30 AM Bangkok time and only during the active stay.
- The guest must explicitly confirm the 500 THB lost-key replacement fee. The system—not the guest—automatically sends the owner/Su notification.
- Key-box codes never enter the AI model, database, Git, logs or WhatsApp alert.
- Each release blocks the next automatic release until the physical code is rotated and an owner confirms that operation.
- Passport uploads remain single-use and the R2 14-day deletion rule remains the primary retention safeguard.
