# Release Notes v5.11.39

## Outcome

v5.11.39 resolves the Room 6 production failures visible across the five screenshots taken after v5.11.38 deployment.

The main issue was not only wording. The browser was discarding the real cleaning workflow after the first turn while keeping old transcript text invisibly across page reloads. That allowed the model to imitate a cleaning workflow without actually creating one, so `I need a clean up` → `11` could appear conversationally correct while no WhatsApp service alert was sent.

## Correct cleaning behavior

The sequence is now deterministic:

1. `I need a clean up` → room-cleaning collector asks only for a preferred time.
2. The browser retains the collecting cleaning workflow.
3. `11` → interpreted as 11:00 AM in that cleaning context.
4. The Concierge automatically submits the existing service alert to the normal Su + owner recipient group.
5. Only after accepted delivery does the guest see a success message.
6. The guest is not told to manually send the request and is not told that staff will reply inside the website chat.

Successful wording is concise and truthful, for example:

`Thank you. I’ve sent your cleaning request to The House team. Preferred time: 11:00 AM. Housekeeping will come as close to your preferred time as possible, depending on availability.`

Routine Call Us is not shown after a successful cleaning send; it remains available through the existing office-hours failure/handoff rules when genuinely needed.

## Alert correctness

The bad screenshot alert:

- `Request: Guest request`
- `Details: Please send the request`

can no longer be created from a vague submission phrase without an active structured request.

A real completed cleaning request carries the structured cleaning summary into the existing alert system, so staff see `Room cleaning` plus the preferred time. The guard also applies when an unrelated stale monitoring workflow exists, so that stale state cannot let a context-free submission sentence fall through to the model.

## Fresh page / verified guest correction

A full page load now starts a fresh visible Concierge conversation instead of restoring hidden session transcript history that the guest cannot see.

The initial message is also access-aware:

- public/unverified → verification guidance;
- verified but registration incomplete → registration reminder;
- verified guest access active → normal stay-help greeting.

A verified guest will therefore no longer reopen Room 6 and immediately be told to verify the stay again. Short acknowledgement such as `I am already` is also handled from the real access state rather than an old cleaning transcript.

## No invented staff-chat channel

The House team cannot type back into the AI Concierge website. WhatsApp alerts are operational notifications to staff, not a bidirectional website-chat transport. v5.11.39 explicitly prevents model wording that says staff will reply in the Concierge or asks the guest to re-send an operational request after the Concierge already collected it.

## Preserved behavior

- v5.11.38 guest-facing routine contact says **The House team**, never exposes Su's name, and remains office-hours gated.
- The House Emergency Support remains independent of routine hours and does not expose the configured responder's name.
- v5.11.37 Wi-Fi, fire-current-turn isolation, stained-linen and French Kiss Divers corrections remain intact.
- v5.11.36 snorkeling correction remains intact.
- Existing currently active Meta action-template mappings remain unchanged; the five human-friendly replacements remain pending/in review and are not activated here.
- Lost-key, booking, luggage, passport, Airbnb, Admin, webhook, recipient and secret/privacy boundaries are unchanged.

## Validation

- focused screenshot and delivery-hardening regressions: **8 passed, 0 failed**;
- complete suite: **203 passed, 0 failed**;
- changed JavaScript runtime files pass syntax checks;
- project JSON parsing passed.

The shared historical verified-stay test fixture was moved beyond the old 30 Aug checkout boundary so the suite remains deterministic when run after that date. This changes test data only, not production stay-expiry behavior. Additional coverage confirms bare `3` means 3:00 PM only inside the cleaning collector, failed Meta delivery never claims success, and retrying a failed cleaning send does not create a duplicate alert.

## Production smoke test

1. `I need a clean up` → asks for preferred time; no alert yet.
2. `11` → exactly one cleaning service alert; guest sees successful sent confirmation.
3. Staff alert says `Room cleaning` and includes the preferred time.
4. Reload verified Room page → access-aware greeting; no unnecessary verification instruction.
5. `Please send the request` with no active request → no alert.
6. `there is a stain on my bed sheet` → `now` → exactly one cleaning alert.
7. Spot-check Wi-Fi, routine contact hours and emergency support.

## Package verification

The final ready-to-push archive passed ZIP integrity and a clean extraction passed the complete **203/203** test suite. The extracted archive matched the final source tree **255/255 file hashes**. JavaScript syntax, JSON parsing and release metadata checks passed. `wrangler.jsonc` remains unchanged from v5.11.38.

A Wrangler dry run could not be executed in this environment because Wrangler is not locally installed and external dependency installation is unavailable. Run `npm ci`, `npm test` and `npx wrangler deploy --dry-run` before deployment.
