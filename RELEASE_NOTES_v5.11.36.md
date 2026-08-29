# Release Notes v5.11.36

## Outcome

v5.11.36 is a narrow production correction built directly from deployed v5.11.35. It fixes two real snorkeling-answer failures without changing the approved snorkeling dataset, Explore state, booking workflows, Meta configuration, House Maps, lost-key behavior or any other operational route.

The production failures were:

- **which beach is good for snorkeling** / **which beach is best for snorkeling** could return the generic Concierge welcome;
- **is there good snorkeling** could return a false statement that no confirmed snorkeling-location recommendation existed even though approved snorkeling records had been retrieved.

## Root cause

### 1. Welcome collision on **which**

The shared deterministic knowledge scorer uses substring containment for high-confidence trigger matches. The `welcome` intent contains the short trigger **hi**, and **which** contains the same character sequence. In v5.11.35 that produced a `welcome` match at deterministic confidence before the new project-retrieval route was allowed to answer the independent local-information question.

v5.11.36 does not rewrite the shared matcher. Instead, it applies the correction at the current-turn routing boundary: an **independent local-information** request cannot accept a deterministic `welcome` result. All other exact deterministic House/local answers—including Mae Haad/Sairee distance guidance and existing property facts—remain eligible exactly as before.

### 2. Model compliance could override retrieved approved snorkeling records

v5.11.35 correctly retrieved approved snorkeling records, but when `OPENAI_API_KEY` was configured it still asked the model to construct the final answer. Deterministic project fallback ran only if the model call failed. A syntactically valid model response could therefore incorrectly claim a learning gap despite relevant approved records being present.

v5.11.36 makes retrieval authoritative for **independent snorkeling-information** questions. If approved project records are found, `projectKnowledgeResult()` produces the guest answer directly and the model is not called.

Actionable snorkeling booking intent remains separate and unchanged.

## Guest-facing behavior

The following now return one to three approved local snorkeling recommendations, with no alert and no booking workflow:

- **which beach is good for snorkeling**
- **which beach is best for snorkeling**
- **is there good snorkeling**
- existing covered forms such as **What are good snorkeling spots?** and **Recommend a beach for snorkeling.**

Typical approved records include Ao Leuk Snorkelling, Shark Bay (Thian Og Bay) Snorkelling, Hin Wong Bay Snorkelling and Mango Bay Snorkelling depending on the wording and ranking.

For non-beach project records, concise deterministic reasons now prefer `bestKnownFor` over internal recommendation/editorial notes when both are available. This keeps answers guest-facing and avoids exposing wording such as internal verification cautions when a clean approved description already exists.

## Preserved behavior

- `EXPLORE_ENABLED=false`;
- all v5.11.35 approved activities, bars, beaches, cafés, restaurants and shopping retrieval;
- Mae Haad Beach about 200 metres / very short walk;
- Sairee Beach roughly a 20-minute walk;
- Bamboo Beach Bar priority for general drinks/nightlife;
- natural missing towel / toilet-paper / soap service routing;
- Tuesday–Sunday 10:30–19:30 Bangkok routine-contact and housekeeping hours, Monday closed;
- AI-first generic human escalation;
- protected 24/7 lost-key authorization and fee-consent flow;
- emergency Rescue / 1669 / property actions;
- structured diving, fishing, snorkeling and transport booking workflows;
- all five reviewed Meta action-template mappings with **Received** and **Resolve**;
- universal House Maps destination;
- mobile Room 11 `72% 100%` crop and stable mobile Concierge;
- passport retention, stay verification, Airbnb sync, owner console and Admin diagnostics;
- secrets, recipient mappings, webhook authorization and privacy boundaries.

## Validation

- Complete automated suite: **191 passed, 0 failed**.
- New regression explicitly runs all three production snorkeling phrasings with an OpenAI key configured and verifies **zero model calls**.
- The regression asserts: project-knowledge source, no `welcome`, no learning gap, no handoff, no alert, no booking workflow and an approved snorkeling place in the answer.
- JavaScript syntax and JSON parsing pass.

## Production smoke test

After deployment, test these first in a verified Room session:

1. **which beach is good for snorkeling** → approved snorkeling recommendations; must not return the generic welcome.
2. **which beach is best for snorkeling** → approved snorkeling recommendations; must not return the generic welcome.
3. **is there good snorkeling** → approved snorkeling recommendations; must not claim that no confirmed recommendation exists.
4. For all three: no alert, no routine contact action, no booking workflow.
5. **I want to book a snorkeling trip** → unchanged protected structured booking collector; first missing booking field is requested and no alert is sent until all required fields are complete.
6. Spot-check **How far is Sairee Beach?** and **How far is the beach from the house?** → existing deterministic answers remain unchanged.
7. Spot-check one Meta action alert, Emergency Help and verified lost-key flow → unchanged.

## Rollback

This release changes no data schema, secrets, recipients or Meta configuration. If v5.11.36 causes an unexpected regression, redeploy deployed v5.11.35. No migration is required.
