# Security & Licensing Activation — v5.11.61

## New server secrets

Create two different random secrets in Cloudflare and your password manager:

- `MOBILE_LICENSE_SIGNING_SECRET`
- `TAOEDGE_LICENSE_ADMIN_TOKEN`

Do not commit either value.

## Safe activation order

Deploy v5.11.61 first with:

```text
MOBILE_APP_ENABLED=true
MOBILE_BOOTSTRAP_ENABLED=false
MOBILE_LICENSE_ENFORCEMENT_ENABLED=false
MOBILE_DEVICE_BINDING_ENABLED=false
```

Then add the two secrets above.

Issue/update the House license with the protected server endpoint. Example shape only—replace the admin token locally and never paste it into source control:

```bash
curl -sS -X POST 'https://the-house-koh-tao-guide.7mf56yd45g.workers.dev/api/licensing/v1/tenant/license' \
  -H 'Content-Type: application/json' \
  -H 'x-taoedge-license-admin-token: YOUR_ADMIN_TOKEN' \
  --data '{
    "tenantId":"tenant_the_house_koh_tao",
    "status":"active",
    "planKey":"house-owner",
    "maxDevices":8,
    "modules":["core","calendar","bookings","unified_messaging","housekeeping","maintenance","guest_registration","finance","analytics","integrations","staff_access","channel_manager"]
  }'
```

Confirm the app shows an active license and expected modules. Then set:

```text
MOBILE_LICENSE_ENFORCEMENT_ENABLED=true
```

Test login, Home, Calendar, Bookings, Inbox, Operations, Finance and Security.

Only after Taoedge Owner App v0.1.3 is installed on the device, set:

```text
MOBILE_DEVICE_BINDING_ENABLED=true
```

Existing v0.1.3 requests include the per-install device identifier. Older mobile clients that do not send the identifier will be rejected after device binding is enabled.

## Protection model

- the client contains no license-signing key
- licenses are signed on the server
- signed module set constrains commercial feature access
- user permissions and module license are checked independently
- tenant sessions are individually revocable
- active-device count can be limited by license
- bootstrap remains disabled after initial owner creation
- licensing administration uses a separate server-only secret and a dedicated rate limiter
