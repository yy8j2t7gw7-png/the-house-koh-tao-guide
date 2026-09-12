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
      privateReplyContact: thread.guestPhone || "",
      language: "en"
    });
    if (!result?.answer) return { generated: false, reason: "empty_ai_reply" };
    return { generated: true, ...result };
  } catch (_error) {
    return { generated: false, reason: "ai_error" };
  }
}

async function recordAiDraft(store, thread, result, reason = "review_required") {
  const now = new Date().toISOString();
  await store.recordMessagingMessage({
    id: `msg_${crypto.randomUUID()}`,
    threadId: thread.id,
    providerMessageId: "",
    direction: "draft",
    sender: "ai",
    body: cleanText(result.answer, MAX_MESSAGE_LENGTH),
    automated: true,
    deliveryStatus: "draft",
    createdAt: now
  });
  await store.updateMessagingThreadState(thread.id, {
    needsHuman: true,
    aiDraft: true,
    lastError: reason,
    updatedAt: now
  });
}

async function sendBeds24Text(env, store, externalReservationId, text) {
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

async function sendAndRecordReply({ env, store, thread, result, channel }) {
  const now = new Date().toISOString();
  let providerMessageId = "";
  if (channel === "beds24") {
    await sendBeds24Text(env, store, thread.externalReservationId, result.answer);
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

  const task = async () => {
    const linkedThread = { ...thread, reservationId: reservation?.id || thread.reservationId };
    const result = await maybeGenerateReply({ env, store, thread: linkedThread, inboundText, generateReply });
    if (!result.generated) {
      if (result.reason === "reservation_unlinked") {
        await store.updateMessagingThreadState(thread.id, { needsHuman: true, lastError: "reservation_unlinked", updatedAt: new Date().toISOString() });
      }
      return;
    }
    if (!result.autoSend || !aiAutoSendEnabled(env)) {
      await recordAiDraft(store, linkedThread, result, result.autoSend ? "auto_send_disabled" : (result.reason || "review_required"));
      return;
    }
    try {
      await sendAndRecordReply({ env, store, thread: linkedThread, result, channel: "beds24" });
    } catch (_error) {
      await recordAiDraft(store, linkedThread, result, "provider_send_failed");
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

  const task = async () => {
    const result = await maybeGenerateReply({ env, store, thread, inboundText: body, generateReply });
    if (!result.generated) {
      if (!thread.reservationId) await store.updateMessagingThreadState(thread.id, { needsHuman: true, lastError: "reservation_unlinked", updatedAt: new Date().toISOString() });
      return;
    }
    if (!result.autoSend || !aiAutoSendEnabled(env)) {
      await recordAiDraft(store, thread, result, result.autoSend ? "auto_send_disabled" : (result.reason || "review_required"));
      return;
    }
    try {
      await sendAndRecordReply({ env, store, thread, result, channel: "whatsapp" });
    } catch (_error) {
      await recordAiDraft(store, thread, result, "provider_send_failed");
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
        await sendBeds24Text(env, store, thread.externalReservationId, text);
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
