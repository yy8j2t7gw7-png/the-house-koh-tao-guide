# v5.9.0 — Automatic Verified-Stay Access

## Release summary

Adds automatic Airbnb reservation verification to the permanent Room pages, self-service passport registration for non-Thai guests, an all-Thai-overnight-guests exemption and protected after-hours lost-key access. Room 7 remains inactive. Explore remains preserved in source but hidden from the live release.

## What this release delivers

- Fixed Airbnb listing-to-room mapping for Rooms 1–6 and 8–11.
- A Google Apps Script synchronizer that combines private Airbnb iCal feeds with Airbnb host emails and sends only the minimum reservation fields to the Worker.
- Airbnb confirmation-code verification with HMAC-only storage and room-bound, secure browser sessions.
- Automatic 72-hour, single-use passport forms created by verified guests; private R2 storage retains the existing 14-day deletion rule.
- A registration exemption only when all overnight guests on the reservation are Thai nationals; selecting it revokes unused pending passport links.
- After-hours spare-key release only during an active verified stay from 19:30 to 10:30 Bangkok time.
- Guest confirmation of the 500 THB lost-key fee, followed by an automatic WhatsApp alert to every configured urgent recipient. The guest never approves the staff notification.
- Fail-closed key release when WhatsApp submission fails, with no key code in the database, alert, AI context, Git repository or ZIP.
- One-release-per-rotation protection and an owner control to confirm that the physical key-box code has been changed.
- Exact Airbnb scheduled-message text and one-time setup documentation.

## Validation

- 39 automated tests pass.
- Cloudflare Wrangler production bundle dry-run passes with 156 assets.
- Canonical Room, House, Emergency, Departure and Rooms module copies match.
- JavaScript and Google Apps Script syntax checks pass.
- `git diff --check` passes.
- No real key-box codes, readable Airbnb confirmation codes or project secrets are included in the release.

## GitHub Desktop

### Summary

`v5.9.0 — Add automatic verified-stay access`

### Description

`Adds automatic Airbnb reservation sync and room-bound confirmation-code verification for active Rooms 1–6 and 8–11. Verified guests can create secure passport-upload forms or declare that all overnight guests are Thai nationals. After-hours lost-key access now confirms the 500 THB fee, automatically alerts configured owners and Su through WhatsApp, releases no code if submission fails, and requires physical code rotation before reuse. Includes scheduled Airbnb messages, setup documentation, owner controls, privacy safeguards and 39 passing tests. Explore remains hidden but preserved for later.`

## Required one-time activation after pushing

1. Deploy v5.9.0 through the existing GitHub/Cloudflare workflow.
2. Configure `STAY_TOKEN_PEPPER`, `RESERVATION_SYNC_TOKEN` and `SPARE_KEY_CODES` as Cloudflare Production secrets.
3. Configure the official WhatsApp secrets and urgent recipients from `WHATSAPP_ALERT_OPERATIONS.md`.
4. Install `airbnb-sync/Code.gs`, add the ten private Airbnb iCal URLs and run `installHouseReservationTrigger`.
5. Activate the ten prepared Airbnb scheduled messages from `AIRBNB_SCHEDULED_MESSAGES.md`.
6. Complete the non-sensitive production test checklist in `AIRBNB_AUTOMATION_SETUP.md` before adding real key-box codes.

Never commit or send real secret values, passport data, private iCal URLs or key-box codes through chat.
