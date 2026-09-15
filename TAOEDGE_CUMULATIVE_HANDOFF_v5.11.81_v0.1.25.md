# DEVELOPMENT HANDOFF — Taoedge Owner App v0.1.25
## Unified Tasks + Copilot Refinement

## 1. Current release objective/version
- **Owner App:** v0.1.25
- **Required backend:** v5.11.81+
- **Objective:** make AI-created operational work visible and manageable as real Taoedge tasks, fix the poor starter-question presentation observed on iPhone, strengthen direct-vs-contextual Copilot behavior, and preserve all mature hotel logic.

## 2. Completed in this release — DONE
- Added **Operations → Tasks** as the canonical operator-facing task workspace; no new top-level tab was added.
- Operations overview now exposes Open Tasks and overdue signal.
- Task list supports Open / Resolved / All filters.
- Task cards show room, category, work description, due/timing, assignee, source, booking/guest link when genuinely linked, status and WhatsApp delivery state.
- Authorized users can mark tasks **Received** or **Resolved**; updates use the canonical backend alert/task state.
- Copilot-confirmed tasks display a compact **Task created / View task** result that deep-links to the canonical task record.
- Replaced the oversized/empty quick-question shapes with compact horizontal starter chips.
- Starter chips disappear after the first real user message.
- Floating AI Support now opens as a partial, non-blocking panel over the current operating screen; the underlying app context remains visible around it.
- Full-page More → AI Support remains available.
- Direct Support entry clears contextual route information. Context is only supplied when Copilot is opened from a current screen that deliberately provides it.
- Booking context, when present, is a hint only; backend still validates every booking/room before an action can be proposed/executed.
- Existing v0.1.24 visible Back button and iOS swipe-back configuration are preserved.
- App release / runtime version advanced to **0.1.25**.
- Diagnostics expected backend contract advanced to **v5.11.81+**.

## 3. Paired backend behavior in v5.11.81 — DONE/PRESERVED
- Canonical persistent `operational_tasks` records now exist for new Copilot room tasks and booking tasks.
- Booking-created tasks continue to appear in booking activity while also becoming canonical operational tasks.
- Reviewed Unified Messaging actions feed the same task store.
- WhatsApp RECEIVED / RESOLVE actions update canonical task state.
- `What needs my attention today?` is deterministic from live Taoedge data and no longer depends on successful generative-AI completion.
- Room-only Copilot instructions create room tasks and are **not silently attached to the current occupant's booking**.
- Explicit booking tasks link to the validated booking.

## 4. Previously completed capabilities that remain preserved/relevant — DONE/PRESERVED
- Real reservation-holder names.
- 7-day / 14-day operational room-grid calendar with persisted selection.
- Light-default appearance with Light / Dark / System options.
- Visible detail Back navigation and iOS swipe-back configuration.
- Server-authoritative tenant, role, licensing, device/session and entitlement enforcement.
- Security/audit and session revocation.
- Owner/staff granular permissions including `copilot.use` and selected-staff expense submission.
- Historical Airbnb/Beds24 Finance import and idempotent reconciliation architecture.
- Expected/provisional vs settled payout handling.
- Unified Inbox, direct WhatsApp guest communication and independent AI answer-vs-operational-action approval.
- Guest registration / passport / TM30 protected workflows.
- Room readiness, housekeeping queue and departure-time planning.
- Maintenance reporting and protected operational alerts.
- Revenue Engine recommendation architecture.
- Listings & Rates narrow controlled rate/availability bridge with provider authority server-side.
- OTA synchronization telemetry/hardening and conflict-aware reopening safeguards.
- Native distribution identity `com.taoedge.platform` and EAS/TestFlight preparation.
- Logic Preservation Audit: mature Dashboard/Concierge rules remain authoritative; mobile does not replace them.
- Operations Copilot foundation with signed, expiring, confirm-before-execute proposals.

## 5. User-approved decisions / product rules — PRESERVE
- Taoedge is one governed hospitality operating platform, not disconnected App/Dashboard implementations.
- **Never lose mature Dashboard/Concierge logic, routing, wording rules, exceptions, alerts or integrations.**
- Shared backend/domain logic is canonical; App and Dashboard are interfaces to that same logic.
- AI Support must use non-technical hotel language for owners/managers/staff.
- AI Support should know current released production workflows and explain: **what happened → what it means → what to do next**.
- AI Support can prepare operational actions but consequential execution remains server-authoritative, permissioned, audited and confirmed.
- Unknown rooms/bookings/details must trigger clarification; never guess.
- `copilot.use` controls access; action-specific permissions remain separate.
- AI Support should be always available but unobtrusive and should not block normal operational work.
- Direct Support must not carry stale room/booking context.
- Contextual Support may use current screen/booking context, but the backend validates identifiers.
- **Task rule:** global Support + room mentioned = room task; booking/guest explicitly identified = booking-linked task; entering from booking may prefill validated booking context; room tasks are not automatically attached to whichever booking currently occupies the room.
- **Task UX:** one canonical task record may surface in Operations and, when genuinely linked, in Booking/Room context; do not duplicate separate task systems.
- **Operations → Tasks** is the central workspace; do not add unnecessary top-level navigation.
- Prepared Copilot questions must be compact suggestions, not large decorative cards.
- `What needs my attention today?` is a core reliability command and should use deterministic operational data first.
- Physical hotel **Inventory / Assets / Procurement** is distinct from OTA availability “inventory.”
- Every future handoff is cumulative: DONE items stay visible, DEFERRED items carry a reason, PENDING items remain until completed or explicitly removed.
- Every handoff must include GitHub Summary + GitHub Description.

## 6. Current architecture / safety boundaries
- Backend v5.11.81 is the authority for task persistence, role/tenant checks, alert routing, proposal validation, status transitions and audit.
- App v0.1.25 never stores provider credentials or expands permissions locally.
- Copilot proposal → explicit confirmation → backend re-check → canonical action → alert/task → audit remains the action contract.
- Full Beds24 Channel Manager remains separately gated/off unless explicitly enabled and validated.
- Broad provider writes remain fail-closed according to existing capability flags.
- Sensitive Finance, identity-document and security data remains protected by role/permission.

## 7. Deployment order
1. Deploy backend **v5.11.81** first.
2. Confirm Diagnostics/live platform reports backend **5.11.81**.
3. Push/build Owner App **v0.1.25**.
4. In Expo/dev build, clear Metro cache and verify app shows **0.1.25**.
5. Open AI Support directly from More and verify **no stale booking context**.
6. Ask **“What needs my attention today?”** and verify a live operational answer returns.
7. From global AI Support, say **“Room 6 needs the toilet fixed tomorrow at 12 pm.”** Review proposal, confirm, and verify:
   - room task persists;
   - WhatsApp alerts route correctly;
   - Operations → Tasks shows it;
   - it is not silently linked to a booking.
8. Open Operations → Tasks and mark the task Received/Resolved; verify the status updates.
9. Verify a booking-created task appears both in Booking activity and Operations → Tasks.
10. Verify the floating Copilot partial panel, compact starter chips and task-created View Task CTA on iPhone.
11. Verify existing Dashboard/Concierge/guest workflows are unchanged.

## 8. Validation / test results
- App static validator: **PASS — 159 files / 66 source-config files**.
- App TS/TSX syntax transpile: **PASS — 61/61**, 0 syntax diagnostics.
- Paired backend regression suite: **382/382 passed**.
- No production deployment is claimed by this artifact itself.

## 9. Known live-production/manual checks still required
- Verify task migration expectations: v5.11.81 guarantees the canonical store for newly created tasks; historical pre-v5.11.81 booking activity remains preserved in booking history and does not need destructive migration before rollout.
- Verify WhatsApp RECEIVED / RESOLVE updates the same new task visible in Operations.
- Verify due/overdue date display with Bangkok time on physical device.
- Verify the partial Copilot panel does not obstruct critical buttons on smaller iPhones.
- Verify keyboard/composer behavior in partial and full-page Copilot.
- Verify direct Support never shows stale booking context after previously using contextual Support.
- Verify iOS swipe-back in the chosen Expo/native runtime; visible Back remains fallback.

## 10. Remaining work / backlog / agreed next steps
### Immediate after live v5.11.81 / v0.1.25 verification
- Continue Copilot visual polish from real operator feedback.
- Add more guarded Copilot actions only when a canonical backend action already exists and permission/audit rules are clear.
- Consider compact Home signal for overdue/open tasks after real task-volume testing; do not clutter Home prematurely.
- Consider richer room-level task surfacing when a dedicated Room detail workspace is introduced.

### Major product roadmap — PENDING
1. **Listings & Rates / Revenue Management expansion** — PENDING.
2. **Physical Hotel Inventory + Assets + Procurement** — PENDING, approved core v1 scope. Must include:
   - consumables, reusable inventory and assets as separate lifecycle classes;
   - property / department / storage-location hierarchy;
   - stock on hand, available, minimum, reorder point, par and maximum;
   - low-stock / out-of-stock / forecast alerts;
   - suppliers, prices, lead times, purchase requests/orders, approvals, receiving and invoice linkage;
   - transfers, consumption, adjustments, wastage/damage/loss, stocktakes/cycle counts;
   - expiry/batch/FEFO where applicable;
   - QR/barcode scanning architecture;
   - housekeeping-linked automatic consumption / kits;
   - room asset register and maintenance/replacement links;
   - occupancy-aware forecasting and suggested purchasing;
   - cost analytics and Finance linkage;
   - owner/manager/staff permissions and approval limits;
   - Copilot read/action integration through the same guarded task/action core.
3. **Finance/Beds24 automation & reconciliation completion** — PENDING remaining items.
4. **Final security/anti-theft/commercial hardening pass** — PENDING before v1 freeze, while preserving already-completed foundations.
5. **Cross-surface QA** — App, Dashboard/Web Operations Console, Personal Guest Page/Concierge, backend/data, Copilot.
6. **v1 feature freeze + The House live validation.**
7. **Product naming/brand approval gate.** Brand must be presented to user for approval before final customer-facing collateral.
8. **Commercial package:** pricing including Beds24/Meta/AI/infrastructure costs, legal SaaS/DPA/SLA/support pack, onboarding, demo, website/product deck/one-pager/ROI/FAQ/outreach/video.
9. **Agent organization:** Product/Executive coordination plus Developer, UX/UI, Guest Communications, Operations, Revenue, Finance/Admin, Marketing, Sales/Onboarding, Security/Privacy, Release/DevOps and independent Audit/Red-Team.
10. **Thailand rollout to 100 paying properties before international expansion.**
11. Long-term: progressively become Taoedge's own API/integration layer where commercially sensible.

## 11. Product North Star / commercial scaling objective
Taoedge remains a multi-tenant, provider-neutral hospitality operating platform with one canonical operational core. The House is the live proving environment. Finish and harden the product, validate with early Thai properties, reach **100 paying properties in Thailand before international expansion**, then scale internationally. Preserve data sovereignty, server-side licensing/permissions, auditable actions, replaceable provider adapters and the long-term goal of reducing avoidable third-party dependency.

## 12. Agent/Copilot architecture contribution
v0.1.25 moves Copilot from “alert creator” toward a real operational control surface: a task created by AI becomes the same managed record used by normal operations. This is required for future agent autonomy because agents, humans and external channels must share one task/event state rather than parallel systems. Autonomy remains Assist → Guarded execution; no increase to unrestricted authority is introduced here.

## 13. DO NOT LOSE / PRESERVE
- Mature Dashboard/Concierge routing and exceptions.
- Independent AI reply approval vs operational execution approval.
- Lost-key protection and protected codes.
- Passport/registration privacy separation.
- Finance permissions and provider-managed reconciliation rules.
- Server-side licensing/tenant/role enforcement.
- Real guest names, Back navigation, 7/14-day calendar, Light-default UI.
- Full Channel Manager-off boundary until separately validated.
- Distinction between OTA availability inventory and physical hotel Inventory.
- One canonical task/action path for App, Dashboard, Copilot and future agents.

## 14. GitHub Summary
`Release Taoedge Owner App v0.1.25 — unified Tasks workspace and Copilot refinement`

## 15. GitHub Description
`Add a canonical Operations → Tasks workspace for AI Support and booking-created operational work, with Open/Resolved/All views, due/overdue state, assignee and WhatsApp delivery visibility, Received/Resolved actions, real booking links only when a task is genuinely booking-linked, and a View task result after Copilot execution. Refine Taoedge Copilot with compact quick-start chips, a partial non-blocking floating panel, direct-vs-contextual route isolation to prevent stale booking context, and preserved guarded proposal/confirmation semantics. Pair with backend v5.11.81 while preserving all mature Dashboard/Concierge routing, security, Finance, registration, OTA, Revenue, Listings and Channel Manager-off boundaries.`
