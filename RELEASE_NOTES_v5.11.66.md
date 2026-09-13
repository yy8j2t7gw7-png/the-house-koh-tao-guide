# The House – Koh Tao v5.11.66 — Mobile communications, command-center navigation & Finance compatibility

## Summary

v5.11.66 turns the Owner App booking and Home surfaces into more complete operational entry points while repairing a legacy Finance-schema compatibility issue exposed by live mobile receipt submission.

## Booking communication actions

Protected booking detail now exposes a server-authoritative communication capability model:

- **Provider messaging** opens an existing Unified Inbox provider thread or creates/links the Beds24 conversation when the connected provider supports it.
- **WhatsApp** opens an existing linked thread; starting a new thread remains subject to the configured approved Meta guest-initiation template.
- **Call** is available only when a valid reservation phone number exists and the signed-in role is allowed to receive it.
- Staff do not receive the raw guest telephone number through the booking-detail API.
- Beds24/OTA/Meta credentials remain backend-only.

The provider-messaging adapter currently follows the existing Beds24 Unified Messaging support path for supported channels. Unsupported providers remain unavailable rather than pretending a messaging route exists.

## Home command center

The mobile Home payload now includes three time horizons:

- **Today**
- **Tomorrow**
- **Next 7 days**

The outlook includes operational counts such as arrivals, departures, occupied rooms / occupancy, turnover and current issue signals. Existing live reservation data remains authoritative.

The corresponding mobile client can deep-link from Home metrics into filtered arrivals, room readiness, registration and maintenance workflows.

## Mobile expense / receipt compatibility repair

Live Owner App testing exposed a legacy schema edge case where an older `expense_records` / `income_records` table could predate the `created_by_hash` field required by current auditable Finance inserts. That produced a generic `expense_save_failed` response after the receipt/form had already been accepted.

v5.11.66 adds explicit safe migrations for:

```text
expense_records.created_by_hash
income_records.created_by_hash
```

Fresh databases already contain these columns; existing compatible deployments are unchanged. Older Finance schemas are repaired automatically on Durable Object initialization.

This preserves creator attribution without weakening Finance permissions or receipt privacy.

## Preserved safety state

- server-authoritative licensing/device binding remains enabled;
- no provider, Meta, Beds24, OpenAI or licensing secret is exposed to the mobile client;
- `BEDS24_FINANCE_SYNC_ENABLED=false` remains staged pending live expected→paid reconciliation validation;
- `BEDS24_CHANNEL_MANAGER_ENABLED=false` remains unchanged;
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false` remains unchanged.

## Validation

Full backend automated suite:

```text
334 passed
0 failed
```
