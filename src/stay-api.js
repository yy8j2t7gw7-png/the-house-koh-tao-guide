import {
  createProtectedOperationsAlert,
  dispatchConciergeAlert,
  whatsappAlertConfiguration
} from "./whatsapp-alerts.js";

const ACTIVE_LISTINGS = Object.freeze({
  "1376393324098439141": "1",
  "1349840459014476583": "2",
  "1384302186705645424": "3",
  "1375985816338609953": "4",
  "1504732379219115485": "5",
  "1504212652507496103": "6",
  "1376397702280299752": "8",
  "1357684595355823468": "9",
  "1617732490715138330": "10",
  "1384311481900170410": "11"
});

const ACTIVE_ROOMS = new Set(Object.values(ACTIVE_LISTINGS));
const CONFIRMATION_CODE_PATTERN = /^[A-Z0-9]{8,20}$/;
const SESSION_COOKIE = "house_verified_stay";
const MAX_SYNC_RECORDS = 250;
const LOST_KEY_FEE_THB = 500;
const LOST_KEY_REQUEST_TTL_MS = 15 * 60_000;
const SPARE_KEY_VIEW_TTL_MS = 15 * 60_000;
const REGISTRATION_COMPLETE_STATUSES = new Set(["thai_exempt", "passport_complete", "in_person_complete"]);
const ROOM_DETAILS = Object.freeze({
  "1": { floor: "Upstairs", photo: "photo-06.jpeg", note: "Room 1 is upstairs and marked clearly in the building photo." },
  "2": { floor: "Upstairs", photo: "photo-05.jpeg", note: "Room 2 is upstairs and marked clearly in the building photo." },
  "3": { floor: "Upstairs", photo: "photo-09.jpeg", note: "Room 3 is upstairs and marked clearly in the building photo." },
  "4": { floor: "Upstairs", photo: "photo-02.jpeg", note: "Room 4 is upstairs and marked clearly in the building photo." },
  "5": { floor: "Upstairs", photo: "photo-01.jpeg", note: "Rooms 5 and 6 are upstairs around the corner." },
  "6": { floor: "Upstairs", photo: "photo-01.jpeg", note: "Rooms 5 and 6 are upstairs around the corner." },
  "8": { floor: "Downstairs", photo: "photo-10.jpeg", note: "Room 8 is downstairs and marked clearly in the building photo." },
  "9": { floor: "Downstairs", photo: "photo-03.jpeg", note: "Room 9 is downstairs and marked clearly in the building photo." },
  "10": { floor: "Downstairs", photo: "photo-08.jpeg", note: "Room 10 is downstairs and marked clearly in the building photo." },
  "11": { floor: "Downstairs", photo: "photo-07.jpeg", note: "Room 11 is downstairs and marked clearly in the building photo." }
});

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "pragma": "no-cache",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...extraHeaders
    }
  });
}

async function readJson(request, maximumBytes = 24_000) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maximumBytes) return null;
  const text = await request.text();
  if (text.length > maximumBytes) return null;
  try {
    return JSON.parse(text || "{}");
  } catch (_error) {
    return null;
  }
}

function getStore(env) {
  if (!env.CONCIERGE_STORE?.getByName) return null;
  return env.CONCIERGE_STORE.getByName("the-house-concierge-global");
}

function constantTimeEqual(leftValue, rightValue) {
  const left = String(leftValue || "");
  const right = String(rightValue || "");
  const maximum = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maximum; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function normalizeConfirmationCode(value) {
  const code = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return CONFIRMATION_CODE_PATTERN.test(code) ? code : "";
}

function validDate(value) {
  const date = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : "";
}

function base64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken() {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

function randomDirectStayCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `HS${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret || "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(value || "")));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64UrlText(value) {
  return base64Url(new TextEncoder().encode(String(value || "")));
}

function decodeBase64UrlText(value) {
  const source = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = source.padEnd(Math.ceil(source.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
  } catch (_error) {
    return "";
  }
}

async function lostKeySessionBinding(session, env) {
  return (await hmac(
    `lost-key-binding:${session.id}:${session.reservationId}:${session.room}`,
    env.STAY_TOKEN_PEPPER
  )).slice(0, 40);
}

async function createLostKeyRequestToken(session, env, now = new Date()) {
  const payload = base64UrlText(JSON.stringify({
    version: 1,
    requestId: randomToken().slice(0, 32),
    binding: await lostKeySessionBinding(session, env),
    issuedAt: now.getTime(),
    expiresAt: now.getTime() + LOST_KEY_REQUEST_TTL_MS
  }));
  const signature = await hmac(`lost-key-request:${payload}`, env.STAY_TOKEN_PEPPER);
  return `${payload}.${signature}`;
}

async function validLostKeyRequestToken(value, session, env, now = new Date()) {
  const [payload, signature, extra] = String(value || "").split(".");
  if (extra !== undefined || !/^[A-Za-z0-9_-]{40,400}$/.test(payload || "") || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  const expected = await hmac(`lost-key-request:${payload}`, env.STAY_TOKEN_PEPPER);
  if (!constantTimeEqual(signature, expected)) return false;
  let decoded;
  try {
    decoded = JSON.parse(decodeBase64UrlText(payload));
  } catch (_error) {
    return false;
  }
  const timestamp = now.getTime();
  const valid = decoded?.version === 1
    && /^[A-Za-z0-9_-]{20,50}$/.test(String(decoded.requestId || ""))
    && constantTimeEqual(decoded.binding, await lostKeySessionBinding(session, env))
    && Number(decoded.issuedAt) <= timestamp + 30_000
    && Number(decoded.expiresAt) >= timestamp
    && Number(decoded.expiresAt) - Number(decoded.issuedAt) === LOST_KEY_REQUEST_TTL_MS;
  return valid ? decoded : null;
}

async function createSpareKeyViewToken(session, eventId, requestHash, env, now = new Date()) {
  const payload = base64UrlText(JSON.stringify({
    version: 1,
    eventId,
    requestHash,
    binding: await lostKeySessionBinding(session, env),
    feeAccepted: true,
    notificationAccepted: true,
    issuedAt: now.getTime(),
    expiresAt: now.getTime() + SPARE_KEY_VIEW_TTL_MS
  }));
  const signature = await hmac(`spare-key-view:${payload}`, env.STAY_TOKEN_PEPPER);
  return `${payload}.${signature}`;
}

async function validSpareKeyViewToken(value, session, env, now = new Date()) {
  const [payload, signature, extra] = String(value || "").split(".");
  if (extra !== undefined || !/^[A-Za-z0-9_-]{80,800}$/.test(payload || "") || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  const expected = await hmac(`spare-key-view:${payload}`, env.STAY_TOKEN_PEPPER);
  if (!constantTimeEqual(signature, expected)) return false;
  let decoded;
  try {
    decoded = JSON.parse(decodeBase64UrlText(payload));
  } catch (_error) {
    return false;
  }
  const timestamp = now.getTime();
  const valid = decoded?.version === 1
    && /^key_[A-Za-z0-9-]{20,80}$/.test(String(decoded.eventId || ""))
    && /^[a-f0-9]{64}$/.test(String(decoded.requestHash || ""))
    && constantTimeEqual(decoded.binding, await lostKeySessionBinding(session, env))
    && decoded.feeAccepted === true
    && decoded.notificationAccepted === true
    && Number(decoded.issuedAt) <= timestamp + 30_000
    && Number(decoded.expiresAt) >= timestamp
    && Number(decoded.expiresAt) - Number(decoded.issuedAt) === SPARE_KEY_VIEW_TTL_MS;
  return valid ? decoded : null;
}

function cookies(request) {
  const result = {};
  for (const item of String(request.headers.get("cookie") || "").split(";")) {
    const separator = item.indexOf("=");
    if (separator < 1) continue;
    result[item.slice(0, separator).trim()] = item.slice(separator + 1).trim();
  }
  return result;
}

function sessionCookie(token, maximumAge) {
  return `${SESSION_COOKIE}=${token}; Max-Age=${Math.max(0, maximumAge)}; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function bangkokDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function sessionExpiry(checkOutDate, now = new Date()) {
  const checkoutEnd = new Date(`${checkOutDate}T11:00:00+07:00`);
  const thirtyDays = new Date(now.getTime() + (30 * 86_400_000));
  return new Date(Math.min(checkoutEnd.getTime(), thirtyDays.getTime()));
}

function reservationIsAvailable(reservation, now = new Date()) {
  return reservation?.status === "confirmed"
    && now < new Date(`${reservation.checkOutDate}T11:00:00+07:00`);
}

function activeStay(reservation, now = new Date()) {
  return (reservation?.status === "confirmed" || reservation?.reservationStatus === "confirmed")
    && now >= new Date(`${reservation.checkInDate}T14:00:00+07:00`)
    && now < new Date(`${reservation.checkOutDate}T11:00:00+07:00`);
}

function cleanGuestFirstName(value) {
  const name = String(value || "").trim().replace(/[^\p{L}' -]/gu, "").replace(/\s+/g, " ").slice(0, 40);
  return name.length >= 2 ? name : "";
}

async function rateAllowed(env, request, purpose) {
  const binding = purpose === "spare-key" ? env.SPARE_KEY_RATE_LIMITER : env.STAY_VERIFY_RATE_LIMITER;
  if (!binding?.limit) return true;
  const forwarded = request.headers.get("cf-connecting-ip") || "unknown";
  try {
    const result = await binding.limit({ key: `${purpose}:${forwarded}` });
    return Boolean(result?.success);
  } catch (_error) {
    return true;
  }
}

async function verifiedSession(request, env, store, now = new Date()) {
  const token = cookies(request)[SESSION_COOKIE] || "";
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token) || !env.STAY_TOKEN_PEPPER) return null;
  const tokenHash = await hmac(`session:${token}`, env.STAY_TOKEN_PEPPER);
  const session = await store.getVerifiedStaySession(tokenHash, now.toISOString());
  if (!session) return null;
  const currentCheckout = new Date(`${session.checkOutDate}T11:00:00+07:00`);
  if (!Number.isFinite(currentCheckout.getTime()) || now >= currentCheckout) return null;
  return session;
}

function registrationComplete(status) {
  return REGISTRATION_COMPLETE_STATUSES.has(String(status || ""));
}

export async function getGuestAccess(request, env, requestedRoom = "") {
  const store = getStore(env);
  if (!store || !env.STAY_TOKEN_PEPPER) {
    return { verified: false, accessGranted: false, room: requestedRoom, registrationStatus: "not_started" };
  }
  const session = await verifiedSession(request, env, store);
  if (!session || (requestedRoom && session.room !== requestedRoom)) {
    return { verified: false, accessGranted: false, room: requestedRoom, registrationStatus: "not_started" };
  }
  const registration = await store.getStayRegistrationStatus(session.reservationId);
  const registrationStatus = registration?.status || "not_started";
  return {
    verified: true,
    accessGranted: registrationComplete(registrationStatus),
    room: session.room,
    session,
    registrationStatus,
    guestType: registration?.guestType || (registrationStatus === "thai_exempt" ? "thai" : ""),
    requiredPassports: Number(registration?.requiredPassports) || 0,
    receivedPassports: Number(registration?.receivedPassports) || (registrationStatus === "passport_received" ? 1 : 0)
  };
}

async function protectedRoomAsset(request, env, access, assetName) {
  if (!access.accessGranted || !assetName) return json({ error: "guest_registration_required" }, 403);
  const assetUrl = new URL(`/assets/${assetName}`, request.url);
  const response = await env.ASSETS.fetch(new Request(assetUrl, { headers: request.headers }));
  const headers = new Headers(response.headers);
  headers.set("cache-control", "private, no-store, max-age=0");
  headers.set("x-content-type-options", "nosniff");
  headers.set("cross-origin-resource-policy", "same-origin");
  headers.set("referrer-policy", "no-referrer");
  return new Response(response.body, { status: response.status, headers });
}

function parseKeyCodes(env) {
  let values;
  try {
    values = JSON.parse(String(env.SPARE_KEY_CODES || "{}"));
  } catch (_error) {
    return {};
  }
  const result = {};
  for (const room of ACTIVE_ROOMS) {
    const code = String(values?.[room] || "").trim();
    if (/^[A-Za-z0-9*#-]{3,20}$/.test(code)) result[room] = code;
  }
  return result;
}

export function stayConfiguration(env) {
  const keyCodes = parseKeyCodes(env);
  const alerts = whatsappAlertConfiguration(env);
  const urgentNotificationsReady = alerts.configured && Number(alerts.groupCounts?.lost_key_team) >= 3;
  return {
    configured: Boolean(env.CONCIERGE_STORE && env.STAY_TOKEN_PEPPER && env.RESERVATION_SYNC_TOKEN),
    reservationSyncConfigured: Boolean(env.RESERVATION_SYNC_TOKEN && env.STAY_TOKEN_PEPPER),
    secureSpareKeyEnabled: Boolean(env.STAY_TOKEN_PEPPER && Object.keys(keyCodes).length && urgentNotificationsReady),
    urgentNotificationsReady,
    configuredKeyRooms: Object.keys(keyCodes).sort((left, right) => Number(left) - Number(right)),
    activeRooms: [...ACTIVE_ROOMS].sort((left, right) => Number(left) - Number(right))
  };
}

export async function handleReservationSyncRequest(request, env) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  if (!env.RESERVATION_SYNC_TOKEN || !env.STAY_TOKEN_PEPPER) return json({ error: "reservation_sync_unavailable" }, 503);
  const authorization = request.headers.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!constantTimeEqual(supplied, env.RESERVATION_SYNC_TOKEN)) return json({ error: "unauthorized" }, 401);
  const body = await readJson(request, 160_000);
  if (!body || !Array.isArray(body.records) || body.records.length > MAX_SYNC_RECORDS) {
    return json({ error: "invalid_request" }, 400);
  }
  const listingId = String(body.listingId || "").replace(/\D/g, "");
  const room = String(body.room || "");
  if (!listingId || ACTIVE_LISTINGS[listingId] !== room) return json({ error: "listing_room_mismatch" }, 400);
  const store = getStore(env);
  if (!store) return json({ error: "reservation_store_unavailable" }, 503);

  const records = [];
  for (const record of body.records) {
    const confirmationCode = normalizeConfirmationCode(record?.confirmationCode);
    const checkInDate = validDate(record?.checkInDate);
    const checkOutDate = validDate(record?.checkOutDate);
    if (!confirmationCode || !checkInDate || !checkOutDate || checkOutDate < checkInDate) continue;
    records.push({
      confirmationCodeHash: await hmac(`reservation:${confirmationCode}`, env.STAY_TOKEN_PEPPER),
      guestFirstName: cleanGuestFirstName(record?.guestFirstName),
      checkInDate,
      checkOutDate,
      status: record?.status === "cancelled" ? "cancelled" : "confirmed",
      sourceRefHash: record?.sourceRef
        ? await hmac(`source:${String(record.sourceRef).slice(0, 300)}`, env.STAY_TOKEN_PEPPER)
        : ""
    });
  }
  const syncId = `sync_${crypto.randomUUID()}`;
  const result = await store.syncStayReservations({
    provider: "airbnb",
    listingId,
    room,
    syncId,
    records,
    complete: body.complete === true,
    syncedAt: new Date().toISOString()
  });
  return json({ ok: true, accepted: result.upserted, rejected: body.records.length - records.length });
}

export async function handleStayGuestRequest(request, env, path, ctx, now = new Date()) {
  const store = getStore(env);
  if (!store || !env.STAY_TOKEN_PEPPER) return json({ error: "stay_verification_unavailable" }, 503);
  if (!sameOrigin(request)) return json({ error: "invalid_origin" }, 403);

  if (path === "/api/stay/status") {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
    const requestedRoom = new URL(request.url).searchParams.get("room") || "";
    if (requestedRoom && !ACTIVE_ROOMS.has(requestedRoom)) return json({ error: requestedRoom === "7" ? "room_not_active" : "invalid_room" }, 400);
    const session = await verifiedSession(request, env, store, now);
    if (!session || (requestedRoom && session.room !== requestedRoom)) {
      return json({
        verified: false,
        conciergeAccess: "unverified",
        registrationIncomplete: false,
        room: requestedRoom
      });
    }
    const room = session.room;
    const registration = await store.getStayRegistrationStatus(session.reservationId);
    const registrationStatus = registration?.status || "not_started";
    const spareKey = await store.getSpareKeyState(session.reservationId, room);
    const stayIsActive = activeStay(session, now);
    const spareKeyAvailable = stayIsActive && !spareKey.releasedForReservation && !spareKey.rotationRequired;
    return json({
      verified: true,
      conciergeAccess: "verified",
      room,
      checkInDate: session.checkInDate,
      checkOutDate: session.checkOutDate,
      activeStay: stayIsActive,
      registrationStatus,
      accessGranted: registrationComplete(registrationStatus),
      registrationIncomplete: !registrationComplete(registrationStatus),
      guestFirstName: session.guestFirstName || "",
      guestType: registration?.guestType || (registrationStatus === "thai_exempt" ? "thai" : ""),
      requiredPassports: Number(registration?.requiredPassports) || 0,
      receivedPassports: Number(registration?.receivedPassports) || (registrationStatus === "passport_received" ? 1 : 0),
      lostKeyFeeThb: LOST_KEY_FEE_THB,
      feeAccepted: false,
      spareKeyReleased: spareKey.releasedForReservation,
      keyCodeRotationRequired: spareKey.rotationRequired,
      lostKeyRequestToken: spareKeyAvailable ? await createLostKeyRequestToken(session, env, now) : ""
    });
  }

  if (path === "/api/stay/verify") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    if (!(await rateAllowed(env, request, "verify"))) return json({ error: "rate_limited" }, 429);
    const body = await readJson(request, 2_000);
    const room = String(body?.room || "");
    const confirmationCode = normalizeConfirmationCode(body?.confirmationCode);
    if (!ACTIVE_ROOMS.has(room)) return json({ error: room === "7" ? "room_not_active" : "invalid_room" }, 400);
    if (!confirmationCode) return json({ error: "invalid_confirmation_code" }, 400);
    const codeHash = await hmac(`reservation:${confirmationCode}`, env.STAY_TOKEN_PEPPER);
    const reservation = await store.getStayReservationByCodeHash(codeHash, room);
    if (!reservation || !reservationIsAvailable(reservation, now)) return json({ error: "reservation_not_found" }, 404);
    const token = randomToken();
    const tokenHash = await hmac(`session:${token}`, env.STAY_TOKEN_PEPPER);
    const expiresAt = sessionExpiry(reservation.checkOutDate, now);
    await store.createVerifiedStaySession({
      id: `session_${crypto.randomUUID()}`,
      tokenHash,
      reservationId: reservation.id,
      room,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    const maximumAge = Math.max(60, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
    return json({
      ok: true,
      verified: true,
      room,
      guestFirstName: reservation.guestFirstName || "",
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate
    }, 200, { "set-cookie": sessionCookie(token, maximumAge) });
  }

  if (path === "/api/stay/logout") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const token = cookies(request)[SESSION_COOKIE] || "";
    if (/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
      const tokenHash = await hmac(`session:${token}`, env.STAY_TOKEN_PEPPER);
      await store.revokeVerifiedStaySession(tokenHash, new Date().toISOString());
    }
    return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
  }

  const session = await verifiedSession(request, env, store, now);
  if (!session) return json({ error: "stay_verification_required" }, 401);

  const registration = await store.getStayRegistrationStatus(session.reservationId);
  const registrationStatus = registration?.status || "not_started";

  if (path === "/api/stay/nationality") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request, 2_000);
    if (body?.nationality === "thai") {
      if (body?.allGuestsThai !== true) return json({ error: "all_thai_confirmation_required" }, 400);
      if (registration?.guestType === "foreign" || Number(registration?.receivedPassports) > 0) {
        return json({ error: "guest_type_change_requires_staff" }, 409);
      }
      const updatedAt = new Date().toISOString();
      await store.closePendingPassportLinksForReservation(session.reservationId, updatedAt);
      const result = typeof store.setStayRegistrationRequirement === "function"
        ? await store.setStayRegistrationRequirement(session.reservationId, "thai", 0, updatedAt)
        : await store.setStayRegistrationStatus(session.reservationId, "thai_exempt", updatedAt).then(() => ({ status: "thai_exempt" }));
      return json({ ok: true, accessGranted: true, registrationStatus: result.status, guestType: "thai" });
    }
    if (body?.nationality === "foreign") {
      const requiredPassports = Number(body?.nonThaiGuestCount);
      if (body?.allNonThaiGuestsIncluded !== true) {
        return json({ error: "all_non_thai_guests_confirmation_required" }, 400);
      }
      if (!Number.isInteger(requiredPassports) || requiredPassports < 1 || requiredPassports > 10) {
        return json({ error: "invalid_non_thai_guest_count" }, 400);
      }
      if (registration?.guestType === "foreign" && requiredPassports < Number(registration?.requiredPassports || 0)) {
        return json({ error: "passport_requirement_cannot_be_reduced" }, 409);
      }
      if (typeof store.setStayRegistrationRequirement !== "function") {
        await store.setStayRegistrationStatus(session.reservationId, "passport_pending", new Date().toISOString());
        return json({ ok: true, accessGranted: false, registrationStatus: "passport_pending", guestType: "foreign", requiredPassports, receivedPassports: 0 });
      }
      const result = await store.setStayRegistrationRequirement(
        session.reservationId,
        "foreign",
        requiredPassports,
        new Date().toISOString()
      );
      return json({
        ok: true,
        accessGranted: registrationComplete(result.status),
        registrationStatus: result.status,
        guestType: "foreign",
        requiredPassports: result.requiredPassports,
        receivedPassports: result.receivedPassports
      });
    }
    return json({ error: "invalid_nationality" }, 400);
  }

  if (path === "/api/stay/passport-link") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    if (!env.PASSPORT_UPLOADS || !env.PASSPORT_TOKEN_PEPPER) return json({ error: "passport_upload_unavailable" }, 503);
    if (registration?.guestType !== "foreign" && !["passport_pending", "passport_complete"].includes(registrationStatus)) {
      return json({ error: "foreign_registration_required" }, 409);
    }
    if (registrationStatus === "in_person_pending" && typeof store.setStayRegistrationRequirement === "function") {
      await store.setStayRegistrationRequirement(
        session.reservationId,
        "foreign",
        Math.max(1, Number(registration?.requiredPassports) || 1),
        new Date().toISOString()
      );
    }
    const token = randomToken();
    const tokenHash = await hmac(token, env.PASSPORT_TOKEN_PEPPER);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (72 * 3_600_000)).toISOString();
    const id = `pass_${crypto.randomUUID()}`;
    const result = await store.createAutomaticPassportUpload({
      id,
      tokenHash,
      room: session.room,
      reservationId: session.reservationId,
      createdAt,
      arrivalAt: `${session.checkInDate}T14:00:00+07:00`,
      expiresAt
    });
    if (!result?.ok) return json({ error: result?.error || "passport_request_unavailable" }, 409);
    const origin = new URL(request.url).origin;
    return json({ ok: true, uploadUrl: `${origin}/passport-upload#token=${token}`, expiresAt });
  }

  if (path === "/api/stay/in-person-passports") {
    return json({ error: "not_found" }, 404);
  }

  if (path === "/api/stay/thai-exemption") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request, 2_000);
    if (body?.allGuestsThai !== true) return json({ error: "all_thai_confirmation_required" }, 400);
    if (registration?.guestType === "foreign" || Number(registration?.receivedPassports) > 0 || registrationStatus === "passport_complete") {
      return json({ error: "guest_type_change_requires_staff" }, 409);
    }
    const updatedAt = new Date().toISOString();
    await store.closePendingPassportLinksForReservation(session.reservationId, updatedAt);
    if (typeof store.setStayRegistrationRequirement === "function") {
      await store.setStayRegistrationRequirement(session.reservationId, "thai", 0, updatedAt);
    } else {
      await store.setStayRegistrationStatus(session.reservationId, "thai_exempt", updatedAt);
    }
    return json({ ok: true, registrationStatus: "thai_exempt" });
  }

  if (path === "/api/stay/room-content") {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
    const room = new URL(request.url).searchParams.get("room") || "";
    const access = await getGuestAccess(request, env, room);
    if (!access.verified) return json({ error: "stay_verification_required" }, 401);
    if (!access.accessGranted) return json({ error: "guest_registration_required" }, 403);
    const details = ROOM_DETAILS[room];
    if (!details) return json({ error: "invalid_room" }, 400);
    return json({
      room,
      guestFirstName: access.session?.guestFirstName || "",
      floor: details.floor,
      note: details.note,
      roomPhotoUrl: `/api/stay/room-photo?room=${encodeURIComponent(room)}`,
      entrancePhotoUrl: `/api/stay/entrance-photo?room=${encodeURIComponent(room)}`
    });
  }

  if (path === "/api/stay/room-photo" || path === "/api/stay/entrance-photo") {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
    const room = new URL(request.url).searchParams.get("room") || "";
    const access = await getGuestAccess(request, env, room);
    const assetName = path.endsWith("entrance-photo") ? "photo-04.jpeg" : ROOM_DETAILS[room]?.photo;
    return protectedRoomAsset(request, env, access, assetName);
  }

  if (path === "/api/stay/spare-key") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    // Stay verification, not passport-registration completion, is the
    // authorization boundary for lost-key help. The verified session and
    // active-stay checks below still bind access to the current stay/room.
    if (!(await rateAllowed(env, request, "spare-key"))) return json({ error: "rate_limited" }, 429);
    const body = await readJson(request, 2_000);
    if (body?.feeAccepted !== true) return json({ error: "fee_acceptance_required" }, 400);
    if (!activeStay(session, now)) return json({ error: "active_stay_required" }, 403);
    const state = await store.getSpareKeyState(session.reservationId, session.room);
    if (state.rotationRequired) return json({ error: "key_code_rotation_required" }, 409);
    if (state.releasedForReservation) return json({ error: "spare_key_already_released" }, 409);
    const lostKeyRequest = await validLostKeyRequestToken(body?.lostKeyRequestToken, session, env, now);
    if (!lostKeyRequest) {
      return json({ error: "lost_key_request_required" }, 400);
    }
    const requestHash = await hmac(
      `lost-key-request-id:${lostKeyRequest.requestId}:${lostKeyRequest.binding}`,
      env.STAY_TOKEN_PEPPER
    );
    if (!parseKeyCodes(env)[session.room]) return json({ error: "spare_key_not_configured" }, 503);
    const alertConfiguration = whatsappAlertConfiguration(env);
    if (!alertConfiguration.configured || Number(alertConfiguration.groupCounts?.lost_key_team) < 3) {
      return json({ error: "team_notification_unavailable" }, 503);
    }
    const eventId = `key_${crypto.randomUUID()}`;
    const claim = await store.claimSpareKeyRelease({
      id: eventId,
      reservationId: session.reservationId,
      room: session.room,
      requestHash,
      createdAt: now.toISOString()
    });
    if (!claim?.ok) return json({ error: claim?.error || "spare_key_unavailable" }, 409);

    let alert = null;
    let delivery = { attempted: 0, accepted: 0 };
    try {
      alert = await createProtectedOperationsAlert({
        env,
        room: session.room,
        alertType: "verified_spare_key_release",
        severity: "urgent",
        recipientGroup: "lost_key_team",
        summary: `Verified guest in Room ${session.room} requested the spare key and explicitly accepted the ${LOST_KEY_FEE_THB} THB lost-key fee for this request. Rotate the key-box code before another automatic release.`,
        escalationRequired: false,
        now
      });
      if (alert) delivery = await dispatchConciergeAlert({ ...alert, duplicate: false }, env);
    } catch (_error) {
      delivery = { attempted: 0, accepted: 0 };
    }
    if (delivery.accepted < 1) {
      await store.cancelSpareKeyClaim(eventId).catch(() => {});
      return json({ error: "team_notification_failed" }, 503);
    }

    const authorized = await store.authorizeSpareKeyView({
      id: eventId,
      reservationId: session.reservationId,
      room: session.room,
      requestHash,
      alertId: alert?.id || "",
      createdAt: now.toISOString()
    });
    if (!authorized?.ok) {
      await store.cancelSpareKeyClaim(eventId).catch(() => {});
      return json({ error: "spare_key_authorization_failed" }, 503);
    }
    return json({
      ok: true,
      room: session.room,
      lostKeyFeeThb: LOST_KEY_FEE_THB,
      teamNotificationSubmitted: true,
      canViewSpareKey: true,
      spareKeyViewToken: await createSpareKeyViewToken(session, eventId, requestHash, env, now)
    });
  }

  if (path === "/api/stay/spare-key/view") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    if (!(await rateAllowed(env, request, "spare-key-view"))) return json({ error: "rate_limited" }, 429);
    const body = await readJson(request, 2_000);
    if (!activeStay(session, now)) return json({ error: "active_stay_required" }, 403);
    const authorization = await validSpareKeyViewToken(body?.spareKeyViewToken, session, env, now);
    if (!authorization) return json({ error: "lost_key_view_required" }, 400);
    const state = await store.getSpareKeyState(session.reservationId, session.room);
    if (state.rotationRequired) return json({ error: "key_code_rotation_required" }, 409);
    if (state.releasedForReservation) return json({ error: "spare_key_already_released" }, 409);
    const keyCode = parseKeyCodes(env)[session.room] || "";
    if (!keyCode) return json({ error: "spare_key_not_configured" }, 503);
    const finalized = await store.finalizeSpareKeyRelease({
      id: authorization.eventId,
      reservationId: session.reservationId,
      room: session.room,
      requestHash: authorization.requestHash,
      createdAt: now.toISOString()
    });
    if (!finalized?.ok) return json({ error: finalized?.error || "lost_key_view_required" }, 409);
    return json({
      ok: true,
      room: session.room,
      location: "The key box is directly next to your room door.",
      keyBoxCode: keyCode,
      lostKeyFeeThb: LOST_KEY_FEE_THB,
      teamNotificationSubmitted: true
    });
  }

  return json({ error: "not_found" }, 404);
}

export async function handleStayAdminRequest(request, env, path, store) {
  if (path === "/api/concierge/admin/stays") {
    if (request.method === "GET") return json(await store.getStayOperationsOverview());
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "GET, POST" });
    const body = await readJson(request, 4_000);
    const room = String(body?.room || "");
    const listingId = String(body?.listingId || Object.entries(ACTIVE_LISTINGS).find(([, mappedRoom]) => mappedRoom === room)?.[0] || "");
    const confirmationCode = normalizeConfirmationCode(body?.confirmationCode);
    const checkInDate = validDate(body?.checkInDate);
    const checkOutDate = validDate(body?.checkOutDate);
    if (ACTIVE_LISTINGS[listingId] !== room || !confirmationCode || !checkInDate || !checkOutDate || checkOutDate < checkInDate) {
      return json({ error: "invalid_request" }, 400);
    }
    const confirmationCodeHash = await hmac(`reservation:${confirmationCode}`, env.STAY_TOKEN_PEPPER);
    const result = await store.syncStayReservations({
      provider: "manual",
      listingId,
      room,
      syncId: `manual_${crypto.randomUUID()}`,
      complete: false,
      syncedAt: new Date().toISOString(),
      records: [{ confirmationCodeHash, checkInDate, checkOutDate, sourceRefHash: "" }]
    });
    return json({ ok: true, accepted: result.upserted });
  }

  if (path === "/api/concierge/admin/direct-stays") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    if (!env.STAY_TOKEN_PEPPER) return json({ error: "stay_verification_unavailable" }, 503);
    const body = await readJson(request, 4_000);
    const room = String(body?.room || "");
    const checkInDate = validDate(body?.checkInDate);
    const checkOutDate = validDate(body?.checkOutDate);
    if (!ACTIVE_ROOMS.has(room) || !checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
      return json({ error: "invalid_request" }, 400);
    }
    const confirmationCode = randomDirectStayCode();
    const confirmationCodeHash = await hmac(`reservation:${confirmationCode}`, env.STAY_TOKEN_PEPPER);
    const result = await store.syncStayReservations({
      provider: "direct",
      listingId: `house-direct-${room}`,
      room,
      syncId: `direct_${crypto.randomUUID()}`,
      complete: false,
      syncedAt: new Date().toISOString(),
      records: [{ confirmationCodeHash, checkInDate, checkOutDate, sourceRefHash: "" }]
    });
    if (result.upserted !== 1) return json({ error: "stay_creation_failed" }, 503);
    return json({
      ok: true,
      room,
      checkInDate,
      checkOutDate,
      confirmationCode,
      welcomeUrl: `${new URL(request.url).origin}/room/${encodeURIComponent(room)}`
    });
  }

  if (path === "/api/concierge/admin/stay-extension") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request, 2_000);
    const reservationId = String(body?.reservationId || "");
    const checkOutDate = validDate(body?.checkOutDate);
    if (!/^stay_[A-Za-z0-9-]{20,}$/.test(reservationId) || !checkOutDate) {
      return json({ error: "invalid_request" }, 400);
    }
    const result = await store.extendStayReservation(reservationId, checkOutDate, new Date().toISOString());
    return json(result, result.ok ? 200 : 400);
  }

  if (path === "/api/concierge/admin/registration-reset") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request, 2_000);
    const reservationId = String(body?.reservationId || "");
    if (!/^stay_[A-Za-z0-9-]{20,}$/.test(reservationId) || body?.confirmed !== true) {
      return json({ error: "invalid_request" }, 400);
    }
    if (typeof store.resetPendingInPersonRegistration !== "function") {
      return json({ error: "registration_reset_unavailable" }, 503);
    }
    const result = await store.resetPendingInPersonRegistration(
      reservationId,
      new Date().toISOString()
    );
    return json(result, result.ok ? 200 : 409);
  }

  if (path === "/api/concierge/admin/in-person-registration/start") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request, 2_000);
    const reservationId = String(body?.reservationId || "");
    const requiredPassports = Number(body?.nonThaiGuestCount);
    if (
      !/^stay_[A-Za-z0-9-]{20,}$/.test(reservationId) ||
      body?.confirmed !== true ||
      !Number.isInteger(requiredPassports) ||
      requiredPassports < 1 ||
      requiredPassports > 10
    ) {
      return json({ error: "invalid_request" }, 400);
    }
    if (typeof store.startInPersonRegistration !== "function") {
      return json({ error: "in_person_registration_unavailable" }, 503);
    }
    const result = await store.startInPersonRegistration(
      reservationId,
      requiredPassports,
      new Date().toISOString()
    );
    return json(result, result.ok ? 200 : 409);
  }

  if (path === "/api/concierge/admin/in-person-registration") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request, 2_000);
    const reservationId = String(body?.reservationId || "");
    if (!/^stay_[A-Za-z0-9-]{20,}$/.test(reservationId) || body?.registrationCompleted !== true) {
      return json({ error: "invalid_request" }, 400);
    }
    if (typeof store.setInPersonRegistrationStatus !== "function") {
      return json({ error: "in_person_registration_unavailable" }, 503);
    }
    const result = await store.setInPersonRegistrationStatus(
      reservationId,
      "in_person_complete",
      new Date().toISOString()
    );
    return json(result, result.ok ? 200 : 409);
  }

  if (path === "/api/concierge/admin/spare-key-rotation-activity/delete") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request, 2_000);
    const eventId = String(body?.eventId || "");
    if (!/^key_reset_[A-Za-z0-9-]{20,}$/.test(eventId) || body?.confirmed !== true) {
      return json({ error: "invalid_request" }, 400);
    }
    if (typeof store.deleteSpareKeyRotationActivity !== "function") {
      return json({ error: "rotation_activity_delete_unavailable" }, 503);
    }
    const result = await store.deleteSpareKeyRotationActivity(eventId);
    return json(result, result.ok ? 200 : 404);
  }

  if (path === "/api/concierge/admin/spare-key-rotation") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request, 2_000);
    const room = String(body?.room || "");
    const resetMode = ["controlled_test", "physical_rotation"].includes(body?.resetMode) ? body.resetMode : "";
    const requiredConfirmation = resetMode === "controlled_test" ? "KEEP EXISTING CODE" : "CODE ROTATED";
    if (!ACTIVE_ROOMS.has(room) || !resetMode || body?.confirmed !== true || body?.confirmation !== requiredConfirmation) {
      return json({ error: "invalid_request" }, 400);
    }
    const result = await store.confirmSpareKeyRotation(room, new Date().toISOString(), resetMode);
    return json(result, result.ok ? 200 : 409);
  }

  return null;
}

export const listingRoomMap = ACTIVE_LISTINGS;
