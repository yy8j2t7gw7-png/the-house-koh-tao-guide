# Modular Architecture

The platform is organized as configurable modules.

## Enabled for The House

- House
- Explore
- Beaches
- Restaurants
- Diving
- Guest Information
- Help & Emergency
- Departure
- Bookings
- Transport
- Activities

## Planned modules

- AI Concierge
- Secure Digital Check-in
- Property Dashboard
- Analytics
- Multi-language
- Voice mode
- PMS integrations

## How it works

`public/module-registry.js` controls which modules are enabled for each property.

The current public URLs remain unchanged for compatibility. Canonical module copies are stored under:

`public/modules/<module-name>/`

This makes it easier to reuse the platform for another property and enable or disable modules without redesigning the whole site.
