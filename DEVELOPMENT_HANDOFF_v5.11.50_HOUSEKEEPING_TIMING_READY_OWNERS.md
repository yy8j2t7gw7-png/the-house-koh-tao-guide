# THE HOUSE – KOH TAO
## Development Handoff — v5.11.50 Housekeeping Timing & Ready Owner Notification

### Authoritative baseline

Built directly on deployed v5.11.49.

### Owner requirement

Fix the production case where a guest requested room cleaning for 4:00 PM and then also mentioned a small bathroom-faucet leak. The maintenance message must not absorb or erase the housekeeping time, and housekeeping must not arrive early because a later maintenance message mentions cleaning. Keep normal turnover messages to Su, but notify owners when Su marks a room ready.

### Exact behavior

1. A completed cleaning request keeps its structured preferred time available for the next related message.
2. If a later maintenance message references that cleaning, the maintenance request is still classified as maintenance, not a new cleaning request.
3. The maintenance alert begins with the linked housekeeping timing so the time cannot be truncated out of the operational summary.
4. Cleaning alerts state the preferred/requested time and explicitly say not to attend earlier unless the guest agrees.
5. Turnover housekeeping alerts continue to route to Su.
6. `Received` only acknowledges the task.
7. `Room ready` marks the linked turnover ready and sends one owner status notification per configured owner through `house_alert_status_v1`, labelled `Room ready`, with Su as the actor.
8. No new Meta template is required.

### Files changed

- `src/concierge-api.js`
- `src/whatsapp-alerts.js`
- `tests/concierge.test.mjs`
- release metadata files
- `RELEASE_NOTES_v5.11.50.md`
- `DEVELOPMENT_HANDOFF_v5.11.50_HOUSEKEEPING_TIMING_READY_OWNERS.md`
- `CHANGELOG.md`

### Deliberately preserved

No Finance, registration, stay-write, Airbnb sync, lost-key, luggage, booking, emergency, passport/TM30, housekeeping status transition, recipient configuration, cron, secret or Google Apps Script behavior is changed beyond the exact items above.

### Validation

- Full automated suite: **273 passed / 0 failed**.
- Existing status template is reused; no Meta approval dependency is introduced.
