# Release Notes — The House v5.11.71

## Trusted reservation-chain context

Unified provider/mobile messaging no longer reasons from only the reservation attached to the current thread. For a trusted reservation, the backend now looks for an unambiguous adjacent confirmed stay belonging to the same guest. Matching prefers the same messaging phone and falls back only to an exact adjacent-date match with the same provider and guest first name. Ambiguous candidates are ignored rather than guessed.

The Concierge receives current, previous-adjacent and next-adjacent stay context so a guest moving rooms on the same day can be understood as one transition.

## Date-aware luggage policy

Relative dates are resolved using Asia/Bangkok. Informational luggage questions about a checkout/check-in transition use the actual transition date. If that date is Monday, the answer correctly states that the downstairs office is closed and uses the normal Bamboo Beach Bar from 11:00 AM fallback.

A manual owner edit or a one-off exception such as temporarily using a renovation room is never promoted to approved House knowledge automatically.

## Validation

Regression coverage includes the live pattern: Room 4 checkout on Monday followed by Room 5 check-in the same day, with luggage storage between stays.
