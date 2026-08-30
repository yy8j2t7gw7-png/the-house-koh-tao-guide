# THE HOUSE – KOH TAO
## v5.11.44 — PASSPORT IMAGE-ONLY REGISTRATION RESTORE

### Baseline

Built directly on deployed v5.11.43.

### Scope

This is a narrow corrective release. It does not modify the Airbnb synchronization architecture, Meta action-template activation, Concierge routing, stay-extension workflow, cleaning workflow, emergency routing, lost-key security, recipient routes or Explore feature gate.

### Passport registration correction

Guest-entered manual passport details are removed completely from the public flow.

The private passport form now accepts only a clear passport image. The Worker no longer exposes `/api/passport-details`, no six-field manual-detail validation/storage path remains, and the guest-facing form contains no passport-number, full-name, birthday, nationality, gender or phone fields.

The existing in-person original-passport alternative remains available from the verified Room page. TM30 submission remains a manual House operation and is not automated against the Immigration portal.

### Thai-national exemption

The all-Thai path remains before foreign passport collection:

- if every overnight guest is Thai, no passport image is required;
- the Room access page continues to show the Thai-only choice in English and Thai;
- the private passport page also states the Thai exemption in English and Thai and points Thai-only stays back to the Room-page nationality choice;
- mixed groups continue to declare the number of non-Thai overnight guests and require one passport image per non-Thai adult or child, or use the existing in-person route.

### Legacy cleanup compatibility

No new manual-details JSON record can be created in v5.11.44. Protected Admin retains only enough compatibility to identify, download and delete any legacy v5.11.43 `application/json` passport-details object that may already exist. This compatibility is read/delete only and is not exposed to guests.

### Preserved v5.11.43 behavior

- Airbnb recent-mail sync every five minutes.
- Trustworthy email fast-path reservation ingestion with `complete:false`.
- Full ten-room iCal reconciliation at least hourly.
- Only the complete 24-hour audit may perform absence-based cancellations.
- Active Meta action templates remain:
  - `house_service_alert_actions_v3`
  - `house_booking_alert_actions_v2`
  - `house_luggage_alert_actions_v2`
  - `house_urgent_alert_actions_v2`
  - `house_lost_key_alert_actions_v2`
- Visible quick replies remain **Received** / **Resolved** while internal commands remain `RECEIVED` / `RESOLVE`.
- `EXPLORE_ENABLED=false` remains unchanged.

### Validation

- `npm test`: **216 passed / 0 failed**.
- Added regression coverage proving the manual-details form/API are absent and the bilingual Thai-only exemption remains before foreign passport collection.
- JavaScript syntax, JSON validity, archive integrity and clean-extraction regression are part of final release validation.

### Production note

The v5.11.43 standalone Airbnb Apps Script was already installed, `installHouseReservationTrigger` and the full audit were run, and the previously failing Room 3 HM confirmation code subsequently verified successfully. v5.11.44 does not alter that Apps Script.
