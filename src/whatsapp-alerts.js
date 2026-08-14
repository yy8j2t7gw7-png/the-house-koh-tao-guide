import {
  classifyConciergeAlert,
  formatBangkokAlertTime,
  safeAlertSummary
} from "./alert-policy.js";

const DEFAULT_GRAPH_VERSION = "v23.0";
const DEFAULT_TEMPLATE_NAME = "house_concierge_alert";
const DEFAULT_TEMPLATE_LANGUAGE = "en_US";
const DEFAULT_ESCALATION_MINUTES = 10;
const MAX_RECIPIENTS_PER_GROUP = 12;

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
  return result;
}

export function whatsappAlertConfiguration(env) {
  const recipients = parseRecipients(env);
  const groupCounts = Object.fromEntries(Object.entries(recipients).map(([group, values]) => [group, values.length]));
  return {
    configured: Boolean(
      env.WHATSAPP_ACCESS_TOKEN &&
      digits(env.WHATSAPP_PHONE_NUMBER_ID) &&
      env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
      env.META_APP_SECRET &&
      Object.values(groupCounts).some((count) => count > 0)
    ),
    templateName: String(env.WHATSAPP_ALERT_TEMPLATE_NAME || DEFAULT_TEMPLATE_NAME),
    templateLanguage: String(env.WHATSAPP_ALERT_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE),
    groupCounts,
    escalationMinutes: Math.min(60, Math.max(2, Number(env.WHATSAPP_ALERT_ESCALATION_MINUTES) || DEFAULT_ESCALATION_MINUTES))
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

function severityLabel(severity) {
  return {
    critical: "CRITICAL",
    urgent: "URGENT",
    attention: "NEEDS ATTENTION"
  }[severity] || "NOTICE";
}

function roomLabel(alert) {
  if (!alert.room) return "Room not selected";
  return alert.roomVerified ? `Room ${alert.room} (stay verified)` : `Room ${alert.room} (guest-selected)`;
}

function templatePayload(alert, recipient, env) {
  const summary = safeAlertSummary(alert.summary);
  const replyContact = privateReplyContact(alert.privateReplyContact);
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient.phone,
    type: "template",
    template: {
      name: String(env.WHATSAPP_ALERT_TEMPLATE_NAME || DEFAULT_TEMPLATE_NAME),
      language: { code: String(env.WHATSAPP_ALERT_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE) },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: severityLabel(alert.severity) },
          { type: "text", text: roomLabel(alert) },
          { type: "text", text: String(alert.alertType || "guest_request").replaceAll("_", " ") },
          { type: "text", text: alert.bangkokTime || formatBangkokAlertTime(new Date(alert.createdAt)) },
          { type: "text", text: replyContact ? `${summary} · Guest reply: ${replyContact}` : summary },
          { type: "text", text: alert.id }
        ]
      }]
    }
  };
}

async function sendTemplate(alert, recipient, stage, env, store) {
  const graphVersion = String(env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_VERSION).replace(/[^A-Za-z0-9.]/g, "");
  const phoneNumberId = digits(env.WHATSAPP_PHONE_NUMBER_ID);
  const deliveryId = `delivery_${crypto.randomUUID()}`;
  const hashedRecipient = await recipientHash(recipient.phone, env);
  try {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(templatePayload(alert, recipient, env))
    });
    const responseBody = await response.json().catch(() => ({}));
    const providerMessageId = String(responseBody?.messages?.[0]?.id || "").slice(0, 180);
    const submitted = response.ok && Boolean(providerMessageId);
    await store.recordAlertDelivery({
      id: deliveryId,
      alertId: alert.id,
      stage,
      recipientHash: hashedRecipient,
      recipientLabel: recipient.label,
      providerMessageId,
      status: submitted ? "accepted" : "failed",
      errorCode: submitted ? "" : String(responseBody?.error?.code || (response.ok ? "missing_message_id" : response.status)),
      createdAt: new Date().toISOString()
    });
    return submitted;
  } catch (_error) {
    await store.recordAlertDelivery({
      id: deliveryId,
      alertId: alert.id,
      stage,
      recipientHash: hashedRecipient,
      recipientLabel: recipient.label,
      providerMessageId: "",
      status: "failed",
      errorCode: "network_error",
      createdAt: new Date().toISOString()
    }).catch(() => {});
    return false;
  }
}

async function sendToGroup(alert, group, stage, env, store) {
  const recipients = parseRecipients(env)[group] || [];
  if (!recipients.length || !env.WHATSAPP_ACCESS_TOKEN || !digits(env.WHATSAPP_PHONE_NUMBER_ID)) {
    await store.recordAlertDelivery({
      id: `delivery_${crypto.randomUUID()}`,
      alertId: alert.id,
      stage,
      recipientHash: "",
      recipientLabel: group,
      providerMessageId: "",
      status: "not_configured",
      errorCode: "missing_configuration",
      createdAt: new Date().toISOString()
    });
    return { attempted: 0, accepted: 0 };
  }
  const outcomes = await Promise.all(recipients.map((recipient) => sendTemplate(alert, recipient, stage, env, store)));
  return { attempted: outcomes.length, accepted: outcomes.filter(Boolean).length };
}

export async function createConciergeAlert({ env, interactionId, sessionId, room, roomVerified = false, question, result, now = new Date() }) {
  const policy = classifyConciergeAlert({ result, question, room, now });
  const store = getStore(env);
  if (!policy || !store) return null;
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
  return { ...alert, duplicate: false, configured: config.configured };
}

export async function createProtectedOperationsAlert({
  env,
  room,
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
    roomVerified: true,
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
    const outcome = await sendToGroup(alert, "escalation", "escalation", env, store);
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
    const match = text.match(/^(ACK|RESOLVE)\s+(alert_[A-Za-z0-9-]{20,})$/i);
    if (!match || !recipientIsAuthorized(from, env)) continue;
    const actor = await recipientHash(from, env);
    if (match[1].toUpperCase() === "ACK") await store.acknowledgeAlert(match[2], actor, new Date().toISOString());
    else await store.resolveAlert(match[2], actor, new Date().toISOString());
  }
  return new Response("OK", { status: 200 });
}
