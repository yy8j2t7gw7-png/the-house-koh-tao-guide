# Development Handoff — v5.11.59 Mobile PBKDF2 Hotfix

## Why this release exists

The first live call to `POST /api/mobile/v1/auth/bootstrap` on Cloudflare Workers failed before persistence with:

`NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not supported (requested 210000).`

v5.11.58 had selected 210,000 PBKDF2-SHA256 iterations. The deployed Workers WebCrypto runtime enforces a 100,000-iteration maximum.

## Code change

- `src/mobile-platform.js`: `PASSWORD_ITERATIONS` changed from `210000` to `100000`.
- `src/concierge-store.js`: new `platform_users.password_iterations` default/fallback/cap changed to 100,000.
- `tests/concierge.test.mjs`: regression assertion added for the Workers-compatible value and absence of `210000` in the mobile password path.
- package version bumped to `5.11.59`.

## Security posture

The KDF remains PBKDF2-SHA256 with a unique random salt per user and a separate server-side `MOBILE_PASSWORD_PEPPER`. Bearer sessions and invite tokens remain independently hashed. No secrets are present in the repository.

For the future commercial multi-tenant product, a dedicated identity provider or a KDF/runtime that supports memory-hard password hashing can be evaluated separately. This hotfix is intentionally narrow and does not expand scope.

## Production procedure

1. Deploy v5.11.59 while `MOBILE_BOOTSTRAP_ENABLED=false`.
2. Confirm Worker deployment is healthy.
3. Temporarily set `MOBILE_BOOTSTRAP_ENABLED=true`.
4. Retry the existing owner bootstrap curl request once.
5. Confirm HTTP 201 / `{"ok":true,...}`.
6. Immediately set `MOBILE_BOOTSTRAP_ENABLED=false`.
7. Only after bootstrap is closed, set `MOBILE_APP_ENABLED=true` for normal login testing.

## GitHub summary

`Release v5.11.59 mobile bootstrap PBKDF2 Cloudflare hotfix`

## GitHub description

`Fix the v5.11.58 first-owner mobile bootstrap crash on Cloudflare Workers by bringing PBKDF2-SHA256 password derivation within the runtime-supported 100,000-iteration maximum. Preserve unique salts, server-side password peppering, hashed revocable sessions, permissions, Finance, Beds24 and guest-facing behavior. Add regression coverage preventing the unsupported 210,000 iteration value from returning. Final automated suite: 315 passed / 0 failed.`
