# THE HOUSE – KOH TAO
## Development Handoff — v5.11.46 Reservation-Aware Stay Operations

### Authoritative baseline

This release is built on the deployed v5.11.45 Meta-registration-template-aligned production line. The WhatsApp billing interruption observed on 7 Sep 2026 was an external Meta billing-eligibility issue and is not changed by this source release.

### Exact scope

v5.11.46 is intentionally narrow. It adds reservation-aware early/late stay requests and owner safeguards for manually added stays:

1. Late checkout uses the verified reservation's checkout date instead of asking the guest for it again.
2. Once the guest supplies the requested checkout time, the request is converted into a structured operational alert and sent through the existing service-alert WhatsApp route.
3. The guest is told that the request was sent only after at least one WhatsApp delivery is accepted. If delivery is not accepted, the Concierge states that the request could not be sent automatically.
4. Early check-in uses the verified reservation's check-in date and checks same-room turnover context.
5. If another guest checks out from the same room on the arrival date, the Concierge explains that housekeeping must prepare the room first.
6. If no same-day departure is recorded, the Concierge still requires team confirmation because there is not yet a live housekeeping room-ready status.
7. Direct/manual stay creation now rejects true date overlaps in the same room while preserving valid same-day checkout-to-check-in turnover.
8. Owner stay extension refuses to extend a stay through a later confirmed arrival in the same room.
9. Owner Admin can delete owner-managed `direct` or `manual` stays. Synchronized Airbnb stays remain protected.
10. Deleting an owner-managed stay revokes its verified guest sessions, closes unused pending passport links, removes checkout overrides, and records an owner audit event.

### Production finding fixed

The late-checkout exchange seen in Room 7 was previously handled as ordinary Concierge dialogue. The model asked for a checkout date already present in the verified reservation and could produce wording that sounded like a request had been submitted without a protected operational-alert transaction. v5.11.46 moves early/late stay requests into deterministic structured workflows before ordinary AI routing.

### Files changed

Runtime / UI:
- `src/concierge-api.js`
- `src/alert-policy.js`
- `src/concierge-store.js`
- `src/stay-api.js`
- `src/whatsapp-alerts.js`
- `public/concierge-admin.js`

Release metadata:
- `package.json`
- `package-lock.json`
- `public/i18n.js`
- `public/ai-concierge-config.js`
- `public/data/concierge-knowledge.json`
- `public/data/activities.json`
- `public/module-registry.js`

Validation:
- `tests/concierge.test.mjs`

Documentation:
- `DEVELOPMENT_HANDOFF_v5.11.46_RESERVATION_AWARE_STAY_OPERATIONS.md`
- `RELEASE_NOTES_v5.11.46.md`
- `CHANGELOG.md`

### Behavior preserved

This release does **not** change:
- passport/Thai-ID/TM30 registration rules or privacy handling;
- the two approved registration Meta templates;
- fresh-towel, cleaning, luggage, booking, urgent or lost-key workflows;
- Bamboo Finance roles, passwords, reporting or data isolation;
- The House Finance behavior;
- Airbnb Apps Script parsing, five-minute email sync, hourly calendar reconciliation or full audit behavior;
- Room 7 Airbnb exclusion;
- routine contact hours;
- lost-key fee, notification, rotation and key-box protections;
- existing WhatsApp credentials, recipient configuration or Meta webhook signing.

### WhatsApp behavior

No new Meta template is required. Early check-in and late checkout use the existing service-alert route and existing service template configuration. The protected request summary contains room/date/time and same-day turnover context only; no passport or sensitive identity data is added.

### Reservation overlap rule

Intervals are treated as `[check-in date, check-out date)`. Therefore:
- Stay A: 1 Sep → 3 Sep
- Stay B: 3 Sep → 5 Sep

is valid turnover and is **not** an overlap.

A stay beginning before the existing checkout and ending after the existing check-in is rejected with `room_date_conflict`.

### Manual-stay deletion boundary

Owner Admin exposes **Delete manually added stay** only for `direct` and `manual` provider records. The backend independently enforces the same rule; hiding the UI is not the security boundary. Airbnb provider records return `owner_managed_stay_required` and are not changed.

### Validation completed in the hosted environment

- Full automated regression suite: **265 passed / 0 failed**.
- JavaScript/MJS syntax validation: **42 files passed** before final release metadata update; final package is revalidated after packaging.
- JSON parsing: **12 JSON files passed** before final packaging.
- `wrangler.jsonc` parsed successfully.
- `airbnb-sync/Code.gs` passed JavaScript syntax checking; it is unchanged in this release.

The hosted environment does not have Wrangler installed locally and external npm resolution is not reliable, so a Wrangler dry-run is **not claimed** here.

### Local validation / deployment

In the real GitHub project folder on the Mac:

```bash
npm ci
npm test
npx wrangler deploy --dry-run
```

If all pass, commit/push through the normal production workflow. If `npm ci` creates a large local dependency list in GitHub Desktop, remove generated folders before committing:

```bash
rm -rf node_modules
rm -rf .wrangler
git status --short
```

There are no new Cloudflare secrets, bindings, cron schedules, Meta templates or Google Apps Script deployment steps for v5.11.46.

### Required post-deployment checks

1. Verified guest asks `Can I check out later?` — Concierge states the known scheduled checkout date and asks only for requested time.
2. Guest replies `5pm` — one stay-support alert is created and WhatsApp is sent through the existing service route.
3. If WhatsApp is unavailable, the guest must **not** be told the request was sent.
4. Verified future guest asks for early check-in — Concierge uses the known arrival date and reports whether a same-day room departure exists.
5. Attempt to add a Room 7 direct stay overlapping an existing Room 7 confirmed stay — Admin must reject it.
6. Create a same-day turnover stay beginning on the previous stay's checkout date — Admin must allow it.
7. Delete a deliberately created Room 7 direct test stay — the stay should disappear from active operations and its verified guest session should stop working.
8. Confirm an Airbnb reservation has no manual-delete control and cannot be deleted through the endpoint.

### Known limitation / next step

The Concierge now knows reservation turnover, but there is not yet a live housekeeping `clean / dirty / ready` room-status engine. Therefore an apparently vacant room is not automatically promised as ready for early check-in. A later housekeeping-status layer can safely allow automatic `room ready` answers once staff-confirmed readiness exists.

### Commercialization / white-label note

The new logic is reservation/provider based rather than hard-coded to Airbnb-only guest dialogue. Overlap checks, turnover context and owner-managed deletion are reusable primitives for the planned generic reservation model. True multi-property SaaS still requires a deliberate tenant/property boundary in a later platformization phase.
