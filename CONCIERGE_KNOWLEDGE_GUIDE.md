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
- `rescueCall`, `medicalNationalCall`, `hospitalCall` and `hospitalMap`
- `pharmacyMap`, `atmMap`, `supermarketMap` and `laundryMap`

## Routing rules

- Routine stay requests are handled by the concierge first and handed to Su only when a person must act.
- House-arranged bookings hand off to the booking contact.
- Urgent property problems use the separate property-emergency role.
- Accidents and urgent medical situations offer Koh Tao Rescue first and medical emergency number 1669 second.
- Explore recommendations may use preserved approved records for concierge reasoning, but live Explore navigation and page links remain disabled while `EXPLORE_ENABLED=false`.

## Room awareness

The concierge reads the room from a room-specific URL such as `/room/5` and remembers it on that device. If the room is unknown, the guest can select it in the concierge.

Room selection is useful context but is not secure proof of current occupancy. Never use room selection alone to reveal a key-box code or other protected information.

Protected passport entry and spare-key access use the separate deterministic verified-stay API. The permanent room URL alone is not proof. The guest must enter the Airbnb confirmation code that matches the synchronized listing, room and stay dates. The model never receives that code or the verified-session cookie.

## Sensitive information

Never store key-box codes, guest identity data, private access tokens, passwords, API credentials or messaging credentials in the knowledge JSON, public files, Git history or release ZIP.

Follow `SECURE_AFTER_HOURS_ACCESS.md` for spare-key access.

Do not place telephone numbers or WhatsApp destinations inside learned answers. Contact actions are generated from protected, deterministic routing configuration.

Passport and TM30 questions may explain the approved purpose and guide the guest to the permanent Room page. Thai-only groups need no passport. A foreign or mixed group must declare the complete number of non-Thai adults and children staying overnight, then create one private single-use form for every declared person—not only the booking guest. Never add a WhatsApp request route, accept passport content inside chat or open an unauthenticated public upload. Follow `PASSPORT_DATA_OPERATIONS.md`.

## Validation

Before release:

1. Parse the JSON.
2. Test common guest phrasings against the intended answer.
3. Confirm that unsupported questions use the safe fallback.
4. Confirm room details are included in stay-support handoffs.
5. Confirm Su, Fah, property-emergency and emergency-service routes remain separate.
6. Test the owner-review action and confirm an approved answer is immediately available.
7. Confirm a negative rating reaches the learning queue and no raw guest identifier is stored.
