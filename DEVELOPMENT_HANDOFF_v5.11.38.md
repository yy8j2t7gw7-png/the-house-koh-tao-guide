# Development Handoff v5.11.38

## Authoritative baseline

v5.11.38 is built directly from the deployed **v5.11.37** source after real-device production testing on 29 Aug 2026.

v5.11.37 was already deployed and its functional fixes were being smoke-tested when the owner found one additional guest-facing wording problem: the persistent human-contact response said **“You can contact Su directly”**. The owner requires guest communication to refer to **The House team / our team**, not by the staff member's personal name.

## Production issue

During the normal service window a verified Room 6 guest reached the persistent human-handoff path. The response correctly exposed **Contact Us** and **Call Us**, but said:

> Of course. You can contact Su directly using the options below.

The actions themselves were correct. The issue was the guest-facing personal-name wording.

The owner also reconfirmed that routine direct contact must be available **only during office/service hours**.

## Correction

`src/concierge-api.js` now uses:

> Of course. You can contact The House team directly using the options below.

No contact route, phone number, recipient, or handoff target changed.

The existing service-hours gate remains authoritative:

- Tuesday–Sunday 10:30–19:30 Bangkok time: persistent/strong human-contact requests may expose routine `houseWhatsapp` and `houseCall` actions.
- Monday: routine human contact is unavailable.
- Outside 10:30–19:30 on operating days: routine human contact is unavailable.
- Emergency and protected lost-key behavior remain independent.

## Regression coverage

Existing persistent-contact assertions were updated so guest-facing answers must say **The House team** and must not contain the standalone name **Su**.

The direct-contact regression now explicitly covers:

- open-hours strong human and housekeeper requests;
- Monday closure;
- Saturday 20:00 Bangkok closure after the 19:30 cutoff;
- fire → cancel → housekeeper-contact topic switch using the generalized team wording.

The complete source suite passes **196 tests, 0 failures**.

## Files changed

Implementation/runtime:

- `src/concierge-api.js`
- `tests/concierge.test.mjs`
- `package.json`
- `package-lock.json`
- `public/ai-concierge-config.js`
- `public/i18n.js`
- `public/data/concierge-knowledge.json`
- `public/data/activities.json`
- `public/module-registry.js`

Documentation:

- `README.md`
- `CHANGELOG.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`
- `RELEASE_NOTES_v5.11.38.md`
- `DEVELOPMENT_HANDOFF_v5.11.38.md`

## Meta template checkpoint

Do not activate or remap the newer human-friendly Meta templates in this release. Preserve the currently active production template configuration until all five replacements are Active and separately authorized.

## Security / operational invariants

Preserve all v5.11.37 behavior and security boundaries, including:

- authorized Wi-Fi-password delivery;
- no weakening of contact-number sanitization;
- lost-key fee consent, notification gate, code isolation and rotation lock;
- emergency Rescue/1669/property support behavior;
- current WhatsApp recipients, routes, secrets, webhook signature validation and quick-action lifecycle;
- booking/luggage contact privacy;
- passport retention and stay verification;
- Airbnb sync and Admin behavior;
- `EXPLORE_ENABLED=false`;
- Room 11 mobile crop and stable mobile Concierge UI.

## Deployment / smoke test

1. `npm ci`
2. `npm test` → expect **196 passed, 0 failed**.
3. `npx wrangler deploy --dry-run`.
4. Deploy.
5. Confirm `/api/concierge/status` reports release `5.11.38`.
6. During service hours: **I urgently need to talk to a human** → **The House team** wording + Contact Us / Call Us, never Su.
7. After 19:30 or Monday: same request → no routine House contact actions.
8. Spot-check the v5.11.37 Wi-Fi, fire-topic-switch, stained-sheet and French Kiss Divers regressions.
9. Do not switch pending Meta replacement template names.

## GitHub Desktop

Summary:

`Release v5.11.38 generalize in-hours House contact wording`

Description:

`Replace the guest-facing personal staff name in persistent human-contact handoffs with “The House team” while preserving the existing Tuesday–Sunday 10:30–19:30 Bangkok service-hours gate, Monday closure, Contact Us / Call Us routes, emergency and lost-key behavior, all v5.11.37 routing and Wi-Fi fixes, and the currently active Meta template configuration. Add explicit open-hours, Monday and same-day after-hours regression coverage.`

Stop after v5.11.38. Do not automatically begin another release.
