# THE HOUSE – KOH TAO
## Release Notes v5.11.57 — Beds24 Airbnb Finance Automation

### Added

- Opt-in Beds24 -> The House Finance reconciliation for **Airbnb actual payouts**.
- New `src/beds24-finance-sync.js` financial sync layer.
- `BEDS24_FINANCE_SYNC_ENABLED` safety flag, shipped as `false`.
- Provider-managed income identity using `source_system` + `source_external_id` so one Beds24 Airbnb booking maps to one Finance income record.
- Automatic update/reconciliation of a previously imported payout instead of duplicate Finance rows.
- Refund/cancelled-paid reconciliation that can zero/refund the provider-managed Finance row when Beds24 later reports no remaining actual channel-collected payment.
- Owner Admin **Airbnb payout automation** status and an owner-only **Sync Airbnb payouts now** control for deliberate testing.
- Daily scheduled reconciliation when the feature is deliberately enabled.
- Provider-managed income protection: automated Beds24 rows cannot be manually deleted from Finance.

### Accounting model

The automation is intentionally cash-based for its authoritative net-income figure:

1. An Airbnb reservation by itself creates **no Finance income**.
2. Beds24 must report an actual Airbnb **channel-collected payment**.
3. That actual payment becomes the Finance **net** amount.
4. Beds24 booking `price` is retained as the gross booking/accommodation value where supplied.
5. Beds24 booking `commission` is retained as the Airbnb/OTA fee amount where supplied.
6. The provider booking ID, payment item IDs, booking value and commission are retained for audit/reconciliation.
7. Refund updates reconcile the same provider-managed row rather than creating a second income record.

This deliberately avoids treating an unpaid or merely expected Airbnb booking as cash income.

### Beds24 requirements

The sync is not considered ready unless all of the following are true:

- `BEDS24_FINANCE_SYNC_ENABLED=true`;
- a valid Beds24 API V2 refresh token exists in Cloudflare Secrets;
- the token has `read:bookings` and `read:bookings-financial` access;
- the explicit Beds24 <-> House Room 1–11 mapping is complete;
- Airbnb channel-collected payments are imported into Beds24 booking Charges & Payments.

Beds24 documents that `bookings-financial` is required to access booking invoice/financial data. Beds24's Airbnb invoice settings can create an actual-payment item that starts at zero and updates when Airbnb makes the payout.

See `BEDS24_FINANCE_SYNC_SETUP_v5.11.57.md` before enabling the flag.

### Preserved safety boundaries

- `BEDS24_FINANCE_SYNC_ENABLED=false` in the release package.
- `BEDS24_CHANNEL_MANAGER_ENABLED=false` remains unchanged.
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false` remains unchanged.
- No Beds24 credential, refresh token, webhook token, room map or internal messaging token is committed.
- Existing manual Finance income and expense entry remains available and unchanged.
- Existing saved-expense editing remains unchanged.
- Passport / Thai ID / TM30 is unchanged.
- Housekeeping / room readiness is unchanged.
- Maintenance is unchanged.
- Lost-key / spare-key behavior is unchanged.
- Existing Meta template names and staff alert behavior are unchanged.
- Existing Airbnb Apps Script synchronization is unchanged.
- Deferred Taoedge commercial-demo fixes remain deferred.

### Files changed from v5.11.56

Core:

- `src/beds24-finance-sync.js` — new
- `src/concierge-store.js`
- `src/finance-api.js`
- `src/index.js`

Owner Admin:

- `public/concierge-admin.html`
- `public/concierge-admin.js`

Release/configuration/tests:

- `wrangler.jsonc`
- `tests/concierge.test.mjs`
- `package.json`
- `package-lock.json`
- `src/concierge-api.js`
- `public/ai-concierge-config.js`
- `public/i18n.js`
- `public/module-registry.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `CHANGELOG.md`
- `RELEASE_NOTES_v5.11.57.md`
- `DEVELOPMENT_HANDOFF_v5.11.57_BEDS24_AIRBNB_FINANCE_AUTOMATION.md`
- `BEDS24_FINANCE_SYNC_SETUP_v5.11.57.md`
- `VALIDATION_RESULTS_v5.11.57.md`

### Automated coverage

Seven v5.11.57 regressions extend the v5.11.56 suite from 297 to **304 tests**. They cover:

- disabled-by-default/readiness behavior;
- required Beds24 financial scope declaration;
- channel-collected-payment parsing;
- refund handling;
- rejection of unrelated/manual payment items;
- actual payout -> net income mapping;
- gross/commission/room/provider identity preservation;
- no income before a real payout;
- idempotent provider upsert/update rather than duplicate creation;
- provider-managed deletion protection;
- Owner Admin/scheduler/feature-flag contracts.

Final validation and archive evidence is recorded in `VALIDATION_RESULTS_v5.11.57.md`.

### Deployment

Deploy normally after reviewing the archive. **Do not enable Beds24 Finance Sync during deployment.**

After v5.11.57 is live, complete the Beds24 setup and controlled payout comparison in `BEDS24_FINANCE_SYNC_SETUP_v5.11.57.md`. Only after a known Airbnb payout matches Beds24 and The House Finance should `BEDS24_FINANCE_SYNC_ENABLED` be deliberately changed to `true`.
