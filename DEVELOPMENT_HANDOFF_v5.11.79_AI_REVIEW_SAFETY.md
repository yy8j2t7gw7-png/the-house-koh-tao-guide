# DEVELOPMENT HANDOFF — Backend v5.11.79
## AI Review Safety & Wi-Fi Information Routing

## Release objective
Fix the real production Wi-Fi review incident and harden the review/action boundary so Taoedge can understand guest messages flexibly while executing conservatively.

## Root cause
Three conditions combined:
1. The approved Wi-Fi knowledge entry carried a Contact Us route, so deterministic handling could leave the result marked `needsHuman` even for an information-only password question.
2. automatic-language translation sanitized the approved answer through the general privacy sanitizer; the numeric Wi-Fi password matched the telephone-like number rule and became `[number removed]`.
3. trusted provider-message review treated `wifi` itself as maintenance language and `Approve & Send` executed the stored operational proposal before sending the guest reply.

## Implementation
- `wifiPasswordKnowledgeResult()` now returns a side-effect-free approved-information result.
- translation protects authorized guest-shareable numeric Wi-Fi credentials before sanitization, sanitizes/translates the surrounding text, then restores the approved credential.
- `trustedMessagingOperationProposal()` now rejects independent information requests and requires explicit/structured operational intent.
- `reviewMessagingDraft()` supports `approve_no_send` with zero external side effects.
- proposed operational work requires a separate `operationDecision=execute|skip` before `approve` can continue.
- mobile review endpoint accepts and audits the new decision state.
- backend API contract reports `5.11.79`.

## Five-Surface Impact
- **Backend/Data:** new explicit review-decision and operational-decision semantics; positive no-send review signal is stored in draft metadata.
- **Owner App:** paired v0.1.22 exposes the new review controls.
- **Public Website:** no change required; this is an internal production-safety refinement, not a new public claim.
- **Personal Guest Page / Concierge:** authorized Wi-Fi information remains fully readable; informational questions stay operationally inert.
- **Dashboard/Web Operations Console:** existing unified messaging data remains compatible; future dashboard review UI should adopt the same independent operation-decision contract.
- **Operations Copilot:** this becomes a foundational rule: natural-language interpretation may propose an action, but execution requires backend-required fields, permissions and explicit confirmation according to risk.

## Data Asset & Sovereign Data Strategy
Store the minimum useful review telemetry: draft intent/category, whether the AI answer was approved/rejected/regenerated/approved-no-send, whether text was edited, and whether an operational action was independently executed or skipped. This is valuable model-quality and workflow data. Do not turn guest credentials or sensitive identity data into long-term analytical fields. Wi-Fi credentials remain approved property configuration, not public data, and diagnostic/log sanitization stays active.

## Security / Privacy
- No weakening of generic phone/contact/passport/code sanitization.
- Wi-Fi credential preservation is scoped to the authorized guest-facing approved-information path.
- `approve_no_send` cannot call provider messaging or task/alert creation.
- operational execution remains server-side and explicitly authorized.

## Product North Star & Autonomous Operations Roadmap
Taoedge remains a commercial, multi-tenant, provider-neutral hospitality operating platform. The House is the live proving environment. Sequence remains: harden The House → generic commercial/demo → early Koh Tao/Thailand properties → scale to **100 paying properties in Thailand before international expansion** → international distribution → progressively become our own API/integration provider where commercially sensible.

Future agents share canonical data, task/event state, approved knowledge, provider adapters, permissions, audit logs, budgets/cost controls and escalation rules. Autonomy progresses through Assist → Guarded execution → Operational autonomy → Coordinated agent organization → highly autonomous company operations. Consequential actions remain governed by least privilege, explicit permissions, auditability, confirmation gates and rollback paths.

Standing OTA performance requirement remains: measure `Taoedge accepted → provider accepted → provider state confirmed → OTA propagation expected/verified where possible`, targeting Smoobu-class or better practical responsiveness and never treating HTTP 200 alone as synchronization success.

## Validation
- **374 / 374 backend tests passed**.
- source/test syntax checks passed.
- no live production deployment claimed.

## GitHub Summary
`Release v5.11.79 — AI review safety and Wi-Fi routing hardening`

## GitHub Description
`Fix the real production Wi-Fi review incident by preserving authorized guest-shareable Wi-Fi credentials without weakening general privacy sanitization, keeping Wi-Fi password questions informational and alert-free, distinguishing genuine Wi-Fi faults from password requests, adding side-effect-free approve-no-send review semantics, and requiring a separate explicit owner decision before any reviewed AI reply can create an operational task or WhatsApp alert. Preserve existing security, provider, lost-key, passport, Finance, lifecycle and Channel Manager-off boundaries.`
