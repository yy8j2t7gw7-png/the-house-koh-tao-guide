# THE HOUSE – KOH TAO
## Development Handoff — v5.11.45 Guest Upload-Only + Always-Available Owner In-Person Exception

### 1. Authoritative baseline

Start from the latest **v5.11.45 admin-registration-reset build**. This correction remains within v5.11.45 and does not rebase onto the discarded unstable passport branches.

The production intent remains the stable v5.11.42 behavioral base plus the already accepted v5.11.45 fixes: Airbnb fast sync, approved Meta staff action templates, removal of manual passport-detail entry, camera/photo/file passport picker, broad pest recognition, deletable key-box reset history, and safe admin registration reset.

### 2. Exact owner requirement implemented

Guest self-service no longer offers **Provide passports in person**.

Guest registration paths are now only:

1. **All overnight guests are Thai** → Thai exemption, no passport upload.
2. **Foreign or mixed group** → declare the complete number of non-Thai overnight guests → secure passport image upload, one private single-use form per required non-Thai guest.

The guest-side `/api/stay/in-person-passports` path is disabled and returns `404`, so removing the visible button is not merely cosmetic.

Owner Admin retains the in-person route as an authenticated exception. The **Use in-person registration** action is available from reservation operations even before the guest has declared nationality or a non-Thai guest count. When starting it, the owner enters the number of non-Thai overnight guests from **1 to 10**.

Existing `in_person_pending` records continue to show:
- **Confirm in-person registration complete**;
- **Reset guest registration**.

Existing `in_person_complete` records remain complete and unchanged.

### 3. Safety boundary

The Owner Admin start action is authenticated and server-enforced.

It may create an `in_person_pending` requirement from a confirmed reservation even when registration is currently `not_started` or Thai-only, because this is a staff correction/exception path.

It must not overwrite real evidence. Starting the exception is blocked when:
- one or more passport uploads have actually been received;
- registration is already `passport_complete`;
- registration is already `in_person_complete`.

When safely started:
- guest type becomes foreign for that registration requirement;
- required passport count becomes the owner-supplied count;
- received passport count remains 0;
- status becomes `in_person_pending`;
- unused pending upload links for that reservation are closed;
- private room access remains locked until the owner completes the in-person check/TM30 registration.

The existing safe reset remains limited to pending in-person states with zero received passport evidence.

### 4. Runtime files changed from the previous v5.11.45 admin-reset baseline

- `public/room-access.html` — removes the guest-facing in-person choice and makes the visible non-Thai path upload-only.
- `public/registration-entry.js` — removes the guest action/listener for selecting in-person registration while preserving rendering of admin-created historical/pending in-person states.
- `public/i18n.js` — removes obsolete guest-facing in-person-choice strings and keeps necessary state text for admin-created pending records.
- `public/index.html` — removes public guidance telling guests they can choose in-person verification.
- `public/data/concierge-knowledge.json` — Concierge guidance directs guests to secure upload and to contact the team for assistance rather than advertising an in-person self-service choice.
- `public/concierge-admin.js` — exposes the owner-only in-person exception before guest nationality/count declaration and collects the required non-Thai count (1–10).
- `src/stay-api.js` — disables the guest in-person endpoint and adds the authenticated owner-start API contract with explicit non-Thai count.
- `src/concierge-store.js` — adds a property-generic `startInPersonRegistration(...)` store operation with evidence/completion guards.
- `tests/concierge.test.mjs` — adds/updates regression coverage for guest removal, pre-declaration admin start, authentication, completion, reset and evidence protection.

Documentation updated only to reflect this exact registration-policy change.

### 5. Explicitly preserved behavior

Do not change or reinterpret these items in follow-up work unless separately authorized:

- Thai-only declaration remains available to guests.
- Non-Thai overnight guest count remains mandatory and includes every non-Thai adult and child, not only the Airbnb booker.
- Secure passport image upload remains private, reservation/room-bound, expiring and single-use.
- Passport image retention/deletion remains unchanged.
- Camera/photo-library/file selection remains unchanged.
- No guest-facing manual passport-data entry exists.
- Existing Owner Admin in-person confirmation and safe reset remain.
- Airbnb five-minute email fast sync, hourly iCal reconciliation and 24-hour cancellation-safe audit remain unchanged.
- Meta template mappings and Received/Resolved button behavior remain unchanged; internal second command remains `RESOLVE`.
- Concierge usability, chat routing, human routing, booking, luggage, cleaning, pest, emergency, lost-key, key-box and Explore behavior remain unchanged.

### 6. Validation

Full automated suite: **223 passed / 0 failed**.

Specific regression coverage includes:
- guest in-person API returns `404`;
- guest page contains no **Provide passports in person** control;
- Thai-only route remains present;
- secure upload remains present;
- authenticated Owner Admin can start in-person registration from a fresh verified reservation before any nationality/count declaration;
- Owner Admin supplies the non-Thai count and the same count becomes the required passport count;
- guest access remains locked while `in_person_pending`;
- owner completion opens access;
- owner reset returns a zero-evidence pending state to `not_started`;
- received passport evidence and completed registration cannot be overwritten by the owner-start exception.

JavaScript/MJS syntax and JSON/JSONC validation should be rerun on every packaged candidate. Wrangler dry-run is not claimed unless successfully run in an environment with Wrangler installed.

### 7. Deployment

This correction is Worker/static-source only.

There is **no Airbnb Apps Script change** in this correction. Do not replace or reinstall `airbnb-sync/Code.gs` solely for this passport change.

Before deployment locally:
1. `npm ci`
2. `npm test`
3. `npx wrangler deploy --dry-run`
4. push/deploy only if all checks pass

After deployment smoke-test with fictional/test data:
1. Open a verified reservation before nationality has been selected.
2. Confirm guests see Thai-only + foreign/non-Thai count, but no in-person choice.
3. Confirm foreign path provides secure upload only.
4. In Owner Admin, confirm **Use in-person registration** is visible before guest count declaration.
5. Start it with a test count such as 3 and confirm status becomes `in_person_pending`, required passports = 3.
6. Confirm **Confirm in-person registration complete** and **Reset guest registration** remain available.
7. Reset the test state and confirm the guest can start registration normally again.

### 8. Commercialization / white-label architecture rule

This remains a standing requirement for every future development and handoff.

The product is intended to remain modular and reusable for eventual sale/adaptation to other hospitality businesses. Avoid introducing new The House-specific assumptions into core logic where reasonably possible. This change follows that rule: `startInPersonRegistration(...)` is property-generic and does not encode The House-specific room numbers, brand names, fees or local policies.

Current architecture is still best understood as **one property / one white-label deployment**. A future deliberate platformization phase should introduce first-class property/tenant configuration and move property-specific branding, rooms, timezone, operating hours, fees, contacts, Airbnb mappings and local recommendations out of core logic. Do not perform that broad refactor during narrow production fixes.

### 9. Next recommended action

Deploy only after local dry-run, then smoke-test the guest upload-only path and the always-available Owner Admin in-person exception with fictional data. After confirmation, treat this package as the new authoritative v5.11.45 baseline for subsequent narrow fixes.
