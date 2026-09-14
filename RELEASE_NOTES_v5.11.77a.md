# Release Notes — Backend v5.11.77a

## Listings & Rates read hotfix

This hotfix repairs the live Beds24 calendar read used by the mobile Listings & Rates workspace.

### Fixed

- `GET /inventory/rooms/calendar` now explicitly requests the calendar fields Taoedge needs:
  - `includeNumAvail=true`
  - `includePrices=true`
  - `includeMinStay=true`
- Beds24 V2 `numAvail` is now normalized as Taoedge inventory.
- Missing provider values remain `null` instead of being incorrectly coerced to zero.
- The regression fixture now follows the real flat Beds24 V2 calendar response shape (`roomId`, `date`, `price1`, `numAvail`, `minStay`).
- Mobile platform contract identifies the hotfix as backend `5.11.77a`.

### Safety boundaries preserved

- `BEDS24_RATE_INVENTORY_WRITES_ENABLED=false` remains unchanged.
- Full Beds24 Channel Manager remains disabled.
- No new Cloudflare variables or secrets are required.
- Direct Stay fast inventory protection and v5.11.77 OTA sync hardening remain unchanged.

### Expected production result

After deployment, App v0.1.19a should receive actual Beds24 calendar rows rather than an empty successful response. Availability is read from `numAvail`; calendar price/minimum-stay fields are shown when Beds24 returns them.
