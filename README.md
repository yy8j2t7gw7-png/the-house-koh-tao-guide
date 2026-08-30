# Guest Guide Platform with AI Concierge — The House v5.11.43

The House – Koh Tao guest guide is a production-oriented, mobile-first digital guest guide and concierge platform. It combines property information, curated island guidance, structured place and activity data, and centralized contact and booking routes.

## Current modules

- House and room information
- Restaurants
- Cafés
- Beaches
- Bars & Nightlife
- Shopping & Essentials
- Activities & Experiences
- Practical information
- Help & Emergency
- Departure guidance
- Model-powered, room-aware AI Concierge with controlled learning

The Activities module contains 49 structured profiles covering diving, freediving, snorkelling, boat trips, beach experiences, kayaking, paddleboarding, hiking, viewpoints, climbing, yoga, Muay Thai, massage, cooking, wildlife, photography, night activities and rainy-day options.

## v5.11.43 release focus

v5.11.43 is a production-critical synchronization, messaging and registration release on deployed v5.11.42. The Airbnb synchronizer now checks recent Airbnb mail every five minutes, immediately posts trustworthy room/listing/code/date records to the existing protected reservation-sync endpoint, and reconciles all ten active private iCal feeds at least hourly even when no email change is detected. The complete 24-hour audit remains the only absence-based cancellation path, so partial fast/hourly syncs cannot mass-cancel good stays. The standalone Google Apps Script must be updated separately after the Worker is deployed.

The five owner-confirmed approved Meta quick-action templates are now the only interactive mappings accepted by the all-template gate: `house_service_alert_actions_v3`, `house_booking_alert_actions_v2`, `house_luggage_alert_actions_v2`, `house_urgent_alert_actions_v2` and `house_lost_key_alert_actions_v2`. Visible buttons remain **Received** and **Resolved**, while the signed webhook command remains internal `RESOLVE`. Setting `WHATSAPP_STAFF_ACTIONS_ENABLED=false` still returns all alert kinds to the established buttonless templates.

The secure passport form now offers the approved manual alternative to image upload. Option 2 collects exactly **passport number, full name, birthday, nationality, gender/sex as shown on the passport, and phone number**. It uses the same reservation-bound, expiring, single-use private token, stores the submission only in the private `PASSPORT_UPLOADS` bucket, follows the same maximum 14-day deletion lifecycle and never places the values in the AI Concierge, WhatsApp, learning data or normal operational logs.

## v5.11.42 release focus

v5.11.42 is a narrow Concierge routing and booking-workflow release on deployed v5.11.41. Human-contact recognition now uses a broad deterministic intent family covering natural requests for a human, person, member of staff, team, reception/front desk, housekeeper, manager, agent, representative and customer support instead of depending on a small exact-phrase list. Strong, repeated, frustrated or direct-transfer wording exposes the existing **The House team** Contact Us / Call Us actions only during Tuesday–Sunday 10:30–19:30 Bangkok service hours; no private staff identity is exposed and no alert is created.

Natural requests to extend the current stay now enter a dedicated `stay_extension` booking workflow. The Concierge collects the number of additional nights and an international WhatsApp/phone number, then sends exactly one existing booking alert through `booking_with_owners` to Fah plus both owners. The guest is told that availability and payment still need confirmation. Private contact data remains transient and is included only in the protected delivery payload.

The Airbnb reservation synchronizer is intentionally unchanged in this release. A separately observed last-minute-booking sync delay remains a known production issue for the next narrow release and must not be conflated with v5.11.42.

## v5.11.41 release focus

v5.11.41 is a narrow mobile/emergency UX correction on the already-pushed v5.11.40 human-routing release. It adds **Call The House Emergency Support** to fire/property-emergency action sets without exposing the responder identity, handles direct emergency-contact questions deterministically, gives the actual mobile conversation more vertical space by compacting the seven quick actions after chat starts, and removes drag-to-dismiss so ordinary chat scrolling cannot move or accidentally close the sheet. v5.11.40 remains the persistent-human routing fix for **I need to talk to a human you can not help me**, and all v5.11.39 cleaning/state behavior remains authoritative.


## v5.11.39 release focus

v5.11.39 is a production cleaning/state correction built directly from deployed v5.11.38. Natural **clean up / cleanup** requests now enter the deterministic room-cleaning collector, the browser retains that cleaning workflow between turns, and a bare hour such as **11** completes the same request and automatically sends the existing service alert. Full page loads no longer restore invisible old transcript history, verified guests receive an access-aware greeting instead of pre-verification copy, and vague **Please send the request** wording cannot create a context-free `Guest request` alert. The AI Concierge remains a one-way operational request interface rather than a live staff-chat channel. No Meta-template activation or recipient/security change is included.

## v5.11.38 release focus

v5.11.38 is a narrow post-deployment wording correction on v5.11.37. Persistent in-hours human/staff-contact handoffs now refer to **The House team** rather than naming Su to the guest. Routine Contact Us / Call Us actions remain available only Tuesday–Sunday 10:30–19:30 Bangkok time and remain suppressed on Monday and after hours. All v5.11.37 Wi-Fi, current-turn routing, cleaning and dive-provider fixes remain unchanged, and the pending human-friendly Meta replacement templates are not activated here.

## v5.11.37 release focus

- Fixes five real production gaps found after v5.11.36: strong/direct human or housekeeper contact now reaches Su with routine **Contact Us / Call Us** options during service hours; cancelled fire context cannot contaminate a later unrelated contact request; natural stained-bed-sheet wording enters and completes the deterministic cleaning workflow; French Kiss Divers preference is preserved even when it is expressed before an established diving collector; and authorized Wi-Fi-password questions no longer lose the numeric password to generic contact-number redaction.
- Keeps the first ordinary generic human request AI-first, but treats clear persistence or explicit staff-contact wording such as **I urgently need to talk to a human**, **please let me call the housekeeper** and **can I call the housekeeper** as sufficient for direct in-hours Su contact. Monday/closed-hours routine-contact suppression remains unchanged.
- Adds targeted emergency-history isolation: a new staff-contact turn is authoritative after a cancelled fire alert, while genuine continuation such as **there is more smoke now** remains fire-safety-first.
- Recognizes natural stained-linen forms including **there is a stain on my bed sheet**, **my bed sheet has a stain** and **the sheets have stains**; **now/ASAP** continues the same cleaning request and produces exactly one normal service alert to Su plus both owners.
- Treats **I wanna learn diving** as structured diving context and recognizes explicit named-provider questions such as **can I go with French Kiss Divers?**. The preference is acknowledged and retained without promising availability or replacing it with the default Roctopus/RAID recommendation.
- Keeps authorized Wi-Fi-password questions on deterministic approved knowledge so the numeric password is shown exactly instead of **[number removed]**; the generic contact/privacy sanitizer remains unchanged for model output and stored diagnostic excerpts.
- Preserves the v5.11.36 snorkeling correction and every existing Meta, House Maps, Explore-disabled guide, Room 11/mobile UI, lost-key, emergency, luggage, passport, Airbnb, Admin and security boundary. The complete **196-test** suite passes with zero failures. The five newer human-friendly Meta templates remain under review and are **not activated** by this release.

## v5.11.36 release focus

- Fixes the production snorkeling regression from v5.11.35. Phrases such as **which beach is good for snorkeling**, **which beach is best for snorkeling** and **is there good snorkeling** now return approved Koh Tao snorkeling records instead of the generic Concierge welcome or a false learning-gap handoff.
- Prevents an independent local-information question from accepting the `welcome` intent when the short **hi** trigger appears only as a substring inside another word such as **which**. Other high-confidence deterministic House/local facts remain unchanged.
- Makes approved snorkeling retrieval authoritative once relevant records exist: these information-only snorkeling questions are answered from `public/data/activities.json` / `public/data/beaches.json` without depending on model compliance, while actionable snorkeling booking requests still enter the protected structured booking collector.
- Improves deterministic guest-facing snorkeling reasons by preferring concise `bestKnownFor` text for activity records, avoiding internal editorial/verification wording where a clean approved reason exists.
- Preserves every v5.11.35 Meta action mapping, House Maps decision, local-guide integration, AI-first contact rule, missing-supply route, Room 11 crop, stable mobile Concierge, lost-key, emergency, booking, luggage, passport, Airbnb, Admin and security boundary. The complete **191-test** suite passes with zero failures.

## v5.11.35 release focus

- Gives a clear current-turn information question precedence over stale cleaning, booking, luggage or other ordinary workflow context, while preserving the pending workflow so the guest can resume it afterward.
- Retrieves the existing approved activities, bars, beaches, cafés, restaurants and shopping datasets internally even while `EXPLORE_ENABLED=false`; recommendations are limited to one to three relevant choices, with Bamboo Beach Bar first for general drinks and a better fit when Bamboo is unsuitable.
- Adds House-specific Mae Haad Beach guidance (about 200 metres / a very short walk) and Sairee Beach guidance (roughly a 20-minute walk), plus representative beach, snorkeling, Thai-food and work-café retrieval regressions.
- Treats natural missing-supply statements such as **There are no towels** as immediate protected service requests to Su plus both owners, while questions such as **How often are towels changed?** remain informational.
- Removes routine page-level House **Call Us** shortcuts and booking-call output. **Contact Us** and **Book with Us** open the Concierge; routine human contact appears only after an AI-first attempt and persistent request during service hours. Emergency and protected lost-key routes remain independent.
- Keeps the single real-device-verified House Maps URL `https://maps.app.goo.gl/5MV4j4B1YzyR1SR69` on mobile and desktop. The proposed device split was withdrawn after the existing link resumed working on mobile.
- Activates all five reviewed Meta staff quick-action templates with **Received** then **Resolve**, using the exact fail-closed mappings. Typed commands, signed-webhook authorization, actor exclusion, idempotency, recipient routing and one-flag rollback remain unchanged; the buttonless service action v1 remains rejected.
- Preserves `72% 100%` as the mobile-only Room 11 crop, the stable mobile Concierge, `EXPLORE_ENABLED=false`, all passport/Airbnb/admin behavior and every protected operational boundary. The complete 190-test suite passes with zero failures.

## v5.11.34 release focus

- Corrects only the **mobile** Room 11 location-photo framing after real-iPhone review: the Room 11 focal point keeps its approved horizontal position at `72%` and moves vertically from `58%` to `100%` so the marked entrance is fully visible.
- The correction lives only inside the existing `@media(max-width:760px)` Room rule. Tablet/desktop Room imagery is unchanged.
- Preserves the stable **💬 AI Concierge** behavior, Room hero height, overlay position and every operational workflow from v5.11.33.
- No Admin Dashboard, WhatsApp, booking, lost-key, passport, stay, Airbnb or other operational code changes.
- The complete 182-test suite is required to pass with zero failures.

## v5.11.33 release focus

- Returns the mobile Concierge to a calm, fixed **148×52 px 💬 AI Concierge** bottom-right pill below 768 px; it no longer collapses, lifts or moves while scrolling.
- Removes the v5.11.32 launcher-specific scroll threshold, collision geometry, hysteresis, vertical lift and ResizeObserver controller, reducing visual motion and runtime layout work.
- Hides the launcher completely while the Concierge panel is open and restores it when the panel closes, while preserving the existing panel, focus management, conversation state and `aria-expanded` behavior.
- Preserves the v5.11.32 Room 11 232 px marked-entrance crop, v5.11.31 header-owned language access, verified/TM30 wording and **Open Concierge** CTA.
- Includes no Admin Dashboard diagnostics change; the owner confirmed the observed diagnostics behavior was expected.
- The complete 182-test suite is required to pass with zero failures. No operational Concierge, WhatsApp, booking, lost-key, passport, stay, Airbnb or admin behavior changes.

## v5.11.31 release focus

- Replaces the desktop-style mobile Concierge pill with a 58×58 px House-green control below 768 px, retaining the sparkle identity, an exact **Open Concierge** accessible name, focus support and reduced-motion behavior.
- Positions the mobile launcher 12 px plus the right/bottom iPhone safe-area insets and adds modest page-bottom clearance so verification, emergency, Room, stay-help and footer content can scroll fully clear.
- Removes the independently fixed mobile language pill. The compact language control is now owned by the approved sticky header beside **Menu** and opens the existing selector inside that menu.
- Tightens the mobile Room hierarchy without changing desktop: Room navigation-card vertical padding is reduced 18.75%, the Room-location hero is reduced from 246 px to 208 px (15.45%), and introductory/section spacing is modestly denser.
- Separates verified-stay wording from TM30 registration and retains the passport-retention statement as a second sentence. The stay-help action now renders **Open Concierge** while preserving its existing Concierge route.
- Adds one focused presentation contract; the complete 179-test suite passes with zero failures. Concierge routing, contact hours, lost-key security, bookings, alerts, passport processing, stay verification, Airbnb synchronization and owner operations are unchanged.

## v5.11.30 release focus

- Recognizes the exact production phrase **I wanna talk to a human** and the full approved neutral human/contact phrase set as a deterministic current-message intent before transcript-aware knowledge, pending clarification or model routing.
- Replaces the v5.11.29 transcript-shape inference for a pending lost-key fee prompt with explicit, non-authorizing `lost_key/awaiting_fee_acceptance` workflow state. Historical lost-key text alone can no longer define a new generic human request.
- Treats both `houseWhatsapp` (**Contact Us**) and `houseCall` (**Call Us**) as routine House contact. The final server action policy suppresses both whenever Bangkok service is closed, regardless of upstream intent or model metadata.
- Applies the same independent gate while rendering browser actions and when an old or cached routine contact link is clicked. Emergency routes remain separate and available.
- Keeps topic-specific current lost-key human requests in the protected 24/7 spare-key process while obeying routine contact hours; no fee is accepted, alert sent or code authorized by conversational workflow state.
- Adds two focused regressions and strengthens the v5.11.29 coverage; the complete 178-test suite passes with zero failures. The verified Room menu, registration-state separation, approved visual system and all booking, Meta and lost-key security controls are unchanged.

## v5.11.29 release focus

- Separates protected active-stay verification from passport/registration completion. A verified Room guest always receives the verified Concierge menu; incomplete registration appears only as a non-blocking reminder.
- Resolves the room identity, verified menu and registration reminder from the same session-bound `/api/stay/status` response and refreshes it after verification, reopening, navigation restoration and refresh.
- Handles generic human-contact requests from the current message before history-aware routing, so inactive lost-key, booking, cleaning, maintenance, luggage and medical topics cannot leak into a neutral request.
- Enforces routine human contact at Tuesday–Sunday 10:30–19:30 Bangkok time, with Monday closed. Closed-hours responses retain Concierge and Emergency help but cannot render or invoke the routine **Call Us** route.
- Applies the Call Us restriction at the final server action boundary, browser rendering boundary and stale-link click boundary independently of generated wording or metadata.
- Keeps the protected lost-key self-service process available 24/7 and preserves every fee-acceptance, accepted-notification, protected-display and rotation-lock safeguard.
- Adds seven focused regressions; the complete 176-test suite passes with zero failures. The approved v5.11.28 visuals, Explore switch and disabled optional staff quick actions are unchanged.

## v5.11.28 release focus

- Refines the public landing page into a warmer boutique-hospitality hierarchy without enlarging the compact v5.11.27 hero or exposing protected room/arrival photography; no approved public-safe property image exists, so the House-green hero uses restrained tonal depth.
- Reframes the required step as **Complete your guest registration**, keeps the foreign-guest and Thai-exemption rules, flattens the three facts and presents one clear four-step path to the private room guide.
- Removes the ambiguous suggestion that access arrives after a stay is complete, and makes Room, Concierge and Google Maps actions describe their actual destinations.
- Removes the repeated Room 11 identity from the photo overlay, tightens the approved toilet/resource guidance, reduces nested box treatment and removes “budget-friendly” from public footers.
- Routes clear lost-key and lockout synonyms—including bare **lost key**—through the same protected 24/7 fee-consent flow before generic service/model routing, while preserving every notification, protected-display and rotation gate.
- Adds three regressions (two lost-key routing tests and one landing/room contract); the complete 169-test suite is required to pass with zero failures. Explore and optional staff quick actions remain disabled.

## v5.11.27 release focus

- Introduces a restrained, shared House visual system with consistent semantic colors, typography, spacing, content widths, cards, buttons, focus states and reduced-motion behavior.
- Reduces the guest-page hero by roughly 25–35% across breakpoints, brings useful room content higher above the fold and keeps large desktop layouts intentionally constrained.
- Reorganizes registration and passport guidance into compact, scannable facts without changing TM30, foreign-guest, Thai-exemption, secure-upload or in-person-verification requirements.
- Polishes the AI Concierge for clearer message hierarchy, readable long answers, touch-friendly two-column quick actions, wrapping course choices and a stronger mobile sheet layout without changing its workflows.
- Simplifies the lost-key consent presentation to one visible `500 THB` amount while retaining explicit request-bound acceptance, notification-before-display, protected code isolation and the rotation lock.
- Makes owner operations denser and clearer with lifecycle labels, compact delivery diagnostics, quiet resolved states, private-photo status and stacked narrow-screen table rows.
- Adds three responsive visual-contract tests; the complete 166-test suite passes with zero failures. Explore remains disabled and `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remains required.

## v5.11.26 release focus

- Replaces the mixed activity/course diving chooser with a data-driven PADI, SSI and RAID model covering beginner, continuing, specialty and professional pathways under current nomenclature.
- Always recommends RAID for its safety and buoyancy-control focus and Roctopus Dive as The House’s preferred RAID centre, while routing explicit PADI/SSI requests accurately through an appropriate provider check.
- Supports one diving booking with exact participant subgroups, including different activities, agencies, courses and relevant current certifications; one international contact is collected last and one Fah-plus-owner alert is sent.
- Stores the complete non-sensitive subgroup breakdown with the alert while retaining the existing concise, Meta-safe six-parameter `house_booking_alert_v2` delivery and contact-last boundary.
- Adds owner maintenance **Resolve → Remove** controls with private-photo cleanup, plus independent WhatsApp diagnostic **Dismiss/Clear** controls that never alter alert or delivery truth.
- Expands the complete suite from 157 to 163 tests with zero failures. Staff quick actions remain disabled; full public visual polish is deferred to v5.11.27.

## v5.11.25 release focus

- Fixes the confirmed Meta `132018` booking-delivery rejection at the shared outbound template BODY serialization boundary.
- Converts every CR, LF, tab and Unicode whitespace run in every textual template parameter to one ordinary space, trims the result and retains the existing 900-character limit.
- Applies centrally to service, luggage, booking, urgent, lost-key, status and future enabled action-template BODY values without changing any template name, language, parameter count/order, route, recipient or Meta configuration.
- Keeps protected contacts only in the intended transient outbound parameter and preserves all value-free diagnostic, secret, key-code and retry-state boundaries.
- Classifies a real Meta `132018` response as a sanitized template-parameter failure without logging or storing parameter values.
- Expands the complete suite from 155 to 157 tests. Staff quick actions remain disabled; public visual polish is deferred to v5.11.26.

## v5.11.24 release focus

- Moves explicit booking retry ahead of approved-knowledge retrieval, broad history and model routing, so retry commands cannot become a new checklist or inherit stale medical, property, lost-key, cleaning or luggage context.
- Stores a durable, contact-free retry snapshot bound to the verified reservation, room and protected browser session. A retry reuses the exact alert ID; it cannot cross to another stay or room and it never resends an alert that already has an accepted delivery.
- Keeps completed safe booking fields across a reload. If the transient contact is gone, the Concierge asks only for an international WhatsApp/phone number, then retries the same alert without recollecting date, guest count, product/course, relevant certification, provider or sanitized notes.
- Keeps unrelated bar, check-out and property questions in ordinary Concierge routing after a delivery failure. A retry happens only after an explicit retry command.
- Adds owner-visible alert-bound WhatsApp diagnostics with the real sanitized template, language, route, attempted/accepted totals, HTTP/provider classification and Bangkok time. The established `house_booking_alert_v2`, `en`, six-BODY-parameter mapping remains unchanged because source inspection found no deterministic payload mismatch; the next production rejection will expose the actual Meta response safely.
- Normalizes conversational provider wording such as **or with Master Divers would be even better** to **Master Divers** without promising availability.
- Preserves every passed v5.11.23 booking, property, cleaning, urgent-console and 24/7 lost-key safeguard. Staff quick actions remain disabled; public visual polish was subsequently deferred to v5.11.26 after the narrow v5.11.25 Meta parameter hotfix.

## v5.11.23 release focus

- Keeps active structured bookings conversational: side questions and preferences are acknowledged, stored as protected notes and returned to the same next missing field without promising third-party availability or creating an early alert.
- Extends the shared Bangkok booking-date parser to `DD.MM.YYYY`, `DD/MM/YYYY`, `DD-MM-YYYY`, named dates and relative dates, with concise past/invalid feedback instead of a silent repeated question.
- Replaces the brittle Fun Diving certification whitelist with sanitized useful free text plus normalization for common diver, Divemaster and instructor aliases.
- Makes the exact Open Water contact-correction path complete: a local number is visibly redacted and rejected without poisoning date/diver/course state, then a valid international replacement creates exactly one Fah-plus-owner alert. Failed delivery becomes a non-monopolizing retry snapshot: unrelated questions route normally, only an explicit retry can reuse it, the same alert record is retained and no success is shown until Meta returns a message ID.
- Isolates routine property detail buffers and deduplication by category and issue content, preventing rat, sewage, AC and later pest reports from contaminating one another while retaining genuine same-issue follow-ups.
- Prevents unresolved urgent owner-console sections from being hidden by manual, keyboard or **Collapse all** actions.
- Adds truthful protected reset modes for a controlled owner-only test that retains the current code and a real physical-code rotation. Both create distinguishable code-free audit entries and never revive a historical lost-key request.
- Preserves the passed v5.11.22 cleaning, property classification, 24/7 lost-key release and Meta routing behavior. Staff quick actions remain disabled. The planned visual milestone was subsequently moved to v5.11.26 after the narrow v5.11.24 and v5.11.25 production corrections.

## v5.11.22 release focus

- Replaces multi-field booking forms with one-question-at-a-time, category-specific Concierge collection for diving, fishing, snorkeling, taxi, taxi boat, ferry and motorbike taxi requests. Supplied details are preserved, finite choices use buttons and the international reply contact is collected last.
- Adds deterministic property intelligence for pests/animals, odors, plumbing, equipment, fixtures, mold/damp and room condition. Routine reports create one Su-plus-owner service alert; ambiguous odors receive one clarification; dirty-room reports stay in the cleaning workflow; serious property hazards still require deliberate urgent-alert confirmation.
- Makes the protected lost-key self-service flow available 24/7. Every request starts with fresh, request-bound `feeAccepted=false` state, requires explicit 500 THB acceptance and an accepted Su-plus-owner notification, displays the code only on the protected guest page and immediately engages the physical-code rotation lock.
- Makes the owner console sections independently collapsible, remembers authorized-browser preferences, keeps unresolved urgent work open and visible, and adds clear counts and rotation-required status without changing protected data APIs.
- Preserves all production Meta mappings, secrets, recipients, webhook behavior, emergency routing, passport retention and Airbnb synchronization. Staff quick actions remain disabled and the only valid future service-action template remains `house_service_alert_actions_v2`.

The v5.11.22-and-later 24/7 lost-key rule supersedes time-window behavior described in the historical release summaries below.

## v5.11.21 release focus

- Validates cleaning clock preferences against the actual Bangkok calendar and time before submission: a past same-day time, a closed-hour time or a Monday time stays pending until the guest supplies a usable replacement; explicit future dates retain their own calendar context.
- Recognizes natural fishing and snorkeling requests such as **I wanna go fishing**, **I’d like to book fishing** and **Take us snorkeling** as direct structured-booking intent while keeping genuine information questions non-actionable.
- Replaces technical lost-key delivery language with clear hospitality wording while preserving the verified-stay, 500 THB fee, protected team-delivery and rotation safeguards underneath.
- Changes no visual design, production Meta mapping, secret, recipient, webhook, emergency route, passport rule or Airbnb synchronization behavior. Staff quick actions remain disabled and the only valid future service-action template remains `house_service_alert_actions_v2`.

## v5.11.20 release focus

- Makes natural cleaning requests such as **my room is dirty** enter the protected cleaning workflow, carry the preferred time across turns and submit exactly one service alert without asking the guest to contact support separately.
- Treats direct activity intent such as **I want to go fishing** and every matching **Book with Us** action as a structured booking request while keeping recommendation questions informational.
- Separates verified-stay authorization from passport completion for lost-key support: unverified guests cannot alert or release a code, verified daytime requests use the dedicated lost-key alert, and verified after-hours requests retain the fee, notification-before-code and rotation gates.
- Keeps key-box codes out of Concierge history, alerts, WhatsApp payloads, logs and diagnostics, and prevents prior room, stay or session state from authorizing a new release.
- Corrects the pending Meta service-action template name to `house_service_alert_actions_v2`; the accidental buttonless v1 name is rejected. Staff quick actions remain disabled by default and production mappings are unchanged.

## v5.11.19 release focus

- Prevents every luggage, cleaning or booking operation from silently dropping into the device-only answer engine when the protected server request fails; the guest instead sees a truthful **not sent** message and retains the active workflow.
- Preserves arrival/departure dates, times, bag counts and sanitized notes through local-number correction, then creates exactly one validated luggage alert only after Meta accepts at least one delivery.
- Makes housekeeping scheduling calendar-aware in Bangkok: Tuesday–Sunday, 10:30–19:30, with Monday closed and Sunday-evening requests correctly carried to Tuesday at 10:30.
- Collects a preferred cleaning time before sending, accepts clock times, **now** and **ASAP**, and clearly states that the preference is not a confirmed appointment.
- Adds deterministic information-only and structured booking paths for fishing, snorkeling, taxis, taxi/longtail boats, ferry tickets and motorbike taxis, while preserving the existing diving gates and Fah-plus-owner routing.
- Makes every **Book with Us** entry category-specific and keeps contacts transient, redacted and excluded from ordinary history, alerts, dashboards and logs.
- Adds an opt-in, fail-closed path for five new Meta Utility templates with **Received** and **Resolve** quick replies. Existing production templates and typed commands remain unchanged until all new templates are approved and explicitly enabled.

## v5.11.18 release focus

- Carries explicit, contact-free pending luggage state between Concierge turns so a rejected local number followed by a valid international number completes the same request exactly once.
- Gives verified-room towels, soap, toilet-paper and room-cleaning requests priority over older luggage or booking collection, with no contact-number prompt.
- Records after-hours routine housekeeping immediately and tells the guest it will be handled after 10:30 AM the next morning without another request.
- Adds an urgent-clarification workflow: vague urgency asks what happened and exposes no send action until the guest supplies a meaningful incident description.
- Requires meaningful incident content again at the urgent-confirmation boundary and gives confirmed flooding, fire, electrical and medical alerts useful human-readable labels.
- Preserves the v5.11.17 Meta locale split, exact approved template shapes, role routing, diagnostics and external configuration.

## v5.11.17 release focus

- Fixes the confirmed Meta `132001` production rejection by selecting the translation attached to each approved template instead of forcing one global language code.
- Sends the six current templates with generic English (`en`) while retaining English (US) (`en_US`) only for the five explicitly mapped v1 rollback templates.
- Preserves every template name, BODY-only component, parameter count/order, recipient group, delivery diagnostic and fail-closed security gate.
- Restores a discreet, token-free **Admin Login** link in the normal footer across guest-facing pages; `/concierge-admin` remains protected by server-side authentication.
- Adds regression coverage for the exact Room 11 fresh-towel failure, all current and rollback template languages, footer presence and token exclusion.

## v5.11.16 release focus

- Adds safe, provider-response diagnostics for failed Meta template submissions without changing the v5.11.15 outbound payload construction.
- Records the exact selected template name, language, value-free component structure, HTTP status, safe Meta error code/subcode/type/message/details and trace ID for 30 days.
- Shows those records only in the protected owner console and also exposes the numeric error code already retained by v5.11.15 failures, clearly labelled when fuller legacy evidence is unavailable.
- Keeps recipients, guest contacts, template parameter values, access tokens, passport data, confirmation codes, stay tokens and key-box codes out of diagnostics and logs.
- Routes all six production templates through the same inspected submission function and verifies their exact body-only request shapes with automated tests.
- This is an evidence-capture release. It does not claim the production Meta rejection is resolved until the retained provider response identifies the actual cause.

## v5.11.15 release focus

- Activates template-aware payload construction for the six approved production Meta templates: service v3, luggage v2, booking v2, urgent v2, lost-key v3 and alert-status v1.
- Enforces the exact body-parameter order and count for each template, retains the legacy v1 schemas only as an explicit rollback path, and fails closed for unknown or mismatched configurations.
- Sends one non-recursive ACKNOWLEDGED or RESOLVED update to the other recipients assigned to an alert while excluding the actor, unrelated roles and duplicate webhook deliveries.
- Treats Meta delivery as successful only when the Graph API accepts the request and returns a provider message ID; guest confirmations therefore remain truthful and spare-key release stays fail closed.
- Expands the desktop Concierge to use substantially more viewport height, compacts common questions after conversation begins and preserves the mobile sheet layout.
- Simplifies the verified lost-key explanation, protected fee step and successful spare-key instructions without weakening stay, time, fee, notification or rotation gates.
- Preserves v5.11.14 housekeeping, fire, medical, room-location, diving-booking, contact-redaction and relative-date behavior.

## v5.11.14 release focus

- Replaces technical classifier/alert wording with natural hospitality language while preserving every explicit emergency-confirmation boundary.
- Adds fire-specific evacuation, configured Koh Tao Rescue and safe fire-extinguisher guidance without sending a House alert before confirmation.
- Makes **Find My Room** return the verified room’s location and a direct **Your Room** action.
- Treats toilet paper, soap, towels and room cleaning as deterministic service requests, with exact 10:30–19:30 Bangkok office-hour behavior and after-hours morning handling.
- Adds visible housekeeping/service hours to Guest Information and a compact Concierge reminder.
- Removes personal Fah chat routing from booking controls and starts bookings inside the AI Concierge instead.
- Adds a structured diving workflow with required date, party size, course/experience, conditional certification/course details and protected international contact before one Fah-and-owner alert can be created.
- Enforces structured diving fields again at the final server-side alert boundary, keeps recommendation questions informational and states that payment is required before confirmation.
- Preserves all v5.11.13 safety, luggage, lost-key, contact-redaction and Meta configuration behavior.

## v5.11.13 release focus

- Replaces single-word alert triggering with contextual, sentence-level safety classification so slang, figurative language and ambiguous statements cannot silently create House alerts.
- Keeps medical and personal-safety guidance immediate, including Koh Tao Rescue and 1669 actions, while requiring a deliberate **Send urgent alert** action before notifying The House.
- Preserves the explicit confirmation requirement for serious property incidents and prevents model labels or stale workflow state from bypassing the protected alert boundary.
- Prevents overlapping Concierge submissions so one guest message produces one coherent response and one state transition.
- Clarifies reply-number collection for local Thai numbers by explicitly accepting country-code format such as `+66`.
- Rewrites the verified lost-key experience in guest-friendly language, uses one clear 500 THB fee confirmation, and replaces unavailable repeat-release controls with a Concierge contact action.
- Keeps every v5.11.12 luggage-validation, contact-redaction, routing and lost-key security safeguard unchanged. No Meta template or production configuration changes are included.

## v5.11.12 release focus

- Adds a final server-side luggage submission gate: no alert or WhatsApp delivery can be created unless that specific request contains arrival/departure, requested time, bag count and a usable international reply number.
- Starts every new actionable luggage request with clean collection state, including immediately after a previous request was completed in the same Concierge session.
- Uses validated structured luggage fields for the protected WhatsApp template so a new delivery cannot contain operational `Not provided` values.
- Redacts supplied telephone and WhatsApp numbers immediately in every visible guest chat bubble and continues excluding them from normal browser history, interactions, alerts, dashboards, learning data and logs.
- Preserves critical-property precedence, existing recipient routing and all fail-closed lost-key safeguards.

## v5.11.11 release focus

- Prevents an actionable luggage-storage request from being submitted until arrival/departure context, requested time, bag count and a usable international reply number are all available.
- Uses a deterministic multi-turn luggage workflow so missing information is collected efficiently and a complete request is sent without redundant questions.
- Keeps luggage-information questions informational and preserves critical-property precedence over any pending luggage or contact-number step.
- Keeps the raw reply number transient: it is passed only to protected staff delivery and is redacted from browser history, interactions, alerts, dashboard summaries and application logs.
- Preserves luggage routing to Su plus both owners after every required field has been supplied.

## v5.11.10 release focus

- Gives every newly reported critical property incident precedence over stale luggage, booking, maintenance, routine-service and contact-number workflows.
- Requires the latest guest message to be reclassified before it can be consumed as data for an older workflow.
- Keeps urgent property alerts independent of a guest contact number and preserves explicit **Send urgent alert** confirmation before protected delivery.
- Adds Privacy, Data Protection and Terms navigation to every public and private page through the shared multilingual runtime, with a static admin fallback.
- Preserves existing recipient routing, acknowledgement, resolution, escalation and operational contact requirements.

## v5.11.9 release focus

- Routes **Call The House Emergency Support** to West / Owner 2 from the protected server-side recipient configuration instead of Su.
- Requires a usable country-code contact before actionable booking, luggage and routine maintenance requests are submitted, while urgent incidents and lost-key access remain non-blocking.
- Normalizes relative booking dates such as “tomorrow”, “in 5 days” and “next Friday at 9” into Bangkok-local calendar dates and times.
- Adds optional approved-template support for notifying all other assigned recipients when an authorized recipient acknowledges or resolves an alert; duplicate webhook delivery does not repeat the update.
- Keeps the working v1 Meta templates as production defaults until the reviewed replacement templates are Active.

## v5.11.8 release focus

- Fixed the rendered **Secure spare-key access** CTA so it reliably opens the protected room-bound lost-key flow.
- Preserved verified-session, fee-acceptance, WhatsApp-delivery, rotation-lock and secret-exclusion safeguards.

## v5.11.7 release focus

- Routes every actionable routine request to Su and both owners, booking requests to Fah and both owners, and serious property alerts to both owners and Fah.
- Requires explicit guest confirmation before a serious property alert is sent; successful delivery is confirmed in the Concierge with direct emergency-call fallbacks.
- Makes automated luggage, service and booking delivery self-contained, without asking the guest to repeat the same request in WhatsApp.
- Rebuilds after-hours spare-key release as a two-step 500 THB fee confirmation using the existing verified, room-bound stay session—no repeated Airbnb code.
- Keeps spare-key release fail closed until at least one protected team notification is accepted, and keeps lost-key alerts outside the generic escalation path.
- Clarifies the protected dashboard and stops checkout-day stays being shown as active after 11:00 AM Bangkok time.
- Keeps the five approved Meta template names and parameter counts unchanged.

## v5.11.6 release focus

- Adds public, extensionless Privacy Policy, Data Deletion and Terms of Use routes required for the Meta app review.
- Documents guest registration, passport handling, AI processing, protected WhatsApp staff alerts, retention and guest choices in clear language.
- Adds a safe email-based deletion-request process that explicitly tells guests not to email passports, confirmation codes, key codes or payment details.
- Adds discoverable legal links to the public welcome page while preserving the existing guest-access gates.
- Keeps all v5.11.5 WhatsApp, Airbnb, passport, alert-routing and spare-key behavior unchanged.

## v5.11.5 release focus

- Integrates five Meta WhatsApp templates for service, booking, luggage, urgent and verified lost-key alerts.
- Routes routine stay and luggage requests to Su, House-arranged bookings to Fah, and urgent/lost-key events to configured owners and support recipients without exposing private numbers publicly.
- Turns explicit luggage-storage requests into structured alerts containing room, arrival/departure context, bag count, requested time and guest notes while keeping general luggage questions informational.
- Publishes office hours of 10:30 AM–7:30 PM Bangkok time, Tuesday–Sunday, and the Bamboo Beach Bar fallback from 11:00 AM.
- Adds reviewed seven-language translations for the updated luggage and office-hours guidance.
- Synchronizes only a conservatively extracted Airbnb guest first name for a personal room greeting; full names, email bodies and contact details remain excluded.
- Accepts `RECEIVED <reference>` for signed WhatsApp acknowledgement while retaining `ACK` compatibility.
- Preserves fail-closed spare-key release, private passport handling, disabled Explore routes and existing emergency safeguards.

## v5.11.4 release focus

- Fixes a concierge startup regression caused by page context being read before it was initialized.
- Restores the Concierge launcher and panel across the operational guest pages, including Safari.
- Restores concierge-first handling for every ordinary **Contact Us** action.
- Extends concierge-first interception to ordinary House-support call buttons so Su is offered only when a human handoff is needed.
- Keeps direct booking calls to the House booking number and direct emergency calls to Rescue or 1669 unchanged.
- Adds a regression test covering initialization order and both House-support contact routes.

## v5.11.3 release focus

- Replaces long guest-facing maintenance UUIDs with concise references containing the verified room and Bangkok date and time, such as `R2-D20260814-T175123`.
- Uses the same readable reference in the guest confirmation, protected staff alert and owner dashboard so a report can be coordinated without exposing its internal identifier.
- Retains the internal UUID only for protected storage and authenticated operations.
- Integrates the conditional 1,000 THB toilet-clearance fee naturally into the normal notice sentence and keeps it bold at the standard body-text size.
- Keeps every v5.11.2 guest-access, translation, privacy and operational safeguard.

## v5.11.2 release focus

- Adds accurate luggage-storage guidance to the verified room summary, Departure page and AI Concierge.
- States that office luggage storage is available Tuesday–Sunday during office working hours.
- Directs guests to Bamboo Beach Bar from 11:00 AM when the office is unavailable.
- Clearly explains that no early-morning luggage storage is currently available before 11:00 AM.
- Keeps the confirmed 1,000 THB toilet-clearance fee bold but inline within the normal rule text instead of displaying it like a separate heading.
- Adds a concise room notice asking guests to conserve Koh Tao's limited fresh water and electricity, with infrastructure wording checked against official PEA information.
- Shortens the secure guest-verification journey while retaining the stay-code instruction, Thai exemption, complete non-Thai group requirement, TM30 purpose, private handling, 14-day deletion and in-person passport option.
- Shows the Thai-national exemption in both English and Thai by default, without repeating the fixed Thai lines when the interface itself is set to Thai.
- Retains manual TM30 submission, secure guest access, seven-language support and every v5.11.1 privacy safeguard.

## v5.11.1 release focus

- Makes the secure guest-verification page inherit the same shared desktop and mobile top bar as the other live guest pages.
- Removes the legacy narrow header override that forced desktop navigation labels onto two lines.
- Adds a small translated **Admin login** button at the bottom of the verification page, linking to the existing protected owner dashboard.
- Gives non-Thai guests a clear choice between secure passport upload and presenting every required passport to The House in person.
- Keeps private room information locked for the in-person route until an authorized admin confirms that every required passport was checked and the manual registration was completed.
- Keeps TM30 submission manual; this release does not automate the government portal.

## v5.11.0 release focus

- Adds a verified, room-aware **Report a Problem** workflow for water leaks, toilets, water and shower issues, air conditioning, electricity, room security, TV, refrigerator, fan, Wi-Fi, furniture and other issues.
- Sends routine room reports to the House support workflow and classifies active leaks, toilet overflows, electrical danger and rooms that cannot be secured as critical. Critical reports require a guest telephone or WhatsApp number for a fast reply.
- Keeps the guest reply contact out of operational storage and adds it only to the transient protected WhatsApp delivery payload for the team handling the report.
- Adds the toilet rule to House information and explains that a 1,000 THB clearance fee applies only when inspection confirms that paper, tissues or another prohibited item caused the blockage.
- Keeps optional maintenance photos private, outside AI and public assets, with authenticated owner access, immediate deletion and a 30-day maximum retention rule.
- Separates **Active stays** and **Upcoming stays** in the owner console.
- Adds **Extend stay** for an active reservation without forcing the guest to register again.
- Adds **Create direct stay** for walk-ins and direct reservations. The owner receives a private one-time House stay code to give the guest; only its HMAC hash is stored.
- Generalizes guest verification and lost-key checks so either an Airbnb HM code or a private House stay code can be used with the existing room, active-date, after-hours, fee, notification and key-rotation safeguards.
- Retains seven-language operational support and keeps Explore disabled but preserved for its later rebuild.

## v5.10.1 release focus

- Presents lost-key assistance as a normal room-dashboard option beside Find My Room, House Information, Practical Information, Help & Emergency and Checkout.
- Keeps the full protected after-hours form closed until the guest deliberately opens the lost-key option or follows a relevant AI Concierge action.
- Preserves every existing safeguard: fresh same-reservation confirmation, active-stay validation, the 19:30–10:30 Bangkok-time window, explicit 500 THB fee acceptance, automatic urgent-team notification and key-code rotation.
- Adds reviewed Thai, Simplified Chinese, Russian, German, French and Spanish wording for the new dashboard description and return action.

## v5.10.0 release focus

- Keeps all room-specific content, arrival photographs, Wi-Fi and private House knowledge locked until the Airbnb stay and required guest registration are complete.
- Gives verified guests an explicit choice between an all-Thai stay and a foreign or mixed group; all-Thai stays need only the Airbnb confirmation-code check.
- Requires the guest to declare the complete number of non-Thai adults and children staying overnight—not only the Airbnb booking guest.
- Requires one separate passport submission for every declared non-Thai overnight guest and opens the private guide only after all required submissions are received.
- Explains the TM30 purpose, private processing and 14-day maximum deletion rule before upload; passport files remain outside AI, WhatsApp and public assets.
- Restricts the unverified public concierge to verification, registration reminders and emergencies while keeping protected staff alerts available for serious incidents.
- Revalidates verified sessions against the current synchronized checkout date, including after reservation changes.
- Requires a fresh Airbnb confirmation-code match for every after-hours spare-key request before applying the existing active-stay, 500 THB fee, automatic staff-notification and code-rotation safeguards.
- Preserves the seven-language operational interface, automatic Airbnb synchronization, protected after-hours key workflow, disabled Explore interface and all existing owner controls.

## v5.9.1 release focus

- Reduces the automatic Airbnb synchronizer from every ten minutes to once per hour so it safely shares Apps Script quota with the existing housekeeping-calendar automation.
- Makes routine runs incremental: new Airbnb email is checked with a short overlap, and the ten private calendars are fetched only when something changed.
- Keeps one complete reservation and cancellation audit every 24 hours, with the original fail-safe rule that incomplete matching can update records but cannot cancel valid stays.

## v5.9.0 release focus

- Gives each active room one permanent guest page and verifies the current or upcoming stay with the Airbnb confirmation code from the guest's trip details.
- Synchronizes reservation codes and stay dates automatically from private Airbnb iCal feeds and Airbnb host emails through the included Google Apps Script.
- Maps the ten verified Airbnb listing IDs to Rooms 1–6 and 8–11. Room 7 remains reserved in source and is not active.
- Lets verified non-Thai guests create their own private, single-use passport-upload form; Thai nationals can record that the TM30 passport flow does not apply.
- Enables protected after-hours spare-key access for an active stay from 19:30 to 10:30 Bangkok time, after explicit acceptance of the 500 THB lost-key fee.
- Automatically sends the lost-key alert to the configured owners/Su group and waits for the WhatsApp API to confirm message submission before showing a key-box code. The guest only confirms the 500 THB fee; the system handles the staff notification. Another release remains blocked until staff rotate the physical code.
- Stores confirmation codes only as HMAC hashes and key-box codes only in the encrypted Worker secret.
- Includes exact scheduled Airbnb messages for every active room and a complete one-time setup guide.
- Preserves the seven-language operational interface, approved AI knowledge, moving-dot thinking state, emergency safeguards and disabled Explore interface.

See `AIRBNB_AUTOMATION_SETUP.md` for activation and `AIRBNB_SCHEDULED_MESSAGES.md` for the prepared guest messages.

## v5.8.2 release focus

- Fixes incomplete operational-page translation by splitting model work into smaller recoverable groups instead of allowing one incomplete response to leave the rest of a page in English.
- Retries temporary translation endpoint failures and any individual source text explicitly marked for retry.
- Prevents overlapping browser translation flushes, which previously could create avoidable request bursts and partial results.
- Invalidates earlier partial browser and server caches and expands the browser cache for the complete operational journey.
- Adds an automated audit proving that every static text node and accessibility label on every live operational page is accepted by the protected translation pipeline.
- Retains the animated concierge dots, Bamboo Facebook and Instagram actions, Explore disablement and all v5.8.1 safety controls.

## v5.8.1 release focus

- Replaces the concierge loading sentence with a quiet animated three-dot indicator, including a reduced-motion fallback and an accessible status label.
- Gives Bamboo Beach Bar an approved online-contact answer with separate official Facebook and Instagram buttons.
- Understands conversational follow-ups such as “Do they have a website?” when the recent conversation is about Bamboo Beach Bar.
- Removes disabled internal Explore paths from the approved records supplied to the model, preventing invented or unusable venue links.
- Keeps Explore disabled and fully preserved for its later rebuild.
- Retains every v5.8.0 operational translation, TM30, alerting, routing and privacy safeguard.

## v5.8.0 release focus

- Fixes full-page localization so one unsupported dynamic string no longer prevents the rest of an approved translation batch from rendering.
- Invalidates older partial browser and server translation caches, while preserving English as the safe fallback for any individual untranslated item.
- Retains seven guest languages across the complete live operational journey: English, Thai, Simplified Chinese, Russian, German, French and Spanish. Explore remains preserved but disabled and untranslated pending its later rebuild.
- Adds protected action-needed alert classification for routine stay support, actionable bookings, after-hours lost keys, and medical or serious property incidents.
- Adds an official WhatsApp Business Platform delivery adapter with role-based recipient groups, five-minute deduplication, signed webhook handling and ten-minute escalation for unacknowledged urgent or critical alerts.
- Keeps alert recipient names and numbers in one encrypted Worker secret. Stored delivery records contain only recipient labels and salted hashes.
- Adds an owner alert console with delivery status, acknowledgement and resolution controls. Alerts continue to appear there even when WhatsApp credentials are not yet configured.
- Clarifies throughout the guest and owner registration flows that TM30 registration and passport upload apply only to non-Thai guests. Thai nationals do not need to complete this registration.
- Requires an owner to confirm that a registration request is for a non-Thai guest before a private passport link can be created.
- Preserves every secure boundary: passport files never enter AI or WhatsApp, room selection is not identity verification, and the alert channel cannot reveal a spare-key code.

The WhatsApp alert channel is production-ready in code but sends messages only after the official Meta account, approved Utility template and encrypted Cloudflare secrets are configured. See `WHATSAPP_ALERT_OPERATIONS.md`.

## v5.7.0 release focus

- Adds one persistent, easy-to-find language selector across all 41 guest pages and the secure registration form.
- Supports English, Thai, Simplified Chinese, Russian, German, French and Spanish throughout the operational guest journey: welcome, rooms, House information, practical information, help and emergencies, departure, secure registration and concierge controls.
- Deliberately leaves Explore page content and structured Explore records in English until the planned Explore rebuild; the shared header and concierge remain language-aware there.
- Removes Explore from the live guest navigation and redirects direct Explore page visits to the welcome page while keeping all source pages, records and assets intact behind the `EXPLORE_ENABLED` feature switch.
- Keeps the protected owner operations dashboard in English and never sends its text to the translation service.
- Gives navigation, actions, emergency labels, concierge controls and passport privacy/status wording reviewed built-in translations.
- Translates longer approved operational content through a protected Worker endpoint and stores each approved result in a shared Durable Object cache, avoiding repeated model charges for the same text.
- Limits the translation endpoint to approved public project text, excludes guest chat messages and uses OpenAI Responses with strict structured output and `store: false`.
- Makes the concierge respect the guest's explicitly selected language, including deterministic approved answers.
- Adds a compact mobile menu so the full navigation and language control remain available on phones.
- Retains all v5.6.2 concierge recommendations, registration reliability and contact-routing safeguards.
- For accidents and urgent medical situations, consistently offers Koh Tao Rescue first and Thailand's national medical emergency number 1669 second.

Explore can be restored later by setting the Cloudflare Worker variable `EXPLORE_ENABLED` to `true` and redeploying after the rebuilt content has been reviewed.

## v5.6.2 release focus

- Connects the server-side concierge to targeted records from all existing approved Activities, Restaurants, Cafés, Beaches, Bars and Shopping data.
- Adds a concise approved Roctopus Dive recommendation focused on why The House recommends the team: friendly professional service, small groups, personal attention and a welcoming experience. Diving details are left to the team in the shop.
- Retains Bamboo Beach Bar as the direct approved relaxed beachfront-sunset recommendation.
- Adds a final server-side safeguard that replaces technical Roctopus wording in general recommendations with the approved guest-facing answer.
- Standardizes the desktop top bar across every guest page so legacy page CSS no longer changes its width, spacing or navigation wrapping.
- Fixes the Required Registration button so private access remains available after a same-tab refresh and ordinary room pages show a clear security explanation instead of appearing unresponsive.
- Raises the configured GPT-5.6 reasoning effort from low to medium while limiting retrieval to the most relevant records for cost control.
- Adds a prominent Required Guest Registration section to the main and room-specific welcome pages, plus a concierge action that uses the active private room-bound registration link.
- Makes the private Room welcome link activate the registration button directly, so guests continue to the secure one-time form rather than opening WhatsApp.
- Presents both intended registration choices on the secure page: passport-image upload is active; secure manual entry remains visibly pending until the authoritative TM30 field list is supplied.
- Removes private commercial terminology from every guest-facing booking answer and adds a server-side disclosure guard.
- Adds a protected server-side OpenAI Responses API integration using strict structured output.
- Gives the model all approved accommodation knowledge while retaining deterministic safety rules and an on-device fallback engine.
- Supports natural guest phrasing, multilingual answers and short contextual follow-up conversations.
- Adds persistent, privacy-minimized interaction metrics, guest feedback and a controlled learning queue.
- Adds a private owner review interface at `/concierge-admin` where corrections can be edited, approved and activated immediately.
- Adds private one-time passport-image requests for required TM30 guest registration, with an owner reminder queue and guest-friendly privacy explanation.
- Stores passport images outside the AI system in a private R2 bucket, with authenticated owner retrieval, immediate deletion and scheduled 14-day removal.
- Keeps model-produced links and contacts out of the public interface; buttons continue to use centralized Su/Fah and emergency routing.
- Preserves Room 7, the 19:30–10:30 Bangkok-time after-hours rule and the secure spare-key boundary established in v5.4.0.
- Continues to defer Explore expansion while real guest concierge usage is established.

## Working concierge

The concierge loads approved content from `public/data/concierge-knowledge.json`. High-confidence and safety-critical questions use deterministic answers. Other questions use the server-side model when `OPENAI_API_KEY` is configured.

The model receives approved House knowledge, relevant existing project records and optional owner-approved additions. It is instructed to answer in the guest's language, use conversation context and admit when an answer is not confirmed. Unsupported recommendations are not invented.

If the API key is missing, an upstream request fails or output does not match the required schema, the device-safe deterministic engine answers instead. The guest interface therefore remains usable during model outages.

See `CONCIERGE_KNOWLEDGE_GUIDE.md` for the content format and approval workflow.

## Controlled learning

Questions, confidence, routing outcome and feedback are stored in a SQLite-backed Durable Object. Personal identifiers are redacted where detectable, browser session identifiers are hashed, and interaction records are removed after 30 days.

Unknown questions and negative ratings enter a learning queue. The model cannot approve its own answer. An owner reviews each candidate in `/concierge-admin`; an approved correction becomes active immediately and can later be exported into the permanent repository knowledge file.

See `AI_CONCIERGE_OPERATIONS.md` for activation, privacy and daily review procedures.

## Room awareness

Room-specific routes such as `/room/5` set the room automatically. The selected room is remembered locally on the guest's device and included in support handoff messages.

A room number is context, not identity verification. It must never be used on its own to reveal a spare-key code or other protected information.

## Contact routing

Routine requests about the guest's stay use the centralized House support route:

- Telephone URI: `+66640973491`
- WhatsApp: `https://wa.me/66640973491`
- Internal support contact: Su
- Examples: fresh towels, room cleaning, lost keys or lockouts, room supplies, air conditioning, water, Wi-Fi, check-in and checkout

The concierge answers first. When human action is required, it prepares a room-aware WhatsApp handoff to Su.

## Booking routing

Activities and services marked for House-arranged booking must use the centralized The House booking route:

- Telephone URI: `+66962741424`
- WhatsApp: `https://wa.me/66962741424`
- Internal booking contact: Fah

The public interface does not need to name Fah or Su. **Book with Us** and **Contact Us** open the AI Concierge with the appropriate context. Routine page-level House/booking **Call Us** and personal WhatsApp shortcuts are not exposed. Direct operator booking, call, website or social CTAs must not be shown for records marked `the-house-concierge`.

Guest-facing answers must never discuss internal commercial arrangements, referral terms, revenue or how The House may benefit from a booking.

Stay-support requests must never be sent to the booking number, and House-arranged bookings must never be sent to the stay-support number.

## Urgent property emergencies

Major water leaks, flooding, burst pipes, dangerous electrical problems and serious property damage use a separate property-emergency route. This role is designed for 24/7 coverage.

No dedicated on-call person or number has been confirmed yet. The role therefore remains disabled and temporarily falls back to House support without publicly claiming 24/7 availability.

## Verified stays and 24/7 spare keys

Secure self-service lost-key recovery is available at every time of day. Housekeeping and office schedules do not limit this protected operation. Each room has one spare-key box next to its door, and a lost key adds a 500 THB replacement fee. Routine human contact remains an in-hours, last-resort Concierge escalation, but staff assistance is never a prerequisite for the secure flow.

Each active room uses one permanent page. An Airbnb guest enters the HM confirmation code from the trip details; a walk-in or direct guest enters the private House stay code supplied by the owner. The Worker compares only the HMAC hash with the protected reservation for that room and stay period. The secure browser session expires at checkout.

The owner console separates active and upcoming stays. An active stay may be extended to a later checkout date while preserving the current verified session within its security limit. For a walk-in or direct reservation, **Create direct stay** records the room and dates and shows the readable House stay code only once. Copy the generated room link and code to the guest; the database stores only the hash. **Add missing reservation** remains a fallback for an Airbnb booking that did not synchronize automatically.

Key-box codes are deliberately absent from this repository and release archive. Put them only in the encrypted `SPARE_KEY_CODES` Worker secret. Each new lost-key request is bound to the current verified active stay, room and protected session and begins with no accepted fee. Only explicit acceptance for that request permits the Worker to send the protected Su-and-owner notification. At least one recipient delivery must be accepted before the code can appear on the protected guest page. The request is single-use, and display immediately blocks another release until staff physically rotate the code, update the encrypted secret, redeploy and complete the authorized rotation reset. The guest does not approve the notification; the guest confirms only the 500 THB lost-key fee.

See `SECURE_24_HOUR_LOST_KEY_ACCESS.md` and `AIRBNB_AUTOMATION_SETUP.md`.

## Secure passport information

The permanent room page asks the guest to verify the stay once with either the Airbnb HM code or the private House stay code. A verified non-Thai guest can then create a room- and reservation-bound, expiring, single-use passport form automatically. Thai nationals can select the exemption option and do not need this TM30 passport registration. The form explains the TM30 purpose and privacy controls before an image is accepted.

Passport images never enter the AI chat, model prompts, learning queue, WhatsApp messages or public site. They are stored in the private `PASSPORT_UPLOADS` R2 binding and can be downloaded only through the authenticated owner API. The main retention policy is 14 days after upload, with immediate deletion available and a daily application cleanup reinforcing the R2 lifecycle rule.

The prepared Airbnb scheduled-arrival message is the automatic pre-arrival reminder and includes the permanent room page. The owner console shows synchronized stays and registration status and retains a manual link as an emergency fallback. The manual TM30-details alternative remains disabled because the exact authoritative field list has not been supplied; no fields were guessed. See `PASSPORT_DATA_OPERATIONS.md`.

## Production activation

The model-powered layer requires `OPENAI_API_KEY`. Owner operations require `CONCIERGE_ADMIN_TOKEN`, and `CONCIERGE_HASH_SALT` is strongly recommended. Verified stays require `STAY_TOKEN_PEPPER`; automatic Airbnb ingestion additionally requires `RESERVATION_SYNC_TOKEN`. Secure passport forms and optional maintenance photos require the private `the-house-passport-uploads` R2 bucket and `PASSPORT_TOKEN_PEPPER`. Configure R2 lifecycle deletion after 14 days for `passport/` and after 30 days for `maintenance/`. Spare-key release additionally requires the encrypted `SPARE_KEY_CODES` JSON secret and the official WhatsApp values documented in `WHATSAPP_ALERT_OPERATIONS.md`. Secret values must never be committed or included in release archives.

The core deterministic concierge works safely before these secrets are configured. Follow `AI_CONCIERGE_OPERATIONS.md` to activate and verify the complete AI and learning workflow.

## Architecture

- Cloudflare Worker entry point: `src/index.js`
- Server-side concierge controller: `src/concierge-api.js`
- Verified-stay, passport-entry and spare-key controller: `src/stay-api.js`
- Verified room-problem reporting controller: `src/maintenance-api.js`
- Deterministic action-needed alert policy: `src/alert-policy.js`
- Protected WhatsApp alert delivery: `src/whatsapp-alerts.js`
- Approved page-translation API: `src/i18n-api.js`
- Approved project-data retrieval: `src/project-knowledge.js`
- Deterministic safety and matching logic: `src/concierge-core.js`
- Persistent learning store: `src/concierge-store.js`
- Automatic Airbnb synchronizer: `airbnb-sync/Code.gs`
- Static application: `public/`
- Structured content: `public/data/`
- Canonical module copies: `public/modules/`
- Enabled modules and platform version: `public/module-registry.js`
- Contact routing: `public/contacts.js`
- Shared booking-link builder: `public/concierge-booking.js`
- Shared action labels: `public/platform-actions.js`
- Concierge configuration: `public/ai-concierge-config.js`
- Concierge matching engine: `public/ai-concierge-engine.js`
- Approved concierge answers: `public/data/concierge-knowledge.json`
- Owner learning review: `public/concierge-admin.html`
- Secure passport guest page: `public/passport-upload.html`
- Passport upload API: `src/passport-api.js`
- Guest problem-report page: `public/report-problem.html`
- WhatsApp alert operations: `WHATSAPP_ALERT_OPERATIONS.md`
- Maintenance report operations: `MAINTENANCE_REPORTING_OPERATIONS.md`

The root public routes remain in place for backwards compatibility. Where a canonical copy also exists under `public/modules/`, the two copies must remain byte-equivalent.

## Development

```sh
npm install
npm run dev
npm test
```

Production packaging is handled through Wrangler:

```sh
npm run deploy
```

Do not deploy from an unverified working tree. Validate JSON, JavaScript, local routes, booking destinations and canonical module copies before release.

## Priority order

The immediate priority is a reliable live concierge and a growing accommodation/stay knowledge base. Further Explore development—including Transport and island recommendations—is deliberately deferred until the operational concierge is working in production.

Transport still requires an authoritative Transport Deep Research document. See `TRANSPORT_RESEARCH_REQUIREMENTS.md`.

## Permanent project documents

- `PROJECT_RULES.md`
- `DEVELOPMENT_GUIDELINES.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `PROJECT_BRIEF.md`
- `AI_CONCIERGE_PRINCIPLES.md`
- `WORK_HANDOVER_PROMPT.md`
- `TRANSPORT_RESEARCH_REQUIREMENTS.md`
- `CONCIERGE_KNOWLEDGE_GUIDE.md`
- `SECURE_24_HOUR_LOST_KEY_ACCESS.md`
- `SECURE_AFTER_HOURS_ACCESS.md` (compatibility pointer)
- `AI_CONCIERGE_OPERATIONS.md`
- `PASSPORT_DATA_OPERATIONS.md`
