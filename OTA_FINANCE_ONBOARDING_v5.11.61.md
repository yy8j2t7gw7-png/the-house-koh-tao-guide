# OTA Finance Onboarding — v5.11.61

## Current provider

Airbnb through Beds24 API V2 is the first implemented OTA Finance adapter.

Required existing Beds24 scopes remain:

```text
read:bookings
read:bookings-financial
```

The explicit Beds24 room map must also be complete.

## Mid-month onboarding

A property can join during the month without losing earlier income data.

From the Owner App Finance screen choose:

- This month
- Previous month
- Last 90 days
- or a custom date range

The backend scans a wider booking window, then imports only provider payment/refund events whose observed payment date falls inside the requested Finance range.

## Duplicate protection

The canonical key is the provider booking identity (`airbnb-booking:<Beds24 booking id>`). Re-running the same range updates/reconciles the existing provider-managed Finance row instead of creating a duplicate.

## Recommended activation sequence

1. Keep `BEDS24_FINANCE_SYNC_ENABLED=false`.
2. Import one short historical range.
3. Compare gross, fee/commission, refund and net figures with Beds24/Airbnb.
4. Import the required onboarding history.
5. Once reconciled, set `BEDS24_FINANCE_SYNC_ENABLED=true`.
6. The existing daily maintenance cron will then run automatic reconciliation.

## Future providers

The release contains provider definitions for Booking.com, Expedia, Vrbo, Agoda, Hostelworld and Trip.com, but they are intentionally marked `implemented: false`. They must not be presented as active until each financial payload has been mapped and regression-tested.
