# Modular Architecture

The platform is organized as configurable modules.

## Enabled for The House

- House
- Beaches
- Restaurants
- Diving
- Guest Information
- Help & Emergency
- Departure
- Bookings
- Transport
- Activities (dedicated `/activities.html` module)
- AI Concierge with owner-reviewed knowledge
- Seven-language operational interface
- Airbnb verified-stay access
- Direct and walk-in verified-stay access
- Owner-managed stay extensions
- Private passport upload
- Verified room-maintenance reports
- Protected staff alerts and 24/7 spare-key operations

## Preserved but disabled for the live release

- Explore UI and its category pages remain in source behind `EXPLORE_ENABLED=false`

## Planned modules

- Secure Digital Check-in
- Property Dashboard
- Analytics
- Voice mode
- PMS integrations

## How it works

`public/module-registry.js` controls which modules are enabled for each property.

`src/stay-api.js` owns deterministic reservation verification, direct/walk-in stay creation, stay extensions, complete group passport-registration progress and 24/7 spare-key release. Airbnb HM codes and private House stay codes follow the same HMAC-only storage boundary. The initial confirmation check opens the registration journey; the private guide opens only when every declared non-Thai overnight guest has submitted a separate passport record. A spare-key request revalidates the existing secure room-bound session against the same active reservation and issues a short-lived, single-use authorization bound to that session, stay and room. Current-request fee acceptance, accepted protected notification and code-rotation safeguards then run without any office-hours gate. The protected admin route accepts only explicit controlled-test or physical-rotation reset modes; `src/concierge-store.js` clears only the room lock, retains historical request/release evidence and records distinct code-free activity. `airbnb-sync/Code.gs` sends minimum normalized Airbnb reservation data to the protected ingestion endpoint.

`src/maintenance-api.js` owns verified room-problem reporting and deterministic routine/critical classification. Optional images use the private R2 binding and never enter AI or public assets. `src/whatsapp-alerts.js` owns protected staff delivery; a critical guest reply contact remains transient and is added only to the delivery payload. None of these sensitive operations is delegated to the language model.

Structured booking alerts are stored before outbound delivery so the protected operation is auditable. Deduplication carries only code-free delivery counts. An alert with failed attempts and zero acceptances creates a durable contact-free `booking_retry_snapshots` record containing only safe completed booking fields. Its binding is a one-way hash of the verified reservation, room and protected browser session, and its lifetime is limited by the verified stay/session boundary. Explicit retry is resolved before knowledge or model routing and may deliver only under the original alert ID. The transient contact is used from protected memory or recollected alone after a reload; it is never stored. Any prior accepted delivery suppresses another send. The guest receives success wording only after at least one accepted provider message ID. The protected owner alert joins only sanitized provider diagnostics by alert ID.

The current public URLs remain unchanged for compatibility. Canonical module copies are stored under:

`public/modules/<module-name>/`

This makes it easier to reuse the platform for another property and enable or disable modules without redesigning the whole site.
