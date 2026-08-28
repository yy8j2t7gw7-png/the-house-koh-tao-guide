# The House – Koh Tao

## Premium Digital Guest Guide & AI Concierge

### Mission

Build a premium digital concierge for guests of The House – Koh Tao that makes it easy to understand the property, explore Koh Tao, choose experiences, and contact The House for assistance and bookings.

The product should feel like a competent hotel concierge in a guest’s pocket, not a generic travel directory.

### Product principles

1. Practical beats promotional.
2. Verified research beats assumptions.
3. Recommendations should explain fit, not just rank places.
4. Mobile usability is the primary interface constraint.
5. Structured data should support both human browsing and AI reasoning.
6. Commercial booking opportunities should route through The House where appropriate.
7. The platform should remain modular enough to expand beyond the current property.

### Current state

Current release: v5.11.24.

The live release prioritizes the operational guest journey and AI Concierge. v5.11.24 is a narrow booking retry/delivery-state correction over the deployed v5.11.23 source. Explicit retry is resolved before knowledge retrieval, broad history or model routing and targets a contact-free durable snapshot bound to the verified reservation, room, protected browser session and original alert ID. Completed safe booking fields survive a reload; only the transient international contact is recollected when needed. Accepted alerts are never resent, ambiguous categories receive one concise choice, and unrelated bar, check-out or property questions continue through normal routing. Owner alerts now show actual sanitized WhatsApp/Meta delivery evidence without exposing contacts, recipients, payload values or secrets. The established `house_booking_alert_v2` / `en` / six-BODY mapping and `booking_with_owners` route remain unchanged pending real provider evidence. Provider wording such as “or with Master Divers would be even better” normalizes cleanly to Master Divers without an availability promise. All v5.11.23 booking validation, property isolation, urgent-console, cleaning and secure 24/7 lost-key behavior remains intact. Explore is disabled through a reversible deployment feature switch; all Explore source content remains preserved. Full public visual polish is deferred to v5.11.25.

Existing content areas:

- Property and House information
- Restaurants
- Cafés
- Beaches
- Bars & Nightlife
- Shopping & Essentials
- Activities & Experiences

Activities cover diving, freediving, snorkelling, boat trips, beach experiences, kayaking, SUP, hiking, viewpoints, rock climbing, yoga, Muay Thai, massage, cooking, wildlife, photography, night activities and rainy-day options.

### Concierge booking rule

Activities and services marked for House-arranged booking must use The House booking routes. Public labels may be generic. The underlying booking telephone and WhatsApp number must be +66 96 274 1424, which is managed by Fah.

Guest-facing content must never discuss internal commercial arrangements, referral terms, revenue or how The House may benefit from a booking.

Operator-direct booking should not be promoted in the public UI for those records.

### Stay-support rule

Routine stay requirements—including fresh towels, room cleaning, lost keys or lockouts, room supplies and room problems—route to Su at +66 64 097 3491. They must not be sent to Fah’s booking route.

The future AI Concierge should fully handle these routine support conversations, using Su as the human handoff for operational action or escalation.

### Immediate product priority

The operational concierge now takes priority over further Explore development. The hybrid concierge answers approved accommodation and stay questions, understands natural multilingual wording when its server-side model is configured, knows the guest's room when available and routes unresolved work to the correct person. Deterministic safety rules and an on-device fallback remain available when the model is unavailable.

Unknown questions and negative feedback enter a private, privacy-minimized learning queue. An owner must approve every correction before it becomes active; the model is never allowed to publish new facts by itself.

Each active room has one permanent guest page. Before verification it reveals no room information, arrival photographs, Wi-Fi or private House knowledge. The guest verifies the stay with either the Airbnb HM confirmation code from the trip details or a private House stay code for a direct/walk-in reservation, checked against the protected room and dates. Thai-only groups can record the exemption. A foreign or mixed group declares the complete number of non-Thai adults and children, then chooses either one room- and reservation-bound passport form for each person or in-person presentation of all required original passports. The private guide opens only after all uploads are received or an authorized owner confirms the in-person passport check and manual registration are complete. Passport files remain completely separate from the AI system.

The owner console separates active and upcoming stays, can extend an active stay and can create a direct/walk-in stay without Airbnb. Verified guests can report structured room problems. Routine incidents route to House support; serious water, overflow, electrical and room-security incidents route to the urgent team and require a private reply number. Optional maintenance photos stay outside AI and public assets and expire within 30 days.

Action-needed requests create sanitized protected alerts in the owner console. The release includes role-based official WhatsApp Business Platform delivery, signed acknowledgement and urgent/critical escalation, but outbound messages require the production Meta account, approved Utility template and encrypted recipient configuration.

New Explore interface and content expansion remains deferred. The concierge may already retrieve and reason over the existing approved Activities, Restaurants, Cafés, Beaches, Bars and Shopping records.

### Property emergencies and spare keys

Urgent property problems require a separate 24/7 on-call role. No dedicated person or number is confirmed yet, so the public product must not claim confirmed 24/7 coverage.

Secure spare-key handling is available 24/7 and is independent of office and housekeeping hours. Each active room has a key box beside its door. Lost keys add a 500 THB fee. Codes remain only in an encrypted Worker secret. Each request revalidates the current room-bound active-stay session, begins with no fee acceptance and creates a single-use authorization bound to that session, reservation and room. Only the guest's explicit acceptance for the current request permits the protected Su-and-owner WhatsApp notification; Meta must accept at least one delivery before the code is shown on the protected page. The key-box code never appears in the alert or operational storage, and a second release is blocked until a protected owner truthfully confirms either a controlled owner-only test that retains an unexposed code or a completed physical rotation after changing the box and encrypted secret. Neither reset revives an old request.

### Next major phase

Transport is the next major module, but it is blocked until authoritative Transport Deep Research is supplied.

### Handover instruction

Do not start over. Read the latest release, permanent documentation and relevant research before modifying source. Preserve the existing architecture and completed modules.
