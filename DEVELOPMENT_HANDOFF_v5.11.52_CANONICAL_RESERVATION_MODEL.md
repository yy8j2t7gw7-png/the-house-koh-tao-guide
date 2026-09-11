# THE HOUSE – KOH TAO
## Development Handoff — v5.11.52 Canonical Reservation Model

### Authoritative baseline

Built directly on v5.11.51 Editable Saved Expenses.

### Scope boundary

This is a refactor-only production release. Existing behavior is the acceptance contract. Any guest-facing, admin-facing, operational, integration or finance behavior change is a regression.

### Architecture added

`src/reservation-model.js` now owns provider-neutral reservation primitives:

- `normalizeReservationProvider`
- `normalizeReservationStatus`
- `reservationSourceCapabilities`
- `normalizeReservationSyncPayload`
- `canonicalReservationFromStorage`
- `legacyStayReservationView`

The Durable Object reservation store uses this layer for reservation sync normalization and canonical lookup. `getStayReservationByCodeHash()` still returns the same legacy/current response fields expected by all existing callers.

### Current production sources

No source is added or removed:

- Airbnb — synchronized source
- Direct — owner-managed
- Manual/walk-in — owner-managed

The normalization layer intentionally accepts a provider identifier generically so future product/demo adapters can target the same contract, but there is no live route, sync, mapping, UI or credential for another provider in this release.

### Explicitly unchanged

- Airbnb Apps Script sync and listing mappings
- room inventory and Room 7 Airbnb exclusion
- confirmation-code behavior
- reservation overlap semantics
- stay extensions and deletion safeguards
- verified stay sessions
- registration / passport / Thai ID / TM30
- lost key and key-box security
- housekeeping dirty/clean/ready and Su/owner WhatsApp behavior
- early check-in / late checkout
- Operations Dashboard and 14-day calendar
- maintenance and guest-service alert routing
- all Finance modules and permissions
- Meta template configuration
- cron schedules and Cloudflare bindings/secrets

### Next product step

Create the multi-channel **demo/product branch** separately. Channel adapters and buyer-visible source badges belong there, not in The House live configuration unless explicitly requested later.

### Validation

- Full automated regression suite: **276 passed / 0 failed**.
- JavaScript/MJS syntax validation: **44 files passed**.
- Google Apps Script syntax validation passed.
- **12 JSON** files parsed successfully and `wrangler.jsonc` parsed successfully.
- No `node_modules`, `.wrangler` or `.git` directories are included in the release package.

