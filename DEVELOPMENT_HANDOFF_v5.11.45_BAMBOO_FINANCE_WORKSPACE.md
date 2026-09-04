# DEVELOPMENT HANDOFF — v5.11.45 Bamboo Beach Bar Finance Workspace

## Status
Ready-to-push candidate built on the authoritative `v5.11.45 Thai ID + TM30 tracking` baseline.

This release adds a second real business finance workspace for **Bamboo Beach Bar** while preserving **The House – Koh Tao** as the default finance business and leaving all guest/operations systems unchanged.

## Authoritative baseline
- Baseline release: `The-House-Koh-Tao-v5.11.45-thai-id-tm30-tracking-ready-to-push.zip`
- Baseline behavior retained, including Finance Management, Thai ID evidence, TM30 status tracking, Room 7 direct testing, verified-arrival access, direct-stay code regeneration, Airbnb fast sync, Meta alert templates, protected lost-key flow, maintenance, Concierge and registration security.

## Exact scope implemented

### 1. Dedicated Bamboo Finance dashboard
New private owner page:
- `/bamboo-finance`

It uses the same owner admin authorization token as the existing Owner Admin and provides Bamboo-only:
- monthly finance overview;
- net income;
- expenses;
- operating result;
- finance entry count;
- area/revenue-stream summary;
- manual income entry;
- gross / fees / net income tracking;
- expense entry;
- receipt photo/PDF upload;
- AI-assisted receipt analysis into an owner-review draft;
- duplicate warning for income and expenses;
- private receipt download;
- deletion of income and expenses;
- combined Bamboo finance CSV export.

A small `Bamboo Finance` link was added to the existing Owner Admin toolbar. Bamboo Finance links back to The House Admin.

### 2. Bamboo-specific finance categories
Default Bamboo expense categories:
- Beverage stock
- Food & mixers
- Salary
- Entertainment
- Equipment
- Repairs & maintenance
- Utilities
- Rent
- Licences & permits
- Marketing
- Security
- Transport
- Cleaning
- Other

Default Bamboo income categories:
- Bar sales
- Events
- Food sales
- Other income

Bamboo location/analysis examples:
- Bar
- Beach area
- Storage
- Office
- Events

These defaults can later be moved fully into tenant/property configuration for commercialization.

### 3. Business-scoped Finance data model
Finance records now carry a `business_id`.

Current business IDs:
- `the-house-koh-tao`
- `bamboo-beach-bar`

SQLite migration behavior:
- existing expense rows automatically remain assigned to `the-house-koh-tao` via the non-null default;
- existing income rows automatically remain assigned to `the-house-koh-tao` via the non-null default;
- new indexes scope finance lookups by business + date.

All list/get/create/delete/duplicate-check Finance operations are business-scoped.

Unknown business IDs fail closed with `invalid_business`; they do not silently fall back to The House.

### 4. Receipt storage isolation
The House receipt object paths remain unchanged:
- `expenses/YYYY-MM/...`

Bamboo receipts use a separate private object prefix:
- `finance/bamboo-beach-bar/expenses/YYYY-MM/...`

Receipts remain owner-only and continue to use the existing private receipt storage binding/fallback. No receipt is exposed to guests, Concierge or WhatsApp.

### 5. Existing House Finance behavior preserved
The House remains the default whenever no `business` is supplied.

Preserved compatibility includes:
- existing House expense/income rows;
- House categories and environment overrides;
- House receipt path;
- existing House Finance Admin UI;
- existing House CSV filenames (`finance-YYYY-MM.csv` and `expenses-YYYY-MM.csv`);
- existing currency/timezone behavior;
- existing receipt analysis behavior.

## Files changed
Runtime:
- `src/concierge-store.js`
- `src/expense-api.js`
- `src/finance-api.js`
- `src/index.js`
- `public/concierge-admin.html`
- `public/concierge-admin.css`

New runtime files:
- `src/finance-businesses.js`
- `public/bamboo-finance.html`
- `public/bamboo-finance.js`
- `public/bamboo-finance.css`

Tests:
- `tests/concierge.test.mjs`

Documentation:
- `DEVELOPMENT_HANDOFF_v5.11.45_BAMBOO_FINANCE_WORKSPACE.md`

## Explicitly unchanged
No intended functional changes were made to:
- AI Concierge guest messaging or routing;
- guest verification / registration state machine;
- passport or Thai ID upload behavior;
- TM30 marking behavior;
- passport retention;
- Airbnb synchronization;
- `airbnb-sync/Code.gs`;
- Meta WhatsApp templates;
- WhatsApp alert recipients/routing;
- lost-key flow / key-box behavior;
- housekeeping / cleaning requests;
- maintenance / emergency workflows;
- room data / Room 7 guest-guide behavior;
- direct stay creation / code regeneration;
- Finance behavior for The House apart from additive internal business scoping required to support Bamboo.

The following critical files are byte-identical to baseline:
- `airbnb-sync/Code.gs`
- `package.json`
- `package-lock.json`
- `wrangler.jsonc`

No Google Apps Script update is required for this release.

## Validation
Completed in development source:
- `npm test`: **247 passed / 0 failed**
- JS/MJS + `Code.gs` syntax: **41 files passed**
- JSON: **12 files valid**
- `wrangler.jsonc`: valid after JSONC comment stripping
- `npx wrangler deploy --dry-run`: attempted in this environment but timed out before producing a result; **dry-run success is not claimed**

New regression coverage verifies:
- Bamboo and The House expenses are isolated;
- Bamboo and The House income is isolated;
- duplicate detection is business-scoped;
- monthly totals are business-scoped;
- Bamboo receipt object keys use a separate prefix;
- Bamboo CSV contains Bamboo records only;
- invalid finance business IDs fail closed;
- Durable Object schema includes business IDs/indexes;
- Bamboo dashboard uses only owner-admin Finance endpoints;
- The House legacy CSV filenames remain unchanged.

## Deployment
Use the same existing GitHub repository / Cloudflare Worker deployment used for The House.

Do **not** create a separate Bamboo repository, Worker or Apps Script project for this release.

Recommended local pre-push sequence:
```bash
npm ci
npm test
npx wrangler deploy --dry-run
```

Then commit/push/deploy using the existing release workflow.

After deployment:
1. Open `/concierge-admin` and confirm the new `Bamboo Finance` link is visible.
2. Open `/bamboo-finance`.
3. Log in with the existing owner admin token.
4. Add one Bamboo test expense without a receipt.
5. Add one Bamboo test income.
6. Confirm Bamboo totals update.
7. Confirm The House Finance still shows only House records.
8. Optionally attach a Bamboo receipt and confirm it can be privately opened/downloaded.
9. Export Bamboo CSV and confirm only Bamboo records are present.
10. Delete the test records if they were only for smoke testing.

## Known limitations / deliberate boundaries
- Bamboo uses the same owner admin token as The House. Separate staff roles/tokens are not part of this release.
- Bamboo and The House are logically isolated by `business_id` inside the same current Durable Object/storage architecture; this is not yet full SaaS tenant infrastructure.
- No POS integration or automated Bamboo sales import is included.
- No inventory/COGS calculation is included yet.
- Receipt AI extraction remains draft-only; owner confirmation is required before saving.
- Receipt storage remains in the existing private receipt bucket binding/fallback, separated by object prefix rather than a second bucket.

## Commercialization / white-label architecture note
This release is a useful controlled platformization step: one Finance engine now serves two different hospitality businesses without duplicating the codebase.

For the future commercial platform, continue evolving this pattern into a centralized tenant/property configuration with a true `propertyId`/`businessId` boundary across all modules and, eventually, stronger tenant-level storage/auth isolation. Do not clone the codebase per customer.

The House remains Property/Business #1; Bamboo demonstrates Finance as a reusable module for a different hospitality business type.

## Next recommended release
The previously agreed next separate release remains:

**Passport/Thai-ID upload alerting**
- after successful document upload + registration progress save;
- notify Fah + both owners;
- dedicated appropriate Meta template;
- include operational room/reference/progress only;
- never send passport/ID image or sensitive document data through WhatsApp;
- failed upload/storage must not trigger a false received alert.

After that, continue with reservation-aware Concierge / early check-in logic, Admin calendar / Today's Operations, multi-channel reservations, and demo tenant as previously planned.
