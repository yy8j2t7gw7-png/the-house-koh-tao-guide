# RELEASE NOTES — Backend v5.11.78
## Production Readiness & Guest Communication Hardening

### Added

- Deterministic recognition of guest statements that a passport image was attached/uploaded/sent in OTA or WhatsApp conversation.
- `passport_received_external` reservation review task and owner operational alert flow.
- Natural guest acknowledgement before the generic AI reply path.
- Per-device push-notification category preferences with server-side filtering.
- `GET/POST /api/mobile/v1/push/settings`.
- Tri-state Beds24 Listings write mode: `false`, `test`, `true`.
- Protected `POST /api/mobile/v1/listings-rates/test-write` no-op round-trip validator.
- Mobile backend contract reporting `5.11.78`.

### Correctness / safety

- External passport messages never mark Taoedge secure registration or TM30 complete automatically.
- External passport owner notification uses the existing generic operational Meta template path; no new dedicated Meta template is required for the basic alert.
- Beds24 inventory writes use `numAvail`.
- Controlled provider write validation writes back the exact existing value and verifies it remains unchanged.
- Ready-to-push configuration remains `BEDS24_RATE_INVENTORY_WRITES_ENABLED=false`.
- Full Beds24 Channel Manager remains disabled.
- Existing Cloudflare Free-tier variable consolidation is preserved.

### Validation

- 370 / 370 backend tests passed.
- 29 / 29 backend JavaScript source files passed syntax checks.
