# AI Concierge Operations

## Purpose

The v5.6.2 concierge combines three layers:

1. Deterministic safety and operational rules for emergencies, lost keys, fees, booking policy and human routing.
2. Server-side model reasoning over approved House knowledge plus targeted retrieval from the existing Activities, Restaurants, Cafés, Beaches, Bars and Shopping records.
3. A controlled learning queue that records knowledge gaps and negative feedback for owner review.

The model cannot publish its own facts. An owner must approve or edit every knowledge addition before it becomes active.

The default GPT-5.6 reasoning effort is `medium`. The retrieval layer sends only the most relevant approved records for each question rather than the full data collection, preserving answer quality while controlling input size and cost.

## Required production secrets

Configure secrets on the existing Cloudflare Worker. Never place their values in Git, public JavaScript, JSON, URLs, screenshots or release archives.

### `OPENAI_API_KEY`

Required to enable model-powered answers. If it is missing or the model service is temporarily unavailable, the concierge automatically uses its approved deterministic knowledge instead.

### `CONCIERGE_ADMIN_TOKEN`

Required to open `/concierge-admin`. Generate a long random value and give it only to authorized owners. The admin page keeps it in browser session storage and sends it in the authorization header; it is never placed in a URL.

### `CONCIERGE_HASH_SALT`

Strongly recommended. This secret is used when hashing temporary browser-session identifiers before operational analytics are stored.

### `PASSPORT_TOKEN_PEPPER`

Required for private passport-upload links. Use a separate long random secret. Rotation invalidates all outstanding links.

### Private R2 bucket

Create `the-house-passport-uploads`, keep it non-public and bind it as `PASSPORT_UPLOADS`. Configure a 14-day object lifecycle rule for the `passport/` prefix as the main storage-retention rule. The application cleanup reinforces the same deadline. See `PASSPORT_DATA_OPERATIONS.md`.

## Optional configuration

### `OPENAI_VECTOR_STORE_ID`

Optional. When configured, the model may search an OpenAI vector store containing approved concierge documents. Do not upload raw guest chats, key-box codes, private stay tokens, credentials, passport data or unapproved research.

The core accommodation knowledge is already supplied directly from `public/data/concierge-knowledge.json`, so the AI can operate without a vector store.

## Activation

1. Add the three production secrets to the existing Cloudflare Worker.
2. Deploy the verified release.
3. Open `/api/concierge/status` and confirm `aiConfigured` and `learningEnabled` are `true`.
4. Test check-in, Wi-Fi, room cleaning, lost key, booking, property emergency and medical emergency flows.
5. Open `/concierge-admin`, enter the private admin token and verify that the review screen loads.
6. Test one unknown question, submit negative feedback and confirm that it enters the learning queue.
7. Edit and approve a safe test answer, then confirm that the concierge uses it immediately.
8. Verify the passport flow with a non-sensitive test image before requesting any real document.
9. Confirm the owner-created private Room welcome link activates “Complete Required Registration” and opens the secure form directly without a WhatsApp handoff.

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

Guests are told not to enter passport, payment or key-box information in the concierge.

## Safety invariants

- Room selection is context, not identity verification.
- No key-box code or protected token enters the model prompt or learning store.
- Lost-key handling always includes the 500 THB replacement fee.
- Property and medical emergencies bypass generative answers when a protected intent is detected.
- House-arranged bookings always route through The House booking contact.
- Guest answers never discuss internal commercial arrangements, referral terms or revenue.
- Routine stay requests always use House support.
- Model-produced links and telephone numbers are never trusted; guest action buttons are generated only from centralized application routes.
- When approved facts are missing, the correct output is uncertainty plus a human handoff—not an invented answer.

## Failure behavior

The guest concierge remains useful if the AI key is absent, the API is unavailable or a response fails schema validation. In those situations it uses the approved deterministic engine and human handoff routes. No raw upstream error or credential is shown to guests.
