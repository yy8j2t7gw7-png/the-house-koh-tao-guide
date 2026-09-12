# THE HOUSE – KOH TAO
## Development Handoff — v5.11.57 Beds24 Airbnb Finance Automation

## 1. Authoritative baseline

v5.11.57 is built directly on the completed v5.11.56 Unified Messaging + Beds24 Channel Manager release.

v5.11.56 baseline behavior remains authoritative unless explicitly changed below.

The new release adds **Finance automation only for actual Airbnb channel-collected payouts**, and the feature ships disabled.

## 2. Owner requirement

Automatically feed Airbnb payments received by The House into Owner Admin Finance as income without removing the existing manual Finance capability.

The owner specifically wants actual payments/payouts, not merely reservation values, to become automatic Finance income.

## 3. Safety decision

New feature flag:

```text
BEDS24_FINANCE_SYNC_ENABLED=false
```

The automation no-ops while false.

It is independent from:

```text
BEDS24_CHANNEL_MANAGER_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

Neither existing safety flag is enabled by this release.

## 4. Provider source

The integration uses the already-established Beds24 API V2 authentication layer.

The Finance read requires:

- `read:bookings`
- `read:bookings-financial`

Beds24 states that `bookings-financial` exposes booking financial/invoice information in addition to the basic bookings scope.

The sync reads Airbnb bookings with invoice items included; it does not scrape Airbnb and does not require Airbnb credentials in The House source.

## 5. Accounting rule

The authoritative automated cash figure is the **actual Airbnb channel-collected payment reported by Beds24**.

A booking is not income merely because it exists.

For each Airbnb booking:

- actual channel-collected payment -> Finance `net`;
- Beds24 booking `price` -> gross booking/accommodation value when supplied;
- Beds24 booking `commission` -> OTA fee amount when supplied;
- booking/payment IDs -> audit/reconciliation notes.

If no actual payment exists, no new provider-managed Finance row is created.

If an existing imported payout later reconciles to no remaining payment because of a refund, the same provider-managed row is reconciled to refunded/zero rather than inserting a second transaction.

This makes the automated net figure cash-based while retaining booking economics for reconciliation.

## 6. New module

`src/beds24-finance-sync.js`

Responsibilities:

- strict feature-flag gate;
- readiness check for Beds24 refresh token + complete Room 1–11 mapping;
- Airbnb-only provider boundary;
- booking/invoice retrieval with financial fields;
- channel-collected payment extraction;
- refund handling;
- actual-payout-to-Finance normalization;
- provider identity construction;
- idempotent Finance reconciliation;
- daily sync result state.

The module does not guess room IDs. It uses the same explicit Beds24 <-> House room mapping as v5.11.56.

## 7. Provider-managed Finance identity

`income_records` gains source metadata:

- `source_system`
- `source_external_id`
- `source_status`
- `synced_at`

Existing/manual income rows default to:

```text
source_system = manual
source_external_id = ""
```

Beds24 Airbnb rows use:

```text
source_system = beds24
source_external_id = airbnb-booking:<Beds24 booking id>
```

A partial unique index on `(business_id, source_system, source_external_id)` for non-empty provider identities prevents provider duplicates at storage level.

## 8. Idempotent upsert

New store operations:

- `getProviderIncome(...)`
- `upsertProviderIncome(...)`

A repeated sync updates the same provider-managed income row. It does not create a duplicate simply because the scheduled reconciliation or owner manual sync runs again.

Provider changes are audit logged when financial/status values change.

## 9. Provider-managed deletion protection

`deleteIncome(...)` now rejects deletion when `source_system != manual`.

Owner Admin therefore does not show the normal Delete control for an automated Beds24 row and labels it as managed automatically by Beds24.

This is deliberate: provider reconciliation should correct a provider-managed financial record so source identity and audit history remain intact.

Manual income deletion behavior remains unchanged.

## 10. Finance API additions

`src/finance-api.js` adds:

- Beds24 Finance automation state to `/api/concierge/admin/finance/configuration`;
- automation state to the normal Finance payload;
- owner-only `POST /api/concierge/admin/finance/beds24-sync` for controlled reconciliation tests;
- `providerManaged` metadata on returned Finance income rows;
- HTTP 409 for attempts to delete provider-managed income.

The automation is available only for The House Finance business. Bamboo Finance receives no Beds24 automation.

## 11. Owner Admin additions

Finance gains an **Airbnb payout automation** panel.

It reports:

- disabled state;
- enabled-but-not-ready state;
- ready state.

When ready, an owner-only **Sync Airbnb payouts now** button is available for controlled testing.

Provider-managed saved income rows show Beds24/source status and do not expose the manual Delete button.

Existing Finance forms, reports, expense entry and manual income entry remain intact.

## 12. Scheduled reconciliation

The existing daily maintenance cron also invokes `reconcileBeds24Finance(env)`.

The call is harmless while `BEDS24_FINANCE_SYNC_ENABLED=false` because the module returns immediately without provider work.

No new cron is added.

## 13. Beds24 Airbnb invoice/payment configuration

Beds24 documents that Airbnb invoice configuration can import an **actual payment** that begins at zero and later updates when Airbnb pays.

Production setup must therefore import channel-collected payment information, using an Airbnb invoice option such as:

- Expected payout amount and actual payment; or
- All charges and actual payment.

See `BEDS24_FINANCE_SYNC_SETUP_v5.11.57.md`.

## 14. Production credential change

No credential is committed.

If the v5.11.56 refresh token was created without `read:bookings-financial`, it must be replaced with a token created from a new Beds24 API V2 invite code containing that scope. Beds24 scopes are selected when the invite code is created.

Store the resulting refresh token only as the existing Cloudflare Secret `BEDS24_REFRESH_TOKEN`.

## 15. Current channel boundary

v5.11.57 Finance automation claims **Airbnb only**.

Do not assume Booking.com, Expedia, Vrbo, Agoda, Hostelworld or Trip.com payment semantics are identical. Add each later only after its channel-collect/refund behavior has been validated.

## 16. Files changed from v5.11.56

Functional:

- `src/beds24-finance-sync.js` — new
- `src/concierge-store.js`
- `src/finance-api.js`
- `src/index.js`
- `public/concierge-admin.html`
- `public/concierge-admin.js`
- `tests/concierge.test.mjs`
- `wrangler.jsonc`

Release/version metadata:

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

## 17. Explicitly preserved / not changed

No functional changes were made to:

- passport / Thai ID / TM30;
- expense entry/editing/receipt storage;
- Bamboo Finance role/access behavior;
- housekeeping / room readiness;
- maintenance;
- lost-key / spare-key flow;
- Airbnb Apps Script synchronization;
- existing Meta template names or staff alert routing;
- v5.11.56 Beds24 Channel Manager behavior;
- v5.11.56 Unified Messaging behavior;
- unrelated guest Concierge/guide behavior;
- deferred Taoedge commercial-demo items.

## 18. Automated regressions added

Seven v5.11.57 tests extend the suite from 297 to **304 tests** and cover:

1. safe disabled-by-default/readiness state and required financial scope;
2. actual channel-collected payment + refund parsing while ignoring unrelated payment items;
3. actual payout net/gross/commission/room/provider identity mapping;
4. no new Finance income before an actual payout exists;
5. idempotent provider reconciliation and update rather than duplicate insertion;
6. provider-managed income deletion protection;
7. Owner Admin/scheduler/config feature-flag contract.

## 19. Validation

Final source/archive validation is recorded separately in:

`VALIDATION_RESULTS_v5.11.57.md`

Target release suite: **304 passed / 0 failed**.

## 20. Deployment / activation order

1. Push/deploy v5.11.57 with `BEDS24_FINANCE_SYNC_ENABLED=false`.
2. Finish the v5.11.56 Beds24 property/room/import/Airbnb setup first.
3. Configure Airbnb invoice + Channel Collect Payments in Beds24.
4. Ensure the production API V2 refresh token includes `read:bookings-financial` plus the required existing Beds24 scopes.
5. Keep all live tokens/secrets out of GitHub.
6. Select one known Airbnb payout and note gross/commission/net externally.
7. Deliberately set `BEDS24_FINANCE_SYNC_ENABLED=true` for the controlled test.
8. In Owner Admin Finance, run **Sync Airbnb payouts now** once.
9. Compare House Finance with the Airbnb payout and Beds24 Charges & Payments.
10. Run the sync again and prove no duplicate is created.
11. Verify a refund/update case before relying on daily automation where practical.
12. Leave the flag enabled only after those checks succeed; otherwise return it to false.

Do not enable the Beds24 Channel Manager or AI auto-send merely because Finance sync is being tested. Their activation remains governed by their separate v5.11.56 validation requirements.

## 21. GitHub Desktop

### Summary

`Release v5.11.57 Beds24 Airbnb finance automation`

### Description

`Add opt-in Beds24 Airbnb payout reconciliation to The House Finance using actual channel-collected payments as authoritative net income; preserve booking gross value and commission for reconciliation; add provider-managed source identity, idempotent upsert/update, refund handling, automated-row deletion protection, Owner Admin automation status/manual sync, and daily reconciliation. Ship BEDS24_FINANCE_SYNC_ENABLED=false, keep Beds24 Channel Manager and AI auto-send disabled, commit no credentials, and preserve existing manual Finance, passport/TM30, housekeeping, maintenance, lost-key, Meta templates, Airbnb Apps Script and unrelated House behavior. Final automated suite: 304 passed / 0 failed.`
