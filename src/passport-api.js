const ROOM_OPTIONS = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MIN_UPLOAD_BYTES = 512;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,100}$/;
const ID_PATTERN = /^pass_[A-Za-z0-9-]{20,80}$/;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...extraHeaders
    }
  });
}

async function readJson(request, maximumBytes = 8_000) {
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

function tokenFromRequest(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return "";
  const token = authorization.slice(7).trim();
  return TOKEN_PATTERN.test(token) ? token : "";
}

function base64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createToken() {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function tokenHash(token, pepper) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(pepper || "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function configured(env) {
  return Boolean(env.PASSPORT_UPLOADS?.put && env.PASSPORT_UPLOADS?.get && env.PASSPORT_TOKEN_PEPPER);
}

function retentionDays(env) {
  const value = Number(env.PASSPORT_RETENTION_DAYS || 14);
  if (!Number.isFinite(value)) return 14;
  return Math.max(1, Math.min(14, Math.round(value)));
}

async function rateAllowed(env, tokenDigest) {
  if (!env.CONCIERGE_RATE_LIMITER?.limit) return true;
  try {
    const result = await env.CONCIERGE_RATE_LIMITER.limit({ key: `passport:${tokenDigest.slice(0, 32)}` });
    return Boolean(result?.success);
  } catch (_error) {
    return true;
  }
}

function validPendingSession(session) {
  return session?.status === "pending" && Date.parse(session.expiresAt) > Date.now();
}

async function sessionForRequest(request, env, store) {
  const token = tokenFromRequest(request);
  if (!token || !env.PASSPORT_TOKEN_PEPPER) return null;
  const digest = await tokenHash(token, env.PASSPORT_TOKEN_PEPPER);
  if (!(await rateAllowed(env, digest))) return { rateLimited: true };
  const session = await store.getPassportUploadByTokenHash(digest);
  return { token, digest, session };
}

async function readLimitedBody(request, maximumBytes) {
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > maximumBytes) throw new Error("too_large");
  if (!request.body) throw new Error("empty_file");
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new Error("too_large");
    }
    chunks.push(value);
  }
  if (!total) throw new Error("empty_file");
  if (total < MIN_UPLOAD_BYTES) throw new Error("invalid_file");
  const bytes = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return bytes;
}

function ascii(bytes, start, end) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function detectImage(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mediaType: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])) {
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

function privateDownload(object, record) {
  const baseName = record.documentType === "thai_id" ? "thai-id-image" : "passport-image";
  const headers = new Headers({
    "content-type": record.mediaType || "application/octet-stream",
    "content-disposition": `attachment; filename="${baseName}.${record.extension || "bin"}"`,
    "cache-control": "no-store, max-age=0",
    "content-security-policy": "default-src 'none'; sandbox",
    "cross-origin-resource-policy": "same-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  });
  return new Response(object.body, { status: 200, headers });
}

export async function handlePassportGuestRequest(request, env, path) {
  if (!configured(env)) return json({ error: "passport_upload_unavailable" }, 503);
  const store = getStore(env);
  if (!store) return json({ error: "passport_upload_unavailable" }, 503);

  if (path === "/api/passport-upload/session") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const result = await sessionForRequest(request, env, store);
    if (result?.rateLimited) return json({ error: "rate_limited" }, 429);
    if (!result || !validPendingSession(result.session)) return json({ error: "invalid_or_expired_link" }, 410);
    return json({
      ok: true,
      room: result.session.room,
      documentType: result.session.documentType || "passport",
      expiresAt: result.session.expiresAt,
      retentionDays: retentionDays(env),
      maximumBytes: MAX_UPLOAD_BYTES,
      acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"]
    });
  }

  if (path === "/api/passport-upload") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const result = await sessionForRequest(request, env, store);
    if (result?.rateLimited) return json({ error: "rate_limited" }, 429);
    if (!result || !validPendingSession(result.session)) return json({ error: "invalid_or_expired_link" }, 410);

    let bytes;
    try {
      bytes = await readLimitedBody(request, MAX_UPLOAD_BYTES);
    } catch (error) {
      const status = error.message === "too_large" ? 413 : 400;
      return json({ error: error.message }, status);
    }
    const detected = detectImage(bytes);
    if (!detected) return json({ error: "unsupported_file_type" }, 415);

    const uploadedAt = new Date().toISOString();
    const deleteAfter = new Date(Date.now() + (retentionDays(env) * 86_400_000)).toISOString();
    const documentType = result.session.documentType === "thai_id" ? "thai_id" : "passport";
    const objectPrefix = documentType === "thai_id" ? "thai-id" : "passport";
    const objectKey = `${objectPrefix}/${uploadedAt.slice(0, 7)}/${crypto.randomUUID()}.${detected.extension}`;
    try {
      await env.PASSPORT_UPLOADS.put(objectKey, bytes, {
        httpMetadata: { contentType: detected.mediaType },
        customMetadata: { deleteAfter }
      });
    } catch (_error) {
      return json({ error: "storage_unavailable" }, 503);
    }

    let completed;
    try {
      completed = await store.completePassportUpload({
        tokenHash: result.digest,
        objectKey,
        mediaType: detected.mediaType,
        extension: detected.extension,
        sizeBytes: bytes.byteLength,
        uploadedAt,
        deleteAfter
      });
    } catch (_error) {
      await env.PASSPORT_UPLOADS.delete(objectKey).catch(() => {});
      return json({ error: "storage_unavailable" }, 503);
    }
    if (!completed?.ok) {
      await env.PASSPORT_UPLOADS.delete(objectKey).catch(() => {});
      return json({ error: "link_already_used" }, 409);
    }
    let registration = null;
    if (typeof store.markRegistrationFromDocument === "function") {
      registration = await store.markRegistrationFromDocument(completed.id, uploadedAt).catch(() => null);
    } else if (typeof store.markRegistrationFromPassport === "function") {
      registration = await store.markRegistrationFromPassport(completed.id, uploadedAt).catch(() => null);
    }
    return json({
      ok: true,
      room: completed.room,
      documentType,
      deleteAfter,
      registrationStatus: registration?.status || (documentType === "thai_id" ? "thai_id_pending" : "passport_pending"),
      requiredPassports: Number(registration?.requiredPassports) || 1,
      receivedPassports: Number(registration?.receivedPassports) || 1,
      accessGranted: ["passport_complete", "thai_id_complete"].includes(registration?.status)
    });
  }

  return json({ error: "not_found" }, 404);
}

export async function handlePassportAdminRequest(request, env, path, store) {
  if (path === "/api/concierge/admin/passport-links") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    if (!configured(env)) return json({ error: "passport_upload_unavailable" }, 503);
    const body = await readJson(request);
    const room = String(body?.room || "");
    const requestedHours = Number(body?.expiresHours || 24);
    const expiresHours = [1, 6, 12, 24, 48, 72].includes(requestedHours) ? requestedHours : 24;
    if (!ROOM_OPTIONS.has(room)) return json({ error: "invalid_room" }, 400);
    if (body?.nonThaiConfirmed !== true) return json({ error: "non_thai_confirmation_required" }, 400);
    const arrivalDate = body?.arrivalAt ? new Date(body.arrivalAt) : null;
    if (arrivalDate && !Number.isFinite(arrivalDate.getTime())) return json({ error: "invalid_arrival_time" }, 400);

    const token = createToken();
    const digest = await tokenHash(token, env.PASSPORT_TOKEN_PEPPER);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (expiresHours * 3_600_000)).toISOString();
    const id = `pass_${crypto.randomUUID()}`;
    await store.createPassportUpload({
      id,
      tokenHash: digest,
      room,
      documentType: "passport",
      createdAt,
      arrivalAt: arrivalDate?.toISOString() || "",
      expiresAt
    });
    const origin = new URL(request.url).origin;
    const automaticDeletionDays = retentionDays(env);
    return json({
      ok: true,
      id,
      room,
      expiresAt,
      welcomeUrl: `${origin}/room/${room}`,
      uploadUrl: `${origin}/passport-upload#token=${token}`,
      reminderMessage: `This TM30 Immigration accommodation registration applies only to non-Thai guests. Thai nationals do not need to complete it. If you are not a Thai national, please provide the required passport information before arrival through this private, single-use secure form: ${origin}/passport-upload#token=${token} Your information is not sent through the AI chat or WhatsApp. A passport image is deleted automatically ${automaticDeletionDays} days after upload, or sooner after processing.`
    });
  }

  if (path === "/api/concierge/admin/passport-reminder") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request);
    const id = String(body?.id || "");
    if (!ID_PATTERN.test(id)) return json({ error: "invalid_request" }, 400);
    return json(await store.markPassportReminderSent(id));
  }

  const downloadMatch = path.match(/^\/api\/concierge\/admin\/passport-files\/(pass_[A-Za-z0-9-]{20,80})$/);
  if (downloadMatch) {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
    if (!env.PASSPORT_UPLOADS?.get) return json({ error: "passport_upload_unavailable" }, 503);
    const record = await store.getPassportUpload(downloadMatch[1]);
    if (!record || record.status !== "uploaded" || !record.objectKey) return json({ error: "not_found" }, 404);
    if (Date.parse(record.deleteAfter) <= Date.now()) {
      try {
        await env.PASSPORT_UPLOADS.delete(record.objectKey);
        await store.deletePassportUpload(record.id);
      } catch (_error) {
        // Keep the metadata and deny access so scheduled cleanup can retry deletion.
      }
      return json({ error: "not_found" }, 404);
    }
    const object = await env.PASSPORT_UPLOADS.get(record.objectKey);
    if (!object?.body) return json({ error: "not_found" }, 404);
    return privateDownload(object, record);
  }

  if (path === "/api/concierge/admin/passport-delete") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request);
    const id = String(body?.id || "");
    if (!ID_PATTERN.test(id)) return json({ error: "invalid_request" }, 400);
    const record = await store.getPassportUpload(id);
    if (!record) return json({ error: "not_found" }, 404);
    if (record.objectKey) {
      if (!env.PASSPORT_UPLOADS?.delete) return json({ error: "passport_upload_unavailable" }, 503);
      try {
        await env.PASSPORT_UPLOADS.delete(record.objectKey);
      } catch (_error) {
        return json({ error: "storage_unavailable" }, 503);
      }
    }
    await store.deletePassportUpload(id);
    return json({ ok: true });
  }

  if (path === "/api/concierge/admin/passport-tm30") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await readJson(request);
    const id = String(body?.id || "");
    if (!ID_PATTERN.test(id) || typeof body?.registered !== "boolean") return json({ error: "invalid_request" }, 400);
    if (typeof store.setPassportTm30Registered !== "function") return json({ error: "tm30_tracking_unavailable" }, 503);
    const result = await store.setPassportTm30Registered(id, body.registered, new Date().toISOString());
    if (!result?.ok) return json({ error: result?.error || "tm30_tracking_unavailable" }, result?.error === "tm30_not_applicable" ? 409 : 404);
    return json(result);
  }

  return null;
}

export async function cleanupPassportUploads(env) {
  const store = getStore(env);
  if (!store) return { deleted: 0 };
  const result = await store.cleanupPassportUploads(new Date().toISOString());
  const records = result?.records || [];
  let deleted = 0;
  for (const record of records) {
    try {
      if (record.objectKey) {
        if (!env.PASSPORT_UPLOADS?.delete) continue;
        await env.PASSPORT_UPLOADS.delete(record.objectKey);
      }
      await store.deletePassportUpload(record.id);
      deleted += 1;
    } catch (_error) {
      // Leave metadata intact so the next scheduled cleanup can retry.
    }
  }
  return { deleted };
}
