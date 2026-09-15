# DEVELOPMENT HANDOFF — Backend v5.11.83
## Multilingual Staff Review + Physical Inventory/Assets/Procurement Foundation

## 1. Current objective/version
- **Backend:** v5.11.83
- **Paired Owner App:** v0.1.27
- **Objective:** add the first production-grade physical hotel Inventory/Assets/Procurement core and make multilingual guest communication safely reviewable by hotel staff in a configurable property working language, without weakening any mature Dashboard/Concierge, security, Finance, OTA or AI-action safeguards.

## 2. Completed in v5.11.83 — DONE
### Multilingual operator review
- Added property-scoped operator setting `staffLanguage`; default remains English when unset, but the architecture is not hard-coded to English.
- Added guarded GET/POST `/api/mobile/v1/settings/operator-language`; changing it requires `property_settings.manage` and is audited.
- Unified Inbox thread responses now include `staffLanguage` and `staffLanguageLabel`.
- Added POST `/api/mobile/v1/inbox/translate` under Unified Messaging permissions.
- Stored guest messages can be translated on demand without modifying or replacing their original text.
- Custom staff draft text requires `messaging.ai_control`.
- `match_reference` mode translates an edited staff-language review back into the language of the referenced guest-language draft. This enables staff to edit meaning in their working language while still reviewing the exact guest-language send text before approval.
- Translation prompt treats guest/staff text as data, preserves names, room numbers, dates, times, prices, currencies, URLs and emojis, and is audited without storing unnecessary raw translation text in the audit metadata.
- Existing AI reply approval and operational-action approval remain independent; translation does not send anything.

### Physical hotel Inventory foundation
- Added `inventory` as a licensed module and added server-authoritative permissions: `inventory.view`, `inventory.adjust`, `inventory.purchase`, `inventory.manage`.
- House preview licensing upgrades existing module snapshots additively so Inventory is not hidden merely because an older license record predates the module.
- Added property-scoped inventory schema for locations, items, stock balances, movements, suppliers, item-supplier mapping, purchase orders/lines, assets, batches, stocktakes and consumption recipes. Advanced reserved tables do **not** imply their full workflow/UI is shipped; see PENDING below.
- Added item classes: `consumable`, `reusable`, `asset`.
- Added hotel category templates plus a starter catalogue covering housekeeping supplies, linen/bedding, towels, toiletries, amenities, bottled water, cleaning, laundry, maintenance parts, bulbs/batteries, room equipment and first aid.
- Item records support SKU/name/category/class/unit, quantity, minimum, reorder point, par level, maximum, unit cost, currency, preferred supplier and active state.
- Inventory overview derives low-stock, out-of-stock, suggested-order quantity, stock value and open-PO counts.
- Added storage locations and location-scoped stock balances.
- Added stock movement types: receive, consume, transfer, adjust, waste, damage, lost, expired, complimentary, staff use and stocktake. Stock cannot silently go negative for ordinary depletion/transfer movements.
- Added suppliers.
- Added guarded purchase-order lifecycle: new POs always start **draft**; valid explicit transitions are draft → approved/cancelled and approved → ordered/cancelled. Receiving is allowed only from ordered/partial state; receipt can be full remaining or line-partial and updates stock through the canonical movement ledger.
- Added asset register records with asset tag/serial, room/location, status, purchase/warranty fields and `nextServiceAt`.
- Added mobile inventory API routes for overview, starter seed, locations, items, movements, suppliers, PO create/status/receive and assets.
- Inventory writes and status transitions are audited through the existing mobile security model.

### Operations Copilot / Tasks integration
- Copilot live context can include role-filtered Inventory data only when the session has Inventory access.
- `What needs my attention today?` now includes low/out-of-stock Inventory signals alongside existing operational attention data.
- Inventory summary questions such as “What inventory needs restocking?” use live stock data.
- A property-wide instruction such as **“Create a restock task for toilet paper”** produces a canonical **Inventory** task with `scope: property`; it no longer gets misclassified as Housekeeping and does not invent a room or booking.
- Inventory task routing uses the existing protected Operations/task/alert core and explicit confirmation.

## 3. Previously completed capabilities — DONE/PRESERVED
- Mature Concierge policy/routing, approved knowledge, emergency/lost-key, luggage, maintenance, housekeeping and activities workflows.
- Reservation-aware operational model, room readiness, housekeeping status, early/late checkout rules and canonical reservation context.
- Unified guest messaging, direct WhatsApp communication, lifecycle automation and provider-safe review flow.
- AI review safety: AI answer approval and operational execution are separate decisions; Approve–Don’t Send has zero side effects.
- Canonical `operational_tasks`, Operations → Tasks lifecycle and WhatsApp RECEIVED/RESOLVE synchronization.
- Operations Copilot signed/expiring proposal → explicit confirmation → backend re-check → canonical action → audit.
- Deterministic/fail-safe daily-attention path from v5.11.82.
- Guest registration/passport/TM30 privacy boundaries.
- Finance/expense controls, Beds24 Finance historical import/reconciliation architecture and expected-vs-settled payout handling.
- Revenue Engine foundation, Listings & Rates narrow controlled bridge and Direct Stay conflict-aware OTA synchronization.
- Server-side tenant, role, license/entitlement, session/device and provider-secret enforcement.
- Full Beds24 Channel Manager remains separately gated/off unless explicitly enabled and validated.

## 4. Permanent product rules — PRESERVE
- Shared backend/domain logic is canonical; App and Dashboard are clients of the same rules.
- Never replace mature Dashboard/Concierge logic with a simplified mobile implementation.
- Guest-facing AI may communicate in the guest’s language when understood. Operator review is always available in the property’s configured staff working language.
- Translation never overwrites the original guest message or the actual guest-language reply.
- Editing a staff-language review may regenerate the guest-language draft, but the actual send text must be shown again before approval.
- Global Copilot + explicit room = room task. Explicit validated booking/guest = booking-linked task. Property-wide stock/restock = property-scope Inventory task.
- A room repair is never linked to the current occupant merely because the room is occupied.
- Unknown/ambiguous identifiers require clarification; never guess.
- Consequential actions always remain permissioned, explicit, confirmed and audited.
- Physical hotel Inventory is distinct from OTA availability “inventory.”

## 5. Architecture / safety boundaries
- Backend remains authority for tenant/property scope, permissions, Inventory writes, PO transitions, translation access, Copilot proposals and audit.
- Provider credentials, guest access codes and protected identity data remain server-only.
- Translation uses OpenAI only through the backend; the Owner App receives translated result text, never API credentials.
- Custom draft translation is more privileged than translating a stored message.
- Purchase orders cannot be created directly as approved/ordered/received; server forces draft state.
- Receiving is server-gated to ordered/partial POs.
- Inventory module is additive and does not alter OTA room-availability authority.

## 6. Deployment order
1. Deploy backend **v5.11.83** first (`npm install` then the existing Wrangler deployment command).
2. Verify `/api/mobile/v1/platform` / Diagnostics reports backend **5.11.83** and Inventory capability is present for the expected owner session.
3. Push/run Owner App **v0.1.27**.
4. Verify existing Concierge, Inbox, Operations, Finance, registration and Listings screens still load before enabling live Inventory data entry.

## 7. Validation — PASS
- `node --check` on changed backend modules: PASS.
- Full backend regression suite: **388/388 passed**.
- Added v5.11.83 targeted tests for guarded PO creation/status behavior, asset preventive-service date persistence, configurable staff-language translation/resync, property-scope Inventory Copilot tasks and live Inventory summary.

## 8. Required live/manual checks
- Set Staff working language to English, translate a Thai/German guest message, hide/show translation, and confirm original message is unchanged.
- Generate an AI draft in the guest language, translate for staff review, edit the staff translation, synchronize back, and verify the updated guest-language draft is visible before send.
- Confirm no message is sent merely by translating or synchronizing.
- Inventory: create Main Store, seed starter catalogue, set toilet-paper stock/reorder/par, receive/use stock and verify low-stock state.
- Create supplier → draft PO → approve → mark ordered → receive; verify stock increases and PO becomes received.
- Test one partial PO receipt via API/backend path; fine-grained partial-line mobile UI remains pending.
- Add an AC/TV asset with serial, room and next service date.
- Copilot: ask “What inventory needs restocking?” and confirm current stock. Then “Create a restock task for toilet paper”; verify a **Property / Inventory** task proposal, confirmation, alert and Operations → Tasks record with no fake booking/room.
- Re-run `What needs my attention today?` and ensure v5.11.82 reliability remains intact.

## 9. Remaining Inventory scope — PENDING (DO NOT DROP)
- QR/barcode scanner UX and label workflow.
- Batch/lot/expiry operational workflow and FEFO picking UI.
- Stocktakes/cycle counts UI and reconciliation approval.
- Automatic housekeeping consumption recipes/posting on checkout/stayover/welcome events.
- Occupancy-aware forecasting using upcoming bookings, consumption rate and supplier lead time.
- Rich item-supplier price/lead-time history and recommended supplier selection.
- Invoice capture/matching and Finance reconciliation from purchase orders/deliveries.
- Numeric approval limits/multi-level procurement approval policy.
- Full per-location transfer/adjustment UI and location balance drill-down.
- Predictive purchasing and AI purchase recommendations.
- Rich cost-per-room/department/amenity analytics, days-remaining forecasting.
- Multi-property selector UX. Data is property-scoped from day one, but cross-property operator UI is not complete.

## 10. Wider remaining roadmap
1. Live-verify v5.11.83 / v0.1.27 and finish the Inventory advanced layers above.
2. Listings & Rates / Revenue Management expansion.
3. Remaining Finance/Beds24 provider-neutral automation and reconciliation.
4. Final security/anti-theft hardening, red-team review, cross-surface QA and v1 freeze.
5. **Voice Copilot:** push-to-talk speech-to-text + optional spoken replies first; later optional live conversation. Same permissions/confirmation/audit core; voice never bypasses consequential confirmation.
6. Product brand/name approval gate before final customer-facing collateral.
7. Demo, final pricing (including Beds24/Meta/AI/infrastructure), legal SaaS/DPA/SLA/support pack, marketing/sales/onboarding/video.
8. Guarded agent organization for Product/Developer/UX/Operations/Revenue/Finance/Marketing/Sales/Security/Release/Audit.
9. Reach **100 paying properties in Thailand** before international expansion.
10. International distribution and long-term Taoedge-owned API/integration-provider strategy.

## 11. Product North Star
Taoedge remains a multi-tenant, provider-neutral hospitality operating platform with one canonical operational core. The House is the live proving environment. Mobile, web, guest surfaces, Copilot and future agents must share the same permissions, data, tasks and audit trail.

## 12. Agent/Copilot contribution
This release gives future agents a real Inventory domain instead of a parallel chatbot concept. Copilot can read role-filtered stock and propose canonical restock work, but it cannot autonomously approve/order/receive purchases. Future purchasing autonomy must remain capability-gated, amount-limited, confirmation-aware and auditable.

## 13. DO NOT LOSE
- Mature Dashboard/Concierge business/routing logic and exceptions.
- Original-language guest messages and exact guest-language send text.
- Staff-language translation is review assistance, never source-of-truth replacement.
- Independent AI reply approval vs operational execution approval.
- Canonical Tasks + protected WhatsApp routing/status.
- Lost-key security, passport/privacy separation, Finance permissions, provider-managed reconciliation.
- Server-side licensing/tenant/role enforcement.
- Full Channel Manager-off boundary.
- Physical-stock Inventory vs OTA room availability distinction.
- Every future handoff remains cumulative: DONE stays visible, PENDING stays until completed or explicitly removed.

## 14. GitHub Summary
`Release v5.11.83 — multilingual staff review and physical Inventory/Assets/Procurement foundation`

## 15. GitHub Description
`Add property-configurable staff working language and an original-preserving translation layer for Unified Inbox guest messages and AI drafts, including guarded translation of staff-language edits back into the guest language before approval. Introduce the first canonical physical-hotel Inventory/Assets/Procurement foundation with property-scoped items, consumable/reusable/asset classes, hotel category templates, storage locations, min/reorder/par/max levels, low/out-of-stock signals, stock movements, suppliers, guarded purchase-order lifecycle and receiving, serialized asset records with warranty/service dates, role permissions and audit. Extend Operations Copilot with role-filtered inventory awareness, daily low-stock attention and property-wide Inventory restock tasks without inventing room/booking context. Preserve mature Dashboard/Concierge routing, canonical Tasks, AI review/operational-action separation, Finance/registration/lost-key protections, provider credential isolation, Listings/Revenue safeguards and the full Channel Manager-off boundary. Backend regression suite: 388/388 passed.`
