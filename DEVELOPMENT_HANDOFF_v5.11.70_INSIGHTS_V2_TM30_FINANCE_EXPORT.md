# Development Handoff — v5.11.70

## Scope

This release builds on v5.11.69 Insights V1 and v5.11.68 operational routing. It adds Insights V2 data, owner-only guest-document/TM30 operations, and downloadable Finance reports.

## Analytics

`GET /api/mobile/v1/analytics?range=month|30d|90d` now loads canonical reservations far enough forward to calculate 30/60/90-day demand. The payload adds:

- `forward.horizons`
- `trend.current` / `trend.previous`
- `pickup.firstSeen1d|7d|14d`
- channel `cancellationRate` and `averageStayNights`
- room `netIncomePerOccupiedNight`
- `operationalRates`
- `finance.efficiency`
- explicit data-quality readiness flags for ADR/RevPAR and OTA booking timestamps.

Pickup is based on Taoedge's reservation `createdAt` / first-seen timestamp. Backfilled historical reservations therefore must not be described as true OTA booking-time pickup.

Finance efficiency is a period-ledger ratio. It must not be renamed ADR or RevPAR until stay-level revenue attribution exists across channels.

## Guest documents / TM30

Permission: `guest_documents.view` + module `guest_registration`.

Endpoints:

- `GET /api/mobile/v1/guest-documents`
- `GET /api/mobile/v1/guest-documents/:passportId/file`
- `POST /api/mobile/v1/guest-documents/:passportId/tm30` with `{ "registered": true|false }`

Only currently uploaded and non-expired records are listed. The private file response disables caching and sniffing/framing. Downloads and TM30 state changes write platform audit entries. Thai IDs are shown for registration visibility but TM30 actions apply only to passports.

## Finance reports

Permission: `finance.view` + module `finance`.

Endpoint:

`GET /api/mobile/v1/finance/report?from=YYYY-MM-DD&to=YYYY-MM-DD`

Range is limited to 366 inclusive days. Response is UTF-8 CSV with BOM, summary totals, then detailed income/expense rows. Expected/provisional versus settled fields use the same canonical Finance ledger semantics as the app.

## Production boundaries

This release does not expose provider secrets or raw document storage keys to the mobile client. Existing commercial licensing/device binding, centralized operational routing, receipt ingestion, payout reconciliation semantics and staged messaging/channel-manager automation remain unchanged.
