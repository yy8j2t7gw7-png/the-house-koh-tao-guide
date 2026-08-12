# Development Guidelines

## Session start

Read completely before modifying source:

1. `PROJECT_RULES.md`
2. `ROADMAP.md`
3. `CHANGELOG.md`
4. `README.md`
5. Relevant Deep Research files
6. Current source and structured data for the affected module

## Architecture

Preserve the architecture of the latest working release. Extend existing modules rather than creating parallel implementations.

Root public routes are retained for backwards compatibility. Canonical copies under `public/modules/` must remain synchronized with their root counterparts.

## Structured data

Use structured JSON for place, activity and service records wherever the current architecture supports it. Useful fields include:

- stable ID or slug
- name, category and area
- concise card description
- full concierge description
- best known for and perfect-for metadata
- practical information
- map link
- operating information and pricing where researched
- safety and accessibility
- nearby and cross-links
- verification date and sources
- AI summary and keywords
- media placeholders
- booking policy when applicable

Do not force or invent fields unsupported by authoritative research.

## UI

- Design for phones first.
- Keep cards scannable and put detailed information on detail pages.
- Use consistent buttons and labels across modules.
- Preserve a clear route back to Explore and home.
- Do not expose operator-direct booking actions for concierge-booked services.

## Contact routing

Use `public/contacts.js` as the source of truth for both contact channels:

- `houseSupport` is Su’s route for fresh towels, room cleaning, lost keys, room supplies and other requirements related to the guest’s stay.
- `bookings` is Fah’s route for commissionable activities and services.

Public support labels may remain generic. Do not point routine stay-support actions at `bookings`, and do not point commissionable booking actions at `houseSupport`.

The target AI architecture should let the concierge conduct routine stay-support conversations end-to-end before handing operational work or escalation to Su.

## Concierge booking

Use the shared contact and booking utilities:

- `public/contacts.js`
- `public/concierge-booking.js`
- `public/platform-actions.js`
- `public/platform-action-runtime.js`

Public labels may be generic, including “Book with Us” and “Call Us”. The underlying booking number must be +66962741424. Keep Fah’s identity internal unless a future requirement explicitly calls for displaying it.

## AI Concierge

The production foundation reads approved answers from `public/data/concierge-knowledge.json`. Follow `CONCIERGE_KNOWLEDGE_GUIDE.md` when adding content.

The concierge must:

- determine room context from the room URL or stored room selection
- ask for the room when a stay-support request lacks context
- intercept general Contact Us actions and answer first
- offer human handoff only when needed
- keep stay support, bookings, property emergencies and medical emergencies on separate routes
- use a safe fallback instead of inventing an answer
- keep Explore recommendations out of the answer engine until explicitly approved

Future recommendation logic may filter by guest type, budget, time, transport constraints, weather dependency, activity level, child suitability, area and booking requirements.

## Sensitive operations

Never put key-box codes, private guest tokens or API credentials in public source or structured content. Follow `SECURE_AFTER_HOURS_ACCESS.md` for the protected spare-key flow.

After hours are 19:30–10:30 in Bangkok time. This does not define reception or property operating hours.

## Research

Do not browse or conduct new research unless explicitly requested. Uploaded Deep Research is the factual source of truth. When a required research file is missing, do not implement factual content from assumptions.

## Media

Use placeholders during feature development. Images and logos are a later dedicated pass.

## Release checklist

A coherent release must:

- update package and platform version metadata
- update README, CHANGELOG and ROADMAP
- validate JSON and JavaScript
- validate root/module copy parity
- validate public booking destinations and prohibited direct-booking actions
- validate that stay-support routes resolve only to Su and commissionable booking routes resolve only to Fah
- validate concierge intent matching, room context and safe fallbacks
- validate that public Contact Us actions open the concierge before human handoff
- validate that no key-box code or messaging credential is present in the release
- validate local routes and referenced assets
- complete a production dry-run bundle
- be packaged as a complete ready-to-push ZIP

Prefer meaningful milestone or policy-hardening releases over unnecessary micro-patches.
