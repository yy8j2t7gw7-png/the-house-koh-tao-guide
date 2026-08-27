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

The current release is v5.11.14. Completed modules include House Information, Restaurants, Cafés, Beaches, Bars & Nightlife, Shopping & Essentials, Activities & Experiences, the seven-language operational guest interface, the hybrid room-aware AI Concierge, controlled owner-reviewed learning, protected alerts, Airbnb and direct/walk-in verified-stay access, stay extensions, complete group registration and verified maintenance reporting.

The v5.11.14 deployment sets `EXPLORE_ENABLED=false`: Explore navigation and routes are hidden from guests, but every page, structured record and asset remains in source. Do not delete them. The operational guest pages, secure registration and AI Concierge support English, Thai, Simplified Chinese, Russian, German, French and Spanish. Translation work uses recoverable sub-batches, browser retries, non-overlapping flushes and a release audit covering every static operational-page string. Accident guidance offers Koh Tao Rescue first and 1669 second; fire guidance prioritizes evacuation and the configured Rescue action and states the safe-use conditions for the outside extinguisher on each floor. The concierge thinking state shows animated dots only. Bamboo Beach Bar website follow-ups return its approved Facebook and Instagram actions and must not expose an internal Explore path. TM30 submission remains manual and must not be automated against the Immigration portal. Verification copy is intentionally concise, and the Thai-national exemption is bilingual in English and Thai by default without duplicate fixed Thai copy in Thai-language mode. Luggage guidance states Tuesday–Sunday office storage, Bamboo Beach Bar from 11:00 AM when the office is unavailable and no current storage before 11:00 AM. Routine housekeeping uses 10:30–19:30 Bangkok service hours while still recording after-hours requests for the following morning. Room guidance asks guests to conserve limited fresh water and electricity supplied through an undersea grid connection developed to reduce reliance on local diesel generators. Maintenance reports show room-and-Bangkok-timestamp references while retaining internal UUIDs only for protected operations.

Do not regress or replace completed modules.

## Research

Uploaded Deep Research is the authoritative factual source. Do not conduct new research unless explicitly asked. Do not invent missing facts.

## Critical booking rule

All activities and services marked for House-arranged booking must route enquiries through The House using +66 96 274 1424 for telephone and WhatsApp. Fah manages the booking number internally, but public buttons may use generic labels such as “Book with Us” and “Call Us”. Guest-facing answers must never discuss internal commercial arrangements, referral terms, revenue or how The House may benefit from a booking.

Never expose direct operator booking actions for those records.

## Critical stay-support rule

Fresh towels, room cleaning, lost keys or lockouts, room supplies and similar requirements related to the guest’s stay route to Su at +66 64 097 3491. Do not send these requests to Fah’s booking number.

The future AI Concierge should fully conduct routine stay-support conversations, with Su retained as the human handoff for operational action or escalation.

General public Contact Us actions and ordinary House-support call actions open the concierge first. The concierge determines the room from the room link or asks the guest to select it. Human handoff appears only when needed. House-arranged booking calls and explicit emergency calls remain direct.

## Current priority override

Do not continue the Explore expansion yet. Prioritize getting the concierge online, feeding it approved accommodation and stay answers, and hardening room-aware support flows. Explore development comes last.

Approved concierge answers live in `public/data/concierge-knowledge.json` and the private owner-approved knowledge overlay. Read `CONCIERGE_KNOWLEDGE_GUIDE.md` and `AI_CONCIERGE_OPERATIONS.md` before editing or operating them. Never allow the model to publish a learned answer without owner approval.

## After-hours and property emergencies

Office hours are 10:30–19:30 Bangkok time and after hours are 19:30–10:30. One spare-key box is located next to each active room door, and a lost key adds a 500 THB fee. The protected lost-key operation revalidates the existing secure room-bound active-stay session; the guest deliberately accepts the fee in two steps and does not re-enter the stay code. Never place confirmation codes or key-box codes in public files. Follow `SECURE_AFTER_HOURS_ACCESS.md`.

Major water leaks, flooding, dangerous electrical problems and serious property damage use a separate property-emergency role intended for 24/7 coverage. A dedicated on-call person and number are not yet confirmed, so do not publicly claim confirmed 24/7 coverage.

Guests may continue to use ordinary WhatsApp handoffs. v5.11.14 contains a separate official WhatsApp Business Platform adapter for protected staff alerts, with five purpose-specific templates for routine service, booking, luggage, urgent and verified lost-key events. Actionable routine stay and completed luggage requests route to Su plus both owners; complete structured booking requests route to Fah plus both owners; verified lost-key events route to Su plus both owners; and explicitly confirmed serious property incidents route to Fah plus both owners without Su. Guest booking actions must start the structured AI Concierge flow and must never open Fah’s personal WhatsApp chat. Signed `RECEIVED`, backwards-compatible `ACK`, resolution and urgent/critical escalation are supported. Automatic spare-key release fails closed unless the official Meta channel accepts at least one protected team notification. This release changes no Meta template name, parameter list, recipient secret or production configuration.

v5.11.14 uses one permanent page for each active Room 1–6 and 8–11. Room 7 is inactive. Airbnb reservation data is synchronized with `airbnb-sync/Code.gs`; owners may also create direct/walk-in stays and extend active stays in `/concierge-admin`. All readable confirmation codes are HMAC-hashed before storage. A verified guest must declare whether all overnight guests are Thai or provide the complete number of non-Thai adults and children. Foreign and mixed groups may use a separate single-use form for every required passport or present all original passports to The House in person. The in-person route remains locked until an authorized owner confirms the check and manual registration in `/concierge-admin`. Lost-key assistance appears as an ordinary room-dashboard option and opens its guest-friendly protected form only when selected or requested through the AI Concierge. It requires one deliberate 500 THB fee confirmation and hides impossible repeat-release controls while rotation remains outstanding. Read `AIRBNB_AUTOMATION_SETUP.md`, `PASSPORT_DATA_OPERATIONS.md` and `MAINTENANCE_REPORTING_OPERATIONS.md`. Passport and maintenance-image content must never enter the model, learning queue or public assets. The manual-details alternative remains blocked until the authoritative TM30 field list is supplied.

## Development method

Critical current-message intent has explicit precedence over pending ordinary workflows. A new serious water leak, flooding, electrical danger, fire or major property-danger report must interrupt stale luggage, booking, maintenance, routine-service and contact-number state. It must show the deliberate urgent confirmation flow without requiring a contact number. An interrupted ordinary workflow must not resume or submit accidentally. Privacy, Data Protection and Terms navigation must remain available on every page.

Safety actionability is contextual and sentence-level. Figurative, slang and ambiguous language must not create an alert from a single severe keyword. Medical or personal-safety language may immediately show Koh Tao Rescue and 1669 guidance, but a House alert requires the guest to press **Send urgent alert**. Serious property incidents also require explicit confirmation. Model intent labels cannot directly create these protected alerts. The browser permits only one in-flight Concierge request so one guest message produces one coherent response and state transition.

An actionable luggage-storage request must remain pending until arrival/departure context, requested time, bag count and a usable international WhatsApp or telephone number are all available. The final server-side alert-creation boundary independently refuses incomplete data; never rely only on conversational prompting. Each new request starts clean, including one begun immediately after a completed luggage request. Raw contacts are redacted from visible Concierge messages for every request type, remain transient and may be included only in the protected staff-delivery payload; they must not enter browser history, interaction records, alert records, dashboard summaries, learning data or logs. Informational luggage questions do not create alerts. Completed luggage requests route to Su plus both owners.

Continue from `ROADMAP.md`. Implement the next coherent, unblocked milestone completely, test for regressions, update documentation and versioning, and produce a complete ready-to-push ZIP.

## Next planned milestone

First live-regression test the v5.11.14 guest-service changes. Confirm fire wording provides evacuation, configured Rescue and extinguisher guidance without a House alert before **Send urgent alert**; verify routine supply requests during and after service hours; verify **find my room** opens **Your Room**; and complete one structured diving request without any personal Fah chat action. Also confirm figurative/slang phrases create no alert and a medical message still requires explicit House-alert confirmation.

Deploy and verify v5.11.14. On a verified active room after hours, open lost-key help, confirm the simplified 500 THB checkbox flow, successful protected notification before code release and the post-release rotation lock with its Concierge contact action. Recheck the complete-field luggage and diving workflow boundaries and universal contact redaction, plus the concierge launcher, owner-inclusive routing, all-Thai exemption, multi-passport foreign/mixed stay, no-upload in-person passport route, legal links and maintenance reporting. The in-person route must stay locked until an authorized owner confirms both the passport check and the separately completed manual TM30 filing; do not automate the Immigration portal. The verified-stay secrets, Airbnb synchronizer, active listing feeds, cross-room rejection and non-sensitive passport upload are already configured or tested. A confirmed 24/7 property-emergency contact remains outstanding. Transport and other Explore modules remain deferred.

## Media

Do not spend development time sourcing images or logos. Use placeholders until the media pass.

## Release output

Provide:

- ready-to-push ZIP
- version number
- concise change summary
- commit title
- commit description
