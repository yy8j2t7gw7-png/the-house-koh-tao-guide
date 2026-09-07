# THE HOUSE – KOH TAO
## Release Notes v5.11.46 — Reservation-Aware Stay Operations

### Added

- Reservation-aware late checkout workflow using the verified stay's scheduled checkout date.
- Reservation-aware early check-in workflow using the verified stay's scheduled check-in date and same-room turnover context.
- Protected service-alert submission for early/late stay requests.
- Same-room overlap protection for direct/manual stay creation.
- Same-room conflict protection for owner stay extensions.
- Owner-only deletion of direct/manual stays with guest-session revocation and audit logging.

### Corrected

- The Concierge no longer asks a verified guest for a checkout date it already knows.
- Early/late stay requests no longer rely on ordinary AI dialogue to imply operational submission.
- The Concierge confirms a request as sent only after at least one WhatsApp delivery is accepted.
- Same-day checkout-to-check-in turnover remains valid and is not falsely blocked as an overlap.

### Preserved

No new Meta template, Cloudflare secret, cron, Google Apps Script update or Airbnb mapping is required. Passport/TM30, Bamboo Finance, existing service/cleaning/towel alerts, lost-key security and all other v5.11.45 behavior remain unchanged.

### Validation

Full automated suite: **265 passed / 0 failed** before final package verification. See `DEVELOPMENT_HANDOFF_v5.11.46_RESERVATION_AWARE_STAY_OPERATIONS.md` for deployment and post-deployment checks.
