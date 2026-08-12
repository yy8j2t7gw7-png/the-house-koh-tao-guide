# Concierge Knowledge Guide

The first production concierge uses approved question-and-answer records from `public/data/concierge-knowledge.json`. This keeps the initial service fast, predictable and usable without an external AI subscription or API key.

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
- Commissionable bookings hand off to Fah.
- Urgent property problems use the separate property-emergency role.
- Medical or personal emergencies use the verified emergency routes.
- Explore recommendations remain outside the live question engine until their answers are explicitly prepared and approved.

## Room awareness

The concierge reads the room from a room-specific URL such as `/room/5` and remembers it on that device. If the room is unknown, the guest can select it in the concierge.

Room selection is useful context but is not secure proof of current occupancy. Never use room selection alone to reveal a key-box code or other protected information.

## Sensitive information

Never store key-box codes, guest identity data, private access tokens, passwords, API credentials or messaging credentials in the knowledge JSON, public files, Git history or release ZIP.

Follow `SECURE_AFTER_HOURS_ACCESS.md` for spare-key access.

## Validation

Before release:

1. Parse the JSON.
2. Test common guest phrasings against the intended answer.
3. Confirm that unsupported questions use the safe fallback.
4. Confirm room details are included in stay-support handoffs.
5. Confirm Su, Fah, property-emergency and emergency-service routes remain separate.
