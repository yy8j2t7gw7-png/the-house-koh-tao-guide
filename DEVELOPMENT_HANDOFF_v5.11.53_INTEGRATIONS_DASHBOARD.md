# THE HOUSE – KOH TAO
## Development Handoff — v5.11.53 Integrations Dashboard

### Authoritative baseline

Built directly on deployed v5.11.52 Canonical Reservation Model. Because v5.11.52 is already live, v5.11.53 is a normal incremental release and should be pushed on top of it.

### Scope

This release adds a read-only Owner Admin integration surface. It does **not** add or activate another booking platform at The House.

### Runtime changes

- `src/integration-catalog.js` defines the admin-facing source/connector registry.
- `src/concierge-api.js` includes the registry in the existing authenticated `/api/concierge/admin/overview` response.
- `public/concierge-admin.html`, `public/concierge-admin.js` and `public/concierge-admin.css` render the Integrations section.

### Current House sources

- **Airbnb** — existing synchronized production source. Connected status is derived from the existing reservation-sync configuration.
- **Direct / Walk-in** — built-in owner-managed source.

### Product-ready slots

- Booking.com
- Agoda
- Other PMS / API

These are deliberately shown as **Not connected**. Their Connect buttons remain disabled until a real provider adapter exists. This avoids false one-click integration claims and prevents users from entering credentials into an unsupported workflow.

### Connector contract

The registry advertises `canonical-reservation-v1`. A future provider connector should:

1. implement the provider-specific authentication / approval flow;
2. map provider room/listing identifiers to property rooms;
3. normalize creates, updates and cancellations into the canonical reservation sync contract;
4. handle retries, duplicate events and provider-specific errors;
5. only then expose an enabled Connect / Disconnect control in Admin.

### Explicitly unchanged

Airbnb Apps Script, reservation sync route, listing mappings, direct/manual stay writes, guest verification, registration/TM30, housekeeping, early/late stay logic, WhatsApp alerts, Finance, maintenance, lost-key security, calendars and dashboard operations are unchanged.

### Validation

- Full automated regression suite: **279 passed / 0 failed**.
- JavaScript/MJS syntax validation: **45 files passed**.
- Google Apps Script syntax validation passed.
- **12 JSON** files parsed successfully and `wrangler.jsonc` parsed successfully.
- No `node_modules`, `.wrangler` or `.git` directories are included in the release package.

