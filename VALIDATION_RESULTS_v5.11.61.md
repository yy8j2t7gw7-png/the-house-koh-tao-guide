# Validation Results — The House v5.11.61

## Result

**PASS for source/package release validation.**

## Automated regression suite

```text
322 tests
322 passed
0 failed
0 skipped
```

The full `node --test tests/*.test.mjs` suite was run against the v5.11.61 source tree.

## Syntax / configuration validation

- 25 JavaScript/MJS source/test files passed `node --check`.
- 12 JSON files parsed successfully.
- `wrangler.jsonc` parsed successfully after JSONC comment stripping.
- Package version is `5.11.61`.

## v5.11.61-specific regression coverage

Tests verify:

- historical Airbnb Finance backfill uses provider payment-observed dates;
- repeated historical imports are idempotent and do not duplicate provider income;
- provider-neutral OTA Finance catalog exists while only Airbnb is active;
- signed server-side license/module enforcement scaffolding exists;
- license and device enforcement flags default off for staged rollout;
- licensing-admin endpoint is separately authenticated and rate limited;
- Meta/WhatsApp access credentials stay out of committed configuration;
- new WhatsApp guest initiation uses an approved server-side template;
- live mobile app remains enabled while bootstrap, Beds24 Channel Manager, scheduled Finance sync and AI auto-send remain safely staged.

## Protected-system comparison against v5.11.60

The following files are byte-for-byte unchanged:

- `airbnb-sync/Code.gs`
- `src/passport-api.js`
- `src/expense-api.js`
- `src/finance-api.js`
- `src/housekeeping-operations.js`
- `src/maintenance-api.js`
- `src/stay-api.js`
- `src/beds24-channel-manager.js`
- `src/whatsapp-alerts.js`
- `src/registration-alerts.js`

The release intentionally changes only the mobile/commercial protection, provider Finance adapter, Unified Messaging WhatsApp initiation, Durable Object schema/store support, Worker routing/configuration, tests and release documentation.

## Secret hygiene

- `MOBILE_LICENSE_SIGNING_SECRET` is not committed.
- `TAOEDGE_LICENSE_ADMIN_TOKEN` is not committed.
- Existing Beds24, Meta, OpenAI, webhook, password/session pepper and bootstrap secret values are not committed.
- Test fixtures contain obvious non-production placeholder tokens only.
- Production secrets remain Cloudflare Secrets.

## Feature flags in committed configuration

```text
MOBILE_APP_ENABLED=true
MOBILE_BOOTSTRAP_ENABLED=false
MOBILE_LICENSE_ENFORCEMENT_ENABLED=false
MOBILE_DEVICE_BINDING_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
BEDS24_FINANCE_SYNC_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

## Tooling caveat

A native Wrangler compile/deploy dry-run was not executed in this artifact environment because the repository does not include installed Wrangler dependencies here. This is not reported as a pass. Runtime behavior is covered by the full automated Worker test suite plus JavaScript/configuration validation. Run the normal Cloudflare deployment pipeline after pushing and inspect the deployment result before enabling the new enforcement switches.

## Archive verification

The release archive was extracted into a clean verification directory and the complete automated suite was rerun from the extracted copy: **322 passed / 0 failed**. Source and extracted manifests contained **342 files** and matched byte-for-byte. ZIP integrity check reported no compressed-data errors.
