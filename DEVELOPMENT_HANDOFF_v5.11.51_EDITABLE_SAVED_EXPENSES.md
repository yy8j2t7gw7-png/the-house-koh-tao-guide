# THE HOUSE – KOH TAO
## Development Handoff — v5.11.51 Editable Saved Expenses

### Authoritative baseline

Built directly on v5.11.50.

### Owner requirement

A saved bill must remain correctable after upload. This covers mistakes made by staff/owners and AI receipt extraction errors that were not noticed before saving. Existing deletion remains available, but deletion is no longer the only correction path.

### Exact scope

1. The House owner Finance history now shows **Edit expense** for every saved expense.
2. Bamboo owner Finance history now shows **Edit expense** for every saved expense.
3. Editing loads the saved structured values back into the existing expense form.
4. The existing receipt is preserved; receipt analysis/replacement controls are disabled while editing so a correction cannot accidentally orphan or replace the source document.
5. Owners can correct date, amount, category, supplier/vendor, description, payment method, room/area and notes.
6. The record is updated in place, so monthly totals, category totals, operating result and exports reflect the correction immediately.
7. Edits keep the original `created_by_role` and original receipt metadata unchanged.
8. A dedicated `expense_edit_audit` record stores previous and new structured values, actor hash/role and edit time; the general admin audit also records `expense_edited`.
9. Duplicate protection still applies to corrected values, excluding the record being edited itself.
10. Staff Finance remains entry-only. The update endpoint is owner-only and business-scoped.

### Files changed

- `src/expense-api.js`
- `src/concierge-store.js`
- `public/concierge-admin.js`
- `public/bamboo-finance.js`
- `tests/concierge.test.mjs`
- release metadata files
- `RELEASE_NOTES_v5.11.51.md`
- `DEVELOPMENT_HANDOFF_v5.11.51_EDITABLE_SAVED_EXPENSES.md`
- `CHANGELOG.md`

### Deliberately preserved

No expense receipt replacement, no staff history access, no income editing, no new Finance role, and no guest/housekeeping/registration/WhatsApp/reservation/Airbnb behavior is introduced.

### Validation

Full automated suite: **274 passed / 0 failed**.
