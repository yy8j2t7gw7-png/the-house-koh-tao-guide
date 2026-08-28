# Product Roadmap

Baseline: v5.11.19

## Completed

- [x] House Information
- [x] Restaurants
- [x] Cafés
- [x] Beaches
- [x] Bars & Nightlife
- [x] Shopping & Essentials
- [x] Activities & Experiences
- [x] Global activity booking routing through The House
- [x] Permanent project governance documents
- [x] Centralized concierge booking links and generic public labels
- [x] Public scooter-rental booking routed through The House
- [x] Stay support routed to Su and House-arranged bookings routed to Fah
- [x] Private commercial terminology removed from guest-facing booking answers
- [x] Existing approved Activities, Restaurants, Cafés, Beaches, Bars and Shopping data connected to the AI Concierge
- [x] Roctopus Dive and Bamboo Beach Bar preferred recommendations available as direct approved answers
- [x] Bamboo Beach Bar website follow-ups return its official Facebook and Instagram actions
- [x] Concierge loading state uses a quiet animated-dot indicator
- [x] Concierge startup and concierge-first House-support contact routing protected by regression tests
- [x] Six active Meta WhatsApp template integrations for service, booking, luggage, urgent, verified lost-key and staff status updates
- [x] Actionable luggage requests routed to Su with structured operational details
- [x] Complete-field luggage workflow requiring arrival/departure, requested time, bag count and a transient international reply contact before submission
- [x] Final server-side luggage alert boundary rejecting incomplete or stale requests and universal visible-contact redaction
- [x] Explicit pending luggage state surviving local-contact rejection and corrected international contact submission
- [x] Routine housekeeping precedence over stale luggage and booking contact collection
- [x] Vague urgent clarification and meaningful-incident quality gate before protected submission
- [x] Conservative Airbnb first-name-only synchronization and verified guest greeting
- [x] Signed `RECEIVED` acknowledgement with backwards-compatible `ACK`
- [x] Public Privacy Policy, data-deletion instructions and Terms of Use for Meta app review
- [x] Privacy, Data Protection and Terms navigation available from every page
- [x] Critical property intent overrides stale ordinary Concierge and contact-number workflows
- [x] Contextual safety classification prevents figurative, slang and ambiguous language from creating alerts
- [x] Medical and personal-safety guidance remains immediate while House notification requires explicit guest confirmation
- [x] One in-flight Concierge request produces one coherent response and state transition
- [x] Guest-friendly lost-key fee flow hides repeat-release controls while key-box rotation is outstanding
- [x] Required passport registration made prominent on main and room-specific welcome pages
- [x] Private Room welcome link opens the room-bound secure registration form directly without a WhatsApp handoff
- [x] Registration page presents image-upload and manual-entry choices without activating unverified fields
- [x] Working structured Concierge v1 question-and-answer engine
- [x] Room-aware concierge context and room selection
- [x] Room 7 preserved as a future room but removed from the active guest release
- [x] Concierge-first public Contact Us actions
- [x] Separate urgent property-emergency classification
- [x] Safe unsupported-question and deferred-Explore fallbacks
- [x] After-hours window and secure spare-key policy documented
- [x] Server-side model-powered concierge contract
- [x] Multilingual and conversational follow-up support
- [x] Strict structured model output and deterministic safety bypass
- [x] Privacy-minimized interaction and feedback logging
- [x] Controlled learning queue with owner approval
- [x] Private owner learning-review interface
- [x] Immediate activation and export of owner-approved answers
- [x] Request rate limiting and 30-day interaction retention
- [x] Private one-time passport-image upload links tied to a room
- [x] Guest-friendly TM30 purpose and passport-data treatment explanation
- [x] Authenticated owner download, immediate deletion and 14-day scheduled cleanup
- [x] Pending-arrival passport request and manual-reminder queue
- [x] Verified multilingual room-problem reporting with structured maintenance categories
- [x] Routine maintenance routing to House support and critical maintenance routing to the urgent team
- [x] Private maintenance-photo storage, owner retrieval, immediate deletion and 30-day scheduled cleanup
- [x] Toilet-use guidance and conditional 1,000 THB prohibited-item blockage fee
- [x] Readable room-and-Bangkok-timestamp maintenance references with private internal UUIDs
- [x] Separate active and upcoming reservation sections in owner operations
- [x] Active-stay extension without forcing completed guests to register again
- [x] Direct and walk-in stay creation with one-time private House codes stored only as hashes
- [x] Seven-language operational guest interface across welcome, rooms, House information, practical information, emergencies, departure, secure registration and AI Concierge
- [x] Reviewed multilingual safety, passport and operational controls
- [x] Protected approved-content translation cache without guest-message translation
- [x] Translation batch isolation so one skipped dynamic item cannot block the rest of an operational page
- [x] Recoverable translation sub-batches, browser retries and complete operational-page source audit
- [x] Thai-national exemption stated across guest registration, owner request and approved concierge knowledge
- [x] Owner confirmation that passport requests concern a non-Thai guest
- [x] Action-needed alert classification, five-minute deduplication and protected owner alert console
- [x] Official WhatsApp Business Platform adapter with signed webhook acknowledgement and resolution
- [x] Role-based protected recipient groups and ten-minute urgent/critical escalation
- [x] Fixed Airbnb listing-to-room mapping for active Rooms 1–6 and 8–11
- [x] Automatic reservation-code and stay-date synchronization from Airbnb iCal plus host email
- [x] Permanent verified room pages using the Airbnb confirmation code
- [x] Reservation-linked self-service passport forms and Thai-national exemption
- [x] Verified active-stay after-hours spare-key release with 500 THB fee confirmation
- [x] Automatic official WhatsApp urgent-team notification with confirmed API submission required before key display
- [x] Key-code rotation lock and owner confirmation workflow
- [x] Prepared scheduled Airbnb arrival messages for every active listing
- [x] Hide all private room information, arrival photographs and Wi-Fi until verified guest registration is complete
- [x] Require an explicit all-Thai or foreign/mixed-group choice after Airbnb verification
- [x] Require one passport for every declared non-Thai overnight adult and child, not only the Airbnb booking guest
- [x] Keep the private guide locked until all declared non-Thai passport submissions are received
- [x] Restrict the unverified public concierge to verification, registration reminders and emergency handling
- [x] Revalidate verified access against updated synchronized checkout dates
- [x] Use the verified active room-bound session for after-hours spare-key release without asking the guest to repeat the stay code
- [x] Present protected lost-key access as an on-demand room-dashboard option rather than a prominent welcome panel
- [x] Wire the rendered AI Concierge spare-key CTA to the protected fee-confirmation flow on the active room page
- [x] Standardize the secure verification page on the shared single-line desktop header and add a discreet owner-dashboard login entry
- [x] Offer secure upload or in-person passport presentation for every declared non-Thai overnight guest
- [x] Keep in-person registrations locked until protected owner confirmation of the manual passport check and TM30 completion
- [x] Add verified luggage-storage windows and the current early-morning limitation across room, Departure and concierge guidance
- [x] Add reviewed room guidance for conserving limited fresh water and island electricity
- [x] Reduce secure guest-verification copy without removing any mandatory registration, privacy or group-coverage requirement
- [x] Show the Thai-national exemption bilingually in English and Thai without duplicate copy in Thai-language mode

## Current priority — v5.10.x Verified Guest Launch

The concierge must be useful to real guests before further Explore expansion.

- [x] Approved stay-information knowledge file
- [x] Check-in, room, Wi-Fi, towels, cleaning, keys, house rules and checkout answers
- [x] Practical, booking, property-emergency and medical-emergency routing
- [x] Add new approved guest questions and answers without a code deployment
- [x] Add unanswered-question reporting without collecting unnecessary guest data
- [x] Add guest answer feedback and owner review
- [x] Configure the production `OPENAI_API_KEY` secret
- [x] Configure a strong `CONCIERGE_ADMIN_TOKEN` secret
- [x] Configure the recommended `CONCIERGE_HASH_SALT` secret
- [x] Deploy v5.5.0 and verify AI mode on a live room page
- [ ] Establish a regular owner learning-queue review routine
- [x] Create the private production R2 passport bucket
- [x] Configure `PASSPORT_TOKEN_PEPPER` and the 14-day R2 lifecycle rule
- [x] Verify the complete passport flow with a non-sensitive test image
- [ ] Supply the authoritative TM30 manual-entry field specification
- [ ] Add the secure manual-details alternative after that specification is approved
- [x] Add a no-upload in-person passport-handover alternative without collecting passport details in the platform
- [x] Prepare Airbnb scheduled messages as the automatic pre-arrival passport reminder
- [ ] Confirm the dedicated 24/7 property-emergency person and number
- [x] Use one permanent URL per active room with protected reservation verification
- [x] Validate every verified session against its room, listing and reservation validity period
- [x] Implement protected server-side key-code secret parsing without repository values
- [x] Implement the 19:30–10:30 Bangkok-time spare-key flow
- [x] Log spare-key access and require key-code rotation before reuse
- [x] Add protected owner and Su notification recipient configuration
- [x] Add one-alert-per-recipient delivery and escalation logic
- [x] Integrate the official WhatsApp Business Platform adapter
- [x] Configure the production Meta account, all six approved Utility templates and protected recipients
- [x] Verify live outbound delivery using non-sensitive test events
- [ ] Complete production acknowledgement and ten-minute escalation checks

Guests may continue using ordinary WhatsApp handoffs. Automated internal alerts use the separate official WhatsApp Business Platform adapter only after its protected production configuration is complete. Until then, actionable events remain visible in the protected owner console.

## Immediate online launch and hardening

- [x] Push the v5.5.0 release to the existing hosting workflow
- [x] Confirm `/api/concierge/status` reports AI and learning enabled
- [x] Capture the exact v5.11.16 Meta failure (HTTP 404 / `132001`) and implement template-aware language resolution: current templates use `en`; deliberate v1 rollback templates retain `en_US`.
- [ ] Deploy v5.11.19 and live-test protected luggage submission, housekeeping scheduling, every structured booking category, all six current templates, actor exclusion, duplicate-webhook idempotency, truthful guest fallbacks and every established privacy/security gate.
- [ ] Submit and obtain Meta approval for the five optional quick-action templates documented in `META_STAFF_QUICK_ACTIONS_v5.11.19.md`; enable them only after every template is Active.
- [x] Add `STAY_TOKEN_PEPPER` and `RESERVATION_SYNC_TOKEN` Worker secrets
- [ ] Add protected `SPARE_KEY_CODES` Worker secret before activating automatic spare-key release
- [x] Install and authorize the included Airbnb Google Apps Script synchronizer
- [x] Add each active listing's private Airbnb iCal URL to Apps Script properties
- [ ] Add and activate the prepared scheduled Airbnb arrival message for each active listing
- [x] Confirm reservations synchronize and appear in the owner operations view
- [ ] Configure the Meta production alert channel following `WHATSAPP_ALERT_OPERATIONS.md`
- [ ] Add the private R2 `maintenance/` lifecycle rule: delete uploaded objects after 30 days
- [ ] Test a routine room report, a critical report with reply contact, authenticated photo download and immediate deletion
- [ ] Test a direct/walk-in stay and an active-stay extension in production
- [ ] Test all seven languages on guest phones and review real guest feedback for wording refinements
- [ ] Verify the protected `/concierge-admin` review workflow
- [x] Verify the active permanent room links; Room 7 remains inactive
- [x] Test cross-room confirmation-code rejection
- [x] Test a non-sensitive reservation-linked passport upload
- [ ] Test the all-Thai exemption on a suitable test reservation
- [ ] Test spare-key release with a temporary code and automatic urgent-team WhatsApp submission, then rotate it
- [ ] Test the concierge on guest phones
- [ ] Test room persistence and room changes
- [ ] Test Su/Fah handoff separation
- [ ] Test urgent property and medical emergency actions
- [ ] Monitor real guest questions and add approved answers

## Deferred content modules

These modules remain valuable but are deliberately secondary to the operational concierge.

### Transport

Status: blocked pending authoritative Transport Deep Research.

- [ ] Ferries and arrival/departure guidance
- [ ] Taxis, transfers and scooter rental guidance
- [ ] Road safety, parking and fuel
- [ ] Airport and flight connections
- [ ] Transport-aware concierge metadata

`TRANSPORT_RESEARCH_REQUIREMENTS.md` defines the required research source.

### Medical & Emergency content expansion

- [ ] Hospitals
- [ ] Clinics
- [ ] Pharmacies
- [ ] Dentists
- [ ] Off-island care and emergency transport guidance

Requires carefully verified research.

### Practical Guide expansion

- [ ] Laundry
- [ ] ATMs and cash
- [ ] Coworking and remote work
- [ ] Internet and SIM cards
- [ ] Supermarkets and useful island services

## Explore expansion — last content phase

Do not begin this phase until the concierge and operational support flows are working reliably for real guests.

Live status: disabled through `EXPLORE_ENABLED=false`. Existing pages, data and media are preserved in source for reactivation after the rebuild.

- [ ] Cross-module recommendation engine
- [ ] Translate rebuilt Explore content and structured Explore records into all seven supported guest languages
- [ ] Hidden gems and local tips
- [ ] Seasonal and weather-aware advice
- [ ] Best for couples, families and rainy days
- [ ] Half-day, one-day and three-day itineraries
- [ ] No-scooter itineraries
- [ ] Ferry and departure-time awareness
- [ ] Budget and guest-type reasoning

## Media & polish

- [ ] Photos and logos
- [ ] Galleries
- [ ] Visual consistency
- [ ] SEO and content QA
- [ ] Performance and accessibility QA

## v6.0.0 Production platform milestone

- [ ] Full regression QA
- [ ] Mobile QA
- [ ] Broken-link and data-consistency audits
- [ ] Booking, support and emergency-flow audits
- [ ] Secure operations review
- [ ] Production release documentation

## Future possibilities

- Multilingual guide
- Voice mode and translation
- Offline and PWA support
- Admin and content management
- Analytics
- Airbnb and housekeeping integrations
- Automated availability and booking integrations where commercially appropriate
