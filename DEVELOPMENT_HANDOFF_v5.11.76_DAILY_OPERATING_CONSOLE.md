# Development Handoff — The House / Taoedge Backend v5.11.76

## Release objective

Turn the existing monitoring/review stack into a coherent boutique-hotel daily operating console while keeping high-impact provider authority narrow and auditable.

## Key architecture decisions

### 1. Taoedge becomes the lifecycle-message owner

The backend now owns booking, pre-arrival, same-day/check-in, day-before-checkout/extension and checkout lifecycle stages. The scheduler runs every minute, but a new booking cannot send before the configured five-minute delay.

The orchestration layer decides **whether** a message is due and which verified facts are required. The model is used only to naturalize the approved content. It is allowed to return `skip` when the proposed message would materially repeat recent outbound communication.

The lifecycle ledger persists concepts/stage timestamps, external booking/thread identity, planned departure time and extension interest. A combined same-day message marks booking + pre-arrival + check-in satisfied, so later timers cannot duplicate it.

### 2. Safe Airbnb Quick Reply cutover

Do not leave two independent lifecycle senders active indefinitely. The intended production cutover is:

1. Deploy backend v5.11.76 while the existing Airbnb Scheduled Quick Replies are still present.
2. Let the first scheduled lifecycle run establish the `guest_lifecycle_v1` activation watermark. Existing reservations are baselined rather than replayed.
3. Create/observe one controlled new booking and verify the Taoedge welcome arrives approximately five minutes after the booking becomes visible to the backend. For same-day testing, verify that one combined welcome/check-in message is sent.
4. Verify the message appears in Unified Inbox/history and that no second Taoedge pre-arrival/check-in stage becomes eligible for the merged case.
5. Disable the corresponding Airbnb Scheduled Quick Replies (booking confirmation, pre-arrival, check-in day and checkout) so Taoedge is the sole lifecycle sender.
6. Monitor the first live bookings and push/lifecycle failure alerts.

The first-run watermark is specifically designed so step 1 does not cause existing guests to receive historic welcome/check-in messages.

### 3. AI secret boundary

Readable stay confirmation codes and permanent Room URLs are not sent raw to the lifecycle model. They are represented as `[[CONFIRMATION_CODE]]` / `[[GUEST_PAGE_URL]]`; output must preserve required placeholders and they are restored only after generation. If the model drops a required placeholder, the approved deterministic message is used instead.

### 4. Listings & Rates is deliberately not a full Channel Manager

`src/beds24-listings-rates.js` is an independent provider adapter. It requires the explicit one-to-one House Rooms 1–11 mapping and writes only a caller-selected room/date cell. The full channel-manager flag remains false.

The package ships with `BEDS24_RATE_INVENTORY_WRITES_ENABLED=false`. Read the workspace first, validate current Beds24 credentials/room mapping, then enable the write flag only for a controlled production test. Broad reservation ingestion/reconciliation authority is not implied by enabling this flag.

### 5. Direct Stay protection remains separate

`BEDS24_DIRECT_STAY_PROTECTION_ENABLED=true` lets direct-stay create/extend/cancel protection use central Beds24 inventory without enabling the full Channel Manager. Do not collapse this flag into `BEDS24_CHANNEL_MANAGER_ENABLED`.

### 6. Push is supplemental, server-authoritative routing remains primary

The mobile app registers Expo push tokens through the authenticated backend. The backend selects the eligible audience by role. Push payloads carry only routing/summary fields. WhatsApp operational delivery remains intact; push is an additional device notification path, not a replacement for protected operational alerts.

## Files introduced

- `src/beds24-listings-rates.js`
- `src/lifecycle-messaging.js`
- `src/departure-intent.js`
- `src/mobile-push.js`

Major integrations also touch `src/mobile-platform.js`, `src/concierge-store.js`, `src/unified-messaging.js`, `src/concierge-api.js`, `src/whatsapp-alerts.js`, `src/housekeeping-operations.js`, `src/beds24-channel-manager.js`, `src/stay-api.js`, `src/index.js`, `airbnb-sync/Code.gs`, `wrangler.jsonc` and regression coverage.

## Deployment prerequisites

The normal production secrets/configuration remain required server-side. In particular, lifecycle naturalization needs the existing OpenAI secret and provider sending needs the working Beds24 authentication/mapping. Expo push delivery also requires devices to register a valid Expo push token from an EAS-linked build.

No new provider credential belongs in the mobile source or Git repository.

## Live verification matrix

- Advance booking: one Taoedge message after ~5 minutes.
- Booking 1–2 days before arrival: combined booking/pre-arrival content, no redundant pre-arrival message.
- Same-day before 14:00: combined booking/check-in message, no later duplicate check-in message.
- Same-day after 14:00: concise last-minute arrival variant.
- Day before checkout: departure/extension question appears once.
- Guest replies with early departure: Operations shows the plan and turnover becomes eligible at the earlier time.
- Guest asks to extend: management sees extension interest; no automatic availability promise.
- Approved late checkout: checkout messaging uses the approved time and housekeeping is not triggered early unless the guest explicitly says they will leave earlier.
- High-confidence routine OTA question: guarded auto-send may send. Sensitive/refund/cancellation/emergency/lost-key/payment topics remain review/handoff.
- Listings & Rates: read a narrow known date range; after separate flag activation, change one controlled room/date cell and confirm Beds24 then revert/confirm as intended.
- Push: owner/manager receives controlled OTA message alert; operational event deep-links correctly.

## Validation completed

`npm test`: **361 passed / 0 failed**.

Syntax pass across backend `src/*.js` and test `.mjs`: **30 / 30**.

This is a ready-to-push source release, not evidence of a live Worker deployment.
