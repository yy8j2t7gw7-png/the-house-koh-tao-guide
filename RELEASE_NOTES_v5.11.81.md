# The House / Taoedge Backend v5.11.81 — Unified Tasks & Copilot Reliability

## Release purpose
Turn confirmed AI Support room work into persistent operational tasks instead of alert-only events, add a shared Operations task feed, and make the core “What needs my attention today?” question deterministic and reliable even when generative AI is unavailable.

## What changed
- Added persistent `operational_tasks` storage for room- and booking-linked work.
- New room tasks created by AI Support now persist with room, category, description, timing/due data, route, alert, delivery state, creator, status and audit context.
- Booking-created tasks continue to appear in Booking activity and are also represented in the shared operational task store.
- Existing historical booking tasks are backfilled into the shared task store on store initialization.
- WhatsApp `RECEIVED` / `RESOLVE` alert actions now update the shared operational task status as well as existing booking/maintenance state.
- Mobile Operations payload now includes the shared task list.
- Added protected task status endpoint for Received / Resolved actions.
- “What needs my attention today?” is generated from structured live operational data before the AI model is needed.
- AI Support understands ordinary phrasing such as “Room 6 needs the toilet fixed tomorrow 12 pm” even in deterministic fallback mode.
- Validated app-screen booking context can be used for contextual instructions such as “bring two extra towels”; explicit room/booking wording always wins.
- Confirmed Copilot responses now return the persistent task ID so clients can link directly to the created task.

## Safety boundaries preserved
- No action is executed from natural language without the existing signed proposal + explicit confirmation boundary.
- Server permissions remain authoritative.
- Unknown rooms/bookings are rejected rather than guessed.
- Existing Dashboard/Concierge routing, lost-key, passport, Finance, OTA, maintenance and housekeeping rules remain preserved.
- Full Beds24 Channel Manager remains separately gated/off unless explicitly enabled.
- Provider credentials remain server-side.

## Validation
- Full backend regression suite: **382 / 382 passed**.
- All backend JavaScript source syntax checks passed.

## Deployment order
Deploy backend v5.11.81 before Owner App v0.1.25.
