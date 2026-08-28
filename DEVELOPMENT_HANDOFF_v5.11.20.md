# Development Handoff — v5.11.20

## Authoritative checkpoint

The ready-to-push v5.11.20 source is a functional-fix release built directly on the preserved production v5.11.19 package. Do not reconstruct it from v5.11.18 and do not discard its uncommitted history merely because repository HEAD still points at the earlier pushed baseline.

Read `PROJECT_RULES.md`, `WORK_HANDOVER_PROMPT.md`, `RELEASE_NOTES_v5.11.20.md`, `WHATSAPP_ALERT_OPERATIONS.md` and `META_STAFF_QUICK_ACTIONS_v5.11.20.md` before the next change.

## Completed in v5.11.20

- Natural dirty-room wording now establishes deterministic cleaning state and completes one protected Su-plus-owner service alert when the preferred time arrives.
- Direct fishing/snorkeling intent and category **Book with Us** prompts enter structured booking collection; informational questions remain alert-free.
- Lost-key policy is evaluated explicitly from the current active-stay verification state and is independent of passport completion.
- Unverified lost-key requests create no alert or code; verified office-hours requests create only a dedicated lost-key alert; verified after-hours requests retain the fee, notification-before-code and rotation gates.
- Verified guests with passport registration pending can reach only the protected lost-key form from the access page; the private guide remains locked.
- Browser fallback is blocked for the repaired protected paths, and the final WhatsApp boundary independently rejects an unverified lost-key alert.
- The intended service quick-action schema is v2. The buttonless service v1 is invalid. Quick actions are still disabled and no production mapping was changed.

## Security invariants to preserve

- Active-stay verification and passport registration are separate. Passport incompleteness must not invalidate a current verified stay for lost-key assistance, and it must not unlock the private room guide.
- Never expose a key-box code in Concierge messages/history, WhatsApp or Meta payloads, alerts, logs, diagnostics, screenshots, Git or release files.
- After-hours code display requires a current room-bound active-stay session, Bangkok after-hours, deliberate 500 THB acceptance, at least one accepted protected lost-key notification and an unblocked rotation state.
- A previous session, day, stay, room or guest context cannot authorize another release.
- Cleaning requires no reply phone number. Completed booking and luggage requests require a usable international contact that remains transient and redacted outside the protected delivery payload.
- Production recipient groups, all six current templates, typed staff commands, emergency routes, passport retention and Airbnb synchronization are unchanged.

## Validation checkpoint

- Complete Node test suite: **126 passed, 0 failed**.
- New tests use real cookie-backed stay verification and foreign-registration-pending state, rather than forging guest authorization in a request body.
- Source validation includes JavaScript, Google Apps Script and JSON syntax; version and configuration checks; secret/contact/key-code scanning; Git integrity; and no-visual-redesign inspection.
- The final release ZIP must be independently extracted and receive the same complete 126-test suite plus exact manifest/content comparison before delivery.

## Deployment checkpoint

Deploy v5.11.20 through the existing workflow with current production configuration unchanged and `WHATSAPP_STAFF_ACTIONS_ENABLED=false`. Smoke-test only cleaning continuation, structured booking entry and verified/unverified lost-key handling as listed in `RELEASE_NOTES_v5.11.20.md`.

Meta activation is separate. Never map `house_service_alert_actions_v1`. After all five intended action templates are confirmed Active, a later explicitly authorized activation may map `house_service_alert_actions_v2` plus the four v1 action templates documented in `META_STAFF_QUICK_ACTIONS_v5.11.20.md`.

## Next-work boundary

Stop after deploying and smoke-testing v5.11.20. Do not begin visual polish, redesign or another product milestone automatically. Obtain a new scoped task first.
