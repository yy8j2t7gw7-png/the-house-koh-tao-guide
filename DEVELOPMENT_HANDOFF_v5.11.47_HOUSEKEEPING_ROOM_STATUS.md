# THE HOUSE – KOH TAO
## Development Handoff — v5.11.47 Housekeeping Room Status & Stay Timing

### Authoritative baseline

This release is built directly from the deployed v5.11.46 reservation-aware stay-operations package.

The owner confirmed the v5.11.46 production checks before this work began.

### Exact scope

v5.11.47 is intentionally narrow. It adds only:

1. a live housekeeping room-status layer (`dirty`, `clean`, `ready`);
2. a simple WhatsApp housekeeping-task workflow for Su with **Received** and **Room ready** buttons;
3. reservation-aware early-check-in behavior using housekeeping readiness;
4. the updated late-checkout fee/time rule and last-minute-arrival check-in wording;
5. deterministic Concierge answers for door locking and office location.

No unrelated redesign is part of this release.

### Housekeeping state model

Rooms 1–11 have a server-side housekeeping status.

- `dirty` — the room still needs housekeeping/preparation.
- `clean` — owner/admin fallback state for a cleaned room that is not being asserted ready for guest entry.
- `ready` — staff/owner has confirmed that the room is ready for guest entry.

The normal staff workflow is WhatsApp rather than requiring Su to keep Owner Admin open. Owner Admin exposes manual `Dirty`, `Clean` and `Ready` controls as a fallback/owner override.

Housekeeping readiness is contextual, not a free-standing availability flag. Confirmed reservations remain authoritative. A current/overlapping Airbnb, direct/walk-in/manual stay or owner extension prevents a stale `ready` state from authorizing early entry.

### Automatic turnover task

The existing one-minute Worker cron also checks for due room turnovers.

- Standard checkout becomes due at 11:00 AM Bangkok time.
- If the departing reservation has an approved late checkout, the housekeeping task does not become due until that approved checkout time.
- A new task marks the room `dirty` and sends Su the housekeeping template.
- A same-day incoming reservation is attached to the task when present.
- Existing task identity/deduplication prevents duplicate routine tasks for the same departure.

### WhatsApp housekeeping actions

New Meta template contract:

`house_housekeeping_task_actions_v1`

The exact setup is documented in `META_HOUSEKEEPING_QUICK_ACTIONS_v5.11.47.md`.

Visible buttons:

1. **Received** — acknowledges the task but does not mark the room ready.
2. **Room ready** — marks the linked room/turnover ready and resolves the task.

The signed webhook, known-recipient authorization and protected opaque alert reference remain the security boundary. A stale task cannot mark a different turnover ready.

### Early check-in rules

The Concierge uses the verified incoming reservation and live stay data.

#### Room vacant + Ready

If there is no active/overlapping stay and the applicable room status is `ready`, the Concierge may confirm the requested early check-in time at any time, including before 12:00 PM.

#### Same-day guest / room not ready

If the room requires turnover, the guest gets simple wording explaining that the current/previous guest must leave first, housekeeping will prepare the room as quickly as possible, and the guest will be told whether early check-in becomes possible. The Concierge also says that the guest should not expect the room before 12:00 PM and that early check-in is not guaranteed.

If the guest provides a requested early-arrival time, Su receives a priority housekeeping task with simple wording that the room should be cleaned first if possible.

No early-check-in promise is made until the room is actually eligible and `ready`.

#### Occupancy authority

Availability checks include all confirmed reservation providers stored in the stay system and effective owner extensions. Airbnb is not treated as the only source of occupancy. Direct/walk-in/manual stays and extensions can therefore block an otherwise stale `ready` state.

### Late checkout rules

- Standard checkout remains 11:00 AM.
- Late checkout is available up to 2:00 PM at the latest.
- Fee: 200 THB.
- The Concierge asks for the requested checkout time.
- For a time after 11:00 AM and no later than 2:00 PM, the Concierge explains the 200 THB fee and requires explicit acceptance for that request.
- No late-checkout alert is sent before fee acceptance.
- Same-day or last-minute incoming bookings do not block an approved checkout up to 2:00 PM.
- After accepted operational-alert delivery and durable late-checkout recording, the guest is told the late checkout is confirmed.
- A requested time later than 2:00 PM is refused and the guest is told that 2:00 PM is the latest possible time.

The approved late-checkout time also postpones the automatic housekeeping turnover task so Su is not told to prepare the room at 11:00 AM when the departing guest is entitled to remain later.

### Incoming guest after a late checkout

The Concierge checks current reservation data dynamically. If an arriving guest asks what time they can check in and the previous same-room stay has an approved same-day late checkout, the answer is:

> Because the previous guest has a late checkout today, please plan to check in after 3:00 PM. Thank you for your understanding.

The incoming guest is not shown the previous guest's fee or private operational details.

### Door-lock Concierge rule

Natural variants such as `How do I lock my door?`, `How do I lock the door from outside?`, `How to lock the door?`, `Can I lock the door when I leave?`, and push-button/round-handle questions route to a short deterministic answer.

Approved answer:

> If your room has the round door handle, press the button on the inside handle, then close the door behind you. Please make sure you have your key with you first. To unlock it from inside, simply turn the handle.

This describes the actual property hardware: keyed exterior, inside push button, and the lock remains engaged after closing until released from inside by turning the handle or opened from outside with the key.

### Office-location Concierge rule

Natural office/reception/Taoedge location questions route to:

> Our office is downstairs at The House, next to Bar Thai Food. Look for the Taoedge Business Solutions office.

### Files changed

Runtime / UI:
- `src/concierge-api.js`
- `src/concierge-store.js`
- `src/housekeeping-operations.js` (new)
- `src/index.js`
- `src/stay-api.js`
- `src/whatsapp-alerts.js`
- `public/concierge-admin.html`
- `public/concierge-admin.js`
- `public/checkout.html`
- `public/modules/departure/checkout.html`
- `public/data/concierge-knowledge.json`

Release metadata:
- `package.json`
- `package-lock.json`
- `public/i18n.js`
- `public/ai-concierge-config.js`
- `public/data/activities.json`
- `public/module-registry.js`

Validation:
- `tests/concierge.test.mjs`

Documentation:
- `DEVELOPMENT_HANDOFF_v5.11.47_HOUSEKEEPING_ROOM_STATUS.md`
- `RELEASE_NOTES_v5.11.47.md`
- `META_HOUSEKEEPING_QUICK_ACTIONS_v5.11.47.md`
- `CHANGELOG.md`

### Meta dependency before production housekeeping use

Create and approve `house_housekeeping_task_actions_v1` in Meta before relying on WhatsApp housekeeping actions. It must be Utility / English (`en`) with exactly four BODY variables and exactly two quick-reply buttons: **Received**, **Room ready**.

No new WhatsApp recipient secret is required. The existing Su/support recipient configuration is reused.

### Behavior deliberately preserved

This release does **not** intentionally change:
- passport/Thai-ID/TM30 registration or privacy rules;
- current registration Meta templates;
- booking, luggage, maintenance, fresh-towel or ordinary cleaning-request behavior;
- lost-key fee/security/rotation/key-box protections;
- Bamboo Finance or The House Finance;
- Airbnb listing/room mapping, Room 7 Airbnb exclusion, five-minute host-mail sync, hourly calendar reconciliation or full audit;
- Google Apps Script deployment;
- routine support hours or emergency routing;
- existing WhatsApp recipients, credentials or webhook signature verification.

### Validation completed in the hosted environment

- Full automated regression suite: **268 passed / 0 failed**.
- Wrangler dry-run is not claimed in the hosted environment because Wrangler is not installed locally there.

### Local validation / deployment

In the real GitHub project folder on the Mac:

```bash
npm ci
npm test
npx wrangler deploy --dry-run
```

Before deploying, confirm the new Meta housekeeping template is Active/Approved exactly as documented.

### Required production checks

1. Standard checkout room becomes a housekeeping task at/after 11:00 AM and Su receives the new template once.
2. Press **Received** — task is acknowledged but room is not `ready`.
3. Press **Room ready** after checkout — room becomes `ready` and the alert resolves.
4. Approve a 2:00 PM late checkout after explicit 200 THB fee acceptance — no housekeeping turnover task should be due at 11:00 AM; it becomes due at/after 2:00 PM.
5. With a same-day departing guest and a future guest requesting early check-in, Su receives a priority housekeeping task; the guest receives no guarantee and is told not to expect the room before 12:00 PM.
6. Mark that task **Room ready** after the departing guest has left — the incoming verified guest can then receive a ready-based early-check-in answer where policy permits.
7. Create/retain a direct or manual walk-in/extension that occupies the room — stale `ready` status must not authorize early check-in.
8. With an approved same-day late checkout, incoming guest asks `What time can I check in?` — Concierge asks them to plan to check in after 3:00 PM.
9. Ask several door-lock variants — each returns the short push-button/key reminder without technical wording.
10. Ask `Where is the office?` / `Where is reception?` — Concierge gives the downstairs / Bar Thai Food / Taoedge Business Solutions location.

### Commercialization note

The room-status and turnover primitives are reservation/provider based rather than Airbnb-dialogue specific. A future multi-property product still requires an explicit tenant/property boundary rather than relying on this single-property state model.
