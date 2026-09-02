# THE HOUSE – KOH TAO
## DEVELOPMENT HANDOFF — v5.11.45 THAI ID VERIFICATION + TM30 TRACKING

**Release type:** Narrow guest-registration / Owner Admin operations correction  
**Authoritative baseline:** `The-House-Koh-Tao-v5.11.45-finance-management-ready-to-push.zip`  
**Scope rule:** No unrelated guest, Concierge, reservation, Finance, Airbnb, Meta, lost-key, maintenance, emergency, housekeeping, pest, or room behavior was intentionally changed.

---

## 1. PURPOSE

This release closes two production registration gaps:

1. Owner Admin could securely download or delete an uploaded foreign passport, but had no operational way to record that the passport had already been processed for TM30.
2. A guest could select the Thai-only nationality path and previously complete registration without providing any identity evidence. This allowed a non-Thai guest to incorrectly select the Thai-only path and bypass the foreign-passport requirement.

The release therefore adds:

- owner-only **TM30 registered / undo TM30 registered** tracking for uploaded foreign passports; and
- a requirement for **one secure Thai ID-card image** whenever a reservation is declared Thai-only.

---

## 2. FINAL REGISTRATION MODEL

### Foreign or mixed group

Existing behavior is preserved:

- guest verifies the stay;
- declares the number of non-Thai overnight guests;
- uploads one passport image for each non-Thai overnight guest through the private one-time document flow;
- full registered guest access opens only when the required foreign-passport count has been received.

New in this release:

- Owner Admin can mark each uploaded **foreign passport** as `TM30 registered`;
- the marker stores a timestamp;
- the owner can undo the marker if it was set accidentally.

### Thai-only reservation

New behavior:

- selecting **All overnight guests are Thai nationals** no longer completes registration immediately;
- the reservation moves to `thai_id_pending`;
- the guest must upload **one clear Thai ID-card image** through a private one-time secure upload;
- registration moves to `thai_id_complete` only after that upload succeeds;
- only then does the normal fully registered guest-access gate open.

The Thai ID is **not** treated as a foreign passport and is **not** marked for TM30.

### Legacy compatibility

The historical registration status `thai_exempt` remains in the complete-status set so previously completed Thai registrations are not broken or unexpectedly locked out after deployment.

**New Thai-only declarations do not create `thai_exempt`.** They use `thai_id_pending` -> `thai_id_complete`.

---

## 3. OWNER ADMIN — TM30 TRACKING

The passport area is now presented as **Guest identity documents & TM30 tracking**.

For an uploaded foreign passport, Owner Admin now shows:

- document type: Foreign passport;
- secure download;
- upload/storage metadata already available before this release;
- TM30 status;
- **Mark TM30 registered** action when unmarked;
- **Undo TM30 registered** when already marked;
- existing Delete action.

For an uploaded Thai ID card, Owner Admin shows:

- document type: Thai ID card;
- secure download;
- existing deletion controls;
- **TM30 not applicable**;
- no TM30 registration action.

The TM30 timestamp is an **owner-entered operational processing marker only**. It does not contact Immigration, query an Immigration API, or constitute independent proof that Immigration accepted a TM30 filing.

Admin audit entries are written when the marker is set or cleared.

---

## 4. THAI ID SECURITY AND PRIVACY

Thai ID images deliberately reuse the hardened private identity-document pipeline rather than creating a public upload mechanism.

Security properties:

- one-time secure upload token;
- token tied to the verified reservation/room;
- separate document type: `thai_id`;
- separate object prefix: `thai-id/`;
- private Cloudflare R2 binding already used for identity documents;
- no public object URL;
- not sent through AI Concierge;
- not sent through WhatsApp;
- not inserted into normal Concierge interactions or learning data;
- same short automatic retention policy as passports: no later than the configured passport-document retention period (currently maximum 14 days), or sooner when deleted after processing;
- owner-only secure download/delete.

The Privacy Policy now explicitly discloses Thai ID processing and retention.

### Important limitation

This release requires an image but does **not** perform OCR, facial comparison, nationality verification, or authenticity validation of the Thai ID card. It closes the zero-evidence bypass and gives the owner evidence to review, but a deliberately false or unrelated image is not automatically detected.

A future document-validation feature should be a separate, deliberately scoped release if required.

---

## 5. ACCESS / SERVICE GATES

Existing registration gates remain intact.

While Thai ID registration is pending:

- verified arrival access remains available according to the existing limited-arrival-access rules;
- full guest guide remains locked;
- normal operational/service requests remain subject to the existing full-registration gate;
- existing emergency behavior is unchanged;
- existing lost-key protected behavior is unchanged.

After `thai_id_complete`, the reservation is treated as fully registered in the same access boundary that already recognizes completed passport/in-person registration.

---

## 6. DATA MODEL CHANGES

`passport_uploads` gains backward-compatible columns:

- `document_type TEXT NOT NULL DEFAULT 'passport'`
- `tm30_registered_at TEXT NOT NULL DEFAULT ''`

The Durable Object initialization includes guarded `ALTER TABLE` migrations for existing deployments.

Existing passport rows therefore default safely to `passport`.

Passport counting for foreign registration is explicitly scoped to `document_type='passport'`, so Thai ID evidence cannot satisfy a foreign-passport requirement.

Thai ID requests are limited independently to one identity image per Thai-only registration.

---

## 7. API CHANGES

### New guest route

`POST /api/stay/thai-id-link`

Purpose:

- creates the one-time secure Thai-ID upload link only for a verified Thai-only reservation in the appropriate pending state.

### Existing nationality route

Thai-only selection now produces `thai_id_pending` rather than immediate full exemption/completion.

### Identity upload session/completion

The secure upload pipeline now carries `documentType` (`passport` or `thai_id`) and stores the object under the appropriate private prefix.

### New owner-admin route

`POST /api/concierge/admin/passport-tm30`

Payload:

- identity document id;
- `registered: true|false`.

Rules:

- protected by the existing Owner Admin authorization boundary;
- applies only to successfully uploaded foreign passport documents;
- rejects Thai ID documents as `tm30_not_applicable`;
- writes an audit event.

---

## 8. USER-FACING WORDING CORRECTIONS

Registration wording was changed only where necessary to express the new rule accurately.

The guest experience now consistently explains:

- Thai-only stays do not need a passport for the TM30 foreign-passport flow;
- one Thai ID-card image is nevertheless required to confirm the Thai-only declaration;
- mixed/foreign groups must use the foreign flow and submit one passport per non-Thai overnight guest.

Reviewed multilingual registration strings were updated accordingly.

The Concierge's registration-pending fallback and approved registration knowledge were also corrected so no fallback path tells a Thai-only guest that nationality selection alone completes access.

---

## 9. FILES CHANGED FROM THE AUTHORITATIVE FINANCE BASELINE

Runtime / UI / policy:

- `src/concierge-store.js`
- `src/passport-api.js`
- `src/stay-api.js`
- `src/concierge-api.js`
- `public/room-access.html`
- `public/registration-entry.js`
- `public/passport-upload.html`
- `public/passport-upload.js`
- `public/concierge-admin.html`
- `public/concierge-admin.js`
- `public/ai-concierge.js`
- `public/ai-concierge-config.js`
- `public/data/concierge-knowledge.json`
- `public/index.html`
- `public/house.html`
- `public/modules/house/house.html`
- `public/i18n.js`
- `public/privacy.html`
- `public/terms.html`

Tests:

- `tests/concierge.test.mjs`

Documentation added:

- `DEVELOPMENT_HANDOFF_v5.11.45_THAI_ID_TM30_TRACKING.md`

---

## 10. BEHAVIOR DELIBERATELY PRESERVED

No intentional change was made to:

- Finance / Income / Expense Management;
- Airbnb Gmail fast sync;
- Airbnb iCal reconciliation;
- `airbnb-sync/Code.gs`;
- Airbnb room/listing mappings;
- Room 7 Airbnb exclusion;
- direct/walk-in stay creation;
- House stay-code regeneration;
- Meta WhatsApp template mappings;
- staff alert routing;
- Concierge service workflows;
- housekeeping/towel workflows;
- luggage workflows;
- booking workflows;
- maintenance reporting;
- emergency routing;
- lost-key fee, notification, authorization, code-release, or rotation logic;
- pest routing;
- room photographs/location guidance;
- guest-arrival access permissions outside the registration status change;
- passport-upload alerts (not part of this release).

`airbnb-sync/Code.gs`, `package.json`, and `package-lock.json` were byte-for-byte unchanged from the Finance baseline during validation.

---

## 11. REGRESSION COVERAGE ADDED

Dedicated regressions verify:

1. **Thai-only stays require one secure Thai ID image before full guest access opens**
   - Thai declaration -> `thai_id_pending`;
   - access remains locked;
   - one-time Thai ID link created;
   - session identifies `documentType=thai_id`;
   - successful image upload uses private `thai-id/` storage prefix;
   - registration -> `thai_id_complete`;
   - full access opens only afterward.

2. **Owner Admin can mark foreign passports TM30 registered but never Thai ID evidence**
   - foreign passport can be marked;
   - timestamp and audit are recorded;
   - Thai ID mark attempt is rejected;
   - foreign passport marker can be undone and audited.

3. **Registration/Admin UI exposes Thai ID verification and TM30 controls only in the registration module**
   - verifies the intended Owner Admin and guest registration surfaces without bleeding the functionality into unrelated modules.

Existing tests that previously used the Thai declaration only as a shortcut to create a fully registered test guest were updated to complete the new Thai-ID flow first. This preserves the semantics of the service/booking/maintenance/Room 7 regressions rather than weakening their registration assumptions.

---

## 12. VALIDATION

Completed on the final working tree:

- `npm test` -> **243 / 243 passed**
- final clean ZIP fresh extraction `npm test` -> **243 / 243 passed**
- JS/MJS + `airbnb-sync/Code.gs` syntax validation -> passed
- JSON files -> passed
- `wrangler.jsonc` parse validation -> passed
- `airbnb-sync/Code.gs` comparison against Finance baseline -> unchanged
- `package.json` comparison against Finance baseline -> unchanged
- `package-lock.json` comparison against Finance baseline -> unchanged
- ZIP integrity / forbidden-entry hygiene -> passed
- working-tree vs fresh-extraction hashes -> **275 / 275 files identical**

### Wrangler dry-run

Do **not** claim `npx wrangler deploy --dry-run` success unless it is actually executed successfully in the deployment environment. Previous clean dependency installation attempts in this environment have repeatedly stalled on external registry resolution.

Recommended local pre-push validation remains:

```bash
npm ci
npm test
npx wrangler deploy --dry-run
```

---

## 13. DEPLOYMENT NOTES

This is a Worker/source release only.

- Deploy the Worker/package normally after local pre-deployment validation.
- Existing Durable Object storage is migrated in-place by guarded schema additions.
- No manual database reset is required.
- Do **not** create a new Airbnb Apps Script project.
- `airbnb-sync/Code.gs` is unchanged, so the existing Google Apps Script does **not** need updating for this release.
- No new Meta template is required for this release.

After deployment, recommended smoke tests:

1. Create/use a test stay and select Thai-only.
2. Confirm the private/full guide stays locked and Thai ID upload is requested.
3. Upload a test Thai ID-like image through the private test flow.
4. Confirm registration becomes complete and full access opens.
5. Confirm Owner Admin shows the document as `Thai ID card` and `TM30 not applicable`.
6. Use a foreign test passport record and confirm `Mark TM30 registered` and `Undo TM30 registered` work.
7. Confirm TM30 marking does not delete/download/change the passport file itself.
8. Smoke-test one existing foreign passport registration.
9. Smoke-test Finance/Admin loading.
10. Smoke-test one existing Concierge service workflow with a fully registered test guest.

Never use real identity-document images for a development smoke test when synthetic/test imagery is sufficient.

---

## 14. REQUIRED NEXT RELEASE — PASSPORT UPLOAD WHATSAPP ALERTS

This remains intentionally **outside this release**.

Next requested release:

- after a foreign passport upload succeeds **and registration progress has been committed**, send an operational WhatsApp alert to **Fah + both owners**;
- create/use a dedicated appropriate Meta template;
- message may contain only operational metadata such as room, upload/progress count, timestamp/reference;
- example: `Passport received — Room 5 — 1 of 3 received`;
- never send the passport image, passport number, name, DOB, nationality, gender, or other identity-document content through WhatsApp;
- a failed upload/storage/registration commit must never generate a false received alert.

Whether Thai-ID uploads should receive a separate operational notification should be decided explicitly in that release rather than silently inheriting passport-alert behavior.

---

## 15. COMMERCIAL / WHITE-LABEL ARCHITECTURE NOTE

This change follows the platform direction rather than creating a The House-only identity shortcut:

- identity evidence has an explicit `documentType` rather than assuming every document is a passport;
- registration completion is represented by explicit states;
- TM30 processing status is separate from document storage;
- UI behavior is driven from document type/status;
- the secure identity-document pipeline can later be generalized into a property/market-specific compliance module.

Current names such as `passport_uploads`, `PASSPORT_UPLOADS`, and some The House/TM30 wording remain legacy deployment structures and should **not** be globally renamed during a narrow production correction. During the deliberate platformization phase, the compliance module should move toward generic property configuration and country-specific registration rules while preserving The House as Property #1.

---

## 16. RELEASE DECISION

The final clean ZIP has passed fresh-extraction testing, syntax / JSON validation, package/source hash comparison and ZIP hygiene checks. The release is appropriate to push after the deployer completes any locally required Wrangler dry-run / dependency validation.

