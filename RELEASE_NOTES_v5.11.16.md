# The House – Koh Tao v5.11.16

## Release purpose

v5.11.16 is a diagnostic evidence release for the confirmed production rejection of `house_service_alert_v3` in v5.11.15. It does not make a speculative Meta payload change and must not be described as the final delivery fix.

## Confirmed request construction

The Room 11 fresh-towel path selects:

- template: `house_service_alert_v3`;
- language: `en_US`;
- components: one BODY component only;
- parameters: five text values in the approved order: alert reference, room, human-readable request, Bangkok date/time and details;
- recipients: the protected `support_with_owners` role, which resolves to Su plus both owners.

The same schema-controlled sender is used for:

- `house_luggage_alert_v2` — BODY with 6 text parameters;
- `house_booking_alert_v2` — BODY with 6 text parameters;
- `house_urgent_alert_v2` — BODY with 5 text parameters;
- `house_lost_key_alert_v3` — BODY with 3 text parameters;
- `house_alert_status_v1` — BODY with 5 text parameters.

No template name, language, component or parameter construction was changed in this release.

## Root-cause evidence gap

v5.11.15 extracted only `error.code` (or the HTTP status) from a failed Meta response and discarded the provider message, subcode, type, details and trace ID. The complete response for the 28 August production failure therefore cannot be reconstructed from that source or release archive.

v5.11.16 adds a safe diagnostic record at the common Graph API submission boundary. It records the selected template and value-free request shape together with Meta's sanitized HTTP/error response. Existing v5.11.15 failed delivery records remain visible with their retained numeric code and are labelled as legacy evidence.

## Privacy and retention

Diagnostics never contain recipient numbers, guest contact numbers, template parameter values, access tokens, passport data, Airbnb confirmation codes, stay tokens or key-box codes. Records are available only through the protected owner console and are removed after 30 days.

## Deployment and evidence collection

1. Deploy v5.11.16 without changing any Meta or Cloudflare variables or secrets.
2. Confirm `/api/concierge/status` reports `5.11.16`.
3. Open `/concierge-admin` and authenticate normally.
4. Scroll to **WhatsApp delivery diagnostics**.
5. Read the retained v5.11.15 Room 11 service failure. Copy only the diagnostic card, never secrets or recipient details.
6. If the legacy numeric code alone is not conclusive, perform one controlled verified-room request: `I need fresh towels`.
7. Return the new sanitized diagnostic card to development. The corrective patch must be based on that exact evidence.

## Validation

- Complete automated suite: 100/100 passed before packaging.
- JavaScript, JSON, repository, archive and credential checks are recorded in the release handoff.

