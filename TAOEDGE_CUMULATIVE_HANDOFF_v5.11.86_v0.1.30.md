# TAOEDGE CUMULATIVE HANDOFF — Backend v5.11.86 / Owner App v0.1.30
## Natural GPT-Live Voice + THB metering, preserving Staff Management and the full hospitality operating core

## 1. Current objective/version
- **Backend:** v5.11.86
- **Owner App:** v0.1.30
- **Objective:** replace the poor/robotic v0.1.29 turn-based “live conversation” as Taoedge's premium voice direction with the same class of GPT-Live full-duplex voice technology used by current ChatGPT Live, while preserving push-to-talk, multilingual operation, server-controlled hotel actions, Staff Management and every mature Dashboard/Concierge rule.
- **Commercial decision:** all Taoedge pricing/cost modeling/customer-facing commercial UX defaults to **THB**. Natural Live Voice is a premium metered capability; Text Copilot remains core and push-to-talk remains the lower-cost fallback.

## 2. v5.11.86 / v0.1.30 — DONE in code, native live test pending
### Natural Live Voice
- Backend-brokered GPT-Live WebRTC session creation through Taoedge; provider API key never reaches the app.
- Native app WebRTC transport (`react-native-webrtc`) for full-duplex microphone/audio.
- GPT-Live client delegation into the existing canonical Taoedge Operations Copilot.
- Voice handles natural conversation while Taoedge remains authoritative for live hotel data, permissions, business rules, durable state and consequential actions.
- Frontend prompt requires direct answers, no unsolicited capability recitals, concise five-star hospitality/operator style, and natural language matching/switching.
- Thai, German, English and broader/mixed-language conversations are supported by the Live architecture.
- Live events handled: session start, input/output transcript deltas, client delegation, usage, close and errors.
- Delegated Copilot result is returned as speakable commentary; protected proposal remains on screen and must be explicitly confirmed.
- Untrusted WebRTC data channel can only send `session.commentary.append` and `session.close`; it cannot rewrite session/delegation configuration.
- Natural Live session receives an allowance/cap-aware maximum duration and automatically closes at that boundary in the Taoedge app.
- Existing v0.1.29 push-to-talk remains available and is the Expo Go/lower-cost fallback.

### Live Voice commercial/metering foundation — THB
Canonical persistence:
- `platform_voice_settings`
- `platform_voice_sessions`

Licensed module:
- `voice_live`

Current plan configuration:
- Trial: 60 minutes.
- Voice 500: THB 1,990/month; THB 4.50/min overage.
- Voice 1,000: THB 3,490/month; THB 4.25/min overage.
- Voice 3,000: THB 8,990/month; THB 4.00/min overage.
- The House: internal preview allowance, not a public plan.

Controls:
- tenant/month scoped usage;
- server-clock-bounded cumulative session metering;
- 75% / 90% / 100% threshold status;
- opt-in paid overage only on eligible plan;
- overage cannot become active without positive THB monthly cap;
- enabling overage with no supplied cap defaults to THB 500, never unlimited;
- session start is denied after allowance/cap exhaustion;
- session length is limited by remaining allowance/cap;
- Owner Settings displays plan, minutes, THB values, warning state and spend-cap controls;
- exhausted Natural Live falls back to push-to-talk/text rather than uncontrolled spend.

**Boundary:** actual payment collection, invoice subscription charging and plan upgrade/downgrade automation are not implemented in this release. Metering/commercial state is implemented.

### Owner App v0.1.30
- New Natural Live Voice control in Copilot.
- Natural Live session state UI: connecting/listening/delegating/speaking/confirm/error.
- Text composer/push-to-talk are protected from conflicting input while a Natural Live session is active.
- Native-build requirement explained cleanly in Expo Go.
- Live usage/remaining minutes/THB overage presented in Copilot.
- Settings Live Voice commercial card with role-gated overage/cap controls.
- License screen labels `voice_live`.
- Diagnostics expects backend 5.11.86+.
- Persistent floating Ask AI remains permanently visible by explicit user choice.

## 3. v5.11.85 / v0.1.29 — DONE/PRESERVED
### Voice foundation
- Push-to-talk microphone in Copilot.
- Authenticated server transcription.
- Thai/German/English and broader multilingual routing/replies.
- Deterministic Thai/German language fallback.
- Turn-based listen → silence detection → transcribe → answer → re-arm prototype remains available as historical/fallback behavior but is no longer Taoedge's premium voice target.
- Consequential voice actions always used the same protected Copilot core.

### Hospitality Staff Management
- Property-aware operational staff profiles linked to secure platform identities/memberships.
- Employee code, job title, department, home property, employment type/status, operational phone, preferred language, start/end dates.
- Onboarding checklist: account/permissions, property orientation, SOPs, emergency procedures, role training, keys/equipment and first schedule.
- Secure Team invitation handoff for new accounts.
- Protected offboarding revokes membership/sessions, cancels future shifts, unassigns unfinished shopping lists, preserves audit/history.
- Weekly/property-aware shifts: Draft / Published / Acknowledged / Completed / Cancelled.
- Server overlap protection.
- Targeted shift-publish notification.
- Staff own schedule, acknowledgement and simple clock-in/out timestamps.
- Time-off requests + management review/notifications.
- Manager schedule/time-off authority separated from owner account/offboarding authority.
- Copilot role-filtered staff schedule context and deterministic “Who is working tomorrow?” query.

## 4. v5.11.84 / v0.1.28 — DONE/PRESERVED
### Inventory 2.0
- Hotel catalogue is optional template data; Taoedge never assumes a property stocks any starter item.
- Property explicitly enables operational stock items.
- Zero/unconfigured thresholds are Setup required, not false Out-of-stock alerts.
- Compact Stock / Shopping / POs / Assets UX with search/filtering.

### Shopping Lists / Local Purchase
- Add to Shopping List directly from enabled item.
- Existing/new list, quantity, specification/brand, notes, property, optional room/villa/unit and authorized purchaser.
- Multiple concurrent shopping lists for different staff/properties.
- One combined assigned shopping task/alert rather than item-spam.
- Bought / Partial / Unavailable / Substituted line states with actual quantity/cost.
- Receipt-required completion → linked Finance expense → idempotent stock movement.
- Local-purchase permission separated from formal PO purchasing.
- Formal PO requires a real active supplier, enforced server-side.

### Guarded Copilot operations
- Direct Stay create/cancel.
- Calendar room block/unblock.
- Signed proposal and explicit confirmation.
- State/conflict revalidation before mutation.
- Direct Stay “delete” is operational cancellation with audit/history, not destructive erasure.
- OTA/provider-managed reservations and broad Channel Manager writes remain out of freeform Copilot authority.

### Guest auto-replies
- Trusted routine auto replies wait at least 5 minutes from newest guest message.
- Pending response persisted and regenerated/rechecked at due time.
- New guest/manual message supersedes stale pending response.
- Final customer-satisfaction and “could this come from a five-star hotel concierge?” quality gate.
- Sensitive/operational proposals never auto-send.

## 5. v5.11.83 / v0.1.27 — DONE/PRESERVED
- Property-configurable staff working language.
- Guest original message always preserved.
- Translate/show-original operator review.
- Guest-language AI draft + staff-language review translation.
- Staff-language edit can sync/regenerate the actual guest-language send text before approval.
- First canonical physical Inventory/Assets/Procurement foundation: items, classes, locations, stock balances/movements, suppliers, POs, assets, min/reorder/par/max and service dates.

## 6. Earlier mature production capabilities — DONE/PRESERVED
- Personal Guest Page/AI Concierge with public/private/verified separation.
- 24/7 lost-key release with active stay verification, 500 THB fee explanation + explicit acceptance, protected notifications/code/audit.
- Registration/passport/TM30 privacy-separated flows.
- Housekeeping clean/dirty/ready and arrival/checkout logic.
- Early-check-in and late-checkout rules, including latest 14:00 and 200 THB fee with explicit acceptance.
- Maintenance/emergency/luggage/activity/diving operational routing.
- Unified Inbox/WhatsApp, scheduled guest lifecycle messages and independent AI reply/action approval.
- Canonical reservation/booking/Direct Stay model and activity history.
- Finance expense handling and provider-neutral Beds24 historical Finance backfill/reconciliation architecture.
- Integrations health/resilience.
- Revenue Engine V1, Analytics/Insights and Daily Operating Console.
- Listings & Rates narrow provider write bridge with full Channel Manager separated/off.
- Mobile `/api/mobile/v1`, tenant/property scope, roles/permissions, sessions, licensing, audit and security foundation.
- Real guest names, 7/14 day calendar grid, Light/Dark/System, Back/native swipe behavior and bundle identity `com.taoedge.platform`.
- Operations Copilot workflow registry, deterministic daily attention and signed action proposals.
- One canonical Operations Tasks system with correct room/booking linking and WhatsApp RECEIVED/RESOLVE continuity.

## 7. Permanent user-approved rules — DO NOT CHANGE
- Never lose mature Dashboard/Concierge business/routing logic, exceptions, wording rules, alerts or integrations.
- Shared Taoedge backend/domain core is canonical; mobile/web/guest interfaces/Copilot/voice/future agents are governed interfaces, not separate business systems.
- Server is authority for tenant/property scope, roles, permissions, licensing, provider credentials and consequential state.
- Consequential AI/voice actions: understand → proposal → explicit confirmation → backend re-check → canonical mutation → verification/routing → audit.
- Unknown/ambiguous target = clarify, never guess.
- Provider-managed OTA reservations and full Channel Manager writes remain separately gated.
- Persistent floating Ask AI launcher remains visible.
- Voice understands/speaks multiple languages but has no wider authority than typed Copilot.
- Guest-facing AI uses guest language when known; staff review language is property configurable.
- Inventory never assumes a catalogue item is stocked.
- Formal PO always requires supplier; local staff purchase uses Shopping Lists.
- Shopping-list lines keep property and optional room/villa/unit ownership.
- Multiple Shopping Lists for multiple staff/properties remain supported.
- Receipt → Finance → Inventory lineage stays auditable.
- Trusted normal guest auto replies wait at least five minutes and recheck context.
- Staff data is operational/minimal by default; do not make sensitive HR/medical/passport/payroll secrets mandatory.
- Offboarding revokes access while preserving audit/history.
- **THB is the default currency for all Taoedge pricing, cost modeling, spend caps and commercial planning.** Do not default Taoedge commercial discussions/UI to foreign currency unless explicitly requested.
- Cumulative handoff discipline: DONE stays visible; DEFERRED includes reason; PENDING remains until completed or explicitly removed.

## 8. Current architecture/safety boundaries
- Natural Live media goes over native WebRTC; Taoedge backend brokers the session and retains provider credentials.
- `voice_live` is a separately licensed module.
- Live Voice plan/spend settings are tenant scoped and server authoritative.
- Frontend Live data-channel command surface is allowlisted.
- Client delegation uses existing Copilot/domain methods instead of giving the voice model direct database/provider credentials.
- Existing push-to-talk transcription remains separate and can work without Natural Live.
- Physical live media is not stored in the canonical hotel operational store by this release.
- Staff records remain separate from secure account/membership/permission identity.
- Clock timestamps are operational, not a legally validated payroll system.
- Full Channel Manager remains off/separately gated.

## 9. Validation
### Backend v5.11.86
- Full regression: **412/412 passed**.
- JS/MJS syntax: **43/43 passed**.

### Owner App v0.1.30
- Static validation: **183 files scanned; 70 source/config files checked — PASS**.
- TS/TSX syntax parse: **64/64 passed**.
- Dependency-aware native build: **not claimed**; install attempt in packaging environment did not complete within execution window.
- Physical iPhone GPT-Live WebRTC: **not claimed**; requires Taoedge development/TestFlight build.

## 10. Deployment order
1. Deploy backend **5.11.86**.
2. Confirm live backend contract 5.11.86 and `voice_live` entitlement for The House.
3. Push Owner App **0.1.30**.
4. For Expo Go: run `npm install`, then Expo as normal; push-to-talk remains testable, Natural Live will explain native-build requirement.
5. Once Apple/EAS native build is available, build Taoedge development/TestFlight client and perform Natural Live acceptance tests.
6. Do not enable external paid Live Voice sales until native quality and commercial hard-cap server enforcement are production-verified.

## 11. Current live/manual acceptance checklist
### Regression first
- Diagnostics App 0.1.30 / Backend 5.11.86.
- Inventory explicit item activation; shopping-list purchase and receipt→Finance→stock.
- Supplier-required PO.
- Direct Stay create/cancel and block/unblock proposals.
- five-minute guest auto-reply delay/stale superseding/hospitality tone.
- Staff schedule/onboarding/offboarding/time off.
- Push-to-talk English/German/Thai.

### Natural Live in native build
- Full-duplex connect and natural voice quality.
- Barge-in/interruption while Taoedge speaks.
- Thai, German, English and mid-conversation language switch.
- Direct answers without unsolicited “here is what I can do” capability speech.
- “Who is working tomorrow?” live schedule delegation.
- Inventory/booking questions against real canonical data.
- Protected Direct Stay/calendar action remains confirm-on-screen.
- Session close stops microphone/audio.
- Speaker/Bluetooth/earpiece routing.

### THB metering
- plan/remaining minutes correct;
- 75/90/100 status correct;
- allowance exhaustion blocks new Natural Live session;
- text/push-to-talk fallback remains;
- overage requires owner permission + positive cap;
- zero-cap overage activation becomes THB 500 cap;
- session max shortens when only a small allowance remains.

## 12. Voice — PENDING after native validation
- Server/sideband-owned session lifecycle enforcement so external paid spend limits are tamper-resistant even against a modified client.
- Per-language voice/quality tuning after real-device Thai/German/English testing.
- Voice choice/persona/preferences.
- More robust connection recovery and network/audio-route telemetry.
- Contextual voice shortcuts from Room/Booking/Inventory/Staff screens.
- Usage/latency/quality analytics.
- Consider telephony later only if it fits customer value and margins.

## 13. Staff Management — PENDING
- Guarded Copilot staff actions: create/reassign/cancel shifts and leave decisions.
- Recurring availability and reusable weekly rota templates / Copy week.
- Pre-shift reminders, late/no-clock-in exception alerts and staffing-gap view.
- Shift swap/coverage workflow.
- Department staffing requirements tied to occupancy/events.
- Training/certification/expiry reminders where relevant.
- Equipment/key issuance return checklist.
- Optional contract/document integrations only after privacy/legal requirements.
- Payroll/timekeeping exports/integrations only after jurisdiction/compliance definition.

## 14. Advanced Inventory/Procurement — PENDING
- Cross-property Shopping Run container.
- Single receipt spanning several properties/lists with line/cost allocation and one original receipt.
- Recurring/escalating missing-receipt reminders.
- QR/barcode scanning/labels.
- Batch/expiry/FEFO.
- Stocktakes/cycle counts.
- Automatic housekeeping consumption recipes.
- Occupancy/lead-time forecasting.
- Supplier price history/intelligence.
- PO invoice→Finance reconciliation.
- Numeric approval limits/multi-stage approvals.
- Rich transfers/location balances.
- Predictive purchasing.
- Cost per occupied room/department/amenity.
- Complete portfolio/multi-property Finance routing.

## 15. Live Voice commercial/billing — PENDING
- Commercial/admin plan assignment UI/process.
- Upgrade/downgrade/proration rules.
- Payment processor/subscription collection.
- Tax/VAT invoice handling as appropriate.
- Invoice line item and Finance integration for voice add-on/overage.
- Server-enforced provider shutdown at cap boundary.
- Final pricing/margin review together with Beds24, Meta/WhatsApp, AI text, hosting, payment fees and support.

## 16. Revenue/Listings/Finance — PENDING
- Remaining Listings & Rates / Revenue Management expansion.
- Remaining provider-neutral Finance/Beds24 automation and reconciliation.
- Keep full Beds24 Channel Manager separately gated/off until intentionally enabled and proven.

## 17. Security / v1 — PENDING
- Dedicated anti-theft/security hardening.
- Server-side licensing/entitlement enforcement review.
- Secure authentication/session review.
- Independent red-team/audit.
- Cross-surface QA.
- v1 feature freeze after The House production validation.

## 18. Product/commercial launch — PENDING after core stability
- Explicit final product name/brand approval gate before customer-facing collateral.
- Demo environment.
- Pricing model including Beds24, Meta/WhatsApp, AI text, Natural Live Voice, hosting, payment fees and support — in THB.
- SaaS agreement, DPA/privacy, SLA/support terms and fair onboarding/offboarding.
- Deck, website, one-pager, ROI calculator, FAQ, outreach material and short demo video.
- Automated/guarded agent organization for Product, Development, UX/UI, Guest Communications, Operations, Revenue, Finance, Marketing, Sales/Onboarding, Security/Privacy, Release/DevOps and independent audit.

## 19. Remaining master roadmap — AGREED ORDER
1. Deploy/check v5.11.86 / v0.1.30 regressions in the current environment.
2. When Apple/EAS native build is available, validate Natural Live Voice on iPhone and fix real audio/connection issues first.
3. Complete highest-value Staff operational layers (Copilot schedule actions, rota, reminders/gaps).
4. Complete highest-value Advanced Inventory/Procurement/Finance linkage.
5. Listings & Rates / Revenue expansion.
6. Remaining provider-neutral Finance/Beds24 automation/reconciliation.
7. Commercial Live Voice billing/hard-cap enforcement before selling paid metered voice externally.
8. Comprehensive security/anti-theft, independent red-team and cross-surface QA.
9. v1 freeze + The House production validation.
10. Brand/name approval gate.
11. Demo + THB pricing + legal/support/marketing/sales/onboarding collateral.
12. Guarded agent organization.
13. Reach **100 paying properties in Thailand**.
14. International distribution after Thailand validation.
15. Progressively replace third-party integration dependencies with Taoedge-owned API/integration layer where commercially sensible.

## 20. Product North Star
Taoedge is a provider-neutral, multi-tenant hospitality operating system: one governed operational core for rooms, guests, communications, Tasks, Inventory/procurement, Staff, Finance, Revenue and integrations, exposed through web, mobile, guest pages, AI, Voice and future agents. The House is the proving environment. Multi-villa/multi-property ownership is an architectural requirement, not a later rewrite.

## 21. Agent/Copilot contribution
v5.11.86 moves the premium voice interface from a robotic STT→text→device-TTS chain toward a real full-duplex conversational layer while preserving the critical separation between **conversation/understanding** and **authority/action**. GPT-Live handles natural interaction; Taoedge Copilot/domain logic handles the hotel. Future agents must continue to reuse canonical Reservation, Task, Inventory, Shopping, Staff, Finance and Provider records rather than creating parallel systems.

## 22. Explicit DO NOT LOSE / PRESERVE
- Mature Dashboard/Concierge business rules/routing/exceptions.
- 24/7 lost-key protected workflow and code security.
- Passport/registration/TM30 privacy separation.
- Guest original language + property staff-language translation/review.
- Independent reply approval vs operational-action approval.
- Five-minute delayed/rechecked five-star guest-reply rule.
- Canonical Tasks/alerts and WhatsApp state.
- Explicit property-selected Inventory; no assumed catalogue.
- Supplier-required formal PO.
- Multi-item Shopping Lists, staff/property/unit attribution and receipt→Finance→stock lineage.
- Persistent Ask AI launcher.
- Direct Stay/calendar conflict/provider protections.
- Staff permissions, history-preserving offboarding and property-scoped schedules.
- Push-to-talk fallback.
- Natural Live Voice uses same guarded Copilot authority.
- Thai/German/English/broader multilingual voice requirement.
- THB-first commercial/pricing rule.
- Full Channel Manager-off/separate-gate boundary.
- Real guest names, 7/14 calendar, Light default, Back/swipe UX.
- Thailand-first 100-paying-property goal before international expansion.

## 23. GitHub — Backend Summary
`Release v5.11.86 — natural GPT-Live Voice broker with THB metering and guarded Taoedge delegation`

## 24. GitHub — Backend Description
`Replace the turn-based live-voice prototype with a server-brokered GPT-Live-1 WebRTC foundation while preserving push-to-talk as the lower-cost fallback. Add client delegation from natural full-duplex voice into the existing canonical Taoedge Operations Copilot so live hotel facts and consequential actions continue to use server-authoritative permissions, signed proposals, explicit on-screen confirmation and audit. Keep OpenAI credentials server-side and restrict the untrusted WebRTC data channel to only commentary and close events. Add tenant-scoped Live Voice plans, usage sessions, THB-native allowances/overage pricing, 75/90/100 usage thresholds, opt-in overage with a positive THB monthly spending cap, allowance/cap-based session cutoffs and server-clock-bounded usage accounting. Preserve Staff Management, Inventory 2.0/Shopping Lists, five-minute five-star guest replies, multilingual Inbox review, lost-key/registration/Finance safeguards, provider isolation and the full Channel Manager-off boundary. Backend regression suite: 412/412 passed.`

## 25. GitHub — Owner App Summary
`Release Taoedge Owner App v0.1.30 — natural GPT-Live Voice with THB usage and spend controls`

## 26. GitHub — Owner App Description
`Replace the v0.1.29 turn-based live-conversation experience as Taoedge's premium voice path with a native WebRTC Natural Live Voice client connected through the server-brokered GPT-Live-1 backend. Keep push-to-talk as the lower-cost Expo-Go-compatible fallback and preserve Thai/German/English multilingual operation. Client delegation reuses the existing canonical Operations Copilot, so live hotel facts and consequential actions retain server permissions, proposal cards and explicit on-screen confirmation. Add tenant Live Voice plan/usage presentation, remaining minutes, THB-native add-on/overage values, 75/90/100 usage warnings, owner-controlled overage and positive monthly THB spend caps with safe fallback to text/push-to-talk at the limit. Preserve Staff & Schedule, Inventory 2.0/Shopping Lists, multilingual Inbox review, five-minute five-star guest replies, persistent Ask AI, Direct Stay/calendar protections and all provider/OTA safeguards. Pair with backend v5.11.86.`
