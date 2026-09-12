# THE HOUSE – KOH TAO
## Development Handoff — v5.11.56 Unified Guest Messaging (Beds24 + WhatsApp)

### Authoritative baseline

Built directly on v5.11.55. This release introduces a new messaging layer without changing the existing reservation, registration, housekeeping, maintenance, Finance, lost-key or staff-alert contracts.

### Architecture

OTA path:

`Airbnb / Booking.com / Expedia / Vrbo -> Beds24 -> Beds24 booking webhook -> House Worker -> Unified Inbox / AI Concierge -> Beds24 Message API -> original OTA conversation`

WhatsApp path:

`Guest WhatsApp -> existing Meta webhook -> House Worker -> Unified Inbox / AI Concierge -> Meta Cloud API -> guest WhatsApp`

The internal unified thread is channel-neutral enough to support additional connectors later, but v5.11.56 only activates the Beds24 and direct WhatsApp adapters described above.

### New server module

`src/unified-messaging.js`

Responsibilities:

- unified-messaging configuration state;
- explicit Beds24 room mapping;
- Beds24 source labeling and supported-message-channel boundary;
- API V2 access-token acquisition/caching;
- conservative token refresh maintenance;
- booking/message retrieval and OTA reply submission;
- full Beds24 thread synchronization into local messaging records;
- AI trigger only when the newest actual conversation message is a newly received guest message;
- no AI response when a host reply is already newer than the guest message;
- WhatsApp guest ingestion and outbound guest text replies;
- reservation/room linking;
- owner Admin thread APIs;
- per-thread AI pause state;
- provider delivery state updates.

### Durable Object additions

`src/concierge-store.js`

New tables:

- `messaging_threads`
- `messaging_messages`
- `messaging_provider_state`

`messaging_provider_state` caches only short-lived provider access-token state. The Beds24 refresh token is never persisted there and remains an environment secret.

Messages are provider-ID deduplicated. The Admin message reader selects the most recent message window and then returns that window chronologically, so long threads do not become stuck showing only their oldest messages.

### Beds24 authentication

API base:

`https://beds24.com/api/v2`

v5.11.56 uses the API V2 refresh-token flow:

1. `BEDS24_REFRESH_TOKEN` is supplied as a Cloudflare secret.
2. Worker requests an access token from `GET /authentication/token` with the `refreshToken` header.
3. Access token is cached in Durable Object provider state until shortly before expiry.
4. A failed authenticated request may force one token refresh and retry.
5. The existing daily scheduled task also touches authentication so an actively configured refresh token does not become idle.

Recommended Beds24 API V2 scopes for this feature:

- `read:bookings`
- `read:bookings-personal`
- `write:bookings-personal`

`bookings-personal` is required for guest personal data and `/bookings/messages`.

### Beds24 webhook

New route:

`POST /api/messaging/beds24/webhook`

Authentication:

`x-house-beds24-webhook-token: <BEDS24_WEBHOOK_TOKEN>`

A query-string token is accepted as a compatibility fallback, but the custom header is the preferred production setup.

On notification the Worker:

1. validates the shared webhook token;
2. gets the current Beds24 booking and message thread;
3. rejects unsupported messaging channels without inventing support;
4. explicitly maps the Beds24 room ID to a House room;
5. attempts conservative local reservation linking;
6. synchronizes all textual messages not already stored;
7. checks the newest host/guest conversation message;
8. only invokes the AI when that newest conversation message is a newly inserted guest message.

This prevents a delayed webhook from generating an AI response after the host has already answered.

### Beds24 room mapping

`BEDS24_ROOM_MAP` is JSON with Beds24 room IDs as keys and House room numbers as values, for example:

```json
{
  "771001": "1",
  "771002": "2",
  "771003": "3"
}
```

Only House Rooms 1–11 are accepted. There is intentionally no fallback such as assuming Beds24 room ID `7` means House Room 7.

### WhatsApp

The existing `/api/whatsapp/webhook` remains the only Meta webhook route.

`src/index.js` supplies two optional messaging callbacks to the existing webhook handler:

- guest inbound message -> `handleInboundWhatsAppGuestMessage`
- Meta delivery status -> `handleWhatsAppMessagingStatus`

`src/whatsapp-alerts.js` remains authoritative for signature validation and owner/Su quick actions. Configured staff senders continue through the existing alert-action path and are never ingested as guest conversations.

Unknown guest phone numbers are not trusted as stay identity. The connector may attempt one unambiguous current/future Beds24 phone match, but reservation-specific AI access is withheld if the match is absent or ambiguous.

### AI safety / rollout mode

Three independent states matter:

- `UNIFIED_MESSAGING_ENABLED` — inbox/connector feature switch.
- `UNIFIED_MESSAGING_AI_REPLY_ENABLED` — allow the House Concierge to generate a reply for a safely linked reservation.
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED` — allow routine approved AI replies to leave the system automatically.

v5.11.56 ships with:

```json
"UNIFIED_MESSAGING_ENABLED": "true",
"UNIFIED_MESSAGING_AI_REPLY_ENABLED": "true",
"UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED": "false"
```

Therefore, once `UNIFIED_MESSAGING_INTERNAL_TOKEN` is configured, routine AI answers are stored as drafts for owner review instead of being sent. Sensitive/protected topics also remain drafts/review-required even when auto-send is later enabled.

The internal token is used only for a trusted server-to-server call into the existing House Concierge so the reply can use the linked reservation context without weakening public stay verification.

### Owner Admin

New section: **Unified Guest Messaging**

Includes:

- configuration/status pills;
- guest/source/room/date thread list;
- unread count;
- review indicator;
- chronological conversation display;
- AI draft display;
- manual reply form;
- Pause AI / Resume AI.

Manual replies go back through Beds24 or Meta depending on the original thread channel.

### Files changed

- `src/unified-messaging.js` (new feature module)
- `src/index.js`
- `src/concierge-api.js`
- `src/concierge-store.js`
- `src/whatsapp-alerts.js`
- `public/concierge-admin.html`
- `public/concierge-admin.js`
- `public/concierge-admin.css`
- `public/i18n.js`
- `public/ai-concierge-config.js`
- `public/module-registry.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `wrangler.jsonc`
- `tests/concierge.test.mjs`
- `package.json`
- `package-lock.json`
- `CHANGELOG.md`
- `RELEASE_NOTES_v5.11.56.md`
- `BEDS24_UNIFIED_MESSAGING_SETUP_v5.11.56.md`

### Validation completed before packaging

- Full automated regression suite: **288 passed / 0 failed**.
- JavaScript/MJS syntax validation: **46 files passed**.
- Google Apps Script syntax validation passed.
- **12 JSON** files parsed successfully and `wrangler.jsonc` parsed successfully.
- Package/version metadata consistency passed.
- Beds24 connector secret-hygiene check passed: no live Beds24 refresh token, webhook token, room map or internal messaging token is committed in `wrangler.jsonc`.
- Final ZIP integrity is checked after archive creation.

### Production rollout order

1. Deploy v5.11.56 with AI auto-send still false.
2. Create/configure Beds24 and connect only the channels actually wanted for The House.
3. Add Beds24/AI internal secrets in Cloudflare.
4. Add the explicit Beds24 room mapping.
5. Configure the Beds24 V2 booking webhook with the custom authentication header.
6. Send test Airbnb/Beds24 and WhatsApp guest messages.
7. Confirm reservation linking, inbox display and outbound manual replies.
8. Review AI drafts against real guest questions.
9. Only after deliberate approval, consider turning AI auto-send on for routine messages.
