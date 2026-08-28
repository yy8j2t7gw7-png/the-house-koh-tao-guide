import {
  classifyConciergeAlert,
  formatBangkokAlertTime,
  safeAlertSummary
} from "./alert-policy.js";
import { normalizeBangkokRequestedDate } from "./alert-policy.js";

const DEFAULT_GRAPH_VERSION = "v23.0";
const DEFAULT_TEMPLATE_LANGUAGE = "en_US";
const DEFAULT_ESCALATION_MINUTES = 10;
const MAX_RECIPIENTS_PER_GROUP = 12;
const TEMPLATE_DEFAULTS = Object.freeze({
  service: "house_service_alert_v3",
  booking: "house_booking_alert_v2",
  luggage: "house_luggage_alert_v2",
  urgent: "house_urgent_alert_v2",
  lostKey: "house_lost_key_alert_v3",
  status: "house_alert_status_v1"
});

const TEMPLATE_SCHEMAS = Object.freeze({
  // These current templates are approved in Meta as generic English. Meta
  // treats `en` and `en_US` as different translations and returns 132001
  // when the requested translation is not attached to the template.
  house_service_alert_v3: Object.freeze({ kind: "service", languageCode: "en", bodyParameterCount: 5 }),
  house_luggage_alert_v2: Object.freeze({ kind: "luggage", languageCode: "en", bodyParameterCount: 6 }),
  house_booking_alert_v2: Object.freeze({ kind: "booking", languageCode: "en", bodyParameterCount: 6 }),
  house_urgent_alert_v2: Object.freeze({ kind: "urgent", languageCode: "en", bodyParameterCount: 5 }),
  house_lost_key_alert_v3: Object.freeze({ kind: "lostKey", languageCode: "en", bodyParameterCount: 3 }),
  house_alert_status_v1: Object.freeze({ kind: "status", languageCode: "en", bodyParameterCount: 5 }),
  // Kept only as a deliberate rollback path. These are the legacy payload
  // layouts shipped before the replacement templates became active.
  house_service_alert_v1: Object.freeze({ kind: "service", languageCode: "en_US", bodyParameterCount: 5 }),
  house_luggage_alert_v1: Object.freeze({ kind: "luggage", languageCode: "en_US", bodyParameterCount: 6 }),
  house_booking_alert_v1: Object.freeze({ kind: "booking", languageCode: "en_US", bodyParameterCount: 6 }),
  house_urgent_alert_v1: Object.freeze({ kind: "urgent", languageCode: "en_US", bodyParameterCount: 5 }),
  house_lost_key_alert_v1: Object.freeze({ kind: "lostKey", languageCode: "en_US", bodyParameterCount: 3 })
});

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function cleanLabel(value) {
  return String(value || "Team member").trim().slice(0, 80) || "Team member";
}

function privateReplyContact(value) {
  const source = String(value || "").trim();
  const number = digits(source);
  if (number.length < 8 || number.length > 15) return "";
  return source.startsWith("+") ? `+${number}` : number;
}

function validatedLuggageSubmission(result) {
  const request = result?.luggageRequest;
  const context = request?.context === "Arrival" || request?.context === "Departure"
    ? request.context
    : "";
  const requestedTime = String(request?.requestedTime || "").trim().slice(0, 80);
  const bagCount = Number(String(request?.bagCount || "").trim());
  const sourceContact = String(result?.privateReplyContact || "").trim();
  const contact = /^(?:\+|00)/.test(sourceContact) ? privateReplyContact(sourceContact) : "";
  if (!context || !requestedTime || !Number.isInteger(bagCount) || bagCount < 1 || bagCount > 99 || !contact) {
    return null;
  }
  return { context, requestedTime, bagCount: String(bagCount), contact };
}

function validatedBookingSubmission(result) {
  const sourceContact = String(result?.privateReplyContact || "").trim();
  const contact = /^(?:\+|00)/.test(sourceContact) ? privateReplyContact(sourceContact) : "";
  if (!contact) return null;
  const request = result?.bookingRequest;
  if (!request) return { contact, request: null };
  if (request.kind !== "diving") return null;
  const preferredDate = String(request.preferredDate || "").trim().slice(0, 120);
  const guestCount = Number(String(request.guestCount || "").trim());
  const activity = String(request.activity || "").trim().slice(0, 80);
  const option = String(request.option || "").trim().slice(0, 120);
  const courseName = String(request.courseName || "").trim().slice(0, 120);
  const certificationLevel = String(request.certificationLevel || "").trim().slice(0, 120);
  const validOption = ["Fun Diving", "Open Water Course", "Advanced Open Water Course", "Other course"].includes(option);
  if (!preferredDate || !activity || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 99 || !validOption) return null;
  if (option === "Fun Diving" && !certificationLevel) return null;
  if (option === "Other course" && !courseName) return null;
  return {
    contact,
    request: {
      kind: "diving",
      preferredDate,
      guestCount: String(guestCount),
      activity,
      option,
      courseName,
      certificationLevel,
      notes: String(request.notes || "").trim().slice(0, 500)
    }
  };
}

function parseRecipients(env) {
  let source;
  try {
    source = JSON.parse(String(env.WHATSAPP_ALERT_RECIPIENTS || "{}"));
  } catch (_error) {
    return { support: [], booking: [], urgent: [], emergency: [], escalation: [] };
  }
  const result = {};
  for (const group of ["support", "booking", "urgent", "emergency", "escalation"]) {
    const seen = new Set();
    result[group] = (Array.isArray(source[group]) ? source[group] : [])
      .map((recipient) => ({
        label: cleanLabel(recipient?.label || recipient?.name),
        phone: digits(recipient?.phone)
      }))
      .filter((recipient) => recipient.phone.length >= 8 && recipient.phone.length <= 15 && !seen.has(recipient.phone) && seen.add(recipient.phone))
      .slice(0, MAX_RECIPIENTS_PER_GROUP);
  }
  const union = (...groups) => {
    const seen = new Set();
    return groups.flatMap((group) => result[group] || [])
      .filter((recipient) => !seen.has(recipient.phone) && seen.add(recipient.phone))
      .slice(0, MAX_RECIPIENTS_PER_GROUP);
  };
  // Existing production secrets remain valid. Owners are represented by the
  // emergency group, Su by support, and Fah by booking.
  result.support_with_owners = union("support", "emergency");
  result.booking_with_owners = union("booking", "emergency");
  result.lost_key_team = union("urgent", "support", "emergency");
  result.urgent_response = union("emergency", "booking");
  if (!result.escalation.length) result.escalation = union("emergency");
  return result;
}

export function houseEmergencyContact(env) {
  const owners = parseRecipients(env).emergency || [];
  const target = owners.find((item) => /(?:owner\s*2|west)/i.test(item.label)) || owners[1] || owners[0];
  return target ? { label: "The House Emergency Support", phoneTel: `+${target.phone}` } : null;
}

export function whatsappAlertConfiguration(env) {
  const recipients = parseRecipients(env);
  const groupCounts = Object.fromEntries(Object.entries(recipients).map(([group, values]) => [group, values.length]));
  const names = templateNames(env);
  return {
    configured: Boolean(
      env.WHATSAPP_ACCESS_TOKEN &&
      digits(env.WHATSAPP_PHONE_NUMBER_ID) &&
      env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
      env.META_APP_SECRET &&
      Object.values(groupCounts).some((count) => count > 0)
    ),
    templateNames: names,
    templateLanguages: Object.fromEntries(Object.entries(names).map(([kind, name]) => [kind, TEMPLATE_SCHEMAS[name]?.languageCode || DEFAULT_TEMPLATE_LANGUAGE])),
    templateLanguage: String(env.WHATSAPP_ALERT_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE),
    groupCounts,
    escalationMinutes: Math.min(60, Math.max(2, Number(env.WHATSAPP_ALERT_ESCALATION_MINUTES) || DEFAULT_ESCALATION_MINUTES))
  };
}

function templateNames(env) {
  return {
    service: String(env.WHATSAPP_SERVICE_TEMPLATE_NAME || TEMPLATE_DEFAULTS.service).trim(),
    booking: String(env.WHATSAPP_BOOKING_TEMPLATE_NAME || TEMPLATE_DEFAULTS.booking).trim(),
    luggage: String(env.WHATSAPP_LUGGAGE_TEMPLATE_NAME || TEMPLATE_DEFAULTS.luggage).trim(),
    urgent: String(env.WHATSAPP_URGENT_TEMPLATE_NAME || TEMPLATE_DEFAULTS.urgent).trim(),
    lostKey: String(env.WHATSAPP_LOST_KEY_TEMPLATE_NAME || TEMPLATE_DEFAULTS.lostKey).trim(),
    status: String(env.WHATSAPP_STATUS_TEMPLATE_NAME || TEMPLATE_DEFAULTS.status).trim()
  };
}

function getStore(env) {
  if (!env.CONCIERGE_STORE?.getByName) return null;
  return env.CONCIERGE_STORE.getByName("the-house-concierge-global");
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function recipientHash(phone, env) {
  return sha256(`${env.CONCIERGE_HASH_SALT || env.META_APP_SECRET || "the-house-alert"}:${digits(phone)}`);
}

function roomLabel(alert) {
  if (!alert.room) return "Room not selected";
  return `Room ${alert.room}`;
}

function firstMatch(value, pattern, fallback) {
  const match = String(value || "").match(pattern);
  return String(match?.[1] || fallback).trim().slice(0, 120);
}

function textParameters(values) {
  return values.map((value) => ({ type: "text", text: String(value || "Not provided").slice(0, 900) }));
}

function appendProtectedContact(value, contact) {
  const detail = String(value || "Guest requested assistance.").trim().slice(0, 780);
  const protectedContact = privateReplyContact(contact);
  return protectedContact ? `${detail}\nGuest reply: ${protectedContact}`.slice(0, 900) : detail;
}

function requestLabel(alert) {
  const summary = String(alert.summary || "");
  const labels = {
    maintenance_broken_light: "Broken light",
    maintenance_wifi_problem: "Wi-Fi problem",
    property_emergency: "Serious property incident",
    medical_emergency: "Medical or personal-safety concern",
    verified_spare_key_release: "Verified spare-key request",
    lost_key: "Lost key"
  };
  if (alert.alertType === "stay_support") {
    if (/\b(?:fresh\s+|clean\s+|new\s+)?towels?\b/i.test(summary)) return "Fresh towels";
    if (/\btoilet\s+paper\b/i.test(summary)) return "Toilet paper";
    if (/\bsoap\b/i.test(summary)) return "Soap";
    if (/\b(?:clean|cleaning|housekeeping)\b/i.test(summary)) return "Room cleaning";
    return "Guest request";
  }
  return labels[alert.alertType] || String(alert.alertType || "guest request")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function alertTemplateKind(alert) {
  if (alert.alertType === "verified_spare_key_release" || alert.alertType === "lost_key") return "lostKey";
  if (alert.alertType === "luggage_storage") return "luggage";
  if (alert.alertType === "booking_request") return "booking";
  if (alert.severity === "critical" || alert.severity === "urgent") return "urgent";
  return "service";
}

function templateValues(alert, kind) {
  const summary = safeAlertSummary(alert.summary || "Guest requested assistance.").slice(0, 900);
  const room = roomLabel(alert);
  const time = alert.bangkokTime || formatBangkokAlertTime(new Date(alert.createdAt));
  const reference = alert.id;
  if (kind === "lostKey") return [reference, room, time];
  if (kind === "luggage") {
    const luggage = alert.luggageRequest || {};
    return [reference, room, luggage.context, luggage.bagCount, luggage.requestedTime, appendProtectedContact(summary, alert.privateReplyContact)];
  }
  if (kind === "booking") {
    if (alert.bookingRequest?.kind === "diving") {
      const booking = alert.bookingRequest;
      const detail = booking.option === "Other course" ? booking.courseName : booking.option;
      const qualification = booking.certificationLevel ? `Certification: ${booking.certificationLevel}` : "";
      const notes = [detail, qualification, booking.notes, summary].filter(Boolean).join(" · ");
      return [reference, room, booking.activity, booking.preferredDate, booking.guestCount, appendProtectedContact(notes, alert.privateReplyContact)];
    }
    const preferredTime = alert.requestedDateTime || normalizeBangkokRequestedDate(summary, new Date(alert.createdAt));
    const guests = firstMatch(summary, /\b(\d{1,2})\s*(?:guests?|people|persons?|adults?)\b/i, "Not provided");
    return [reference, room, summary, preferredTime, guests, appendProtectedContact(summary, alert.privateReplyContact)];
  }
  if (kind === "urgent") return [reference, room, requestLabel(alert), time, appendProtectedContact(summary, alert.privateReplyContact)];
  return [reference, room, requestLabel(alert), time, appendProtectedContact(summary, alert.privateReplyContact)];
}

export function validateWhatsAppTemplateParameters(name, kind, parameters) {
  const schema = TEMPLATE_SCHEMAS[String(name || "").trim()];
  if (!schema || schema.kind !== kind) return { ok: false, name, errorCode: "unmapped_template" };
  if (!Array.isArray(parameters) || parameters.length !== schema.bodyParameterCount) {
    return { ok: false, name, errorCode: "parameter_count_mismatch" };
  }
  return { ok: true, name: String(name).trim(), kind, languageCode: schema.languageCode, parameters };
}

function selectedTemplateForAlert(alert, env) {
  const names = templateNames(env);
  const kind = alertTemplateKind(alert);
  const name = names[kind];
  const parameters = templateValues(alert, kind);
  return validateWhatsAppTemplateParameters(name, kind, parameters);
}

export function buildWhatsAppTemplatePayload(alert, recipient, env) {
  const selected = selectedTemplateForAlert(alert, env);
  if (!selected.ok) return selected;
  return { ok: true, name: selected.name, bodyParameterCount: selected.parameters.length, payload: {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient.phone,
    type: "template",
    template: {
      name: selected.name,
      language: { code: selected.languageCode },
      components: [{
        type: "body",
        parameters: textParameters(selected.parameters)
      }]
    }
  } };
}

function templateComponentSchema(built) {
  const components = built?.payload?.template?.components;
  if (!Array.isArray(components) || !components.length) return "none";
  return components.map((component) => {
    const parameters = Array.isArray(component?.parameters) ? component.parameters : [];
    const orderedTypes = parameters.map((parameter, index) => `${index + 1}:${String(parameter?.type || "unknown")}`);
    return `${String(component?.type || "unknown")}(${parameters.length})[${orderedTypes.join(",")}]`;
  }).join(";");
}

function parameterValues(built) {
  const components = built?.payload?.template?.components;
  if (!Array.isArray(components)) return [];
  return components.flatMap((component) => Array.isArray(component?.parameters) ? component.parameters : [])
    .map((parameter) => String(parameter?.text || "").trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
}

function safeProviderText(value, built) {
  let text = String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/(?:\+|00)?\d(?:[\s().-]*\d){7,14}/g, "[private number]")
    .trim();
  const candidates = parameterValues(built).flatMap((parameter) => [
    parameter.replace(/(?:\+|00)?\d(?:[\s().-]*\d){7,14}/g, "[private number]"),
    ...parameter.split(/\[[^\]]+\]/g).map((part) => part.trim())
  ]).filter((parameter) => parameter.length >= 3).sort((left, right) => right.length - left.length);
  for (const parameter of candidates) text = text.split(parameter).join("[parameter]");
  return text
    .replace(/(?:EA[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]+)/gi, "[credential]")
    .slice(0, 600);
}

function failureKind(httpStatus, errorCode, localCode = "") {
  const code = String(errorCode || localCode || "");
  if (localCode === "missing_configuration") return "configuration";
  if (["unmapped_template", "parameter_count_mismatch", "status_template_not_configured", "invalid_status"].includes(localCode)) return "local_template_schema";
  if (code === "190" || httpStatus === 401 || httpStatus === 403) return "authentication_or_permission";
  if (code === "132001") return "template_or_language";
  if (["131008", "132000", "132012"].includes(code)) return "template_parameters";
  if (code === "131026") return "recipient_delivery";
  if (["4", "80007", "130429", "131048"].includes(code) || httpStatus === 429) return "rate_limit";
  if (httpStatus >= 500) return "meta_service";
  if (localCode === "network_error") return "network";
  return "unknown";
}

export function buildWhatsAppFailureDiagnostic({ built, response, responseBody, localCode = "", networkError } = {}) {
  const providerError = responseBody?.error || {};
  const httpStatus = Number(response?.status) || 0;
  const errorCode = String(providerError.code || localCode || (response?.ok ? "missing_message_id" : httpStatus || "unknown"));
  const languageCode = String(built?.payload?.template?.language?.code || "").slice(0, 30);
  return {
    templateName: String(built?.payload?.template?.name || built?.name || "").slice(0, 160),
    languageCode,
    componentSchema: templateComponentSchema(built),
    httpStatus,
    errorCode: errorCode.slice(0, 80),
    errorSubcode: String(providerError.error_subcode || "").slice(0, 80),
    errorType: safeProviderText(providerError.type || networkError?.name || "", built).slice(0, 120),
    errorMessage: safeProviderText(providerError.message || networkError?.message || "", built),
    errorDetails: safeProviderText(
      providerError.error_data?.details || providerError.error_user_msg || providerError.error_user_title || "",
      built
    ),
    traceId: String(providerError.fbtrace_id || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 180),
    failureKind: failureKind(httpStatus, errorCode, localCode)
  };
}

async function recordWhatsAppFailure(store, deliveryId, alert, stage, diagnostic, createdAt) {
  const safeRecord = {
    id: `diagnostic_${crypto.randomUUID()}`,
    deliveryId,
    alertId: alert.id,
    stage,
    ...diagnostic,
    createdAt
  };
  if (store.recordWhatsAppDiagnostic) await store.recordWhatsAppDiagnostic(safeRecord).catch(() => {});
  try {
    console.error("whatsapp_template_delivery_failed", JSON.stringify(safeRecord));
  } catch (_error) {
    // Diagnostics must never alter the fail-closed delivery outcome.
  }
}

async function submitBuiltTemplate(built, env) {
  const graphVersion = String(env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION).replace(/[^A-Za-z0-9.]/g, "");
  const phoneNumberId = digits(env.WHATSAPP_PHONE_NUMBER_ID);
  try {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(built.payload)
    });
    const responseBody = await response.json().catch(() => ({}));
    const providerMessageId = String(responseBody?.messages?.[0]?.id || "").slice(0, 180);
    const submitted = response.ok && Boolean(providerMessageId);
    return {
      submitted,
      providerMessageId,
      errorCode: submitted ? "" : String(responseBody?.error?.code || (response.ok ? "missing_message_id" : response.status)),
      diagnostic: submitted ? null : buildWhatsAppFailureDiagnostic({ built, response, responseBody })
    };
  } catch (networkError) {
    return {
      submitted: false,
      providerMessageId: "",
      errorCode: "network_error",
      diagnostic: buildWhatsAppFailureDiagnostic({ built, localCode: "network_error", networkError })
    };
  }
}

async function sendTemplate(alert, recipient, stage, env, store) {
  const deliveryId = `delivery_${crypto.randomUUID()}`;
  const hashedRecipient = await recipientHash(recipient.phone, env);
  const built = buildWhatsAppTemplatePayload(alert, recipient, env);
  if (!built.ok) {
    const createdAt = new Date().toISOString();
    await store.recordAlertDelivery({
      id: deliveryId,
      alertId: alert.id,
      stage,
      recipientHash: hashedRecipient,
      recipientLabel: recipient.label,
      providerMessageId: "",
      status: "failed",
      errorCode: built.errorCode,
      createdAt
    });
    await recordWhatsAppFailure(
      store,
      deliveryId,
      alert,
      stage,
      buildWhatsAppFailureDiagnostic({ built, localCode: built.errorCode }),
      createdAt
    );
    return false;
  }
  const outcome = await submitBuiltTemplate(built, env);
  const createdAt = new Date().toISOString();
  await store.recordAlertDelivery({
    id: deliveryId,
    alertId: alert.id,
    stage,
    recipientHash: hashedRecipient,
    recipientLabel: recipient.label,
    providerMessageId: outcome.providerMessageId,
    status: outcome.submitted ? "accepted" : "failed",
    errorCode: outcome.errorCode,
    createdAt
  });
  if (!outcome.submitted) await recordWhatsAppFailure(store, deliveryId, alert, stage, outcome.diagnostic, createdAt);
  return outcome.submitted;
}

async function sendToGroup(alert, group, stage, env, store) {
  const recipients = parseRecipients(env)[group] || [];
  if (!recipients.length || !env.WHATSAPP_ACCESS_TOKEN || !digits(env.WHATSAPP_PHONE_NUMBER_ID)) {
    const deliveryId = `delivery_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    await store.recordAlertDelivery({
      id: deliveryId,
      alertId: alert.id,
      stage,
      recipientHash: "",
      recipientLabel: group,
      providerMessageId: "",
      status: "not_configured",
      errorCode: "missing_configuration",
      createdAt
    });
    const built = buildWhatsAppTemplatePayload(alert, { phone: "" }, env);
    await recordWhatsAppFailure(
      store,
      deliveryId,
      alert,
      stage,
      buildWhatsAppFailureDiagnostic({ built, localCode: "missing_configuration" }),
      createdAt
    );
    return { attempted: 0, accepted: 0 };
  }
  const outcomes = await Promise.all(recipients.map((recipient) => sendTemplate(alert, recipient, stage, env, store)));
  return { attempted: outcomes.length, accepted: outcomes.filter(Boolean).length };
}

export async function createConciergeAlert({ env, interactionId, sessionId, room, roomVerified = false, question, result, now = new Date() }) {
  const policy = classifyConciergeAlert({ result, question, room, now });
  const store = getStore(env);
  if (!policy || !store) return null;
  // Final submission boundary: conversational or model output can never create
  // a luggage alert unless every operational field and protected contact exists.
  const luggageRequest = policy.alertType === "luggage_storage"
    ? validatedLuggageSubmission(result)
    : null;
  if (policy.alertType === "luggage_storage" && !luggageRequest) return null;
  const bookingSubmission = policy.alertType === "booking_request"
    ? validatedBookingSubmission(result)
    : null;
  if (policy.alertType === "booking_request" && !bookingSubmission) return null;
  const config = whatsappAlertConfiguration(env);
  const dedupeKey = await sha256(`${env.CONCIERGE_HASH_SALT || env.META_APP_SECRET || "the-house-alert"}:${sessionId}:${room}:${policy.alertType}:${normalizeDedupeSummary(policy.summary)}`);
  const escalationDueAt = policy.escalationRequired
    ? new Date(now.getTime() + (config.escalationMinutes * 60_000)).toISOString()
    : "";
  const alert = {
    id: `alert_${crypto.randomUUID()}`,
    interactionId: interactionId || "",
    dedupeKey,
    severity: policy.severity,
    alertType: policy.alertType,
    recipientGroup: policy.recipientGroup,
    room: policy.room,
    roomVerified: Boolean(roomVerified),
    summary: safeAlertSummary(policy.summary),
    bangkokTime: policy.bangkokTime,
    createdAt: policy.createdAt,
    escalationDueAt
  };
  const created = await store.createAlert(alert);
  if (!created?.created) return { ...created?.alert, duplicate: true };
  return {
    ...alert,
    duplicate: false,
    configured: config.configured,
    privateReplyContact: luggageRequest?.contact || bookingSubmission?.contact || privateReplyContact(result.privateReplyContact),
    requestedDateTime: result.requestedDateTime || "",
    bookingRequest: bookingSubmission?.request || undefined,
    luggageRequest: luggageRequest ? {
      context: luggageRequest.context,
      requestedTime: luggageRequest.requestedTime,
      bagCount: luggageRequest.bagCount
    } : undefined
  };
}

export async function createProtectedOperationsAlert({
  env,
  room,
  roomVerified = true,
  alertType,
  severity,
  recipientGroup,
  summary,
  replyContact = "",
  escalationRequired = false,
  now = new Date()
}) {
  const store = getStore(env);
  if (!store) return null;
  const config = whatsappAlertConfiguration(env);
  const safeSummary = safeAlertSummary(summary);
  const dedupeKey = await sha256(
    `${env.CONCIERGE_HASH_SALT || env.META_APP_SECRET || "the-house-alert"}:protected:${room}:${alertType}:${normalizeDedupeSummary(safeSummary)}`
  );
  const escalationDueAt = escalationRequired
    ? new Date(now.getTime() + (config.escalationMinutes * 60_000)).toISOString()
    : "";
  const alert = {
    id: `alert_${crypto.randomUUID()}`,
    interactionId: "",
    dedupeKey,
    severity: String(severity || "attention"),
    alertType: String(alertType || "protected_operation"),
    recipientGroup: String(recipientGroup || "urgent"),
    room: String(room || ""),
    roomVerified: Boolean(roomVerified),
    summary: safeSummary,
    bangkokTime: formatBangkokAlertTime(now),
    createdAt: now.toISOString(),
    escalationDueAt
  };
  const created = await store.createAlert(alert);
  const ephemeralContact = privateReplyContact(replyContact);
  if (!created?.created) return { ...created?.alert, duplicate: true, privateReplyContact: ephemeralContact };
  return { ...alert, duplicate: false, configured: config.configured, privateReplyContact: ephemeralContact };
}

function normalizeDedupeSummary(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 160);
}

export async function dispatchConciergeAlert(alert, env) {
  if (!alert || alert.duplicate) return { attempted: 0, accepted: 0 };
  const store = getStore(env);
  if (!store) return { attempted: 0, accepted: 0 };
  return sendToGroup(alert, alert.recipientGroup, "initial", env, store);
}

export async function processDueAlertEscalations(env, now = new Date()) {
  const store = getStore(env);
  if (!store) return { due: 0, sent: 0 };
  const due = await store.getDueAlertEscalations(now.toISOString());
  let sent = 0;
  for (const alert of due) {
    const escalationAlert = {
      ...alert,
      alertType: `ESCALATION — ${String(alert.alertType || "urgent alert").replaceAll("_", " ")}`,
      summary: `ESCALATION: no acknowledgement received within the response window. Respond immediately. Original details: ${alert.summary}`
    };
    const outcome = await sendToGroup(escalationAlert, "escalation", "escalation", env, store);
    await store.markAlertEscalated(alert.id, now.toISOString());
    if (outcome.accepted > 0) sent += 1;
  }
  return { due: due.length, sent };
}

function parseWebhookMessages(body) {
  const values = [];
  for (const entry of body?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {};
      for (const status of value.statuses || []) values.push({ kind: "status", status });
      for (const message of value.messages || []) values.push({ kind: "message", message });
    }
  }
  return values;
}

async function validMetaSignature(rawBody, signature, appSecret) {
  if (!signature?.startsWith("sha256=") || !appSecret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = `sha256=${Array.from(new Uint8Array(signed), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  if (expected.length !== signature.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return difference === 0;
}

function recipientIsAuthorized(phone, env) {
  const target = digits(phone);
  return Object.values(parseRecipients(env)).flat().some((recipient) => recipient.phone === target);
}

export function buildWhatsAppStatusPayload(alert, recipient, status, actorLabel, env) {
  const name = String(env.WHATSAPP_STATUS_TEMPLATE_NAME || "").trim();
  if (!name) return { ok: false, name: "", errorCode: "status_template_not_configured" };
  const normalizedStatus = status === "ACKNOWLEDGED" ? status : status === "RESOLVED" ? status : "";
  if (!normalizedStatus) return { ok: false, name, errorCode: "invalid_status" };
  const parameters = [alert.id, roomLabel(alert), requestLabel(alert), cleanLabel(actorLabel), normalizedStatus];
  const validated = validateWhatsAppTemplateParameters(name, "status", parameters);
  if (!validated.ok) return validated;
  return { ok: true, name, bodyParameterCount: parameters.length, payload: {
    messaging_product: "whatsapp", recipient_type: "individual", to: recipient.phone, type: "template",
    template: { name, language: { code: validated.languageCode }, components: [{ type: "body", parameters: textParameters(parameters) }] }
  } };
}

async function notifyStatusChange(alert, actorPhone, status, env, store) {
  if (!env.WHATSAPP_STATUS_TEMPLATE_NAME) return { attempted: 0, accepted: 0 };
  const assigned = parseRecipients(env)[alert.recipientGroup] || [];
  const actor = assigned.find((item) => item.phone === digits(actorPhone));
  if (!actor) return { attempted: 0, accepted: 0 };
  const others = assigned.filter((item) => item.phone !== digits(actorPhone));
  let accepted = 0;
  for (const recipient of others) {
    const built = buildWhatsAppStatusPayload(alert, recipient, status, actor.label, env);
    const deliveryId = `delivery_${crypto.randomUUID()}`;
    const hashedRecipient = await recipientHash(recipient.phone, env);
    if (!built.ok) {
      const createdAt = new Date().toISOString();
      await store.recordAlertDelivery({
        id: deliveryId, alertId: alert.id, stage: `status_${status.toLowerCase()}`,
        recipientHash: hashedRecipient, recipientLabel: recipient.label,
        providerMessageId: "", status: "failed", errorCode: built.errorCode,
        createdAt
      });
      await recordWhatsAppFailure(
        store,
        deliveryId,
        alert,
        `status_${status.toLowerCase()}`,
        buildWhatsAppFailureDiagnostic({ built, localCode: built.errorCode }),
        createdAt
      );
      continue;
    }
    const outcome = await submitBuiltTemplate(built, env);
    const createdAt = new Date().toISOString();
    await store.recordAlertDelivery({
      id: deliveryId, alertId: alert.id, stage: `status_${status.toLowerCase()}`,
      recipientHash: hashedRecipient, recipientLabel: recipient.label,
      providerMessageId: outcome.providerMessageId,
      status: outcome.submitted ? "accepted" : "failed",
      errorCode: outcome.errorCode,
      createdAt
    });
    if (outcome.submitted) accepted += 1;
    else await recordWhatsAppFailure(
      store,
      deliveryId,
      alert,
      `status_${status.toLowerCase()}`,
      outcome.diagnostic,
      createdAt
    );
  }
  return { attempted: others.length, accepted };
}

export async function handleWhatsAppWebhook(request, env) {
  const url = new URL(request.url);
  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge") || "";
    if (mode === "subscribe" && token && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, POST" } });
  const rawBody = await request.text();
  if (!(await validMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), env.META_APP_SECRET))) {
    return new Response("Invalid signature", { status: 401 });
  }
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (_error) {
    return new Response("Invalid JSON", { status: 400 });
  }
  const store = getStore(env);
  if (!store) return new Response("OK", { status: 200 });
  for (const item of parseWebhookMessages(body)) {
    if (item.kind === "status") {
      await store.updateAlertDeliveryStatus({
        providerMessageId: String(item.status?.id || ""),
        status: String(item.status?.status || "unknown"),
        errorCode: String(item.status?.errors?.[0]?.code || ""),
        updatedAt: new Date().toISOString()
      });
      continue;
    }
    const from = digits(item.message?.from);
    const text = String(item.message?.text?.body || "").trim();
    const match = text.match(/^(RECEIVED|ACK|RESOLVE)\s+(alert_[A-Za-z0-9-]{20,})$/i);
    if (!match || !recipientIsAuthorized(from, env)) continue;
    const command = match[1].toUpperCase();
    const before = store.getAlert ? await store.getAlert(match[2]) : store.alerts?.find((alert) => alert.id === match[2]);
    if (!before) continue;
    const assignedActor = (parseRecipients(env)[before.recipientGroup] || []).find((recipient) => recipient.phone === from);
    if (!assignedActor) continue;
    const eligible = ["RECEIVED", "ACK"].includes(command) ? before.status === "open" : ["open", "acknowledged"].includes(before.status);
    if (!eligible) continue;
    const actor = await recipientHash(from, env);
    if (["RECEIVED", "ACK"].includes(command)) await store.acknowledgeAlert(match[2], actor, new Date().toISOString());
    else await store.resolveAlert(match[2], actor, new Date().toISOString());
    await notifyStatusChange(before, from, ["RECEIVED", "ACK"].includes(command) ? "ACKNOWLEDGED" : "RESOLVED", env, store);
  }
  return new Response("OK", { status: 200 });
}
