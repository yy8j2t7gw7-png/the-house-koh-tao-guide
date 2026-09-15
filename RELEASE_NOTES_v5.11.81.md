# RELEASE NOTES — Backend v5.11.81
## Unified Operational Tasks & Copilot Reliability

### Purpose
Make an operational task a persistent Taoedge record instead of only an alert side effect, and make the Copilot's most important daily-priority question reliable without depending on a model call.

### What changed
- Added a canonical `operational_tasks` store for room- and booking-linked work.
- Copilot-created room tasks now persist in the shared task store as well as using the existing protected WhatsApp alert route.
- Booking-created operational tasks now also persist in the shared task store while preserving the existing booking activity timeline.
- Reviewed Unified Messaging operational actions now create the same canonical task record.
- WhatsApp `RECEIVED` / `RESOLVE` alert actions update both booking activity and the canonical task status.
- Mobile Operations payload exposes the unified task list.
- Added guarded task-status endpoint for `received` / `resolved` transitions; existing backend permissions remain authoritative.
- Added due-time parsing for simple `today/tomorrow + time` instructions so tasks can surface overdue/due-today state.
- `What needs my attention today?` is now answered deterministically from current property data (rooms, housekeeping, maintenance, tasks, registrations, permitted Inbox state) before any generative AI call.
- Copilot live context now includes open/overdue/due-today tasks.
- Backend API contract advanced to `5.11.81`.

### Task-linking rule
- A global Copilot instruction that names only a room creates a **room task**. It is not silently attached to whichever booking happens to occupy that room.
- A booking task is linked only when a booking is explicitly identified or the user deliberately enters Copilot from booking context and the booking is validated server-side.
- Unknown rooms/bookings fail closed and require clarification.

### Preserved safety boundaries
- Mature Dashboard/Concierge routing remains authoritative.
- No task is created before explicit Copilot confirmation.
- Provider credentials remain server-side.
- `copilot.use` does not grant action authority; task execution still requires the appropriate operational permission.
- Full Beds24 Channel Manager remains separately gated/off.
- Physical hotel Inventory / Assets / Procurement is still a pending module and is not confused with OTA availability inventory.

### Validation
- Full backend regression suite: **382 / 382 passed**.
- New Copilot tests include persistent room tasks, deterministic daily attention, unknown-room rejection and signed-proposal tamper protection.
- Source syntax checks passed for changed backend files.
