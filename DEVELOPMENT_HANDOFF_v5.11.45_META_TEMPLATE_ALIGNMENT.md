# THE HOUSE – KOH TAO
## Development Handoff — v5.11.45 Meta Registration Template Alignment

### Authoritative baseline

Built on the consolidated unpushed candidate:

`The-House-Koh-Tao-v5.11.45-passport-owner-alerts-tm30-actions-ready-to-push.zip`

This release supersedes that ZIP for deployment because the Meta templates were subsequently created with a simpler approved structure.

### Exact scope

The Worker has been aligned to the two Meta templates actually created by the owner:

1. `house_registration_admin_alert_v1`
   - English `en`;
   - **1 BODY variable**;
   - **1 quick-reply button: Received**;
   - used for 20:00 incomplete-registration reminders and 24-hour TM30 reminders.

2. `house_registration_admin_alert_actions_v1`
   - English `en`;
   - **2 BODY variables**;
   - **2 quick-reply buttons: Received / TM30 uploaded**;
   - used only for immediate foreign-passport upload notifications.

### Runtime message shape

Reminder template variable `{{1}}` contains one natural operational sentence including room and status, for example:

`Room 5: 1 of 2 passports has been uploaded. 1 passport is still missing. Please check with the guest.`

Immediate passport template:

- `{{1}}` = room number only;
- `{{2}}` = non-sensitive progress text such as `1 of 2 required passports has been uploaded.`

The immediate alert no longer sends an upload reference or alert reference in the BODY.

### Quick-action behavior

- Reminder `Received` acknowledges the reminder alert only.
- Immediate `Received` acknowledges the passport-received alert only.
- Immediate `TM30 uploaded` follows the server-side alert-to-passport mapping, marks the exact linked passport TM30 registered in Owner Admin, then resolves the alert.
- Unauthorized/non-owner recipients cannot perform the TM30 mutation.

### Privacy preserved

WhatsApp still receives no passport image, passport number, guest name, nationality, DOB, gender, guest phone, booking code, upload token or other identity-document content.

### Changed files

- `src/whatsapp-alerts.js`
  - registration reminder schema changed from 5 BODY variables to 1;
  - reminder template now emits one `Received` quick reply;
  - passport-received action schema changed from 5 BODY variables to 2;
  - quick-action builder now supports one-button and two-button template contracts without changing existing service/booking/luggage/urgent/lost-key templates.
- `src/registration-alerts.js`
  - simplified human-readable reminder wording;
  - simplified immediate upload progress wording;
  - removed non-sensitive upload-reference text from WhatsApp BODY content because it is no longer required by the approved template.
- `tests/concierge.test.mjs`
  - updated exact parameter counts/order;
  - asserts reminder `Received` button;
  - asserts immediate `Received / TM30 uploaded` buttons;
  - preserves exact-passport TM30 mutation, owner authorization, partial 20:00 reminder and 24-hour reminder coverage.
- `META_REGISTRATION_ALERTS_v5.11.45.md`
  - rewritten to match the actual Meta templates.

### Behavior explicitly preserved

No intended behavior change to:

- passport private storage or 14-day retention;
- Thai-ID registration;
- Owner Admin manual TM30 controls;
- alert-to-passport linkage/security;
- owner-only recipient routing;
- 20:00 Bangkok reminder timing;
- 24-hour TM30 reminder timing;
- Bamboo Finance owner/staff permissions;
- Admin dashboard selector;
- The House Finance;
- Airbnb email/iCal synchronization or Apps Script;
- Concierge routing/content;
- lost-key, maintenance, emergency, luggage, booking or service alert workflows;
- existing Meta action templates for other alert types.

### Validation

- Full automated suite: **257 passed / 0 failed** before packaging.
- JavaScript syntax checks passed for the changed runtime modules.
- Final ZIP is re-extracted and the complete suite is rerun before handoff.
- Wrangler dry-run is not claimed from this hosted environment; run `npx wrangler deploy --dry-run` locally before deployment.

### Deployment requirement

Both Meta templates must be Active/Approved with the exact final structures above before live WhatsApp smoke testing.

No new Cloudflare secret is introduced by this alignment release.

### Commercialization / white-label note

The template serializer now supports explicit per-template BODY/button contracts rather than assuming all interactive templates have two quick replies. This is reusable for future property-specific Meta template sets. The current recipient/store namespace remains The House single-property infrastructure pending later tenant/property abstraction.
