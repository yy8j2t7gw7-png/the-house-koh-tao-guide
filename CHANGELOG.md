# Changelog

All notable changes to The House – Koh Tao guest guide are recorded here.

## v5.11.31 — Mobile UX Polish & Wording Consistency

### Mobile floating-control correction

- Replaces the full **✦ Concierge** pill with a compact 58×58 px launcher below 768 px. The button remains House green, keeps visible focus and reduced-motion support, exceeds the 44 px touch target and has the exact accessible name **Open Concierge**.
- Uses `calc(12px + env(safe-area-inset-right))` and `calc(12px + env(safe-area-inset-bottom))` for launcher placement, plus `76px + env(safe-area-inset-bottom)` of page-bottom clearance. Important content can therefore scroll beyond the persistent control without a large empty spacer.
- Removes the body-level fixed language control that could float over cards and photography. The compact language button is now inserted into the existing sticky `.topbar`, beside **Menu**, and opens the unchanged selector inside the navigation menu.

### Mobile Room refinement

- Reduces mobile section spacing, introductory heading rhythm and Room card density while preserving readable type, comfortable touch targets and the desktop/tablet presentation.
- Reduces Room navigation-card vertical padding from 16 px to 13 px (18.75%) and the Room-location hero from 246 px to 208 px (15.45%), retaining the approved Room 11 image and adjusted focal position.
- Corrects the verified copy to **Your stay is verified. Non-Thai overnight guests must also complete the required TM30 guest registration.** The passport-image deletion statement remains a separate paragraph.
- Preserves the stay-help route but prevents the shared action-label runtime from rewriting **Open Concierge** to **Contact Us**.

### Regression and scope

- Adds one lightweight presentation contract for launcher accessibility/size/safe areas, header-bound language access, mobile Room spacing, verified wording, exact root/module mirrors and the CTA label override.
- Expands the complete suite from 178 to 179 tests with zero failures.
- Changes no Concierge intent, contact-hours, lost-key, booking, diving, cleaning, luggage, maintenance, WhatsApp, emergency, passport, stay, Airbnb, admin or alert-lifecycle logic.

## v5.11.30 — Generic Human Context Isolation & Routine Contact Gate

### Confirmed production causes

- Fixes the exact Saturday 08:20 production phrase **I wanna talk to a human**. The v5.11.29 anchored matcher supported `wanna` for calling but not for talking/speaking, so that phrase bypassed deterministic routing and reached transcript-aware model handling, where old lost-key text supplied the wrong topic.
- Removes transcript adjacency as evidence that a lost-key fee workflow is active. The server and browser now retain only explicit, non-authorizing `lost_key/awaiting_fee_acceptance` state; historical conversation text alone cannot change a later neutral human request.
- Fixes closed-hours **Contact Us** exposure. v5.11.29 suppressed `houseCall` unconditionally but suppressed `houseWhatsapp` only when the generic-human matcher succeeded. A missed phrase therefore left the routine WhatsApp handoff visible.

### Routing and action enforcement

- Expands the deterministic current-message matcher to all approved human, staff, team, reception and call variants and evaluates it before pending urgent clarification, approved knowledge and model routing. Current explicit safety and lost-key intent retain their higher-priority policies.
- Treats `houseWhatsapp` and `houseCall` as the same routine House-contact class. Both are removed by the final server action policy outside Tuesday–Sunday 10:30–19:30 Bangkok time, including actions requested by model metadata.
- Independently suppresses both routes during browser action resolution and blocks old or cached links at click time. Emergency routes remain separate.
- Allows a current message that explicitly names both human contact and a lost key to acknowledge the topic while continuing the protected 24/7 flow and obeying human-contact hours. No conversational state accepts the fee, creates an alert, sends a notification or authorizes a spare-key code.

### Regression and scope

- Adds two tests and strengthens existing v5.11.29 matrices for the exact production phrase, stale lost-key/diving/cleaning/luggage/AC/maintenance/medical history, Saturday 08:20, Saturday 15:00, Monday 15:00, explicit pending lost-key state, topic-specific lost-key requests and server/render/click suppression of both routine contact routes.
- Expands the complete suite from 176 to 178 tests with zero failures.
- Preserves the verified Room 11 menu, registration-state separation, passport reminder behavior, approved visuals, all bookings and WhatsApp behavior, emergency routing and every protected 24/7 lost-key security boundary.

## v5.11.29 — Verified-State Consistency & Human Handoff Routing

### Authoritative stay and registration state

- Separates verified active-stay authorization from passport/registration completion in both the stay-status API and Concierge UI.
- Derives the displayed room, verified quick menu and registration reminder from the same protected `/api/stay/status` session response. A verified guest with incomplete registration keeps the normal room menu and sees a non-blocking **Registration incomplete** reminder instead of **Complete guest access**.
- Refreshes that authoritative state after verification, Concierge reopen, page restoration and ordinary navigation without adding unsafe client-side authorization persistence. Thai-exempt and registration-complete stays show the verified menu without an incorrect passport reminder.

### Deterministic human contact and hard call gate

- Routes topic-neutral human/contact phrases from the current message before history-aware knowledge or model handling, preventing completed or inactive lost-key, booking, cleaning, maintenance, luggage and medical context from contaminating the answer.
- Applies routine House contact hours deterministically in Bangkok time: Tuesday–Sunday, 10:30–19:30; Monday closed. Open-hours requests receive the established safe contact actions, while closed-hours requests keep Concierge help and the separate **Emergency help** route without a routine **Call Us** action.
- Suppresses routine `houseCall` at the final server action boundary even when earlier/model metadata requests it. The browser repeats the time check while rendering and blocks stale/cached routine call links on click, so an after-hours generic request cannot call Su.
- Allows an immediately active lost-key fee prompt to be acknowledged without accepting the fee, creating an alert or exposing a code. Historical lost-key context is ignored, and the existing protected 24/7 lost-key flow remains independent of routine service hours.

### Regression and scope

- Adds seven regressions covering the verified/registration state matrix, Room-header/menu refresh consistency, 12 generic contact phrases, deterministic Saturday/Monday hours, stale-topic isolation, active lost-key handling and server/browser call-action enforcement.
- Expands the complete suite from 169 to 176 tests with zero failures.
- Preserves the approved v5.11.28 visual system and every booking, mixed-diver, Meta, retry, property, cleaning, luggage, emergency, passport, maintenance, diagnostics, Airbnb and lost-key security boundary.

## v5.11.28 — Visual Hierarchy, Wording & Lost-Key Intent Consistency

### Public guest refinement

- Keeps the compact landing hero and adds restrained House-green tonal depth because no existing image is both property-relevant and public-safe.
- Changes the registration hierarchy to **Complete your guest registration**, retains all legal/privacy detail, flattens its three facts and adds a concise four-step access sequence.
- Replaces the misleading “after the stay … complete” sentence with wording tied to verified stay status and completed required registration.
- Makes Room, Concierge and Google Maps actions describe their destinations, removes the repeated room number from the room-photo overlay and reduces nested card treatment around operational guidance.
- Tightens the approved toilet and island resource wording and replaces every public “budget-friendly” footer with **The House – Koh Tao · Simple, comfortable accommodation in Mae Haad.**

### Narrow production correction

- Recognizes bare **lost key** and the approved lost-key, forgotten-key and lockout variants before generic Concierge/service/model routing in both the protected client boundary and the server policy router.
- A repeated synonym while fee consent is pending remains in the same protected flow and creates no alert. Unverified guests still require verification; explicit current-request fee acceptance, accepted team notification, protected-page-only display and rotation lock are unchanged.

### Regression and scope

- Adds two lost-key intent regressions and one lightweight landing/room hierarchy contract, expanding the complete suite from 166 to 169 tests.
- Changes no booking, diving, Meta template, recipient, cleaning, maintenance, emergency, passport, Airbnb, admin lifecycle or spare-key authorization behavior beyond the explicitly authorized intent-precedence correction.
- Keeps `EXPLORE_ENABLED=false` and `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.

## v5.11.27 — Full Visual Polish

### Shared guest visual system

- Establishes one restrained House design system for semantic color, typography, content width, spacing, cards, buttons, focus treatment and reduced motion while preserving the cream, House-green and existing brand identity.
- Reduces room and House hero height by approximately 25–35% depending on breakpoint, constrains readable text measure and prevents horizontal page overflow at guest-phone widths.
- Polishes the established navigation and language controls and marks the current page accessibly without changing the navigation structure or exposing Explore.
- Reorganizes registration and passport requirements into concise scan-friendly facts while preserving every foreign-guest, Thai-exemption, secure-handling and in-person-verification rule.

### Concierge, lost key and owner operations

- Improves the existing Concierge panel with clearer message hierarchy, readable long answers, two-column quick actions, wrapping long course choices, aligned input controls and a touch-friendly mobile sheet. The animated-dot-only thinking state remains unchanged.
- Shows the `500 THB` replacement fee once in the lost-key consent context, followed by an explicit understanding checkbox and **Request spare key** action. Every active-stay, request-binding, notification, protected-display and rotation-lock gate remains intact.
- Gives owner sections, alert cards, maintenance states and delivery diagnostics a compact operational hierarchy with labels in addition to color, structured provider fields and stacked narrow-screen tables.

### Regression and scope

- Adds three practical visual-contract tests for shared responsive constraints, registration/lost-key scanability and owner lifecycle/diagnostic presentation, expanding the complete suite from 163 to 166 passing tests.
- Changes no booking, diving, alert, cleaning, property, passport, Airbnb, lost-key authorization, maintenance or diagnostic lifecycle behavior. Production Meta mappings, recipients, secrets and `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remain unchanged.
- Keeps the v5.11.26 RAID safety/buoyancy-control recommendation and preferred Roctopus guidance intact.

## v5.11.26 — Diving Course Model, Mixed Parties & Owner Cleanup

### Data-driven diving collection

- Replaces the old Fun Diving/Open Water/Advanced/Other mixture with a first-level activity choice: Fun Diving, Try Diving, Learn/Take a Course, Professional Training or Not Sure.
- Adds `public/data/diving-courses.json` and `src/diving-catalog.js` for current PADI, SSI and RAID beginner, continuing, specialty and professional pathways, prerequisites, aliases and agency-specific nomenclature.
- Supports direct natural choices such as PADI Advanced, SSI Rescue, IDC, ITC and IDP while keeping RAID “advanced” ambiguous between Explorer 30 and Advanced 35.
- Always recommends RAID because of its focus on dive safety and buoyancy control together with Roctopus Dive as The House’s preferred RAID centre. Explicit PADI/SSI requests are retained and routed for an appropriate-provider check without implying that Roctopus issues those certifications.

### Mixed-diver booking state

- Adds one authoritative booking with exact-count participant groups for parties doing different activities, agencies or courses. Zero counts, over-allocation and completion with unassigned guests fail closed.
- Asks certification only where useful, accepts compact Fun Diving level text, collects one international contact last and creates one `booking_with_owners` alert.
- Retains the complete non-sensitive subgroup breakdown in alert and retry detail storage while sending a concise Meta-safe summary through the unchanged six ordered `house_booking_alert_v2` BODY parameters.

### Owner cleanup controls

- Adds maintenance **Resolve** and resolved-only **Remove** operations. Report removal deletes any remaining protected photo object first and leaves unrelated reports untouched.
- Adds WhatsApp diagnostic **Dismiss** and resolved-alert **Clear diagnostics** operations without changing parent alert status or accepted/failed delivery evidence.
- Uses deliberate custom-dialog confirmation and minimal contact-free, code-free admin audit rows.

### Regression and scope

- Adds six end-to-end test cases covering the exact course catalog, seven single-diver paths, a three-group booking, a four-person split with allocation rejection, maintenance/photo lifecycle and diagnostic visibility separation.
- Expands the complete suite from 157 to 163 tests with zero failures.
- Preserves v5.11.25 Meta whitespace normalization, all production template schemas/routes, explicit same-alert retry, transient contact handling and 24/7 lost-key safeguards.
- Defers full public visual polish to v5.11.27.

## v5.11.25 — Meta Template Parameter Sanitization Hotfix

### Confirmed production cause and centralized correction

- Records the confirmed production provider failure as Meta HTTP `400`, error `132018`: textual template parameters contained forbidden newline/tab characters or excessive consecutive spaces.
- Normalizes every textual outbound BODY parameter in the shared `textParameters()` serialization boundary in `src/whatsapp-alerts.js` by converting every Unicode whitespace run to one ordinary space, trimming and then applying the existing 900-character limit.
- Covers service, luggage, booking, urgent, lost-key, status and any future enabled action-template BODY values through the same path. Template names, languages, BODY counts/order, routes, recipients and Meta configuration remain unchanged.
- Classifies `132018` as a sanitized `template_parameters` diagnostic without retaining or logging parameter values.

### Regression and scope

- Adds the production-style multiline Open Water booking fixture and proves the six ordered BODY parameters remain semantically intact and Meta-safe.
- Proves the same sanitizer protects service, status and future action-template BODY values, including tabs and long whitespace runs, while keeping contact and diagnostic privacy boundaries intact.
- Expands the complete suite from 155 to 157 tests with zero failures.
- Defers the full public visual-polish milestone to v5.11.26.

## v5.11.24 — Booking Retry & Delivery-State Correction

### Bound deterministic retry

- Moves explicit booking retry recognition ahead of knowledge retrieval, broad transcript context, model routing, generic booking information and progressive collection.
- Adds durable contact-free booking retry snapshots bound by a one-way hash to the verified reservation, room and protected browser session. Snapshots expire with the verified stay/session boundary.
- Reuses the exact failed alert ID when delivery attempts exist and accepted deliveries remain zero. An accepted alert is never resent, and ambiguous failed categories produce one concise choice instead of a guess.
- Preserves activity, date, party size, course/product, relevant certification, preferred provider and sanitized notes. After a reload, only the transient international reply contact is requested again.
- Keeps raw contacts out of interactions, snapshots, alerts, dashboards, diagnostics, logs and release files. The contact exists only in the protected request and outbound template payload.
- Keeps unrelated bar, check-out and property intents in normal routing after failure, with no automatic retry or repeated failure response.

### Delivery evidence and provider normalization

- Adds alert-bound owner diagnostics for failed booking delivery: WhatsApp/Meta channel, route, template, language, real attempted/accepted totals, HTTP status, actual safe provider code/category/message and Bangkok timestamp.
- Confirms the runtime booking mapping remains `house_booking_alert_v2`, language `en`, six ordered BODY parameters and `booking_with_owners`. No deterministic source-side mismatch or unobserved Meta error is invented; production diagnostics now capture the actual rejection.
- Normalizes conversational preferences such as **or with Master Divers would be even better** to **Master Divers** while preserving the no-availability-promise rule.

### Scope and validation

- Preserves every passed v5.11.23 date, side-question, certification, Open Water, property, cleaning, urgent-console and 24/7 lost-key behavior.
- Changes no Meta mapping, recipient, secret, webhook, emergency route, passport/Airbnb rule or quick-action state. `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remains required.
- Expands the complete suite from 148 to 155 tests. The visual milestone was subsequently moved to v5.11.26 after the narrow v5.11.25 Meta parameter hotfix.

## v5.11.23 — Production Conversation & State Corrections

### Booking conversation and validation

- Stops the active collector from treating every guest message as the currently missing field. Side questions, alternative providers, luggage, bicycle and child notes are acknowledged, retained in the same authoritative request and followed by the next missing question without a third-party availability promise.
- Adds one shared Bangkok-aware date parser for dotted, slashed, dashed, named and relative dates. Past and unparseable values now produce concise reasons and remain pending instead of silently repeating the question.
- Keeps common European `DD.MM.YYYY` input out of contact redaction while retaining the existing raw-contact protections.
- Replaces the four-value diving certification regex with sanitized free text and common alias normalization for Open Water, Advanced, Rescue, Divemaster, instructor and agency-qualified equivalents.
- Adds concise invalid-field explanations for dates, party counts, pickup time, route fields, finite options, course, certification, trip direction and contact.
- Proves that Open Water is complete with date, divers, course selection and an international contact; it never inherits the Fun Diving certification requirement. A rejected local contact leaves the same request intact and a corrected international contact replaces it.
- Corrects the protected-delivery retry state: an alert with failed attempts and zero accepted notifications is retried under the same alert ID, while an already accepted duplicate returns success without another send. Guest success still requires at least one provider message ID.
- Separates `delivery_failed` from active booking collection. Unrelated bar, checkout, Wi-Fi, property and other new intents route normally and never trigger a silent resend; only an explicit retry phrase may reuse the safe completed snapshot and transient contact.

### Property, owner safety and lost-key reset

- Corrects the property accumulator so prior notes are carried only for the same issue category or an odor clarification. Category changes start a clean detail buffer.
- Includes clean issue content in property deduplication, so an exact reload repeat stays deduplicated while a later distinct same-category issue can create its own clean alert.
- Keeps unresolved urgent/critical owner-console sections open after manual mouse or keyboard toggles as well as **Collapse all**, with synchronized `aria-expanded`, `aria-disabled` and a prominent stays-open badge.
- Adds two protected lost-key rotation-lock reset modes: **Controlled admin test — keep existing code** and **Physical key-box code rotated**. Each requires an exact typed confirmation and creates a truthful code-free activity event.
- Leaves every historical request marker intact after either reset, so the next release still requires a new request, fresh fee acceptance and new protected notification.

### Scope and validation

- Preserves the production-passed cleaning sequence, seven-category progressive structure, property classifiers, urgent confirmation boundary and 24/7 guest lost-key release.
- Changes no Meta template mapping, recipient, secret, webhook, emergency route, passport/Airbnb rule or public visual design. `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remains required.
- Expands the complete regression suite from 140 to 148 tests. The visual milestone was subsequently moved to v5.11.25 after the narrow v5.11.24 production correction.

## v5.11.22 — Progressive Booking, Property Intelligence & 24/7 Lost-Key Recovery

### Progressive booking

- Replaces multi-field collection responses with a reusable one-question-at-a-time state machine for diving, fishing, snorkeling, taxi, taxi/longtail boat, ferry and motorbike taxi.
- Preserves valid details already supplied, presents buttons for finite choices, accepts compact guest-count replies only inside the relevant protected workflow and asks for an international reply contact last.
- Keeps direct natural booking intent and each category's **Book with Us** action in the same state while information and recommendation questions remain non-actionable.
- Retains Roctopus as the preferred diving recommendation, the conditional diving certification/course gates, Fah-plus-owner routing and the rule that no booking is confirmed before availability and payment.

### Property intelligence

- Adds deterministic recognition for pests/animals, odors, plumbing, equipment/appliances/Wi-Fi, fixtures/furniture, mold/damp and general room condition.
- Routes routine reports once to Su plus both owners and deduplicates same-session, same-room, same-category detail follow-ups.
- Asks one clarification for ambiguous odors, keeps dirty-room/bathroom/sheet/disinfection wording in the cleaning workflow and leaves genuine information questions non-actionable.
- Preserves the explicit urgent-confirmation boundary for fire, dangerous electrical conditions, major leaks/flooding and other serious property hazards; classification alone never sends an alert.

### Secure 24/7 lost-key recovery

- Supersedes the office-hours/after-hours lost-key split. A verified active guest may use the protected self-service flow at 16:00, 23:00 or any other time; normal-hours personal assistance is additive and never a prerequisite.
- Corrects the inconsistent old workflow in which the daytime Concierge branch could create a generic lost-key alert while the fixed Meta template claimed both after-hours access and accepted fee even though the guest had neither accepted the fee nor received a code action.
- Starts every new request with `feeAccepted=false` and requires explicit acceptance bound to the current verified stay, room, protected session and short-lived lost-key request instance.
- Requires at least one accepted Su-or-owner notification before the protected page can display the code. The code remains excluded from Concierge history, WhatsApp/Meta payloads, alerts, logs, diagnostics, source, screenshots and release files.
- Stores a one-way used-request marker so an accepted request cannot be replayed, even after staff rotate the physical code and clear the room lock.
- Immediately marks the room as requiring rotation after display and blocks another release until the physical code, encrypted `SPARE_KEY_CODES` secret and authorized admin reset are all completed.

### Owner operations and regression protection

- Makes Active/upcoming stays, alerts, maintenance, passport registration, learning queue, approved knowledge and recent activity independently collapsible with counts, persisted authorized-browser state and accessible 52-pixel controls.
- Keeps sections containing unresolved urgent or critical work open and visible, and makes the physical key-box rotation requirement explicit.
- Leaves production Meta template names, languages, component shapes, recipients, secrets, webhook behavior, `WHATSAPP_STAFF_ACTIONS_ENABLED=false`, emergency routing, passport rules and Airbnb synchronization unchanged.
- Expands the complete regression suite from 129 to 140 tests, including all seven progressive bookings, routine and urgent property cases, 16:00/23:00 lost-key parity, missing/cancelled/stale/cross-room/expired/failed-notification/replay cases, rotation reset and admin collapse semantics.


## v5.11.21 — Cleaning-Time, Natural Booking & Lost-Key Copy Corrections

### Production fixes

- Validates a cleaning clock preference against the Bangkok date and current time before submission. Past same-day times, times outside 10:30–19:29 and Monday dates remain in the cleaning workflow with the correct next operating-day guidance; a valid correction creates exactly one alert.
- Preserves explicit future cleaning dates across turns, so a future 2:00 PM preference is evaluated on its requested date instead of being rejected because 2:00 PM has already passed today. `now` and `ASAP` retain their existing immediate-request behavior.
- Corrects the direct activity grammar so natural requests including **I wanna go fishing**, **I would like to go fishing**, **I’d like to book fishing** and **Take us snorkeling** enter the same protected structured flow as **Book with Us**. Information-only questions still create no alert.
- Replaces guest-visible lost-key implementation language with natural assistance wording. A successful verified office-hours request now says: “Thank you. I’ve notified The House team about your lost key. Someone from the team will assist you as soon as possible.”

### Scope and regression protection

- Preserves every v5.11.20 lost-key security gate, delivery route and no-code-leak invariant; only the guest-facing copy changed.
- Changes no visual layout, active Meta template, production variable, secret, recipient, webhook, emergency route, passport rule or Airbnb synchronization behavior.
- Keeps `WHATSAPP_STAFF_ACTIONS_ENABLED=false`; the buttonless service action v1 remains invalid and the intended future service template remains `house_service_alert_actions_v2`.
- Expands the complete regression suite from 126 to 129 tests, including Bangkok past-time correction, future-date retention, exact opening/closing/Monday boundaries, natural fishing/snorkeling grammar, informational booking separation and guest-copy leak checks.

## v5.11.20 — Cleaning, Booking Entry & Lost-Key Verification Fixes

### Production fixes

- Recognizes natural room-condition wording as an actionable cleaning request, asks only for a missing preferred time and creates one protected service alert with that time once complete. The guest is no longer instructed to submit the same request manually.
- Starts structured fishing and snorkeling collection from direct first-person intent as well as the category-specific **Book with Us** action. Existing supplied fields remain in the active workflow; recommendation-only questions still create no alert.
- Decouples active-stay verification from passport completion for lost-key assistance. An unverified request cannot alert or expose a code; a verified office-hours request creates only a dedicated lost-key alert; a verified after-hours request enters the protected fee-and-code flow.
- Lets a verified guest reach the protected lost-key controls from the access page even while passport registration is pending, without revealing the private room guide.
- Removes the passport-completion gate from the spare-key endpoint while retaining the verified room-bound session, active-stay, after-hours, fee, accepted-team-notification and rotation-lock gates.

### Security and regression protection

- Adds an independent room-verification check at the final lost-key WhatsApp boundary and prevents browser-only fallback for cleaning, direct booking and lost-key operations.
- Rejects `house_service_alert_actions_v1`, which exists in Meta without the required buttons, and permits only the intended `house_service_alert_actions_v2` schema when the all-template quick-action gate is eventually enabled.
- Leaves `WHATSAPP_STAFF_ACTIONS_ENABLED` off by default and changes no production template mapping, secret, recipient, webhook, emergency route, passport-retention rule or Airbnb synchronization behavior.
- Expands the complete regression suite from 122 to 126 tests, including real verified-stay sessions, passport-pending stays, office/after-hours lost-key paths, cross-session/stay/room isolation, exact natural-language cleaning and booking paths, delivery payloads and leak checks.

## v5.11.19 — Protected Operations, Scheduling & Structured Bookings

### Production fixes

- Stops luggage, room-cleaning and booking requests from silently falling back to the device-only answer engine after a protected API failure. The guest now receives explicit no-send wording and the browser retains the pending workflow for retry.
- Preserves arrival/departure date, requested time, bag count and sanitized luggage notes through local-contact rejection, then independently validates the corrected request at the final alert boundary.
- Makes routine housekeeping availability weekday-aware in Bangkok: Tuesday–Sunday from 10:30 through 19:29, Monday closed, with the correct next opening for Sunday evening and all Monday requests.
- Collects a preferred cleaning time before submission, accepts clock times, `now` and `ASAP`, and never represents that preference as a confirmed schedule.
- Keeps the routine **Call Us** fallback available only during open housekeeping hours; urgent and emergency actions remain independent.

### Booking workflows

- Adds separate information-only and actionable flows for fishing, snorkeling, taxi, taxi/longtail boat, ferry and motorbike taxi requests.
- Collects each category’s required date, party, route, time, trip-style and international-contact fields, preserving valid state across turns and rejecting local-format contacts without losing prior details.
- Routes complete non-diving bookings to Fah plus both owners, creates no alert for recommendation-only questions and repeats the availability-and-payment confirmation boundary in guest-facing wording.
- Makes **Book with Us** actions category-specific and continues to keep raw reply contacts transient and visibly redacted.

### Staff quick actions and regression protection

- Adds code-ready, opt-in schemas for five new generic-English Utility templates with **Received** and **Resolve** quick replies. The feature defaults off and requires every exact action-template mapping before it can activate.
- Accepts signed Meta quick-reply payloads through the same authorization, actor-exclusion, idempotency, status-fanout and escalation-stop rules as typed `RECEIVED`, `ACK` and `RESOLVE` commands.
- Leaves all current production template mappings, languages, BODY shapes, recipient groups and secrets unchanged until the new templates are approved and explicitly enabled.
- Expands the complete regression suite from 111 to 122 tests, including the reported luggage scenario, exact housekeeping boundaries, every added booking category, protected browser failure behavior and quick-action lifecycle.

## v5.11.18 — Workflow State, Routine Service & Urgent Clarification

### Production fixes

- Replaced fragile luggage-state reconstruction with explicit, validated, contact-free state carried only while the browser workflow is collecting required fields.
- Keeps arrival/departure, requested time, bag count and sanitized notes through a local-number rejection, then attaches the corrected international contact only to the protected delivery and clears state after submission.
- Gives deterministic towels, soap, toilet-paper and room-cleaning requests priority over older luggage or booking collection so verified rooms never receive an unnecessary phone-number prompt.
- Adds natural office-hours and after-hours housekeeping responses while preserving immediate service-alert creation and Su-plus-owner routing.
- Adds a high-priority urgent-clarification state for generic emergency wording and requires a meaningful incident description before exposing or accepting an urgent send action.
- Reclassifies clarification follow-ups by their actual content, so flooding and medical incidents enter their safety flows while toilet paper and ordinary defects return to routine support.

### Compatibility and security

- Keeps all six current template mappings on `en`, every v1 rollback mapping on `en_US`, and preserves approved BODY counts and parameter order.
- Changes no Meta template, WABA, app, phone-number ID, webhook, recipient mapping, Cloudflare variable or secret.
- Preserves immediate visible contact redaction and keeps guest contacts out of ordinary history, interaction records, alerts, delivery metadata, dashboards and logs.

### Regression protection

- Adds exact multi-turn luggage correction, clean subsequent request, stale-workflow housekeeping, after-hours service, vague-to-flooding, vague-to-medical, vague-to-routine, direct-fire, urgent-precedence and quality-gate coverage.
- Revalidates the complete source and independently extracted release suite before handoff.

## v5.11.17 — Meta Template Language Resolution & Admin Footer Access

### Production fix

- Identified the exact v5.11.16 production failure: Meta returned HTTP 404, code `132001`, because `house_service_alert_v3` exists in generic English (`en`) while the Worker requested English (US) (`en_US`).
- Added an immutable language code to every approved template schema and made payload construction resolve language from the selected template.
- Sends `house_service_alert_v3`, `house_luggage_alert_v2`, `house_booking_alert_v2`, `house_urgent_alert_v2`, `house_lost_key_alert_v3` and `house_alert_status_v1` with `en`.
- Preserves `en_US` for the five mapped v1 rollback templates and keeps the deployment’s global language variable only as a compatibility fallback for configuration reporting.

### Compatibility and security

- Leaves all template names, BODY-only components, parameter counts/order, recipient routing, acknowledgement behavior and Meta/Cloudflare secret mappings unchanged.
- Retains sanitized provider diagnostics and every fail-closed lost-key, urgent-confirmation, contact-redaction, luggage, booking and verified-stay boundary.
- Restores a discreet **Admin Login** footer link on guest-facing and legal pages without placing any token or credential in the URL; the owner console remains server-authenticated.

### Regression protection

- Expands the complete suite from 100 to 103 tests, including the exact Room 11 service-v3 language/shape regression, all six current template languages, every v1 rollback language and guest-page admin-footer coverage.
- Revalidates the complete source and packaged release independently before handoff.

## v5.11.16 — Safe Meta Delivery Diagnostics

### Production evidence

- Preserves Meta Graph API rejection details that v5.11.15 previously discarded after extracting only a numeric error code.
- Records the exact selected template name, configured language, value-free component/parameter structure, HTTP status, safe Meta error code, subcode, type, message, details and trace ID.
- Makes the retained numeric code from v5.11.15 delivery failures visible in the protected owner console even when the older request has no structured diagnostic record.
- Classifies failures as configuration, local schema, authentication/permission, template/language, template parameters, recipient delivery, rate limit, Meta service, network or unknown without treating a category as a final root cause.

### Security and compatibility

- Redacts template values, guest contacts, recipient numbers and credential-like text before any provider detail is stored or logged.
- Keeps the existing six active template names, `en_US`, body-only component construction, exact parameter counts/order, recipient routing and fail-closed delivery behavior unchanged.
- Uses one common inspected submission function for service, luggage, booking, urgent, lost-key and status sends.
- Adds protected owner-console diagnostics with a 30-day retention window and no public endpoint.

### Regression protection

- Expands the complete suite from 98 to 100 tests, covering every active template's value-free production request shape, sanitized structured Meta errors, network failures, legacy failure visibility and truthful service failure behavior.
- This diagnostic release intentionally makes no speculative payload or Meta configuration change. A final corrective patch follows only after production evidence identifies the provider rejection.

## v5.11.15 — Active Meta Templates, Staff Status Updates & Concierge UX

### Meta template integration

- Added one schema-controlled payload layer for `house_service_alert_v3`, `house_luggage_alert_v2`, `house_booking_alert_v2`, `house_urgent_alert_v2`, `house_lost_key_alert_v3` and `house_alert_status_v1`.
- Enforced exact body-only parameter counts and ordering, including protected reply contacts inside luggage/booking notes where required and useful human-readable request labels for service and status messages.
- Kept the legacy v1 schemas as an intentional rollback path while making all six active production templates the repository defaults.
- Unknown template names, wrong template purposes and parameter-count mismatches now fail closed before any Meta request is made.
- A Meta submission counts as accepted only after both a successful HTTP response and a returned provider message ID; sanitized failure records contain no recipient number, protected contact or secret.

### Staff alert lifecycle

- Authorized `RECEIVED`, `ACK` and `RESOLVE` replies now send one `house_alert_status_v1` update to the other recipients assigned to that alert.
- Excludes the actor and unrelated recipient roles, rejects unassigned senders and invented references, and uses existing alert state to suppress duplicate webhook status messages.
- Status messages do not create operational alerts, do not recurse and do not enter escalation; acknowledgement continues to stop applicable escalation.

### Guest experience and lost-key safety

- Increased the desktop Concierge height to about 85% of the viewport, kept the composer accessible and compacted common questions once conversation begins without changing mobile behavior.
- Replaced dense lost-key copy with concise hospitality wording in the Concierge, protected fee screen and successful release state; the fallback call label is now **Call Us**.
- Preserved the verified active-stay gate, 19:30–10:30 Bangkok window, explicit 500 THB acceptance, successful protected-notification requirement, secret exclusion, rotation lock and second-release block.

### Regression protection

- Expanded the complete suite from 91 to 98 tests, including every active and rollback template schema, delivery failures, staff status distribution and idempotency, desktop/mobile layout and revised lost-key wording.
- Preserved all existing housekeeping, emergency, booking, registration, translation, privacy and operational tests.

## v5.11.14 — Guest-Natural Safety, Service Hours & Structured Diving

### Guest experience and safety

- Replaced system/classifier-style replies and cancellation wording with natural hospitality language while retaining the underlying no-alert decisions.
- Added concise fire evacuation guidance, the configured Koh Tao Rescue action and the location/safe-use conditions for the outside fire extinguisher on each floor.
- Prevented answers from claiming Rescue details are unavailable whenever the configured Rescue action is present.
- Added a dynamic **Find My Room** answer with the verified room location and direct **Your Room** action.

### Housekeeping and service operations

- Added deterministic requests for toilet paper, soap, fresh/clean towels and room cleaning.
- During 10:30–19:30 Bangkok service hours, creates the routine alert immediately, confirms naturally and provides a 30-minute **Call Us** fallback.
- After hours, still creates the alert immediately, explains that housekeeping is off duty and confirms next-morning handling after 10:30 without a 30-minute promise.
- Added the service-hours policy to Guest Information and a compact reminder in the Concierge.

### Structured bookings and privacy

- Replaced personal Fah WhatsApp booking actions with an in-Concierge booking prompt; any remaining call action uses the general House contact.
- Added a fresh-state diving workflow for preferred date, diver count, Fun/Open/Advanced/other course, conditional certification/course detail and international reply contact.
- Keeps recommendation-only diving questions informational and sends exactly one protected booking alert to Fah plus both owners only after every required field is present.
- Added a final server-side structured-diving validation boundary and keeps raw reply contacts out of normal chat history, interaction records, alerts and logs.
- Clarifies that availability may be checked first but a booking is not confirmed until payment is received.

### Regression protection

- Expanded the complete suite from 79 to 91 tests, covering Bangkok time boundaries, routine routing, fire/Rescue behavior, natural wording, room links, booking variants, fresh booking state, contact privacy and final submission gates.
- Kept Meta template names, template parameters, recipient secrets and production configuration unchanged.

## v5.11.13 — Contextual Alert Safety & Lost-Key Guest UX

### Safety and workflow control

- Replaced isolated-keyword alert decisions with contextual, sentence-level classification for medical, personal-safety and critical-property messages.
- Prevented figurative, slang and ambiguous phrases such as “I am dying for love”, “bloody hell” and “I am burning inside” from creating protected alerts.
- Kept immediate medical guidance and direct Koh Tao Rescue/1669 actions available while requiring the guest to press **Send urgent alert** before a House alert can be created.
- Kept serious property incidents behind the existing explicit urgent-confirmation step and blocked model intent labels from directly crossing the alert-creation boundary.
- Added a browser in-flight guard so one submitted message cannot create overlapping Concierge responses or duplicate state transitions.

### Guest experience

- Replaced internal lost-key terminology with a concise verified-guest flow, one explicit 500 THB fee checkbox and a clear **Request spare key** action.
- Hides impossible repeat-release controls after a code has already been released or rotation is required, and shows a direct Concierge contact action instead.
- Clarifies local Thai telephone entry by accepting an international country code such as `+66`.
- Added reviewed translations for the new urgent-confirmation, contact-number and lost-key interface strings in all seven supported languages.

### Regression protection

- Added tests for figurative-language false positives, confirmation-only medical/property alerts, one-response browser behavior, local-number guidance and model-mislabelling at the final alert boundary.
- Preserved the complete v5.11.12 luggage required-field gate, universal contact redaction, critical-intent precedence, protected routing and fail-closed lost-key security.
- Made no Meta template, recipient-secret or production configuration changes.

## v5.11.12 — Luggage Submission Boundary & Universal Contact Redaction

### Fixed

- Enforced the four required luggage fields at the final server-side alert-creation boundary, independent of conversational prompting or model output.
- Prevented a second vague luggage request from submitting after a previously completed request in the same Concierge session.
- Passed validated structured luggage data into the protected WhatsApp template and eliminated new luggage alerts containing `Not provided` operational fields.
- Kept each new luggage request isolated until its own arrival/departure context, requested time, bag count and international reply contact are supplied.

### Privacy

- Redacts phone and WhatsApp numbers immediately in every visible guest message, for every request type, while the original value is used only transiently by the protected server request.
- Continues excluding raw contacts from ordinary browser history, AI context, interaction records, alerts, dashboards, learning data and application logs.

## v5.11.11 — Complete Luggage Request Validation

### Fixed

- Added deterministic detection for actionable luggage language such as “I wanna store my luggage” so it cannot bypass operational field collection through a model-generated handoff.
- Prevented luggage alerts from being created until arrival/departure context, requested time, bag count and a usable international WhatsApp or telephone number are all available.
- Bound multi-turn answers and transient contact data to the active luggage workflow while keeping informational luggage questions non-actionable.
- Preserved critical-property precedence so a flooding, serious leak, dangerous electrical or similar message interrupts and clears the pending luggage workflow immediately.

### Privacy and delivery

- Keeps reply contact data only in transient memory and the protected staff-delivery payload; browser session history now redacts phone-like values before storage.
- Keeps raw reply numbers out of Concierge interaction records, alert records, dashboard summaries, learning data and application logs.
- Preserves protected delivery to Su plus both owners only after every required luggage field is complete.

## v5.11.10 — Critical-Intent Precedence & Sitewide Legal Navigation

### Fixed

- Re-evaluated every new guest message for critical property danger before consuming it as a continuation of a pending lower-priority workflow.
- Prevented stale luggage, booking, maintenance and routine-service contact prompts from swallowing flooding, serious water-leak, electrical-danger, fire or major-property-damage reports.
- Bound a supplied contact number only to the immediately pending operational request and prevented an interrupted request from being submitted later.
- Preserved deliberate **Send urgent alert** confirmation, no-alert cancellation and recipient routing to Fah plus both owners without Su.

### Guest interface

- Added Privacy, Data Protection and Terms links to every guest page through the shared page runtime.
- Added the same legal navigation directly to the private owner console and retained static links on the homepage and legal pages.
- Added reviewed labels for the seven supported guest languages and regression coverage for every HTML page.

## v5.11.9 — Production Contact, Date and Alert-Status Hardening

### Fixed

- Corrected the House emergency-call action to resolve West / Owner 2 from the protected owner recipient configuration instead of falling back to Su.
- Added mandatory contact collection before actionable booking, luggage and routine maintenance submission; urgent incidents, routine towel/cleaning requests and lost-key access retain their required exceptions.
- Kept supplied contact numbers out of interaction and alert storage and added them only to transient protected staff-delivery payloads.
- Normalized relative booking dates into actual Bangkok-local dates and preserved date-only requests without inventing a time.
- Improved routine-service template labels, including **Fresh towels** and **Room cleaning**.

### WhatsApp readiness

- Preserved production v1 template defaults while adding compatibility for the reviewed service v3, luggage v2, booking v2, urgent v2 and lost-key v3 templates through the existing Cloudflare variables.
- Added optional `WHATSAPP_STATUS_TEMPLATE_NAME` support for non-recursive acknowledgement/resolution updates to other assigned recipients only.
- Duplicate inbound webhook deliveries do not repeat status notifications; unauthorized senders and invalid references remain harmless.
- Added regression coverage for emergency-call separation, contact privacy and blocking, Bangkok date normalization and status-recipient exclusion.

## v5.11.8 — Secure Spare-Key CTA Wiring Fix

### Fixed

- Fixed the AI Concierge **Secure spare-key access** CTA doing nothing when selected from an already-open verified Room page.
- Preserved the `spare-key` action type when the server action is rendered so the browser can distinguish it from an ordinary human-handoff link.
- Added explicit handling that closes the Concierge, navigates to the protected room section and dispatches the lost-key opening transition on the same room page.
- Added hash-change and dedicated event listeners to open the protected fee flow even when the room page does not reload.
- Wired the optional Concierge quick-action CTA through the same protected path.

### Security and validation

- Fee acceptance remains explicit and the protected alert is sent only after acceptance.
- No accepted WhatsApp submission means no key-box code release.
- Verified active stay, room binding, after-hours timing and rotation lock remain mandatory.
- Lost-key alerts remain excluded from generic urgent escalation.
- Added a rendered-path regression test covering the Concierge CTA, browser transition and protected fee UI.

## v5.11.7 — Operational Alert Routing & Confirmed Emergency Actions

### Changed

- Every actionable routine, luggage and maintenance request now reaches Su and both owners; booking requests reach Fah and both owners; urgent property incidents reach both owners and Fah.
- Serious property messages now present explicit **Send urgent alert** and **Cancel** actions. No protected alert is created until the guest confirms.
- Successful automated requests now tell the guest that The House team was notified and do not require a duplicate WhatsApp message.
- After-hours lost-key access now uses the existing verified room session and a two-step 500 THB fee acceptance instead of asking for the Airbnb code again.
- Lost-key notification remains fail closed and separate from generic urgent escalation.
- Generic unacknowledged urgent alerts now use an escalation-specific message and fall back to the owner group when no dedicated future responder is configured.
- Dashboard headings now distinguish operational alerts from guest maintenance reports, and checkout-day stays stop appearing active at 11:00 AM Bangkok time.

### Compatibility and safety

- Preserved all five approved Meta Utility-template names, language and parameter counts.
- No passport data, stay codes, key-box codes, phone numbers or credentials are added to public files, logs or staff alert summaries.
- Added and updated regression coverage for confirmation-before-send, multi-role routing, automated success responses and no-repeat-code spare-key release.

## v5.11.6 — Public Legal Pages for Meta Review

### Added

- Added public `/privacy`, `/data-deletion` and `/terms` routes with matching `.html` and trailing-slash aliases.
- Added clear privacy information covering TM30 registration, the Thai-national exemption, every non-Thai overnight guest, passport storage, AI processing, staff alerts and retention.
- Added a safe data-deletion request process and public Terms of Use.
- Added discreet legal links to the public welcome-page footer and cross-links between all legal pages.

### Security and validation

- Legal routes do not require a guest session or admin token and receive restrictive browser security headers.
- No credentials, recipient numbers, confirmation codes, passport data or key-box codes are included in the pages or release archive.
- WhatsApp, webhook, Airbnb synchronization, passport upload, protected alerts and spare-key behavior are unchanged.
- All automated tests pass, including new public-route, authorization and secret-exposure checks.

## v5.11.5 — Production WhatsApp Routing & Guest Operations

### Added

- Added separate Meta Utility-template payloads for service, booking, luggage, urgent and verified lost-key staff alerts.
- Added actionable luggage-request classification and structured Su notifications containing room, arrival/departure context, bag count, requested time and sanitized notes.
- Added conservative first-name-only extraction to Airbnb synchronization and personalized verified room greetings when a safe first name is available.
- Added signed `RECEIVED <reference>` acknowledgement support while retaining `ACK` and `RESOLVE`.
- Added reviewed translations for the exact office-hours and luggage-storage wording in all seven supported languages.

### Changed

- Published office hours as 10:30 AM–7:30 PM Bangkok time, Tuesday–Sunday, while preserving the 7:30 PM–10:30 AM after-hours window.
- Routes routine stay support and luggage requests to Su, booking requests to Fah, and urgent or lost-key events to the protected configured team.

### Security and validation

- Full Airbnb names, email bodies, contact details, confirmation codes, passport data and key-box codes remain excluded from WhatsApp messages and public artifacts.
- Automatic spare-key release remains fail closed until stay verification, after-hours timing, fee acceptance and at least one protected team-message submission all succeed.
- All 54 automated tests pass, including template selection, luggage routing, guest-first-name synchronization and signed acknowledgement.

## v5.11.4 — Concierge Startup & Contact Routing Fix

### Fixed

- Fixed a JavaScript initialization-order error that stopped the AI Concierge before its launcher, panel and contact interception were registered.
- Restored the Concierge launcher and panel on operational guest pages, including Safari.
- Restored concierge-first behavior for ordinary **Contact Us** buttons and extended it to ordinary House-support call buttons.

### Preserved routing

- Human handoff from inside the Concierge still routes stay support to Su.
- House-arranged booking actions continue to use the centralized booking number.
- Koh Tao Rescue, 1669 and other explicit emergency call actions remain direct and are never delayed by the Concierge.

### Validation

- Added a regression test that verifies page context is initialized before access-mode evaluation and that both House-support contact routes are intercepted.
- All 53 automated tests pass.

## v5.11.3 — Readable Maintenance References

### Changed

- Replaced the long UUID shown after a room-problem report with a concise reference containing the verified room and Bangkok date and time, for example `R2-D20260814-T175123`.
- Shows the same readable reference in the guest confirmation, protected alert summary and owner dashboard while retaining a private internal UUID for storage, photo access and protected actions.
- Integrated the conditional 1,000 THB toilet-clearance fee into the normal notice sentence and kept it bold at the standard body-text size.

### Security and validation

- Date and time are both retained to prevent same-room reports made on the same date from receiving indistinguishable public references.
- Public references contain no guest identity, telephone number, confirmation code, passport information or internal object identifier.
- All 52 automated tests pass, including readable-reference parity, internal-ID non-disclosure, alert routing and inline toilet-fee styling.

## v5.11.2 — Guest Essentials & Concise Verification

### Added

- Added accurate luggage-storage guidance to the verified room summary, Departure page and approved AI Concierge knowledge: Tuesday–Sunday during office working hours, or Bamboo Beach Bar from 11:00 AM when the office is unavailable.
- Added an explicit statement that early-morning luggage storage before 11:00 AM is not currently available.
- Added a room resource-conservation notice explaining that fresh water is limited and that Koh Tao receives electricity through an undersea grid connection developed to reduce reliance on local diesel generators.
- Added deterministic concierge answers for luggage storage and island resource conservation.

### Changed

- Shortened every stage of the secure guest-verification page while preserving the stay-code instruction, Thai exemption, one-passport-per-non-Thai-adult-or-child requirement, TM30 purpose, private processing, 14-day deletion and in-person alternative.
- Made the Thai-national exemption bilingual in English and Thai by default, while preventing duplicate Thai wording when the full interface is already set to Thai.
- Kept the conditional 1,000 THB toilet-clearance fee bold but inline with the normal rule text instead of rendering it as a separate heading.
- Added reviewed built-in translations for all new guest-facing wording in English, Thai, Simplified Chinese, Russian, German, French and Spanish.

### Validation

- All 52 automated tests pass, including luggage windows, resource-conservation facts, concise verification copy, bilingual Thai-exemption presentation, canonical page parity, inline fee styling and seven-language availability.

## v5.11.1 — Verification Header & Admin Entry

### Changed

- Removed the legacy narrow page-level header rules from secure guest verification so it now uses the canonical shared top bar, width, spacing and responsive menu.
- Added a discreet translated **Admin login** button at the bottom of the secure guest-verification page, linking to the existing token-protected owner dashboard.
- Refreshed translation-cache and release metadata to v5.11.1.
- Replaced the upload-only foreign-guest step with two explicit routes: secure one-time upload or in-person presentation of all required passports.
- Added reviewed seven-language wording for the in-person choice, pending state and privacy explanation.

### Added

- A reservation-bound in-person passport-handover status that stores no passport details.
- A protected owner-dashboard confirmation action for completing the in-person passport check and manual TM30 registration.

### Security

- The new footer link exposes no owner data or credential. The dashboard remains protected by `CONCIERGE_ADMIN_TOKEN` and the existing no-store security policy.
- Choosing in-person presentation never unlocks the guide. Access is granted only after the protected admin confirmation; the government TM30 submission remains manual.

### Validation

- All 49 automated tests pass, including seven-language coverage, protected admin authorization and the locked-until-confirmed in-person registration workflow.

## v5.11.0 — Guest Maintenance, Direct Stays & Owner Operations

### Added

- A verified, room-specific **Report a Problem** journey covering water leaks and flooding, toilets, water and showers, air conditioning, electricity, doors and security, TV, refrigerator, fan, Wi-Fi, furniture and other issues.
- Structured issue scenarios, optional private photo evidence and a guest reply contact for critical incidents.
- Deterministic critical classification for active leaks, toilet overflows, electrical danger and rooms that cannot be secured.
- Protected owner-console maintenance reports with authenticated photo download and immediate deletion.
- A **Create direct stay** workflow for walk-ins and direct reservations. It generates a private House stay code, displays it only in the creation response and stores only its HMAC hash.
- An **Extend stay** action for active reservations that moves the effective checkout date and updates the current verified session within its security limit.
- Separate **Active stays** and **Upcoming stays** sections in the owner operations console.

### Changed

- Generalized the guest verification and lost-key wording to accept either the Airbnb HM code or the private House stay code.
- Renamed the Airbnb-only manual recovery form from “Add fallback stay” to the clearer “Add missing reservation.”
- Added the House toilet rule to the normal guest information: only human waste may be flushed; toilet paper, tissues, wipes, sanitary products and every other item go in the provided bin.
- Explains that the 1,000 THB toilet-clearance fee applies only if inspection confirms that a prohibited item caused the blockage.
- Extended reviewed operational translations for the complete maintenance-report journey in English, Thai, Simplified Chinese, Russian, German, French and Spanish.

### Privacy and operations

- Routine maintenance reports route to House support. Critical maintenance reports route to the urgent team and require a telephone or WhatsApp number so the team can reply quickly.
- Guest reply contact is never written to the maintenance report or alert database. It is added only to the transient protected WhatsApp payload for the team handling that critical report.
- Maintenance photos remain private, outside AI, public assets and ordinary WhatsApp content. They can be deleted immediately and have a 30-day maximum retention policy reinforced by scheduled cleanup and an R2 lifecycle rule.
- Direct-stay confirmation codes remain readable only long enough to hand to the guest; neither direct nor Airbnb codes enter logs, alerts, AI, Git or release archives.
- Cancelled reservations no longer appear in active or upcoming operational stay lists.

### Validation

- Added regression coverage for direct-stay code generation, HMAC-only verification, stay extensions, verified maintenance reporting, critical contact privacy and protected WhatsApp delivery.
- All 47 automated tests pass.

## v5.10.1 — On-Demand Lost-Key Access

### Changed

- Replaced the prominent lost-key panel at the top of the verified room page with a standard dashboard option alongside the other guest-guide choices.
- Keeps the full protected after-hours form closed until the guest deliberately opens that option.
- Preserves direct AI Concierge lost-key actions by opening the same protected section when the room page is loaded with its secure anchor.
- Added a clear return-to-guide action and reviewed translations for the new controls in all seven guest languages.

### Security and validation

- The change is presentation-only: fresh Airbnb confirmation matching, active-stay validation, after-hours enforcement, explicit 500 THB fee acceptance, automatic team notification and key-code rotation remain unchanged.
- All 44 automated checks pass, including canonical-page consistency, full operational translation coverage and the complete spare-key security flow.

## v5.10.0 — Complete Group Registration & Private Guest Access

### Added

- A public verified-stay gate that withholds room information, arrival photographs, Wi-Fi and private House knowledge until registration is complete.
- A required nationality-path choice after Airbnb verification: all overnight guests Thai, or a foreign/mixed group.
- A required declaration of the total number of non-Thai overnight guests, including adults and children and explicitly excluding the unsafe assumption that only the booking guest needs registration.
- Per-reservation passport progress showing received versus required submissions in both the guest flow and owner operations view.
- A public-concierge access policy that provides verification and passport reminders without leaking private room knowledge, while preserving emergency handling and staff alerts.

### Changed

- Requires one separate passport submission for every declared non-Thai overnight guest before the private room guide opens.
- Keeps all-Thai stays passport-free after confirmation-code verification and an explicit all-guests-Thai declaration.
- Makes permanent room pages safe to place in Airbnb messages: the permanent URL itself reveals no room-specific content before successful verification and registration.
- Revalidates every verified session against the current synchronized checkout date so a shortened or changed stay cannot retain obsolete private access.
- Requires the guest to re-enter the Airbnb confirmation code for every after-hours lost-key release; the fresh HMAC match must resolve to the same active reservation and room.
- Clarifies all scheduled Airbnb messages, secure upload pages, concierge answers and operational documentation that the passport requirement applies to every non-Thai overnight guest—not only the person who booked.

### Security and privacy

- Raw room data, protected room photographs, full room pages and private knowledge endpoints return no private content without a complete verified registration.
- Each passport form remains private, reservation-bound, room-bound and single-use; passport files remain isolated from AI, public assets and WhatsApp.
- The readable confirmation code supplied for a lost-key request is never stored, logged, sent to AI or included in staff alerts.
- The 14-day R2 lifecycle remains the maximum retention rule, with earlier owner deletion and scheduled application cleanup available.
- Thai-to-foreign or foreign-to-Thai downgrades that could bypass an existing requirement fail safely and require staff review.

### Validation

- Added regression coverage for multi-passport group completion, count confirmation, requirement non-reduction, nationality downgrade protection, public-concierge privacy, changed-checkout session expiry and fresh lost-key confirmation-code matching.
- All 44 automated checks pass, including Durable Object SQLite schema initialization for the owner overview and scheduled alert paths.

## v5.9.1 — Quota-Safe Airbnb Synchronization

### Changed

- Reduced the Airbnb reservation trigger from every ten minutes to once per hour to protect the Apps Script trigger-runtime quota shared with the existing housekeeping-calendar automation.
- Changed routine synchronization to inspect only newly received Airbnb reservation email, with a short overlap to prevent boundary misses.
- Skips all ten private iCal downloads and Worker submissions during routine runs when no reservation message has changed.
- Retains one complete 400-day email and iCal audit every 24 hours so future stays and cancellation safety are still reconciled.

### Safety

- Incomplete incremental matching can add or update reservations but can never cancel a stored valid stay.
- Full-audit diagnostics remain visible in `HOUSE_AIRBNB_LAST_DIAGNOSTICS`; `HOUSE_AIRBNB_LAST_AUDIT_AT` records the latest successful complete audit.

## v5.9.0 — Automatic Verified-Stay Access

### Added

- Fixed, owner-verified Airbnb listing-to-room mapping for active Rooms 1–6 and 8–11; Room 7 remains reserved and inactive.
- One permanent guest URL per active room, with Airbnb confirmation-code verification against synchronized reservation dates.
- A conservative Google Apps Script synchronizer that combines private Airbnb iCal feeds and Airbnb host emails without transmitting guest names, email addresses, phone numbers, message bodies or payment data.
- Secure, `HttpOnly`, `SameSite=Strict` verified-stay sessions that expire at 11:00 AM on checkout day.
- Self-service passport registration: a verified non-Thai guest can create a private single-use upload form without owner work for each reservation.
- Self-service all-Thai reservation exemption that closes the registration reminder without requesting a passport and revokes unused pending upload links.
- Protected after-hours spare-key access from 19:30 to 10:30 Bangkok time for verified active stays only.
- Explicit guest confirmation of the 500 THB lost-key replacement fee before a key can be released.
- Synchronous official WhatsApp notification to the configured urgent owners/Su group before the code is shown.
- Per-room key-code rotation lock: one automatic release blocks the next until staff change the physical code and confirm rotation in the owner console.
- Owner stay-operations view, manual reservation fallback and key-code rotation confirmation.
- Exact scheduled Airbnb arrival-message copy for all ten active listings and a complete one-time automation setup guide.

### Security and privacy

- Airbnb confirmation codes are normalized and HMAC-hashed before storage; readable codes never enter the database or logs.
- Key-box codes live only in the encrypted `SPARE_KEY_CODES` Worker secret. They never enter Git, the release ZIP, AI prompts, alerts or the operations database.
- A room URL or room selection alone never grants passport or key access.
- Automatic key release fails closed unless the system submits at least one urgent-team message successfully to the official WhatsApp API; the guest confirms only the fee and does not approve the notification.
- Passport files remain isolated from AI and WhatsApp, use random private R2 keys and retain the existing 14-day lifecycle maximum.
- Reservation-linked passport forms remain single-use; multiple non-Thai overnight guests can each receive a separate upload form.
- Room 7 is removed from active room selection, public room routes, reservation mapping and legacy owner-created passport requests.

### Guest experience

- The required-registration panel now asks guests to verify once with the Airbnb confirmation code shown in their trip details.
- Verification unlocks both intended options: secure passport upload for each non-Thai guest or an exemption when all overnight guests on the reservation are Thai nationals.
- During an active after-hours stay, the same verified page can release the room's spare-key instruction after fee acceptance and team notification.
- Existing seven-language operational translation, moving-dot concierge state, Bamboo social links, emergency routing and disabled Explore interface remain preserved.

### Validation

- Added reservation mapping, code hashing, cross-room rejection, automated passport-link, Thai-exemption and protected spare-key regression tests.
- All 39 automated checks pass, including complete operational translation coverage, canonical navigation consistency and fail-closed automatic WhatsApp notification handling for lost-key release.

## v5.8.2 — Reliable Complete Operational Translation

### Fixed

- Replaced all-or-nothing model translation groups with small recoverable groups that automatically split again if a response is incomplete or temporarily fails.
- Added browser retries for temporary `429` and server errors and a targeted retry for individual approved strings returned as retryable.
- Prevented overlapping browser translation flushes from creating request bursts and leaving later sections untranslated.
- Invalidated the previous browser and server translation caches so incomplete results cannot persist after deployment.

### Validation

- Added a complete static-source audit for the welcome, room list, room detail, House information, practical information, emergency, departure and secure registration pages.
- The audit verifies every visible static text item and accessibility label is accepted by the protected translation endpoint.
- Added regression tests for large-batch recovery, isolated single-item failure and browser retry/cache safeguards.
- All 35 automated release checks pass.

### Preserved

- Explore remains disabled and preserved in source for its later rebuild.
- The animated concierge dots, Bamboo Facebook and Instagram actions, seven supported guest languages and all TM30, emergency, alerting and privacy safeguards remain unchanged.

## v5.8.1 — Concierge Loading & Bamboo Social Links

### Changed

- Replaced the visible “Checking the approved information” loading sentence with an animated three-dot typing indicator.
- Added an accessible thinking-state label while keeping the visible interface limited to the moving dots.
- Replaced Bamboo Beach Bar’s disabled internal Explore action with separate official Facebook and Instagram buttons.
- Added deterministic conversation context for Bamboo website and social-page follow-up questions.

### Safety and reliability

- Removed internal Explore detail paths from approved records sent to model reasoning while Explore remains disabled.
- Added regression coverage that prevents generic Bamboo follow-ups from reaching the model or returning `/bar.html` routes.
- Preserved the reduced-motion accessibility setting for the loading indicator.

## v5.8.0 — Complete Operational Translation & Protected Staff Alerts

### Added

- Deterministic action-needed alert policy for routine stay support, explicit booking requests, after-hours lost keys, medical emergencies and serious property incidents.
- Protected owner alert console with sanitized descriptions, delivery status, acknowledgement and resolution controls.
- Official WhatsApp Business Platform adapter with encrypted role-based recipient configuration, approved-template delivery, signed webhook verification and status tracking.
- Five-minute duplicate suppression and ten-minute escalation of unacknowledged urgent or critical alerts to the protected escalation group.
- Authorized WhatsApp reply commands to acknowledge or resolve an alert without opening the owner console.
- Explicit Thai-national exemption across registration pages, House rules, concierge knowledge and owner operations. Thai nationals do not need to complete TM30 passport registration.
- Required owner confirmation that a private registration request concerns a non-Thai guest.

### Fixed

- Translation batches now isolate approved and skipped items, so one unsupported dynamic sentence cannot prevent all other approved text on the page from translating.
- Browser and server translation caches are versioned to invalidate older partial results.
- Added reviewed Thai-national registration-exemption wording in all seven supported guest languages.

### Privacy and safety

- Recipient telephone numbers remain only in an encrypted Worker secret; stored delivery records contain recipient labels and salted one-way hashes.
- Alert descriptions are sanitized independently from concierge logs and exclude passport fields, key-box codes and private stay tokens.
- The alert channel cannot reveal spare-key codes and does not treat a displayed room as identity verification.
- Incomplete WhatsApp configuration never blocks the guest concierge; actionable events remain available in the protected owner console.
- Passport files remain private, room-bound, single-use and subject to the 14-day R2 lifecycle rule. The staff-alert channel is not a guest passport-reminder channel.

### Operations

- Added `WHATSAPP_ALERT_OPERATIONS.md` with the required Meta account, Utility template, Cloudflare secrets, protected recipient schema, webhook and production verification process.
- Added a one-minute scheduled escalation check while retaining daily passport cleanup.
- Explore remains disabled through `EXPLORE_ENABLED=false`, with all source pages, structured data and assets preserved for the later rebuild.

## v5.7.0 — Seven-Language Guest Experience

### Added

- Global guest language selector for English, Thai, Simplified Chinese, Russian, German, French and Spanish.
- Shared localization runtime for the welcome, room, House information, practical information, help and emergency, departure, AI Concierge and secure passport experiences.
- Reviewed built-in translations for navigation, actions, emergency labels, concierge controls and passport purpose, privacy, consent, validation and upload-status wording.
- Protected translation API for longer approved project content using strict structured model output and `store: false`.
- Shared translation cache in the existing Durable Object so an approved source string is translated once per language and reused for all guests.
- Explicit selected-language context in concierge requests, including deterministic approved answers.
- Mobile menu and persistent language access on smaller screens.
- Automated localization checks covering all seven language codes, guest/admin separation, approved-source translation and rejection of arbitrary guest text.

### Privacy and safety

- Guest-authored concierge messages are excluded from the page-translation pipeline.
- The translation endpoint accepts only source text found in approved public pages, scripts and structured datasets.
- The owner operations dashboard remains English and is not connected to guest localization.
- Proper names, phone numbers, prices, fees, times, URLs and room numbers are preserved by the translation contract.
- English approved source remains visible if translation is temporarily unavailable.
- Accident and urgent medical guidance now offers Koh Tao Rescue first because the team knows the island and local access points, followed by Thailand's national medical emergency number 1669 as the second immediate option.

### Deferred

- Explore is removed from the live guest navigation and direct Explore page requests redirect to the welcome page.
- All Explore source pages, structured Activities, Restaurants, Cafés, Beaches, Bars and Shopping records, and media remain intact behind the disabled `EXPLORE_ENABLED` feature switch for the later rebuild.
- Existing approved Explore records remain available to AI Concierge reasoning, but live answers do not expose links to disabled Explore pages.

## v5.6.2 — Registration Button Reliability

### Fixed

- The Required Registration button now retains its private room-bound token across a same-tab page refresh and continues to open the secure registration form directly.
- A normal room page without private registration access now responds with a clear security explanation instead of appearing to do nothing.
- Private registration access is stored only for the specific welcome-page path in the current browser tab, preventing it from being reused silently on a different room page.
- Added the missing registration-section anchor to the main welcome page.

### Validation

- Extended registration regression checks and retained the full concierge, privacy, secure-upload and 41-page navigation test suite.

## v5.6.1 — Roctopus Guest Recommendation Refinement

### Changed

- Simplified the approved Roctopus Dive recommendation to explain only why The House recommends the team: friendly professional service, small groups, personal attention and a welcoming experience, especially for first-time or nervous divers.
- Leaves course, training-system and certification explanations to the Roctopus dive team in the shop.
- Expanded direct matching for natural questions such as “Which is the best dive shop?”
- Changed owner-created passport requests to private Room welcome links. The registration button on that page opens the actual room-bound one-time secure form directly and never opens WhatsApp.
- Displays the intended two registration choices: passport-image upload is active; manual entry is explicitly held until the authoritative TM30 field list is supplied.
- Standardized the guest-guide top bar across all pages, including one desktop width, non-wrapping navigation, spacing reset, logo link and navigation order.

### Safety

- Added a final server-side response safeguard that replaces unwanted technical Roctopus wording with the approved concise recommendation before it reaches the guest.
- Added regression coverage proving the approved answer and safeguard do not expose technical training-system or certification language.
- Added registration-link regression coverage proving the guest reminder uses the private welcome page, the welcome-page button activates only with a private token and the registration action has no WhatsApp route.

## v5.6.0 — Full Approved-Knowledge Concierge Integration

### Added

- Targeted server-side retrieval across the existing approved Activities, Restaurants, Cafés, Beaches, Bars and Shopping datasets.
- Compact record selection that gives GPT-5.6 the most relevant approved project facts without sending operator contact details or the complete data collection on every request.
- Direct approved recommendation for Roctopus Dive as The House’s preferred dive school.
- Direct approved recommendation for Bamboo Beach Bar for a relaxed beachfront sunset in Mae Haad.
- Prominent Required Guest Registration sections on both the main welcome page and every room-specific welcome page, with TM30 purpose, privacy treatment, 14-day deletion and a concierge action to request the private room-bound upload link.
- Guest-registration quick action inside the concierge and room-aware secure-link request wording.
- Retrieval and deterministic regression tests for Roctopus, Bamboo Beach Bar and required passport registration.

### Changed

- GPT-5.6 reasoning effort increased from `low` to `medium`; targeted retrieval controls input size and protects the existing monthly budget.
- Existing Explore data is now available to concierge reasoning while new Explore interface and itinerary expansion remains deferred.
- The v5.5.1 guest-facing booking-language privacy fix is included in this release.

### Safety

- The welcome page never authorizes an upload from room selection alone. Actual passport upload still requires the private, expiring, room-bound, single-use link created by an owner.
- Retrieved project records exclude operator booking contacts from model context; guest actions continue to use deterministic House routes.

## v5.5.1 — Guest-Facing Booking Language Privacy

### Fixed

- Replaced internal commercial terminology in deterministic booking answers with concise guest-service wording.
- Added an explicit AI instruction never to discuss internal commercial arrangements, referral terms, revenue or how The House may benefit from a booking.
- Added a final server-side disclosure guard covering deterministic, AI-generated and owner-approved answers.
- Renamed public routing metadata to `conciergeBookings` and removed private commercial terminology from public configuration and project documentation.
- Added automated regression coverage proving that an unsafe model answer is replaced before it reaches a guest.

### Unchanged

- **Book with Us** and **Call Us** continue to route booking enquiries to +66 96 274 1424.
- Routine stay support continues to route to Su at +66 64 097 3491.
- AI, controlled learning, passport privacy, 14-day passport retention and secure spare-key boundaries are unchanged.

## v5.5.0 — Model-Powered Concierge & Controlled Learning

### Added

- Server-side OpenAI Responses API integration using strict structured output and `store: false`.
- Hybrid response pipeline: deterministic approved answers for high-confidence and protected intents, model reasoning for natural language and contextual follow-ups, and device-safe fallback during API failure.
- Multilingual guest-answer policy grounded only in approved House knowledge.
- SQLite-backed Durable Object for sanitized interaction metrics, learning candidates, owner-approved answers and guest feedback.
- Private `/concierge-admin` owner review interface with approve, reject, deactivate and export actions.
- Immediate activation of owner-approved answers without requiring a code deployment.
- Guest Yes/No answer feedback controls.
- Per-session request-rate protection and strict request-size validation.
- Automated 30-day removal of interaction and feedback records.
- Unit tests covering protected routing, structured model contracts, fallback behavior, owner-approved learning, feedback, admin authorization and privacy redaction.
- `AI_CONCIERGE_OPERATIONS.md` with secure activation and daily-review procedures.
- Private room-bound, expiring and single-use passport-image links created from the authenticated owner area.
- Guest-friendly passport page explaining the TM30 registration purpose, private handling and automatic deletion before accepting an upload.
- Private R2 document storage with file-signature and size validation, authenticated download, immediate deletion and daily retention cleanup.
- Owner passport-request queue with expected arrival time, overdue visibility, manual-reminder status and a ready-to-copy reminder for ordinary WhatsApp.
- `PASSPORT_DATA_OPERATIONS.md` covering setup, retention, reminders, incident actions and the missing authoritative manual-field specification.

### Changed

- Guest questions now go to the protected Worker endpoint before using the existing on-device matching engine as a fallback.
- Short conversation context is retained in browser session storage for follow-up questions.
- The concierge welcome text now invites guests to use their preferred language.
- Guest privacy guidance now explicitly asks users not to share passport, payment or key-box information.
- Overnight-visitor guidance now requests a separate private passport link rather than asking guests to send a document through chat or WhatsApp.
- Broad single-word `help` matching was removed to prevent unrelated questions from receiving the generic welcome answer.
- The on-device and API-failure matcher now requires stronger confidence so unrelated requests cannot be misclassified as emergencies.
- Worker configuration now includes persistent learning storage and rate limiting.
- Package, module registry and structured knowledge release metadata updated to v5.5.0.

### Safety and operational status

- The model cannot generate guest action destinations; all booking, support and emergency buttons remain centrally controlled.
- Key-box codes, stay-link tokens and credentials remain outside model prompts, logs and public files.
- Passport images remain outside the model, learning store, interaction logs, WhatsApp and public files.
- Chat text that resembles pasted passport fields is discarded and reduced to a generic registration intent before model reasoning or operational logging.
- Protected lost-key, property-emergency and medical-emergency intents bypass generative answers.
- Model-powered answers require the server-side `OPENAI_API_KEY` secret. The deterministic concierge remains available without it.
- Owner review requires `CONCIERGE_ADMIN_TOKEN`; no secret value is included in this release.
- The dedicated 24/7 property-emergency contact and secure spare-key delivery remain pending operational inputs.
- Passport upload activation requires the private R2 bucket and `PASSPORT_TOKEN_PEPPER`; the manual TM30-details form remains blocked on an authoritative field list.

## v5.4.0 — Working Room-Aware Concierge Foundation

### Added

- Structured concierge knowledge file with approved accommodation and stay answers.
- Client-side concierge matching engine with natural trigger phrases, confidence threshold and safe fallbacks.
- Working conversation transcript, quick questions, answer actions and accessible mobile interaction.
- Room recognition from `/room/{number}`, local room memory and an in-concierge room selector.
- Room-aware support messages for towels, room cleaning, lost keys and room problems.
- Room 7 as a downstairs room around the corner and directly below Rooms 5 and 6, with a temporary arrival-photo placeholder.
- Separate urgent property-emergency classification for major leaks, flooding, dangerous electrical problems and serious property damage.
- Concierge authoring guide and secure after-hours spare-key architecture document.
- Accepted private signed stay links as the required authorization method for spare-key codes.
- Defined protected multi-recipient spare-key alerts for configured owners and Su.

### Changed

- General public Contact Us actions now open the concierge first rather than immediately leaving the website for WhatsApp.
- Legacy Bars, Cafés and Shopping page copies now load the complete concierge configuration instead of silently skipping initialization.
- Explicit human handoff remains available inside the concierge when operational action is required.
- Lost-key messaging states that a 500 THB replacement fee will be added.
- Recorded the after-hours window as 19:30–10:30 in Bangkok time; this does not define operating hours.
- Further Explore development is deferred until the operational concierge is working reliably for guests.
- Package, module registry and activity release metadata updated to v5.4.0.

### Safety and operational status

- Key-box codes are intentionally absent from public files and secure delivery remains disabled pending guest verification and protected server-side configuration.
- The dedicated 24/7 property-emergency contact remains unconfirmed. The disabled role temporarily falls back to House support without publicly claiming confirmed 24/7 availability.
- Su and Fah currently use ordinary WhatsApp, so staff handoffs use prefilled guest messages rather than automatic server-sent WhatsApp alerts.

## v5.3.5 — Stay Support & Booking Route Separation

### Added

- Explicit stay-support routing to Su at +66 64 097 3491.
- Structured request intent metadata for fresh towels, room cleaning, lost keys and other in-stay needs.
- Future AI Concierge policy for end-to-end routine support conversations with Su as the operational handoff.

### Changed

- Kept House-arranged activities and services on Fah’s separate booking route at +66 96 274 1424.
- Updated Practical Information and Help & Emergency wording to distinguish routine stay support from bookings.
- Centralized the Departure support link through `houseSupport` instead of a hard-coded number.
- Updated package, module registry and activity release metadata to v5.3.5.

### Validation policy

- Release validation now treats Su’s stay-support route and Fah’s House-arranged booking route as separate invariants.

## v5.3.4 — Governance & Booking Policy Hardening

### Added

- Permanent project documentation: project rules, roadmap, changelog, development guidelines, project brief, AI concierge principles and handover prompt.
- `TRANSPORT_RESEARCH_REQUIREMENTS.md` defining the authoritative research needed for v5.4.0.
- Reusable `concierge-booking.js` utility for House-arranged service WhatsApp and telephone routes.
- Structured concierge-booking policy metadata for Shopping & Essentials.

### Changed

- Public booking buttons may use the generic labels “Book with Us” and “Call Us”.
- All centralized booking actions continue to route to Fah’s number: +66 96 274 1424.
- Scooter-rental booking actions now route through The House rather than exposing operator-direct contact actions.
- Package, module registry and activity release metadata updated to v5.3.4.

### Fixed

- Prevented the shared action runtime from overwriting concierge calls with an ambiguous generic `Call` label.
- Removed an invalid trailing CSS block that affected the AI Concierge panel layout.
- Replaced the missing AI Concierge page route with the valid application entry where the concierge launcher is available.

### Research status

- No Transport Deep Research was supplied with the handover. No Transport facts were invented or added.

## v5.3.3 — Activities Completion & House Booking Routing

### Added

- Yoga & Wellness
- Muay Thai
- Massage & Spa
- Cooking Classes
- Wildlife experiences
- Photography
- Night Activities
- Rainy Day activities

### Changed

- Applied a global activity booking policy routing reservations through The House.
- Activity pages route booking calls and messages to +66 96 274 1424.
- Direct operator booking CTAs were removed from public activity booking actions.
- Operator contact and source information remains in structured data for verification and AI context.

## v5.3.2

### Added

- Beach Experiences
- Kayaking
- Paddleboarding and SUP
- Hiking & Viewpoints
- Rock Climbing
- Expanded Activities filters and AI metadata

## v5.3.1

### Added

- Snorkelling
- Boat Trips
- Koh Nang Yuan visitor guidance
- Expanded Activities search and filter support

## v5.3.0

### Added

- Activities & Experiences module
- Diving
- Freediving
- Activity cards and detail pages
- Search and filter structure
- AI metadata and concierge content

### Important factual convention

Roctopus Dive is RAID, not PADI.

## v5.2.3

### Changed

- Bars & Nightlife updated from uploaded concierge research.
- Approved 14-venue ordering retained.
- Detailed researched profiles added where source coverage existed.

## Earlier completed work

Earlier releases established Restaurants, Beaches, Cafés, Shopping & Essentials, House information and the modular platform architecture. The repository Git history preserves the granular implementation commits.
