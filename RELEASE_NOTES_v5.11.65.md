# The House – Koh Tao v5.11.65 — Rich Booking Detail Metadata

## Summary

This release enriches the protected Taoedge booking-detail contract so owners/managers can understand a reservation without opening Beds24 for basic information.

## Provider metadata

The existing Beds24 enrichment layer now captures, when available:

- OTA/provider booking reference (`apiReference`/compatible provider reference)
- Beds24 booking ID
- gross booking price
- booking currency
- adult count
- child count
- total guest count

Nights are derived from the canonical check-in/check-out dates rather than trusted from a provider display field.

## Permission model

- gross booking value is returned only when the mobile membership has `finance.view`
- provider/Beds24 references are not exposed to ordinary staff
- no provider credential, refresh token or private API secret is returned

## Preserved behavior

- v5.11.64 booking notes and actionable staff tasks
- protected WhatsApp Received / Resolved workflow
- server-side licensing and device binding
- Airbnb expected→paid Finance reconciliation
- scheduled Finance sync remains staged until live reconciliation acceptance
- Channel Manager and AI auto-send remain staged

## Mobile pairing

Use with **Taoedge Owner App v0.1.6** for the expanded booking summary UI.
