# Release Notes — The House v5.11.70

## Taoedge Insights V2

- 30 / 60 / 90 day forward occupancy and confirmed room-night demand.
- Weekly occupancy trend inside the selected historical range.
- Booking pickup based on when a reservation was first seen by Taoedge. This is labelled honestly and is not presented as the original OTA booking timestamp for backfilled bookings.
- Per-channel cancellation rate and average stay alongside confirmed-night share.
- Room-level ledger net per occupied night where Finance data is attributed to a room.
- Operational quality rates for maintenance resolution, room-ready completion, human handoff and explicit Concierge helpfulness.
- Finance-ledger efficiency metrics with an explicit non-ADR / non-RevPAR label until canonical stay-level revenue attribution is complete.

## Guest Documents & TM30

New protected mobile endpoints allow an authorized owner to:

- list currently retained passport and Thai-ID uploads;
- see room, stay dates, guest first name, retention date and TM30 state;
- securely download the original private document;
- mark a passport **TM30 registered**;
- undo TM30 registration when a record was marked incorrectly.

All file downloads and TM30 status changes are audited. Expired documents are not returned by the list endpoint and the file endpoint rejects deleted/expired records. The permission remains separate from ordinary staff registration-status access.

## Finance report export

Owners with `finance.view` can download a CSV report for any date range up to 366 days. The CSV begins with a period summary and then includes the detailed income/expense ledger rows. Expected/provisional OTA payouts remain explicitly distinct from settled income.

## Validation

- Backend automated suite: **347 passed / 0 failed**.
- Changed backend JavaScript and test modules pass `node --check`.
