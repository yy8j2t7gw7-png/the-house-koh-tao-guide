# The House – Koh Tao v5.11.67 — Unified Concierge Review & Central Operational Routing

## Summary

v5.11.67 fixes the live mobile/provider messaging failure where a linked guest housekeeping request could receive the unrelated reply `That contact number is not attached to an active request.`

Provider conversations now use the same main Concierge engine in a trusted active-reservation context. Draft generation is review-only: it may propose an operational task and recipients, but it does not notify staff or send the guest reply until the draft is approved.

## Unified Concierge behavior

- Provider/mobile Inbox uses the same `handleConciergeRequest` policy engine as the guest Concierge.
- Trusted linked reservations no longer feed the already-known guest phone number into the public contact-collection safeguard.
- Provider/mobile conversations use automatic language mode: the Concierge detects the language from the current guest message and answers naturally in that same language, without relying on the guest-guide language selector or a fixed language list.
- Free-text requests are interpreted semantically rather than from a finite request menu. This applies to hotel operations, booking questions, directions, local recommendations, services, unusual requests and other normal concierge questions.
- Operational classification is returned separately from the wording as `operational_category`, so housekeeping / maintenance / reservations / general support routing does not depend on English or German keywords.
- The exact live German toilet-paper / bathroom-cleaning case plus Chinese housekeeping and Russian local-recommendation cases are regression-tested.
- Draft generation returns an `operationProposal` only when the request actually requires a House action.

## Review-before-send workflow

New mobile endpoint:

```text
POST /api/mobile/v1/inbox/draft/review
```

Actions:

```text
reject
regenerate
approve
```

Approval executes the protected workflow:

1. validate the draft and active thread;
2. create the reservation-linked operational task when required;
3. dispatch the protected WhatsApp staff/owner alert;
4. only when required routing/delivery succeeds, send the guest reply through the booking provider / WhatsApp;
5. mark the draft approved and keep Received / Resolved status linked to the booking timeline.

Reject sends nothing and creates no task. Regenerate calls the same Concierge engine again.

## Central routing matrix

Operational routing is now owned server-side in `src/operations-routing.js`:

- housekeeping / maintenance / guest service / general request → **Su + owners**;
- reservations / bookings → **Fah + owners**;
- owner-only task → **owners**;
- routine turnover → **Su only**;
- room-ready completion → **owners**;
- protected lost-key and urgent-response routes retain their dedicated safety groups.

Booking-task APIs derive routing from the task category. The mobile client can no longer choose an arbitrary recipient group.

## Duplicate outbound-message protection

Beds24 conversation refresh and webhook ingestion now reconcile provider echoes against a recently recorded local outbound message before inserting another row. This prevents a sent owner reply from appearing twice when Beds24 later returns the same message with its provider message ID.

## Future automatic mode

`UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED` remains **false** in production. If it is enabled later, automatic replies use the same draft-approval execution path as manual approval, including operational routing, instead of a separate send-only path.

## Safety / staged flags preserved

```text
MOBILE_LICENSE_ENFORCEMENT_ENABLED=true
MOBILE_DEVICE_BINDING_ENABLED=true
BEDS24_FINANCE_SYNC_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

## Validation

Full backend automated suite: **340 passed / 0 failed**.
