# Development Handoff v5.11.39

## Authoritative baseline

v5.11.39 is built directly from deployed **v5.11.38** after the Room 6 production screenshots from 30 Aug 2026 were inspected together.

The five newer human-friendly Meta action templates remain pending/in review and are **not activated** in this release. Existing production template mappings, recipient groups, buttons/payloads, webhook security and secrets remain unchanged.

## Production failures confirmed from the five screenshots

### 1. `I need a clean up` did not enter the real cleaning collector

The guest was asked for a time, but the answer was model-generated. No authoritative `workflowState.type === "cleaning"` was established.

### 2. Bare reply `11` did not submit the request

Because the browser discarded cleaning workflow state, the follow-up was interpreted from transcript text instead of the deterministic collector. The Concierge said the time was noted and incorrectly told the guest to send the request to support. No operational alert was sent.

### 3. The website falsely implied staff could reply inside the Concierge

Wording such as `the time is not confirmed until they reply` is logically wrong. The AI Concierge website is not a live staff inbox. Staff receive WhatsApp operational alerts; they do not type replies back into this website chat.

### 4. A verified Room 6 guest could see the generic verification greeting after a reload

The frontend always used the static pre-verification `initialMessage` even when `/api/stay/status` had already established verified guest access.

### 5. Invisible old transcript history contaminated a fresh page load

The browser restored old session transcript history from `sessionStorage` without rendering that old transcript to the guest. A short message such as `I am already` could therefore be interpreted through an old cleaning conversation that the guest could not even see.

### 6. `Please send the request` could create a meaningless generic service alert

The resulting WhatsApp alert showed:

- Request: `Guest request`
- Details: `Please send the request`

That alert had lost the actual cleaning purpose and preferred time. A vague submission instruction must never create an operational alert without structured request context.

## Root causes

Three boundaries were incomplete:

1. Server-side cleaning recognition did not cover natural `clean up` / `cleanup` wording or contextual bare-hour replies.
2. The browser did not retain `cleaning` as an active collecting workflow, even though it retained booking, luggage, property and lost-key workflow state.
3. Browser history was persisted invisibly across full page loads while workflow state was not, allowing stale transcript text to influence a new visible conversation.

The static initial greeting and broad model-driven stay-support fallback made the stale-state failure more confusing and allowed a context-free service alert to be generated.

## Corrections in v5.11.39

### Deterministic cleaning flow

`src/concierge-api.js` now:

- recognizes natural `clean up` / `cleanup` requests;
- preserves the existing stained-linen cleaning classification;
- accepts a bare 1–12 hour only when a cleaning collector is actually waiting for `preferredTime`;
- interprets `11` as 11:00 AM in that active cleaning context;
- automatically submits the existing service alert once the required preferred time is collected;
- never asks the guest to manually send an already-collected cleaning request;
- confirms success only after at least one WhatsApp delivery is accepted;
- says the preferred time is a preference and that housekeeping will come as close to it as availability allows;
- exposes routine Call Us only on actual delivery failure, not after a successful cleaning submission.

### Browser retains cleaning workflow state

`public/ai-concierge.js` now keeps `workflow.type === "cleaning" && status === "collecting"` in `activeWorkflowState`, exactly like other protected workflows. Therefore:

`I need a clean up` → `11`

stays in one authoritative cleaning request and reaches the operational alert boundary.

### Fresh visible conversation on reload

The browser no longer restores invisible transcript history on a full page load. Since the old transcript was not rendered to the guest and workflow state was not persisted, restoring only the hidden transcript was unsafe and misleading. A reload now starts a visibly fresh Concierge conversation.

### Access-aware initial greeting

The initial Concierge message is now based on the already-loaded stay status:

- unverified/public guest → existing verification guidance;
- verified but registration incomplete → concise registration reminder;
- verified access active → guest-facing stay-help greeting, no instruction to verify again.

### Verified shorthand acknowledgement

For a verified guest, shorthand such as `I am already` / `I’m already verified` is handled deterministically before stale model history. It confirms the actual access state instead of resurrecting an old workflow.

### Context-free `send request` guard

A vague phrase such as `Please send the request` cannot create a generic service alert when there is no active structured workflow. The guest is instead asked what they need. If a valid cleaning/booking/luggage collector is active, that collector remains authoritative. An unrelated stale monitoring workflow also cannot bypass this guard and produce a model-generated false success.

### Alert content preserved

A completed cleaning request sends a service alert whose summary contains the actual purpose and preferred time, so the existing Meta template renders `Room cleaning` rather than `Guest request`. The details contain the structured cleaning summary, not the phrase `Please send the request`.

## Tests and validation

New/expanded production regressions cover:

1. `I need a clean up` / `I need a cleanup` / `can I get a clean up`;
2. continuation `11` with one automatic service alert;
3. stained bed sheet → `now` still sends exactly one cleaning alert;
4. successful alert content identifies Room cleaning and includes the preferred time;
5. `Please send the request` without a workflow creates no alert and does not call the model;
6. verified `I am already` ignores stale cleaning transcript text;
7. browser reload starts a fresh visible conversation and uses access-aware initial copy;
8. browser source contract retains an active cleaning collector between turns;
9. bare `3` in an active cleaning collector becomes 3:00 PM and submits the structured request once;
10. failed cleaning delivery never claims success, keeps the collector recoverable, and a retry cannot create a duplicate alert;
11. generic send-request wording remains blocked even when an unrelated stale monitoring workflow is supplied.

The shared historical stay fixture was also made time-stable so the suite does not begin failing merely because the wall-clock reaches its old 30 Aug checkout date. Tests requiring a specific checkout continue to override the fixture explicitly.

Validation result:

- focused screenshot and delivery-hardening regressions: **8 passed, 0 failed**;
- complete source suite: **203 passed, 0 failed**;
- JavaScript syntax checks passed for the changed runtime modules;
- project JSON files parse successfully.

## Preserved invariants

- v5.11.38 routine human-contact wording remains **The House team**, never a staff name.
- Routine Contact Us / Call Us remains Tuesday–Sunday 10:30–19:30 Bangkok time only; Monday and after-hours suppression remain.
- The House Emergency Support remains separate from routine contact and may reach the configured emergency contact internally without exposing a name.
- v5.11.37 Wi-Fi numeric-password correction remains intact.
- fire/current-turn isolation remains intact.
- stained-linen classification remains intact.
- French Kiss Divers preference handling remains intact.
- v5.11.36 snorkeling grounding remains intact.
- lost-key authorization, fee consent, accepted-notification gate, code isolation and rotation lock remain unchanged.
- booking/luggage private-contact boundaries remain unchanged.
- passport, Airbnb, Admin, recipient routing, webhook and secret/privacy boundaries remain unchanged.
- pending Meta replacement templates remain inactive.

## Files changed from v5.11.38

Runtime:

- `src/concierge-api.js`
- `src/alert-policy.js`
- `public/ai-concierge.js`

Tests/version metadata/docs:

- `tests/concierge.test.mjs`
- `package.json`
- `package-lock.json`
- `public/ai-concierge-config.js`
- `public/module-registry.js`
- `public/data/concierge-knowledge.json`
- `public/data/activities.json`
- `public/i18n.js`
- `README.md`
- `CHANGELOG.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`
- `RELEASE_NOTES_v5.11.39.md`
- `DEVELOPMENT_HANDOFF_v5.11.39.md`

## Production smoke test

After deployment, use a verified active Room during housekeeping hours:

1. `I need a clean up` → asks only for preferred time, no alert yet.
2. `11` → one service alert; guest sees sent confirmation and `Preferred time: 11:00 AM`.
3. Confirm the WhatsApp alert says `Room cleaning` and contains the preferred time, not `Guest request` / `Please send the request`.
4. Reload the Room page → Concierge greeting recognizes active guest access and does not say to verify again.
5. With no active workflow, `Please send the request` → asks what is needed and sends no alert.
6. Re-test `there is a stain on my bed sheet` → `now` → one service alert.
7. Spot-check Wi-Fi password, routine contact hours and The House Emergency Support.

## GitHub Desktop

Summary:

`Release v5.11.39 fix cleaning workflow and stale Concierge state`

Stop after v5.11.39. Do not activate the pending Meta replacement templates automatically.

## Final packaging verification

The final ready-to-push source tree was packaged with generated archives, local dependency folders and transient Wrangler state excluded. Validation of the packaged artifact completed as follows:

- ready-to-push ZIP CRC/integrity: passed;
- patch ZIP CRC/integrity: passed;
- clean extraction of the ready-to-push ZIP: **203 passed, 0 failed**;
- extracted source versus final working tree: **255 / 255 file hashes matched**;
- complete JavaScript syntax scan: **36 files passed**;
- project JSON parse scan: **12 files passed**;
- release metadata consistency: passed;
- `wrangler.jsonc` is byte-identical to deployed v5.11.38, so no Meta template mapping, recipient, secret or production binding was changed.

Wrangler is not installed in the local runtime and external package installation is unavailable here, so `npx wrangler deploy --dry-run` could not be completed in this environment. Run `npm ci`, `npm test` and `npx wrangler deploy --dry-run` before production deployment.
