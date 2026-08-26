# Release Notes — v5.11.7

## Operational routing

- Actionable room-service, luggage and routine maintenance requests notify Su and both owners.
- House-arranged booking requests notify Fah and both owners.
- Serious property incidents require the guest to select **Send urgent alert** before Fah and both owners are notified. Su is excluded from this route.
- Successful automated requests confirm that The House team has been notified and do not ask the guest to repeat the request in WhatsApp.
- Unacknowledged serious property alerts escalate after approximately ten minutes. Until a dedicated 24/7 responder is configured, the protected owner group is the safe fallback.

## Lost-key safety

- Lost-key assistance remains an ordinary room-dashboard option.
- The verified active room-bound session is reused; the guest does not re-enter the Airbnb or House stay code.
- The guest deliberately continues and then accepts the 500 THB replacement fee.
- Su and both owners are notified automatically. At least one WhatsApp submission must be accepted before the key-box code can appear.
- The alert contains neither the stay code nor the key-box code, does not enter generic escalation, and the existing rotation lock remains enforced.

## Owner operations

- Dashboard labels now distinguish Concierge operational alerts from private maintenance reports.
- A checkout-day reservation stops appearing under **Active stays** at 11:00 AM Bangkok time.

## Compatibility note

The five approved Meta template names, `en_US` language and parameter counts are unchanged. Their existing layouts are reference-first. If The House later wants a different literal first line or additional visible fields, create and obtain Meta approval for new template versions before changing the code. This release does not risk production delivery by silently changing approved templates.

## Production checks after deployment

1. Confirm `support` contains Su, `booking` contains Fah, and `emergency` contains only both owners in the encrypted `WHATSAPP_ALERT_RECIPIENTS` secret.
2. Test one routine service request, one luggage request and one booking request; verify the correct lead plus both owners receive each message.
3. Start a serious property incident, cancel it once, and confirm no alert is created. Repeat and send it; verify both owners and Fah receive it, but Su does not.
4. Acknowledge the urgent property alert and confirm escalation stops. Separately test the owner fallback using a safe non-sensitive test.
5. During the after-hours window, test a temporary spare-key code from a verified active room session. Confirm the two-step fee acceptance, automatic Su-and-owner message, code display only after accepted delivery, and rotation lock. Rotate the temporary physical code immediately.
6. Confirm a checkout-day stay disappears from **Active stays** at 11:00 AM Bangkok time.

Do not place production recipient numbers, confirmation codes, passport data, key-box codes or API credentials in Git, screenshots, logs or release archives.
