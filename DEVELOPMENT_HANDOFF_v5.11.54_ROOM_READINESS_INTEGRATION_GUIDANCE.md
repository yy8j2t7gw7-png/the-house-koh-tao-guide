# THE HOUSE – KOH TAO
## Development Handoff — v5.11.54 Room Readiness & Integration Guidance

### Authoritative baseline

Built directly on v5.11.53 Integrations Dashboard. v5.11.54 is an incremental production release and preserves The House's existing live reservation sources and operational behavior.

### Exact scope

This release is deliberately narrow:

1. put Dirty / Clean / Ready controls directly on Calendar & Operations room cards;
2. keep the older dedicated housekeeping controls as fallback;
3. resolve the misleading stale-Ready edge case exposed when an owner-managed test stay is deleted;
4. replace internal guest-facing readiness wording with natural hotel language;
5. expand the Integrations dashboard with major provider slots and actionable connection guidance;
6. do not activate any new booking platform.

### Room-card housekeeping controls

`public/concierge-admin.js` reuses the existing protected room-housekeeping write endpoint for controls rendered directly on each Operations room card. The dedicated room-status section remains available and uses the same handler.

No separate write path is introduced, so the server-side room validation, allowed status values and owner-authentication boundary remain authoritative.

### Ready-state consistency

The reported production/test edge case was:

- a room had previously been set Ready;
- an owner-managed test stay was then deleted;
- the reservation context changed, but the old room Ready record could remain visually present while the Concierge correctly refused to apply it to the changed arrival context.

v5.11.54 makes that transition explicit:

- deleting an owner-managed stay invalidates a current `ready` status for that room and records an audit event;
- Owner Admin may then deliberately set the room Ready again for the current operational context;
- an Owner Admin Ready action clears stale turnover/task identifiers and is treated as an explicit trusted owner confirmation by early-check-in readiness logic.

This does not permit guests to change housekeeping status and does not weaken occupancy/overlap protections.

### WhatsApp boundary

This release does **not** broaden owner WhatsApp notifications:

- Su continues to receive the existing turnover housekeeping task.
- Su tapping **Received** remains a staff acknowledgement only.
- Su tapping **Room ready** continues to notify configured owners through the existing `house_alert_status_v1` route implemented previously.
- Manual Owner Admin Dirty / Clean / Ready changes update operational state but do not send a redundant WhatsApp notification to the owners who made the change.

No new Meta template is required.

### Guest-facing early-check-in wording

Internal expressions such as **"marked ready"** are removed from guest replies. The Concierge now uses natural wording, for example:

> Your room still needs to be prepared before check-in.

The existing early-check-in policy remains unchanged: housekeeping/occupancy context controls whether early arrival can be confirmed; otherwise the guest is told that early check-in cannot be guaranteed and should not be expected before 12:00 PM when the room still needs turnover preparation.

### Integration catalog

`src/integration-catalog.js` now advertises these owner-facing sources/slots:

- Airbnb — current House synchronized source when configured;
- Direct / Walk-in — built in;
- Booking.com;
- Agoda;
- Hostelworld;
- Expedia Group (Expedia, Hotels.com, Vrbo, Orbitz, Travelocity);
- Trip.com;
- Other PMS / API.

External provider cards remain read-only product architecture slots. Each external card includes:

- `connectorStatus: not_installed`;
- disabled connector-required Connect state;
- property-owner setup steps;
- software/connectivity-provider implementation steps;
- links to official provider onboarding/developer information.

### Official provider references surfaced in Admin

- Booking.com Connectivity: `https://developers.booking.com/connectivity/docs`
- Booking.com Connectivity Developer Portal: `https://developers.booking.com/connectivity/home`
- Agoda Tech Partner onboarding: `https://developer.agoda.com/supply/docs/how-to-become-a-partner`
- Agoda Supply API: `https://developer.agoda.com/supply`
- Hostelworld Property Manager: `https://business.hostelworld.com/en/createaccount`
- Hostelworld Partner API reference: `https://hpa-partner-api.hostelworld.com/`
- Expedia Group Connectivity Hub: `https://developers.expediagroup.com/supply/lodging`
- Expedia Group lodging API overview: `https://developers.expediagroup.com/supply/lodging/docs/booking_apis/reservations/getting_started/ui_guidelines/`
- Trip.com Connectivity: `https://connect.trip.com/`

These links are informational. Their presence does not mean The House or this product is already approved by those provider programs.

### Explicitly unchanged

- Airbnb Apps Script and listing/room mappings;
- reservation-sync authentication and current live feed behavior;
- direct/manual stay creation rules except the narrow Ready invalidation triggered when such a stay is deleted;
- canonical reservation model contract;
- registration, passport/Thai-ID and TM30 workflows;
- housekeeping WhatsApp template and Su/owner recipient behavior;
- early/late checkout policy and fee rules;
- Finance and receipt handling;
- maintenance alerts;
- lost-key security;
- room inventory and Room 7 Airbnb exclusion;
- cron schedules, Cloudflare bindings and secrets.

### Primary runtime files changed

- `src/concierge-api.js`
- `src/concierge-store.js`
- `src/integration-catalog.js`
- `src/stay-api.js`
- `public/concierge-admin.html`
- `public/concierge-admin.js`
- `public/concierge-admin.css`
- release/version metadata files
- `tests/concierge.test.mjs`

### Validation

- Full automated regression suite: **280 passed / 0 failed**.
- JavaScript/MJS syntax validation: **45 files passed**.
- Google Apps Script syntax validation passed.
- **12 JSON** files parsed successfully and `wrangler.jsonc` parsed successfully.
- No `node_modules`, `.wrangler` or `.git` directories are included in the release package.

### Post-deployment checks

1. In Calendar & Operations, click Dirty / Clean / Ready directly on a room card and confirm the card and fallback status section remain synchronized.
2. Mark a vacant applicable room Ready in Owner Admin and ask for early check-in; Concierge should say the room is ready without exposing internal status terminology.
3. Set the same room Dirty and ask again; Concierge should say the room still needs to be prepared before check-in.
4. Create a disposable direct/manual test stay, mark the room Ready, then delete that test stay; confirm the stale Ready state is invalidated rather than silently carrying into a different reservation context.
5. Confirm Su's existing turnover WhatsApp task still has Received / Room ready and that Su's Room ready action still sends the existing owner status notification.
6. Open Integrations and verify Booking.com, Agoda, Hostelworld, Expedia Group and Trip.com each show How to connect guidance plus official links while remaining Not connected.
7. Confirm Airbnb and Direct / Walk-in production behavior remains unchanged.
