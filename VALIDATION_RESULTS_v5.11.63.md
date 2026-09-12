# Validation Results — The House v5.11.63

## Automated backend suite

Command:

```text
npm test
```

Result:

```text
327 tests
327 passed
0 failed
0 skipped
0 cancelled
```

## New regression coverage

v5.11.63 adds explicit coverage for:

- zero-payment Airbnb booking creating a provisional `expected_payout` row;
- 27,000 THB gross / 810 THB commission producing 26,190 THB expected net;
- idempotent expected→paid reconciliation using the same provider row;
- `reconciled` transition counting;
- actual payment date replacing provisional arrival-date anchoring;
- separate expected and settled monthly Finance totals;
- desktop/mobile provisional-status UX contracts.

## Safety checks

Confirmed in committed Worker configuration:

```text
MOBILE_LICENSE_ENFORCEMENT_ENABLED=true
MOBILE_DEVICE_BINDING_ENABLED=true
BEDS24_FINANCE_SYNC_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

No secret values are committed.

## Syntax / packaging

Core modified JavaScript modules passed Node syntax checks and the entire imported production test graph executed successfully through the full test suite.
