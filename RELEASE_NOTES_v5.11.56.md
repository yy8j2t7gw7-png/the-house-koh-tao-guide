# THE HOUSE – KOH TAO
## Release Notes v5.11.56 — Unified Messaging + Beds24 Channel Manager

### Purpose

v5.11.56 adds two deliberately gated integration layers on top of v5.11.55:

1. **Unified Guest Messaging** for Beds24-supported OTA conversations and direct Meta WhatsApp guest messages.
2. **Beds24 Channel Manager bridge** for central reservation/availability protection once Beds24 has been fully configured and live-tested.

The release ships safely disabled at the booking-control boundary. `BEDS24_CHANNEL_MANAGER_ENABLED` remains `"false"`, so the existing House Airbnb synchronization remains authoritative until the owner deliberately enables the Beds24 channel-manager bridge after setup and testing. Unified Messaging remains review-first and `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED` remains `"false"`.

### Unified Guest Messaging

- Adds **Unified Guest Messaging** to Owner Admin.
- Shows OTA and WhatsApp threads with guest, source channel, room, stay dates, unread count and review state.
- Shows complete chronological inbound/outbound/system/AI-draft history.
- Allows owner replies back to the original OTA or WhatsApp conversation.
- Adds per-thread **Pause AI / Resume AI**.
- Generates reservation-aware AI reply drafts only when the stay can be linked safely.
- Keeps protected topics such as cancellations, refunds, payment disputes, lost keys, security, emergencies and complaints in human review.
- Links Meta delivery-state updates back to WhatsApp messages.
- Uses Beds24 API V2 refresh-token authentication with short-lived access-token caching.
- Uses explicit Beds24 room mapping; provider room IDs are never guessed as House room numbers.
- Preserves the original OTA/provider source.
- Keeps AI auto-send disabled.

Beds24-supported unified OTA messaging is claimed only for:

- Airbnb
- Booking.com
- Expedia
- Vrbo

The reservation bridge can preserve additional booking sources even when unified messaging is not claimed for them.

### Beds24 Channel Manager bridge

A new opt-in `src/beds24-channel-manager.js` layer adds central availability and reservation synchronization while remaining inert when `BEDS24_CHANNEL_MANAGER_ENABLED=false`.

When deliberately enabled and fully configured:

- **OTA booking / modification / cancellation ingestion:** Beds24 booking webhook events are normalized into the House canonical reservation model.
- **Reservation-source preservation:** Airbnb, Booking.com, Expedia, Vrbo, Agoda, Hostelworld and Trip.com remain distinguishable in House reservation data.
- **Explicit Room 1–11 mapping:** every House room must map one-to-one to a real Beds24 room ID; no numeric guessing/fallback exists.
- **Direct / walk-in double-booking protection:** a House Direct booking checks Beds24 central availability before any local reservation is created.
- **Provider-first Direct creation:** after central availability succeeds, the booking is created in Beds24 first so connected channels can close inventory before the House local reservation is committed.
- **Direct extension conflict prevention:** the newly requested nights are checked against Beds24 and the Beds24 departure date is updated before the House local checkout date is extended.
- **Cancellation propagation:** owner-managed linked cancellations are propagated to Beds24; provider failures are queued for retry rather than silently treated as synchronized.
- **Orphan compensation:** if Beds24 creation succeeds but the local House reservation/link cannot be completed, a cancellation-compensation retry is queued.
- **Retry processing:** due Beds24 synchronization retries run from the existing hourly scheduled task with bounded backoff.
- **Reconciliation:** the existing daily scheduled task reconciles a rolling Beds24 reservation window back into the canonical House model.

This makes Beds24 the central availability/double-booking guard only **after** the channel-manager flag is intentionally enabled. Until then, v5.11.55-era House/Airbnb reservation behavior remains unchanged.

### Activation gates

The committed release configuration remains:

```json
"UNIFIED_MESSAGING_ENABLED": "true",
"UNIFIED_MESSAGING_AI_REPLY_ENABLED": "true",
"UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED": "false",
"BEDS24_CHANNEL_MANAGER_ENABLED": "false"
```

Do **not** change `BEDS24_CHANNEL_MANAGER_ENABLED` to true merely because the code is deployed. First complete the Beds24 property/room setup, import existing bookings, connect Airbnb, configure explicit Room 1–11 mapping, create the required API V2 credential/scopes, add credentials only as Cloudflare Secrets/configuration, authenticate the booking webhook and complete the live test plan documented in `BEDS24_UNIFIED_MESSAGING_SETUP_v5.11.56.md`.

### Required Beds24 credentials/configuration

No live credential is committed to GitHub. Production setup supplies the following outside source control:

- `BEDS24_REFRESH_TOKEN`
- `BEDS24_WEBHOOK_TOKEN`
- `BEDS24_ROOM_MAP`
- `UNIFIED_MESSAGING_INTERNAL_TOKEN`

Existing Meta WhatsApp credentials continue through their existing production secret/configuration path.

### Preserved behavior / protected boundaries

No intended change to:

- existing House Airbnb sync while the Beds24 channel-manager flag is false;
- passport / Thai-ID / TM30 registration;
- Finance;
- housekeeping / room-status behavior;
- maintenance reporting;
- secure lost-key / spare-key release;
- existing Meta operational templates, staff alerts or quick replies;
- existing guest-guide and Concierge behavior outside the integration paths above.

The deferred Taoedge commercial-demo corrections are intentionally not part of this House release.

### Validation

Final source validation for this release:

- automated regression suite: **297 passed / 0 failed**;
- JavaScript/MJS syntax validation: **47 files passed**;
- Google Apps Script syntax validation: passed;
- JSON validation: **12 files passed**; `wrangler.jsonc` JSONC parsing and structural Wrangler configuration validation passed;
- release secret-hygiene checks: passed;
- final ZIP integrity / independently extracted archive regression validation: passed.

The packaging sandbox could not reach the npm registry, so a native Wrangler CLI `deploy --dry-run` could not be executed there; this is not reported as a passed dry-run. The committed Wrangler configuration was instead parsed and structurally validated, including entry point/assets, Durable Object binding/export, vars, rate-limit bindings, cron shapes and both safety flags.

The final distributable is:

`The-House-Koh-Tao-v5.11.56-unified-messaging-beds24-channel-manager-ready-to-push.zip`
