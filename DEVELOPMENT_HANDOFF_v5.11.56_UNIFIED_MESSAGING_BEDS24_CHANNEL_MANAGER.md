# THE HOUSE – KOH TAO
## Development Handoff — v5.11.56 Unified Messaging + Beds24 Channel Manager

### Authoritative baseline

Built directly on v5.11.55, with the previously completed v5.11.56 Unified Guest Messaging work retained and the Beds24 channel-manager bridge added on top.

This release is ready to push as code, but **Beds24 must not become the production booking authority merely by deploying it**. The committed release intentionally keeps:

```json
"UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED": "false",
"BEDS24_CHANNEL_MANAGER_ENABLED": "false"
```

Until Beds24 is fully configured and tested, the existing House Airbnb synchronization remains authoritative.

### Release architecture

Unified messaging path:

`Airbnb / Booking.com / Expedia / Vrbo -> Beds24 -> House Worker -> Unified Inbox / AI draft -> owner reply -> Beds24 -> original OTA conversation`

Direct WhatsApp path:

`Guest WhatsApp -> existing signed Meta webhook -> House Worker -> Unified Inbox / AI draft -> owner reply -> Meta Cloud API -> guest WhatsApp`

Channel-manager reservation path after deliberate activation:

`OTA reservation event -> Beds24 booking webhook -> explicit room/source normalization -> House canonical reservation model`

House Direct path after deliberate activation:

`Owner Direct booking -> local overlap check -> Beds24 central availability check -> Beds24 booking creation -> House canonical reservation creation/link`

Direct extension path after deliberate activation:

`Owner extension -> local overlap preflight -> Beds24 availability for added nights -> Beds24 departure update -> House local extension`

### 1. Unified Guest Messaging

`src/unified-messaging.js` provides:

- unified messaging configuration state;
- Beds24 API V2 access-token acquisition/caching;
- explicit Beds24 room mapping;
- source labeling and OTA messaging support boundary;
- booking/message retrieval and OTA reply submission;
- complete thread synchronization and provider-message deduplication;
- AI trigger only when the newest actual conversation message is a newly inserted guest message;
- no AI response when a host reply is already newer;
- WhatsApp guest ingestion and outbound guest text replies;
- conservative reservation linking;
- per-thread AI pause/resume;
- delivery-state updates;
- protected-topic human review.

Unified OTA messaging is intentionally claimed only for:

- Airbnb
- Booking.com
- Expedia
- Vrbo

Agoda, Hostelworld and Trip.com are supported as reservation-source labels in the channel-manager reservation model, but this release does **not** claim Beds24 unified messaging support for those three providers.

### 2. Beds24 Channel Manager module

New module:

`src/beds24-channel-manager.js`

Responsibilities:

- strict `BEDS24_CHANNEL_MANAGER_ENABLED` gate;
- reverse House Room -> Beds24 room resolution from the same explicit mapping used by messaging;
- complete one-to-one Room 1–11 mapping readiness validation;
- Beds24 reservation source normalization;
- central availability checks through API V2 inventory availability;
- provider-first Direct booking creation;
- provider-first Direct extension update;
- Direct cancellation propagation;
- Beds24 OTA booking/modification/cancellation ingestion;
- retry queue processing;
- rolling reservation reconciliation.

No channel-manager function assumes a Beds24 room ID equals the House room number.

### 3. Central availability / double-booking protection

When `BEDS24_CHANNEL_MANAGER_ENABLED=false`, the existing House behavior is preserved.

When deliberately enabled and fully configured, a House Direct booking follows this order:

1. validate House room/dates;
2. retain the existing House local-overlap guard;
3. query Beds24 central availability for every booked night;
4. fail closed if the Beds24 bridge is not ready or any night is unavailable;
5. create the booking in Beds24 first;
6. create the House local canonical reservation only after Beds24 succeeds;
7. link the local reservation to the Beds24 booking ID.

This ordering is intentional: once Beds24 is the enabled channel manager, connected OTA inventory can close centrally before The House considers the Direct booking committed locally.

If Beds24 creation succeeds but the local House creation/link fails, the system queues an orphan-cancellation compensation job rather than leaving the failure untracked.

### 4. Direct extension protection

For a linked owner-managed Direct/manual stay after channel-manager activation:

1. load the current local reservation;
2. enforce the existing House overlap guard;
3. require a Beds24 link;
4. check Beds24 availability only for the additional nights, beginning at the current checkout;
5. update the Beds24 departure date;
6. only then extend the local House checkout date.

If Beds24 reports the new nights unavailable or the provider update fails, the local extension is not committed.

### 5. Cancellation propagation and retry

For a linked owner-managed stay:

- the House local cancellation remains owner-controlled;
- the corresponding Beds24 booking is cancelled;
- if the provider call fails, a durable retry is queued;
- retries are processed from the existing hourly scheduled task with bounded backoff;
- local inventory is not falsely represented as synchronized while the provider cancellation is pending.

Provider-first creation plus central availability checks mean a pending provider cancellation leaves Beds24 inventory conservatively closed rather than risking a second booking.

### 6. OTA reservation ingestion

The authenticated Beds24 booking webhook can feed booking state into the House canonical reservation model when the channel-manager flag is enabled.

Supported reservation-source preservation:

- Airbnb -> `airbnb`
- Booking.com -> `booking.com`
- Expedia -> `expedia`
- Vrbo -> `vrbo`
- Agoda -> `agoda`
- Hostelworld -> `hostelworld`
- Trip.com -> `trip.com`
- unknown Beds24 source -> `beds24`

Booking create/modify/cancel events use the external Beds24 booking link where known and update the canonical House reservation instead of creating duplicate local identities. Cancellation also revokes the affected verified guest session state through the canonical store path.

### 7. Durable Object additions

`src/concierge-store.js` retains the Unified Messaging tables and adds channel-manager state:

- `beds24_reservation_links`
- `beds24_channel_retries`

The link table binds a House canonical reservation to its Beds24 booking/room identity. The retry table stores synchronization operations and bounded retry state; it does not store provider credentials.

### 8. Scheduled maintenance

Existing scheduling is preserved and extended only for Beds24 when the feature is enabled:

- hourly: process Beds24 channel-manager retry jobs alongside the existing hourly work;
- daily: reconcile a rolling Beds24 reservation window alongside existing maintenance/authentication tasks.

Both paths no-op while `BEDS24_CHANNEL_MANAGER_ENABLED=false`.

### 9. Beds24 API V2 authentication and scopes

API base:

`https://beds24.com/api/v2`

The Worker uses `BEDS24_REFRESH_TOKEN` to obtain short-lived API V2 tokens and caches only the short-lived access-token state in the Durable Object.

The live credential should be created with the methods/scopes required by this release:

- `read:bookings`
- `write:bookings`
- `read:bookings-personal`
- `write:bookings-personal`
- `read:inventory`

`bookings` covers booking read/write, `bookings-personal` is required for guest personal/message access, and `inventory` is required for availability checks. Do not grant unrelated scopes unless a later release needs them.

### 10. Required production-only configuration

Do not commit live values to GitHub. Configure only in Cloudflare/production setup:

- `BEDS24_REFRESH_TOKEN`
- `BEDS24_WEBHOOK_TOKEN`
- `BEDS24_ROOM_MAP`
- `UNIFIED_MESSAGING_INTERNAL_TOKEN`

The booking webhook route remains:

`POST /api/messaging/beds24/webhook`

Preferred authentication header:

`x-house-beds24-webhook-token: <BEDS24_WEBHOOK_TOKEN>`

### 11. Explicit Beds24 <-> House room mapping

`BEDS24_ROOM_MAP` is JSON with **real Beds24 room IDs as keys** and House Rooms 1–11 as values.

Production readiness requires all 11 House rooms to be represented exactly once. Example IDs in documentation are placeholders only.

There is no fallback that treats a Beds24 numeric ID as a House room number.

### 12. AI safety and review mode

The release ships with:

```json
"UNIFIED_MESSAGING_ENABLED": "true",
"UNIFIED_MESSAGING_AI_REPLY_ENABLED": "true",
"UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED": "false"
```

Do not enable AI auto-send as part of Beds24 setup. v5.11.56 is a human-review release: routine AI responses may be prepared as drafts after the internal token is configured, while protected topics always require human review.

### 13. Owner Admin

Unified Guest Messaging includes:

- source/guest/room/date thread list;
- unread/review state;
- chronological thread view;
- AI drafts;
- owner manual reply;
- Pause AI / Resume AI;
- delivery status for WhatsApp where available.

Manual replies stay on the original provider channel.

### 14. Files changed for the v5.11.56 integration

Unified Messaging and Channel Manager changes include:

- `src/unified-messaging.js`
- `src/beds24-channel-manager.js` (new)
- `src/index.js`
- `src/concierge-api.js`
- `src/concierge-store.js`
- `src/stay-api.js`
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
- `DEVELOPMENT_HANDOFF_v5.11.56_UNIFIED_MESSAGING_BEDS24_CHANNEL_MANAGER.md`
- `VALIDATION_RESULTS_v5.11.56.md`

### 15. Protected boundaries / deliberate non-changes

Do not use this release to alter:

- passport / Thai-ID / TM30;
- Finance;
- housekeeping / room status;
- maintenance;
- lost-key / spare-key policy;
- approved Meta templates or existing staff alert behavior;
- unrelated Concierge/guide behavior.

Deferred Taoedge commercial-demo issues remain deferred, including the demo-only room-issue prompt, fictional room directions and fictional local recommendation/booking-flow presentation.

### 16. Automated tests added for Channel Manager

Nine channel-manager regressions extend the previous v5.11.56 Unified Messaging suite from 288 to **297 tests**. They verify:

1. the channel manager remains disabled by default and no live credentials are committed;
2. Room 1–11 mapping is explicit and one-to-one;
3. all seven required reservation sources are preserved;
4. central availability requires every booked night to be available;
5. readiness requires the flag, credentials and complete room map;
6. Direct booking checks Beds24 availability before creating the Beds24 booking;
7. Direct extension checks only added nights and updates Beds24 first;
8. authenticated webhook booking ingestion writes the canonical reservation with explicit room/provider source;
9. source-level safety contract retains central protection/retry/reconciliation behavior while AI auto-send and the channel-manager production flag remain false.

### 17. Final validation

- Full automated source suite: **297 passed / 0 failed**.
- JavaScript/MJS syntax: **47 files passed**.
- Google Apps Script syntax: passed.
- JSON: **12 files parsed successfully**.
- `wrangler.jsonc`: JSONC parsing and structural Wrangler configuration validation passed (entry point/assets, Durable Object binding/export, vars, rate-limit bindings, cron shapes and safety flags).
- Native Wrangler CLI dry-run: **not executed in the packaging sandbox because npm registry DNS/network access was unavailable**; do not misreport this as a passed dry-run. Normal deployment should still run Wrangler after dependencies are installed in the real deployment environment.
- Secret-hygiene checks: passed; no Beds24 production credential is committed.
- Final independently extracted ZIP suite/integrity: passed.

Final archive:

`The-House-Koh-Tao-v5.11.56-unified-messaging-beds24-channel-manager-ready-to-push.zip`

### 18. Post-push Beds24 rollout order

After this release is pushed, guide the owner through setup one step at a time. The safe order is:

1. Create the Beds24 property and Rooms 1–11.
2. Before connecting an OTA, import/mirror all current and future existing House bookings into Beds24 so occupied inventory is already blocked.
3. Connect Airbnb first and verify room/listing correspondence and existing reservations before adding any other OTA.
4. Establish the explicit Beds24 room-ID <-> House Room 1–11 mapping.
5. Create API V2 credentials with only the required booking/personal/inventory methods/scopes.
6. Add credentials/tokens only through Cloudflare Secrets/configuration; never GitHub.
7. Configure the authenticated Beds24 V2 booking webhook.
8. With production channel-manager flag still false, verify Beds24 itself has correct inventory/bookings and test Unified Inbox Airbnb messaging plus Direct WhatsApp.
9. Use a controlled preview/staging deployment or deliberately controlled activation window for the channel-manager-only integration tests: inbound Airbnb reservation ingestion, Direct booking central closure, cancellation reopening and extension conflict prevention.
10. Only after every live integration test succeeds should `BEDS24_CHANNEL_MANAGER_ENABLED` be deliberately enabled in production.
11. Keep `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false` unless a separate future decision explicitly changes that policy.

### 19. GitHub Desktop

**Summary**

`Release v5.11.56 unified messaging and Beds24 channel manager`

**Description**

`Add the Owner Admin unified OTA/WhatsApp inbox with reservation-aware AI drafts, human review, Pause/Resume AI and provider/source preservation; add a deliberately disabled Beds24 channel-manager bridge for OTA reservation ingestion, explicit Room 1–11 mapping, central Direct-booking availability protection, provider-first Direct creation and extension updates, cancellation propagation/retry and reconciliation. Keep AI auto-send false, keep BEDS24_CHANNEL_MANAGER_ENABLED false, commit no Beds24 credentials, and preserve existing Airbnb sync plus passport/TM30, Finance, housekeeping, maintenance, lost-key, Meta-template and unrelated House behavior. Final automated suite: 297 passed / 0 failed.`
