# The House – Koh Tao v5.11.15

## Release summary

v5.11.15 aligns the Worker with all six active production Meta WhatsApp templates, enables safe staff status propagation and improves the desktop Concierge and verified lost-key guest experience.

## Included changes

- Exact body-only schema mapping for:
  - `house_service_alert_v3` — 5 parameters
  - `house_luggage_alert_v2` — 6 parameters
  - `house_booking_alert_v2` — 6 parameters
  - `house_urgent_alert_v2` — 5 parameters
  - `house_lost_key_alert_v3` — 3 parameters
  - `house_alert_status_v1` — 5 parameters
- Fail-closed validation for unknown templates, wrong purposes and wrong parameter counts, with the legacy v1 mappings retained only for deliberate rollback.
- Truthful Meta success detection requiring a successful response and provider message ID.
- Authorized `RECEIVED`, `ACK` and `RESOLVE` propagation to other assigned recipients only, with actor exclusion, duplicate suppression and no recursive alert or escalation.
- Taller desktop Concierge, compact in-conversation quick actions and unchanged mobile sheet behavior.
- Concise lost-key Concierge response, protected fee screen and success state with **Call Us** wording.
- Preserved verified stay, Bangkok after-hours, fee acceptance, protected notification, secret exclusion and key-box rotation controls.

## Deployment note

Production Cloudflare is already configured with the six active template names. Deploy the release without changing Meta template definitions, WABA settings, access tokens, recipient secrets, phone-number IDs or webhook secrets.

## Validation

- Complete automated suite: 98/98 passed in the source tree.
- Packaged-ZIP validation, syntax, JSON, repository, archive and credential-pattern results are recorded in the release handoff generated with the final artifact.
