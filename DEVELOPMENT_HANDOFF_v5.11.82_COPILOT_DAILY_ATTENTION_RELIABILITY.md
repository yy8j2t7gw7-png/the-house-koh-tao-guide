# DEVELOPMENT HANDOFF — Backend v5.11.82
## Copilot Daily-Attention Reliability Hotfix

## 1. Current release objective/version
- **Backend:** v5.11.82
- **Paired Owner App:** v0.1.26
- **Objective:** fix the live production failure where `What needs my attention today?` could still fall into a generic client reconnect error even though v5.11.81 intended that command to be deterministic. Preserve all mature production logic and task behavior.

## 2. Completed in this release — DONE
- Moved the daily-attention intent gate ahead of model workflow matching and optional UI-context resolution.
- Hardened live operational context assembly with `Promise.allSettled`, array/type normalization and per-source health so one malformed/degraded production source cannot abort the whole Copilot request.
- Daily-attention now always returns a controlled HTTP 200 response when authentication/permission succeeded, even if one operational source is temporarily unavailable.
- Added source-health metadata for diagnostics without exposing developer jargon in normal owner/staff wording.
- Degraded summaries explicitly say a live section could not be checked instead of falsely claiming everything is clear.
- Added a regression test covering unexpected production data shape plus a failing task source.
- Backend contract advanced to **5.11.82** so future deployments cannot be confused with either of the two earlier 5.11.81 archives.

## 3. Preserved task/Copilot rules — DO NOT CHANGE
- Global Copilot + explicit room only = room task, not booking task.
- Explicit validated booking/guest = booking-linked task.
- App context is a hint only; backend validates identifiers.
- Never attach a room repair to the current occupant merely because the room is occupied.
- Ambiguity requires clarification; never guess.
- Consequential actions remain proposal -> explicit confirmation -> backend re-check -> canonical task/alert -> audit.
- WhatsApp RECEIVED / RESOLVE remains tied to the same canonical task lifecycle.

## 4. Mature production logic preserved
Concierge/policy, unified messaging, lost-key protection, housekeeping, maintenance, registration/passport/TM30, Finance/Beds24 Finance, Listings & Rates, Revenue Engine, Direct Stay/OTA safeguards, tenant/role/licensing/session security, provider credential isolation and Channel Manager-off boundaries remain authoritative and unchanged except for this reliability hotfix.

## 5. Validation
- Backend regression suite: **383/383 passed**.
- New degraded-production-context daily-attention regression test: PASS.
- Existing persistent task, signed proposal, unknown-room and tamper tests: PASS.

## 6. Deployment / live checks
1. Deploy backend v5.11.82.
2. Verify Diagnostics reports backend 5.11.82.
3. Ask `What needs my attention today?` from global Copilot. It must return an operational answer, not the generic reconnect message.
4. Create a controlled room task and verify Operations -> Tasks + WhatsApp routing still work.
5. Retest existing Concierge/Dashboard workflows for regression.

## 7. Remaining approved roadmap — KEEP UNTIL DONE
- **PENDING:** Copilot visual separation/polish paired in App v0.1.26.
- **PENDING NEXT MAJOR MODULE:** Physical Hotel Inventory + Assets + Procurement, including consumables/reusables/assets, category templates/custom categories, min/reorder/par/max, alerts, locations/transfers, barcode/QR architecture, receiving, suppliers/prices/lead times, purchasing/approvals/POs, partial deliveries/invoices, housekeeping consumption recipes, room assets, cost/value, waste/damage/loss/expiry, batch/FEFO, stocktakes, serialized assets/warranty/service, multi-property, role permissions/approval limits, occupancy forecasting, Finance integration, Copilot stock queries/actions and predictive purchasing.
- **PENDING:** Listings & Rates / Revenue Management expansion.
- **PENDING:** remaining provider-neutral Finance/Beds24 automation/reconciliation.
- **PENDING:** final security/anti-theft hardening review, cross-surface QA and v1 freeze.
- **PENDING AFTER CORE STABILITY:** Copilot voice — push-to-talk speech input + optional spoken replies first; later optional live conversational voice. Voice uses the same permission, confirmation, routing and audit core and never bypasses consequential-action confirmation.
- **PENDING:** brand/name approval gate, demo, pricing, legal/commercial pack, marketing/sales/onboarding/video, agent organization, Thailand rollout to 100 paying properties, then international expansion and long-term Taoedge-owned API/integration strategy.

## 8. Product North Star
One canonical Taoedge operating core with mobile, web, guest surfaces and Copilot as governed interfaces into the same data/rules. The House remains the live proving property. Mature Dashboard/Concierge logic must never be lost.

## 9. GitHub Summary
`Release v5.11.82 — harden deterministic Copilot daily-attention against live data failures`

## 10. GitHub Description
`Hotfix the live Operations Copilot daily-priority path after production testing showed that “What needs my attention today?” could still fall into the generic reconnect error on backend v5.11.81. Move the deterministic attention command ahead of model/workflow/context dependencies, assemble live operational data with per-source Promise.allSettled isolation and defensive shape normalization, return a controlled operational summary even when one data source is degraded, and expose source-health diagnostics without changing owner/staff language. Preserve canonical Tasks, signed confirmation, WhatsApp routing/status, mature Dashboard/Concierge logic, tenant/role security, Finance/registration/lost-key protections, provider credential isolation and Channel Manager-off boundaries. Backend regression suite: 383/383 passed.`
