# Owner WhatsApp Guest Messaging — v5.11.61

## Behavior

When the Owner App opens a reservation:

- if a WhatsApp thread already exists, it opens that thread;
- otherwise the server resolves the guest phone from the protected Beds24 personal booking data;
- if a phone is available, the server sends one approved WhatsApp initiation template;
- a Unified Messaging thread is created and subsequent conversation remains in the shared Inbox.

The iPhone receives only a masked phone indicator and reservation/thread IDs. Meta credentials stay server-side.

## Required setup

Create/approve an appropriate guest-contact template in Meta, then set:

```text
WHATSAPP_GUEST_INIT_TEMPLATE_NAME=<approved template name>
WHATSAPP_GUEST_INIT_TEMPLATE_LANGUAGE=en_US
```

Do not set the template name until Meta approval is complete.

## Customer-service window

Free-form WhatsApp replies remain subject to Meta's customer-service-window rules. Outside that window, initiation must use an approved template. If Meta rejects a free-form send because the window is closed, keep the conversation in template mode until the guest replies.
