# Guest Guide Platform with AI Concierge — The House v5.8.2

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

## After-hours spare keys

After hours are 19:30–10:30 in the `Asia/Bangkok` time zone. Each room will have one spare-key box next to its door, and a lost key adds a 500 THB replacement fee.

Key-box codes are not included in this release. Secure delivery remains disabled until guest verification and protected server-side secrets are configured. See `SECURE_AFTER_HOURS_ACCESS.md`.

The protected WhatsApp Business Platform alert adapter can notify configured owners and Su when its production account, template and secrets are enabled. It never includes a key-box code or private stay token. Secure spare-key delivery itself remains disabled; Fah remains the separate booking contact.

## Secure passport information

Owners can create a room-bound, expiring, single-use private Room welcome link from `/concierge-admin` when a non-Thai guest did not supply the required passport information before arrival. Thai nationals do not need this TM30 registration or passport upload. The owner must confirm that the request concerns a non-Thai guest. Its registration button opens the secure form directly, where the TM30 purpose and privacy controls are explained before an image is accepted.

Passport images never enter the AI chat, model prompts, learning queue, WhatsApp messages or public site. They are stored in the private `PASSPORT_UPLOADS` R2 binding and can be downloaded only through the authenticated owner API. The main retention policy is 14 days after upload, with immediate deletion available and a daily application cleanup reinforcing the R2 lifecycle rule.

The owner page identifies pending and overdue requests and creates a guest-friendly reminder to copy into the existing conversation. Automatic pre-arrival reminders remain separate from the new staff-alert channel because they require approved guest-contact and stay-arrival data. The manual TM30-details alternative remains disabled because the exact authoritative field list has not been supplied; no fields were guessed. See `PASSPORT_DATA_OPERATIONS.md`.

## Production activation

The model-powered layer requires the server-side `OPENAI_API_KEY` secret. The private learning and alert review requires `CONCIERGE_ADMIN_TOKEN`, and `CONCIERGE_HASH_SALT` is strongly recommended for session and recipient pseudonymization. Secure passport links also require the private `the-house-passport-uploads` R2 bucket and `PASSPORT_TOKEN_PEPPER`. WhatsApp delivery additionally requires the encrypted values documented in `WHATSAPP_ALERT_OPERATIONS.md`. Secret values must never be committed or included in release archives.

The core deterministic concierge works safely before these secrets are configured. Follow `AI_CONCIERGE_OPERATIONS.md` to activate and verify the complete AI and learning workflow.

## Architecture

- Cloudflare Worker entry point: `src/index.js`
- Server-side concierge controller: `src/concierge-api.js`
- Deterministic action-needed alert policy: `src/alert-policy.js`
- Protected WhatsApp alert delivery: `src/whatsapp-alerts.js`
- Approved page-translation API: `src/i18n-api.js`
- Approved project-data retrieval: `src/project-knowledge.js`
- Deterministic safety and matching logic: `src/concierge-core.js`
- Persistent learning store: `src/concierge-store.js`
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
- WhatsApp alert operations: `WHATSAPP_ALERT_OPERATIONS.md`

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
