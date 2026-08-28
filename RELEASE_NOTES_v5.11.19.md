# The House – Koh Tao v5.11.19

> **Historical release:** The v5.11.19 quick-action setup has been superseded. Never map the buttonless `house_service_alert_actions_v1`; use the default-off v5.11.20 guide and intended service v2 template instead.

## Release outcome

v5.11.19 repairs the reported luggage submission failure, introduces real housekeeping scheduling, completes structured House booking workflows and prepares one-tap staff actions without changing the current production Meta or Cloudflare configuration.

## Confirmed root causes

- The protected server already enforced luggage validation and delivery acceptance, but the browser caught any protected API failure and silently used its device-only answer engine. That engine cannot create or deliver an operational alert, so it could display a plausible reply while Meta received nothing. Protected luggage, cleaning and booking requests can no longer enter that fallback.
- Housekeeping availability previously checked only the clock. It did not model Monday closure, treated cleaning like an immediate supply delivery and could describe Sunday-evening work as the following morning.
- Diving was the only fully structured booking path. Generic **Book with Us** prompts discarded the selected category and other services could reach a generic handoff without category-specific required fields.
- The approved production alert templates do not contain quick-reply buttons. One-tap staff actions therefore require separately approved successor templates; application support alone cannot add buttons to an existing Meta template definition.

## Guest workflow changes

- Luggage state now preserves arrival/departure, requested date, requested time, bag count and sanitized notes through a local-format contact rejection. A valid international correction completes the same request once.
- A protected browser failure displays explicit **not sent** wording and retains the workflow. Guest success wording is returned only after at least one WhatsApp delivery is accepted.
- Housekeeping availability is Tuesday–Sunday, 10:30–19:30 Bangkok time, with 19:30 excluded and Monday closed all day. Sunday at or after 19:30 and every Monday correctly identify Tuesday at 10:30 as the next opening.
- Cleaning collects a preferred clock time, `now` or `ASAP` before sending one service alert. The confirmation states that the preference is not a guaranteed appointment.
- Routine **Call Us** fallback appears only while housekeeping is open. Emergency and urgent actions remain independent.
- Fishing, snorkeling, taxi, taxi/longtail boat, ferry and motorbike taxi now have information-only answers and separate structured booking workflows. Diving retains its existing validation.
- Complete booking requests route to Fah plus both owners; recommendation-only questions create no alert. Ferry never requests passport information. All bookings remain unconfirmed until availability is confirmed and payment is received.

## Staff quick actions

Five optional generic-English Utility template schemas support **Received** and **Resolve** quick replies. The feature is fail-closed and defaults off. Current production template names, language codes, BODY shapes, recipient groups and secrets remain unchanged.

Do not enable `WHATSAPP_STAFF_ACTIONS_ENABLED` until all five templates are approved and Active with the exact mappings in `META_STAFF_QUICK_ACTIONS_v5.11.19.md`. Typed `RECEIVED`, `ACK` and `RESOLVE` remain available. Rollback requires setting only the feature flag to `false`.

## Security and privacy

- International reply contacts remain transient, immediately redacted and excluded from normal browser history, interaction records, alert records, dashboards, learning data and logs.
- Structured luggage and booking fields are independently validated again at final alert creation.
- Quick-reply payloads contain only an allowed command and opaque alert ID. Signed webhooks retain assigned-recipient authorization, actor exclusion, idempotency, status fanout and escalation-stop behavior.
- Passport information, confirmation codes, stay tokens, key-box codes, payment data, tokens, app secrets and recipient telephone numbers remain excluded from operational alerts and release artifacts.

## Verification

- Complete automated suite: **122 passing, 0 failing**.
- Coverage includes the exact arrival-tomorrow / three-bag / 2:00 PM local-to-international correction, one-alert delivery to Su plus both owners, browser protected-failure behavior, Tuesday time boundaries, Monday closure, Sunday evening, `now` / `ASAP` cleaning, all six added booking categories, information-only behavior, local-contact correction, Fah-plus-owner routing and quick-action authorization/idempotency/fanout.
- Source and independently extracted ZIP receive the same complete test, syntax, JSON, credential and manifest checks before handoff.

## Deployment order

1. Deploy v5.11.19 with the six current production template variables unchanged and `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.
2. Confirm `/api/concierge/status` reports release `5.11.19` and WhatsApp configured.
3. Live-test the reported luggage scenario and verify one alert reaches Su plus both owners.
4. Test housekeeping at Tuesday 10:29, 10:30, 19:29 and 19:30, plus Monday and Sunday after 19:30.
5. Test information-only and complete requests for fishing, snorkeling, taxi, taxi/longtail boat, ferry, motorbike taxi and diving. Complete bookings must reach Fah plus both owners without Su.
6. Re-test verified lost key, confirmed urgent alerts, typed staff commands, escalation and protected diagnostics.
7. Submit the optional quick-action templates separately. Activate only after all five are Active, then run the checklist in `META_STAFF_QUICK_ACTIONS_v5.11.19.md`.
