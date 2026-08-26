# Changelog

All notable changes to The House – Koh Tao guest guide are recorded here.

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
