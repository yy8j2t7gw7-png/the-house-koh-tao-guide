# TAOEDGE — NEW CHAT HANDOFF
## Current development state — 15 Sep 2026

Continue immediately from this state. Do not restart architecture discussions from zero and do not lose standing product requirements.

## 1. Current authoritative releases

### Backend
**The House / Taoedge backend v5.11.79 — Guest Messaging Review Safety & Information Routing**

Built from v5.11.78. Source validation complete:
- automated backend tests: **375 / 375 passed**;
- JavaScript syntax: **29 / 29 passed**;
- Wrangler plain variables: **35**, unchanged;
- no live deployment is claimed by source validation.

### Owner App
**Taoedge Owner App v0.1.22 — AI Review Controls & Safe Operational Actions**

Built from v0.1.21 Native Distribution Identity. Preserve:
- iOS bundle identifier: `com.taoedge.platform`;
- Android package: `com.taoedge.platform`;
- EAS organization: `taoedge-business-solutions-1`;
- EAS project: `@taoedge-business-solutions-1/taoedge-owner-app`;
- EAS project ID: `148e93ec-d14f-4e3f-834d-40b7b07fe621`;
- visible working name remains temporary: Taoedge Owner App.

App validation:
- static validator passed: **145 files scanned; 62 source/config files checked**;
- changed Inbox TSX has no syntax parse errors in the available parser;
- full dependency-aware typecheck was not completed in the source-only container because dependencies were not installed.

## 2. Real production bug fixed in v5.11.79

On 15 Sep 2026 a Room 4 guest asked essentially:

`What's the WiFi password .`

The owner reviewed/edited the AI reply. Two production failures occurred:

1. the approved Wi-Fi credential was redacted by generic numeric privacy sanitization;
2. pressing send also created a **Maintenance** task and sent a protected service alert to **Su + owners**, even though the guest asked only an information question.

### Confirmed root cause
- `deterministicResult()` treated any action with a `route` as a human-handoff signal, including optional Contact Us and map-style UI routes;
- the Wi-Fi approved knowledge entry contained an optional Contact Us action, so the information answer could remain `needsHuman=true`;
- `trustedMessagingOperationProposal()` had the bare word `wifi` in the maintenance fallback pattern;
- the approved numeric Wi-Fi credential passed through `sanitizeQuestion()` in the auto-language translation path and matched telephone-like number protection;
- `reviewMessagingDraft()` coupled guest-reply approval to the stored operational proposal, so approving/editing the reply also executed the task/alert.

### v5.11.79 correction
- deterministic UI actions no longer imply human review by themselves;
- unresolved learning-gap fallbacks may still escalate appropriately;
- bare `wifi` no longer means maintenance; Wi-Fi maintenance requires real defect/failure language or a structured maintenance category;
- approved Wi-Fi credentials are protected through translation with an internal placeholder and restored only in the authorized guest reply;
- if translation damages the placeholder, Taoedge falls back to the approved English fact rather than redacting/inventing the credential;
- generic privacy sanitizer remains intact for logs/model diagnostics/contact data;
- reply approval and operational action approval are now separate backend decisions.

## 3. New AI review model — backend + Owner App

### Approve & Send
Sends the reviewed guest reply.

If no operational task is proposed, no task is created.

If a task is proposed, the operator must independently choose:
- **Create task & notify team**; or
- **Don’t create task**.

No task is created merely because the reply is approved.

### Approve — Don’t Send
New v0.1.22/v5.11.79 behavior.

Use when the AI drafted the correct answer but the owner already replied manually or does not want to send the draft.

Required semantics:
- mark draft `approved_not_sent`;
- record AI-quality approval;
- **no guest message**;
- **no staff WhatsApp alert**;
- **no operational task**;
- `externalSideEffects=false`.

### Edited replies
Changing the draft clears the task choice in the app. If the operator wants to create the proposed task after editing, fresh operational confirmation is required. Backend fails closed with `operation_reconfirmation_required` if that confirmation is absent.

### AI auto-send
Automated review may not execute a proposed operational action. Such a case requires human review (`operational_action_requires_human_review`).

## 4. Immediate deployment/testing sequence

1. Push/deploy **backend v5.11.79**.
2. Confirm Cloudflare production deployment and that `/api/mobile/v1/platform` reports backend `5.11.79`.
3. Update local Owner App source to **v0.1.22** and run in Expo Go for immediate UI testing while Apple membership is pending.
4. Controlled Wi-Fi regression:
   - current linked guest asks for Wi-Fi password;
   - full approved guest-shareable credential is returned;
   - `needsHuman=false`;
   - no operational task;
   - no Su alert;
   - no owner alert.
5. Controlled genuine maintenance regression:
   - e.g. clearly broken toilet in a room;
   - AI may propose Maintenance;
   - select **Don’t create task** → only reply is sent;
   - repeat/select **Create task & notify team** → exactly one protected task/alert goes to configured recipients.
6. Edit a proposed reply after choosing a task action → task choice must clear; select again before sending.
7. Test **Approve — Don’t Send** after manually handling a message → no external action of any kind.

Do not claim production fixed until these live checks are completed.

## 5. Apple / native distribution state

Apple Developer **Company / Organization enrollment is still being processed**. Submitted for:

**TAOEDGE BUSINESS SOLUTIONS COMPANY LIMITED**

The company/D-U-N-S record was recognized by Apple and the enrollment page states that Apple is verifying authority to sign legal agreements.

As soon as Apple approves:
1. complete agreement/payment if requested;
2. create the first signed EAS iOS build using `com.taoedge.platform`;
3. install on the owner's iPhone;
4. test Face ID, real push notifications, native permissions and deep links;
5. move into TestFlight;
6. invite business partner / selected testers.

Getting the app **out of Expo Go** is an immediate priority once Apple membership clears.

## 6. Corporate website / company infrastructure state

Corporate domain: `taoedgesolutions.com`

Google Workspace aliases now exist and route to the private owner mailbox:
- `info@taoedgesolutions.com`
- `support@taoedgesolutions.com`
- `privacy@taoedgesolutions.com`
- `security@taoedgesolutions.com`

The personal `dom@...` address must remain private and should not be displayed publicly.

Website corporate identity uses the selected abstract **flowing-T** mark and the fixed positioning line:

**Exceptional hospitality. Intelligent operations.**

Do **not** change that slogan unless the owner explicitly requests it.

Website is hosted through GitHub → Cloudflare Workers/Static Assets. Canonical domain is the apex `https://taoedgesolutions.com`; `www` redirects 301 to apex with query preservation.

A final hero-typography hotfix was prepared because the live screenshot still showed the large serif headline with glyphs visually colliding. Verify whether the most recent `Taoedge-Corporate-Website-HERO-TYPOGRAPHY-FIX-2026-09-15-ready-to-deploy.zip` was pushed before assuming that final typography fix is live.

Website quality requirement: continually evaluate it as a world-class international hospitality-technology corporate site — engineering, visual identity, luxury hospitality credibility, enterprise SaaS trust, accessibility, performance, SEO, security, legal/compliance and conversion. It must evolve with the actual product, not become a stale brochure.

## 7. Five-surface architecture — permanent

Every significant feature/release must be assessed across:

1. **Backend / Data Platform** — canonical data, workflows, APIs, permissions, audit, integrations, automation.
2. **Owner / Staff App** — fast mobile operations.
3. **Public Taoedge Website** — corporate/product representation, trust, sales/onboarding and future commerce.
4. **Personal Guest Page / AI Concierge** — private guest stay experience with narrowly scoped knowledge and permissions.
5. **Taoedge Dashboard / Web Operations Console** — deeper desktop administration, analytics, configuration, audit, Finance, distribution and multi-property operations.

Not every release requires UI changes on all five, but every handoff must assess all five.

## 8. Taoedge Operations Copilot — permanent product requirement

The Owner App and later Dashboard must contain a private, role-aware **Taoedge Operations Copilot**.

It must understand current workflows, product functions, property configuration and permitted backend actions. It should explain how to use Taoedge and execute authorized operational actions through structured backend primitives.

Examples:
- “room 233 toilet broken tomorrow 10” → may have enough structured information to propose a maintenance task;
- “tell maintenance to check room 233 at 10” → must ask **what should be checked** before proposing/executing the task;
- messy multilingual phrasing should be interpreted flexibly without inventing missing facts.

Permanent rule:

**Understand flexibly, execute conservatively.**

Business logic lives in the backend. The AI interprets natural language and invokes defined action schemas; it does not receive unrestricted write authority.

Every action type requires:
- required fields;
- clarification rules;
- confidence/ambiguity handling;
- permission checks;
- confirmation policy;
- recipient/routing logic;
- audit record;
- rollback/retry where applicable.

The Copilot must stay current through a versioned **Capability & Workflow Registry**. Internal construction/security/private operational knowledge must never be exposed to guests/public merely because the Copilot can access it.

The v5.11.79/v0.1.22 separation between conversational reply and operational authorization is a foundational Copilot primitive.

## 9. Data Asset & Sovereign Data Strategy — permanent

Taoedge should build a durable, provider-independent operational intelligence asset while following applicable privacy, contractual and security obligations.

Do **not** frame this as ownership of personal data or permission to indiscriminately retain/sell guest data.

Architecture must:
- separate passports/IDs/payment/high-risk PII from longer-lived operational/analytical datasets;
- minimize collection and define purpose/lawful basis/consent where required;
- maintain retention/deletion schedules and auditability;
- prefer pseudonymized/de-identified/aggregated information for long-term AI improvement, benchmarking and any future external data product;
- retain structured operational event/action/outcome history where legitimately valuable;
- preserve exportability/provider independence;
- record provenance, tenant/customer rights and permitted-use scope;
- encrypt sensitive data and enforce least privilege;
- require future Legal / Privacy / Compliance Agent + human approval before data monetization, new AI-training uses, cross-border transfers or high-risk retention changes.

High-value long-term data includes demand patterns, guest-intent categories, operational outcomes, rate/distribution behavior, housekeeping/maintenance performance, automation quality, AI draft/edit/approve signals and agent decision outcomes — without unnecessarily retaining raw PII.

`Approve — Don’t Send`, reply edits and task create/skip decisions are now valuable structured supervision signals.

## 10. Security / anti-theft / commercialization — permanent

Continue server-side licensing/tenant enforcement, secure authentication, device/session control, provider credentials server-side, least privilege, audit logging, fail-closed consequential actions and provider-neutral adapters.

No client UI may grant itself entitlement or bypass backend role/tenant policy.

Future anti-theft/security hardening remains a dedicated major workstream before broad commercial distribution.

Commercial pricing must account for real cost of service: Beds24/connectivity, Meta/WhatsApp, AI usage, Cloudflare/storage/bandwidth, push/email, payment/billing, APIs, support/onboarding, app distribution and operational tooling.

## 11. OTA / provider strategy — permanent

Taoedge must target Smoobu-class or better practical synchronization responsiveness.

Measure:
**Taoedge accepted → provider accepted → provider state confirmed → OTA propagation expected/verified where possible**.

Never treat HTTP 200 alone as proof of safe OTA synchronization.

Long term, Taoedge should reduce avoidable intermediary dependence and become its own API/integration provider where technically/commercially sensible.

## 12. Commercial sequence — permanent

1. Finish/harden The House.
2. Use The House as proving environment.
3. Complete clean generic commercial/demo product.
4. Onboard first ~3–5 Koh Tao/Thai pilot properties.
5. Refine toward ~10 Thai paying customers.
6. Scale to **100 paying properties in Thailand before international expansion**.
7. Expand internationally after Thailand model is proven.
8. Progress toward Taoedge-owned integration/API infrastructure and increasingly autonomous company operations.

## 13. Future agent organization — permanent

Engineering/Product Commander → Developer Agents → UX/UI Designer → Conversation/Copy → QA/Red-Team → Security/Privacy → Release/DevOps → human approval → production.

Later Executive/Company Commander coordinates Revenue/Sales, Customer Operations/Onboarding, Support, Product, Finance/Admin, Marketing, Corporate/Legal/Compliance and independent Auditor/Red-Team.

Agents share canonical data, task/event model, permissions, audit, approved knowledge, provider adapters, budgets/cost controls and escalation. Use least privilege.

## 14. Next major product development after this messaging release

After live validation and native/TestFlight setup, start the **Operations Copilot foundation** in the backend/app rather than bolting a generic chatbot onto the UI:
- Capability & Workflow Registry;
- structured action registry;
- required-field/clarification engine;
- role/tenant permission checks;
- confirmation/risk tiers;
- action audit events;
- initial maintenance/housekeeping/task actions;
- current-product help/guide retrieval;
- multilingual natural-language interpretation.

Then continue the deeper **Listings & Rates / Revenue Workspace**: date ranges, multi-room bulk operations, rate/min-stay/inventory, review-before-publish, distribution sync status, audit history, retry/rollback. Full Channel Manager activation remains separate and deliberately gated.

## 15. Standing release/handoff requirements

Every future release/handoff — including hotfixes — must include:
- GitHub Summary;
- GitHub Description;
- Product North Star & Autonomous Operations Roadmap;
- Five-Surface Impact;
- Operations Copilot Impact;
- Data Asset Impact;
- Security/Privacy;
- Commercial Impact;
- validation results;
- exact deployment/manual steps;
- no claim of live deployment without verification.

## 16. Current GitHub commit text

### Backend v5.11.79
**Summary**
`Release v5.11.79 — safe AI review and information routing`

**Description**
`Fix the production Unified Messaging Wi-Fi incident by keeping informational requests operationally inert, preserving approved guest-shareable Wi-Fi credentials through auto-language privacy sanitization, and removing bare “wifi” as a maintenance trigger. Separate guest-reply approval from operational-task approval, add an approve-without-send path with zero external side effects, require an explicit create/skip decision for proposed tasks, and require fresh task reconfirmation after an edited reply. Preserve protected routing, privacy logging, lost-key/passport/emergency workflows, provider security boundaries, Cloudflare Free-tier compatibility, and keep full Beds24 Channel Manager plus broad Listings writes disabled.`

### Owner App v0.1.22
**Summary**
`Release Owner App v0.1.22 — explicit AI reply and task approval`

**Description**
`Harden Taoedge AI message review by adding “Approve — Don’t Send” with zero external side effects and separating guest-reply approval from operational-task approval. Require an explicit Create task & notify team or Don’t create task decision before sending a reply with proposed work, reset the task decision after reply edits, surface clear proposed/selected/skipped states, and pair with backend v5.11.79 for the Wi-Fi information-routing and approved-credential fix. Preserve the future-proof com.taoedge.platform native identity, server-authoritative permissions, Face ID/push readiness, Listings safety and all existing owner operations.`
