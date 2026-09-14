# The House – Koh Tao v5.11.76 — Daily Operating Console

## Summary

v5.11.76 moves Taoedge from monitoring/review toward a guarded daily hotel operating console. It adds a narrow Beds24 Listings & Rates bridge, role-aware mobile push delivery, reservation-lifecycle AI messaging, departure planning tied into housekeeping, and operational-message parity while preserving the deliberate boundary that the broad Beds24 Channel Manager remains off.

## AI-owned guest lifecycle messaging

Taoedge can now own the reservation communication journey that was previously handled by Airbnb Scheduled Quick Replies. `AI_GUEST_LIFECYCLE_ENABLED=true` runs on the existing one-minute scheduler and evaluates supported OTA reservations before sending.

- The first booking message becomes eligible **5 minutes after a newly observed confirmed booking**.
- Advance bookings receive the approved welcome/guest-page/registration content in naturalized wording.
- Bookings near arrival merge welcome + pre-arrival content instead of stacking messages.
- Same-day bookings merge booking + check-in content. Bookings after normal check-in time use a concise last-minute arrival variant.
- Stage state marks pre-arrival/check-in as already satisfied when those facts were merged, preventing a second near-identical message.
- Before sending, the lifecycle composer receives recent outbound history and may return `skip` for a semantic duplicate. “Send nothing” is an explicit valid outcome.
- Business facts remain deterministic: room, dates, 14:00 check-in, checkout authorization, registration state, guest page and booking reference come from server/provider state rather than the model.
- Permanent room URLs and readable confirmation codes are replaced by protected placeholders before the lifecycle prompt reaches OpenAI and restored only after the generated message passes placeholder checks. A malformed AI result falls back to the approved deterministic message.
- The first production run creates a **cutover watermark**. Reservations created before activation are baselined so historic booking/pre-arrival/check-in messages are not replayed when Airbnb Scheduled Quick Replies are disabled.

Supported lifecycle provider messaging remains the Beds24 OTA bridge for Airbnb, Booking.com, Expedia and Vrbo.

## Day-before-checkout and housekeeping integration

At 17:00 Bangkok time on the day before departure, Taoedge can ask for the guest's approximate departure time and whether they want to extend. Replies are interpreted only when that reservation is in the departure-assistant window and the prompt was actually sent.

A captured departure time is stored on the reservation lifecycle state and exposed to mobile Operations. Housekeeping turnover eligibility uses an earlier confirmed planned departure when it is earlier than the authorized checkout time. A guest-reported time can never postpone housekeeping beyond the standard/approved checkout boundary. Extension interest is surfaced to management for confirmation; the AI does not promise availability.

## Listings & Rates — narrow provider write architecture

Adds protected mobile endpoints for per-room/per-date Beds24 calendar visibility and a narrow write path using Beds24 `inventory/rooms/calendar`.

- Read scope: mapped House Rooms 1–11 and an explicit date range.
- Write scope: exactly one explicit room/date cell per request.
- Supported mutations: `price1` and open/closed inventory only.
- Every successful write is server audited.
- The explicit 11-room Beds24 ↔ House mapping is required; provider room IDs are never guessed.
- The feature is independent from the full Channel Manager.
- `BEDS24_CHANNEL_MANAGER_ENABLED=false` remains the production default.
- `BEDS24_RATE_INVENTORY_WRITES_ENABLED=false` remains fail-closed in this source release until live Beds24 write permissions are validated on a controlled cell.

Existing independent Direct Stay central protection remains available through `BEDS24_DIRECT_STAY_PROTECTION_ENABLED=true` without turning on broad OTA booking ingestion.

## Push notifications and operational parity

Adds Expo push-device registration/storage and server delivery for supported OTA guest messages and operational events. Push audience is role-aware; management-only events go to owner/manager devices while operational events can reach permitted operational devices. Payloads are deliberately minimal and do not contain passport/document data, provider credentials or other secrets. Invalid Expo tokens can be disabled after a `DeviceNotRegistered` provider result.

Protected operational alerts now trigger the mobile push side effect while retaining the legacy WhatsApp delivery return contract. OTA message handling can surface the same operational context to the mobile workflow rather than leaving provider messages as an isolated inbox channel.

## Guarded conversational AI auto-send

`UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=true` now activates a guarded decision boundary rather than unrestricted sending. Auto-send requires a high-confidence answer, no human/handoff requirement, no emergency condition, no protected/sensitive topic and no dangerous operational action. Anything outside that narrow high-certainty envelope remains review-first.

## Mobile API additions

- `GET /api/mobile/v1/listings-rates`
- `POST /api/mobile/v1/listings-rates/write`
- `POST /api/mobile/v1/push/register`
- operations payload enrichment for planned departure / extension state

## Production safety state

```text
BEDS24_CHANNEL_MANAGER_ENABLED=false
BEDS24_DIRECT_STAY_PROTECTION_ENABLED=true
BEDS24_RATE_INVENTORY_WRITES_ENABLED=false
BEDS24_FINANCE_SYNC_ENABLED=true
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=true
AI_GUEST_LIFECYCLE_ENABLED=true
AI_GUEST_LIFECYCLE_FIRST_MESSAGE_DELAY_MINUTES=5
MOBILE_LICENSE_ENFORCEMENT_ENABLED=true
MOBILE_DEVICE_BINDING_ENABLED=true
```

No Beds24 refresh token, Meta access token, OpenAI key or mobile/license signing secret is committed.

## Validation

- Backend regression suite: **361 passed / 0 failed**.
- JavaScript/MJS syntax check: **30 files / 0 syntax failures**.
- The release is source-ready for deployment; it does not claim a production Cloudflare deployment from this packaging environment.
