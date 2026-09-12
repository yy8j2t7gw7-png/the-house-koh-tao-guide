# THE HOUSE – KOH TAO
## Validation Results — v5.11.56 Unified Messaging + Beds24 Channel Manager

### Automated regression

- Source tree: **297 passed / 0 failed**.
- Independently extracted release archive: **297 passed / 0 failed**.

### Syntax / configuration

- JavaScript / MJS: **47 files passed** `node --check`.
- Google Apps Script: `airbnb-sync/Code.gs` passed syntax validation via an equivalent temporary `.js` copy.
- JSON: **12 files parsed successfully**.
- `wrangler.jsonc`: JSONC parsing passed.
- Wrangler structural configuration validation passed for entry point/assets, Durable Object binding/export, vars, rate-limit bindings, cron shapes and release safety flags.
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED = "false"` confirmed.
- `BEDS24_CHANNEL_MANAGER_ENABLED = "false"` confirmed.

### Wrangler CLI note

A native `wrangler deploy --dry-run` was attempted, but the packaging sandbox could not resolve/reach the npm registry to install the project Wrangler dependency. The failed install attempt was environmental (`EAI_AGAIN`) and is **not** reported as a passed Wrangler CLI dry-run. No partial `node_modules` directory is included in the release archive.

### Secret hygiene

- No committed `BEDS24_REFRESH_TOKEN` value.
- No committed `BEDS24_WEBHOOK_TOKEN` value.
- No committed `BEDS24_ROOM_MAP` production value.
- No committed `UNIFIED_MESSAGING_INTERNAL_TOKEN` value.
- Generic production-source scan found no private-key block, bearer token or hard-coded access/refresh/app secret pattern.
- Two long token-like strings exist only in `tests/concierge.test.mjs`; both are explicitly synthetic test fixtures (`EA_TEST_SECRET...` / `EA_OWNER_DIAGNOSTIC_SECRET...`), not production credentials.

### Protected-boundary regression checks against v5.11.55

Byte-for-byte unchanged:

- `airbnb-sync/Code.gs`
- `src/passport-api.js`
- `src/finance-api.js`
- `src/expense-api.js`
- `src/housekeeping-operations.js`
- `src/maintenance-api.js`

`src/whatsapp-alerts.js` changed only for the Unified Messaging guest/status callbacks. The set of 25 existing House Meta template names remains identical to v5.11.55.

### Archive integrity

- ZIP CRC test: passed.
- Independent extraction: passed.
- Every packaged file is SHA-256 compared with the source tree after extraction; all hashes match.
- The final archive contains no `node_modules`, `.git` data or `.DS_Store` file.

Final archive:

`The-House-Koh-Tao-v5.11.56-unified-messaging-beds24-channel-manager-ready-to-push.zip`
