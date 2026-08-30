# THE HOUSE – KOH TAO
## Development Handoff v5.11.40

## Baseline

v5.11.40 was a narrow correction built directly from pushed/deployed v5.11.39. It addressed one remaining production human-contact routing phrase.

## Production finding resolved

Exact Room 6 production phrase during service hours:

`I need to talk to a human you can not help me`

v5.11.39 could fall through to generic support wording. v5.11.40 treats an explicit human request plus a clear cannot-help/dissatisfaction reason as persistent human-contact intent before model/knowledge routing.

During Tuesday–Sunday 10:30–19:30 Bangkok service hours, the guest receives **The House team** routine contact actions **Contact Us / Call Us**. Monday and after-hours routine contact remain suppressed. No private staff name is exposed and no operational alert is created merely from the contact request.

## Validation

The v5.11.40 package passed the complete local suite before packaging.

## Preserved boundaries

Preserve all v5.11.39 cleaning/state fixes, Wi-Fi numeric password handling, snorkeling routing, French Kiss Divers preference, fire/current-turn isolation, lost-key security, recipient mappings, Meta webhook/security behavior, passport/Airbnb configuration, `EXPLORE_ENABLED=false`, and the currently active Meta template configuration. The later mobile conversation/emergency-call/gesture findings belong to v5.11.41, not v5.11.40.
