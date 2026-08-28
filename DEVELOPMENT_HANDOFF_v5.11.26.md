# Development Handoff v5.11.26

## Authoritative checkpoint

v5.11.26 is complete and was built directly on the deployed, production-passed v5.11.25 archive. Preserve both release archives. Do not reconstruct completed v5.11.19–v5.11.26 work from the older pushed v5.11.18 Git baseline.

The public visual redesign remains out of scope and moves to v5.11.27.

## Diving implementation

The authoritative catalog is `public/data/diving-courses.json`; matching, validation, course lists and summaries are centralized in `src/diving-catalog.js`. It contains current PADI, SSI and RAID beginner, continuing, specialty and professional pathways. Do not reintroduce SSI Advanced Adventurer as the normal current option or invent RAID Assistant Instructor.

The House recommendation policy is explicit: recommend RAID because of its focus on dive safety and buoyancy control and recommend Roctopus Dive as the preferred RAID centre. PADI/SSI requests remain valid, but Roctopus must not be presented as issuing those certifications. Named alternate providers are preferences, never availability promises.

`applyDivingBookingPolicy()` in `src/concierge-api.js` owns progressive collection. One booking holds a total count and participant groups. Same-plan parties use one full-count group; split parties add groups until the positive counts equal the total exactly. Certification is mandatory for Fun Diving, omitted for beginner courses and requested only where useful for continuing/professional training. Not Sure collects certification status plus the guest’s goal and suggests a relevant category without claiming eligibility. Exact Yes/No answers remain bound to that active collector while genuine safety messages retain priority. One international contact remains last.

`validateStructuredBooking()` in `src/whatsapp-alerts.js` independently checks every group and allocation. `divingBookingSummary()` produces the complete non-sensitive breakdown. `concierge_alert_details` retains that full detail; `templateValues()` sends a concise version through the unchanged `house_booking_alert_v2`, `en`, six-BODY, contact-last serializer. Retry snapshots preserve safe `planMode`/groups in `booking_retry_group_details` and remain bound to the original verified reservation, room, session and alert ID.

## Owner cleanup implementation

- `src/maintenance-api.js`: `/maintenance-resolve` and resolved-only `/maintenance-remove`; removal deletes the private photo object first and fails closed on storage errors.
- `src/concierge-store.js`: maintenance lifecycle, diagnostic dismissal/clear, full alert details, subgroup retry details and minimal admin audit tables.
- `src/concierge-api.js`: authenticated diagnostic endpoints with exact confirmation phrases and actor hashing.
- `public/concierge-admin.*`: obvious Resolve/Remove and Dismiss/Clear controls using the custom `<dialog>` confirmation component.

Diagnostic visibility remains independent from parent alert status and provider delivery evidence. Individual dismissal never marks a request delivered; clear-all is available only after resolution. Audit rows contain a minimal action/reference, Bangkok timestamp and canonical creation time, with no contact, parameter, token, raw payload, private photo or key-box code.

## Preserved production boundaries

- v5.11.25 common Meta BODY whitespace normalization and 900-character limit;
- `house_booking_alert_v2`, language `en`, exactly six ordered BODY parameters and `booking_with_owners`;
- Fah plus Owner 1 plus Owner 2 routing and contact-last protected delivery;
- success only after at least one provider message ID is accepted;
- exact-alert explicit retry, accepted-delivery suppression and unrelated-intent routing;
- contact redaction and contact-free stored state;
- 24/7 request-bound lost-key fee acceptance, notification-before-code and rotation lock;
- all passport, property, cleaning, emergency and Airbnb safeguards;
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.

## Files changed from v5.11.25

- `AI_CONCIERGE_OPERATIONS.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `DEVELOPMENT_GUIDELINES.md`
- `DEVELOPMENT_HANDOFF_v5.11.26.md`
- `MAINTENANCE_REPORTING_OPERATIONS.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.26.md`
- `ROADMAP.md`
- `SECURE_24_HOUR_LOST_KEY_ACCESS.md`
- `WHATSAPP_ALERT_OPERATIONS.md`
- `WORK_HANDOVER_PROMPT.md`
- `package-lock.json`
- `package.json`
- `public/ai-concierge-config.js`
- `public/concierge-admin.css`
- `public/concierge-admin.html`
- `public/concierge-admin.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/i18n.js`
- `public/module-registry.js`
- `src/concierge-api.js`
- `src/concierge-store.js`
- `src/diving-catalog.js`
- `src/maintenance-api.js`
- `src/whatsapp-alerts.js`
- `tests/concierge.test.mjs`

## Tests and validation

Six v5.11.26 regressions cover the current catalog and excluded names, seven single-diver pathways, the exact three-person mixed party, a four-person Fun/RAID split with allocation rejection, the maintenance/photo lifecycle and independent diagnostic visibility. The complete suite contains 163 tests and passes with zero failures.

Release validation covers JavaScript syntax, Apps Script syntax, JSON parsing, version consistency, secret/contact/key-code scans, Git integrity, Worker dry run, ZIP CRC, exact source/archive manifest comparison and a complete independently extracted ZIP test run.

## Production deployment

1. Extract `The-House-Koh-Tao-v5.11.26-ready-to-push.zip`.
2. Run `npm install` and `npx wrangler deploy`.
3. Do not change Meta names, languages, BODY counts/order, routes, recipients, secrets, webhook settings, emergency routing, passport/Airbnb configuration or `SPARE_KEY_CODES`.
4. Keep `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.
5. The additive Durable Object tables initialize on deployment; no destructive migration is required.

## Very short production smoke test

Create one fresh non-sensitive three-person mixed diving booking and complete it. Confirm one alert record, three attempts, at least one accepted delivery, one compact subgroup message and the natural pending-booking confirmation. Then dismiss one old failed diagnostic and verify its parent delivery counts do not change.

## Next planned milestone

v5.11.27 — full visual polish. The lost-key page’s repeated “500 THB” wording may be simplified visually in that release without weakening explicit acceptance. Stop after v5.11.26; do not begin visual work automatically.

## Suggested commit

Title:

`Release v5.11.26: add mixed-diver course model and owner cleanup`

Description:

`Add current data-driven PADI/SSI/RAID course pathways, exact mixed-party diving groups, paired RAID/Roctopus guidance, maintenance/photo cleanup and independent WhatsApp diagnostic controls while preserving all Meta, retry, privacy and 24/7 lost-key safeguards; 163 tests pass.`
