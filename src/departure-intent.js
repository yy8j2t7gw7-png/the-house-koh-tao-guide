import { sendMobilePush } from "./mobile-push.js";

function cleanText(value, maximum = 500) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, maximum);
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
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseClock(text) {
  const value = cleanText(text, 500).toLowerCase();
  const patterns = [
    /\b(?:leave|leaving|depart|departing|checkout|check out|ferry|boat|go|going)(?:\s+(?:at|around|about|by))?\s*(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)?\b/i,
    /\b(?:at|around|about|by)\s*(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i,
    /\b(\d{1,2}):([0-5]\d)\s*(a\.?m\.?|p\.?m\.?)?\b/i
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (!match) continue;
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridiem = String(match[3] || "").replace(/\./g, "").toLowerCase();
    if (meridiem) {
      if (hour < 1 || hour > 12) continue;
      if (meridiem === "pm" && hour !== 12) hour += 12;
      if (meridiem === "am" && hour === 12) hour = 0;
    } else if (hour <= 3) {
      // In a checkout/departure context, a bare 1/2/3 normally means PM.
      hour += 12;
    }
    if (hour < 4 || hour > 15) continue;
    const minutes = hour * 60 + minute;
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const suffix = hour >= 12 ? "PM" : "AM";
    return { minutes, label: `${hour12}:${String(minute).padStart(2, "0")} ${suffix}` };
  }
  return null;
}

function extensionSignal(text) {
  const value = cleanText(text, 500).toLowerCase();
  if (/\b(?:don'?t|do not|no|not)\s+(?:want|need|plan)(?:\s+to)?\s+(?:extend|stay longer)|\bno\s+(?:extension|extend)\b/.test(value)) return "no";
  if (/\b(?:extend|extension|stay longer|another night|another day|extra night|extra day|stay one more)\b/.test(value)) return "interested";
  return "";
}

export async function captureDepartureIntent({ env, store, reservationId, text, now = new Date() }) {
  if (!store?.getGuestLifecycleState || !store?.getStayReservationById || !store?.upsertGuestLifecycleState) return { captured: false };
  const reservation = await store.getStayReservationById(reservationId);
  if (!reservation || reservation.status !== "confirmed") return { captured: false };
  const today = bangkokDateOnly(now);
  if (![today, shiftedDateOnly(today, 1)].includes(reservation.checkOutDate)) return { captured: false };
  const state = await store.getGuestLifecycleState(reservationId);
  if (!state?.departurePromptSentAt) return { captured: false };

  const clock = parseClock(text);
  const extensionInterest = extensionSignal(text);
  if (!clock && !extensionInterest) return { captured: false };
  const update = { reservationId, updatedAt: now.toISOString() };
  if (clock) {
    update.plannedDepartureMinutes = clock.minutes;
    update.plannedDepartureTime = clock.label;
    update.communicated = ["planned_departure_received"];
  }
  if (extensionInterest) {
    update.extensionInterest = extensionInterest;
    update.communicated = [ ...(update.communicated || []), "extension_interest_received" ];
  }
  await store.upsertGuestLifecycleState(update);

  const details = [];
  if (clock) details.push(`plans to leave around ${clock.label}`);
  if (extensionInterest === "interested") details.push("asked about extending the stay");
  if (details.length) {
    await sendMobilePush(env, {
      audience: "management",
      title: `Departure plan · Room ${reservation.room}`,
      body: `${reservation.guestFirstName || "Guest"} ${details.join(" and ")}.`,
      data: { route: "/operations", reservationId, room: reservation.room, eventType: extensionInterest === "interested" ? "extension_interest" : "planned_departure" }
    }).catch(() => null);
  }
  return { captured: true, plannedDepartureTime: clock?.label || "", extensionInterest };
}
