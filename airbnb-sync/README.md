# Automatic Airbnb Reservation Sync

This Google Apps Script keeps the concierge verification store synchronized without owner work per reservation.

It combines:

- one private Airbnb iCal feed per active room, for room assignment and stay dates;
- Airbnb host confirmation/change/cancellation emails in the connected Gmail account, for reservation codes when the iCal event does not include them;
- the protected Cloudflare reservation-ingestion endpoint.

Only the minimum normalized fields are sent to the Worker: listing ID, room number, confirmation code, check-in date, check-out date and reservation status. The Worker immediately hashes the confirmation code. Full email bodies, names, phone numbers, email addresses and payment information are never transmitted.

Room 7 is intentionally inactive. The active mapping is fixed to the ten verified Airbnb listing IDs supplied by the owner.

See `AIRBNB_AUTOMATION_SETUP.md` in the project root for the one-time installation process.
