# v5.11.11 — Complete Luggage Request Validation

This patch prevents an actionable luggage-storage request from being submitted before the operational team has everything needed to handle it. Arrival or departure context, requested time, bag count and a usable international WhatsApp or telephone number are now mandatory. The Concierge collects missing fields over one or more messages and submits only when the request is complete.

Informational luggage questions remain informational. If a critical property incident is reported while luggage details are being collected, the critical message immediately interrupts and clears the lower-priority workflow while preserving deliberate urgent-alert confirmation.

The raw reply number remains transient. It is carried separately to the protected staff-delivery path and redacted before browser conversation history is stored. It does not enter Concierge interactions, alert records, dashboard summaries, learning data or application logs.

Completed luggage requests continue to route to Su plus both owners.

Automated regression result: 72 passed, 0 failed.
