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

The current release is v5.6.2. Completed modules include House Information, Restaurants, Cafés, Beaches, Bars & Nightlife, Shopping & Essentials, Activities & Experiences, and the hybrid room-aware AI Concierge with targeted approved-data retrieval, deterministic safety fallback and controlled owner-reviewed learning.

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

After hours are 19:30–10:30 Bangkok time. One spare-key box will be located next to each room door, and a lost key adds a 500 THB fee. Never place codes in public files. Follow `SECURE_AFTER_HOURS_ACCESS.md`.

Major water leaks, flooding, dangerous electrical problems and serious property damage use a separate property-emergency role intended for 24/7 coverage. A dedicated on-call person and number are not yet confirmed, so do not publicly claim confirmed 24/7 coverage.

Su and Fah currently use ordinary WhatsApp. Automatic server-sent notifications require a future WhatsApp Business Platform integration. The current release uses prefilled human handoff messages.

v5.6.2 includes a separate private passport-image flow for required TM30 guest registration and a prominent required-registration entry point on the welcome page. Read `PASSPORT_DATA_OPERATIONS.md`. It requires a private R2 bucket and `PASSPORT_TOKEN_PEPPER` before production activation. Passport content must never enter the model, learning queue, public assets or WhatsApp. The manual-details alternative is intentionally blocked until the authoritative TM30 field list is supplied.

## Development method

Continue from `ROADMAP.md`. Implement the next coherent, unblocked milestone completely, test for regressions, update documentation and versioning, and produce a complete ready-to-push ZIP.

## Next planned milestone

Activate and verify the v5.6.x production concierge by deploying the Worker, testing the private registration flow and establishing the owner review routine. Then add approved stay answers as they are supplied. Secure guest verification, protected spare-key delivery, a confirmed 24/7 property-emergency contact and a staff-notification channel remain future operational milestones. Transport and other Explore modules remain deferred.

## Media

Do not spend development time sourcing images or logos. Use placeholders until the media pass.

## Release output

Provide:

- ready-to-push ZIP
- version number
- concise change summary
- commit title
- commit description
