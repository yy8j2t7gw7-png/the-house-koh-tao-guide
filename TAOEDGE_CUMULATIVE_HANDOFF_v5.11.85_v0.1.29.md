# TAOEDGE CUMULATIVE HANDOFF — Backend v5.11.85 / Owner App v0.1.29
## Multilingual Voice Copilot + Hospitality Staff Management

## 1. Current objective/version
- **Backend:** v5.11.85
- **Owner App:** v0.1.29
- **Current objective:** extend Taoedge's single governed hospitality operating core with multilingual voice input/output and a first canonical Staff Management/Scheduling domain, while preserving every production rule and all v5.11.84 Inventory/Shopping/Copilot/hospitality-message work.

## 2. Current release — DONE
### Voice
- Push-to-talk microphone in Copilot.
- Authenticated server transcription with audio guardrails and exact preservation instructions for operational entities.
- Multilingual routing and replies: Thai, German, English plus broader supported languages.
- Deterministic fallback language recognition for Thai/German/Spanish/French/English.
- Voice uses the same typed Copilot route, permissions, live hotel context, signed proposals, confirmations and audit.
- First live voice conversation mode: listen → silence detection → transcribe → understand → answer aloud → re-arm.
- Consequential voice actions remain on-screen confirm-only.
- True low-latency full-duplex realtime interruption is **not claimed** in v0.1.29.

### Staff Management
- Property-aware staff operational profiles linked to existing secure platform users/memberships.
- Hospitality fields: employee code, job title, department, home property, employment type/status, operational phone, preferred language, dates.
- Operational onboarding checklist with account/permissions, orientation, SOPs, emergency procedures, role training, keys/equipment and first schedule.
- Staff & Schedule screen links authorized owners to the existing secure Team invitation flow for new-user onboarding.
- Protected offboarding: revoke membership/sessions, cancel future shifts, unassign active shopping lists, preserve history/audit.
- Property-aware weekly shifts with Draft / Published / Acknowledged / Completed / Cancelled lifecycle and server overlap protection.
- Publishing shift sends targeted staff push notification.
- Staff own-shift acknowledge + simple clock-in/out.
- Time-off request + manager review + staff/management notifications.
- Role split: staff own schedule, manager schedule/time-off authority, owner account/profile/offboarding authority.
- Operations Copilot gets live role-filtered schedule data and deterministic queries such as “Who is working tomorrow?”.

## 3. v5.11.84 / v0.1.28 — DONE/PRESERVED
### Inventory 2.0
- Catalogue is template-only; property explicitly enables stocked items.
- Setup-required rather than false out-of-stock state.
- Compact Stock / Shopping / POs / Assets workspace.
- Search/category/status/location controls.

### Local purchase / Shopping Lists
- Add to shopping list from each enabled inventory item.
- Existing vs new list, quantity/spec/notes, property and optional room/villa/unit, assigned staff.
- Multiple concurrent lists for different staff/properties.
- One combined assigned shopping task/alert.
- Bought/Partial/Unavailable/Substituted line states with actual quantities/costs.
- Receipt-required completion → linked Finance expense → idempotent Inventory movements.
- Local purchase permission separated from formal supplier purchasing.
- Formal PO requires a real active supplier.

### Guarded Copilot hotel control
- Signed explicit-confirmation Direct Stay create/cancel.
- Signed explicit-confirmation room/calendar block/unblock.
- Conflict/state revalidation before mutation.
- Audit-safe Direct Stay cancellation and owner-block metadata.
- OTA/provider-managed reservations and broad Channel Manager writes remain outside freeform Copilot authority.

### Hospitality guest auto-replies
- Trusted routine auto-replies wait at least five minutes from newest guest message.
- Pending reply is persisted and regenerated/rechecked against newest context at due time.
- New guest/manual message supersedes stale response.
- Customer-satisfaction and “five-star hotel concierge” quality gate.
- Operational/sensitive proposals never auto-send.

## 4. v5.11.83 / v0.1.27 — DONE/PRESERVED
- Property-configurable staff working language.
- Original guest message preserved with Translate/Show original.
- Guest-language AI draft + staff-language review translation.
- Staff-language edit can synchronize back into guest-language draft before approval.
- First physical Inventory/Assets/Procurement domain: items, locations, stock, movements, suppliers, POs, assets, min/reorder/par/max, low-stock and service-date tracking.

## 5. Earlier production capabilities — DONE/PRESERVED
- Personal Guest Page/AI Concierge with verified/private separation.
- 24/7 lost-key flow: active stay verification, 500 THB explicit acceptance, protected notifications/code/audit.
- Registration/passport/TM30 privacy-separated workflows.
- Housekeeping clean/dirty/ready, checkout/arrival planning, early check-in/late-checkout rules.
- Maintenance/emergency/luggage/activity/diving operational routing.
- Unified Inbox, WhatsApp guest communication, scheduled lifecycle messages and AI review safety.
- Canonical reservation model, booking details/activity and Direct Stay operations.
- Finance/expenses/Beds24 Finance historical backfill and idempotent reconciliation architecture.
- Integrations health/resilience.
- Revenue Engine V1, Insights/Analytics, Daily Operating Console.
- Listings & Rates controlled write bridge and provider safeguards.
- Multi-tenant mobile platform, roles/permissions, sessions, licensing, audit and commercial security foundation.
- Real guest names, 7/14 room-grid calendar, Light/Dark/System, Back/swipe navigation, `com.taoedge.platform` identity.
- Operations Copilot production workflow registry, deterministic daily attention, signed action proposals.
- Canonical Operations Tasks with correct room-vs-booking linking and WhatsApp RECEIVED/RESOLVE parity.

## 6. Permanent user-approved rules — DO NOT CHANGE
- Never lose mature Dashboard/Concierge business logic, routing, exceptions, wording rules, alerts or integrations.
- Shared backend/domain core is canonical; App, Dashboard, guest page, Copilot, voice and future agents are governed interfaces.
- Server is authority for tenant/property scope, roles, permissions, licensing, provider credentials and consequential state.
- Consequential AI/voice action always follows: proposal → explicit confirmation → backend re-check → canonical action → verification/routing → audit.
- Unknown/ambiguous targets require clarification; never guess.
- Provider-managed OTA reservations and full Channel Manager stay separately gated.
- Persistent floating Ask AI button remains visible by explicit user preference.
- Voice speaks/understands multiple languages but never gets broader authority than typed Copilot.
- Guest-facing AI uses the guest's language when understood; staff review language is property configurable.
- Inventory never assumes that a property stocks a template item.
- Formal PO always requires supplier; local staff buying uses Shopping Lists.
- Shopping-list line retains property and optional room/villa/unit ownership.
- Multiple Shopping Lists for multiple staff/properties remain supported.
- Receipt/expense/stock lineage must remain traceable.
- Trusted normal guest auto-replies wait at least five minutes and recheck context.
- Staff data remains operational/minimal by default; sensitive HR/payroll data is not mandatory.
- Offboarding revokes access but preserves audit/history.
- Cumulative handoffs: DONE stays visible, DEFERRED carries reason, PENDING remains until completed or explicitly removed.

## 7. Current architecture / safety boundaries
- Voice transcription is an authenticated mobile action and does not persist raw voice media into the canonical Taoedge operational data store.
- `preferredLanguage` affects reply localization, not permission or target resolution.
- Staff operational records are canonical database records; account identity/permissions remain existing platform user/membership records.
- `staff.manage` controls profile/offboarding authority; schedule/time-off permissions are separate.
- Shift conflict checks run server-side.
- Clock timestamps are operational only in this foundation, not statutory payroll compliance.
- Inventory/Finance/registration/security/provider secrets remain role-scoped and are not widened by Staff or Voice.

## 8. Validation
- Backend full regression suite: **406/406 passed**.
- Backend JS/MJS syntax: **65/65 passed**.
- Owner App static validation: **PASS — final package count in `VALIDATION_RESULTS_v0.1.29.md`**.
- Owner App TS/TSX standalone syntax: **64/64 passed**.
- No full dependency-aware native Expo build is claimed from packaging environment; physical iPhone audio/runtime validation is required.

## 9. Deployment order
1. Deploy backend **v5.11.85**.
2. Verify backend contract 5.11.85.
3. Push/run Owner App **v0.1.29**.
4. Clear Metro/update cache and confirm Diagnostics **0.1.29 / 5.11.85**.
5. Run live/manual acceptance below.

## 10. Live/manual acceptance checklist
### Voice
- Grant microphone permission on iPhone.
- Push-to-talk English: ask daily priorities; check transcript/answer.
- Push-to-talk Thai: ask a simple operational question; answer should return in Thai.
- Push-to-talk German: ask a simple schedule or hotel question; answer should return in German.
- Test a room/date/quantity phrase and confirm values are preserved.
- Start voice conversation; verify automatic silence stop, spoken answer and automatic next listening turn.
- Ask for a consequential Direct Stay/calendar operation through voice; verify exact proposal and **no execution without on-screen confirmation**.
- End voice conversation and verify microphone stops cleanly.

### Staff
- Owner: Staff & schedule → Invite new staff → secure Team invitation path.
- Configure a test staff profile as Onboarding; complete checklist.
- Create Draft shift, Publish, verify staff push notification.
- Staff account: view own schedule, acknowledge, Clock in/Clock out.
- Create overlapping shift for same employee/date and verify rejection.
- Staff submits time-off; manager approves/rejects; notifications/status update.
- Offboard only a test staff user; verify session access stops, future shifts cancel, active shopping list becomes safely unassigned, history remains.
- Multi-property account when available: verify home property/shift property scoping.

### Regression
- Inventory item activation, shopping lists, receipt→Finance→stock.
- Supplier-required formal PO.
- Inbox guest-language/staff-translation review.
- Five-minute guest auto-reply delay + stale-response superseding.
- Canonical Tasks and WhatsApp state.
- Direct Stay create/cancel; block/unblock.
- Lost-key/registration/housekeeping/maintenance/Finance/Revenue/Listings core flows.

## 11. Staff Management — PENDING next layers
- Copilot guarded staff actions: create/reassign/cancel shifts, approved leave action proposals.
- Recurring availability and reusable weekly rota templates / Copy week.
- Pre-shift reminders, late/no-clock-in exception alerts and manager staffing-gap view.
- Shift swap/request coverage workflow.
- Department staffing requirements tied to occupancy/events.
- Training/certification/expiry reminders where needed.
- Equipment/key issuance return checklist on offboarding.
- Optional document/contract integrations only after privacy/legal requirements are agreed.
- Payroll/timekeeping exports/integrations only after jurisdiction and compliance requirements are defined; do not turn simple clock timestamps into an unvalidated payroll system.

## 12. Voice — PENDING next layer
- True low-latency full-duplex realtime mode with interruption/barge-in.
- More robust noise handling/wake behavior and configurable spoken-response preferences.
- Optional staff-specific voice language defaults.
- Voice shortcuts from contextual Room/Booking/Inventory/Staff screens.
- All future voice capability continues to use same guarded canonical action core.

## 13. Advanced Inventory / Procurement — PENDING
- Cross-property Shopping Run container.
- One receipt spanning several properties/lists with line/cost allocation and single original receipt.
- Recurring/escalating missing-receipt reminders.
- QR/barcode scanning/labels.
- Batch/expiry/FEFO.
- Stocktakes/cycle counts.
- Automatic housekeeping consumption recipes.
- Occupancy/lead-time forecasting.
- Supplier price history/intelligence.
- PO invoice→Finance reconciliation.
- Numeric approval limits/multi-stage approvals.
- Rich transfers/location balances.
- Predictive purchasing.
- Cost per occupied room/department/amenity.
- Complete portfolio/multi-property Finance routing.

## 14. Remaining master roadmap — AGREED ORDER
1. Live verify v5.11.85 / v0.1.29; fix genuine production defects only.
2. Complete Staff/Voice high-value operational layers (guarded schedule actions, reminders/rota UX; realtime voice if stable/valuable).
3. Complete highest-value advanced Inventory/Procurement/Finance linkage layers.
4. Listings & Rates / Revenue Management expansion.
5. Remaining provider-neutral Finance/Beds24 automation/reconciliation.
6. Comprehensive security/anti-theft hardening, independent audit/red-team and cross-surface QA.
7. v1 feature freeze + The House production validation.
8. Product naming/brand approval gate — explicit user approval before final market collateral.
9. Commercial demo; pricing incl. Beds24/Meta/AI/infrastructure; legal SaaS/DPA/SLA/support pack; marketing/sales/onboarding/video.
10. Guarded agent organization across Product, Developer, UX/UI, Guest Comms, Operations, Revenue, Finance, Marketing, Sales/Onboarding, Security/Privacy, Release/DevOps and independent Audit/Red-Team.
11. Reach **100 paying properties in Thailand before international expansion**.
12. International distribution; progressively become Taoedge's own API/integration layer where commercially sensible.

## 15. Product North Star
Taoedge is a provider-neutral, multi-tenant hospitality operating system: one governed operational core with mobile, web, guest interfaces, AI, voice and future agents. It should cover the practical business around rooms, guests, operations, inventory/procurement, staff, finance, revenue and integrations without fragmenting data/action systems. The House is the proving environment; multi-villa/multi-property operation is an architectural requirement, not a later rewrite.

## 16. Agent/Copilot contribution
v5.11.85 makes natural-language operation more accessible by adding voice and brings staff scheduling into live Copilot context. The architecture still deliberately separates **understanding** from **authority**. Future autonomous agents and voice actions must reuse the same staff/inventory/task/reservation/finance domain records rather than creating parallel workflows.

## 17. Explicit DO NOT LOSE
- Mature Dashboard/Concierge rules/routing/exceptions.
- Lost-key 24/7 protected workflow and codes.
- Passport/registration/TM30 privacy separation.
- Guest original language + property staff-language translation/review.
- Independent reply approval vs operational-action approval.
- Five-minute delayed/rechecked five-star guest-reply rule.
- Canonical Tasks/alerts and WhatsApp state.
- Explicit property-selected Inventory; no assumed catalogue.
- Supplier-required formal PO.
- Multi-item Shopping Lists, staff/property/unit attribution and receipt→Finance→stock lineage.
- Persistent Ask AI launcher.
- Direct Stay/calendar conflict/provider protections.
- Staff permissions, history-preserving offboarding and property-scoped schedule.
- Voice uses same guarded Copilot authority and supports Thai/German/English/other languages.
- Full Channel Manager-off boundary.
- Real guest names, 7/14 calendar, Light default, Back/swipe UX.
- Thailand-first 100-paying-property goal.

## 18. GitHub — Backend Summary
`Release v5.11.85 — multilingual Taoedge Voice and hospitality Staff Management foundation`

## 19. GitHub — Backend Description
`Add authenticated multilingual Taoedge Voice on top of the existing Operations Copilot, with guarded audio transcription, original-language preservation, Thai/German/English and broader language routing, localized spoken-response support, and the same signed proposal/permission/confirmation/audit contract as typed chat. Introduce a canonical hospitality Staff Management foundation with property-aware staff profiles, operational employment status, onboarding checklists, protected offboarding with session revocation and work reassignment, draft/published/acknowledged/completed shifts, overlap protection, staff acknowledgement and simple clock-in/out timestamps, time-off requests/review, targeted notifications and role-filtered Copilot schedule awareness. Preserve Inventory 2.0/Shopping Lists, five-minute five-star guest replies, multilingual Inbox review, canonical Tasks, mature Dashboard/Concierge logic, Finance/registration/lost-key safeguards, provider isolation and the full Channel Manager-off boundary. Backend regression suite: 406/406 passed.`

## 20. GitHub — Owner App Summary
`Release Taoedge Owner App v0.1.29 — multilingual Voice Copilot and hospitality Staff & Schedule`

## 21. GitHub — Owner App Description
`Add Taoedge Voice to the existing guarded Operations Copilot with push-to-talk recording, authenticated multilingual transcription, Thai/German/English and broader language handling, spoken replies, and a turn-based live conversation mode that automatically listens, detects silence, answers aloud and re-arms while keeping all consequential hotel actions behind the existing on-screen confirmation contract. Add More → Staff & schedule with property-aware staff profiles, secure-invite handoff, onboarding checklist, protected offboarding, weekly manager/staff schedules, draft/publish/acknowledge/complete/cancel shift states, simple clock-in/out, time-off requests and management review. Preserve the persistent Ask AI launcher, Inventory 2.0/Shopping Lists, multilingual Inbox review, canonical Tasks, five-minute five-star guest replies, Direct Stay/calendar safeguards and all server-authoritative permissions. Pair with backend v5.11.85.`
