# Cloudflare Free-tier deployment fix

This repack keeps the backend version unchanged and removes redundant plain-text Wrangler variables whose exact values are already defaults in the source code.

Wrangler plain-text vars before: 42
Wrangler plain-text vars after: 34
Removed: OPENAI_MODEL, OPENAI_REASONING_EFFORT, OPENAI_TRANSLATION_MODEL, PASSPORT_RETENTION_DAYS, MAINTENANCE_RETENTION_DAYS, WHATSAPP_GRAPH_API_VERSION, PUBLIC_GUIDE_BASE_URL, WHATSAPP_GUEST_INIT_TEMPLATE_LANGUAGE

Based on the deployment logs showing 24 additional secrets/text variables, the expected total is approximately 58, below the Cloudflare Workers Free limit of 64.

No secret was removed. No enabled/disabled feature flag was changed. MOBILE_SESSION_TTL_DAYS remains explicit at 30 days.
