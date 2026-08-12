# Changelog

All notable changes to The House – Koh Tao guest guide are recorded here.

## v5.5.1 — Guest-Facing Booking Language Privacy

### Fixed

- Replaced internal commercial terminology in deterministic booking answers with concise guest-service wording.
- Added an explicit AI instruction never to discuss internal commercial arrangements, referral terms, revenue or how The House may benefit from a booking.
- Added a final server-side disclosure guard covering deterministic, AI-generated and owner-approved answers.
- Renamed public routing metadata to `conciergeBookings` and removed private commercial terminology from public configuration and project documentation.
- Added automated regression coverage proving that an unsafe model answer is replaced before it reaches a guest.

### Unchanged

- **Book with Us** and **Call Us** continue to route booking enquiries to +66 96 274 1424.
- Routine stay support continues to route to Su at +66 64 097 3491.
- AI, controlled learning, passport privacy, 14-day passport retention and secure spare-key boundaries are unchanged.

## v5.5.0 — Model-Powered Concierge & Controlled Learning

### Added

- Server-side OpenAI Responses API integration using strict structured output and `store: false`.
- Hybrid response pipeline: deterministic approved answers for high-confidence and protected intents, model reasoning for natural language and contextual follow-ups, and device-safe fallback during API failure.
- Multilingual guest-answer policy grounded only in approved House knowledge.
- SQLite-backed Durable Object for sanitized interaction metrics, learning candidates, owner-approved answers and guest feedback.
- Private `/concierge-admin` owner review interface with approve, reject, deactivate and export actions.
- Immediate activation of owner-approved answers without requiring a code deployment.
- Guest Yes/No answer feedback controls.
- Per-session request-rate protection and strict request-size validation.
- Automated 30-day removal of interaction and feedback records.
- Unit tests covering protected routing, structured model contracts, fallback behavior, owner-approved learning, feedback, admin authorization and privacy redaction.
- `AI_CONCIERGE_OPERATIONS.md` with secure activation and daily-review procedures.
- Private room-bound, expiring and single-use passport-image links created from the authenticated owner area.
- Guest-friendly passport page explaining the TM30 registration purpose, private handling and automatic deletion before accepting an upload.
- Private R2 document storage with file-signature and size validation, authenticated download, immediate deletion and daily retention cleanup.
- Owner passport-request queue with expected arrival time, overdue visibility, manual-reminder status and a ready-to-copy reminder for ordinary WhatsApp.
- `PASSPORT_DATA_OPERATIONS.md` covering setup, retention, reminders, incident actions and the missing authoritative manual-field specification.

### Changed

- Guest questions now go to the protected Worker endpoint before using the existing on-device matching engine as a fallback.
- Short conversation context is retained in browser session storage for follow-up questions.
- The concierge welcome text now invites guests to use their preferred language.
- Guest privacy guidance now explicitly asks users not to share passport, payment or key-box information.
- Overnight-visitor guidance now requests a separate private passport link rather than asking guests to send a document through chat or WhatsApp.
- Broad single-word `help` matching was removed to prevent unrelated questions from receiving the generic welcome answer.
- The on-device and API-failure matcher now requires stronger confidence so unrelated requests cannot be misclassified as emergencies.
- Worker configuration now includes persistent learning storage and rate limiting.
- Package, module registry and structured knowledge release metadata updated to v5.5.0.

### Safety and operational status

- The model cannot generate guest action destinations; all booking, support and emergency buttons remain centrally controlled.
- Key-box codes, stay-link tokens and credentials remain outside model prompts, logs and public files.
- Passport images remain outside the model, learning store, interaction logs, WhatsApp and public files.
- Chat text that resembles pasted passport fields is discarded and reduced to a generic registration intent before model reasoning or operational logging.
- Protected lost-key, property-emergency and medical-emergency intents bypass generative answers.
- Model-powered answers require the server-side `OPENAI_API_KEY` secret. The deterministic concierge remains available without it.
- Owner review requires `CONCIERGE_ADMIN_TOKEN`; no secret value is included in this release.
- The dedicated 24/7 property-emergency contact and secure spare-key delivery remain pending operational inputs.
- Passport upload activation requires the private R2 bucket and `PASSPORT_TOKEN_PEPPER`; the manual TM30-details form remains blocked on an authoritative field list.

## v5.4.0 — Working Room-Aware Concierge Foundation

### Added

- Structured concierge knowledge file with approved accommodation and stay answers.
- Client-side concierge matching engine with natural trigger phrases, confidence threshold and safe fallbacks.
- Working conversation transcript, quick questions, answer actions and accessible mobile interaction.
- Room recognition from `/room/{number}`, local room memory and an in-concierge room selector.
- Room-aware support messages for towels, room cleaning, lost keys and room problems.
- Room 7 as a downstairs room around the corner and directly below Rooms 5 and 6, with a temporary arrival-photo placeholder.
- Separate urgent property-emergency classification for major leaks, flooding, dangerous electrical problems and serious property damage.
- Concierge authoring guide and secure after-hours spare-key architecture document.
- Accepted private signed stay links as the required authorization method for spare-key codes.
- Defined protected multi-recipient spare-key alerts for configured owners and Su.

### Changed

- General public Contact Us actions now open the concierge first rather than immediately leaving the website for WhatsApp.
- Legacy Bars, Cafés and Shopping page copies now load the complete concierge configuration instead of silently skipping initialization.
- Explicit human handoff remains available inside the concierge when operational action is required.
- Lost-key messaging states that a 500 THB replacement fee will be added.
- Recorded the after-hours window as 19:30–10:30 in Bangkok time; this does not define operating hours.
- Further Explore development is deferred until the operational concierge is working reliably for guests.
- Package, module registry and activity release metadata updated to v5.4.0.

### Safety and operational status

- Key-box codes are intentionally absent from public files and secure delivery remains disabled pending guest verification and protected server-side configuration.
- The dedicated 24/7 property-emergency contact remains unconfirmed. The disabled role temporarily falls back to House support without publicly claiming confirmed 24/7 availability.
- Su and Fah currently use ordinary WhatsApp, so staff handoffs use prefilled guest messages rather than automatic server-sent WhatsApp alerts.

## v5.3.5 — Stay Support & Booking Route Separation

### Added

- Explicit stay-support routing to Su at +66 64 097 3491.
- Structured request intent metadata for fresh towels, room cleaning, lost keys and other in-stay needs.
- Future AI Concierge policy for end-to-end routine support conversations with Su as the operational handoff.

### Changed

- Kept House-arranged activities and services on Fah’s separate booking route at +66 96 274 1424.
- Updated Practical Information and Help & Emergency wording to distinguish routine stay support from bookings.
- Centralized the Departure support link through `houseSupport` instead of a hard-coded number.
- Updated package, module registry and activity release metadata to v5.3.5.

### Validation policy

- Release validation now treats Su’s stay-support route and Fah’s House-arranged booking route as separate invariants.

## v5.3.4 — Governance & Booking Policy Hardening

### Added

- Permanent project documentation: project rules, roadmap, changelog, development guidelines, project brief, AI concierge principles and handover prompt.
- `TRANSPORT_RESEARCH_REQUIREMENTS.md` defining the authoritative research needed for v5.4.0.
- Reusable `concierge-booking.js` utility for House-arranged service WhatsApp and telephone routes.
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
