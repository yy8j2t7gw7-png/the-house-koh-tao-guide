# The House – Koh Tao v5.11.61 — Commercial Protection, OTA Finance Backfill & Owner WhatsApp

## Scope

This release is the first commercial-hardening layer for the mobile platform and adds two owner-facing operational capabilities: historical/automatic Airbnb Finance ingestion and direct WhatsApp guest initiation from reservations.

The release is deliberately staged. Code ships ready, but the high-impact enforcement and provider automation switches remain off until the House tenant is provisioned and tested.

## Commercial protection and security

- Adds server-side `platform_licenses` storage with signed tenant licenses.
- License status, validity dates, plan, module list and device limits are authoritative on the backend.
- Protected mobile routes now require both the existing role permission and the relevant licensed module entitlement.
- Adds an isolated licensing-admin endpoint under `/api/licensing/v1/tenant/license`.
- Licensing administration is protected by a separate secret token, HMAC signing secret and Cloudflare rate limiter.
- Adds optional device-bound sessions using the per-install device identifier already kept in SecureStore on the mobile client.
- Active-device limits are enforced at login when license enforcement is active.
- Adds owner security audit retrieval and keeps session revocation/audit trails server-side.
- Provider credentials, WhatsApp credentials, Beds24 credentials and licensing secrets never enter the mobile client.
- Existing bootstrap remains disabled.

### New server secrets required before enforcement

Store these only as Cloudflare **Secrets**:

- `MOBILE_LICENSE_SIGNING_SECRET`
- `TAOEDGE_LICENSE_ADMIN_TOKEN`

Do not commit either value to GitHub or place them in the mobile app.

### Staged flags

The release ships with:

```text
MOBILE_APP_ENABLED=true
MOBILE_BOOTSTRAP_ENABLED=false
MOBILE_LICENSE_ENFORCEMENT_ENABLED=false
MOBILE_DEVICE_BINDING_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
BEDS24_FINANCE_SYNC_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

Provision a valid House license before enabling license enforcement or device binding.

## Airbnb Finance automation and historical onboarding backfill

- Keeps actual channel-collected payment as the authoritative net income basis.
- Gross booking value, commission/fees, refunds and net income remain separate fields.
- Adds historical Finance import for an explicit date range up to 730 days.
- Historical import is available even while scheduled automatic Finance sync is still disabled, allowing controlled onboarding tests.
- Income date is derived from the provider payment/refund item timestamp where available.
- Imports are idempotent: the provider booking ID remains the unique external source ID, so reruns reconcile the same Finance row rather than duplicating income.
- Import results report created, updated, unchanged, skipped, outside-range and refunded records.
- Last import status is persisted for the owner app.
- The provider adapter catalog is now provider-neutral for future Booking.com, Expedia, Vrbo, Agoda, Hostelworld and Trip.com adapters. Only Airbnb is marked implemented in this release.
- Existing scheduled reconciliation remains controlled by `BEDS24_FINANCE_SYNC_ENABLED`; once enabled it runs on the existing daily maintenance cron.

This supports a hotel joining mid-month: the owner can import the current month to date, previous month, last 90 days or a custom period before enabling automatic daily reconciliation.

## Direct WhatsApp guest communication

- Mobile reservation responses can use the existing server-side Beds24 personal-data access to resolve a guest phone number without sending the full number to the phone.
- Owners/managers with `messaging.send` can open or start a WhatsApp thread from a reservation.
- If a WhatsApp thread already exists, the app opens it.
- If no thread exists, the backend starts contact only through a configured Meta-approved WhatsApp template.
- The template name and language are server configuration; Meta access tokens remain server-side.
- Outbound initiation and subsequent sends remain auditable in Unified Messaging.

New non-secret configuration:

```text
WHATSAPP_GUEST_INIT_TEMPLATE_NAME=
WHATSAPP_GUEST_INIT_TEMPLATE_LANGUAGE=en_US
```

Leave the template name empty until an approved guest-contact template is available in Meta.

## Existing systems preserved

No intentional behavior change to:

- passport/TM30 document storage or retention;
- lost-key 24/7 flow;
- housekeeping and room readiness;
- maintenance reporting;
- Direct Stay conflict logic;
- existing manual Finance entries and expense/receipt pipeline;
- Beds24 Channel Manager enablement;
- Unified Messaging AI auto-send.

## Validation

- Full House automated suite: **322 passed / 0 failed**.
- New release tests cover historical import/idempotency, provider-neutral adapter boundaries, signed licensing/module gates, licensing-admin isolation, WhatsApp template initiation and production safety flags.
- JavaScript/MJS syntax validation and JSON/JSONC validation are included in the final release validation report.
