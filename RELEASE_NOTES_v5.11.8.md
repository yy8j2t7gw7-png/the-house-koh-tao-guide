# Release Notes — v5.11.8

## Blocking regression fixed

The **Secure spare-key access** action rendered by the AI Concierge now opens the protected lost-key section on the verified room page.

The previous renderer converted the structured `spare-key` action into an ordinary anchor and discarded its action type. On the same room page, changing only the URL hash did not rerun the initial page-status handler, while the open Concierge panel continued to cover the protected section. The click therefore appeared to do nothing.

v5.11.8 preserves the action type, marks both generated and quick-action CTAs explicitly, closes the Concierge, and performs one of two deterministic transitions:

- same room page: set the protected hash and dispatch the dedicated opening event;
- another page: navigate to the verified room URL and protected hash.

The room runtime now also responds to the dedicated event and later hash changes.

## Preserved safety boundaries

- The already verified active room-bound session is reused; no repeat Airbnb confirmation is requested.
- The guest must deliberately continue and explicitly accept the 500 THB fee.
- The lost-key notification is created only after fee acceptance.
- At least one protected WhatsApp submission must be accepted before code release.
- A failed notification, expired or unverified stay, daytime request, missing fee acceptance, prior release or pending rotation prevents release.
- The key-box code, stay code, session token, passport data and `SPARE_KEY_CODES` never enter alerts or logs.
- Successful release sets the room rotation lock.
- Lost-key alerts remain outside generic urgent-property escalation.

## Validation

The release adds a rendered-path regression test covering:

`AI Concierge → Lost key → Secure spare-key access → protected section → explicit fee confirmation`

It also retains the existing API safety tests for notification failure, fee rejection, verified sessions, successful release and rotation blocking.
