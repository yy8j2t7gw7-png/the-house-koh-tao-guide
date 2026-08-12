# Guest Guide Platform with AI Concierge — The House v5.4.0

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
- Working room-aware AI Concierge foundation

The Activities module contains 49 structured profiles covering diving, freediving, snorkelling, boat trips, beach experiences, kayaking, paddleboarding, hiking, viewpoints, climbing, yoga, Muay Thai, massage, cooking, wildlife, photography, night activities and rainy-day options.

## v5.4.0 release focus

- Replaces the non-working concierge prototype response with a live structured question-and-answer engine.
- Adds approved answers for check-in, self check-in, rooms, Wi-Fi, towels, cleaning, lost keys, house rules, checkout, location, practical needs, bookings and emergencies.
- Recognizes the room from room-specific links, remembers it on the guest's device and provides a room selector when needed.
- Makes public **Contact Us** actions concierge-first while preserving explicit human handoff buttons inside the conversation.
- Adds separate routing for routine stay support, commissionable bookings, urgent property emergencies and medical emergencies.
- Defines the 19:30–10:30 Bangkok-time after-hours window and the secure architecture required for future spare-key code delivery.
- Defers further Explore content and recommendation work until the operational concierge is online and mature.

## Working concierge

The concierge loads approved content from `public/data/concierge-knowledge.json`. It runs without an external AI API or subscription and gives deterministic answers that can be expanded at any time.

The first release supports natural guest phrasings and safe fallbacks. Unsupported Explore recommendations are not invented; the guest is directed to the existing guide or offered human assistance.

See `CONCIERGE_KNOWLEDGE_GUIDE.md` for the content format and approval workflow.

## Room awareness

Room-specific routes such as `/room/5` set the room automatically. The selected room is remembered locally on the guest's device and included in support handoff messages.

A room number is context, not identity verification. It must never be used on its own to reveal a spare-key code or other protected information.

## Contact routing

Routine requests about the guest's stay use the centralized House support route:

- Telephone URI: `+66640973491`
- WhatsApp: `https://wa.me/66640973491`
- Internal support contact: Su
- Examples: fresh towels, room cleaning, lost keys or lockouts, room supplies, air conditioning, water, Wi-Fi, check-in and checkout

The concierge answers first. When human action is required, it prepares a room-aware WhatsApp handoff to Su.

## Booking routing

Commissionable activities and services marked for concierge booking must use the centralized The House booking route:

- Telephone URI: `+66962741424`
- WhatsApp: `https://wa.me/66962741424`
- Internal booking contact: Fah

The public interface does not need to name Fah or Su. Generic labels such as **Book with Us**, **Contact Us** and **Call Us** are approved. Direct operator booking, call, website or social CTAs must not be shown for records marked `the-house-concierge`.

Stay-support requests must never be sent to the booking number, and commissionable bookings must never be sent to the stay-support number.

## Urgent property emergencies

Major water leaks, flooding, burst pipes, dangerous electrical problems and serious property damage use a separate property-emergency route. This role is designed for 24/7 coverage.

No dedicated on-call person or number has been confirmed yet. The role therefore remains disabled and temporarily falls back to House support without publicly claiming 24/7 availability.

## After-hours spare keys

After hours are 19:30–10:30 in the `Asia/Bangkok` time zone. Each room will have one spare-key box next to its door, and a lost key adds a 500 THB replacement fee.

Key-box codes are not included in this release. Secure delivery remains disabled until guest verification and protected server-side secrets are configured. See `SECURE_AFTER_HOURS_ACCESS.md`.

Su and the owners currently use ordinary WhatsApp. Automatic server-sent spare-key notifications require a later WhatsApp Business Platform integration. The current release uses prefilled WhatsApp handoff messages; Fah remains the separate booking contact.

## Architecture

- Cloudflare Worker entry point: `src/index.js`
- Static application: `public/`
- Structured content: `public/data/`
- Canonical module copies: `public/modules/`
- Enabled modules and platform version: `public/module-registry.js`
- Contact routing: `public/contacts.js`
- Shared booking-link builder: `public/concierge-booking.js`
- Shared action labels: `public/platform-actions.js`
- Concierge configuration: `public/ai-concierge-config.js`
- Concierge matching engine: `public/ai-concierge-engine.js`
- Approved concierge answers: `public/data/concierge-knowledge.json`

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

## Priority order

The immediate priority is a reliable live concierge and a growing accommodation/stay knowledge base. Further Explore development—including Transport and island recommendations—is deliberately deferred until the operational concierge is working in production.

Transport still requires an authoritative Transport Deep Research document. See `TRANSPORT_RESEARCH_REQUIREMENTS.md`.

## Permanent project documents

- `PROJECT_RULES.md`
- `DEVELOPMENT_GUIDELINES.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `PROJECT_BRIEF.md`
- `AI_CONCIERGE_PRINCIPLES.md`
- `WORK_HANDOVER_PROMPT.md`
- `TRANSPORT_RESEARCH_REQUIREMENTS.md`
- `CONCIERGE_KNOWLEDGE_GUIDE.md`
- `SECURE_AFTER_HOURS_ACCESS.md`
