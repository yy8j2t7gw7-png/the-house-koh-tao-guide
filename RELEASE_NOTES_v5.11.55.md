# THE HOUSE – KOH TAO
## Release Notes v5.11.55 — Bulk WhatsApp Diagnostic Management

### Purpose

v5.11.55 improves Owner Admin cleanup of failed WhatsApp delivery diagnostics. Owners can now select one, several or all visible diagnostic records and remove them from the operational view in one action instead of clearing each card individually.

### Added

- Checkbox on every WhatsApp delivery diagnostic card.
- **Select all** control.
- Live selected-count indicator.
- **Delete selected** action.
- **Delete all** action.
- Confirmation dialog before any bulk removal.
- Protected bulk-dismiss API with a maximum of 100 diagnostic IDs per request.
- One audit event for each successful bulk cleanup operation.

### Safety boundary

Bulk deletion is intentionally a visibility cleanup only. It does **not** alter:

- the parent Concierge alert;
- WhatsApp delivery status/history;
- Meta response history already retained by the system;
- maintenance reports;
- guest records;
- booking or stay data;
- WhatsApp configuration or templates.

The existing individual **Dismiss / Clear diagnostics** actions remain available.

### Preserved

All v5.11.54 room-readiness, integrations, booking, housekeeping, registration, Finance, maintenance, lost-key and guest-facing behavior remains unchanged.

No new Meta template, Cloudflare secret, cron, binding or Google Apps Script deployment is required.

### Validation

- Full automated regression suite: **281 passed / 0 failed**.
- JavaScript/MJS syntax validation: **45 files passed**.
- Google Apps Script syntax validation passed.
- **12 JSON** files parsed successfully and `wrangler.jsonc` parsed successfully.
