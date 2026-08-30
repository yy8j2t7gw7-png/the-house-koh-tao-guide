# Secure Passport Information Operations

## Purpose and current scope

TM30 accommodation registration concerns foreign guests. Thai nationals do not need to complete this registration or upload a passport. For every non-Thai adult or child staying overnight—not only the person who made the Airbnb booking—v5.11.6 requires either one reservation-bound private passport submission per person or presentation of every required original passport to The House in person before private room information opens. The concise seven-language registration flow keeps documents out of the AI Concierge, Airbnb messages and WhatsApp.

This scope was checked against the Thai Immigration Bureau TM30 service description, which states that Section 38 notification applies when accommodation is provided to foreign nationals. Operational wording must remain limited to this exemption and must not expand into unsourced legal advice.

The House intentionally does not offer guest-entered passport-detail fields. Guests must either upload a clear passport image through the private one-time form or provide the required original passport(s) in person. This avoids The House relying on retyped passport data that may be incomplete or incorrect. Do not add a manual-details form or API without a new explicit owner instruction.

## Guest experience

1. Airbnb sends the scheduled arrival message containing the permanent page for the booked room and Airbnb's own confirmation-code detail.
2. The guest enters that code. The Worker verifies it against the protected synchronized listing, room and reservation dates.
3. A verified guest chooses either **Foreign or mixed group** or **All overnight guests are Thai nationals**. The application does not infer nationality.
4. For a foreign or mixed group, the guest declares the total number of non-Thai adults and children staying overnight and confirms that the number includes everyone, not only the booking guest.
5. A foreign or mixed group chooses secure upload or in-person presentation. Each passport-button use creates a new random, reservation- and room-bound, 72-hour, single-use upload link automatically. No owner action is required to create it.
6. The in-person option stores only the reservation workflow status, declared passport count and timestamps. It closes unused pending upload links and stores no passport details.
7. The private guide remains locked until one passport has been received for every declared non-Thai overnight guest, or until an authorized owner confirms that every required original passport was checked in person and the manual TM30 registration was completed.
8. Each upload form's 256-bit token is carried only in the URL fragment; fragments are not sent in the initial page request or referrer.
9. The registration page explains why the information is needed and how it is handled. It does not open WhatsApp.
10. Passport-image upload accepts one JPEG, PNG, WebP or HEIC image up to 10 MB.
11. Manual passport-detail entry is not offered. Guests use the secure passport-image upload or the supported in-person original-passport route. Submission to the Immigration portal is not automated.
12. The server validates authorization, reservation link, expiry, single use, byte limit and file signature before private storage.
13. The upload link closes after success. The verified room page returns to the progress screen and creates a separate form for the next non-Thai guest until the declared total is reached. Selecting the all-Thai path is blocked after a foreign requirement or uploaded file exists unless staff review it.

Create one link per passport image. Do not ask a guest to combine multiple passports into one image.

## Owner view and reminders

The private review area shows synchronized reservations and registration status as well as:

- active requests still awaiting guest information;
- expected arrival time in Bangkok time;
- whether an owner marked a reminder as sent;
- received documents, their size, receipt time and deletion time;
- authenticated download and immediate deletion controls.

The prepared Airbnb scheduled message is the automatic pre-arrival reminder and makes registration a visible required step. It contains no passport data. The system does not currently send a conditional second message when a particular reservation remains incomplete because Airbnb does not expose that protected conversation action to this Worker.

The legacy owner-created one-time request remains in `/concierge-admin` only as an operational fallback. It creates a direct private upload URL inside the reminder text, is limited to active rooms and still requires explicit non-Thai confirmation. Ordinary operation should use the verified permanent room page.

Do not silently add personal phone numbers to this store. The protected staff-alert channel is not a guest passport-reminder channel.

## Data handling

- Passport images are stored only in the private `PASSPORT_UPLOADS` R2 bucket.
- The bucket must not have public access or a public custom domain.
- The AI model, learning queue, interaction log, public files and WhatsApp messages never receive the document.
- If a guest pastes multiple recognizable passport fields into chat, the server discards the values and keeps only a generic `passport registration` intent before answering or logging.
- Object keys are random and contain no room number, guest name or passport identifier.
- The Durable Object stores only operational metadata: room, random record ID, token hash, status, file type, file size and lifecycle timestamps.
- The raw one-time token is returned once to the verified browser and is never stored in readable form.
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
6. Synchronize a non-sensitive future test reservation, verify it from the correct permanent room page, create the upload form, upload a test image, download it through the owner area, delete it and confirm the object is gone.
7. Never test with a real passport until access control, deletion and the owner workflow have been verified in production.

`PASSPORT_RETENTION_DAYS` defaults to `14` and may be reduced to as little as 1. The application caps it at 14 days so it cannot silently exceed the main R2 lifecycle rule.

## Incident actions

- Revoke an unused link immediately if it was sent to the wrong person.
- Delete an uploaded file immediately if it was submitted for the wrong room or is no longer required.
- Rotate `PASSPORT_TOKEN_PEPPER` if pending links may have been exposed. Rotation invalidates all outstanding links.
- Rotate `CONCIERGE_ADMIN_TOKEN` if owner-area access may have been exposed.
- Record and handle any suspected personal-data incident outside the guest-facing concierge; never discuss passport contents with the model.

## Inputs still required

- Confirmation of any future production retention-policy change from the approved 14-day maximum
- Any future owner decision to reintroduce structured manual entry; until then it must remain absent from the guest UI and Worker routes

## Verified reference

- Thai Immigration Bureau TM30 service: `https://tm30.immigration.go.th/TM30/Foreigner/TM30EN/index.html` (checked 13 August 2026)
