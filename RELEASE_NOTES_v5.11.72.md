# The House – Koh Tao v5.11.72

## Integration health correction + Finance automation activation

This release makes the mobile Integrations screen reflect independent backend capabilities instead of inferring connection state from mismatched fields. The `/api/mobile/v1/platform` payload now includes `connectionHealth` with separate status for Beds24 provider access, the existing reservation feed, Unified Messaging, Finance automation, WhatsApp, guest-initiation readiness and the Beds24 Channel Manager.

### Production state

- `BEDS24_FINANCE_SYNC_ENABLED=true` — daily Airbnb payout reconciliation is now enabled after accepted live reconciliation checks.
- `BEDS24_CHANNEL_MANAGER_ENABLED=false` — Beds24 does not yet control live availability/write-back.
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false` — AI replies remain review-first.
- Mobile license enforcement and device binding remain enabled.

### Status semantics

- Beds24 can be **Connected** for OTA messaging/provider data while Channel Manager remains **Off**.
- Unified Messaging reports whether an actual provider route is live.
- Finance automation reports **Active** only when the feature flag, refresh token and complete Room 1–11 map are all ready.
- WhatsApp reports outbound Meta API readiness separately from inbound webhook readiness and new-guest template readiness.

No provider credential or secret is returned to the mobile client.
