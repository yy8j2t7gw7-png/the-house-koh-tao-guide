# Release Notes — v5.11.6

## Public legal pages for Meta app review

This narrowly scoped patch provides the public legal URLs needed to continue the Meta WhatsApp app publishing process. It contains no production credentials, recipient telephone numbers, passport data, booking confirmation codes or key-box codes.

### Public URLs after deployment

- `/privacy` — Privacy Policy
- `/data-deletion` — data-deletion request instructions
- `/terms` — Terms of Use

Each route also accepts a trailing slash or `.html` form. The pages need no guest or admin authorization and use restrictive browser security headers.

### Content covered

- TM30 accommodation registration and the Thai-national exemption.
- Required information for every non-Thai overnight adult and child.
- Private passport storage and automatic deletion no later than 14 days after upload.
- AI Concierge processing, limited conversation context and human escalation.
- Sanitized operational staff alerts through Meta WhatsApp Business Platform.
- Retention periods, guest choices and a safe email-based deletion request.
- Practical Terms of Use for guest access, third-party arrangements and emergencies.

### Preserved systems

The v5.11.5 WhatsApp integration, webhook verification, approved templates, recipient routing, Airbnb synchronization, secure passport upload, registration gates, owner dashboard and after-hours spare-key flow are unchanged.

### Deployment

Deploy the complete v5.11.6 project through the existing Cloudflare Worker workflow. Then open the three public URLs without a guest session, confirm HTTP 200 responses, and place their exact production URLs in the matching Meta app settings.
