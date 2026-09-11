# THE HOUSE – KOH TAO
## Release Notes v5.11.51 — Editable Saved Expenses

### Added

- Saved expense records can now be edited from the owner Finance interface for both The House and Bamboo Beach Bar.
- Owner corrections work for bills originally entered by either staff or owners.
- Editable fields are the existing structured expense fields: date, amount, category, supplier/vendor, description, payment method, room/area and notes.
- The original private receipt attachment remains attached and is not replaced during an edit.
- Finance totals, category totals, operating result and CSV output automatically use the corrected values because the original expense record is updated in place.
- Each edit writes an audit event plus a dedicated before/after expense-edit audit record.

### Permissions

- Existing Finance permissions remain intact.
- Staff entry pages remain entry-only; editing saved history remains owner-only.
- Business isolation remains enforced between The House and Bamboo Beach Bar.

### Preserved

No income workflow, receipt-storage behavior, staff permissions, guest operations, housekeeping, reservation, registration, WhatsApp, Airbnb sync or other unrelated functionality is intentionally changed.

### Validation

Full automated suite: **274 passed / 0 failed** before final package verification.
