# The House – Koh Tao v5.11.42

## Scope

Narrow Concierge routing and stay-extension workflow release on deployed v5.11.41.

## Human contact

Human-contact routing no longer depends on a small exact-sentence list. A broad deterministic family recognizes natural requests involving a human/person, staff/member of staff, team, reception/front desk, housekeeper, manager/host, agent/support agent/representative/operator/customer support and common talk/speak/call/contact/connect/transfer wording. A first ordinary request remains AI-first; repeated, frustrated, urgent or direct-transfer requests expose the existing **The House team** Contact Us / Call Us actions only during Tuesday–Sunday 10:30–19:30 Bangkok service hours. No private staff identity is shown and no alert is created.

## Stay extension

Natural current-stay extension wording now starts booking kind `stay_extension`. The Concierge collects only the number of additional nights and an international WhatsApp/phone contact. If the guest already supplied the nights, it asks only for the remaining contact. A local-format number is rejected until a country code is supplied.

When complete, exactly one existing `booking_request` alert is routed through `booking_with_owners` to Fah plus both owners. The staff delivery identifies **Stay extension**, requested additional nights and the protected reply contact. Raw contact remains transient and is not stored in normal interactions or alert records. The guest is told the team still needs to check availability and payment; the extension is never claimed as confirmed.

## Preserved

No changes to v5.11.41 emergency-call privacy/mobile sheet stability, v5.11.39 cleaning/state safeguards, Wi-Fi, snorkeling, French Kiss Divers preference, lost-key security, luggage, passport/Admin behavior, current Meta mappings, recipient groups or `EXPLORE_ENABLED=false`. Pending replacement Meta templates remain inactive.

## Known next issue

Airbnb synchronization is unchanged in this release. A separately observed last-minute booking sync delay remains queued for the next narrow production-critical fix.

## Validation

Expected complete suite: **208 passed, 0 failed**. Final release validation also requires JavaScript syntax, JSON parsing, version consistency, secret/private-data scan, archive hygiene and Wrangler dry-run.
