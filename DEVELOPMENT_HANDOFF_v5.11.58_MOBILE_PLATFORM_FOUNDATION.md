# Development Handoff — v5.11.58 Mobile Platform Foundation

## Objective completed

Add the secure server foundation for a commercially distributable iPhone-first property-owner app while preserving the production House guest/OTA systems.

A separate mobile repository/source package is expected to consume this API. The backend does not depend on the app's visual brand.

## Architecture

### API prefix

`/api/mobile/v1`

### Authentication endpoints

- `POST /auth/bootstrap`
- `POST /auth/login`
- `POST /auth/accept-invite`
- `POST /auth/logout`
- `GET /session`

### Operational endpoints

- `GET /home`
- `GET /bookings`
- `GET /calendar`
- `GET /inbox`
- `GET /inbox/thread`
- `POST /inbox/send`
- `POST /inbox/ai`
- `GET /operations`
- `POST /operations/housekeeping`
- `POST /operations/maintenance/report`
- `POST /operations/maintenance/resolve`
- `POST /direct-stays`

### Finance endpoints

- `GET /finance` — requires `finance.view`
- `GET /finance/expense-config` — requires `finance.expense_submit`
- `POST /finance/expense-analyze` — requires `finance.expense_submit`
- `POST /finance/expense-submit` — requires `finance.expense_submit`

The two permissions are intentionally independent.

### Platform administration endpoints

- `GET /platform`
- `GET /team`
- `POST /team/invite`
- `POST /team/permissions`
- `GET /security/sessions`
- `POST /security/revoke`
- `POST /push/register`

## Permission strategy

`MOBILE_PERMISSION_MATRIX` defines role baselines.

`MOBILE_DELEGATABLE_PERMISSIONS` limits owner-controlled overrides:

- manager: `finance.view`, `finance.expense_submit`
- staff: `finance.expense_submit`

Unknown/unsupported overrides are discarded server-side.

A staff client cannot obtain full Finance by altering UI state or manually calling the endpoint because `/finance` checks the resolved server permission set.

## Expense security

The mobile layer calls the existing `handleExpenseAdminRequest` for analysis and creation. Non-owner mobile submitters are treated as limited expense submitters so duplicate responses do not expose another expense's values.

The app may upload a receipt to the existing protected R2 bucket. Supported format/size constraints remain centralized in `expense-api.js`.

## Durable Object additions

Platform tables:

- `platform_tenants`
- `platform_properties`
- `platform_users`
- `platform_memberships`
- `platform_sessions`
- `platform_invites`
- `platform_entitlements`
- `platform_push_devices`
- `platform_audit`

Membership permission overrides are stored as JSON and can be updated through `mobileUpdateMembershipPermissions` only for active non-owner memberships.

## Commercial licensing foundation

Tenant entitlements already determine the module list returned to mobile clients. This intentionally separates **what a tenant is licensed to use** from **how the license is purchased**.

Future work can add:

- plan catalog and pricing
- term selection
- App Store / Play subscription purchase layer
- server receipt validation
- entitlement lifecycle/grace periods
- multi-property tenant administration

without rewriting operational APIs.

## Deployment safety

v5.11.58 ships with mobile + bootstrap disabled and commits no mobile secrets.

Existing Beds24/AI production safety flags remain false.

## Test additions

v5.11.58 adds automated coverage for:

- default-disabled mobile configuration
- safe staff role baseline
- granular expense-submit delegation
- mobile expense route reuse of existing Finance pipeline
- modular entitlements
- fail-closed mobile feature flag
- platform DB tables and hashed credentials
- provider-credential isolation
- Worker routing/auth rate limiter
- secret hygiene and unchanged production safety flags

Final full test count: **314 passed / 0 failed**.

## Next recommended engineering work

1. Deploy v5.11.58 and bootstrap owner with temporary bootstrap flag.
2. Enable mobile API and connect iPhone preview build.
3. Physical-iPhone QA for biometrics/camera/push.
4. Validate a selected-staff expense submission against production-safe Finance data.
5. Complete pending inbound Airbnb Unified Messaging live test.
6. Build the commercial licensing checkout layer only after final plan/pricing and store-policy path are approved.
7. Android QA/release from the same React Native codebase.

## GitHub Desktop

### Summary

`Release v5.11.58 mobile platform foundation and granular staff expense access`

### Description

`Add a secure tenant-aware mobile API for the iPhone-first property operations app, including PBKDF2 owner/staff authentication, hashed revocable sessions, secure invitations, modular entitlements, server-enforced owner/manager/staff permissions, mobile Home/bookings/calendar/Unified Inbox/operations/direct-stay/Finance/team/security/push endpoints, and granular finance.expense_submit delegation so selected staff can upload bills and create expenses without seeing income, OTA payouts or owner Finance reports. Reuse the existing protected House expense/AI receipt pipeline, commit no mobile or provider secrets, ship MOBILE_APP_ENABLED and MOBILE_BOOTSTRAP_ENABLED false, and preserve the existing Beds24/Finance/AI safety flags. Final automated suite: 314 passed / 0 failed.`
