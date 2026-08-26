# Secure After-Hours Spare-Key Access

## Confirmed rule

- Time zone: Asia/Bangkok
- After-hours window: 19:30 until 10:30
- One spare-key box per active room
- Key-box location: directly next to the relevant room door
- Lost-key replacement fee: 500 THB

This window defines after-hours handling only. It does not define reception, office or property operating hours.

## v5.11.9 verified-stay flow

1. Every active Room 1–6 and 8–11 has one permanent page listed in `AIRBNB_AUTOMATION_SETUP.md`. Room 7 is inactive.
2. Airbnb reservations arrive through the synchronizer with the minimum record: listing ID, room, confirmation code, check-in, checkout and status. An authorized owner may create a direct/walk-in reservation from the console with room and dates.
3. The Worker HMAC-hashes every confirmation code immediately. A generated private House stay code is displayed only in the authorized creation response; no readable code is written to the database or logs.
4. The guest enters either the Airbnb HM code shown in the trip details or the private House stay code provided for the direct reservation on the permanent page for the booked room.
5. Verification succeeds only when the code, room and unexpired reservation agree. Airbnb records additionally remain bound to the verified listing. A cross-room attempt fails.
6. The browser receives a `Secure`, `HttpOnly`, `SameSite=Strict` session tied to that reservation and room. It expires no later than 11:00 AM on checkout day.
7. The verified room dashboard presents lost-key assistance as an ordinary on-demand option; the protected form remains closed until the guest deliberately opens it. Spare-key access is available only from check-in at 2:00 PM until checkout at 11:00 AM and only within the 19:30–10:30 after-hours window.
8. For each lost-key release, the Worker revalidates the existing secure room-bound session against the same active reservation and current checkout. The guest is not asked to enter the Airbnb or private House stay code again.
9. The guest deliberately opens lost-key help, continues past an explanatory step and then explicitly accepts the 500 THB lost-key replacement fee. This acceptance is separate from the automatic staff notification.
10. The Worker automatically creates and sends a verified urgent event to the configured owners/Su group, then waits for the WhatsApp API to confirm at least one message submission. The guest is not asked to approve this staff notification.
11. Only then does the Worker record the access and return the room's code with the instruction that the box is next to the door.
12. The room is immediately marked as requiring code rotation. No second automatic release is permitted until staff change the physical code, update the Cloudflare secret and confirm rotation in `/concierge-admin`.

## Protected code storage

Key-box codes must never be stored in public HTML, JavaScript, JSON data, URLs, Durable Object storage, model prompts, logs, repository history, screenshots or the release ZIP.

Store the real codes only in the encrypted Cloudflare Worker secret `SPARE_KEY_CODES` as a JSON object keyed by active room. The example structure in the setup guide contains placeholders only. Never send real values through chat.

The deterministic stay API—not the language model—performs verification and code release. The AI Concierge may guide a guest to the protected section but cannot access or produce a code.

## Team notification

The protected `urgent` recipient group should contain Su and each owner who must receive the event. Names and telephone numbers remain only in the encrypted `WHATSAPP_ALERT_RECIPIENTS` secret.

Each successfully submitted event includes:

- verified room;
- Bangkok date and time;
- spare-key release event type;
- confirmation that the guest acknowledged the 500 THB fee;
- instruction to rotate the room's key-box code;
- random alert reference.

The alert never includes the code, confirmation code, session cookie, passport information or a readable guest identifier.

Automatic key release fails closed when WhatsApp is incomplete, no urgent recipient exists or all delivery attempts fail. The guest receives an urgent concierge fallback; no code is shown.

## Activation checklist

1. Deploy v5.11.9.
2. Add `STAY_TOKEN_PEPPER` and `RESERVATION_SYNC_TOKEN` as separate long random Worker secrets.
3. Add real current codes only to the encrypted `SPARE_KEY_CODES` Worker secret.
4. Configure the official WhatsApp Business Platform and protected `urgent` recipients using `WHATSAPP_ALERT_OPERATIONS.md`.
5. Install the included Airbnb synchronizer using `AIRBNB_AUTOMATION_SETUP.md` and confirm its diagnostics are blank.
6. Test with a temporary code and non-sensitive future/current test reservation.
7. Confirm an unverified or wrong-room session fails, daytime release fails and missing fee acceptance fails.
8. Confirm Su/owners receive the sanitized alert before the temporary code appears.
9. Change the physical test code, update the secret, redeploy and confirm rotation in the owner console.

## Separate property emergency route

Urgent property problems are not limited to the spare-key window. Major water leaks, flooding, burst pipes, dangerous electrical problems and serious property damage require a separate on-call human route.

No dedicated 24/7 property-emergency contact has been confirmed. The role therefore remains disabled and temporarily falls back to House support without publicly claiming confirmed 24/7 availability. Configure the dedicated person server-side only after the owner supplies and confirms that contact.
