# THE HOUSE – KOH TAO / BAMBOO BEACH BAR
## Development Handoff — v5.11.45 Admin Dashboard Selector

## Authoritative baseline
This release is built directly on the unpushed consolidated v5.11.45 Bamboo Finance role-access release:
`The-House-Koh-Tao-v5.11.45-bamboo-finance-role-access-ready-to-push.zip`

v5.11.45 remains an unpushed development line. This selector release supersedes the prior unpushed v5.11.45 ZIPs for deployment.

## Exact scope
The `/concierge-admin` entry page now starts with a business/workspace chooser before authentication:

- **The House – Koh Tao** → opens the existing House Admin login using `CONCIERGE_ADMIN_TOKEN`.
- **Bamboo Beach Bar — Owner login** → routes to `/bamboo-finance` using `BAMBOO_FINANCE_OWNER_TOKEN`.
- **Bamboo Beach Bar — Staff login** → routes to `/bamboo-finance/staff` using `BAMBOO_FINANCE_STAFF_TOKEN`.

The user no longer needs to authenticate into The House Admin before finding Bamboo Finance.

The House login remains on the same `/concierge-admin` page after choosing The House. It includes a **Back to dashboard choice** action. Once inside The House Admin, the toolbar includes **Choose dashboard** so the owner can return to the selector.

A previously saved House token in session storage is used only after the user explicitly chooses The House; opening `/concierge-admin` itself no longer auto-opens the House workspace and skips the selector.

## Changed files
- `public/concierge-admin.html`
- `public/concierge-admin.css`
- `public/concierge-admin.js`
- `tests/concierge.test.mjs`
- `DEVELOPMENT_HANDOFF_v5.11.45_ADMIN_DASHBOARD_SELECTOR.md`

## Behavior deliberately preserved
No changes were made to:
- House authentication secret or server-side authorization;
- Bamboo Owner/Staff authentication or permissions;
- Bamboo Finance data, Cash/QR handling, reports, receipt storage or role restrictions;
- The House Finance module;
- Concierge routing or guest chat behavior;
- Airbnb sync / `airbnb-sync/Code.gs`;
- Meta/WhatsApp templates or alert routing;
- passport / Thai ID / TM30 registration logic;
- lost-key flows;
- maintenance, cleaning, luggage, booking or emergency workflows;
- Room 7 or direct-stay behavior;
- Cloudflare bindings/secrets configuration.

This is a navigation/UI release only. Authentication separation remains enforced by the existing backend role/access controls.

## Validation
- Full automated suite: **252 / 252 passed**.
- New regression verifies `/concierge-admin` exposes the chooser before authentication and links to both Bamboo Owner and Staff pages.
- Existing Bamboo security regressions remain green, including owner/staff server-side isolation.
- `public/concierge-admin.js` passes `node --check`.

As with previous releases, no successful Wrangler deploy dry-run is claimed from this environment.

## Deployment
Use this release as the single v5.11.45 candidate. Do not layer older v5.11.45 ZIPs on top afterward.

On the deployment machine:

```bash
npm ci
npm test
npx wrangler deploy --dry-run
```

If those pass, commit/push through the existing GitHub repository and deploy through the existing Worker process.

## Smoke test after deployment
1. Open `/concierge-admin` in a fresh/private browser tab.
2. Confirm the first screen shows:
   - The House – Koh Tao → **Open The House Admin**
   - Bamboo Beach Bar → **Owner login**
   - Bamboo Beach Bar → **Staff login**
3. Choose The House and verify the existing House password works.
4. Use **Choose dashboard** and verify the selector returns.
5. Open Bamboo Owner and confirm only the owner password works.
6. Open Bamboo Staff and confirm only the staff password works.
7. Confirm Staff still cannot see totals/history/reports or The House Admin.

## Commercial / white-label note
This small navigation layer is aligned with the longer-term multi-business/platform direction: one entry surface can route an authenticated operator to the correct business and role without coupling the businesses' credentials or data.
