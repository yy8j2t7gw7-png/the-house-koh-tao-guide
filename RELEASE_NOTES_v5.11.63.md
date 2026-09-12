# The House – Koh Tao v5.11.63 — Airbnb Expected-Payout Finance Reconciliation

## Summary

v5.11.63 removes the onboarding dead-end discovered during the live Beds24 Finance test. Airbnb reservations no longer need to wait for a non-zero Beds24 payment row before appearing in Finance.

When Beds24 has the reservation financials but the actual Airbnb payment is still `0.00`, the House Finance layer now creates one **provisional expected-payout** record. When Beds24 later reports the actual channel-collected payment, the same provider-managed row is reconciled in place instead of creating a second income entry.

## Finance behavior

For Airbnb/Beds24 bookings:

1. **Before settlement**
   - gross booking value is retained;
   - Beds24/Airbnb commission is retained separately;
   - expected payout is imported as net provisional income;
   - the row is marked `expected_payout` (or `expected_cancelled_booking` when applicable);
   - provisional income uses the stay arrival date as the expected payout date when no real payment date exists.

2. **After settlement**
   - actual channel-collected payment becomes authoritative net income;
   - the same stable `beds24 + Airbnb booking ID` row is updated;
   - status becomes `paid` / `paid_cancelled_booking`;
   - payment date moves to the observed provider payment date when Beds24 supplies one;
   - the import reports the transition as `reconciled`.

3. **Refund / cancellation protection**
   - provider refunds can clear an existing provider-managed row;
   - settled rows are not downgraded merely because a later Beds24 response temporarily omits payment rows;
   - provisional rows are not silently duplicated;
   - cancelled bookings do not create an expected payout solely from stale booking-price-minus-commission data.

## Expected payout source

The parser uses the strongest available Beds24 financial signal:

- explicit expected-payout invoice data when available;
- otherwise booking price less Beds24 commission;
- invoice charge total as a fallback when booking price is unavailable.

The real channel-collected payment always overrides the provisional amount once supplied.

## Owner Finance UI

Desktop Finance now:

- labels expected Airbnb income as **provisional**;
- shows a separate **Expected / provisional Airbnb** amount in the monthly summary when present;
- labels Net Income and Operating Result as including expected amounts while provisional records exist;
- reports historical-import counts for expected, paid, reconciled, refunded and voided rows;
- exports provider status/source in the Finance CSV for auditability.

## Mobile API

The mobile Finance API exposes the same provisional/settled breakdown:

- `expectedNetIncome`
- `settledNetIncome`
- `expectedEntries`
- `settledIncomeEntries`
- `settledOperatingResult`

Taoedge Owner App v0.1.4 is the matching client release and visually distinguishes expected payouts from paid income.

## Deployment safety

The already validated commercial security state is preserved:

- `MOBILE_LICENSE_ENFORCEMENT_ENABLED=true`
- `MOBILE_DEVICE_BINDING_ENABLED=true`

High-impact provider automation remains staged:

- `BEDS24_FINANCE_SYNC_ENABLED=false`
- `BEDS24_CHANNEL_MANAGER_ENABLED=false`
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false`

Historical owner-triggered Finance import remains available while scheduled Finance sync is disabled.

## Validation

Full backend automated suite: **327 passed / 0 failed**.
