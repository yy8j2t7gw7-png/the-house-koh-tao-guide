# DEVELOPMENT HANDOFF — Backend v5.11.86
## Natural GPT-Live Voice + THB metering/commercial controls

## 1. Objective
Replace the v5.11.85 turn-based device TTS live-conversation prototype as Taoedge's long-term premium voice path with a brokered, full-duplex GPT-Live architecture while preserving cheap push-to-talk, the canonical Operations Copilot, server-authoritative permissions, protected confirmations and every mature Dashboard/Concierge rule.

## 2. Completed in v5.11.86 — DONE
### Natural Live Voice broker
- Added `src/live-voice.js` as the server-owned Live Voice adapter.
- Creates `gpt-live-1` WebRTC sessions through `POST /v1/live/sessions`; the Taoedge server sends the SDP offer upstream and returns only the SDP answer/session metadata to the mobile app.
- OpenAI/API credentials never leave the backend.
- Voice/model are server configurable; default model is `gpt-live-1` and default voice is `marin`.
- Uses **client delegation** so GPT-Live owns natural conversation/turn-taking while Taoedge's existing Copilot remains responsible for live hotel facts, permissions, domain actions and durable state.
- Live prompt explicitly answers the actual request first, avoids capability monologues unless asked, uses concise five-star hospitality/operator language, and follows the user's current language including Thai, German, English and mixed-language conversations.
- Consequential operations remain governed by the existing Taoedge signed proposal/on-screen confirmation contract. Voice does not acquire wider authority.

### Untrusted WebRTC data-channel hardening
- The frontend data channel is explicitly restricted to only the client events Taoedge needs: `session.commentary.append` and `session.close`.
- Provider server events remain available for transcripts, delegation, usage, close/error and live state.
- The mobile app cannot use the WebRTC data channel to rewrite session delegation/configuration.

### Canonical Taoedge delegation path
- Client delegation is correlated by opaque delegation ID.
- Live user transcript fragments are accumulated by the app and delegated to the existing `/api/mobile/v1/copilot/chat` path via the existing Copilot provider.
- Non-consequential Copilot results are returned to GPT-Live as speakable `session.commentary.append` context.
- If Copilot returns a protected proposal, GPT-Live is told that the action is ready on screen and requires confirmation; it does not execute the action itself.

### Tenant Voice usage + THB commercial model
Added canonical persistence:
- `platform_voice_settings`
- `platform_voice_sessions`

Added server functions for:
- tenant Voice settings;
- monthly usage summaries;
- Live session records;
- cumulative usage updates;
- THB overage estimate;
- audit history.

Current configurable Taoedge plan catalogue:
- `voice_trial`: 60 included minutes, no paid overage.
- `voice_500`: 500 minutes, **THB 1,990/month**, overage **THB 4.50/min**.
- `voice_1000`: 1,000 minutes, **THB 3,490/month**, overage **THB 4.25/min**.
- `voice_3000`: 3,000 minutes, **THB 8,990/month**, overage **THB 4.00/min**.
- `house_preview`: internal The House preview allowance only; not exposed as a customer plan.

Commercial controls:
- normal Text Copilot remains outside this premium Live Voice meter;
- existing push-to-talk remains the lower-cost fallback;
- monthly Live usage is tenant-scoped;
- 75% / 90% / 100% usage threshold state is calculated;
- paid overage is opt-in only on eligible plans;
- paid overage is fail-closed without a positive monthly THB cap;
- enabling overage with no cap supplied defaults to a **THB 500** monthly cap rather than unlimited spend;
- session admission fails when allowance/cap is exhausted;
- session duration returned to the app is capped by remaining allowance/cap as well as the configured per-session ceiling;
- usage is cumulative and server-clock-bounded rather than trusting only client-reported seconds;
- all customer-facing commercial values in this feature are THB.

**Important:** v5.11.86 implements metering, allowance and spend-control state. It does **not** implement automatic payment collection/invoicing for Live Voice. Billing collection remains a commercial/billing integration layer.

### Mobile API
Added:
- `GET /api/mobile/v1/copilot/voice/live/usage`
- `POST /api/mobile/v1/copilot/voice/live/settings`
- `POST /api/mobile/v1/copilot/voice/live/session`
- `POST /api/mobile/v1/copilot/voice/live/session/:id/usage`

Entitlement/security:
- new licensed module: `voice_live`;
- Live usage/session requires `copilot.use` + `voice_live`;
- Live commercial settings require `licenses.manage` + `voice_live`;
- The House preview license auto-upgrade includes the module for proving/testing.

### Platform contract
- Backend contract/version is now **5.11.86**.
- Platform contract advertises `liveVoice: true`.

## 3. Preserved from v5.11.85 — DO NOT REGRESS
- Push-to-talk microphone + authenticated transcription remains available as the cheap/fallback voice command path.
- Thai/German/English and broader language routing.
- Staff Management/Scheduling foundation: profiles, onboarding, offboarding, shifts, acknowledgement, simple clock timestamps, time off, notifications, multi-property awareness and role-filtered schedule context.
- Voice and text use the same Copilot authority and action contract.

## 4. Preserved mature safety/business boundaries
- Mature Dashboard/Concierge logic remains primary/canonical.
- Lost-key, registration/passport/TM30, Finance, Inventory, guest messaging and provider secrets remain permission-scoped.
- Direct Stay/calendar actions remain signed proposal → explicit confirmation → backend re-check → canonical mutation → audit.
- OTA/provider-managed reservation writes and full Channel Manager remain separately gated/off unless explicitly proven/activated.
- No guest-message review/operational-action safety rule is bypassed by Live Voice.
- No raw provider key is returned to a client.

## 5. Environment/configuration
- `OPENAI_API_KEY` — server-only provider credential.
- `OPENAI_LIVE_MODEL` — defaults to `gpt-live-1`.
- `OPENAI_LIVE_VOICE` — defaults to `marin`.
- `TAOEDGE_LIVE_VOICE_ENABLED` — feature master switch; defaults enabled in code but still requires module/permission/configuration.
- `TAOEDGE_LIVE_VOICE_MAX_SESSION_SECONDS` — per-session ceiling, bounded to 300–3600 seconds; the effective session may be shorter when tenant allowance/cap is nearly exhausted.

## 6. Validation
- Full backend regression suite: **412/412 passed**.
- Backend JS/MJS syntax validation: **43/43 passed**.
- Dedicated v5.11.86 Live Voice tests cover:
  - THB plan catalogue;
  - trial allowance exhaustion;
  - GPT-Live WebRTC session broker and no API-key exposure;
  - restricted frontend data-channel events;
  - fail-closed positive THB spend cap for paid overage;
  - session duration capped by remaining allowance;
  - cumulative/server-clock-bounded usage accounting.

## 7. Deployment order
1. Deploy backend **v5.11.86** first.
2. Confirm `/api/mobile/v1/platform` reports contract 5.11.86 / Live Voice capability.
3. Deploy/run Owner App **v0.1.30**.
4. Expo Go may continue testing the ordinary app and push-to-talk; Natural Live Voice requires a Taoedge native development/TestFlight build.
5. Do not market Live Voice as production-verified until physical native WebRTC testing passes.

## 8. Manual/live validation still required
### Native build
- Install a Taoedge development/EAS/TestFlight build with the new native WebRTC dependency.
- Verify microphone permission and iPhone audio route.
- Verify Live session connects, `session.started` arrives, and audio is full-duplex.
- Interrupt Taoedge mid-sentence and confirm natural barge-in/turn-taking.
- Check speaker/Bluetooth/earpiece behavior.

### Conversation quality
- English natural back-and-forth.
- German natural back-and-forth.
- Thai natural back-and-forth.
- Switch languages mid-conversation.
- Ask a simple conversational question and verify Taoedge answers directly rather than reciting capabilities.

### Delegation/safety
- Ask “Who is working tomorrow?” and verify live Staff data delegation.
- Ask Inventory/booking/calendar questions and verify live canonical data.
- Ask for Direct Stay create/cancel and block/unblock; verify on-screen protected proposal and **no mutation until explicit confirmation**.
- Verify OTA/provider-managed booking cannot be casually changed through voice.

### Metering
- Verify remaining minutes and session usage update.
- Verify 75/90/100 threshold UI.
- Verify allowance exhaustion prevents a new session and push-to-talk/text remain available.
- On a paid test tenant, enable overage and verify a positive THB cap is required/defaulted and respected.

## 9. Known limitations / PENDING
- **Native physical testing:** WebRTC dependency/native build is not available in the packaging environment; full end-to-end GPT-Live audio is not claimed here.
- **Expo Go:** Natural Live Voice cannot use the required native WebRTC module; push-to-talk remains the Expo Go fallback.
- **Payment collection:** metering/plan state exists, but payment processor/subscription invoicing is not wired in this release.
- **Commercial hard-cap hardening:** before external metered billing, add server/sideband-owned provider session termination/monitoring so a modified client cannot ignore the returned session cutoff.
- **Portfolio billing:** customer-level plan assignment, upgrades/downgrades, invoices, tax treatment and prorating remain commercial-platform work.
- **Voice analytics:** session quality/latency/error diagnostics and per-language quality dashboards remain pending.
- **Voice preferences:** selectable voice/persona/speed preferences remain pending until native quality testing.

## 10. Product/Commercial rule — PERMANENT
Taoedge commercial planning/pricing is THB-native. Do not default Taoedge pricing discussions or customer-facing commercial UX to foreign currency. Provider costs may originate elsewhere, but Taoedge customer plans, margins, caps and commercial decisions are modeled/presented in THB unless explicitly requested otherwise.

## 11. Product North Star
Taoedge remains a provider-neutral, multi-tenant hospitality operating system. The mobile app speaks to a Taoedge-owned Live Voice API contract rather than receiving provider credentials. GPT-Live is the current premium voice provider behind that adapter; later provider/model replacement must not require redesigning hotel operations, permissions or the app's canonical action model.

## 12. GitHub Summary
`Release v5.11.86 — natural GPT-Live Voice broker with THB metering and guarded Taoedge delegation`

## 13. GitHub Description
`Replace the turn-based live-voice prototype with a server-brokered GPT-Live-1 WebRTC foundation while preserving push-to-talk as the lower-cost fallback. Add client delegation from natural full-duplex voice into the existing canonical Taoedge Operations Copilot so live hotel facts and consequential actions continue to use server-authoritative permissions, signed proposals, explicit on-screen confirmation and audit. Keep OpenAI credentials server-side and restrict the untrusted WebRTC data channel to only commentary and close events. Add tenant-scoped Live Voice plans, usage sessions, THB-native allowances/overage pricing, 75/90/100 usage thresholds, opt-in overage with a positive THB monthly spending cap, allowance/cap-based session cutoffs and server-clock-bounded usage accounting. Preserve Staff Management, Inventory 2.0/Shopping Lists, five-minute five-star guest replies, multilingual Inbox review, lost-key/registration/Finance safeguards, provider isolation and the full Channel Manager-off boundary. Backend regression suite: 412/412 passed.`
