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

Current release: v5.9.0.

The live release prioritizes the operational guest journey and AI Concierge. It supports seven guest languages across the complete live operational pages, with per-item translation isolation so one unsupported sentence cannot block an entire page. The concierge uses an animated-dot thinking state and approved external social actions for Bamboo Beach Bar. Explore is disabled through a reversible deployment feature switch; all Explore source content remains preserved for the final content phase.

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

Each active room has one permanent guest page. The guest verifies the stay with the Airbnb confirmation code from the trip details, checked against the protected synchronized listing, room and dates. A verified non-Thai guest can create a one-time room- and reservation-bound passport form without owner work. Thai nationals can record the exemption. Passport files remain completely separate from the AI system.

Action-needed requests create sanitized protected alerts in the owner console. The release includes role-based official WhatsApp Business Platform delivery, signed acknowledgement and urgent/critical escalation, but outbound messages require the production Meta account, approved Utility template and encrypted recipient configuration.

New Explore interface and content expansion remains deferred. The concierge may already retrieve and reason over the existing approved Activities, Restaurants, Cafés, Beaches, Bars and Shopping records.

### Property emergencies and spare keys

Urgent property problems require a separate 24/7 on-call role. No dedicated person or number is confirmed yet, so the public product must not claim confirmed 24/7 coverage.

After-hours spare-key handling applies from 19:30 to 10:30 Bangkok time. Each active room will have a key box beside its door. Lost keys add a 500 THB fee. Codes remain only in an encrypted Worker secret. For an active verified stay, the guest confirms the fee and the system automatically sends the protected owner/Su WhatsApp alert before showing the room code. The WhatsApp API must confirm message submission; no guest approval of that notification is required. The code never appears in that alert or operational storage, and a second release is blocked until staff rotate it.

### Next major phase

Transport is the next major module, but it is blocked until authoritative Transport Deep Research is supplied.

### Handover instruction

Do not start over. Read the latest release, permanent documentation and relevant research before modifying source. Preserve the existing architecture and completed modules.
