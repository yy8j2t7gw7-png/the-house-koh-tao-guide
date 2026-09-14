import { beds24ApiRequest, beds24RoomMap, beds24SourceLabel, roomForBeds24Booking } from "./unified-messaging.js";

const HOUSE_ROOMS = Object.freeze(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
const RESERVATION_SOURCES = Object.freeze(["Airbnb", "Booking.com", "Expedia", "Vrbo", "Agoda", "Hostelworld", "Trip.com"]);

function cleanText(value, maximum = 120) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, maximum);
}

function validDate(value) {
  const date = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function shiftedDateOnly(dateOnly, days) {
  const date = new Date(`${dateOnly}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function bangkokDateOnly(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function hmacHex(value, secret) {
  if (!secret) throw new Error("stay_verification_unavailable");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(signed), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bookingResultItem(response) {
  if (Array.isArray(response)) return response[0] || null;
  if (Array.isArray(response?.data)) return response.data[0] || null;
  return response && typeof response === "object" ? response : null;
}

function assertBeds24WriteSucceeded(response, code) {
  const item = bookingResultItem(response);
  if (!item || item.success === false || (Array.isArray(item.errors) && item.errors.length)) {
    const error = new Error(code);
    error.code = code;
    error.provider = item || response;
    throw error;
  }
  return item;
}

function newBeds24BookingId(response) {
  const item = assertBeds24WriteSucceeded(response, "beds24_booking_write_failed");
  const candidates = [
    item?.new?.id,
    item?.new?.bookingId,
    item?.new?.booking?.id,
    item?.id,
    item?.bookingId
  ];
  for (const candidate of candidates) {
    const id = Number(candidate);
    if (Number.isSafeInteger(id) && id > 0) return id;
  }
  const error = new Error("beds24_booking_id_missing");
  error.code = "beds24_booking_id_missing";
  error.provider = item;
  throw error;
}

export function beds24ChannelManagerEnabled(env = {}) {
  return String(env.BEDS24_CHANNEL_MANAGER_ENABLED || "false").toLowerCase() === "true";
}

export function beds24DirectStayProtectionEnabled(env = {}) {
  const configured = Object.prototype.hasOwnProperty.call(env, "BEDS24_DIRECT_STAY_PROTECTION_ENABLED")
    ? env.BEDS24_DIRECT_STAY_PROTECTION_ENABLED
    : env.BEDS24_CHANNEL_MANAGER_ENABLED;
  return String(configured || "false").toLowerCase() === "true";
}

export function beds24DirectStayFastInventorySyncEnabled(env = {}) {
  return String(env.BEDS24_DIRECT_STAY_FAST_INVENTORY_SYNC_ENABLED || "false").toLowerCase() === "true";
}

export function beds24DirectStayProtectionConfiguration(env = {}) {
  const reverse = HOUSE_ROOMS.map((room) => [room, houseRoomToBeds24RoomId(room, env)]);
  const roomMapComplete = reverse.every(([, roomId]) => Boolean(roomId))
    && new Set(reverse.map(([, roomId]) => roomId)).size === HOUSE_ROOMS.length;
  const credentialsReady = Boolean(env.BEDS24_REFRESH_TOKEN && env.STAY_TOKEN_PEPPER);
  const enabled = beds24DirectStayProtectionEnabled(env);
  return {
    enabled,
    credentialsReady,
    roomMapComplete,
    ready: enabled && credentialsReady && roomMapComplete,
    independentFromChannelManager: true,
    fastInventorySyncEnabled: beds24DirectStayFastInventorySyncEnabled(env)
  };
}

export function houseRoomToBeds24RoomId(room, env = {}) {
  const target = cleanText(room, 4);
  if (!HOUSE_ROOMS.includes(target)) return "";
  const matches = Object.entries(beds24RoomMap(env))
    .filter(([, houseRoom]) => cleanText(houseRoom, 4) === target)
    .map(([beds24RoomId]) => cleanText(beds24RoomId, 32));
  if (matches.length !== 1 || !/^\d+$/.test(matches[0])) return "";
  return matches[0];
}

export function beds24ReservationProvider(booking = {}) {
  const source = beds24SourceLabel(booking);
  const normalized = source.toLowerCase();
  if (normalized === "airbnb") return "airbnb";
  if (normalized === "booking.com" || normalized === "booking") return "booking.com";
  if (normalized === "expedia") return "expedia";
  if (normalized === "vrbo") return "vrbo";
  if (normalized === "agoda") return "agoda";
  if (normalized === "hostelworld") return "hostelworld";
  if (normalized === "trip.com" || normalized === "trip") return "trip.com";
  if (normalized === "direct") return "direct";
  return "beds24";
}

export function beds24ChannelManagerConfiguration(env = {}) {
  const reverse = HOUSE_ROOMS.map((room) => [room, houseRoomToBeds24RoomId(room, env)]);
  const roomMapComplete = reverse.every(([, roomId]) => Boolean(roomId))
    && new Set(reverse.map(([, roomId]) => roomId)).size === HOUSE_ROOMS.length;
  const credentialsReady = Boolean(env.BEDS24_REFRESH_TOKEN && env.BEDS24_WEBHOOK_TOKEN && env.STAY_TOKEN_PEPPER);
  const enabled = beds24ChannelManagerEnabled(env);
  return {
    enabled,
    credentialsReady,
    roomMapComplete,
    ready: enabled && credentialsReady && roomMapComplete,
    centralAvailabilityAuthoritative: enabled && credentialsReady && roomMapComplete,
    supportedReservationSources: [...RESERVATION_SOURCES]
  };
}

function dateRange(checkInDate, checkOutDate) {
  const start = validDate(checkInDate);
  const end = validDate(checkOutDate);
  if (!start || !end || end <= start) return [];
  const days = [];
  for (let current = start, guard = 0; current < end && guard < 370; current = shiftedDateOnly(current, 1), guard += 1) {
    days.push(current);
  }
  return days;
}

async function recordDistribution(store, record = {}) {
  if (!store || typeof store.recordReservationDistributionEvent !== "function") return;
  await store.recordReservationDistributionEvent({
    id: `dist_${crypto.randomUUID()}`,
    reservationId: cleanText(record.reservationId, 100),
    externalBookingId: cleanText(record.externalBookingId, 40),
    room: cleanText(record.room, 4),
    eventType: cleanText(record.eventType, 80),
    status: cleanText(record.status, 40),
    detail: record.detail && typeof record.detail === "object" ? record.detail : {},
    createdAt: record.createdAt || new Date().toISOString()
  }).catch(() => {});
}

async function writeBeds24InventoryRange(env, store, { room, checkInDate, checkOutDate, inventory } = {}) {
  const roomId = houseRoomToBeds24RoomId(room, env);
  const start = validDate(checkInDate);
  const checkout = validDate(checkOutDate);
  const end = shiftedDateOnly(checkout, -1);
  if (!roomId || !start || !checkout || checkout <= start || ![0, 1].includes(Number(inventory))) {
    return { ok: false, error: "invalid_inventory_range" };
  }
  const response = await beds24ApiRequest(env, store, "inventory/rooms/calendar", {
    method: "POST",
    body: [{ roomId: Number(roomId), calendar: [{ from: start, to: end, inventory: Number(inventory) }] }]
  });
  assertBeds24WriteSucceeded(response, "beds24_inventory_write_failed");
  return { ok: true, roomId, from: start, to: end, inventory: Number(inventory) };
}

export async function accelerateBeds24DirectStayClose(env, store, details = {}) {
  const { reservationId = "", externalBookingId = "", room, checkInDate, checkOutDate } = details;
  if (!beds24DirectStayFastInventorySyncEnabled(env)) {
    return { ok: true, status: "booking_only", fastInventorySyncEnabled: false };
  }
  await recordDistribution(store, { reservationId, externalBookingId, room, eventType: "inventory_close_requested", status: "pending", detail: { checkInDate, checkOutDate } });
  try {
    const write = await writeBeds24InventoryRange(env, store, { room, checkInDate, checkOutDate, inventory: 0 });
    const verification = await checkBeds24CentralAvailability(env, store, room, checkInDate, checkOutDate);
    const closed = verification.ok && verification.available === false;
    await recordDistribution(store, {
      reservationId, externalBookingId, room,
      eventType: closed ? "inventory_close_confirmed" : "inventory_close_sent",
      status: closed ? "confirmed" : "provider_pending",
      detail: { checkInDate, checkOutDate, providerRoomId: write.roomId }
    });
    return { ok: true, status: closed ? "confirmed_closed" : "provider_pending", providerRoomId: write.roomId };
  } catch (error) {
    await recordDistribution(store, { reservationId, externalBookingId, room, eventType: "inventory_close_failed", status: "error", detail: { error: cleanText(error?.code || error?.message, 160), checkInDate, checkOutDate } });
    return { ok: false, status: "error", error: cleanText(error?.code || error?.message || "beds24_inventory_close_failed", 160) };
  }
}

export async function reassertBeds24DirectStayOpenIfSafe(env, store, details = {}) {
  const { reservationId = "", externalBookingId = "", room, checkInDate, checkOutDate } = details;
  if (!beds24DirectStayFastInventorySyncEnabled(env)) {
    return { ok: true, status: "booking_only", fastInventorySyncEnabled: false };
  }
  const conflict = typeof store?.findStayOverlap === "function"
    ? await store.findStayOverlap(room, checkInDate, checkOutDate, reservationId)
    : null;
  if (conflict) {
    await recordDistribution(store, { reservationId, externalBookingId, room, eventType: "inventory_reopen_skipped", status: "blocked_by_other_reservation", detail: { conflictId: conflict.id || "", checkInDate, checkOutDate } });
    return { ok: true, status: "blocked_by_other_reservation", conflict };
  }

  const providerAvailability = await checkBeds24CentralAvailability(env, store, room, checkInDate, checkOutDate);
  if (!providerAvailability.ok || providerAvailability.available !== true) {
    await recordDistribution(store, { reservationId, externalBookingId, room, eventType: "inventory_reopen_waiting", status: "provider_pending", detail: { checkInDate, checkOutDate } });
    return { ok: true, status: "provider_pending" };
  }

  try {
    const write = await writeBeds24InventoryRange(env, store, { room, checkInDate, checkOutDate, inventory: 1 });
    const verification = await checkBeds24CentralAvailability(env, store, room, checkInDate, checkOutDate);
    const open = verification.ok && verification.available === true;
    await recordDistribution(store, {
      reservationId, externalBookingId, room,
      eventType: open ? "inventory_reopen_confirmed" : "inventory_reopen_sent",
      status: open ? "confirmed" : "provider_pending",
      detail: { checkInDate, checkOutDate, providerRoomId: write.roomId }
    });
    return { ok: true, status: open ? "confirmed_open" : "provider_pending", providerRoomId: write.roomId };
  } catch (error) {
    await recordDistribution(store, { reservationId, externalBookingId, room, eventType: "inventory_reopen_failed", status: "error", detail: { error: cleanText(error?.code || error?.message, 160), checkInDate, checkOutDate } });
    return { ok: false, status: "error", error: cleanText(error?.code || error?.message || "beds24_inventory_reopen_failed", 160) };
  }
}

function addedAvailabilityRanges(current = {}, next = {}) {
  const currentRoom = cleanText(current.room, 4);
  const nextRoom = cleanText(next.room, 4);
  const currentIn = validDate(current.checkInDate);
  const currentOut = validDate(current.checkOutDate);
  const nextIn = validDate(next.checkInDate);
  const nextOut = validDate(next.checkOutDate);
  if (!nextRoom || !nextIn || !nextOut || nextOut <= nextIn) return [];
  if (currentRoom !== nextRoom) return [{ room: nextRoom, checkInDate: nextIn, checkOutDate: nextOut }];
  const ranges = [];
  if (nextIn < currentIn) ranges.push({ room: nextRoom, checkInDate: nextIn, checkOutDate: currentIn });
  if (nextOut > currentOut) ranges.push({ room: nextRoom, checkInDate: currentOut, checkOutDate: nextOut });
  return ranges.filter((range) => range.checkOutDate > range.checkInDate);
}

export async function updateBeds24HouseDirectBooking(env, store, { externalBookingId, current = {}, next = {} } = {}) {
  if (!beds24DirectStayProtectionEnabled(env)) return { ok: true, ignored: "direct_stay_protection_disabled" };
  const bookingId = Number(externalBookingId);
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) return { ok: false, error: "beds24_link_required" };
  const roomId = houseRoomToBeds24RoomId(next.room, env);
  const arrival = validDate(next.checkInDate);
  const departure = validDate(next.checkOutDate);
  if (!roomId || !arrival || !departure || departure <= arrival) return { ok: false, error: "invalid_stay" };
  for (const range of addedAvailabilityRanges(current, next)) {
    const availability = await checkBeds24CentralAvailability(env, store, range.room, range.checkInDate, range.checkOutDate);
    if (!availability.ok) return availability;
    if (!availability.available) return { ok: false, error: "beds24_room_unavailable", available: false, range };
  }
  const response = await beds24ApiRequest(env, store, "bookings", {
    method: "POST",
    body: [{ id: bookingId, roomId: Number(roomId), arrival, departure }]
  });
  assertBeds24WriteSucceeded(response, "beds24_booking_update_failed");
  return { ok: true, externalBookingId: String(bookingId), roomId, room: next.room, checkInDate: arrival, checkOutDate: departure };
}

export function beds24AvailabilityAllowsStay(response, beds24RoomId, checkInDate, checkOutDate) {
  const nights = dateRange(checkInDate, checkOutDate);
  if (!nights.length) return false;
  const roomId = String(beds24RoomId || "");
  const rows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
  const perDate = new Map();
  for (const row of rows) {
    if (String(row?.roomId || "") !== roomId) continue;
    if (row?.availability && typeof row.availability === "object" && !Array.isArray(row.availability)) {
      Object.entries(row.availability).forEach(([date, available]) => perDate.set(date, available === true || Number(available) > 0));
    }
    const date = validDate(row?.date);
    if (date) {
      const value = row?.isAvailable ?? row?.available ?? row?.availability;
      perDate.set(date, value === true || Number(value) > 0);
    }
  }
  return nights.every((date) => perDate.get(date) === true);
}

export async function checkBeds24CentralAvailability(env, store, room, checkInDate, checkOutDate) {
  if (!beds24DirectStayProtectionEnabled(env)) return { ok: true, available: true, ignored: "direct_stay_protection_disabled" };
  const configuration = beds24DirectStayProtectionConfiguration(env);
  if (!configuration.ready) return { ok: false, available: false, error: "beds24_direct_stay_protection_not_ready" };
  const roomId = houseRoomToBeds24RoomId(room, env);
  const start = validDate(checkInDate);
  const checkout = validDate(checkOutDate);
  if (!roomId || !start || !checkout || checkout <= start) return { ok: false, available: false, error: "invalid_stay" };
  const endDate = shiftedDateOnly(checkout, -1);
  const response = await beds24ApiRequest(env, store, "inventory/rooms/availability", {
    query: { roomId: [Number(roomId)], startDate: start, endDate }
  });
  return {
    ok: true,
    available: beds24AvailabilityAllowsStay(response, roomId, start, checkout),
    roomId,
    checkInDate: start,
    checkOutDate: checkout
  };
}

export async function createBeds24HouseDirectBooking(env, store, { room, checkInDate, checkOutDate } = {}) {
  const requestedAt = new Date().toISOString();
  const availability = await checkBeds24CentralAvailability(env, store, room, checkInDate, checkOutDate);
  if (!availability.ok) return availability;
  if (!availability.available) return { ok: false, available: false, error: "beds24_room_unavailable", roomId: availability.roomId };
  const response = await beds24ApiRequest(env, store, "bookings", {
    method: "POST",
    body: [{
      roomId: Number(availability.roomId),
      arrival: validDate(checkInDate),
      departure: validDate(checkOutDate),
      status: "confirmed",
      referer: "The House Direct"
    }]
  });
  return { ok: true, externalBookingId: String(newBeds24BookingId(response)), roomId: availability.roomId, requestedAt, acceptedAt: new Date().toISOString() };
}

export async function updateBeds24HouseDirectExtension(env, store, { externalBookingId, room, currentCheckOutDate, checkOutDate } = {}) {
  if (!beds24DirectStayProtectionEnabled(env)) return { ok: true, ignored: "direct_stay_protection_disabled" };
  const bookingId = Number(externalBookingId);
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) return { ok: false, error: "beds24_link_required" };
  const availability = await checkBeds24CentralAvailability(env, store, room, currentCheckOutDate, checkOutDate);
  if (!availability.ok) return availability;
  if (!availability.available) return { ok: false, error: "beds24_room_unavailable", available: false };
  const response = await beds24ApiRequest(env, store, "bookings", {
    method: "POST",
    body: [{ id: bookingId, departure: validDate(checkOutDate) }]
  });
  assertBeds24WriteSucceeded(response, "beds24_extension_update_failed");
  return { ok: true, externalBookingId: String(bookingId), checkOutDate: validDate(checkOutDate) };
}

export async function restoreBeds24HouseDirectDeparture(env, store, { externalBookingId, checkOutDate } = {}) {
  if (!beds24DirectStayProtectionEnabled(env)) return { ok: true, ignored: "direct_stay_protection_disabled" };
  const bookingId = Number(externalBookingId);
  const departure = validDate(checkOutDate);
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0 || !departure) return { ok: false, error: "invalid_beds24_rollback" };
  const response = await beds24ApiRequest(env, store, "bookings", {
    method: "POST",
    body: [{ id: bookingId, departure }]
  });
  assertBeds24WriteSucceeded(response, "beds24_extension_rollback_failed");
  return { ok: true, externalBookingId: String(bookingId), checkOutDate: departure };
}

export async function cancelBeds24HouseDirectBooking(env, store, externalBookingId) {
  if (!beds24DirectStayProtectionEnabled(env)) return { ok: true, ignored: "direct_stay_protection_disabled" };
  const bookingId = Number(externalBookingId);
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) return { ok: false, error: "beds24_link_required" };
  const response = await beds24ApiRequest(env, store, "bookings", {
    method: "POST",
    body: [{ id: bookingId, status: "cancelled" }]
  });
  assertBeds24WriteSucceeded(response, "beds24_cancellation_failed");
  return { ok: true, externalBookingId: String(bookingId) };
}

function bookingCancelled(booking = {}) {
  const value = cleanText(booking.status, 40).toLowerCase();
  return value.includes("cancel") || Boolean(booking.cancelTime);
}

function bookingFirstName(booking = {}) {
  const value = cleanText(booking.firstName || booking.guestFirstName || "", 40).split(/\s+/)[0] || "";
  return value.replace(/[^\p{L}'-]/gu, "").slice(0, 40);
}

export async function ingestBeds24ChannelBooking(booking, env, store) {
  if (!beds24ChannelManagerEnabled(env)) return { ok: true, ignored: "channel_manager_disabled" };
  const configuration = beds24ChannelManagerConfiguration(env);
  if (!configuration.ready) return { ok: false, error: "beds24_channel_manager_not_ready" };
  if (!store || typeof store.syncBeds24ChannelReservation !== "function") return { ok: false, error: "reservation_store_unavailable" };
  const externalBookingId = String(Number(booking?.id || 0));
  const room = roomForBeds24Booking(booking, env);
  const checkInDate = validDate(booking?.arrival);
  const checkOutDate = validDate(booking?.departure);
  if (!/^\d+$/.test(externalBookingId) || !room || !checkInDate || !checkOutDate || checkOutDate <= checkInDate) {
    return { ok: false, error: "beds24_booking_unmapped" };
  }
  const reference = cleanText(booking?.apiReference || booking?.reference || "", 24).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const confirmationCodeHash = reference && /^[A-Z0-9]{6,24}$/.test(reference)
    ? await hmacHex(`reservation:${reference}`, env.STAY_TOKEN_PEPPER)
    : await hmacHex(`beds24-reservation:${externalBookingId}`, env.STAY_TOKEN_PEPPER);
  const sourceRefHash = await hmacHex(`beds24-source:${externalBookingId}`, env.STAY_TOKEN_PEPPER);
  const provider = beds24ReservationProvider(booking);
  return store.syncBeds24ChannelReservation({
    externalBookingId,
    externalRoomId: String(booking.roomId || ""),
    provider,
    sourceLabel: beds24SourceLabel(booking),
    listingId: `beds24-room-${String(booking.roomId || "")}`.slice(0, 32),
    room,
    confirmationCodeHash,
    guestFirstName: bookingFirstName(booking),
    checkInDate,
    checkOutDate,
    status: bookingCancelled(booking) ? "cancelled" : "confirmed",
    sourceRefHash,
    updatedAt: cleanText(booking.modifiedTime, 40) || new Date().toISOString()
  });
}

export async function queueBeds24Retry(store, record = {}) {
  if (!store || typeof store.queueBeds24ChannelRetry !== "function") return { ok: false, error: "retry_store_unavailable" };
  return store.queueBeds24ChannelRetry({
    id: `b24retry_${crypto.randomUUID()}`,
    operation: cleanText(record.operation, 40),
    reservationId: cleanText(record.reservationId, 100),
    externalBookingId: cleanText(record.externalBookingId, 40),
    payload: record.payload && typeof record.payload === "object" ? record.payload : {},
    lastError: cleanText(record.lastError, 160),
    createdAt: new Date().toISOString()
  });
}

export async function processBeds24ChannelManagerRetries(env) {
  if (!beds24ChannelManagerEnabled(env) && !beds24DirectStayProtectionEnabled(env)) {
    return { ok: true, ignored: "beds24_writes_disabled" };
  }
  const store = env.CONCIERGE_STORE?.getByName?.("the-house-concierge-global");
  if (!store || typeof store.listBeds24ChannelRetries !== "function") return { ok: false, error: "retry_store_unavailable" };
  const now = new Date();
  const jobs = await store.listBeds24ChannelRetries(now.toISOString(), 20);
  let completed = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      if (["cancel", "cancel_orphan"].includes(job.operation)) {
        await cancelBeds24HouseDirectBooking(env, store, job.externalBookingId);
        if (job.operation === "cancel" && job.payload?.room && job.payload?.checkInDate && job.payload?.checkOutDate) {
          const reopen = await reassertBeds24DirectStayOpenIfSafe(env, store, {
            reservationId: job.reservationId,
            externalBookingId: job.externalBookingId,
            room: job.payload.room,
            checkInDate: job.payload.checkInDate,
            checkOutDate: job.payload.checkOutDate
          });
          if (!reopen?.ok || reopen?.status === "provider_pending") {
            const error = new Error(reopen?.error || "inventory_reopen_pending");
            error.code = reopen?.error || "inventory_reopen_pending";
            throw error;
          }
        }
      } else if (job.operation === "inventory_close") {
        const outcome = await accelerateBeds24DirectStayClose(env, store, {
          reservationId: job.reservationId,
          externalBookingId: job.externalBookingId,
          room: job.payload?.room,
          checkInDate: job.payload?.checkInDate,
          checkOutDate: job.payload?.checkOutDate
        });
        if (!outcome?.ok || outcome?.status === "provider_pending") {
          const error = new Error(outcome?.error || "inventory_close_pending");
          error.code = outcome?.error || "inventory_close_pending";
          throw error;
        }
      } else if (job.operation === "inventory_reopen") {
        const outcome = await reassertBeds24DirectStayOpenIfSafe(env, store, {
          reservationId: job.reservationId,
          externalBookingId: job.externalBookingId,
          room: job.payload?.room,
          checkInDate: job.payload?.checkInDate,
          checkOutDate: job.payload?.checkOutDate
        });
        if (!outcome?.ok || outcome?.status === "provider_pending") {
          const error = new Error(outcome?.error || "inventory_reopen_pending");
          error.code = outcome?.error || "inventory_reopen_pending";
          throw error;
        }
      } else if (job.operation === "restore_booking") {
        const roomId = houseRoomToBeds24RoomId(job.payload?.room, env);
        const response = await beds24ApiRequest(env, store, "bookings", {
          method: "POST",
          body: [{
            id: Number(job.externalBookingId),
            roomId: Number(roomId),
            arrival: validDate(job.payload?.checkInDate),
            departure: validDate(job.payload?.checkOutDate)
          }]
        });
        assertBeds24WriteSucceeded(response, "beds24_booking_rollback_failed");
      } else if (job.operation === "update_departure") {
        const response = await beds24ApiRequest(env, store, "bookings", {
          method: "POST",
          body: [{ id: Number(job.externalBookingId), departure: validDate(job.payload?.checkOutDate) }]
        });
        assertBeds24WriteSucceeded(response, "beds24_extension_update_failed");
      } else {
        await store.completeBeds24ChannelRetry(job.id, true, "unsupported_retry_operation", now.toISOString());
        failed += 1;
        continue;
      }
      await store.completeBeds24ChannelRetry(job.id, true, "", now.toISOString());
      completed += 1;
    } catch (error) {
      const baseDelay = ["inventory_close", "inventory_reopen", "cancel"].includes(job.operation) ? 2 : 15;
      const delayMinutes = Math.min(360, baseDelay * (2 ** Math.min(5, Number(job.attemptCount) || 0)));
      const nextAttemptAt = new Date(now.getTime() + (delayMinutes * 60_000)).toISOString();
      await store.rescheduleBeds24ChannelRetry(job.id, nextAttemptAt, cleanText(error.code || error.message, 160), now.toISOString());
      failed += 1;
    }
  }
  return { ok: true, processed: jobs.length, completed, failed };
}

export async function reconcileBeds24ChannelManager(env) {
  if (!beds24ChannelManagerEnabled(env)) return { ok: true, ignored: "channel_manager_disabled" };
  const configuration = beds24ChannelManagerConfiguration(env);
  if (!configuration.ready) return { ok: false, error: "beds24_channel_manager_not_ready" };
  const store = env.CONCIERGE_STORE?.getByName?.("the-house-concierge-global");
  if (!store) return { ok: false, error: "reservation_store_unavailable" };
  const today = bangkokDateOnly();
  const response = await beds24ApiRequest(env, store, "bookings", {
    query: {
      departureFrom: shiftedDateOnly(today, -30),
      arrivalTo: shiftedDateOnly(today, 365),
      includeGuests: true
    }
  });
  const bookings = Array.isArray(response?.data) ? response.data : [];
  let synchronized = 0;
  let skipped = 0;
  for (const booking of bookings) {
    const result = await ingestBeds24ChannelBooking(booking, env, store);
    if (result?.ok) synchronized += 1; else skipped += 1;
  }
  return { ok: skipped === 0, synchronized, skipped };
}
