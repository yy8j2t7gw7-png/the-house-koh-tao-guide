# The House – Koh Tao v5.11.14

## Guest-natural safety, service hours and structured diving

This patch makes the live Concierge more natural and operationally complete without weakening any protected alert, privacy or lost-key boundary.

- Guest answers no longer expose classifier or system-style language.
- Fire guidance leads with evacuation, offers the configured Koh Tao Rescue action, identifies the outside fire extinguisher on each floor and limits extinguisher use to a small fire with a clear escape route.
- **Find My Room** returns the verified room location and a direct **Your Room** action.
- Toilet paper, soap, clean/fresh towels and room cleaning are deterministic service requests.
- During 10:30–19:30 Bangkok time, routine requests are sent immediately with a 30-minute **Call Us** fallback; after hours, the request is still sent but the guest is told that housekeeping will handle it after 10:30 the next morning.
- Guest Information and the Concierge now show the service-hours policy.
- Booking buttons start a structured Concierge workflow; no personal Fah WhatsApp action or number is exposed.
- Diving requests collect date, diver count, experience/course, conditional certification/course details, international reply contact and optional notes before one protected Fah-and-owner alert can be sent.
- Diving recommendations remain informational, and guests are told that payment is required before a booking is confirmed.
- Raw contact details remain transient and excluded from ordinary chat history, interaction records, alert records, dashboards and logs.
- Existing v5.11.13 emergency confirmation, luggage validation, lost-key security, recipient routing and contact-redaction safeguards remain unchanged.
- Meta template names, template parameters, recipient secrets and production configuration are unchanged.

## Verification

The complete automated suite passes 91 of 91 tests. Coverage includes exact Bangkok service-hour boundaries, every supported housekeeping request, fire/Rescue behavior, natural no-alert wording, dynamic room actions, structured diving variants, conditional fields, fresh workflow state, final submission gates, protected routing and contact privacy.

## Short live regression

1. During 10:30–19:30 Bangkok time, ask for fresh towels. Confirm the request is sent immediately and the reply includes the 30-minute **Call Us** fallback.
2. After 19:30, ask for soap. Confirm the request is sent, the reply says housekeeping is off duty and handling resumes after 10:30, with no 30-minute promise.
3. Ask `Where is my room?` and confirm the correct room location plus **Your Room** action.
4. Ask for fire help. Confirm evacuation guidance, the configured **Call Koh Tao Rescue** action, extinguisher location and safe-use condition; confirm no House alert is sent until **Send urgent alert** is selected.
5. Ask which dive school is recommended; confirm no booking alert. Then request a dive booking and complete every required field; confirm one protected alert reaches Fah and both owners and that the booking remains pending payment.
