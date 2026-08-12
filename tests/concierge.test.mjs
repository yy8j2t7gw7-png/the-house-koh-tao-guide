import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
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
        queue: [], approved: [], recent: []
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
          return data
            ? new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } })
            : new Response("Not found", { status: 404 });
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
  assert.equal(diving.actions[0].href, "/activity.html?id=roctopus-dive");
  assert.equal(diving.actions[1].route, "bookingWhatsapp");

  const barResponse = await handleConciergeRequest(
    guestRequest("Which bar do you recommend?"),
    env
  );
  const bar = await barResponse.json();
  assert.equal(bar.source, "approved");
  assert.equal(bar.intentId, "recommended_sunset_bar");
  assert.match(bar.answer, /Bamboo Beach Bar/);
  assert.equal(bar.actions[0].href, "/bar.html?id=bamboo-beach-bar");
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

test("main and room welcome pages make required registration prominent", async () => {
  const [home, room, canonicalRoom, registrationEntry, registrationForm] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/house/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/registration-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../public/passport-upload.html", import.meta.url), "utf8")
  ]);
  [home, room].forEach((html) => {
    assert.match(html, /Required guest registration/);
    assert.match(html, /Use Your Private Registration Link/);
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
    body: JSON.stringify({ room: "7", arrivalAt: "2026-08-13T07:00:00.000Z", expiresHours: 72 })
  }), env, "/api/concierge/admin/passport-links");
  const created = await createResponse.json();
  assert.equal(createResponse.status, 200);
  assert.match(created.welcomeUrl, /\/room\/7#registration=/);
  assert.match(created.uploadUrl, /\/passport-upload#token=/);
  assert.equal(new URL(created.uploadUrl).search, "");
  assert.match(created.reminderMessage, /TM30 Immigration registration/);
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
    body: JSON.stringify({ room: "5", arrivalAt: "2026-08-13T07:00:00.000Z", expiresHours: 24 })
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
