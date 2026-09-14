# DEVELOPMENT HANDOFF — Backend v5.11.78
## Production Readiness & Guest Communication Hardening

## Release objective

Build the production-control layer required before Taoedge moves deeper into automated hotel operations. This release hardens guest-message interpretation, owner operational escalation, device push controls and the Listings & Rates write-validation path while preserving the current provider and security boundaries.

The release starts from the verified live v5.11.77a baseline.

## What changed

### OTA passport submission recognition

Inbound OTA/WhatsApp guest messages are now checked deterministically for statements that a passport image was attached, uploaded or sent before the generic AI-response path runs.

Examples include messages such as:

- `Please find attached a picture of my passport.`
- `I uploaded my passport here.`
- `Here is my passport photo.`

When recognized, Taoedge:

1. classifies the event as `passport_received_external`;
2. creates an Owner review task against the linked reservation when available;
3. creates and dispatches a protected operational alert to the owners;
4. suppresses the unrelated generic concierge introduction;
5. sends/drafts a natural acknowledgement according to the existing AI auto-send policy;
6. marks the messaging thread for human review;
7. does **not** mark Taoedge secure passport registration or TM30 completion as finished.

This is intentionally an **external document review state**, not a substitute for the secure Taoedge passport store.

### Owner WhatsApp alerting

`passport_received_external` uses the existing generic service/operational alert template path. A new dedicated Meta template is not required for the basic owner notification in this release.

Do not reuse the secure `passport_received`/TM30 quick-action workflow for externally supplied OTA attachments because the underlying document is not stored in Taoedge's protected passport storage.

### Push notification preferences

Push registration now stores category preferences per device and the backend filters eligible devices server-side before sending.

Supported categories:

- guest messages
- operational alerts
- housekeeping
- maintenance
- OTA/distribution sync problems
- AI lifecycle failures

`GET /api/mobile/v1/push/settings` returns the current device registration/settings state.

`POST /api/mobile/v1/push/settings` updates the current device's master enabled state and category preferences.

Server-side role/tenant audience restrictions remain authoritative.

### Controlled Listings & Rates write validation

`BEDS24_RATE_INVENTORY_WRITES_ENABLED` is now intentionally tri-state:

- `false` = read-only; no generic calendar write
- `test` = controlled no-op validation only
- `true` = narrow owner rate/inventory writes enabled

The release package ships with the value **`false`**.

A new protected endpoint allows an Owner/Manager with `listings_rates.manage` to perform a controlled no-op round trip only while the backend is in `test` mode:

`POST /api/mobile/v1/listings-rates/test-write`

The validation flow:

1. reads the exact room/date cell from Beds24;
2. writes back the exact same existing `price1` and/or `numAvail` value;
3. reads the same cell again;
4. verifies the value did not change;
5. records an audit result.

This validates the real provider write path without intentionally changing price or availability.

The calendar write payload now uses Beds24 `numAvail` for inventory. Full Channel Manager activation is independent and remains disabled.

### Backend contract

The mobile platform reports backend contract version `5.11.78` so Diagnostics can prove which Worker is serving production traffic.

## Safety boundaries

- `BEDS24_RATE_INVENTORY_WRITES_ENABLED` remains `false` in the ready-to-push package.
- Full `BEDS24_CHANNEL_MANAGER_ENABLED` remains `false`.
- The controlled write endpoint cannot run unless the backend is explicitly placed in `test` mode.
- The test round trip reuses the provider's existing value; it is not a hidden inventory/rate change.
- External OTA passport recognition does not claim secure upload/TM30 completion.
- Push preferences do not override tenant, role, licensing or server authorization.
- Provider credentials and secrets remain server-side.
- The Cloudflare Free-tier variable consolidation from v5.11.77a is preserved; this release adds no new Wrangler variable names.

## Deployment order

1. Deploy backend v5.11.78 with `BEDS24_RATE_INVENTORY_WRITES_ENABLED=false`.
2. Confirm the Cloudflare deployment succeeds and becomes the active production deployment.
3. Open App Diagnostics after v0.1.20 is installed and confirm `Live backend 5.11.78`.
4. Confirm existing reservations, messaging, Finance and Listings reads remain healthy.
5. Test OTA passport recognition using a controlled guest/message workflow.
6. Build/install the Taoedge native iOS build before judging remote push or Face ID.
7. Only when ready for the explicit provider test, change `BEDS24_RATE_INVENTORY_WRITES_ENABLED` to `test`, deploy, perform one safe no-op cell validation, and return it to `false` unless a later release explicitly authorizes live writes.

## Production checks

- External passport message creates exactly one Owner review task/alert and avoids the generic concierge introduction.
- Guest acknowledgement is natural and does not state secure registration is complete.
- Push category switches persist for the device and suppress disabled categories server-side.
- Diagnostics reports backend 5.11.78.
- Listings read path remains healthy.
- Controlled test-write is rejected while write mode is `false`.
- Controlled test-write succeeds only in `test` mode and verifies an unchanged provider value.
- Full Channel Manager remains off.

## Validation

- Backend automated tests: **370 / 370 passed**.
- Backend source syntax: **29 / 29 JavaScript source files passed**.
- Wrangler plain variable names: **35**, unchanged from v5.11.77a.
- No live Cloudflare deploy or live Beds24 write is claimed by this source validation.

## GitHub Summary

`Release v5.11.78 — production readiness and guest communication hardening`

## GitHub Description

`Harden Taoedge production operations with deterministic OTA-passport submission recognition, owner review tasks and protected operational alerts, natural guest acknowledgements that do not falsely complete secure registration, per-device push notification category controls enforced server-side, and a controlled Beds24 Listings & Rates no-op write-validation mode. Preserve the v5.11.77a Listings read fix, Direct Stay synchronization hardening, server-side security and audit boundaries, Cloudflare Free-tier deployment compatibility, and keep broad rate/inventory writes plus the full Beds24 Channel Manager disabled by default.`

## Immediate next priorities

1. Deploy v5.11.78 and verify the live backend contract.
2. Install/build App v0.1.20 as a native Taoedge iOS build and test push + Face ID on-device.
3. Verify one real OTA passport-message workflow.
4. Perform the controlled Beds24 no-op write test on one safe room/date.
5. After those checks, proceed to the deeper Listings & Rates / Revenue workspace rather than enabling the full Channel Manager prematurely.

---

# Taoedge — Product North Star & Autonomous Operations Roadmap

## Standing project requirement

Keep this objective in every future Taoedge handoff. Small releases and hotfixes must not lose the long-term architecture.

## Ultimate objective

Taoedge is intended to become a commercial, multi-tenant hospitality operating platform in which AI progressively runs large portions of property operations and, later, large portions of Taoedge's own company operations under explicit permissions, audit trails, cost controls, deterministic safety rules and human approval for consequential actions.

The long-term platform should be able to coordinate reservations, guest communication, arrivals/departures, housekeeping, maintenance, registration/compliance workflows, rates/inventory, OTA finance, owner analytics, property onboarding, customer support, sales, billing/administration, marketing, legal/compliance support and controlled software development/release workflows.

The goal is **not uncontrolled autonomy**. The goal is high operational autonomy with governance.

## Commercial sequence

1. Finish and harden The House production system.
2. Use The House as the live proving environment.
3. Complete a clean generic commercial/demo product.
4. Onboard early external properties and refine onboarding/support.
5. Scale to **100 paying properties in Thailand** before international expansion.
6. Expand internationally after the Thailand model is proven.
7. Progressively reduce avoidable dependency on third-party intermediaries and become the API/integration provider ourselves where technically and commercially sensible.

The architecture must remain multi-tenant, provider-neutral, property-configurable, internationally scalable and commercially secure. The House is the proving ground, not the final product boundary.

## Future agent organization

### Product / Engineering Commander

Product Commander
→ Developer Agents
→ UX/UI Designer Agent
→ Conversation/Copy Agent
→ QA / Red-Team Agent
→ Security / Privacy Agent
→ Release / DevOps Agent
→ human approval gate
→ production

The engineering organization should eventually be able to receive a product objective, inspect the current codebase, propose changes, implement them, test them, review UX/copy/security, prepare a release and produce a deployment handoff. Production changes remain gated.

### Company / Operations Commander

A later company-level Commander coordinates specialist divisions:

- Revenue / Sales
- Customer Operations / Onboarding
- Customer Support
- Product / Engineering
- Finance / Administration
- Marketing
- Corporate / Legal / Compliance
- independent Auditor / Red-Team

The independent audit layer should review permissions, anomalies, financial/consequential actions, privacy/security, factuality and dangerous-action risk rather than simply trusting the agent that performed the work.

## Agent architecture rules

Future agents must share canonical data, task/event state, approved knowledge, provider adapters, permissions, audit logs, budgets/cost controls and escalation rules rather than becoming disconnected scripts.

Use least privilege. Examples:

- Sales does not automatically access guest passport files.
- Marketing does not receive production write authority.
- Developer agents do not receive banking credentials by default.
- Guest-communication AI does not receive unrestricted Finance authority.

## Automation maturity path

1. Assist — AI recommends; human acts.
2. Guarded execution — AI performs narrow, reversible, high-certainty tasks under policy.
3. Operational autonomy — routine workflows run automatically and exceptions escalate.
4. Coordinated agent organization — specialist agents cooperate under Commanders with shared state, permissions, budgets and audit.
5. Highly autonomous company operations — large parts of customer acquisition, onboarding, support, hotel operations, finance administration, product development and reporting run continuously under human governance.

Do not jump directly to unrestricted autonomy.

## How current product modules map to future agents

- Unified Inbox / lifecycle messaging → Guest Communications / Guest Journey Agent
- Calendar / reservations / distribution → Reservation & Distribution Agent
- Housekeeping / departure planning → Operations / Housekeeping Agent
- Maintenance → Maintenance Coordinator Agent
- Listings & Rates / Revenue Engine → Revenue Management Agent
- Finance ingestion/reconciliation → Finance Agent
- Integrations health / retries → Reliability Agent
- Security / audit → Security & Auditor Agent
- Demo/onboarding tooling → Customer Onboarding Agent
- Insights → Executive / Owner Decision Agent

Build each feature as a reliable operational primitive a future agent can safely operate, not as an isolated screen.

## Cost guardrail

Commercial pricing and autonomous decisions must include the real marginal cost of serving a property, including where applicable:

- Beds24 or replacement channel/connectivity infrastructure
- Meta / WhatsApp messaging
- AI/model usage
- Cloudflare / hosting / storage / bandwidth
- push/email services
- payment/billing costs
- third-party APIs
- support/onboarding overhead
- app distribution and operational tooling

## Distribution performance requirement

OTA synchronization speed is part of the core product. Taoedge should measure practical propagation from Taoedge action through provider acceptance and OTA availability, benchmark against Smoobu-class responsiveness, expose failures/retries and avoid treating HTTP acceptance alone as proof that the room is safely synchronized.

## Standing GitHub handoff requirement

Every future Taoedge release handoff must include both a **GitHub Summary** and a **GitHub Description**, including hotfixes and narrow technical releases.
