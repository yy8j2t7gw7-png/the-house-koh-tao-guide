# Development Handoff — v5.11.65 Rich Booking Details

## Purpose

Expand the v5.11.64 booking activity endpoint into a useful operational reservation detail while keeping provider secrets and financial permissions server-side.

## Endpoint

`GET /api/mobile/v1/bookings/detail?id=<reservationId>` now supplies optional rich fields on `reservation`:

```text
nights
adults
children
guestCount
providerReference
beds24BookingId
bookingPrice
bookingCurrency
```

The fields come from the existing Beds24 reservation enrichment path. Missing upstream values remain empty/zero and do not block the booking detail.

## Security

`bookingPrice`/`bookingCurrency` require `finance.view`. Provider/Beds24 references are not returned to role `staff`. Provider credentials never leave the Worker.

## Mobile

Pair with **Taoedge Owner App v0.1.6**.
