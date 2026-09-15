# RELEASE NOTES — Backend v5.11.82
## Copilot Daily-Attention Reliability Hotfix

- Fixes the live `What needs my attention today?` failure observed with App v0.1.25 / Backend v5.11.81.
- Makes that command independent from model invocation, workflow matching and optional screen context.
- Isolates each live data source so one degraded source cannot abort the entire Copilot request.
- Keeps canonical Tasks and all production routing/security behavior unchanged.
- Pair with Owner App v0.1.26.
