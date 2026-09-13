# The House – Koh Tao v5.11.74
## Taoedge Revenue Engine V1

### Purpose

Add the first owner-facing pricing intelligence layer without handing Taoedge control of live OTA rates.

### Added

- Protected `GET /api/mobile/v1/revenue-engine?days=7|14|30`.
- Deterministic room/date recommendations based on:
  - forward property occupancy,
  - remaining inventory,
  - Taoedge first-seen booking pickup,
  - days until arrival,
  - surrounding-date occupancy,
  - optional owner weekend adjustment,
  - optional owner monthly season multiplier.
- Owner pricing guardrails:
  - reference nightly rate,
  - hard minimum and maximum,
  - maximum percentage movement,
  - rounding increment,
  - optional room-specific reference rates,
  - monthly season multipliers.
- Owner-only `POST /api/mobile/v1/revenue-engine/settings`.
- Owner-only `POST /api/mobile/v1/revenue-engine/decision` supporting Accept, Ignore and Override.
- Append-only pricing-decision history so later releases can compare recommendation snapshots against owner decisions and outcomes.
- Audit events for pricing settings and decisions.

### Safety boundary

Revenue Engine V1 is **recommendation-only**.

- `providerWriteEnabled=false`.
- No Beds24 rate write exists in this release.
- No OTA rate is modified when an owner taps Accept.
- Owner overrides are validated against minimum/maximum guardrails and only recorded as decisions.
- The UI and API call the current baseline an owner **reference rate**, not a live OTA rate.
- Competitor pricing and external market-demand feeds are not used in V1.

### Permissions

- Read access uses the existing protected Analytics capability.
- Pricing settings and pricing decisions require the authenticated `owner` role.
- Managers with Analytics access can inspect recommendations but cannot alter pricing controls.

### Preserved production state

- `BEDS24_FINANCE_SYNC_ENABLED=true`.
- `BEDS24_CHANNEL_MANAGER_ENABLED=false`.
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false`.
- Commercial license enforcement and device binding remain enabled.
- Existing Concierge, Finance, TM30, Insights, routing and receipt-upload behavior is unchanged.

### Validation

- Full backend suite: **353 passed / 0 failed**.
- **50** JavaScript/MJS files passed `node --check`.
- **12** JSON files parsed successfully.
