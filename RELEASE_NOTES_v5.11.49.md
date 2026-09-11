# THE HOUSE – KOH TAO
## Release Notes v5.11.49 — Calendar & Operations Dashboard

### Added

- New owner-facing **Calendar & Operations** section at the top of The House Admin.
- Today's arrival, departure, housekeeping-open and room-ready summary.
- Room-by-room operations cards for Rooms 1–11.
- Today's housekeeping-task overview including early-check-in priority context.
- 14-day room calendar with `IN`, `STAY`, `OUT` and same-day turnover visibility.
- Existing approved late-checkout time displayed in the operations view.

### Reservation coverage

The dashboard uses the existing confirmed stay system, so synchronized Airbnb, direct/walk-in, manual stays and effective owner extensions are shown from the same operational source of truth.

### Preserved

No guest workflow, registration rule, housekeeping state transition, WhatsApp action, early/late checkout policy, reservation write path, Finance module, lost-key control, Airbnb sync or Google Apps Script behavior is intentionally changed.

### Validation

Full automated suite: **271 passed / 0 failed**. JavaScript/MJS syntax: **43 files passed**; `Code.gs` passed syntax checking; JSON/JSONC parsing: **13 files passed**. See `DEVELOPMENT_HANDOFF_v5.11.49_CALENDAR_OPERATIONS_DASHBOARD.md` for scope and deployment order.
