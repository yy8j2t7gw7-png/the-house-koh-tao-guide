# Release Notes v5.11.23

## Outcome

v5.11.23 is a narrow production conversation/state correction built directly on the completed and deployed v5.11.22 release. It corrects booking conversation and validation, property issue isolation, unresolved-urgent visibility and lost-key reset operations. It does not begin the full public visual redesign; that work remains v5.11.24.

Production Meta mappings, recipients, secrets, webhooks and quick-action state are unchanged. `WHATSAPP_STAFF_ACTIONS_ENABLED=false` remains required.

## Exact root causes and corrections

### Booking side questions

The v5.11.22 active collector fed every guest turn directly into the parser for the currently missing field. It had no branch for a side question or preference, so an alternative-provider question failed field parsing and the same question was rendered again with no acknowledgement.

The shared collector now recognizes provider preferences, luggage, bicycles, children and other concise side questions across all seven booking categories. It acknowledges the message, retains a sanitized note in the same workflow and continues with the same next missing field. It does not start a parallel request, create a premature alert or promise third-party availability.

### Booking dates

The old extractor accepted `/` and `-` numeric separators but omitted `.`, and the sanitation path could treat an exact dashed date as a telephone-like value. It also returned only a value-or-empty result, so the collector could not distinguish a past date from unparseable input.

One shared Bangkok parser now returns valid, past, invalid or missing status. It supports dotted, slashed, dashed, named and relative dates, including `30.08.2026`, `30/08/2026`, `30-08-2026`, `30 August 2026`, `August 30 2026`, `tomorrow`, `day after tomorrow` and `next Tuesday`. Past and invalid input receives a concise reason and remains at the date step with no alert.

### Diving certification

The previous four-value regex recognized only Open Water, Advanced Open Water, Rescue Diver and Divemaster. Legitimate instructor and agency-qualified descriptions fell through to an unexplained repeated prompt.

Fun Diving certification is now sanitized human-readable booking information with normalization for common aliases and preservation of meaningful agency context. Useful unfamiliar diver/instructor/level descriptions are accepted; only clearly unusable nonanswers are rejected with an explanation.

### Open Water completion and protected delivery

The exact v5.11.22 production path was reproduced against the untouched release archive. Its field validator correctly treats Open Water as a course selection and correctly preserves date, four divers and course across a rejected local contact. It does not require Fun Diving certification. With accepted Meta message IDs, the same baseline path completes.

Therefore the observed generic no-send sentence was not caused by a hidden Open Water field or stale local contact. That branch is reached when the protected operation obtains zero accepted notification deliveries. v5.11.22 also stored the alert before delivery and then treated the stored alert as an unconditional duplicate, so a delivery failure could poison the retry: the next attempt skipped dispatch and returned the same no-send result.

v5.11.23 retains fail-closed behavior and fixes that state boundary. A booking alert with delivery attempts but zero acceptances becomes `delivery_failed`, separate from active collection. Unrelated bar, checkout, Wi-Fi, property or other new intents route normally and never trigger an automatic resend. Only an explicit retry phrase may reuse the safe completed snapshot and transient contact under the same alert ID. If a prior attempt was already accepted, the duplicate is treated as already sent without another notification. A valid corrected contact replaces the local attempt, all prior fields remain intact, exactly one alert record exists and success wording remains impossible until at least one provider message ID is returned. The protected owner diagnostics retain the external provider failure classification; no unprovided Meta error code is inferred from the guest-facing symptom.

### Property issue contamination

v5.11.22 concatenated pending notes with the new message before confirming that the new issue matched the pending category. Its dedupe key used only room/session/category. That allowed pest text to enter an odor report, odor text to enter equipment, and a later distinct issue in the same category to be suppressed.

Detail state is now isolated by protected session, room, category and active issue content. Category transitions begin with a clean buffer. A recognizable same-issue follow-up may extend its own local notes, an exact reload repeat remains deduplicated, and a later distinct same-category issue may create its own clean alert. Suppressed text is never carried into another category.

### Unresolved urgent owner operations

The v5.11.22 renderer forced urgent sections open only while applying refreshed data. Native `<details>` toggling remained available afterward, so pointer or keyboard activation could hide unresolved urgent work.

The toggle boundary now immediately restores an urgent section, keeps `aria-expanded` synchronized, marks the summary unavailable for collapse and explains the visible **Urgent · stays open** state. **Collapse all** still skips it. Normal collapse returns after the urgent/critical condition is resolved under the existing alert semantics.

### Lost-key rotation resets

The prior owner console exposed one undifferentiated physical-rotation confirmation and had no truthful mode-specific audit. v5.11.23 keeps the protected 24/7 guest flow unchanged and adds two lock-only owner/admin actions:

- **Controlled admin test — keep existing code**, for a deliberate owner-only test in which no guest or unauthorized person saw the code.
- **Physical key-box code rotated**, only after changing the box, updating `SPARE_KEY_CODES` and deploying the updated secret.

Each requires its exact typed confirmation and writes a distinct code-free activity event with room and timestamp. Both preserve every historical release and used-request marker. A new release still requires a new request, fresh `feeAccepted=false` state, explicit 500 THB acceptance and a new accepted protected notification.

## Scope held unchanged

- Passed v5.11.22 cleaning behavior and Bangkok operating-hour validation.
- Seven-category one-question-at-a-time booking structure, finite buttons, contact-last order and availability/price/payment wording.
- Routine-versus-urgent property classifiers and the explicit **Send urgent alert** boundary.
- Verified active-stay, request/session/stay/room binding, 15-minute lost-key authorization, notification-before-view, one-way used marker, rotation lock and protected-page-only code display.
- Six active Meta template mappings, languages and BODY shapes; recipients, secrets and webhook configuration.
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`; never map `house_service_alert_actions_v1`.
- Emergency routes, passport/TM30 retention and Airbnb synchronization.
- Public visual design and disabled Explore source.

## Tests and validation

The complete regression suite contains 148 tests, up from the v5.11.22 baseline of 140. New production-path coverage includes:

- alternative-provider and non-diving side questions with one authoritative state;
- all required date formats, past/unparseable feedback and shared non-diving validation;
- nine certification examples plus rejected nonanswer feedback;
- exact Open Water flow with local contact followed by corrected international contact, first-attempt international contact, browser redaction, one Fah-plus-Owner-1-plus-Owner-2 alert and no duplicate;
- protected booking delivery failure, unrelated bar/property intent priority, explicit same-alert retry, accepted-duplicate suppression and accepted-message-ID success gating;
- rat → sewage → reload duplicate → AC → clicking follow-up → ants with clean alert summaries;
- pointer, keyboard and **Collapse all** urgent-section protection;
- controlled-test versus physical lost-key reset, cancellation, audit distinction, replay rejection and code-leak controls.

Release validation also covers JavaScript and Apps Script syntax, every JSON file, version consistency, secret/contact/key-code scans, Git integrity, Worker dry-run, ZIP CRC, exact source/archive manifest comparison and the complete suite from an independently extracted archive.

## Deployment

Deploy the ready-to-push v5.11.23 archive to the existing Worker:

```sh
npm install
npx wrangler deploy
```

Do not change the six production template mappings, recipients, secrets, webhook settings, `SPARE_KEY_CODES`, emergency routes, passport/Airbnb configuration or `WHATSAPP_STAFF_ACTIONS_ENABLED=false` as part of this code release.

Run only the changed-function smoke checklist in `DEVELOPMENT_HANDOFF_v5.11.23.md` and report the result.

## Next planned milestone

v5.11.24 — full visual polish.

Do not begin that work without a separate explicit scope.
