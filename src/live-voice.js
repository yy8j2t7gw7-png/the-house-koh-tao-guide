const HOUSE_TENANT_ID = "tenant_the_house_koh_tao";
const DEFAULT_MODEL = "gpt-live-1";
const DEFAULT_VOICE = "marin";
const MAX_SDP_CHARS = 240_000;
const DEFAULT_MAX_SESSION_SECONDS = 30 * 60;

const BUILT_IN_VOICES = new Set([
  "alloy", "ash", "ballad", "beacon", "bossa", "cedar", "cinder", "coral", "delta", "echo", "gleam",
  "marin", "meridian", "quartz", "ripple", "sage", "shimmer", "stone", "tempo", "verse", "vesper", "willow"
]);

export const LIVE_VOICE_PLANS = Object.freeze({
  voice_trial: Object.freeze({ key: "voice_trial", label: "Live Voice Trial", includedMinutes: 60, monthlyPriceThb: 0, overageThbPerMinute: 0, allowOverage: false }),
  voice_500: Object.freeze({ key: "voice_500", label: "Live Voice 500", includedMinutes: 500, monthlyPriceThb: 1990, overageThbPerMinute: 4.5, allowOverage: true }),
  voice_1000: Object.freeze({ key: "voice_1000", label: "Live Voice 1,000", includedMinutes: 1000, monthlyPriceThb: 3490, overageThbPerMinute: 4.25, allowOverage: true }),
  voice_3000: Object.freeze({ key: "voice_3000", label: "Live Voice 3,000", includedMinutes: 3000, monthlyPriceThb: 8990, overageThbPerMinute: 4, allowOverage: true }),
  house_preview: Object.freeze({ key: "house_preview", label: "The House Live Voice Preview", includedMinutes: 3000, monthlyPriceThb: 0, overageThbPerMinute: 0, allowOverage: false, internalPreview: true })
});

function cleanText(value, maximum = 500) {
  return String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maximum);
}

function int(value, fallback = 0) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value) {
  return value === true || String(value || "").toLowerCase() === "true" || String(value || "") === "1";
}

function monthKey(dateValue = new Date(), timezone = "Asia/Bangkok") {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Asia/Bangkok", year: "numeric", month: "2-digit"
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}`;
}

function planForKey(key) {
  return LIVE_VOICE_PLANS[cleanText(key, 80)] || LIVE_VOICE_PLANS.voice_trial;
}

function publicPlan(plan) {
  return {
    key: plan.key,
    label: plan.label,
    includedMinutes: plan.includedMinutes,
    monthlyPriceThb: plan.monthlyPriceThb,
    overageThbPerMinute: plan.overageThbPerMinute,
    allowOverage: Boolean(plan.allowOverage),
    internalPreview: Boolean(plan.internalPreview)
  };
}

function estimateOverageMinor(plan, seconds) {
  if (!plan.allowOverage || plan.overageThbPerMinute <= 0) return 0;
  const includedSeconds = plan.includedMinutes * 60;
  const overageSeconds = Math.max(0, int(seconds) - includedSeconds);
  return Math.ceil((overageSeconds / 60) * plan.overageThbPerMinute * 100);
}


function availableSessionSeconds(quota, configuredMaxSeconds) {
  const hardMax = Math.max(1, int(configuredMaxSeconds, DEFAULT_MAX_SESSION_SECONDS));
  const plan = quota?.plan || {};
  const usage = quota?.usage || {};
  const settings = quota?.settings || {};
  const remainingIncluded = Math.max(0, int(usage.remainingSeconds));
  if (!settings.overageEnabled || !plan.allowOverage || Number(plan.overageThbPerMinute) <= 0) {
    return Math.max(1, Math.min(hardMax, remainingIncluded || hardMax));
  }
  const capThb = Math.max(0, Number(settings.spendCapThb) || 0);
  if (capThb <= 0) return Math.max(1, Math.min(hardMax, remainingIncluded || 1));
  const alreadyBillableThb = Math.max(0, Number(usage.overageEstimateThb) || 0);
  const remainingCapThb = Math.max(0, capThb - alreadyBillableThb);
  const remainingOverageSeconds = Math.floor((remainingCapThb / Number(plan.overageThbPerMinute)) * 60);
  return Math.max(1, Math.min(hardMax, remainingIncluded + remainingOverageSeconds));
}
function thresholdLabel(usedSeconds, includedSeconds) {
  if (includedSeconds <= 0) return "none";
  const ratio = usedSeconds / includedSeconds;
  if (ratio >= 1) return "100";
  if (ratio >= 0.9) return "90";
  if (ratio >= 0.75) return "75";
  return "none";
}

export function liveVoiceConfiguration(env = {}) {
  return {
    enabled: bool(env.TAOEDGE_LIVE_VOICE_ENABLED ?? "true"),
    model: cleanText(env.OPENAI_LIVE_MODEL, 80) || DEFAULT_MODEL,
    defaultVoice: BUILT_IN_VOICES.has(cleanText(env.OPENAI_LIVE_VOICE, 40)) ? cleanText(env.OPENAI_LIVE_VOICE, 40) : DEFAULT_VOICE,
    maxSessionSeconds: Math.max(300, Math.min(3600, int(env.TAOEDGE_LIVE_VOICE_MAX_SESSION_SECONDS, DEFAULT_MAX_SESSION_SECONDS)))
  };
}

async function tenantVoiceSettings({ store, access, now = new Date() }) {
  const tenantId = cleanText(access?.record?.tenantId, 100);
  const current = typeof store?.mobileGetVoiceSettings === "function" ? await store.mobileGetVoiceSettings(tenantId) : null;
  if (current) return current;
  const planKey = tenantId === HOUSE_TENANT_ID ? "house_preview" : "voice_trial";
  const defaults = { tenantId, planKey, overageEnabled: false, spendCapThbMinor: 0, updatedByUserId: "system", updatedAt: now.toISOString() };
  if (typeof store?.mobileUpsertVoiceSettings === "function") await store.mobileUpsertVoiceSettings(defaults);
  return defaults;
}

export async function liveVoiceUsage({ store, access, env, now = new Date() }) {
  const config = liveVoiceConfiguration(env);
  const settings = await tenantVoiceSettings({ store, access, now });
  const plan = planForKey(settings.planKey);
  const timezone = cleanText(access?.record?.timezone, 80) || "Asia/Bangkok";
  const currentMonth = monthKey(now, timezone);
  const raw = typeof store?.mobileVoiceUsageSummary === "function"
    ? await store.mobileVoiceUsageSummary(access?.record?.tenantId, currentMonth)
    : { usageSeconds: 0, billableThbMinor: 0, sessions: 0, activeSessions: 0 };
  const usageSeconds = Math.max(0, int(raw.usageSeconds));
  const includedSeconds = Math.max(0, plan.includedMinutes * 60);
  const remainingSeconds = Math.max(0, includedSeconds - usageSeconds);
  const billableThbMinor = estimateOverageMinor(plan, usageSeconds);
  const capMinor = Math.max(0, int(settings.spendCapThbMinor));
  // Paid overage is fail-closed: it is only active when the tenant has also set a positive THB monthly cap.
  const overageEnabled = Boolean(settings.overageEnabled && plan.allowOverage && capMinor > 0);
  const includedExhausted = usageSeconds >= includedSeconds;
  const capReached = overageEnabled && billableThbMinor >= capMinor;
  const allowed = config.enabled && (!includedExhausted || (overageEnabled && !capReached));
  return {
    enabled: config.enabled,
    allowed,
    reason: !config.enabled ? "live_voice_disabled" : capReached ? "voice_spend_cap_reached" : includedExhausted && !overageEnabled ? "voice_allowance_exhausted" : "",
    monthKey: currentMonth,
    plan: publicPlan(plan),
    settings: { overageEnabled, spendCapThb: capMinor / 100 },
    usage: {
      seconds: usageSeconds,
      minutes: Math.round((usageSeconds / 60) * 10) / 10,
      includedSeconds,
      includedMinutes: plan.includedMinutes,
      remainingSeconds,
      remainingMinutes: Math.round((remainingSeconds / 60) * 10) / 10,
      overageEstimateThb: billableThbMinor / 100,
      sessions: int(raw.sessions),
      activeSessions: int(raw.activeSessions),
      threshold: thresholdLabel(usageSeconds, includedSeconds)
    },
    commercial: {
      currency: "THB",
      meteringOnly: true,
      note: "Taoedge meters Live Voice usage and limits here; payment collection is handled separately from this release."
    }
  };
}

function frontendInstructions(access = {}) {
  const propertyNames = (Array.isArray(access.properties) ? access.properties : []).map((item) => cleanText(item?.name || item?.displayName, 100)).filter(Boolean);
  const role = cleanText(access?.record?.role, 40) || "hotel operator";
  return [
    "You are Taoedge Live Voice, the natural spoken interface for a hospitality operations platform.",
    "Speak naturally, warmly and efficiently, like an excellent five-star hotel operations concierge speaking to hotel staff or an owner.",
    "Answer the user's actual request immediately. Never begin by listing capabilities or explaining what you can do unless the user explicitly asks.",
    "Match the language the user is currently speaking. Thai, German, English and mixed-language conversations are all valid; switch naturally when the user switches.",
    "Keep spoken answers concise unless the user asks for detail. Avoid robotic wording, repetitive acknowledgements and unnecessary preambles.",
    "For any request that needs live Taoedge/property data, schedules, bookings, inventory, finance, guest messaging, or would create/change/cancel/block/assign anything, delegate to the client application. Do not invent hotel facts.",
    "A delegated result from Taoedge is authoritative. Communicate that result naturally without claiming an action succeeded unless the result says it succeeded.",
    "Consequential operations may require protected on-screen confirmation. Tell the user briefly when confirmation is required; never bypass it.",
    `Current operator role: ${role}.`,
    propertyNames.length ? `Accessible properties: ${propertyNames.join(", ")}.` : "Property access is determined by Taoedge."
  ].join("\n");
}

export async function createLiveVoiceSession({ body, store, access, env, now = new Date() }) {
  const config = liveVoiceConfiguration(env);
  if (!config.enabled) return { status: 503, body: { error: "live_voice_disabled" } };
  if (!env?.OPENAI_API_KEY) return { status: 503, body: { error: "live_voice_not_configured" } };
  const quota = await liveVoiceUsage({ store, access, env, now });
  if (!quota.allowed) return { status: 402, body: { error: quota.reason || "live_voice_not_available", voiceUsage: quota } };

  const sdp = String(body?.sdp || "");
  if (!sdp || sdp.length > MAX_SDP_CHARS || !/^v=0/m.test(sdp)) return { status: 400, body: { error: "invalid_webrtc_offer" } };
  const requestedVoice = cleanText(body?.voice, 40);
  const voice = BUILT_IN_VOICES.has(requestedVoice) ? requestedVoice : config.defaultVoice;
  const model = config.model;
  const response = await fetch("https://api.openai.com/v1/live/sessions", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      session: {
        model,
        audio: { output: { voice } },
        client: { data_channel: { allowed_client_events: ["session.commentary.append", "session.close"], allowed_server_events: "all" } },
        delegation: { type: "client" },
        instructions: frontendInstructions(access),
        store: false
      },
      transport: { type: "webrtc", sdp }
    })
  });
  if (!response.ok) {
    const diagnostic = cleanText(await response.text().catch(() => ""), 500);
    return { status: 502, body: { error: "live_voice_session_failed", providerStatus: response.status, diagnostic } };
  }
  const payload = await response.json();
  const openAiSessionId = cleanText(payload?.session?.id, 160);
  const answerSdp = String(payload?.transport?.sdp || "");
  if (!openAiSessionId || !answerSdp) return { status: 502, body: { error: "live_voice_session_invalid_response" } };

  const id = `voice_${crypto.randomUUID()}`;
  const startedAt = now.toISOString();
  const timezone = cleanText(access?.record?.timezone, 80) || "Asia/Bangkok";
  if (typeof store?.mobileCreateVoiceSession !== "function") return { status: 503, body: { error: "voice_usage_store_unavailable" } };
  await store.mobileCreateVoiceSession({
    id,
    tenantId: access.record.tenantId,
    userId: access.record.userId,
    membershipId: access.record.membershipId,
    openAiSessionId,
    monthKey: monthKey(now, timezone),
    planKey: quota.plan.key,
    model,
    voice,
    status: "active",
    startedAt,
    metadata: { languageCode: cleanText(body?.languageCode, 24), propertyId: cleanText(body?.propertyId, 100) }
  });
  if (typeof store?.mobileRecordAudit === "function") {
    await store.mobileRecordAudit({
      tenantId: access.record.tenantId, userId: access.record.userId, membershipId: access.record.membershipId,
      action: "live_voice_session_started", reference: `live_voice:${id}`,
      metadata: { openAiSessionId, model, voice, planKey: quota.plan.key }, createdAt: startedAt
    });
  }
  return {
    status: 201,
    body: {
      ok: true,
      sessionId: id,
      openAiSessionId,
      model,
      voice,
      startedAt,
      maxSessionSeconds: availableSessionSeconds(quota, config.maxSessionSeconds),
      transport: { type: "webrtc", sdp: answerSdp },
      voiceUsage: quota
    }
  };
}

export async function recordLiveVoiceUsage({ sessionId, body, store, access, env, now = new Date() }) {
  const existing = typeof store?.mobileGetVoiceSession === "function" ? await store.mobileGetVoiceSession(access?.record?.tenantId, sessionId) : null;
  if (!existing || existing.userId !== access?.record?.userId) return { status: 404, body: { error: "voice_session_not_found" } };
  const config = liveVoiceConfiguration(env);
  const startedMs = Date.parse(existing.startedAt || "");
  const elapsedSeconds = Number.isFinite(startedMs) ? Math.max(0, Math.ceil((now.getTime() - startedMs) / 1000)) : 0;
  const reportedSeconds = Math.max(0, int(body?.seconds));
  const usageSeconds = Math.min(config.maxSessionSeconds, Math.max(int(existing.usageSeconds), reportedSeconds, elapsedSeconds));
  const closed = body?.closed === true || cleanText(body?.status, 30) === "closed";
  const status = closed ? "closed" : "active";
  const settings = await tenantVoiceSettings({ store, access, now });
  const plan = planForKey(existing.planKey || settings.planKey);
  const billableThbMinor = estimateOverageMinor(plan, usageSeconds);
  await store.mobileUpdateVoiceSessionUsage({
    tenantId: access.record.tenantId,
    id: existing.id,
    status,
    usageSeconds,
    billableThbMinor,
    updatedAt: now.toISOString(),
    endedAt: closed ? now.toISOString() : ""
  });
  if (closed && typeof store?.mobileRecordAudit === "function") {
    await store.mobileRecordAudit({
      tenantId: access.record.tenantId, userId: access.record.userId, membershipId: access.record.membershipId,
      action: "live_voice_session_closed", reference: `live_voice:${existing.id}`,
      metadata: { usageSeconds, overageEstimateThb: billableThbMinor / 100, planKey: plan.key }, createdAt: now.toISOString()
    });
  }
  const voiceUsage = await liveVoiceUsage({ store, access, env, now });
  return { status: 200, body: { ok: true, sessionId: existing.id, usageSeconds, status, voiceUsage } };
}

export async function updateLiveVoiceSettings({ body, store, access, env, now = new Date() }) {
  const current = await tenantVoiceSettings({ store, access, now });
  const plan = planForKey(current.planKey);
  const requestedOverage = plan.allowOverage && body?.overageEnabled === true;
  const requestedCapThb = Math.max(0, Math.min(100000, Number(body?.spendCapThb) || 0));
  const spendCapThb = requestedOverage ? (requestedCapThb > 0 ? requestedCapThb : 500) : requestedCapThb;
  const overageEnabled = requestedOverage && spendCapThb > 0;
  await store.mobileUpsertVoiceSettings({
    tenantId: access.record.tenantId,
    planKey: current.planKey,
    overageEnabled,
    spendCapThbMinor: Math.round(spendCapThb * 100),
    updatedByUserId: access.record.userId,
    updatedAt: now.toISOString()
  });
  if (typeof store?.mobileRecordAudit === "function") {
    await store.mobileRecordAudit({
      tenantId: access.record.tenantId, userId: access.record.userId, membershipId: access.record.membershipId,
      action: "live_voice_settings_updated", reference: `tenant:${access.record.tenantId}`,
      metadata: { planKey: current.planKey, overageEnabled, spendCapThb }, createdAt: now.toISOString()
    });
  }
  return { status: 200, body: { ok: true, voiceUsage: await liveVoiceUsage({ store, access, env, now }) } };
}

export function liveVoicePlanCatalogue() {
  return Object.values(LIVE_VOICE_PLANS).filter((plan) => !plan.internalPreview).map(publicPlan);
}
