# THE HOUSE – KOH TAO
## Release Notes v5.11.50 — Housekeeping Timing & Ready Owner Notification

### Corrected

- Keeps an explicit guest-requested cleaning time attached to the cleaning request and makes the timing prominent in the operational alert.
- When a guest later reports a maintenance issue and refers to the existing cleaning, the maintenance alert stays separate and carries the already-requested cleaning time instead of turning it into an immediate cleaning instruction.
- Uses separate request labels for room cleaning and maintenance / room issues so mixed conversations cannot be mislabelled.

### Housekeeping WhatsApp behavior

- Normal turnover housekeeping messages continue to go to Su through the existing `house_housekeeping_task_actions_v1` template.
- **Received** remains an acknowledgement only and does not notify owners.
- **Room ready** marks the linked turnover ready and immediately notifies the configured owners using the already-approved `house_alert_status_v1` status template.
- No new Meta template is required.

### Preserved

No unrelated guest workflow, reservation logic, registration/TM30 behavior, Finance behavior, Airbnb sync, lost-key security, housekeeping state model, recipient configuration or Meta template mapping is intentionally changed.

### Validation

Full automated suite: **273 passed / 0 failed** before final package verification.
