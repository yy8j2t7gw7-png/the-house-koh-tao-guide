# Work Handover Prompt

You are taking over development of **The House – Koh Tao Premium Digital Guest Guide & AI Concierge**.

This is an existing production-oriented software project. Do not start from scratch and do not redesign it without explicit approval.

## Mandatory first action

Before writing code, read completely:

1. The latest project ZIP or source tree
2. `PROJECT_RULES.md`
3. `DEVELOPMENT_GUIDELINES.md`
4. `ROADMAP.md`
5. `CHANGELOG.md`
6. `PROJECT_BRIEF.md`
7. `AI_CONCIERGE_PRINCIPLES.md`
8. Every uploaded Deep Research document relevant to the module

Understand the existing architecture before modifying it.

## Current baseline

The current release is v5.10.1. Completed modules include House Information, Restaurants, Cafés, Beaches, Bars & Nightlife, Shopping & Essentials, Activities & Experiences, the seven-language operational guest interface, the hybrid room-aware AI Concierge, controlled owner-reviewed learning, protected alerts and automatic Airbnb verified-stay access with complete group registration.

The live v5.10.1 deployment sets `EXPLORE_ENABLED=false`: Explore navigation and routes are hidden from guests, but every page, structured record and asset remains in source. Do not delete them. The operational guest pages, secure registration and AI Concierge support English, Thai, Simplified Chinese, Russian, German, French and Spanish. Translation work uses recoverable sub-batches, browser retries, non-overlapping flushes and a release audit covering every static operational-page string. Accident guidance offers Koh Tao Rescue first and 1669 second. The concierge thinking state shows animated dots only. Bamboo Beach Bar website follow-ups return its approved Facebook and Instagram actions and must not expose an internal Explore path.

Do not regress or replace completed modules.

## Research

Uploaded Deep Research is the authoritative factual source. Do not conduct new research unless explicitly asked. Do not invent missing facts.

## Critical booking rule

All activities and services marked for House-arranged booking must route enquiries through The House using +66 96 274 1424 for telephone and WhatsApp. Fah manages the booking number internally, but public buttons may use generic labels such as “Book with Us” and “Call Us”. Guest-facing answers must never discuss internal commercial arrangements, referral terms, revenue or how The House may benefit from a booking.

Never expose direct operator booking actions for those records.

## Critical stay-support rule

Fresh towels, room cleaning, lost keys or lockouts, room supplies and similar requirements related to the guest’s stay route to Su at +66 64 097 3491. Do not send these requests to Fah’s booking number.

The future AI Concierge should fully conduct routine stay-support conversations, with Su retained as the human handoff for operational action or escalation.

General public Contact Us actions open the concierge first. The concierge determines the room from the room link or asks the guest to select it. Human handoff appears only when needed.

## Current priority override

Do not continue the Explore expansion yet. Prioritize getting the concierge online, feeding it approved accommodation and stay answers, and hardening room-aware support flows. Explore development comes last.

Approved concierge answers live in `public/data/concierge-knowledge.json` and the private owner-approved knowledge overlay. Read `CONCIERGE_KNOWLEDGE_GUIDE.md` and `AI_CONCIERGE_OPERATIONS.md` before editing or operating them. Never allow the model to publish a learned answer without owner approval.

## After-hours and property emergencies

After hours are 19:30–10:30 Bangkok time. One spare-key box will be located next to each room door, and a lost key adds a 500 THB fee. Even an already verified guest must re-enter the Airbnb confirmation code for a lost-key release; it must match the same active reservation. Never place either confirmation codes or key-box codes in public files. Follow `SECURE_AFTER_HOURS_ACCESS.md`.

Major water leaks, flooding, dangerous electrical problems and serious property damage use a separate property-emergency role intended for 24/7 coverage. A dedicated on-call person and number are not yet confirmed, so do not publicly claim confirmed 24/7 coverage.

Guests may continue to use ordinary WhatsApp handoffs. v5.10.1 contains a separate official WhatsApp Business Platform adapter for protected staff alerts, including role-based recipients, signed acknowledgement and urgent/critical escalation. Automatic spare-key release fails closed until the Meta account, Utility template and encrypted urgent recipients in `WHATSAPP_ALERT_OPERATIONS.md` are configured.

v5.10.1 uses one permanent page for each active Room 1–6 and 8–11. Room 7 is inactive. Reservation data is synchronized with `airbnb-sync/Code.gs`; readable confirmation codes are HMAC-hashed before storage. A verified guest must declare whether all overnight guests are Thai or provide the complete number of non-Thai adults and children. The private guide opens only after a separate single-use passport form has been submitted for every declared non-Thai overnight guest. Lost-key assistance appears as an ordinary room-dashboard option and opens its full protected form only when selected or requested through the AI Concierge. Read `AIRBNB_AUTOMATION_SETUP.md` and `PASSPORT_DATA_OPERATIONS.md`. Passport content must never enter the model, learning queue, public assets, Airbnb messages or WhatsApp. The manual-details alternative remains blocked until the authoritative TM30 field list is supplied.

## Development method

Continue from `ROADMAP.md`. Implement the next coherent, unblocked milestone completely, test for regressions, update documentation and versioning, and produce a complete ready-to-push ZIP.

## Next planned milestone

Deploy and verify v5.10.1, activate the prepared scheduled arrival messages, and test an all-Thai exemption, a multi-passport foreign/mixed stay and a temporary spare-key code with fresh Airbnb-code revalidation and automatic team-message submission. The verified-stay secrets, Airbnb synchronizer, active listing feeds, cross-room rejection and non-sensitive passport upload are already configured or tested. A confirmed 24/7 property-emergency contact remains outstanding. Transport and other Explore modules remain deferred.

## Media

Do not spend development time sourcing images or logos. Use placeholders until the media pass.

## Release output

Provide:

- ready-to-push ZIP
- version number
- concise change summary
- commit title
- commit description
