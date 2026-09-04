# THE HOUSE – KOH TAO / BAMBOO BEACH BAR
## Development Handoff — v5.11.45 Bamboo Finance role access

Date: 2026-09-04

## 1. Authoritative baseline

This release continues the **unpushed v5.11.45 development line**. The owner explicitly confirmed that v5.11.45 has **not** been pushed yet.

The code baseline for this change is the latest unpushed v5.11.45 Bamboo Finance workspace, which already includes the earlier unpushed v5.11.45 Finance Management, Thai-ID/TM30 tracking, Room 7/direct-stay and verified-arrival-access work.

This handoff supersedes the previous Bamboo Finance workspace handoff for the next push.

## 2. Exact scope implemented

### Separate credentials

The three administrative credentials are now deliberately separated:

- `CONCIERGE_ADMIN_TOKEN` — The House Owner Admin only.
- `BAMBOO_FINANCE_OWNER_TOKEN` — Bamboo Beach Bar Finance owner access.
- `BAMBOO_FINANCE_STAFF_TOKEN` — Bamboo Beach Bar staff-entry access.

The backend rejects ambiguous authentication if the same secret is accidentally reused for more than one role/business. All three values should therefore be different.

### Bamboo owner access

Owner dashboard remains:

- `/bamboo-finance`

Owner permissions include:

- view all Bamboo income and expenses;
- view monthly net income, expenses and operating result;
- view Cash / QR code / other payment-method income totals;
- view area/revenue-stream results;
- view whether an entry was created by Owner or Staff;
- open/download private receipts;
- delete income and expenses;
- download the monthly combined Finance CSV;
- print the selected monthly finance report.

### Bamboo staff access

New staff page:

- `/bamboo-finance/staff`

Staff can:

- submit income;
- choose payment method, including **Cash** and **QR code**;
- submit expenses;
- photograph/upload a receipt or PDF;
- use receipt analysis to prepare a draft;
- manually correct/enter the bill before saving.

Staff cannot, at the API layer:

- read monthly finance totals;
- read income history;
- read expense history;
- see other existing finance records through duplicate warnings;
- download CSV reports;
- print owner reports;
- download stored receipts;
- delete income;
- delete expenses;
- access The House Owner Admin or its non-finance admin APIs.

The owner/staff distinction is therefore **server-side authorization**, not merely hidden UI.

### Payment methods

Bamboo payment methods now include:

- Cash
- QR code
- Card
- Bank transfer
- Other

The House payment-method contract remains unchanged. `QR code` is added for Bamboo without changing The House behavior.

### Audit metadata

Finance records now include `created_by_role`, stored as:

- `owner`
- `staff`

Existing records/default migrations resolve to `owner` so existing v5.11.45 Finance data is not invalidated.

Bamboo owner UI and Bamboo combined CSV expose whether the record was entered by Owner or Staff.

## 3. Files changed in this delta

Compared with the immediately previous unpushed Bamboo Finance workspace, only these files changed:

1. `public/bamboo-finance-staff.html` — new staff-entry page.
2. `public/bamboo-finance-staff.js` — new staff-entry client logic.
3. `public/bamboo-finance.css` — staff status styling and print rules.
4. `public/bamboo-finance.html` — owner password wording, staff link, print/download controls, QR option/payment summary.
5. `public/bamboo-finance.js` — owner-specific session token, payment-method rendering, creator-role display, print support.
6. `src/concierge-api.js` — separate House/Bamboo owner/Bamboo staff authentication and server-side scope enforcement.
7. `src/concierge-store.js` — `created_by_role` schema/migration and persistence.
8. `src/expense-api.js` — role-aware Bamboo expense permissions, QR validation, staff duplicate redaction, creator role.
9. `src/finance-api.js` — role-aware income/report permissions, staff-safe config endpoint, QR validation, payment breakdown, creator role in Bamboo CSV.
10. `src/finance-businesses.js` — Bamboo-specific payment-method configuration.
11. `src/index.js` — `/bamboo-finance/staff` route.
12. `tests/concierge.test.mjs` — role/security/payment-method regressions and admin-page classification.

No Google Apps Script change is required.

## 4. Explicitly preserved / not changed by this delta

This role-access change does **not** modify:

- Airbnb Gmail/iCal synchronization or `airbnb-sync/Code.gs`;
- Meta WhatsApp templates or alert delivery;
- passport / Thai-ID upload behavior;
- TM30 marker behavior;
- guest registration rules;
- verified arrival access;
- guest Concierge routing or wording;
- lost-key behavior;
- maintenance workflows;
- housekeeping/service alerts;
- emergency routing;
- Room 7 behavior;
- direct-stay verification codes;
- The House Finance categories, payment methods, receipt paths or existing owner authentication.

## 5. Security properties

- No real password/token is stored in source, tests or the ZIP.
- Bamboo owner/staff credentials are Cloudflare secrets only.
- Staff read/report/delete restrictions are enforced by the Worker API.
- Bamboo credentials cannot access The House admin routes.
- The House credential cannot be used to read Bamboo Finance data.
- Duplicate secrets fail closed rather than silently promoting a staff credential to owner access.
- Staff duplicate warnings do not reveal existing record details.
- Private receipts remain in the existing private receipt storage model.

## 6. Validation

Full regression suite after implementation:

- `npm test`: **251 passed / 0 failed**

Added regression coverage proves:

- separate owner/staff Bamboo credentials;
- Bamboo staff can submit income and expense data;
- Bamboo staff cannot read finance history/totals;
- Bamboo staff cannot export reports;
- Bamboo staff cannot access receipt downloads;
- Bamboo staff cannot delete records;
- Bamboo staff cannot access The House Admin;
- Bamboo owner can see staff-entered records;
- owner report shows QR income/payment totals;
- staff duplicate response contains no record details;
- House token cannot access Bamboo data;
- Bamboo token cannot access House finance;
- duplicate configured secrets fail closed;
- QR code is accepted for Bamboo while The House payment-method behavior is preserved.

Final package validation completed from a clean ZIP extraction:

- fresh-extraction `npm test`: **251 passed / 0 failed**;
- **41 JS/MJS files** passed `node --check`;
- `airbnb-sync/Code.gs` passed syntax validation via a temporary `.js` copy;
- **12 JSON files** parsed successfully;
- `wrangler.jsonc` parsed successfully after JSONC comment/trailing-comma normalization;
- ZIP integrity passed;
- clean source and extracted package: **283 / 283 files hash-identical**;
- no `.git`, `.wrangler`, `node_modules`, `__MACOSX` or `.DS_Store` packaged.

`npx wrangler deploy --dry-run` was attempted in this environment but timed out, so **Wrangler dry-run success is not claimed**. Run it locally before deployment.

## 7. Cloudflare secrets required before using Bamboo dashboards

Do **not** put these passwords in `wrangler.jsonc`, GitHub or source files.

The existing House secret remains:

- `CONCIERGE_ADMIN_TOKEN`

Add two new Worker secrets:

- `BAMBOO_FINANCE_OWNER_TOKEN`
- `BAMBOO_FINANCE_STAFF_TOKEN`

Use three different strong values.

The owner will receive exact step-by-step Cloudflare instructions with the release ZIP.

## 8. Deployment / smoke test

After the final ZIP is copied into the existing GitHub working folder:

1. Run `npm ci`.
2. Run `npm test`.
3. Run `npx wrangler deploy --dry-run`.
4. Review the GitHub Desktop diff.
5. Commit/push once.
6. Deploy the same Worker; do not create a separate Bamboo Worker/repository.
7. Confirm the two new Bamboo secrets are configured in Cloudflare.
8. Test `/bamboo-finance` with the owner password.
9. Test `/bamboo-finance/staff` with the staff password.
10. Confirm the staff password cannot open the owner dashboard or The House Admin.
11. Submit one Cash income record and one QR-code income record from Staff.
12. Confirm both appear in Owner Finance with `Entered by staff` and the monthly payment-method breakdown.
13. Test one expense + receipt from Staff.
14. Confirm Owner can view/download the receipt, print the month and export CSV.

## 9. Commercial / white-label note

This is an intentional intermediate step toward the future multi-property SaaS model. It establishes role-based server authorization and business-scoped Finance data while keeping the current one-deployment architecture stable.

For the commercial platform, shared static Worker secrets should eventually be replaced with proper tenant users, named staff accounts, password reset/session management, and permission sets such as `finance_owner`, `finance_staff`, `front_desk`, etc. The current Bamboo owner/staff split provides a safe production bridge without forcing that platform rewrite into The House now.

## 10. Recommended next release

After this consolidated v5.11.45 release is pushed and smoke-tested, return to the previously agreed next isolated feature:

**Passport / Thai-ID upload WhatsApp alert to Fah + both owners**, with a dedicated Meta template and privacy-safe progress information only.
