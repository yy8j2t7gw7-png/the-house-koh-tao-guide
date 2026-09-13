# Development Handoff — v5.11.69 Taoedge Insights V1

## Objective

Create a differentiated owner-intelligence layer that answers operational and commercial questions instead of reproducing generic PMS charts.

## Data contract

`GET /api/mobile/v1/analytics?range=month|30d|90d`

Primary sections:

- `pulse`
- `forward`
- `channels`
- `rooms`
- `operations`
- `finance`
- `attention`
- `dataQuality`

## Source-of-truth rules

- Occupancy/channel/room-night metrics: canonical `stay_reservations` + checkout overrides.
- Maintenance: `maintenance_reports`.
- Turnovers: `housekeeping_tasks`.
- Guest-demand intelligence: `interactions`.
- Explicit Concierge helpfulness feedback: `feedback`.
- Messaging volume: `messaging_messages`.
- Financials: existing House `income_records` + `expense_records`, summarized with the same Finance summarizer used elsewhere for both the selected range and its equal-length comparison period.

Do not add independent client-side accounting logic.

## Permission behavior

`analytics.view` + `analytics` module are required. `finance` is nullable and appears only when the authenticated user also has `finance.view` and the Finance module.

## Known retention context

Resolved maintenance is retained for 30 days; cancelled reservations are retained for 90 days. The response includes `dataQuality` so the UI can disclose incomplete older operational history.

## Next analytics phases

V2 should add Revenue Engine inputs such as booking pace/pickup, ADR/RevPAR tied to stay value, cancellation lead-time patterns, net profitability by channel, review ingestion/sentiment, and network benchmarks once sufficient properties exist.
