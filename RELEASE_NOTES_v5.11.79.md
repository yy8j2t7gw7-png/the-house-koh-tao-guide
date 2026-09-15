# RELEASE NOTES — Backend v5.11.79
## AI Review Safety & Wi-Fi Information Routing

### Production incident fixed
A linked Room 4 guest asked `What's the WiFi password .`. The AI reply was correct in substance, but the numeric password was sanitized and the review metadata incorrectly proposed a Maintenance task, which then alerted Su and the owners when the reply was approved.

### Corrections
- Authorized Wi-Fi-password questions now remain pure approved-information requests: `needsHuman=false`, `handoff=none`, no route actions, no operational proposal.
- Guest-shareable numeric Wi-Fi credentials are protected through translation sanitization and restored only in the authorized guest reply; general log/contact privacy sanitization remains intact.
- Trusted messaging no longer treats the word `wifi` by itself as maintenance intent.
- Operational proposals now require structured operational intent or explicit actionable fault/request language. Human review alone is never enough to create a task.
- Genuine faults such as `The WiFi is not working` still produce a Maintenance proposal.
- AI review now supports `approve_no_send`, which records a positive review but sends nothing and creates no task/alert.
- `Approve & Send` requires a separate explicit operation decision (`execute` or `skip`) whenever a task is proposed.
- Backend contract version is now `5.11.79`.

### Safety boundaries
- No automatic operational action is authorized by review state alone.
- `Approve — Don't Send` is zero-side-effect by contract.
- Full Beds24 Channel Manager remains off.
- Broad Listings & Rates writes remain off by default.
- Provider credentials remain server-side.
- Existing lost-key, passport, TM30, Finance, lifecycle, housekeeping and security boundaries remain unchanged.
