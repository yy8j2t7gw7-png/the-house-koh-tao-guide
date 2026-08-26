import { getGuestAccess } from "./stay-api.js";
import {
  createProtectedOperationsAlert,
  dispatchConciergeAlert
} from "./whatsapp-alerts.js";
import { safeAlertSummary } from "./alert-policy.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MIN_UPLOAD_BYTES = 128;
const REPORT_ID_PATTERN = /^maint_[A-Za-z0-9-]{20,80}$/;
const ISSUE_TYPES = new Set([
  "active_water_leak", "toilet_clogged", "toilet_overflowing", "toilet_not_flushing",
  "toilet_running_or_leaking", "no_water", "low_water_pressure", "no_hot_water",
  "shower_or_tap_broken", "drain_problem", "ac_not_cooling", "ac_leaking", "ac_noisy",
  "ac_not_turning_on", "no_power", "broken_light", "socket_or_switch", "electrical_danger",
  "door_or_lock", "room_cannot_secure", "window_problem", "tv_power", "tv_signal",
  "tv_remote", "tv_damaged", "fridge_not_cooling", "fridge_leaking", "fridge_noisy",
  "fridge_no_power", "fan_problem", "wifi_problem", "furniture_problem", "fixture_problem",
  "other_issue"
]);
const CRITICAL_ISSUES = new Set([
  "active_water_leak", "toilet_overflowing", "electrical_danger", "room_cannot_secure"
]);

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

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch (_error) {
    return false;
  }
}

function getStore(env) {
  return env.CONCIERGE_STORE?.getByName?.("the-house-concierge-global") || null;
}

async function rateAllowed(env, request) {
  if (!env.CONCIERGE_RATE_LIMITER?.limit) return true;
  const accessKey = request.headers.get("cf-connecting-ip") || "guest";
  try {
    return Boolean((await env.CONCIERGE_RATE_LIMITER.limit({ key: `maintenance:${accessKey}` }))?.success);
  } catch (_error) {
    return true;
  }
}

function retentionDays(env) {
  const value = Number(env.MAINTENANCE_RETENTION_DAYS || 30);
  return Number.isFinite(value) ? Math.max(1, Math.min(30, Math.round(value))) : 30;
}

function ascii(bytes, start, end) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function detectImage(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mediaType: "image/jpeg", extension: "jpg" };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === png[index])) {
    return { mediaType: "image/png", extension: "png" };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return { mediaType: "image/webp", extension: "webp" };
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) {
      return { mediaType: "image/heic", extension: "heic" };
    }
  }
  return null;
}

function issueLabel(issueType) {
  return String(issueType || "other_issue").replaceAll("_", " ");
}

function publicReportReference(room, createdAt) {
  const date = new Date(createdAt);
  const bangkok = new Date(date.getTime() + (7 * 60 * 60 * 1000));
  const part = (value) => String(value).padStart(2, "0");
  const datePart = `${bangkok.getUTCFullYear()}${part(bangkok.getUTCMonth() + 1)}${part(bangkok.getUTCDate())}`;
  const timePart = `${part(bangkok.getUTCHours())}${part(bangkok.getUTCMinutes())}${part(bangkok.getUTCSeconds())}`;
  return `R${room}-D${datePart}-T${timePart}`;
}

function privateDownload(object, record) {
  return new Response(object.body, {
    headers: {
      "content-type": record.photoMediaType || "application/octet-stream",
      "content-disposition": `attachment; filename="maintenance-${record.room}-${record.id}.${record.photoExtension || "image"}"`,
      "cache-control": "no-store, max-age=0",
      "content-security-policy": "default-src 'none'; sandbox",
      "cross-origin-resource-policy": "same-origin",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY"
    }
  });
}

export async function handleMaintenanceGuestRequest(request, env) {
  if (!sameOrigin(request)) return json({ error: "invalid_origin" }, 403);
  if (request.method === "GET") {
    const access = await getGuestAccess(request, env);
    return access.accessGranted
      ? json({ ok: true, room: access.room, retentionDays: retentionDays(env) })
      : json({ error: "verified_guest_access_required" }, 403);
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "GET, POST" });
  if (!(await rateAllowed(env, request))) return json({ error: "rate_limited" }, 429);
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_UPLOAD_BYTES + 64_000) return json({ error: "file_too_large" }, 413);

  const access = await getGuestAccess(request, env);
  if (!access.accessGranted || !access.session?.reservationId || !access.room) {
    return json({ error: "verified_guest_access_required" }, 403);
  }
  const store = getStore(env);
  if (!store?.createMaintenanceReport) return json({ error: "report_service_unavailable" }, 503);

  let form;
  try {
    form = await request.formData();
  } catch (_error) {
    return json({ error: "invalid_form" }, 400);
  }
  const issueType = String(form.get("issueType") || "");
  const details = safeAlertSummary(String(form.get("details") || "")).slice(0, 500);
  const replyContact = String(form.get("replyContact") || "").trim().replace(/[^+0-9 ()-]/g, "").slice(0, 30);
  const feeAccepted = String(form.get("toiletFeeAccepted") || "") === "true";
  if (!ISSUE_TYPES.has(issueType)) return json({ error: "invalid_issue_type" }, 400);
  if (issueType === "other_issue" && details.length < 5) return json({ error: "details_required" }, 400);
  if (issueType === "toilet_clogged" && !feeAccepted) {
    return json({ error: "toilet_fee_acknowledgement_required" }, 400);
  }
  if (CRITICAL_ISSUES.has(issueType) && replyContact.replace(/\D/g, "").length < 8) {
    return json({ error: "reply_contact_required" }, 400);
  }

  const file = form.get("photo");
  let photoBytes = null;
  let detected = null;
  if (file && typeof file.arrayBuffer === "function" && Number(file.size) > 0) {
    if (Number(file.size) > MAX_UPLOAD_BYTES) return json({ error: "file_too_large" }, 413);
    if (Number(file.size) < MIN_UPLOAD_BYTES) return json({ error: "invalid_file" }, 400);
    photoBytes = new Uint8Array(await file.arrayBuffer());
    detected = detectImage(photoBytes);
    if (!detected) return json({ error: "unsupported_file_type" }, 415);
  }

  const critical = CRITICAL_ISSUES.has(issueType);
  const createdAt = new Date().toISOString();
  const deleteAfter = new Date(Date.now() + (retentionDays(env) * 86_400_000)).toISOString();
  const id = `maint_${crypto.randomUUID()}`;
  const reference = publicReportReference(access.room, createdAt);
  const alertSummary = `${reference} — ${safeAlertSummary(
    `${issueLabel(issueType)}${details ? ` — ${details}` : ""}${issueType === "toilet_clogged" ? " — Guest acknowledged the conditional 1,000 THB clearance fee." : ""}`
  )}`;
  let photoObjectKey = "";
  if (photoBytes) {
    if (!env.PASSPORT_UPLOADS?.put) return json({ error: "photo_storage_unavailable" }, 503);
    photoObjectKey = `maintenance/${createdAt.slice(0, 7)}/${crypto.randomUUID()}.${detected.extension}`;
    try {
      await env.PASSPORT_UPLOADS.put(photoObjectKey, photoBytes, {
        httpMetadata: { contentType: detected.mediaType },
        customMetadata: { deleteAfter, reportId: id }
      });
    } catch (_error) {
      return json({ error: "photo_storage_unavailable" }, 503);
    }
  }

  let alert = null;
  try {
    alert = await createProtectedOperationsAlert({
      env,
      room: access.room,
      alertType: critical ? "property_emergency" : `maintenance_${issueType}`,
      severity: critical ? "critical" : "attention",
      recipientGroup: critical ? "urgent_response" : "support_with_owners",
      summary: alertSummary,
      replyContact: critical ? replyContact : "",
      escalationRequired: critical
    });
    await store.createMaintenanceReport({
      id,
      reservationId: access.session.reservationId,
      room: access.room,
      issueType,
      severity: critical ? "critical" : "attention",
      details,
      feeAccepted,
      photoObjectKey,
      photoMediaType: detected?.mediaType || "",
      photoExtension: detected?.extension || "",
      photoSizeBytes: photoBytes?.byteLength || 0,
      alertId: alert?.id || "",
      createdAt,
      deleteAfter
    });
  } catch (_error) {
    if (photoObjectKey) await env.PASSPORT_UPLOADS.delete(photoObjectKey).catch(() => {});
    return json({ error: "report_service_unavailable" }, 503);
  }

  const delivery = alert && (!alert.duplicate || critical)
    ? await dispatchConciergeAlert(critical ? { ...alert, duplicate: false } : alert, env).catch(() => ({ attempted: 0, accepted: 0 }))
    : { attempted: 0, accepted: 0 };
  return json({
    ok: true,
    reference,
    room: access.room,
    critical,
    notified: Number(delivery.accepted) > 0,
    photoStored: Boolean(photoObjectKey)
  });
}

export async function handleMaintenanceAdminRequest(request, env, path, store) {
  const download = path.match(/^\/api\/concierge\/admin\/maintenance-files\/(maint_[A-Za-z0-9-]{20,80})$/);
  if (download) {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
    const record = await store.getMaintenanceReport(download[1]);
    if (!record?.photoObjectKey || !env.PASSPORT_UPLOADS?.get) return json({ error: "not_found" }, 404);
    const object = await env.PASSPORT_UPLOADS.get(record.photoObjectKey);
    return object?.body ? privateDownload(object, record) : json({ error: "not_found" }, 404);
  }
  if (path === "/api/concierge/admin/maintenance-delete") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || "");
    if (!REPORT_ID_PATTERN.test(id)) return json({ error: "invalid_request" }, 400);
    const record = await store.getMaintenanceReport(id);
    if (!record) return json({ error: "not_found" }, 404);
    if (record.photoObjectKey && env.PASSPORT_UPLOADS?.delete) {
      try {
        await env.PASSPORT_UPLOADS.delete(record.photoObjectKey);
      } catch (_error) {
        return json({ error: "storage_unavailable" }, 503);
      }
    }
    await store.deleteMaintenancePhoto(id, new Date().toISOString());
    return json({ ok: true });
  }
  return null;
}

export async function cleanupMaintenanceReports(env) {
  const store = getStore(env);
  if (!store?.cleanupMaintenanceReports) return { deleted: 0 };
  const result = await store.cleanupMaintenanceReports(new Date().toISOString());
  let deleted = 0;
  for (const record of result?.records || []) {
    try {
      if (record.photoObjectKey && env.PASSPORT_UPLOADS?.delete) await env.PASSPORT_UPLOADS.delete(record.photoObjectKey);
      await store.deleteMaintenancePhoto(record.id, new Date().toISOString());
      deleted += 1;
    } catch (_error) {
      // Metadata remains so the next scheduled cleanup can retry.
    }
  }
  return { deleted };
}
