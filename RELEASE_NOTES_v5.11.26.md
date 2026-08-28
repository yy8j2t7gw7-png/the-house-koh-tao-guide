# Release Notes v5.11.26

## Outcome

v5.11.26 is complete as a functional diving-model, mixed-party booking and owner-cleanup release built directly on deployed v5.11.25. It does not begin the public visual redesign; full visual polish moves to v5.11.27.

Production Meta mappings, languages, BODY parameter counts/order, routes, recipients, secrets, webhooks and quick-action state are unchanged. `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remains required.

## Diving course model

The course catalog is bundled at `public/data/diving-courses.json` and consumed through `src/diving-catalog.js`. Each record carries an agency, code, display label, stage, current-certification-question flag, professional/specialty flags and natural aliases.

Implemented pathways:

- PADI: Scuba Diver, Open Water Diver, Advanced Open Water Diver, Rescue Diver, Specialty Course, Divemaster, Assistant Instructor and Instructor Development Course (IDC), including the AI/OWSI components.
- SSI: Scuba Diver, Open Water Diver, current Advanced Open Water Diver, Diver Stress & Rescue, Specialty Course, Dive Guide, Divemaster, Assistant Instructor, Instructor Training Course (ITC) and Instructor Evaluation (IE).
- RAID: Scuba Diver, Open Water/Open Water 20, Explorer 30, Advanced 35, Master Rescue, Specialty Course, Divemaster and Instructor Development Program (IDP), including independent evaluation/Open Circuit Instructor progression.

SSI Advanced Adventurer is not presented as the current normal pathway. No RAID Assistant Instructor course is invented. “RAID advanced” remains unresolved until the guest chooses Explorer 30 or Advanced 35.

The first diving choice is now Fun Diving, Try Diving, Learn/Take a Course, Professional Training or Not Sure. Specialties use a compact common list plus Other Specialty and Technical/Extended Range free text. Not Sure asks whether the guest is certified and what they want to achieve, then suggests an appropriate booking category without claiming eligibility; the dive operator still verifies the suitable course and prerequisites.

## RAID and Roctopus recommendation policy

Every relevant diving recommendation now pairs both owner-approved points:

- recommend RAID because of its focus on dive safety and buoyancy control;
- recommend Roctopus Dive as The House’s preferred RAID dive centre.

Fun Diving, RAID and no-agency-preference paths may naturally recommend Roctopus. Explicit PADI or SSI choices remain valid, but the copy states accurately that Roctopus offers RAID training and that the booking team will check an appropriate provider. A named alternate provider remains a preference only; availability is never promised.

## Mixed-diver state design

`src/concierge-api.js` holds one authoritative booking with:

- preferred start/diving date;
- total participant count;
- `same` or `different` plan mode;
- progressive participant groups containing count, activity, agency, course, relevant current certification, specialty, provider preference and safe notes;
- one international reply contact collected at the end.

For split parties, every group count must be a positive integer, may not exceed the remaining party and must sum exactly to the total. One request creates one alert, not one alert per diver.

`src/whatsapp-alerts.js` independently validates the group structure. `concierge_alert_details` stores the complete non-sensitive breakdown, while the unchanged six-parameter `house_booking_alert_v2` receives a concise summary through the v5.11.25 Meta-safe whitespace and 900-character boundary. Safe retry snapshots preserve `planMode` and groups in `booking_retry_group_details`; raw contacts remain transient and are never stored.

## Owner cleanup controls

Maintenance lifecycle:

- open/acknowledged report → **Resolve**;
- resolved report → **Remove** after deliberate custom-dialog confirmation;
- any remaining private R2 photo is deleted successfully before the report row is removed;
- a storage failure leaves the report intact;
- counts reload immediately and unrelated reports are untouched.

WhatsApp diagnostic lifecycle:

- **Dismiss** hides one failed-delivery diagnostic without changing its parent alert or accepted/failed delivery history;
- **Clear diagnostics** hides all failures for one alert only after that alert is resolved;
- minimal audit rows retain only a non-sensitive reference, action, Bangkok timestamp and canonical creation time.

The implementation uses `whatsapp_diagnostic_dismissals` and `admin_operation_audit`; protected values, raw Meta payloads, contacts and key-box codes are not copied into cleanup audit data.

## Files changed from v5.11.25

Implementation and data:

- `public/concierge-admin.css`
- `public/concierge-admin.html`
- `public/concierge-admin.js`
- `public/data/diving-courses.json` (new)
- `public/data/concierge-knowledge.json`
- `src/concierge-api.js`
- `src/concierge-store.js`
- `src/diving-catalog.js` (new)
- `src/maintenance-api.js`
- `src/whatsapp-alerts.js`
- `tests/concierge.test.mjs`

Release/runtime metadata:

- `package.json`
- `package-lock.json`
- `public/ai-concierge-config.js`
- `public/data/activities.json`
- `public/i18n.js`
- `public/module-registry.js`

Documentation:

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

## Tests added

Six end-to-end regression tests expand the complete suite from 157 to 163 tests:

1. exact current PADI/SSI/RAID catalog, aliases, exclusions and RAID/Roctopus guidance;
2. seven single-diver paths—Fun Diving, PADI Open Water, SSI Advanced Open Water, RAID Explorer 30, PADI Divemaster, SSI ITC and RAID IDP—plus certified and uncertified Not Sure category guidance;
3. exact three-person mixed booking with Fun Diving, PADI Open Water and SSI Advanced Open Water, one contact, one alert, three recipients and six contact-last BODY parameters;
4. four people split into two Fun Divers and two RAID Explorer 30 participants, including zero/over-allocation rejection;
5. maintenance Resolve/Remove, protected photo deletion, counts/reload and unrelated-report isolation;
6. diagnostic Dismiss/Clear with unchanged alert/delivery truth and value-free audit evidence.

The complete suite passes 163/163 with zero failures.

## Deployment

Extract `The-House-Koh-Tao-v5.11.26-ready-to-push.zip` and deploy to the existing Worker:

```sh
npm install
npx wrangler deploy
```

Do not change the six production template names, language mappings, BODY schemas, recipients, routes, secrets, webhook settings, `SPARE_KEY_CODES` or `WHATSAPP_STAFF_ACTIONS_ENABLED=false`. The Durable Object initializes the additive tables automatically.

## One-step production booking smoke test

Create one fresh non-sensitive three-person mixed diving request, complete it with one international contact, and confirm exactly one booking alert, three WhatsApp attempts, at least one accepted delivery, the compact subgroup breakdown in the received message and the normal pending-booking guest confirmation. If Meta rejects it, retain the new sanitized diagnostic and stop; do not guess.

## Next planned milestone

v5.11.27 — full visual polish.
