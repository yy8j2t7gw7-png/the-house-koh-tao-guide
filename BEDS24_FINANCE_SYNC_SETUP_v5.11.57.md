# THE HOUSE – KOH TAO
## Beds24 Airbnb Finance Sync Setup — v5.11.57

## Safety state

The release intentionally ships with:

```text
BEDS24_FINANCE_SYNC_ENABLED=false
BEDS24_CHANNEL_MANAGER_ENABLED=false
UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED=false
```

Do not enable the Finance sync merely because v5.11.57 has been deployed. First complete the Beds24 property/room/channel setup and compare a real known Airbnb payout end to end.

## What v5.11.57 imports

v5.11.57 imports **Airbnb actual channel-collected payments only** into House Finance.

It does not create Finance income when:

- the Airbnb booking merely exists;
- only an expected payout/charge exists;
- the provider has not yet reported an actual channel-collected payment.

The actual provider payment is used as the authoritative Finance net amount. Beds24 booking price and commission remain attached as reconciliation context.

## Step 1 — Finish the base Beds24 setup first

Follow `BEDS24_UNIFIED_MESSAGING_SETUP_v5.11.56.md` and keep the v5.11.56 enable-last rules:

1. Create The House property in Beds24.
2. Create Rooms 1–11.
3. Import/block **all existing reservations before connecting live inventory**.
4. Connect Airbnb initially.
5. Establish and verify the explicit Room 1–11 `BEDS24_ROOM_MAP`.
6. Configure and live-test the authenticated Beds24 webhook/unified inbox paths.
7. Keep `BEDS24_CHANNEL_MANAGER_ENABLED=false` until its own reservation/availability tests have passed.

The Finance automation does not remove or weaken those requirements.

## Step 2 — Configure Airbnb invoice/payment import in Beds24

Beds24 documents Airbnb invoice modes that can include an actual payment which starts at zero and later updates when Airbnb pays.

For this Finance sync, configure an Airbnb invoice mode that provides the **actual payment**, for example:

- **Expected payout amount and actual payment**, or
- **All charges and actual payment** if you want more detailed charge lines inside Beds24.

Also configure Beds24 to import **Channel Collect Payments** so the Airbnb payment appears in the booking's Charges & Payments.

Official references:

- https://wiki.beds24.com/index.php/Setting/ownersairbnbxmlinvoice
- https://wiki.beds24.com/index.php/Airbnb_Mapping

## Step 3 — Create/regenerate the API V2 credential with financial read access

Beds24 API V2 scopes are fixed when the invite code is created. If the existing refresh token lacks financial access, generate a new invite code/token rather than trying to modify the old token.

For Finance v5.11.57 the token needs at minimum:

```text
read:bookings
read:bookings-financial
```

The same production token may also need the existing v5.11.56 messaging/channel-manager scopes, depending on which Beds24 functions you are activating:

```text
read:bookings
write:bookings
read:bookings-personal
write:bookings-personal
read:bookings-financial
read:inventory
```

Do not grant unrelated access without a reason.

Official API V2 reference:

- https://wiki.beds24.com/index.php/API_V2.0

## Step 4 — Store credentials only as Cloudflare Secrets

Never paste real Beds24 credentials into GitHub, `wrangler.jsonc`, project documentation or source code.

Keep the actual refresh token in the existing Cloudflare Secret:

```text
BEDS24_REFRESH_TOKEN
```

Keep the existing webhook/internal tokens and room map in their protected production configuration according to the v5.11.56 setup guide.

## Step 5 — Leave Finance sync disabled and deploy/test the configuration view

With v5.11.57 deployed and the real credential/mapping configured, leave:

```text
BEDS24_FINANCE_SYNC_ENABLED=false
```

Open Owner Admin -> Finance. The **Airbnb payout automation** panel should clearly report that automation is safely disabled.

No imported income should appear while the flag is false.

## Step 6 — Select one known Airbnb payout for the controlled test

Choose one Airbnb booking for which you can verify:

- Room;
- stay dates;
- Airbnb reservation/reference;
- booking/gross amount;
- Airbnb host/service commission where applicable;
- actual Airbnb payout received.

Use Airbnb Earnings / payout information as the external comparison and the corresponding Beds24 booking Charges & Payments as the provider comparison.

Do not use an ambiguous booking or one with an unresolved alteration for the first test.

## Step 7 — Temporarily enable Finance sync for the live test

Only after the above data is visible correctly in Beds24, deliberately set:

```text
BEDS24_FINANCE_SYNC_ENABLED=true
```

Deploy that configuration change.

This does **not** require enabling `BEDS24_CHANNEL_MANAGER_ENABLED`. The two flags are independent.

## Step 8 — Run one owner-controlled manual reconciliation

In Owner Admin -> Finance, the automation panel should now show ready if:

- the refresh token is present;
- financial scope is valid;
- Room 1–11 mapping is complete.

Use **Sync Airbnb payouts now** once.

Then inspect the saved Airbnb income row for the chosen booking.

Verify:

1. Category is Airbnb.
2. Correct House room is shown.
3. Correct booking/stay reference is shown.
4. Net amount equals the **actual channel-collected Airbnb payment** reported by Beds24.
5. Gross booking value is sensible for the reservation.
6. Airbnb/Beds24 commission field is sensible.
7. Provider/source metadata identifies Beds24 automation.
8. Running **Sync Airbnb payouts now** again creates **no duplicate row**.

## Step 9 — Test a provider update/refund case before relying on automation

Where practical, use a controlled historical/example booking whose Beds24 payment state changes or already reflects a refund/adjustment.

Confirm that reconciliation updates the **same** Finance record rather than inserting another income record.

A provider-managed Beds24 income row is deliberately not manually deletable in Owner Admin. Corrections should come from provider reconciliation so the audit trail and provider identity remain intact.

## Step 10 — Leave enabled only after the comparison is correct

Once the known payout matches and duplicate/update behavior is confirmed, leave:

```text
BEDS24_FINANCE_SYNC_ENABLED=true
```

The existing daily scheduled job will then reconcile Airbnb actual payouts automatically.

If the comparison is wrong, immediately return the flag to `false`; manual House Finance remains available and existing records are not dependent on the automation being enabled.

## Current v5.11.57 boundary

This release automates **Airbnb payout income only**.

It does not yet automatically import Booking.com, Expedia, Vrbo, Agoda, Hostelworld or Trip.com payments into Finance. The provider-neutral identity/upsert pattern is designed so those can be added later after each channel's payment semantics are validated individually.
