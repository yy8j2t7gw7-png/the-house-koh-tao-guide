# Validation Results — Backend v5.11.77

Date: 14 September 2026

## Automated regression suite

Command: `npm test`

Result: **PASS — 366 / 366 tests**

New v5.11.77 regression coverage includes:

- Listings & Rates canonical/alias route contract and trailing-slash normalization
- backend API contract version reporting
- Direct Stay fast inventory close while full Channel Manager is disabled
- conflict-aware cancellation reopening that never overwrites another local reservation
- central provider availability check before Direct Stay edit/extension
- minute-level Direct Stay synchronization retry execution
- persistent reservation distribution event ledger

## Syntax validation

`node --check` across backend `src/*.js` and `tests/*.mjs`.

Result: **PASS — 30 / 30 files**

## Safety assertions

Validated configuration keeps:

- full Beds24 Channel Manager OFF
- Direct Stay protection ON
- Direct Stay fast inventory synchronization ON
- broad Listings & Rates writes OFF/fail-closed

## Packaging gate

The final release archive must be extracted into a clean directory and the automated tests plus syntax checks rerun before it is labelled ready-to-push.
