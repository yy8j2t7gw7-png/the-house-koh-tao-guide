# WhatsApp Concierge Alert Operations

## Purpose

v5.10.0 contains the protected server-side alert channel for guest requests that require attention. Guests continue to use the website concierge. The Worker can notify configured owners or staff through the official WhatsApp Business Platform without exposing recipient numbers in public files.

The alert channel is separate from guest-facing contact buttons:

- routine stay requests route to the protected `support` group;
- actionable House-arranged bookings route to `booking`;
- after-hours lost keys route to `urgent`;
- medical and serious property incidents route to `emergency`;
- unacknowledged urgent or critical alerts route to `escalation` after 10 minutes.

A recommendation question alone does not create a booking alert. The guest must ask to book, reserve, arrange or check availability. Repeated identical alerts from the same session are deduplicated for five minutes.

## Safety and privacy

- Recipient names and numbers are stored only in a Cloudflare Worker secret.
- The operational database stores recipient labels and salted one-way hashes, never the phone numbers.
- Guest descriptions are sanitized before an alert is created.
- Passport fields, key-box codes and private stay tokens are never included.
- A displayed room number is guest-selected context, not identity verification.
- The alert channel never contains or has access to a key-box code. Automatic spare-key release is a separate verified-stay operation: the system sends the protected `urgent` notification automatically and fails closed unless the WhatsApp API confirms at least one message submission. The guest confirms only the 500 THB fee and does not approve the staff notification.
- Alert records and delivery metadata are removed after 30 days.

## Meta prerequisites

Use the official Meta-hosted WhatsApp Cloud API. Meta requires a business portfolio, WhatsApp Business Account and business phone number. For production, use a system-user token with `whatsapp_business_management` and `whatsapp_business_messaging` rather than the short-lived test token.

Create and approve this Utility template in WhatsApp Manager:

- Template name: `house_concierge_alert`
- Language: English (`en_US`)
- Body:

```text
{{1}} guest alert from The House
Location: {{2}}
Type: {{3}}
Bangkok time: {{4}}
Details: {{5}}
Reference: {{6}}

Reply ACK {{6}} to acknowledge or RESOLVE {{6}} when handled.
```

Internal recipients must agree to receive these operational messages. Template category and approval remain subject to Meta review.

## Cloudflare secrets

Add these values in Worker **Settings → Variables and Secrets** as encrypted secrets:

```text
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_WEBHOOK_VERIFY_TOKEN
META_APP_SECRET
WHATSAPP_ALERT_RECIPIENTS
```

Keep the existing `CONCIERGE_HASH_SALT` configured as well. It salts the one-way recipient hashes stored with delivery metadata. If it is unavailable, the adapter falls back to the private Meta app secret rather than a public value.

`WHATSAPP_PHONE_NUMBER_ID` is Meta's numeric phone-number ID, not the displayed telephone number.

Generate `WHATSAPP_WEBHOOK_VERIFY_TOKEN` as a new long random secret. `META_APP_SECRET` comes from the Meta app settings.

Use this JSON structure for `WHATSAPP_ALERT_RECIPIENTS`. Replace every example with a real protected recipient. Use international digits and no `+` sign.

```json
{
  "support": [
    { "label": "Stay support", "phone": "66XXXXXXXXX" }
  ],
  "booking": [
    { "label": "Booking", "phone": "66XXXXXXXXX" }
  ],
  "urgent": [
    { "label": "Owner 1", "phone": "66XXXXXXXXX" },
    { "label": "Stay support", "phone": "66XXXXXXXXX" }
  ],
  "emergency": [
    { "label": "Owner 1", "phone": "66XXXXXXXXX" },
    { "label": "Owner 2", "phone": "66XXXXXXXXX" },
    { "label": "Stay support", "phone": "66XXXXXXXXX" }
  ],
  "escalation": [
    { "label": "Owner 1", "phone": "66XXXXXXXXX" },
    { "label": "Owner 2", "phone": "66XXXXXXXXX" },
    { "label": "Stay support", "phone": "66XXXXXXXXX" }
  ]
}
```

The same person may appear in more than one role. A maximum of 12 unique numbers is accepted per group.

## Webhook

In the Meta app dashboard, configure the callback URL:

```text
https://YOUR-WORKER-DOMAIN/api/whatsapp/webhook
```

Use the same value stored in `WHATSAPP_WEBHOOK_VERIFY_TOKEN` for webhook verification. Subscribe the WhatsApp Business Account to message and message-status webhooks. Incoming POST events are rejected unless their `x-hub-signature-256` matches `META_APP_SECRET`.

Authorized recipients may reply:

```text
ACK alert_REFERENCE
RESOLVE alert_REFERENCE
```

Acknowledgement stops the pending escalation. Resolution closes the alert. The protected owner console also provides **Acknowledge** and **Resolve** buttons.

## Non-secret variables

The release contains these defaults in `wrangler.jsonc`:

```text
WHATSAPP_GRAPH_API_VERSION=v23.0
WHATSAPP_ALERT_TEMPLATE_NAME=house_concierge_alert
WHATSAPP_ALERT_TEMPLATE_LANGUAGE=en_US
WHATSAPP_ALERT_ESCALATION_MINUTES=10
```

Change the Graph API version only after reviewing Meta's current supported versions. The scheduled Worker trigger checks once per minute for overdue escalations.

## Verification

1. Deploy after all secrets and the approved template are ready.
2. Open `/api/concierge/status` and confirm `whatsappAlertsConfigured: true`.
3. Open `/concierge-admin` and confirm the alert panel says **WhatsApp connected**.
4. Use non-sensitive test text from a room page:
   - “Please clean my room.” → support
   - “Can you help me book snorkelling?” → booking
   - “I lost my key.” after 19:30 Bangkok → urgent
   - “There is a serious water leak in my room.” → emergency
5. Confirm the expected recipients receive only the sanitized summary and guest-selected room context.
6. Reply `ACK` with the exact alert reference, then confirm the owner console changes to acknowledged.
7. Repeat a critical test without acknowledgement and confirm the escalation group receives it after approximately 10 minutes.
8. Resolve every test alert and remove test recipient values if they are no longer needed.
9. With a temporary `SPARE_KEY_CODES` value and verified test stay, confirm the guest sees no code when the urgent group is missing or WhatsApp rejects delivery.

If the WhatsApp configuration is incomplete, alerts still appear in the protected owner console and the guest concierge remains usable. Delivery attempts show `not_configured` without exposing a credential error to guests.
