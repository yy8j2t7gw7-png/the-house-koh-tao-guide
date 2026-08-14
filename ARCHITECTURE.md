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
- Private passport upload
- Protected staff alerts and after-hours spare-key operations

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

`src/stay-api.js` owns deterministic reservation verification, complete group passport-registration progress and spare-key release. The initial synchronized Airbnb confirmation check opens the registration journey; the private guide opens only when every declared non-Thai overnight guest has submitted a separate passport record. A spare-key request performs a fresh confirmation-code check against the same active reservation before the fee, after-hours, staff-alert and code-rotation safeguards run. `airbnb-sync/Code.gs` sends minimum normalized Airbnb reservation data to the protected ingestion endpoint. `src/whatsapp-alerts.js` owns protected staff delivery. None of these sensitive operations is delegated to the language model.

The current public URLs remain unchanged for compatibility. Canonical module copies are stored under:

`public/modules/<module-name>/`

This makes it easier to reuse the platform for another property and enable or disable modules without redesigning the whole site.
