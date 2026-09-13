# Validation Results — The House v5.11.65

## Automated suite

```text
331 passed
0 failed
```

## JavaScript syntax

All `src/*.js` files passed `node --check`.

## Added coverage

- rich mobile booking-detail contract exposes provider metadata
- booking value remains gated by `finance.view`
- provider/Beds24 references remain hidden from ordinary staff
- v5.11.64 booking activity/task contract remains present

## Safety regression

Existing 330 tests from v5.11.64 continue to pass, including lost-key security, passports/TM30, guest alerts, housekeeping, maintenance, commercial licensing/device binding, Unified Messaging, booking staff tasks and Airbnb Finance expected→paid reconciliation.
