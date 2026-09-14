# Validation Results — Backend v5.11.77a

- Full automated backend suite: **367/367 passed**.
- Backend JavaScript syntax: **29/29 passed**.
- Listings hotfix regression coverage verifies:
  - `includeNumAvail=true` is sent;
  - `includePrices=true` is sent;
  - `includeMinStay=true` is sent;
  - `numAvail` normalizes to inventory;
  - `price1` and `minStay` normalize correctly;
  - missing provider values remain `null`, not zero.
- Cloudflare free-tier deployment packaging remains under the previously corrected variable budget; the hotfix adds no Worker variables.
- Broad rate/inventory writes remain fail-closed and the full Channel Manager remains off.
