# THE HOUSE – KOH TAO
## Release Notes v5.11.47 — Housekeeping Room Status & Stay Timing

### Added

- Live room housekeeping status for Rooms 1–11: `dirty`, `clean`, `ready`.
- Owner Admin fallback controls for manually setting each room's housekeeping status.
- Reservation-aware housekeeping turnover tasks generated after the applicable checkout time.
- New housekeeping WhatsApp Utility template contract with **Received** and **Room ready** quick replies.
- Early-check-in housekeeping priority alerts to Su when a room is not yet ready.
- Deterministic Concierge guidance for room-door locking and office location.

### Early check-in

- Availability is calculated from the verified incoming reservation plus all confirmed same-room stays, including Airbnb, direct/walk-in/manual stays and owner extensions.
- A current or overlapping stay always overrides a stale housekeeping status.
- If the room is genuinely vacant and its applicable housekeeping state is `ready`, the Concierge may confirm early check-in at the requested time, including before 12:00 PM.
- If a same-day guest must leave first, the Concierge explains that housekeeping will prepare the room as soon as possible, that early check-in is not guaranteed, and that the guest should not expect it before 12:00 PM.
- An early-arrival request flags the housekeeping task for priority if possible. The guest is not promised an early check-in while the room is not ready.

### Late checkout

- Late checkout is available up to **2:00 PM** at the latest.
- A **200 THB service fee** applies.
- The Concierge must obtain explicit guest acceptance of that fee before sending the operational alert.
- A same-day or last-minute arrival does not block late checkout up to 2:00 PM.
- After accepted alert delivery and durable status recording, the Concierge confirms the approved late-checkout time.
- If an incoming guest asks about check-in while the previous stay has an approved same-day late checkout, the Concierge politely asks the incoming guest to plan to check in after **3:00 PM**.

### Concierge wording

- Door-lock questions explain simply that the guest should press the button on the inside round handle and close the door, with a clear reminder to take the key first; turning the inside handle unlocks it from inside.
- Office-location questions direct guests downstairs at The House, next to Bar Thai Food, to the Taoedge Business Solutions office.

### Preserved

No unrelated guest-service workflow, passport/TM30 rule, finance module, booking workflow, luggage workflow, maintenance workflow, lost-key security rule, Airbnb mapping, Google Apps Script sync behavior, recipient configuration, emergency routing or routine contact-hours policy is intentionally changed.

### Validation

Full automated regression suite: **268 passed / 0 failed** before final packaging. See `DEVELOPMENT_HANDOFF_v5.11.47_HOUSEKEEPING_ROOM_STATUS.md` and `META_HOUSEKEEPING_QUICK_ACTIONS_v5.11.47.md`.
