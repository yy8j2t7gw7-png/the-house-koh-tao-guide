# THE HOUSE – KOH TAO
## Release Notes v5.11.48 — Reversible Guest-Type Selection

### Added

- Verified guests can return to the Thai-only / foreign-mixed choice when they selected the wrong guest type and registration evidence has not yet been uploaded.
- Guest-facing control: **Selected the wrong guest type? Change selection**.
- Works in both directions: Thai-only → foreign/mixed and foreign/mixed → Thai-only.
- Returning to the choice does not require stay verification again.

### Safety boundary

- Every unused passport or Thai-ID upload link from the abandoned registration branch is invalidated before the choice is reset.
- Self-service switching is blocked after any passport/Thai-ID evidence has been uploaded.
- Staff-authorized in-person registration states and completed registration remain protected and require Owner Admin review for corrections.
- Direct API switching from a Thai pending branch to foreign is blocked until the explicit reset action is used, preventing an old Thai-ID upload link from surviving a branch change.

### Preserved

No housekeeping, early/late stay timing, WhatsApp, lost-key, finance, reservation-sync, direct/walk-in stay, TM30 processing, retention, or other v5.11.47 production behavior is intentionally changed.

### Validation

Full automated regression suite: **270 passed / 0 failed** before final package verification.
