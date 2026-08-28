# Release Notes v5.11.22

## Outcome

v5.11.22 is the functional/conversational UX release built directly on the completed v5.11.21 source. It delivers progressive booking, actionable property intelligence, 24/7 request-bound lost-key recovery and collapsible owner operations. It does not begin the deferred full public-site visual redesign.

## Booking UX and root cause

The previous collector identified required fields but rendered most or all missing fields together, so a guest who had already asked to book received a form-like checklist. Some finite-choice replies could also be intercepted by information intent, and single-character party counts were rejected before the active protected workflow could consume them.

v5.11.22 centralizes all seven structured categories in the reusable progressive booking state:

- diving;
- fishing;
- snorkeling;
- taxi;
- taxi/longtail boat;
- ferry;
- motorbike taxi.

Direct actionable language and **Book with Us** now converge on the same collector. Each response asks one genuinely missing question, valid supplied details persist, finite choices use buttons and typed answers update the same state, and the international reply contact is collected last. Raw contacts remain transient and appear visibly only as `[contact supplied privately]`. A complete request creates exactly one Fah-plus-Owner-1-plus-Owner-2 booking alert and remains explicitly unconfirmed until availability, current price and payment are complete.

Diving guidance recommends Roctopus Dive without commission language. Fun Diving asks for current certification; beginner course choices skip irrelevant certification fields.

## Property intelligence

The deterministic Concierge classifier now recognizes natural physical-room reports without requiring the guest to say “please create a request.” It covers pests/animals, odors, plumbing/water, AC/fan/appliances/Wi-Fi, fixtures/furniture, mold/damp and general room condition.

- Routine issues create one protected Su-plus-Owner-1-plus-Owner-2 service alert without requesting a phone number from a verified guest.
- Same-session, same-room, same-category detail follow-ups are deduplicated.
- An unexplained odor receives one concise source clarification; clear sewage, drain, AC or similar odor reports do not.
- Dirty rooms, bathrooms, sheets and disinfection requests retain the existing preferred-time cleaning workflow.
- Information questions such as **What animals live on Koh Tao?** and **What is the Wi-Fi password?** remain informational.
- Fire, smoke, burning/electrical danger, major water flow/flooding, dangerous animals and structural danger enter the existing deliberate urgent confirmation workflow. They do not automatically contact staff or external emergency services merely from classification.

Urgent property routing remains Fah plus both owners, without Su. Routine property routing remains Su plus both owners.

## 24/7 lost-key correction and root cause

The reported 16:13 behavior was an inconsistent workflow/payload path, not simply a request routed through a coherent after-hours flow. The old office-hours branch could create a generic verified lost-key alert before any fee acceptance, while the fixed lost-key Meta template described after-hours access and stated that the replacement fee was accepted. Meanwhile the daytime guest path did not expose the protected spare-key release action. That allowed staff-facing claims with no matching current guest evidence.

v5.11.22 removes the time split. At any time of day:

1. A current verified active stay bound to the room and protected session is required.
2. A new short-lived lost-key request is issued with `feeAccepted=false`.
3. The guest explicitly accepts the 500 THB fee for that request or cancels.
4. The Worker revalidates the stay, room, session, request, fee evidence, recipients and rotation state.
5. The established lost-key recipients—Su, Owner 1 and Owner 2—are notified.
6. At least one protected Meta submission must be accepted before the guest receives the protected **View spare key** action.
7. Display occurs only on the protected guest page and immediately engages the room rotation lock.

The request token is signed, expires after 15 minutes and is single-use. Its one-way used marker prevents replay even after rotation. No prior request, day, page reload, browser session, stay, room, guest or release can supply acceptance to a new request. Daytime may additionally offer **Call Us**, but staff assistance is never required first.

Codes remain absent from Concierge history, WhatsApp/Meta payloads, alert storage, logs, diagnostics, public assets, Git, screenshots and release files. `SPARE_KEY_CODES` remains an encrypted production secret.

## Owner-console usability

Seven real top-level owner sections now use native accessible details/summary controls: stays, alerts, maintenance, passport registration, learning queue, approved knowledge and recent activity. Each header shows a count, chevron and textual Expanded/Collapsed state. Expand all and Collapse all are available; Collapse all leaves unresolved urgent/critical work visible. State persists only as a browser UI preference under a versioned localStorage key. The change does not alter backend data, sorting, reference IDs, authentication or record state.

Headers provide visible keyboard focus, a 52-pixel minimum target and mobile wrapping with protected table overflow.

## Scope held unchanged

- Six active Meta template names, languages and BODY parameter schemas.
- Production recipients, secrets, webhook and Cloudflare configuration.
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.
- `house_service_alert_actions_v1` remains invalid; the only intended future service template is `house_service_alert_actions_v2`.
- Emergency routes, passport/TM30 rules and retention, Airbnb synchronization, active room mapping and housekeeping/service operating hours.
- Explore remains preserved and disabled; the full visual-polish work is deferred.

## Validation

- Complete Node regression suite: 140 passed, 0 failed.
- Added production-path coverage for every progressive booking category, direct-versus-informational entry, **Book with Us** convergence, finite button/typed equivalence, supplied-field retention, diving conditional fields, transient contact behavior and exactly-once booking delivery.
- Added coverage for thirteen routine property phrases, same-issue deduplication, odor clarification, informational controls, cleaning reuse and five critical property phrases that require confirmation without automatic delivery.
- Added literal 16:00 and 23:00 Bangkok lost-key paths, no acceptance, cancel/UI reset, stale session, different room/stay, expiry, notification failure, rotation lock, authorized reset, used-request replay and code-leak checks.
- Added admin semantic, persisted-state, urgent-visibility, count, focus, touch-target and mobile-overflow checks.
- Release handoff requires JavaScript and Google Apps Script syntax checks, JSON parsing, version consistency, secret/contact/key leak scans, Git integrity, archive CRC/manifest comparison and the complete 140-test suite from an independently extracted ZIP.

## Deployment

Deploy the v5.11.22 bundle to the existing Worker with production mappings and secrets unchanged:

```sh
npm install
npx wrangler deploy
```

Keep `WHATSAPP_STAFF_ACTIONS_ENABLED=false`. Do not edit recipient groups, Meta template mappings, webhook settings, emergency routing, `SPARE_KEY_CODES`, passport configuration or Airbnb synchronization as part of this release.

Run the short changed-function production smoke matrix in `DEVELOPMENT_HANDOFF_v5.11.22.md` and stop after reporting it. The next planned milestone is v5.11.23, the separately scoped full visual-polish release.
