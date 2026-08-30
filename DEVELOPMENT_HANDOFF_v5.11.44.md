# THE HOUSE – KOH TAO
## DEVELOPMENT HANDOFF — v5.11.44

### Production baseline before this candidate

- Deployed production: **v5.11.43**.
- v5.11.43 Wrangler dry-run passed locally before deployment.
- v5.11.43 was pushed and deployed.
- The standalone Airbnb Apps Script was then updated with the v5.11.43 `airbnb-sync/Code.gs`.
- `installHouseReservationTrigger` and `runFullHouseReservationAudit` were run.
- A Room 3 Airbnb HM code that previously failed was confirmed working after the audit.

### Reason for v5.11.44

After v5.11.43, the owner decided that guests must not retype passport details into the platform. A mistyped passport number/name/date/nationality/sex/phone value creates avoidable operational risk when The House later performs the required registration. The manual-details alternative is therefore removed completely.

A second production finding showed the registration screen on a tested reservation already in foreign/passport-pending state, so the Thai choice was not visible on that stateful screen. The authoritative fresh-registration flow remains: nationality choice first, with an all-Thai exemption before foreign passport collection. v5.11.44 preserves that flow and makes the Thai exemption explicitly bilingual on the private passport page as well.

### Implemented changes

1. Restored the passport upload implementation to image-only behavior.
2. Removed guest UI for manual passport fields.
3. Removed `/api/passport-details` from Worker routing.
4. Removed manual-details validation and JSON creation logic from the guest passport API.
5. Preserved the existing private image upload, single-use token, reservation binding, expiry, authorization, file-signature validation and 14-day maximum retention.
6. Preserved the existing in-person original-passport route.
7. Preserved the nationality gate on the verified Room page:
   - Thai nationals only / English;
   - `เฉพาะผู้มีสัญชาติไทยเท่านั้น` / Thai;
   - `All overnight guests are Thai` / English button;
   - `ผู้เข้าพักค้างคืนทุกคนมีสัญชาติไทย` / Thai button label.
8. Added explicit English + Thai exemption text to the private passport page.
9. Preserved protected Admin read/delete support for any legacy v5.11.43 JSON record only so such data can be cleaned up. No guest route can create a new JSON passport-details record.
10. Left all v5.11.43 Airbnb sync and Meta template behavior untouched.

### Do not regress

- Airbnb sync every five minutes for recent mail.
- Trustworthy email-only fast path uses `complete:false`.
- iCal safety reconciliation at least hourly.
- 24-hour full audit is the only absence-based cancellation path.
- Active rooms are 1–6 and 8–11; no Room 7.
- Meta action mappings remain exactly the five approved v5.11.43 templates.
- Visible Meta buttons: **Received**, **Resolved**; internal second command remains `RESOLVE`.
- v5.11.42 broad human routing and stay extension.
- v5.11.41 House emergency support call and mobile chat stability.
- v5.11.39 cleaning/state safeguards.
- 24/7 protected lost-key flow and all notification gates.
- `EXPLORE_ENABLED=false`.
- No passport values in Concierge, learning data, WhatsApp or ordinary logs.

### Regression coverage

The complete suite currently reports **216 passed / 0 failed**.

New v5.11.44 checks prove:

- `/api/passport-details` is absent from Worker guest routing;
- no manual details validator/storage path exists;
- the public passport page contains no manual passport fields;
- the passport page remains image-upload capable;
- the all-Thai choice remains before passport collection;
- English and Thai Thai-national exemption wording is present;
- protected legacy Admin cleanup remains available without a guest submission route.

### Release validation before push/deploy

Run from a clean extracted candidate:

```bash
npm ci
npm test
npx wrangler deploy --dry-run
```

Expected test result: **216 passed / 0 failed**.

Also validate all JavaScript syntax, parse all JSON files, confirm version consistency at v5.11.44, verify `EXPLORE_ENABLED=false`, scan for credentials/private phone numbers/confirmation codes/passport values/key-box codes, verify ZIP integrity, and ensure no `node_modules`, `__MACOSX` or AppleDouble files are packaged.

### Post-deployment smoke test

Use a controlled test reservation:

1. Verify a fresh stay code.
2. Confirm the nationality choice appears before passport collection.
3. Confirm the Thai-only option is visible in English and Thai and completes access without a passport when all overnight guests are Thai.
4. For a foreign/mixed test, confirm the private passport form contains image upload only and no manual details fields.
5. Confirm in-person passport handling remains available.
6. Confirm the existing v5.11.43 Airbnb five-minute trigger remains installed; do not reinstall unless Apps Script is changed.
