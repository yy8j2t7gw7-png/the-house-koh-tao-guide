# The House – Koh Tao v5.11.62 — Desktop Historical Airbnb Finance Onboarding

## Summary

v5.11.62 extends the v5.11.61 historical OTA Finance backfill to the desktop Owner Admin Dashboard. A property can now be onboarded mid-month and import earlier Airbnb/Beds24 channel-collected income without enabling the automatic daily Finance job.

## Owner Admin changes

The Finance section now includes **Import historical Airbnb income** with:

- **This month**
- **Previous month**
- **Last 90 days**
- **Custom date range**

Historical import is available when the Beds24 refresh token, financial booking scopes and complete Room 1–11 mapping are ready. It does **not** require `BEDS24_FINANCE_SYNC_ENABLED=true`.

The desktop import uses the same canonical reconciliation engine as the mobile owner app:

- actual channel-collected payment is authoritative net income;
- booking gross and commission/fees remain separately visible;
- refunds reconcile the existing provider-managed Finance row;
- rerunning the same period is idempotent and does not create duplicates;
- imported records stay provider-managed and cannot be manually deleted.

## Better zero-result diagnostics

When Beds24 returns Airbnb reservations but none contain usable channel-collected payment data in the requested range, the desktop dashboard now says so explicitly. This distinguishes "no Airbnb bookings returned" from "bookings exist but financial/payout rows are not present in Beds24 yet."

## Security / deployment state

The House production license and device-binding controls were validated successfully before this release. To prevent the next deploy from resetting those live settings, v5.11.62 commits:

- `MOBILE_LICENSE_ENFORCEMENT_ENABLED=true`
- `MOBILE_DEVICE_BINDING_ENABLED=true`

High-impact provider automation remains staged:

- `BEDS24_FINANCE_SYNC_ENABLED=false`
- `BEDS24_CHANNEL_MANAGER_ENABLED=false`
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false`

No secret values are committed.

## Scope

This is a backend + desktop Admin Dashboard release only. Taoedge Owner App v0.1.3 remains the matching mobile build; no mobile update is required for this change.

## Validation

Full automated suite: **324 passed / 0 failed**.
