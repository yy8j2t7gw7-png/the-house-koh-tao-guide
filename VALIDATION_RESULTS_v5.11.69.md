# Validation Results — The House v5.11.69

## Automated backend suite

- Command: `npm test`
- Result: **344 passed / 0 failed**
- Includes the complete historical House/Concierge regression suite plus v5.11.69 analytics range, payload, permission, canonical-data, Finance-comparison and feedback-source contract checks.

## Insights V1 contract checks

Validated in source/tests:

- protected `GET /api/mobile/v1/analytics?range=month|30d|90d`
- `analytics.view` permission + analytics module enforcement
- canonical reservation-based occupancy, room nights, arrivals/departures, cancellations and channel mix
- equal-length previous-period occupancy comparison
- next-30-day forward demand buckets
- room-level reservation/maintenance/housekeeping metrics
- maintenance + housekeeping operational aggregation
- Concierge request, human-handoff, knowledge-gap and explicit feedback aggregation
- Unified Messaging inbound/outbound/automated volume
- Finance omitted when `finance.view` is absent
- selected-period + equal-length previous-period Finance use the existing Finance summarizer
- expected payout remains distinct from settled income
- retention/data-quality context is returned for 90-day views

## Security / production boundaries

- No mobile/provider credential exposure added.
- No guest identity-document data is added to analytics.
- v5.11.68 Su/Fah/owner routing remains unchanged.
- `BEDS24_FINANCE_SYNC_ENABLED`, `BEDS24_CHANNEL_MANAGER_ENABLED` and `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED` remain staged; this release does not enable them.
