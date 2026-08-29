# Release Notes v5.11.35

## Outcome

v5.11.35 makes the Concierge respect a clear new guest topic, grounds island recommendations in the existing approved guide, converts natural missing-supply statements into immediate service requests, removes inconsistent routine House-call shortcuts, activates the reviewed Meta staff quick actions and retains the House Maps link that now works on real mobile testing.

The release is built directly from deployed v5.11.34. Explore stays hidden, Room 11's mobile crop stays `72% 100%`, and the stable mobile Concierge remains unchanged.

## Guest-facing changes

- A beach, restaurant, bar, café, shopping, attraction, practical or island-transport question temporarily detours from a pending cleaning/booking/luggage flow and answers the new topic directly. The guest can resume the pending request afterward.
- Mae Haad Beach is described as about 200 metres down the road / a very short walk. Sairee Beach is described as roughly a 20-minute walk.
- Approved activities, bars, beaches, cafés, restaurants and shopping records are available internally to the Concierge while `EXPLORE_ENABLED=false`.
- General drink/nightlife recommendations lead with Bamboo Beach Bar; a clearly unsuitable requirement may select another approved venue.
- **There are no towels**, **No toilet paper** and **There is no soap** are direct service requests. A successful send is confirmed without asking the guest to request again or promising a delivery time.
- Supply-policy questions remain informational and send no alert.
- Routine **Contact Us** and **Book with Us** actions open the Concierge. Page-level House/booking **Call Us** shortcuts are removed.
- A first generic human request asks what the guest needs. A persistent request may expose routine human contact during service hours only. Emergency and lost-key routes remain immediate and independent.

## Meta staff quick actions

All five reviewed action templates are enabled in the release configuration:

- `house_service_alert_actions_v2`
- `house_luggage_alert_actions_v1`
- `house_booking_alert_actions_v1`
- `house_urgent_alert_actions_v1`
- `house_lost_key_alert_actions_v1`

They use generic English (`en`) and **Received** followed by **Resolve**. The quick-reply payload contains only the command and opaque alert ID. Signed authorization, known-recipient checks, actor exclusion, idempotency, status fanout, escalation stop, typed commands, routes and recipients are unchanged. The buttonless `house_service_alert_actions_v1` is still rejected. Rollback requires only `WHATSAPP_STAFF_ACTIONS_ENABLED=false` and redeployment.

No live deployment was performed while building this package.

## House Maps

The initially reported mobile failure appears to have been temporary. After the existing link worked again on real mobile testing, the proposed platform split was withdrawn. Every House-specific action continues to use:

`https://maps.app.goo.gl/5MV4j4B1YzyR1SR69`

No third-party map link changed.

## Preserved behavior

- `EXPLORE_ENABLED=false`;
- mobile Room 11 `72% 100%` crop and unchanged tablet/desktop framing;
- stable mobile Concierge launcher/panel;
- Tuesday–Sunday 10:30–19:30 Bangkok housekeeping and routine-contact hours, Monday closed;
- protected 24/7 lost-key authorization, fee consent, notification, code isolation and rotation lock;
- emergency Rescue/1669/property actions;
- structured diving, fishing, snorkeling and transport bookings;
- service, luggage, booking, maintenance and urgent routing;
- passport retention, stay verification, Airbnb sync, owner console and Admin diagnostics;
- secrets, recipient mappings, webhooks, key-box codes and private data boundaries.

## Validation

- Complete automated suite: **190 passed, 0 failed**.
- Focused changed-behavior run: **19 passed, 0 failed**.
- Automated runs used an outbound-network blocker and local OpenAI/Meta mocks.
- JavaScript syntax, JSON parsing, release constants, source mirrors and secret/privacy scans passed.
- Both ZIPs passed integrity checks; a clean extraction of the ready-to-push archive passed all **190 tests** offline.
- Wrangler is not present in the supplied local dependency tree, so `npx wrangler deploy --dry-run` remains a required pre-deployment check.

## Production smoke test

After deployment, test only the affected behavior first:

1. Verified Room guest: **There are no towels in my room** → immediate service action alert, correct recipients, both quick replies.
2. Pending cleaning then **How far is the beach from the house?** → Mae Haad / about 200 metres; no cleaning contamination; cleaning remains resumable.
3. **How far is Sairee Beach?** → roughly 20-minute walk.
4. **Where should we go for a drink?** → Bamboo Beach Bar first.
5. Thai-food, work-café and snorkeling recommendations → approved local records, no alert.
6. First and persistent human requests → AI-first, then in-hours last-resort contact; no routine call after hours.
7. Public **Contact Us** and **Book with Us** → Concierge; no direct House/Fah call.
8. One safe alert of each Meta kind → exact action template, **Received**, **Resolve**, actor exclusion and no duplicate transition.
9. **Open Google Maps** on mobile and desktop → retained universal House destination.
10. Emergency Help → unchanged.

If an action template fails in production, set `WHATSAPP_STAFF_ACTIONS_ENABLED=false`, redeploy and inspect only the sanitized owner diagnostic. Do not change recipient mappings or guess a new schema.
