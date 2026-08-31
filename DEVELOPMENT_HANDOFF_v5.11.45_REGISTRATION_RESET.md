# THE HOUSE – KOH TAO
## Development Handoff — v5.11.45 Admin Pending In-Person Registration Reset

## Authoritative baseline

This correction is developed directly from:

`The-House-Koh-Tao-v5.11.45-keybox-activity-delete-ready-to-push.zip`

The active release number remains **v5.11.45**. This is a narrow corrective build and does not rebase onto the abandoned/unstable passport-detail branches.

## Production problem reproduced

Owner testing on an active Room 5 reservation selected:

- foreign/mixed stay;
- 3 non-Thai overnight guests;
- all passports to be provided in person.

That correctly put the reservation into `in_person_pending`, but Owner Admin then exposed only:

`Confirm in-person registration complete`

There was no safe owner-only way to cancel an accidental/test in-person choice and return the reservation to the initial guest-registration decision screen.

For a real incoming guest, confirming completion would be false because the three passports had not actually been checked.

## Scope of this correction

Add one owner-only reset action for a **pending in-person registration with zero received passport submissions**.

No guest-facing registration rule, passport rule, Concierge behavior or unrelated workflow is changed.

## Implemented behavior

When a reservation is exactly:

- `registrationStatus = in_person_pending`; and
- zero passport submissions have actually been received;

Owner Admin now shows two actions:

1. `Confirm in-person registration complete`
2. `Reset guest registration`

`Reset guest registration` requires an explicit browser confirmation and then:

- closes any still-pending unused passport upload links for that reservation;
- removes the pending registration requirement row for that reservation;
- resets its registration status to `not_started`;
- leaves the verified stay/session intact;
- keeps protected room access locked until the guest completes registration again.

After reset, the guest returns to the existing initial registration decision flow and can make the appropriate registration choice again.

## Safety boundary

This is deliberately **not** a general registration eraser.

Reset is rejected when:

- the registration is not `in_person_pending`;
- one or more passport submissions have actually been received;
- the in-person registration is already `in_person_complete`.

The reset therefore cannot be used to erase received passport evidence or undo a completed in-person registration through this convenience action.

No uploaded passport object is deleted by this new action. Existing passport retention/deletion controls remain authoritative.

## Files changed

Runtime code:

- `public/concierge-admin.js`
  - adds the owner-only `Reset guest registration` action beside the existing completion action when status is `in_person_pending`;
  - adds the confirmation and protected admin API call.

- `src/concierge-api.js`
  - delegates the new protected admin registration-reset route to the existing stay-admin handler.

- `src/stay-api.js`
  - adds `/api/concierge/admin/registration-reset`;
  - requires existing admin authorization through `handleAdminRequest`;
  - validates reservation ID and explicit confirmation;
  - invokes only the safe pending-in-person reset operation.

- `src/concierge-store.js`
  - adds `resetPendingInPersonRegistration(...)`;
  - verifies exact pending status and zero received evidence;
  - closes unused pending links;
  - returns the reservation registration state to `not_started`.

Tests:

- `tests/concierge.test.mjs`
  - verifies unauthorized reset is rejected;
  - verifies a 3-person pending in-person test state can be reset;
  - verifies guest registration returns to `not_started` and remains access-locked;
  - verifies the guest can select registration again after reset;
  - verifies reset is blocked after passport evidence exists;
  - verifies reset is blocked after in-person completion;
  - verifies Admin exposes the reset action only with the pending in-person action block.

Documentation:

- this handoff.

## Explicitly unchanged

No changes were made to:

- Thai-only registration exemption;
- non-Thai guest-count rules;
- guest nationality selection;
- secure passport image upload;
- camera/photo-library/file passport picker;
- passport retention/deletion lifecycle;
- guest-facing registration wording;
- AI Concierge messaging or routing;
- chat usability/layout;
- pest recognition and pest alerts;
- Airbnb 5-minute fast sync or hourly reconciliation;
- Room 7 Airbnb exclusion;
- Meta template mappings or Received/Resolved lifecycle;
- stay-extension workflow;
- cleaning workflow;
- emergency routing;
- lost-key release/rotation protections;
- key-box reset-activity delete behavior;
- Explore flag or local-guide behavior.

## Validation

Completed on the working source:

- `npm test`: **222 passed / 0 failed**;
- JavaScript/MJS syntax: **36 files clean**;
- `airbnb-sync/Code.gs` syntax: clean through a temporary `.js` copy;
- JSON parsing: **12 files clean**;
- `wrangler.jsonc`: parses successfully;
- package version remains **5.11.45**;
- `EXPLORE_ENABLED=false` preserved.

The runtime diff from the prior v5.11.45 key-box-activity-delete build is limited to:

- `public/concierge-admin.js`
- `src/concierge-api.js`
- `src/concierge-store.js`
- `src/stay-api.js`
- `tests/concierge.test.mjs`

plus this handoff document.

## Deployment / immediate Room 5 recovery

After deploying this build:

1. Open Owner Admin.
2. Locate the Room 5 reservation showing `Guest registration: in person pending`.
3. Click `Reset guest registration`.
4. Confirm the reset.
5. Refresh/reopen the guest's permanent Room 5 page if necessary.
6. The verified guest should again see the normal initial registration decision flow instead of being locked into the prior 3-passport in-person test choice.
7. Do **not** click `Confirm in-person registration complete` unless all required original passports have actually been checked and the required registration work is complete.

## Commercialization / white-label architecture requirement

This project is intended to remain suitable for eventual sale/adaptation to other hospitality businesses.

This correction preserves that direction:

- the new core API/store capability is reservation-state based and does not introduce new The House-specific business logic;
- the admin label is generic (`Reset guest registration`);
- no property-specific room, brand, fee, timezone or contact assumption is added by this feature.

Standing architecture rule for all future development:

- avoid introducing new The House-specific assumptions into core logic where reasonably possible;
- keep operational/business-specific data suitable for later centralized property configuration;
- distinguish the current one-property/white-label deployment architecture from a future true multi-property SaaS architecture;
- when the production workflows are mature, perform a deliberate platformization/white-label abstraction phase so The House becomes Property #1 on the generic platform without changing its behavior.

## Standing development discipline

After every future development/change, produce a professional handoff documenting:

- authoritative baseline;
- exact scope;
- root cause / reason for change;
- files changed;
- behavior changed and explicitly preserved;
- regression coverage and validation;
- deployment/post-deployment steps;
- known limitations;
- commercialization/white-label architecture impact;
- next recommended action.
