import { normalizeText, sanitizeQuestion } from "./concierge-core.js";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";
const BOOKING_REQUEST_WORDS = /(?:^\s*(?:please\s+)?(?:book|reserve|arrange)\s+|\b(?:please\s+(?:book|reserve|arrange)|can\s+you\s+(?:book|reserve|arrange)|could\s+you\s+(?:book|reserve|arrange)|help\s+me\s+(?:book|reserve|arrange)|i\s+(?:want|need|would\s+like)\s+(?:you\s+)?(?:to\s+)?(?:book|reserve|arrange)|book\s+(?:me|us)|make\s+(?:a\s+)?reservation)\b)/i;
const STAY_SUPPORT_REQUEST_WORDS = /\b(?:please\s+(?:bring|send|clean|replace|change|fix|repair|help)|can\s+you\s+(?:bring|send|clean|replace|change|fix|repair|help)|could\s+you\s+(?:bring|send|clean|replace|change|fix|repair|help)|i\s+(?:need|want|would\s+like)\s+(?:fresh\s+)?(?:towels?|cleaning|housekeeping|help)|(?:bring|send)\s+(?:me\s+)?(?:fresh\s+)?towels?|clean\s+(?:my|our|the)\s+room)\b/i;
const ACTIONABLE_ROOM_DEFECT = /\b(?:broken|not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|leaking|overflowing|blocked|clogged|no\s+(?:water|hot\s+water|electricity|power|wifi)|air\s*con(?:ditioning)?\s+(?:problem|broken|not\s+working))\b/i;

function bangkokParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function isAfterHours(date = new Date()) {
  const parts = bangkokParts(date);
  const minutes = (Number(parts.hour) * 60) + Number(parts.minute);
  return minutes >= (19 * 60 + 30) || minutes < (10 * 60 + 30);
}

export function formatBangkokAlertTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false
  }).format(date);
}

export function normalizeBangkokRequestedDate(value, now = new Date()) {
  const text = String(value || "");
  const lower = text.toLowerCase();
  const today = bangkokParts(now);
  const base = new Date(Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day), 12));
  let target = null;
  if (/\btomorrow\b/.test(lower)) target = new Date(base.getTime() + 86_400_000);
  const days = lower.match(/\bin\s+(\d{1,3})\s+days?\b/);
  if (days) target = new Date(base.getTime() + (Number(days[1]) * 86_400_000));
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const weekday = lower.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (weekday) {
    const desired = weekdays.indexOf(weekday[1]);
    let add = (desired - base.getUTCDay() + 7) % 7;
    if (add === 0) add = 7;
    target = new Date(base.getTime() + (add * 86_400_000));
  }
  if (!target) return "Not provided";
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(target);
  const time = lower.match(/\b(?:at|around|by)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!time) return date;
  let hour = Number(time[1]);
  const minute = Number(time[2] || 0);
  if (time[3] === "pm" && hour < 12) hour += 12;
  if (time[3] === "am" && hour === 12) hour = 0;
  const formatted = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" })
    .format(new Date(Date.UTC(2020, 0, 1, hour, minute)));
  return `${date}, ${formatted}`;
}

function bookingNeedsAttention(question, _intentId) {
  // A model label alone is never enough to create an operational alert.
  // The guest's current sentence must contain an explicit booking action.
  return BOOKING_REQUEST_WORDS.test(question);
}

function staySupportNeedsAttention(question) {
  return STAY_SUPPORT_REQUEST_WORDS.test(question) || ACTIONABLE_ROOM_DEFECT.test(question);
}

export function classifyConciergeAlert({ result, question, room, now = new Date() }) {
  if (!result?.needsHuman) return null;

  const base = {
    room: String(room || ""),
    roomVerified: false,
    summary: sanitizeQuestion(question, 320) || "Guest requested assistance.",
    intentId: String(result.intentId || "fallback").slice(0, 80),
    category: String(result.category || "fallback").slice(0, 80),
    createdAt: now.toISOString(),
    bangkokTime: formatBangkokAlertTime(now),
    afterHours: isAfterHours(now)
  };

  // Medical and critical-property alerts are confirmation-only operations.
  // They are created through createProtectedOperationsAlert after the guest
  // deliberately presses Send urgent alert, never from classification alone.
  if (result.handoff === "medical_emergency"
    || result.intentId === "medical_emergency"
    || result.intentId === "public_medical_emergency"
    || result.handoff === "property_emergency"
    || result.intentId === "property_emergency") return null;

  if (result.intentId === "lost_key") {
    if (base.afterHours && !result.confirmedLostKeyFee) return null;
    return {
      ...base,
      alertType: "lost_key",
      severity: base.afterHours ? "urgent" : "attention",
      recipientGroup: "lost_key_team",
      escalationRequired: false
    };
  }

  if (result.intentId === "luggage_storage") {
    return {
      ...base,
      alertType: "luggage_storage",
      severity: "attention",
      recipientGroup: "support_with_owners",
      escalationRequired: false
    };
  }

  if (result.handoff === "stay_support" && staySupportNeedsAttention(question)) {
    return {
      ...base,
      alertType: "stay_support",
      severity: "attention",
      recipientGroup: "support_with_owners",
      escalationRequired: false
    };
  }

  if (result.handoff === "booking" && bookingNeedsAttention(question, result.intentId)) {
    return {
      ...base,
      alertType: "booking_request",
      severity: "attention",
      recipientGroup: "booking_with_owners",
      escalationRequired: false
    };
  }

  return null;
}

export function safeAlertSummary(value) {
  const sanitized = sanitizeQuestion(value, 320);
  if (!sanitized || sanitized === "[passport information removed]") {
    return "Sensitive guest information was removed. Open the owner console for the approved operational context.";
  }
  return sanitized;
}
