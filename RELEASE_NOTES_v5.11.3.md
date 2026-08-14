# The House – Koh Tao v5.11.3

## Release summary

v5.11.3 makes room-problem reports easier for guests and the team to identify. Long internal UUIDs are replaced in every visible operational surface with a concise room-and-Bangkok-timestamp reference, while the secure internal identifier remains private.

## Guest-facing improvements

- Report confirmations now show a reference such as `R2-D20260814-T175123`.
- The reference identifies the verified room and the Bangkok date and time without containing guest identity, contact details or booking information.
- The conditional 1,000 THB toilet-clearance fee is integrated into the normal toilet guidance and remains bold at the standard text size.

## Operations and security

- The guest confirmation, protected alert summary and owner dashboard use the same readable reference.
- Date and time are both retained so multiple reports from one room on one date remain distinguishable.
- Internal maintenance UUIDs remain private and continue to protect storage, photo access and authenticated record actions.
- No guest reply number, confirmation code, passport information, key-box code or internal identifier is exposed by the public reference.

## Validation

- All 52 automated tests pass.
- JSON parsing, JavaScript syntax, Worker bundling, release metadata and archive safety are checked before handoff.

## Deployment

1. Replace the repository contents with this release or commit all supplied changes through GitHub Desktop.
2. Push the commit to the existing deployment branch.
3. Confirm `/api/concierge/status` reports release `5.11.3`.
4. Submit a non-sensitive test room report and confirm that the same readable reference appears in the guest confirmation and owner dashboard.
