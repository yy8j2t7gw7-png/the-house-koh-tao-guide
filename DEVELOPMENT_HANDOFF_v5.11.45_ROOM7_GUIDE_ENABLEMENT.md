# THE HOUSE – KOH TAO
## Development Handoff — v5.11.45 Room 7 Guide Enablement

### 1. Authoritative baseline

This change starts from the latest v5.11.45 stable-base package containing the Airbnb fast-sync/Meta-template corrections plus the subsequent narrow passport picker, pest recognition, key-box activity deletion, registration reset, and guest-upload-only/Admin-in-person registration changes. The release number remains **5.11.45**.

### 2. Owner-authorized scope

Only Room 7 guest-guide/direct-testing enablement and room-location copy/photo changes were authorized.

- Room 7 must work through `/room/7` and the normal verified guide flow.
- Owner Admin may create a direct/walk-in Room 7 stay before an Airbnb listing exists.
- Room 7 must stay completely excluded from Airbnb Gmail/iCal synchronization and the manual missing-Airbnb-reservation recovery form.
- Use the supplied building photo for Room 7's protected room-location image.
- Room 7 copy: `Room 7 is downstairs. Follow the building around the corner to reach it.`
- Rooms 1–4 copy: `Room N is upstairs. Follow the path around the side of the house to the staircase at the back.`
- Do not redesign unrelated Concierge, registration, Meta, Airbnb, alert, lost-key, pest, cleaning, booking, luggage, emergency, or general UI behavior.

### 3. Architecture

The stay layer now distinguishes **property rooms** from **Airbnb listing mappings**. `PROPERTY_ROOMS` contains Rooms 1–11, while `ACTIVE_LISTINGS` still contains only the ten genuine Airbnb listings for Rooms 1–6 and 8–11.

This allows a room to exist in the guest system without being enabled for Airbnb, which is the correct boundary for future white-label/commercial deployments where different properties may use different booking channels or expose only part of their inventory through one integration.

### 4. Room 7 behavior now enabled

Room 7 now participates in permanent room routing, verified stay status/code verification, Owner Admin direct-stay creation, Thai-only exemption, non-Thai guest counting, secure passport upload, the staff-only in-person exception, private room content/photo delivery, AI Concierge room context, protected passport room validation, and ordinary verified-room support workflows.

The guest room selector and Owner Admin direct-stay selector include Room 7.

### 5. Airbnb boundary preserved

No Room 7 Airbnb listing ID, placeholder listing ID, iCal URL, or Gmail parser fallback was added.

- `ACTIVE_LISTINGS` still maps only Rooms 1–6 and 8–11.
- `airbnb-sync/Code.gs` is unchanged.
- All ten existing Airbnb calendars continue to reconcile at least hourly.
- The five-minute email fast path remains unchanged.
- Room 7 cannot be ingested through `/api/reservations/sync`.
- **Add missing Airbnb reservation** still excludes Room 7.
- The 24-hour complete audit remains the only cancellation-capable reconciliation.

When Room 7's genuine Airbnb listing is active later, add its real listing ID and private iCal feed in a separately scoped release.

### 6. Location image and wording

New protected asset: `public/assets/room-07-location.jpeg`. It is served through the existing authenticated room-photo endpoint and is explicitly blocked from direct public asset access.

Room 7: Downstairs — `Room 7 is downstairs. Follow the building around the corner to reach it.`

Rooms 1–4: Upstairs — `Room N is upstairs. Follow the path around the side of the house to the staircase at the back.`

Rooms 5–6 and 8–11 are unchanged.

### 7. Runtime files changed

- `src/stay-api.js`
- `src/index.js`
- `src/concierge-api.js`
- `src/passport-api.js`
- `public/room-app.js`
- `public/registration-entry.js`
- `public/guide-app.js`
- `public/ai-concierge.js`
- `public/ai-concierge-config.js`
- `public/room-data.js`
- `public/modules/house/room-data.js`
- `public/rooms.html`
- `public/modules/house/rooms.html`
- `public/concierge-admin.html`
- `public/data/concierge-knowledge.json`
- `public/assets/room-07-location.jpeg` (new)

Tests/operational docs changed: `tests/concierge.test.mjs`, `RELEASE_NOTES_v5.11.45.md`, `CHANGELOG.md`, `PROJECT_RULES.md`, `ROADMAP.md`, `airbnb-sync/README.md`, `AIRBNB_AUTOMATION_SETUP.md`, and this handoff.

### 8. Regression coverage

A dedicated Room 7 regression verifies that Room 7 remains absent from the Airbnb listing map; a direct Room 7 stay can be created and verified; Thai exemption can complete registration; protected Room 7 content returns the new photo/copy; Room 7 appears in the guest and direct-stay selectors but not the manual Airbnb-recovery selector; and the frontend room/registration/Concierge configuration accepts Room 7. It also checks the supplied image asset and the updated Rooms 1–4 location wording.

Full suite: **224 passed / 0 failed**.

### 9. Deployment and smoke test

No Google Apps Script update is required because `airbnb-sync/Code.gs` is unchanged.

After Worker deployment:
1. In Owner Admin, create a Room 7 direct stay for a safe test period.
2. Copy the generated House stay code and `/room/7` link.
3. Open the link in a clean/private browser and verify with the House stay code.
4. Complete a safe registration path.
5. Confirm **Finding Room 7** shows the supplied building image and the new downstairs/around-the-corner wording.
6. Confirm Rooms 1–4 show the new staircase-at-the-back wording.
7. Confirm Room 7 remains absent from **Add missing Airbnb reservation** and that no Room 7 Apps Script iCal property has been added.

If testing lost-key release for Room 7, the protected `SPARE_KEY_CODES` Worker secret must contain a genuine Room 7 code. Do not create a placeholder production key-box code merely for testing.

### 10. Preserved behavior

No intentional change to Airbnb sync cadence/parser/calendar logic, current listing mappings, Meta templates/actions, guest upload-only passport policy, Admin in-person/reset behavior, general Concierge routing/messaging outside room-location answers, pest handling, lost-key security, cleaning, luggage, bookings, stay extensions, emergency routing, or `EXPLORE_ENABLED=false`.

### 11. Commercialization / white-label standing rule

For every future change and handoff:
- keep the system modular/reusable for eventual sale or adaptation to other hospitality businesses;
- avoid introducing new The House-specific assumptions into reusable core logic where reasonably possible;
- distinguish the current one-property/white-label deployment architecture from a future multi-property SaaS architecture;
- plan a deliberate later platformization phase that moves branding, room inventory, timezone, operating hours, fees, contacts, booking-channel mappings, and local recommendations into centralized property configuration;
- do not destabilize the current production property merely to perform that broad abstraction prematurely.

This change improves that direction by separating **property-room availability** from **Airbnb-integration availability**. Room inventory is still statically configured in several frontend/backend modules for minimal regression risk; centralizing it is a future platformization task, not part of this narrow production change.

### 12. Next recommended action

Deploy and smoke-test Room 7 using an Owner Admin direct stay. Keep Airbnb disabled for Room 7 until the genuine listing ID and private iCal URL exist; integrate those later as a separate narrow release.
