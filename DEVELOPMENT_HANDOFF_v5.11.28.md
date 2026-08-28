# Development Handoff v5.11.28

## Authoritative checkpoint

v5.11.28 is complete and was built directly from the deployed v5.11.27 archive. Preserve both release archives. Do not reconstruct completed v5.11.19–v5.11.28 work from the older pushed v5.11.18 Git baseline.

This is a focused presentation and safe-wording release with one explicitly authorized production correction: deterministic lost-key/lockout phrase routing. It does not change booking collection, the diving catalog, mixed-diver allocation, Meta templates or routing, cleaning, maintenance, emergency behavior, passport security, Airbnb synchronization, admin lifecycles, lost-key fee authorization, notification-before-display, key-code isolation or rotation locking.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`

## Public landing implementation

`public/index.html` now leads from the unchanged compact welcome hero into a hospitality-oriented **Complete your guest registration** section. The exact support line states that passport information is required for non-Thai overnight guests and Thai guests are exempt. The three required facts remain complete and are presented as divided columns; a four-step sequence explains how to open the personal Room page, verify the stay, complete required registration and access private information.

The former low-level **Guest verification** card is now **Access your room guide**. Map and Concierge actions use **Open Google Maps** and **Open Concierge**, matching their actual routes. The ambiguous access sentence now says:

> Room location, arrival pictures, Wi-Fi and your full guest guide become available after your stay has been verified and the required guest registration is complete.

No suitable public-safe property photograph exists in the v5.11.27 assets. Existing room/arrival photographs are protected or room-specific; other candidates are unrelated or contain operational/contact information. `public/design-system.css` therefore retains the House-green hero and adds only restrained tonal depth without increasing its `292px` / `246px` / `232px` responsive heights.

## Room hierarchy and wording

`public/room.html` and `public/modules/house/room.html` are exact mirrors. `public/room-app.js` sets the location-photo heading from `data.floor`, so Room 11 renders:

- **ROOM LOCATION**
- **Downstairs**
- the existing room-specific note

The primary **Welcome to Room 11** page identity remains unchanged. Action cards and their two-column desktop layout remain unchanged.

The room-guidance and room-facts outer sections are transparent/flat while their meaningful warnings/cards remain intact. Toilet wording preserves the prohibited-item rule and `1,000 THB` fee. Water/electricity wording preserves the approved limited-water and undersea-grid meaning. Bottom and floating primary stay-help actions now say **Open Concierge**.

Every public footer now uses **The House – Koh Tao · Simple, comfortable accommodation in Mae Haad.** No “budget-friendly” occurrence remains.

## Lost-key production correction

### Observed cause

Both `src/concierge-api.js` and `public/ai-concierge.js` duplicated a narrow matcher that recognized **I lost my key** but not every clear short form. A missed phrase could fall through to a generic service/model handoff, attempt team contact before fee acceptance and return the observed team-contact failure.

### Corrected boundary

- `src/concierge-api.js` expands `LOST_KEY_REQUEST` to all authorized lost-key, forgotten-key, spare-key and lockout variants. `lostKeyPolicyResult()` already executes before public knowledge, generic service and model routing, so no broader state change was required.
- `public/ai-concierge.js` defines the same `lostKeyRequest` matcher and uses it in `requiresProtectedServer()`, preventing those phrases from falling back to the device-only engine.
- A repeat such as **lost key** while the fee prompt is pending returns the same protected policy action and creates no alert or duplicate delivery. No new persistent browser workflow state was introduced, so unrelated intents are not trapped.

Verified active stays receive the existing `500 THB` prompt and protected Room-page action. Unverified stays must verify first. The actual fee acceptance remains fresh, request/stay/room/session-bound and enforced on the protected page. No notification is created before acceptance, no code is sent in Concierge/WhatsApp/logs/diagnostics, display still requires at least one accepted protected team notification and a release still engages the rotation lock.

## Localization

`public/i18n.js` includes reviewed static translations for the new critical landing, CTA, room-guidance and footer wording in English, Thai, Simplified Chinese, Russian, German, French and Spanish. Its cache namespace is `v5.11.28` so obsolete cached strings cannot mask the release copy.

## Tests

Three regressions expand the complete suite from 166 to 169 tests:

1. all 13 authoritative lost-key/lockout phrases reach the same protected server policy and produce zero pre-acceptance alerts/deliveries;
2. a repeated synonym with the fee prompt already in history remains in the protected flow and produces no alert;
3. a lightweight landing/room contract verifies exact copy and hierarchy, safe landing imagery, Room-floor overlay, concise guidance, precise CTA labels, one lost-key amount and global removal of “budget-friendly”.

The existing protected-browser source contract now verifies the centralized lost-key matcher instead of the obsolete narrow regex shape. Critical seven-language and release/catalog assertions were updated for v5.11.28.

## Files changed from v5.11.27

- `CHANGELOG.md`
- `DEVELOPMENT_HANDOFF_v5.11.28.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.28.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`
- `package-lock.json`
- `package.json`
- `public/ai-concierge-config.js`
- `public/ai-concierge.js`
- `public/checkout.html`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/design-system.css`
- `public/emergency.html`
- `public/house.html`
- `public/i18n.js`
- `public/index.html`
- `public/module-registry.js`
- `public/modules/departure/checkout.html`
- `public/modules/emergency/emergency.html`
- `public/modules/house/house.html`
- `public/modules/house/room.html`
- `public/modules/house/rooms.html`
- `public/modules/practical/practical.html`
- `public/practical.html`
- `public/report-problem.html`
- `public/room-app.js`
- `public/room.html`
- `public/rooms.html`
- `src/concierge-api.js`
- `tests/concierge.test.mjs`

`public/concierge-admin.js` intentionally retains its v5.11.27 local section-state storage key because the admin DOM/schema is unchanged; resetting owner display preferences would provide no release benefit.

## Validation

- source suite: 169 passed, 0 failed;
- independently extracted archive suite: 169 passed, 0 failed;
- JavaScript/ES-module and `airbnb-sync/Code.gs` syntax checks passed;
- all 12 JSON files parsed successfully;
- v5.11.28 version consistency, seven root/module mirrors and Git whitespace checks passed;
- release-delta credential/contact/key-code/protected-image/screenshot scans passed;
- protected modules and inline protected Room/access/passport workflows match v5.11.27 except for the authorized lost-key matchers and release metadata;
- Worker dry run was blocked before execution by this workspace's command-approval policy. Wrangler 4.122.0 was available and compatible with the lockfile range, but no dry-run pass is claimed. Run `npx wrangler deploy --dry-run` before production push and stop on any failure;
- ZIP CRC passed and source/archive manifests match exactly.

## Responsive review

Deterministic HTML/CSS/state review covers `320`, `360`, `375`, `390`, `414`, `430`, `1280`, `1440` and `1600+` widths. The registration facts and four steps stack at `<=760px`; the bounded `1120px` shell, page-level overflow guards, unchanged responsive hero heights, wrapping button labels, `46px` primary targets, narrow warning layout, focus-visible and reduced-motion rules remain in force. The floating Concierge location is unchanged and retains safe mobile bottom spacing.

The required browser-control surface was unavailable in this workspace, so no rendered screenshot review is claimed and no alternate automation stack was used. Perform the concise production visual smoke check after deployment.

## Deployment

1. Extract `The-House-Koh-Tao-v5.11.28-ready-to-push.zip`.
2. Run `npm install`, then `npx wrangler deploy --dry-run`. Stop if it fails.
3. Run `npx wrangler deploy` only after the dry run passes.
4. Do not change templates, languages, BODY parameter counts/order, routes, recipients, secrets, webhooks, passport/Airbnb configuration or `SPARE_KEY_CODES`.
5. Keep `EXPLORE_ENABLED=false` and `WHATSAPP_STAFF_ACTIONS_ENABLED=false`.
6. No data migration is required.

## Concise production smoke check

1. Check landing hero, registration facts/steps, cards and footer on desktop and a guest phone.
2. With a production-safe verified fixture, confirm Room 11 shows **ROOM LOCATION / Downstairs** and the location note without duplicated room identity.
3. Confirm operational warnings and bottom **Open Concierge** action fit without overflow.
4. Type **lost key** during a verified active stay: the `500 THB` prompt and **Continue securely** must appear, with no generic team-contact failure. Stop before accepting; do not release a spare key for smoke testing.
5. Confirm the same phrase without verification asks for stay verification.
6. Complete one ordinary non-sensitive Concierge question.

## Suggested GitHub release text

Title:

`Release v5.11.28: refine guest hierarchy and unify protected lost-key intent`

Description:

`Refine the public landing and Room hierarchy with clearer registration, exact access wording, destination-accurate CTAs, concise operational guidance and boutique-safe positioning; route every clear lost-key or lockout synonym through the same protected 24/7 fee-consent path while preserving all notification, code-display, rotation, booking, Meta and privacy safeguards. All 169 tests pass.`

Stop after v5.11.28. Do not begin another milestone automatically.
