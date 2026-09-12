# Validation Results — The House v5.11.58

## Automated application suite

**314 passed / 0 failed**

The full existing House suite was run after the mobile platform and granular staff-expense permission work.

## Syntax and configuration

- JS/MJS checked with `node --check`: **49 files**, all passed
- Airbnb Apps Script `airbnb-sync/Code.gs`: copied to temporary `.js` and passed `node --check`
- JSON: **12 files**, all parsed
- `wrangler.jsonc`: parsed as JSONC and passed structural checks
- Worker main/assets/Durable Object binding validated
- Mobile login rate limiter validated as namespace `550004`, 10 requests / 60 seconds
- three existing cron schedules preserved

## SQLite schema

The complete initial Durable Object SQL schema was extracted and executed against an in-memory SQLite database successfully.

The nine mobile platform tables exist and `platform_memberships.permission_overrides_json` is present:

- `platform_tenants`
- `platform_properties`
- `platform_users`
- `platform_memberships`
- `platform_sessions`
- `platform_invites`
- `platform_entitlements`
- `platform_push_devices`
- `platform_audit`

## Security / secret hygiene

Production-source scan found **0 embedded secret values** for Beds24, Meta or mobile bootstrap/password/session credentials.

The test suite contains only synthetic Beds24 test strings such as `refresh-secret`; these are not production credentials.

`wrangler.jsonc` contains no committed values for:

- `MOBILE_BOOTSTRAP_TOKEN`
- `MOBILE_PASSWORD_PEPPER`
- `MOBILE_SESSION_PEPPER`
- `MOBILE_INVITE_PEPPER`
- `BEDS24_REFRESH_TOKEN`
- `BEDS24_WEBHOOK_TOKEN`
- `UNIFIED_MESSAGING_INTERNAL_TOKEN`

## Safety flags

Confirmed false in the release configuration:

```text
MOBILE_APP_ENABLED=false
MOBILE_BOOTSTRAP_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
BEDS24_FINANCE_SYNC_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

## Protected subsystem comparison against v5.11.57

Byte-for-byte unchanged:

- `airbnb-sync/Code.gs`
- `src/passport-api.js`
- `src/finance-api.js`
- `src/expense-api.js`
- `src/housekeeping-operations.js`
- `src/maintenance-api.js`
- `src/stay-api.js`
- `src/unified-messaging.js`
- `src/beds24-channel-manager.js`
- `src/beds24-finance-sync.js`
- `src/whatsapp-alerts.js`

All **25** existing Meta template names remain identical to v5.11.57.

The mobile expense routes reuse `expense-api.js`; the existing Finance implementation itself was not modified.

## Wrangler CLI limitation

A native `wrangler deploy --dry-run` was not claimed as passed because Wrangler is not locally installed in this sandbox and the environment cannot obtain missing npm packages from the registry. Structural Wrangler validation was completed instead.
