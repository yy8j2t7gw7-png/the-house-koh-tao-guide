# Automatic Airbnb Reservation Sync

This Google Apps Script keeps the concierge verification store synchronized without owner work per reservation.

It combines:

- one private Airbnb iCal feed per active room, for room assignment and stay dates;
- Airbnb host confirmation/change/cancellation emails in the connected Gmail account, for reservation codes when the iCal event does not include them;
- the protected Cloudflare reservation-ingestion endpoint.

Only the minimum normalized fields are sent to the Worker: listing ID, room number, confirmation code, check-in date, check-out date, reservation status and—when it can be extracted conservatively—the guest's first name. The Worker immediately hashes the confirmation code. Full names, full email bodies, phone numbers, email addresses and payment information are never transmitted. The optional first name is validated, stored only with the protected reservation record and used only for the verified room greeting.

Room 7 is intentionally excluded from Airbnb synchronization until its genuine Airbnb listing is active. It may already be used in the guest guide and for direct-stay testing. The Airbnb mapping remains fixed to the ten currently verified listing IDs supplied by the owner.

See `AIRBNB_AUTOMATION_SETUP.md` in the project root for the one-time installation process.
