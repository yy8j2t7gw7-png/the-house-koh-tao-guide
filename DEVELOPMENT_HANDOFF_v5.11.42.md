# THE HOUSE – KOH TAO
## Development Handoff v5.11.42

### Release status

v5.11.42 is finalized from deployed v5.11.41. Historical v5.11.40/v5.11.41 files remain historical and are not overwritten.

### Change 1 — broad deterministic human contact

The production problem was repeated phrase-specific misses: semantically clear requests for a human could fall through simply because the wording differed from a small regex list. v5.11.42 replaces that narrow dependency with a broad deterministic intent family covering common human-contact roles and request forms: human/person/someone/somebody, member of staff, team, reception/receptionist/front desk, housekeeper, manager/host, agent/support agent/representative/operator/customer support, plus common talk/speak/chat/call/contact/reach/message/connect/transfer wording.

Policy is unchanged: a first ordinary human request can remain AI-first. Strong, repeated, frustrated or direct-transfer wording exposes the existing **The House team** Contact Us / Call Us actions only Tuesday–Sunday 10:30–19:30 Bangkok time. Monday/after-hours routine contact remains suppressed. No private staff name or telephone number is exposed and human-contact requests create no operational alert.

### Change 2 — stay-extension booking workflow

Natural variants such as **I wanna stay longer**, **can I extend my stay**, **can we stay longer**, **one more night**, **extra nights**, **keep our room longer**, **another day**, **stay until tomorrow** and related wording enter booking kind `stay_extension`.

Required collection is deliberately minimal:
1. number of additional nights;
2. WhatsApp/phone contact with country code.

If the guest already states the number of nights, the Concierge does not ask for it again. Local-format contact numbers remain pending until an international country code is supplied. On completion, exactly one `booking_request` alert is created through `booking_with_owners`, routing to Fah plus both owners via the existing booking template path. The protected delivery identifies **Stay extension**, requested additional nights and a protected guest reply contact. Raw contact remains transient and must not enter normal interaction history, alert storage, diagnostics, learning data or logs.

Guest-facing success wording states only that the request was sent and that the team still needs to check availability. The extension is never described as confirmed before availability and payment are handled by the team.

### Preserved invariants

- v5.11.41 mobile conversation-space and drag-stability fixes.
- Generic **The House Emergency Support** call action with responder identity/number private.
- v5.11.39 cleaning workflow/state protections and context-free send-request block.
- Numeric Wi-Fi password behavior for authorized guests.
- Snorkeling deterministic recommendations and French Kiss Divers preference handling.
- 24/7 protected lost-key notification/code gate and `SPARE_KEY_CODES` secrecy.
- Alert dedupe/retry truthfulness and transient private-contact handling.
- Current Meta template mappings/recipient groups/webhook security; pending replacement templates are not activated.
- Passport, Admin and direct/walk-in stay behavior.
- `EXPLORE_ENABLED=false`.

### Explicit non-scope / known next issue

Airbnb synchronization is not changed in v5.11.42. A real last-minute booking was observed where the guest-page confirmation code was still unavailable roughly two hours after booking and a stay had to be created manually. Treat that as the next narrow production-critical release: investigate Gmail booking detection and iCal reconciliation, then harden last-minute synchronization without folding it into this already-scoped release.

### Validation status

Completed in the packaging environment:
- `npm test`: **208 passed / 0 failed**.
- Fresh extraction of the final ZIP: **208 passed / 0 failed** again.
- JavaScript syntax: **36 files clean**.
- JSON parsing: **12 files clean**.
- Release/version consistency: active release markers are **v5.11.42**.
- `EXPLORE_ENABLED=false` confirmed.
- Pending replacement Meta action templates remain inactive; existing production mappings are unchanged.
- Diff-focused secret/private-data review found no newly introduced real credentials, private phone numbers, Airbnb confirmation codes, passport data, stay tokens, key-box codes or `SPARE_KEY_CODES`; phone/contact literals added in tests are synthetic fixtures only.
- Final archive contains **261 files**, with no `node_modules`, `__MACOSX` or AppleDouble files.
- ZIP integrity passed and fresh-extraction hashes matched **261/261** files.

Environment limitation: a clean `npm ci` attempt stalled on external npm registry access after `node_modules` was removed, so Wrangler could not be installed in this container and `npx wrangler deploy --dry-run` could not be completed here. Run `npm ci`, `npm test`, and `npx wrangler deploy --dry-run` once locally before pushing/deploying. This is an environment limitation, not a known source failure.
