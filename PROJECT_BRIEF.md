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

Current release: v5.11.18.

The live release prioritizes the operational guest journey and AI Concierge. It supports seven guest languages across the complete live operational pages, with per-item translation isolation so one unsupported sentence cannot block an entire page. The concierge uses an animated-dot thinking state and approved external social actions for Bamboo Beach Bar. Secure guest verification is concise but retains every required privacy and registration instruction. Verified guest guidance includes the confirmed luggage-storage windows and careful use of Koh Tao's limited fresh water and island electricity. Explore is disabled through a reversible deployment feature switch; all Explore source content remains preserved for the final content phase.

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

After-hours spare-key handling applies from 19:30 to 10:30 Bangkok time. Each active room will have a key box beside its door. Lost keys add a 500 THB fee. Codes remain only in an encrypted Worker secret. Even with an active verified session, the guest must enter the Airbnb confirmation code again; the server checks it against the same room and active reservation without storing the readable code. The guest then confirms the fee and the system automatically sends the protected owner/Su WhatsApp alert before showing the room code. The WhatsApp API must confirm message submission; no guest approval of that notification is required. The key-box code never appears in that alert or operational storage, and a second release is blocked until staff rotate it.

### Next major phase

Transport is the next major module, but it is blocked until authoritative Transport Deep Research is supplied.

### Handover instruction

Do not start over. Read the latest release, permanent documentation and relevant research before modifying source. Preserve the existing architecture and completed modules.
