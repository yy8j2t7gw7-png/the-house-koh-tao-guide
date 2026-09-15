# DEVELOPMENT HANDOFF — Taoedge Backend v5.11.85
## Multilingual Voice Copilot + Hospitality Staff Management Foundation

## 1. Current release objective/version
- **Backend:** v5.11.85
- **Paired Owner App:** v0.1.29
- **Base:** v5.11.84 / v0.1.28 Inventory 2.0 + Shopping Lists + guarded Direct Stay/calendar actions + five-star delayed guest replies.
- **Objective:** add a safe multilingual voice entry layer on top of the existing Operations Copilot and introduce a canonical hospitality staff-management domain for profiles, onboarding/offboarding, shifts and time off without weakening any existing operational/security boundary.

## 2. Completed in this release — DONE
### A. Multilingual Taoedge Voice
- Added authenticated mobile voice transcription endpoint: `POST /api/mobile/v1/copilot/voice/transcribe`.
- Audio is size/type guarded before upstream transcription; transcripts are bounded and audited without storing raw audio in the Taoedge operational store.
- Transcription preserves the speaker's original language and explicitly preserves room/villa/unit numbers, dates, times, quantities, staff/guest/property names and brands.
- Added voice-language analysis/normalization for safe Copilot routing. Spoken Thai, German, English and other supported languages can be normalized to the same canonical operational intent parser without making the normalization an authorization step.
- Added deterministic local fallback language detection for Thai, German, Spanish, French and English when the language-routing model is unavailable.
- Copilot replies can be localized back into the operator's spoken language while preserving operational facts exactly.
- Voice uses the **same** Operations Copilot core as typed chat: same permissions, signed proposals, expiry/tamper protection, confirmation, canonical actions/Tasks and audit.
- Voice never creates a second action engine and never bypasses confirmation for Direct Stay/calendar/task actions.
- Added voice audit event `copilot_voice_transcribed` with language/byte/character metadata only.

### B. Staff-management canonical domain
- Added canonical operational staff profile model linked to existing Taoedge platform users/memberships.
- Profile fields include employee code, job title, department, home property, employment type/status, operational phone, preferred language and start/end dates.
- First staff layer intentionally excludes passports, medical information, disciplinary records and payroll secrets.
- Added staff permissions:
  - `staff.schedule_view`
  - `staff.schedule_manage`
  - `staff.timeoff_manage`
  - existing `staff.manage` remains owner-level account/profile/offboarding authority.
- Staff role can view own schedule; managers can manage schedules/time off according to server permission; owner retains staff-account administration.

### C. Onboarding
- Added canonical onboarding checklist records.
- Default checklist covers:
  - Account access and permissions
  - Property orientation
  - House rules / operating procedures
  - Emergency procedures
  - Role-specific training
  - Keys / uniform / equipment acknowledgement
  - First schedule confirmed
- Checklist supports pending/completed/not-applicable state with actor and timestamp audit.
- Completing the checklist can advance an onboarding employee into Active operational status.
- Existing secure Team & Access invitation remains the account-creation gateway; the paired app links Staff & Schedule directly to that invitation workflow.

### D. Offboarding
- Added protected staff offboarding endpoint.
- Offboarding fails closed for owner accounts/self-targeting and requires `staff.manage`.
- Offboarding revokes active Taoedge sessions/membership access immediately.
- Future Draft/Published/Acknowledged shifts are cancelled.
- Open assigned local-shopping lists are unassigned and returned to a safe unassigned/draft state when applicable.
- Staff employment status becomes inactive; end/offboarding timestamps are retained.
- Historical shifts, audit records and completed operational history are preserved instead of destructively erased.

### E. Staff schedule / shifts
- Added canonical property-aware `staff_shifts` records.
- Shift fields: property, employee, date, start/end, department, role label, notes and lifecycle state.
- Lifecycle: `draft → published → acknowledged → completed`, with `cancelled` as terminal exception.
- Overlapping active shifts for the same staff/date are blocked server-side.
- Publishing sends a targeted mobile operational notification to the assigned staff member.
- Staff may acknowledge their own shift and record simple clock-in / clock-out timestamps.
- Managers can publish/cancel/complete shifts only with `staff.schedule_manage`.
- Schedule remains property-aware for future multi-hotel/multi-villa portfolios.

### F. Time off / availability
- Added canonical time-off request model with property, date range, type, reason and status.
- Staff can create their own request with `staff.schedule_view`.
- Authorized management can approve/reject requests using `staff.timeoff_manage`.
- Request and decision notifications are routed to management/staff respectively.
- Review history is audited.

### G. Copilot staff awareness
- Live Operations Copilot context now includes role-filtered staff schedule data when the actor has `staff.schedule_view`.
- Deterministic staff-schedule questions such as **“Who is working tomorrow?”** and **“What is my shift tomorrow?”** return live schedule information without depending on generative model completion.
- Voice can ask the same question in another language and receive the answer in that spoken language.
- Creating/editing staff shifts through freeform Copilot is **not yet enabled** in this release; the canonical schedule UI/API is the authority until a guarded staff-action proposal parser is separately validated.

## 3. Previously completed capabilities — DONE/PRESERVED
- v5.11.84 Inventory 2.0: explicit property-selected catalogue, setup-required state, Shopping Lists, receipt→Finance→stock linkage, supplier-required formal PO.
- Guarded Copilot Direct Stay create/cancel + calendar block/unblock with signed explicit confirmation.
- Five-minute delayed/rechecked trusted guest auto-replies and five-star hospitality/customer-satisfaction gate.
- v5.11.83 multilingual guest-message and AI-draft staff-review translation, property working language and Inventory/Assets/Procurement foundation.
- Canonical Operations Tasks, WhatsApp RECEIVED/RESOLVE parity and task persistence.
- Mature Dashboard/Concierge routing, housekeeping, maintenance, luggage, emergency, activity/diving, lost-key, registration/passport/TM30.
- Unified guest messaging and independent AI reply approval vs operational-action approval.
- Finance/expenses/Beds24 Finance historical import/reconciliation architecture.
- Revenue Engine, Analytics/Insights, Daily Operating Console, Listings & Rates narrow-write and Direct Stay/provider safeguards.
- Server-authoritative tenant/property/role/licensing/session/security/audit and provider credential isolation.
- Full Beds24 Channel Manager remains separately gated/off.

## 4. Permanent rules — PRESERVE
- Mature Dashboard/Concierge domain logic remains primary and must never be replaced by a simplified mobile/AI copy.
- Typed chat, push-to-talk voice and live voice all feed the **same canonical Copilot core**.
- Voice-language normalization is interpretation only, never authorization.
- Consequential action remains: **understand → exact proposal → explicit confirmation → backend permission/state re-check → canonical mutation → verification/routing → audit**.
- Unknown/ambiguous rooms, bookings, properties, staff or dates require clarification; never guess.
- Provider-managed OTA reservations remain outside freeform Copilot mutation authority.
- Guest-facing AI continues in guest language when understood; staff review language remains property configurable.
- Persistent Ask AI launcher remains visible by explicit product decision.
- Staff module is hospitality-operations focused; sensitive HR/payroll data stays minimal by default.
- Offboarding removes access but preserves history.
- Multi-property staff/shift records retain property ownership and scope.

## 5. Security/privacy boundaries
- Voice endpoint requires authenticated mobile Copilot access and does not create a parallel anonymous API.
- Audio is forwarded for transcription but not written into the canonical Taoedge database by this feature.
- Provider/API credentials remain server-side.
- Staff account permissions continue to come from server memberships/permission overrides, not app UI state.
- Owner account cannot be offboarded through staff flow.
- Staff cannot manage other people's shifts/time off without the relevant management permission.
- Clock-in/out is intentionally simple operational timestamping in this foundation; it is not represented as statutory payroll/timekeeping compliance.

## 6. Validation
- Full backend regression suite: **406 / 406 passed**.
- Backend JS/MJS syntax: **65 / 65 passed**.
- Voice regression coverage includes German Direct Stay-cancellation routing, Thai daily-attention routing and deterministic Thai/German language fallback.
- Staff regression coverage includes normalized hospitality employment data, shift overlap protection and time-off date validation.
- Existing v5.11.84 Inventory/Shopping/Copilot/delayed-guest-reply tests remain green.

## 7. Deployment order
1. Deploy backend **v5.11.85**.
2. Verify `/api/mobile/v1/platform` reports backend **5.11.85**.
3. Push/run Owner App **v0.1.29**.
4. Confirm Diagnostics shows App 0.1.29 / Backend 5.11.85.
5. Perform the live acceptance checklist in the cumulative handoff.

## 8. Live/manual checks still required
- Microphone permission prompt and recording on physical iPhone.
- Push-to-talk English, Thai and German transcription accuracy in real environmental noise.
- Spoken reply uses the correct language/voice available on device.
- Live turn-based conversation automatically stops after silence, answers, speaks and re-arms.
- Consequential voice action stops for protected on-screen confirmation.
- Staff profile, onboarding, shift publish/acknowledge/clock-in/out, time-off approval and offboarding on production data.
- Offboarding revokes the staff session on a second device and unassigns open shopping lists.
- Existing Inventory, Finance, Inbox, Direct Stay/calendar and delayed guest-message workflows remain stable.

## 9. PENDING / next extensions
- True low-latency **full-duplex realtime voice** with interruption/barge-in; v0.1.29 is safe turn-based live conversation plus push-to-talk.
- Guarded Copilot staff-management actions such as “schedule Aum 10–6 Tuesday”, shift reassignment and approved time-off actions.
- Pre-shift/late/missed-shift reminder automation and manager exception alerts.
- Rich staff availability/recurring schedule patterns, reusable templates and rota copy-week tools.
- Staff certifications/training-expiry reminders where operationally useful.
- Optional payroll/export integrations only after privacy/legal/product requirements are defined.
- Advanced Inventory/Shopping Run/receipt allocation/scanning/stocktakes/forecasting/Finance reconciliation from the preserved roadmap.
- Remaining Listings/Revenue, Finance hardening, final security/red-team/QA and v1 freeze.

## 10. Product North Star
Taoedge is one governed, provider-neutral, multi-tenant hospitality operating platform. Voice and Staff Management extend the same canonical operating core rather than creating standalone apps. The House remains the proving property; architecture must remain suitable for multi-villa/multi-hotel operators, then the Thailand-first commercial rollout to 100 paying properties before international expansion.

## 11. GitHub Summary
`Release v5.11.85 — multilingual Taoedge Voice and hospitality Staff Management foundation`

## 12. GitHub Description
`Add authenticated multilingual Taoedge Voice on top of the existing Operations Copilot, with guarded audio transcription, original-language preservation, Thai/German/English and broader language routing, localized spoken-response support, and the same signed proposal/permission/confirmation/audit contract as typed chat. Introduce a canonical hospitality Staff Management foundation with property-aware staff profiles, operational employment status, onboarding checklists, protected offboarding with session revocation and work reassignment, draft/published/acknowledged/completed shifts, overlap protection, staff acknowledgement and simple clock-in/out timestamps, time-off requests/review, targeted notifications and role-filtered Copilot schedule awareness. Preserve Inventory 2.0/Shopping Lists, five-minute five-star guest replies, multilingual Inbox review, canonical Tasks, mature Dashboard/Concierge logic, Finance/registration/lost-key safeguards, provider isolation and the full Channel Manager-off boundary. Backend regression suite: 406/406 passed.`
