# Development Handoff v5.11.34

## Authoritative checkpoint

v5.11.34 is a mobile-only Room 11 crop hotfix built directly from deployed v5.11.33. Do not reconstruct it from an older baseline.

This release changes only mobile presentation plus release/test metadata. All v5.11.33 operational behavior remains authoritative.

Keep:

- `EXPLORE_ENABLED=false`
- `WHATSAPP_STAFF_ACTIONS_ENABLED=false`
- all production secrets, routes, recipients, Meta mappings, passport storage, Airbnb configuration and `SPARE_KEY_CODES` unchanged.

## Real-device finding

On the deployed v5.11.33 Room 11 page, the horizontal framing was correct but the marked entrance remained clipped at the bottom of the 232 px hero. The owner explicitly requested **no further rightward movement** and **mobile-only** correction.

## Exact implementation

In `public/design-system.css`, inside the existing `@media(max-width:760px)` block only:

```css
.room-guide-page[data-room-number="11"] .hero img{object-position:72% 100%}
```

The X coordinate remains 72%. The Y coordinate changes from 58% to 100%, aligning the image to the bottom so the full marked entrance can be shown.

Unchanged:

- mobile Room hero height: 232 px;
- generic mobile Room focus: 50% 54%;
- Room 11 overlay: left 18 px, max-width 54%;
- all >=761 px/tablet/desktop image framing;
- Finding Room Step 1/Step 2 images;
- v5.11.33 AI Concierge presentation and behavior.

## Tests

The existing Room 11 crop contract is updated to require `72% 100%`. It also asserts that this specific correction occurs inside the max-width 760 px media block and does not appear as a desktop rule.

Validation completed:

- complete source suite: **182 passed, 0 failed**;
- all `public/` and `src/` JavaScript files passed `node --check`;
- `airbnb-sync/Code.gs` passed syntax check through a temporary `.js` copy;
- all 12 JSON files parsed successfully;
- comparison against v5.11.33 confirms the only stylesheet change is the mobile Room 11 line from `72% 58%` to `72% 100%`;
- no desktop/tablet CSS rule was changed;
- no Admin Dashboard or operational implementation file was changed.

The complete suite remains 182 tests.

## Deployment

1. Extract `The-House-Koh-Tao-v5.11.34-ready-to-push.zip`.
2. Run `npm ci`.
3. Run `npm test`; require 182 passed, 0 failed.
4. Run `./node_modules/.bin/wrangler deploy --dry-run`; stop if it fails.
5. Deploy with the same production configuration.
6. No migration is required.

## Focused post-deployment smoke test

Open verified Room 11 on the same iPhone and confirm the marked Room 11 entrance is fully visible. No desktop visual change is expected and no operational workflow smoke test is required unless regression tests fail.

Stop after v5.11.34.
