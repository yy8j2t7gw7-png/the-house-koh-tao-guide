# CONTROLLED LISTINGS WRITE TEST — v5.11.78

Use this only after v5.11.78 is live and Listings reads are healthy.

1. Keep the full Beds24 Channel Manager off.
2. Choose one safe future room/date with a known current Beds24 calendar value.
3. Change `BEDS24_RATE_INVENTORY_WRITES_ENABLED` from `false` to `test` and redeploy.
4. In App v0.1.20 open Listings & Rates on that exact room/date.
5. Use **Test write**.
6. Taoedge will read the cell, POST the same existing `price1` and/or `numAvail`, read again, and require an exact match.
7. Confirm the app reports the no-op round trip as verified.
8. Check Beds24 manually to confirm the cell is unchanged.
9. Return `BEDS24_RATE_INVENTORY_WRITES_ENABLED` to `false` and redeploy unless a later explicitly approved release enables live writes.

Do not set this variable to `true` merely because the no-op validation succeeds. Live owner write activation is a separate production decision.
