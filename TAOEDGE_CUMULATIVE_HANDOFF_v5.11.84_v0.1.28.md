# TAOEDGE CUMULATIVE HANDOFF — Backend v5.11.84 / Owner App v0.1.28
## Inventory 2.0 + Shopping Lists + Guarded Hotel Control + Five-Star Delayed Guest Replies

## 1. Current release / objective
- **Backend:** v5.11.84
- **Owner App:** v0.1.28
- Builds on v5.11.83 / v0.1.27.
- Current goal: make physical Inventory practical for real hotel use, connect local staff purchasing to Tasks/Finance/stock, allow guarded AI operation of Taoedge-owned Direct Stays/calendar availability, and improve automatic guest replies to a deliberate five-star hospitality standard.

## 2. Current release — DONE
### Inventory 2.0
- Starter catalogue is now optional reference data; Taoedge never assumes a property keeps or needs those items.
- Hotel explicitly activates the stock items it uses or adds custom items.
- Only enabled items appear in operational Inventory, alerts, reorder calculations and Copilot.
- Blank enabled rows are `setup_required`, not falsely out-of-stock.
- Owner App now provides denser Stock / Shopping / POs / Assets workspace with summary/search/filter/category controls.

### Local staff purchasing / Shopping Lists
- Item-level **Add to shopping list**.
- Choose property/villa when multi-property; single-property The House remains automatically scoped.
- Optional room/villa/unit, quantity, specification/brand, notes, existing vs new list, assigned authorized staff, due/timing.
- Multiple concurrent lists for multiple staff/properties.
- Build a Draft list with multiple items, then **Send full list** once to assigned staff.
- Canonical task + mobile alert on assignment.
- Staff line states: Bought / Partial / Unavailable / Substituted with actual quantity/cost/notes.
- Receipt-needed notification when list reaches awaiting-receipt.
- Receipt-required list cannot complete until a Finance expense/receipt is linked.
- Completion posts idempotent Inventory movements tied to the shopping-line source.
- `inventory.local_purchase` allows delegated staff local buying without granting formal supplier purchasing authority.

### Formal supplier POs
- Formal PO requires a specific active supplier at backend and UI level.
- Local Shopping List is deliberately separate from supplier PO.
- Existing server-governed PO lifecycle remains intact.

### Guarded Copilot hotel actions
- Signed/expiring, explicit-confirmation actions for Direct Stay creation, Direct Stay cancellation, room/calendar block and unblock.
- Exact Direct Stay must be validated and `provider=direct`; no freeform OTA cancellation.
- Calendar mutations re-use canonical stay/conflict/availability logic and retain an auditable owner-block state.
- Delete/cancel removes Direct Stay from active operation while preserving history/audit.
- Provider-managed OTA reservations and broad Channel Manager writes remain separately gated.

### Five-star automatic guest replies
- Normal trusted automatic conversational replies wait a minimum of **5 minutes from the newest guest message**.
- Draft is persisted; scheduler releases only after the delay.
- Due reply is generated/rechecked a second time against the latest conversation.
- New guest message or newer manual/non-AI reply supersedes stale pending response.
- Operational-action proposals never auto-send.
- Final quality gate asks whether the guest will feel acknowledged/cared for/satisfied and whether the response could come from a five-star hotel concierge.
- Hospitality means accurate context, calm competence, warmth, ownership, useful next steps and natural closing—not canned luxury prose.
- Existing guest-language communication + staff-language review architecture remains authoritative.

## 3. Prior completed capabilities — DONE / PRESERVED
- Production Personal Guest Page/Concierge, verified/private separation and approved House/local knowledge.
- 24/7 lost-key flow with active-stay verification, explicit 500 THB acceptance, protected alerts/code/audit.
- Registration/passport/TM30 protected workflows and retention separation.
- Housekeeping clean/dirty/ready, checkout/arrival planning, early check-in and late-checkout rules.
- Maintenance/emergency/luggage/activity/diving operational routing.
- Unified Messaging, direct WhatsApp, lifecycle messaging and AI review safety.
- Guest-language originals and AI replies; property staff-language translation/review; staff-edit → guest-language sync.
- Canonical reservation/booking activity model.
- Finance/expenses/Beds24 Finance historical backfill + reconciliation architecture.
- Integrations health/resilience.
- Revenue Engine V1, Analytics/Insights and Daily Operating Console.
- Listings & Rates narrow-write/provider-authority architecture, Direct Stay protection and sync telemetry.
- Full Beds24 Channel Manager remains off/gated.
- Multi-tenant/property mobile foundation, server roles/permissions/licensing/sessions/security/audit.
- Real guest names, 7/14-day calendar, Light/Dark/System, Back/swipe navigation and `com.taoedge.platform` identity.
- Operations Copilot production workflow knowledge, signed proposals and deterministic daily attention.
- Canonical Operations Tasks, room-vs-booking linking rules and WhatsApp RECEIVED/RESOLVE state parity.
- v5.11.82/v0.1.26 Copilot daily-attention reliability and visually distinct in-place sheet.
- v5.11.83/v0.1.27 Inventory/Assets/Procurement foundation + multilingual Inbox review.

## 4. Permanent user-approved product rules — PRESERVE
- Never lose mature Dashboard/Concierge business logic, routing, exceptions, wording rules, alerts or integrations.
- Shared backend/domain core is canonical; mobile/web/guest/Copilot/agents are governed interfaces.
- Server is authority for tenant/property/role/license/permissions/provider credentials.
- AI consequential action: propose → explicit confirm → backend re-check → canonical action → verify/routing → audit.
- Unknown/ambiguous operational targets require clarification; never guess.
- Global room task is not silently booking-linked; property Inventory work is property scope.
- Guest-facing AI uses guest language when understood; staff review language is property-configurable.
- Original guest text and exact send text are never replaced by translations.
- Persistent floating **Ask AI** button remains visible by design; future screens design around it rather than auto-hiding it.
- Physical hotel Inventory is distinct from OTA room availability.
- Inventory catalogue is a template only. Property explicitly chooses stock items.
- Formal supplier PO requires supplier. Local staff buying uses Shopping Lists.
- Shopping List can contain multiple items and is sent as one combined list to assigned staff.
- Every shopping line keeps property and optional room/villa/unit attribution.
- Multiple lists for multiple staff/properties are allowed.
- Receipt/bill links directly to Shopping List and Finance before receipt-required completion; stock movements remain traceable.
- One staff shopping trip must never silently merge property ownership/accounting.
- Trusted normal guest auto-replies wait at least five minutes and re-check the newest context; sensitive/operational actions remain guarded.
- Full Channel Manager-off boundary stays until separately validated.

## 5. Architecture / safety boundaries
- `inventory_shopping_lists` / `inventory_shopping_list_lines` are canonical local-purchase data.
- Canonical Operations Task is reused for assigned shopping work.
- Finance receipt/expense link is recorded before receipt-required list completion; completed lines post source-linked stock movements.
- Owner calendar blocks use canonical availability reservation plus owner-block metadata rather than an untracked UI-only flag.
- Copilot Direct Stay/calendar mutations require `direct_stays.manage`, signed proposal expiry/tamper protection and server revalidation.
- Trusted auto-reply delay uses persisted messaging drafts and scheduled processing—not long-lived requests.
- Sensitive Finance, identity documents, security/lost-key codes and provider credentials remain outside unauthorized Copilot contexts.

## 6. Validation
- Backend JS syntax: **34/34 passed**.
- Backend full regression suite: **399/399 passed**.
- Owner App static validator: **172 files / 67 source-config files — PASS**.
- Owner App TS/TSX standalone syntax transpile: **61/61 passed**.
- Full dependency-aware native Expo build is not claimed from the packaging workspace; physical-device smoke test remains mandatory.

## 7. Deployment order
1. Deploy backend **v5.11.84**.
2. Verify live backend version 5.11.84.
3. Push/run Owner App **v0.1.28** with cleared cache/update.
4. Confirm Diagnostics 0.1.28 / 5.11.84.
5. Run the live acceptance checklist below.

## 8. Live/manual acceptance checklist
- Catalogue does not automatically make all starter items active.
- Activate a few real items; setup-required vs low/out is correct.
- Search/filter and Stock/Shopping/POs/Assets overview is usable on iPhone.
- Add item → Shopping List; property (if multiple), optional room, staff, quantity/spec/notes preserved.
- Add several items to same list → one Send full list alert/task.
- Create second list for different staff; verify isolation.
- Staff updates bought/partial/unavailable/substituted.
- Receipt reminder arrives; bill upload enters Finance and links back; final completion posts stock exactly once.
- Formal Supplier PO cannot start without supplier.
- Copilot create Direct Stay → confirm → appears in canonical calendar.
- Copilot cancel Direct Stay → confirm → active stay removed/cancelled, audit retained, availability processed.
- Copilot block room dates → confirm; unblock → confirm.
- Copilot never touches an OTA booking when asked ambiguously.
- Eligible routine guest auto-reply does not send before five minutes.
- New inbound/manual staff reply during wait supersedes the stale pending response.
- Final delayed reply remains correct guest language, policy-accurate and hospitality-quality.
- Existing lost-key, housekeeping, maintenance, registration, Inbox translation, Finance, Listings & Rates and Tasks remain stable.

## 9. Advanced Inventory / purchasing — PENDING
- Cross-property **Shopping Run** object that groups several property-specific lists for one physical staff trip.
- One receipt spanning multiple lists/properties with explicit line/cost allocation while storing original receipt once.
- Recurring/escalating missing-receipt reminders.
- QR/barcode scanning + labels.
- Batch/expiry/FEFO.
- Stocktake/cycle-count workflows.
- Automatic housekeeping consumption recipes.
- Occupancy/consumption/lead-time forecasting.
- Supplier price history/lead-time intelligence.
- PO invoice → Finance reconciliation.
- Numeric approval/spending limits and multi-stage approvals.
- Rich location transfers/balance management.
- Predictive purchasing.
- Cost per occupied room / department / amenity analytics.
- Complete multi-property Finance/accounting routing and portfolio UX.

## 10. Remaining master roadmap — AGREED ORDER
1. Live verify v5.11.84 / v0.1.28 and fix only genuine production defects.
2. Complete highest-value advanced Inventory layers (shopping-run/receipt allocation, stocktakes, scanning, automatic consumption/forecasting/Finance reconciliation).
3. Listings & Rates / Revenue Management expansion.
4. Remaining provider-neutral Finance/Beds24 automation/historical reconciliation.
5. Comprehensive security/anti-theft hardening + audit/red-team + cross-surface QA.
6. v1 feature freeze and The House live production validation.
7. Product naming/brand approval gate — user approval required before final customer-facing collateral.
8. Commercial demo, final pricing incl. Beds24/Meta/AI/infrastructure, legal SaaS/DPA/SLA/support pack, marketing/sales/onboarding/video.
9. Guarded agent organization across Product, Developer, UX/UI, Guest Comms, Operations, Revenue, Finance, Marketing, Sales, Security/Privacy, Release/DevOps and independent Audit/Red-Team.
10. Reach **100 paying properties in Thailand before international expansion**.
11. International distribution; progressively build Taoedge-owned API/integration layer where commercially sensible.

## 11. Voice — APPROVED / PENDING
- Phase 1 push-to-talk speech-to-text + optional spoken responses.
- Phase 2 optional live voice conversation.
- Same permissions, confirmation, canonical actions/Tasks and audit as typed Copilot. Voice never bypasses consequential-action confirmation.

## 12. Product North Star / commercial objective
Taoedge is one governed, provider-neutral, multi-tenant hospitality operating platform. The House is the proving property. The product should increasingly turn safe natural-language intent into canonical hotel operations without creating parallel data/action systems, validate in Thailand, reach 100 paying Thai properties, then expand internationally.

## 13. Agent/Copilot contribution
v5.11.84 moves Copilot from “advice + task creation” toward a controlled operating interface: Direct Stay/calendar actions use the same server domain boundaries as the normal app. Shopping Lists similarly give humans/Copilot/future agents one auditable local-purchasing object. Autonomy remains assistive/guarded, never unrestricted.

## 14. Explicit DO NOT LOSE
- Mature Dashboard/Concierge knowledge/routing/exceptions.
- Lost-key protection and protected codes.
- Registration/passport/TM30 privacy separation.
- Guest original language + staff translation + exact send text.
- Independent AI reply approval vs operational execution approval.
- Five-minute delayed/rechecked trusted auto-reply rule + five-star satisfaction quality gate.
- Canonical Tasks and alert lifecycle.
- Explicit property-selected Inventory; no assumed stock catalogue.
- Formal PO supplier requirement.
- Local multi-item Shopping Lists, property/room/staff attribution and receipt→Finance→stock linkage.
- Persistent Ask AI launcher.
- Server-side tenant/role/licensing/security/provider isolation.
- Direct Stay conflict/sync protections; audit-safe cancellation.
- Full Channel Manager-off boundary.
- 7/14 calendar, real guest names, Light default, Back/swipe UX.
- Cumulative handoffs: DONE never silently disappears; DEFERRED gets reason; PENDING remains until done or explicitly removed.

## 15. GitHub — Backend Summary
`Release v5.11.84 — Inventory 2.0 shopping workflows, guarded Copilot hotel actions and five-star delayed guest replies`

## 16. GitHub — Backend Description
`Advance Taoedge from the first Inventory foundation to an explicit property-selected Inventory 2.0 model: the hotel catalogue is now optional reference data, only enabled items become operational stock, unconfigured items are setup-required rather than falsely out-of-stock, and local purchasing uses canonical multi-item Shopping Lists with property/room context, authorized staff assignment, one combined task/push alert, line-by-line bought/partial/unavailable/substituted states, receipt-required Finance linkage and idempotent stock posting. Enforce a real active supplier for formal purchase orders. Expand Operations Copilot with signed, expiring, confirm-before-execute Direct Stay create/cancel and calendar block/unblock actions while keeping OTA/provider-managed reservations and full Channel Manager writes outside freeform AI authority. Upgrade trusted automatic guest replies with a minimum five-minute delay, persisted pending state, second generation against the newest conversation, stale-reply cancellation and a five-star hospitality/customer-satisfaction quality gate. Preserve mature Dashboard/Concierge logic, multilingual staff review, canonical Tasks, lost-key/registration/Finance protections, provider isolation and audit. Backend regression suite: 399/399 passed.`

## 17. GitHub — Owner App Summary
`Release Taoedge Owner App v0.1.28 — Inventory 2.0, staff shopping lists and guarded operational Copilot actions`

## 18. GitHub — Owner App Description
`Redesign Taoedge Inventory around explicit property-selected stock instead of assuming every hotel uses the starter catalogue, add setup-required state and a denser Stock/Shopping/POs/Assets management workspace, and make every enabled item directly addable to a multi-item local Shopping List. Shopping Lists support property/villa context, optional room/unit, authorized staff assignment, several concurrent lists, one combined Send full list workflow, bought/partial/unavailable/substituted line updates, actual quantity/cost capture and direct receipt/bill handoff into Finance. Keep formal supplier orders separate and require a selected supplier before creating a Draft PO. Add UI support for signed, confirm-before-execute Copilot Direct Stay create/cancel and calendar block/unblock proposals, while preserving canonical Tasks, multilingual Inbox review, all mature Dashboard/Concierge logic, provider/OTA safeguards and the persistent floating Ask AI launcher. Pair with backend v5.11.84.`
