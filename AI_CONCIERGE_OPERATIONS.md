# AI Concierge Operations

## Purpose

The v5.11.8 concierge combines six layers:

1. Deterministic safety and operational rules for emergencies, lost keys, fees, booking policy and human routing.
2. Server-side model reasoning over approved House knowledge plus targeted retrieval from the existing Activities, Restaurants, Cafés, Beaches, Bars and Shopping records.
3. A controlled learning queue that records knowledge gaps and negative feedback for owner review.
4. A deterministic action-needed alert channel with protected owner-console delivery and optional official WhatsApp Business Platform notifications.
5. A deterministic verified-stay layer for complete group passport registration, including secure upload or protected in-person handover, and protected after-hours spare-key access, fully separated from model reasoning.
6. A verified room-maintenance layer for routine support, critical incident routing and private optional photo handling, also separated from model reasoning.

The model cannot publish its own facts. An owner must approve or edit every knowledge addition before it becomes active.

The default GPT-5.6 reasoning effort is `medium`. The retrieval layer sends only the most relevant approved records for each question rather than the full data collection, preserving answer quality while controlling input size and cost.

## Required production secrets

Configure secrets on the existing Cloudflare Worker. Never place their values in Git, public JavaScript, JSON, URLs, screenshots or release archives.

## Guest-language operations

v5.11.8 supports English, Thai, Simplified Chinese, Russian, German, French and Spanish for the operational guest journey. Essential navigation, emergency, passport, lost-key, maintenance-reporting, luggage, resource-conservation and concierge controls have reviewed built-in translations. Longer approved operational text is translated through `/api/i18n/translate` using strict structured output with `store: false` and cached in the existing Durable Object. Approved items use recoverable model sub-batches; incomplete groups are split automatically, browser requests retry temporary failures, and overlapping page flushes are prevented. A release audit verifies every static visible string and accessibility label on each live operational page is accepted by the protected endpoint.

The visible concierge thinking state is an animated three-dot indicator rather than an operational status sentence. Venue website or social actions must use approved external URLs. Internal Explore detail paths are excluded from model context while Explore is disabled. Bamboo Beach Bar follow-up questions use the approved Facebook and Instagram actions in `public/data/concierge-knowledge.json`.

- `OPENAI_TRANSLATION_MODEL` defaults to `gpt-5.6`.
- `OPENAI_TRANSLATION_REASONING_EFFORT` defaults to `medium`.
- Only approved public project text may be sent to the translation endpoint.
- Guest-authored chat messages and the owner dashboard are excluded.
- Explore content translation is deferred.

The release sets `EXPLORE_ENABLED=false`. This removes Explore from live navigation and redirects direct Explore routes while preserving every source page, record and asset. Set it to `true` and redeploy only after the later Explore rebuild is reviewed.

For accidents and urgent medical situations, the guest is offered both immediate contacts in a fixed order: Koh Tao Rescue first because the team knows the island and local access points, then Thailand's national medical emergency number 1669.

### `OPENAI_API_KEY`

Required to enable model-powered answers. If it is missing or the model service is temporarily unavailable, the concierge automatically uses its approved deterministic knowledge instead.

### `CONCIERGE_ADMIN_TOKEN`

Required to open `/concierge-admin`. Generate a long random value and give it only to authorized owners. The admin page keeps it in browser session storage and sends it in the authorization header; it is never placed in a URL.

### `CONCIERGE_HASH_SALT`

Strongly recommended. This secret is used when hashing temporary browser-session identifiers before operational analytics are stored.

### `PASSPORT_TOKEN_PEPPER`

Required for private passport-upload links. Use a separate long random secret. Rotation invalidates all outstanding links.

### Verified-stay secrets

`STAY_TOKEN_PEPPER` hashes Airbnb HM codes, direct/walk-in House stay codes and verified-session tokens. `RESERVATION_SYNC_TOKEN` authenticates the Google Apps Script synchronizer. They must be separate long random values.

`SPARE_KEY_CODES` is an encrypted JSON secret containing the current code for each active room. Never place a real value in documentation, source, logs, screenshots or release archives. The key release feature additionally requires a working official WhatsApp `urgent` recipient group.

### Private R2 bucket

Create `the-house-passport-uploads`, keep it non-public and bind it as `PASSPORT_UPLOADS`. Configure a 14-day object lifecycle rule for the `passport/` prefix and a separate 30-day rule for the `maintenance/` prefix. The application cleanup reinforces both deadlines. See `PASSPORT_DATA_OPERATIONS.md` and `MAINTENANCE_REPORTING_OPERATIONS.md`.

### WhatsApp staff alerts

The owner console receives actionable alerts without additional provider configuration. Official WhatsApp delivery requires `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `META_APP_SECRET` and `WHATSAPP_ALERT_RECIPIENTS`. `CONCIERGE_HASH_SALT` is strongly recommended for recipient hashes; when it is absent, the existing Meta app secret is used as the private salt. Keep every value encrypted and follow `WHATSAPP_ALERT_OPERATIONS.md`; never place recipient numbers in Git or release archives.

## Optional configuration

### `OPENAI_VECTOR_STORE_ID`

Optional. When configured, the model may search an OpenAI vector store containing approved concierge documents. Do not upload raw guest chats, key-box codes, private stay tokens, credentials, passport data or unapproved research.

The core accommodation knowledge is already supplied directly from `public/data/concierge-knowledge.json`, so the AI can operate without a vector store.

## Activation

1. Add the required production secrets for the features being activated to the existing Cloudflare Worker.
2. Deploy the verified release.
3. Open `/api/concierge/status` and confirm `aiConfigured` and `learningEnabled` are `true`.
4. Test check-in, Wi-Fi, room cleaning, lost key, booking, property emergency and medical emergency flows.
5. Open `/concierge-admin`, enter the private admin token and verify that the review screen loads.
6. Test one unknown question, submit negative feedback and confirm that it enters the learning queue.
7. Edit and approve a safe test answer, then confirm that the concierge uses it immediately.
8. Verify the passport flow with a non-sensitive test image before requesting any real document.
9. Follow `AIRBNB_AUTOMATION_SETUP.md`, run the first reservation sync and confirm its diagnostic property is blank.
10. Verify a future reservation from its correct permanent room page and confirm the same code fails for another room.
11. Confirm the verified foreign-guest flow offers secure upload and in-person presentation; the in-person route must stay locked until protected owner confirmation. Confirm the all-Thai-overnight-guests option closes the reminder and revokes unused pending upload links.
12. Open the owner alert console and test a support, booking, urgent and emergency alert with non-sensitive text.
13. Test spare-key release with a temporary key-box code. Confirm that an unverified, expired or wrong-room session is rejected, that the guest must deliberately accept the 500 THB fee, and that the system automatically submits a Su-and-owner WhatsApp message before display. Confirm that neither the stay code nor key-box code appears in the alert or operational storage.
14. Rotate the physical test code, update the encrypted secret, redeploy and confirm rotation in the owner console.
15. Create a non-sensitive direct test stay, copy its room link and one-time House code, verify it on the correct room and confirm it fails on another room.
16. Extend an active test stay and confirm the new checkout appears in the Active stays section without requiring the guest to register again.
17. Submit one routine and one critical maintenance report. Confirm the critical report requires a reply number, that the number is present only in the protected WhatsApp payload, and that optional image download and deletion work from the owner console.

## Daily learning workflow

The application automatically:

- records sanitized questions and response metadata;
- groups repeated gaps into learning candidates;
- counts negative feedback and repeated occurrences;
- prioritizes the most common or poorly answered questions;
- keeps owner-approved answers active without requiring a code deployment.

An authorized owner should review the queue regularly:

1. Check the guest question against approved House information or authoritative uploaded research.
2. Replace any model draft or fallback text with the exact approved answer.
3. Select the correct intent and category.
4. Approve and activate, or reject the candidate.
5. Export approved additions periodically so they can be included in a later repository release.

## Privacy and retention

- The browser sends at most the last ten short conversation items for contextual follow-ups.
- Conversation history is kept in session storage and ends with the browser session.
- Email addresses, telephone-like numbers, URLs and common booking/passport identifiers are redacted before operational logging.
- Raw browser session identifiers are never stored; only a one-way hash is kept.
- Interaction and feedback records are automatically removed after 30 days.
- Approved knowledge and learning candidates remain until reviewed or deactivated because they are operational content, not a guest conversation archive.
- The OpenAI request uses `store: false`.
- Passport images are handled by a separate private API and R2 bucket. They never enter model prompts, interaction records or the learning queue.
- Staff-alert descriptions are independently sanitized, and recipient numbers are never written to the operational database.
- Guest reply contacts for critical maintenance incidents are added only to the transient protected WhatsApp payload and are never written to the maintenance or alert database.
- Optional maintenance photos remain in private R2 storage, never enter AI or public assets and are deleted within 30 days or sooner after owner deletion.

Guests are told not to enter passport, payment or key-box information in the concierge.

## Safety invariants

- Room selection and a permanent room URL are context, not identity verification. Protected access requires a matching Airbnb HM code or private House stay code for the room and dates.
- Thai nationals do not require the TM30 passport-registration flow; the owner must confirm a request is for a non-Thai guest.
- No key-box code or protected token enters the model prompt or learning store.
- A spare-key request requires the existing secure session to remain bound to the same active reservation and room. The guest deliberately opens the lost-key flow and accepts the 500 THB fee in two steps, but does not repeat the stay code.
- Direct/walk-in codes are readable only in the authorized creation response and are persisted only as HMAC hashes. An extension may only move checkout later.
- Maintenance criticality, recipient group and room are deterministic server decisions, never model output. Critical guest reply contact remains transient.
- Lost-key handling always includes the 500 THB replacement fee.
- Property and medical emergencies bypass generative answers when a protected intent is detected.
- House-arranged bookings always route through The House booking contact.
- Guest answers never discuss internal commercial arrangements, referral terms or revenue.
- Routine stay requests always use House support.
- Model-produced links and telephone numbers are never trusted; guest action buttons are generated only from centralized application routes.
- When approved facts are missing, the correct output is uncertainty plus a human handoff—not an invented answer.

## Failure behavior

The guest concierge remains useful if the AI key is absent, the API is unavailable or a response fails schema validation. In those situations it uses the approved deterministic engine and human handoff routes. No raw upstream error or credential is shown to guests.
