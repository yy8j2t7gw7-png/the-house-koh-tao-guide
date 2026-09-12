# Development Handoff — v5.11.61

## Objective

Deliver the first commercial security/anti-theft backend, historical + automatic Airbnb Finance onboarding, and direct WhatsApp guest contact as one coordinated but feature-isolated release.

## Backend changes

### `src/mobile-platform.js`

- signed tenant-license validation
- module + permission dual enforcement
- optional device-bound mobile sessions
- device-count license limits
- protected licensing-admin endpoint
- security audit endpoint
- historical OTA Finance import endpoint
- reservation-level WhatsApp start endpoint
- masked reservation phone exposure for authorized owner/manager views
- live mobile deployment flag remains enabled while bootstrap stays disabled

### `src/concierge-store.js`

- `platform_licenses` persistence
- signed module-list persistence
- safe schema migration guard
- entitlement replacement for license downgrades/plan changes
- active-device counting
- mobile audit listing
- reservation-linked messaging-thread lookup

### `src/beds24-finance-sync.js`

- explicit date-range historical reconciliation
- provider-neutral adapter catalog
- payment-observed income date
- idempotent provider-managed upserts
- future-provider placeholders remain inactive

### `src/unified-messaging.js`

- approved-template WhatsApp initiation
- reservation-linked WhatsApp thread creation
- server-only Meta credential use

### `src/index.js`

- separately routed `/api/licensing/v1/...` licensing administration surface

## Deployment order

1. Push/deploy v5.11.61 with license and device enforcement still false.
2. Install/test Taoedge Owner App v0.1.3.
3. Add `MOBILE_LICENSE_SIGNING_SECRET` and `TAOEDGE_LICENSE_ADMIN_TOKEN` as Cloudflare Secrets.
4. Create/issue the tenant license using the protected licensing-admin endpoint.
5. Verify Modules & Plan and Security in the app.
6. Enable `MOBILE_LICENSE_ENFORCEMENT_ENABLED=true`.
7. Confirm normal session/login and all licensed modules.
8. Enable `MOBILE_DEVICE_BINDING_ENABLED=true` only after v0.1.3 is on the test device.
9. Run a controlled historical Airbnb Finance import and compare against Beds24/Airbnb payout data.
10. After reconciliation is accepted, set `BEDS24_FINANCE_SYNC_ENABLED=true` for automatic daily sync.
11. Configure an approved WhatsApp guest-initiation template, then test with a controlled guest/reservation before production use.

## Important safety boundaries

- Keep `MOBILE_BOOTSTRAP_ENABLED=false`.
- Keep `BEDS24_CHANNEL_MANAGER_ENABLED=false` until its separate live cutover is approved.
- Keep `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false`.
- Do not put licensing, Beds24, Meta, OpenAI or webhook secrets in the app repo.
- Do not enable license enforcement before the signing secret exists.
- Do not enable device binding until the v0.1.3 client is installed and sending `x-mobile-device-id`.

## Commercial security limitation

No mobile application can be made literally impossible to copy. This architecture makes a copied client commercially unusable without valid server authentication, active signed licensing, entitled modules and—when enabled—a matching registered device/session. The valuable provider credentials and enforcement logic remain on the backend.
