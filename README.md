# The House Companion — Version 2.0

This version uses one shared room page selected by the URL.

## Direct room links after deployment

- `/room/1`
- `/room/2`
- `/room/3`
- `/room/4`
- `/room/5`
- `/room/6`
- `/room/8`
- `/room/9`
- `/room/10`
- `/room/11`

Example:
`https://YOUR-SITE.pages.dev/room/1`

## How it works

Cloudflare Pages reads `_redirects` and serves the shared `room.html` file for every `/room/*` URL.
`room-app.js` reads the room number from the URL and loads the correct room number, floor, photo and directions from `room-data.js`.

This means:
- One shared room layout
- One shared set of house information
- One shared Explore page
- Only room-specific data changes
- Future design updates need to be made once

## Temporary privacy

All pages include `noindex,nofollow`, which asks search engines not to index the test site.
Anyone with the link can still open it. For actual password protection, use Cloudflare Access later.
