# Release Notes v5.11.34

## Outcome

v5.11.34 is a single-purpose mobile visual hotfix built directly from deployed v5.11.33 after real-iPhone review showed the marked Room 11 entrance was still clipped by the bottom of the Room-location hero.

No operational workflow changes. No Admin Dashboard changes.

## Exact correction

The approved Room 11 horizontal framing is retained at `72%`. Only the vertical focal point changes on mobile:

- before: `object-position: 72% 58%`
- after: `object-position: 72% 100%`

The selector remains inside the existing `@media(max-width:760px)` block in `public/design-system.css`. Therefore tablet and desktop Room imagery is unchanged.

The mobile Room hero stays 232 px high and the Room 11 overlay stays left-aligned at 18 px with maximum width 54%. The separate Finding Room 11 Step 1/Step 2 sequence is untouched.

## Preserved behavior

- v5.11.33 stable **💬 AI Concierge** pill and open-panel hiding behavior;
- language control and mobile card spacing;
- verified/TM30 wording;
- all Concierge, human-contact, emergency, lost-key, booking, diving, cleaning, luggage and maintenance logic;
- WhatsApp delivery/routing/templates;
- passport/stay/Airbnb/admin behavior;
- production feature switches and secrets.

## Validation

The crop contract now asserts `72% 100%` and explicitly verifies the rule is inside the max-width 760 px mobile media block with no matching desktop rule. Validation completed with **182 passed, 0 failed**. JavaScript syntax checks passed, all 12 JSON files parsed successfully, and a direct stylesheet diff against v5.11.33 confirms the only CSS change is the mobile Room 11 focal point from `72% 58%` to `72% 100%` inside the existing max-width 760 px block.

## Production smoke test

On the same real iPhone, open verified Room 11 and confirm the full marked entrance is visible in the Room-location hero. No functional Concierge, booking, lost-key or WhatsApp smoke test is required unless automated regressions fail.
