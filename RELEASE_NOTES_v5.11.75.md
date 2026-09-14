# The House – Koh Tao v5.11.75

## Production hardening + protected Direct Stay synchronization

v5.11.75 is a production-readiness release built directly on v5.11.74. It fixes a real inventory-protection gap without enabling full Beds24 Channel Manager authority.

### Direct Stay protection

Owner-created direct bookings and walk-ins now use a dedicated Beds24 protection capability controlled by `BEDS24_DIRECT_STAY_SYNC_ENABLED`.

The safe creation order is:

1. validate the requested room and dates;
2. confirm the Beds24 room mapping and direct-stay connection are ready;
3. check Beds24 availability;
4. create the Beds24 booking/block;
5. only then create and confirm the local Taoedge stay;
6. link the two records.

If Beds24 cannot protect the requested dates, Taoedge fails closed and does not create an unprotected local stay.

If local creation or provider linking fails after Beds24 accepted the block, Taoedge rolls the Beds24 booking back. Failed releases are queued for retry so the safer failure mode is temporary over-blocking rather than a silent double-booking risk.

Direct Stay extensions update Beds24 first and restore the previous Beds24 departure if the local extension subsequently fails. Direct Stay cancellation attempts to release Beds24 as well, with retry protection if the external cancellation cannot complete immediately.

### Channel Manager remains deliberately off

The production release keeps:

- `BEDS24_CHANNEL_MANAGER_ENABLED=false`
- `BEDS24_DIRECT_STAY_SYNC_ENABLED=true`
- `BEDS24_FINANCE_SYNC_ENABLED=true`
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false`
- `MOBILE_LICENSE_ENFORCEMENT_ENABLED=true`
- `MOBILE_DEVICE_BINDING_ENABLED=true`

The dedicated Direct Stay path gives Taoedge the narrow Beds24 write capability required to protect owner-created bookings without enabling full reservation/channel authority.

### Capability independence verified

With full Channel Manager off, the release preserves:

- the existing House Airbnb reservation feed;
- Beds24/OTA Unified Messaging;
- direct WhatsApp;
- scheduled Airbnb Finance reconciliation;
- Direct Stay creation, extension, cancellation and retry protection;
- Concierge routing and operational tasks;
- housekeeping and maintenance;
- Guest Documents & TM30;
- Insights V2;
- Revenue Engine V1 recommendation-only behavior;
- commercial licensing and device enforcement.

Full Beds24 reservation ingestion/reconciliation remains intentionally disabled until Taoedge deliberately adopts that authority in a later product stage.

### Owner-facing production polish

The desktop owner dashboard now uses clearer hospitality language for connections, messaging and Finance state. Internal setup terms such as canonical reservation layers, provider connectors, refresh tokens and feature-flag names are no longer surfaced in ordinary owner-facing status copy.

### Regression coverage

Nine dedicated v5.11.75 Direct Stay tests cover independent readiness, create ordering, extension, cancellation, retries, fail-closed behavior, local-create rollback, link rollback and extension rollback.

Full backend suite: **362 passed / 0 failed / 0 skipped**.
