# Validation Results — v5.11.70

Date: 2026-09-13

## Automated backend suite

`npm test`

- tests: **347**
- passed: **347**
- failed: **0**
- skipped: **0**

## Syntax validation

Passed `node --check` for:

- `src/mobile-platform.js`
- `src/concierge-store.js`
- `src/finance-api.js`
- `tests/concierge.test.mjs`

## Added regression coverage

- Insights V2 30/60/90-day demand, pickup, channel quality, operational rates and ledger-efficiency semantics.
- Finance report summary + transaction CSV.
- Permission/audit contracts for guest-document download, TM30 mark/undo and Finance report download.
- Retention SQL compares parsed datetimes, preventing same-day expired documents from remaining visible because of string-format differences.
