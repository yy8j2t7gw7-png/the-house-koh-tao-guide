# Maintenance Reporting Operations

## Purpose

v5.11.0 gives a verified guest a room-specific **Report a Problem** form. It is intended for faults that need House attention, not medical emergencies. The room comes from the verified session; the guest cannot choose or override it.

## Guest categories

- Water leak or flooding
- Toilet
- Water or shower
- Air conditioning
- Electricity
- Door or security
- TV
- Refrigerator
- Fan
- Wi-Fi
- Furniture or fixture
- Other issue

There is deliberately no separate pests category. A guest may use **Other issue** and describe what happened.

## Routing

Routine maintenance reports are recorded in the protected owner console and route to the configured House support recipients.

The following scenarios are critical and route to the urgent team:

- active water leak or flooding;
- toilet overflowing;
- sparks, smoke, burning smell or exposed wiring;
- room cannot be secured.

Critical reports require a telephone or WhatsApp reply number so the team handling the incident can contact the guest. The number is validated, attached only to the transient protected WhatsApp delivery payload and never written to the maintenance report or alert database.

If the official WhatsApp Business Platform is not configured, reports still appear in `/concierge-admin`, but no automated WhatsApp push is sent. Follow `WHATSAPP_ALERT_OPERATIONS.md` to activate protected delivery.

## Toilet policy

Only human waste may be flushed. Toilet paper, tissues, wipes, sanitary products and every other item must go in the bin provided.

For a clogged-toilet report, the guest acknowledges that a 1,000 THB clearance fee applies only if inspection confirms that paper, tissues or another prohibited item caused the blockage. The acknowledgment does not by itself create a charge and does not replace inspection.

## Private photos

One optional JPEG, PNG, WebP or HEIC image up to 10 MB may be attached. The server validates the file signature and stores it under the private `maintenance/` prefix in the existing `PASSPORT_UPLOADS` R2 binding. The object is never public and never enters AI, guest chat, model prompts or ordinary WhatsApp content.

An authorized owner can download or delete the image from `/concierge-admin`. Resolved report records and old images are cleaned by the scheduled application job. R2 lifecycle deletion is the independent maximum-retention control.

## Required R2 lifecycle rule

In the private `the-house-passport-uploads` bucket, create a separate Object Lifecycle Rule:

- Rule name: `Delete maintenance photos after 30 days`
- Prefix: `maintenance/`
- Action: delete uploaded objects
- Age: `30 days`
- Status: enabled

Keep the existing `passport/` 14-day rule unchanged. Do not apply the maintenance rule to the whole bucket.

## Owner workflow

1. Open `/concierge-admin` and authenticate with the private admin token.
2. Review the **Maintenance reports** section.
3. Use the report reference, room, category and sanitized description to coordinate the response.
4. For critical events, contact the guest using the reply number delivered through the protected WhatsApp alert; it is intentionally not retained in the dashboard.
5. Download an attached image only when required for the response.
6. Delete the image as soon as it is no longer needed.
7. Acknowledge and resolve the associated alert through the owner console.

## Privacy invariants

- Recipient names and telephone numbers stay only in encrypted Cloudflare configuration.
- Guest reply numbers are transient delivery data and never enter Git, release archives, AI, learning records or operational storage.
- Maintenance images are private and automatically deleted within 30 days, or sooner after owner deletion.
- Passport and maintenance objects use different prefixes and different lifecycle periods.
- No key-box code, stay confirmation code, passport information or private session token is included in a maintenance report or staff alert.
