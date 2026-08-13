import { normalizeText, sanitizeQuestion } from "./concierge-core.js";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";
const BOOKING_REQUEST_WORDS = /\b(?:book|booking|reserve|reservation|arrange|availability|available|schedule)\b/i;

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

function bookingNeedsAttention(question, intentId) {
  const normalizedIntent = normalizeText(intentId).replaceAll(" ", "_");
  if (/booking|reservation|transport_request/.test(normalizedIntent)) return true;
  return BOOKING_REQUEST_WORDS.test(question);
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

  if (result.intentId === "medical_emergency") {
    return {
      ...base,
      alertType: "medical_emergency",
      severity: "critical",
      recipientGroup: "emergency",
      escalationRequired: true
    };
  }

  if (result.handoff === "property_emergency" || result.intentId === "property_emergency") {
    return {
      ...base,
      alertType: "property_emergency",
      severity: "critical",
      recipientGroup: "emergency",
      escalationRequired: true
    };
  }

  if (result.intentId === "lost_key") {
    return {
      ...base,
      alertType: "lost_key",
      severity: base.afterHours ? "urgent" : "attention",
      recipientGroup: base.afterHours ? "urgent" : "support",
      escalationRequired: base.afterHours
    };
  }

  if (result.handoff === "stay_support") {
    return {
      ...base,
      alertType: "stay_support",
      severity: "attention",
      recipientGroup: "support",
      escalationRequired: false
    };
  }

  if (result.handoff === "booking" && bookingNeedsAttention(question, result.intentId)) {
    return {
      ...base,
      alertType: "booking_request",
      severity: "attention",
      recipientGroup: "booking",
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
