# THE HOUSE – KOH TAO
## Development Handoff — v5.11.45 direct-stay verification-code regeneration

## 1. Authoritative baseline

This correction starts from the latest v5.11.45 verified-arrival-access build:

- Room 7 is guide-enabled for direct testing but remains excluded from Airbnb synchronization.
- Owner Admin direct-stay creation is routed correctly.
- Verified-but-registration-pending guests receive arrival/find-room access only; normal operational/service alerts remain behind completed guest registration.
- Guest registration remains Thai-only exemption or secure passport image upload; in-person registration remains an Owner Admin exception.
- Pest-recognition, Meta action templates, Airbnb five-minute fast sync, key-box reset-history deletion and all other established v5.11.45 behavior remain authoritative.

Do not rebase this correction onto the abandoned v5.11.44 passport/manual-details branch.

## 2. Production problem

Direct/walk-in stays intentionally generate a readable private stay verification code only once. The database stores only the HMAC hash and never stores the readable code.

After the Owner Admin page was refreshed, an owner who had not copied the code could no longer recover it. This is expected cryptographically, but there was no owner-safe recovery action for the operational case where the code was lost before being shared.

## 3. Implemented correction

Owner Admin direct/walk-in reservation cards now expose:

**Generate new stay code**

The action:

1. is available only for confirmed reservations whose provider is `direct`;
2. requires the authenticated Owner Admin boundary and an explicit confirmation;
3. generates a new random `HS...` stay code using the existing direct-stay code generator;
4. HMAC-hashes the new code immediately using `STAY_TOKEN_PEPPER`;
5. replaces only the reservation's stored confirmation-code hash;
6. returns the readable replacement code once to Owner Admin;
7. displays it in the existing one-time direct-stay access-details panel together with the permanent Room URL;
8. invalidates the forgotten previous code immediately;
9. leaves already-created verified stay sessions valid so an already-verified guest is not unexpectedly logged out.

The readable replacement code is never written to Durable Object storage, ordinary logs, diagnostics, Concierge history, learning data, documentation or test fixtures.

## 4. Security boundary

This is deliberately regeneration, not recovery.

The old readable code cannot be shown again because it is not stored. The system does not weaken that property.

The replacement endpoint refuses:

- Airbnb reservations;
- manual Airbnb-recovery reservations;
- missing reservations;
- non-confirmed reservations;
- requests without explicit owner confirmation.

Only the hash changes. Reservation dates, room, registration state, passport evidence, verified sessions, stay extension state and all operational history remain unchanged.

## 5. Files changed

Runtime:

- `src/concierge-store.js`
  - adds the narrow direct-reservation hash-replacement store method.
- `src/stay-api.js`
  - adds Owner Admin `POST /api/concierge/admin/direct-stay-code`.
- `src/concierge-api.js`
  - routes the new authenticated Admin path into the existing stay Admin handler.
- `public/concierge-admin.js`
  - adds the direct-reservation-only **Generate new stay code** action and reuses the existing one-time code/result panel.

Regression coverage:

- `tests/concierge.test.mjs`

Documentation:

- this handoff.

No guest-facing HTML, guest-guide copy, Concierge answer text, i18n data, Airbnb Apps Script, Meta templates, passport UI, room data, room images or CSS were changed.

## 6. Regression coverage

New tests prove:

- replacement code has the normal private direct-stay format;
- replacement code differs from the original;
- plaintext is not stored;
- old code no longer verifies after regeneration;
- replacement code verifies successfully;
- an already-verified guest session remains valid after regeneration;
- the real Owner Admin router reaches the operation;
- Airbnb reservations are refused;
- Owner Admin contains the direct-stay-only regeneration action.

Full automated suite after the change:

**231 passed / 0 failed**

Additional validation:

- JavaScript/MJS syntax: **36 files passed**;
- `airbnb-sync/Code.gs` syntax: passed;
- JSON: **12 files passed**;
- `wrangler.jsonc`: parsed successfully.

## 7. Deployment / smoke test

No Google Apps Script update is required.

After normal Worker deployment:

1. open Owner Admin;
2. find a direct/walk-in stay such as the Room 7 test stay;
3. press **Generate new stay code**;
4. confirm the warning;
5. verify a new `HS...` code appears in the existing access-details panel;
6. copy/share the replacement code as needed;
7. verify the replacement code opens the correct permanent Room page;
8. optionally verify any remembered older code is rejected.

Do not use an Airbnb stay for this smoke test; Airbnb continues to use its Airbnb HM confirmation code.

## 8. Explicit non-scope

This correction does not change:

- Airbnb Gmail/iCal synchronization;
- Room 7 Airbnb exclusion;
- stay dates or extension logic;
- verified-arrival-access permissions;
- guest registration rules;
- passport upload/in-person Admin exception;
- Concierge behavior or messaging;
- service-alert registration gates;
- lost-key/key-box behavior;
- pest recognition;
- WhatsApp/Meta template behavior;
- emergency handling;
- cleaning, luggage or booking workflows;
- Explore configuration.

Separate known item: successful passport image uploads currently update secure registration state but do **not** send an owner WhatsApp notification. That remains a separate future decision and is not changed here.

## 9. Commercialization / white-label architecture requirement

Standing project rule: the system is intended for eventual sale/adaptation to other hospitality businesses.

Continue to avoid adding new property-specific assumptions to core logic where reasonably possible. This correction follows that rule: the backend operation is based on the generic `direct` reservation provider and reservation ID, not Room 7 or The House-specific branching. The newly added Admin action uses generic **Generate new stay code** wording.

Current architecture remains suitable for one-property / isolated white-label deployments. A later deliberate platformization phase should centralize property-specific branding, rooms, timezone, policies, fees, contacts, booking integrations and local content into property configuration before multi-property SaaS deployment.

Every future development must end with a professional handoff and carry this commercialization requirement forward.

## 10. Next recommended action

Deploy and smoke-test the direct-stay code regeneration with the Room 7 test reservation. Then continue production testing without widening this release.
