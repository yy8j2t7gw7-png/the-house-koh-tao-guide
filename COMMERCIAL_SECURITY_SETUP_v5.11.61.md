# Commercial Security Setup — v5.11.61

## Purpose

This procedure activates the new server-side licensing and device protection without locking the existing House owner out.

## Step 1 — create secrets

Generate two independent long random values and store them in the password manager and Cloudflare Secrets:

```text
MOBILE_LICENSE_SIGNING_SECRET
TAOEDGE_LICENSE_ADMIN_TOKEN
```

Never put either value in GitHub, `.env`, Expo public variables or the iPhone app.

## Step 2 — leave enforcement off

Before provisioning, confirm:

```text
MOBILE_LICENSE_ENFORCEMENT_ENABLED=false
MOBILE_DEVICE_BINDING_ENABLED=false
MOBILE_BOOTSTRAP_ENABLED=false
MOBILE_APP_ENABLED=true
```

## Step 3 — provision the House license

Use the protected backend licensing endpoint with the admin token. The request should target the existing tenant `tenant_the_house_koh_tao` and include the modules that should remain available.

Recommended House preview modules:

```text
core
calendar
bookings
unified_messaging
housekeeping
maintenance
guest_registration
finance
analytics
integrations
staff_access
channel_manager
```

Set an explicit plan key and device limit. The backend signs the license; the client never signs it.

## Step 4 — verify before enforcement

Open Taoedge Owner App → Modules & Plan and Security. Confirm the license, modules and device limit render correctly.

## Step 5 — enable license enforcement

Set:

```text
MOBILE_LICENSE_ENFORCEMENT_ENABLED=true
```

Re-test Home, Calendar, Bookings, Inbox, Operations, Finance, Team, Integrations and Security.

## Step 6 — enable device binding

Set:

```text
MOBILE_DEVICE_BINDING_ENABLED=true
```

Existing sessions carry a stored device ID from the original login. If a pre-v0.1.3 session does not satisfy binding, log out and log back in once with v0.1.3.

## Recovery

If enforcement is misconfigured, turn only the affected enforcement variable back to `false`. Do not re-enable bootstrap and do not rotate unrelated provider credentials.
