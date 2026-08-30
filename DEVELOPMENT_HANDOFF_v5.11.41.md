# THE HOUSE – KOH TAO
## Development Handoff v5.11.41

## Baseline

v5.11.41 is built on the already-pushed v5.11.40 human-routing release. v5.11.40 must remain historical and must not be overwritten.

The v5.11.40 production correction remains:

`I need to talk to a human you can not help me`

→ deterministic persistent-human routing during normal service hours, guest-facing **The House team** wording, Contact Us / Call Us, no private staff name, and no routine contact outside Tuesday–Sunday 10:30–19:30 Bangkok hours.

## Three real-device findings resolved in v5.11.41

### 1. House emergency call option

Real fire testing exposed Rescue + urgent alert but did not make the configured House emergency call route available enough, and the follow-up:

`Do you have a emergency contact I can call`

re-entered urgent confirmation rather than offering the call route.

v5.11.41:

- exposes **Call The House Emergency Support** in fire/property emergency action sets;
- keeps **Call Koh Tao Rescue** first for fire;
- keeps **Send urgent alert** deliberate and separate;
- handles the direct emergency-contact question deterministically;
- resolves the actual emergency responder internally through the existing protected route;
- never exposes Westy, another responder name, or a private telephone number in guest-facing copy.

Routine service-hour contact gating does not constrain the property-emergency call route.

### 2. Mobile conversation area

Real iPhone testing showed the fixed quick-action area consuming too much vertical space compared with the transcript.

Once a conversation starts on mobile:

- the seven quick actions compact into a three-column grid;
- controls become smaller but remain fully available;
- the transcript receives materially more vertical space;
- service-hours copy, input and safe-area spacing remain usable.

### 3. Mobile chat scroll / sheet movement

Real-device scrolling could move the entire Concierge sheet and sometimes close it.

The safest correction is to remove drag-to-dismiss entirely. The conversation retains its independent scroll surface and the explicit close control remains available. Ordinary message scrolling must never translate or dismiss the sheet.

## Regression coverage

Complete local suite: **205 passed, 0 failed**.

Additional release validation completed in this environment:

- **36** JavaScript/ES-module files plus `airbnb-sync/Code.gs` passed syntax validation;
- all **12 JSON files** parsed successfully;
- final ready-to-push ZIP integrity passed;
- clean archive extraction passed the full **205/205** test suite;
- source/archive hashes matched **259/259 files**;
- no `node_modules`, `__MACOSX` or AppleDouble `._*` files are included.

`npx wrangler deploy --dry-run` still requires the owner's normal Mac validation environment with installed dependencies/network access before deployment.

Coverage includes:

- exact v5.11.40 persistent-human sentence during open and closed hours;
- fire response includes Rescue, House Emergency Support and deliberate urgent alert;
- `Do you have a emergency contact I can call` returns emergency-call actions and creates zero alerts;
- guest-facing emergency copy contains no `Westy` or `Su`;
- mobile in-conversation quick actions use the compact three-column layout;
- drag-to-dismiss touch listeners are absent from the sheet and drag handle.

## Preserve

Do not regress:

- v5.11.39 cleaning/state behavior;
- numeric Wi-Fi password answer;
- snorkeling routing;
- French Kiss Divers preference;
- routine human contact hours;
- fire/current-turn isolation;
- lost-key fee/notification/single-use/rotation security;
- booking/luggage/passport/Airbnb/Admin behavior;
- Meta webhook, recipients, secrets and current active template mappings;
- `EXPLORE_ENABLED=false`.

The five newer human-friendly Meta replacement templates remain separate and must not be activated by this release.

## Deployment smoke test

1. Fire: confirm **Call Koh Tao Rescue**, **Call The House Emergency Support**, **Send urgent alert**, **Cancel**.
2. Ask `Do you have a emergency contact I can call`: confirm House Emergency Support call action appears and no alert is created.
3. Scroll a long chat repeatedly on iPhone: the transcript scrolls, but the sheet does not move or close.
4. Start a conversation: quick actions compact and the transcript has more usable vertical space.
5. Spot-check v5.11.40 human routing and v5.11.39 cleaning workflow.
