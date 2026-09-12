# The House – Koh Tao v5.11.58

## Mobile Platform Foundation + Tenant/Role Security

v5.11.58 adds the backend foundation for the iPhone-first Taoedge Owner App without changing the existing guest-facing Concierge behavior or enabling any new production automation by default.

### New mobile API

A dedicated `/api/mobile/v1` surface now provides authenticated, role-aware mobile access to existing House operations:

- owner bootstrap, login, invite activation and logout
- Home command center
- bookings and calendar
- Unified Inbox thread/read/reply and Pause/Resume AI controls
- room readiness / housekeeping
- maintenance reporting and resolution
- direct-stay creation through the existing protected House route
- owner Finance read model
- granular receipt/expense submission workflow
- integration/platform health
- team invitations and post-invite permission changes
- revocable session/device management
- Expo push-device registration

Provider credentials are never returned to the app.

### Tenant and licensing foundation

The Durable Object now contains tenant-aware platform records for:

- tenants
- properties
- users
- memberships
- sessions
- invitations
- module entitlements
- push devices
- audit events

The House bootstraps as a tenant/property pair and receives the initial module entitlements. This is the base for future modular commercial licensing without coupling the operational app to one checkout provider.

### Authentication and session security

- PBKDF2-SHA256 password hashing with unique per-user salt and server-side pepper
- hashed bearer session tokens at rest
- configurable session TTL, default 30 days
- individual session revocation
- login rate limiting
- secure invite tokens stored only as hashes
- bootstrap protected by a separate one-time server secret and disabled by default
- server-side role/permission enforcement; the client is not trusted for authorization

### Roles

**Owner** has the complete property workspace.

**Manager** has operational, messaging, analytics/integration and direct-stay access. Full Finance reports can be explicitly delegated.

**Staff** defaults to bookings/calendar/operations/housekeeping/maintenance/registration status only. Staff do not receive Finance reports, OTA payouts, profit, guest identity documents, integrations, licensing, team administration, security sessions or Unified Inbox access by default.

### Selected staff expense submission

A new independent permission, `finance.expense_submit`, allows an owner to authorize selected staff to:

- photograph or attach a receipt/bill from the mobile app
- use the existing AI receipt extraction pipeline
- review date, amount, vendor, category, payment method, room/area and notes
- submit the expense into the existing House Finance store
- receive duplicate protection without seeing details of another financial record

`finance.expense_submit` does **not** imply `finance.view`.

The mobile API reuses the existing receipt storage, file validation, AI extraction and duplicate detection from `expense-api.js`; it does not create a second Finance implementation.

### Deliberately disabled at release

`wrangler.jsonc` ships with:

```text
MOBILE_APP_ENABLED=false
MOBILE_BOOTSTRAP_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
BEDS24_FINANCE_SYNC_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

No mobile bootstrap/password/session/invite secrets are committed.

### Existing systems preserved

v5.11.58 does not deliberately change:

- Passport/TM30 processing
- existing manual Finance/expense behavior
- Beds24 channel-manager logic
- Beds24 Airbnb finance automation
- Unified Messaging provider behavior
- housekeeping operational rules
- maintenance guest workflows
- lost-key protection
- Meta template definitions
- Airbnb Apps Script sync

The only shared-system edits outside the mobile layer are release metadata plus Durable Object mobile tables/methods and mobile routing.

## Validation

Final validation results are recorded in `VALIDATION_RESULTS_v5.11.58.md`.
