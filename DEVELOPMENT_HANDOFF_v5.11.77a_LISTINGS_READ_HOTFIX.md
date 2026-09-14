# DEVELOPMENT HANDOFF — Backend v5.11.77a
## Listings & Rates Beds24 Calendar Read Hotfix

## Release objective

Repair the live Listings & Rates read path discovered after v5.11.77 successfully reached production. The mobile route and owner permissions were healthy, but the Beds24 calendar request returned no useful room/date fields because Taoedge did not explicitly request the required calendar inclusions and did not recognize Beds24 V2 `numAvail`.

## Changes

- Adds `includeNumAvail=true`, `includePrices=true`, and `includeMinStay=true` to the narrow Beds24 calendar read.
- Normalizes `numAvail` as inventory while retaining compatibility with older aliases already supported by Taoedge.
- Prevents `null`/missing values from becoming numeric zero.
- Strengthens tests around the real Beds24 V2 calendar response shape.
- Reports live backend contract as `5.11.77a`.

## Deployment order

1. Push/deploy backend v5.11.77a.
2. Confirm Cloudflare deployment succeeds and becomes active.
3. Open App Diagnostics and verify `Live backend 5.11.77a`.
4. Open Listings & Rates and confirm Beds24 inventory values appear.
5. Then push/use App v0.1.19a to remove the false diagnostics error flash and improve empty-state truthfulness.

## Safety boundaries

- Do not enable `BEDS24_RATE_INVENTORY_WRITES_ENABLED` as part of this hotfix.
- Full Channel Manager remains off.
- No room mappings, credentials, secrets, Finance logic, AI lifecycle behavior, Direct Stay protection or OTA synchronization behavior are changed.

## GitHub Summary

`Hotfix v5.11.77a — repair Beds24 Listings & Rates calendar reads`

## GitHub Description

`Repair the v5.11.77 Listings & Rates read path by explicitly requesting Beds24 V2 per-day availability, price and minimum-stay fields and normalizing numAvail as Taoedge inventory. Preserve missing provider values as null rather than zero, strengthen regression coverage against the real Beds24 calendar response shape, and expose backend contract 5.11.77a. No provider write authority is enabled, no new Cloudflare variables are added, Direct Stay synchronization remains unchanged, and the full Beds24 Channel Manager stays disabled.`

## Immediate next production checks

- Confirm all 11 mapped rooms return inventory for a safe 14-day range.
- Note which rooms/dates return explicit `price1`; calendar reads only expose values Beds24 supplies through this endpoint.
- Keep the planned controlled one-cell write test separate before enabling owner rate/inventory writes.

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
