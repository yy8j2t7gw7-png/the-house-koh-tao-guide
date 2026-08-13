# The House v5.8.2 Release Notes

## GitHub Desktop summary

`Release v5.8.2: make full-page translation reliable`

## GitHub Desktop description

- Split incomplete or failed model translation groups into smaller recoverable sub-batches.
- Retry temporary translation endpoint failures and individual approved strings marked for retry.
- Prevent overlapping browser translation flushes that could leave later page sections in English.
- Refresh browser and server translation caches so incomplete earlier results cannot persist.
- Audit every visible static text item and accessibility label across all live operational guest pages.
- Preserve seven languages, animated concierge dots, Bamboo social actions, disabled Explore source and all existing privacy and emergency safeguards.
- Pass all 35 automated release checks from the packaged ZIP.

## Production note

Push v5.8.2 instead of v5.8.0 or v5.8.1. No new secrets or Cloudflare bindings are required. Existing production configuration remains valid. After deployment, select another language and allow the first full page translation to finish; later visits reuse the refreshed cache.
