# Guest Guide Platform with AI Concierge — The House v5.11.15

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

The public interface does not need to name Fah or Su. Generic labels such as **Book with Us**, **Contact Us** and **Call Us** are approved. Direct operator booking, call, website or social CTAs must not be shown for records marked `the-house-concierge`.

Guest-facing answers must never discuss internal commercial arrangements, referral terms, revenue or how The House may benefit from a booking.

Stay-support requests must never be sent to the booking number, and House-arranged bookings must never be sent to the stay-support number.

## Urgent property emergencies

Major water leaks, flooding, burst pipes, dangerous electrical problems and serious property damage use a separate property-emergency route. This role is designed for 24/7 coverage.

No dedicated on-call person or number has been confirmed yet. The role therefore remains disabled and temporarily falls back to House support without publicly claiming 24/7 availability.

## Verified stays and after-hours spare keys

After hours are 19:30–10:30 in the `Asia/Bangkok` time zone. Each room will have one spare-key box next to its door, and a lost key adds a 500 THB replacement fee.

Each active room uses one permanent page. An Airbnb guest enters the HM confirmation code from the trip details; a walk-in or direct guest enters the private House stay code supplied by the owner. The Worker compares only the HMAC hash with the protected reservation for that room and stay period. The secure browser session expires at checkout.

The owner console separates active and upcoming stays. An active stay may be extended to a later checkout date while preserving the current verified session within its security limit. For a walk-in or direct reservation, **Create direct stay** records the room and dates and shows the readable House stay code only once. Copy the generated room link and code to the guest; the database stores only the hash. **Add missing reservation** remains a fallback for an Airbnb booking that did not synchronize automatically.

Key-box codes are deliberately absent from this repository and release archive. Put them only in the encrypted `SPARE_KEY_CODES` Worker secret. Automatic release activates only when the production official WhatsApp alert channel has at least one protected urgent recipient. The Worker sends the owner/Su notification automatically and waits for the WhatsApp API to confirm submission, records the event, shows the code only to the verified guest and then blocks another release until staff rotate the physical code. The guest does not approve the notification; the guest confirms only the 500 THB lost-key fee.

See `SECURE_AFTER_HOURS_ACCESS.md` and `AIRBNB_AUTOMATION_SETUP.md`.

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
- `SECURE_AFTER_HOURS_ACCESS.md`
- `AI_CONCIERGE_OPERATIONS.md`
- `PASSPORT_DATA_OPERATIONS.md`
