# Development Handoff — v5.11.74 Taoedge Revenue Engine V1

## Product decision

Revenue Engine V1 must prove recommendation quality before any provider write-back is introduced. An owner action in V1 records a decision only; it never updates Beds24, Airbnb or another OTA.

## Data inputs

The engine currently uses data already owned by Taoedge:

- canonical confirmed reservations,
- room/date occupancy,
- remaining rooms,
- reservation `created_at` as Taoedge first-seen pickup,
- days until the target date,
- surrounding-date occupancy,
- owner pricing guardrails and season rules.

The engine does not claim competitor pricing, market demand, true OTA booking timestamps or live OTA rate data.

## Storage

`revenue_engine_settings`
- scoped by tenant + property,
- reference/min/max rates,
- max adjustment,
- weekend adjustment,
- rounding increment,
- per-room reference rates,
- month multipliers.

`revenue_engine_decisions`
- append-only owner decision snapshots,
- room/date,
- Accept / Ignore / Override,
- reference and suggested rates at decision time,
- override rate when applicable,
- recommendation reasons,
- engine version and actor.

## Mobile API

- `GET /api/mobile/v1/revenue-engine?days=7|14|30`
- `POST /api/mobile/v1/revenue-engine/settings`
- `POST /api/mobile/v1/revenue-engine/decision`

All routes use the protected mobile session boundary. Reads require Analytics capability. Mutations additionally require `record.role === "owner"`.

## Algorithm V1

The algorithm is deterministic and auditable. It composes bounded percentage adjustments from:

- occupancy bands,
- near-term lead-time pressure,
- recent 7-day pickup,
- surrounding-date relative strength/weakness,
- owner weekend rule,
- owner season multiplier.

The total movement is capped by the owner-configured max adjustment, rounded to the owner increment, then hard-clamped to minimum/maximum rate.

## Commercial architecture note

V1 intentionally rides the existing Analytics entitlement so the currently signed House license does not need a new module migration just to validate pricing intelligence. Before commercial plan packaging, Revenue Engine can be split into its own licensed module without changing the underlying API/storage model.

## Next development stage

After several weeks of House usage, evaluate:

1. owner acceptance/override rates,
2. recommendation stability,
3. booked outcomes after accepted recommendations,
4. original OTA booking timestamps,
5. canonical stay-level booked revenue,
6. live current-rate read from the provider,
7. optional external demand/competitor inputs.

Only after those checks should a controlled `Apply to Beds24` action be considered. Automatic rate writing remains later still.
