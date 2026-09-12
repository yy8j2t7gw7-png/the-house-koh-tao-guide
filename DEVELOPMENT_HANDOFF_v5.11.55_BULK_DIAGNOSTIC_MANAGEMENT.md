# THE HOUSE – KOH TAO
## Development Handoff — v5.11.55 Bulk Diagnostic Management

### Authoritative baseline

Built directly on v5.11.54. This is a narrow Owner Admin usability release.

### Exact scope

1. Allow one, several or all visible WhatsApp delivery diagnostics to be selected.
2. Add bulk removal from the operational view.
3. Keep individual diagnostic cleanup available.
4. Preserve delivery history, parent alerts and every unrelated production workflow.

### Admin UI

The WhatsApp delivery diagnostics block now contains:

- a checkbox on every diagnostic card;
- **Select all**;
- a selected-record counter;
- **Delete selected**;
- **Delete all**.

Both bulk buttons use the existing protected confirmation-dialog pattern. After a successful action the Admin overview reloads immediately and the selection resets.

### Server boundary

New protected route:

`POST /api/concierge/admin/diagnostics/bulk-dismiss`

Request body:

```json
{
  "ids": ["diagnostic_..."],
  "confirmation": "DISMISS SELECTED DIAGNOSTICS"
}
```

Rules:

- Owner Admin authentication remains mandatory through the existing admin boundary.
- 1–100 unique diagnostic IDs are accepted.
- IDs must match the existing diagnostic/legacy key format.
- Only failed/not-configured WhatsApp diagnostic records are eligible.
- Records are added to the existing `whatsapp_diagnostic_dismissals` visibility layer.
- Parent alert state and `concierge_alert_deliveries` are not modified.
- Successful bulk operations record `whatsapp_diagnostics_bulk_dismissed` in Admin audit history.

### Files changed

- `public/concierge-admin.html`
- `public/concierge-admin.js`
- `public/concierge-admin.css`
- `src/concierge-api.js`
- `src/concierge-store.js`
- `tests/concierge.test.mjs`
- release/version metadata files
- `CHANGELOG.md`
- `RELEASE_NOTES_v5.11.55.md`

### Validation

- Full automated regression suite: **281 passed / 0 failed**.
- Existing diagnostic cleanup tests remain green.
- New test covers selecting multiple diagnostics and removing only those selected while preserving parent alerts and failed delivery state.

### Post-deployment check

1. Open WhatsApp delivery diagnostics.
2. Select one card and use **Delete selected**; only that card should disappear.
3. Select two or more cards and repeat; only selected cards should disappear.
4. Use **Select all**, verify the count, then **Delete selected**.
5. Generate or retain several visible diagnostics and test **Delete all**.
6. Confirm parent Concierge alerts and their delivery counters/history are unchanged.
