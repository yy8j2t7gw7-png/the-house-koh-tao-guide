# The House – Koh Tao v5.11.73

## Scope

Small resilience hotfix for the mobile Integrations screen after v5.11.72.

## Changes

- Read-only connection-health metadata is returned to authenticated sessions with `integrations.view` even if an older signed license snapshot is missing the newer `integrations` module entitlement.
- The legacy `integrations` payload itself remains module-gated.
- No provider credential, refresh token, webhook secret, Meta token or room mapping secret is exposed to mobile.
- Actual integration actions remain protected by their existing permission/module checks.
- Daily Airbnb Finance reconciliation remains enabled.
- Beds24 Channel Manager remains disabled.
- Unified Messaging AI auto-send remains disabled.

## Validation

Full backend suite: **351 passed / 0 failed**.
