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

The current release is v5.11.37, built directly from deployed v5.11.36 after real production testing found five uncovered production gaps. Strong/direct human and housekeeper requests now deterministically expose the existing Su routine contact options during Tuesday–Sunday 10:30–19:30 Bangkok hours after clear persistence, without requiring the exact phrase **I still need a human**; closed-hours and Monday suppression remain unchanged. A cancelled fire no longer contaminates a later unrelated staff-contact turn, while genuine continuation such as **there is more smoke now** remains safety-first. Natural stained-linen language such as **there is a stain on my bed sheet** enters the existing cleaning collector so **now/ASAP** completes the same request and creates exactly one normal service alert. **I wanna learn diving** now establishes structured diving context and explicit **French Kiss Divers** preference is preserved before or during collection without promising availability. Authorized Wi-Fi-password questions now return the approved numeric password directly instead of passing through generic contact-number sanitization; the privacy sanitizer itself remains unchanged for model output and stored excerpts. v5.11.36 snorkeling authority, all existing structured workflows, currently active Meta mappings, House Maps, Explore-disabled data, Room 11/mobile UI, lost-key, passport, Airbnb, Admin and security boundaries remain authoritative. The five newer human-friendly Meta replacements remain under review and are not activated in v5.11.37.

The v5.11.26 booking workflow remains authoritative in v5.11.37: direct booking intent and every matching **Book with Us** action enter the same one-question-at-a-time collector for diving, fishing, snorkeling, taxi, taxi boat, ferry and motorbike taxi. Diving collects date and total party size, then branches to Fun Diving, Try Diving, Learn/Take a Course, Professional Training or Not Sure. Parties larger than one may use the same plan or progressive participant groups whose positive counts must sum exactly to the total. Course and certification questions come from `public/data/diving-courses.json`; Open Water/beginner paths require no prior certification, while continuing/professional fields are collected only where useful and final eligibility remains operator-verified. One international contact is collected at the end and one booking alert is produced. Side questions and preferences are acknowledged, safely retained and followed by the same next missing field without a second workflow or premature alert. A failed final delivery persists only safe non-contact retry data, including the subgroup model. Retry commands such as **retry**, **try again**, **send my booking again** and **try my diving booking again** are deterministic delivery operations, never a new checklist. They must be resolved before the model and must not receive unrelated medical, lost-key, property, cleaning or luggage history. The established buttonless booking template remains the rollback path. The active reviewed booking-action template is `house_booking_alert_actions_v1`, generic English (`en`), with the same six BODY parameters and `booking_with_owners` route; each textual BODY value passes through the shared single-line whitespace serializer immediately before Meta submission. **Received** and **Resolve** quick replies use only the authorized command and opaque alert ID.

The v5.11.17 deployment sets `EXPLORE_ENABLED=false`: Explore navigation and routes are hidden from guests, but every page, structured record and asset remains in source. Do not delete them. The operational guest pages, secure registration and AI Concierge support English, Thai, Simplified Chinese, Russian, German, French and Spanish. Translation work uses recoverable sub-batches, browser retries, non-overlapping flushes and a release audit covering every static operational-page string. Accident guidance offers Koh Tao Rescue first and 1669 second; fire guidance prioritizes evacuation and the configured Rescue action and states the safe-use conditions for the outside extinguisher on each floor. The concierge thinking state shows animated dots only. Bamboo Beach Bar website follow-ups return its approved Facebook and Instagram actions and must not expose an internal Explore path. TM30 submission remains manual and must not be automated against the Immigration portal. Verification copy is intentionally concise, and the Thai-national exemption is bilingual in English and Thai by default without duplicate fixed Thai copy in Thai-language mode. Luggage guidance states Tuesday–Sunday office storage, Bamboo Beach Bar from 11:00 AM when the office is unavailable and no current storage before 11:00 AM. Routine housekeeping requests remain recordable at any time, but service availability is Tuesday–Sunday, 10:30–19:30 Bangkok time, with Monday closed and the actual next opening stated. Room guidance says that fresh water is limited and electricity reaches the island through an undersea grid connection, reducing reliance on local diesel generators; guests should use both thoughtfully and switch off air conditioning and lights when leaving. Maintenance reports show room-and-Bangkok-timestamp references while retaining internal UUIDs only for protected operations. A discreet token-free **Admin Login** link appears in the normal guest footer; the owner console remains protected by server-side authentication.

Do not regress or replace completed modules.

## Research

Uploaded Deep Research is the authoritative factual source. Do not conduct new research unless explicitly asked. Do not invent missing facts.

## Critical booking rule

All activities and services marked for House-arranged booking must route enquiries through The House's structured AI Concierge. Fah manages the booking route internally, but public pages use **Book with Us** and must not expose a direct booking call or personal WhatsApp shortcut. Guest-facing answers must never discuss internal commercial arrangements, referral terms, revenue or how The House may benefit from a booking.

Never expose direct operator booking actions for those records.

## Critical stay-support rule

Fresh towels, room cleaning, lost keys or lockouts, room supplies and similar requirements related to the guest’s stay route to Su at +66 64 097 3491. Do not send these requests to Fah’s booking number.

The future AI Concierge should fully conduct routine stay-support conversations, with Su retained as the human handoff for operational action or escalation.

General public Contact Us actions and ordinary House-support call actions open the concierge first. The concierge determines the room from the room link or asks the guest to select it. Human handoff appears only when needed. House-arranged booking calls and explicit emergency calls remain direct.

## Current priority override

Do not continue the Explore expansion yet. Prioritize getting the concierge online, feeding it approved accommodation and stay answers, and hardening room-aware support flows. Explore development comes last.

Approved concierge answers live in `public/data/concierge-knowledge.json` and the private owner-approved knowledge overlay. Read `CONCIERGE_KNOWLEDGE_GUIDE.md` and `AI_CONCIERGE_OPERATIONS.md` before editing or operating them. Never allow the model to publish a learned answer without owner approval.

## Lost keys and property emergencies

Housekeeping hours remain Tuesday–Sunday, 10:30–19:30 Bangkok time, but they do not govern lost-key access. One spare-key box is located next to each active room door, and a lost key adds a 500 THB fee. The protected 24/7 lost-key operation revalidates the secure room-bound active-stay session and issues a short-lived, single-use request authorization. The guest explicitly accepts the fee for that request and does not re-enter the stay code. A protected Su-and-owner notification must be accepted before display, and display immediately engages the rotation lock. The existing owner/admin boundary offers two deliberate, audited lock-only resets: a controlled administrative test that truthfully retains an unexposed physical code, and a real physical-rotation confirmation after the key box and encrypted secret have been updated. Never place confirmation codes or key-box codes in public files or audit activity. Follow `SECURE_24_HOUR_LOST_KEY_ACCESS.md`.

Major water leaks, flooding, dangerous electrical problems and serious property damage use a separate property-emergency role intended for 24/7 coverage. A dedicated on-call person and number are not yet confirmed, so do not publicly claim confirmed 24/7 coverage.

The official WhatsApp Business Platform adapter has reviewed action templates active for routine service, booking, luggage, urgent and verified lost-key alerts, plus the established staff-status template. Actionable routine stay and completed luggage requests route to Su plus both owners; complete structured booking requests route to Fah plus both owners; verified lost-key events route to Su plus both owners; and explicitly confirmed serious property incidents route to Fah plus both owners without Su. Guest booking actions start the structured AI Concierge flow and never open Fah’s personal WhatsApp chat. Each active action template uses generic English (`en`) and exactly two quick replies in order: **Received**, then **Resolve**. Signed typed `RECEIVED`, backwards-compatible `ACK`, `RESOLVE` and urgent/critical escalation remain supported. Quick replies use the same signed-webhook authorization, actor exclusion, exact alert-reference validation, idempotency, status fanout and escalation-stop rules. Never map `house_service_alert_actions_v1`; only `house_service_alert_actions_v2` has the required buttons. The established buttonless templates remain the fail-closed rollback path when `WHATSAPP_STAFF_ACTIONS_ENABLED=false`. Automatic spare-key release fails closed unless the official Meta channel accepts at least one protected team notification. Failed Meta submissions retain only sanitized, value-free diagnostics in the protected owner console.

One permanent page exists for each active Room 1–6 and 8–11. Room 7 is inactive. Airbnb reservation data is synchronized with `airbnb-sync/Code.gs`; owners may also create direct/walk-in stays and extend active stays in `/concierge-admin`. All readable confirmation codes are HMAC-hashed before storage. A verified guest must declare whether all overnight guests are Thai or provide the complete number of non-Thai adults and children. Foreign and mixed groups may use a separate single-use form for every required passport or present all original passports to The House in person. The in-person route remains locked until an authorized owner confirms the check and manual registration in `/concierge-admin`; this passport state does not invalidate the already verified active stay for lost-key handling. Lost-key assistance appears as an ordinary room-dashboard or verified-access-page option and opens its guest-friendly protected form only when selected or requested through the AI Concierge. Every new request requires its own 500 THB fee confirmation and hides impossible repeat-release controls while rotation remains outstanding. Read `AIRBNB_AUTOMATION_SETUP.md`, `PASSPORT_DATA_OPERATIONS.md` and `MAINTENANCE_REPORTING_OPERATIONS.md`. Passport and maintenance-image content must never enter the model, learning queue or public assets. The manual-details alternative remains blocked until the authoritative TM30 field list is supplied.

## Development method

Critical current-message intent has explicit precedence over pending ordinary workflows. A new serious water leak, flooding, electrical danger, fire or major property-danger report must interrupt stale luggage, booking, maintenance, routine-service and contact-number state. It must show the deliberate urgent confirmation flow without requiring a contact number. An interrupted ordinary workflow must not resume or submit accidentally. Privacy, Data Protection and Terms navigation must remain available on every page.

Safety actionability is contextual and sentence-level. Figurative, slang and ambiguous language must not create an alert from a single severe keyword. Medical or personal-safety language may immediately show Koh Tao Rescue and 1669 guidance, but a House alert requires the guest to press **Send urgent alert**. Serious property incidents also require explicit confirmation. Model intent labels cannot directly create these protected alerts. The browser permits only one in-flight Concierge request so one guest message produces one coherent response and state transition.

An actionable luggage-storage request must remain pending until arrival/departure context, requested time, bag count and a usable international WhatsApp or telephone number are all available. The final server-side alert-creation boundary independently refuses incomplete data; never rely only on conversational prompting. Each new request starts clean, including one begun immediately after a completed luggage request. Raw contacts are redacted from visible Concierge messages for every request type, remain transient and may be included only in the protected staff-delivery payload; they must not enter browser history, interaction records, alert records, dashboard summaries, learning data or logs. Informational luggage questions do not create alerts. Completed luggage requests route to Su plus both owners.

Room cleaning—including natural dirty-room wording—must collect a preferred time before one service alert is created. A clock preference must be later than the current Bangkok minute when requested for today, fall within 10:30–19:29 on a Tuesday–Sunday operating day and retain any explicit future-date context across turns. Invalid preferences stay pending and create no alert; one valid correction creates one alert. `now` and `ASAP` remain valid immediate requests. The response must say that availability may vary and must not tell the guest to submit the request manually. A successful cleaning or supply request does not expose a routine call shortcut; routine human contact is available only as an in-hours, last-resort Concierge escalation after an AI-first attempt. Direct natural booking intent—including want, would-like, wanna, contraction and take-me/us forms—and **Book with Us** actions must preserve the service category and enter the structured flow; information-only questions must not create alerts. Diving, fishing, snorkeling, taxi/taxi boat, ferry and motorbike taxi collect one missing field at a time, retain every valid field, acknowledge side questions/preferences without promising availability and keep one contact at the end. Diving participant counts may never be zero, exceed the remaining party or complete before everyone is allocated. No booking is confirmed until availability, price, schedule, relevant prerequisites and payment are checked. Ferry workflows must never ask for passport data.

Luggage, cleaning and booking are protected operations. If their server request fails, the browser must state that nothing was sent and preserve only the state needed for a safe retry. A completed booking whose protected delivery failed is `delivery_failed`, not active collection: an unrelated next intent must route normally and must never resend the old request. Only an explicit booking-retry command may use the current verified reservation/room/session-bound durable snapshot. It must reuse the exact alert ID, require prior attempts with zero acceptances and recollect only the transient contact if privacy cleanup removed it. A prior accepted delivery must never be resent. Raw contacts must not enter the snapshot, interaction history, alerts, logs, diagnostics or dashboard. Never replace a protected failure with a local success-like answer. Guest success wording is allowed only when at least one intended WhatsApp delivery was accepted.

Continue from `ROADMAP.md`. Implement the next coherent, unblocked milestone completely, test for regressions, update documentation and versioning, and produce a complete ready-to-push ZIP.

## Next planned milestone

Deploy v5.11.37 without changing `EXPLORE_ENABLED=false`, secrets, recipient groups, webhook settings, the currently active five action-template mappings, `WHATSAPP_STAFF_ACTIONS_ENABLED=true`, passport/Airbnb configuration or `SPARE_KEY_CODES`. Smoke-test the five production regressions first: persistent/direct Su contact including **can I call the housekeeper**; fire → cancel → housekeeper contact plus genuine **there is more smoke now** continuation; **there is a stain on my bed sheet** → **now** with one service alert; and **I wanna learn diving** → **I wanna go with French kiss** plus standalone **can I go with French Kiss Divers?**; then **What is the Wi-Fi password?** with and without prior chat history, requiring the approved numeric password and no **[number removed]** placeholder. Then spot-check the v5.11.36 snorkeling phrases and protected lost-key/emergency/Meta behavior. Do not activate the pending replacement Meta templates until all five are Active and separately authorized. Do not begin another release automatically.

## Media

Do not spend development time sourcing images or logos. Use placeholders until the media pass.

## Release output

Provide:

- ready-to-push ZIP
- version number
- concise change summary
- commit title
- commit description
