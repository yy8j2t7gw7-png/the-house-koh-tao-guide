# Development Handoff v5.11.36

## Authoritative checkpoint

v5.11.36 is built directly from **deployed v5.11.35** after the owner completed real production testing on 29 Aug 2026.

v5.11.35 remains the authoritative baseline for every behavior not explicitly changed below. Its complete source suite passed **190 tests** before deployment.

Production invariants retained:

- `EXPLORE_ENABLED=false`;
- mobile-only Room 11 `object-position: 72% 100%`;
- stable mobile **💬 AI Concierge** launcher and panel behavior;
- single verified House Google Maps destination;
- all five reviewed Meta action-template mappings and `WHATSAPP_STAFF_ACTIONS_ENABLED=true`;
- existing secrets, recipient groups, signed webhook settings, BODY schemas/order, passport storage, Airbnb configuration, `SPARE_KEY_CODES`, Admin diagnostics and production bindings.

## 1. Real production failures

Two snorkeling questions failed after v5.11.35 was deployed.

### Failure A — generic welcome instead of snorkeling answer

Guest asked:

**which beach is good for snorkeling**

Actual response:

The generic Concierge welcome beginning **Hello. I can help with check-in...**

The same class applies to:

**which beach is best for snorkeling**

### Failure B — false learning gap despite approved records

Guest asked:

**is there good snorkeling**

Actual response stated that no confirmed snorkeling-location recommendation was available and offered booking-team help.

Both are release failures because v5.11.35 explicitly required snorkeling recommendations to use approved local records.

## 2. Root cause A — `hi` inside `which`

`matchKnowledge()` uses high-confidence substring scoring. The `welcome` intent includes the trigger `hi`.

Because the normalized word **which** contains the character sequence `hi`, the question **which beach is good for snorkeling** could score the `welcome` intent at `0.96`.

v5.11.35 then evaluated that high-confidence deterministic match before model/project handling, so the local-guide retrieval never became authoritative for that turn.

Important: the shared scorer is not globally rewritten in this corrective release because existing structured-booking behavior currently depends on the broader deterministic routing sequence. A global matcher change created unrelated booking-model regressions in validation.

The narrow production-safe fix is in `src/concierge-api.js`:

- deterministic matches remain unchanged generally;
- when the exact current turn is an **independent local-information request**, a deterministic match with `intentId === "welcome"` is not accepted;
- every other high-confidence deterministic match remains available.

This preserves exact Mae Haad/Sairee and other established deterministic local/property answers.

## 3. Root cause B — retrieved records were advisory, not authoritative

v5.11.35 already retrieved relevant approved snorkeling records from `/public/data`, but when an OpenAI key was configured it still called the model and trusted any schema-valid response.

`projectKnowledgeResult()` was used only after a model/network exception or when the model was disabled.

That allowed the live model to return a valid JSON learning-gap answer even though records such as Shark Bay, Ao Leuk and Hin Wong had been supplied in approved project context.

v5.11.36 adds `isSnorkelingInformationRequest()` and makes the following path deterministic:

1. current turn is an independent information request;
2. current turn contains snorkeling intent;
3. approved project retrieval returns at least one record;
4. return `projectKnowledgeResult()` immediately;
5. do **not** call the model.

This applies only to information/recommendation questions. `isActionableStructuredBooking()` still has priority in current-turn classification, so **I want to book a snorkeling trip** continues through the protected structured booking workflow.

## 4. Guest-facing project reason cleanup

The v5.11.35 deterministic project fallback preferred `recommendation` before `bestKnownFor` for every record type. Activity records sometimes use `recommendation` for internal concierge cautions or verification notes.

v5.11.36 changes only the display preference:

- beach records: `recommendation` first because the beach dataset contains clean guest-facing recommendation sentences;
- non-beach records: `bestKnownFor` first, then summary, recommendation and perfect-for text.

Example result quality now uses concise reasons such as:

- **Ao Leuk Snorkelling — Colorful shore snorkeling combined with a substantial beach**
- **Shark Bay (Thian Og Bay) Snorkelling — Best-known shore-access area for possible blacktip reef shark and turtle encounters**

rather than internal editorial wording when a clean approved reason exists.

## 5. Files changed

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
- `DEVELOPMENT_HANDOFF_v5.11.36.md`
- `RELEASE_NOTES_v5.11.36.md`

No approved place/activity content, page layout, CTA, Meta mapping, recipient route, secret or storage schema was changed.

## 6. Tests added and validation

One new production regression expands the suite from 190 to **191 tests**.

It runs all three live/problem phrasings with `OPENAI_API_KEY` configured:

1. **which beach is good for snorkeling**
2. **which beach is best for snorkeling**
3. **is there good snorkeling**

The mock OpenAI endpoint is deliberately capable of returning the same false learning-gap response seen in production, but the regression requires **zero OpenAI calls**.

For every phrase it asserts:

- HTTP 200;
- `source === "project-knowledge"`;
- intent is not `welcome`;
- `learningGap === false`;
- `needsHuman === false`;
- `handoff === "none"`;
- answer contains an approved snorkeling location;
- no generic welcome / false missing-recommendation / internal editorial wording;
- no workflow;
- no alert.

Validation result:

- complete source suite: **191 passed, 0 failed**.

## 7. Security and operational regression

The complete suite still reconfirms the existing protected boundaries, including:

- no public/stored API keys, admin tokens, hashing secrets, passport/stay peppers, reservation tokens, Meta access/webhook secrets, recipient configuration, private contacts, passport data or key-box codes;
- lost-key fee consent, accepted-notification gate, single-use display and rotation lock;
- structured booking/luggage final-field boundaries and no false delivery success;
- cleaning, supply, maintenance and emergency alert lifecycles;
- passport retention, verified-stay separation, Airbnb sync and owner/Admin operations;
- Meta quick-reply authorization, idempotency, actor exclusion and value-free payloads.

No migration is required.

## 8. Ready-to-push verification

Before deployment:

1. `npm ci`
2. `npm test` — require **191 passed, 0 failed**
3. `npx wrangler deploy --dry-run`
4. confirm `/api/concierge/status` reports release `5.11.36`, `staffQuickActionsEnabled: true` and the same five v5.11.35-reviewed action mappings
5. deploy only after the dry run is clean

## 9. Post-deployment smoke test

Test in this order:

1. **which beach is good for snorkeling** → approved local snorkeling choices; not welcome.
2. **which beach is best for snorkeling** → approved local snorkeling choices; not welcome.
3. **is there good snorkeling** → approved local snorkeling choices; no false learning gap.
4. Confirm no alert, no routine contact action and no booking workflow for those three information questions.
5. **I want to book a snorkeling trip** → unchanged structured collector, asking only the next missing field.
6. **How far is the beach from the house?** → Mae Haad / about 200 metres.
7. **How far is Sairee Beach?** → roughly 20-minute walk.
8. One safe Meta action alert → same action template with **Received** and **Resolve**.
9. Emergency Help and verified lost-key flow → unchanged.

## 10. GitHub Desktop

### Summary

```text
Release v5.11.36 fix snorkeling recommendation routing
```

### Description

```text
Fix the production snorkeling regression found after v5.11.35 deployment. Prevent independent local-information questions such as “which beach is good/best for snorkeling” from being hijacked by the generic welcome intent, and make approved retrieved snorkeling records authoritative so questions such as “is there good snorkeling” are answered deterministically without relying on model compliance. Keep actionable snorkeling bookings on the existing protected structured workflow, improve guest-facing deterministic project reasons, and preserve all v5.11.35 Meta quick actions, House Maps, Explore-disabled guide data, contact rules, Room 11/mobile UI, lost-key, emergency, luggage, passport, Airbnb, Admin and security behavior.
```

Stop after v5.11.36. Do not automatically begin another release.
