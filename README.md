# The House – Koh Tao Guide

Cloudflare Workers Static Assets deployment.

## Cloudflare build settings

- Production branch: `main`
- Build command: leave blank
- Deploy command: `npx wrangler deploy`
- Root directory: leave blank

The Worker name in Cloudflare must be:
`the-house-koh-tao-guide`

## Clean room links

After deployment:
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

The Worker rewrites those paths internally to the shared `public/room.html` page while keeping the clean URL visible.
