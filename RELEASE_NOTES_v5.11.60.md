# The House – Koh Tao v5.11.60 — Mobile reservation guest-name enrichment

## Scope

This is a narrow mobile-data presentation release following the first live iPhone test of the Taoedge Owner App.

### What changed

- Mobile **Home**, **Bookings** and **Calendar** can now enrich reservation names from Beds24 API V2 personal booking data.
- Beds24 requests use `includeGuests=true` and the existing server-side refresh-token flow.
- Matching is constrained to the same House room plus arrival/departure dates.
- Owner/manager responses may show the full booking-holder name.
- Staff remains limited to the first name for operational use.
- If Beds24 is unavailable, the endpoint fails soft and keeps the existing canonical reservation data rather than failing the mobile screen.

### What did not change

- No Beds24, Airbnb, Meta or OpenAI credential is exposed to the mobile client.
- No change to passport/TM30 document access.
- No change to Finance, housekeeping, maintenance, lost-key or Direct Stay behavior.
- No change to the Beds24 Channel Manager or Beds24 Finance enablement boundaries.
- No change to Unified Messaging AI auto-send.

## Deployment note

The committed `wrangler.jsonc` continues to ship conservative defaults:

```text
MOBILE_APP_ENABLED=false
MOBILE_BOOTSTRAP_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
BEDS24_FINANCE_SYNC_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

The live House mobile app is already bootstrapped. After deployment, verify the Cloudflare dashboard still has `MOBILE_BOOTSTRAP_ENABLED=false` and deliberately restore/keep `MOBILE_APP_ENABLED=true` for live app testing if the deployment resets it to the repository default.

## Validation

- Full House automated suite: **316 passed / 0 failed**.
- `src/mobile-platform.js` JavaScript syntax: passed.
- Only the intended backend files differ from v5.11.59 before release documentation is added: `src/mobile-platform.js`, `tests/concierge.test.mjs`, `package.json`, `CHANGELOG.md`.
