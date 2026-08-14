# The House – Koh Tao v5.11.1

## Release summary

v5.11.1 is a focused guest-access patch. The secure guest-verification page now uses the same shared top bar as the other guest pages, a discreet footer button opens the protected owner dashboard, and non-Thai guests may choose secure upload or in-person passport presentation.

## Guest-facing changes

- The verification page no longer uses its legacy 900px page-level header rules.
- Desktop navigation labels remain on one line at the standard guest-page width.
- Tablet and mobile navigation continue to use the existing shared responsive menu and always-visible language control.
- Stay-code verification, emergency access and concierge safety behaviour are unchanged.
- Foreign and mixed groups can choose **Upload passports securely** or **Provide passports in person** after declaring every non-Thai overnight adult and child.
- The in-person route requires the original passports for every declared non-Thai overnight guest and stores only the workflow status, count and timestamps.

## Owner access

- A small translated **Admin login** button now appears at the bottom of the verification page.
- It links to `/concierge-admin`, where the existing admin access token is still required.
- No owner name, telephone number, token or other private value is exposed by the link.
- An in-person handover appears on the relevant active or upcoming reservation. The authorized owner confirms it only after every required passport has been checked and the manual TM30 registration is complete.
- TM30 submission is not automated and no Immigration credentials are stored by this release.

## Production steps after push

1. Deploy v5.11.1 through the existing GitHub/Cloudflare workflow.
2. Open an unverified permanent room link on a desktop browser and confirm all top-bar labels remain on one line.
3. Check the mobile menu and language selector on a phone-sized screen.
4. Scroll to the bottom, open **Admin login**, and confirm the protected dashboard token screen appears.
5. Test the in-person option with a non-sensitive reservation, confirm the room guide remains locked, then complete the admin action and confirm access opens.

## Validation

- All 49 automated tests pass, including navigation, translation, admin-link, protected authorization and in-person registration regressions.
- JavaScript syntax, JSON parsing, release metadata and archive contents are checked before delivery.
