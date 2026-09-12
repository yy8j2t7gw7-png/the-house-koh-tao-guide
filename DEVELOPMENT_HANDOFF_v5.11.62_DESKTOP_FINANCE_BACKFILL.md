# Development Handoff — v5.11.62 Desktop Finance Backfill

## Purpose

Bring the v5.11.61 historical Airbnb Finance onboarding workflow into the browser-based Owner Admin Dashboard so a hotel owner can backfill earlier current-month or previous-period Airbnb income during onboarding.

## Implementation

### API

`POST /api/concierge/admin/finance/import`

Owner-only. Request body:

```json
{
  "provider": "airbnb",
  "from": "YYYY-MM-DD",
  "to": "YYYY-MM-DD"
}
```

The route deliberately calls `reconcileBeds24FinanceRange(..., force: true)`, so controlled historical import remains available while automatic scheduled Finance sync is disabled.

The route records `finance_historical_import` in the existing admin operation audit when the store supports audit logging.

### Desktop UI

Finance → **Import historical Airbnb income**

Presets:
- This month
- Previous month
- Last 90 days
- Custom date range

The controls are enabled by `automation.historicalImportReady`, which requires the Beds24 refresh token and the complete Room 1–11 mapping but does not require the automatic Finance flag.

### Reconciliation semantics

The existing provider-neutral Finance engine remains authoritative. Airbnb is the only enabled provider adapter at this stage. Stable identity is based on provider-managed source IDs, so rerunning an onboarding range is duplicate-safe.

Income date follows the observed channel payment date when Beds24 supplies it, not merely reservation creation/check-in date.

## Important production state

The mobile commercial security controls have already been live-tested and should remain enabled after this deploy:

```text
MOBILE_LICENSE_ENFORCEMENT_ENABLED=true
MOBILE_DEVICE_BINDING_ENABLED=true
```

Keep these provider automation flags staged until separate production validation:

```text
BEDS24_FINANCE_SYNC_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

## Current limitation

Historical Finance import can only import what Beds24 exposes through the financial booking payload. If Beds24 contains the reservation but no channel-collected payment/invoice item for it, no income row is created. The new desktop status message makes that condition explicit.

## Recommended next production test

After deploying v5.11.62, open Owner Admin → Finance and run **This month**. If the result reports bookings scanned but no payment rows imported, verify whether Airbnb financial/payout information is actually present in Beds24 before changing the Finance parser or enabling scheduled sync.

## GitHub

### Summary

`Release v5.11.62 desktop historical Airbnb Finance onboarding`

### Description

`Add owner-controlled historical Airbnb Finance backfill to the desktop Admin Dashboard with This month, Previous month, Last 90 days and custom ranges. Reuse the duplicate-safe provider reconciliation engine while automatic Finance sync remains disabled, add clearer diagnostics when Beds24 reservations contain no channel-collected payment data, record desktop backfills in the admin audit trail, and preserve the validated production license/device-enforcement state. Full suite: 324 passed / 0 failed.`
