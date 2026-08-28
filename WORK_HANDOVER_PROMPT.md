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

The current release is v5.11.19. It preserves the v5.11.18 luggage, housekeeping-precedence and urgent-clarification fixes while repairing protected browser submission, making housekeeping availability calendar-aware, extending structured booking to six additional service categories and adding a disabled-until-approved staff quick-action path. Completed modules include House Information, Restaurants, Cafés, Beaches, Bars & Nightlife, Shopping & Essentials, Activities & Experiences, the seven-language operational guest interface, the hybrid room-aware AI Concierge, controlled owner-reviewed learning, protected alerts, Airbnb and direct/walk-in verified-stay access, stay extensions, complete group registration and verified maintenance reporting.

For v5.11.19, the browser never falls back to a device-only answer for luggage, cleaning or booking operations when the protected API fails. Pending luggage fields—including an arrival/departure date—survive a rejected local-format contact and attach to the corrected international contact without entering ordinary history or storage. Housekeeping operates Tuesday–Sunday from 10:30 through 19:29 Bangkok time and is unavailable Monday; cleaning requests collect a preferred time and never promise an exact appointment. Fishing, snorkeling, taxi, taxi/longtail boat, ferry and motorbike-taxi bookings now have structured, independently validated workflows alongside diving. Recommendation-only questions create no alert. Optional **Received** and **Resolve** quick replies are code-ready but remain disabled until every new Meta template is approved and mapped.

The v5.11.17 deployment sets `EXPLORE_ENABLED=false`: Explore navigation and routes are hidden from guests, but every page, structured record and asset remains in source. Do not delete them. The operational guest pages, secure registration and AI Concierge support English, Thai, Simplified Chinese, Russian, German, French and Spanish. Translation work uses recoverable sub-batches, browser retries, non-overlapping flushes and a release audit covering every static operational-page string. Accident guidance offers Koh Tao Rescue first and 1669 second; fire guidance prioritizes evacuation and the configured Rescue action and states the safe-use conditions for the outside extinguisher on each floor. The concierge thinking state shows animated dots only. Bamboo Beach Bar website follow-ups return its approved Facebook and Instagram actions and must not expose an internal Explore path. TM30 submission remains manual and must not be automated against the Immigration portal. Verification copy is intentionally concise, and the Thai-national exemption is bilingual in English and Thai by default without duplicate fixed Thai copy in Thai-language mode. Luggage guidance states Tuesday–Sunday office storage, Bamboo Beach Bar from 11:00 AM when the office is unavailable and no current storage before 11:00 AM. Routine housekeeping requests remain recordable at any time, but service availability is Tuesday–Sunday, 10:30–19:30 Bangkok time, with Monday closed and the actual next opening stated. Room guidance asks guests to conserve limited fresh water and electricity supplied through an undersea grid connection developed to reduce reliance on local diesel generators. Maintenance reports show room-and-Bangkok-timestamp references while retaining internal UUIDs only for protected operations. A discreet token-free **Admin Login** link appears in the normal guest footer; the owner console remains protected by server-side authentication.

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

Guests may continue to use ordinary WhatsApp handoffs. The official WhatsApp Business Platform adapter has six active production templates for routine service, booking, luggage, urgent, verified lost-key and staff-status events. Actionable routine stay and completed luggage requests route to Su plus both owners; complete structured booking requests route to Fah plus both owners; verified lost-key events route to Su plus both owners; and explicitly confirmed serious property incidents route to Fah plus both owners without Su. Guest booking actions must start the structured AI Concierge flow and must never open Fah’s personal WhatsApp chat. Signed typed `RECEIVED`, backwards-compatible `ACK`, `RESOLVE` and urgent/critical escalation remain supported. v5.11.19 also recognizes signed quick-reply payloads using the same authorization, actor-exclusion and idempotency rules, but sends those buttons only when the new templates in `META_STAFF_QUICK_ACTIONS_v5.11.19.md` are all Active and `WHATSAPP_STAFF_ACTIONS_ENABLED=true`. Automatic spare-key release fails closed unless the official Meta channel accepts at least one protected team notification. Failed Meta submissions retain only sanitized, value-free diagnostics in the protected owner console. Current templates use generic English (`en`), while the five v1 rollback templates use English (US) (`en_US`). Existing mappings remain the production default.

v5.11.17 uses one permanent page for each active Room 1–6 and 8–11. Room 7 is inactive. Airbnb reservation data is synchronized with `airbnb-sync/Code.gs`; owners may also create direct/walk-in stays and extend active stays in `/concierge-admin`. All readable confirmation codes are HMAC-hashed before storage. A verified guest must declare whether all overnight guests are Thai or provide the complete number of non-Thai adults and children. Foreign and mixed groups may use a separate single-use form for every required passport or present all original passports to The House in person. The in-person route remains locked until an authorized owner confirms the check and manual registration in `/concierge-admin`. Lost-key assistance appears as an ordinary room-dashboard option and opens its guest-friendly protected form only when selected or requested through the AI Concierge. It requires one deliberate 500 THB fee confirmation and hides impossible repeat-release controls while rotation remains outstanding. Read `AIRBNB_AUTOMATION_SETUP.md`, `PASSPORT_DATA_OPERATIONS.md` and `MAINTENANCE_REPORTING_OPERATIONS.md`. Passport and maintenance-image content must never enter the model, learning queue or public assets. The manual-details alternative remains blocked until the authoritative TM30 field list is supplied.

## Development method

Critical current-message intent has explicit precedence over pending ordinary workflows. A new serious water leak, flooding, electrical danger, fire or major property-danger report must interrupt stale luggage, booking, maintenance, routine-service and contact-number state. It must show the deliberate urgent confirmation flow without requiring a contact number. An interrupted ordinary workflow must not resume or submit accidentally. Privacy, Data Protection and Terms navigation must remain available on every page.

Safety actionability is contextual and sentence-level. Figurative, slang and ambiguous language must not create an alert from a single severe keyword. Medical or personal-safety language may immediately show Koh Tao Rescue and 1669 guidance, but a House alert requires the guest to press **Send urgent alert**. Serious property incidents also require explicit confirmation. Model intent labels cannot directly create these protected alerts. The browser permits only one in-flight Concierge request so one guest message produces one coherent response and state transition.

An actionable luggage-storage request must remain pending until arrival/departure context, requested time, bag count and a usable international WhatsApp or telephone number are all available. The final server-side alert-creation boundary independently refuses incomplete data; never rely only on conversational prompting. Each new request starts clean, including one begun immediately after a completed luggage request. Raw contacts are redacted from visible Concierge messages for every request type, remain transient and may be included only in the protected staff-delivery payload; they must not enter browser history, interaction records, alert records, dashboard summaries, learning data or logs. Informational luggage questions do not create alerts. Completed luggage requests route to Su plus both owners.

Room cleaning must collect a preferred time before one service alert is created. The accepted preference may be a clock time, `now` or `ASAP`, but the response must say that availability may vary. Routine call fallback appears only while housekeeping is open Tuesday–Sunday, 10:30–19:30 Bangkok time. General booking wording and **Book with Us** actions must preserve the service category and enter the structured flow; information-only questions must not create alerts. Fishing, snorkeling, taxi, taxi/longtail boat, ferry and motorbike taxi each have category-specific required fields in addition to the existing diving gates. No booking is confirmed until availability is confirmed and payment is received. Ferry workflows must never ask for passport data.

Luggage, cleaning and booking are protected operations. If their server request fails, the browser must state that nothing was sent, retain pending workflow state and permit retry. Never replace a protected failure with a local success-like answer. Guest success wording is allowed only when at least one intended WhatsApp delivery was accepted.

Continue from `ROADMAP.md`. Implement the next coherent, unblocked milestone completely, test for regressions, update documentation and versioning, and produce a complete ready-to-push ZIP.

## Next planned milestone

Deploy v5.11.19 with the existing production template names and `WHATSAPP_STAFF_ACTIONS_ENABLED=false`. First repeat the exact arrival-tomorrow, three-bag, 2:00 PM local-to-international contact correction and confirm one luggage alert reaches Su plus both owners. Live-test cleaning at Tuesday 10:29, 10:30, 19:29 and 19:30, all Monday, and Sunday after 19:30; verify preferred-time collection and truthful no-send behavior on a protected API failure. Test information-only and complete booking flows for fishing, snorkeling, taxi, taxi/longtail boat, ferry, motorbike taxi and diving; complete requests must reach Fah plus both owners without Su. Re-test verified lost key, typed `RECEIVED`/`ACK`/`RESOLVE`, diagnostics and the guest-footer Admin Login link on desktop and mobile. Meta code `132001` must not recur. Separately submit the five optional quick-action templates, and enable the feature only after every template is Active and the exact mappings have been configured.

## Media

Do not spend development time sourcing images or logos. Use placeholders until the media pass.

## Release output

Provide:

- ready-to-push ZIP
- version number
- concise change summary
- commit title
- commit description
