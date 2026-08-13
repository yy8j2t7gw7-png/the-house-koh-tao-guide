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

All general public “Contact Us” actions must open the concierge first. Direct human telephone or WhatsApp actions appear only when the guest asks for a person, the concierge cannot resolve the request, or a human must take operational action.

## Urgent property emergencies

Major water leaks, flooding, burst pipes, dangerous electrical problems and serious property damage use a separate property-emergency route intended for 24/7 coverage.

Do not claim that a person or number is available 24/7 until that contact is confirmed. Until then, the role may fall back internally to House support while remaining clearly unconfirmed in documentation.

Medical or personal emergencies must remain separate from property emergencies and use the verified emergency-service routes.

## After-hours spare-key security

- After hours: 19:30–10:30, Asia/Bangkok.
- One key box will be located next to each room door.
- A 500 THB replacement fee is added for a lost key.
- Never store key-box codes in public files, URLs, structured content, repository history or release archives.
- Never reveal a code based only on a selected room number.
- Secure code delivery requires server-side secrets, current-guest verification, after-hours validation, confirmation and event logging.
- Current-guest verification uses a private signed link tied to one room and validity period.
- Every approved spare-key event must notify the configured owners and Su when the protected messaging integration is enabled.
- Notification recipient numbers and names are server-side configuration and must never appear in public files.
- Staff notifications must not contain the key-box code or the guest's private access token.

## Passport and Immigration registration data

- TM30 accommodation registration and this passport-upload workflow apply only to non-Thai guests. Thai nationals must be told that they do not need to complete it.
- An owner must confirm that a request concerns a non-Thai guest before creating a private registration link. Do not attempt to infer nationality from chat or other unverified data.
- Passport information is collected only through the separate private registration flow, never through AI chat, learning logs, public files or WhatsApp attachments.
- Explain in guest-friendly language that The House needs the information for required TM30 Immigration accommodation registration and how the document is handled.
- Use room-bound, expiring, single-use links. Room selection alone must never authorize passport upload or retrieval.
- Store passport images only in non-public document storage with random object keys and authenticated owner retrieval.
- Main file retention is 14 days after upload, with immediate owner deletion and a daily application cleanup reinforcing the R2 lifecycle rule.
- Do not use passport data for marketing, AI training or recommendation logic.
- Do not invent the manual TM30 field schema. The structured details option stays disabled until the authoritative field list is supplied.
- Ordinary WhatsApp supports only a prepared manual reminder. Automatic reminders require an approved server-side messaging integration.

## Protected staff alerts

- Requests requiring human attention may create a sanitized server-side alert for the configured `support`, `booking`, `urgent`, `emergency` or `escalation` recipient group.
- Recommendation questions alone do not notify booking staff; an explicit request to book, arrange, reserve or check availability is required.
- Urgent and critical alerts may escalate only if they remain unacknowledged for the configured period.
- Recipient numbers and names are encrypted server configuration. Public files, URLs, releases and guest answers must never contain the protected recipient list.
- Stored delivery records use labels and salted hashes, never recipient telephone numbers.
- Alerts must never contain passport information, key-box codes, private stay tokens or unredacted personal data.
- WhatsApp delivery uses only the official WhatsApp Business Platform and requires a configured account, approved message template and signed webhook. Without that configuration, the protected owner console remains the alert fallback.

## Global booking policy

All activities and services marked for House-arranged booking must route public booking enquiries through The House.

Internal booking contact:

- Name: Fah
- Phone display: +66 96 274 1424
- Telephone URI: +66962741424
- WhatsApp: +66962741424

Public interface rules:

- Generic labels such as “Book with Us”, “Call Us” and “WhatsApp Us” are approved.
- Fah does not need to be named publicly.
- Never discuss internal commercial arrangements, referral terms, revenue or how The House may benefit from a booking in guest-facing content.
- Every booking call or WhatsApp action must use Fah’s number above.
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

Current release: v5.8.2.

Explore is intentionally disabled in the live v5.8.2 release. Do not delete its pages, structured records or media. Restore it only after the planned Explore rebuild and review by changing the protected deployment feature variable. Do not expose internal Explore detail paths in live concierge answers while the feature remains disabled; use approved external actions where supplied.

Completed content modules:

- House Information
- Restaurants
- Cafés
- Beaches
- Bars & Nightlife
- Shopping & Essentials
- Activities & Experiences

The hybrid, room-aware AI Concierge, full operational translation path, controlled owner-review workflow and protected action-needed alert channel are implemented. Production model and WhatsApp delivery still require their respective server-side secrets and deployment verification. Explore remains deferred, and Transport remains research-blocked until the required authoritative source is supplied.
