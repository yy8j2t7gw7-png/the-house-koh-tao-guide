# Release Notes v5.11.38

## Outcome

v5.11.38 is a narrow production wording/safety correction built directly from deployed v5.11.37 after real-device testing showed that the in-hours human handoff named **Su** to the guest.

The guest-facing Concierge must never present the routine contact as a personal staff contact. When routine human contact is available, the wording now says:

> Of course. You can contact The House team directly using the options below.

The existing **Contact Us** and **Call Us** actions are unchanged.

## Service-hours gate

Routine House contact remains available only during the established service window:

- Tuesday–Sunday: **10:30 AM–7:30 PM Bangkok time**
- Monday: unavailable

Outside that window, the Concierge does not expose the routine House WhatsApp or Call actions. It continues helping in chat and offers Emergency help when appropriate.

This release does not change emergency contacts, lost-key access, alert recipients, WhatsApp routes, phone numbers or any staff assignment. Su remains the configured internal routine support recipient where applicable; only the guest-facing wording is generalized to **The House team**.

## Preserved v5.11.37 fixes

v5.11.38 preserves all v5.11.37 production corrections:

- deterministic authorized Wi-Fi-password delivery;
- lower-friction persistent human/staff-contact intent recognition;
- fire-cancellation topic-switch isolation while genuine fire continuation remains safety-first;
- natural stained-bed-sheet cleaning collection and `now` / ASAP completion;
- French Kiss Divers preference retention without availability promises;
- v5.11.36 snorkeling current-turn authority.

## Meta replacement templates

The five newer human-friendly Meta replacement templates are not activated by this release. Keep the currently active production mappings unchanged until all replacements are Active and a separate activation is explicitly authorized.

## Validation

- Complete automated suite: **196 passed, 0 failed**.
- The persistent-human tests require **The House team** wording and reject a guest-facing `Su` name.
- The same tests verify no routine WhatsApp/Call actions on Monday.
- A same-day Saturday **20:00 Bangkok** regression verifies that strong human-contact wording also remains closed after 19:30, with no routine contact actions.
- Source scan confirms the old guest-facing `contact Su directly` wording is absent.

## Production smoke test

After deployment:

1. During Tuesday–Sunday 10:30–19:30, ask **I urgently need to talk to a human** → answer refers to **The House team**, never Su; **Contact Us** and **Call Us** appear.
2. Ask **can I call the housekeeper** during the same open window → same team wording and routine actions.
3. Outside 10:30–19:30 or on Monday, repeat the request → no routine Contact Us / Call Us actions; no promise that a team member is available.
4. Spot-check **What is the Wi-Fi password?** → approved password still appears, not `[number removed]`.
5. Do not alter the current Meta template mappings during this smoke test.

No migration is required.
