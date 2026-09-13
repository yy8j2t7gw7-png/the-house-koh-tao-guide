# Development Handoff — v5.11.66

## Release objective

Complete the next Owner App operational pass after v5.11.65 by adding reservation communication actions, multi-horizon Home navigation and the live mobile receipt-save compatibility repair.

## Backend contracts

### Booking detail communications

`GET /api/mobile/v1/bookings/detail?id=<reservationId>` now returns a protected `communications` object:

```text
provider.available
provider.label
provider.threadId
whatsapp.available
whatsapp.threadId
whatsapp.canStart
call.available
call.phone
```

Raw call numbers are not returned to staff.

### Provider conversation start

```text
POST /api/mobile/v1/inbox/provider/start
{ "reservationId": "..." }
```

The backend resolves the reservation, validates provider/Beds24 capability and opens or links the provider conversation through the existing Unified Messaging layer. Provider credentials remain server-only.

### Home glance

`GET /api/mobile/v1/home` now includes:

```text
glance.today
glance.tomorrow
glance.week
```

with arrival/departure/occupancy/turnover planning values derived from current canonical reservations.

## Finance compatibility repair

The live mobile receipt test returned `expense_save_failed` at the storage step. Current Finance list/read queries working while inserts failed is consistent with an older table missing the insert-only creator attribution field.

The Durable Object constructor now explicitly upgrades early Finance schemas with:

```sql
ALTER TABLE expense_records ADD COLUMN created_by_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE income_records ADD COLUMN created_by_hash TEXT NOT NULL DEFAULT '';
```

Both statements are safely ignored when the columns already exist.

## Live validation after deployment

1. Confirm normal Home/Calendar/booking operations still load.
2. Open a booking and verify Provider / WhatsApp / Call actions match the reservation capabilities.
3. Verify staff cannot obtain a raw guest phone number.
4. Swipe Today → Tomorrow → 7 Days on Home and verify counts against bookings.
5. Tap Arrivals / Ready / Registrations / Maintenance and verify each opens its operational destination.
6. Before retrying the failed receipt, check Finance once for an existing matching row to avoid an accidental duplicate if the earlier request partially succeeded.
7. Retry one controlled expense/receipt submission.
8. Confirm the expense and private receipt appear in Finance and the audit trail records the signed-in user.
9. Keep scheduled Beds24 Finance sync disabled until the separate expected→paid payout reconciliation gate is complete.

## Automated validation

```text
334 passed / 0 failed
```
