# TAOEDGE CUMULATIVE HANDOFF — Backend v5.11.83 / Owner App v0.1.27
## Multilingual Guest-Communication Review + Physical Inventory/Assets/Procurement Foundation

## 1. Current production candidate
- Backend: **v5.11.83**
- Owner App: **v0.1.27**
- Built on the live-verified v5.11.82 / v0.1.26 Copilot reliability/visual separation pair.
- This release moves Taoedge into a new canonical physical-stock domain and formalizes bilingual/multilingual staff review without changing the guest-facing language strategy.

## 2. v5.11.83 / v0.1.27 completed work — DONE
### Guest language / staff working language
- Guests may continue communicating in their own language when AI understands it.
- Property-configured staff working language is now a first-class setting; default English is replaceable.
- Incoming guest messages keep their original text and can be translated on demand for staff.
- AI draft actual send text remains guest-language text; a separate staff-language review translation is available.
- Staff can edit the review translation and synchronize it back into the guest-language draft, then inspect the exact send text before existing approval/send.
- Translation never auto-sends and never triggers an operational action.

### Canonical physical Inventory / Assets / Procurement foundation
- New server-authoritative Inventory module + permissions.
- Property-scoped locations, item master, stock balances/movements, suppliers, POs/lines and asset register.
- Consumable / reusable / asset separation.
- Broad hotel category templates and starter catalogue.
- Stock thresholds: minimum / reorder / par / maximum; low/out-of-stock signals and suggested order quantity.
- Stock movements include receive/use/transfer/adjust/waste/damage/lost/expired and other hotel reasons.
- Purchasing lifecycle: draft → approved → ordered → partial/received, guarded server-side; receive moves stock.
- Mobile v0.1.27 exposes the practical core: stock overview, locations, starter catalogue, stock receive/use, suppliers, draft PO creation, approval/order/receive, assets and service dates.
- Copilot can read authorized stock, surface stock in daily attention, answer restock questions and propose a **property-scope Inventory task**.

## 3. Earlier completed releases/capabilities — DONE/PRESERVED
- Production guest Concierge/guest page with verified/private separation, House information, practical info and operational menus.
- 24/7 guarded lost-key self-service: active-stay verification, explicit 500 THB acceptance, protected alerts, protected code release and audit.
- Registration/passport/TM30 separation and protected document handling.
- Housekeeping clean/dirty/ready model, checkout/check-in timing, early check-in and late-checkout policies.
- Maintenance and emergency reporting with protected alert routing.
- Luggage, activities/dive booking and approved local knowledge routing.
- Unified Messaging + WhatsApp, AI draft review, lifecycle messaging.
- AI review safety with independent reply decision vs operation decision.
- Canonical reservation model and Booking Details/activity.
- Finance/expense management, Beds24 Finance sync/backfill and expected/provisional reconciliation architecture.
- Integrations health/resilience.
- Revenue Engine V1, Analytics/Insights and Daily Operating Console.
- Listings & Rates controlled narrow write architecture and Direct Stay protection with full Channel Manager kept off.
- Mobile commercial foundation: multi-tenant/property roles, licensing/entitlements, secure sessions, delegated staff permissions, biometric/app settings.
- Owner App real guest names, 7/14-day calendar, Light/Dark/System, Back navigation, native distribution identity `com.taoedge.platform`.
- Operations Copilot with production-workflow registry, signed proposals, guarded execution.
- Canonical Operations Tasks with room/booking associations, Received/Resolved lifecycle and WhatsApp status synchronization.
- v5.11.82/v0.1.26 daily-attention reliability + visually separated in-place Copilot.

## 4. Permanent business/logic rules
- **Never lose mature Dashboard/Concierge business rules, routing, exceptions, wording, alerts or integrations.**
- Backend/domain core is canonical; app, web, guest surfaces and Copilot share it.
- Tenant/property/role/license/permissions are server-authoritative.
- AI can propose; consequential action requires permission + explicit confirmation + backend re-check + audit.
- Unknown room/booking/details => clarify, never guess.
- Global AI Support + room => room task; explicit booking/guest => booking-linked; property stock/restock => property Inventory task.
- Room maintenance does not automatically belong to whichever booking occupies the room.
- Original guest-language messages and send text are authoritative communication records; translation is a review aid.
- Staff working language is property-configurable and never structurally hard-coded to English.
- Full Beds24 Channel Manager stays separately gated/off until specifically enabled and validated.
- Physical hotel Inventory and OTA room availability are different domains.

## 5. Current architecture / safety boundaries
- Canonical backend owns Inventory records, PO state, translation authorization, task routing, provider adapters, audit and permissions.
- App contains no provider/OpenAI secrets.
- Guest documents/security codes remain isolated from normal Copilot and Inventory contexts.
- Finance remains permission-separated from ordinary staff.
- Translation custom-text path is protected by AI-control permission; stored message translation requires messaging capability.
- PO creation starts draft; receipt cannot bypass order state.
- Inventory database is property-scoped for eventual multi-property operation.

## 6. Deployment order
1. Backend v5.11.83.
2. Confirm live backend version/module/permissions.
3. Owner App v0.1.27 with cleared cache/native bundle.
4. Smoke-test previous core operations.
5. Test translation.
6. Test Inventory starter → stock → supplier → PO lifecycle → asset.
7. Test Copilot stock summary/property restock task.

## 7. Validation
- Backend syntax: PASS.
- Backend regression suite: **388/388 passed**.
- App static validator: **168 files / 67 source-config files — PASS**.
- App TS/TSX syntax transpile: **61/61 passed**.
- Native dependency-aware build not claimed in packaging workspace; physical-device/Expo/TestFlight smoke test remains required.

## 8. Live/manual acceptance checklist
- Diagnostics = 0.1.27 / 5.11.83.
- Guest original text remains untouched through translation show/hide.
- Staff language setting changes translation target.
- AI reply remains guest language; staff translation is review-only.
- Edit staff translation → sync → exact final guest-language draft visible → deliberate send approval.
- No translation action creates a message/alert/task.
- Inventory seed, location, thresholds and stock movement.
- Supplier, draft PO, approve, order, receive, stock update.
- Asset with serial/room/service date.
- Copilot stock answer and property Inventory task.
- Existing daily attention, room task, Operations task status, WhatsApp alerts.
- Existing guest Concierge, booking, housekeeping, maintenance, registration, Finance, Listings/Direct Stay remain stable.

## 9. Approved Inventory roadmap still PENDING
- Barcode/QR scanner + labels.
- Batches/expiry/FEFO.
- Stocktakes/cycle counts.
- Automatic housekeeping consumption recipes.
- Occupancy/consumption/lead-time forecasting.
- Rich supplier-price and lead-time intelligence.
- PO invoice/Finance reconciliation.
- Approval limits/multi-stage procurement.
- Complete location-transfer and balance UI.
- Predictive purchasing.
- Department/room/amenity cost analytics.
- Multi-property selector and cross-property workflows.

## 10. Remaining master roadmap in agreed order
1. Live-verify current pair; complete advanced Inventory foundation layers.
2. Listings & Rates / Revenue Management expansion.
3. Remaining Finance/Beds24 provider-neutral automation/reconciliation.
4. Comprehensive anti-theft/security hardening, red-team and cross-surface QA.
5. v1 feature freeze + The House production validation.
6. Product name/brand proposal → **owner approval required before final collateral**.
7. Polished commercial demo.
8. Final pricing including Beds24, Meta/WhatsApp, AI/API/infrastructure and support costs.
9. Legal commercial package: SaaS terms, DPA/privacy, SLA/support, partner/onboarding contracts as applicable.
10. Marketing/sales/onboarding materials + short professional video.
11. Guarded agent organization: Product/Executive, Developer, UX/UI, Guest Communications, Operations, Revenue, Finance/Admin, Marketing, Sales/Onboarding, Security/Privacy, Release/DevOps, independent Audit/Red-Team.
12. Thailand launch and scale to **100 paying properties before international expansion**.
13. International distribution.
14. Long-term: progressively become Taoedge’s own API/integration layer where commercially sensible.

## 11. Future voice — APPROVED / PENDING
- Phase 1: push-to-talk speech-to-text in Copilot, plus optional spoken responses.
- Phase 2: optional live conversational voice.
- Same tenant/role/action permissions, proposal/confirmation, canonical Tasks and audit as typed chat.
- Voice can never bypass confirmation for consequential actions.

## 12. Product North Star / commercial objective
One governed, multi-tenant, provider-neutral hospitality operating platform. The House remains the proving environment. Taoedge should reduce operational fragmentation, progressively automate safe work through one canonical core, reach 100 paying Thai properties, then expand internationally.

## 13. Agent/Copilot architecture
Human, mobile, web, guest messaging, Copilot and future autonomous agents must all use the same domain actions/task state. v5.11.83 adds Inventory as a governed domain available to Copilot while deliberately retaining human approval over procurement.

## 14. Explicit preserve / do-not-lose list
- Mature Dashboard/Concierge logic.
- Guest-language source text + exact send text.
- Staff-language review controls.
- Independent message review/action execution.
- Canonical Tasks and WhatsApp lifecycle.
- Lost-key/security codes.
- Passport/TM30 privacy separation.
- Finance permission/reconciliation boundaries.
- Server-side licensing/tenant/role/security.
- Listings/Direct Stay conflict protections.
- Full Channel Manager-off gate.
- Real names, 7/14 calendar, Light default, Back/swipe navigation.
- Physical Inventory vs OTA Inventory distinction.
- Cumulative handoffs: DONE never silently disappears; PENDING remains until completed or user explicitly removes it.

## 15. GitHub — Backend Summary
`Release v5.11.83 — multilingual staff review and physical Inventory/Assets/Procurement foundation`

## 16. GitHub — Backend Description
`Add property-configurable staff working language and an original-preserving translation layer for Unified Inbox guest messages and AI drafts, including guarded translation of staff-language edits back into the guest language before approval. Introduce the first canonical physical-hotel Inventory/Assets/Procurement foundation with property-scoped items, consumable/reusable/asset classes, hotel category templates, storage locations, min/reorder/par/max levels, low/out-of-stock signals, stock movements, suppliers, guarded purchase-order lifecycle and receiving, serialized asset records with warranty/service dates, role permissions and audit. Extend Operations Copilot with role-filtered inventory awareness, daily low-stock attention and property-wide Inventory restock tasks without inventing room/booking context. Preserve mature Dashboard/Concierge routing, canonical Tasks, AI review/operational-action separation, Finance/registration/lost-key protections, provider credential isolation, Listings/Revenue safeguards and the full Channel Manager-off boundary. Backend regression suite: 388/388 passed.`

## 17. GitHub — Owner App Summary
`Release Taoedge Owner App v0.1.27 — multilingual Inbox review and Inventory & Assets workspace`

## 18. GitHub — Owner App Description
`Add operator-language review to Unified Inbox while keeping guest communication in the guest’s language: preserve every original guest message, provide Translate to [staff language] / hide translation controls, show AI draft send text in the guest language with a separate staff-language review translation, and allow staff-language edits to be synchronized back into the guest-language draft before final approval. Add the first Inventory & Assets workspace with stock overview, hotel starter catalogue, locations, min/reorder/par/max alerts, stock receive/use actions, suppliers, draft purchase orders, approve/order/receive lifecycle controls, asset register and next-service tracking. Add delegated Inventory permissions and Copilot property-scope Inventory task presentation. Pair with backend v5.11.83 while preserving canonical Operations Tasks, signed Copilot confirmation, mature Dashboard/Concierge logic, Finance/registration/security protections, OTA safeguards and Channel Manager-off boundaries.`
