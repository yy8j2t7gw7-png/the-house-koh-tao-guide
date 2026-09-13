# Development Handoff — v5.11.67 Unified Concierge Review & Routing

## Purpose

Make Owner App / provider messaging behave like the established House Concierge while keeping operational side effects behind explicit human approval.

## Root cause fixed

`generateUnifiedMessageReply()` already called the main Concierge, but Unified Messaging passed the stored guest phone into `privateReplyContact`. The public Concierge contact safeguard interpreted that phone as a newly supplied contact number and could replace the correct service answer with:

```text
That contact number is not attached to an active request...
```

The trusted-provider path now:

- validates the active reservation server-side;
- does not reuse the stored phone as a public contact-field turn;
- uses automatic language mode so the Concierge infers the language from the current guest message, including languages outside the guest-guide selector;
- interprets free-text requests semantically instead of relying on a finite language/request keyword list;
- calls the same Concierge engine with `reviewOnly: true`;
- returns a proposed operational action without sending an alert.

## Review contract

`POST /api/mobile/v1/inbox/draft/review`

Body examples:

```json
{ "threadId": "...", "draftId": "...", "action": "reject" }
```

```json
{ "threadId": "...", "draftId": "...", "action": "regenerate" }
```

```json
{ "threadId": "...", "draftId": "...", "action": "approve", "message": "Edited reply text" }
```

`approve` requires both AI-control and message-send permission. The backend remains authoritative for operation category, recipient group and alert delivery. AI responses expose a structured `operational_category` independent of the guest language, so routing is semantic rather than keyword-driven.

## Central routing

Use `src/operations-routing.js`. Do not reintroduce per-screen routing rules.

| Operational category | Protected recipient group |
| --- | --- |
| Housekeeping | support + owners |
| Maintenance | support + owners |
| Guest support / general | support + owners |
| Reservations | booking + owners |
| Owner | owners |
| Routine turnover | support only |
| Room ready | owners |

Production recipient interpretation remains:

- support = Su;
- booking = Fah;
- emergency/owners = owners.

## Booking tasks

`POST /api/mobile/v1/bookings/activity` now routes from `category`; client `assigneeKey` is not authoritative and is no longer used to choose recipients.

## Draft metadata

Messaging messages now safely persist JSON metadata. Drafts may include:

- review reason;
- language;
- Concierge intent/category/handoff;
- operation proposal;
- protected recipient labels (never phone numbers);
- review decision and operation result.

## Duplicate reconciliation

`reconcileMessagingProviderEcho()` attaches Beds24's provider message ID to a matching recent local outbound row instead of inserting a second visual message.

## Live validation after deployment

1. Open the existing German guest thread.
2. For the old bad draft, tap **Regenerate** so the new engine/routing metadata is used.
3. Confirm the new German response is context-appropriate and remains in German.
4. Confirm Review shows **Housekeeping** and **Su + owners**.
5. Send or stage one harmless request in another language (for example Thai, Chinese or Russian) and confirm the reply stays in that language and the operational category/routing follows the meaning, not the script or wording.
5. Tap Reject once on a test draft; confirm no guest message / operational task is created.
6. Generate another draft and use Edit; confirm the edited text is what is sent.
7. Approve a harmless housekeeping test; confirm Su + owners receive the alert and the booking timeline gets the task.
8. Press Received / Resolved and confirm the booking activity updates.
9. Send one manual provider reply and refresh; confirm it appears only once.
10. Create booking-section tasks for Housekeeping and Reservations; confirm recipient previews/routes are Su + owners and Fah + owners respectively.

Keep AI auto-send disabled until this review path has been live-verified.
