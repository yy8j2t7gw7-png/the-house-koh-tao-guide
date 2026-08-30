# THE HOUSE – KOH TAO
## Development Handoff v5.11.40

## Baseline

v5.11.40 is a narrow correction built directly from deployed v5.11.39. Do not reconstruct from an older release.

## Real production regression

Verified Room 6 guest, Sunday at approximately 12:57 Bangkok time:

`I need to talk to a human you can not help me`

v5.11.39 produced generic support wording instead of the deterministic in-hours routine human-contact path. The phrase did not match the anchored generic/strong recognizers because of the trailing cannot-help reason and therefore fell through to ordinary knowledge/model routing.

## Correction

`src/concierge-api.js` now recognizes an explicit human/person/staff/housekeeper request followed by a clear dissatisfaction/cannot-help reason such as:

- `you can not help me`;
- `you cannot help me`;
- `you are not helping me`;
- `this is not helping`.

This is classified as persistent human-contact intent before model/knowledge routing.

During open service hours the existing deterministic response remains:

`Of course. You can contact The House team directly using the options below.`

with existing `Contact Us` and `Call Us` routes. The guest never sees a private staff name.

Outside service hours / Monday, routine call and WhatsApp routes remain suppressed and Emergency help remains available. Emergency/property routes remain independent.

## Regression coverage

Added the exact production phrase at Sunday 12:57 Bangkok and asserts:

- `intentId === generic_human_contact`;
- `source === human-contact-policy`;
- The House team wording;
- no `Su` in guest copy;
- both routine actions during open hours;
- zero operational alerts.

The same phrase is also tested Sunday 20:00 Bangkok and asserts no routine call/WhatsApp actions.

## Validation

Complete suite: **204 passed, 0 failed** before packaging.

## Do not change

Preserve all v5.11.39 cleaning/state fixes, Wi-Fi numeric password handling, snorkeling routing, French Kiss Divers preference, fire/current-turn isolation, lost-key security, recipient mappings, Meta webhook/security behavior, passport/Airbnb configuration, `EXPLORE_ENABLED=false`, and the currently active Meta template configuration. Do not activate the pending replacement Meta templates as part of this release.
