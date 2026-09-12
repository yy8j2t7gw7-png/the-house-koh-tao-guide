# Development Handoff — v5.11.61 Commercial Security, OTA Finance & WhatsApp

## Release intent

v5.11.61 is the backend counterpart to Taoedge Owner App v0.1.3. It prepares the product for commercial operation without changing the stable guest concierge or enabling high-impact provider automation by default.

## Architecture decisions

### 1. Licensing is server-authoritative

The mobile app is treated as an untrusted client. It can display license state, but cannot issue, extend, sign or activate a license. License records are stored in the Durable Object and signed with `MOBILE_LICENSE_SIGNING_SECRET`. The licensing-admin route is separate from `/api/mobile/v1/` and requires `TAOEDGE_LICENSE_ADMIN_TOKEN`.

Route access now follows:

`authenticated session -> active membership -> valid license (when enforcement enabled) -> role permission -> active licensed module`

A copied client therefore contains neither provider credentials nor the server-side license-signing material required to operate against the official service.

### 2. Device binding is independently switchable

`MOBILE_DEVICE_BINDING_ENABLED` is intentionally separate from license enforcement. v0.1.3 already sends `x-mobile-device-id` on protected calls. Once enabled, a stolen session token without the bound device identifier is rejected. License `maxDevices` is also enforced at login.

### 3. Finance ingestion is adapter-based

`src/beds24-finance-sync.js` now exposes a provider catalog and a provider-specific record builder. Airbnb is implemented first. Other OTA definitions exist only as inactive capability metadata; they do not ingest data until a provider adapter is deliberately implemented and tested.

Historical import uses the same canonical upsert path as scheduled reconciliation. The import is therefore safe to rerun and cannot create a second provider-managed row for the same Beds24/provider booking.

### 4. Finance is payout-observed, not booking-accrual

The established accounting rule remains unchanged: actual channel-collected payment/refund items determine the recognized provider-managed net income. Booking price and channel commission remain explanatory gross/fee fields. Historical onboarding therefore imports payments observed inside the requested date range, even if the underlying stay dates are outside it.

### 5. WhatsApp initiation follows Meta rules

A new conversation is initiated only with an approved template configured in `WHATSAPP_GUEST_INIT_TEMPLATE_NAME`. Existing Unified Messaging handles normal thread replies. No Meta access token or guest phone number is placed in mobile configuration.

## Safe deployment order

1. Deploy v5.11.61 with all new enforcement/provider switches at their committed safe values.
2. Verify `MOBILE_APP_ENABLED=true` and `MOBILE_BOOTSTRAP_ENABLED=false` after deployment.
3. Add Cloudflare secrets `MOBILE_LICENSE_SIGNING_SECRET` and `TAOEDGE_LICENSE_ADMIN_TOKEN`.
4. Provision the House tenant license through the protected licensing-admin endpoint.
5. Verify the mobile app still logs in and shows the expected modules.
6. Enable `MOBILE_LICENSE_ENFORCEMENT_ENABLED=true`.
7. Verify login and every major owner screen.
8. Enable `MOBILE_DEVICE_BINDING_ENABLED=true` and verify the current iPhone can still resume its session; re-login if necessary.
9. Configure an approved guest-contact WhatsApp template and test one controlled reservation before general use.
10. Use the Finance historical import from v0.1.3 to backfill a controlled date range and reconcile results against Beds24/Airbnb.
11. Only after reconciliation is confirmed, set `BEDS24_FINANCE_SYNC_ENABLED=true` for automatic daily Finance reconciliation.
12. Keep `BEDS24_CHANNEL_MANAGER_ENABLED=false` and `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false` until their separate live acceptance tests are completed.

## New Cloudflare settings

Secrets:

- `MOBILE_LICENSE_SIGNING_SECRET`
- `TAOEDGE_LICENSE_ADMIN_TOKEN`

Variables:

- `MOBILE_LICENSE_ENFORCEMENT_ENABLED`
- `MOBILE_DEVICE_BINDING_ENABLED`
- `WHATSAPP_GUEST_INIT_TEMPLATE_NAME`
- `WHATSAPP_GUEST_INIT_TEMPLATE_LANGUAGE`

Existing Finance variable:

- `BEDS24_FINANCE_SYNC_ENABLED`

## GitHub Summary

`Release v5.11.61 commercial protection, Airbnb Finance backfill and owner WhatsApp`

## GitHub Description

`Add server-authoritative signed tenant licensing, module entitlement gates, optional device-bound sessions, active-device limits and security audit controls; add idempotent historical Airbnb/Beds24 Finance backfill with provider-neutral OTA adapter architecture and daily reconciliation readiness; and add owner-initiated WhatsApp guest contact through server-side approved Meta templates. Keep bootstrap, Beds24 Channel Manager, scheduled Finance sync, license enforcement, device binding and AI auto-send safely staged until explicit production activation. Final automated suite: 322 passed / 0 failed.`
