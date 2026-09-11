# THE HOUSE – KOH TAO
## Release Notes v5.11.52 — Canonical Reservation Model

### Purpose

v5.11.52 is an internal architecture release only. It prepares the product for future multi-channel adapters without changing how The House operates today.

### Added

- A provider-neutral canonical reservation model in `src/reservation-model.js`.
- One normalized internal contract for the existing Airbnb, direct and manual/walk-in reservation sources.
- Provider capability metadata so owner-managed vs synchronized source behavior is determined centrally.
- A canonical reservation lookup inside the Durable Object store while preserving the existing public/store reservation response shape.

### Preserved — no functional change

- The House continues to use Airbnb plus direct/manual/walk-in stays only.
- No Booking.com, Agoda, PMS or other booking channel is enabled or exposed.
- Airbnb sync and listing-to-room mapping are unchanged.
- Direct/manual stay creation, deletion, overlap protection and extensions are unchanged.
- Guest verification, registration, passport/TM30, lost-key, housekeeping, early/late stay operations and WhatsApp behavior are unchanged.
- Operations Dashboard and calendar behavior are unchanged.
- The House Finance and Bamboo Finance behavior are unchanged.
- No new Meta template, Cloudflare secret, binding, cron or Google Apps Script deployment is required.

### Future product/demo boundary

The canonical model is intentionally provider-agnostic so a later product/demo branch can add channel adapters without branching the core stay/operations logic. This release itself does not add those adapters to The House production property.

### Validation

- Full automated regression suite: **276 passed / 0 failed**.
- JavaScript/MJS syntax validation: **44 files passed**.
- Google Apps Script syntax validation passed.
- **12 JSON** files parsed successfully and `wrangler.jsonc` parsed successfully.
- No `node_modules`, `.wrangler` or `.git` directories are included in the release package.

