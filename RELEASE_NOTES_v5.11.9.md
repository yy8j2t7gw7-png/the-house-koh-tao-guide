# v5.11.9 — Production Contact, Date and Alert-Status Hardening

This patch corrects the House emergency-call target, adds privacy-safe mandatory contact collection for actionable booking, luggage and routine maintenance workflows, normalizes relative booking dates in Bangkok time and prepares approved-template acknowledgement/resolution updates for other assigned staff.

Production continues using the five working v1 Meta templates. Switch the purpose-specific Cloudflare template-name variables only after the reviewed replacements are Active. Status updates remain disabled until `house_alert_status_v1` is approved and `WHATSAPP_STATUS_TEMPLATE_NAME` is configured.

Automated regression result: 61 passed, 0 failed.
