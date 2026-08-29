# Development Handoff v5.11.31

## Authoritative checkpoint

v5.11.31 is complete and was built directly from the deployed/package-approved v5.11.30 archive. Preserve both archives. Do not reconstruct v5.11.19–v5.11.31 from the older pushed v5.11.18 Git baseline.

This release is mobile presentation/usability only. It does not change operational Concierge, contact-hours, lost-key, booking, alert, registration, emergency, passport, Airbnb or owner-dashboard behavior.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`

Do not change production Meta templates, languages, BODY schemas/order, routes, recipients, contacts, secrets, passport storage, Airbnb configuration or `SPARE_KEY_CODES` while deploying this archive.

## Production causes and fixes

### Language floated over content

Cause: `addAlwaysVisibleLanguageButton()` appended a second language button to `document.body`; mobile CSS fixed that independent element to the viewport with z-index 80. Reserved header padding aligned it visually but did not make it part of the header.

Fix: `addHeaderLanguageButton()` inserts the compact control directly into `.topbar` before `.nav`. It is `position: static` at the existing mobile header breakpoint and opens the unchanged language select inside the menu. The body append and `language-floating-button` implementation no longer exist.

### Concierge covered mobile content

Cause: the desktop launcher pill remained full-width on phones and there was no Concierge-owned mobile page-bottom clearance after the shared visual system reset shell padding.

Fix: at `max-width: 767px`, the launcher is 58×58 px with a centered sparkle, exact `aria-label="Open Concierge"`, retained visible focus and reduced-motion support. It uses:

- `right: calc(12px + env(safe-area-inset-right))`
- `bottom: calc(12px + env(safe-area-inset-bottom))`
- `body.ai-concierge-ready` bottom padding of `calc(76px + env(safe-area-inset-bottom))`

This is global to every page that loads the Concierge, including the unverified access page; there is no Room-only offset.

### Stay-help label became Contact Us

Cause: `platform-action-runtime.js` correctly inferred the existing `houseWhatsapp` destination as a contact action, then replaced the authored **Open Concierge** text with its generic label.

Fix: the existing link has a presentation-only `data-action-label="Open Concierge"`. The common runtime translates and preserves that explicit label. Its `data-link`, target and Concierge click behavior remain unchanged.

## Mobile presentation values

- compact-launcher breakpoint: below 768 px;
- mobile header/nav breakpoint: 760 px and below;
- launcher: 58×58 px, 18 px radius;
- section spacing: 14 px margin / 16 px padding;
- Room card padding: 13 px vertical / 15 px horizontal, 18.75% less vertical padding than v5.11.30;
- Room-location hero: 208 px, 15.45% shorter than the prior 246 px mobile hero;
- Room image focal point: 50% 56%;
- tablet/desktop at 768, 1024, 1280 and 1440+ retains the approved layout and desktop pill.

## Exact Room copy

Paragraph 1:

> Your stay is verified. Non-Thai overnight guests must also complete the required TM30 guest registration.

Paragraph 2:

> Passport images are automatically deleted 14 days after upload, or sooner after processing.

This no longer implies Room access requires completed registration. The root and canonical Room pages are identical, and all seven supported languages include the two sentences.

## Files changed from v5.11.30

- `CHANGELOG.md`
- `DEVELOPMENT_HANDOFF_v5.11.31.md`
- `PROJECT_BRIEF.md`
- `PROJECT_RULES.md`
- `README.md`
- `RELEASE_NOTES_v5.11.31.md`
- `ROADMAP.md`
- `WORK_HANDOVER_PROMPT.md`
- `package-lock.json`
- `package.json`
- `public/ai-concierge-config.js`
- `public/ai-concierge.css`
- `public/ai-concierge.js`
- `public/data/activities.json`
- `public/data/concierge-knowledge.json`
- `public/data/diving-courses.json`
- `public/design-system.css`
- `public/i18n.js`
- `public/module-registry.js`
- `public/modules/house/room.html`
- `public/platform-action-runtime.js`
- `public/room.html`
- `src/concierge-api.js` (release constant only)
- `tests/concierge.test.mjs`

## Tests and validation

One presentation contract expands the suite from 178 to 179 tests. It covers launcher accessibility/size/safe areas, bottom clearance, header-owned non-floating language access, Room hero/card values, corrected copy, mirror equality and the explicit CTA label.

Validation completed:

- source suite: 179 passed, 0 failed; two additional complete reruns passed;
- independently extracted ZIP suite: 179 passed, 0 failed;
- 36 JavaScript/ES-module files plus `airbnb-sync/Code.gs`: syntax passed;
- 12 JSON files: parse passed;
- version consistency: v5.11.31 passed;
- seven selected exact root/module mirrors passed;
- Git whitespace passed;
- 16 protected operational modules match v5.11.30 exactly;
- credential, private-contact, key-code and protected-media release-delta scans passed;
- ZIP CRC and the 239-file source/archive manifest comparison passed.

Responsive source/computed-contract checks passed at 320, 360, 375, 390, 414 and 430 px, with positive compact-header width headroom at each width; the 58 px launcher remains modest in a landscape viewport. Mobile rules end below 768 px, and 768/1024/1280/1440 desktop contracts remain unchanged.

The managed cloud browser rejected the local preview URL under its security policy. No manual browser screenshots or device-width review are claimed from this workspace. The Room 11 source photo and 208 px crop/focal point were inspected directly. Complete the real-iPhone review immediately after deployment as specified below.

Worker dry run was not executed here: Wrangler 4.122.0 is available, but the workspace command-approval connection disconnected before Wrangler started. This is a deployment stop condition, not a waived check.

## Deployment

1. Extract `The-House-Koh-Tao-v5.11.31-ready-to-push.zip`.
2. Run `npm install`.
3. Run `npx wrangler deploy --dry-run`. Stop if it fails.
4. Deploy only the independently validated archive.
5. Keep all production mappings, routes, recipients, secrets, `SPARE_KEY_CODES`, `EXPLORE_ENABLED=false` and `WHATSAPP_STAFF_ACTIONS_ENABLED=false` unchanged.
6. No data migration is required.

## One-step production visual smoke test

On one real iPhone, open the unverified access page and verified Room 11, then scroll from top to footer: require the Emergency CTA, Room copy/hero, every navigation card, Finding Room photos/captions, **Open Concierge**, **Open Google Maps** and footer to move completely clear of the compact launcher; require the language control to remain in the sticky header/menu and never float independently over page content.

No booking or lost-key smoke test is needed for this presentation release unless an automated regression fails.

## Suggested GitHub release text

Title:

`Release v5.11.31: compact mobile controls and clarify Room status`

Description:

`Replace the full mobile Concierge pill with a 58×58 px safe-area-aware launcher and modest page-bottom clearance; move language access from an independent fixed body control into the approved sticky header; tighten mobile Room cards and reduce the Room-location hero by 15.45%; separate verified-stay and TM30 wording; and preserve the existing stay-help route while displaying “Open Concierge”. Operational workflows are unchanged. All 179 tests pass.`

Stop after v5.11.31. Do not begin another release automatically.
