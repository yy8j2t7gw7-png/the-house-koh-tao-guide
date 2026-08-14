# The House – Koh Tao v5.11.0

## Release summary

v5.11.0 adds a verified room-maintenance workflow, direct/walk-in stays, active-stay extensions and clearer owner reservation views while preserving the existing passport, lost-key, alerting and privacy boundaries.

## Guest improvements

- A multilingual **Report a Problem** option is available only after verified guest access.
- Guests can report water, toilet, shower, air-conditioning, electrical, security, TV, refrigerator, fan, Wi-Fi, furniture and other room issues.
- Critical reports require a guest reply number and alert the urgent team when the official WhatsApp channel is configured.
- Toilet guidance appears in normal House information and inside the report flow.
- Airbnb guests verify with their HM code; direct and walk-in guests use a private House stay code.

## Owner improvements

- The console separates **Active stays** and **Upcoming stays**.
- **Extend stay** moves an active reservation to a later checkout without forcing a completed registration to start again.
- **Create direct stay** creates a walk-in or direct reservation and returns a private room link plus a one-time House stay code.
- **Add missing reservation** remains available only as a recovery tool when an Airbnb reservation failed to synchronize.
- Maintenance reports and private image actions are available in the protected owner console.

## Security and privacy

- Airbnb and House stay codes are persisted only as HMAC hashes.
- Critical guest reply contact is placed only in the transient protected WhatsApp payload and is never stored.
- Maintenance photos remain private, never enter AI or public assets and use a 30-day maximum retention rule.
- Passport images retain their separate 14-day maximum retention rule.
- Lost-key release still requires the same active reservation, a fresh code check, the after-hours window, 500 THB fee acceptance, confirmed protected team notification and physical code rotation.

## Production steps after push

1. Deploy v5.11.0 through the existing GitHub/Cloudflare workflow.
2. In the private R2 bucket, add the enabled 30-day lifecycle rule for the `maintenance/` prefix. Keep the existing 14-day `passport/` rule.
3. Open `/concierge-admin` and confirm Active stays, Upcoming stays, Create direct stay and Maintenance reports load.
4. Create and verify a non-sensitive direct test stay, then test an active-stay extension.
5. Submit one routine maintenance report and one critical test report with a non-sensitive reply number.
6. If Meta WhatsApp is not configured yet, expect reports to appear in the owner console without an automated push. Configure it later through `WHATSAPP_ALERT_OPERATIONS.md`.
7. Keep spare-key release disabled until the physical key boxes, encrypted codes and protected WhatsApp recipients are ready and tested.

## Validation

- 47 automated tests pass.
- The Worker entry point completes a local production-format bundle check. The restricted build environment could not contact Cloudflare for Wrangler's dry-run command, so GitHub/Cloudflare remains the deployment verification step.
- JavaScript syntax, JSON parsing, private-recipient scans and release-archive contents are checked before delivery.
