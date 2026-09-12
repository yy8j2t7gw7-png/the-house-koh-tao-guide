# Validation Results — The House v5.11.60

## Automated suite

- Node test suite: **316 passed / 0 failed**.
- New v5.11.60 contract test confirms the mobile reservation layer uses server-side Beds24 access, `includeGuests=true`, explicit room resolution and safe fallback behavior.
- `src/mobile-platform.js`: `node --check` passed.

## Regression isolation

Before adding release documentation, the only differences from v5.11.59 were:

- `src/mobile-platform.js`
- `tests/concierge.test.mjs`
- `package.json`
- `CHANGELOG.md`

Protected House systems were therefore not edited as part of the implementation:

- passport/TM30 flow
- existing Finance/expense engine
- housekeeping operations
- maintenance operations
- lost-key controls
- Direct Stay behavior
- Meta template inventory
- Beds24 Channel Manager logic
- Beds24 Finance parser/reconciliation logic

## Safety defaults

Repository configuration remains conservative:

- `MOBILE_APP_ENABLED=false`
- `MOBILE_BOOTSTRAP_ENABLED=false`
- `BEDS24_CHANNEL_MANAGER_ENABLED=false`
- `BEDS24_FINANCE_SYNC_ENABLED=false`
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false`

The live Cloudflare dashboard may intentionally override `MOBILE_APP_ENABLED=true` after the owner account has been bootstrapped; verify that live variable after deployment.
