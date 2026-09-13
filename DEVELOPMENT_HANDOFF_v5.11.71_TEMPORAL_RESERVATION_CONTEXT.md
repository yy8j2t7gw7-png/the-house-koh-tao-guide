# Development Handoff — The House v5.11.71

## Problem

A live Airbnb guest had a confirmed Room 4 stay ending Monday and a Room 5 stay beginning the same Monday. In the Room 5 provider thread the guest asked where to keep bags between checkout and check-in. The Concierge understood luggage storage but answered from generic/current-thread context and did not apply the Monday office closure to the actual transition date.

## Fix

- `ConciergeStore.getAdjacentStayReservationsForMessaging()` resolves only exact adjacent confirmed stays.
- Matching uses a shared messaging phone where available; otherwise it requires the same provider, same guest first name and exact boundary date. Ambiguous boundaries return no adjacent stay.
- trusted provider/mobile access exposes a sanitized stay chain to Concierge reasoning.
- model instructions explicitly resolve relative dates in Asia/Bangkok and reason across verified adjacent stays.
- informational luggage policy gets a deterministic trusted-stay path, including Monday office closure / Bamboo fallback.
- manual reply edits remain non-learning by default.

## Rollout

Deploy backend v5.11.71 before Owner App v0.1.12. No schema migration or new environment variable is required.
