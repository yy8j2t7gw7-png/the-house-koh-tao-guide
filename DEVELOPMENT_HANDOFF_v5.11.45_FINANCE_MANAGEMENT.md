# THE HOUSE – KOH TAO
## Development Handoff v5.11.45 — Owner Finance Management

### 1. Authoritative baseline

This release is built directly on the latest finalized v5.11.45 package:

`The-House-Koh-Tao-v5.11.45-direct-stay-code-regeneration-ready-to-push.zip`

That baseline already includes the stable v5.11.42-based branch, Airbnb five-minute fast sync, approved Meta action templates, guest upload-only passport registration with Owner Admin in-person exception, Room 7 guide/direct testing, verified-but-registration-pending arrival access, Room 7 direct-stay router correction, and owner-only direct-stay code regeneration.

Do not rebase this work onto the abandoned v5.11.43/v5.11.44 passport-detail experiment.

### 2. Release scope

This release adds one isolated Owner Admin module:

**Finance — Income + Expenses**

It combines:

- manual income recording;
- gross / fees / net income calculation;
- receipt-assisted expense draft extraction;
- owner confirmation before any expense is saved;
- private receipt storage;
- duplicate warnings;
- monthly finance totals;
- operating-result calculation;
- room / area finance analysis;
- CSV export for income and expenses.

No guest-facing Concierge behavior, registration flow, passport rules, Airbnb synchronization, Meta templates, lost-key behavior, pest handling, luggage, booking, cleaning, maintenance, emergency routing, room data or guest-facing messaging is changed.

### 3. Owner Admin workflow

Owner Admin now contains one collapsible **Finance — income & expenses** section.

#### Income

Owner can enter:

- date;
- source/category;
- gross income;
- fees / commission;
- net income calculated automatically;
- optional room / unit;
- description;
- payment method;
- booking/payment reference;
- notes.

Income is saved only after explicit owner submission. A likely duplicate returns a warning and requires explicit confirmation before another matching record can be created.

Default income categories are:

- Airbnb;
- Direct booking;
- Stay extension;
- Other accommodation;
- Other income.

They are configurable through `INCOME_CATEGORIES` for future white-label deployments.

#### Expenses

Owner can:

1. take a new receipt photo on mobile, choose an existing photo/file, upload a PDF, or enter manually;
2. press **Analyze receipt**;
3. receive an AI-prepared draft only;
4. review/correct every field;
5. press **Save expense**;
6. only then store the expense and optional private receipt.

The receipt-analysis request uses the configured OpenAI Responses model with `store:false`. Analysis never creates an expense record and never stores the receipt.

### 4. Finance calculations

For each selected month the dashboard reports:

- gross income;
- fees / commission;
- net income;
- expenses;
- **operating result = net income - expenses**;
- number of saved finance entries;
- room / area summaries showing income, expenses and operating result.

The UI deliberately calls this **operating result**, not accounting profit. Taxes, depreciation, accruals and other statutory accounting adjustments are outside this module.

### 5. Expense fields and receipt formats

Expense records contain:

- expense date;
- category;
- description;
- amount stored in currency minor units;
- currency;
- vendor;
- payment method;
- optional room / property area;
- notes;
- private receipt metadata;
- hashed admin actor identifier;
- created timestamp.

Receipt analysis may suggest date, final amount, vendor, description, category, payment method, room/area, confidence and short notes.

Maximum receipt size: **10 MB**.

Supported files:

- JPEG;
- PNG;
- WebP;
- HEIC;
- PDF.

The mobile file input does not force camera capture, so compatible phones can offer camera, photo library and file selection.

### 6. Private receipt storage

Receipts are stored privately under:

`expenses/YYYY-MM/<random-id>.<extension>`

The module can use an `EXPENSE_RECEIPTS` R2 binding. In the current single-property deployment it can safely fall back to the existing private `PASSPORT_UPLOADS` bucket using the separate `expenses/` prefix.

Accounting receipts must **not** inherit the passport 14-day deletion lifecycle. The passport lifecycle remains scoped to `passport/` data only.

Deleting an expense also deletes its attached receipt object.

Receipt files are never exposed through public asset URLs and are never copied to Concierge history, learning data, WhatsApp, ordinary logs or guest pages.

### 7. Duplicate protection

Expenses check likely duplicates using date + amount + currency + vendor when available.

Income checks likely duplicates using date + gross amount + currency plus room/unit and/or reference when supplied.

A match does not silently create another record. Owner confirmation is required to save anyway.

### 8. Finance export

**Export finance CSV** creates one monthly spreadsheet-compatible CSV containing both record types.

Income rows contain gross, fees and net income.

Expense rows contain expense amount and receipt-presence status.

Each row also includes the operating effect, category/source, room/area, payment method, reference/vendor and notes as applicable.

### 9. Property-generic / commercialization architecture

This module is intentionally property-generic and introduces no new The House-specific assumptions into finance core logic.

Configuration supports:

- `EXPENSE_CURRENCY` — default `THB`;
- `PROPERTY_TIME_ZONE` — default `Asia/Bangkok`;
- `EXPENSE_CATEGORIES` — configurable JSON list;
- `INCOME_CATEGORIES` — configurable JSON list;
- `EXPENSE_EXTRACTION_MODEL` — optional model override;
- optional dedicated `EXPENSE_RECEIPTS` R2 binding.

Income uses generic `unit`; expenses use generic `roomArea`. Currency minor-unit precision is derived from `Intl`, allowing currencies such as EUR without changing storage code.

Regression coverage proves a non-House configuration using EUR, Europe/Berlin and custom expense/income categories works without core-code changes.

Standing architecture requirement for every future development/handoff:

- preserve modularity for eventual sale/adaptation to other hospitality businesses;
- avoid new The House-specific assumptions in core logic where reasonably possible;
- distinguish the current single-property/white-label deployment model from a future true multi-property SaaS model;
- eventually perform a deliberate platformization phase moving property-specific branding, rooms, timezone, hours, fees, contacts, booking integration mappings and local content into centralized property configuration without changing The House behavior.

### 10. Files changed versus the authoritative baseline

New runtime files:

- `src/expense-api.js` — expense CRUD, receipt analysis, private receipt storage/download, duplicate checks, expense CSV compatibility.
- `src/finance-api.js` — income CRUD, finance aggregation, operating result, room/area summaries and combined finance CSV.

Changed runtime/UI files:

- `src/concierge-api.js` — owner-authenticated routing into the isolated finance/expense APIs only.
- `src/concierge-store.js` — `expense_records` and `income_records` Durable Object SQL tables plus CRUD/duplicate helpers.
- `public/concierge-admin.html` — Finance section with income and receipt-assisted expense forms.
- `public/concierge-admin.js` — finance loading, calculations display, income save/delete, expense workflow and export.
- `public/concierge-admin.css` — responsive Finance/Expense Admin styling only.

Tests:

- `tests/concierge.test.mjs` — finance, expense, privacy, authorization, duplicate, export and white-label regressions.

Documentation:

- `DEVELOPMENT_HANDOFF_v5.11.45_FINANCE_MANAGEMENT.md` — this handoff.

No Airbnb Apps Script file was changed.

### 11. Preserved behavior / explicit non-scope

This release does not authorize changes to:

- Concierge guest usability or existing answer wording;
- verified-arrival-access permissions;
- passport upload or Admin in-person registration;
- Airbnb Gmail/iCal fast sync;
- Room 7 Airbnb exclusion;
- direct-stay verification-code behavior;
- Meta template mappings or payload commands;
- towel/cleaning/maintenance/luggage/booking alert routing;
- pest detection;
- emergency routing;
- lost-key fee, notification gate, key-box secrecy or rotation locks;
- Explore flag;
- room imagery or location copy.

Finance actions create **no guest operational alerts** and do not use WhatsApp.

### 12. Validation completed

Full automated suite after Income + Expense integration:

**240 passed / 0 failed**

New finance regressions prove:

- income gross/fees/net calculation;
- fees cannot exceed gross income;
- income duplicate warnings;
- monthly income + expense aggregation;
- operating-result calculation;
- room/unit finance summaries;
- combined finance CSV;
- owner-only finance routing;
- income deletion/audit;
- configurable currency, timezone and income categories for white-label deployments.

Existing expense regressions continue to prove:

- AI analysis returns a draft only and uses `store:false`;
- analysis does not store receipt files or create expenses;
- confirmed save stores private receipts;
- expense duplicate warnings;
- receipt download remains private;
- deletion removes attached receipt;
- owner-only routing;
- camera/photo/file upload compatibility;
- no finance alert dispatch.

### 13. Deployment notes

No Google Apps Script update is required.

No Meta template/configuration change is required for this Finance release.

No new R2 bucket is required for the current deployment because expenses can use the existing private bucket under `expenses/`; a dedicated `EXPENSE_RECEIPTS` binding remains supported for future deployments.

AI receipt extraction requires the existing OpenAI API key. If extraction is unavailable, manual expense entry remains usable.

Before push/deploy, run locally:

- `npm ci`
- `npm test`
- `npx wrangler deploy --dry-run`

Do not claim Wrangler dry-run success unless it completes in the deployment environment.

### 14. Current limitations intentionally left for later

Version 1 does not include:

- automatic Airbnb payout/revenue import;
- automatic booking-value assumptions;
- saved-record editing in place (delete/re-enter is available);
- multiple receipt attachments per expense;
- native XLSX generation (CSV is supplied);
- recurring rent/salary automation;
- statutory accounting profit/tax/VAT filing;
- accountant role/access;
- automatic saving without owner review.

Income remains manual because reservation value is not guaranteed to equal money actually received after platform fees, changes, refunds or cancellations.

### 15. REQUIRED NEXT SEPARATE RELEASE — PASSPORT UPLOAD STAFF ALERTS

The owner explicitly requested this as the next development after Finance Management.

After a passport image upload is successfully stored **and registration progress has successfully persisted**, send a privacy-safe staff alert to:

- Fah;
- Owner 1;
- Owner 2.

The notification should include only operational progress, for example:

`Passport received — Room 5 — 1 of 3 received`

Never transmit through WhatsApp:

- passport image;
- passport number;
- name from the passport;
- birthday;
- nationality;
- gender;
- any other passport content.

No false-success notification may be sent after failed upload/storage/state persistence.

Before implementing, inspect the current approved Meta schemas and recipient groups. Reuse an existing template only if its semantics and parameter order are appropriate; otherwise define the smallest new privacy-safe utility template rather than misusing an unrelated template.

Keep this as a separate release so Finance Management cannot affect passport/WhatsApp behavior.

### 16. Final status

**Finance Management v1 is implemented and regression-clean on v5.11.45.**

Next planned development: **passport-upload privacy-safe staff alerts to Fah + both owners**.
