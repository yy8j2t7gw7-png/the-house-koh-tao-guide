# Development Handoff — v5.11.72

## Purpose
Correct misleading integration status in the Owner App and activate the already-validated daily Airbnb Finance reconciliation.

## Backend
`mobileIntegrationHealth(env)` is the canonical mobile status contract. It separates Beds24 provider access, existing Airbnb reservation feed, Unified Messaging, Finance automation, WhatsApp outbound/webhook/template capability and Channel Manager authority. `/api/mobile/v1/platform` exposes this as `connectionHealth`.

## Flags
`BEDS24_FINANCE_SYNC_ENABLED=true`
`BEDS24_CHANNEL_MANAGER_ENABLED=false`
`UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false`

## Safety
Do not collapse these flags/capabilities back into one generic Connected state. Provider credentials remain server-only.
