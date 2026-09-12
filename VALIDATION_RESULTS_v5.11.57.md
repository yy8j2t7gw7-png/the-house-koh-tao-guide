# THE HOUSE – KOH TAO
## Validation Results v5.11.57 — Beds24 Airbnb Finance Automation

Validation date: 12 September 2026

## Source validation

- Automated regression suite: **304 passed / 0 failed**.
- JavaScript / ES-module syntax: **48 JS/MJS files passed** `node --check`.
- Airbnb Apps Script syntax: `airbnb-sync/Code.gs` passed after syntax-checking the unchanged source as JavaScript.
- JSON validation: **12 JSON files parsed successfully**.
- `wrangler.jsonc`: parsed successfully after JSONC normalization.
- Wrangler structural configuration checks passed for the Worker entry point, assets binding, Durable Object binding/export, three rate-limit bindings, all three cron schedules and release safety flags.
- SQLite migration/upsert verification passed against an in-memory SQLite database, including the four provider-source columns and the partial unique provider identity index.
- Provider upsert INSERT/UPDATE parameter shapes executed successfully in SQLite.
- Provider duplicate identity was rejected by the unique partial index as intended.

## Safety flags

Confirmed in the packaged source:

```text
BEDS24_FINANCE_SYNC_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

No live Beds24 credential is present in `wrangler.jsonc`.

## Secret hygiene

Passed.

- No OpenAI `sk-...` key pattern found in production/configuration source.
- No GitHub PAT pattern found in production/configuration source.
- No private-key PEM block found.
- No `.env`, production credentials JSON or secret JSON file is packaged.
- `BEDS24_REFRESH_TOKEN`, `BEDS24_WEBHOOK_TOKEN`, `BEDS24_ROOM_MAP`, `UNIFIED_MESSAGING_INTERNAL_TOKEN`, `OPENAI_API_KEY`, `WHATSAPP_ACCESS_TOKEN` and `META_APP_SECRET` are not committed as Wrangler vars.
- Beds24 token strings in automated tests are synthetic fixtures such as `refresh` / `refresh-secret`, not production credentials.

## Protected-boundary regression check

The following files are byte-for-byte unchanged from the final v5.11.56 baseline:

- `airbnb-sync/Code.gs`
- `src/passport-api.js`
- `src/expense-api.js`
- `src/finance-businesses.js`
- `src/housekeeping-operations.js`
- `src/maintenance-api.js`
- `src/whatsapp-alerts.js`
- `src/stay-api.js`
- `src/beds24-channel-manager.js`
- `src/unified-messaging.js`

All existing Wrangler variables from v5.11.56 retain their exact values. The only new Wrangler variable is `BEDS24_FINANCE_SYNC_ENABLED=false`. Existing Meta template names are unchanged.

## Wrangler CLI note

A native Wrangler CLI dry run was **not claimed**. `node_modules/.bin/wrangler` is not present in this sandbox, and the no-install CLI attempt could not complete. The release instead received syntax, JSONC and structural Wrangler configuration validation. This limitation does not change the 304/304 application regression result and is recorded here explicitly rather than reporting a dry run that did not execute.

## Final archive validation

The ready-to-push archive was independently extracted and validated:

- ZIP CRC/integrity: **passed**.
- Packaged files: **324**.
- Independently extracted regression suite: **304 passed / 0 failed**.
- Extracted JavaScript / ES-module syntax: **48 JS/MJS files passed**.
- Extracted Airbnb Apps Script syntax: **passed**.
- Extracted JSON validation: **12 JSON files passed**.
- Extracted `wrangler.jsonc` parse/safety flags: **passed**.
- Source/archive SHA-256 file-by-file comparison: **324 / 324 files matched exactly**.

## Packaging result

Final filename:

`The-House-Koh-Tao-v5.11.57-beds24-airbnb-finance-automation-ready-to-push.zip`

The final response reports the SHA-256 of the exact delivered ZIP. It is intentionally not embedded here because changing this file would itself change the ZIP hash.
