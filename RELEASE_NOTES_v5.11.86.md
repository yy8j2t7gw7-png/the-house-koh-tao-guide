# RELEASE NOTES — Backend v5.11.86
## Natural Live Voice + THB metering

### Highlights
- New server-brokered **GPT-Live-1 WebRTC** session path for natural, full-duplex Taoedge Voice.
- **Client delegation** connects live speech to the existing Taoedge Copilot/domain core rather than creating a parallel voice action system.
- Voice prompt answers the actual request directly and supports Thai, German, English and language switching.
- Existing push-to-talk remains available as the lower-cost/Expo-Go fallback.
- New `voice_live` licensed module and server-authoritative usage/settings routes.
- Provider API credentials remain backend-only.
- Frontend Live data-channel commands are restricted to commentary and close events.
- New THB-native Live Voice plans, tenant monthly usage, 75/90/100 thresholds, opt-in overage, positive monthly spending cap, session-length cutoff based on remaining allowance/cap, and audit.
- The House receives an internal preview allowance for proving the feature.

### Current plan configuration
- Trial: 60 min.
- Live Voice 500: THB 1,990/month; THB 4.50/min overage.
- Live Voice 1,000: THB 3,490/month; THB 4.25/min overage.
- Live Voice 3,000: THB 8,990/month; THB 4.00/min overage.

### Safety
Consequential hotel actions still require the existing protected Taoedge proposal/confirmation flow. Live Voice does not gain direct provider/OTA authority.

### Validation
- Backend tests: **412/412 passed**.
- JS/MJS syntax: **43/43 passed**.

### Not claimed
- No physical native iPhone/WebRTC end-to-end test was possible in the packaging environment.
- No automatic payment collection/invoicing is included yet.
- External commercial rollout should add server/sideband-owned provider-session termination before treating spend caps as tamper-resistant against a modified client.
