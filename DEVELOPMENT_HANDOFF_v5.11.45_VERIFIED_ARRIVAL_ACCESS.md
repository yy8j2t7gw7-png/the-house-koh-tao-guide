# THE HOUSE – KOH TAO
## Development Handoff v5.11.45 — Verified Arrival Access While Registration Is Pending

### Authoritative baseline

This change was developed directly from `The-House-Koh-Tao-v5.11.45-room7-direct-stay-router-fix-ready-to-push.zip`.

The active release number remains **v5.11.45**. This is a narrow same-version corrective/UX release and must not be rebased onto the discarded unstable passport branches.

### Owner requirement

A real guest arrived while guest registration was still incomplete. Because the private room guide remained locked until passport registration was complete, the guest could not see the room-location photos/directions and could not find the room when staff were unavailable.

The required model is now:

1. stay not verified → no private arrival information;
2. stay verified but guest registration incomplete → limited **Verified Arrival Access**;
3. registration complete (`passport_complete`, `thai_exempt`, or staff-completed `in_person_complete`) → full private guest guide;
4. operational/service alerts such as towels, room cleaning, luggage and bookings remain unavailable until full guest registration is complete.

### Exact behavior added

After a reservation is successfully verified, but before guest registration is complete:

- the existing `/room/<room>` access page displays a **Find your room** arrival section;
- the guest receives the existing entrance photo plus the room-specific location photo;
- the room-specific location note is shown;
- the full private room guide remains locked;
- private knowledge remains locked;
- service-request functionality remains locked;
- the Concierge is available in a limited arrival mode;
- the Concierge prominently reminds the guest to complete registration / upload required passport images;
- the pending Concierge quick actions are limited to **Guest registration**, **Find my room**, and **Emergency help**;
- room-page service prompts and housekeeping-hours UI are hidden while registration is incomplete.

### Service-alert boundary

Regression coverage explicitly confirms a verified guest with `passport_pending` cannot create alerts/workflows for:

- fresh towels;
- room cleaning;
- luggage storage;
- bookings.

Those turns remain behind the existing registration gate and create **zero operational alerts**.

Emergency safety behavior is not weakened. The existing verified lost-key path is also unchanged and retains its own active-stay, fee-consent, notification and rotation-lock protections.

### New verified-arrival API surface

`src/stay-api.js` adds dedicated, narrowly scoped endpoints:

- `GET /api/stay/arrival-content?room=<room>`
- `GET /api/stay/arrival-room-photo?room=<room>`
- `GET /api/stay/arrival-entrance-photo?room=<room>`

These endpoints require a valid verified stay session bound to the requested room, but do not require passport-registration completion.

They expose only arrival-location data already associated with the verified room. They do **not** expose:

- Wi-Fi/private room facts;
- private Concierge knowledge;
- passport information;
- key-box codes;
- service actions;
- full private guide pages.

The existing `/api/stay/room-content`, `/api/stay/room-photo`, private guide pages and private knowledge continue to require full registration.

### Files changed

Runtime behavior:

- `src/stay-api.js`
- `src/concierge-api.js`
- `public/room-access.html`
- `public/registration-entry.js`
- `public/ai-concierge.js`

Regression coverage:

- `tests/concierge.test.mjs`

Documentation:

- `DEVELOPMENT_HANDOFF_v5.11.45_VERIFIED_ARRIVAL_ACCESS.md`

No Airbnb Apps Script, Meta template configuration, passport upload implementation, Owner Admin operations, pest routing, cleaning implementation, lost-key implementation, room data, room photos, or general full-access Concierge behavior was changed.

### Regression tests added

The suite now proves:

1. verified + registration-pending stays can load arrival content;
2. the same stay still receives `403 guest_registration_required` from full `/api/stay/room-content`;
3. a registration-pending guest asking **find my room** receives the correct room location and a passport-registration reminder;
4. towels, cleaning, luggage and booking requests create no alerts before registration completion;
5. pending Concierge UI exposes only registration, room-finding and emergency actions;
6. the limited arrival panel contains no Wi-Fi password, housekeeping actions or key-box code.

### Validation

- Full automated suite: **229 passed / 0 failed**.
- JavaScript syntax validation: passed for runtime/test JavaScript and `airbnb-sync/Code.gs`.
- JSON validation: passed.
- Final ZIP is built without `.git`, `.wrangler`, `node_modules`, `__MACOSX`, `.DS_Store` or AppleDouble files.
- Final ZIP is retested from a fresh extraction before delivery.

Wrangler dry-run is not claimed unless separately confirmed in the packaging environment. Run locally before deployment if Wrangler is unavailable here:

```text
npm ci
npm test
npx wrangler deploy --dry-run
```

### Deployment

This change affects only the Cloudflare Worker/static guide package.

**Do not update Google Apps Script for this release.** Airbnb synchronization behavior is unchanged.

After deployment smoke-test:

1. use a verified stay with incomplete registration;
2. confirm `/room/<room>` displays the arrival photos/directions;
3. open Concierge and confirm the registration/passport reminder is visible;
4. ask `find my room` and confirm the room-specific answer;
5. ask for towels before completing registration and confirm no service alert is created;
6. complete passport registration (or Thai-only exemption) and confirm the normal full guide and service actions return.

### Commercialization / white-label architecture rule

This project remains intended for eventual sale/adaptation to other hospitality businesses.

Preserve the standing rule in every future development and handoff:

- keep core behavior modular and property-generic wherever reasonably possible;
- avoid adding new The House-specific assumptions to core logic;
- treat the current deployment as a one-property/white-label architecture while keeping a future multi-property SaaS path open;
- eventually extract property-specific branding, rooms, booking integrations, timezone, operating hours, fees, contacts and local recommendations into centralized property configuration.

This change follows that direction by modeling **verified arrival access** as a generic permission state separate from **full registered guest access**, rather than adding a room-specific workaround.

### Next recommended action

Production-smoke-test this exact arrival scenario with a test stay before relying on it for all arriving guests. Do not widen the limited pending-registration permission set unless a separate owner-approved requirement is documented.
