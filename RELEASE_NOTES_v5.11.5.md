# Release Notes — v5.11.5

## Production WhatsApp routing and guest operations

This release completes the code-side integration for The House's protected Meta WhatsApp staff alerts. It contains no production credentials, recipient telephone numbers or key-box codes.

### Included

- Five purpose-specific Meta templates: service, booking, luggage, urgent and verified lost key.
- Role-based routing: routine stay support and luggage to Su, House-arranged bookings to Fah, and urgent/lost-key events to configured owners and support recipients.
- Structured luggage requests with room, arrival/departure context, number of bags, requested time and sanitized notes.
- Exact office hours of 10:30 AM–7:30 PM Bangkok time, Tuesday–Sunday, plus the approved Bamboo Beach Bar fallback from 11:00 AM.
- Reviewed office-hours and luggage translations in all seven supported languages.
- Conservative first-name-only Airbnb synchronization and an optional personalized verified-room greeting.
- Signed `RECEIVED <reference>` acknowledgements, with `ACK` retained for compatibility.

### Preserved safeguards

- Explore remains disabled but preserved in source.
- Passport images and fields remain outside AI, WhatsApp and public assets.
- Confirmation codes remain hashed and are never sent in staff alerts.
- Key-box codes never enter WhatsApp, logs, AI, Git or this release archive.
- Spare-key release remains fail closed until a current verified stay, after-hours timing, 500 THB fee acceptance and at least one accepted protected staff notification all succeed.
- Emergency services are never contacted automatically; direct Koh Tao Rescue and 1669 actions remain available to guests.

### Before live activation

Confirm the Meta business, display name and all five templates are approved. Add production secrets and protected recipient groups directly in Cloudflare, configure and verify the signed webhook, then run the non-sensitive delivery and acknowledgement checks in `WHATSAPP_ALERT_OPERATIONS.md`.

### Validation

- 54 automated tests pass.
- JavaScript and Apps Script syntax checks pass.
- The release archive excludes secrets, key-box codes, `.DS_Store`, Git metadata and dependency folders.
