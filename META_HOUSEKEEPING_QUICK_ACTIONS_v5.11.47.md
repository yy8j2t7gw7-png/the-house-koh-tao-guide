# Meta Housekeeping Quick Actions — v5.11.47

## New template required

Create and approve this Meta WhatsApp Utility template before relying on the v5.11.47 housekeeping WhatsApp workflow.

**Template name**

`house_housekeeping_task_actions_v1`

**Category**

Utility

**Language**

English (`en`)

**Header / footer**

None

## BODY — exactly 4 variables

Use this simple wording:

```text
Hi Su,

Please prepare Room {{1}}.

{{2}}
{{3}}

{{4}}

Please confirm below.
```

The Worker supplies:

1. `{{1}}` — room number only, for example `6`
2. `{{2}}` — checkout information, for example `Checkout 2026-09-08 at 11:00 AM` or `Room is currently vacant`
3. `{{3}}` — next-arrival information, for example `Next check-in: 2026-09-08 from 2:00 PM`, `Early arrival requested: 11:00 AM`, or `No next arrival currently recorded`
4. `{{4}}` — one simple instruction:
   - normal turnover: `Please prepare this room for the next guest.`
   - early-check-in priority: `Early check-in requested. Please clean this room first if possible.`

## Quick reply buttons — exactly 2

1. `Received`
2. `Room ready`

Runtime button payloads are protected and linked to the exact internal housekeeping alert:

- `HOUSE_ALERT|RECEIVED|<alert_id>`
- `HOUSE_ALERT|READY|<alert_id>`

The alert ID is opaque. No guest identity, confirmation code, passport information, key-box code or room-access secret is placed in the button payload.

## Button behavior

### Received

- acknowledges the exact housekeeping task;
- keeps the room in its current not-ready state;
- does not tell the guest that the room is ready.

### Room ready

- marks the exact housekeeping task complete;
- sets the room to `ready` for the matching turnover/check-in context;
- resolves the housekeeping alert;
- allows the Concierge to confirm early check-in only when reservation occupancy also permits it.

A stale task cannot make a room ready for a different stay. A current Airbnb, direct/walk-in, manual stay or owner extension remains authoritative over housekeeping status.

## Routing

The housekeeping template routes to the existing `support` recipient group (Su). No new recipient secret or phone-number configuration is required.

The production mapping in `wrangler.jsonc` is:

```text
WHATSAPP_HOUSEKEEPING_ACTION_TEMPLATE_NAME=house_housekeeping_task_actions_v1
```

The existing `WHATSAPP_STAFF_ACTIONS_ENABLED=true` setting is reused.

## Deployment check

Before production use, confirm in Meta that `house_housekeeping_task_actions_v1` is Active/Approved with:

- Utility category;
- English (`en`);
- exactly 4 BODY variables;
- exactly two quick-reply buttons in this order: **Received**, **Room ready**.

If Meta does not accept the template delivery, the system does not treat that WhatsApp delivery as successful. Owner Admin remains the fallback place to set a room `Dirty`, `Clean` or `Ready` manually.
