# DEVELOPMENT HANDOFF — Backend v5.11.80
## Operations Copilot Foundation & Logic Preservation

## 1. Current release objective
Preserve all mature Dashboard/Concierge operational behavior, consolidate duplicated operational task creation into a shared backend core, and build the first role-aware Taoedge AI Support / Operations Copilot against that core.

The governing principle remains:

> **Understand flexibly. Execute conservatively.**

AI may interpret natural language and propose an action. The backend decides whether the action is valid, permitted, sufficiently specified and confirmed.

## 2. Logic Preservation Audit result
A full replacement of Dashboard logic is neither required nor desirable. The existing production code already centralizes most domain logic server-side. These mature modules remain authoritative and are intentionally preserved:

- Concierge / guest policy: `concierge-api.js`
- Unified guest messaging / AI review: `unified-messaging.js`
- Operational routing and recipient policy: `operations-routing.js`, `whatsapp-alerts.js`
- Housekeeping: `housekeeping-operations.js`
- Maintenance: `maintenance-api.js`
- Stay / lost-key / protected guest operations: `stay-api.js`
- Registration / passport / TM30: `passport-api.js`, `registration-alerts.js`
- Finance / expenses / OTA reconciliation: `finance-api.js`, `expense-api.js`, `beds24-finance-sync.js`
- Listings & Rates: `beds24-listings-rates.js`
- Channel-manager safeguards: `beds24-channel-manager.js`
- Guest lifecycle messaging: `lifecycle-messaging.js`
- Mobile tenant/role/licensing authority: `mobile-platform.js`

The v5.11.80 consolidation changes only the duplicated booking-task creation path: it is extracted into `operational-actions.js` and reused by both the manual booking screen and Operations Copilot. Existing routing functions remain underneath it.

Nothing from the mature Dashboard/Concierge policy stack is deleted or replaced for the sake of the new chat.

## 3. What changed

### Shared operational action core
New `src/operational-actions.js` provides:
- `normalizeOperationalCategory()`
- `operationalCategoryRoutingKey()`
- `operationalCategoryAlertType()`
- `operationalAssignmentPreview()`
- `createBookingOperationalTask()`
- `createRoomOperationalTask()`

Manual booking tasks and Copilot task execution now use this same path.

### Production-derived workflow registry
New `src/capability-workflow-registry.js` is the versioned human-operational knowledge layer for AI Support.

It does **not** replace executable business rules. It summarizes the current released workflows in hotel language so the assistant can explain them accurately.

**Standing release rule:** every future production release that materially changes a guest/owner/staff workflow must review and update this registry and its tests in the same release. This prevents AI Support from becoming stale while avoiding raw release-note or developer-jargon dumping into prompts.

### Operations Copilot
New `src/operations-copilot.js`:
- uses current registry summaries and relevant workflow detail;
- receives live role-filtered operational context;
- uses OpenAI Responses API only when configured;
- has a conservative deterministic fallback for basic help/task parsing;
- does not persist raw Copilot chat history server-side in this release;
- can prepare room or booking task proposals;
- signs proposals with the existing server session secret;
- verifies signature + expiry + user/tenant binding at confirmation;
- executes through the canonical operational action core;
- audits proposal and execution separately.

### Permissions
`copilot.use` is added to Owner / Manager / Staff baselines and is independently delegatable for Manager/Staff.

`copilot.use` grants access to Support Chat only. It does **not** grant the authority for every action discussed in chat. For the initial task action, execution separately requires `booking_activity.create`.

## 4. Plain-language product contract
Default answers should avoid developer terminology. The assistant should normally explain:
1. what is happening;
2. what it means operationally;
3. what the user should do next;
4. whether an owner/manager authorization is required.

Examples:
- `What needs my attention today?`
- `Why is Room 7 not ready?`
- `How do I handle an early check-in?`
- `Create a maintenance task for Room 6, the toilet is leaking.`
- `Create a housekeeping task for Anna's booking: extra towels.`

When required information is missing, ask one clear hotel-language clarification question rather than guessing.

## 5. Live context and privacy
Copilot receives only role-permitted context. Current live context includes:
- today/tomorrow arrivals and departures;
- reservation room/date/status context;
- room clean/dirty/ready state;
- pending housekeeping work;
- open/urgent maintenance;
- pending registration count;
- Inbox unread / needs-human counts only when `messaging.view` is permitted.

Staff guest-name context is reduced to first name. Sensitive documents, provider credentials, security secrets and protected lost-key codes are never supplied as ordinary Copilot context.

## 6. Action confirmation contract
Task creation is a two-step contract:

1. Natural-language interpretation -> signed proposal, **zero operational side effects**.
2. Explicit user confirmation -> backend permission re-check -> canonical action -> alert/task -> audit.

A proposal contains exact scope, reservation/room, category, task description, timing, recipient preview, issuance/expiry and signature. It expires after 10 minutes. Tampering fails closed.

## 7. Five-Surface Impact
- **Backend/Data:** adds Copilot registry/action engine and shared operational action core.
- **Owner App:** paired v0.1.23 adds AI Support UI, confirmation card, Team permission controls and native iOS Back gesture.
- **Public Website:** no product-claim update required in this release.
- **Personal Guest Page / Concierge:** no guest-facing logic is replaced.
- **Dashboard/Web Operations Console:** mature logic remains intact. A future Web Copilot UI should call the same backend core rather than build a second action engine.
- **Operations Copilot:** first real production foundation is now implemented.

## 8. Data Asset & Sovereign Data Strategy
Useful structured operational telemetry is retained: action proposed/executed, category, scope, route and alert reference. Raw Copilot conversation retention is intentionally not expanded in this release. This minimizes unnecessary data while still producing auditable operational behavior and useful quality signals.

## 9. Security / Privacy
- Server remains authorization authority.
- `copilot.use` can be removed independently from Manager/Staff.
- Action-specific permissions still apply.
- Proposal is HMAC-signed, user/tenant-bound and time-limited.
- Unknown room/booking fails closed.
- No provider tokens or protected codes are returned to the app.
- No task is created before explicit confirmation.
- Existing mobile licensing/device/session controls remain unchanged.

## 10. Deployment order
1. Deploy backend **v5.11.80**.
2. Verify mobile platform reports backend `5.11.80`.
3. Push/build Owner App **v0.1.23**.
4. Test AI Support as Owner, Manager and Staff.
5. Verify a Manager/Staff user can have AI Support disabled independently.
6. Ask informational questions and confirm zero operational side effects.
7. Create one controlled room task through chat, review recipients, confirm it and verify the alert/audit trail.
8. Create one controlled booking-linked task and verify booking activity + alert linkage.
9. Verify canceling a proposal creates no task/alert.
10. Verify an unknown room/booking is rejected rather than guessed.
11. Test the native iPhone left-edge swipe-to-the-right Back gesture in a signed/dev native build.

## 11. Validation
- backend source syntax checks pass;
- complete backend regression suite: **379 / 379 passed** after integration;
- dedicated Copilot tests cover proposal-only behavior, confirmation execution, unknown-room rejection and proposal tamper protection;
- no live production deployment is claimed by this source artifact.

## 12. Known live-production steps
A real production smoke test still needs the deployed OpenAI credential/model route, real current data, real configured WhatsApp recipients and physical device UI. Test with low-risk controlled tasks first.

## 13. Immediate next priorities
After live validation of v5.11.80 / v0.1.23:
1. extend Copilot action registry carefully to more guarded operations only where canonical backend actions already exist;
2. keep Dashboard/Web Copilot on the same action contract;
3. continue Listings & Rates / Revenue Management expansion;
4. implement Inventory + Assets + Procurement on the same canonical-core pattern;
5. continue Finance/provider automation hardening and final v1 launch readiness.

Already-completed UX items — real guest names, Back buttons, Light-default appearance and 7/14-day calendar — are **not** pending roadmap items.

## 14. Product North Star & Autonomous Operations Roadmap
Taoedge remains a multi-tenant, provider-neutral hospitality operating platform. The House is the proving environment. Reach 100 paying properties in Thailand before international expansion, then scale internationally and progressively reduce avoidable third-party integration dependence where commercially sensible.

Future automation and agents must share canonical data, task/event state, workflow knowledge, provider adapters, permissions and audit. Autonomy advances from Assist -> Guarded execution -> Operational autonomy only where actions are permissioned, observable, reversible where feasible and safe.

## 15. GitHub Summary
`Release v5.11.80 — Operations Copilot foundation and canonical operational actions`

## 16. GitHub Description
`Add Taoedge AI Support / Operations Copilot on top of the preserved production operating core, with a versioned plain-language workflow registry, live role-filtered property context, independently permissioned copilot access, signed expiring task proposals, explicit confirmation, tamper protection and audit. Consolidate manual booking tasks and Copilot-created room/booking tasks onto the same canonical operational routing/alert functions while preserving all mature Concierge, lost-key, registration, Finance, provider, security and Channel Manager-off boundaries.`
