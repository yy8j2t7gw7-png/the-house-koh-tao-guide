import { normalizeText, sanitizeQuestion } from "./concierge-core.js";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";
const BOOKING_REQUEST_WORDS = /(?:^\s*(?:please\s+)?(?:book|reserve|arrange)\s+|\b(?:please\s+(?:book|reserve|arrange)|can\s+you\s+(?:book|reserve|arrange)|could\s+you\s+(?:book|reserve|arrange)|help\s+me\s+(?:book|reserve|arrange)|i\s+(?:want|need|would\s+like)\s+(?:you\s+)?(?:to\s+)?(?:book|reserve|arrange)|book\s+(?:me|us)|make\s+(?:a\s+)?reservation)\b)/i;
const STAY_SUPPORT_REQUEST_WORDS = /\b(?:please\s+(?:bring|send|provide|clean|replace|change|fix|repair|help)|can\s+(?:i|we)\s+(?:have|get)\s+(?:new\s+|fresh\s+|clean\s+)?(?:toilet\s+paper|soap|towels?)|can\s+you\s+(?:bring|send|provide|clean|replace|change|fix|repair|help)|could\s+you\s+(?:bring|send|provide|clean|replace|change|fix|repair|help)|i\s+(?:need|want|would\s+like)\s+(?:some\s+|new\s+|fresh\s+|clean\s+)?(?:toilet\s+paper|soap|towels?|cleaning|housekeeping|help)|(?:bring|send|provide)\s+(?:me\s+)?(?:some\s+|new\s+|fresh\s+|clean\s+)?(?:toilet\s+paper|soap|towels?)|clean\s+(?:my|our|the)\s+room)\b/i;
const ACTIONABLE_ROOM_DEFECT = /\b(?:broken|not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|leaking|overflowing|blocked|clogged|no\s+(?:water|hot\s+water|electricity|power|wifi)|air\s*con(?:ditioning)?\s+(?:problem|broken|not\s+working))\b/i;

function bangkokParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TIME_ZONE,
    weekday: "long",
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

export function housekeepingAvailability(date = new Date()) {
  const parts = bangkokParts(date);
  const minutes = (Number(parts.hour) * 60) + Number(parts.minute);
  const weekday = String(parts.weekday || "");
  const openDay = weekday !== "Monday";
  const open = openDay && minutes >= (10 * 60 + 30) && minutes < (19 * 60 + 30);
  let daysUntilOpen = 0;
  if (!open) {
    if (weekday === "Monday") daysUntilOpen = 1;
    else if (minutes < (10 * 60 + 30)) daysUntilOpen = 0;
    else if (weekday === "Sunday") daysUntilOpen = 2;
    else daysUntilOpen = 1;
  }
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const base = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12));
  const nextDay = dayNames[new Date(base.getTime() + (daysUntilOpen * 86_400_000)).getUTCDay()];
  return {
    open,
    afterHours: !open,
    weekday,
    minutes,
    daysUntilOpen,
    nextDay,
    nextOpening: `${nextDay} at 10:30 AM`
  };
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
  if (/\btoday\b/.test(lower)) target = new Date(base);
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
  if (!target) {
    const numeric = lower.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
    if (numeric) {
      const year = numeric[3] ? (numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3])) : Number(today.year);
      const candidate = new Date(Date.UTC(year, Number(numeric[2]) - 1, Number(numeric[1]), 12));
      if (candidate.getUTCFullYear() === year && candidate.getUTCMonth() === Number(numeric[2]) - 1 && candidate.getUTCDate() === Number(numeric[1])) target = candidate;
    }
  }
  if (!target) {
    const named = lower.match(/\b(?:(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(\d{4}))?|(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(\d{4}))?)\b/);
    if (named) {
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const day = Number(named[1] || named[5]);
      const monthText = String(named[2] || named[4]).slice(0, 3);
      const year = Number(named[3] || named[6] || today.year);
      const month = monthNames.indexOf(monthText);
      const candidate = new Date(Date.UTC(year, month, day, 12));
      if (month >= 0 && candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month && candidate.getUTCDate() === day) target = candidate;
    }
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
    // A lost-key staff notification may state that the replacement fee was
    // accepted only when the current protected request carries explicit proof.
    // Ordinary Concierge wording can never satisfy this boundary.
    if (!result.confirmedLostKeyFee) return null;
    return {
      ...base,
      alertType: "lost_key",
      severity: "urgent",
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

  if (result.handoff === "stay_support" && (result.housekeepingRequest || result.propertyIssueRequest || staySupportNeedsAttention(question))) {
    return {
      ...base,
      alertType: "stay_support",
      severity: "attention",
      recipientGroup: "support_with_owners",
      escalationRequired: false
    };
  }

  if (result.handoff === "booking" && (result.bookingRequest || bookingNeedsAttention(question, result.intentId))) {
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
