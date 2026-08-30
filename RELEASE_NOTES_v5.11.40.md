# Release Notes v5.11.40

## Outcome

v5.11.40 is a narrow production correction built directly from deployed v5.11.39. It fixes one real-device human-routing phrase that still fell through deterministic recognition.

## Production failure fixed

Verified Room 6 guest, Sunday during open service hours, asked:

`I need to talk to a human you can not help me`

Actual v5.11.39 behavior: the turn fell through to generic support wording and did not expose the routine **Contact Us / Call Us** actions.

Correct v5.11.40 behavior: the explicit human request plus clear cannot-help reason is treated as persistent human-contact intent before model/knowledge routing. During open service hours the Concierge says the guest can contact **The House team** and exposes the existing **Contact Us / Call Us** actions.

## Preserved boundaries

- first ordinary generic human request remains AI-first;
- Tuesday–Sunday 10:30–19:30 Bangkok routine-contact hours remain unchanged;
- Monday and after-hours routine contact remains suppressed;
- no private staff name is exposed;
- no operational alert is created by the contact question;
- property emergency / Emergency Support routing remains independent;
- all v5.11.39 cleaning/state corrections remain unchanged;
- pending replacement Meta templates are not activated.

## Validation

- Complete automated suite: **204 passed, 0 failed**.
- Exact production phrase tested at Sunday 12:57 Bangkok: deterministic human-contact result with both routine contact actions.
- Same phrase tested Sunday 20:00 Bangkok: no routine call/WhatsApp action, Emergency help remains available.
