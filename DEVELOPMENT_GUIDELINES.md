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
- Preserve a clear route home. Keep Explore source intact while the live `EXPLORE_ENABLED` switch is off; restore its navigation only after the planned rebuild is reviewed.
- Do not expose operator-direct booking actions for concierge-booked services.
- Keep the shared language selector available on every guest-facing operational page and secure registration flow. Owner administration remains English.

## Contact routing

Use `public/contacts.js` as the source of truth for both contact channels:

- `houseSupport` is Su’s route for fresh towels, room cleaning, lost keys, room supplies and other requirements related to the guest’s stay.
- `bookings` is Fah’s route for activities and services arranged through The House.

Public support labels may remain generic. Do not point routine stay-support actions at `bookings`, and do not point House-arranged booking actions at `houseSupport`. Guest-facing content must not discuss internal commercial arrangements, referral terms or revenue.

The target AI architecture should let the concierge conduct routine stay-support conversations end-to-end before handing operational work or escalation to Su.

## Concierge booking

Use the shared contact and booking utilities:

- `public/contacts.js`
- `public/concierge-booking.js`
- `public/platform-actions.js`
- `public/platform-action-runtime.js`

Public labels may be generic, including “Book with Us” and “Call Us”. The underlying booking number must be +66962741424. Keep Fah’s identity internal unless a future requirement explicitly calls for displaying it.

## AI Concierge

The production concierge reads approved answers from `public/data/concierge-knowledge.json`, targeted existing project records through `src/project-knowledge.js`, and server-side owner-approved additions. `src/concierge-api.js` owns model calls and safe response assembly, `src/concierge-core.js` owns deterministic intent and action rules, and `src/concierge-store.js` owns the private learning store. Follow `CONCIERGE_KNOWLEDGE_GUIDE.md` when adding content.

The concierge must:

- determine room context from the room URL or stored room selection
- ask for the room when a stay-support request lacks context
- intercept general Contact Us actions and answer first
- offer human handoff only when needed
- keep stay support, bookings, property emergencies and medical emergencies on separate routes
- use a safe fallback instead of inventing an answer
- use only retrieved existing project records or explicitly approved additions for Explore recommendations
- keep contact destinations and safety-critical actions deterministic rather than model-generated
- require owner approval before a learned answer becomes active
- redact and minimize stored guest-question data
- answer in the guest's selected language while leaving deterministic safety and contact routing under server control
- create action-needed alerts only through `src/alert-policy.js` and deliver them through `src/whatsapp-alerts.js`
- keep recipient numbers in encrypted Worker configuration and persist only recipient labels and salted hashes
- isolate approved page-translation items so one skipped source string cannot fail an entire translation batch
- treat a room URL and selected room only as context; protected stay access requires a matching Airbnb HM code or private House stay code check in `src/stay-api.js`
- keep all readable Airbnb and direct-stay confirmation codes out of storage and logs, store only keyed hashes and bind verified sessions to one reservation and room

For accidents and urgent medical situations, present Koh Tao Rescue first because the team knows the island and local access points, then present Thailand's national medical emergency number 1669 as the second immediate option. Keep both actions visible and distinct.

Model access uses the server-side `OPENAI_API_KEY` secret. Learning review uses `CONCIERGE_ADMIN_TOKEN`, and session pseudonymization should use `CONCIERGE_HASH_SALT`. Never expose these values in public code or a release archive. The deterministic engine must remain usable if model access is absent or unavailable.

Future recommendation logic may filter by guest type, budget, time, transport constraints, weather dependency, activity level, child suitability, area and booking requirements.

## Sensitive operations

Never put key-box codes, readable Airbnb or direct-stay confirmation codes, private guest tokens or API credentials in public source or structured content. Follow `SECURE_AFTER_HOURS_ACCESS.md` for the protected spare-key flow. Real key-box codes belong only in the encrypted `SPARE_KEY_CODES` Worker secret. Automatic release must fail closed unless a verified active stay, a fresh confirmation-code match for that reservation, the after-hours check, guest fee confirmation, automatic urgent-team notification with confirmed WhatsApp API submission, and rotation state all pass. Direct/walk-in codes must be generated server-side, shown only in the authorized creation response and persisted only as an HMAC hash. Extensions may move checkout later without changing the reservation identity or bypassing the verified-session limit.

Passport images use the separate private R2 workflow documented in `PASSPORT_DATA_OPERATIONS.md`. It applies only to non-Thai guests; verified guests may self-declare the all-Thai exemption, but the system must never infer nationality. A foreign or mixed group must declare the complete number of non-Thai adults and children, and one separate upload is required for every declared person—not only the booking guest—before private access is granted. Never send passport content to the model, learning store, interaction log, Airbnb message or WhatsApp. Validate the verified reservation, room, expiry, single use, byte limit and file signature before storage. Keep manual TM30 fields disabled until the authoritative schema is supplied.

Action-needed alerts use the separate deterministic policy and protected delivery adapter documented in `WHATSAPP_ALERT_OPERATIONS.md`. Ordinary concierge requests remain usable when external delivery is unavailable. Verify signed webhooks, recipient authorization, duplicate suppression, escalation, sanitization and 30-day cleanup. The special spare-key operation intentionally fails closed until the automatically triggered protected notification is submitted successfully to WhatsApp, but the alert must never contain the code. The guest is not asked to approve that staff notification.

Verified maintenance reports use `src/maintenance-api.js` and the private R2 workflow documented in `MAINTENANCE_REPORTING_OPERATIONS.md`. The server determines the verified room and criticality. Critical reports require a guest reply contact, but that contact must remain transient and may appear only in the protected WhatsApp delivery payload—not in the maintenance or alert database. Optional photos use the `maintenance/` prefix, authenticated owner retrieval, file-signature validation, immediate deletion and a 30-day maximum retention rule. Never send maintenance photos to AI or public assets.

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
- validate that stay-support routes resolve only to Su and House-arranged booking routes resolve only to Fah
- validate that guest-facing booking answers contain no private commercial terminology
- validate concierge intent matching, room context and safe fallbacks
- run `npm test` for protected routing, model-contract, learning and privacy coverage
- verify owner-approved knowledge works without a deployment and that feedback cannot reference a missing interaction
- validate that public Contact Us actions open the concierge before human handoff
- validate that no key-box code or messaging credential is present in the release
- validate the fixed Airbnb listing-to-room map, cross-room rejection, HMAC-only confirmation storage and verified-session expiration
- validate spare-key missing/wrong fresh confirmation code, daytime, inactive-stay, missing-fee, missing-notification, duplicate-release and rotation-lock failures
- validate passport token expiry and one-time use, private document retrieval, immediate deletion and retention cleanup
- validate that passport data cannot enter the model, learning queue, public assets or ordinary WhatsApp messages
- validate that passport requests require the non-Thai confirmation and Thai guests receive the exemption answer
- validate full-page approved translation coverage and rejection of arbitrary guest-authored page-translation text
- validate alert classification, deduplication, recipient privacy, delivery failure handling, signed webhook acknowledgement and escalation
- validate direct-stay one-time code generation and HMAC-only storage, extension-only-later dates and separate active/upcoming owner views
- validate maintenance room authorization, issue classification, conditional toilet-fee acknowledgement, private image handling, transient critical reply contact and 30-day cleanup
- validate local routes and referenced assets
- complete a production dry-run bundle
- confirm `/api/concierge/status` reports the expected model and learning configuration after production secrets are installed
- be packaged as a complete ready-to-push ZIP

Prefer meaningful milestone or policy-hardening releases over unnecessary micro-patches.
