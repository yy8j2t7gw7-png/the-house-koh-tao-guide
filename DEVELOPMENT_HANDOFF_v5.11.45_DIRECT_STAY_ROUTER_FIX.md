# THE HOUSE – KOH TAO
## Development Handoff — v5.11.45 Room 7 direct-stay Admin router fix

### Authoritative baseline
This correction starts from `The-House-Koh-Tao-v5.11.45-room7-guide-direct-test-ready-to-push.zip`, the latest Room 7 guide/direct-test build.

### Production failure reproduced from code path
Owner Admin displayed Room 7 in **Direct bookings and walk-ins**, but submitting a valid Room 7 stay (including 31 Aug 2026 through 5 Sep 2026) failed with the generic message: `The direct stay could not be created. Check the room and dates.`

The `/api/concierge/admin/direct-stays` implementation in `src/stay-api.js` was already correct and accepted Room 7. The defect was one layer above it: `handleAdminRequest()` in `src/concierge-api.js` routed `/stays`, `/stay-extension`, `/in-person-registration`, `/registration-reset`, and `/spare-key-rotation` into `handleStayAdminRequest()`, but did not route `/direct-stays`.

Therefore production requests to `/api/concierge/admin/direct-stays` never reached the already-correct direct-stay handler. Earlier Room 7 tests called `handleStayAdminRequest()` directly and therefore did not catch the missing real Admin-router branch.

### Exact change
`src/concierge-api.js`
- add `/direct-stays` to the existing stay-admin routing condition;
- no other Admin route behavior changed.

`tests/concierge.test.mjs`
- add a regression that submits a Room 7 direct stay through the real exported `handleAdminRequest()` router with dates `2026-08-31` → `2026-09-05`;
- require HTTP 200, a one-time `HS...` code, `/room/7` welcome URL, provider `direct`, and listing marker `house-direct-7`.

### Preserved behavior
No changes to:
- Room 7 Airbnb exclusion;
- Airbnb Gmail/iCal sync or Apps Script;
- guest-guide content or room wording/images;
- Concierge usability, routing, or messaging;
- guest registration, Thai-only exemption, passport upload, or Admin in-person exception;
- passport retention/security;
- Meta templates or alert routing;
- pest handling;
- lost-key, key-box, cleaning, luggage, booking, emergency, or maintenance workflows;
- `EXPLORE_ENABLED=false`.

### Passport-upload alert inspection
A separate source inspection during this correction confirmed that a successful passport upload currently:
1. stores the image in private `PASSPORT_UPLOADS` storage;
2. consumes the single-use upload session;
3. updates the registration requirement through `markRegistrationFromPassport()`;
4. increments `receivedPassports` and may set `passport_complete`.

It currently does **not** call `createProtectedOperationsAlert()` / `dispatchConciergeAlert()` or otherwise send a WhatsApp notification to owners when an image is uploaded.

This was not changed in this release because the owner had not yet authorized adding a new passport-upload alert. Treat that as a separate narrow follow-up if desired.

### Validation
- Full automated suite: **225 passed / 0 failed**.
- New regression exercises the real Admin router rather than directly calling the nested stay handler.
- Exact Room 7 range `2026-08-31` → `2026-09-05` succeeds in the corrected route.

### Deployment
Normal Worker/GitHub deployment only.

**No Google Apps Script update is required** because `airbnb-sync/Code.gs` is unchanged.

After deployment:
1. open Owner Admin;
2. choose Room 7 under **Direct bookings and walk-ins**;
3. select a valid range such as 31 Aug 2026 → 5 Sep 2026;
4. click **Create direct stay**;
5. confirm a one-time `HS...` House stay code and `/room/7` permanent link are shown;
6. use that code on Room 7 for guide testing.

### Commercialization / architecture rule
Continue treating the system as a reusable hospitality platform rather than adding unnecessary The House-specific behavior to core logic. The current deployment remains a one-property / white-label architecture; a future platformization phase should centralize property-specific branding, rooms, timezone, hours, fees, contacts, booking integrations, and local recommendations for eventual sale/adaptation to other hospitality businesses. The Room 7 design continues the useful separation between **property rooms** and **Airbnb-enabled rooms**.

### Next recommended action
After confirming Room 7 direct-stay creation in production, decide separately whether successful passport uploads should create a protected owner notification. If implemented, keep that alert property-generic and privacy-safe: operational metadata only, never the passport image or passport data in WhatsApp/chat/logs.
