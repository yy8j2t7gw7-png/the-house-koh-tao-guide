# DEVELOPMENT HANDOFF — Backend v5.11.81
## Unified Operational Tasks + Deterministic Daily Attention

## 1. Current release objective/version
- **Backend:** v5.11.81
- **Paired Owner App:** v0.1.25
- **Objective:** persist operational work as canonical Taoedge task records, synchronize them with existing alerts/booking activity, and make core Copilot daily-priority guidance reliable without weakening mature production rules.

## 2. Completed in this release — DONE
- Added canonical `operational_tasks` table and indexes.
- New room tasks and booking tasks persist in the canonical store.
- Manual booking tasks still create booking activity and now also create a central task record.
- Copilot room tasks create a central task record plus the existing protected operational alert.
- Reviewed Unified Messaging operational actions create the same central task record.
- Existing alert acknowledgement/resolution now mirrors to canonical task state and booking activity where relevant.
- Operations API includes canonical tasks with validated reservation/guest enrichment only when linked.
- Added guarded task status endpoint: open → received → resolved using existing alert lifecycle and `booking_activity.update` permission.
- Added task due-time parsing for simple today/tomorrow + clock instructions.
- Copilot live context includes open tasks and due/overdue counts.
- `What needs my attention today?` is deterministic from current Taoedge operational data before model invocation.
- Preserved proposal signing/expiry/tamper protection and explicit confirmation.
- Backend API contract advanced to `5.11.81`.

## 3. Canonical task-linking rule — PRESERVE
- Global Copilot + only a room mentioned → room task (`reservationId` blank).
- Explicit validated booking/guest request → booking-linked task.
- Context from the App is a hint, never authority; backend validates identifiers.
- Never attach a room repair to an occupant's booking merely because the room is occupied.
- One task record may surface in multiple relevant views; do not duplicate independent task engines.

## 4. Mature production logic preserved — DO NOT REPLACE
Authoritative modules remain: Concierge/policy, unified messaging, operational routing/WhatsApp alerts, housekeeping, maintenance, stay/lost-key, registration/passport/TM30, Finance/expenses/Beds24 Finance, Listings & Rates, Channel Manager safeguards, lifecycle messaging and mobile tenant/role/licensing. v5.11.81 extends the shared core; it does not simplify or replace these systems.

## 5. Security / privacy / authority
- Server remains authorization authority.
- `copilot.use` only grants Support access.
- Task execution still requires action permission.
- Proposal confirmation remains explicit and HMAC-bound/expiring.
- Provider tokens and protected codes remain server-only.
- Unknown room/booking fails closed.
- Task/audit records store structured operational state, not unnecessary raw sensitive chat data.

## 6. Deployment order
1. Deploy v5.11.81.
2. Verify `/api/mobile/v1/platform` reports backend `5.11.81`.
3. Push Owner App v0.1.25.
4. Test deterministic daily attention.
5. Create a controlled global Room 6 task via Copilot and confirm it appears in Operations → Tasks with no booking link.
6. Create a booking-linked task from Booking Details and confirm Booking activity + Operations task parity.
7. Use Received/Resolved in app and WhatsApp; verify both update the same task state.
8. Test existing guest/Concierge flows for regression.

## 7. Validation
- Full backend regression suite: **382/382 passed**.
- Dedicated Copilot persistent-task / daily-attention / unknown-room / tamper tests pass.
- Changed source syntax checks pass.
- No live deployment is claimed by this package.

## 8. Remaining roadmap
See `TAOEDGE_CUMULATIVE_HANDOFF_v5.11.81_v0.1.25.md` for the complete preserved roadmap. Immediate post-verification product steps remain Copilot refinement, then the agreed major product sequence: Listings & Rates / Revenue Management expansion; Physical Hotel Inventory + Assets + Procurement; remaining Finance automation/reconciliation; final security/commercial hardening; cross-surface QA; v1 freeze; brand gate; commercial/legal/marketing/agent rollout; 100 paying Thai properties before international expansion.

## 9. GitHub Summary
`Release v5.11.81 — canonical operational Tasks and deterministic Copilot daily attention`

## 10. GitHub Description
`Create the canonical Taoedge operational task store and connect Copilot room tasks, manual booking tasks and reviewed guest-messaging actions to the same persistent task/alert lifecycle. Expose tasks through the mobile Operations API, add guarded Received/Resolved status transitions, mirror WhatsApp alert acknowledgement/resolution into the same task state, parse simple due times, and make “What needs my attention today?” deterministic from live role-filtered Taoedge operations before any model call. Preserve mature Dashboard/Concierge routing, server-authoritative permissions, signed Copilot confirmation, Finance/registration/security boundaries, provider credential isolation and the full Channel Manager-off boundary.`
