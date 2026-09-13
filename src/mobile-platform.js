import { HOUSE_FINANCE_BUSINESS_ID } from "./finance-businesses.js";
import { expenseConfiguration, handleExpenseAdminRequest } from "./expense-api.js";
import { incomeConfiguration, summarizeFinance } from "./finance-api.js";
import { beds24FinanceSyncConfiguration, reconcileBeds24FinanceRange } from "./beds24-finance-sync.js";
import { integrationAdminOverview } from "./integration-catalog.js";
import { beds24ApiRequest, handleUnifiedMessagingAdminRequest, openBeds24ReservationConversation, reviewMessagingDraft, roomForBeds24Booking, startWhatsAppGuestConversation, unifiedMessagingConfiguration, whatsAppGuestInitiationConfiguration } from "./unified-messaging.js";
import { handleStayAdminRequest } from "./stay-api.js";
import { createProtectedOperationsAlert, dispatchConciergeAlert, operationalTaskAssignment, operationalTaskAssignments } from "./whatsapp-alerts.js";
import { operationalRecipientGroup } from "./operations-routing.js";

const MOBILE_API_PREFIX = "/api/mobile/v1";
const PASSWORD_ITERATIONS = 100000;
const DEFAULT_SESSION_DAYS = 30;
const MAX_BODY_BYTES = 24_000;
const HOUSE_TENANT_ID = "tenant_the_house_koh_tao";
const HOUSE_PROPERTY_ID = "property_the_house_koh_tao";
const HOUSE_PROPERTY_EXTERNAL_KEY = "beds24:353644";
const DEFAULT_MODULES = [
  "core",
  "calendar",
  "bookings",
  "unified_messaging",
  "housekeeping",
  "maintenance",
  "guest_registration",
  "finance",
  "analytics",
  "integrations",
  "staff_access",
  "channel_manager"
];

export const MOBILE_PERMISSION_MATRIX = Object.freeze({
  owner: Object.freeze([
    "home.view", "bookings.view", "calendar.view", "booking_activity.create", "booking_activity.update",
    "messaging.view", "messaging.send", "messaging.ai_control",
    "operations.view", "housekeeping.update", "maintenance.view", "maintenance.create", "maintenance.resolve",
    "registration.status", "finance.view", "finance.import", "finance.expense_submit", "analytics.view", "integrations.view",
    "staff.manage", "licenses.view", "licenses.manage", "security.sessions",
    "direct_stays.manage", "guest_documents.view"
  ]),
  manager: Object.freeze([
    "home.view", "bookings.view", "calendar.view", "booking_activity.create", "booking_activity.update",
    "messaging.view", "messaging.send", "messaging.ai_control",
    "operations.view", "housekeeping.update", "maintenance.view", "maintenance.create", "maintenance.resolve",
    "registration.status", "finance.expense_submit", "analytics.view", "integrations.view", "direct_stays.manage"
  ]),
  staff: Object.freeze([
    "home.view", "bookings.view", "calendar.view", "booking_activity.create", "booking_activity.update", "operations.view",
    "housekeeping.update", "maintenance.view", "maintenance.create", "maintenance.resolve", "registration.status"
  ])
});

export const MOBILE_DELEGATABLE_PERMISSIONS = Object.freeze({
  manager: Object.freeze(["finance.view", "finance.expense_submit"]),
  staff: Object.freeze(["finance.expense_submit"])
});

function sanitizePermissionOverrides(roleValue, input = {}) {
  const role = ["manager", "staff"].includes(roleValue) ? roleValue : "";
  if (!role || !input || typeof input !== "object" || Array.isArray(input)) return {};
  const allowed = new Set(MOBILE_DELEGATABLE_PERMISSIONS[role] || []);
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) continue;
    if (value === true || value === false) result[key] = value;
  }
  return result;
}

function getStore(env) {
  if (!env.CONCIERGE_STORE?.getByName) return null;
  return env.CONCIERGE_STORE.getByName("the-house-concierge-global");
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      ...extraHeaders
    }
  });
}

function cleanText(value, maximum = 500) {
  return String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maximum);
}

function normalizeEmail(value) {
  const email = cleanText(value, 240).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function safeJson(value, fallback) {
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed == null ? fallback : parsed;
  } catch (_error) {
    return fallback;
  }
}

function bool(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function mobileEnabled(env) {
  return bool(env.MOBILE_APP_ENABLED);
}

function bootstrapEnabled(env) {
  return bool(env.MOBILE_BOOTSTRAP_ENABLED);
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function randomToken(prefix) {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `${prefix}_${base64Url(bytes)}`;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value || "")));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sessionHash(token, env) {
  return sha256(`${String(env.MOBILE_SESSION_PEPPER || "")}:${token}`);
}

async function inviteHash(token, env) {
  return sha256(`${String(env.MOBILE_INVITE_PEPPER || env.MOBILE_SESSION_PEPPER || "")}:${token}`);
}

async function derivePassword(password, salt, pepper, iterations = PASSWORD_ITERATIONS) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${String(pepper || "")}:${String(password || "")}`),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations },
    material,
    256
  );
  return base64Url(new Uint8Array(bits));
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

function passwordAccepted(value) {
  const password = String(value || "");
  return password.length >= 12 && password.length <= 128;
}

async function readJson(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) throw new Response(JSON.stringify({ error: "request_too_large" }), { status: 413 });
  try {
    return await request.json();
  } catch (_error) {
    throw new Response(JSON.stringify({ error: "invalid_json" }), { status: 400 });
  }
}

function parsePermissions(record) {
  const role = ["owner", "manager", "staff"].includes(record?.role) ? record.role : "staff";
  const base = new Set(MOBILE_PERMISSION_MATRIX[role]);
  const overrides = safeJson(record?.permissionOverridesJson, {});
  if (overrides && typeof overrides === "object" && !Array.isArray(overrides)) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === true) base.add(key);
      if (value === false) base.delete(key);
    }
  }
  return [...base].sort();
}

function publicIdentity(record, properties = [], entitlements = [], moduleOverride = null) {
  const permissions = parsePermissions(record);
  const modules = moduleOverride
    ? [...moduleOverride].sort()
    : entitlements
      .filter((item) => item.status === "active" && (!item.validUntil || item.validUntil > new Date().toISOString()))
      .map((item) => item.moduleKey)
      .sort();
  return {
    user: {
      id: record.userId,
      email: record.email,
      displayName: record.displayName,
      role: record.role
    },
    tenant: {
      id: record.tenantId,
      slug: record.tenantSlug,
      displayName: record.tenantName,
      timezone: record.timezone || "Asia/Bangkok",
      currency: record.currency || "THB",
      branding: safeJson(record.brandingJson, {})
    },
    properties,
    permissions,
    modules
  };
}

function hasPermission(access, permission) {
  return access?.permissions?.has(permission) === true;
}

function requirePermission(access, permission) {
  return hasPermission(access, permission) ? null : json({ error: "forbidden", permission }, 403);
}

function activeModuleKeys(entitlements = [], now = new Date().toISOString()) {
  return new Set((Array.isArray(entitlements) ? entitlements : [])
    .filter((item) => item?.status === "active" && (!item.validFrom || item.validFrom <= now) && (!item.validUntil || item.validUntil > now))
    .map((item) => cleanText(item.moduleKey, 80))
    .filter(Boolean));
}

function hasModule(access, moduleKey) {
  return access?.modules?.has(moduleKey) === true;
}

function requireCapability(access, permission, moduleKey = "core") {
  const denied = requirePermission(access, permission);
  if (denied) return denied;
  return hasModule(access, moduleKey) ? null : json({ error: "module_not_licensed", module: moduleKey }, 402);
}

function licenseEnforcementEnabled(env) {
  return bool(env.MOBILE_LICENSE_ENFORCEMENT_ENABLED);
}

function deviceBindingEnabled(env) {
  return bool(env.MOBILE_DEVICE_BINDING_ENABLED);
}

function canonicalLicenseModules(value) {
  const source = Array.isArray(value) ? value : safeJson(value, []);
  return [...new Set((Array.isArray(source) ? source : []).map((item) => cleanText(item, 80)).filter((item) => DEFAULT_MODULES.includes(item)))].sort();
}

function licenseCanonical(record = {}) {
  return [
    cleanText(record.tenantId, 100), cleanText(record.licenseId, 120), cleanText(record.status, 30),
    cleanText(record.planKey, 60), cleanText(record.validFrom, 40), cleanText(record.validUntil, 40),
    String(Math.max(1, Math.min(50, Number(record.maxDevices) || 3))), cleanText(record.issuedBy || "taoedge", 80),
    canonicalLicenseModules(record.modules || record.modulesJson).join(",")
  ].join("|");
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(secret || "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(value || "")));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signLicense(record, env) {
  if (!env.MOBILE_LICENSE_SIGNING_SECRET) return "";
  return hmacHex(env.MOBILE_LICENSE_SIGNING_SECRET, licenseCanonical(record));
}

async function licenseValidation(record, env, now = new Date().toISOString()) {
  if (!licenseEnforcementEnabled(env)) return { ok: true, enforced: false, license: record || null };
  if (!env.MOBILE_LICENSE_SIGNING_SECRET) return { ok: false, error: "license_service_unavailable" };
  if (!record) return { ok: false, error: "license_required" };
  if (!["active", "trial"].includes(cleanText(record.status, 30))) return { ok: false, error: "license_inactive" };
  if (record.validFrom && record.validFrom > now) return { ok: false, error: "license_not_started" };
  if (record.validUntil && record.validUntil <= now) return { ok: false, error: "license_expired" };
  const expected = await signLicense(record, env);
  if (!expected || !constantTimeEqual(expected, record.signature)) return { ok: false, error: "license_invalid" };
  return { ok: true, enforced: true, license: record };
}

function publicLicense(record, validation = null) {
  if (!record) return { status: validation?.enforced ? "required" : "not_enforced", planKey: "", validUntil: "", maxDevices: 0, enforced: Boolean(validation?.enforced) };
  return {
    status: record.status,
    planKey: record.planKey,
    validFrom: record.validFrom,
    validUntil: record.validUntil,
    maxDevices: Number(record.maxDevices) || 0,
    modules: canonicalLicenseModules(record.modules || record.modulesJson),
    enforced: Boolean(validation?.enforced)
  };
}

async function ensureHouseLicense(store, tenantId, env, now = new Date().toISOString()) {
  let license = typeof store.mobileGetLicense === "function" ? await store.mobileGetLicense(tenantId) : null;
  if (license || tenantId !== HOUSE_TENANT_ID || !env.MOBILE_LICENSE_SIGNING_SECRET || typeof store.mobileUpsertLicense !== "function") return license;
  const record = {
    tenantId,
    licenseId: "lic_house_owner_preview",
    status: "active",
    planKey: "house-owner-preview",
    validFrom: now,
    validUntil: "",
    maxDevices: 8,
    issuedBy: "taoedge-legacy-migration",
    modules: DEFAULT_MODULES,
    metadata: { protectedMigration: true },
    updatedAt: now
  };
  record.signature = await signLicense(record, env);
  await store.mobileUpsertLicense(record);
  license = await store.mobileGetLicense(tenantId);
  return license;
}

function validMonth(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function bangkokDate(offsetDays = 0) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date(Date.now() + offsetDays * 86_400_000)).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function currentMonth() {
  return bangkokDate().slice(0, 7);
}

function rangeContains(date, from, to) {
  return (!from || date >= from) && (!to || date <= to);
}


function shiftedDateOnly(dateOnly, days) {
  const date = new Date(`${dateOnly}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateSpanDays(from, to) {
  if (!validDate(from) || !validDate(to) || to < from) return 0;
  const start = new Date(`${from}T12:00:00Z`).getTime();
  const end = new Date(`${to}T12:00:00Z`).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000) + 1);
}

export function analyticsRange(value) {
  const today = bangkokDate();
  const key = ["month", "30d", "90d"].includes(cleanText(value, 12).toLowerCase()) ? cleanText(value, 12).toLowerCase() : "30d";
  let from = key === "month" ? `${today.slice(0, 7)}-01` : shiftedDateOnly(today, key === "90d" ? -89 : -29);
  const to = today;
  const days = dateSpanDays(from, to);
  const previousTo = shiftedDateOnly(from, -1);
  const previousFrom = shiftedDateOnly(previousTo, -(days - 1));
  const forwardFrom = today;
  const forwardTo = shiftedDateOnly(today, 29);
  return { key, from, to, days, previousFrom, previousTo, forwardFrom, forwardTo };
}

function overlapNights(reservation, from, to) {
  if (!reservation || reservation.status !== "confirmed" || !validDate(reservation.checkInDate) || !validDate(reservation.checkOutDate)) return 0;
  const endExclusive = shiftedDateOnly(to, 1);
  const start = reservation.checkInDate > from ? reservation.checkInDate : from;
  const end = reservation.checkOutDate < endExclusive ? reservation.checkOutDate : endExclusive;
  if (!validDate(start) || !validDate(end) || end <= start) return 0;
  return Math.max(0, dateSpanDays(start, shiftedDateOnly(end, -1)));
}

function fullStayNights(reservation) {
  if (!reservation || !validDate(reservation.checkInDate) || !validDate(reservation.checkOutDate) || reservation.checkOutDate <= reservation.checkInDate) return 0;
  return dateSpanDays(reservation.checkInDate, shiftedDateOnly(reservation.checkOutDate, -1));
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function percent(value, total) {
  const denominator = Number(total) || 0;
  return denominator > 0 ? round1(((Number(value) || 0) / denominator) * 100) : 0;
}

function percentChange(value, previous) {
  const prior = Number(previous) || 0;
  if (!prior) return null;
  return round1((((Number(value) || 0) - prior) / Math.abs(prior)) * 100);
}

function normalizedRoom(value) {
  const match = cleanText(value, 80).match(/(?:^|\broom\s*)?(1[01]|[1-9])(?:\b|$)/i);
  return match ? String(Number(match[1])) : "";
}

function reservationWindowStats(reservations, from, to, roomsTotal) {
  const source = Array.isArray(reservations) ? reservations : [];
  const days = Math.max(1, dateSpanDays(from, to));
  const roomCount = Math.max(1, Number(roomsTotal) || 1);
  const arrivalsAll = source.filter((item) => rangeContains(item.checkInDate, from, to));
  const confirmedArrivals = arrivalsAll.filter((item) => item.status === "confirmed");
  const cancellations = arrivalsAll.filter((item) => item.status === "cancelled");
  const departures = source.filter((item) => item.status === "confirmed" && rangeContains(item.checkOutDate, from, to));
  const roomNights = source.reduce((sum, item) => sum + overlapNights(item, from, to), 0);
  const stayNights = confirmedArrivals.reduce((sum, item) => sum + fullStayNights(item), 0);
  const channels = new Map();
  for (const item of arrivalsAll) {
    const key = cleanText(item.provider, 50).toLowerCase() || "other";
    const row = channels.get(key) || { key, label: providerLabel(key), bookings: 0, confirmedBookings: 0, cancellations: 0, nights: 0 };
    row.bookings += 1;
    if (item.status === "cancelled") row.cancellations += 1;
    else {
      row.confirmedBookings += 1;
      row.nights += fullStayNights(item);
    }
    channels.set(key, row);
  }
  const totalConfirmedNights = [...channels.values()].reduce((sum, item) => sum + item.nights, 0);
  const totalBookings = [...channels.values()].reduce((sum, item) => sum + item.bookings, 0);
  return {
    days,
    arrivals: confirmedArrivals.length,
    departures: departures.length,
    bookings: arrivalsAll.length,
    confirmedBookings: confirmedArrivals.length,
    cancellations: cancellations.length,
    cancellationRate: percent(cancellations.length, arrivalsAll.length),
    roomNights,
    availableRoomNights: roomCount * days,
    occupancyPercent: percent(roomNights, roomCount * days),
    averageStayNights: confirmedArrivals.length ? round1(stayNights / confirmedArrivals.length) : 0,
    channels: [...channels.values()].map((item) => ({
      ...item,
      bookingSharePercent: percent(item.bookings, totalBookings),
      nightSharePercent: percent(item.nights, totalConfirmedNights)
    })).sort((a, b) => b.nights - a.nights || b.bookings - a.bookings)
  };
}

function analyticsWeeklyBuckets(reservations, from, to, roomsTotal) {
  const output = [];
  let cursor = from;
  while (cursor <= to && output.length < 6) {
    const bucketTo = shiftedDateOnly(cursor, 6) < to ? shiftedDateOnly(cursor, 6) : to;
    const stats = reservationWindowStats(reservations, cursor, bucketTo, roomsTotal);
    output.push({ from: cursor, to: bucketTo, occupancyPercent: stats.occupancyPercent, roomNights: stats.roomNights, arrivals: stats.arrivals, departures: stats.departures });
    cursor = shiftedDateOnly(bucketTo, 1);
  }
  return output;
}

function buildAnalyticsAttention({ current, previous, forward, operations, finance, rooms }) {
  const items = [];
  const occupancyDelta = round1(current.occupancyPercent - previous.occupancyPercent);
  if (forward.occupancyPercent < 40) items.push({ id: "forward-demand", tone: "warning", title: "Forward demand is light", detail: `Next 30 days are ${forward.occupancyPercent}% occupied. Keep an eye on pickup before changing rates.`, route: "" });
  else if (forward.occupancyPercent >= 80) items.push({ id: "forward-demand", tone: "success", title: "Forward demand is strong", detail: `Next 30 days are already ${forward.occupancyPercent}% occupied. Remaining inventory deserves a rate review.`, route: "" });
  if (occupancyDelta <= -10) items.push({ id: "occupancy-down", tone: "warning", title: "Occupancy has softened", detail: `${Math.abs(occupancyDelta)} points below the previous comparable period.`, route: "" });
  if (current.cancellationRate >= 15 && current.bookings >= 4) items.push({ id: "cancellations", tone: "warning", title: "Cancellation rate needs attention", detail: `${current.cancellationRate}% of arrivals booked for this period are cancelled in the canonical reservation history.`, route: "/bookings" });
  const repeatRoom = [...rooms].sort((a, b) => b.maintenanceIssues - a.maintenanceIssues)[0];
  if (repeatRoom?.maintenanceIssues >= 2) items.push({ id: "repeat-maintenance", tone: "danger", title: `Room ${repeatRoom.room} has repeated maintenance`, detail: `${repeatRoom.maintenanceIssues} maintenance reports in this period.`, route: "/(tabs)/operations?focus=maintenance" });
  if ((operations?.concierge?.learningGaps || 0) > 0) items.push({ id: "knowledge-gaps", tone: "accent", title: "Concierge knowledge can improve", detail: `${operations.concierge.learningGaps} request${operations.concierge.learningGaps === 1 ? "" : "s"} exposed a knowledge gap in this period.`, route: "" });
  const feedbackPositive = Number(operations?.concierge?.feedbackPositive) || 0;
  const feedbackNegative = Number(operations?.concierge?.feedbackNegative) || 0;
  const feedbackTotal = feedbackPositive + feedbackNegative;
  if (feedbackTotal >= 4 && percent(feedbackNegative, feedbackTotal) >= 25) items.push({ id: "concierge-feedback", tone: "warning", title: "Concierge feedback needs review", detail: `${feedbackNegative} of ${feedbackTotal} explicit Concierge ratings were negative in this period.`, route: "/(tabs)/inbox" });
  const turnovers = Number(operations?.housekeeping?.turnovers) || 0;
  const ready = Number(operations?.housekeeping?.ready) || 0;
  if (turnovers >= 4 && percent(ready, turnovers) < 90) items.push({ id: "turnover-ready-rate", tone: "warning", title: "Some turnover tasks are not reaching Ready", detail: `${ready} of ${turnovers} turnover tasks reached Ready in this period.`, route: "/(tabs)/operations?focus=housekeeping" });
  const topChannel = current.channels?.[0];
  if (topChannel && topChannel.nightSharePercent >= 70 && current.confirmedBookings >= 4) items.push({ id: "channel-concentration", tone: "warning", title: `High dependency on ${topChannel.label}`, detail: `${topChannel.nightSharePercent}% of confirmed stay nights from arrivals in this period come from one channel.`, route: "/bookings" });
  if ((finance?.totals?.expectedNetIncome || 0) > 0) items.push({ id: "expected-payout", tone: "accent", title: "Part of income is still provisional", detail: `${finance.currency} ${Math.round(finance.totals.expectedNetIncome).toLocaleString("en-US")} is expected OTA payout, not settled cash yet.`, route: "/finance" });
  if (!items.length) items.push({ id: "stable", tone: "success", title: "No major exceptions detected", detail: "The current reservation, operations and Concierge signals do not show an obvious issue requiring attention.", route: "" });
  return items.slice(0, 5);
}

export function buildAnalyticsPayload({ range, reservations, roomsTotal, operations, finance }) {
  const current = reservationWindowStats(reservations, range.from, range.to, roomsTotal);
  const previous = reservationWindowStats(reservations, range.previousFrom, range.previousTo, roomsTotal);
  const forward = reservationWindowStats(reservations, range.forwardFrom, range.forwardTo, roomsTotal);
  const roomMap = new Map(Array.from({ length: roomsTotal }, (_, index) => [String(index + 1), {
    room: String(index + 1), occupiedNights: 0, occupancyPercent: 0, arrivals: 0, departures: 0, cancellations: 0,
    maintenanceIssues: 0, turnovers: 0, averageTurnaroundMinutes: 0, netIncome: 0, operatingResult: 0
  }]));
  for (const reservation of reservations) {
    const room = String(reservation.room || "");
    if (!roomMap.has(room)) continue;
    const row = roomMap.get(room);
    row.occupiedNights += overlapNights(reservation, range.from, range.to);
    if (rangeContains(reservation.checkInDate, range.from, range.to)) {
      if (reservation.status === "cancelled") row.cancellations += 1;
      else row.arrivals += 1;
    }
    if (reservation.status === "confirmed" && rangeContains(reservation.checkOutDate, range.from, range.to)) row.departures += 1;
  }
  for (const item of operations?.maintenance?.byRoom || []) {
    if (roomMap.has(String(item.room))) roomMap.get(String(item.room)).maintenanceIssues = Number(item.issues) || 0;
  }
  for (const item of operations?.housekeeping?.byRoom || []) {
    if (!roomMap.has(String(item.room))) continue;
    const row = roomMap.get(String(item.room));
    row.turnovers = Number(item.turnovers) || 0;
    row.averageTurnaroundMinutes = Number(item.averageTurnaroundMinutes) || 0;
  }
  if (finance?.totals?.locations) {
    for (const [key, value] of Object.entries(finance.totals.locations)) {
      const room = normalizedRoom(key);
      if (!room || !roomMap.has(room)) continue;
      roomMap.get(room).netIncome += Number(value?.netIncome) || 0;
      roomMap.get(room).operatingResult += Number(value?.operatingResult) || 0;
    }
  }
  const rooms = [...roomMap.values()].map((item) => ({ ...item, occupancyPercent: percent(item.occupiedNights, current.days) }));
  const attention = buildAnalyticsAttention({ current, previous, forward, operations, finance, rooms });
  const financePayload = finance ? {
    ...finance,
    change: {
      netIncomePercent: percentChange(finance.totals?.netIncome, finance.comparisonTotals?.netIncome),
      operatingResultPercent: percentChange(finance.totals?.operatingResult, finance.comparisonTotals?.operatingResult),
      expensesPercent: percentChange(finance.totals?.expenses, finance.comparisonTotals?.expenses)
    }
  } : null;
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    range: range.key,
    period: { from: range.from, to: range.to, days: range.days },
    comparison: { from: range.previousFrom, to: range.previousTo },
    pulse: {
      occupancyPercent: current.occupancyPercent,
      occupancyDeltaPoints: round1(current.occupancyPercent - previous.occupancyPercent),
      roomNights: current.roomNights,
      arrivals: current.arrivals,
      departures: current.departures,
      confirmedBookings: current.confirmedBookings,
      cancellations: current.cancellations,
      cancellationRate: current.cancellationRate,
      averageStayNights: current.averageStayNights
    },
    forward: {
      from: range.forwardFrom,
      to: range.forwardTo,
      occupancyPercent: forward.occupancyPercent,
      roomNights: forward.roomNights,
      arrivals: forward.arrivals,
      departures: forward.departures,
      weekly: analyticsWeeklyBuckets(reservations, range.forwardFrom, range.forwardTo, roomsTotal)
    },
    channels: current.channels,
    rooms,
    operations,
    finance: financePayload,
    attention,
    dataQuality: {
      cancellationHistoryDays: 90,
      resolvedMaintenanceHistoryDays: 30,
      conciergeHistoryDays: 30,
      operationsHistoryComplete: range.days <= 30,
      note: range.days > 30 ? "Resolved maintenance and Concierge interaction/feedback records are retained for about 30 days, so those older operational signals may be incomplete. Reservation and Finance metrics use their own retained source records." : "Operational and Concierge history are within their current 30-day retention windows."
    }
  };
}

function beds24GuestDisplayName(booking = {}) {
  return cleanText([booking.firstName, booking.lastName].filter(Boolean).join(" "), 100);
}

function beds24GuestPhone(booking = {}) {
  const guests = Array.isArray(booking.guests) ? booking.guests : [];
  const candidates = [booking.phone, booking.mobile, booking.guestPhone, booking.phoneNumber, booking.mobileNumber, guests[0]?.phone, guests[0]?.mobile];
  for (const value of candidates) {
    const phone = String(value || "").replace(/\D/g, "").slice(0, 20);
    if (phone.length >= 8) return phone;
  }
  return "";
}

function finiteBookingNumber(...values) {
  for (const value of values) {
    if (value === "" || value === null || value === undefined) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function optionalBookingNumber(...values) {
  for (const value of values) {
    if (value === "" || value === null || value === undefined) continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function beds24GuestCounts(booking = {}) {
  const guests = Array.isArray(booking.guests) ? booking.guests : [];
  const adults = Math.max(0, Math.round(finiteBookingNumber(booking.numAdult, booking.numAdults, booking.adults, booking.adultCount)));
  const children = Math.max(0, Math.round(finiteBookingNumber(booking.numChild, booking.numChildren, booking.children, booking.childCount)));
  let total = adults + children;
  if (!total) total = Math.max(0, Math.round(finiteBookingNumber(booking.numGuests, booking.guestCount, booking.guestsCount, guests.length)));
  return { adults, children, total };
}

function reservationNightCount(checkInDate, checkOutDate) {
  if (!validDate(checkInDate) || !validDate(checkOutDate)) return 0;
  const start = Date.parse(`${checkInDate}T00:00:00Z`);
  const end = Date.parse(`${checkOutDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function maskedPhone(value) {
  const phone = String(value || "").replace(/\D/g, "");
  return phone.length >= 8 ? `•••• ${phone.slice(-4)}` : "";
}

function reservationWindowKey(room, checkInDate, checkOutDate) {
  return `${cleanText(room, 4)}|${cleanText(checkInDate, 10)}|${cleanText(checkOutDate, 10)}`;
}

function reservationGuestDisplayName(item, role = "owner") {
  const value = cleanText(item?.guestDisplayName || item?.guestFirstName, 100);
  if (!value) return "";
  return role === "staff" ? value.split(/\s+/)[0] : value;
}

async function enrichReservationsWithBeds24GuestContacts(reservations, env, store, from, to) {
  const source = Array.isArray(reservations) ? reservations : [];
  if (!source.length || !env.BEDS24_REFRESH_TOKEN || !store) return source;
  const start = validDate(from) ? from : bangkokDate(-30);
  const end = validDate(to) ? to : bangkokDate(90);
  try {
    const bookings = [];
    for (let page = 1; page <= 4; page += 1) {
      const response = await beds24ApiRequest(env, store, "bookings", {
        query: { departureFrom: shiftedDateOnly(start, -1), arrivalTo: shiftedDateOnly(end, 1), includeGuests: true, page }
      });
      if (Array.isArray(response?.data)) bookings.push(...response.data);
      if (!response?.pages?.nextPageExists) break;
    }
    const contacts = new Map();
    for (const booking of bookings) {
      const room = roomForBeds24Booking(booking, env);
      const arrival = cleanText(booking?.arrival, 10);
      const departure = cleanText(booking?.departure, 10);
      if (!room || !validDate(arrival) || !validDate(departure)) continue;
      const guestCounts = beds24GuestCounts(booking);
      contacts.set(reservationWindowKey(room, arrival, departure), {
        name: beds24GuestDisplayName(booking),
        phone: beds24GuestPhone(booking),
        beds24BookingId: String(booking.id || ""),
        providerReference: cleanText(booking.apiReference || booking.reference || booking.channelReference || booking.bookingReference, 120),
        bookingPrice: optionalBookingNumber(booking.price, booking.totalPrice, booking.bookingPrice),
        bookingCommission: optionalBookingNumber(booking.commission),
        bookingCurrency: cleanText(booking.currency || env.EXPENSE_CURRENCY || "THB", 8).toUpperCase(),
        adults: guestCounts.adults,
        children: guestCounts.children,
        guestCount: guestCounts.total
      });
    }
    return source.map((item) => {
      const contact = contacts.get(reservationWindowKey(item.room, item.checkInDate, item.checkOutDate));
      return contact ? {
        ...item,
        ...(contact.name ? { guestDisplayName: contact.name } : {}),
        ...(contact.phone ? { guestPhone: contact.phone } : {}),
        beds24BookingId: contact.beds24BookingId,
        providerReference: contact.providerReference,
        bookingPrice: contact.bookingPrice,
        bookingCommission: contact.bookingCommission,
        bookingCurrency: contact.bookingCurrency,
        adults: contact.adults,
        children: contact.children,
        guestCount: contact.guestCount
      } : item;
    });
  } catch (_error) {
    return source;
  }
}

function providerLabel(provider) {
  const value = cleanText(provider, 50).toLowerCase();
  const labels = {
    airbnb: "Airbnb", booking: "Booking.com", "booking.com": "Booking.com", expedia: "Expedia",
    vrbo: "Vrbo", agoda: "Agoda", hostelworld: "Hostelworld", "trip.com": "Trip.com", trip: "Trip.com",
    direct: "Direct", walkin: "Walk-in", "walk-in": "Walk-in"
  };
  return labels[value] || (value ? value.charAt(0).toUpperCase() + value.slice(1) : "Other");
}

function providerSupportsBeds24Messaging(provider) {
  return ["airbnb", "booking", "booking.com", "expedia", "vrbo"].includes(cleanText(provider, 50).toLowerCase());
}

function dialPhone(value) {
  const phone = String(value || "").replace(/[^+\d]/g, "").slice(0, 24);
  return /^\+?\d{7,20}$/.test(phone) ? phone : "";
}

function publicReservation(item, role, options = {}) {
  const canSeeBookingFinancials = Boolean(options.canSeeBookingFinancials) && role !== "staff";
  const canSeeProviderReference = role !== "staff";
  const hasBookingPrice = item.bookingPrice !== undefined && item.bookingPrice !== null && item.bookingPrice !== "" && Number.isFinite(Number(item.bookingPrice));
  return {
    id: item.id,
    provider: item.provider,
    sourceLabel: providerLabel(item.provider),
    room: String(item.room || ""),
    guestName: reservationGuestDisplayName(item, role),
    checkInDate: item.checkInDate,
    checkOutDate: item.checkOutDate,
    nights: reservationNightCount(item.checkInDate, item.checkOutDate),
    status: item.status,
    registrationStatus: item.registrationStatus || "not_started",
    guestType: role === "staff" ? "" : item.guestType || "",
    requiredPassports: role === "staff" ? undefined : Number(item.requiredPassports) || 0,
    receivedPassports: role === "staff" ? undefined : Number(item.receivedPassports) || 0,
    adults: Math.max(0, Number(item.adults) || 0),
    children: Math.max(0, Number(item.children) || 0),
    guestCount: Math.max(0, Number(item.guestCount) || 0),
    providerReference: canSeeProviderReference ? cleanText(item.providerReference, 120) : "",
    beds24BookingId: canSeeProviderReference ? cleanText(item.beds24BookingId, 40) : "",
    bookingPrice: canSeeBookingFinancials && hasBookingPrice ? Math.max(0, Number(item.bookingPrice)) : undefined,
    bookingCurrency: canSeeBookingFinancials && hasBookingPrice ? cleanText(item.bookingCurrency || "THB", 8).toUpperCase() : "",
    lateCheckoutTime: item.lateCheckoutTime || "",
    lateCheckoutFeeThb: role === "owner" ? Number(item.lateCheckoutFeeThb) || 0 : undefined,
    whatsAppAvailable: role === "staff" ? false : Boolean(item.guestPhone),
    guestPhoneMasked: role === "staff" ? "" : maskedPhone(item.guestPhone)
  };
}

function publicReservationActivity(item) {
  return {
    id: item.id,
    reservationId: item.reservationId,
    kind: item.kind === "task" ? "task" : "note",
    category: item.category || "",
    body: item.body || "",
    assigneeKey: item.assigneeKey || "",
    assigneeLabel: item.assigneeLabel || "",
    status: item.status || (item.kind === "task" ? "open" : "note"),
    deliveryAttempted: Number(item.deliveryAttempted) || 0,
    deliveryAccepted: Number(item.deliveryAccepted) || 0,
    createdByLabel: item.createdByLabel || "Team member",
    receivedAt: item.receivedAt || "",
    resolvedAt: item.resolvedAt || "",
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || ""
  };
}

function publicTaskAssignments(env) {
  return operationalTaskAssignments(env).map((item) => ({
    key: item.key,
    label: item.label,
    members: item.members,
    available: Boolean(item.available)
  }));
}


function bookingTaskRoutingKey(category) {
  const value = cleanText(category, 60).toLowerCase();
  if (value === "housekeeping") return "housekeeping";
  if (value === "maintenance") return "maintenance";
  if (value === "guest support") return "guest_support";
  if (value === "reservations") return "reservations";
  if (value === "owner") return "owner";
  return "general";
}

function bookingTaskAlertType(category) {
  const value = cleanText(category, 60).toLowerCase();
  if (value === "housekeeping") return "booking_task_housekeeping";
  if (value === "maintenance") return "booking_task_maintenance";
  if (value === "guest support") return "booking_task_guest_support";
  if (value === "reservations") return "booking_task_reservations";
  if (value === "owner") return "booking_task_owner";
  return "booking_task_general";
}

function publicThread(thread) {
  return {
    id: thread.id,
    channel: thread.channel,
    sourceLabel: thread.sourceLabel,
    reservationId: thread.reservationId,
    room: thread.room,
    guestName: thread.guestName,
    checkInDate: thread.checkInDate,
    checkOutDate: thread.checkOutDate,
    unreadCount: Number(thread.unreadCount) || 0,
    needsHuman: Boolean(thread.needsHuman),
    aiPaused: Boolean(thread.aiPaused),
    aiDraft: Boolean(thread.aiDraft),
    lastMessageAt: thread.lastMessageAt,
    lastMessagePreview: thread.lastMessagePreview,
    lastDirection: thread.lastDirection,
    lastSender: thread.lastSender,
    lastError: thread.lastError
  };
}

async function rateLimitLogin(request, env, email) {
  if (!env.MOBILE_AUTH_RATE_LIMITER?.limit) return true;
  const ip = cleanText(request.headers.get("cf-connecting-ip"), 80) || "unknown";
  const key = (await sha256(`${ip}:${email}`)).slice(0, 32);
  try {
    return Boolean((await env.MOBILE_AUTH_RATE_LIMITER.limit({ key: `mobile-login:${key}` }))?.success);
  } catch (_error) {
    return false;
  }
}

async function authenticate(request, env, store) {
  if (!mobileEnabled(env)) return { error: json({ error: "mobile_app_disabled" }, 503) };
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token.startsWith("mob_")) return { error: json({ error: "unauthorized" }, 401) };
  const now = new Date().toISOString();
  const hash = await sessionHash(token, env);
  const record = await store.mobileGetSession(hash, now);
  if (!record || record.userStatus !== "active" || record.membershipStatus !== "active" || record.tenantStatus !== "active") {
    return { error: json({ error: "unauthorized" }, 401) };
  }
  if (deviceBindingEnabled(env)) {
    const suppliedDeviceId = cleanText(request.headers.get("x-mobile-device-id"), 180);
    if (!record.deviceId || !suppliedDeviceId || !constantTimeEqual(record.deviceId, suppliedDeviceId)) {
      return { error: json({ error: "device_binding_failed" }, 401) };
    }
  }
  const permissions = new Set(parsePermissions(record));
  const properties = await store.mobileListProperties(record.tenantId);
  const entitlements = await store.mobileListEntitlements(record.tenantId);
  let modules = activeModuleKeys(entitlements, now);
  const license = await ensureHouseLicense(store, record.tenantId, env, now);
  const licenseCheck = await licenseValidation(license, env, now);
  if (!licenseCheck.ok) return { error: json({ error: licenseCheck.error }, licenseCheck.error === "license_service_unavailable" ? 503 : 402) };
  if (licenseCheck.enforced) {
    const licensedModules = new Set(canonicalLicenseModules(license?.modules || license?.modulesJson));
    modules = new Set([...modules].filter((moduleKey) => licensedModules.has(moduleKey)));
  }
  await store.mobileTouchSession(record.sessionId, now);
  return { record, permissions, properties, entitlements, modules, license, licenseCheck, now, token };
}

async function bootstrap(request, env, store) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  if (!bootstrapEnabled(env)) return json({ error: "bootstrap_disabled" }, 404);
  const expected = String(env.MOBILE_BOOTSTRAP_TOKEN || "");
  const supplied = String(request.headers.get("x-mobile-bootstrap-token") || "");
  if (!expected || !supplied || !constantTimeEqual(expected, supplied)) return json({ error: "unauthorized" }, 401);
  if (await store.mobilePlatformHasUsers()) return json({ error: "already_bootstrapped" }, 409);
  let body;
  try { body = await readJson(request); } catch (response) { return response; }
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const displayName = cleanText(body.displayName, 120);
  if (!email || !passwordAccepted(password) || displayName.length < 2) return json({ error: "invalid_bootstrap" }, 400);
  if (!env.MOBILE_PASSWORD_PEPPER || !env.MOBILE_SESSION_PEPPER) return json({ error: "mobile_secrets_incomplete" }, 503);
  const salt = randomToken("salt");
  const hash = await derivePassword(password, salt, env.MOBILE_PASSWORD_PEPPER, PASSWORD_ITERATIONS);
  const now = new Date().toISOString();
  const result = await store.mobileBootstrapTenant({
    tenantId: HOUSE_TENANT_ID,
    tenantSlug: "the-house-koh-tao",
    tenantName: "The House - Koh Tao",
    propertyId: HOUSE_PROPERTY_ID,
    propertyExternalKey: HOUSE_PROPERTY_EXTERNAL_KEY,
    propertyName: "The House - Koh Tao",
    timezone: "Asia/Bangkok",
    currency: "THB",
    branding: { productWorkingName: "Taoedge Owner App", accent: "ocean", propertyMark: "TH" },
    userId: `puser_${crypto.randomUUID()}`,
    membershipId: `pmem_${crypto.randomUUID()}`,
    emailNormalized: email,
    displayName,
    passwordSalt: salt,
    passwordHash: hash,
    passwordIterations: PASSWORD_ITERATIONS,
    modules: DEFAULT_MODULES,
    createdAt: now
  });
  if (!result?.ok) return json({ error: result?.error || "bootstrap_failed" }, 409);
  return json({ ok: true, tenantId: result.tenantId, propertyId: result.propertyId, ownerEmail: email }, 201);
}

async function login(request, env, store) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  if (!mobileEnabled(env)) return json({ error: "mobile_app_disabled" }, 503);
  let body;
  try { body = await readJson(request); } catch (response) { return response; }
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (!email || !password || !(await rateLimitLogin(request, env, email))) return json({ error: "invalid_credentials" }, 401);
  const record = await store.mobileGetUserAuthByEmail(email);
  if (!record || record.userStatus !== "active" || record.membershipStatus !== "active" || record.tenantStatus !== "active") {
    return json({ error: "invalid_credentials" }, 401);
  }
  const derived = await derivePassword(password, record.passwordSalt, env.MOBILE_PASSWORD_PEPPER, Number(record.passwordIterations) || PASSWORD_ITERATIONS);
  if (!constantTimeEqual(derived, record.passwordHash)) return json({ error: "invalid_credentials" }, 401);
  const now = new Date().toISOString();
  const deviceId = cleanText(body.deviceId, 180);
  if (deviceBindingEnabled(env) && !deviceId) return json({ error: "device_id_required" }, 400);
  const license = await ensureHouseLicense(store, record.tenantId, env, now);
  const licenseCheck = await licenseValidation(license, env, now);
  if (!licenseCheck.ok) return json({ error: licenseCheck.error }, licenseCheck.error === "license_service_unavailable" ? 503 : 402);
  if (licenseCheck.enforced && Number(license?.maxDevices) > 0 && typeof store.mobileCountActiveDevices === "function") {
    const deviceCount = await store.mobileCountActiveDevices(record.tenantId, now, deviceId);
    if (!deviceCount.sameDevice && deviceCount.total >= Number(license.maxDevices)) {
      return json({ error: "device_limit_reached", maxDevices: Number(license.maxDevices) }, 403);
    }
  }
  const token = randomToken("mob");
  const tokenHash = await sessionHash(token, env);
  const sessionDays = Math.max(1, Math.min(90, Number(env.MOBILE_SESSION_TTL_DAYS) || DEFAULT_SESSION_DAYS));
  const expiresAt = new Date(Date.now() + sessionDays * 86_400_000).toISOString();
  const sessionId = `psess_${crypto.randomUUID()}`;
  await store.mobileCreateSession({
    id: sessionId,
    tokenHash,
    userId: record.userId,
    membershipId: record.membershipId,
    tenantId: record.tenantId,
    deviceId,
    deviceName: cleanText(body.deviceName, 160),
    platform: cleanText(body.platform, 30),
    appVersion: cleanText(body.appVersion, 40),
    createdAt: now,
    expiresAt
  });
  await store.mobileMarkLogin(record.userId, now);
  const properties = await store.mobileListProperties(record.tenantId);
  const entitlements = await store.mobileListEntitlements(record.tenantId);
  await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: "mobile_login", reference: `session:${sessionId}`, createdAt: now });
  const loginModules = licenseCheck.enforced ? new Set([...activeModuleKeys(entitlements, now)].filter((moduleKey) => new Set(canonicalLicenseModules(license?.modules || license?.modulesJson)).has(moduleKey))) : activeModuleKeys(entitlements, now);
  return json({ ok: true, sessionToken: token, expiresAt, license: publicLicense(license, licenseCheck), ...publicIdentity(record, properties, entitlements, loginModules) });
}

async function acceptInvite(request, env, store) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  if (!mobileEnabled(env)) return json({ error: "mobile_app_disabled" }, 503);
  let body;
  try { body = await readJson(request); } catch (response) { return response; }
  const inviteToken = cleanText(body.inviteToken, 500);
  const displayName = cleanText(body.displayName, 120);
  const password = String(body.password || "");
  if (!inviteToken.startsWith("invite_") || displayName.length < 2 || !passwordAccepted(password)) return json({ error: "invalid_invite" }, 400);
  const invite = await store.mobileGetInviteByHash(await inviteHash(inviteToken, env), new Date().toISOString());
  if (!invite) return json({ error: "invite_invalid" }, 404);
  const salt = randomToken("salt");
  const passwordHash = await derivePassword(password, salt, env.MOBILE_PASSWORD_PEPPER, PASSWORD_ITERATIONS);
  const outcome = await store.mobileAcceptInvite({
    inviteId: invite.id,
    userId: `puser_${crypto.randomUUID()}`,
    membershipId: `pmem_${crypto.randomUUID()}`,
    displayName,
    passwordSalt: salt,
    passwordHash,
    passwordIterations: PASSWORD_ITERATIONS,
    acceptedAt: new Date().toISOString()
  });
  if (!outcome?.ok) return json({ error: outcome?.error || "invite_failed" }, outcome?.error === "account_exists" ? 409 : 400);
  return json({ ok: true, email: invite.email, tenantName: invite.tenantName, role: outcome.role }, 201);
}

function homePayload(operations, overview, threads, finance, access) {
  const today = bangkokDate();
  const tomorrow = bangkokDate(1);
  const weekEnd = bangkokDate(7);
  const reservations = operations.reservations || [];
  const statuses = operations.housekeepingStatuses || [];
  const roomsTotal = Math.max(1, statuses.length || 11);
  const arrivals = reservations.filter((item) => item.checkInDate === today);
  const departures = reservations.filter((item) => item.checkOutDate === today);
  const tomorrowArrivals = reservations.filter((item) => item.checkInDate === tomorrow);
  const tomorrowDepartures = reservations.filter((item) => item.checkOutDate === tomorrow);
  const occupied = reservations.filter((item) => item.checkInDate <= today && item.checkOutDate > today).length;
  const tomorrowOccupied = reservations.filter((item) => item.checkInDate <= tomorrow && item.checkOutDate > tomorrow).length;
  const weekReservations = reservations.filter((item) => item.checkOutDate > today && item.checkInDate < weekEnd);
  const weekArrivals = reservations.filter((item) => item.checkInDate >= today && item.checkInDate < weekEnd);
  const weekDepartures = reservations.filter((item) => item.checkOutDate >= today && item.checkOutDate < weekEnd);
  let occupiedRoomNights = 0;
  for (let day = 0; day < 7; day += 1) {
    const date = bangkokDate(day);
    occupiedRoomNights += reservations.filter((item) => item.checkInDate <= date && item.checkOutDate > date).length;
  }
  const weekOccupancyPercent = Math.round((occupiedRoomNights / (roomsTotal * 7)) * 100);
  const dirty = statuses.filter((item) => item.status === "dirty").length;
  const ready = statuses.filter((item) => item.status === "ready").length;
  const pendingTasks = (operations.housekeepingTasks || []).filter((item) => ["pending", "received"].includes(item.status));
  const urgentMaintenance = (overview.maintenanceReports || []).filter((item) => item.status !== "resolved" && ["critical", "urgent"].includes(item.severity));
  const openMaintenance = Number(overview?.totals?.openMaintenanceReports) || 0;
  const pendingRegistrations = Number(overview?.totals?.pendingRegistrations) || 0;
  const events = [
    ...arrivals.map((item) => ({ id: `arrival:${item.id}`, type: "arrival", room: item.room, title: `Room ${item.room} arrival`, subtitle: reservationGuestDisplayName(item, access?.record?.role) || providerLabel(item.provider), time: "14:00", severity: "normal" })),
    ...departures.map((item) => ({ id: `departure:${item.id}`, type: "departure", room: item.room, title: `Room ${item.room} departure`, subtitle: reservationGuestDisplayName(item, access?.record?.role) || providerLabel(item.provider), time: item.lateCheckoutTime || "11:00", severity: "normal" })),
    ...pendingTasks.slice(0, 8).map((item) => ({ id: `housekeeping:${item.id}`, type: "housekeeping", room: item.room, title: `Room ${item.room} housekeeping`, subtitle: item.priority ? "Priority turnover" : "Turnover", time: item.requestedArrival || "", severity: item.priority ? "urgent" : "normal" })),
    ...urgentMaintenance.slice(0, 6).map((item) => ({ id: `maintenance:${item.id}`, type: "maintenance", room: item.room, title: `Room ${item.room} maintenance`, subtitle: item.issueType || "Issue reported", time: "", severity: item.severity || "urgent" }))
  ];
  const summary = {
    arrivals: arrivals.length,
    departures: departures.length,
    occupied,
    roomsTotal,
    ready,
    dirty,
    openMaintenance,
    pendingRegistrations,
    unreadMessages: threads.reduce((sum, item) => sum + (Number(item.unreadCount) || 0), 0),
    needsHuman: threads.filter((item) => item.needsHuman).length,
    tomorrowArrivals: tomorrowArrivals.length
  };
  return {
    date: today,
    summary,
    glance: {
      today: {
        date: today, arrivals: arrivals.length, departures: departures.length, occupied, roomsTotal,
        occupancyPercent: Math.round((occupied / roomsTotal) * 100), dirty, ready, openMaintenance, pendingRegistrations
      },
      tomorrow: {
        date: tomorrow, arrivals: tomorrowArrivals.length, departures: tomorrowDepartures.length, occupied: tomorrowOccupied, roomsTotal,
        occupancyPercent: Math.round((tomorrowOccupied / roomsTotal) * 100), turnovers: tomorrowDepartures.length
      },
      week: {
        from: today, to: bangkokDate(6), arrivals: weekArrivals.length, departures: weekDepartures.length,
        activeReservations: weekReservations.length, roomsTotal, occupancyPercent: weekOccupancyPercent,
        turnovers: weekDepartures.length, openMaintenance, pendingRegistrations
      }
    },
    finance: hasPermission(access, "finance.view") ? finance : null,
    events: events.sort((a, b) => String(a.time || "99:99").localeCompare(String(b.time || "99:99"))).slice(0, 24)
  };
}

async function handleProtected(request, env, path, store, handlers = {}) {
  const access = await authenticate(request, env, store);
  if (access.error) return access.error;
  const record = access.record;
  const publicAccess = { ...access, permissions: access.permissions };

  if (path === `${MOBILE_API_PREFIX}/session` && request.method === "GET") {
    return json({ ok: true, license: publicLicense(access.license, access.licenseCheck), ...publicIdentity(record, access.properties, access.entitlements, access.modules) });
  }

  if (path === `${MOBILE_API_PREFIX}/auth/logout` && request.method === "POST") {
    await store.mobileRevokeSession(record.sessionId, access.now);
    await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: "mobile_logout", reference: `session:${record.sessionId}`, createdAt: access.now });
    return json({ ok: true });
  }

  if (path === `${MOBILE_API_PREFIX}/home` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "home.view", "core");
    if (denied) return denied;
    const [operationsRaw, overview, threads] = await Promise.all([
      store.getStayOperationsOverview(), store.getAdminOverview(), store.listMessagingThreads(80)
    ]);
    const operations = { ...operationsRaw, reservations: await enrichReservationsWithBeds24GuestContacts(operationsRaw.reservations || [], env, store, bangkokDate(-1), bangkokDate(8)) };
    let finance = null;
    if (hasPermission(publicAccess, "finance.view") && hasModule(publicAccess, "finance")) {
      const month = currentMonth();
      const [expenses, income] = await Promise.all([store.listExpenses(month, HOUSE_FINANCE_BUSINESS_ID), store.listIncome(month, HOUSE_FINANCE_BUSINESS_ID)]);
      const configuration = incomeConfiguration(env, HOUSE_FINANCE_BUSINESS_ID);
      finance = { month, currency: configuration.currency, totals: summarizeFinance(expenses, income, configuration) };
    }
    return json({ ok: true, ...homePayload(operations, overview, threads, finance, publicAccess) });
  }

  if (path === `${MOBILE_API_PREFIX}/bookings` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "bookings.view", "bookings");
    if (denied) return denied;
    const url = new URL(request.url);
    const from = validDate(url.searchParams.get("from")) ? url.searchParams.get("from") : "";
    const to = validDate(url.searchParams.get("to")) ? url.searchParams.get("to") : "";
    const operations = await store.getStayOperationsOverview();
    const filteredReservations = (operations.reservations || [])
      .filter((item) => (!from || item.checkOutDate >= from) && (!to || item.checkInDate <= to));
    const enrichedReservations = await enrichReservationsWithBeds24GuestContacts(filteredReservations, env, store, from || bangkokDate(-30), to || bangkokDate(90));
    const reservations = enrichedReservations.map((item) => publicReservation(item, record.role));
    return json({ ok: true, from, to, reservations });
  }

  if (path === `${MOBILE_API_PREFIX}/bookings/detail` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "bookings.view", "bookings");
    if (denied) return denied;
    const id = cleanText(new URL(request.url).searchParams.get("id"), 100);
    if (!id) return json({ error: "invalid_request" }, 400);
    const raw = await store.getStayReservationById(id);
    if (!raw) return json({ error: "reservation_not_found" }, 404);
    const enriched = (await enrichReservationsWithBeds24GuestContacts([raw], env, store, raw.checkInDate, raw.checkOutDate))[0] || raw;
    const activity = (await store.mobileListReservationActivity(id, 160)).map(publicReservationActivity);
    const messagingConfiguration = unifiedMessagingConfiguration(env);
    const threads = hasPermission(publicAccess, "messaging.view") ? await store.listMessagingThreads(200) : [];
    const providerThread = threads.find((thread) => thread.channel === "beds24" && (thread.reservationId === id || (enriched.beds24BookingId && String(thread.externalReservationId || "") === String(enriched.beds24BookingId)))) || null;
    const whatsAppThread = threads.find((thread) => thread.channel === "whatsapp" && thread.reservationId === id) || null;
    const phone = record.role === "staff" ? "" : dialPhone(enriched.guestPhone);
    const providerMessagingAvailable = hasPermission(publicAccess, "messaging.view") && hasModule(publicAccess, "unified_messaging") && providerSupportsBeds24Messaging(enriched.provider) && Boolean(enriched.beds24BookingId);
    return json({
      ok: true,
      reservation: publicReservation(enriched, record.role, { canSeeBookingFinancials: hasPermission(publicAccess, "finance.view") }),
      communications: {
        provider: { available: providerMessagingAvailable, label: providerLabel(enriched.provider), threadId: providerThread?.id || "" },
        whatsapp: { available: hasPermission(publicAccess, "messaging.view") && record.role !== "staff" && Boolean(enriched.guestPhone), threadId: whatsAppThread?.id || "", canStart: Boolean(messagingConfiguration?.guestInitiation?.ready) },
        call: { available: record.role !== "staff" && Boolean(phone), phone }
      },
      activity,
      taskAssignments: publicTaskAssignments(env)
    });
  }

  if (path === `${MOBILE_API_PREFIX}/bookings/activity` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "booking_activity.create", "bookings");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const reservationId = cleanText(body?.reservationId, 100);
    const kind = body?.kind === "task" ? "task" : "note";
    const text = cleanText(body?.body, 1800);
    const category = cleanText(body?.category, 60) || (kind === "task" ? "General" : "Internal note");
    if (!reservationId || text.length < 2) return json({ error: "invalid_request" }, 400);
    const reservation = await store.getStayReservationById(reservationId);
    if (!reservation) return json({ error: "reservation_not_found" }, 404);
    const assignment = kind === "task" ? operationalTaskAssignment(env, bookingTaskRoutingKey(category)) : null;
    if (kind === "task" && !assignment) return json({ error: "task_assignee_unavailable" }, 409);
    const actorHash = await sha256(`mobile:${record.userId}:${record.membershipId}`);
    const activityId = `bact_${crypto.randomUUID()}`;
    const created = await store.mobileCreateReservationActivity({
      id: activityId, reservationId, kind, category, body: text,
      assigneeKey: assignment?.key || "", assigneeLabel: assignment?.label || "",
      createdByHash: actorHash, createdByLabel: record.displayName, createdAt: access.now
    });
    if (!created?.ok) return json({ error: created?.error || "activity_create_failed" }, 400);
    let delivery = { attempted: 0, accepted: 0 };
    if (kind === "task") {
      const shortRef = activityId.slice(-8);
      const alert = await createProtectedOperationsAlert({
        env, room: reservation.room, roomVerified: true,
        alertType: bookingTaskAlertType(category), severity: "attention",
        recipientGroup: assignment.recipientGroup,
        summary: `${text} · Booking task ref ${shortRef}`,
        escalationRequired: false, now: new Date(access.now)
      });
      if (alert) {
        delivery = await dispatchConciergeAlert(alert, env).catch(() => ({ attempted: 0, accepted: 0 }));
        await store.mobileLinkReservationActivityAlert(activityId, alert.id, delivery, access.now);
      }
    }
    await store.mobileRecordAudit({
      tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId,
      action: kind === "task" ? "booking_task_created" : "booking_note_created",
      reference: `reservation:${reservationId}`, metadata: { activityId, category, assigneeKey: assignment?.key || "", deliveryAccepted: Number(delivery.accepted) || 0 }, createdAt: access.now
    });
    const activity = await store.mobileGetReservationActivity(activityId);
    return json({ ok: true, activity: publicReservationActivity(activity), delivery }, 201);
  }

  if (path === `${MOBILE_API_PREFIX}/bookings/activity/status` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "booking_activity.update", "bookings");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const id = cleanText(body?.id, 100);
    const status = body?.status === "resolved" ? "resolved" : body?.status === "received" ? "received" : "";
    if (!id || !status) return json({ error: "invalid_request" }, 400);
    const activity = await store.mobileGetReservationActivity(id);
    if (!activity || activity.kind !== "task") return json({ error: "task_not_found" }, 404);
    if (activity.status === "resolved") return json({ ok: true, activity: publicReservationActivity(activity) });
    const actorHash = await sha256(`mobile:${record.userId}:${record.membershipId}`);
    if (!activity.alertId) return json({ error: "task_alert_missing" }, 409);
    if (status === "received") await store.acknowledgeAlert(activity.alertId, actorHash, access.now);
    else await store.resolveAlert(activity.alertId, actorHash, access.now);
    await store.mobileRecordAudit({
      tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId,
      action: status === "received" ? "booking_task_received" : "booking_task_resolved",
      reference: `reservation:${activity.reservationId}`, metadata: { activityId: id }, createdAt: access.now
    });
    const updated = await store.mobileGetReservationActivity(id);
    return json({ ok: true, activity: publicReservationActivity(updated) });
  }

  if (path === `${MOBILE_API_PREFIX}/calendar` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "calendar.view", "calendar");
    if (denied) return denied;
    const url = new URL(request.url);
    const from = validDate(url.searchParams.get("from")) ? url.searchParams.get("from") : bangkokDate(-2);
    const to = validDate(url.searchParams.get("to")) ? url.searchParams.get("to") : bangkokDate(28);
    const operations = await store.getStayOperationsOverview();
    const filteredReservations = (operations.reservations || []).filter((item) => item.checkOutDate >= from && item.checkInDate <= to);
    const enrichedReservations = await enrichReservationsWithBeds24GuestContacts(filteredReservations, env, store, from, to);
    const reservations = enrichedReservations.map((item) => publicReservation(item, record.role));
    return json({ ok: true, from, to, rooms: operations.housekeepingStatuses || [], reservations });
  }

  if (path === `${MOBILE_API_PREFIX}/inbox` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "messaging.view", "unified_messaging");
    if (denied) return denied;
    const threads = (await store.listMessagingThreads(80)).map(publicThread);
    return json({ ok: true, configuration: unifiedMessagingConfiguration(env), unread: threads.reduce((sum, item) => sum + item.unreadCount, 0), needsHuman: threads.filter((item) => item.needsHuman).length, threads });
  }

  if (path === `${MOBILE_API_PREFIX}/inbox/thread` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "messaging.view", "unified_messaging");
    if (denied) return denied;
    const id = cleanText(new URL(request.url).searchParams.get("id"), 100);
    const thread = await store.getMessagingThread(id);
    if (!thread) return json({ error: "not_found" }, 404);
    const messages = await store.listMessagingMessages(id, 100);
    await store.markMessagingThreadRead(id, access.now);
    return json({ ok: true, thread: publicThread({ ...thread, unreadCount: 0 }), messages });
  }

  if (path === `${MOBILE_API_PREFIX}/inbox/send` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "messaging.send", "unified_messaging");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const actorHash = await sha256(`mobile:${record.userId}:${record.membershipId}`);
    const internalRequest = new Request("https://internal.taoedge.invalid/api/concierge/admin/messaging/send", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {})
    });
    const response = await handleUnifiedMessagingAdminRequest(internalRequest, env, "/api/concierge/admin/messaging/send", store, actorHash);
    if (response?.ok) {
      await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: "message_sent", reference: `thread:${cleanText(body?.threadId, 100)}`, createdAt: access.now });
    }
    return response || json({ error: "send_failed" }, 502);
  }

  if (path === `${MOBILE_API_PREFIX}/inbox/provider/start` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "messaging.send", "unified_messaging");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const reservationId = cleanText(body.reservationId, 100);
    if (!reservationId) return json({ error: "invalid_reservation" }, 400);
    const reservation = await store.getStayReservationById(reservationId);
    if (!reservation) return json({ error: "reservation_not_found" }, 404);
    const enriched = (await enrichReservationsWithBeds24GuestContacts([reservation], env, store, reservation.checkInDate, reservation.checkOutDate))[0] || reservation;
    if (!providerSupportsBeds24Messaging(enriched.provider) || !enriched.beds24BookingId) return json({ error: "provider_messaging_unavailable" }, 409);
    let outcome;
    try {
      outcome = await openBeds24ReservationConversation({ env, store, reservation: enriched, bookingId: enriched.beds24BookingId });
    } catch (error) {
      return json({ error: error?.code || error?.message || "provider_messaging_failed" }, 502);
    }
    if (!outcome?.ok) return json({ error: outcome?.error || "provider_messaging_unavailable" }, 409);
    await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: "provider_thread_opened", reference: `reservation:${reservationId}`, metadata: { threadId: outcome.threadId, source: outcome.source }, createdAt: access.now });
    return json({ ok: true, threadId: outcome.threadId, source: outcome.source });
  }

  if (path === `${MOBILE_API_PREFIX}/inbox/whatsapp/start` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "messaging.send", "unified_messaging");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const reservationId = cleanText(body.reservationId, 100);
    if (!reservationId) return json({ error: "invalid_reservation" }, 400);
    const operations = await store.getStayOperationsOverview();
    const reservation = (operations.reservations || []).find((item) => item.id === reservationId);
    if (!reservation) return json({ error: "reservation_not_found" }, 404);
    const [enriched] = await enrichReservationsWithBeds24GuestContacts([reservation], env, store, reservation.checkInDate, reservation.checkOutDate);
    if (!enriched?.guestPhone) return json({ error: "guest_phone_unavailable" }, 409);
    let outcome;
    try {
      outcome = await startWhatsAppGuestConversation({ env, store, reservation: enriched, phone: enriched.guestPhone, guestName: reservationGuestDisplayName(enriched, record.role) });
    } catch (error) {
      const code = error?.message || "whatsapp_start_failed";
      return json({ error: code, configuration: whatsAppGuestInitiationConfiguration(env) }, code === "whatsapp_guest_template_not_configured" ? 409 : 502);
    }
    if (!outcome?.ok) return json({ error: outcome?.error || "whatsapp_start_failed" }, 409);
    await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: outcome.existing ? "whatsapp_thread_opened" : "whatsapp_thread_started", reference: `reservation:${reservationId}`, metadata: { threadId: outcome.threadId }, createdAt: access.now });
    return json({ ok: true, threadId: outcome.threadId, existing: Boolean(outcome.existing) });
  }

  if (path === `${MOBILE_API_PREFIX}/inbox/ai` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "messaging.ai_control", "unified_messaging");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const actorHash = await sha256(`mobile:${record.userId}:${record.membershipId}`);
    const internalRequest = new Request("https://internal.taoedge.invalid/api/concierge/admin/messaging/ai", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {})
    });
    const response = await handleUnifiedMessagingAdminRequest(internalRequest, env, "/api/concierge/admin/messaging/ai", store, actorHash);
    return response || json({ error: "ai_control_failed" }, 502);
  }

  if (path === `${MOBILE_API_PREFIX}/inbox/draft/review` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "messaging.ai_control", "unified_messaging");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const action = ["approve", "reject", "regenerate"].includes(String(body?.action || "")) ? String(body.action) : "";
    if (!action) return json({ error: "invalid_review_action" }, 400);
    if (action === "approve") {
      const sendDenied = requireCapability(publicAccess, "messaging.send", "unified_messaging");
      if (sendDenied) return sendDenied;
    }
    const threadId = cleanText(body?.threadId, 120);
    const draftId = cleanText(body?.draftId, 120);
    if (!threadId || !draftId) return json({ error: "invalid_request" }, 400);
    const outcome = await reviewMessagingDraft({
      env, store, threadId, draftId, action, message: cleanText(body?.message, 4000),
      generateReply: handlers.generateReply, actorLabel: record.displayName
    });
    const status = outcome?.ok ? 200 : outcome?.error === "draft_not_found" ? 404
      : ["operational_route_unavailable", "operational_notification_failed"].includes(outcome?.error) ? 409
      : outcome?.error === "ai_unavailable" ? 503 : 400;
    if (outcome?.ok) {
      await store.mobileRecordAudit({
        tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId,
        action: `ai_draft_${action === "approve" ? "approved" : action === "reject" ? "rejected" : "regenerated"}`,
        reference: `thread:${threadId}`, metadata: { draftId, activityId: outcome?.operation?.activityId || "" }, createdAt: access.now
      });
    }
    return json(outcome || { error: "draft_review_failed" }, status);
  }

  if (path === `${MOBILE_API_PREFIX}/analytics` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "analytics.view", "analytics");
    if (denied) return denied;
    const url = new URL(request.url);
    const range = analyticsRange(url.searchParams.get("range"));
    const [reservations, operations, statuses] = await Promise.all([
      store.mobileAnalyticsReservations(range.previousFrom, range.forwardTo),
      store.mobileAnalyticsOperations(range.from, range.to),
      store.listRoomHousekeepingStatuses()
    ]);
    const roomsTotal = Math.max(1, Array.isArray(statuses) ? statuses.length : 11);
    let finance = null;
    if (hasPermission(publicAccess, "finance.view") && hasModule(publicAccess, "finance")) {
      const [expenses, income, previousExpenses, previousIncome] = await Promise.all([
        store.listExpensesRange(range.from, range.to, HOUSE_FINANCE_BUSINESS_ID),
        store.listIncomeRange(range.from, range.to, HOUSE_FINANCE_BUSINESS_ID),
        store.listExpensesRange(range.previousFrom, range.previousTo, HOUSE_FINANCE_BUSINESS_ID),
        store.listIncomeRange(range.previousFrom, range.previousTo, HOUSE_FINANCE_BUSINESS_ID)
      ]);
      const configuration = incomeConfiguration(env, HOUSE_FINANCE_BUSINESS_ID);
      finance = {
        currency: configuration.currency,
        totals: summarizeFinance(expenses, income, configuration),
        comparisonTotals: summarizeFinance(previousExpenses, previousIncome, configuration)
      };
    }
    return json(buildAnalyticsPayload({ range, reservations, roomsTotal, operations, finance }));
  }

  if (path === `${MOBILE_API_PREFIX}/operations` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "operations.view", "core");
    if (denied) return denied;
    const [operations, overview] = await Promise.all([store.getStayOperationsOverview(), store.getAdminOverview()]);
    return json({
      ok: true,
      housekeepingStatuses: operations.housekeepingStatuses || [],
      housekeepingTasks: operations.housekeepingTasks || [],
      maintenance: (overview.maintenanceReports || []).map((item) => ({
        id: item.id, room: item.room, issueType: item.issueType, severity: item.severity, details: item.details,
        status: item.status, hasPhoto: Boolean(item.hasPhoto), createdAt: item.createdAt, resolvedAt: item.resolvedAt || ""
      })),
      registration: {
        pendingCount: Number(overview?.totals?.pendingRegistrations) || 0,
        rooms: (overview.pendingRegistrations || []).map((item) => ({ room: item.room, documentType: item.documentType, arrivalAt: item.arrivalAt, reminderSent: Boolean(item.reminderSentAt) }))
      }
    });
  }

  if (path === `${MOBILE_API_PREFIX}/operations/housekeeping` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "housekeeping.update", "housekeeping");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const room = cleanText(body.room, 4);
    const status = cleanText(body.status, 12).toLowerCase();
    if (!/^([1-9]|1[01])$/.test(room) || !["dirty", "clean", "ready"].includes(status)) return json({ error: "invalid_housekeeping_status" }, 400);
    const actorHash = await sha256(`mobile:${record.userId}:${record.membershipId}`);
    const outcome = await store.setRoomHousekeepingStatus(room, status, access.now, actorHash, status === "ready" ? { currentTaskId: "", serviceDate: "", arrivingReservationId: "" } : {});
    await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: `housekeeping_${status}`, reference: `room:${room}`, createdAt: access.now });
    return json(outcome, outcome?.ok ? 200 : 400);
  }

  if (path === `${MOBILE_API_PREFIX}/operations/maintenance/report` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "maintenance.create", "maintenance");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const room = cleanText(body.room, 4);
    const issueType = cleanText(body.issueType, 100);
    const details = cleanText(body.details, 500);
    const severity = ["attention", "urgent", "critical"].includes(String(body.severity || "").toLowerCase())
      ? String(body.severity).toLowerCase() : "attention";
    if (!/^([1-9]|1[01])$/.test(room) || issueType.length < 2 || details.length < 3) return json({ error: "invalid_maintenance_report" }, 400);
    const createdAt = access.now;
    const id = `maint_${crypto.randomUUID()}`;
    let alert = null;
    try {
      alert = await createProtectedOperationsAlert({
        env, room, alertType: "maintenance_staff_report", severity,
        recipientGroup: severity === "critical" ? operationalRecipientGroup("urgent") : operationalRecipientGroup("maintenance"),
        summary: `Staff app report — Room ${room} — ${issueType} — ${details}`,
        escalationRequired: severity === "critical"
      });
      await store.createMaintenanceReport({
        id, reservationId: "", room, issueType, severity, details, feeAccepted: false,
        photoObjectKey: "", photoMediaType: "", photoExtension: "", photoSizeBytes: 0,
        alertId: alert?.id || "", createdAt,
        deleteAfter: new Date(Date.now() + 30 * 86_400_000).toISOString()
      });
      if (alert) await dispatchConciergeAlert(alert, env).catch(() => {});
      await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: "maintenance_reported", reference: `maintenance:${id}`, metadata: { room, severity }, createdAt });
      return json({ ok: true, id, alertId: alert?.id || "" }, 201);
    } catch (_error) {
      return json({ error: "maintenance_report_failed" }, 503);
    }
  }

  if (path === `${MOBILE_API_PREFIX}/direct-stays` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "direct_stays.manage", "bookings");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const internalRequest = new Request("https://internal.taoedge.invalid/api/concierge/admin/direct-stays", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {})
    });
    const response = await handleStayAdminRequest(internalRequest, env, "/api/concierge/admin/direct-stays", store);
    if (response?.ok) {
      await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: "direct_stay_created", reference: `room:${cleanText(body?.room, 4)}`, createdAt: access.now });
    }
    return response || json({ error: "direct_stay_failed" }, 502);
  }

  if (path === `${MOBILE_API_PREFIX}/operations/maintenance/resolve` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "maintenance.resolve", "maintenance");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const id = cleanText(body.id, 100);
    if (!/^maint_[A-Za-z0-9-]{12,}$/.test(id)) return json({ error: "invalid_request" }, 400);
    const actorHash = await sha256(`mobile:${record.userId}:${record.membershipId}`);
    const outcome = await store.resolveMaintenanceReport(id, actorHash, access.now);
    await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: "maintenance_resolved", reference: `maintenance:${id}`, createdAt: access.now });
    return json(outcome, outcome?.ok ? 200 : 400);
  }

  if (path === `${MOBILE_API_PREFIX}/finance/expense-config` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "finance.expense_submit", "finance");
    if (denied) return denied;
    const configuration = expenseConfiguration(env, HOUSE_FINANCE_BUSINESS_ID);
    return json({
      ok: true,
      configuration: {
        currency: configuration.currency,
        minorUnitDigits: configuration.minorUnitDigits,
        categories: configuration.categories,
        paymentMethods: configuration.paymentMethods,
        maxReceiptMb: configuration.maxReceiptMb,
        locationLabel: configuration.locationLabel,
        locationExamples: configuration.locationExamples
      }
    });
  }

  if (path === `${MOBILE_API_PREFIX}/finance/expense-analyze` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "finance.expense_submit", "finance");
    if (denied) return denied;
    const actorHash = await sha256(`mobile:${record.userId}:${record.membershipId}`);
    const response = await handleExpenseAdminRequest(
      request, env, "/api/concierge/admin/expenses/analyze", store, actorHash,
      { role: record.role === "owner" ? "owner" : "staff", businessId: HOUSE_FINANCE_BUSINESS_ID }
    );
    return response || json({ error: "expense_analyze_failed" }, 502);
  }

  if (path === `${MOBILE_API_PREFIX}/finance/expense-submit` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "finance.expense_submit", "finance");
    if (denied) return denied;
    const actorHash = await sha256(`mobile:${record.userId}:${record.membershipId}`);
    const response = await handleExpenseAdminRequest(
      request, env, "/api/concierge/admin/expenses", store, actorHash,
      { role: record.role === "owner" ? "owner" : "staff", businessId: HOUSE_FINANCE_BUSINESS_ID }
    );
    if (response?.ok) {
      await store.mobileRecordAudit({
        tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId,
        action: "expense_submitted", reference: "finance:expense", createdAt: access.now
      });
    }
    return response || json({ error: "expense_submit_failed" }, 502);
  }

  if (path === `${MOBILE_API_PREFIX}/finance/import` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "finance.import", "finance");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const from = validDate(body.from) ? body.from : "";
    const to = validDate(body.to) ? body.to : "";
    const provider = cleanText(body.provider || "airbnb", 40).toLowerCase();
    if (!from || !to || to < from) return json({ error: "invalid_finance_import_range" }, 400);
    const result = await reconcileBeds24FinanceRange(env, { store, from, to, provider, force: true, now: new Date(access.now) });
    if (!result?.ok) return json(result, result?.error === "finance_provider_not_implemented" ? 409 : 400);
    await store.mobileRecordAudit({
      tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId,
      action: "finance_historical_import", reference: `provider:${provider}`,
      metadata: { from, to, scanned: result.scanned, created: result.created, updated: result.updated, unchanged: result.unchanged, expected: result.expected, paid: result.paid, reconciled: result.reconciled, refunded: result.refunded, voided: result.voided }, createdAt: access.now
    });
    return json(result);
  }

  if (path === `${MOBILE_API_PREFIX}/finance` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "finance.view", "finance");
    if (denied) return denied;
    const month = new URL(request.url).searchParams.get("month") || currentMonth();
    if (!validMonth(month)) return json({ error: "invalid_month" }, 400);
    const [expenses, income, lastImport] = await Promise.all([
      store.listExpenses(month, HOUSE_FINANCE_BUSINESS_ID),
      store.listIncome(month, HOUSE_FINANCE_BUSINESS_ID),
      typeof store.getMessagingProviderState === "function" ? store.getMessagingProviderState("beds24-finance-sync").catch(() => null) : null
    ]);
    const configuration = incomeConfiguration(env, HOUSE_FINANCE_BUSINESS_ID);
    return json({
      ok: true, month,
      configuration: { currency: configuration.currency, minorUnitDigits: configuration.minorUnitDigits, categories: configuration.categories },
      automation: { ...beds24FinanceSyncConfiguration(env), lastImport: lastImport?.value || null },
      totals: summarizeFinance(expenses, income, configuration),
      income: income.map((item) => ({
        id: item.id, incomeDate: item.incomeDate, category: item.category, description: item.description,
        gross: Number(item.grossMinor) / (10 ** configuration.minorUnitDigits), fees: Number(item.feesMinor) / (10 ** configuration.minorUnitDigits),
        net: Number(item.netMinor) / (10 ** configuration.minorUnitDigits), currency: item.currency, unit: item.unit,
        paymentMethod: item.paymentMethod, reference: item.reference, providerManaged: Boolean(item.sourceSystem && item.sourceSystem !== "manual"),
        sourceSystem: item.sourceSystem, sourceStatus: item.sourceStatus, syncedAt: item.syncedAt
      })),
      expenses: expenses.map((item) => ({
        id: item.id, expenseDate: item.expenseDate, category: item.category, description: item.description,
        amount: Number(item.amountMinor) / (10 ** configuration.minorUnitDigits), currency: item.currency,
        vendor: item.vendor, paymentMethod: item.paymentMethod, roomArea: item.roomArea, hasReceipt: Boolean(item.hasReceipt)
      }))
    });
  }

  if (path === `${MOBILE_API_PREFIX}/platform` && request.method === "GET") {
    const integrationAllowed = hasPermission(publicAccess, "integrations.view") && hasModule(publicAccess, "integrations");
    const messagingAllowed = hasPermission(publicAccess, "messaging.view") && hasModule(publicAccess, "unified_messaging");
    const financeAllowed = hasPermission(publicAccess, "finance.view") && hasModule(publicAccess, "finance");
    return json({
      ok: true,
      identity: publicIdentity(record, access.properties, access.entitlements, access.modules),
      license: publicLicense(access.license, access.licenseCheck),
      integrations: integrationAllowed ? integrationAdminOverview(env) : undefined,
      messaging: messagingAllowed ? unifiedMessagingConfiguration(env) : undefined,
      financeAutomation: financeAllowed ? beds24FinanceSyncConfiguration(env) : undefined,
      product: {
        workingName: "Taoedge Owner App",
        commercialBrandPending: true,
        nativeBillingStrategy: "store-compliant-abstraction"
      }
    });
  }

  if (path === `${MOBILE_API_PREFIX}/team` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "staff.manage", "staff_access");
    if (denied) return denied;
    const users = await store.mobileListTenantUsers(record.tenantId);
    return json({ ok: true, users: users.map((item) => ({
      userId: item.userId, email: item.email, displayName: item.displayName, role: item.role,
      status: item.membershipStatus, lastLoginAt: item.lastLoginAt, joinedAt: item.joinedAt,
      permissions: parsePermissions(item),
      permissionOverrides: safeJson(item.permissionOverridesJson, {})
    })) });
  }

  if (path === `${MOBILE_API_PREFIX}/team/invite` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "staff.manage", "staff_access");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const email = normalizeEmail(body.email);
    const role = ["manager", "staff"].includes(body.role) ? body.role : "";
    if (!email || !role) return json({ error: "invalid_invite" }, 400);
    const permissionOverrides = sanitizePermissionOverrides(role, body.permissionOverrides || {});
    const inviteToken = randomToken("invite");
    const now = access.now;
    const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const properties = access.properties.filter((item) => item.active).map((item) => item.id);
    const outcome = await store.mobileCreateInvite({
      id: `pinvite_${crypto.randomUUID()}`, tenantId: record.tenantId, emailNormalized: email, role,
      tokenHash: await inviteHash(inviteToken, env), propertyScope: properties,
      permissionOverrides, createdByUserId: record.userId, createdAt: now, expiresAt
    });
    await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: "staff_invited", reference: `email:${email}`, metadata: { role, permissionOverrides }, createdAt: now });
    return json({ ok: Boolean(outcome?.ok), inviteToken, expiresAt, email, role, permissionOverrides }, 201);
  }

  if (path === `${MOBILE_API_PREFIX}/team/permissions` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "staff.manage", "staff_access");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const userId = cleanText(body.userId, 100);
    if (!userId || userId === record.userId) return json({ error: "invalid_member" }, 400);
    const users = await store.mobileListTenantUsers(record.tenantId);
    const target = users.find((item) => item.userId === userId);
    if (!target || target.role === "owner") return json({ error: "member_not_found" }, 404);
    const permissionOverrides = sanitizePermissionOverrides(target.role, body.permissionOverrides || {});
    const outcome = await store.mobileUpdateMembershipPermissions(record.tenantId, userId, permissionOverrides, access.now);
    if (!outcome?.ok) return json({ error: outcome?.error || "permission_update_failed" }, 400);
    await store.mobileRecordAudit({
      tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId,
      action: "staff_permissions_updated", reference: `user:${userId}`,
      metadata: { role: target.role, permissionOverrides }, createdAt: access.now
    });
    return json({ ok: true, userId, role: target.role, permissionOverrides });
  }

  if (path === `${MOBILE_API_PREFIX}/security/sessions` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "security.sessions", "core");
    if (denied) return denied;
    const sessions = await store.mobileListSessions(record.tenantId);
    return json({ ok: true, currentSessionId: record.sessionId, sessions: sessions.map((item) => ({ ...item, active: !item.revokedAt && item.expiresAt > access.now })) });
  }

  if (path === `${MOBILE_API_PREFIX}/security/audit` && request.method === "GET") {
    const denied = requireCapability(publicAccess, "security.sessions", "core");
    if (denied) return denied;
    const audit = typeof store.mobileListAudit === "function" ? await store.mobileListAudit(record.tenantId, 100) : [];
    return json({ ok: true, audit: audit.map((item) => ({ ...item, metadata: safeJson(item.metadataJson, {}) })) });
  }

  if (path === `${MOBILE_API_PREFIX}/security/revoke` && request.method === "POST") {
    const denied = requireCapability(publicAccess, "security.sessions", "core");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const id = cleanText(body.sessionId, 100);
    if (!id) return json({ error: "invalid_request" }, 400);
    const outcome = await store.mobileRevokeTenantSession(record.tenantId, id, access.now);
    await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: "session_revoked", reference: `session:${id}`, createdAt: access.now });
    return json(outcome, outcome?.ok ? 200 : 404);
  }

  if (path === `${MOBILE_API_PREFIX}/push/register` && request.method === "POST") {
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const deviceId = cleanText(body.deviceId, 180);
    const expoPushToken = cleanText(body.expoPushToken, 300);
    if (!deviceId || !/^(?:Exponent|Expo)PushToken\[[^\]]+\]$/.test(expoPushToken)) return json({ error: "invalid_push_token" }, 400);
    const outcome = await store.mobileUpsertPushDevice({
      id: `push_${crypto.randomUUID()}`, tenantId: record.tenantId, userId: record.userId,
      deviceId, expoPushToken, platform: cleanText(body.platform, 30), appVersion: cleanText(body.appVersion, 40), updatedAt: access.now
    });
    return json(outcome, outcome?.ok ? 200 : 400);
  }

  return json({ error: "not_found" }, 404);
}

export function mobilePlatformConfiguration(env = {}) {
  return {
    enabled: mobileEnabled(env),
    bootstrapEnabled: bootstrapEnabled(env),
    sessionTtlDays: Math.max(1, Math.min(90, Number(env.MOBILE_SESSION_TTL_DAYS) || DEFAULT_SESSION_DAYS)),
    passwordPepperConfigured: Boolean(env.MOBILE_PASSWORD_PEPPER),
    sessionPepperConfigured: Boolean(env.MOBILE_SESSION_PEPPER),
    invitePepperConfigured: Boolean(env.MOBILE_INVITE_PEPPER || env.MOBILE_SESSION_PEPPER),
    licenseEnforcementEnabled: licenseEnforcementEnabled(env),
    licenseSigningSecretConfigured: Boolean(env.MOBILE_LICENSE_SIGNING_SECRET),
    deviceBindingEnabled: deviceBindingEnabled(env),
    licenseAdminTokenConfigured: Boolean(env.TAOEDGE_LICENSE_ADMIN_TOKEN)
  };
}

export async function handleMobileLicenseAdminRequest(request, env, path) {
  if (path !== "/api/licensing/v1/tenant/license") return null;
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  if (env.LICENSE_ADMIN_RATE_LIMITER?.limit) {
    const ip = cleanText(request.headers.get("cf-connecting-ip"), 80) || "unknown";
    const key = (await sha256(`license-admin:${ip}`)).slice(0, 32);
    try {
      if (!(await env.LICENSE_ADMIN_RATE_LIMITER.limit({ key }))?.success) return json({ error: "rate_limited" }, 429);
    } catch (_error) {
      return json({ error: "license_service_unavailable" }, 503);
    }
  }
  const expected = String(env.TAOEDGE_LICENSE_ADMIN_TOKEN || "");
  const supplied = String(request.headers.get("x-taoedge-license-admin-token") || "");
  if (!expected || !supplied || !constantTimeEqual(expected, supplied)) return json({ error: "unauthorized" }, 401);
  if (!env.MOBILE_LICENSE_SIGNING_SECRET) return json({ error: "license_signing_not_configured" }, 503);
  const store = getStore(env);
  if (!store || typeof store.mobileUpsertLicense !== "function") return json({ error: "mobile_store_unavailable" }, 503);
  let body; try { body = await readJson(request); } catch (response) { return response; }
  const tenantId = cleanText(body.tenantId, 100);
  const status = ["active", "trial", "suspended", "revoked"].includes(cleanText(body.status, 30)) ? cleanText(body.status, 30) : "active";
  const properties = tenantId ? await store.mobileListProperties(tenantId) : [];
  if (!tenantId || !properties.length) return json({ error: "tenant_not_found" }, 404);
  const now = new Date().toISOString();
  const modules = canonicalLicenseModules(body.modules);
  if (!modules.length && ["active", "trial"].includes(status)) return json({ error: "license_modules_required" }, 400);
  const record = {
    tenantId,
    licenseId: cleanText(body.licenseId, 120) || `lic_${crypto.randomUUID()}`,
    status,
    planKey: cleanText(body.planKey, 60) || "standard",
    validFrom: cleanText(body.validFrom, 40) || now,
    validUntil: cleanText(body.validUntil, 40),
    maxDevices: Math.max(1, Math.min(50, Number(body.maxDevices) || 3)),
    issuedBy: "taoedge-license-service",
    modules,
    metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {},
    updatedAt: now
  };
  record.signature = await signLicense(record, env);
  const outcome = await store.mobileUpsertLicense(record);
  if (typeof store.mobileReplaceEntitlements === "function") {
    await store.mobileReplaceEntitlements(tenantId, modules, { status: status === "active" || status === "trial" ? "active" : "inactive", validFrom: record.validFrom, validUntil: record.validUntil, source: "license", updatedAt: now });
  } else if (typeof store.mobileUpsertEntitlements === "function") {
    await store.mobileUpsertEntitlements(tenantId, modules, { status: status === "active" || status === "trial" ? "active" : "inactive", validFrom: record.validFrom, validUntil: record.validUntil, source: "license", updatedAt: now });
  }
  await store.mobileRecordAudit({ tenantId, action: `license_${status}`, reference: `license:${record.licenseId}`, metadata: { planKey: record.planKey, validUntil: record.validUntil, maxDevices: record.maxDevices, modules }, createdAt: now });
  return json({ ok: Boolean(outcome?.ok), license: publicLicense(record, { enforced: true }), modules }, outcome?.ok ? 200 : 400);
}

export async function handleMobilePlatformRequest(request, env, path, handlers = {}) {
  if (!path.startsWith(MOBILE_API_PREFIX)) return null;
  const store = getStore(env);
  if (!store) return json({ error: "mobile_store_unavailable" }, 503);
  if (path === `${MOBILE_API_PREFIX}/auth/bootstrap`) return bootstrap(request, env, store);
  if (path === `${MOBILE_API_PREFIX}/auth/login`) return login(request, env, store);
  if (path === `${MOBILE_API_PREFIX}/auth/accept-invite`) return acceptInvite(request, env, store);
  return handleProtected(request, env, path, store, handlers);
}

export const MOBILE_DEFAULT_MODULES = DEFAULT_MODULES;
