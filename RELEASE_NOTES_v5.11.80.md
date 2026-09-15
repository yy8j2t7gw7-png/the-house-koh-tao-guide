# RELEASE NOTES — Backend v5.11.80
## Operations Copilot Foundation & Canonical Operational Actions

### Release objective
Add the first production-grade Taoedge AI Support / Operations Copilot backend without replacing the mature Dashboard/Concierge logic. The Copilot explains current hotel workflows in plain language and can prepare room- or booking-linked operational tasks for explicit confirmation.

### Canonical operational action core
- Adds `src/operational-actions.js` as the shared backend path for booking task creation and Copilot-created room/booking tasks.
- Existing mobile booking-task creation now calls the same shared action function instead of maintaining its own routing/alert implementation.
- Existing routing in `operations-routing.js` / `whatsapp-alerts.js` remains authoritative.
- Booking-linked tasks remain stored in reservation activity and linked to the created operational alert.
- Room-only Copilot tasks use the protected operational-alert path without guessing a reservation.
- Urgent actions retain the existing urgent severity/escalation behavior.

### AI Support / Operations Copilot
- Adds protected `POST /api/mobile/v1/copilot/chat`.
- Adds independent `copilot.use` permission for Owner / Manager / Staff access; owner can disable it for individual managers or staff through delegated permission overrides.
- Copilot uses a versioned capability/workflow registry derived from current production behavior.
- Answers are instructed to use non-technical hotel language: what happened, what it means, and what to do next.
- Technical/API/release jargon is suppressed unless the user explicitly asks for diagnostics.
- Live context is role-filtered and includes permitted operational data such as arrivals/departures, room readiness, pending housekeeping, maintenance, registration and Inbox attention when the user can see Inbox.
- Staff guest-name context is restricted to first name.

### Safe task creation from chat
- Natural-language task requests may target a known booking or room.
- Copilot can only **propose** a task on the first request.
- Required information is validated before a proposal can be shown.
- Unknown rooms/bookings and missing task details cause clarification instead of guessing.
- The proposal shows task type, room, description, timing and routed recipients.
- Proposals are signed server-side, tenant/user bound and expire after 10 minutes.
- Any change to a signed proposal invalidates confirmation.
- Execution requires both `copilot.use` and the action-specific `booking_activity.create` permission.
- Only explicit confirmation creates the task/alert.
- Proposal and execution are separately audited as `copilot_task_proposed` and `copilot_task_created`.

### Workflow knowledge
Initial production-derived registry covers daily priorities, bookings/calendar, booking tasks, guest messaging/AI review, housekeeping, maintenance, guest services, emergencies, late checkout, early check-in, departure planning, lost key, luggage, registration/passports, Finance, Listings & Rates, Direct Stays, roles/security, notifications, Diagnostics, current hotel-stock module status, and Support Chat itself.

### Safety boundaries
- Dashboard/Concierge rules are preserved; this release does not replace their routing or policy engines.
- AI interpretation never directly authorizes an operational side effect.
- Server permissions, tenant scope, task routing and audit remain authoritative.
- Lost-key codes, provider credentials and sensitive identity data are excluded from Copilot disclosure.
- Full Beds24 Channel Manager remains off.
- Broad Listings & Rates writes remain gated.
- Hotel stock Inventory/Assets/Procurement is described as planned, not falsely exposed as a released production module.

### Backend contract
- API contract version: `5.11.80`.
- Pair with Taoedge Owner App `v0.1.23`.
