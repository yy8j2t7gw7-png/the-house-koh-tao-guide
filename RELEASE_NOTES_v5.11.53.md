# THE HOUSE – KOH TAO
## Release Notes v5.11.53 — Integrations Dashboard

### Purpose

v5.11.53 adds a safe owner-facing Integrations view on top of the v5.11.52 canonical reservation model. It makes the product architecture visible without changing The House booking behavior or pretending unsupported providers are connected.

### Added

- A new **Integrations** section in Owner Admin.
- Airbnb is shown as the existing live synchronized House source and only reports **Connected** when the current reservation-sync configuration is actually present.
- Direct / Walk-in is shown as an active built-in source.
- Product-ready provider slots are visible for Booking.com, Agoda and Other PMS / API.
- Unsupported provider cards show **Not connected** and a disabled **Connect** action until a real provider-specific connector is installed.
- A small read-only integration registry exposes connector status through the existing protected Owner Admin overview.

### Safety boundary

- No Booking.com, Agoda, PMS or other external booking API is connected by this release.
- No credentials can be entered into the new page.
- No connect/disconnect write endpoint exists yet.
- The UI never claims a provider is connected merely because its card exists.
- Future provider connectors must authenticate and normalize their reservation events into the canonical reservation contract before their Connect action can be enabled.

### Preserved

All existing The House production behavior remains unchanged: Airbnb sync/mapping, direct/manual reservations, guest access, registration/TM30, housekeeping, WhatsApp, early/late stay operations, Operations Dashboard, Finance, maintenance, lost-key protections and room inventory.

No new Meta template, Cloudflare secret, cron or Google Apps Script deployment is required.

### Validation

- Full automated regression suite: **279 passed / 0 failed**.
- JavaScript/MJS syntax validation: **45 files passed**.
- Google Apps Script syntax validation passed.
- **12 JSON** files parsed successfully and `wrangler.jsonc` parsed successfully.
- No `node_modules`, `.wrangler` or `.git` directories are included in the release package.

