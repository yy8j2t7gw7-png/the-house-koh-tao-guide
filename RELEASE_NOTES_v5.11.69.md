# The House – Koh Tao v5.11.69

## Taoedge Insights V1

This release introduces the backend analytics contract for the Taoedge Owner App. It is intentionally decision-oriented rather than a clone of another PMS chart dashboard.

### New protected analytics endpoint

`GET /api/mobile/v1/analytics?range=month|30d|90d`

Requires `analytics.view` and the `analytics` module.

The response combines:

- selected-period occupancy and room nights
- comparable previous-period occupancy delta
- arrivals, departures, average stay and cancellation rate
- next-30-day forward occupancy in weekly buckets
- channel mix by confirmed stay nights
- room-level occupancy and operational performance
- maintenance volume and open issues
- housekeeping turnover count and average turnaround time
- Concierge request volume, human handoffs, explicit helpfulness feedback and knowledge-gap signals
- Unified Messaging inbound/outbound counts
- protected Finance totals, equal-length previous-period Finance comparison and room-level Finance only when `finance.view` is granted
- deterministic attention items for demand, cancellation, recurring maintenance, channel concentration, Concierge knowledge gaps and provisional Finance

### Data integrity

Analytics uses Taoedge-owned canonical reservations and operational records. Finance values come from the existing Finance ledger; the analytics layer does not create a second accounting implementation.

Resolved maintenance records are retained for 30 days and cancelled reservations for 90 days under the existing operational retention model. The analytics response exposes this context so 90-day operational views do not imply complete resolved-maintenance history when it is not available.

### Security

- Analytics is server-authorized by permission and module entitlement.
- Staff still have no owner analytics access by default.
- Finance values remain hidden unless `finance.view` is granted.
- No Beds24, Meta, OpenAI, licensing secret or guest identity document is exposed.

### Preserved production boundaries

The v5.11.68 Su/Fah/owner routing hotfix remains unchanged. `BEDS24_FINANCE_SYNC_ENABLED`, `BEDS24_CHANNEL_MANAGER_ENABLED` and `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED` remain staged as previously configured.
