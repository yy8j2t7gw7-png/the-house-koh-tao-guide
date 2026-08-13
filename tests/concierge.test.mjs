import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import vm from "node:vm";
import {
  handleAdminRequest,
  handleConciergeRequest,
  handleFeedbackRequest
} from "../src/concierge-api.js";
import { handlePassportGuestRequest } from "../src/passport-api.js";
import {
  learningClusterKey,
  matchKnowledge,
  sanitizeQuestion
} from "../src/concierge-core.js";
import { retrieveApprovedProjectKnowledge } from "../src/project-knowledge.js";
import { handleTranslationRequest } from "../src/i18n-api.js";
import { classifyConciergeAlert, isAfterHours, safeAlertSummary } from "../src/alert-policy.js";
import {
  handleWhatsAppWebhook,
  processDueAlertEscalations,
  whatsappAlertConfiguration
} from "../src/whatsapp-alerts.js";
import knowledge from "../public/data/concierge-knowledge.json" with { type: "json" };
import activities from "../public/data/activities.json" with { type: "json" };
import bars from "../public/data/bars.json" with { type: "json" };
import beaches from "../public/data/beaches.json" with { type: "json" };
import cafes from "../public/data/cafes.json" with { type: "json" };
import places from "../public/data/places.json" with { type: "json" };
import shopping from "../public/data/shopping.json" with { type: "json" };

function createStore() {
  return {
    interactions: [],
    feedback: [],
    passportRecords: [],
    alerts: [],
    alertDeliveries: [],
    async getApprovedKnowledge() { return []; },
    async recordInteraction(record) { this.interactions.push(record); return { stored: true }; },
    async recordFeedback(record) {
      if (!this.interactions.some((interaction) => interaction.id === record.interactionId)) {
        return { stored: false, error: "interaction_not_found" };
      }
      this.feedback.push(record);
      return { stored: true };
    },
    async getAdminOverview() {
      return {
        totals: { interactions24h: 1, interactions30d: 1, gaps30d: 0, handoffs30d: 0, positive: 0, negative: 0, pending: 0, approved: 0 },
        queue: [], approved: [], alerts: this.alerts.filter((alert) => alert.status !== "resolved"), recent: []
      };
    },
    async reviewLearning() { return { ok: true, status: "approved" }; },
    async setApprovedKnowledgeActive() { return { ok: true }; },
    async createPassportUpload(record) {
      this.passportRecords.push({ ...record, status: "pending", objectKey: "" });
      return { ok: true };
    },
    async getPassportUploadByTokenHash(tokenHash) {
      return this.passportRecords.find((record) => record.tokenHash === tokenHash) || null;
    },
    async completePassportUpload(record) {
      const target = this.passportRecords.find((item) => item.tokenHash === record.tokenHash && item.status === "pending");
      if (!target) return { ok: false };
      Object.assign(target, record, { status: "uploaded" });
      return { ok: true, id: target.id, room: target.room };
    },
    async getPassportUpload(id) {
      return this.passportRecords.find((record) => record.id === id) || null;
    },
    async markPassportReminderSent(id) {
      const target = this.passportRecords.find((record) => record.id === id);
      if (target) target.reminderSentAt = new Date().toISOString();
      return { ok: true, reminderSentAt: target?.reminderSentAt };
    },
    async deletePassportUpload(id) {
      const target = this.passportRecords.find((record) => record.id === id);
      if (!target) return { ok: false };
      target.status = "deleted";
      const objectKey = target.objectKey;
      target.objectKey = "";
      return { ok: true, objectKey };
    },
    async cleanupPassportUploads() { return { records: [] }; }
    ,
    async createAlert(record) {
      const existing = this.alerts.find((alert) => alert.dedupeKey === record.dedupeKey && alert.status !== "resolved");
      if (existing) return { created: false, alert: existing };
      this.alerts.push({ ...record, status: "open", acknowledgedAt: "", resolvedAt: "", escalatedAt: "" });
      return { created: true };
    },
    async recordAlertDelivery(record) { this.alertDeliveries.push(record); return { ok: true }; },
    async updateAlertDeliveryStatus(record) {
      const target = this.alertDeliveries.find((delivery) => delivery.providerMessageId === record.providerMessageId);
      if (target) Object.assign(target, record);
      return { ok: true };
    },
    async getDueAlertEscalations(now) {
      return this.alerts.filter((alert) => alert.status === "open" && alert.escalationDueAt && alert.escalationDueAt <= now && !alert.escalatedAt);
    },
    async markAlertEscalated(id, now) {
      const target = this.alerts.find((alert) => alert.id === id);
      if (target) target.escalatedAt = now;
      return { ok: true };
    },
    async acknowledgeAlert(id, actorHash, now) {
      const target = this.alerts.find((alert) => alert.id === id);
      if (target && target.status === "open") Object.assign(target, { status: "acknowledged", acknowledgedAt: now, acknowledgedByHash: actorHash });
      return { ok: true };
    },
    async resolveAlert(id, actorHash, now) {
      const target = this.alerts.find((alert) => alert.id === id);
      if (target) Object.assign(target, { status: "resolved", resolvedAt: now, resolvedByHash: actorHash });
      return { ok: true };
    }
  };
}

function createEnvironment(overrides = {}) {
  const store = createStore();
  const objects = new Map();
  const passportBucket = {
    objects,
    async put(key, value) { objects.set(key, new Uint8Array(value)); },
    async get(key) {
      const value = objects.get(key);
      return value ? { body: new Response(value).body } : null;
    },
    async delete(key) { objects.delete(key); }
  };
  return {
    store,
    passportBucket,
    env: {
      ASSETS: {
        async fetch(request) {
          const pathname = new URL(request.url).pathname;
          const data = {
            "/data/concierge-knowledge.json": knowledge,
            "/data/activities.json": activities,
            "/data/bars.json": bars,
            "/data/beaches.json": beaches,
            "/data/cafes.json": cafes,
            "/data/places.json": places,
            "/data/shopping.json": shopping
          }[pathname];
          if (data) return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
          try {
            const relative = pathname.replace(/^\//, "");
            const source = await readFile(new URL(`../public/${relative}`, import.meta.url), "utf8");
            return new Response(source, { headers: { "content-type": "text/plain" } });
          } catch (_error) {
            return new Response("Not found", { status: 404 });
          }
        }
      },
      CONCIERGE_STORE: { getByName: () => store },
      CONCIERGE_RATE_LIMITER: { limit: async () => ({ success: true }) },
      CONCIERGE_ADMIN_TOKEN: "admin_token_test_5500",
      PASSPORT_UPLOADS: passportBucket,
      PASSPORT_TOKEN_PEPPER: "passport_test_pepper_5500",
      PASSPORT_RETENTION_DAYS: "14",
      OPENAI_MODEL: "gpt-5.6",
      OPENAI_REASONING_EFFORT: "medium",
      ...overrides
    }
  };
}

function guestRequest(question, extra = {}) {
  return new Request("https://guide.example/api/concierge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question,
      room: "7",
      sessionId: "session_test_1234567890",
      history: [],
      ...extra
    })
  });
}

test("critical guest requests stay deterministic and room-aware", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const pending = [];
  const response = await handleConciergeRequest(guestRequest("I lost my key"), env, { waitUntil: (promise) => pending.push(promise) });
  const body = await response.json();
  await Promise.all(pending);
  assert.equal(response.status, 200);
  assert.equal(body.intentId, "lost_key");
  assert.match(body.answer, /500 THB/);
  assert.equal(body.source, "approved");
  assert.match(body.interactionId, /^int_/);
  assert.equal(store.interactions[0].room, "7");
  assert.equal(store.interactions[0].learningGap, false);
});

test("medical emergencies offer Koh Tao Rescue first and 1669 second", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const response = await handleConciergeRequest(guestRequest("I had an accident"), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.intentId, "medical_emergency");
  assert.equal(body.handoff, "medical_emergency");
  assert.match(body.answer, /Koh Tao Rescue first/i);
  assert.match(body.answer, /1669/);
  assert.equal(body.actions[0].route, "rescueCall");
  assert.equal(body.actions[1].route, "medicalNationalCall");
});

test("activity booking uses guest-service wording and the House booking route", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const response = await handleConciergeRequest(
    guestRequest("Can you help me book snorkelling?"),
    env
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.source, "approved");
  assert.equal(body.intentId, "activity_booking");
  assert.equal(body.handoff, "booking");
  assert.match(body.answer, /help arrange the activity/i);
  assert.doesNotMatch(body.answer, /commission|referral|revenue/i);
  assert.equal(body.actions[0].route, "bookingWhatsapp");
  assert.equal(body.actions[1].route, "bookingCall");
});

test("The House recommendations answer Roctopus and Bamboo directly", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const divingResponse = await handleConciergeRequest(
    guestRequest("Which is the best dive shop?"),
    env
  );
  const diving = await divingResponse.json();
  assert.equal(diving.source, "approved");
  assert.equal(diving.intentId, "recommended_dive_school");
  assert.match(diving.answer, /Roctopus Dive/);
  assert.match(diving.answer, /friendly, professional team/);
  assert.match(diving.answer, /small groups, personal attention/);
  assert.match(diving.answer, /dive team in the shop/);
  assert.doesNotMatch(diving.answer, /\b(?:PADI|RAID|certification|training agency)\b/i);
  assert.equal(diving.actions.some((action) => action.href === "/activity.html?id=roctopus-dive"), false);
  assert.equal(diving.actions[0].route, "bookingWhatsapp");

  const barResponse = await handleConciergeRequest(
    guestRequest("Which bar do you recommend?"),
    env
  );
  const bar = await barResponse.json();
  assert.equal(bar.source, "approved");
  assert.equal(bar.intentId, "recommended_sunset_bar");
  assert.match(bar.answer, /Bamboo Beach Bar/);
  assert.equal(bar.actions.some((action) => action.href === "/bar.html?id=bamboo-beach-bar"), false);
  assert.deepEqual(bar.actions.map((action) => action.label), ["Facebook", "Instagram"]);
  assert.equal(bar.actions[0].href, "https://facebook.com/bamboobeachbarkohtao");
  assert.equal(bar.actions[1].href, "https://www.instagram.com/bamboobeachbar_kohtao/");
});

test("Bamboo website follow-ups return official social buttons without an Explore route", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  let modelCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    modelCalled = true;
    return new Response("Unexpected model call", { status: 500 });
  };
  try {
    const response = await handleConciergeRequest(guestRequest("Do you have a website of them?", {
      history: [
        { role: "user", content: "Which bar do you recommend?" },
        { role: "assistant", content: "The House recommends Bamboo Beach Bar for a relaxed beachfront sunset." }
      ]
    }), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(modelCalled, false);
    assert.equal(body.source, "approved");
    assert.equal(body.intentId, "bamboo_beach_bar_social");
    assert.deepEqual(body.actions.map((action) => action.label), ["Facebook", "Instagram"]);
    assert.equal(body.actions[0].href, "https://facebook.com/bamboobeachbarkohtao");
    assert.equal(body.actions[1].href, "https://www.instagram.com/bamboobeachbar_kohtao/");
    assert.doesNotMatch(JSON.stringify(body), /\/bar\.html|id=bamboo-beach-bar/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retrieval connects the AI to approved activity, bar and island records", async () => {
  const { env } = createEnvironment();
  const request = guestRequest("approved project retrieval");
  const diveRecords = await retrieveApprovedProjectKnowledge(
    request,
    env,
    "I want a beginner-friendly RAID dive centre with small groups and conservation work."
  );
  assert.equal(diveRecords[0].name, "Roctopus Dive");
  assert.equal(diveRecords[0].preferredByTheHouse, true);
  assert.doesNotMatch(JSON.stringify(diveRecords), /roctopusdive\.com|info@roctopus/i);

  const sunsetRecords = await retrieveApprovedProjectKnowledge(
    request,
    env,
    "I want a mellow drink with sand under my feet at sunset."
  );
  assert.equal(sunsetRecords[0].name, "Bamboo Beach Bar");
  assert.equal("publicPath" in sunsetRecords[0], false);
});

test("concierge loading state uses animated dots without visible status wording", async () => {
  const script = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../public/ai-concierge.css", import.meta.url), "utf8");
  assert.doesNotMatch(script, /Checking the approved information/);
  assert.match(script, /ai-concierge-thinking-dots/);
  assert.match(styles, /@keyframes ai-concierge-thinking-dot/);
  assert.match(styles, /prefers-reduced-motion/);
});

test("retrieved approved records are included in GPT-5.6 model context", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  let capturedRequest;
  globalThis.fetch = async (_url, options) => {
    capturedRequest = JSON.parse(options.body);
    return new Response(JSON.stringify({
      output: [{
        type: "message",
        content: [{
          type: "output_text",
          text: JSON.stringify({
            answer: "Roctopus Dive is the strongest fit for those preferences.",
            intent_id: "tailored_dive_recommendation",
            category: "booking",
            confidence: 0.94,
            needs_human: true,
            handoff: "booking",
            learning_gap: false,
            learning_reason: "none"
          })
        }]
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await handleConciergeRequest(
      guestRequest("I am a nervous beginner interested in conservation and want a small RAID group. What would suit me?"),
      env
    );
    const body = await response.json();
    assert.equal(body.source, "ai");
    assert.match(body.answer, /Roctopus Dive/);
    assert.match(capturedRequest.instructions, /RETRIEVED APPROVED PROJECT RECORDS/);
    assert.match(capturedRequest.instructions, /"name":"Roctopus Dive"/);
    assert.match(capturedRequest.instructions, /"preferredByTheHouse":true/);
    assert.equal(capturedRequest.reasoning.effort, "medium");
    assert.equal(capturedRequest.max_output_tokens, 2400);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("technical Roctopus model wording is replaced with the approved guest answer", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output: [{
      type: "message",
      content: [{
        type: "output_text",
        text: JSON.stringify({
          answer: "Roctopus is a RAID centre rather than a PADI centre.",
          intent_id: "roctopus_details",
          category: "booking",
          confidence: 0.9,
          needs_human: true,
          handoff: "booking",
          learning_gap: false,
          learning_reason: "none"
        })
      }]
    }]
  }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await handleConciergeRequest(
      guestRequest("Tell me more about the certification system used by the dive centre you recommend."),
      env
    );
    const body = await response.json();
    assert.equal(body.source, "ai");
    assert.match(body.answer, /friendly, professional team/);
    assert.match(body.answer, /dive team in the shop/);
    assert.doesNotMatch(body.answer, /\b(?:PADI|RAID|certification|training agency)\b/i);
    assert.equal(body.actions[0].route, "bookingWhatsapp");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("required passport registration is a room-aware concierge action", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const response = await handleConciergeRequest(
    guestRequest("I need my secure passport registration link."),
    env
  );
  const body = await response.json();
  assert.equal(body.source, "approved");
  assert.equal(body.intentId, "guest_registration_required");
  assert.equal(body.category, "stay-support");
  assert.match(body.answer, /TM30 Immigration/);
  assert.match(body.answer, /14 days/);
  assert.equal(body.actions[0].type, "registration");
  assert.equal(body.actions[0].route, undefined);
});

test("Thai nationals are exempt from the TM30 passport upload flow", async () => {
  const { env } = createEnvironment();
  const answer = await handleConciergeRequest(guestRequest("I am a Thai national. Do I need TM30?"), env);
  const body = await answer.json();
  assert.equal(body.intentId, "thai_national_registration_exemption");
  assert.match(body.answer, /Thai nationals do not need/);
  assert.deepEqual(body.actions, []);

  const rejected = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/passport-links", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ room: "1", arrivalAt: "2026-08-13T07:00:00.000Z", expiresHours: 24 })
  }), env, "/api/concierge/admin/passport-links");
  assert.equal(rejected.status, 400);
  assert.equal((await rejected.json()).error, "non_thai_confirmation_required");
});

test("main and room welcome pages make required registration prominent", async () => {
  const [home, room, canonicalRoom, registrationEntry, registrationForm] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/house/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/registration-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../public/passport-upload.html", import.meta.url), "utf8")
  ]);
  [home, room].forEach((html) => {
    assert.match(html, /Required registration for non-Thai guests/);
    assert.match(html, /Non-Thai guests: use your private registration link/);
    assert.match(html, /TM30 Immigration/);
    assert.match(html, /automatically deleted 14 days after upload/);
    assert.match(html, /data-private-registration/);
    assert.match(html, /src="\/registration-entry\.js"/);
    assert.doesNotMatch(html, /data-concierge-prompt="I need my secure passport registration link\."/);
    assert.doesNotMatch(html, /href="\/passport-upload(?:\.html)?"/);
  });
  assert.match(registrationEntry, /`\/passport-upload#token=\$\{token\}`/);
  assert.match(registrationEntry, /Complete Required Registration/);
  assert.match(registrationEntry, /private registration access is not attached/i);
  assert.match(registrationEntry, /sessionStorage\.setItem/);
  assert.match(registrationForm, /Option 1 — Upload passport image/);
  assert.match(registrationForm, /Option 2 — Enter the required details/);
  assert.match(registrationForm, /exact required TM30 fields/);
  assert.equal(room, canonicalRoom);
});

test("guest localization supports seven languages and keeps the owner dashboard English", async () => {
  const [runtime, guideApp, passport, admin] = await Promise.all([
    readFile(new URL("../public/i18n.js", import.meta.url), "utf8"),
    readFile(new URL("../public/guide-app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/passport-upload.html", import.meta.url), "utf8"),
    readFile(new URL("../public/concierge-admin.html", import.meta.url), "utf8")
  ]);
  for (const code of ["en", "th", "zh-CN", "ru", "de", "fr", "es"]) {
    assert.match(runtime, new RegExp(`code: "${code.replace("-", "\\-")}"`));
  }
  assert.match(runtime, /\.language-switcher/);
  assert.match(runtime, /\.language-floating-button/);
  assert.match(runtime, /\.ai-concierge-message\.is-guest/);
  assert.match(guideApp, /src = "\/i18n\.js"/);
  assert.match(passport, /src="\/i18n\.js"/);
  assert.doesNotMatch(admin, /src="\/i18n\.js"/);
  assert.match(runtime, /exploreContentDeferred/);
  assert.match(runtime, /element\.closest\("\.section,\.footer"\)/);
});

test("critical emergency and registration wording is reviewed in every guest language", async () => {
  const runtime = await readFile(new URL("../public/i18n.js", import.meta.url), "utf8");
  const criticalSources = [
    "Call Koh Tao Rescue",
    "Call Medical Emergency 1669",
    "Why we need it",
    "Automatic deletion: 14 days after upload",
    "Thai nationals do not need to complete this registration.",
    "Thai national?",
    "You do not need to upload a passport for this registration. Please tell The House so the unused request can be closed."
  ];

  for (const language of ["en", "th", "zh-CN", "ru", "de", "fr", "es"]) {
    const storage = {
      getItem(key) { return key === "houseGuideLanguage" ? language : null; },
      setItem() {}
    };
    const sandbox = {
      window: {
        localStorage: storage,
        addEventListener() {},
        dispatchEvent() {},
        location: { reload() {} }
      },
      document: {
        documentElement: { lang: "" },
        readyState: "loading",
        addEventListener() {}
      },
      location: { pathname: "/emergency.html" },
      navigator: { language, languages: [language] },
      CustomEvent: class CustomEvent {},
      URLSearchParams,
      setTimeout,
      clearTimeout,
      console
    };
    vm.runInNewContext(runtime, sandbox);
    const i18n = sandbox.window.HOUSE_I18N;
    assert.equal(i18n.language, language);
    assert.equal(sandbox.document.documentElement.lang, language);
    for (const source of criticalSources) {
      const translated = i18n.t(source);
      assert.ok(translated, `${source} is empty for ${language}`);
      if (language !== "en") assert.notEqual(translated, source, `${source} is not localized for ${language}`);
    }
    assert.match(i18n.t("Call Medical Emergency 1669"), /1669/);
    assert.match(i18n.t("Automatic deletion: 14 days after upload"), /14/);
  }
});

test("every guest HTML page loads the shared localization runtime", async () => {
  const publicRoot = new URL("../public/", import.meta.url);
  const guestPages = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) await collect(new URL(`${entry.name}/`, directory));
      else if (entry.isFile() && entry.name.endsWith(".html") && entry.name !== "concierge-admin.html") {
        guestPages.push(new URL(entry.name, directory));
      }
    }
  }
  await collect(publicRoot);
  for (const page of guestPages) {
    const html = await readFile(page, "utf8");
    const loadsLocalization = html.includes('src="/guide-app.js"') || html.includes('src="/i18n.js"');
    assert.ok(loadsLocalization, `${page.pathname} does not load the shared localization runtime`);
  }
});

test("guest emergency page keeps Rescue first and 1669 second with distinct actions", async () => {
  const [rootPage, canonicalPage, actionRuntime] = await Promise.all([
    readFile(new URL("../public/emergency.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/emergency/emergency.html", import.meta.url), "utf8"),
    readFile(new URL("../public/platform-action-runtime.js", import.meta.url), "utf8")
  ]);
  assert.equal(rootPage, canonicalPage);
  assert.ok(rootPage.indexOf("data-link=\"rescueCall\"") < rootPage.indexOf("data-link=\"medicalNationalCall\""));
  assert.match(rootPage, />Call Koh Tao Rescue<\/a>/);
  assert.match(rootPage, />Call Medical Emergency 1669<\/a>/);
  assert.match(actionRuntime, /linkKey === "rescueCall"/);
  assert.match(actionRuntime, /linkKey === "medicalNationalCall"/);
});

test("Explore stays in source but is disabled in the live guest release", async () => {
  const [exploreSource, guideApp, css, workerSource, workerConfig] = await Promise.all([
    readFile(new URL("../public/explore.html", import.meta.url), "utf8"),
    readFile(new URL("../public/guide-app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/design-system.css", import.meta.url), "utf8"),
    readFile(new URL("../src/index.js", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8")
  ]);
  assert.match(exploreSource, /Explore Koh Tao/);
  assert.match(guideApp, /explore: false/);
  assert.match(css, /html:not\(\.explore-enabled\).*explore\.html/s);
  assert.match(workerSource, /EXPLORE_PAGE_PATTERN/);
  assert.match(workerSource, /Response\.redirect\(new URL\("\/", request\.url\)/);
  assert.equal(JSON.parse(workerConfig).vars.EXPLORE_ENABLED, "false");
});

test("translation endpoint accepts approved page text and rejects arbitrary guest text", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    const entries = JSON.parse(request.input[0].content).entries;
    return new Response(JSON.stringify({
      output: [{
        type: "message",
        content: [{
          type: "output_text",
          text: JSON.stringify({ translations: entries.map((entry) => ({ id: entry.id, text: "Bienvenido" })) })
        }]
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const approvedRequest = new Request("https://guide.example/api/i18n/translate", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.8" },
      body: JSON.stringify({ language: "es", page: "/index.html", texts: ["Welcome to Koh Tao"] })
    });
    const approvedResponse = await handleTranslationRequest(approvedRequest, env);
    assert.equal(approvedResponse.status, 200);
    assert.deepEqual((await approvedResponse.json()).translations, ["Bienvenido"]);

    const guestTextRequest = new Request("https://guide.example/api/i18n/translate", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.8" },
      body: JSON.stringify({ language: "fr", page: "/index.html", texts: ["My private guest message"] })
    });
    const guestTextResponse = await handleTranslationRequest(guestTextRequest, env);
    assert.equal(guestTextResponse.status, 403);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("one dynamic room phrase cannot block the rest of a translated page batch", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    const entries = JSON.parse(request.input[0].content).entries;
    return new Response(JSON.stringify({
      output: [{
        type: "message",
        content: [{
          type: "output_text",
          text: JSON.stringify({
            translations: entries.map((entry) => ({ id: entry.id, text: `Deutsch: ${entry.text}` }))
          })
        }]
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const request = new Request("https://guide.example/api/i18n/translate", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.9" },
      body: JSON.stringify({
        language: "de",
        page: "/room/1",
        texts: [
          "Welcome to Room 1",
          "Room 1 · Upstairs",
          "This TM30 Immigration accommodation registration applies only to non-Thai guests. If you have not already provided the required passport information, please complete it before arrival. Thai nationals do not need to complete this registration.",
          "My private guest message"
        ]
      })
    });
    const response = await handleTranslationRequest(request, env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(body.translations[0], /^Deutsch: Welcome to Room 1$/);
    assert.match(body.translations[1], /^Deutsch: Room 1 · Upstairs$/);
    assert.match(body.translations[2], /^Deutsch: This TM30 Immigration accommodation registration/);
    assert.equal(body.translations[3], null);
    assert.equal(body.untranslated, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("alert policy uses Bangkok after-hours and routes only actionable requests", () => {
  assert.equal(isAfterHours(new Date("2026-08-12T12:29:00.000Z")), false);
  assert.equal(isAfterHours(new Date("2026-08-12T12:30:00.000Z")), true);
  assert.equal(isAfterHours(new Date("2026-08-13T03:29:00.000Z")), true);
  assert.equal(isAfterHours(new Date("2026-08-13T03:30:00.000Z")), false);

  const afterHoursKey = classifyConciergeAlert({
    result: { needsHuman: true, intentId: "lost_key", category: "room", handoff: "stay_support" },
    question: "I lost my key",
    room: "7",
    now: new Date("2026-08-12T13:00:00.000Z")
  });
  assert.equal(afterHoursKey.severity, "urgent");
  assert.equal(afterHoursKey.recipientGroup, "urgent");
  assert.equal(afterHoursKey.escalationRequired, true);
  assert.equal(afterHoursKey.roomVerified, false);

  const diveRecommendation = classifyConciergeAlert({
    result: { needsHuman: true, intentId: "diving_recommendation", category: "booking", handoff: "booking" },
    question: "Which dive school do you recommend?",
    room: "1",
    now: new Date("2026-08-12T05:00:00.000Z")
  });
  assert.equal(diveRecommendation, null);
  assert.equal(safeAlertSummary("Passport number AB123456, nationality French, date of birth 1 January 1990").includes("AB123456"), false);
});

test("critical concierge requests send a sanitized WhatsApp template without storing phone numbers", async () => {
  const recipients = JSON.stringify({
    support: [{ label: "Su", phone: "+66 64 000 0001" }],
    emergency: [{ label: "Owner 1", phone: "+66 81 000 0002" }],
    escalation: [{ label: "Owner 2", phone: "+66 82 000 0003" }]
  });
  const { env, store } = createEnvironment({
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
    WHATSAPP_ALERT_RECIPIENTS: recipients,
    CONCIERGE_HASH_SALT: "alert-test-salt"
  });
  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (url, options) => {
    outbound.push({ url: String(url), body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ messages: [{ id: "wamid.test-1" }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const pending = [];
    const response = await handleConciergeRequest(
      guestRequest("There is water leakage in my room", { room: "7" }),
      env,
      { waitUntil: (promise) => pending.push(promise) }
    );
    assert.equal(response.status, 200);
    await Promise.all(pending);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].severity, "critical");
    assert.equal(store.alerts[0].recipientGroup, "emergency");
    assert.equal(outbound.length, 1);
    assert.match(outbound[0].url, /graph\.facebook\.com\/v23\.0\/1234567890\/messages$/);
    assert.equal(outbound[0].body.to, "66810000002");
    assert.equal(outbound[0].body.type, "template");
    assert.equal(outbound[0].body.template.name, "house_concierge_alert");
    assert.equal(store.alertDeliveries[0].recipientLabel, "Owner 1");
    assert.notEqual(store.alertDeliveries[0].recipientHash, "66810000002");
    assert.doesNotMatch(JSON.stringify(store.alertDeliveries), /66810000002|66820000003/);
    assert.equal(whatsappAlertConfiguration(env).configured, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unacknowledged critical alerts escalate and authorized WhatsApp replies can resolve them", async () => {
  const recipientSecret = JSON.stringify({
    emergency: [{ label: "Owner 1", phone: "+66 81 000 0002" }],
    escalation: [{ label: "Owner 2", phone: "+66 82 000 0003" }]
  });
  const { env, store } = createEnvironment({
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
    WHATSAPP_ALERT_RECIPIENTS: recipientSecret,
    CONCIERGE_HASH_SALT: "alert-test-salt"
  });
  const alertId = "alert_12345678-1234-1234-1234-123456789012";
  store.alerts.push({
    id: alertId,
    severity: "critical",
    alertType: "property_emergency",
    recipientGroup: "emergency",
    room: "7",
    roomVerified: false,
    summary: "There is smoke in my room",
    bangkokTime: "13 Aug 2026, 02:00",
    createdAt: "2026-08-12T19:00:00.000Z",
    escalationDueAt: "2026-08-12T19:10:00.000Z",
    escalatedAt: "",
    status: "open"
  });
  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: "wamid.escalation" }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const escalated = await processDueAlertEscalations(env, new Date("2026-08-12T19:11:00.000Z"));
    assert.deepEqual(escalated, { due: 1, sent: 1 });
    assert.equal(outbound[0].to, "66820000003");
    assert.ok(store.alerts[0].escalatedAt);

    const webhookBody = JSON.stringify({
      entry: [{ changes: [{ value: { messages: [{ from: "66820000003", text: { body: `RESOLVE ${alertId}` } }] } }] }]
    });
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.META_APP_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(webhookBody));
    const signature = `sha256=${Buffer.from(signatureBytes).toString("hex")}`;
    const response = await handleWhatsAppWebhook(new Request("https://guide.example/api/whatsapp/webhook", {
      method: "POST",
      headers: { "x-hub-signature-256": signature },
      body: webhookBody
    }), env);
    assert.equal(response.status, 200);
    assert.equal(store.alerts[0].status, "resolved");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("model responses use structured output and deterministic handoff actions", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  let capturedRequest;
  globalThis.fetch = async (_url, options) => {
    capturedRequest = JSON.parse(options.body);
    const modelResult = {
      answer: "I can help arrange that. Do not use https://operator.example or +66 99 123 4567; please use the booking button.",
      intent_id: "special_booking_request",
      category: "booking",
      confidence: 0.82,
      needs_human: true,
      handoff: "booking",
      learning_gap: false,
      learning_reason: "none"
    };
    return new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(modelResult) }] }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await handleConciergeRequest(
      guestRequest("My partner has a birthday tomorrow. Could you help?", {
        history: [{ role: "user", content: "We want to celebrate quietly." }]
      }),
      env
    );
    const body = await response.json();
    assert.equal(body.source, "ai");
    assert.equal(body.handoff, "booking");
    assert.equal(body.actions[0].route, "bookingWhatsapp");
    assert.doesNotMatch(body.answer, /operator\.example|99 123 4567/);
    assert.match(body.answer, /\[link removed\].*\[number removed\]/);
    assert.equal(capturedRequest.store, false);
    assert.equal(capturedRequest.text.format.type, "json_schema");
    assert.match(capturedRequest.instructions, /Room 7/);
    assert.match(capturedRequest.instructions, /Never reveal, invent, request or infer a key-box code/);
    assert.equal(store.interactions.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("guest answers never disclose private commercial arrangements", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output: [{
      type: "message",
      content: [{
        type: "output_text",
        text: JSON.stringify({
          answer: "This is a commissionable activity and The House receives a referral payment.",
          intent_id: "activity_booking",
          category: "booking",
          confidence: 0.9,
          needs_human: true,
          handoff: "booking",
          learning_gap: false,
          learning_reason: "none"
        })
      }]
    }]
  }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await handleConciergeRequest(
      guestRequest("Could you arrange a private sunset trip for tomorrow?"),
      env
    );
    const body = await response.json();
    assert.equal(body.source, "ai");
    assert.doesNotMatch(body.answer, /commission|referral payment|revenue share/i);
    assert.match(body.answer, /concierge can help arrange/i);
    assert.equal(body.actions[0].route, "bookingWhatsapp");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unknown questions become learning gaps when the API key is absent", async () => {
  const { env, store } = createEnvironment();
  const response = await handleConciergeRequest(guestRequest("Can I borrow a blue umbrella?"), env);
  const body = await response.json();
  assert.equal(body.source, "fallback");
  assert.equal(body.learningGap, true);
  assert.equal(body.handoff, "stay_support");
  assert.equal(store.interactions[0].learningGap, true);
});

test("low-confidence fallback matches cannot become false emergencies", async () => {
  const { env } = createEnvironment();
  const taxiResponse = await handleConciergeRequest(guestRequest("I need a taxi"), env);
  const taxiBody = await taxiResponse.json();
  assert.equal(taxiBody.category, "booking");
  assert.equal(taxiBody.handoff, "booking");
  assert.equal(taxiBody.actions[0].route, "bookingWhatsapp");

  const callResponse = await handleConciergeRequest(guestRequest("Can you call me tomorrow?"), env);
  const callBody = await callResponse.json();
  assert.notEqual(callBody.handoff, "medical_emergency");
  assert.equal(callBody.source, "fallback");

  const smokeResponse = await handleConciergeRequest(guestRequest("There is smoke in my room"), env);
  const smokeBody = await smokeResponse.json();
  assert.equal(smokeBody.intentId, "property_emergency");
  assert.equal(smokeBody.handoff, "property_emergency");
});

test("owner-approved knowledge becomes active without a new deployment", async () => {
  const { env, store } = createEnvironment();
  store.getApprovedKnowledge = async () => [{
    id: "approved_test",
    questionPattern: "Can I borrow a blue umbrella?",
    answer: "A blue umbrella is available from the House support team on request.",
    intentId: "borrow_umbrella",
    category: "stay-support"
  }];
  const response = await handleConciergeRequest(guestRequest("Can I borrow a blue umbrella?"), env);
  const body = await response.json();
  assert.equal(body.intentId, "borrow_umbrella");
  assert.equal(body.source, "approved");
  assert.equal(body.learningGap, false);
  assert.equal(body.actions[0].route, "houseWhatsapp");
});

test("passport details typed into chat are discarded before answering or learning", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "must-not-be-used" });
  const response = await handleConciergeRequest(guestRequest(
    "Passport number AB123456, nationality French, date of birth 1 January 1990"
  ), env);
  const body = await response.json();
  assert.equal(body.intentId, "overnight_visitors");
  assert.match(body.answer, /private Room welcome link/);
  assert.equal(store.interactions[0].question, "passport registration");
  assert.doesNotMatch(JSON.stringify(store.interactions[0]), /AB123456|French|1990/);
});

test("feedback and admin APIs require valid records and authorization", async () => {
  const { env, store } = createEnvironment();
  const answerResponse = await handleConciergeRequest(guestRequest("I lost my key"), env);
  const answerBody = await answerResponse.json();
  const feedbackRequest = new Request("https://guide.example/api/concierge/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ interactionId: answerBody.interactionId, rating: "down" })
  });
  const feedbackResponse = await handleFeedbackRequest(feedbackRequest, env);
  assert.equal(feedbackResponse.status, 200);
  assert.equal(store.feedback[0].rating, "down");

  const missingFeedback = await handleFeedbackRequest(new Request("https://guide.example/api/concierge/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ interactionId: "int_12345678-1234-1234-1234-123456789012", rating: "up" })
  }), env);
  assert.equal(missingFeedback.status, 404);

  const unauthorized = await handleAdminRequest(
    new Request("https://guide.example/api/concierge/admin/overview"),
    env,
    "/api/concierge/admin/overview"
  );
  assert.equal(unauthorized.status, 401);
  const authorized = await handleAdminRequest(
    new Request("https://guide.example/api/concierge/admin/overview", {
      headers: { authorization: "Bearer admin_token_test_5500" }
    }),
    env,
    "/api/concierge/admin/overview"
  );
  assert.equal(authorized.status, 200);
});

test("matching, learning clusters and privacy redaction remain stable", () => {
  assert.equal(matchKnowledge("There is water leakage in my room", knowledge).intentId, "property_emergency");
  assert.match(sanitizeQuestion("Email me at guest@example.com or +66 99 123 4567"), /\[email removed\].*\[number removed\]/);
  assert.equal(sanitizeQuestion("The key-box code is 4829"), "The [protected code removed]");
  assert.equal(sanitizeQuestion("Passport number AB123456, nationality French, date of birth 1 January 1990"), "[passport information removed]");
  assert.notEqual(learningClusterKey("ฉันต้องการผ้าเช็ดตัว"), learningClusterKey("กุญแจของฉันหาย"));
  assert.equal(learningClusterKey("Can I borrow a blue umbrella?"), learningClusterKey("Could I borrow the blue umbrella please?"));
});

test("one-time passport links keep documents outside the concierge and close after upload", async () => {
  const { env, store, passportBucket } = createEnvironment();
  const createResponse = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/passport-links", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ room: "7", arrivalAt: "2026-08-13T07:00:00.000Z", expiresHours: 72, nonThaiConfirmed: true })
  }), env, "/api/concierge/admin/passport-links");
  const created = await createResponse.json();
  assert.equal(createResponse.status, 200);
  assert.match(created.welcomeUrl, /\/room\/7#registration=/);
  assert.match(created.uploadUrl, /\/passport-upload#token=/);
  assert.equal(new URL(created.uploadUrl).search, "");
  assert.match(created.reminderMessage, /TM30 Immigration accommodation registration applies only to non-Thai guests/);
  assert.match(created.reminderMessage, /Thai nationals do not need/);
  assert.match(created.reminderMessage, /private Room 7 welcome page/);
  assert.doesNotMatch(created.reminderMessage, /\/passport-upload/);
  const token = new URL(created.uploadUrl).hash.replace("#token=", "");

  const sessionResponse = await handlePassportGuestRequest(new Request("https://guide.example/api/passport-upload/session", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  }), env, "/api/passport-upload/session");
  const session = await sessionResponse.json();
  assert.equal(session.room, "7");
  assert.equal(session.retentionDays, 14);

  const jpeg = new Uint8Array(1024);
  jpeg.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const uploadResponse = await handlePassportGuestRequest(new Request("https://guide.example/api/passport-upload", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "image/jpeg" },
    body: jpeg
  }), env, "/api/passport-upload");
  const uploaded = await uploadResponse.json();
  assert.equal(uploadResponse.status, 200);
  assert.equal(uploaded.room, "7");
  assert.equal(passportBucket.objects.size, 1);
  assert.equal(store.passportRecords[0].status, "uploaded");

  const reused = await handlePassportGuestRequest(new Request("https://guide.example/api/passport-upload/session", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  }), env, "/api/passport-upload/session");
  assert.equal(reused.status, 410);

  const fileId = store.passportRecords[0].id;
  const download = await handleAdminRequest(new Request(`https://guide.example/api/concierge/admin/passport-files/${fileId}`, {
    headers: { authorization: "Bearer admin_token_test_5500" }
  }), env, `/api/concierge/admin/passport-files/${fileId}`);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("cache-control"), "no-store, max-age=0");
  assert.deepEqual(new Uint8Array(await download.arrayBuffer()), jpeg);

  const secondResponse = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/passport-links", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ room: "5", arrivalAt: "2026-08-13T07:00:00.000Z", expiresHours: 24, nonThaiConfirmed: true })
  }), env, "/api/concierge/admin/passport-links");
  const second = await secondResponse.json();
  const secondToken = new URL(second.uploadUrl).hash.replace("#token=", "");
  const rejectedFile = await handlePassportGuestRequest(new Request("https://guide.example/api/passport-upload", {
    method: "POST",
    headers: { authorization: `Bearer ${secondToken}`, "content-type": "text/plain" },
    body: new Uint8Array(1024).fill(0x41)
  }), env, "/api/passport-upload");
  assert.equal(rejectedFile.status, 415);
  const stillUsable = await handlePassportGuestRequest(new Request("https://guide.example/api/passport-upload/session", {
    method: "POST",
    headers: { authorization: `Bearer ${secondToken}` }
  }), env, "/api/passport-upload/session");
  assert.equal(stillUsable.status, 200);
});

test("every guest page uses the same top navigation", async () => {
  const { readdir } = await import("node:fs/promises");
  const publicRoot = new URL("../public/", import.meta.url);
  const paths = [];
  async function collect(directory, relative = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const childRelative = `${relative}${entry.name}`;
      if (entry.isDirectory()) await collect(new URL(`${entry.name}/`, directory), `${childRelative}/`);
      else if (entry.isFile() && entry.name.endsWith(".html")) paths.push(childRelative);
    }
  }
  await collect(publicRoot);
  const expected = '<header class="topbar"><a class="brand" href="/"><img src="/logo.svg" alt="The House Koh Tao"></a><nav class="nav"><a href="/rooms.html">Your Room</a><a href="/house.html">The House</a><a href="/practical.html">Guest Information</a><a href="/explore.html">Explore</a><a href="/emergency.html">Help & Emergency</a><a href="/checkout.html">Departure</a></nav></header>';
  let checked = 0;
  for (const path of paths) {
    const html = await readFile(new URL(path, publicRoot), "utf8");
    const match = html.match(/<header class="topbar">[\s\S]*?<\/header>/);
    if (!match) continue;
    const normalized = match[0].replace(/\s+/g, " ").replace(/> </g, "><");
    assert.equal(normalized, expected, `Unexpected top navigation in ${path}`);
    checked += 1;
  }
  assert.equal(checked, 41);
});
