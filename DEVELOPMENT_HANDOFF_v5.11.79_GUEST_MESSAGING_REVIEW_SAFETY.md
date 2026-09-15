# DEVELOPMENT HANDOFF — Backend v5.11.79
## Guest Messaging Review Safety & Information Routing

## Authoritative baseline
Built from the verified v5.11.78 ready-to-push source. Pair with Taoedge Owner App **v0.1.22**.

## Real production incident that triggered this release
On 15 Sep 2026 a Room 4 guest asked essentially:

`What's the WiFi password .`

The AI produced an otherwise appropriate information answer, but the approved numeric Wi-Fi credential was redacted. After the owner reviewed/edited the reply and pressed send, Taoedge also created a **Maintenance task**, notified **Su**, and notified the owners even though the guest had not reported a maintenance problem.

## Root cause — confirmed in source
There were three interacting faults:

1. `deterministicResult()` treated **any action containing a `route`** as a human handoff. The approved Wi-Fi knowledge item had an optional Contact Us action, so the information answer became `needsHuman=true` even though the action was later filtered from normal output. The same pattern could also incorrectly treat map/navigation actions as human escalation.
2. `trustedMessagingOperationProposal()` included the bare word **`wifi`** in its maintenance fallback expression. Once the stale `needsHuman=true` state existed, a simple Wi-Fi information question could be promoted to Maintenance.
3. `translateApprovedReplyToCurrentMessageLanguage()` passed the approved answer through the shared privacy sanitizer before/after translation. The numeric Wi-Fi credential matched the generic telephone-like-number protection and could become `[number removed]`.

The review workflow then compounded the problem: `reviewMessagingDraft()` executed the stored operational proposal before sending the approved/edited reply. Reply approval and task approval were therefore coupled.

## Corrections

### Information vs operation
- Deterministic UI actions no longer imply human review merely because they contain a route.
- Unresolved learning-gap fallbacks may still escalate through explicit House human-contact routes.
- Bare `wifi` was removed as an operational-maintenance signal.
- Wi-Fi maintenance requires actual fault semantics such as not working/down/cannot connect, or an authoritative structured maintenance category.

### Authorized Wi-Fi output
- The approved Wi-Fi credential is isolated behind a temporary internal placeholder before the generic sanitizer/translator.
- Sanitization and translation still run around the protected placeholder.
- The approved credential is restored only in the authorized guest answer.
- If translation mutates/drops the placeholder, Taoedge falls back to the approved English fact instead of hiding or inventing the credential.
- Diagnostic/log sanitization remains unchanged.

### Independent action approval
`reviewMessagingDraft()` now supports:

- `approve` — send reply; if an operation is proposed, a separate `operationDecision` is required.
- `approve_no_send` — mark the AI answer correct, but send **nothing** and create **no task/alert**.
- `reject`
- `regenerate`

For a proposed operation:

- `operationDecision=create` → create the task and protected staff alert, then send the guest reply only after successful protected delivery.
- `operationDecision=skip` → send the guest reply only; no task or staff alert.
- missing decision → fail closed with `operation_decision_required`.
- edited reply + `create` without fresh confirmation → fail closed with `operation_reconfirmation_required`.
- automated AI review may not execute proposed operational actions; it returns `operational_action_requires_human_review`.

## Files changed
- `src/concierge-api.js`
- `src/unified-messaging.js`
- `src/mobile-platform.js`
- `tests/concierge.test.mjs`
- `package.json`
- `package-lock.json`
- `README.md`
- `PRODUCT_NORTH_STAR_AUTONOMOUS_OPERATIONS.md`
- release/handoff/validation documents

## Deployment order
1. Push/deploy backend v5.11.79.
2. Confirm Cloudflare deployment succeeds and `/api/mobile/v1/platform` reports backend `5.11.79`.
3. Install/run Owner App v0.1.22 source in Expo Go for current testing, or the native build after Apple approval.
4. Test the exact Wi-Fi information question against a controlled current reservation. Expected: correct full approved guest answer; no task; no Su/owner alert.
5. Test one genuine maintenance message such as a clearly broken toilet. Expected: AI may propose Maintenance, but **nothing is created until the owner separately selects Create task & notify team and approves the reply**.
6. Test `Approve — Don’t Send` after manually replying to a guest. Expected: draft disappears from pending review, quality signal recorded, zero external side effects.

## Five-Surface Impact
- **Backend/Data:** changed. New review decision semantics and safer information/operation classification are authoritative here.
- **Owner App:** paired v0.1.22 exposes independent task selection and Approve — Don’t Send.
- **Public Website:** no release change required; no guest credential or internal workflow is exposed.
- **Personal Guest Page:** no UI redesign; existing authorized Wi-Fi knowledge delivery remains preserved and safer.
- **Dashboard/Web Console:** current dashboard inbox remains read/reply oriented and does not execute this mobile AI-review flow. Future parity should reuse the same backend decisions rather than implement separate task logic.

## Operations Copilot Impact
This release establishes a core Copilot rule: **natural-language understanding may propose an action, but proposal is not authorization**. Future Copilot action schemas must expose required fields, clarification state, recipient route, permission result and confirmation state independently from conversational reply text.

Permanent rule: **Understand flexibly, execute conservatively.**

## Data Asset Impact
`approve_no_send` creates a useful quality signal: the AI answer was judged correct even though it was not sent. This should later feed model/workflow evaluation without implying permission to retain unnecessary PII. Operational decisions (`create`/`skip`), edits and outcomes are valuable structured supervision signals and should be retained according to the governed Data Asset & Sovereign Data Strategy.

Sensitive identity/passport/payment data remains isolated from longer-lived operational analytics. Future external data monetization must use appropriate contractual rights/lawful basis and should prefer aggregated/de-identified data.

## Security / Privacy
- Generic privacy sanitizer remains intact.
- Guest-shareable Wi-Fi configuration is not treated as a public secret; it is disclosed only on existing authorized guest paths.
- Operations remain server-authoritative and role/tenant protected.
- No provider credential or phone number is exposed client-side.
- No new secret/environment variable is added.

## Commercial Impact
Reduces false staff alerts and operator distrust, creates a stronger human-in-the-loop review model, and produces higher-quality supervision data for future commercial AI operations. This architecture is reusable across future properties rather than House-specific.

## Product North Star & Autonomous Operations Roadmap
Preserve the full standing roadmap in `PRODUCT_NORTH_STAR_AUTONOMOUS_OPERATIONS.md`: multi-tenant/provider-neutral architecture; The House as proving ground; early Thailand validation; **100 paying Thai properties before international expansion**; Smoobu-class practical OTA responsiveness; eventual Taoedge API/integration ownership; progressive agent organization under least privilege, audit and human approval.

## GitHub Summary
`Release v5.11.79 — safe AI review and information routing`

## GitHub Description
`Fix the production Unified Messaging Wi-Fi incident by keeping informational requests operationally inert, preserving approved guest-shareable Wi-Fi credentials through auto-language privacy sanitization, and removing bare “wifi” as a maintenance trigger. Separate guest-reply approval from operational-task approval, add an approve-without-send path with zero external side effects, require an explicit create/skip decision for proposed tasks, and require fresh task reconfirmation after an edited reply. Preserve protected routing, privacy logging, lost-key/passport/emergency workflows, provider security boundaries, Cloudflare Free-tier compatibility, and keep full Beds24 Channel Manager plus broad Listings writes disabled.`
