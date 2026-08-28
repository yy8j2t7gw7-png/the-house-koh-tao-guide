# Release Notes v5.11.21

## Outcome

v5.11.21 is a small production functional correction over v5.11.20. It fixes cleaning-time validation, natural fishing/snorkeling booking entry and technical lost-key copy. It contains no visual redesign and no production configuration change.

## Corrections

### Cleaning preferences

- A clock-only preference is evaluated on the current Bangkok date unless an explicit requested date is already present.
- A same-day clock time must be later than the current Bangkok minute and within the Tuesday–Sunday 10:30–19:29 operating window.
- Monday and closed-hour preferences stay pending and receive the correct next operating-day guidance.
- An explicit future date remains attached across turns and is evaluated on that future calendar day.
- `now` and `ASAP` keep the existing immediate-request behavior.
- An invalid preference creates no alert. One subsequent valid correction creates exactly one alert containing only the accepted preference.

Root cause: the v5.11.20 cleaning path formatted a preferred time but did not attach a requested calendar day or compare a clock preference with the current Bangkok date, minute and operating day before submission.

### Natural fishing and snorkeling intent

- Direct requests using want, need, plan, would-like, wanna, contraction and take-me/us forms enter protected category-specific collection immediately.
- Examples include **I wanna go fishing**, **I want a fishing trip**, **I’d like to book fishing** and **Take us snorkeling**.
- Existing generic booking language and every **Book with Us** action remain supported.
- Genuine information questions such as **What fishing trips do you offer?** remain informational and create no alert; their **Book with Us** action enters the same structured workflow.

Root cause: the shared v5.11.20 direct-activity expression required the word `to` after every lead verb, so **wanna** incorrectly matched only the unnatural form **wanna to**. The same grammar was mirrored in browser protected-operation detection.

### Lost-key wording

- Guest-facing copy no longer exposes internal alert, delivery, verification-state, code-exposure or notification-before-code terminology.
- A successful verified office-hours request says exactly:

  > Thank you. I’ve notified The House team about your lost key. Someone from the team will assist you as soon as possible.

- Failure, unverified and after-hours responses use natural guest guidance.
- Authorization, recipient routing, the 500 THB fee, protected team-delivery requirement, code isolation and rotation lock are unchanged.

Root cause: the protected lost-key behavior was correct, but Concierge responses described internal security and delivery sequencing rather than the assistance the guest would receive.

## Scope held unchanged

- No visual, layout or navigation changes.
- No changes to the six active Meta templates, Cloudflare mappings, secrets, recipients, webhook, emergency routing, passport handling, Airbnb synchronization, spare-key values or rotation rules.
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remains the production state.
- `house_service_alert_actions_v1` remains invalid; the only intended future service-action template is `house_service_alert_actions_v2`.

## Validation

- Complete Node regression suite: 129 passed, 0 failed.
- Added coverage for same-day past-time correction, exact `17:00`, closed hours, Monday, Sunday evening, explicit tomorrow context, natural fishing/snorkeling forms, informational separation, production-style deterministic behavior and lost-key copy leak prevention.
- Release validation also covers JavaScript syntax, Apps Script syntax, JSON parsing, version consistency, credential/configuration audits, archive exclusions, CRC integrity and an independent extracted-ZIP test run.

## Production deployment and short smoke test

Deploy the v5.11.21 bundle with existing production configuration unchanged and `WHATSAPP_STAFF_ACTIONS_ENABLED=false`, then test only:

1. At 15:33 Bangkok time: **my room is dirty** → **2pm** → **4pm**. Confirm no alert for 2:00 PM and exactly one service alert containing only 4:00 PM.
2. Confirm **I wanna go fishing** starts structured fishing collection immediately; confirm an informational fishing answer’s **Book with Us** action enters that same state.
3. During office hours with a verified stay, confirm **I lost my key** creates one dedicated lost-key alert and returns the exact hospitality response above with no technical implementation wording.

Stop after reporting this smoke result. v5.11.22 visual work requires a new explicit scope.
