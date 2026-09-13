# Validation Results — The House v5.11.72

## Automated application suite

**350 passed / 0 failed / 0 skipped.**

The full `node --test tests/*.test.mjs` suite was run after the integration-health and Finance-activation changes.

## v5.11.72 regression coverage

- `mobileIntegrationHealth(env)` reports Beds24 provider access independently from Channel Manager authority.
- Unified Messaging remains connected/review-first while AI auto-send is off.
- Finance automation reports Active only when the flag, refresh token and full Room 1–11 mapping are ready.
- WhatsApp outbound/API status is separated from webhook and guest-initiation-template readiness.
- Current deployment configuration contains `BEDS24_FINANCE_SYNC_ENABLED=true`.
- `BEDS24_CHANNEL_MANAGER_ENABLED=false` remains staged.
- `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false` remains staged.

## Syntax / manifests

- **26 JS/MJS files** under `src` and `tests` passed `node --check`.
- `package.json` and `package-lock.json` parse successfully.
- Package version: **5.11.72**.

## Production flags verified

```text
MOBILE_LICENSE_ENFORCEMENT_ENABLED=true
MOBILE_DEVICE_BINDING_ENABLED=true
BEDS24_FINANCE_SYNC_ENABLED=true
BEDS24_CHANNEL_MANAGER_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

No provider credential or secret is added to the mobile response; connection health contains status/capability values only.
