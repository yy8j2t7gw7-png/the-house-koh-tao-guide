# The House – Koh Tao v5.11.13

## Production safety and guest-experience patch

This patch prevents severe words in figurative, slang or ambiguous guest language from silently creating protected House alerts, while preserving immediate safety guidance and every established routing safeguard.

- Safety decisions now use the meaning of the full sentence instead of isolated keywords.
- Medical and personal-safety messages may show Koh Tao Rescue and 1669 immediately, but The House is notified only after the guest deliberately selects **Send urgent alert**.
- Serious property incidents retain the explicit confirmation flow; model intent labels cannot create either alert directly.
- The browser accepts only one in-flight Concierge submission, so one guest message produces one coherent response and state transition.
- Reply-number prompts clearly accept international format and use `+66` as the Thai example.
- The verified lost-key interface now uses natural guest language, one explicit 500 THB fee checkbox and one **Request spare key** action.
- After a code has been released or rotation is required, impossible release controls are hidden and a direct Concierge contact action is shown.
- The v5.11.12 luggage gate, contact redaction, alert routing, verified session, staff-notification prerequisite, key-code secrecy and rotation lock are unchanged.
- No Meta template names, parameter lists, recipient secrets or production configuration were changed.

## Verification

The complete automated suite passes 79 of 79 tests. New coverage includes exact figurative/slang phrases, medical and property confirmation boundaries, cancel-without-alert behavior, model-mislabelling at the final alert boundary, one-response browser behavior, local-number guidance, all seven language packs and the revised lost-key screen.

## Short live regression

1. Send `I am dying for love`, `bloody hell` and `I am burning inside`; confirm no alert is created.
2. Send a genuine medical-help message; confirm Rescue and 1669 are offered and no House alert exists until **Send urgent alert** is pressed. Confirm **Cancel** sends nothing.
3. Send `I have a water leak and everything is flooded`; confirm the urgent-property confirmation appears and the alert is created only after deliberate confirmation.
4. On a verified active room during 19:30–10:30 Bangkok time, open spare-key help. Confirm the simple 500 THB checkbox flow, accepted team notification before code release and the contact-only blocked screen after release until rotation is confirmed.
