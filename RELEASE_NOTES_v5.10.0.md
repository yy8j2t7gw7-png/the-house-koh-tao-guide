# The House – Koh Tao v5.10.0

## GitHub summary

Release v5.10.0: protect guest access and require complete group registration

## GitHub description

This release makes the permanent room links safe for Airbnb arrival messages and completes the required registration gate.

- Keeps room details, arrival photos, Wi-Fi and private House knowledge locked until the stay and registration are verified.
- Gives guests an explicit all-Thai or foreign/mixed-group path after Airbnb confirmation-code verification.
- Requires the total number of non-Thai adults and children staying overnight, not only the Airbnb booking guest.
- Requires one separate passport submission for every declared non-Thai overnight guest before private access opens.
- Keeps passport files in the private single-use R2 workflow, outside AI and WhatsApp, with the 14-day maximum lifecycle rule.
- Restricts the public concierge to verification help, passport reminders and emergencies while retaining protected serious-incident alerts.
- Revalidates verified sessions against synchronized reservation changes and checkout dates.
- Requires a fresh Airbnb confirmation-code match before every after-hours spare-key release; the readable code never enters storage, AI, alerts or logs.
- Preserves seven-language operations, Airbnb synchronization, the protected after-hours key flow and the disabled Explore feature.

Validation: all 44 automated checks pass, including complete group registration, private-content protection, public-concierge privacy, cross-room verification, nationality safeguards, changed-checkout session expiry, fresh lost-key confirmation matching and real SQLite schema initialization for the owner overview and scheduled alert paths.

## Deployment note

Deploy this release over the current project. Existing Cloudflare secrets and bindings must remain configured and must never be added to Git or the ZIP. After deployment, verify one all-Thai test stay and one foreign/mixed test stay with at least two non-sensitive passport test images before using the workflow with real documents.
