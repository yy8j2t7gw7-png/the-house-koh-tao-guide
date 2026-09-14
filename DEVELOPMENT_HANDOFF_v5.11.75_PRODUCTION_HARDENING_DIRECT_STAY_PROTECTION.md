# Development Handoff — v5.11.75 Production Hardening / Direct Stay Protection

## Baseline

Built from v5.11.74 Revenue Engine V1.

## Problem fixed

Direct Stays created from the owner/admin workflow were only written to Beds24 when `BEDS24_CHANNEL_MANAGER_ENABLED=true`. Production intentionally keeps full Channel Manager authority off, so a local Direct Stay could be created without creating the corresponding Beds24 block. Airbnb therefore had no inventory change to receive from Beds24.

## Architecture in v5.11.75

A dedicated capability now separates Direct Stay inventory protection from full Channel Manager authority:

- `BEDS24_CHANNEL_MANAGER_ENABLED=false`
- `BEDS24_DIRECT_STAY_SYNC_ENABLED=true`

`beds24DirectStaySyncConfiguration(env)` is considered enabled when either the dedicated Direct Stay flag or the future full Channel Manager flag is enabled. This preserves forward compatibility if full channel management is deliberately activated later.

## Direct Stay write boundary

Creation is fail-closed:

1. Beds24 configuration and room mapping must be ready.
2. Beds24 availability must confirm the room/date request.
3. Beds24 booking/block is created first.
4. Local stay is created second.
5. Provider link is persisted.

Rollback rules:

- Beds24 create succeeds + local create fails -> cancel Beds24 booking; queue retry if cancellation fails.
- Local create succeeds + provider link fails -> cancel local stay + cancel Beds24 booking; queue external release retry if required.
- Beds24 extension succeeds + local extension fails -> restore previous Beds24 departure; queue repair retry if required.
- Local cancellation succeeds + Beds24 cancellation fails -> keep local cancellation and queue Beds24 release retry. This deliberately prefers temporary over-blocking to double-booking exposure.

## Channel-manager dependency audit

Current House-required capabilities were traced against all `BEDS24_CHANNEL_MANAGER_ENABLED` gates.

Independent with full Channel Manager off:

- existing House Airbnb reservation feed;
- Unified Messaging through Beds24;
- direct WhatsApp;
- daily Airbnb Finance reconciliation;
- Direct Stay protection through the dedicated flag;
- operational workflows;
- Guest Documents/TM30;
- Insights;
- Revenue Engine V1;
- licensing/device enforcement.

Still intentionally requiring full Channel Manager:

- full Beds24 authoritative reservation ingestion;
- scheduled full Beds24 reservation reconciliation/write authority.

See `PRODUCTION_CHANNEL_MANAGER_DEPENDENCY_AUDIT_v5.11.75.md`.

## Owner/admin copy

The admin dashboard was polished without changing business logic. Ordinary owner-facing status text now uses booking-channel, connection, room matching, automatic Finance and review-before-sending language instead of internal connector/token/feature-flag vocabulary.

## Safety boundaries preserved

- Revenue Engine V1 remains recommendation-only.
- AI guest replies remain review-first (`UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false`).
- provider credentials remain server-only.
- Finance automatic reconciliation remains active.
- commercial license/device enforcement remains active.
- existing Concierge semantics and team routing are unchanged.

## Regression tests added

Nine v5.11.75 tests cover:

1. direct-stay protection readiness with full Channel Manager off;
2. Beds24-before-local creation ordering for desktop/mobile handlers;
3. create/extend/cancel external writes with full Channel Manager off;
4. retry processing with full Channel Manager off;
5. independence of current required capabilities from full reservation authority;
6. fail-closed behavior when Beds24 cannot protect the dates;
7. Beds24 rollback when local creation fails;
8. local + Beds24 rollback when provider linking fails;
9. Beds24 departure restoration if local extension fails.

## Live acceptance still required

Code can prove the Taoedge -> Beds24 path, but not the external Beds24 -> Airbnb propagation from a local test harness. After deployment:

1. create a short future Direct Stay on dates known open;
2. confirm the booking appears in Beds24;
3. confirm Airbnb closes those dates;
4. cancel the test stay;
5. confirm Beds24 releases it and Airbnb reopens the dates.
