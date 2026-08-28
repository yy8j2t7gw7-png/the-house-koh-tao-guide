# The House – Koh Tao v5.11.17

## Release purpose

v5.11.17 fixes the confirmed production Meta template-translation rejection and restores discreet owner-dashboard access from guest-page footers.

## Confirmed root cause

The v5.11.16 production diagnostic for the verified Room 11 request `I need fresh towels` recorded:

- template: `house_service_alert_v3`;
- requested language: `en_US`;
- structure: one BODY component with five ordered text parameters;
- Meta response: HTTP 404, `OAuthException`, code `132001`;
- provider classification: template or language;
- provider detail: the template does not exist in the requested `en_US` translation.

WhatsApp Manager confirmed that all six current templates are approved as generic English (`en`). The five v1 rollback templates are approved as English (US) (`en_US`). The component structure and parameters were already correct.

## Exact fix

- Every approved template schema now includes its immutable Meta language code.
- The current service v3, luggage v2, booking v2, urgent v2, lost-key v3 and status v1 templates use `en`.
- The deliberate service, luggage, booking, urgent and lost-key v1 rollback schemas retain `en_US`.
- The mapped template—not a global environment value—now selects the outbound language.
- Template names, BODY components, parameter counts/order, recipient routing, diagnostics and acceptance rules are unchanged.
- The existing `WHATSAPP_ALERT_TEMPLATE_LANGUAGE` deployment value may remain unchanged; it is retained as a compatibility/configuration fallback and does not override a mapped template schema.

## Admin footer access

Guest-facing pages now expose a discreet **Admin Login** link in their normal footer. The link targets `/concierge-admin` without a token or credential. Legal-page footers include the same link directly. The owner console continues to require server-side authentication.

## Security preserved

- No access token, recipient number, guest reply number, passport information, stay code, stay token or key-box code is added to public files, URLs, alerts or diagnostics.
- Failed WhatsApp delivery remains truthful to the guest.
- Spare-key release still requires an active verified room session, after-hours eligibility, deliberate 500 THB acceptance, at least one accepted protected notification and no outstanding rotation lock.
- Critical-property confirmation, luggage and booking validation, contact redaction, role routing, acknowledgement idempotency and escalation behavior are unchanged.

## Deployment

1. Deploy v5.11.17 without changing Meta templates, Cloudflare template variables, recipient mappings or secrets.
2. Confirm `/api/concierge/status` reports `5.11.17` and `whatsappAlertsConfigured: true`.
3. From a verified active room, send `I need fresh towels`.
4. Confirm exactly one `house_service_alert_v3` delivery reaches Su plus both owners and the guest receives the natural success response.
5. In **WhatsApp delivery diagnostics**, confirm no new HTTP 404 / `132001` record is created. The actual outbound template must be `house_service_alert_v3`, language `en`, one BODY component and five text parameters.
6. Continue the live checklist below only after the service test succeeds.

## Complete live regression order

1. Routine service: fresh towels or room cleaning → Su plus both owners; Fah excluded.
2. Luggage: collect arrival/departure, time, bag count and international contact before one v2 alert; incomplete data must not submit.
3. Booking: complete the structured diving flow → Fah plus both owners; Su excluded; guest wording remains unconfirmed pending availability/payment.
4. Urgent property: a flooding report must interrupt ordinary workflows, require **Send urgent alert**, then route to Fah plus both owners without Su.
5. Lost key: during the genuine after-hours window, verify fee confirmation, successful protected v3 notification, code release and rotation lock. Never copy a real key-box code into test evidence.
6. Staff status: use `RECEIVED` or `ACK`, then `RESOLVE`; only other assigned recipients receive one status update and applicable escalation stops.
7. Diagnostics: verify records remain sanitized and owner-only.
8. Footer: check **Admin Login** at the bottom of core guest and legal pages on desktop and mobile; verify `/concierge-admin` still requires the admin token.

## Validation

- Complete source suite: 103/103 passed before packaging.
- JavaScript, Google Apps Script, JSON, repository, archive and credential checks are repeated against the final release artifact.
