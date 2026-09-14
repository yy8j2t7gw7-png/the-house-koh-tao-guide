# Taoedge production Channel Manager dependency audit — v5.11.75 working branch

## Production decision

Keep `BEDS24_CHANNEL_MANAGER_ENABLED=false`.

The House does not currently need full Beds24 authority over the canonical reservation ledger. Every production capability that is required now is either independent of that flag or has a dedicated, narrower server-side capability.

## Required capability matrix

| Capability | Needs full Channel Manager? | Production path |
| --- | --- | --- |
| Existing Airbnb reservations in Taoedge calendar | No | Existing House Airbnb reservation sync remains authoritative |
| Beds24/Airbnb guest-message ingestion | No | Unified Messaging + Beds24 API/webhook |
| Beds24/Airbnb guest-message send/review | No | Unified Messaging review-first path |
| WhatsApp guest/staff messaging | No | Meta WhatsApp API |
| Daily Airbnb Finance reconciliation | No | `BEDS24_FINANCE_SYNC_ENABLED=true` |
| Historical Airbnb Finance import | No | Beds24 Finance reader |
| Direct stay / walk-in creation | No | `BEDS24_DIRECT_STAY_SYNC_ENABLED=true` |
| Direct stay availability check | No | Dedicated Beds24 room-availability read |
| Direct stay inventory protection | No | Dedicated confirmed Beds24 booking write |
| Direct stay extension | No | Dedicated Beds24 booking departure update |
| Direct stay cancellation | No | Dedicated Beds24 cancellation + retry queue |
| Failed direct-stay provider retry | No | Hourly retry processor runs when direct-stay protection is enabled |
| Guest documents / TM30 | No | Taoedge secure document workflow |
| Housekeeping / maintenance / booking tasks | No | Taoedge operational workflow |
| Insights | No | Taoedge canonical reservation/operations/Finance data |
| Revenue Engine V1 recommendations | No | Taoedge recommendation-only engine; no OTA rate write |
| Licensing / device security | No | Taoedge server-side licensing |

## Functions intentionally unavailable while full Channel Manager is off

Only the following Beds24-authority functions remain gated by `BEDS24_CHANNEL_MANAGER_ENABLED`:

1. ingesting every Beds24/OTA booking into Taoedge as the authoritative canonical reservation source; and
2. scheduled full Beds24 reservation reconciliation into the canonical reservation ledger.

Those are future cutover functions. The House currently retains its existing Airbnb reservation sync as the authoritative reservation feed, so enabling them now would create unnecessary authority overlap.

## Direct-stay protection invariant

Production config now uses:

- `BEDS24_CHANNEL_MANAGER_ENABLED=false`
- `BEDS24_DIRECT_STAY_SYNC_ENABLED=true`
- `BEDS24_FINANCE_SYNC_ENABLED=true`
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false`

A direct stay is protected provider-first: Beds24 availability is checked, a confirmed Beds24 booking is written, and only then is the Taoedge stay created and linked. Extensions update Beds24 before the local checkout changes. Cancellations synchronize to Beds24 and failed provider cancellations are retried hourly.

## Automated evidence

The working branch contains regression coverage proving that, with full Channel Manager off:

- direct-stay protection is independently ready;
- desktop/mobile Direct Stay creation checks and writes Beds24 before the local stay;
- create, extension and cancellation write successfully;
- direct-stay retries continue to run;
- Finance remains active;
- Unified Messaging remains connected and review-first;
- WhatsApp remains connected;
- full Beds24 reservation authority remains off.

Current full backend suite: 358 passed / 0 failed.
