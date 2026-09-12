# THE HOUSE – KOH TAO
## Beds24 Unified Messaging + Channel Manager Setup — v5.11.56

This guide is for the **post-push** production setup of v5.11.56. The code ships with:

```json
"UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED": "false",
"BEDS24_CHANNEL_MANAGER_ENABLED": "false"
```

Do not place any credential in GitHub or commit it to `wrangler.jsonc`. Do not enable the production channel-manager flag until the property, rooms, existing bookings, Airbnb connection, API credentials, webhook and live integration tests are complete.

## 1. Create the Beds24 property and Rooms 1–11

Create one Beds24 property for **The House – Koh Tao** and create the 11 physical rooms so each real House room has a distinct Beds24 room ID.

Keep a private mapping table while setting up:

| House room | Beds24 room ID |
| --- | --- |
| Room 1 | `<real id>` |
| Room 2 | `<real id>` |
| ... | ... |
| Room 11 | `<real id>` |

Do not assume the provider ID equals the House room number.

## 2. Import/block all existing bookings before connecting Airbnb

Before Beds24 is allowed to distribute availability, make sure **all current and future existing reservations** are represented in Beds24 for their correct room/date ranges.

Use the existing House/Airbnb records as the reference during this migration. Until the final activation step, the existing House Airbnb sync remains authoritative.

Before continuing, compare each room calendar and confirm no occupied date is accidentally open in Beds24.

## 3. Connect Airbnb first

Connect only Airbnb for the initial rollout. Verify:

- each Airbnb listing maps to the intended Beds24 room;
- existing Airbnb reservations appear on the correct Beds24 room/calendar;
- there are no duplicates from the pre-import step;
- availability seen by Airbnb matches Beds24 as intended;
- do not connect Booking.com, Expedia, Vrbo, Agoda, Hostelworld or Trip.com yet.

Add other OTAs only after the Airbnb path is proven stable.

## 4. Build the explicit Room 1–11 map

`BEDS24_ROOM_MAP` must map every **Beds24 room ID** to the corresponding House room number.

Example shape only:

```json
{
  "771001": "1",
  "771002": "2",
  "771003": "3"
}
```

The production value must contain all 11 rooms exactly once. Never copy the example IDs.

## 5. Create Beds24 API V2 credentials/scopes

Beds24 API V2 uses invite-code/refresh-token authentication. Create a credential limited to the functions v5.11.56 needs:

- `read:bookings`
- `write:bookings`
- `read:bookings-personal`
- `write:bookings-personal`
- `read:inventory`

These cover booking read/write, guest personal/message access, and central availability reads. Do not grant financial/property/other scopes unless a later release needs them.

Exchange the invite code for the refresh token using the Beds24 API V2 setup flow. Store the refresh token privately.

## 6. Add production values only as Cloudflare secrets/configuration

Configure the Worker without committing values to source control:

### `BEDS24_REFRESH_TOKEN`

Beds24 API V2 refresh token.

### `BEDS24_WEBHOOK_TOKEN`

A new long random secret used only to authenticate Beds24 -> House webhook requests.

### `UNIFIED_MESSAGING_INTERNAL_TOKEN`

A separate long random secret for trusted server-to-server calls into the House Concierge. Do not reuse the Admin token, reservation-sync token, stay pepper or any Meta token.

### `BEDS24_ROOM_MAP`

The complete explicit mapping from Step 4. Treat it as production configuration and keep it out of GitHub.

Keep:

`BEDS24_CHANNEL_MANAGER_ENABLED = "false"`

at this stage.

## 7. Configure the authenticated Beds24 booking webhook

Configure the API V2 booking webhook in the Beds24 property access/webhook settings.

Webhook URL:

`https://<THE-HOUSE-WORKER-HOST>/api/messaging/beds24/webhook`

Preferred custom header:

`x-house-beds24-webhook-token: <same value as BEDS24_WEBHOOK_TOKEN>`

The Worker validates this token before accepting the webhook.

## 8. Verify Unified Messaging first while Channel Manager remains off

Keep both safety gates as shipped:

- `BEDS24_CHANNEL_MANAGER_ENABLED=false`
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false`

Test an Airbnb guest conversation:

1. Send a real/safe test guest message through Airbnb and confirm Beds24 receives it.
2. Confirm one thread appears in **Owner Admin -> Unified Guest Messaging** with correct source, room, dates and guest.
3. Reply manually from Unified Inbox.
4. Confirm the reply appears in the original Airbnb conversation.
5. Send another guest message and verify ordering/deduplication.
6. Answer directly in Airbnb/Beds24, trigger another webhook, and confirm the AI does not draft against an already answered message.
7. Review at least one routine AI draft.
8. Review one protected-topic case and confirm it remains human-review-only.

## 9. Verify direct WhatsApp

Using a non-staff safe test number:

1. send a message to the existing House WhatsApp number;
2. confirm it appears as a WhatsApp thread in Unified Inbox;
3. where the sender can be linked unambiguously, confirm the correct stay context is shown;
4. reply from Unified Inbox;
5. confirm delivery/receipt state behaves correctly;
6. confirm existing staff/owner quick actions are still treated as staff operations, not guest messages.

No second Meta webhook, app, phone number or template change is required.

## 10. Channel-manager live validation before production authority

The production flag should remain false until the booking bridge itself has been validated in a controlled environment. Use a Cloudflare preview/staging deployment or an explicitly controlled test window with the same release and test-safe Beds24 setup.

With the channel-manager flag enabled **only in that controlled validation environment**, verify:

### A. Inbound Airbnb reservation

- create a safe Airbnb test reservation;
- confirm Beds24 receives it;
- confirm the authenticated webhook reaches the House Worker;
- confirm the canonical House reservation is created/updated once with source `airbnb`, correct Room 1–11 mapping and correct dates;
- modify the reservation and confirm the same canonical reservation updates;
- cancel it and confirm the canonical reservation is cancelled/revoked rather than duplicated.

### B. Direct booking central availability closure

- choose a test room/date known open in Beds24;
- create a House Direct booking;
- confirm the Worker checks Beds24 availability before local creation;
- confirm a Beds24 booking is created and connected-channel inventory closes;
- confirm the House reservation is then created and linked to that Beds24 booking ID;
- try the same occupied range and confirm it is rejected rather than double-booked.

### C. Cancellation reopening

- cancel the linked House Direct test booking;
- confirm the Beds24 booking becomes cancelled;
- confirm Beds24/connected channel availability reopens according to the Beds24 channel configuration;
- if a simulated provider failure is used, confirm a retry is queued and no false synchronized status is shown.

### D. Extension conflict prevention

- create a linked Direct test booking;
- make a later night unavailable centrally;
- request an extension into that night and confirm the House local stay is **not** extended;
- make the added night available;
- retry and confirm Beds24 departure updates before the House local checkout updates.

## 11. Deliberately enable Beds24 Channel Manager in production

Only after Steps 1–10 are fully successful, deliberately set:

`BEDS24_CHANNEL_MANAGER_ENABLED = "true"`

Then immediately repeat a short production smoke test for:

- one inbound Airbnb reservation/update;
- one Unified Inbox Airbnb message/reply;
- one Direct availability check/booking on a controlled date;
- its cancellation and availability reopening;
- one extension availability check;
- one direct WhatsApp message/reply.

If any reservation-integrity test fails, turn the flag back to false and investigate before relying on Beds24 as the House central availability authority.

## 12. Keep AI auto-send false

Do **not** enable automatic AI sending as part of this Beds24 rollout.

Keep:

`UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED = "false"`

Routine AI answers can remain drafts for owner review. Protected/sensitive topics remain human-review-only.

## 13. Provider boundaries

Reservation-source preservation in this release covers:

- Airbnb
- Booking.com
- Expedia
- Vrbo
- Agoda
- Hostelworld
- Trip.com

Unified Beds24 OTA **messaging** is claimed only for:

- Airbnb
- Booking.com
- Expedia
- Vrbo

Do not present Agoda, Hostelworld or Trip.com as live unified-message channels unless a later Beds24-supported messaging implementation is explicitly validated.
