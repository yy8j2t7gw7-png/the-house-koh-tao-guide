# Development Handoff — v5.11.60 Mobile Guest Names

## Reason for release

The first physical-iPhone test showed the mobile Bookings and Calendar screens displaying the generic fallback `Guest` even though the live reservation dates/source/room data were correct. The canonical House reservation layer often contains only a minimal first-name field, and existing imported Airbnb reservations may have no name stored there.

## Implementation

`src/mobile-platform.js` now enriches mobile reservation responses from the existing Beds24 API V2 server integration:

1. fetch overlapping Beds24 bookings using the existing authenticated server-side `beds24ApiRequest`;
2. request personal booking data with `includeGuests=true`;
3. resolve Beds24 room IDs through the explicit `BEDS24_ROOM_MAP` mapping;
4. match a provider booking to a canonical House reservation only when room + arrival + departure all match;
5. attach a transient `guestDisplayName` for the mobile response;
6. keep existing canonical data unchanged if the provider call fails.

No provider token is returned to the client and the read path does not persist provider personal data into new tables.

## Role/privacy behavior

- owner: full booking-holder display name when available;
- manager: full booking-holder display name when available;
- staff: first name only;
- guest documents/passport images remain governed by the existing separate permissions.

## Deployment order

1. Keep `MOBILE_BOOTSTRAP_ENABLED=false`.
2. Deploy v5.11.60 to the existing The House repository/Worker.
3. Check Cloudflare Variables after deployment.
4. Ensure `MOBILE_BOOTSTRAP_ENABLED=false`.
5. Ensure `MOBILE_APP_ENABLED=true` for the already-bootstrapped live mobile test environment.
6. Leave `BEDS24_CHANNEL_MANAGER_ENABLED=false`, `BEDS24_FINANCE_SYNC_ENABLED=false` and `UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false` unless their separate live test plans have been completed.
7. Reload the Owner App and verify known Airbnb bookings now show names.

## GitHub Summary

`Release v5.11.60 mobile reservation guest-name enrichment`

## GitHub Description

`Enrich mobile Home, Bookings and Calendar reservation responses with Beds24 personal booking names using the existing server-side API V2 authentication and explicit room mapping. Match by room and stay dates, fail soft to canonical data if Beds24 is unavailable, keep staff limited to first names, expose no provider credentials to the app, and preserve all existing House safety boundaries. Final automated suite: 316 passed / 0 failed.`
