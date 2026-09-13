# Development Handoff — v5.11.73 Integration Health Resilience

The v5.11.72 `connectionHealth` contract was correct but could disappear entirely from `/api/mobile/v1/platform` when a live session had `integrations.view` permission but an older license snapshot did not contain the newer `integrations` module key. v5.11.73 separates read-only health visibility from the module-gated legacy integration payload. This is safe because the health object contains only status booleans/labels and no credentials. Operational integration endpoints remain capability-gated.

Use with Owner App v0.1.14, which also has a compatibility fallback for staged deployments.
