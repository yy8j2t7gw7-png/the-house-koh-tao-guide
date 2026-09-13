# Development Handoff — v5.11.64 Booking Activity

## Objective

Turn Calendar from a passive occupancy grid into an operational booking entry point without copying Smoobu's UI. The Taoedge workflow links an internal booking timeline to protected staff WhatsApp actions.

## Data model

`reservation_activity` stores:

- `note` vs `task`
- reservation ID
- task category / note body
- safe assignee key + display label
- protected alert link
- `open` / `received` / `resolved` state
- WhatsApp attempted/accepted counts
- creator label and hashed actor identity
- received/resolved timestamps

The task state is durable even after short-retention WhatsApp alert records are later cleaned up.

## Assignment model

The mobile app never receives WhatsApp numbers. It sees server-generated assignment options based on the configured protected groups: housekeeping/support, reservations, owners, combined support/owner routes and urgent response. Member labels may be shown to make responsibility clear.

## WhatsApp actions

Booking tasks use the existing service quick-action template path. With the already approved v5.11.45 staff-action configuration enabled, button payloads are the established protected commands:

- `HOUSE_ALERT|RECEIVED|<alert_id>`
- `HOUSE_ALERT|RESOLVE|<alert_id>`

No new Meta template is required for this release.

## Client pair

Use with **Taoedge Owner App v0.1.5**.
