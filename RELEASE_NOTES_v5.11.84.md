# RELEASE NOTES — Taoedge Backend v5.11.84

v5.11.84 is the Inventory 2.0 / Local Shopping / Guarded Hotel Control / Five-Star Guest Reply release.

## Highlights
- Starter Inventory becomes optional catalogue reference; only property-enabled items become operational stock.
- Adds setup-required state to prevent false “out of stock” warnings for unconfigured items.
- Adds canonical multi-item Shopping Lists for local staff purchasing, authorized purchaser assignment, property/room context, line progress, receipt reminder, Finance linkage and idempotent stock posting.
- Formal Purchase Orders now require a real active supplier.
- Adds Copilot guarded Direct Stay create/cancel and calendar block/unblock actions under explicit confirmation and existing conflict/availability rules.
- Adds minimum five-minute delay for trusted normal automatic guest replies, followed by a second context-aware generation/review before send; stale replies are superseded.
- Strengthens guest reply standard with satisfaction and five-star-concierge quality gates.

## Validation
- JS syntax: 34/34 PASS.
- Full regression suite: 399/399 PASS.

## Deployment
Deploy backend first, confirm 5.11.84 in Diagnostics, then deploy Owner App v0.1.28. Keep the full Beds24 Channel Manager disabled unless separately enabled and validated.
