# Concierge Knowledge Guide

The concierge combines deterministic operational answers in `public/data/concierge-knowledge.json` with question-targeted records from the approved Activities, Restaurants, Cafés, Beaches, Bars and Shopping datasets. `src/project-knowledge.js` selects and compacts only relevant records before model reasoning; operator contact details are not included in that model context.

The production concierge uses approved question-and-answer records from `public/data/concierge-knowledge.json` plus a private owner-approved knowledge overlay. Deterministic matching keeps common and safety-critical answers predictable, while the optional server-side model handles natural multilingual wording and contextual follow-ups. The approved deterministic engine remains usable without an API key.

## Owner review workflow

Unknown questions and negative feedback are grouped in the private learning queue at `/concierge-admin`. Review the sanitized example questions, correct the proposed wording, assign the right category and handoff, then approve or reject the candidate.

Approval makes the correction active immediately through the private overlay; it does not rewrite repository files. Export approved additions regularly, verify them against authoritative project information and reconcile durable answers into `public/data/concierge-knowledge.json`. The model must never approve or publish its own proposed fact.

## Adding an approved answer

Add one object to the `intents` array:

```json
{
  "id": "stable_unique_id",
  "category": "room",
  "priority": 20,
  "triggers": [
    "the way a guest may ask the question",
    "another common wording"
  ],
  "answer": "The approved answer shown to the guest.",
  "actions": []
}
```

Use several natural trigger phrases. Keep answers short, factual and operational. Do not add facts that have not been approved by The House or supplied in authoritative project research.

## Available action types

Public page:

```json
{
  "label": "Departure Guide",
  "type": "link",
  "href": "/checkout.html"
}
```

Configured contact or map route:

```json
{
  "label": "Request Fresh Towels",
  "type": "route",
  "route": "houseWhatsapp",
  "message": "Hello, I am staying in {roomLabel}. Could I please have fresh towels?"
}
```

Supported placeholders:

- `{room}` — selected room number
- `{roomLabel}` — for example, `Room 5`
- `{question}` — the guest's original question

Supported route keys include:

- `houseWhatsapp` and `houseCall`
- `bookingWhatsapp` and `bookingCall`
- `propertyEmergencyWhatsapp` and `propertyEmergencyCall`
- `medicalNationalCall`, `hospitalCall` and `hospitalMap`
- `pharmacyMap`, `atmMap`, `supermarketMap` and `laundryMap`

## Routing rules

- Routine stay requests are handled by the concierge first and handed to Su only when a person must act.
- House-arranged bookings hand off to the booking contact.
- Urgent property problems use the separate property-emergency role.
- Medical or personal emergencies use the verified emergency routes.
- Explore recommendations remain outside the live question engine until their answers are explicitly prepared and approved.

## Room awareness

The concierge reads the room from a room-specific URL such as `/room/5` and remembers it on that device. If the room is unknown, the guest can select it in the concierge.

Room selection is useful context but is not secure proof of current occupancy. Never use room selection alone to reveal a key-box code or other protected information.

## Sensitive information

Never store key-box codes, guest identity data, private access tokens, passwords, API credentials or messaging credentials in the knowledge JSON, public files, Git history or release ZIP.

Follow `SECURE_AFTER_HOURS_ACCESS.md` for spare-key access.

Do not place telephone numbers or WhatsApp destinations inside learned answers. Contact actions are generated from protected, deterministic routing configuration.

Passport and TM30 questions may explain the approved purpose and offer a stay-support action to request a private link. Never add an action that accepts passport content inside chat, opens a public upload or asks the guest to send a passport image through WhatsApp. Follow `PASSPORT_DATA_OPERATIONS.md`.

## Validation

Before release:

1. Parse the JSON.
2. Test common guest phrasings against the intended answer.
3. Confirm that unsupported questions use the safe fallback.
4. Confirm room details are included in stay-support handoffs.
5. Confirm Su, Fah, property-emergency and emergency-service routes remain separate.
6. Test the owner-review action and confirm an approved answer is immediately available.
7. Confirm a negative rating reaches the learning queue and no raw guest identifier is stored.
