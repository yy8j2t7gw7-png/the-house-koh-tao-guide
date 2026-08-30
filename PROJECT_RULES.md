# The House – Koh Tao: Project Rules

## Product

The House – Koh Tao guest guide is a premium, mobile-first digital guest guide and AI concierge. It is not a travel blog.

## Source of truth

- The newest project ZIP is authoritative for implementation and architecture.
- The newest uploaded fact-checked Deep Research is authoritative for factual content.
- Do not invent missing facts or silently replace supplied research with general knowledge.
- Do not browse or conduct replacement research unless the user explicitly requests it.
- If required research is missing, document the gap and stop the factual milestone.

## Editorial standard

- Use professional hotel-concierge English.
- Be neutral, factual, practical and concise.
- Avoid influencer language, clickbait, fake rankings and unsupported superlatives.
- Explain who an option suits and why rather than relying on star ratings.

## Global contact-routing policy

Routine in-stay support must route through The House support contact:

- Name: Su
- Phone display: +66 64 097 3491
- Telephone URI: +66640973491
- WhatsApp: +66640973491

This route covers fresh towels, room cleaning, lost keys and lockouts, room supplies, air conditioning, water, Wi-Fi, check-in, checkout and similar stay-related requirements. Generic public labels such as “Contact Us” and “Call” are approved. Su does not need to be named publicly.

The future AI Concierge should conduct routine stay-support conversations end-to-end. When human action or escalation is required, the handoff remains Su. Do not send routine stay requests to the booking route.

All general public “Contact Us” actions and ordinary House-support call actions must open the concierge first. Direct human telephone or WhatsApp actions appear only when the guest asks for a person, the concierge cannot resolve the request, or a human must take operational action. House-arranged booking calls and explicit emergency calls remain direct.

## Urgent property emergencies

Major water leaks, flooding, burst pipes, dangerous electrical problems and serious property damage use a separate property-emergency route intended for 24/7 coverage.

Do not claim that a person or number is available 24/7 until that contact is confirmed. Until then, the role may fall back internally to House support while remaining clearly unconfirmed in documentation.

Medical or personal emergencies must remain separate from property emergencies and use the verified emergency-service routes.

## 24/7 lost-key and spare-key security

- Secure self-service lost-key recovery is available 24 hours a day and is not gated by office or housekeeping hours.
- One key box will be located next to each room door.
- A 500 THB replacement fee is added for a lost key.
- Never store key-box codes in public files, URLs, structured content, repository history or release archives.
- Never reveal a code based only on a selected room number.
- Every new lost-key request begins with `feeAccepted=false`. Fee acceptance and release authorization must be bound to the current verified active stay, room, protected session and request instance; no historical acceptance may be inherited.
- Secure code delivery requires server-side secrets, a current verified room-bound stay session, deliberate 500 THB fee acceptance for the current request, at least one accepted protected Su-and-owner notification, event logging, single-use request enforcement and the rotation lock. The guest does not repeat the stay code for the lost-key request.
- Current-guest verification and the fresh lost-key check use either the Airbnb HM confirmation code from the guest's trip details or the private House stay code created for a direct/walk-in reservation. The code is checked against the protected room and stay dates; the readable value is never stored or sent to AI, alerts or logs.
- Each active room may use one permanent public page, but that URL and a selected room are not proof of a reservation.
- Store confirmation codes only as keyed one-way hashes; never store, log or export readable codes.
- Verification sessions must be secure, HTTP-only, bound to one room and reservation, and expire no later than checkout.
- Direct/walk-in House stay codes may be displayed only in the authorized creation response and must be stored only as an HMAC hash. Stay extensions must preserve the existing reservation identity and may only move checkout to a later date.
- Every approved spare-key event must notify the configured owners and Su when the protected messaging integration is enabled.
- Notification recipient numbers and names are server-side configuration and must never appear in public files.
- Staff notifications must not contain the key-box code or the guest's private access token.
- During normal service hours, personal assistance may be offered in addition to self-service but may not be required before the protected flow.

## Passport and Immigration registration data

- TM30 accommodation registration and this passport-upload workflow apply only to non-Thai guests. Thai nationals must be told that they do not need to complete it.
- A verified guest may declare that every overnight guest is Thai, or declare the complete number of non-Thai adults and children in a foreign/mixed group. Every declared non-Thai overnight guest—not only the person who made the booking—must be covered either by a separate secure passport form or by presentation of all original passports to The House in person. Private guest information remains locked until all uploads are received or an authorized owner confirms the in-person passport check and manual registration are complete. Do not infer nationality from chat or other data.
- Passport information is collected only through the separate private registration flow, never through AI chat, learning logs, public files or WhatsApp attachments.
- Explain in guest-friendly language that The House needs the information for required TM30 Immigration accommodation registration and how the document is handled.
- Use reservation- and room-bound, expiring, single-use upload links. Room selection or the permanent room URL alone must never authorize passport upload or retrieval.
- Store passport images only in non-public document storage with random object keys and authenticated owner retrieval.
- Main file retention is 14 days after upload, with immediate owner deletion and a daily application cleanup reinforcing the R2 lifecycle rule.
- Do not use passport data for marketing, AI training or recommendation logic.
- Do not invent the manual TM30 field schema. The structured details option stays disabled until the authoritative field list is supplied.
- Do not automate submission to the Immigration portal. TM30 filing remains a manual authorized-owner operation.
- Use Airbnb's scheduled arrival message as the automatic pre-arrival reminder. Passport images and details must never be sent through Airbnb messages or WhatsApp.

## Protected staff alerts

- Requests requiring human attention may create a sanitized server-side alert for the configured `support`, `booking`, `urgent`, `emergency` or `escalation` recipient group.
- Recommendation questions alone do not notify booking staff; an explicit request to book, arrange, reserve or check availability is required.
- Urgent and critical alerts may escalate only if they remain unacknowledged for the configured period.
- Recipient numbers and names are encrypted server configuration. Public files, URLs, releases and guest answers must never contain the protected recipient list.
- Stored delivery records use labels and salted hashes, never recipient telephone numbers.
- Alerts must never contain passport information, key-box codes, private stay tokens or unredacted personal data.
- WhatsApp delivery uses only the official WhatsApp Business Platform and requires a configured account, approved message template and signed webhook. Without that configuration, the protected owner console remains the alert fallback.

## Maintenance reports

- Only a verified guest may submit a room maintenance report, and the server—not the browser or model—determines its room and criticality.
- Routine maintenance reports route to House support. Active leaks, toilet overflows, electrical danger and rooms that cannot be secured route to the urgent team.
- Critical reports require a guest phone or WhatsApp reply contact. That contact may appear only in the transient protected delivery payload and must never be stored in the maintenance report, alert record, AI context, learning queue, Git or release archive.
- Maintenance photos are optional, private and excluded from AI, public assets and ordinary WhatsApp content. They use authenticated owner retrieval, immediate deletion and a maximum 30-day retention policy under the `maintenance/` R2 prefix.
- Guest and staff maintenance references use the verified room plus Bangkok date and time. Internal maintenance UUIDs remain private and may be used only for protected storage and authenticated operations.
- Only human waste may be flushed. Toilet paper, tissues, wipes, sanitary products and every other item go in the provided bin. A 1,000 THB clearance fee applies only when inspection confirms that a prohibited item caused the blockage.

## Guest essentials

- Luggage storage is available Tuesday–Sunday during office working hours. If the office is unavailable, guests may store luggage at Bamboo Beach Bar from 11:00 AM. No luggage storage is currently available for early-morning arrivals before 11:00 AM.
- An actionable luggage request requires arrival/departure context, requested time, bag count and a usable international WhatsApp or telephone number before submission. The final server-side alert-creation boundary must independently reject the request when any field is absent; conversational prompting alone is not a security or integrity control. Every new request starts with clean field state, even after another luggage request completed in the same Concierge session. The raw contact is transient protected delivery data and must be redacted from the visible chat for every request type and must not enter browser history, AI context, interaction records, alert records, dashboards, learning data or logs. Informational luggage questions remain non-actionable.
- Fresh water is limited on Koh Tao. Electricity reaches the island through an undersea grid connection developed to reduce reliance on local diesel generators. Guest wording should politely ask for thoughtful water and electricity use and for air conditioning and lights to be switched off when leaving the room.
- The secure verification page must remain concise and action-led while retaining the stay-code instruction, Thai exemption, complete non-Thai group requirement, TM30 purpose, private handling, 14-day deletion and in-person passport option.
- The Thai-national exemption must be shown in both English and Thai on the default English verification page. When the full interface is Thai, do not repeat identical Thai helper lines.

## Global booking policy

All activities and services marked for House-arranged booking must route public booking enquiries through The House.

Internal booking contact:

- Name: Fah
- Phone display: +66 96 274 1424
- Telephone URI: +66962741424
- WhatsApp: +66962741424

Public interface rules:

- **Book with Us** opens the AI Concierge with the relevant service context.
- Do not expose a routine page-level booking call or personal WhatsApp shortcut.
- Fah does not need to be named publicly.
- Never discuss internal commercial arrangements, referral terms, revenue or how The House may benefit from a booking in guest-facing content.
- Every completed protected booking alert must use the established Fah-plus-owner route.
- Never use “Book Direct”, “Call Operator”, “Contact Operator” or equivalent direct-booking actions.
- Do not expose an operator telephone number, website or social channel as a booking action for records marked `the-house-concierge`.
- Operator details may remain in structured data for verification and internal AI context.
- Apply this rule to future tours, charters, transfers, rentals and other House-arranged services unless explicitly overridden.
- Do not send House-arranged booking requests to Su’s stay-support route.

## UX

- Mobile first, fast and accessible.
- Clear category navigation, search and useful filters.
- Cross-link related beaches, restaurants, cafés, bars, shopping and activities.
- Images and logos may remain placeholders until the dedicated media pass.

## Engineering

- Continue the existing architecture; do not rebuild from scratch without approval.
- Prefer reusable components and structured JSON.
- Avoid duplicated templates and business logic.
- Keep public root routes and canonical module copies synchronized.
- Preserve backwards compatibility with completed modules.
- Maintain AI-searchable metadata with structured records.
- Maintain semantic versioning.
- Every release updates README, CHANGELOG and ROADMAP and is delivered as a ready-to-push ZIP.

## AI and controlled learning

- Safety-critical intents, contact destinations and public action URLs remain deterministic and server-controlled.
- Model output must use a strict schema and must never define a telephone number, WhatsApp destination, key-box instruction or other action target.
- The model may answer only from approved project knowledge and owner-approved additions. Missing facts use an honest fallback or human handoff.
- Guest-question gaps and negative feedback may enter the private learning queue, but the model must never approve or publish its own proposed fact.
- Only an owner-approved correction becomes active. Permanent source updates must still be reconciled into the repository knowledge file.
- API keys, admin credentials, hashing secrets, guest tokens and protected access information remain server-side secrets.
- Stored guest questions must be minimized, redacted and pseudonymized. Routine interaction and feedback records expire after 30 days.

## Current baseline

Current release: v5.11.43 (production-critical Airbnb/Meta/passport release on deployed v5.11.42: five-minute lightweight Airbnb email detection with trustworthy email fast-path ingestion and hourly ten-room iCal reconciliation; the 24-hour complete audit remains the only absence-cancellation path; activate exactly the five owner-approved Meta action templates with visible Received/Resolved but internal `RECEIVED`/`RESOLVE`; enable secure passport Option 2 with exactly passport number, full name, birthday, nationality, gender/sex as shown on passport and phone number; preserve all v5.11.42 human/stay-extension, v5.11.41 emergency/mobile, v5.11.39 cleaning/state, lost-key and privacy safeguards).

Explore is intentionally disabled in the live v5.11.6 release. Do not delete its pages, structured records or media. Restore it only after the planned Explore rebuild and review by changing the protected deployment feature variable. Do not expose internal Explore detail paths in live concierge answers while the feature remains disabled; use approved external actions where supplied.

Completed content modules:

- House Information
- Restaurants
- Cafés
- Beaches
- Bars & Nightlife
- Shopping & Essentials
- Activities & Experiences

The hybrid, room-aware AI Concierge, full operational translation path, controlled owner-review workflow, protected staff-alert channel, verified-stay automation, direct/walk-in stay creation, stay extensions and verified maintenance reporting are implemented. Production key release is fail-closed until the reservation sync, key-code secret and official urgent WhatsApp recipients are configured and verified. Room 7 remains inactive. Explore remains deferred, and Transport remains research-blocked until the required authoritative source is supplied.
