# DEVELOPMENT HANDOFF — Taoedge Backend v5.11.81
## Unified Tasks Foundation & Operations Copilot Reliability

## 1. Current release objective
Build the first shared operational Tasks foundation and fix the live Copilot gaps discovered on iPhone: room tasks must remain visible/manageable after alerts are sent, and “What needs my attention today?” must be a dependable operational command rather than a fragile model-only response.

## 2. DONE in this release
- **DONE — Persistent room tasks:** confirmed AI Support room actions now create a persistent `operational_tasks` record as well as the protected WhatsApp alert.
- **DONE — Booking task consolidation:** manual booking tasks and Copilot booking tasks also enter the shared task store while keeping the existing Booking activity timeline.
- **DONE — Historical continuity:** existing reservation task records are backfilled into the new shared task store on initialization.
- **DONE — Shared status:** WhatsApp `RECEIVED` and `RESOLVE` update the shared task record through the same alert ID.
- **DONE — Operations API task feed:** `/api/mobile/v1/operations` now returns shared tasks.
- **DONE — Task status action:** `/api/mobile/v1/operations/tasks/status` supports protected Received / Resolved state changes.
- **DONE — Reliable daily priorities:** “What needs my attention today?” is answered deterministically from live property state before generative AI is invoked.
- **DONE — Natural task phrasing:** deterministic fallback understands instructions such as “Room 6 needs the toilet fixed tomorrow 12 pm.”
- **DONE — Context-safe task creation:** validated booking-screen context may be used when the instruction is clearly contextual; explicit room/booking wording always overrides screen context.
- **DONE — Created-task deep link data:** confirmation returns persistent `taskId` for the Owner App.

## 3. Previously completed capabilities that remain preserved
Do not regress or reimplement separately:
- Mature Dashboard/Concierge routing and operating rules are the primary domain-logic source.
- Backend v5.11.80 shared operational action path and signed Copilot proposal/confirmation contract.
- Owner App AI review safety from v0.1.22 / backend v5.11.79: reply approval and operational execution remain independent decisions.
- Wi-Fi informational requests remain side-effect free.
- Guest messaging, lifecycle automation, late checkout, early check-in, luggage, lost-key, registration/passport, housekeeping, maintenance, Finance and OTA safeguards.
- Tenant/role/licensing/session enforcement, audit logs and provider credential isolation.
- Listings & Rates narrow-write architecture and full Channel Manager-off boundary.
- OTA propagation telemetry / conflict-aware Direct Stay synchronization architecture.

## 4. User-approved task rules — preserve permanently
1. Global Support Chat + explicit room → **room task**, not a booking task.
2. Global Support Chat + explicit booking/guest → booking-linked task only after safe identification.
3. Support opened from a booking may use that validated booking as context when the instruction is clearly about “this” booking/guest/room.
4. Explicit room/booking text always overrides screen context.
5. Never attach a room maintenance task to a booking merely because that room currently has a guest.
6. If ambiguous, ask one short clarification question instead of guessing.
7. Every confirmed task must persist after the alert is sent.
8. One task may surface in multiple relevant views, but should not become multiple independent operational jobs.
9. Tasks remain under **Operations**, not a new main navigation tab.
10. WhatsApp alert routing and task status must stay linked/auditable.

## 5. AI Support / Copilot standing requirements — preserve
- Production-workflow aware and fed from versioned Taoedge operating knowledge.
- Plain, non-technical hotel language for owners/managers/staff.
- Live data is role-filtered and permission-filtered.
- Explain: what happened → what it means → what to do next.
- Can propose room/booking tasks from ordinary language.
- Consequential action requires explicit confirmation and applicable backend permission.
- Signed proposal must expire and be tamper resistant.
- Sensitive Finance, identity, security and owner-only data remain permission protected.
- Current screen context is a convenience hint only, never unvalidated authority.

## 6. Architecture / safety boundaries
`operational_tasks` is now the shared generic task layer for booking/manual/Copilot operational work. Specialized housekeeping and maintenance records remain intact; this release does not destructively replace those mature domain models. Shared tasks are anchored to the existing protected alert where applicable, so WhatsApp acknowledgement/resolution stays synchronized.

## 7. Deployment order
1. Deploy backend v5.11.81.
2. Verify `/api/mobile/v1/platform` reports backend `5.11.81`.
3. Open Operations on the current Owner App and ensure existing operations still load.
4. Push/run Owner App v0.1.25.
5. Controlled test: AI Support → “Room 6 needs the toilet fixed tomorrow 12 pm” → review → confirm.
6. Confirm WhatsApp alerts send.
7. Confirm the same task appears in Operations → Tasks.
8. Mark task Received / Resolved and verify state updates.
9. Ask “What needs my attention today?” and confirm a live structured answer.

## 8. Validation
- **382 / 382 backend tests passed.**
- All backend JS syntax checks passed.

## 9. Live-production checks still required
- Durable Object creates `operational_tasks` successfully on production initialization.
- Historical booking task backfill appears once without duplication.
- Existing WhatsApp RECEIVED/RESOLVE updates shared task status.
- Production daily-attention data correctly reflects current rooms/tasks/registration/messages.
- No regression in Dashboard/Concierge operational routing.

## 10. Remaining work / backlog in agreed order
### Immediate
- **PENDING — Live verify v5.11.81 + App v0.1.25.**
- **PENDING — Verify native iPhone full-screen swipe-back behavior physically.**

### Product development after verification
- **PENDING — Listings & Rates / Revenue Management expansion.** Keep provider writes guarded, explicit and auditable; full Channel Manager remains separately gated until proven.
- **PENDING — Physical Hotel Inventory + Assets + Procurement module.** Approved scope includes: consumables/reusables/assets separation; hotel categories; stock on hand/available/reserved; minimum/reorder/par/max; low-stock and forecast alerts; occupancy-aware forecasting; housekeeping consumption recipes; room-level inventory/assets; multi-location stock; transfers; barcode/QR support; receiving; suppliers/prices/lead times; purchase requests/approvals/POs/partial delivery/invoices; cost tracking; waste/damage/loss/expiry/batches/FEFO; stocktakes/cycle counts; serial/warranty/service history; multi-property architecture; permissions/approval limits; Finance integration; AI inventory assistant and predictive purchasing.
- **PENDING — Remaining Finance/Beds24 automation and reconciliation work**, including scheduled/provider-neutral ingestion and historical/idempotent reconciliation.
- **PENDING — Final security/anti-theft review and commercial hardening**, then integration QA and v1 feature freeze.

### Commercial sequence after v1 freeze
- **PENDING — Final product brand/name approval by owner before customer-facing collateral.**
- **PENDING — Polished demo environment.**
- **PENDING — Pricing with Beds24/Meta/AI/API/other variable costs included.**
- **PENDING — Legal commercial package:** SaaS agreement, order form/subscription, Terms, Privacy, DPA, AI/WhatsApp provisions, SLA/support, cancellation/refunds, IP/licensing, reseller/partner where needed.
- **PENDING — Marketing/sales package:** website, deck, one-pager, brochure, ROI, demo script, FAQ/objections, outreach, onboarding, social assets, short video.
- **PENDING — Agent organization:** Product/Executive orchestration with Developer, UX/UI, Guest Communications, Operations, Revenue, Finance/Admin, Marketing, Sales/Onboarding, Security/Privacy, Release/DevOps and independent Audit/Red-Team; permissioned/auditable/reversible autonomy.
- **PENDING — Thailand rollout to 100 paying properties before international expansion.**
- **PENDING — International distribution and progressive Taoedge-owned API/integration-provider strategy.**

## 11. Product North Star
Taoedge is one governed, multi-tenant, provider-neutral hospitality operating platform. The House remains the live proving environment. The goal is not merely a PMS screen: Taoedge should connect guest communication, operations, tasks, housekeeping, maintenance, Finance, revenue, inventory and future agents through canonical data and safe action contracts.

## 12. Do not lose / preserve
- Never overwrite mature Dashboard/Concierge logic with mobile logic without explicit comparison.
- Do not create independent task/routing implementations per client.
- Do not silently enable full Channel Manager behavior.
- Do not weaken role/tenant/server authorization.
- Do not turn AI interpretation into automatic consequential execution.
- Do not silently drop roadmap items; mark DONE / PENDING / DEFERRED explicitly in every future handoff.

## 13. GitHub Summary
`Release v5.11.81 — unified operational tasks and reliable Operations Copilot priorities`

## 14. GitHub Description
`Add the first persistent shared Taoedge operational task layer so confirmed AI Support room work no longer ends as an alert-only event. Store room- and booking-linked tasks with route, timing, alert, delivery and status data; backfill existing booking tasks into the shared task view; synchronize WhatsApp RECEIVED/RESOLVE actions through the existing protected alert state; expose tasks through the mobile Operations API; and add protected task status updates. Make “What needs my attention today?” deterministic from live property data before generative AI is required, improve fallback understanding of natural room-work instructions, and safely use validated booking-screen context while keeping explicit user wording authoritative. Preserve mature Dashboard/Concierge routing, signed confirmation gates, tenant/role security, Finance/registration/lost-key safeguards, provider credential isolation and the full Channel Manager-off boundary. Full backend regression suite: 382/382 passed.`
