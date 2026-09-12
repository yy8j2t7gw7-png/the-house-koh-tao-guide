# WhatsApp Guest Communication Setup — v5.11.61

## What the release adds

Authorized owners/managers can open WhatsApp from a reservation in the mobile Bookings screen.

If a WhatsApp thread already exists for that reservation, the app opens it directly. If no thread exists, the backend can initiate a new conversation using an approved WhatsApp template.

## Required existing server configuration

The existing House Meta integration must already have server-side values for:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

These values must never be placed in the mobile app.

## New variables

Create and approve a dedicated guest-contact template in WhatsApp Manager. Then set:

- `WHATSAPP_GUEST_INIT_TEMPLATE_NAME=<approved template name>`
- `WHATSAPP_GUEST_INIT_TEMPLATE_LANGUAGE=en_US` (or the actual approved language code)

The repository ships the template name blank, so new-conversation initiation fails closed until an approved template is deliberately configured.

A suitable template concept is a short property-contact message identifying the property and inviting the guest to reply. The exact wording/category must be the wording approved by Meta for the business account.

## Privacy and permissions

- guest phone is fetched server-side from authorized Beds24 personal booking data
- mobile Bookings only receives a masked phone value
- staff do not get this contact surface by default
- `messaging.send` permission is required
- every mobile start/open action is written to the audit log
- normal WhatsApp provider rules still determine whether free-form outbound messages are accepted outside an active conversation window
