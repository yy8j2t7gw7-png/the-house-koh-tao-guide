# Development Handoff v5.11.35

## Authoritative checkpoint

v5.11.35 is built directly from deployed v5.11.34 (`cd71240`, **Release v5.11.34 mobile Room 11 crop correction**). The supplied v5.11.34 repository began with **182 passing tests and 0 failures**. Do not reconstruct this release from an older source tree.

Production invariants retained:

- `EXPLORE_ENABLED=false`;
- mobile-only Room 11 `object-position: 72% 100%`;
- stable mobile **💬 AI Concierge** launcher with no scroll/collision movement and no visible launcher while the panel is open;
- existing secrets, recipient groups, webhook settings, BODY schemas/order, passport storage, Airbnb configuration, `SPARE_KEY_CODES`, Admin diagnostics and production bindings.

Two later owner decisions supersede the original written brief:

1. The existing House Maps link resumed working on a real phone, so the proposed desktop/mobile URL split is withdrawn.
2. All five intended Meta action templates are now reviewed and Active, so their separately authorized activation is included in v5.11.35.

## 1. Stale-workflow root cause

Pending ordinary workflows were evaluated before a clear new information intent:

- `applyCleaningRequestPolicy` consumed any next message while cleaning was collecting;
- luggage context was selected whenever luggage state/history existed;
- booking collection interpreted a clear restaurant/beach question as the next missing booking field;
- model retrieval concatenated recent transcript messages with the current question.

That allowed an old cleaning or booking subject to replace the exact subject of a new question.

## 2. Topic-switch solution and workflow preservation

`src/concierge-api.js` now classifies the exact current turn before ordinary workflow continuation. Clear local information forms—beaches, restaurants, bars, cafés, shopping, attractions, practical island information, transport, directions and distance questions—become independent informational detours unless the same message is an emergency, lost-key event, actionable booking, luggage request, cleaning request or missing-supply request.

During a detour:

- cleaning, property, booking and luggage collectors do not consume the message;
- targeted retrieval receives the exact current question, not appended stale history;
- explicit information questions send no transcript history to the model;
- the valid normalized `workflowState` is returned unchanged in purpose and status;
- a later answer such as **3:00 PM** or **tomorrow** resumes the pending workflow naturally.

Emergency, lost-key and direct operational requests still keep higher priority than local information.

## 3. Explore-disabled local-guide integration

`src/project-knowledge.js` already loaded the shared approved datasets directly from `/public/data`; it did not require the Explore page. v5.11.35 makes that retrieval authoritative for current-turn local questions while `EXPLORE_ENABLED=false` remains fixed.

Targeted source selection and ranking now cover:

- `activities.json` — activities, snorkeling, diving, viewpoints and island experiences;
- `bars.json` — bars and nightlife;
- `beaches.json` — beach/bay intent;
- `cafes.json` — coffee, breakfast, brunch, bakery and work/laptop requirements;
- `places.json` — restaurant, cuisine, price and atmosphere intent;
- `shopping.json` — shopping, essentials and practical services.

Retrieval strips contact/map/website fields from model context, adds only compact approved fields relevant to recommendation quality and returns at most six candidate records. Guest-facing deterministic fallback returns only one to three concise choices, never raw JSON.

### Beaches and House distances

- **Mae Haad Beach:** deterministic approved answer—about 200 metres down the road / a very short walk.
- **Sairee Beach:** deterministic approved answer—roughly a 20-minute walk, depending on pace and destination; scooter/taxi is faster.
- Intent-weighted ranking makes explicit beach questions prefer beach records while snorkeling questions can use the approved activity/spot records.

### Restaurants and cafés

- Restaurant retrieval now weights cuisine and meal intent and exposes compact atmosphere/price fields.
- Café retrieval uses breakfast/brunch, remote-work, laptop, workspace, air-conditioning and related approved fields.

### Bars and Bamboo priority

`public/data/bars.json` marks Bamboo Beach Bar as preferred. General bars, drinks, nightlife and sunset-drink questions rank Bamboo first. Explicit requirements such as very late nightlife or food plus cocktails can exclude Bamboo from the final choices and select a better approved record.

## 4. Towel and supply routing

The old supply classifier required a request verb. Natural guest statements such as **There are no towels** therefore missed the service policy and could fall into generic knowledge/model handling.

v5.11.35 adds deterministic missing-supply patterns for towels, toilet paper and soap, including:

- **There are no towels in my room**;
- **No towels** / **Missing towels**;
- **We don’t have towels** / **Our room has no towels**;
- **No toilet paper** / **We’re out of toilet paper**;
- **There is no soap**.

For an eligible guest, each is immediately classified as the existing `stay_support` housekeeping request and creates one existing `support_with_owners` alert to Su plus both owners. A successful response confirms that it was sent, provides no 30-minute promise and exposes no routine call action.

Information forms such as **How often are towels changed?** bypass action classification, return approved information and create no alert.

## 5. Public contact and booking cleanup

- Routine page/card `houseCall` and booking-call buttons were removed from practical, emergency, activity and House-arranged shopping views, including their root/module mirrors.
- `public/concierge-booking.js` no longer returns phone or call fields.
- **Contact Us** continues through `houseWhatsapp`, which the shared browser runtime intercepts and opens as a general-help AI Concierge context.
- **Book with Us** uses `#concierge-booking` plus the selected service name so the existing structured collector starts with relevant context.
- Third-party business **Call** links and genuine emergency calls are outside this House-call cleanup.

## 6. AI-first human escalation

During Tuesday–Sunday 10:30–19:30 Bangkok time:

- the first generic human/call request acknowledges the request and asks what help is needed, with no immediate call or WhatsApp action;
- a repeated request in recent user history, or an explicit persistent form such as **I still need a human**, exposes the established routine human options;
- known answers and successful operational workflows do not append routine contacts;
- a genuine learning gap can still expose a last-resort handoff.

Outside routine hours and on Monday, generic human requests keep Concierge help plus Emergency Help and expose no routine House contact. Koh Tao Rescue, 1669, emergency property support and the verified 24/7 lost-key flow remain independent.

## 7. House Maps decision

The owner retested the existing link on mobile and confirmed it now works. Google documents Maps URLs as universal cross-platform links. v5.11.35 therefore retains one House destination on phone, tablet and desktop:

`https://maps.app.goo.gl/5MV4j4B1YzyR1SR69`

The proposed URLs `https://maps.app.goo.gl/P6dxecrmX6pRWsMb8` and `https://share.google/xpdhZzm91F88beMAP` are absent. A source contract covers all five House-specific occurrences across the landing page, Room root/module pages and Concierge knowledge. Third-party map destinations are unchanged.

## 8. Reviewed Meta quick-action activation

The owner confirmed all five intended templates are reviewed and Active. `wrangler.jsonc` now contains:

```text
WHATSAPP_SERVICE_ACTION_TEMPLATE_NAME=house_service_alert_actions_v2
WHATSAPP_LUGGAGE_ACTION_TEMPLATE_NAME=house_luggage_alert_actions_v1
WHATSAPP_BOOKING_ACTION_TEMPLATE_NAME=house_booking_alert_actions_v1
WHATSAPP_URGENT_ACTION_TEMPLATE_NAME=house_urgent_alert_actions_v1
WHATSAPP_LOST_KEY_ACTION_TEMPLATE_NAME=house_lost_key_alert_actions_v1
WHATSAPP_STAFF_ACTIONS_ENABLED=true
```

Every template uses generic English (`en`) and two quick replies in exact order:

1. **Received** → `HOUSE_ALERT|RECEIVED|<alert_id>`
2. **Resolve** → `HOUSE_ALERT|RESOLVE|<alert_id>`

Preserved safeguards:

- all five exact mappings must validate or the gate fails closed to established buttonless templates;
- `house_service_alert_actions_v1` remains explicitly non-interactive and cannot activate;
- button payloads contain only an allowed command and opaque alert ID;
- signed-webhook authorization, known-recipient checks, actor exclusion, idempotency, status fanout and escalation stop are unchanged;
- typed `RECEIVED`, `ACK` and `RESOLVE` remain valid;
- recipients/routes and all secrets are unchanged;
- rollback is only `WHATSAPP_STAFF_ACTIONS_ENABLED=false` plus redeployment.

No live deployment was performed while preparing these artifacts. The mappings become active when v5.11.35 is deployed to the configured Worker.

## 9. Files changed

Implementation and configuration:

- `src/concierge-api.js`
- `src/project-knowledge.js`
- `public/ai-concierge.js`
- `public/concierge-booking.js`
- `public/data/bars.json`
- `public/data/concierge-knowledge.json`
- `public/activity.html`
- `public/modules/activities/activity.html`
- `public/shop.html`
- `public/modules/shopping/shop.html`
- `public/practical.html`
- `public/modules/practical/practical.html`
- `public/emergency.html`
- `public/modules/emergency/emergency.html`
- `wrangler.jsonc`

Version/test metadata:

- `package.json`
- `package-lock.json`
- `public/ai-concierge-config.js`
- `public/data/activities.json`
- `public/data/diving-courses.json`
- `public/i18n.js`
- `public/module-registry.js`
- `tests/concierge.test.mjs`

Documentation:

- `README.md`
- `CHANGELOG.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`
- `WHATSAPP_ALERT_OPERATIONS.md`
- `META_STAFF_QUICK_ACTIONS_v5.11.20.md`
- `DEVELOPMENT_HANDOFF_v5.11.35.md`
- `RELEASE_NOTES_v5.11.35.md`

## 10. Tests added and updated

Eight new contracts expand the suite from 182 to 190 tests:

1. Explore-disabled multi-dataset retrieval, Bamboo priority and unsuitable-specific-bar handling;
2. exact Mae Haad and Sairee proximity answers;
3. cleaning → beach detour → cleaning resumption;
4. booking → dinner detour with current-question-only model input → booking resumption;
5. informational snorkeling recommendations with no alert;
6. verified missing-towel action versus informational towel policy;
7. universal House Maps source contract;
8. exact reviewed Meta action-template release configuration.

Existing human-contact, housekeeping, cleaning, booking-information, approved-knowledge, CTA and quick-action tests were updated without removing their security or operational assertions. Missing-supply phrase coverage now includes every reported production form plus toilet paper and soap variants.

Validation result:

- complete source suite: **190 passed, 0 failed**;
- focused changed-behavior regressions: **19 passed, 0 failed**;
- outbound network was explicitly blocked during automated tests; all OpenAI and Meta response paths used local mocks.

## 11. Security, privacy and operational regression

The complete suite reconfirms:

- no public or stored API keys, admin tokens, hashing secrets, passport/stay peppers, reservation tokens, Meta access/webhook secrets, recipient configuration, private contacts, passport data or key-box codes;
- contacts remain transient and excluded from interactions, alerts, retry snapshots, logs, diagnostics and learning data;
- lost-key request-bound fee consent, accepted-notification gate, single-use display and rotation lock;
- booking/luggage final-field boundaries, alert routing, delivery retry and no false success;
- cleaning, supply, maintenance and confirmed-emergency alert lifecycles;
- passport retention, verified-stay separation, Airbnb sync, owner dashboard and Admin diagnostic behavior;
- exact quick-reply authorization, idempotency, actor exclusion and value-free payloads.

No migration is required.

## 12. Ready-to-push verification

The ready-to-push ZIP is a complete source tree with `.git`, local Wrangler state, dependencies and generated release ZIPs excluded. The patch ZIP contains only v5.11.35 changed/new paths. Both archives passed ZIP integrity checks. A clean extraction of the ready-to-push ZIP passed the complete offline test suite: **190 passed, 0 failed**. The four edited root/module page mirrors were also confirmed byte-identical.

Wrangler is not installed in the supplied local dependency tree, so a deploy dry run could not be executed during packaging. Before production deployment:

1. `npm ci`
2. `npm test` — reconfirm **190 passed, 0 failed**
3. `npx wrangler deploy --dry-run`
4. confirm `/api/concierge/status` reports release `5.11.35`, `staffQuickActionsEnabled: true` and all five exact action mappings
5. deploy only after the dry run is clean

## 13. Post-deployment smoke test

1. Verified guest: **There are no towels in my room** → one action-template service alert to Su plus both owners; no second request and no routine call.
2. During pending cleaning: **How far is the beach from the house?** → Mae Haad / about 200 metres, no cleaning contamination; then resume cleaning.
3. **How far is Sairee Beach?** → roughly 20-minute walk.
4. **Where should we go for a drink?** → Bamboo Beach Bar first.
5. Restaurant, Thai-food, snorkeling and work-café prompts → grounded approved records, no information-only alert.
6. First **I want to talk to a human** → AI asks the need; persistent in-hours request → routine contacts; after hours → no routine contact.
7. Public **Contact Us** and **Book with Us** → appropriate Concierge context; no direct House/Fah call.
8. One safe alert of every Meta action kind → correct template plus **Received** and **Resolve**; verify actor exclusion, idempotency, fanout and escalation stop.
9. **Open Google Maps** on phone and desktop → retained `5MV4j4B1YzyR1SR69` destination.
10. Emergency Help and verified lost-key flow → unchanged.

## GitHub Desktop

### Summary

```text
Release v5.11.35 smarter Concierge and local guide integration
```

### Description

```text
Improve Concierge intent routing so new guest questions override stale workflow context without losing active requests; connect the AI Concierge to the existing Koh Tao beach, restaurant, café, bar, activity and practical-information datasets while keeping Explore disabled; prioritize Bamboo Beach Bar for general bar recommendations; treat clear missing-towel/supply statements as immediate service requests; simplify routine contact and booking CTAs to AI-first Concierge flows with Call Us only as a last-resort human escalation; retain the real-device-verified universal House Google Maps link; and activate the five reviewed Meta staff-action templates with Received and Resolve quick replies. Preserve all lost-key, emergency, WhatsApp routing, passport, Airbnb, admin and security behavior.
```

Stop after v5.11.35. Do not automatically begin another release.
