# The House – Koh Tao v5.11.59

## Mobile Bootstrap PBKDF2 Runtime Compatibility Hotfix

v5.11.59 fixes the first-owner mobile bootstrap failure discovered during live Cloudflare validation of v5.11.58.

### Production issue

Cloudflare Workers rejected the v5.11.58 PBKDF2 request because the mobile password derivation used 210,000 iterations while this Workers runtime accepts at most 100,000 iterations for PBKDF2. The bootstrap request therefore terminated with a `NotSupportedError` before an owner account could be created.

### Fix

- Mobile PBKDF2-SHA256 iteration count is now 100,000.
- New `platform_users.password_iterations` schema default is 100,000.
- Mobile user creation persistence is capped at the Workers-supported value.
- Unique salts and the separate server-side `MOBILE_PASSWORD_PEPPER` remain unchanged.
- Session hashing, invite hashing, role/permission enforcement and all existing mobile security boundaries remain unchanged.
- No credentials or secrets are committed.

### Operational impact

No successful v5.11.58 mobile owner bootstrap occurred before this hotfix, so there is no mobile password record requiring migration in the live House instance. After deploying v5.11.59, the same bootstrap command can be retried.

Keep `MOBILE_BOOTSTRAP_ENABLED=false` except for the short owner-bootstrap window. `MOBILE_APP_ENABLED` remains false until the owner account has been created and bootstrap is disabled again.

### Validation

- Full automated regression suite: **315 passed / 0 failed**.
- Added a regression test that rejects a return to the unsupported 210,000 PBKDF2 setting.
