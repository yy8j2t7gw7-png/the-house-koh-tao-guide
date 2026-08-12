# Secure After-Hours Spare-Key Access

## Confirmed after-hours rule

- Time zone: Asia/Bangkok
- After-hours window: 19:30 until 10:30
- One spare-key box per room
- Key-box location: next to the relevant room door
- Lost-key replacement fee: 500 THB

This window defines after-hours handling only. It does not define reception, office or property operating hours.

## Security rule

Key-box codes must never be stored in public HTML, JavaScript, JSON, URLs, repository history or the release ZIP. Public room numbers are not proof that a person is the current guest.

The codes must remain in protected server-side secrets. Secure code delivery stays disabled until the guest-verification method and real key-box codes are configured.

The language model must never receive a key-box code, private stay-link token or signing secret in its prompt or tools. Verification and code delivery must remain a separate deterministic server operation.

## Required production flow

1. Every active stay receives a private, unguessable link tied to one room and a defined validity period.
2. The concierge determines the room from that private stay link. A manually selected room may provide context but cannot authorize code access.
3. A server-side check verifies the signed link, validity period and current access to that room.
4. The server confirms that Bangkok time is within the configured after-hours window.
5. The concierge states that a 500 THB lost-key replacement fee will be added and asks the guest to confirm the spare-key request.
6. Only after verification and confirmation, the server returns the code and the instruction that the box is next to the room door.
7. The access event is logged with room, time and outcome.
8. Every configured owner and Su receives an operational notification when an approved messaging channel is connected.

## Private stay-link contents

The signed link should identify only what the server needs:

- room number
- valid-from and valid-until times
- random stay reference or nonce
- server-verifiable signature

The link must not contain the key-box code, guest passport details, WhatsApp credentials or a readable master secret. Expired or altered links must be rejected.

## Multi-recipient owner notification

Notification recipients are a protected, configurable list containing selected owners and Su. Names and phone numbers must be stored server-side and must not appear in the public contact configuration, JavaScript, knowledge JSON, repository or release ZIP.

Each approved spare-key event sends one operational alert per configured recipient. The alert should contain:

- Room number
- Bangkok date and time
- Verified stay reference
- Confirmation that spare-key access was released
- Confirmation that the 500 THB lost-key fee applies
- Delivery or event status

The notification must never contain the key-box code or private stay-link token.

Delivery failures must be logged so one failed owner notification does not prevent the guest from receiving an already-authorized spare-key instruction.

## Current launch behavior

Until secure code delivery is enabled, the concierge identifies the room, explains the 500 THB fee and offers the correct human support handoff. It never reveals or guesses a key-box code.

Su and the owners currently use ordinary WhatsApp. Automatic server-sent WhatsApp notifications are therefore not enabled. Human handoff uses a prefilled WhatsApp message containing the room and request. A future WhatsApp Business Platform integration will send one approved operational message to every configured owner and Su.

## Separate 24/7 property-emergency route

Urgent property problems are not limited to the after-hours spare-key window. Major water leaks, flooding, burst pipes, dangerous electrical problems and serious property damage require a 24/7 on-call human route.

The application contains a separate `propertyEmergency` contact role. Until a dedicated person and number are confirmed, it remains disabled and temporarily falls back to the existing House support call and WhatsApp routes. The public interface must not claim that the temporary fallback is available 24/7.

Once confirmed, configure the dedicated on-call contact server-side and enable the role. The concierge should include the room number and the guest's description in every urgent message.

## Information still required before activation

- The final code for each installed key box, supplied only through protected server configuration
- A secure signing secret and private-link generation workflow
- Validity dates for each active stay link
- A protected event log or operations store
- WhatsApp Business Platform credentials if automatic staff alerts are required
- The protected list of owner and Su notification recipients
- The confirmed 24/7 on-call property-emergency person and telephone/WhatsApp number
