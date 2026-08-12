# Secure Passport Information Operations

## Purpose and current scope

The House requires passport information for guest and overnight-visitor TM30 Immigration accommodation registration. v5.5.1 provides a private passport-image workflow so guests do not send the document through the AI Concierge or as a WhatsApp attachment.

The current authoritative House information confirms the passport-photo requirement. It does not contain the exact structured TM30 field list. The alternative manual-details form must therefore remain disabled until that authoritative field specification is supplied. Do not guess legal or Immigration fields.

## Guest experience

1. An authorized owner creates a private request in `/concierge-admin`, selecting the room and expected Bangkok arrival time.
2. The system returns a guest-friendly reminder and a one-time link.
3. The link carries its 256-bit token in the URL fragment. Browser fragments are not sent in the initial page request or referrer.
4. The upload page explains why the passport is needed and how the file is handled before showing the file control.
5. The guest submits one JPEG, PNG, WebP or HEIC passport image up to 10 MB.
6. The server validates the link, expiration, single-use state, file size and file signature before private storage.
7. The link closes after the successful upload.

Create one link per passport image. Do not ask a guest to combine multiple passports into one image.

## Owner workflow and reminders

The private review area shows:

- active requests still awaiting guest information;
- expected arrival time in Bangkok time;
- whether an owner marked a reminder as sent;
- received documents, their size, receipt time and deletion time;
- authenticated download and immediate deletion controls.

Su and the owners currently use ordinary WhatsApp. The application therefore prepares a reminder for the owner to copy into the existing guest conversation. It cannot send that message automatically. After sending it, mark the reminder as sent. If information arrives through an approved alternative process, revoke the pending link.

Automatic reminders require an approved outbound messaging integration, such as the WhatsApp Business Platform, plus the guest contact and stay-arrival data. Do not silently add personal telephone numbers to this store.

## Data handling

- Passport images are stored only in the private `PASSPORT_UPLOADS` R2 bucket.
- The bucket must not have public access or a public custom domain.
- The AI model, learning queue, interaction log, public files and WhatsApp messages never receive the document.
- If a guest pastes multiple recognizable passport fields into chat, the server discards the values and keeps only a generic `passport registration` intent before answering or logging.
- Object keys are random and contain no room number, guest name or passport identifier.
- The Durable Object stores only operational metadata: room, random record ID, token hash, status, file type, file size and lifecycle timestamps.
- The raw one-time token is returned once to the authorized owner and is never stored in readable form.
- Only requests carrying the owner admin bearer token can retrieve a document.
- Downloads use no-store, no-referrer, frame-denial and content-sniffing protection headers.
- The main retention policy is 14 days after upload. Owners can delete sooner.
- A downloaded copy is outside automatic deletion. Delete it from the owner device as soon as the official registration work is complete.
- A daily scheduled cleanup deletes expired files and invalidates expired links.
- Configure a 14-day R2 lifecycle rule for the `passport/` prefix as the main storage-retention rule. The daily application cleanup enforces the same deadline as an additional safeguard. Cloudflare notes that lifecycle deletion can occur after the configured expiration time.

This design minimizes exposure but does not by itself establish legal compliance. Owners remain responsible for confirming the required TM30 data, authorized access and appropriate retention policy.

## Production setup

1. Create the private bucket:

   ```sh
   npx wrangler r2 bucket create the-house-passport-uploads
   ```

2. Confirm the bucket is not publicly exposed.
3. Add a long random Worker secret:

   ```sh
   npx wrangler secret put PASSPORT_TOKEN_PEPPER
   ```

4. In the R2 bucket settings, add an object lifecycle rule for the `passport/` prefix with a 14-day expiration.
5. Deploy the Worker and confirm `/api/concierge/status` reports `passportUploadsConfigured: true`.
6. Create a test request for a non-production test room, upload a non-sensitive test image, download it through the owner area, delete it and confirm the object is gone.
7. Never test with a real passport until access control, deletion and the owner workflow have been verified in production.

`PASSPORT_RETENTION_DAYS` defaults to `14` and may be reduced to as little as 1. The application caps it at 14 days so it cannot silently exceed the main R2 lifecycle rule.

## Incident actions

- Revoke an unused link immediately if it was sent to the wrong person.
- Delete an uploaded file immediately if it was submitted for the wrong room or is no longer required.
- Rotate `PASSPORT_TOKEN_PEPPER` if pending links may have been exposed. Rotation invalidates all outstanding links.
- Rotate `CONCIERGE_ADMIN_TOKEN` if owner-area access may have been exposed.
- Record and handle any suspected personal-data incident outside the guest-facing concierge; never discuss passport contents with the model.

## Inputs still required

- Authoritative structured list of the exact TM30 details that a guest may enter instead of uploading a passport image
- Confirmation of any future production retention-policy change from the approved 14-day maximum
- Approved outbound messaging provider and recipient workflow for automatic reminders
- Booking or stay-system integration that can automatically supply arrival time and submission status
