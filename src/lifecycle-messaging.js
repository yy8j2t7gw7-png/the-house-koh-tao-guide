import {
  beds24ApiRequest,
  beds24SourceLabel,
  roomForBeds24Booking,
  sendBeds24GuestText
} from "./unified-messaging.js";
import { sendMobilePush } from "./mobile-push.js";

const SUPPORTED_CHANNELS = new Set(["airbnb", "booking", "expedia", "vrbo"]);
const DEFAULT_DELAY_MINUTES = 5;
const HOUSE_TENANT_ID = "tenant_the_house_koh_tao";
const LIFECYCLE_RUNTIME_STATE_KEY = "guest_lifecycle_v1";

function cleanText(value, maximum = 3000) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, maximum);
}

function enabled(env) {
  return String(env.AI_GUEST_LIFECYCLE_ENABLED || "false").toLowerCase() === "true";
}

export function guestLifecycleMessagingConfiguration(env = {}) {
  const delayMinutes = Math.max(1, Math.min(30, Number(env.AI_GUEST_LIFECYCLE_FIRST_MESSAGE_DELAY_MINUTES) || DEFAULT_DELAY_MINUTES));
  return {
    enabled: enabled(env),
    firstMessageDelayMinutes: delayMinutes,
    provider: "beds24_ota_messaging",
    aiNaturalization: Boolean(env.OPENAI_API_KEY),
    supportedChannels: [...SUPPORTED_CHANNELS],
    airbnbNativeQuickRepliesExpected: false,
    cutoverSafety: "first_run_watermark"
  };
}

function getStore(env) {
  return env.CONCIERGE_STORE?.getByName?.("the-house-concierge-global") || null;
}

function bangkokClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now).filter((item) => item.type !== "literal").map((item) => [item.type, item.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function shift(dateOnly, days) {
  const date = new Date(`${dateOnly}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayDiff(fromDate, toDate) {
  const from = new Date(`${fromDate}T12:00:00Z`);
  const to = new Date(`${toDate}T12:00:00Z`);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) return 9999;
  return Math.round((to - from) / 86_400_000);
}

function guestName(booking, reservation) {
  const candidates = [
    booking?.firstName,
    booking?.guest?.firstName,
    String(booking?.guestName || "").split(/\s+/)[0],
    reservation?.guestFirstName
  ];
  return cleanText(candidates.find(Boolean) || "", 60);
}

function bookingReference(booking) {
  return cleanText(booking?.apiReference || booking?.reference || booking?.bookingReference || "", 80);
}

function guideUrl(env, room) {
  const base = cleanText(env.PUBLIC_GUIDE_BASE_URL || "https://the-house-koh-tao-guide.7mf56yd45g.workers.dev", 300).replace(/\/+$/, "");
  return `${base}/room/${room}`;
}

function registrationLine(reservation) {
  if (String(reservation?.registrationStatus || "") === "complete") return "Your guest registration is already complete.";
  if (String(reservation?.guestType || "") === "thai") return "No passport upload is required for an all-Thai guest group.";
  return "Before arrival, please complete the secure registration for every non-Thai overnight guest. One passport submission is required for each non-Thai guest staying overnight.";
}

function approvedMessage(stage, context) {
  const name = context.name ? ` ${context.name}` : "";
  const code = context.confirmationCode ? `\n\nWhen asked, please enter your Airbnb confirmation code: ${context.confirmationCode}` : "\n\nWhen asked, please use your Airbnb confirmation code to verify your stay.";
  const page = `Your personal Room ${context.room} guest page:\n${context.guestPageUrl}${code}`;
  if (stage === "booking") {
    return `Hello${name},\n\nThank you for booking The House – Koh Tao. We look forward to welcoming you! 😊\n\n${page}\n\nYou can use your guest page before arrival to explore The House, complete your guest registration, find useful information and ask our AI Concierge any questions about your stay or Koh Tao.\n\nPlease keep this message, as the same guest page will also be useful during your stay.\n\nSee you soon!\nThe House – Koh Tao`;
  }
  if (stage === "booking_prearrival") {
    return `Hello${name},\n\nThank you for booking The House – Koh Tao. We’re looking forward to welcoming you soon! 😊\n\n${page}\n\nYour guest page has everything you’ll need for arrival and during your stay, including House information and our AI Concierge.\n\n${context.registrationLine}\n\nPlease keep the guest-page link handy.\nThe House – Koh Tao`;
  }
  if (stage === "same_day") {
    return `Hello${name},\n\nThank you for booking The House – Koh Tao. We look forward to welcoming you today! 😊\n\n${page}\n\nCheck-in is from 2:00 PM. Once your room is ready, it will be unlocked and your key will be waiting for you inside.\n\n${context.registrationLine}\n\nYour guest page contains your arrival information, House information and our AI Concierge if you need anything.\n\nSee you soon!\nThe House – Koh Tao`;
  }
  if (stage === "same_day_late") {
    return `Hello${name},\n\nThank you for your last-minute booking at The House – Koh Tao. Your booking is received and we’ll help make your arrival as smooth as possible.\n\n${page}\n\nCheck-in is from 2:00 PM. Please open your guest page now and complete any outstanding secure registration. Once the room is ready, it will be unlocked and the key will be inside.\n\nIf you need help with your arrival, message our AI Concierge through your guest page.\n\nWelcome to Koh Tao!\nThe House – Koh Tao`;
  }
  if (stage === "prearrival") {
    return `Hello${name},\n\nWe’re looking forward to welcoming you to The House – Koh Tao.\n\n${page}\n\nPlease open this page before you arrive. It contains your arrival information, Wi-Fi and House information, plus our AI Concierge.\n\n${context.registrationLine}\n\nSee you soon!\nThe House – Koh Tao`;
  }
  if (stage === "checkin") {
    return `Hello${name},\n\nWelcome to The House – Koh Tao! We hope you have a smooth journey to the island.\n\nYour check-in is from 2:00 PM. Once your room is ready, it will be unlocked and your key will be waiting for you inside.\n\n${context.registrationLine}\n\nIf you need any assistance during your stay, please send us a message through your personal guest page for quick and easy contact.\n\nWe hope you have a wonderful stay on Koh Tao!\nThe House – Koh Tao`;
  }
  if (stage === "departure_prompt") {
    return `Hello${name},\n\nJust a quick message as tomorrow is your checkout day. Standard checkout is at 11:00 AM.\n\nIf you already know roughly what time you plan to leave, please let us know — it helps our housekeeping team plan the room preparation.\n\nIf you would like to extend your stay, you can also tell us and we’ll check it for you.\n\nThank you!\nThe House – Koh Tao`;
  }
  if (stage === "checkout") {
    const time = context.lateCheckoutTime || "11:00 AM";
    const plan = context.plannedDepartureTime ? ` Thanks for letting us know you’re planning to leave around ${context.plannedDepartureTime}.` : "";
    return `Good morning${name},\n\nWe hope you enjoyed your stay at The House – Koh Tao. Your checkout time today is ${time}.${plan}\n\nBefore leaving, please make sure you have all your belongings and leave the room key in the room.\n\nIf you need any help before departure, just message us through your guest page.\n\nThank you for staying with us and safe travels!\nThe House – Koh Tao`;
  }
  return "";
}

function extractOutputText(body) {
  if (typeof body?.output_text === "string") return body.output_text;
  for (const item of Array.isArray(body?.output) ? body.output : []) {
    for (const part of Array.isArray(item?.content) ? item.content : []) {
      if (typeof part?.text === "string") return part.text;
    }
  }
  return "";
}

function sanitizeLifecycleAiText(value) {
  return cleanText(value, 3000)
    .replace(/\b(?:HM|HS)[A-Z0-9]{4,40}\b/gi, "[[CONFIRMATION_CODE_REDACTED]]")
    .replace(/https?:\/\/[^\s]+\/room\/(?:[1-9]|10|11)\b/gi, "[[GUEST_PAGE_URL_REDACTED]]");
}

async function naturalize(env, { stage, fallback, facts, recentMessages = [] }) {
  if (!env.OPENAI_API_KEY) return { action: "send", message: fallback, source: "approved_fallback" };
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_LIFECYCLE_MODEL || env.OPENAI_MODEL || "gpt-5.6",
        store: false,
        instructions: [
          "You write hotel lifecycle messages for The House – Koh Tao.",
          "Business facts, times, links, codes and policies in FACTS are authoritative; never invent or change them.",
          "The APPROVED MESSAGE is the content policy source. Keep its useful information but make the phrasing feel like a natural human hotel response, not a robotic template.",
          "Tokens such as [[GUEST_PAGE_URL]] and [[CONFIRMATION_CODE]] are opaque protected placeholders. Preserve every placeholder that appears in the approved message exactly once and do not alter or explain it.",
          "Be warm, concise and professional. Do not mention automation or AI unless the approved content refers to the AI Concierge.",
          "If RECENT OUTBOUND MESSAGES already communicated substantially the same stage and facts, choose action=skip rather than repeating them.",
          "Never approve refunds, cancellation, payment changes, late checkout, extension availability, room readiness or exceptions unless FACTS explicitly say they are approved.",
          "Return only the required JSON."
        ].join(" "),
        input: [{ role: "user", content: JSON.stringify({
          stage,
          facts,
          approvedMessage: sanitizeLifecycleAiText(fallback),
          recentOutboundMessages: recentMessages.slice(-6).map(sanitizeLifecycleAiText)
        }) }],
        reasoning: { effort: env.OPENAI_LIFECYCLE_REASONING_EFFORT || "low" },
        max_output_tokens: 1200,
        text: {
          format: {
            type: "json_schema",
            name: "lifecycle_message",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["action", "message"],
              properties: {
                action: { type: "string", enum: ["send", "skip"] },
                message: { type: "string", maxLength: 3000 }
              }
            }
          }
        }
      })
    });
    if (!response.ok) return { action: "send", message: fallback, source: "approved_fallback" };
    const parsed = JSON.parse(extractOutputText(await response.json()) || "{}");
    if (parsed.action === "skip") return { action: "skip", message: "", source: "ai_semantic_dedupe" };
    const message = cleanText(parsed.message, 3000);
    return message ? { action: "send", message, source: "ai_naturalized" } : { action: "send", message: fallback, source: "approved_fallback" };
  } catch (_error) {
    return { action: "send", message: fallback, source: "approved_fallback" };
  }
}

function stageConcepts(stage) {
  const map = {
    booking: ["welcome", "guest_page", "confirmation_code", "registration", "concierge"],
    booking_prearrival: ["welcome", "guest_page", "confirmation_code", "registration", "prearrival"],
    same_day: ["welcome", "guest_page", "confirmation_code", "registration", "checkin_time", "self_checkin"],
    same_day_late: ["welcome", "guest_page", "confirmation_code", "registration", "checkin_time", "last_minute_arrival"],
    prearrival: ["prearrival", "guest_page", "confirmation_code", "registration"],
    checkin: ["checkin_day", "checkin_time", "self_checkin", "guest_page_contact"],
    departure_prompt: ["checkout_tomorrow", "departure_time_request", "extension_offer"],
    checkout: ["checkout_day", "checkout_time", "key_return", "departure_help"]
  };
  return map[stage] || [stage];
}

function firstNameMatches(booking, reservation) {
  const expected = cleanText(reservation.guestFirstName, 40).toLowerCase();
  if (!expected) return true;
  const actual = guestName(booking, reservation).toLowerCase();
  return !actual || actual === expected;
}

async function fetchProviderBookingsForArrival(env, store, arrival, cache) {
  if (cache.has(arrival)) return cache.get(arrival);
  const response = await beds24ApiRequest(env, store, "bookings", {
    query: { arrivalFrom: arrival, arrivalTo: arrival, includeGuests: true, status: ["confirmed", "new"] }
  });
  const rows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
  cache.set(arrival, rows);
  return rows;
}

async function resolveProviderBooking(env, store, reservation, cache) {
  const current = await store.getGuestLifecycleState(reservation.id).catch(() => null);
  if (current?.externalBookingId) {
    try {
      const response = await beds24ApiRequest(env, store, "bookings", { query: { id: [Number(current.externalBookingId)], includeGuests: true } });
      const rows = Array.isArray(response?.data) ? response.data : [];
      if (rows[0]) return rows[0];
    } catch (_error) { /* fall through to date match */ }
  }
  const bookings = await fetchProviderBookingsForArrival(env, store, reservation.checkInDate, cache);
  const candidates = bookings.filter((booking) => {
    const channel = cleanText(booking?.channel, 40).toLowerCase();
    if (!SUPPORTED_CHANNELS.has(channel)) return false;
    return roomForBeds24Booking(booking, env) === String(reservation.room)
      && cleanText(booking?.arrival, 10) === reservation.checkInDate
      && cleanText(booking?.departure, 10) === reservation.checkOutDate
      && firstNameMatches(booking, reservation);
  });
  return candidates.length === 1 ? candidates[0] : null;
}

async function ensureThread(store, booking, reservation) {
  const externalId = String(booking?.id || "");
  return store.upsertMessagingThread({
    id: `thread_${crypto.randomUUID()}`,
    channel: "beds24",
    sourceLabel: beds24SourceLabel(booking),
    externalThreadId: `beds24:${externalId}`,
    externalReservationId: externalId,
    reservationId: reservation.id,
    room: reservation.room,
    guestName: guestName(booking, reservation),
    guestPhone: cleanText(booking?.mobile || booking?.phone || "", 20).replace(/\D/g, ""),
    checkInDate: reservation.checkInDate,
    checkOutDate: reservation.checkOutDate,
    updatedAt: new Date().toISOString()
  });
}

async function markStage(store, reservation, booking, thread, stage, now, extra = {}) {
  const patch = {
    reservationId: reservation.id,
    externalBookingId: String(booking?.id || ""),
    sourceLabel: beds24SourceLabel(booking),
    threadId: thread?.id || "",
    communicated: stageConcepts(stage),
    updatedAt: now.toISOString(),
    ...extra
  };
  if (["booking", "booking_prearrival", "same_day", "same_day_late"].includes(stage)) patch.bookingSentAt = now.toISOString();
  if (["booking_prearrival", "same_day", "same_day_late", "prearrival"].includes(stage)) patch.prearrivalSentAt = now.toISOString();
  if (["same_day", "same_day_late", "checkin"].includes(stage)) patch.checkinSentAt = now.toISOString();
  if (stage === "departure_prompt") patch.departurePromptSentAt = now.toISOString();
  if (stage === "checkout") patch.checkoutSentAt = now.toISOString();
  return store.upsertGuestLifecycleState(patch);
}

async function sendStage(env, store, reservation, booking, stage, now) {
  const thread = await ensureThread(store, booking, reservation);
  const state = await store.getGuestLifecycleState(reservation.id).catch(() => null);
  const facts = {
    property: "The House – Koh Tao",
    guestName: guestName(booking, reservation),
    room: reservation.room,
    checkInDate: reservation.checkInDate,
    checkOutDate: reservation.checkOutDate,
    standardCheckIn: "2:00 PM",
    standardCheckout: "11:00 AM",
    lateCheckoutTime: reservation.lateCheckoutTime || "",
    plannedDepartureTime: state?.plannedDepartureTime || "",
    guestPageUrl: guideUrl(env, reservation.room),
    confirmationCode: bookingReference(booking),
    registrationStatus: reservation.registrationStatus,
    guestType: reservation.guestType,
    requiredPassports: Number(reservation.requiredPassports || 0),
    receivedPassports: Number(reservation.receivedPassports || 0)
  };
  const context = {
    ...facts,
    name: facts.guestName,
    confirmationCode: facts.confirmationCode,
    registrationLine: registrationLine(reservation)
  };
  const fallback = approvedMessage(stage, context);
  const protectedStage = ["booking", "booking_prearrival", "same_day", "same_day_late", "prearrival"].includes(stage);
  let aiFallback = fallback;
  const aiFacts = { ...facts };
  if (protectedStage) {
    aiFallback = aiFallback.replaceAll(facts.guestPageUrl, "[[GUEST_PAGE_URL]]");
    aiFacts.guestPageUrl = "[[GUEST_PAGE_URL]]";
    if (facts.confirmationCode) {
      aiFallback = aiFallback.replaceAll(facts.confirmationCode, "[[CONFIRMATION_CODE]]");
      aiFacts.confirmationCode = "[[CONFIRMATION_CODE]]";
    } else {
      aiFacts.confirmationCode = "";
    }
  }
  const history = await store.listMessagingMessages(thread.id, 30).catch(() => []);
  const recentOutbound = history
    .filter((item) => item.direction === "outbound")
    .slice(-6)
    .map((item) => cleanText(item.body, 900));
  const composed = await naturalize(env, { stage, fallback: aiFallback, facts: aiFacts, recentMessages: recentOutbound });
  if (composed.action === "skip") {
    await markStage(store, reservation, booking, thread, stage, now, { communicated: [...stageConcepts(stage), "semantic_duplicate_suppressed"] });
    return { ok: true, skipped: true, stage, threadId: thread.id };
  }
  let outboundMessage = composed.message;
  if (protectedStage) {
    const hasPagePlaceholder = outboundMessage.includes("[[GUEST_PAGE_URL]]");
    const hasCodePlaceholder = !facts.confirmationCode || outboundMessage.includes("[[CONFIRMATION_CODE]]");
    if (!hasPagePlaceholder || !hasCodePlaceholder) {
      outboundMessage = fallback;
    } else {
      outboundMessage = outboundMessage.replaceAll("[[GUEST_PAGE_URL]]", facts.guestPageUrl);
      if (facts.confirmationCode) outboundMessage = outboundMessage.replaceAll("[[CONFIRMATION_CODE]]", facts.confirmationCode);
    }
  }
  await sendBeds24GuestText(env, store, String(booking.id), outboundMessage);
  await store.recordMessagingMessage({
    id: `msg_${crypto.randomUUID()}`,
    threadId: thread.id,
    providerMessageId: "",
    direction: "outbound",
    sender: "ai",
    body: outboundMessage,
    automated: true,
    deliveryStatus: "submitted",
    metadata: { source: "guest_lifecycle", stage, composition: composed.source },
    createdAt: now.toISOString()
  });
  await markStage(store, reservation, booking, thread, stage, now);
  return { ok: true, sent: true, stage, threadId: thread.id, composition: composed.source };
}

function bookingDue(reservation, now, delayMinutes, activationAt = null) {
  if (reservation.bookingSentAt) return false;
  const created = new Date(reservation.createdAt || 0).getTime();
  if (!Number.isFinite(created) || created <= 0) return false;
  const activation = activationAt instanceof Date ? activationAt.getTime() : 0;
  if (activation > 0 && created < activation) return false;
  return now.getTime() >= created + delayMinutes * 60_000;
}

export function lifecycleStageForReservation(reservation, now = new Date(), delayMinutes = DEFAULT_DELAY_MINUTES, activationAt = null) {
  const clock = bangkokClock(now);
  if (bookingDue(reservation, now, delayMinutes, activationAt)) {
    const days = dayDiff(clock.date, reservation.checkInDate);
    if (days <= 0) return clock.minutes >= 14 * 60 ? "same_day_late" : "same_day";
    if (days <= 2) return "booking_prearrival";
    return "booking";
  }
  if (!reservation.prearrivalSentAt && clock.date >= shift(reservation.checkInDate, -2) && clock.date < reservation.checkInDate && clock.minutes >= 8 * 60 + 1) return "prearrival";
  if (!reservation.checkinSentAt && clock.date === reservation.checkInDate && clock.minutes >= 8 * 60 + 1) return "checkin";
  if (!reservation.departurePromptSentAt && clock.date === shift(reservation.checkOutDate, -1) && clock.minutes >= 17 * 60) return "departure_prompt";
  if (!reservation.checkoutSentAt && clock.date === reservation.checkOutDate && clock.minutes >= 8 * 60 + 1) return "checkout";
  return "";
}

async function lifecycleActivationAt(store, now) {
  const current = await store.getMessagingProviderState?.(LIFECYCLE_RUNTIME_STATE_KEY).catch(() => null);
  const existing = new Date(current?.value?.activatedAt || "");
  if (Number.isFinite(existing.getTime())) return existing;
  const activatedAt = new Date(now.getTime());
  await store.setMessagingProviderState?.(LIFECYCLE_RUNTIME_STATE_KEY, {
    activatedAt: activatedAt.toISOString(),
    purpose: "Suppress lifecycle messages that may already have been sent by legacy Airbnb Scheduled Quick Replies before Taoedge became the sender."
  }).catch(() => null);
  return activatedAt;
}

function legacyBaselinePatch(reservation, now, activationAt) {
  const created = new Date(reservation.createdAt || 0);
  if (!Number.isFinite(created.getTime()) || created.getTime() >= activationAt.getTime() || reservation.bookingSentAt) return null;
  const clock = bangkokClock(now);
  const patch = {
    reservationId: reservation.id,
    bookingSentAt: activationAt.toISOString(),
    communicated: ["legacy_quick_reply_cutover", "booking_stage_suppressed"],
    updatedAt: activationAt.toISOString()
  };
  const prearrivalDate = shift(reservation.checkInDate, -2);
  const prearrivalWasDue = clock.date > prearrivalDate || (clock.date === prearrivalDate && clock.minutes >= 8 * 60 + 1);
  if (prearrivalWasDue && clock.date <= reservation.checkInDate) {
    patch.prearrivalSentAt = activationAt.toISOString();
    patch.communicated.push("prearrival_stage_suppressed");
  }
  const checkinWasDue = clock.date > reservation.checkInDate || (clock.date === reservation.checkInDate && clock.minutes >= 8 * 60 + 1);
  if (checkinWasDue) {
    patch.checkinSentAt = activationAt.toISOString();
    patch.communicated.push("checkin_stage_suppressed");
  }
  const checkoutWasDue = clock.date > reservation.checkOutDate || (clock.date === reservation.checkOutDate && clock.minutes >= 8 * 60 + 1);
  if (checkoutWasDue) {
    patch.checkoutSentAt = activationAt.toISOString();
    patch.communicated.push("checkout_stage_suppressed");
  }
  return patch;
}

export async function processGuestLifecycleMessaging(env, now = new Date()) {
  const configuration = guestLifecycleMessagingConfiguration(env);
  if (!configuration.enabled) return { ok: true, ignored: "lifecycle_messaging_disabled", configuration };
  const store = getStore(env);
  if (!store?.listGuestLifecycleReservations || !store?.upsertGuestLifecycleState) return { ok: false, error: "lifecycle_store_unavailable", configuration };
  const reservations = await store.listGuestLifecycleReservations();
  const activationAt = await lifecycleActivationAt(store, now);
  const cache = new Map();
  const results = [];
  for (const reservation of reservations) {
    const provider = cleanText(reservation.provider, 40).toLowerCase();
    if (!["airbnb", "booking.com", "booking", "expedia", "vrbo"].includes(provider)) continue;
    const baseline = legacyBaselinePatch(reservation, now, activationAt);
    if (baseline) {
      await store.upsertGuestLifecycleState(baseline);
      Object.assign(reservation, baseline);
      results.push({ reservationId: reservation.id, ok: true, skipped: true, stage: "cutover_baseline" });
    }
    const stage = lifecycleStageForReservation(reservation, now, configuration.firstMessageDelayMinutes, activationAt);
    if (!stage) continue;
    try {
      const booking = await resolveProviderBooking(env, store, reservation, cache);
      if (!booking) {
        results.push({ reservationId: reservation.id, stage, ok: false, error: "provider_booking_not_resolved" });
        continue;
      }
      const channel = cleanText(booking?.channel, 40).toLowerCase();
      if (!SUPPORTED_CHANNELS.has(channel)) {
        results.push({ reservationId: reservation.id, stage, ok: false, error: "provider_messaging_not_supported" });
        continue;
      }
      results.push({ reservationId: reservation.id, ...(await sendStage(env, store, reservation, booking, stage, now)) });
    } catch (error) {
      results.push({ reservationId: reservation.id, stage, ok: false, error: cleanText(error?.code || error?.message || "lifecycle_send_failed", 120) });
      await sendMobilePush(env, {
        tenantId: HOUSE_TENANT_ID,
        audience: "management",
        title: `Guest message needs attention · Room ${reservation.room}`,
        body: `Taoedge could not send the ${stage.replace(/_/g, " ")} lifecycle message automatically.`,
        data: { route: "/inbox", reservationId: reservation.id, room: reservation.room, eventType: "lifecycle_send_failed" }
      }).catch(() => null);
    }
  }
  return {
    ok: results.every((item) => item.ok !== false),
    processed: results.length,
    sent: results.filter((item) => item.sent).length,
    skipped: results.filter((item) => item.skipped).length,
    failures: results.filter((item) => item.ok === false).length,
    results,
    activationAt: activationAt.toISOString(),
    configuration
  };
}
