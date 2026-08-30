# Release Notes v5.11.41

## Outcome

v5.11.41 is a separate narrow mobile/emergency UX correction on the already-pushed v5.11.40 human-routing release.

## Changes

### House emergency support call

Fire/property-emergency responses now surface **Call The House Emergency Support** while keeping the configured responder identity private. Fire keeps **Call Koh Tao Rescue** first and preserves the separate deliberate **Send urgent alert** action.

The exact follow-up **Do you have a emergency contact I can call** is handled deterministically and returns emergency-call actions without automatically creating an alert.

### More room for the mobile conversation

After a conversation begins on phones, the seven quick actions compact into a three-column layout with smaller controls. This preserves all actions while giving the transcript more vertical space.

### Stable chat scrolling

Mobile drag-to-dismiss is disabled. Scrolling the transcript cannot move or accidentally close the entire Concierge sheet; closing remains explicit through the close control.

## Privacy and routing

The internal configured emergency responder may be Westy or another authorized responder according to environment routing, but guest-facing copy exposes only **The House Emergency Support**, never a private name or number. Routine Contact Us / Call Us service-hour rules remain unchanged and separate from property emergency support.

## Preserved behavior

All v5.11.40 human-routing behavior and v5.11.39 cleaning/state corrections remain intact, together with Wi-Fi, snorkeling, French Kiss Divers, fire isolation, lost-key security, booking/luggage, Meta/webhook, passport/Airbnb, Admin and `EXPLORE_ENABLED=false` safeguards. Pending replacement Meta templates are not activated.

## Validation

Complete local automated suite: **205 passed, 0 failed**. JavaScript/Apps Script syntax validation passed, all 12 JSON files parsed, ZIP integrity passed, a clean extraction passed 205/205 again, and source/archive hashes matched 259/259 files. The final Wrangler dry-run should be run on the owner's Mac before deployment.
