const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const HOUSE_TENANT_ID = "tenant_the_house_koh_tao";

function cleanText(value, maximum = 240) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, maximum);
}

function getStore(env) {
  return env.CONCIERGE_STORE?.getByName?.("the-house-concierge-global") || null;
}

function isExpoToken(value) {
  return /^(?:Exponent|Expo)PushToken\[[^\]]+\]$/.test(String(value || ""));
}

function publicData(data = {}) {
  const allowed = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (!["route", "threadId", "reservationId", "room", "eventType", "sourceLabel", "alertId"].includes(key)) continue;
    allowed[key] = cleanText(value, 180);
  }
  return allowed;
}

export async function sendMobilePush(env, event = {}) {
  const store = getStore(env);
  if (!store?.mobileListPushDevices) return { ok: false, attempted: 0, accepted: 0, error: "push_store_unavailable" };
  const devices = await store.mobileListPushDevices(cleanText(event.tenantId, 100) || HOUSE_TENANT_ID);
  const audience = cleanText(event.audience || "operations", 30);
  const eligible = devices.filter((device) => {
    if (!isExpoToken(device.expoPushToken)) return false;
    if (audience === "management") return ["owner", "manager"].includes(device.role);
    return true;
  });
  if (!eligible.length) return { ok: true, attempted: 0, accepted: 0 };

  const title = cleanText(event.title || "Taoedge", 80) || "Taoedge";
  const body = cleanText(event.body || "New hotel activity", 220) || "New hotel activity";
  const data = publicData(event.data || {});
  const messages = eligible.map((device) => ({
    to: device.expoPushToken,
    sound: "default",
    title,
    body,
    data,
    channelId: "operations",
    priority: "high"
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(messages)
    });
    const payload = await response.json().catch(() => ({}));
    const tickets = Array.isArray(payload?.data) ? payload.data : [];
    let accepted = 0;
    for (let index = 0; index < eligible.length; index += 1) {
      const ticket = tickets[index];
      if (ticket?.status === "ok") accepted += 1;
      const detail = String(ticket?.details?.error || "");
      if (detail === "DeviceNotRegistered" && store.mobileDisablePushDeviceByToken) {
        await store.mobileDisablePushDeviceByToken(eligible[index].expoPushToken, new Date().toISOString()).catch(() => {});
      }
    }
    return { ok: response.ok, attempted: eligible.length, accepted, providerStatus: response.status };
  } catch (error) {
    return { ok: false, attempted: eligible.length, accepted: 0, error: cleanText(error?.message || "push_failed", 100) };
  }
}

export async function pushInboundOtaMessage(env, thread, text = "") {
  if (!thread?.id) return { ok: false, attempted: 0, accepted: 0 };
  const source = cleanText(thread.sourceLabel || (thread.channel === "whatsapp" ? "WhatsApp" : "OTA"), 50) || "Guest";
  const guest = cleanText(thread.guestName, 50);
  const room = cleanText(thread.room, 4);
  const label = guest ? `${source} · ${guest}` : source;
  const suffix = room ? ` · Room ${room}` : "";
  return sendMobilePush(env, {
    audience: "management",
    title: `New guest message${suffix}`,
    body: `${label}: ${cleanText(text, 130)}`,
    data: { route: `/inbox/${thread.id}`, threadId: thread.id, reservationId: thread.reservationId, room, eventType: "guest_message", sourceLabel: source }
  });
}

export async function pushOperationalAlert(env, alert) {
  if (!alert?.id) return { ok: false, attempted: 0, accepted: 0 };
  const room = cleanText(alert.room, 4);
  const title = room ? `Room ${room} · ${cleanText(alert.alertType || "Operations", 50)}` : cleanText(alert.alertType || "Operations", 60);
  return sendMobilePush(env, {
    audience: "operations",
    title,
    body: cleanText(alert.summary || "Operational attention required", 180),
    data: { route: "/operations", reservationId: alert.reservationId, room, eventType: cleanText(alert.alertType, 60), alertId: alert.id }
  });
}
