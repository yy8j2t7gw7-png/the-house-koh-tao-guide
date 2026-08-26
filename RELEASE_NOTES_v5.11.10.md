# v5.11.10 — Critical-Intent Precedence & Sitewide Legal Navigation

This patch prevents a pending ordinary Concierge workflow from consuming a newly reported critical property incident. Every new message is checked for serious property danger before stale luggage, booking, maintenance, routine-service or contact-number state can continue. Contact numbers are accepted only for the immediately pending operational request, so an interrupted workflow cannot be submitted later by mistake.

The existing urgent safeguards remain unchanged: the guest must deliberately press **Send urgent alert**, cancellation creates no alert, a missing contact number does not block the confirmation, and confirmed property incidents route to Fah plus both owners without Su.

Privacy, Data Protection and Terms navigation is now available from every HTML page. Operational pages inherit a shared multilingual footer, while the homepage, legal pages and private owner console retain static legal navigation.

Automated regression result: 65 passed, 0 failed.
