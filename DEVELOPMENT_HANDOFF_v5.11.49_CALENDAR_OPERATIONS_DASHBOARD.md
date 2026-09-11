# THE HOUSE – KOH TAO
## Development Handoff — v5.11.49 Calendar & Operations Dashboard

### Authoritative baseline

This release is built directly on the ready-to-push v5.11.48 reversible guest-type-selection package. v5.11.47 and v5.11.48 remain separate deployable releases and should be pushed in order before v5.11.49.

### Owner requirement

Add a practical owner-facing Calendar & Operations Dashboard without changing unrelated guest, reservation, registration, WhatsApp, finance or security behavior. The dashboard must use the same authoritative stay data already used by the Concierge and stay-verification system, including Airbnb, direct/walk-in, manual reservations and effective owner extensions.

### Exact scope

The House Owner Admin now opens with a new **Calendar & Operations** section before the existing Guest stays section. It is an operational overview only; existing write controls remain in their established sections.

The new dashboard contains:

1. **Today's summary**
   - arrivals today;
   - departures today;
   - open housekeeping tasks, including a priority count when early check-in has been requested;
   - rooms currently marked `ready`.

2. **Rooms today — Rooms 1–11**
   - turnover / arrival / checkout / in-house / vacant context;
   - reservation source (`Airbnb`, `Manual Airbnb`, or `Direct / walk-in`);
   - guest first name when already available in protected admin reservation data;
   - scheduled checkout time, including an approved late-checkout time;
   - same-day arrival context;
   - current housekeeping `dirty / clean / ready / unknown` state;
   - current housekeeping-task state and early-check-in priority context.

3. **Housekeeping today**
   - today's turnover tasks;
   - room;
   - checkout time;
   - requested early-arrival time when present;
   - task state;
   - priority indication.

4. **14-day room calendar**
   - all 11 rooms;
   - confirmed reservations across all current providers;
   - compact `IN`, `STAY`, and `OUT` markers;
   - same-day `OUT` + `IN` turnover in one cell;
   - approved late-checkout time shown on the departure marker.

### Reservation authority

The dashboard does not create a second reservation model. It reads from the existing confirmed `stay_reservations` records and effective checkout overrides. Direct/walk-in/manual stays and owner extensions therefore appear alongside synchronized Airbnb stays automatically.

The admin overview query now also exposes existing late-checkout approval metadata (`lateCheckoutMinutes`, `lateCheckoutTime`, fee and approval timestamp) so the owner dashboard can show the correct departure time. No new guest-facing field or write endpoint is introduced.

### Deliberately preserved

No intentional change is made to:

- v5.11.48 reversible Thai-only / foreign-mixed guest-type selection;
- passport/Thai-ID/TM30 collection, evidence retention or registration security;
- v5.11.47 housekeeping task creation, WhatsApp template/actions or `dirty / clean / ready` state transitions;
- early-check-in and late-checkout policy or Concierge wording;
- 2:00 PM late-checkout maximum, 200 THB fee acceptance, or 3:00 PM incoming-arrival rule;
- Airbnb sync, Gmail parsing, listing mappings or Room 7 Airbnb exclusion;
- direct/manual stay creation, overlap checks, deletion or extension behavior;
- lost-key/spare-key security;
- maintenance, towels, cleaning requests, luggage, booking or emergency workflows;
- The House Finance or Bamboo Finance;
- Meta templates, recipients, credentials, webhooks, secrets, cron schedules or Google Apps Script.

### Files changed

Runtime / UI:
- `src/concierge-store.js`
- `public/concierge-admin.html`
- `public/concierge-admin.js`
- `public/concierge-admin.css`

Validation:
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
- `DEVELOPMENT_HANDOFF_v5.11.49_CALENDAR_OPERATIONS_DASHBOARD.md`
- `RELEASE_NOTES_v5.11.49.md`
- `CHANGELOG.md`

### Validation completed in the hosted environment

- Full automated regression suite: **271 passed / 0 failed**.
- JavaScript/MJS syntax validation: **43 files passed**.
- `airbnb-sync/Code.gs` passed JavaScript syntax checking through an unchanged temporary `.js` copy.
- JSON/JSONC parsing: **13 files passed**.
- No successful Wrangler deploy dry-run is claimed from this hosted environment.

### Deployment order

Push/deploy in order:

1. v5.11.47
2. v5.11.48
3. v5.11.49

Do not skip directly from v5.11.46 to v5.11.49 because v5.11.49 is built on the preceding releases.

### Production checks

1. Open The House Admin and confirm **Calendar & Operations** appears above Guest stays.
2. Confirm all Rooms 1–11 appear in **Rooms today**.
3. Confirm today's Airbnb and direct/manual stays appear with correct arrival/departure context.
4. Confirm an owner extension changes the displayed effective stay end date/calendar occupancy.
5. Confirm an approved late checkout shows its real checkout time on today's room card and calendar departure marker.
6. Confirm a priority early-check-in housekeeping task appears as priority with the requested arrival time.
7. Confirm existing Guest stays forms/actions, housekeeping override controls, registration, alerts and Finance remain unchanged.

### Next phase

After v5.11.49, the next larger architectural phase remains the provider-independent / multi-channel reservation model. It should be designed as its own release rather than folded into this dashboard.
