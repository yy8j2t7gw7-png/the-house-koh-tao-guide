# THE HOUSE – KOH TAO
## Release Notes v5.11.54 — Room Readiness & Integration Guidance

### Purpose

v5.11.54 tightens the Owner Admin housekeeping/readiness experience and makes the product-facing Integrations section useful to hotel owners without changing The House's live booking channels or enabling unsupported external providers.

### Housekeeping and room readiness

- Adds **Dirty / Clean / Ready** controls directly to every room card in **Calendar & Operations**.
- Keeps the existing dedicated housekeeping-status controls as a fallback.
- Owner Admin room-status changes continue to use the existing protected housekeeping write path and do **not** send redundant WhatsApp notifications back to owners.
- Su's existing WhatsApp **Room ready** action remains unchanged and continues to notify configured owners through the existing approved status-template route.
- Deleting an owner-managed stay now invalidates an applicable stale `Ready` state for that room so a previous test/turnover context cannot be mistaken for readiness for a different reservation topology.
- When an owner deliberately marks a room **Ready** in Admin after that context reset, the Concierge treats that trusted manual confirmation as current readiness.

### Guest-facing wording

- Removes internal housekeeping language such as **"the room is not marked ready"** from early-check-in replies.
- Uses natural hotel wording such as **"Your room still needs to be prepared before check-in."**
- Keeps the existing early-check-in safeguards, noon expectation wording and no-guarantee rule unchanged.

### Integrations guidance

The Owner Admin Integrations section now shows the major commercial-product slots:

- Airbnb
- Direct / Walk-in
- Booking.com
- Agoda
- Hostelworld
- Expedia Group (Expedia, Hotels.com, Vrbo, Orbitz, Travelocity)
- Trip.com
- Other PMS / API

For each external provider, Admin now includes an expandable **How to connect** guide with:

- steps for the property owner;
- steps required from the software/connectivity provider;
- official provider documentation/onboarding links;
- explicit connector status.

Unsupported providers remain **Not connected** and their Connect action remains disabled until a real provider-specific connector has been built, approved where required, installed and configured.

### Production safety boundary

- No Booking.com, Agoda, Hostelworld, Expedia Group, Trip.com, PMS or custom external API is connected by this release.
- The House continues to use its existing Airbnb synchronization plus Direct / Walk-in / manual reservations only.
- No external provider credentials can be entered through this release.
- No new connect/disconnect write endpoint is introduced.
- No fake provider connection state is displayed.

### Preserved

Airbnb Apps Script/sync/mappings, canonical reservation behavior, registration/TM30, passport/Thai-ID handling, housekeeping WhatsApp task flow, owner Ready notifications from Su, early/late stay policy, Finance, maintenance, lost-key security, guest access, calendars and all unrelated production behavior remain unchanged.

No new Meta template, Cloudflare secret, cron or Google Apps Script deployment is required.

### Validation

- Full automated regression suite: **280 passed / 0 failed**.
- JavaScript/MJS syntax validation: **45 files passed**.
- Google Apps Script syntax validation passed.
- **12 JSON** files parsed successfully and `wrangler.jsonc` parsed successfully.
- No `node_modules`, `.wrangler` or `.git` directories are included in the release package.
