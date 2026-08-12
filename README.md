# Guest Guide Platform with AI Concierge — The House v5.3.5

The House – Koh Tao guest guide is a production-oriented, mobile-first digital guest guide and concierge platform. It combines property information, curated island guidance, structured place and activity data, and centralized contact and booking routes.

## Current modules

- House and room information
- Restaurants
- Cafés
- Beaches
- Bars & Nightlife
- Shopping & Essentials
- Activities & Experiences
- Practical information
- Help & Emergency
- Departure guidance
- AI Concierge interface shell

The Activities module contains 49 structured profiles covering diving, freediving, snorkelling, boat trips, beach experiences, kayaking, paddleboarding, hiking, viewpoints, climbing, yoga, Muay Thai, massage, cooking, wildlife, photography, night activities and rainy-day options.

## v5.3.5 release focus

- Separates routine in-stay support from commissionable-service booking routes.
- Routes fresh towels, room cleaning, lost keys and other stay-related requests to Su at **+66 64 097 3491**.
- Keeps activities, scooter rental and other commissionable bookings routed to Fah at **+66 96 274 1424**.
- Adds structured request-routing metadata for the future AI Concierge conversation layer.
- Centralizes the Departure support action so it cannot drift away from the stay-support route.

## Contact routing

Routine requests about the guest's stay use the centralized House support route:

- Telephone URI: `+66640973491`
- WhatsApp: `https://wa.me/66640973491`
- Internal support contact: Su
- Examples: fresh towels, room cleaning, lost keys or lockouts, room supplies, air conditioning, water, Wi-Fi, check-in and checkout

The current interface hands these requests to Su. The planned AI Concierge should eventually conduct routine stay-support conversations end-to-end and use Su as the human operational handoff when required.

## Booking routing

Commissionable activities and services marked for concierge booking must use the centralized The House booking route:

- Telephone URI: `+66962741424`
- WhatsApp: `https://wa.me/66962741424`
- Internal booking contact: Fah

The public interface does not need to name Fah or Su. Generic labels such as **Book with Us**, **Contact Us** and **Call Us** are approved. Direct operator booking, call, website or social CTAs must not be shown for records marked `the-house-concierge`.

Stay-support requests must never be sent to the booking number, and commissionable bookings must never be sent to the stay-support number.

## Architecture

- Cloudflare Worker entry point: `src/index.js`
- Static application: `public/`
- Structured content: `public/data/`
- Canonical module copies: `public/modules/`
- Enabled modules and platform version: `public/module-registry.js`
- Contact routing: `public/contacts.js`
- Shared booking-link builder: `public/concierge-booking.js`
- Shared action labels: `public/platform-actions.js`

The root public routes remain in place for backwards compatibility. Where a canonical copy also exists under `public/modules/`, the two copies must remain byte-equivalent.

## Development

```sh
npm install
npm run dev
```

Production packaging is handled through Wrangler:

```sh
npm run deploy
```

Do not deploy from an unverified working tree. Validate JSON, JavaScript, local routes, booking destinations and canonical module copies before release.

## Research gate

The next milestone is v5.4.0 Transport. It must not be implemented until an authoritative Transport Deep Research document is supplied. See `TRANSPORT_RESEARCH_REQUIREMENTS.md` for the required scope and fields.

## Permanent project documents

- `PROJECT_RULES.md`
- `DEVELOPMENT_GUIDELINES.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `PROJECT_BRIEF.md`
- `AI_CONCIERGE_PRINCIPLES.md`
- `WORK_HANDOVER_PROMPT.md`
- `TRANSPORT_RESEARCH_REQUIREMENTS.md`
