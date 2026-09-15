import { createProtectedOperationsAlert, dispatchConciergeAlert, operationalRecipientPreview } from "./whatsapp-alerts.js";
import { pushInboundOtaMessage } from "./mobile-push.js";
import { captureDepartureIntent } from "./departure-intent.js";
const MAX_MESSAGE_LENGTH = 3000;
const MAX_THREADS = 80;
const MAX_THREAD_MESSAGES = 100;
const BEDS24_BASE_URL = "https://beds24.com/api/v2";
const BEDS24_TOKEN_SAFETY_SECONDS = 300;

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
      "x-content-type-options": "nosniff",
      ...extraHeaders
    }
  });
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

function cleanText(value, maximum = MAX_MESSAGE_LENGTH) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, maximum);
}

function digits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 20);
}

export function detectGuestMessageLanguage(value) {
  const text = String(value || "").trim();
  const lower = text.toLowerCase();
  if (!text) return "en";
  if (/[\u0E00-\u0E7F]/u.test(text)) return "th";
  if (/[\u4E00-\u9FFF]/u.test(text)) return "zh-CN";
  if (/[\u0400-\u04FF]/u.test(text)) return "ru";
  const german = /[äöüß]|\b(?:ich|wir|bitte|danke|dankeschön|koennte|könnte|kann|zimmer|bad|toilette|toilettenpapier|müll|muell|handtuch|reinigen|gereinigt|brauche|bräuchte|haette|hätte|gerne|noch|einmal|werden)\b/i;
  const french = /[àâçéèêëîïôûùüÿœ]|\b(?:bonjour|merci|pouvez|pourriez|chambre|salle de bain|serviette|papier toilette|nettoyer|nettoyage|svp)\b|s['’]il vous plaît/i;
  const spanish = /[áéíóúñ¿¡]|\b(?:hola|gracias|puede|podría|habitaci[oó]n|baño|toalla|papel higi[eé]nico|limpiar|limpieza|por favor)\b/i;
  if (german.test(lower)) return "de";
  if (french.test(lower)) return "fr";
  if (spanish.test(lower)) return "es";
  return "en";
}

export function detectExternalPassportSubmission(value) {
  const text = cleanText(value, 1200);
  if (!text) return false;
  const lower = text.toLowerCase();
  const passport = /\bpassport\b|reisepass|passeport|pasaporte|หนังสือเดินทาง/u.test(lower);
  if (!passport) return false;
  const completed = /(?:find|see)\s+(?:it\s+)?attached|\battached\b|\bupload(?:ed|ing)?\b|\bsent\b|\bsending\b|\bhere(?:'s| is)\b|\bphoto\b|\bpicture\b|\bimage\b|\bcopy\b|beigefügt|hochgeladen|gesendet|foto|bild|joint|télévers|envoy|photo|adjunt|subid|enviad|foto|รูป|แนบ|ส่ง|อัปโหลด/u.test(lower);
  const explicitCompletion = /(?:i|we)\s+(?:have\s+)?(?:attached|uploaded|sent)|(?:here(?:'s| is)|find attached).{0,80}(?:passport|reisepass|passeport|pasaporte)|(?:passport|reisepass|passeport|pasaporte).{0,80}(?:attached|uploaded|sent|photo|picture|image|copy)/iu.test(text);
  const questionOnly = /\b(?:can|could|should|where|how|may)\s+(?:i|we)\b|\bwhere\s+(?:do|can)\s+(?:i|we)\b|\bhow\s+(?:do|can)\s+(?:i|we)\b|\bdo\s+(?:i|we)\s+need\b/iu.test(text);
  return Boolean((completed || explicitCompletion) && !(questionOnly && !explicitCompletion));
}

function externalPassportAcknowledgement(thread = {}, inboundText = "") {
  const first = guestFirstName(thread.guestName);
  const source = cleanText(thread.sourceLabel || "OTA", 50) || "OTA";
  const language = detectGuestMessageLanguage(inboundText);
  const name = first ? ` ${first}` : "";
  const messages = {
    en: `Thank you${name}. I can see that you sent a passport image in the ${source} conversation. I have notified our team to review it. You do not need to send it again unless the team asks you to.`,
    de: `Vielen Dank${name}. Ich sehe, dass Sie ein Passbild im ${source}-Chat gesendet haben. Ich habe unser Team zur Prüfung informiert. Sie müssen es nicht noch einmal senden, außer unser Team bittet Sie darum.`,
    fr: `Merci${name}. Je vois que vous avez envoyé une image de votre passeport dans la conversation ${source}. J’ai prévenu notre équipe pour vérification. Vous n’avez pas besoin de la renvoyer sauf si notre équipe vous le demande.`,
    es: `Gracias${name}. Veo que has enviado una imagen de tu pasaporte en la conversación de ${source}. He avisado a nuestro equipo para que la revise. No necesitas volver a enviarla salvo que el equipo te lo pida.`,
    th: `ขอบคุณ${first ? ` ${first}` : ""}ครับ/ค่ะ เห็นว่าคุณส่งรูปหนังสือเดินทางมาในแชต ${source} แล้ว เราได้แจ้งทีมงานให้ตรวจสอบแล้ว ไม่จำเป็นต้องส่งซ้ำ เว้นแต่ทีมงานจะขอเพิ่มเติม`
  };
  return messages[language] || messages.en;
}

async function handleExternalPassportSubmission({ env, store, thread, inboundText, channel }) {
  if (!detectExternalPassportSubmission(inboundText)) return { handled: false };
  const now = new Date().toISOString();
  const source = cleanText(thread.sourceLabel || (channel === "whatsapp" ? "WhatsApp" : "OTA"), 50) || "OTA";
  const guest = cleanText(thread.guestName, 80) || "Guest";
  let activityId = "";
  if (thread.reservationId && typeof store.mobileCreateReservationActivity === "function") {
    activityId = `bact_${crypto.randomUUID()}`;
    await store.mobileCreateReservationActivity({
      id: activityId, reservationId: thread.reservationId, kind: "task", category: "Passport received externally",
      body: `${guest} stated that a passport image was sent in the ${source} conversation. Review the external OTA/WhatsApp thread. This does not complete Taoedge secure registration automatically.`,
      assigneeKey: "owner", assigneeLabel: "Owners", createdByHash: "system", createdByLabel: "Taoedge", createdAt: now
    }).catch(() => null);
  }
  const alert = await createProtectedOperationsAlert({
    env, room: thread.room, roomVerified: Boolean(thread.room), alertType: "passport_received_external", severity: "attention",
    recipientGroup: "owners", summary: `Passport received externally · ${guest}${thread.room ? ` · Room ${thread.room}` : ""} · ${source}. Review the guest conversation; secure Taoedge registration is not marked complete.`,
    escalationRequired: false, now: new Date(now)
  }).catch(() => null);
  const delivery = alert ? await dispatchConciergeAlert(alert, env).catch(() => ({ attempted: 0, accepted: 0 })) : { attempted: 0, accepted: 0 };
  if (activityId && alert?.id && typeof store.mobileLinkReservationActivityAlert === "function") {
    await store.mobileLinkReservationActivityAlert(activityId, alert.id, delivery, now).catch(() => null);
  }
  const result = {
    answer: externalPassportAcknowledgement(thread, inboundText), intentId: "passport_received_external", category: "registration",
    confidence: 1, needsHuman: true, handoff: "owner", source: "external-passport-policy", autoSend: aiAutoSendEnabled(env), reason: "external_passport_review_required"
  };
  if (result.autoSend) {
    await sendAndRecordReply({ env, store, thread, result, channel }).catch(() => null);
  } else {
    await recordAiDraft(store, thread, result, "external_passport_review_required", env).catch(() => null);
  }
  await store.updateMessagingThreadState(thread.id, { needsHuman: true, aiDraft: !result.autoSend, lastError: "external_passport_review_required", updatedAt: now }).catch(() => null);
  return { handled: true, activityId, alertId: alert?.id || "", delivery, autoSent: result.autoSend };
}

function normalizeConfirmationCode(value) {
  const code = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{6,24}$/.test(code) ? code : "";
}

function guestNameForBeds24Booking(booking = {}) {
  return cleanText([booking.firstName, booking.lastName].filter(Boolean).join(" "), 80) || "Guest";
}

function guestFirstName(value) {
  const name = cleanText(value, 80).split(/\s+/)[0] || "";
  return name.replace(/[^\p{L}'-]/gu, "").slice(0, 40);
}

function threadExternalId(channel, value) {
  return `${channel}:${cleanText(value, 180)}`;
}

function bangkokDateOnly(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftedDateOnly(dateOnly, days) {
  const date = new Date(`${dateOnly}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function messagingEnabled(env) {
  return String(env.UNIFIED_MESSAGING_ENABLED || "false").toLowerCase() === "true";
}

function aiReplyEnabled(env) {
  return messagingEnabled(env) && String(env.UNIFIED_MESSAGING_AI_REPLY_ENABLED || "false").toLowerCase() === "true";
}

function aiAutoSendEnabled(env) {
  return aiReplyEnabled(env) && String(env.UNIFIED_MESSAGING_AI_AUTO_SEND_ENABLED || "false").toLowerCase() === "true";
}

export function beds24RoomMap(env) {
  try {
    const value = JSON.parse(String(env.BEDS24_ROOM_MAP || "{}"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (_error) {
    return {};
  }
}

export function roomForBeds24Booking(booking, env = {}) {
  const map = beds24RoomMap(env);
  const roomId = String(booking?.roomId || "");
  const mapped = cleanText(map[roomId], 4);
  if (/^(?:[1-9]|10|11)$/.test(mapped)) return mapped;
  // The House mapping is intentionally explicit. Do not guess from a Beds24
  // room id because a provider room id is not the House room number.
  return "";
}

export function beds24SourceLabel(booking = {}) {
  const channel = cleanText(booking.channel, 40).toLowerCase();
  const labels = {
    airbnb: "Airbnb",
    booking: "Booking.com",
    expedia: "Expedia",
    vrbo: "Vrbo",
    agoda: "Agoda",
    hostelworld: "Hostelworld",
    trip: "Trip.com",
    direct: "Direct"
  };
  return labels[channel] || cleanText(booking.apiSource, 50) || (channel ? channel : "OTA");
}

function beds24MessagingChannelSupported(booking = {}) {
  return ["airbnb", "booking", "expedia", "vrbo"].includes(cleanText(booking.channel, 40).toLowerCase());
}

export function unifiedMessagingConfiguration(env = {}) {
  const whatsAppReady = Boolean(env.WHATSAPP_ACCESS_TOKEN && digits(env.WHATSAPP_PHONE_NUMBER_ID) && env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && env.META_APP_SECRET);
  const roomMapConfigured = Object.keys(beds24RoomMap(env)).length > 0;
  const beds24Ready = Boolean(env.BEDS24_REFRESH_TOKEN && env.BEDS24_WEBHOOK_TOKEN && roomMapConfigured);
  const aiInternalTokenReady = Boolean(env.UNIFIED_MESSAGING_INTERNAL_TOKEN);
  return {
    enabled: messagingEnabled(env),
    aiReplyEnabled: aiReplyEnabled(env),
    aiAutoSendEnabled: aiAutoSendEnabled(env),
    aiInternalTokenReady,
    aiReplyReady: aiReplyEnabled(env) && aiInternalTokenReady,
    whatsAppReady,
    guestInitiation: {
      ready: Boolean(whatsAppReady && String(env.WHATSAPP_GUEST_INIT_TEMPLATE_NAME || "").trim()),
      templateConfigured: Boolean(String(env.WHATSAPP_GUEST_INIT_TEMPLATE_NAME || "").trim()),
      language: String(env.WHATSAPP_GUEST_INIT_TEMPLATE_LANGUAGE || "en_US").trim() || "en_US"
    },
    beds24Ready,
    otaViaBeds24Ready: beds24Ready,
    roomMapConfigured,
    supportedBeds24MessagingChannels: ["Airbnb", "Booking.com", "Expedia", "Vrbo"],
    connectorVersion: "unified-messaging-v1-beds24"
  };
}

async function cachedBeds24Token(store) {
  if (!store || typeof store.getMessagingProviderState !== "function") return null;
  const state = await store.getMessagingProviderState("beds24").catch(() => null);
  if (!state?.value?.accessToken || !state.expiresAt) return null;
  const expiresAt = new Date(state.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() + (BEDS24_TOKEN_SAFETY_SECONDS * 1000)) return null;
  return state.value.accessToken;
}

async function freshBeds24Token(env, store) {
  if (!env.BEDS24_REFRESH_TOKEN) {
    const error = new Error("beds24_not_configured");
    error.code = "beds24_not_configured";
    throw error;
  }
  const response = await fetch(`${BEDS24_BASE_URL}/authentication/token`, {
    method: "GET",
    headers: {
      accept: "application/json",
      refreshToken: String(env.BEDS24_REFRESH_TOKEN)
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.token) {
    const error = new Error("beds24_token_failed");
    error.code = "beds24_token_failed";
    error.status = response.status;
    error.provider = data;
    throw error;
  }
  const expiresIn = Math.max(600, Number(data.expiresIn) || 3600);
  const expiresAt = new Date(Date.now() + (expiresIn * 1000)).toISOString();
  if (store && typeof store.setMessagingProviderState === "function") {
    await store.setMessagingProviderState("beds24", { accessToken: String(data.token) }, expiresAt).catch(() => {});
  }
  return String(data.token);
}

async function beds24AccessToken(env, store, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await cachedBeds24Token(store);
    if (cached) return cached;
  }
  return freshBeds24Token(env, store);
}

export async function maintainBeds24Authentication(env) {
  if (!messagingEnabled(env) || !env.BEDS24_REFRESH_TOKEN) return { ok: true, ignored: "beds24_not_configured" };
  const store = getStore(env);
  if (!store) return { ok: false, error: "messaging_store_unavailable" };
  try {
    await beds24AccessToken(env, store);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.code || "beds24_token_failed" };
  }
}

function appendQuery(url, query) {
  if (!query || typeof query !== "object") return;
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
    } else {
      url.searchParams.set(key, String(value));
    }
  });
}

export async function beds24ApiRequest(env, store, path, { method = "GET", query = null, body = null, forceRefresh = false } = {}) {
  const target = new URL(path, `${BEDS24_BASE_URL}/`);
  appendQuery(target, query);
  const accessToken = await beds24AccessToken(env, store, forceRefresh);
  const bodyText = body === null || body === undefined ? "" : JSON.stringify(body);
  const response = await fetch(target.toString(), {
    method,
    headers: {
      accept: "application/json",
      token: accessToken,
      ...(bodyText ? { "content-type": "application/json" } : {})
    },
    ...(bodyText ? { body: bodyText } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    if (!forceRefresh && [400, 401, 403].includes(response.status)) {
      return beds24ApiRequest(env, store, path, { method, query, body, forceRefresh: true });
    }
    const error = new Error(`beds24_http_${response.status}`);
    error.code = "beds24_http_error";
    error.status = response.status;
    error.provider = data;
    throw error;
  }
  return data;
}

async function resolveLocalReservation(store, booking, room, env) {
  if (!store || !room) return null;
  const reference = normalizeConfirmationCode(booking?.apiReference || booking?.reference);
  if (reference && env.STAY_TOKEN_PEPPER && typeof store.getStayReservationByCodeHash === "function") {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(String(env.STAY_TOKEN_PEPPER)),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`reservation:${reference}`));
    const codeHash = Array.from(new Uint8Array(signed), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const byCode = await store.getStayReservationByCodeHash(codeHash, room).catch(() => null);
    if (byCode) return byCode;
  }
  if (typeof store.findStayReservationForMessaging === "function") {
    return store.findStayReservationForMessaging(
      room,
      cleanText(booking?.arrival, 10),
      cleanText(booking?.departure, 10),
      guestFirstName(guestNameForBeds24Booking(booking))
    ).catch(() => null);
  }
  return null;
}

export function beds24MessageSyncPlan(messages = []) {
  const normalized = (Array.isArray(messages) ? messages : [])
    .map((message) => {
      const body = cleanText(message?.message, MAX_MESSAGE_LENGTH);
      const source = cleanText(message?.source, 30);
      const id = String(message?.id || "");
      if (!body || !id || !["guest", "host", "internalNote", "system"].includes(source)) return null;
      const direction = source === "guest" ? "inbound" : "outbound";
      const sender = source === "guest" ? "guest" : source === "host" ? "owner" : "system";
      const time = cleanText(message?.time, 40) || new Date(0).toISOString();
      return {
        id,
        providerMessageId: `beds24:${id}`,
        direction,
        sender,
        source,
        body,
        createdAt: time,
        read: message?.read === true
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime() || 0;
      const rightTime = new Date(right.createdAt).getTime() || 0;
      if (leftTime !== rightTime) return leftTime - rightTime;
      return Number(left.id || 0) - Number(right.id || 0);
    });
  const conversation = normalized.filter((message) => message.source === "guest" || message.source === "host");
  const latestConversationMessage = conversation[conversation.length - 1] || null;
  return {
    messages: normalized,
    replyCandidate: latestConversationMessage?.source === "guest" ? latestConversationMessage : null
  };
}

async function upsertThreadForBeds24(store, booking, room, reservation) {
  const externalReservationId = String(booking?.id || "");
  const phone = digits(booking?.mobile || booking?.phone);
  const guestName = guestNameForBeds24Booking(booking);
  const thread = await store.upsertMessagingThread({
    id: `thread_${crypto.randomUUID()}`,
    channel: "beds24",
    sourceLabel: beds24SourceLabel(booking),
    externalThreadId: threadExternalId("beds24", externalReservationId),
    externalReservationId,
    reservationId: reservation?.id || "",
    room: reservation?.room || room,
    guestName,
    guestPhone: phone,
    checkInDate: cleanText(booking?.arrival, 10),
    checkOutDate: cleanText(booking?.departure, 10),
    updatedAt: new Date().toISOString()
  });
  if (phone && reservation?.id && typeof store.linkMessagingThreadsByPhone === "function") {
    await store.linkMessagingThreadsByPhone(phone, {
      reservationId: reservation.id,
      room: reservation.room || room,
      guestName,
      checkInDate: cleanText(booking?.arrival, 10),
      checkOutDate: cleanText(booking?.departure, 10),
      updatedAt: new Date().toISOString()
    }).catch(() => {});
  }
  return thread;
}

async function resolveWhatsAppGuestViaBeds24(store, phone, env) {
  if (!env.BEDS24_REFRESH_TOKEN) return null;
  const today = bangkokDateOnly();
  let response;
  try {
    response = await beds24ApiRequest(env, store, "bookings", {
      query: {
        departureFrom: shiftedDateOnly(today, -7),
        arrivalTo: shiftedDateOnly(today, 90),
        includeGuests: true,
        status: ["confirmed", "new"]
      }
    });
  } catch (_error) {
    return null;
  }
  const matching = (Array.isArray(response?.data) ? response.data : [])
    .filter((booking) => digits(booking?.mobile || booking?.phone) === phone && booking?.status !== "cancelled");
  const resolved = [];
  for (const booking of matching) {
    const room = roomForBeds24Booking(booking, env);
    const reservation = await resolveLocalReservation(store, booking, room, env);
    if (reservation?.id) resolved.push({ booking, reservation, room: reservation.room || room });
  }
  // Never guess between two stays that share a phone number.
  if (resolved.length !== 1) return null;
  const { booking, reservation, room } = resolved[0];
  return {
    externalReservationId: String(booking.id || ""),
    reservationId: reservation.id,
    room,
    guestName: guestNameForBeds24Booking(booking) || "WhatsApp guest",
    guestPhone: phone,
    checkInDate: cleanText(booking?.arrival, 10),
    checkOutDate: cleanText(booking?.departure, 10)
  };
}

function historyFromMessages(messages = []) {
  return messages
    .filter((item) => (item.direction === "inbound" || item.direction === "outbound") && item.sender !== "system")
    .slice(-10)
    .map((item) => ({ role: item.direction === "inbound" ? "user" : "assistant", content: cleanText(item.body, 700) }));
}

async function maybeGenerateReply({ env, store, thread, inboundText, generateReply }) {
  if (!aiReplyEnabled(env) || typeof generateReply !== "function" || !thread?.reservationId || thread.aiPaused) {
    return { generated: false, reason: thread?.reservationId ? "ai_disabled" : "reservation_unlinked" };
  }
  const messages = await store.listMessagingMessages(thread.id, 20).catch(() => []);
  const history = historyFromMessages(messages).slice(0, -1);
  try {
    const result = await generateReply({
      question: inboundText,
      thread,
      history,
      reservationId: thread.reservationId,
      room: thread.room,
      privateReplyContact: "",
      language: "auto"
    });
    if (!result?.answer) return { generated: false, reason: "empty_ai_reply" };
    return { generated: true, ...result };
  } catch (_error) {
    return { generated: false, reason: "ai_error" };
  }
}

function draftMetadata(result, reason, env) {
  const proposal = result?.operationProposal && typeof result.operationProposal === "object"
    ? { ...result.operationProposal }
    : null;
  if (proposal?.recipientGroup) {
    const preview = operationalRecipientPreview(env, proposal.recipientGroup);
    proposal.members = preview.members;
    proposal.available = preview.available;
  }
  return {
    reviewReason: String(reason || "review_required").slice(0, 80),
    language: String(result?.language || "").slice(0, 12),
    intentId: String(result?.intentId || "").slice(0, 80),
    category: String(result?.category || "").slice(0, 80),
    handoff: String(result?.handoff || "none").slice(0, 80),
    operation: proposal,
    decision: "pending"
  };
}

async function recordAiDraft(store, thread, result, reason = "review_required", env = {}) {
  const now = new Date().toISOString();
  const id = `msg_${crypto.randomUUID()}`;
  await store.recordMessagingMessage({
    id,
    threadId: thread.id,
    providerMessageId: "",
    direction: "draft",
    sender: "ai",
    body: cleanText(result.answer, MAX_MESSAGE_LENGTH),
    automated: true,
    deliveryStatus: "draft",
    metadata: draftMetadata(result, reason, env),
    createdAt: now
  });
  await store.updateMessagingThreadState(thread.id, {
    needsHuman: true,
    aiDraft: true,
    lastError: reason,
    updatedAt: now
  });
  return { id };
}

export async function sendBeds24GuestText(env, store, externalReservationId, text) {
  const bookingId = Number(externalReservationId);
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) throw new Error("beds24_invalid_booking");
  const response = await beds24ApiRequest(env, store, "bookings/messages", {
    method: "POST",
    body: [{ bookingId, message: cleanText(text, MAX_MESSAGE_LENGTH) }]
  });
  const item = Array.isArray(response) ? response[0] : null;
  if (item?.success === false || item?.errors?.length) {
    const error = new Error("beds24_send_failed");
    error.provider = item;
    throw error;
  }
  return { providerMessageId: "" };
}

export async function sendWhatsAppGuestText(env, phone, text) {
  const to = digits(phone);
  const phoneNumberId = digits(env.WHATSAPP_PHONE_NUMBER_ID);
  if (!to || !env.WHATSAPP_ACCESS_TOKEN || !phoneNumberId) throw new Error("whatsapp_not_configured");
  const graphVersion = String(env.WHATSAPP_GRAPH_API_VERSION || "v23.0").replace(/[^A-Za-z0-9.]/g, "") || "v23.0";
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: cleanText(text, MAX_MESSAGE_LENGTH) }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.messages?.[0]?.id) {
    const error = new Error("whatsapp_send_failed");
    error.status = response.status;
    error.provider = data;
    throw error;
  }
  return { providerMessageId: String(data.messages[0].id) };
}

export function whatsAppGuestInitiationConfiguration(env = {}) {
  const templateName = cleanText(env.WHATSAPP_GUEST_INIT_TEMPLATE_NAME, 160);
  const language = cleanText(env.WHATSAPP_GUEST_INIT_TEMPLATE_LANGUAGE || "en_US", 30) || "en_US";
  const whatsAppReady = Boolean(env.WHATSAPP_ACCESS_TOKEN && digits(env.WHATSAPP_PHONE_NUMBER_ID));
  return {
    ready: Boolean(whatsAppReady && templateName),
    whatsAppReady,
    templateConfigured: Boolean(templateName),
    language
  };
}

export async function sendWhatsAppGuestTemplate(env, phone) {
  const to = digits(phone);
  const phoneNumberId = digits(env.WHATSAPP_PHONE_NUMBER_ID);
  const templateName = cleanText(env.WHATSAPP_GUEST_INIT_TEMPLATE_NAME, 160);
  const language = cleanText(env.WHATSAPP_GUEST_INIT_TEMPLATE_LANGUAGE || "en_US", 30) || "en_US";
  if (!to || !env.WHATSAPP_ACCESS_TOKEN || !phoneNumberId) throw new Error("whatsapp_not_configured");
  if (!templateName) throw new Error("whatsapp_guest_template_not_configured");
  const graphVersion = String(env.WHATSAPP_GRAPH_API_VERSION || "v23.0").replace(/[^A-Za-z0-9.]/g, "") || "v23.0";
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: { name: templateName, language: { code: language } }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.messages?.[0]?.id) {
    const error = new Error("whatsapp_template_send_failed");
    error.status = response.status;
    error.provider = data;
    throw error;
  }
  return { providerMessageId: String(data.messages[0].id), templateName, language };
}

export async function startWhatsAppGuestConversation({ env, store, reservation, phone, guestName = "" }) {
  const reservationId = cleanText(reservation?.id, 100);
  if (!store || !reservationId) return { ok: false, error: "invalid_reservation" };
  if (typeof store.findMessagingThreadByReservation === "function") {
    const existing = await store.findMessagingThreadByReservation(reservationId, "whatsapp").catch(() => null);
    if (existing?.id) return { ok: true, existing: true, threadId: existing.id };
  }
  const targetPhone = digits(phone);
  if (!targetPhone) return { ok: false, error: "guest_phone_unavailable" };
  const sent = await sendWhatsAppGuestTemplate(env, targetPhone);
  const now = new Date().toISOString();
  const thread = await store.upsertMessagingThread({
    id: `thread_${crypto.randomUUID()}`,
    channel: "whatsapp",
    sourceLabel: "WhatsApp",
    externalThreadId: threadExternalId("whatsapp", targetPhone),
    externalReservationId: cleanText(reservation?.externalBookingId || reservation?.providerReservationId, 120),
    reservationId,
    room: cleanText(reservation?.room, 4),
    guestName: cleanText(guestName || reservation?.guestDisplayName || reservation?.guestFirstName, 80) || "Guest",
    guestPhone: targetPhone,
    checkInDate: cleanText(reservation?.checkInDate, 10),
    checkOutDate: cleanText(reservation?.checkOutDate, 10),
    updatedAt: now
  });
  await store.recordMessagingMessage({
    id: `msg_${crypto.randomUUID()}`,
    threadId: thread.id,
    providerMessageId: `whatsapp:${sent.providerMessageId}`,
    direction: "outbound",
    sender: "owner",
    body: `[Approved WhatsApp template: ${sent.templateName}]`,
    automated: false,
    deliveryStatus: "accepted",
    createdAt: now
  });
  await store.updateMessagingThreadState(thread.id, { needsHuman: false, aiDraft: false, lastError: "", updatedAt: now });
  return { ok: true, existing: false, threadId: thread.id, templateName: sent.templateName };
}


async function sendAndRecordReply({ env, store, thread, result, channel }) {
  const now = new Date().toISOString();
  let providerMessageId = "";
  if (channel === "beds24") {
    await sendBeds24GuestText(env, store, thread.externalReservationId, result.answer);
  } else if (channel === "whatsapp") {
    const outcome = await sendWhatsAppGuestText(env, thread.guestPhone, result.answer);
    providerMessageId = `whatsapp:${outcome.providerMessageId}`;
  } else {
    throw new Error("unsupported_channel");
  }
  await store.recordMessagingMessage({
    id: `msg_${crypto.randomUUID()}`,
    threadId: thread.id,
    providerMessageId,
    direction: "outbound",
    sender: "ai",
    body: cleanText(result.answer, MAX_MESSAGE_LENGTH),
    automated: true,
    deliveryStatus: channel === "beds24" ? "submitted" : "accepted",
    createdAt: now
  });
  await store.updateMessagingThreadState(thread.id, {
    needsHuman: false,
    aiDraft: false,
    lastError: "",
    updatedAt: now
  });
}

async function getBeds24BookingAndMessages(env, store, bookingId, webhookBooking = null) {
  // Beds24 requests are intentionally sequential to keep API usage conservative.
  const bookingResponse = await beds24ApiRequest(env, store, "bookings", { query: { id: bookingId, includeGuests: true } });
  const messagesResponse = await beds24ApiRequest(env, store, "bookings/messages", { query: { bookingId, maxAge: 120 } });
  const booking = (Array.isArray(bookingResponse?.data) ? bookingResponse.data[0] : null) || webhookBooking;
  const messages = Array.isArray(messagesResponse?.data) ? messagesResponse.data : [];
  return { booking, messages };
}

export async function openBeds24ReservationConversation({ env, store, reservation, bookingId }) {
  if (!messagingEnabled(env)) return { ok: false, error: "messaging_disabled" };
  const numericBookingId = Number(bookingId || 0);
  if (!Number.isSafeInteger(numericBookingId) || numericBookingId <= 0) return { ok: false, error: "missing_booking" };
  const { booking, messages } = await getBeds24BookingAndMessages(env, store, numericBookingId);
  if (!booking) return { ok: false, error: "beds24_booking_missing" };
  if (!beds24MessagingChannelSupported(booking)) {
    return { ok: false, error: "channel_has_no_beds24_message_api", source: beds24SourceLabel(booking) };
  }
  const room = reservation?.room || roomForBeds24Booking(booking, env);
  const linkedReservation = reservation || await resolveLocalReservation(store, booking, room, env);
  const thread = await upsertThreadForBeds24(store, booking, room, linkedReservation);
  const plan = beds24MessageSyncPlan(messages);
  for (const message of plan.messages) {
    if (message.direction === "outbound" && typeof store.reconcileMessagingProviderEcho === "function") {
      const echo = await store.reconcileMessagingProviderEcho({
        threadId: thread.id,
        providerMessageId: message.providerMessageId,
        body: message.body,
        createdAt: message.createdAt
      }).catch(() => ({ reconciled: false }));
      if (echo?.reconciled) continue;
    }
    await store.recordMessagingMessage({
      id: `msg_${crypto.randomUUID()}`,
      threadId: thread.id,
      providerMessageId: message.providerMessageId,
      direction: message.direction,
      sender: message.sender,
      body: message.body,
      automated: false,
      deliveryStatus: message.direction === "inbound" ? "received" : "synced",
      createdAt: message.createdAt
    });
  }
  return { ok: true, threadId: thread.id, source: beds24SourceLabel(booking), synced: plan.messages.length };
}

export async function handleBeds24MessagingWebhook(request, env, ctx, generateReply, options = {}) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
  const onBooking = typeof options?.onBooking === "function" ? options.onBooking : null;
  if (!messagingEnabled(env) && !onBooking) return json({ ok: true, ignored: "messaging_disabled" });
  const token = new URL(request.url).searchParams.get("token") || request.headers.get("x-house-beds24-webhook-token") || "";
  if (!env.BEDS24_WEBHOOK_TOKEN || !constantTimeEqual(token, env.BEDS24_WEBHOOK_TOKEN)) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch (_error) { return json({ error: "invalid_json" }, 400); }
  const webhookBooking = body?.booking && typeof body.booking === "object" ? body.booking : body;
  const bookingId = Number(webhookBooking?.id || body?.bookingId || 0);
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) return json({ error: "missing_booking" }, 400);
  const store = getStore(env);
  if (!store) return json({ error: "messaging_store_unavailable" }, 503);

  let booking;
  let messages;
  try {
    ({ booking, messages } = await getBeds24BookingAndMessages(env, store, bookingId, webhookBooking));
  } catch (error) {
    return json({ error: error.code || "beds24_fetch_failed" }, 502);
  }
  if (!booking) return json({ error: "beds24_booking_missing" }, 502);
  let channelManager = null;
  if (onBooking) {
    try {
      channelManager = await onBooking({ booking, store });
      if (channelManager?.ok === false) return json({ error: channelManager.error || "beds24_channel_sync_failed" }, 502);
    } catch (error) {
      return json({ error: error.code || error.message || "beds24_channel_sync_failed" }, 502);
    }
  }
  if (!messagingEnabled(env)) return json({ ok: true, ignored: "messaging_disabled", channelManager });
  if (!beds24MessagingChannelSupported(booking)) {
    return json({ ok: true, ignored: "channel_has_no_beds24_message_api", channel: cleanText(booking.channel, 40), channelManager });
  }

  const room = roomForBeds24Booking(booking, env);
  const reservation = await resolveLocalReservation(store, booking, room, env);
  const thread = await upsertThreadForBeds24(store, booking, room, reservation);
  const plan = beds24MessageSyncPlan(messages);
  if (!plan.messages.length) return json({ ok: true, ignored: "no_message_text", threadId: thread.id });
  let replyCandidateInserted = false;
  let insertedCount = 0;
  for (const message of plan.messages) {
    if (message.direction === "outbound" && typeof store.reconcileMessagingProviderEcho === "function") {
      const echo = await store.reconcileMessagingProviderEcho({
        threadId: thread.id,
        providerMessageId: message.providerMessageId,
        body: message.body,
        createdAt: message.createdAt
      }).catch(() => ({ reconciled: false }));
      if (echo?.reconciled) continue;
    }
    const recorded = await store.recordMessagingMessage({
      id: `msg_${crypto.randomUUID()}`,
      threadId: thread.id,
      providerMessageId: message.providerMessageId,
      direction: message.direction,
      sender: message.sender,
      body: message.body,
      automated: false,
      deliveryStatus: message.direction === "inbound" ? "received" : "synced",
      createdAt: message.createdAt
    });
    if (recorded?.inserted) insertedCount += 1;
    if (recorded?.inserted && plan.replyCandidate?.providerMessageId === message.providerMessageId) replyCandidateInserted = true;
  }
  if (!plan.replyCandidate || !replyCandidateInserted) {
    return json({ ok: true, synced: insertedCount, ignored: plan.replyCandidate ? "no_new_guest_message" : "latest_message_not_guest", threadId: thread.id });
  }
  const inboundText = plan.replyCandidate.body;
  const linkedReservationId = reservation?.id || thread.reservationId;
  const linkedThread = { ...thread, reservationId: linkedReservationId };
  const externalPassport = detectExternalPassportSubmission(inboundText);
  const pushTask = externalPassport ? Promise.resolve(null) : pushInboundOtaMessage(env, linkedThread, inboundText).catch(() => null);
  const departureTask = linkedReservationId
    ? captureDepartureIntent({ env, store, reservationId: linkedReservationId, text: inboundText }).catch(() => null)
    : Promise.resolve(null);
  if (ctx?.waitUntil) { ctx.waitUntil(pushTask); ctx.waitUntil(departureTask); } else { await pushTask; await departureTask; }

  const task = async () => {
    if (externalPassport) {
      await handleExternalPassportSubmission({ env, store, thread: linkedThread, inboundText, channel: "beds24" });
      return;
    }
    const result = await maybeGenerateReply({ env, store, thread: linkedThread, inboundText, generateReply });
    if (!result.generated) {
      if (result.reason === "reservation_unlinked") {
        await store.updateMessagingThreadState(thread.id, { needsHuman: true, lastError: "reservation_unlinked", updatedAt: new Date().toISOString() });
      }
      return;
    }
    const draft = await recordAiDraft(store, linkedThread, result, result.autoSend ? "auto_send_disabled" : (result.reason || "review_required"), env);
    if (!result.autoSend || !aiAutoSendEnabled(env)) return;
    const approved = await reviewMessagingDraft({
      env, store, threadId: linkedThread.id, draftId: draft.id, action: "approve",
      message: result.answer, actorLabel: "Taoedge AI", automated: true
    }).catch(() => ({ ok: false, error: "automatic_reply_failed" }));
    if (!approved?.ok) {
      await store.updateMessagingThreadState(linkedThread.id, { needsHuman: true, aiDraft: true, lastError: approved?.error || "automatic_reply_failed", updatedAt: new Date().toISOString() });
    }
  };
  if (ctx?.waitUntil) ctx.waitUntil(task()); else await task();
  return json({ ok: true, threadId: thread.id, linkedReservation: Boolean(reservation?.id), source: beds24SourceLabel(booking), synced: insertedCount, channelManager });
}

export async function handleInboundWhatsAppGuestMessage(message, env, ctx, generateReply) {
  if (!messagingEnabled(env)) return { ok: true, ignored: "messaging_disabled" };
  const store = getStore(env);
  if (!store) return { ok: false, error: "messaging_store_unavailable" };
  const phone = digits(message?.from);
  const body = cleanText(message?.text?.body || message?.button?.text || message?.interactive?.button_reply?.title || "", MAX_MESSAGE_LENGTH);
  if (!phone || !body) return { ok: true, ignored: "unsupported_guest_message" };
  let linked = typeof store.findMessagingThreadByPhone === "function"
    ? await store.findMessagingThreadByPhone(phone).catch(() => null)
    : null;
  if (!linked?.reservationId) {
    linked = await resolveWhatsAppGuestViaBeds24(store, phone, env) || linked;
  }
  const now = new Date().toISOString();
  const thread = await store.upsertMessagingThread({
    id: linked?.channel === "whatsapp" ? linked.id : `thread_${crypto.randomUUID()}`,
    channel: "whatsapp",
    sourceLabel: "WhatsApp",
    externalThreadId: threadExternalId("whatsapp", phone),
    externalReservationId: linked?.externalReservationId || "",
    reservationId: linked?.reservationId || "",
    room: linked?.room || "",
    guestName: linked?.guestName || "WhatsApp guest",
    guestPhone: phone,
    checkInDate: linked?.checkInDate || "",
    checkOutDate: linked?.checkOutDate || "",
    updatedAt: now
  });
  const recorded = await store.recordMessagingMessage({
    id: `msg_${crypto.randomUUID()}`,
    threadId: thread.id,
    providerMessageId: `whatsapp:${String(message?.id || "")}`,
    direction: "inbound",
    sender: "guest",
    body,
    automated: false,
    deliveryStatus: "received",
    createdAt: now
  });
  if (!recorded?.inserted) return { ok: true, duplicate: true, threadId: thread.id };
  const externalPassport = detectExternalPassportSubmission(body);
  const pushTask = externalPassport ? Promise.resolve(null) : pushInboundOtaMessage(env, thread, body).catch(() => null);
  const departureTask = thread.reservationId
    ? captureDepartureIntent({ env, store, reservationId: thread.reservationId, text: body }).catch(() => null)
    : Promise.resolve(null);
  if (ctx?.waitUntil) { ctx.waitUntil(pushTask); ctx.waitUntil(departureTask); } else { await pushTask; await departureTask; }

  const task = async () => {
    if (externalPassport) {
      await handleExternalPassportSubmission({ env, store, thread, inboundText: body, channel: "whatsapp" });
      return;
    }
    const result = await maybeGenerateReply({ env, store, thread, inboundText: body, generateReply });
    if (!result.generated) {
      if (!thread.reservationId) await store.updateMessagingThreadState(thread.id, { needsHuman: true, lastError: "reservation_unlinked", updatedAt: new Date().toISOString() });
      return;
    }
    const draft = await recordAiDraft(store, thread, result, result.autoSend ? "auto_send_disabled" : (result.reason || "review_required"), env);
    if (!result.autoSend || !aiAutoSendEnabled(env)) return;
    const approved = await reviewMessagingDraft({
      env, store, threadId: thread.id, draftId: draft.id, action: "approve",
      message: result.answer, actorLabel: "Taoedge AI", automated: true
    }).catch(() => ({ ok: false, error: "automatic_reply_failed" }));
    if (!approved?.ok) {
      await store.updateMessagingThreadState(thread.id, { needsHuman: true, aiDraft: true, lastError: approved?.error || "automatic_reply_failed", updatedAt: new Date().toISOString() });
    }
  };
  if (ctx?.waitUntil) ctx.waitUntil(task()); else await task();
  return { ok: true, threadId: thread.id, linkedReservation: Boolean(thread.reservationId) };
}

export async function handleWhatsAppMessagingStatus(status, env) {
  if (!messagingEnabled(env)) return { ok: true, ignored: "messaging_disabled" };
  const store = getStore(env);
  if (!store || typeof store.updateMessagingMessageDelivery !== "function") return { ok: true };
  return store.updateMessagingMessageDelivery({
    providerMessageId: `whatsapp:${String(status?.id || "")}`,
    deliveryStatus: cleanText(status?.status || "unknown", 30),
    updatedAt: new Date().toISOString()
  });
}

function reviewedDraftPublic(message) {
  if (!message) return null;
  return {
    id: message.id,
    threadId: message.threadId,
    body: message.body,
    deliveryStatus: message.deliveryStatus,
    metadata: message.metadata || {},
    createdAt: message.createdAt,
    updatedAt: message.updatedAt
  };
}

async function createReviewedOperationalTask({ env, store, thread, draft, actorLabel, now }) {
  const operation = draft?.metadata?.operation;
  if (!operation?.required) return { required: false, activity: null, delivery: { attempted: 0, accepted: 0 } };
  const preview = operationalRecipientPreview(env, operation.recipientGroup);
  if (!preview.available) return { required: true, error: "operational_route_unavailable", delivery: { attempted: 0, accepted: 0 } };
  if (!thread.reservationId || !thread.room) return { required: true, error: "reservation_unlinked", delivery: { attempted: 0, accepted: 0 } };
  const activityId = `bact_${crypto.randomUUID()}`;
  const category = cleanText(operation.taskCategory || "Guest support", 60) || "Guest support";
  const created = typeof store.mobileCreateReservationActivity === "function"
    ? await store.mobileCreateReservationActivity({
        id: activityId,
        reservationId: thread.reservationId,
        kind: "task",
        category,
        body: cleanText(operation.summary || "Guest requested assistance.", 1800),
        assigneeKey: cleanText(operation.recipientGroup, 80),
        assigneeLabel: preview.members.join(" + ") || "Operational team",
        createdByHash: "unified-messaging-ai-review",
        createdByLabel: cleanText(actorLabel, 100) || "AI review",
        createdAt: now
      })
    : { ok: false, error: "booking_activity_unavailable" };
  if (!created?.ok) return { required: true, error: created?.error || "booking_activity_create_failed", delivery: { attempted: 0, accepted: 0 } };
  const alert = await createProtectedOperationsAlert({
    env,
    room: thread.room,
    roomVerified: true,
    alertType: cleanText(operation.alertType || "booking_task_guest_support", 100),
    severity: cleanText(operation.severity || "attention", 30),
    recipientGroup: cleanText(operation.recipientGroup, 80),
    summary: `${cleanText(operation.summary || "Guest requested assistance.", 1200)} · Booking task ref ${activityId.slice(-8)}`,
    escalationRequired: false,
    now: new Date(now)
  });
  if (!alert) return { required: true, error: "operational_alert_create_failed", activityId, delivery: { attempted: 0, accepted: 0 } };
  const delivery = await dispatchConciergeAlert(alert, env).catch(() => ({ attempted: 0, accepted: 0 }));
  if (typeof store.mobileLinkReservationActivityAlert === "function") {
    await store.mobileLinkReservationActivityAlert(activityId, alert.id, delivery, now).catch(() => {});
  }
  return { required: true, activityId, alertId: alert.id, delivery, members: preview.members };
}

async function sendReviewedGuestReply({ env, store, thread, text, now, automated = false }) {
  let providerMessageId = "";
  if (thread.channel === "beds24") {
    await sendBeds24GuestText(env, store, thread.externalReservationId, text);
  } else if (thread.channel === "whatsapp") {
    const outcome = await sendWhatsAppGuestText(env, thread.guestPhone, text);
    providerMessageId = `whatsapp:${outcome.providerMessageId}`;
  } else {
    throw new Error("unsupported_channel");
  }
  await store.recordMessagingMessage({
    id: `msg_${crypto.randomUUID()}`,
    threadId: thread.id,
    providerMessageId,
    direction: "outbound",
    sender: automated ? "ai" : "owner",
    body: text,
    automated,
    deliveryStatus: thread.channel === "beds24" ? "submitted" : "accepted",
    metadata: { source: automated ? "automatic_ai_reply" : "approved_ai_draft" },
    createdAt: now
  });
}

export async function reviewMessagingDraft({ env, store, threadId, draftId, action, message = "", operationDecision = "", generateReply, actorLabel = "Team member", automated = false }) {
  const thread = await store.getMessagingThread(cleanText(threadId, 100));
  const draft = typeof store.getMessagingMessage === "function" ? await store.getMessagingMessage(cleanText(draftId, 100)) : null;
  if (!thread || !draft || draft.threadId !== thread.id || draft.direction !== "draft") return { ok: false, error: "draft_not_found" };
  if (!["draft", "regenerated"].includes(draft.deliveryStatus)) return { ok: false, error: "draft_already_reviewed" };
  const now = new Date().toISOString();
  if (action === "reject") {
    const metadata = { ...(draft.metadata || {}), decision: "rejected", decidedAt: now, decidedBy: cleanText(actorLabel, 100) };
    await store.updateMessagingDraft(draft.id, { deliveryStatus: "rejected", metadata, updatedAt: now });
    await store.updateMessagingThreadState(thread.id, { needsHuman: true, aiDraft: false, lastError: "draft_rejected", updatedAt: now });
    return { ok: true, action: "rejected", draft: reviewedDraftPublic(await store.getMessagingMessage(draft.id)) };
  }
  if (action === "regenerate") {
    if (typeof generateReply !== "function") return { ok: false, error: "ai_unavailable" };
    const messages = await store.listMessagingMessages(thread.id, 100);
    const inbound = [...messages].reverse().find((item) => item.direction === "inbound" && new Date(item.createdAt).getTime() <= new Date(draft.createdAt).getTime());
    if (!inbound?.body) return { ok: false, error: "guest_message_not_found" };
    const result = await maybeGenerateReply({ env, store, thread, inboundText: inbound.body, generateReply });
    if (!result.generated || !result.answer) return { ok: false, error: result.reason || "ai_regeneration_failed" };
    const metadata = { ...draftMetadata(result, result.reason || "review_required", env), decision: "pending", regeneratedAt: now };
    await store.updateMessagingDraft(draft.id, { body: result.answer, deliveryStatus: "regenerated", metadata, updatedAt: now });
    await store.updateMessagingThreadState(thread.id, { needsHuman: true, aiDraft: true, lastError: result.reason || "review_required", updatedAt: now });
    return { ok: true, action: "regenerated", draft: reviewedDraftPublic(await store.getMessagingMessage(draft.id)) };
  }
  if (!["approve", "approve_no_send"].includes(action)) return { ok: false, error: "invalid_review_action" };
  const text = cleanText(message || draft.body, MAX_MESSAGE_LENGTH);
  if (!text) return { ok: false, error: "empty_reply" };
  const proposedOperation = draft?.metadata?.operation;

  // "Approve — Don't Send" is deliberately side-effect free. It records a
  // positive AI-quality decision without sending a guest message or creating
  // any operational task/alert, even when the original draft carried a proposal.
  if (action === "approve_no_send") {
    const operation = proposedOperation?.required
      ? { required: true, skipped: true, reason: "approve_no_send" }
      : { required: false, skipped: true, reason: "approve_no_send" };
    const metadata = {
      ...(draft.metadata || {}),
      decision: "approved_no_send",
      decidedAt: now,
      decidedBy: cleanText(actorLabel, 100),
      edited: text !== draft.body,
      operationDecision: "skip",
      operationResult: operation
    };
    await store.updateMessagingDraft(draft.id, { body: text, deliveryStatus: "approved_no_send", metadata, updatedAt: now });
    await store.updateMessagingThreadState(thread.id, { needsHuman: false, aiDraft: false, lastError: "", updatedAt: now });
    return { ok: true, action: "approved_no_send", sent: false, operation, draft: reviewedDraftPublic(await store.getMessagingMessage(draft.id)) };
  }

  const normalizedOperationDecision = ["execute", "skip"].includes(String(operationDecision || "")) ? String(operationDecision) : "";
  if (proposedOperation?.required && !normalizedOperationDecision) {
    return { ok: false, error: "operation_decision_required", operation: { required: true } };
  }
  let operation = proposedOperation?.required && normalizedOperationDecision === "execute"
    ? await createReviewedOperationalTask({ env, store, thread, draft, actorLabel, now })
    : proposedOperation?.required
      ? { required: true, skipped: true, reason: "owner_skipped" }
      : { required: false, skipped: true };
  if (operation.required && operation.error) return { ok: false, error: operation.error, operation };
  if (operation.required && !operation.skipped && Number(operation.delivery?.accepted) <= 0) {
    return { ok: false, error: "operational_notification_failed", operation };
  }
  try {
    await sendReviewedGuestReply({ env, store, thread, text, now, automated });
  } catch (error) {
    return { ok: false, error: error?.message || "provider_send_failed", operation };
  }
  const metadata = {
    ...(draft.metadata || {}),
    decision: "approved",
    decidedAt: now,
    decidedBy: cleanText(actorLabel, 100),
    edited: text !== draft.body,
    operationDecision: proposedOperation?.required ? normalizedOperationDecision : "none",
    operationResult: operation
  };
  await store.updateMessagingDraft(draft.id, { body: text, deliveryStatus: "approved", metadata, updatedAt: now });
  await store.updateMessagingThreadState(thread.id, { needsHuman: false, aiDraft: false, lastError: "", updatedAt: now });
  return { ok: true, action: "approved", sent: true, operation, draft: reviewedDraftPublic(await store.getMessagingMessage(draft.id)) };
}

function maskedPhone(value) {
  const phone = digits(value);
  if (!phone) return "";
  if (phone.length <= 4) return `••${phone}`;
  return `+${phone.slice(0, 2)} •••• ${phone.slice(-4)}`;
}

function publicThread(thread) {
  return {
    id: thread.id,
    channel: thread.channel,
    sourceLabel: thread.sourceLabel,
    reservationId: thread.reservationId,
    room: thread.room,
    guestName: thread.guestName,
    guestPhone: maskedPhone(thread.guestPhone),
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

export async function handleUnifiedMessagingAdminRequest(request, env, path, store, actorHash = "") {
  if (path === "/api/concierge/admin/messaging/overview" && request.method === "GET") {
    const threads = await store.listMessagingThreads(MAX_THREADS);
    return json({
      configuration: unifiedMessagingConfiguration(env),
      unread: threads.reduce((sum, item) => sum + (Number(item.unreadCount) || 0), 0),
      needsHuman: threads.filter((item) => item.needsHuman).length,
      threads: threads.map(publicThread)
    });
  }
  if (path === "/api/concierge/admin/messaging/thread" && request.method === "GET") {
    const id = new URL(request.url).searchParams.get("id") || "";
    const thread = await store.getMessagingThread(id);
    if (!thread) return json({ error: "not_found" }, 404);
    const messages = await store.listMessagingMessages(id, MAX_THREAD_MESSAGES);
    await store.markMessagingThreadRead(id, new Date().toISOString());
    return json({ thread: publicThread({ ...thread, unreadCount: 0 }), messages });
  }
  if (path === "/api/concierge/admin/messaging/send" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch (_error) { return json({ error: "invalid_request" }, 400); }
    const thread = await store.getMessagingThread(String(body?.threadId || ""));
    const text = cleanText(body?.message, MAX_MESSAGE_LENGTH);
    if (!thread || !text) return json({ error: "invalid_request" }, 400);
    let providerMessageId = "";
    try {
      if (thread.channel === "beds24") {
        await sendBeds24GuestText(env, store, thread.externalReservationId, text);
      } else if (thread.channel === "whatsapp") {
        const outcome = await sendWhatsAppGuestText(env, thread.guestPhone, text);
        providerMessageId = `whatsapp:${outcome.providerMessageId}`;
      } else {
        return json({ error: "unsupported_channel" }, 409);
      }
    } catch (error) {
      return json({ error: error.message || "send_failed" }, 502);
    }
    const now = new Date().toISOString();
    await store.recordMessagingMessage({
      id: `msg_${crypto.randomUUID()}`,
      threadId: thread.id,
      providerMessageId,
      direction: "outbound",
      sender: "owner",
      body: text,
      automated: false,
      deliveryStatus: thread.channel === "beds24" ? "submitted" : "accepted",
      createdAt: now
    });
    await store.updateMessagingThreadState(thread.id, { needsHuman: false, aiDraft: false, lastError: "", updatedAt: now });
    await store.recordAdminAudit?.("unified_message_sent", `thread:${thread.id}`, now).catch(() => {});
    return json({ ok: true });
  }
  if (path === "/api/concierge/admin/messaging/ai" && request.method === "POST") {
    let body;
    try { body = await request.json(); } catch (_error) { return json({ error: "invalid_request" }, 400); }
    const id = String(body?.threadId || "");
    const thread = await store.getMessagingThread(id);
    if (!thread) return json({ error: "not_found" }, 404);
    await store.updateMessagingThreadState(id, { aiPaused: body?.paused === true, updatedAt: new Date().toISOString() });
    return json({ ok: true, aiPaused: body?.paused === true });
  }
  return null;
}
