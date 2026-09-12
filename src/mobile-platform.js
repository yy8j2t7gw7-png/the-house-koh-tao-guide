import { HOUSE_FINANCE_BUSINESS_ID } from "./finance-businesses.js";
import { expenseConfiguration, handleExpenseAdminRequest } from "./expense-api.js";
import { incomeConfiguration, summarizeFinance } from "./finance-api.js";
import { beds24FinanceSyncConfiguration } from "./beds24-finance-sync.js";
import { integrationAdminOverview } from "./integration-catalog.js";
import { handleUnifiedMessagingAdminRequest, unifiedMessagingConfiguration } from "./unified-messaging.js";
import { handleStayAdminRequest } from "./stay-api.js";
import { createProtectedOperationsAlert, dispatchConciergeAlert } from "./whatsapp-alerts.js";

const MOBILE_API_PREFIX = "/api/mobile/v1";
const PASSWORD_ITERATIONS = 210000;
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
    "home.view", "bookings.view", "calendar.view",
    "messaging.view", "messaging.send", "messaging.ai_control",
    "operations.view", "housekeeping.update", "maintenance.view", "maintenance.create", "maintenance.resolve",
    "registration.status", "finance.view", "finance.expense_submit", "analytics.view", "integrations.view",
    "staff.manage", "licenses.view", "licenses.manage", "security.sessions",
    "direct_stays.manage", "guest_documents.view"
  ]),
  manager: Object.freeze([
    "home.view", "bookings.view", "calendar.view",
    "messaging.view", "messaging.send", "messaging.ai_control",
    "operations.view", "housekeeping.update", "maintenance.view", "maintenance.create", "maintenance.resolve",
    "registration.status", "finance.expense_submit", "analytics.view", "integrations.view", "direct_stays.manage"
  ]),
  staff: Object.freeze([
    "home.view", "bookings.view", "calendar.view", "operations.view",
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

function publicIdentity(record, properties = [], entitlements = []) {
  const permissions = parsePermissions(record);
  const modules = entitlements
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

function providerLabel(provider) {
  const value = cleanText(provider, 50).toLowerCase();
  const labels = {
    airbnb: "Airbnb", booking: "Booking.com", "booking.com": "Booking.com", expedia: "Expedia",
    vrbo: "Vrbo", agoda: "Agoda", hostelworld: "Hostelworld", "trip.com": "Trip.com", trip: "Trip.com",
    direct: "Direct", walkin: "Walk-in", "walk-in": "Walk-in"
  };
  return labels[value] || (value ? value.charAt(0).toUpperCase() + value.slice(1) : "Other");
}

function publicReservation(item, role) {
  return {
    id: item.id,
    provider: item.provider,
    sourceLabel: providerLabel(item.provider),
    room: String(item.room || ""),
    guestName: cleanText(item.guestFirstName, 80),
    checkInDate: item.checkInDate,
    checkOutDate: item.checkOutDate,
    status: item.status,
    registrationStatus: item.registrationStatus || "not_started",
    guestType: role === "staff" ? "" : item.guestType || "",
    requiredPassports: role === "staff" ? undefined : Number(item.requiredPassports) || 0,
    receivedPassports: role === "staff" ? undefined : Number(item.receivedPassports) || 0,
    lateCheckoutTime: item.lateCheckoutTime || "",
    lateCheckoutFeeThb: role === "owner" ? Number(item.lateCheckoutFeeThb) || 0 : undefined
  };
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
  const permissions = new Set(parsePermissions(record));
  const properties = await store.mobileListProperties(record.tenantId);
  const entitlements = await store.mobileListEntitlements(record.tenantId);
  await store.mobileTouchSession(record.sessionId, now);
  return { record, permissions, properties, entitlements, now, token };
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
  const token = randomToken("mob");
  const tokenHash = await sessionHash(token, env);
  const now = new Date().toISOString();
  const sessionDays = Math.max(1, Math.min(90, Number(env.MOBILE_SESSION_TTL_DAYS) || DEFAULT_SESSION_DAYS));
  const expiresAt = new Date(Date.now() + sessionDays * 86_400_000).toISOString();
  const sessionId = `psess_${crypto.randomUUID()}`;
  await store.mobileCreateSession({
    id: sessionId,
    tokenHash,
    userId: record.userId,
    membershipId: record.membershipId,
    tenantId: record.tenantId,
    deviceId: cleanText(body.deviceId, 180),
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
  return json({ ok: true, sessionToken: token, expiresAt, ...publicIdentity(record, properties, entitlements) });
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
  const reservations = operations.reservations || [];
  const arrivals = reservations.filter((item) => item.checkInDate === today);
  const departures = reservations.filter((item) => item.checkOutDate === today);
  const tomorrowArrivals = reservations.filter((item) => item.checkInDate === tomorrow);
  const occupied = reservations.filter((item) => item.checkInDate <= today && item.checkOutDate > today).length;
  const statuses = operations.housekeepingStatuses || [];
  const dirty = statuses.filter((item) => item.status === "dirty").length;
  const ready = statuses.filter((item) => item.status === "ready").length;
  const pendingTasks = (operations.housekeepingTasks || []).filter((item) => ["pending", "received"].includes(item.status));
  const urgentMaintenance = (overview.maintenanceReports || []).filter((item) => item.status !== "resolved" && ["critical", "urgent"].includes(item.severity));
  const events = [
    ...arrivals.map((item) => ({ id: `arrival:${item.id}`, type: "arrival", room: item.room, title: `Room ${item.room} arrival`, subtitle: item.guestFirstName || providerLabel(item.provider), time: "14:00", severity: "normal" })),
    ...departures.map((item) => ({ id: `departure:${item.id}`, type: "departure", room: item.room, title: `Room ${item.room} departure`, subtitle: item.guestFirstName || providerLabel(item.provider), time: item.lateCheckoutTime || "11:00", severity: "normal" })),
    ...pendingTasks.slice(0, 8).map((item) => ({ id: `housekeeping:${item.id}`, type: "housekeeping", room: item.room, title: `Room ${item.room} housekeeping`, subtitle: item.priority ? "Priority turnover" : "Turnover", time: item.requestedArrival || "", severity: item.priority ? "urgent" : "normal" })),
    ...urgentMaintenance.slice(0, 6).map((item) => ({ id: `maintenance:${item.id}`, type: "maintenance", room: item.room, title: `Room ${item.room} maintenance`, subtitle: item.issueType || "Issue reported", time: "", severity: item.severity || "urgent" }))
  ];
  return {
    date: today,
    summary: {
      arrivals: arrivals.length,
      departures: departures.length,
      occupied,
      roomsTotal: 11,
      ready,
      dirty,
      openMaintenance: Number(overview?.totals?.openMaintenanceReports) || 0,
      pendingRegistrations: Number(overview?.totals?.pendingRegistrations) || 0,
      unreadMessages: threads.reduce((sum, item) => sum + (Number(item.unreadCount) || 0), 0),
      needsHuman: threads.filter((item) => item.needsHuman).length,
      tomorrowArrivals: tomorrowArrivals.length
    },
    finance: hasPermission(access, "finance.view") ? finance : null,
    events: events.sort((a, b) => String(a.time || "99:99").localeCompare(String(b.time || "99:99"))).slice(0, 24)
  };
}

async function handleProtected(request, env, path, store) {
  const access = await authenticate(request, env, store);
  if (access.error) return access.error;
  const record = access.record;
  const publicAccess = { ...access, permissions: access.permissions };

  if (path === `${MOBILE_API_PREFIX}/session` && request.method === "GET") {
    return json({ ok: true, ...publicIdentity(record, access.properties, access.entitlements) });
  }

  if (path === `${MOBILE_API_PREFIX}/auth/logout` && request.method === "POST") {
    await store.mobileRevokeSession(record.sessionId, access.now);
    await store.mobileRecordAudit({ tenantId: record.tenantId, userId: record.userId, membershipId: record.membershipId, action: "mobile_logout", reference: `session:${record.sessionId}`, createdAt: access.now });
    return json({ ok: true });
  }

  if (path === `${MOBILE_API_PREFIX}/home` && request.method === "GET") {
    const denied = requirePermission(publicAccess, "home.view");
    if (denied) return denied;
    const [operations, overview, threads] = await Promise.all([
      store.getStayOperationsOverview(), store.getAdminOverview(), store.listMessagingThreads(80)
    ]);
    let finance = null;
    if (hasPermission(publicAccess, "finance.view")) {
      const month = currentMonth();
      const [expenses, income] = await Promise.all([store.listExpenses(month, HOUSE_FINANCE_BUSINESS_ID), store.listIncome(month, HOUSE_FINANCE_BUSINESS_ID)]);
      const configuration = incomeConfiguration(env, HOUSE_FINANCE_BUSINESS_ID);
      finance = { month, currency: configuration.currency, totals: summarizeFinance(expenses, income, configuration) };
    }
    return json({ ok: true, ...homePayload(operations, overview, threads, finance, publicAccess) });
  }

  if (path === `${MOBILE_API_PREFIX}/bookings` && request.method === "GET") {
    const denied = requirePermission(publicAccess, "bookings.view");
    if (denied) return denied;
    const url = new URL(request.url);
    const from = validDate(url.searchParams.get("from")) ? url.searchParams.get("from") : "";
    const to = validDate(url.searchParams.get("to")) ? url.searchParams.get("to") : "";
    const operations = await store.getStayOperationsOverview();
    const reservations = (operations.reservations || [])
      .filter((item) => (!from || item.checkOutDate >= from) && (!to || item.checkInDate <= to))
      .map((item) => publicReservation(item, record.role));
    return json({ ok: true, from, to, reservations });
  }

  if (path === `${MOBILE_API_PREFIX}/calendar` && request.method === "GET") {
    const denied = requirePermission(publicAccess, "calendar.view");
    if (denied) return denied;
    const url = new URL(request.url);
    const from = validDate(url.searchParams.get("from")) ? url.searchParams.get("from") : bangkokDate(-2);
    const to = validDate(url.searchParams.get("to")) ? url.searchParams.get("to") : bangkokDate(28);
    const operations = await store.getStayOperationsOverview();
    const reservations = (operations.reservations || []).filter((item) => item.checkOutDate >= from && item.checkInDate <= to).map((item) => publicReservation(item, record.role));
    return json({ ok: true, from, to, rooms: operations.housekeepingStatuses || [], reservations });
  }

  if (path === `${MOBILE_API_PREFIX}/inbox` && request.method === "GET") {
    const denied = requirePermission(publicAccess, "messaging.view");
    if (denied) return denied;
    const threads = (await store.listMessagingThreads(80)).map(publicThread);
    return json({ ok: true, configuration: unifiedMessagingConfiguration(env), unread: threads.reduce((sum, item) => sum + item.unreadCount, 0), needsHuman: threads.filter((item) => item.needsHuman).length, threads });
  }

  if (path === `${MOBILE_API_PREFIX}/inbox/thread` && request.method === "GET") {
    const denied = requirePermission(publicAccess, "messaging.view");
    if (denied) return denied;
    const id = cleanText(new URL(request.url).searchParams.get("id"), 100);
    const thread = await store.getMessagingThread(id);
    if (!thread) return json({ error: "not_found" }, 404);
    const messages = await store.listMessagingMessages(id, 100);
    await store.markMessagingThreadRead(id, access.now);
    return json({ ok: true, thread: publicThread({ ...thread, unreadCount: 0 }), messages });
  }

  if (path === `${MOBILE_API_PREFIX}/inbox/send` && request.method === "POST") {
    const denied = requirePermission(publicAccess, "messaging.send");
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

  if (path === `${MOBILE_API_PREFIX}/inbox/ai` && request.method === "POST") {
    const denied = requirePermission(publicAccess, "messaging.ai_control");
    if (denied) return denied;
    let body; try { body = await readJson(request); } catch (response) { return response; }
    const actorHash = await sha256(`mobile:${record.userId}:${record.membershipId}`);
    const internalRequest = new Request("https://internal.taoedge.invalid/api/concierge/admin/messaging/ai", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {})
    });
    const response = await handleUnifiedMessagingAdminRequest(internalRequest, env, "/api/concierge/admin/messaging/ai", store, actorHash);
    return response || json({ error: "ai_control_failed" }, 502);
  }

  if (path === `${MOBILE_API_PREFIX}/operations` && request.method === "GET") {
    const denied = requirePermission(publicAccess, "operations.view");
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
    const denied = requirePermission(publicAccess, "housekeeping.update");
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
    const denied = requirePermission(publicAccess, "maintenance.create");
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
        recipientGroup: severity === "critical" ? "urgent_response" : "support_with_owners",
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
    const denied = requirePermission(publicAccess, "direct_stays.manage");
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
    const denied = requirePermission(publicAccess, "maintenance.resolve");
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
    const denied = requirePermission(publicAccess, "finance.expense_submit");
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
    const denied = requirePermission(publicAccess, "finance.expense_submit");
    if (denied) return denied;
    const actorHash = await sha256(`mobile:${record.userId}:${record.membershipId}`);
    const response = await handleExpenseAdminRequest(
      request, env, "/api/concierge/admin/expenses/analyze", store, actorHash,
      { role: record.role === "owner" ? "owner" : "staff", businessId: HOUSE_FINANCE_BUSINESS_ID }
    );
    return response || json({ error: "expense_analyze_failed" }, 502);
  }

  if (path === `${MOBILE_API_PREFIX}/finance/expense-submit` && request.method === "POST") {
    const denied = requirePermission(publicAccess, "finance.expense_submit");
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

  if (path === `${MOBILE_API_PREFIX}/finance` && request.method === "GET") {
    const denied = requirePermission(publicAccess, "finance.view");
    if (denied) return denied;
    const month = new URL(request.url).searchParams.get("month") || currentMonth();
    if (!validMonth(month)) return json({ error: "invalid_month" }, 400);
    const [expenses, income] = await Promise.all([store.listExpenses(month, HOUSE_FINANCE_BUSINESS_ID), store.listIncome(month, HOUSE_FINANCE_BUSINESS_ID)]);
    const configuration = incomeConfiguration(env, HOUSE_FINANCE_BUSINESS_ID);
    return json({
      ok: true, month,
      configuration: { currency: configuration.currency, minorUnitDigits: configuration.minorUnitDigits, categories: configuration.categories },
      automation: beds24FinanceSyncConfiguration(env),
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
    const integrationAllowed = hasPermission(publicAccess, "integrations.view");
    return json({
      ok: true,
      identity: publicIdentity(record, access.properties, access.entitlements),
      integrations: integrationAllowed ? integrationAdminOverview(env) : undefined,
      messaging: hasPermission(publicAccess, "messaging.view") ? unifiedMessagingConfiguration(env) : undefined,
      financeAutomation: hasPermission(publicAccess, "finance.view") ? beds24FinanceSyncConfiguration(env) : undefined,
      product: {
        workingName: "Taoedge Owner App",
        commercialBrandPending: true,
        nativeBillingStrategy: "store-compliant-abstraction"
      }
    });
  }

  if (path === `${MOBILE_API_PREFIX}/team` && request.method === "GET") {
    const denied = requirePermission(publicAccess, "staff.manage");
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
    const denied = requirePermission(publicAccess, "staff.manage");
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
    const denied = requirePermission(publicAccess, "staff.manage");
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
    const denied = requirePermission(publicAccess, "security.sessions");
    if (denied) return denied;
    const sessions = await store.mobileListSessions(record.tenantId);
    return json({ ok: true, currentSessionId: record.sessionId, sessions: sessions.map((item) => ({ ...item, active: !item.revokedAt && item.expiresAt > access.now })) });
  }

  if (path === `${MOBILE_API_PREFIX}/security/revoke` && request.method === "POST") {
    const denied = requirePermission(publicAccess, "security.sessions");
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
    invitePepperConfigured: Boolean(env.MOBILE_INVITE_PEPPER || env.MOBILE_SESSION_PEPPER)
  };
}

export async function handleMobilePlatformRequest(request, env, path) {
  if (!path.startsWith(MOBILE_API_PREFIX)) return null;
  const store = getStore(env);
  if (!store) return json({ error: "mobile_store_unavailable" }, 503);
  if (path === `${MOBILE_API_PREFIX}/auth/bootstrap`) return bootstrap(request, env, store);
  if (path === `${MOBILE_API_PREFIX}/auth/login`) return login(request, env, store);
  if (path === `${MOBILE_API_PREFIX}/auth/accept-invite`) return acceptInvite(request, env, store);
  return handleProtected(request, env, path, store);
}

export const MOBILE_DEFAULT_MODULES = DEFAULT_MODULES;
