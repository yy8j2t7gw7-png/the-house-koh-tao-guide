# Development Handoff v5.11.37

## Authoritative checkpoint

v5.11.37 is built directly from the **deployed v5.11.36** source after the owner completed further real production testing on 29 Aug 2026.

The supplied v5.11.36 source began with **191 passing tests and 0 failures**. Five production failures corrected here were outside that coverage, including a Wi-Fi-password redaction bug found before v5.11.37 was pushed.

Production invariants retained:

- `EXPLORE_ENABLED=false`;
- v5.11.36 deterministic snorkeling correction;
- mobile-only Room 11 `object-position: 72% 100%`;
- stable mobile **💬 AI Concierge** launcher/panel;
- single verified House Google Maps destination;
- currently active five Meta staff-action mappings and `WHATSAPP_STAFF_ACTIONS_ENABLED=true`;
- existing recipients, secrets, signed webhook behavior, BODY schemas/order, passport/Airbnb configuration, `SPARE_KEY_CODES`, Admin diagnostics and production bindings.

The newer human-friendly Meta replacement templates are still under review and are **not activated in v5.11.37**.

## 1. Lower-friction direct Su contact

### Production failure

During normal service hours a verified Room 6 guest could get the intended AI-first answer for **I need to talk to a human**, but stronger follow-ups such as:

- **I urgently need to talk to a human**;
- **I need to personally talk to them**;
- **please call for me**;
- **can I call the housekeeper**;

could miss the deterministic persistent-human route and fall through to generic model wording about a support handoff.

### Root cause

`PERSISTENT_HUMAN_CONTACT_REQUEST` was intentionally narrow and primarily covered **still** / **really** forms. Explicit Su/housekeeper contact wording and stronger persistence language were not consistently classified before model history.

### Correction

`src/concierge-api.js` now adds targeted current-turn recognition for:

- urgent/really persistent human requests;
- **personally talk/speak** forms;
- explicit **housekeeper** / **Su** call/contact/talk requests;
- **please let me call the housekeeper**;
- **please call for me**.

The first ordinary generic request remains AI-first. A clearly persistent/strong or explicit staff-contact request during Tuesday–Sunday 10:30–19:30 Bangkok time returns the existing routine House handoff actions and simple wording:

**Of course. You can contact Su directly using the options below.**

The existing `houseWhatsapp` and `houseCall` routes are reused; no private number is exposed in server output. Monday and closed-hours routine-contact suppression is unchanged, and emergency/lost-key routes remain independent.

## 2. Cancelled fire context no longer contaminates a new contact topic

### Production failure

Sequence:

1. **I have fire in my room** → correct fire safety result;
2. guest cancels the House urgent action → UI confirms no team alert was sent;
3. **can I call the housekeeper** → Concierge incorrectly recreated a serious-danger / urgent House alert prompt.

### Root cause

The server did not persist a fire workflow after cancellation. The later unrecognized contact phrase instead fell through to transcript-aware model handling, where recent fire history could dominate the exact new turn.

### Correction

The direct staff/human classifier now wins before model history can reinterpret the turn. In addition, v5.11.37 adds a narrow recent-fire continuation check for genuinely dependent follow-ups such as:

- **there is more smoke now**;
- **still smoke**;
- **the fire is getting worse**.

Those remain fire-safety-first even when the follow-up itself does not restate the whole incident. This is targeted history use, not a blanket history wipe.

Required production distinction now holds:

- fire → cancel → **can I call the housekeeper** → routine contact path, no urgent confirmation, no alert;
- fire → **there is more smoke now** → fire safety guidance and deliberate urgent confirmation remain available.

## 3. Natural stained-bed-sheet wording enters the real cleaning workflow

### Production failure

Sequence:

1. **there is a stain on my bed sheet**;
2. Concierge asked what time the guest preferred, but this came from generic model handling rather than the deterministic cleaning collector;
3. guest replied **now**;
4. no authoritative cleaning workflow existed, so the Concierge sent the guest toward a generic support handoff instead of completing the request.

### Root cause

The existing dirty-room pattern recognized **stained sheets**, **the sheets are stained** and similar adjective forms, but not natural noun forms such as **a stain on my bed sheet**.

### Correction

A targeted stained-linen classifier now covers at minimum:

- **there is a stain on my bed sheet**;
- **there is a stain on the sheet**;
- **my bed sheet has a stain**;
- **the sheets have stains**;
- **my bedding is stained**.

These use the existing `cleaning` workflow. When only the time is missing, the Concierge asks for that one field. **now** / **ASAP** completes the same workflow, sends exactly one normal `support_with_owners` service alert to Su plus both owners, and returns the existing truthful timing wording. No 30-minute promise and no generic support handoff are introduced.

A later unrelated information question routes normally and cannot resubmit the completed cleaning request.

## 4. French Kiss Divers preference works before an established diving collector

### Production failure

Sequence:

1. **I wanna learn diving** → generic RAID/Roctopus recommendation;
2. **I wanna go with French kiss** → generic RAID/Roctopus recommendation repeated;
3. **can I go with French Kiss Divers?** → explicit provider preference still not acknowledged.

The older provider-preference handling was still present but was reliably reached only after a structured diving collector was already active.

### Root cause

- **learn diving** did not satisfy the prior actionable-diving patterns;
- a standalone full provider name ending in **Divers** was not enough for `bookingKindFromText()` to infer diving;
- short **French kiss** was only meaningful once the booking kind was already known.

### Correction

v5.11.37:

- treats **I/we want/wanna/would like to learn diving** as structured diving intent;
- recognizes a plausible full dive-provider name (`... Divers`, `... Dive`, `... Dive Center/Centre/School`) as diving context when paired with booking/preference language;
- canonicalizes **French Kiss Divers** and preserves the existing short **French Kiss** preference when a diving workflow is active;
- keeps the established acknowledgement that The House normally recommends Roctopus/RAID but can record the guest's preferred provider and have the booking team check whether it can be arranged;
- never states that French Kiss Divers is available, confirmed or booked merely because it was requested;
- creates no booking alert until all normal required booking fields and the protected international contact are complete.


## 5. Wi-Fi password no longer disappears into numeric-contact redaction

### Production failure

Before v5.11.37 was pushed, a verified Room 6 guest asked:

- **What is the Wi-Fi password?**

The Concierge answered with the correct network name but displayed the password as **[number removed]**.

### Root cause

The approved Wi-Fi fact is intentionally numeric. When a Wi-Fi question did not stay on the deterministic approved-knowledge path, the model result was validated through the shared privacy sanitizer. That sanitizer correctly removes telephone-like numeric strings from model/log content, but the nine-digit Wi-Fi password also matched that generic number pattern.

The privacy sanitizer itself remains necessary and is not weakened.

### Correction

Wi-Fi-password questions are now treated as authoritative current-turn room-information requests after guest access has already been granted. The answer is taken directly from the approved `wifi` knowledge intent before model history/model output can reinterpret or sanitize it.

This means:

- the approved Wi-Fi password remains visible to an authorized guest;
- stale transcript history cannot force the Wi-Fi answer through the model path;
- a Wi-Fi-password question temporarily detours from a pending cleaning/booking/luggage workflow and returns that workflow unchanged for later resumption;
- interaction/log sanitization remains unchanged, so the password can still be redacted from stored diagnostic excerpts even though it is shown correctly to the authorized guest.

The public/unverified access gate remains unchanged and still prevents private Wi-Fi information from being exposed before room access is granted.

## 6. Files changed

Implementation:

- `src/concierge-api.js`
- `tests/concierge.test.mjs`

Release/version metadata:

- `package.json`
- `package-lock.json`
- `public/ai-concierge-config.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/i18n.js`
- `public/module-registry.js`

Documentation:

- `README.md`
- `CHANGELOG.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`
- `WHATSAPP_ALERT_OPERATIONS.md`
- `DEVELOPMENT_HANDOFF_v5.11.37.md`
- `RELEASE_NOTES_v5.11.37.md`

No page layout, Room 11 crop, approved local-guide content, live Meta template mapping, recipient route, secret, webhook or storage schema is changed.

## 7. Regression coverage

Five new production regression contracts expand the suite from 191 to **196 tests**.

### Human/Su contact

Covers open-hours direct handling for:

- **I urgently need to talk to a human**;
- **I need to personally talk to them**;
- **I really need to speak to someone**;
- **please call for me**;
- **please let me call the housekeeper**;
- **can I call the housekeeper**.

Also verifies Monday suppresses `houseWhatsapp` / `houseCall` while Emergency Help remains available.

### Fire topic switch

Exact multi-turn regression:

1. **I have fire in my room**;
2. cancellation/no alert;
3. **can I call the housekeeper** → routine Su contact, no urgent confirmation and no alert;
4. **there is more smoke now** with recent fire history → fire safety remains active.

### Stained linen

Covers the natural linen variants above plus the production sequence:

- **there is a stain on my bed sheet** → collecting cleaning workflow with only `preferredTime` missing;
- **now** → one submitted workflow, one service alert, three intended protected deliveries in the test configuration;
- unrelated snorkeling question afterward → normal information answer and no duplicate service alert.

### Diving provider

Covers:

- **I wanna learn diving**;
- then **I wanna go with French kiss**;
- then/contextual **can I go with French Kiss Divers?**;
- standalone **can I go with French Kiss Divers?**.

Assertions include canonical `preferredProvider === "French Kiss Divers"`, no availability promise and no premature alert.


### Wi-Fi password

Covers the exact production symptom with an OpenAI key configured and stale conversational history present:

- **What is the Wi-Fi password?** → approved `wifi` intent, correct numeric password visible, zero model calls and no alert;
- **Where is the Wi-Fi password?** during a pending cleaning workflow → approved Wi-Fi answer while the cleaning workflow remains collecting and resumable;
- neither response contains **[number removed]** or the private-contact placeholder.

Validation result:

- focused five-regression run: **5 passed, 0 failed**;
- complete source suite: **196 passed, 0 failed**.

## 8. Meta template checkpoint — intentionally unchanged

Current production continues using the already active mappings from v5.11.35/v5.11.36.

The owner has separately created these newer human-friendly replacements in Meta:

- `house_service_alert_actions_v3`;
- `house_booking_alert_actions_v2`;
- `house_luggage_alert_actions_v2`;
- `house_urgent_alert_actions_v2`;
- `house_lost_key_alert_actions_v2`.

Their visible buttons are **Received** and **Resolved**, while the internal commands must remain `RECEIVED` and `RESOLVE`.

Do not switch the Worker to these names until **all five** are Active and the owner explicitly authorizes the activation release. Their new BODY orders are recorded in the production handoff and `WHATSAPP_ALERT_OPERATIONS.md` context; v5.11.37 does not alter the live BODY schemas/order.

## 9. Airbnb after-booking work remains paused

The owner also plans one Airbnb scheduled quick reply per active Room 1–6 and 8–11, sending the permanent `/room/<room>` page soon after booking together with Airbnb's dynamic confirmation-code token. Room 7 remains inactive.

That external Airbnb setup is not part of v5.11.37 and remains incomplete. No confirmation code is hard-coded into this release.

## 10. Security and operational regression

The release must continue to preserve:

- no public/stored API keys, Meta secrets, admin tokens, hashing secrets, private recipient contacts, real Airbnb confirmation codes, passport data or key-box codes;
- protected active-stay lost-key authorization, current-request 500 THB fee acceptance, accepted-notification gate, single-use display and rotation lock;
- no key-box code in WhatsApp;
- signed Meta webhook authorization, known-recipient checks, actor exclusion, idempotency and escalation stop;
- booking/luggage contact privacy and no false delivery success;
- cleaning/supply/maintenance/urgent alert lifecycles;
- passport retention, stay verification, Airbnb sync and owner/Admin behavior.

No migration is required.

## 11. Ready-to-push verification

Before production deployment:

1. `npm ci`
2. `npm test` — require **196 passed, 0 failed**
3. `npx wrangler deploy --dry-run`
4. confirm `/api/concierge/status` reports release `5.11.37`, `staffQuickActionsEnabled: true` and the **currently active** five action-template mappings, not the pending replacements
5. deploy only after the dry run is clean

## 12. Post-deployment smoke test

Run in this order in a verified Room session during normal service hours:

1. **I need to talk to a human** → first AI-first question remains.
2. **I urgently need to talk to a human** → direct Su routine contact options.
3. **can I call the housekeeper** → direct Su routine contact options; no alert.
4. Fire test: **I have fire in my room** → correct safety guidance; cancel the House alert; then **can I call the housekeeper** → no fire/urgent contamination.
5. From recent fire context: **there is more smoke now** → fire-safety guidance still wins.
6. **there is a stain on my bed sheet** → asks only preferred time; reply **now** → exactly one service alert to Su plus owners and no generic handoff.
7. **I wanna learn diving** → structured diving collector; then **I wanna go with French kiss** → French Kiss Divers preference acknowledged and retained without availability promise.
8. Standalone **can I go with French Kiss Divers?** → named preference acknowledged and structured diving context established.
9. **What is the Wi-Fi password?** → the approved numeric password is shown exactly; no **[number removed]** placeholder. Repeat after another Concierge exchange to confirm history cannot change it.
10. Re-run **which beach is good for snorkeling**, **which beach is best for snorkeling**, **is there good snorkeling** → v5.11.36 approved deterministic answers remain intact.
11. Spot-check one current Meta quick-action lifecycle plus verified lost-key behavior; both must remain unchanged.

## 13. GitHub Desktop

### Summary

```text
Release v5.11.37 fix Concierge routing and Wi-Fi answer
```

### Description

```text
Fix five production Concierge regressions found after v5.11.36. Make persistent and explicit housekeeper/Su contact requests reach the existing in-hours routine contact actions without requiring an exact phrase; prevent cancelled fire history from contaminating a clearly unrelated next contact turn while preserving genuine smoke/fire continuation; recognize natural stained-bed-sheet wording as the existing cleaning workflow so “now” completes one service request; restore French Kiss Divers preference handling for learning-to-dive and standalone named-provider turns without promising availability; and keep authorized Wi-Fi-password questions on the approved deterministic path so the numeric password is not mistaken for a private contact number. Preserve the v5.11.36 snorkeling fix, current live Meta mappings, Explore-disabled guide data, House Maps, Room 11/mobile UI, lost-key, emergency, booking/luggage, passport, Airbnb, Admin and security behavior. Do not activate the five pending human-friendly Meta replacement templates in this release.
```

Stop after v5.11.37. Do not automatically begin another release.
