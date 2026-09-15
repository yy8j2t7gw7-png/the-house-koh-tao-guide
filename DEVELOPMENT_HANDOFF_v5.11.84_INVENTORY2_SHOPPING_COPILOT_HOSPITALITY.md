# DEVELOPMENT HANDOFF — Taoedge Backend v5.11.84
## Inventory 2.0 + Shopping Lists + Guarded Copilot Hotel Actions + Five-Star Delayed Guest Replies

## 1. Current objective / version
- **Backend:** v5.11.84
- **Paired Owner App:** v0.1.28
- **Base:** v5.11.83 / v0.1.27 multilingual review + physical Inventory foundation.
- **Objective:** turn the first Inventory foundation into a practical property-selected stock and local-purchasing workflow; let Copilot safely operate Taoedge-owned Direct Stays/calendar blocks; and raise trusted automatic guest replies to a delayed, context-rechecked, five-star hospitality standard.

## 2. Completed in v5.11.84 — DONE
### Inventory 2.0 — explicit property stock selection
- The hotel starter catalogue is now a **template/library only**. Taoedge no longer assumes that a hotel uses or needs every known hotel product.
- `seedStarterInventory()` is compatibility-only and creates zero operational items.
- Inventory overview safely retires only untouched blank starter rows left by the v5.11.83 first-version seed behavior.
- Property operators explicitly activate catalogue items through `/api/mobile/v1/inventory/catalogue/activate` or create custom items.
- Only active property items participate in stock overview, low/out alerts, reorder logic and Copilot stock context.
- Newly enabled but completely unconfigured zero-stock items are `setup_required`, not falsely labelled out-of-stock.
- Inventory stays tenant/property scoped for future multi-property use.

### Local Purchase / Shopping Lists
- Added canonical shopping-list storage and API for local purchasing, separate from formal supplier POs.
- A shopping list can contain multiple items and can remain Draft while the owner/manager builds the full list.
- Item lines preserve property, optional room/villa/unit, item/quantity/unit, specification and notes.
- Multiple concurrent lists are supported for different staff members and properties.
- Lists can be assigned/reassigned only to active authorized purchasers within the relevant property scope.
- New delegated permission: `inventory.local_purchase`; staff may be granted local-purchase capability without formal supplier-PO authority.
- Assigning a list creates/uses a canonical Inventory operational task and sends one combined mobile shopping-list alert to the assigned staff member.
- Staff can update individual lines as `bought`, `partial`, `unavailable` or `substituted`, with actual quantity/cost and notes.
- Once all needed lines are dealt with, the workflow can move to `awaiting_receipt`; assigned staff receive a receipt-needed reminder.
- Receipt-required lists cannot be completed until a Finance expense/receipt is linked.
- Completion posts purchased item quantities into Inventory as idempotent stock movements linked to the shopping-list line.
- Finance expense and shopping list are bidirectionally traceable through stored identifiers/audit metadata.

### Formal supplier purchasing safety
- Formal Purchase Orders require a specific active supplier. A PO cannot be created with no supplier or a nonexistent supplier.
- Formal supplier PO flow remains separate from local staff shopping lists.
- Existing guarded PO lifecycle remains: Draft → Approved → Ordered → Partial/Received (or Cancelled), with receiving posting stock.

### Copilot operational actions — guarded hotel control
- Added signed/expiring Copilot proposals for:
  - `create_direct_stay`
  - `cancel_direct_stay`
  - `block_room`
  - `unblock_room`
- These actions require `direct_stays.manage` and never execute from freeform text alone.
- Contract remains: **understand → propose exact action → explicit user confirmation → backend re-check/conflict-check → canonical mutation → availability/synchronization handling → audit**.
- Direct Stay cancellation only targets a validated active `provider=direct` reservation; Copilot refuses to guess or cancel an OTA-managed stay.
- “Delete” behavior is operational cancellation: it leaves historical/audit evidence rather than destructively erasing the record.
- Direct Stay creation uses the existing protected stay route and returns the canonical local reservation ID even when Beds24 provider protection is not enabled.
- Calendar blocks use a canonical Direct Stay-style availability reservation plus a separate Taoedge owner-block record. Unblocking cancels the underlying availability hold and owner-block state.
- Block/unblock proposal and confirmation are separately tested so a proposal never mutates availability before confirmation.
- Provider-managed OTA reservations and broad Channel Manager writes remain outside this freeform Copilot authority.

### Five-star trusted automatic guest replies
- Trusted normal automatic conversational replies now have a **minimum five-minute delay** from receipt of the newest guest message.
- Eligible auto replies are persisted as `pending_auto_send`; no HTTP request is held open for five minutes.
- The existing minute scheduler checks due replies.
- At release time Taoedge performs a **second full generation/check against the current conversation**, not simply sends the first draft.
- If a newer guest message arrived, the stale pending reply is superseded.
- If a newer manual/non-AI outbound reply was sent, the stale pending reply is superseded.
- AI-paused threads, operational-action proposals or any reply no longer eligible for trusted auto-send are held for human review.
- Auto-send decision rejects operational proposals; consequential work can never ride through a conversational auto-reply.
- Prompt quality gate now silently asks:
  - would this answer leave the guest feeling acknowledged, cared for and satisfied?
  - could this response come from a five-star hotel concierge?
- Five-star standard is defined as calm competence, accurate context, warmth, ownership, useful next steps and a natural close—not exaggerated luxury language.
- Farewell/end-of-stay responses should naturally thank the guest for staying, express care, and close warmly when context warrants it; no review/tip solicitation is introduced.
- Urgent internal operational alerts are not delayed by this conversational timing rule.

## 3. Existing capabilities preserved — DO NOT REGRESS
- Mature production Concierge/policy routing and all known exceptions.
- 24/7 protected lost-key release and 500 THB acceptance contract.
- Housekeeping room state/timing, early check-in and late-checkout logic.
- Maintenance/emergency/luggage/activity routes and protected alerts.
- Registration/passport/TM30 privacy separation.
- Unified Messaging, direct WhatsApp and lifecycle messaging.
- Original guest-language communication + property-configured staff-language review/translation.
- Independent AI reply review vs operational-action approval.
- Canonical reservations, booking activity and Direct Stay conflict protections.
- Canonical Operations Tasks + WhatsApp RECEIVED/RESOLVE synchronization.
- Finance, expense submission, Beds24 Finance backfill/reconciliation architecture.
- Integrations health, Revenue Engine, Analytics/Insights and Daily Operating Console.
- Listings & Rates narrow-write bridge and full Channel Manager-off boundary.
- Tenant/property/role/licensing/session security, provider credential isolation and audit.
- Operations Copilot signed proposal/confirmation core and deterministic daily attention.

## 4. Permanent Inventory / procurement rules — PRESERVE
- Master catalogue ≠ operational stock. A property must explicitly enable what it actually keeps.
- Unselected catalogue items generate no low-stock warning, reorder suggestion or Copilot recommendation.
- Property/unit ownership follows each local-purchase line; never blend accounting merely because one staff member shops for multiple properties.
- Formal PO = real supplier required.
- Local staff purchase = Shopping List workflow, not a fake supplier PO.
- A Shopping List may contain multiple items and should be sent as one combined list/alert.
- Authorized staff can acknowledge/work line-by-line and upload the bill/receipt.
- Receipt-required local purchasing must link to Finance before final completion and stock posting.
- Stock posting from completed shopping lines must be idempotent/auditable.

## 5. Permanent AI / messaging safety rules — PRESERVE
- Consequential action requires server permission + signed proposal + explicit confirmation + backend revalidation + audit.
- Unknown/ambiguous rooms, bookings, blocks, dates or properties trigger clarification, never guessing.
- Freeform Copilot cannot mutate provider-managed OTA bookings or turn on broad Channel Manager writes.
- Trusted automatic guest replies remain informational/conversational only; operational proposals force review.
- Guest language remains guest-facing; staff language is an operator review layer.
- Normal automatic guest replies wait at least five minutes and are rechecked against the newest conversation before sending.

## 6. Architecture / data additions
- Inventory starter catalogue remains code-level template data; operational items are property-scoped records.
- Canonical shopping tables: `inventory_shopping_lists`, `inventory_shopping_list_lines`.
- Canonical owner-block storage links a Taoedge calendar block to its reservation/room/date/reason.
- Local purchase assignment reuses canonical operational task state for staff work visibility.
- Receipt expense linkage connects Shopping List → Finance expense → stock movements.
- Pending automatic guest replies use existing messaging draft persistence with `pending_auto_send` metadata and scheduler release.
- `processDueAutomaticGuestReplies()` is invoked by the minute scheduled worker.

## 7. Validation — PASS
- Backend JS syntax: **34/34 source files passed `node --check`**.
- Full backend regression suite: **399/399 passed**.
- New coverage includes:
  - five-star hospitality prompt quality gate;
  - five-minute automatic-reply delay and second generation;
  - superseding stale pending replies on a newer guest message;
  - explicit starter-catalogue activation / setup-required behavior;
  - PO supplier requirement;
  - local shopping-list authorization/property/room context;
  - receipt-required Finance linkage and idempotent stock posting;
  - Direct Stay create/cancel proposal + confirmation;
  - calendar block/unblock proposal + confirmation.

## 8. Deployment order / live checks
1. Deploy backend **v5.11.84** first.
2. Confirm `/api/mobile/v1/platform` and Owner App Diagnostics report backend 5.11.84.
3. Push/run Owner App **v0.1.28**.
4. Regression-smoke existing Concierge, Inbox, Operations, Finance, Listings/Direct Stay and lost-key flows.
5. Inventory: verify catalogue is optional; activate only selected items; setup-required rows do not count as out-of-stock.
6. Create two local Shopping Lists for different authorized staff; add several items; send one full list; verify task/push.
7. Staff marks items bought/partial/unavailable/substituted; verify receipt reminder; upload Finance bill; complete and verify stock movements.
8. Confirm formal PO cannot be created until a supplier is selected.
9. Copilot: create Direct Stay; cancel a known Direct Stay; block room dates; unblock them. Every mutation must require explicit confirmation.
10. Trusted guest auto-reply: verify nothing sends before five minutes; verify due reply is re-generated/rechecked; verify a newer guest/manual message cancels the stale reply.

## 9. Known scope boundaries / still PENDING
- Rich cross-property **Shopping Run** container combining several property-specific lists into one physical trip is not yet a separate domain object.
- One receipt spanning several properties with line-by-line cross-property allocation is not yet complete; do not duplicate bills manually as a workaround in product design.
- Recurring/escalating missing-receipt reminders beyond the immediate awaiting-receipt notification are still pending.
- QR/barcode scanning and printable labels.
- Batch/expiry/FEFO.
- Stocktakes/cycle counts UI.
- Automatic housekeeping consumption recipes/posting.
- Occupancy + consumption + supplier-lead-time forecasting.
- Supplier price history/intelligence.
- PO invoice → Finance reconciliation.
- Numeric approval limits / multi-stage purchasing approval.
- Rich location-transfer/balance UI.
- Predictive purchasing.
- Cost-per-room/department/amenity analytics.
- Complete multi-property Finance/property accounting routing and selector UX.
- Copilot voice (push-to-talk first, optional live voice later).
- Listings & Rates / Revenue expansion, remaining Finance automation, security hardening, cross-surface QA and v1 freeze.

## 10. Product North Star / commercial objective
One governed, multi-tenant, provider-neutral hospitality operating platform. The House remains the live proving environment. Taoedge should safely operate more of the hotel through the same canonical data/actions, reach **100 paying Thai properties before international expansion**, then expand internationally while progressively reducing avoidable third-party dependency.

## 11. GitHub Summary
`Release v5.11.84 — Inventory 2.0 shopping workflows, guarded Copilot hotel actions and five-star delayed guest replies`

## 12. GitHub Description
`Advance Taoedge from the first Inventory foundation to an explicit property-selected Inventory 2.0 model: the hotel catalogue is now optional reference data, only enabled items become operational stock, unconfigured items are setup-required rather than falsely out-of-stock, and local purchasing uses canonical multi-item Shopping Lists with property/room context, authorized staff assignment, one combined task/push alert, line-by-line bought/partial/unavailable/substituted states, receipt-required Finance linkage and idempotent stock posting. Enforce a real active supplier for formal purchase orders. Expand Operations Copilot with signed, expiring, confirm-before-execute Direct Stay create/cancel and calendar block/unblock actions while keeping OTA/provider-managed reservations and full Channel Manager writes outside freeform AI authority. Upgrade trusted automatic guest replies with a minimum five-minute delay, persisted pending state, second generation against the newest conversation, stale-reply cancellation and a five-star hospitality/customer-satisfaction quality gate. Preserve mature Dashboard/Concierge logic, multilingual staff review, canonical Tasks, lost-key/registration/Finance protections, provider isolation and audit. Backend regression suite: 399/399 passed.`
