# THE HOUSE – KOH TAO
## Development Handoff — v5.11.45 Passport Owner Alerts + TM30 Actions — Final Meta-Aligned Contract

### Authoritative baseline

This is the consolidated unpushed v5.11.45 line and supersedes earlier passport-alert ZIPs.

Final Meta alignment is authoritative:

- `house_registration_admin_alert_v1` = **1 BODY variable + Received**;
- `house_registration_admin_alert_actions_v1` = **2 BODY variables + Received / TM30 uploaded**.

### Implemented behavior

#### Immediate foreign-passport upload alert

After a linked foreign passport image is successfully stored and registration progress is successfully saved, the Worker sends a privacy-safe WhatsApp notification to both configured owners.

The action template receives only:

- room number;
- received/required progress text.

It never sends passport image/content, passport number, guest name, nationality, DOB, gender, guest phone, booking code or upload token.

The alert is durably linked server-side to the exact passport record before dispatch.

#### Immediate alert buttons

`Received`

- acknowledges the exact alert only;
- does not mark TM30 complete.

`TM30 uploaded`

- is owner-authorized server-side;
- follows the durable alert-to-passport mapping;
- marks that exact passport TM30 registered in Owner Admin;
- resolves the alert;
- prevents that passport from becoming due for the 24-hour TM30 reminder.

#### Check-in-day 20:00 reminder

At/after 20:00 Bangkok time on check-in day, owners receive one reminder if required foreign-passport registration is incomplete.

Examples:

- `Room 8: No passports have been uploaded yet. 2 passports are still missing. Please check with the guest.`
- `Room 5: 1 of 2 passports has been uploaded. 1 passport is still missing. Please check with the guest.`

Once all required passports are received, no reminder is sent. Thai-ID and owner-managed in-person states are excluded.

The reminder uses the one-variable template and has one `Received` button.

#### 24-hour TM30 reminder

Each stored foreign passport becomes due once it is at least 24 hours old and still has no TM30-registered timestamp.

Example:

`Room 11: The passport was uploaded more than 24 hours ago and is still not marked as TM30 registered. Please complete the TM30 registration.`

The reminder uses the one-variable template and has one `Received` button. The reminder is per passport and does not repeat after successful owner delivery.

### Owner-only routing

All three registration alert types route to the derived `owners` group backed by the existing configured owner recipients. Fah and Su are not recipients of these passport/TM30 alerts.

### Changed files

- `src/passport-api.js` — dispatch remains after successful storage + saved registration progress.
- `src/registration-alerts.js` — human-readable immediate, 20:00 and TM30 reminder messages.
- `src/whatsapp-alerts.js` — exact one-variable/one-button reminder schema, exact two-variable/two-button immediate schema, exact-passport TM30 action.
- `src/concierge-store.js` — durable alert-to-passport links and reminder state from the prior passport-alert implementation remain in place.
- `src/index.js` — hourly reminder processing remains in place.
- `wrangler.jsonc` — both registration templates and hourly cron remain mapped.
- `tests/concierge.test.mjs` — final Meta contract, buttons, routing, reminder and exact-passport action regressions.
- `META_REGISTRATION_ALERTS_v5.11.45.md` — exact final Meta setup.

### Behavior explicitly preserved

No intended change to Bamboo Finance, Admin dashboard selector, The House Finance, Airbnb sync/Apps Script, Concierge routing, lost-key, Thai-ID registration, private passport retention/storage, maintenance, emergency, luggage, booking, cleaning, Room 7/direct stays, Explore flag or other existing Meta alert templates.

### Validation

- Full suite before packaging: **257 passed / 0 failed**.
- JavaScript syntax validation passed.
- JSON / `wrangler.jsonc` validation passed.
- Final ZIP is re-extracted and the full suite is rerun before release handoff.
- Wrangler dry-run is not claimed in this hosted environment; run locally before deployment.

### Deployment

Both Meta templates must be Active/Approved with the exact final structures in `META_REGISTRATION_ALERTS_v5.11.45.md` before live smoke testing.

No new Cloudflare secret is required for this Meta alignment.

### Commercialization / white-label note

The template serializer now supports explicit one-button and two-button contracts per template rather than assuming every interactive template has the same structure. This is reusable for future property-specific template sets. True multi-property isolation still requires later tenant/property abstraction.
