# Mobile Platform Setup — v5.11.58

This setup intentionally keeps the mobile API disabled until the owner account has been securely bootstrapped.

## 1. Deploy v5.11.58 with safe defaults

Confirm these remain false during the first deployment:

```text
MOBILE_APP_ENABLED=false
MOBILE_BOOTSTRAP_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
BEDS24_FINANCE_SYNC_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

## 2. Create Cloudflare secrets

Generate four different high-entropy values and save backup copies in the owner's password manager:

```text
MOBILE_BOOTSTRAP_TOKEN
MOBILE_PASSWORD_PEPPER
MOBILE_SESSION_PEPPER
MOBILE_INVITE_PEPPER
```

Never commit them to GitHub or place them in the mobile application.

## 3. Bootstrap the first owner

Temporarily set:

```text
MOBILE_BOOTSTRAP_ENABLED=true
```

Leave normal mobile login disabled while bootstrapping if desired.

POST once to:

```text
/api/mobile/v1/auth/bootstrap
```

with header:

```text
x-mobile-bootstrap-token: <MOBILE_BOOTSTRAP_TOKEN>
```

and JSON:

```json
{
  "email": "OWNER_EMAIL",
  "displayName": "OWNER_NAME",
  "password": "A_LONG_UNIQUE_PASSWORD"
}
```

The route refuses a second bootstrap once a platform user already exists.

Immediately set:

```text
MOBILE_BOOTSTRAP_ENABLED=false
```

and redeploy/save configuration.

## 4. Enable mobile login

After bootstrap:

```text
MOBILE_APP_ENABLED=true
```

The mobile application can now log in through `/api/mobile/v1/auth/login`.

## 5. Point the iPhone app at the Worker

Set in the Expo/EAS environment:

```text
EXPO_PUBLIC_API_BASE_URL=https://the-house-koh-tao-guide.7mf56yd45g.workers.dev
EXPO_PUBLIC_DEMO_MODE_ENABLED=false
```

Public mobile config must never contain Beds24, Meta, OpenAI or mobile pepper/bootstrap secrets.

## 6. Team access

The owner can invite manager/staff accounts from **Team & access**.

For selected staff who should upload bills:

- enable **Expense submissions**
- leave **Finance reports** unavailable

This grants only `finance.expense_submit`; income, payouts and owner Finance remain server-protected.

## 7. Production checks

Before TestFlight live-data testing:

1. owner login succeeds
2. Face ID relock works on physical iPhone
3. default staff cannot open Finance or protected owner surfaces
4. selected staff can submit an expense with receipt
5. staff duplicate warning reveals no prior expense details
6. owner sees submitted expense in existing Finance
7. owner can revoke the device session and the app loses access
8. no provider secret appears in mobile traffic or app source

## Existing Beds24 flags

Mobile enablement is independent of the still-deliberate Beds24 production flags. Do not switch on Channel Manager, Finance automation or AI auto-send merely to enable the mobile app.
