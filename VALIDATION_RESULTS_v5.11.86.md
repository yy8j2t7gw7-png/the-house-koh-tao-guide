# VALIDATION RESULTS — Backend v5.11.86

## Automated regression
Command: `npm test`

Result: **PASS — 412/412 tests**

## Syntax
`node --check` across backend `src/` and `tests/` JavaScript/MJS files.

Result: **PASS — 43/43 files**

## New Live Voice coverage
- THB plan catalogue.
- Allowance exhaustion fails closed.
- WebRTC broker creates GPT-Live session without exposing provider key.
- Frontend data-channel command allowlist.
- Positive THB spend cap required/defaulted for paid overage.
- Effective session duration limited by remaining allowance.
- Cumulative/server-clock-bounded usage accounting.

## Native/provider limitation
The automated suite mocks the provider session-creation response. No claim is made that a real physical iPhone completed a GPT-Live WebRTC conversation during packaging. That requires the Taoedge native development/TestFlight build and live provider configuration.
