# The House – Koh Tao v5.11.4

## Release summary

v5.11.4 restores the AI Concierge and the intended concierge-first contact flow. A JavaScript initialization-order error in v5.11.3 caused the concierge script to stop before the launcher, panel and contact handlers were registered.

## Fixed

- Restored the Concierge launcher and panel on operational guest pages, including Safari.
- Restored concierge-first behavior for ordinary **Contact Us** buttons.
- Extended concierge-first behavior to ordinary House-support call buttons.
- Added automated regression coverage for the startup sequence and support-button routing.

## Routing preserved

- Stay-support human handoff from inside the Concierge continues to route to Su.
- House-arranged booking actions continue to use the centralized booking number.
- Koh Tao Rescue, 1669 and other explicit emergency call actions remain direct.

## Meta WhatsApp status

The official WhatsApp staff-alert integration remains fail-safe and inactive until Meta business verification, the Utility template and encrypted staff recipients are configured. This release does not require Meta verification for the public Concierge, owner dashboard or ordinary guest-support handoff to work.

## Validation

- All 53 automated tests pass.
- JSON parsing, JavaScript syntax, Google Apps Script syntax, Worker bundling, release metadata and archive safety are checked before handoff.

## Deployment

1. Replace the repository contents with this release or commit all supplied changes through GitHub Desktop.
2. Push the commit to the existing deployment branch.
3. Confirm `/api/concierge/status` reports release `5.11.4`.
4. Open an operational guest page in a private Safari window and confirm the **Concierge** launcher opens.
5. Confirm an ordinary **Contact Us** or House-support call button opens the Concierge first.
6. Confirm booking calls and explicit Koh Tao Rescue or 1669 emergency calls remain direct.
