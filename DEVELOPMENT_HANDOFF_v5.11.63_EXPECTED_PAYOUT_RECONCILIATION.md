# Development Handoff — v5.11.63 Expected-Payout Reconciliation

## Why this release exists

Live Beds24 testing showed the correct Airbnb reservation economics before settlement but `Total Paid = 0.00`. Example observed in production setup:

- booking price: 27,000 THB
- commission / host fee: 810 THB
- expected payout: 26,190 THB
- actual paid: 0 THB

v5.11.62 correctly refused to call that amount a settled payment, but that left mid-month onboarding with no Finance entry. v5.11.63 adds a two-stage provider ledger so the hotel can see expected Airbnb income immediately without falsely marking it paid.

## Canonical state model

A single provider-managed Finance row is keyed by:

```text
sourceSystem = beds24
sourceExternalId = airbnb-booking:<Beds24 booking id>
```

Typical state transition:

```text
expected_payout  ->  paid
```

Possible additional states remain:

```text
expected_cancelled_booking
paid_cancelled_booking
refunded
voided
```

No second Finance row is created when settlement arrives.

## Expected amount calculation

`beds24AirbnbPaymentSummary()` now exposes:

- `actualPaymentMinor`
- `expectedPayoutMinor`
- `expectedSource`
- `invoiceChargesMinor`
- gross / fee / booking-price context
- refund evidence

Expected payout preference:

1. explicit invoice item describing expected payout;
2. positive booking price minus Beds24 commission;
3. positive invoice charge total fallback.

For a cancelled booking, booking-price-minus-commission alone is not sufficient to create a new expected payout.

## Date semantics

### Provisional

Before an actual payment exists, `incomeDate` uses the arrival date when available. This is the best available expected-payout anchor for Airbnb and makes current-month onboarding useful.

### Settled

When the actual payment appears, the row is updated and uses the provider payment item creation date. If Beds24 omits a payment item date during an expected→paid transition, booking modification time is used before falling back to the prior date.

Previously settled rows preserve their settled date if a later provider response temporarily omits payment rows.

## Reconciliation counters

Historical/scheduled reconciliation now returns:

- `created`
- `updated`
- `unchanged`
- `expected`
- `paid`
- `reconciled`
- `refunded`
- `voided`
- `skipped`
- `outsideRange`

`reconciled` specifically counts an updated provider row moving from expected status to paid status.

## Monthly summary semantics

Existing `netIncome` and `operatingResult` remain the **working/forecast total** and include provisional expected payouts so a newly onboarded hotel immediately sees the full current-month picture.

New fields make the distinction explicit:

```text
expectedNetIncome
settledNetIncome
expectedEntries
settledIncomeEntries
settledOperatingResult
```

Desktop and matching mobile UI must clearly label provisional values rather than presenting them as settled cash.

## CSV export

Finance CSV appends:

```text
Provider status
Source system
```

This allows exported bookkeeping data to distinguish `expected_payout` from `paid`.

## Production flags

Preserve:

```text
MOBILE_LICENSE_ENFORCEMENT_ENABLED=true
MOBILE_DEVICE_BINDING_ENABLED=true
```

Keep staged until the expected→paid flow is validated against a real Airbnb payout:

```text
BEDS24_FINANCE_SYNC_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

## Recommended live test

1. Deploy v5.11.63.
2. Leave scheduled Finance sync disabled.
3. In Owner Admin → Finance, import `2026-09-01` through `2026-09-13` again.
4. Confirm bookings with `Total Paid = 0.00` now appear as `expected payout` / provisional.
5. Check the known 27,000 THB booking produces approximately:
   - gross 27,000 THB
   - fees 810 THB
   - expected net 26,190 THB
6. Re-run the exact period and confirm no duplicates.
7. After Airbnb/Beds24 records the real payment, rerun and verify the same row changes from expected to paid.
8. Only after real reconciliation is verified should `BEDS24_FINANCE_SYNC_ENABLED=true` be considered.

## GitHub

### Summary

`Release v5.11.63 Airbnb expected-payout Finance reconciliation`

### Description

`Add two-stage Airbnb Finance ingestion so Beds24 expected payouts are imported as clearly marked provisional income during onboarding and reconciled in place to the actual channel-collected payment when settlement arrives. Preserve gross booking value and commission, add expected/settled monthly breakdowns and reconciliation counters, protect paid rows from temporary provider omissions, expose provider status in CSV exports, and keep scheduled Finance sync disabled pending live payout validation. Full suite: 327 passed / 0 failed.`
