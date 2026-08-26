# The House – Koh Tao v5.11.12

## Production fix

This patch closes the repeat-luggage submission bypass found after one valid luggage request had already completed in the same Concierge session.

- Every new actionable luggage request starts with clean field state.
- The final server-side alert-creation handler now rejects a luggage submission unless that request contains arrival/departure, requested time, bag count and a usable international WhatsApp or phone contact.
- Protected WhatsApp luggage templates use the validated structured fields; a new alert cannot be sent with a required field shown as `Not provided`.
- Telephone and WhatsApp values are immediately replaced by `[contact supplied privately]` in the visible guest chat for every request type. The raw value remains transient and may enter only the protected staff-delivery payload.
- Critical-property precedence, Su-plus-owner luggage routing and lost-key safeguards are unchanged.

## Verification

The complete automated suite passes 74 of 74 tests. New coverage reproduces a valid first luggage request followed by a vague second request, verifies no second alert or WhatsApp delivery occurs, tests every missing field directly against the final alert boundary, then completes the second request with fresh data.

## Short live regression

1. Complete one valid luggage request and confirm one team alert.
2. Send `I wanna store my luggage` again in the same Concierge session.
3. Confirm the Concierge asks for arrival/departure, time, bag count and international contact, and no new WhatsApp alert is sent.
4. Supply all four new values. Confirm exactly one new alert is sent, all four fields are populated and the guest contact appears in chat only as `[contact supplied privately]`.
