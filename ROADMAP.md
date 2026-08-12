# Product Roadmap

Baseline: v5.4.0

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
- [x] Stay support routed to Su and commissionable bookings routed to Fah
- [x] Working structured Concierge v1 question-and-answer engine
- [x] Room-aware concierge context and room selection
- [x] Room 7 added downstairs below Rooms 5 and 6
- [x] Concierge-first public Contact Us actions
- [x] Separate urgent property-emergency classification
- [x] Safe unsupported-question and deferred-Explore fallbacks
- [x] After-hours window and secure spare-key policy documented

## Current priority — v5.4.x Operational Concierge

The concierge must be useful to real guests before further Explore expansion.

- [x] Approved stay-information knowledge file
- [x] Check-in, room, Wi-Fi, towels, cleaning, keys, house rules and checkout answers
- [x] Practical, booking, property-emergency and medical-emergency routing
- [ ] Add new approved guest questions and answers continuously
- [ ] Confirm the dedicated 24/7 property-emergency person and number
- [ ] Generate private signed links for active stays
- [ ] Validate each private link against its room and validity period
- [ ] Store room key-box codes only in protected server-side secrets
- [ ] Enable the 19:30–10:30 Bangkok-time spare-key flow
- [ ] Log spare-key access events and urgent property incidents
- [ ] Add protected owner and Su notification recipients
- [ ] Send one spare-key event alert to every configured recipient
- [ ] Connect WhatsApp Business Platform if automatic WhatsApp alerts are required
- [ ] Add unanswered-question reporting without collecting unnecessary guest data

Su and Fah currently use ordinary WhatsApp. The current release therefore uses prefilled human handoff messages; it cannot silently send WhatsApp alerts.

## Immediate online launch and hardening

- [ ] Push the v5.4.0 release to the existing hosting workflow
- [ ] Verify the live room links, including Room 7
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

- [ ] Cross-module recommendation engine
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
