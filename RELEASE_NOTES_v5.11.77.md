# The House / Taoedge Backend v5.11.77 — Reservation Operations & OTA Sync Hardening

Date: 14 September 2026

## Release objective

v5.11.77 hardens the reservation/distribution layer behind the Taoedge Owner App. It repairs the mobile Listings & Rates route contract, adds explicit Direct Stay distribution telemetry, reduces Taoedge-side propagation delay, makes Direct Stay edits/cancellations provider-protected, and exposes the synchronization state required for a practical front-desk operating console.

This release deliberately keeps the full Beds24 Channel Manager disabled.

## Listings & Rates 404 repair

The mobile contract now explicitly supports:

- `GET /api/mobile/v1/listings-rates`
- compatibility alias `GET /api/mobile/v1/listings`
- `POST /api/mobile/v1/listings-rates/write`
- compatibility alias `POST /api/mobile/v1/listings/write`
- trailing-slash normalization before route matching

`GET /api/mobile/v1/platform` now publishes an `apiContract` with backend version, mobile API version, Listings & Rates route and Direct Stay operations capability. The v0.1.19 Diagnostics screen can therefore distinguish a deployed contract mismatch from provider readiness.

Broad owner rate/inventory writes remain fail-closed behind `BEDS24_RATE_INVENTORY_WRITES_ENABLED=false` until a controlled live write is separately validated.

## Direct Stay OTA synchronization hardening

Direct Stay central protection remains independent from the full Channel Manager.

After Beds24 accepts a new Direct Stay, Taoedge can now immediately write an explicit closed inventory range for the occupied nights using the dedicated Direct Stay fast-sync path. Taoedge then checks central Beds24 availability and records whether the range is confirmed closed or still provider-pending.

On cancellation or released dates, Taoedge never blindly writes inventory open. It first:

1. checks for another local confirmed reservation covering the range;
2. waits for central Beds24 availability to show that the range is safe to reopen;
3. only then writes the explicit open inventory range;
4. verifies the resulting Beds24 availability state.

This reduces avoidable Taoedge/Beds24 delay while preserving double-booking protection. Airbnb/OTA processing and host-app display caching remain external systems, so v5.11.77 does not claim that the visible Airbnb calendar will always update instantly.

## Distribution telemetry

A new per-reservation distribution event ledger records events such as:

- Beds24 booking accepted
- inventory close requested / confirmed / pending / failed
- Beds24 cancellation accepted
- inventory reopening waiting / confirmed / skipped / failed

Booking Details can consume this timeline so `Beds24 accepted` is no longer presented as proof that the OTA-visible calendar has already refreshed.

## Faster retries

Direct distribution retries are processed by the existing minute cron. Direct inventory close/reopen and cancellation retries start on a two-minute backoff rather than relying on the hourly schedule.

The full Channel Manager reconciliation remains disabled.

## Direct Stay edit/cancel

New protected mobile operations:

- `POST /api/mobile/v1/direct-stays/update`
- `POST /api/mobile/v1/direct-stays/cancel`

Direct Stay edits are provider-first. Newly added room/date ranges are checked against central Beds24 availability before the linked Beds24 booking is changed. Local overlap protection remains active. If the local commit fails after the provider update, Taoedge attempts provider rollback and can queue a protected restore retry.

Cancellation remains auditable rather than physically deleting reservation history.

## Safety boundaries

- `BEDS24_CHANNEL_MANAGER_ENABLED=false`
- `BEDS24_DIRECT_STAY_PROTECTION_ENABLED=true`
- `BEDS24_DIRECT_STAY_FAST_INVENTORY_SYNC_ENABLED=true`
- `BEDS24_RATE_INVENTORY_WRITES_ENABLED=false`
- Direct Stay fast inventory synchronization is intentionally separate from broad Listings & Rates write activation.
- AI guest lifecycle behavior from v5.11.76 remains in place.
- Finance, registration, passport privacy, role/tenant authorization and commercial security boundaries remain unchanged.

## Validation

- Backend automated tests: **366 / 366 passed**
- Backend JS/MJS syntax: **30 / 30 files passed**

See `VALIDATION_RESULTS_v5.11.77.md` for the release gate and `DEVELOPMENT_HANDOFF_v5.11.77_RESERVATION_OPERATIONS_OTA_SYNC.md` for deployment and production verification.
