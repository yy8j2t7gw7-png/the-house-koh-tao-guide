import test from "node:test";
import assert from "node:assert/strict";
import { createLiveVoiceSession, liveVoicePlanCatalogue, liveVoiceUsage, recordLiveVoiceUsage, updateLiveVoiceSettings } from "../src/live-voice.js";

function harness({ tenantId = "tenant_the_house_koh_tao", planKey = "house_preview", usageSeconds = 0, overageEnabled = false, spendCapThbMinor = 0 } = {}) {
  const settings = { tenantId, planKey, overageEnabled, spendCapThbMinor, updatedAt: new Date().toISOString() };
  const sessions = new Map();
  const audits = [];
  return {
    sessions, audits,
    access: { record: { tenantId, userId: "user_owner", membershipId: "membership_owner", role: "owner", timezone: "Asia/Bangkok" }, properties: [{ id: "property_house", name: "The House" }] },
    store: {
      async mobileGetVoiceSettings() { return settings; },
      async mobileUpsertVoiceSettings(record) { Object.assign(settings, record); return { ok: true }; },
      async mobileVoiceUsageSummary() {
        const dynamic = [...sessions.values()].reduce((sum, item) => sum + (Number(item.usageSeconds) || 0), 0);
        return { usageSeconds: usageSeconds + dynamic, billableThbMinor: 0, sessions: sessions.size, activeSessions: [...sessions.values()].filter((x) => x.status === "active").length };
      },
      async mobileCreateVoiceSession(record) { sessions.set(record.id, { ...record, usageSeconds: 0, billableThbMinor: 0 }); return { ok: true, id: record.id }; },
      async mobileGetVoiceSession(_tenant, id) { return sessions.get(id) || null; },
      async mobileUpdateVoiceSessionUsage(record) {
        const current = sessions.get(record.id);
        if (!current) return { ok: false };
        sessions.set(record.id, { ...current, ...record });
        return { ok: true };
      },
      async mobileRecordAudit(record) { audits.push(record); return { ok: true }; }
    }
  };
}

const env = { OPENAI_API_KEY: "test", TAOEDGE_LIVE_VOICE_ENABLED: "true", OPENAI_LIVE_MODEL: "gpt-live-1" };

test("v5.11.86 Live Voice commercial catalogue is THB-native", () => {
  const plans = liveVoicePlanCatalogue();
  assert.deepEqual(plans.map((x) => x.key), ["voice_trial", "voice_500", "voice_1000", "voice_3000"]);
  assert.equal(plans.find((x) => x.key === "voice_500")?.monthlyPriceThb, 1990);
  assert.equal(plans.find((x) => x.key === "voice_1000")?.monthlyPriceThb, 3490);
  assert.equal(plans.find((x) => x.key === "voice_3000")?.monthlyPriceThb, 8990);
});

test("v5.11.86 Live Voice usage enforces included allowance before starting a session", async () => {
  const h = harness({ tenantId: "tenant_client", planKey: "voice_trial", usageSeconds: 60 * 60 });
  const summary = await liveVoiceUsage({ store: h.store, access: h.access, env, now: new Date("2026-09-15T16:00:00Z") });
  assert.equal(summary.allowed, false);
  assert.equal(summary.reason, "voice_allowance_exhausted");
  assert.equal(summary.usage.remainingMinutes, 0);
  assert.equal(summary.commercial.currency, "THB");
});

test("v5.11.86 creates GPT-Live-1 WebRTC session without exposing provider credentials", async () => {
  const h = harness();
  const originalFetch = global.fetch;
  let upstreamBody = null;
  global.fetch = async (_url, options) => {
    upstreamBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ session: { id: "live_123" }, transport: { type: "webrtc", sdp: "v=0\r\na=answer" } }), { status: 201, headers: { "content-type": "application/json" } });
  };
  try {
    const outcome = await createLiveVoiceSession({ body: { sdp: "v=0\r\na=offer", voice: "marin", languageCode: "de-DE" }, store: h.store, access: h.access, env, now: new Date("2026-09-15T16:00:00Z") });
    assert.equal(outcome.status, 201);
    assert.equal(outcome.body.model, "gpt-live-1");
    assert.ok(outcome.body.maxSessionSeconds > 0 && outcome.body.maxSessionSeconds <= 1800);
    assert.equal(outcome.body.transport.sdp, "v=0\r\na=answer");
    assert.equal(upstreamBody.session.delegation.type, "client");
    assert.deepEqual(upstreamBody.session.client.data_channel.allowed_client_events, ["session.commentary.append", "session.close"]);
    assert.equal(upstreamBody.session.client.data_channel.allowed_server_events, "all");
    assert.match(upstreamBody.session.instructions, /Never begin by listing capabilities/i);
    assert.equal(h.sessions.size, 1);
    assert.equal("apiKey" in outcome.body, false);
  } finally { global.fetch = originalFetch; }
});

test("v5.11.86 paid overage cannot be enabled without a positive THB spend cap", async () => {
  const h = harness({ tenantId: "tenant_client", planKey: "voice_500", usageSeconds: 0 });
  const outcome = await updateLiveVoiceSettings({ body: { overageEnabled: true, spendCapThb: 0 }, store: h.store, access: h.access, env, now: new Date("2026-09-15T16:00:00Z") });
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.voiceUsage.settings.overageEnabled, true);
  assert.equal(outcome.body.voiceUsage.settings.spendCapThb, 500);
});

test("v5.11.86 session length is capped by remaining tenant allowance", async () => {
  const h = harness({ tenantId: "tenant_client", planKey: "voice_trial", usageSeconds: (60 * 60) - 5 });
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ session: { id: "live_cap" }, transport: { type: "webrtc", sdp: "v=0\r\na=answer" } }), { status: 201, headers: { "content-type": "application/json" } });
  try {
    const outcome = await createLiveVoiceSession({ body: { sdp: "v=0\r\na=offer" }, store: h.store, access: h.access, env, now: new Date("2026-09-15T16:00:00Z") });
    assert.equal(outcome.status, 201);
    assert.equal(outcome.body.maxSessionSeconds, 5);
  } finally { global.fetch = originalFetch; }
});

test("v5.11.86 usage accounting is cumulative and server-clock bounded", async () => {
  const h = harness();
  h.sessions.set("voice_test", {
    id: "voice_test", tenantId: h.access.record.tenantId, userId: h.access.record.userId, membershipId: h.access.record.membershipId,
    openAiSessionId: "live_test", monthKey: "2026-09", planKey: "house_preview", startedAt: "2026-09-15T16:00:00.000Z", usageSeconds: 0, status: "active"
  });
  const outcome = await recordLiveVoiceUsage({ sessionId: "voice_test", body: { seconds: 22, closed: true }, store: h.store, access: h.access, env, now: new Date("2026-09-15T16:00:30.000Z") });
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.usageSeconds, 30);
  assert.equal(outcome.body.status, "closed");
  assert.equal(h.sessions.get("voice_test").usageSeconds, 30);
});
