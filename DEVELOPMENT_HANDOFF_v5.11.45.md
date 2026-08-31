# THE HOUSE – KOH TAO
## Professional Development Handoff — v5.11.45 current stable-base branch
### 31 Aug 2026 — after key-box reset-activity deletion enhancement

## 1. AUTHORITATIVE BASELINE

The current v5.11.45 branch was rebuilt from exact committed **v5.11.42** (`4979b83`), which the owner selected as the last stable baseline.

Do **not** rebase this branch onto the discarded unstable passport/registration branches. Preserve the stable-base strategy unless the owner explicitly authorizes a different baseline.

Current release number remains **5.11.45**.

## 2. CURRENT CUMULATIVE v5.11.45 SCOPE

### A. Airbnb last-minute booking synchronization

Authoritative file: `airbnb-sync/Code.gs`.

- recent Airbnb host email check every **5 minutes**;
- trustworthy active-listing + HM confirmation code + check-in/check-out email records can immediately create/update the protected stay with `complete:false`;
- all ten active Airbnb calendars for Rooms **1–6 and 8–11** reconcile at least every **60 minutes**;
- **Room 7 remains excluded**;
- the **24-hour complete audit remains the only cancellation-capable path**;
- partial email/hourly syncs cannot absence-cancel valid reservations.

After Worker deployment, the existing standalone Google Apps Script project must be updated separately with this release's `airbnb-sync/Code.gs`, then `installHouseReservationTrigger` should be run once. Do not create a duplicate Apps Script project or duplicate trigger.

### B. Approved Meta staff action templates

Active mappings remain exactly:

- `house_service_alert_actions_v3`
- `house_booking_alert_actions_v2`
- `house_luggage_alert_actions_v2`
- `house_urgent_alert_actions_v2`
- `house_lost_key_alert_actions_v2`

Visible buttons remain **Received / Resolved**.

Internal payload commands remain:

- `HOUSE_ALERT|RECEIVED|<alert_id>`
- `HOUSE_ALERT|RESOLVE|<alert_id>`

Never rename internal `RESOLVE` to `RESOLVED`.

### C. Passport guest-facing correction

The guest-facing **Option 2 — Enter the required details** placeholder is removed.

Preserve:

- Thai-only registration/exemption behavior;
- non-Thai passport requirement/count behavior from the stable-base branch;
- secure passport image upload;
- in-person handling already present in the stable branch;
- no guest-facing manual passport-details entry.

The passport image file input no longer forces `capture="environment"`. Mobile browsers may therefore offer both a camera/photo capture option and existing photo/file selection according to device/browser capabilities. Accepted image formats, upload validation, consent, authorization and private storage behavior are unchanged.

### D. Routine pest recognition correction

Routine pest/property-issue recognition is broadened so common singular/plural pest terms, one-word reports and conservative typo/transposition variants enter the existing deterministic `property_issue_pest` workflow rather than falling through to generic AI/human routing.

Important preserved behavior:

- the existing guest-facing pest messaging is unchanged;
- the existing protected service-alert workflow is unchanged;
- pest alerts continue through the existing support-with-owners route and current service action template;
- ordinary pest reports are not converted into emergency incidents merely because they occur after hours or on Monday;
- dangerous-animal/emergency routing remains separate;
- ambiguous phrases such as travel `fly`, `flea market`, `computer mouse`, sports `cricket`, and software/website `bug` are guarded against false pest classification.

### E. NEW — deletable recent key-box reset activity

Owner Admin now allows individual entries under **Recent key-box reset activity** to be deleted.

Files changed for this latest enhancement:

- `public/concierge-admin.js`
- `src/stay-api.js`
- `src/concierge-store.js`
- `tests/concierge.test.mjs`
- release/handoff documentation only

Implementation boundary:

1. `getStayOperationsOverview()` now returns the opaque reset-event `id` with each displayed rotation activity item.
2. Each activity card receives one **Delete** button in the existing Admin UI.
3. The button uses the existing protected Admin confirmation dialog.
4. The authenticated endpoint is `/api/concierge/admin/spare-key-rotation-activity/delete`.
5. The store deletion method accepts only event IDs whose database `event_type` is:
   - `rotation_cleared_controlled_test`; or
   - `rotation_cleared_physical`.
6. Deleting activity removes only that selected historical reset-activity row.

### Critical lost-key invariants preserved by the delete feature

Deleting a reset-activity entry does **not**:

- alter `spare_key_room_state`;
- clear or create a rotation lock;
- change a physical or configured key-box code;
- alter `SPARE_KEY_CODES`;
- remove a `verified_spare_key_release` event;
- revive a used lost-key token/request;
- re-authorize a historical spare-key view;
- change fee acceptance, notification or code-release gates.

This is therefore a history-cleanup operation only, not a lost-key security-state operation.

## 3. EXPLICIT NON-SCOPE FOR THE LATEST CHANGE

Do not interpret the key-box activity delete enhancement as permission to change:

- guest-facing Concierge wording;
- chat layout/usability;
- intent routing;
- pest wording or pest delivery semantics;
- Airbnb synchronization;
- Meta templates, mappings or commands;
- passport/registration logic;
- lost-key fee or release logic;
- key-box rotation rules;
- cleaning/luggage/booking/stay-extension workflows;
- emergency routing;
- room content/images;
- Explore behavior;
- service hours.

No new guest-facing messaging was introduced by the key-box deletion change.

## 4. VALIDATION

Current full automated suite after the key-box activity deletion enhancement:

- **219 passed / 0 failed**.

Focused regression verifies:

- unauthenticated deletion is rejected;
- the selected rotation-reset history entry can be deleted;
- ordinary/non-reset spare-key event history is retained;
- current rotation-lock state is unchanged by deletion;
- Admin UI exposes a Delete control and explains that the operation does not change the current code or rotation-lock state.

Before final deployment, also perform the standard local validation:

- `npm ci`
- `npm test`
- `npx wrangler deploy --dry-run`

A clean `npm ci --no-audit --no-fund` was attempted in this hosted environment on 31 Aug 2026 and hit the container transport timeout while resolving/installing the external Wrangler dependency. Therefore `npx wrangler deploy --dry-run` was **not** completed here. This is an environment/tooling limitation, not a known source failure. Do not claim the Wrangler dry-run passed until it is run locally.

## 5. SECURITY / PRIVACY INVARIANTS

Never expose or add to source, tests, documentation or logs:

- real Airbnb confirmation codes;
- real passport images/data;
- Meta access tokens or secrets;
- private recipient telephone numbers;
- Admin tokens;
- stay/passport peppers;
- stay tokens;
- real key-box codes;
- `SPARE_KEY_CODES`.

Preserve existing signed Meta webhook validation, authorized-recipient status handling, no-false-success delivery behavior, protected stay verification and lost-key notification/code-release gates.

## 6. COMMERCIALIZATION / WHITE-LABEL ARCHITECTURE — PERMANENT HANDOFF REQUIREMENT

This project is intended not only for The House – Koh Tao but for eventual **sale/adaptation to other hospitality businesses**.

Every future development and every future handoff must preserve this architectural requirement.

### Current architectural position

The codebase has a reusable operational core, but remains a **single-property / one-deployment-per-property architecture** today. A future dedicated platformization phase should extract property-specific configuration without changing The House production behavior.

### Development rule from now on

When adding new functionality, avoid introducing new The House-specific assumptions into reusable core logic where reasonably possible.

Prefer generic concepts such as:

- property configuration;
- room configuration;
- timezone/service-hours configuration;
- role/recipient configuration;
- integration configuration;
- branding/message variables;
- local-knowledge configuration.

Do not perform a broad platform refactor inside narrow production fixes. Production stability remains the priority. Instead, make each new narrow feature structurally reusable when possible and document existing hard-coded dependencies for a later deliberate white-label/platformization phase.

### Latest change portability assessment

The key-box reset-activity deletion feature **does not add new The House-specific business assumptions**. It operates on generic rotation-event IDs/event types behind the existing authenticated Admin boundary. This preserves future white-label portability.

For an initial commercial product, separate white-label deployments per property remain compatible with the current architecture. True multi-property SaaS will later require an explicit `propertyId`/tenant boundary and centralized property configuration.

## 7. PROFESSIONAL HANDOFF DISCIPLINE — PERMANENT REQUIREMENT

After **every development/release/change**, create or update a professional handoff that records at minimum:

- authoritative baseline;
- exact requested scope;
- exact files changed;
- behavior changed;
- behavior explicitly preserved/non-scope;
- security/privacy invariants;
- regression tests and validation results;
- deployment/external integration steps;
- known limitations;
- commercialization/white-label impact;
- next recommended action.

This requirement must itself be carried forward into every future handoff.

## 8. NEXT DEPLOYMENT / SMOKE TEST

After local dry-run passes and the Worker is deployed:

1. open Owner Admin;
2. locate **Recent key-box reset activity**;
3. delete one harmless historical controlled-test/reset entry;
4. confirm only that card disappears after overview reload;
5. confirm **Key-box codes requiring rotation** is unchanged;
6. confirm no guest lost-key flow is triggered or unlocked by the deletion;
7. do not use a live guest's current unresolved rotation requirement as the deletion test.

No Apps Script update is required specifically for this Admin-history deletion enhancement if the already-deployed v5.11.45 Airbnb `Code.gs` is unchanged.
