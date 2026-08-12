# Changelog

All notable changes to The House – Koh Tao guest guide are recorded here.

## v5.3.5 — Stay Support & Booking Route Separation

### Added

- Explicit stay-support routing to Su at +66 64 097 3491.
- Structured request intent metadata for fresh towels, room cleaning, lost keys and other in-stay needs.
- Future AI Concierge policy for end-to-end routine support conversations with Su as the operational handoff.

### Changed

- Kept commissionable activities and services on Fah’s separate booking route at +66 96 274 1424.
- Updated Practical Information and Help & Emergency wording to distinguish routine stay support from bookings.
- Centralized the Departure support link through `houseSupport` instead of a hard-coded number.
- Updated package, module registry and activity release metadata to v5.3.5.

### Validation policy

- Release validation now treats Su’s stay-support route and Fah’s commissionable-booking route as separate invariants.

## v5.3.4 — Governance & Booking Policy Hardening

### Added

- Permanent project documentation: project rules, roadmap, changelog, development guidelines, project brief, AI concierge principles and handover prompt.
- `TRANSPORT_RESEARCH_REQUIREMENTS.md` defining the authoritative research needed for v5.4.0.
- Reusable `concierge-booking.js` utility for commissionable-service WhatsApp and telephone routes.
- Structured concierge-booking policy metadata for Shopping & Essentials.

### Changed

- Public booking buttons may use the generic labels “Book with Us” and “Call Us”.
- All centralized booking actions continue to route to Fah’s number: +66 96 274 1424.
- Scooter-rental booking actions now route through The House rather than exposing operator-direct contact actions.
- Package, module registry and activity release metadata updated to v5.3.4.

### Fixed

- Prevented the shared action runtime from overwriting concierge calls with an ambiguous generic `Call` label.
- Removed an invalid trailing CSS block that affected the AI Concierge panel layout.
- Replaced the missing AI Concierge page route with the valid application entry where the concierge launcher is available.

### Research status

- No Transport Deep Research was supplied with the handover. No Transport facts were invented or added.

## v5.3.3 — Activities Completion & House Booking Routing

### Added

- Yoga & Wellness
- Muay Thai
- Massage & Spa
- Cooking Classes
- Wildlife experiences
- Photography
- Night Activities
- Rainy Day activities

### Changed

- Applied a global activity booking policy routing reservations through The House.
- Activity pages route booking calls and messages to +66 96 274 1424.
- Direct operator booking CTAs were removed from public activity booking actions.
- Operator contact and source information remains in structured data for verification and AI context.

## v5.3.2

### Added

- Beach Experiences
- Kayaking
- Paddleboarding and SUP
- Hiking & Viewpoints
- Rock Climbing
- Expanded Activities filters and AI metadata

## v5.3.1

### Added

- Snorkelling
- Boat Trips
- Koh Nang Yuan visitor guidance
- Expanded Activities search and filter support

## v5.3.0

### Added

- Activities & Experiences module
- Diving
- Freediving
- Activity cards and detail pages
- Search and filter structure
- AI metadata and concierge content

### Important factual convention

Roctopus Dive is RAID, not PADI.

## v5.2.3

### Changed

- Bars & Nightlife updated from uploaded concierge research.
- Approved 14-venue ordering retained.
- Detailed researched profiles added where source coverage existed.

## Earlier completed work

Earlier releases established Restaurants, Beaches, Cafés, Shopping & Essentials, House information and the modular platform architecture. The repository Git history preserves the granular implementation commits.
