# TAOEDGE — DEVELOPMENT HANDOFF
## Backend v5.11.77 — Reservation Operations & OTA Sync Hardening

Date: 14 September 2026
Matching app: Taoedge Owner App v0.1.19

## 1. Objective

This release makes reservation operations more trustworthy before enabling broader channel-manager authority. The focus is Direct Stay protection, distribution observability, a repaired Listings & Rates API contract and the backend operations needed by the v0.1.19 front-desk UX.

## 2. What changed

### Listings & Rates mobile contract

The production mobile route contract is explicit and version-reported:

- `GET /api/mobile/v1/listings-rates`
- alias `GET /api/mobile/v1/listings`
- `POST /api/mobile/v1/listings-rates/write`
- alias `POST /api/mobile/v1/listings/write`
- protected mobile paths normalize trailing slashes before routing.

`GET /api/mobile/v1/platform` returns:

- backend version `5.11.77`
- mobile API version `v1`
- canonical Listings & Rates route
- Direct Stay operations capability

This is the backend repair for the 404 surfaced by v0.1.18 Diagnostics.

### Direct Stay distribution acceleration

After a Direct Stay booking is accepted by Beds24, Taoedge immediately attempts an explicit occupied-night inventory close through the narrow Direct Stay protection path and then verifies Beds24 central availability.

A dedicated flag controls this behavior:

`BEDS24_DIRECT_STAY_FAST_INVENTORY_SYNC_ENABLED=true`

It is independent from the broad Listings & Rates write flag and from the full Channel Manager.

### Safe cancellation reopening

Cancellation/opening behavior is conflict-aware. Taoedge does not blindly write inventory `1` after cancelling a stay. It first checks other confirmed local reservations and central Beds24 availability. If another local reservation exists, reopening is skipped. If Beds24 has not yet caught up with the cancellation, reopening stays provider-pending and retries later.

### Retry cadence

Direct synchronization retries run from the minute cron. Direct inventory close/reopen and cancellation operations start with a two-minute exponential backoff. This removes the previous possibility that a Direct Stay synchronization failure effectively waited for an hourly retry window.

### Distribution event ledger

Per-reservation synchronization events are persisted and exposed to Booking Details. This separates provider acceptance from actual availability protection and gives us timestamps for the Westy/Smoobu comparison.

### Direct Stay update/cancel API

`POST /api/mobile/v1/direct-stays/update`

- direct/owner-managed stays only
- confirmed stays only
- local overlap check
- central provider availability check for newly-added ranges
- provider-first Beds24 update
- local update
- rollback attempt if local update fails
- auditable

`POST /api/mobile/v1/direct-stays/cancel`

- retains cancelled reservation for audit/history
- cancels linked Beds24 booking
- protected reopening workflow
- retry support when provider state lags

## 3. Critical safety boundaries

Keep these production boundaries unless a later explicitly validated release changes them:

- `BEDS24_CHANNEL_MANAGER_ENABLED=false`
- `BEDS24_DIRECT_STAY_PROTECTION_ENABLED=true`
- `BEDS24_DIRECT_STAY_FAST_INVENTORY_SYNC_ENABLED=true`
- `BEDS24_RATE_INVENTORY_WRITES_ENABLED=false`

The new fast Direct Stay close/reopen path is deliberately narrow. It does **not** authorize generic bulk rate/inventory management and does **not** turn on full booking ingestion/reconciliation.

## 4. Deployment order

1. Deploy backend v5.11.77 first.
2. Verify `/api/mobile/v1/platform` reports backend `5.11.77`.
3. Verify the authenticated Listings & Rates route returns a real capability/provider response rather than `404 not_found`.
4. Build/install app v0.1.19.
5. Open More → Diagnostics and verify Live backend `5.11.77`, Listings endpoint reachable, and Fast availability sync enabled.

## 5. Controlled production test

Repeat the real Direct Stay timing test with a safe future Room/date range:

1. Note exact time Taoedge creates the Direct Stay.
2. Open Booking Details → Distribution sync and observe Beds24 booking acceptance and inventory-close confirmation/pending state.
3. Check Beds24 calendar/availability.
4. Check Airbnb guest-facing availability separately from the host-app visual calendar if possible.
5. Record time until Airbnb is actually unavailable.
6. Cancel the test Direct Stay.
7. Observe cancellation acceptance and reopening state.
8. Confirm no other reservation exists before the range reopens.
9. Record time until Airbnb is actually available again.

This allows us to separate Taoedge latency, Beds24 processing and Airbnb UI/provider latency instead of guessing from the host-app screen.

## 6. Known production limitation

Taoedge can minimize and measure its own path to Beds24, but it cannot guarantee how quickly Airbnb processes or visually refreshes availability. The target remains Smoobu-class or better practical responsiveness, and the new event ledger gives us the evidence needed for further optimization.

Broad Listings & Rates writes remain read-only/fail-closed until one controlled live Beds24 write is deliberately validated. Full Channel Manager activation remains a later release.

## 7. Validation

- Backend test suite: 366/366 passed.
- JS/MJS syntax: 30/30 passed.
- Fresh-package validation must be rerun before the archive is labelled ready-to-push.

## 8. Immediate next priorities

After production verification:

- use real timing data to refine OTA propagation behavior;
- verify Direct Stay edit, move, extension and cancellation on controlled dates;
- validate the v0.1.19 compact Bookings/calendar/WhatsApp flows on iPhone;
- then move to v5.11.78/v0.1.20 for the deeper multi-room/date Listings & Rates workspace only after the narrow distribution path is trusted.

## 9. GitHub Summary

`Release v5.11.77 — reservation operations and OTA synchronization hardening`

## 10. GitHub Description

`Harden Taoedge reservation distribution with Direct Stay fast inventory protection, conflict-aware cancellation reopening, minute-level retries, per-reservation distribution telemetry, editable/cancellable Direct Stays, and a repaired/versioned Listings & Rates mobile API contract while keeping the full Beds24 Channel Manager disabled. Preserve provider-first double-booking protection, tenant/role security, AI guest lifecycle messaging, Finance and registration safeguards, and fail-closed broad rate/inventory writes.`

## 11. Permanent Product North Star & Autonomous Operations Roadmap

This section is a standing requirement for every Taoedge handoff.

Taoedge is being built as a commercial, multi-tenant hospitality operating platform, not merely a dashboard or chatbot. The House is the live proving ground. The commercial sequence remains: harden The House → complete a generic demo/commercial product → onboard early external properties → scale to **100 paying properties in Thailand** → expand internationally → progressively become the API/integration provider ourselves where technically and commercially sensible.

Every operational feature should become a reliable primitive a future agent can safely operate. The intended engineering-agent structure remains Product Commander → Developer Agents → UX/UI Designer → Conversation/Copy → QA/Red-Team → Security/Privacy → Release/DevOps → human production approval. Later company agents cover Sales, Onboarding/Customer Operations, Support, Finance/Admin, Marketing and Corporate/Legal/Compliance under a Commander with an independent Auditor/Red-Team.

Autonomy must remain permissioned and auditable: canonical shared state, least privilege, deterministic safety rules, cost controls, reversible actions where practical and human escalation/approval for consequential decisions.

Commercial pricing and agent decisions must account for real serving costs including Beds24/connectivity, Meta/WhatsApp, AI/model usage, Cloudflare/hosting/storage/bandwidth, third-party APIs, push/email/payment tooling, onboarding/support and app operations.

OTA synchronization speed is a core product metric. Taoedge should continue benchmarking practical distribution latency against Smoobu-class responsiveness and should never treat HTTP/provider acceptance alone as proof that an OTA is safely synchronized.

## 12. Standing handoff requirements

Every future handoff must retain:

- current release objective and changes;
- safety boundaries / feature flags;
- deployment order;
- validation results;
- known live-production verification steps;
- immediate next priorities;
- Product North Star & agent roadmap;
- commercial scaling objective;
- OTA synchronization performance requirement;
- **GitHub Summary**;
- **GitHub Description**.
