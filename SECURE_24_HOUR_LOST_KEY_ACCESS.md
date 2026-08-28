# Secure 24-Hour Lost-Key Access

## Authoritative rule

- Time zone for operational timestamps: `Asia/Bangkok`.
- Secure self-service spare-key recovery is available 24 hours a day, every day.
- Office, housekeeping, reception and other service schedules do not gate this operation.
- During normal service hours, **Call Us** or equivalent personal assistance may be offered in addition, but it must not be required first.
- One spare-key box is located beside each active room door.
- A lost key carries a 500 THB replacement fee.

This policy supersedes every earlier office-hours/after-hours split for lost-key release. It does not change housekeeping or other service operating hours.

## Protected guest flow

1. The guest reports that the key is lost from a room-aware Concierge or protected room page.
2. The Worker requires a current verified active stay bound to the current room and protected session. Passport-registration completion is not an authorization gate.
3. A new lost-key request starts with `feeAccepted=false`. The guest is told about the 500 THB fee and is offered **Accept 500 THB fee** and **Cancel**.
4. The guest's explicit acceptance is submitted with a short-lived signed request authorization bound to the current session, reservation and room.
5. The Worker revalidates the stay, room, session, request, explicit fee acceptance, recipient configuration and rotation state.
6. The Worker sends the protected lost-key notification to the established `lost_key_team`: Su, Owner 1 and Owner 2. The notification states fee acceptance only because the current request contains explicit evidence.
7. At least one protected Meta submission must be accepted before release can continue. If none succeeds, no code or view action is returned.
8. The protected guest page may then show **View spare key**. The code is returned only to that page and is never inserted into Concierge conversation history.
9. Display records the release and immediately marks the room as requiring physical code rotation. The request authorization becomes unusable.
10. Another release remains blocked until an authorized owner clears only the rotation lock through one of the two deliberate reset modes in `/concierge-admin`: controlled administrative test when no guest or unauthorized person saw the code, or physical rotation after the box code and encrypted secret have actually been changed.

## Request-bound authorization

Fee acceptance and release authority belong only to one lost-key request. The signed request authorization expires after 15 minutes and binds all of the following:

- verified active reservation;
- room;
- protected session;
- lost-key request instance.

Every new request and every fresh protected-page render starts with no accepted fee. Acceptance is not restored from a prior page load or stored as general session permission. A database uniqueness boundary records the used request hash, so an accepted request cannot be replayed even after the physical-code rotation reset.

Never inherit acceptance or release authority from another request, date, browser session, stay, room, guest or earlier spare-key release.

## Protected code storage

Real key-box codes exist only in the encrypted Cloudflare Worker secret `SPARE_KEY_CODES`, as JSON keyed by active room. Never put real values in documentation, source, public HTML or JavaScript, JSON data, URLs, Durable Object diagnostics, model prompts, logs, screenshots, Git history or release ZIPs.

The deterministic stay API performs verification and release. The language model and Concierge response history cannot access or produce a code.

## Notification boundary

The notification is generated only after the current request's explicit fee acceptance is validated. It includes the verified room, Bangkok date/time, lost-key event, accepted-fee state, rotation instruction and safe alert reference. It never includes the key-box code, stay/confirmation code, request authorization, session cookie, passport data or readable guest identity.

The release fails closed when protected recipients are missing, Meta configuration is incomplete, the request is expired or already used, or every delivery fails. Guest-facing wording remains hospitality-focused and does not explain webhooks, internal routing, verification internals, payload construction or rotation implementation.

## Rotation lock

After the code is displayed, `/concierge-admin` must clearly show that the room's key-box state requires an authorized decision. The protected owner/admin boundary offers exactly two reset modes.

### Controlled administrative test

Use **Controlled admin test — keep existing code** only when an owner deliberately tested the complete flow and no guest or unauthorized person saw the code. The owner must type the exact confirmation phrase. This clears only the rotation lock, retains the current physical code and writes a distinct code-free activity record stating that the existing code was retained. It must not claim physical rotation.

### Physical key-box rotation

Use **Physical key-box code rotated** only after all of these steps are complete:

1. Change the physical code on the relevant room's key box.
2. Replace that room's value in the encrypted `SPARE_KEY_CODES` secret.
3. Deploy the updated secret/configuration.
4. Type the exact physical-rotation confirmation in the protected owner console to clear the lock and write the distinct physical-rotation activity record.

Both modes require the existing protected owner/admin authentication and deliberate typed confirmation. The lock is per room. Either mode clears only that lock; it preserves historical release and used-request records, so no request becomes reusable. A guest must start a new request, begin with `feeAccepted=false`, explicitly accept the fee and pass a new protected notification before another release. Audit/activity records include the room, Bangkok timestamp and reset mode but never the key-box code.

## Required verification matrix

- Daytime, 16:00 Bangkok: initial lost-key report asks for explicit fee acceptance, creates no accepted-fee payload and exposes no code; acceptance triggers notification, protected view and rotation lock.
- Nighttime, 23:00 Bangkok: identical protected self-service sequence.
- No acceptance or cancel: no protected notification claiming acceptance and no code.
- New request/session: `feeAccepted=false` and a new explicit acceptance is required.
- Different room, stay or guest: no inherited authority.
- Expired or replayed request: no code.
- Notification failure: no code.
- Rotation outstanding: second release blocked.
- Controlled-test reset: deliberate confirmation clears the lock, truthfully records that the existing code was retained and leaves the used request unusable.
- Physical-rotation reset: deliberate confirmation truthfully records completed physical rotation and leaves the used request unusable.
- Cancelled or invalid confirmation: lock remains active.
- Leak scan: no real code in Concierge history, WhatsApp/Meta payloads, alerts, logs, diagnostics, Git, release files or screenshots.

## Activation checklist

1. Deploy the verified v5.11.26 release without changing recipients or Meta template mappings.
2. Keep `STAY_TOKEN_PEPPER`, `RESERVATION_SYNC_TOKEN` and real current `SPARE_KEY_CODES` values as separate encrypted secrets.
3. Confirm `lost_key_team` resolves to Su and both owners through the existing protected recipient configuration.
4. Test daytime and nighttime flows using a non-sensitive active test stay and temporary physical code.
5. Verify notification acceptance precedes display, then verify the rotation-required state and second-release block.
6. For a controlled owner-only test, use the controlled-test reset and verify its truthful activity record without changing the temporary physical code.
7. Separately verify the normal physical-rotation path only when the box code and encrypted secret have actually been changed.
8. After either reset, confirm the used request still cannot be replayed and a new request asks for fee acceptance again.

## Separate property-emergency route

Lost-key recovery is not the property-emergency path. Fire, dangerous electrical conditions, flooding, burst pipes and serious property damage retain their own deliberate urgent-alert flow. The dedicated property-emergency role must not be publicly described as confirmed 24/7 until its contact is supplied and verified.
