# The House v5.8.0 Release Notes

## GitHub Desktop summary

`Release v5.8.0: complete translations and protected WhatsApp alerts`

## GitHub Desktop description

- Fix full-page translation so one unsupported dynamic sentence cannot block the rest of an approved page.
- Retain English, Thai, Simplified Chinese, Russian, German, French and Spanish across every live operational guest page.
- Add protected action-needed alerts for support, bookings, after-hours lost keys and serious incidents.
- Add official WhatsApp Business Platform delivery, signed acknowledgement, duplicate suppression and urgent/critical escalation.
- Add owner-console alert acknowledgement and resolution while keeping recipient numbers encrypted.
- Clarify that TM30 passport registration applies only to non-Thai guests and require owner confirmation before creating a private request.
- Keep Explore disabled but fully preserved for the later rebuild.
- Preserve passport privacy, 14-day deletion, Su/Fah routing, Koh Tao Rescue-first medical actions and the secure spare-key boundary.
- Pass all 30 automated release checks and the local Worker bundle validation.

## Production note

Deploying this ZIP activates the updated operational site and owner alert console. Automatic WhatsApp delivery starts only after the official Meta account, approved Utility template and encrypted Cloudflare secrets in `WHATSAPP_ALERT_OPERATIONS.md` are configured. Until then, action-needed alerts remain visible in `/concierge-admin`.

Secure spare-key code delivery is not released. The 500 THB lost-key replacement fee remains active in guest guidance.
