# Taoedge Core Logic Preservation Audit
## Backend v5.11.80 / Owner App v0.1.23

### Decision
**Preserve the mature Dashboard/Concierge logic as production truth; do not overwrite it with mobile-client logic.** The newer Owner App safety patterns are merged into the shared backend contract where they improve execution safety.

### Audit finding
The architecture was already more centralized than the UI names suggested. Dashboard, Guest Concierge and Owner App all rely heavily on the same backend stores and domain modules. The main duplicated operational path identified in this release was booking-task routing/alert creation inside `mobile-platform.js`.

### Consolidation performed
- Extracted manual booking-task routing/alert creation to `operational-actions.js`.
- Copilot calls the same shared functions.
- Existing recipient/routing policy remains in `operations-routing.js` / `whatsapp-alerts.js`.
- Existing Dashboard/Concierge modules remain untouched unless required for shared invocation.
- Added a versioned workflow registry for explanation/retrieval; it is not a second executable policy engine.

### Preservation guarantees for this release
No deliberate behavioral replacement was made to:
- guest Concierge routing;
- lost-key authorization/release;
- passport/TM30 handling;
- housekeeping status rules;
- maintenance guest reporting;
- guest messaging/provider handling;
- AI reply review safety;
- Finance/expense/OTA reconciliation;
- Direct Stay conflict protection;
- Listings & Rates provider safeguards;
- licensing, tenant, session or device authority;
- provider credential isolation.

### Canonical rule going forward
A workflow must have one authoritative executable backend implementation. App and Web surfaces may present it differently, but they must call the same business/action contract. If a future feature reveals duplicate business logic in a client, extract that logic to the shared backend before extending it to Copilot.

### Workflow-knowledge rule
Every production change that alters what an owner/manager/staff member should do must also review the Copilot workflow registry. The registry should contain current operational meaning, not historical release notes or developer internals.

### Action-safety rule
Natural-language understanding can be broad. Side effects remain narrow: validate fields, tenant/role/action permissions, show exact proposal, obtain confirmation, execute server-side, audit.
