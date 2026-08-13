import { isAfterHours } from "./alert-policy.js";
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

async function verifiedSession(request, env, store) {
  const token = cookies(request)[SESSION_COOKIE] || "";
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token) || !env.STAY_TOKEN_PEPPER) return null;
  const tokenHash = await hmac(`session:${token}`, env.STAY_TOKEN_PEPPER);
  return store.getVerifiedStaySession(tokenHash, new Date().toISOString());
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
  const urgentNotificationsReady = alerts.configured && Number(alerts.groupCounts?.urgent) > 0;
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
    const room = new URL(request.url).searchParams.get("room") || "";
    if (!ACTIVE_ROOMS.has(room)) return json({ error: room === "7" ? "room_not_active" : "invalid_room" }, 400);
    const session = await verifiedSession(request, env, store);
    if (!session || session.room !== room) return json({ verified: false, room });
    const registration = await store.getStayRegistrationStatus(session.reservationId);
    const spareKey = await store.getSpareKeyState(session.reservationId, room);
    return json({
      verified: true,
      room,
      checkInDate: session.checkInDate,
      checkOutDate: session.checkOutDate,
      activeStay: activeStay(session, now),
      afterHours: isAfterHours(now),
      registrationStatus: registration?.status || "not_started",
      lostKeyFeeThb: LOST_KEY_FEE_THB,
      spareKeyReleased: spareKey.releasedForReservation,
      keyCodeRotationRequired: spareKey.rotationRequired
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

  const session = await verifiedSession(request, env, store);
  if (!session) return json({ error: "stay_verification_required" }, 401);

  if (path === "/api/stay/passport-link") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    if (!env.PASSPORT_UPLOADS || !env.PASSPORT_TOKEN_PEPPER) return json({ error: "passport_upload_unavailable" }, 503);
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

  if (path === "/api/stay/thai-exemption") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request, 2_000);
    if (body?.allGuestsThai !== true) return json({ error: "all_thai_confirmation_required" }, 400);
    const registration = await store.getStayRegistrationStatus(session.reservationId);
    if (registration?.status === "passport_received") {
      return json({ error: "passport_already_received" }, 409);
    }
    const updatedAt = new Date().toISOString();
    await store.closePendingPassportLinksForReservation(session.reservationId, updatedAt);
    await store.setStayRegistrationStatus(session.reservationId, "thai_exempt", updatedAt);
    return json({ ok: true, registrationStatus: "thai_exempt" });
  }

  if (path === "/api/stay/spare-key") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    if (!(await rateAllowed(env, request, "spare-key"))) return json({ error: "rate_limited" }, 429);
    const body = await readJson(request, 2_000);
    if (body?.feeAccepted !== true) return json({ error: "fee_acceptance_required" }, 400);
    if (!activeStay(session, now)) return json({ error: "active_stay_required" }, 403);
    if (!isAfterHours(now)) return json({ error: "available_after_hours_only" }, 403);
    const keyCode = parseKeyCodes(env)[session.room] || "";
    if (!keyCode) return json({ error: "spare_key_not_configured" }, 503);
    const alertConfiguration = whatsappAlertConfiguration(env);
    if (!alertConfiguration.configured || Number(alertConfiguration.groupCounts?.urgent) < 1) {
      return json({ error: "team_notification_unavailable" }, 503);
    }
    const state = await store.getSpareKeyState(session.reservationId, session.room);
    if (state.rotationRequired) return json({ error: "key_code_rotation_required" }, 409);
    if (state.releasedForReservation) return json({ error: "spare_key_already_released" }, 409);

    const eventId = `key_${crypto.randomUUID()}`;
    const claim = await store.claimSpareKeyRelease({
      id: eventId,
      reservationId: session.reservationId,
      room: session.room,
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
        recipientGroup: "urgent",
        summary: `Verified Airbnb guest in Room ${session.room} requested the spare key and confirmed the ${LOST_KEY_FEE_THB} THB lost-key fee. Rotate the key-box code before another automatic release.`,
        escalationRequired: true,
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

    const finalized = await store.finalizeSpareKeyRelease({
      id: eventId,
      reservationId: session.reservationId,
      room: session.room,
      alertId: alert?.id || "",
      createdAt: now.toISOString()
    });
    if (!finalized?.ok) return json({ error: "spare_key_recording_failed" }, 503);
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

  if (path === "/api/concierge/admin/spare-key-rotation") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request, 2_000);
    const room = String(body?.room || "");
    if (!ACTIVE_ROOMS.has(room) || body?.confirmed !== true) return json({ error: "invalid_request" }, 400);
    return json(await store.confirmSpareKeyRotation(room, new Date().toISOString()));
  }

  return null;
}

export const listingRoomMap = ACTIVE_LISTINGS;
