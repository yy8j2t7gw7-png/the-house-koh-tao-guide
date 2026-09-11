# THE HOUSE – KOH TAO
## Development Handoff — v5.11.48 Reversible Guest-Type Selection

### Authoritative baseline

This release is built directly on the ready-to-push v5.11.47 housekeeping-room-status package. It is intentionally isolated so v5.11.47 can be deployed first and v5.11.48 can follow as a separate production release.

### Owner requirement

A guest can accidentally choose **Thai nationals only** when the stay actually contains foreign guests, or choose **Foreign guest(s)** when the stay is Thai-only. Previously the chosen registration branch could become effectively irreversible in guest self-service.

Approved guest-facing wording:

**Selected the wrong guest type? Change selection**

### Exact behavior

1. The change-selection control appears only on an incomplete self-service registration branch where no registration evidence has been uploaded.
2. It works in both directions:
   - Thai-only → foreign/mixed;
   - foreign/mixed → Thai-only.
3. The verified stay session is preserved. The guest does not verify the reservation again.
4. The current pending registration requirement is reset to `not_started`.
5. Every unused pending passport or Thai-ID upload link attached to the abandoned branch is invalidated before the guest selects again.
6. The guest returns to the existing **Who is staying overnight?** choice and chooses the correct branch normally.
7. Once any passport or Thai-ID evidence has been uploaded, guest self-service reset is blocked and staff review is required.
8. `in_person_pending`, `in_person_complete`, `passport_complete` and `thai_id_complete` are not guest-resettable.

### Security / privacy boundary

This release does not delete uploaded evidence through guest self-service and does not permit guest-side rewriting of completed registration/TM30 state. It only discards unused pending upload links and an evidence-free pending branch.

The new guest endpoint remains behind the existing verified, room-bound stay session and same-origin protection:

`POST /api/stay/registration-selection-reset`

No passport/Thai-ID data is exposed through the endpoint or Concierge.

### Files changed

Runtime / UI:
- `src/stay-api.js`
- `src/concierge-store.js`
- `public/registration-entry.js`
- `public/room-access.html`

Project rule / validation:
- `PROJECT_RULES.md`
- `tests/concierge.test.mjs`

Release metadata:
- `package.json`
- `package-lock.json`
- `src/concierge-api.js`
- `public/i18n.js`
- `public/ai-concierge-config.js`
- `public/data/concierge-knowledge.json`
- `public/data/activities.json`
- `public/module-registry.js`

Documentation:
- `DEVELOPMENT_HANDOFF_v5.11.48_REVERSIBLE_GUEST_TYPE_SELECTION.md`
- `RELEASE_NOTES_v5.11.48.md`
- `CHANGELOG.md`

### Deliberately preserved

No intentional change is made to:
- v5.11.47 housekeeping `dirty / clean / ready` logic or Meta housekeeping actions;
- early check-in, late checkout, 200 THB fee, 2:00 PM limit or incoming 3:00 PM wording;
- passport/Thai-ID upload security, 14-day retention or TM30 owner processing;
- stay verification, lost-key security or key-box rotation;
- Airbnb synchronization, direct/manual/walk-in stays or extensions;
- WhatsApp templates, recipients, credentials or webhook verification;
- The House Finance or Bamboo Finance;
- maintenance, luggage, booking, towel, cleaning-request or emergency workflows.

### Required production checks after deployment

1. Verified guest selects Thai-only, then clicks **Selected the wrong guest type? Change selection** before uploading Thai ID — original unused Thai-ID link is no longer usable and the guest can choose foreign/mixed.
2. Verified guest selects foreign/mixed, then changes selection before uploading any passport — original unused passport link is no longer usable and the guest can choose Thai-only.
3. Stay verification remains active throughout both corrections.
4. After one foreign passport has been uploaded, the change-selection control is no longer offered and the reset endpoint refuses the switch.
5. Completed Thai-ID/passport registration and staff in-person registration remain non-resettable by the guest.

### Next development phase

After v5.11.48, continue directly into the separate v5.11.49 Calendar & Operations Dashboard release. Do not merge the dashboard into this registration-state release.
