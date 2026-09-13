# Development Handoff — v5.11.68 Operational Routing Hotfix

## Live issue reproduced

After v5.11.67 deployment:

- a Housekeeping task notified all four configured recipients, including Fah;
- a Reservations task notified the expected three recipients but the WhatsApp copy still said `Su, please handle this request.`

These were separate faults.

## Root cause 1 — legacy recipient overlap

The protected `WHATSAPP_ALERT_RECIPIENTS` secret can contain legacy group overlap. In particular, `support` may contain Su, Fah and owners even though modern operational semantics define support as Su.

`parseRecipients()` previously formed `support_with_owners` by unioning the raw `support` and `emergency` arrays. That preserved Fah if Fah was still present in raw `support`.

v5.11.68 normalizes roles by phone identity first:

```text
owners = emergency
booking specialists = booking - owners
support specialists = support - owners - booking specialists
```

The derived protected groups are then formed from those normalized roles.

This keeps current secrets backward-compatible while making the routing matrix authoritative server-side.

## Root cause 2 — wrong template family

`alertTemplateKind()` only classified `booking_request` as a booking alert. A manually created reservation task uses `booking_task_reservations`, so it fell through to the service template. The recipient group was correct, but the approved service template contains fixed Su wording.

v5.11.68 maps both:

```text
booking_request
booking_task_reservations
```

to the booking template family.

## Canonical routing after hotfix

| Operational category | Primary | Notify |
| --- | --- | --- |
| Housekeeping | Su | Su + owners |
| Maintenance | Su | Su + owners |
| Guest support / general | Su | Su + owners |
| Reservations / booking | Fah | Fah + owners |
| Routine turnover | Su | Su only |
| Room ready | owners | owners |
| Internal note | none | nobody |

## Client compatibility

No Taoedge Owner App code change is required. Keep **v0.1.8** installed. Booking Details already obtains protected task assignments from the backend, so recipient previews will reflect the corrected server-normalized membership after deployment/refresh.

## Live verification

After deploying v5.11.68:

1. Create one harmless Housekeeping task from a booking.
   - Expected: Su + Owner 1 + Owner 2 only.
   - Fah must receive nothing.
   - Template wording must address Su.
2. Create one harmless Reservations task.
   - Expected: Fah + Owner 1 + Owner 2 only.
   - Su must receive nothing.
   - Template wording must address Fah.
3. Create an internal note.
   - Expected: no WhatsApp delivery.
4. On the next real turnover, verify only Su receives the routine turnover message.
5. When the room becomes Ready, verify owners receive the Ready notification.

Do not use a real guest message merely to validate this hotfix.
