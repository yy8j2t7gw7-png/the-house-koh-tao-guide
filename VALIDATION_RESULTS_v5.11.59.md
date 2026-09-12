# Validation Results — The House v5.11.59

## Purpose

Production hotfix validation for the Cloudflare Workers PBKDF2 iteration-limit failure discovered during first-owner mobile bootstrap.

## Live failure reproduced before fix

Cloudflare emitted:

`NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not supported (requested 210000).`

The failure occurred before an owner account was persisted.

## Automated regression suite

- **315 passed**
- **0 failed**
- Includes a new v5.11.59 regression test asserting the mobile password path uses 100,000 PBKDF2-SHA256 iterations and contains no 210,000-iteration setting.

## Syntax and configuration

- JS/MJS source files checked with `node --check`: **49 / 49 passed**
- Apps Script `airbnb-sync/Code.gs`: **passed** via temporary `.js` syntax check
- JSON files parsed: **12 / 12 passed**
- `wrangler.jsonc`: **JSONC parse passed**

## Secret hygiene

`wrangler.jsonc` contains no committed values/keys for:

- `MOBILE_BOOTSTRAP_TOKEN`
- `MOBILE_PASSWORD_PEPPER`
- `MOBILE_SESSION_PEPPER`
- `MOBILE_INVITE_PEPPER`
- `BEDS24_REFRESH_TOKEN`
- `BEDS24_WEBHOOK_TOKEN`
- `UNIFIED_MESSAGING_INTERNAL_TOKEN`

## Change isolation

Compared with v5.11.58, runtime changes are limited to:

- `src/mobile-platform.js`
- `src/concierge-store.js`

Regression coverage changes are limited to `tests/concierge.test.mjs`; release metadata/docs and package version were updated for v5.11.59.

No guest-facing Concierge, Beds24 channel-manager, Beds24 Finance, passport/TM30, housekeeping, maintenance, lost-key, Meta template or unrelated Finance implementation was modified.

## Wrangler native dry-run

A native Wrangler deploy dry-run was not performed in this isolated packaging environment because project `node_modules` are intentionally not bundled. Production deployment should use the normal GitHub/Cloudflare build pipeline.
