# Development Handoff v5.11.21

## Authoritative checkpoint

v5.11.21 is complete as a narrow production functional correction over v5.11.20. Preserve the v5.11.20 release artifact and do not reconstruct or redesign completed work.

This release changes only:

1. Bangkok-calendar validation for cleaning time preferences.
2. Robust natural fishing and snorkeling structured-booking intent.
3. Guest-friendly lost-key Concierge copy.

There are no visual changes. The separate v5.11.22 visual-polish milestone is deferred until v5.11.21 is deployed, the short changed-only smoke test passes and a new scope is explicitly supplied.

## Implemented behavior

### Cleaning

- The cleaning workflow retains a validated `YYYY-MM-DD` requested date where supplied.
- Clock-only input uses today in `Asia/Bangkok` unless the workflow already carries an explicit date.
- A current-day clock time at or before the current Bangkok minute is rejected without delivery.
- Clock times before 10:30, at or after 19:30, or on Monday are rejected with corrected operating-day guidance.
- Sunday after closing points to Tuesday; future-date preferences are evaluated on their actual day.
- `now` and `ASAP` preserve the immediate-request behavior from v5.11.20.
- Invalid input remains in cleaning collection and never enters notes or payloads. One valid correction creates one alert with the accepted preference and no duplicate after an ordinary follow-up.

### Fishing and snorkeling

- Server and browser protected-operation classifiers share robust grammar for natural want/need/plan, would-like, wanna, contracted would-like, noun-trip and take-me/us requests.
- Natural direct requests enter the category-specific structured flow immediately and preserve supplied date context.
- Recommendation/information questions remain non-actionable and offer the existing **Book with Us** action, which enters the same structured flow.
- Existing field validation, transient contact handling, Fah-plus-owner routing, unconfirmed-booking wording and exactly-once delivery boundaries are unchanged.

### Lost key

- The deterministic protected policy, active-stay authorization and dedicated delivery route are unchanged.
- Successful verified office-hours copy is:

  > Thank you. I’ve notified The House team about your lost key. Someone from the team will assist you as soon as possible.

- Unverified, after-hours and delivery-failure responses give natural next-step guidance without describing internal verification state, alert/webhook mechanics, key-box-code exposure or notification-before-code sequencing.
- Codes remain excluded from Concierge history, alerts, WhatsApp payloads, logs and diagnostics. The 500 THB acceptance, accepted protected team delivery, current session/stay/room checks and rotation lock remain fail closed.

## Regression status

- Complete suite: 129 tests passed, 0 failed.
- The three new regression groups cover cleaning calendar/time boundaries and correction delivery, natural fishing/snorkeling forms plus information/action separation, and hospitality copy with forbidden technical-term checks.
- Source and extracted archive must both pass the same 129-test suite before deployment.

## Production handoff

- Deploy the ready-to-push v5.11.21 ZIP to the existing Worker.
- Keep all six active production template mappings, languages, secrets, recipients, webhook settings, emergency routing, `SPARE_KEY_CODES`, passport rules and Airbnb synchronization unchanged.
- Keep `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.
- Never map `house_service_alert_actions_v1`; the intended future button-bearing service template remains `house_service_alert_actions_v2`.
- Run only the three-item smoke test in `RELEASE_NOTES_v5.11.21.md`, report the result, and stop.

## Suggested commit

Title:

`Release v5.11.21 functional corrections`

Description:

`Validate cleaning preferences against Bangkok calendar time, recognize natural fishing/snorkeling booking intent, replace technical lost-key copy, and add focused regression coverage without changing visuals or production configuration.`
