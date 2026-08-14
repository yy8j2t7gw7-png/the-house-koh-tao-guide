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
  handleStayAdminRequest,
  handleReservationSyncRequest,
  handleStayGuestRequest,
  listingRoomMap
} from "../src/stay-api.js";
import { handleMaintenanceGuestRequest } from "../src/maintenance-api.js";
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
    stayReservations: [],
    staySessions: [],
    registrationStatuses: new Map(),
    spareKeyEvents: [],
    spareKeyRotations: new Map(),
    maintenanceReports: [],
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
    async getStayOperationsOverview() {
      return {
        reservations: this.stayReservations.map(({ confirmationCodeHash, ...record }) => ({
          ...record,
          registrationStatus: this.registrationStatuses.get(record.id)?.status || "not_started"
        })),
        rotations: []
      };
    },
    async syncStayReservations(payload) {
      payload.records.forEach((record) => {
        const existing = this.stayReservations.find((item) => item.confirmationCodeHash === record.confirmationCodeHash);
        const value = {
          id: existing?.id || `stay_${crypto.randomUUID()}`,
          provider: payload.provider,
          listingId: payload.listingId,
          room: payload.room,
          status: record.status === "cancelled" ? "cancelled" : "confirmed",
          updatedAt: payload.syncedAt,
          ...record
        };
        if (existing) Object.assign(existing, value);
        else this.stayReservations.push(value);
      });
      return { ok: true, upserted: payload.records.length };
    },
    async getStayReservationByCodeHash(codeHash, room) {
      return this.stayReservations.find((item) => item.confirmationCodeHash === codeHash && item.room === room && item.status === "confirmed") || null;
    },
    async createVerifiedStaySession(record) { this.staySessions.push(record); return { ok: true }; },
    async getVerifiedStaySession(tokenHash, now) {
      const session = this.staySessions.find((item) => item.tokenHash === tokenHash && item.expiresAt > now && !item.revokedAt);
      if (!session) return null;
      const reservation = this.stayReservations.find((item) => item.id === session.reservationId);
      return reservation ? { ...session, ...reservation, reservationId: reservation.id, reservationStatus: reservation.status } : null;
    },
    async revokeVerifiedStaySession(tokenHash, now) {
      const session = this.staySessions.find((item) => item.tokenHash === tokenHash);
      if (session) session.revokedAt = now;
      return { ok: true };
    },
    async extendStayReservation(reservationId, checkOutDate, updatedAt) {
      const reservation = this.stayReservations.find((item) => item.id === reservationId && item.status === "confirmed");
      if (!reservation) return { ok: false, error: "reservation_not_found" };
      if (checkOutDate <= reservation.checkOutDate) return { ok: false, error: "checkout_must_be_later" };
      reservation.checkOutDate = checkOutDate;
      reservation.updatedAt = updatedAt;
      this.staySessions.filter((item) => item.reservationId === reservationId).forEach((item) => {
        item.expiresAt = `${checkOutDate}T04:00:00.000Z`;
      });
      return { ok: true, reservationId, checkOutDate, updatedAt };
    },
    async createAutomaticPassportUpload(record) {
      await this.createPassportUpload(record);
      this.passportRecords.at(-1).reservationId = record.reservationId;
      return { ok: true };
    },
    async setStayRegistrationStatus(reservationId, status, updatedAt) {
      this.registrationStatuses.set(reservationId, { status, updatedAt });
      return { ok: true };
    },
    async setStayRegistrationRequirement(reservationId, guestType, requiredPassports, updatedAt) {
      const receivedPassports = this.passportRecords.filter((item) => item.reservationId === reservationId && item.status === "uploaded").length;
      const status = guestType === "thai" ? "thai_exempt"
        : receivedPassports >= requiredPassports ? "passport_complete" : "passport_pending";
      const value = { guestType, requiredPassports, receivedPassports, status, updatedAt };
      this.registrationStatuses.set(reservationId, value);
      return { ok: true, ...value };
    },
    async getStayRegistrationStatus(reservationId) { return this.registrationStatuses.get(reservationId) || null; },
    async closePendingPassportLinksForReservation(reservationId, updatedAt) {
      this.passportRecords
        .filter((item) => item.reservationId === reservationId && item.status === "pending")
        .forEach((item) => Object.assign(item, { status: "deleted", deletedAt: updatedAt, objectKey: "" }));
      return { ok: true };
    },
    async markRegistrationFromPassport(passportId, updatedAt) {
      const passport = this.passportRecords.find((item) => item.id === passportId);
      if (!passport?.reservationId) return { ok: false };
      const current = this.registrationStatuses.get(passport.reservationId) || {};
      const receivedPassports = this.passportRecords.filter((item) => item.reservationId === passport.reservationId && item.status === "uploaded").length;
      const requiredPassports = Number(current.requiredPassports) || 1;
      const status = receivedPassports >= requiredPassports ? "passport_complete" : "passport_pending";
      this.registrationStatuses.set(passport.reservationId, { ...current, status, receivedPassports, updatedAt });
      return { ok: true, reservationId: passport.reservationId, status, requiredPassports, receivedPassports };
    },
    async getSpareKeyState(reservationId, room) {
      return {
        releasedForReservation: this.spareKeyEvents.some((item) => item.reservationId === reservationId && item.codeReleased),
        rotationRequired: this.spareKeyRotations.get(room) === true
      };
    },
    async recordSpareKeyEvent(record) {
      this.spareKeyEvents.push(record);
      if (record.codeReleased) this.spareKeyRotations.set(record.room, true);
      return { ok: true };
    },
    async claimSpareKeyRelease(record) {
      if (this.spareKeyRotations.get(record.room) === true) return { ok: false, error: "key_code_rotation_required" };
      if (this.spareKeyEvents.some((item) => item.reservationId === record.reservationId)) return { ok: false, error: "spare_key_already_released" };
      this.spareKeyEvents.push({ ...record, eventType: "notification_pending", feeAccepted: true, codeReleased: false, alertId: "" });
      this.spareKeyRotations.set(record.room, true);
      return { ok: true };
    },
    async finalizeSpareKeyRelease(record) {
      const target = this.spareKeyEvents.find((item) => item.id === record.id && !item.codeReleased);
      if (!target) return { ok: false, error: "claim_not_found" };
      Object.assign(target, record, { eventType: "verified_after_hours_release", codeReleased: true });
      this.spareKeyRotations.set(record.room, true);
      return { ok: true };
    },
    async cancelSpareKeyClaim(id) {
      const index = this.spareKeyEvents.findIndex((item) => item.id === id && !item.codeReleased);
      if (index >= 0) {
        const room = this.spareKeyEvents[index].room;
        this.spareKeyEvents.splice(index, 1);
        this.spareKeyRotations.set(room, false);
      }
      return { ok: true };
    },
    async confirmSpareKeyRotation(room, rotationConfirmedAt) {
      this.spareKeyRotations.set(room, false);
      return { ok: true, room, rotationConfirmedAt };
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
    async cleanupPassportUploads() { return { records: [] }; },
    async createMaintenanceReport(record) {
      this.maintenanceReports.push({ ...record, status: "open", photoDeletedAt: "", resolvedAt: "" });
      return { ok: true };
    },
    async getMaintenanceReport(id) { return this.maintenanceReports.find((item) => item.id === id) || null; },
    async deleteMaintenancePhoto(id, now) {
      const target = this.maintenanceReports.find((item) => item.id === id);
      if (target) Object.assign(target, { photoObjectKey: "", photoDeletedAt: now });
      return { ok: Boolean(target) };
    },
    async cleanupMaintenanceReports(now) {
      return { records: this.maintenanceReports.filter((item) => item.photoObjectKey && item.deleteAfter <= now) };
    },
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
      STAY_TOKEN_PEPPER: "stay_test_pepper_5500",
      RESERVATION_SYNC_TOKEN: "reservation_sync_test_5500",
      PASSPORT_RETENTION_DAYS: "14",
      OPENAI_MODEL: "gpt-5.6",
      OPENAI_REASONING_EFFORT: "medium",
      GUEST_ACCESS_ENFORCEMENT: "false",
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
      room: "6",
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
  assert.equal(store.interactions[0].room, "6");
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

test("public concierge protects private knowledge, reminds every non-Thai guest and still creates emergency alerts", async () => {
  const { env, store } = createEnvironment({ GUEST_ACCESS_ENFORCEMENT: "true" });
  const privateQuestion = await handleConciergeRequest(guestRequest("What is the Wi-Fi password?", { room: "2" }), env);
  const privateBody = await privateQuestion.json();
  assert.equal(privateBody.intentId, "stay_verification_required");
  assert.match(privateBody.answer, /every non-Thai guest/i);
  assert.doesNotMatch(privateBody.answer, /house12345/i);

  const emergency = await handleConciergeRequest(guestRequest("I had a serious accident", { room: "2" }), env);
  const emergencyBody = await emergency.json();
  assert.equal(emergencyBody.intentId, "public_medical_emergency");
  assert.equal(emergencyBody.handoff, "medical_emergency");
  assert.match(emergencyBody.answer, /Koh Tao Rescue.*1669/s);
  assert.equal(store.alerts.length, 1);
  assert.equal(store.alerts[0].alertType, "medical_emergency");
  assert.equal(store.alerts[0].roomVerified, false);
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
  assert.match(home, /Required registration for non-Thai guests/);
  [home, room].forEach((html) => {
    assert.match(html, /TM30 Immigration/);
    assert.match(html, /automatically deleted 14 days after upload/);
    assert.doesNotMatch(html, /data-concierge-prompt="I need my secure passport registration link\."/);
    assert.doesNotMatch(html, /href="\/passport-upload(?:\.html)?"/);
  });
  assert.match(home, /Open my Room page/);
  assert.match(room, /Verify your stay/);
  assert.match(room, /Stay confirmation code/);
  assert.match(room, /Upload passport securely/);
  assert.match(room, /All overnight guests are Thai nationals/);
  assert.match(room, /Show my spare-key code/);
  assert.match(room, /id="openSpareKeyAccess"/);
  assert.match(room, /Secure after-hours help if you cannot enter your room/);
  assert.ok(room.indexOf('id="openSpareKeyAccess"') < room.indexOf('id="spareKeyAccess"'));
  assert.match(room, /id="spareKeyAccess"[^>]*hidden/);
  assert.match(room, /id="lostKeyConfirmationCode"/);
  assert.match(room, /Re-enter the Airbnb HM code or private House stay code provided to you/);
  assert.match(room, /src="\/registration-entry\.js"/);
  assert.match(registrationEntry, /\/api\/stay\/verify/);
  assert.match(registrationEntry, /\/api\/stay\/passport-link/);
  assert.match(registrationEntry, /\/api\/stay\/spare-key/);
  assert.match(registrationEntry, /JSON\.stringify\(\{ confirmationCode, feeAccepted: true \}\)/);
  assert.doesNotMatch(registrationEntry, /spareKeySection\.hidden = false;\s*if \(spareKeyForm\)/);
  assert.match(registrationEntry, /spareKeyTrigger\?\.addEventListener\("click", \(event\) =>/);
  assert.doesNotMatch(registrationEntry, /HOUSE_PRIVATE_REGISTRATION_URL/);
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
  assert.match(runtime, /houseGuideTranslations:v5\.11\.0:/);
  assert.match(runtime, /MAX_REQUEST_RETRIES = 2/);
  assert.match(runtime, /let flushRunning = false/);
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
    "You do not need to upload a passport for this registration. Please tell The House so the unused request can be closed.",
    "Airbnb confirmation code for this lost-key request",
    "Re-enter the Airbnb confirmation code for your verified active stay before continuing.",
    "That confirmation code does not match your verified active stay. Check the HM code shown in your Airbnb trip details and try again."
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
          "Thank you. I’ll use Room 1 for this conversation.",
          "This TM30 Immigration accommodation registration applies only to non-Thai guests. Thai nationals do not need to upload a passport.",
          "My private guest message"
        ]
      })
    });
    const response = await handleTranslationRequest(request, env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(body.translations[0], /^Deutsch: Welcome to Room 1$/);
    assert.match(body.translations[1], /^Deutsch: Room 1 · Upstairs$/);
    assert.match(body.translations[2], /^Deutsch: Thank you\. I’ll use Room 1/);
    assert.match(body.translations[3], /^Deutsch: This TM30 Immigration accommodation registration/);
    assert.equal(body.translations[4], null);
    assert.equal(body.untranslated, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("large page translation batches split and recover instead of leaving lower sections in English", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  const modelBatchSizes = [];
  globalThis.fetch = async (_url, options) => {
    const modelRequest = JSON.parse(options.body);
    const entries = JSON.parse(modelRequest.input[0].content).entries;
    modelBatchSizes.push(entries.length);
    if (entries.length > 2) return new Response("temporary model failure", { status: 502 });
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
    const texts = [
      "Your personal guest guide for The House – Koh Tao.",
      "Find My Room",
      "Arrival photos and self check-in instructions.",
      "House Information",
      "Rules, towels, laundry, parking, water and more.",
      "Practical Information",
      "Taxi, ferries, laundry, ATMs and shops."
    ];
    const request = new Request("https://guide.example/api/i18n/translate", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.10" },
      body: JSON.stringify({ language: "de", page: "/room/2", texts })
    });
    const response = await handleTranslationRequest(request, env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.retryable, []);
    assert.equal(body.untranslated, 0);
    assert.equal(body.translations.length, texts.length);
    body.translations.forEach((translation) => assert.match(translation, /^Deutsch: /));
    assert.ok(modelBatchSizes.some((size) => size > 2));
    assert.ok(modelBatchSizes.some((size) => size <= 2));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("one failing translation is isolated and explicitly marked for browser retry", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const modelRequest = JSON.parse(options.body);
    const entries = JSON.parse(modelRequest.input[0].content).entries;
    if (entries.some((entry) => entry.text === "House Information")) {
      return new Response("temporary model failure", { status: 502 });
    }
    return new Response(JSON.stringify({
      output: [{
        type: "message",
        content: [{
          type: "output_text",
          text: JSON.stringify({
            translations: entries.map((entry) => ({ id: entry.id, text: `Français : ${entry.text}` }))
          })
        }]
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const request = new Request("https://guide.example/api/i18n/translate", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.11" },
      body: JSON.stringify({
        language: "fr",
        page: "/room/2",
        texts: ["Find My Room", "House Information", "Practical Information"]
      })
    });
    const response = await handleTranslationRequest(request, env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(body.translations[0], /^Français : /);
    assert.equal(body.translations[1], null);
    assert.match(body.translations[2], /^Français : /);
    assert.deepEqual(body.retryable, [1]);
    assert.equal(body.untranslated, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("every static text and accessibility label on live operational pages is translation-approved", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const modelRequest = JSON.parse(options.body);
    const entries = JSON.parse(modelRequest.input[0].content).entries;
    return new Response(JSON.stringify({
      output: [{
        type: "message",
        content: [{
          type: "output_text",
          text: JSON.stringify({
            translations: entries.map((entry) => ({ id: entry.id, text: `Español: ${entry.text}` }))
          })
        }]
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const pages = [
    ["index.html", "/"],
    ["rooms.html", "/room"],
    ["room.html", "/room/2"],
    ["house.html", "/house.html"],
    ["practical.html", "/practical.html"],
    ["emergency.html", "/emergency.html"],
    ["checkout.html", "/checkout.html"],
    ["passport-upload.html", "/passport-upload"]
  ];

  try {
    for (const [filename, page] of pages) {
      const html = await readFile(new URL(`../public/${filename}`, import.meta.url), "utf8");
      const withoutCode = html
        .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[\s\S]*?<\/style>/gi, " ");
      const visible = withoutCode.replace(/<[^>]+>/g, "\n");
      const attributes = [...withoutCode.matchAll(/(?:placeholder|aria-label|title|alt|content)="([^"]+)"/gi)]
        .map((match) => match[1]);
      const texts = [...new Set([...visible.split(/\n+/), ...attributes]
        .map((value) => value
          .replaceAll("&amp;", "&")
          .replaceAll("&quot;", '"')
          .replaceAll("&#39;", "'")
          .replaceAll("&apos;", "'")
          .replaceAll("&lt;", "<")
          .replaceAll("&gt;", ">")
          .trim())
        .filter((value) => value && /[A-Za-z]/.test(value) && value.length <= 1800))];

      for (let offset = 0; offset < texts.length; offset += 24) {
        const batch = texts.slice(offset, offset + 24);
        const request = new Request("https://guide.example/api/i18n/translate", {
          method: "POST",
          headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.12" },
          body: JSON.stringify({ language: "es", page, texts: batch })
        });
        const response = await handleTranslationRequest(request, env);
        const body = await response.json();
        assert.equal(response.status, 200, `${filename}: ${JSON.stringify(body)}`);
        const rejected = batch.filter((_text, index) => body.translations[index] === null);
        assert.deepEqual(rejected, [], `${filename} contains unapproved text: ${rejected.join(" | ")}`);
      }
    }
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
      guestRequest("There is water leakage in my room", { room: "6" }),
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
    assert.match(capturedRequest.instructions, /Room 6/);
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
  assert.match(body.answer, /permanent Room page/);
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
    body: JSON.stringify({ room: "6", arrivalAt: "2026-08-13T07:00:00.000Z", expiresHours: 72, nonThaiConfirmed: true })
  }), env, "/api/concierge/admin/passport-links");
  const created = await createResponse.json();
  assert.equal(createResponse.status, 200);
  assert.equal(created.welcomeUrl, "https://guide.example/room/6");
  assert.match(created.uploadUrl, /\/passport-upload#token=/);
  assert.equal(new URL(created.uploadUrl).search, "");
  assert.match(created.reminderMessage, /TM30 Immigration accommodation registration applies only to non-Thai guests/);
  assert.match(created.reminderMessage, /Thai nationals do not need/);
  assert.match(created.reminderMessage, /private, single-use secure form/);
  assert.match(created.reminderMessage, /\/passport-upload#token=/);
  const token = new URL(created.uploadUrl).hash.replace("#token=", "");

  const sessionResponse = await handlePassportGuestRequest(new Request("https://guide.example/api/passport-upload/session", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` }
  }), env, "/api/passport-upload/session");
  const session = await sessionResponse.json();
  assert.equal(session.room, "6");
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
  assert.equal(uploaded.room, "6");
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

test("Airbnb reservation sync fixes each listing to its verified room and hashes confirmation codes", async () => {
  const { env, store } = createEnvironment();
  const sync = await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: {
      authorization: "Bearer reservation_sync_test_5500",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      room: "2",
      listingId: "1349840459014476583",
      complete: false,
      records: [{ confirmationCode: "HMABC12345", checkInDate: "2026-08-13", checkOutDate: "2026-08-15" }]
    })
  }), env);
  assert.equal(sync.status, 200);
  assert.equal(store.stayReservations.length, 1);
  assert.equal(store.stayReservations[0].room, "2");
  assert.notEqual(store.stayReservations[0].confirmationCodeHash, "HMABC12345");
  assert.doesNotMatch(JSON.stringify(store.stayReservations), /HMABC12345/);

  const mismatch = await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({
      room: "3",
      listingId: "1349840459014476583",
      records: [{ confirmationCode: "HMMISMATCH1", checkInDate: "2026-08-13", checkOutDate: "2026-08-15" }]
    })
  }), env);
  assert.equal(mismatch.status, 400);
  assert.equal((await mismatch.json()).error, "listing_room_mismatch");
  assert.equal(listingRoomMap["1349840459014476583"], "2");
  assert.equal(Object.values(listingRoomMap).includes("7"), false);
});

test("verified Airbnb stay creates its own passport form and prevents nationality downgrade", async () => {
  const { env, store } = createEnvironment();
  await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({
      room: "1",
      listingId: "1376393324098439141",
      records: [{ confirmationCode: "HMROOM1234", checkInDate: "2026-08-13", checkOutDate: "2026-08-15" }]
    })
  }), env);

  const wrongRoom = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "2", confirmationCode: "HMROOM1234" })
  }), env, "/api/stay/verify", null, new Date("2026-08-13T08:00:00.000Z"));
  assert.equal(wrongRoom.status, 404);

  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "1", confirmationCode: "HMROOM1234" })
  }), env, "/api/stay/verify", null, new Date("2026-08-13T08:00:00.000Z"));
  assert.equal(verified.status, 200);
  const cookie = verified.headers.get("set-cookie").split(";")[0];
  assert.match(verified.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);

  const foreignRegistration = await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "foreign", nonThaiGuestCount: 1, allNonThaiGuestsIncluded: true })
  }), env, "/api/stay/nationality");
  assert.equal(foreignRegistration.status, 200);

  const passportLink = await handleStayGuestRequest(new Request("https://guide.example/api/stay/passport-link", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: "{}"
  }), env, "/api/stay/passport-link");
  const passport = await passportLink.json();
  assert.equal(passportLink.status, 200);
  assert.match(passport.uploadUrl, /^https:\/\/guide\.example\/passport-upload#token=/);
  assert.equal(store.passportRecords.at(-1).reservationId, store.stayReservations[0].id);

  const unconfirmedExemption = await handleStayGuestRequest(new Request("https://guide.example/api/stay/thai-exemption", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: "{}"
  }), env, "/api/stay/thai-exemption");
  assert.equal(unconfirmedExemption.status, 400);
  assert.equal((await unconfirmedExemption.json()).error, "all_thai_confirmation_required");

  const exempt = await handleStayGuestRequest(new Request("https://guide.example/api/stay/thai-exemption", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ allGuestsThai: true })
  }), env, "/api/stay/thai-exemption");
  assert.equal(exempt.status, 409);
  assert.equal((await exempt.json()).error, "guest_type_change_requires_staff");
  assert.equal(store.registrationStatuses.get(store.stayReservations[0].id).status, "passport_pending");
});

test("private guide stays locked until every declared non-Thai overnight guest passport is submitted", async () => {
  const { env } = createEnvironment();
  await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({
      room: "2",
      listingId: "1349840459014476583",
      records: [{ confirmationCode: "HMALLGUESTS2", checkInDate: "2026-08-13", checkOutDate: "2026-08-15" }]
    })
  }), env);
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "2", confirmationCode: "HMALLGUESTS2" })
  }), env, "/api/stay/verify", null, new Date("2026-08-13T08:00:00.000Z"));
  const cookie = verified.headers.get("set-cookie").split(";")[0];

  const unconfirmedCount = await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "foreign", nonThaiGuestCount: 2 })
  }), env, "/api/stay/nationality");
  assert.equal(unconfirmedCount.status, 400);
  assert.equal((await unconfirmedCount.json()).error, "all_non_thai_guests_confirmation_required");

  const registration = await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "foreign", nonThaiGuestCount: 2, allNonThaiGuestsIncluded: true })
  }), env, "/api/stay/nationality");
  assert.equal((await registration.json()).requiredPassports, 2);
  const reducedCount = await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "foreign", nonThaiGuestCount: 1, allNonThaiGuestsIncluded: true })
  }), env, "/api/stay/nationality");
  assert.equal(reducedCount.status, 409);
  assert.equal((await reducedCount.json()).error, "passport_requirement_cannot_be_reduced");

  const uploadPassport = async () => {
    const linkResponse = await handleStayGuestRequest(new Request("https://guide.example/api/stay/passport-link", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: "{}"
    }), env, "/api/stay/passport-link");
    const token = new URL((await linkResponse.json()).uploadUrl).hash.replace("#token=", "");
    const jpeg = new Uint8Array(1024);
    jpeg.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const response = await handlePassportGuestRequest(new Request("https://guide.example/api/passport-upload", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "image/jpeg" },
      body: jpeg
    }), env, "/api/passport-upload");
    return response.json();
  };

  const first = await uploadPassport();
  assert.equal(first.receivedPassports, 1);
  assert.equal(first.requiredPassports, 2);
  assert.equal(first.accessGranted, false);
  const pending = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=2", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status");
  assert.equal((await pending.json()).accessGranted, false);

  const second = await uploadPassport();
  assert.equal(second.receivedPassports, 2);
  assert.equal(second.requiredPassports, 2);
  assert.equal(second.accessGranted, true);
  const complete = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=2", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status");
  assert.equal((await complete.json()).accessGranted, true);
});

test("Worker routing keeps the room guide, photos and private knowledge behind completed registration", async () => {
  const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(source, /const page = access\.accessGranted \? "\/room\.html" : "\/room-access\.html"/);
  assert.match(source, /PRIVATE_DIRECT_ASSET\.test\(url\.pathname\) \|\| PRIVATE_ROOM_PHOTO\.test\(url\.pathname\)/);
  assert.match(source, /access\.accessGranted \? roomAsset\(request, env, PRIVATE_KNOWLEDGE_PATH\) : notFound\(\)/);
  assert.match(source, /headers\.set\("cache-control", "private, no-store, max-age=0"\)/);
});

test("Durable Object SQLite schema initializes every operational table used by admin and scheduled jobs", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const source = await readFile(new URL("../src/concierge-store.js", import.meta.url), "utf8");
  const executable = source
    .replace('import { DurableObject } from "cloudflare:workers";', "class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }")
    .replace("export class ConciergeStore", "class ConciergeStore")
    .concat("\nexport { ConciergeStore };\n");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(executable).toString("base64")}`;
  const { ConciergeStore } = await import(moduleUrl);
  const database = new DatabaseSync(":memory:");
  let initialization;
  const sql = {
    exec(statement, ...values) {
      const normalized = String(statement).trim();
      if (values.length || /^(?:SELECT|WITH|PRAGMA)\b/i.test(normalized)) {
        return database.prepare(statement).all(...values);
      }
      database.exec(statement);
      return [];
    }
  };
  const ctx = {
    storage: { sql },
    blockConcurrencyWhile(callback) { initialization = callback(); return initialization; }
  };
  const store = new ConciergeStore(ctx, {});
  await initialization;

  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
  for (const required of [
    "concierge_alerts",
    "concierge_alert_deliveries",
    "maintenance_reports",
    "stay_reservations",
    "stay_checkout_overrides",
    "verified_stay_sessions",
    "stay_registration_requirements",
    "spare_key_events",
    "spare_key_room_state",
    "translation_cache"
  ]) assert.ok(tables.includes(required), `${required} was not initialized`);

  const overview = await store.getAdminOverview();
  assert.equal(overview.totals.openAlerts, 0);
  assert.deepEqual(await store.getDueAlertEscalations(new Date().toISOString()), []);
  const synced = await store.syncStayReservations({
    room: "2",
    listingId: "1349840459014476583",
    provider: "airbnb",
    syncId: "local-schema-test",
    syncedAt: "2026-08-13T08:00:00.000Z",
    records: [{
      confirmationCodeHash: "local_schema_confirmation_hash",
      checkInDate: "2026-08-13",
      checkOutDate: "2026-08-15",
      status: "confirmed",
      sourceRefHash: "local_schema_source_hash"
    }]
  });
  assert.equal(synced.upserted, 1);
  assert.equal((await store.getStayOperationsOverview()).reservations.length, 1);
  database.close();
});

test("a verified session stops granting access when a synchronized reservation checkout is shortened", async () => {
  const { env } = createEnvironment();
  const sync = (checkOutDate) => handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({
      room: "2",
      listingId: "1349840459014476583",
      records: [{ confirmationCode: "HMSHORTENED2", checkInDate: "2026-08-10", checkOutDate }]
    })
  }), env);
  await sync("2026-08-20");
  const verifiedAt = new Date("2026-08-13T08:00:00.000Z");
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "2", confirmationCode: "HMSHORTENED2" })
  }), env, "/api/stay/verify", null, verifiedAt);
  const cookie = verified.headers.get("set-cookie").split(";")[0];

  await sync("2026-08-13");
  const expired = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=2", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status", null, new Date("2026-08-13T08:01:00.000Z"));
  assert.equal((await expired.json()).verified, false);
});

test("direct and walk-in stays receive a one-time House code and active stays can be extended", async () => {
  const { env, store } = createEnvironment();
  const created = await handleStayAdminRequest(new Request("https://guide.example/api/concierge/admin/direct-stays", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ room: "3", checkInDate: "2026-08-14", checkOutDate: "2026-08-16" })
  }), env, "/api/concierge/admin/direct-stays", store);
  assert.equal(created.status, 200);
  const direct = await created.json();
  assert.match(direct.confirmationCode, /^HS[23456789A-HJ-NP-Z]{10}$/);
  assert.equal(direct.welcomeUrl, "https://guide.example/room/3");
  assert.equal(store.stayReservations[0].provider, "direct");
  assert.notEqual(store.stayReservations[0].confirmationCodeHash, direct.confirmationCode);

  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "3", confirmationCode: direct.confirmationCode })
  }), env, "/api/stay/verify", null, new Date("2026-08-14T08:00:00.000Z"));
  assert.equal(verified.status, 200);

  const extended = await handleStayAdminRequest(new Request("https://guide.example/api/concierge/admin/stay-extension", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, checkOutDate: "2026-08-19" })
  }), env, "/api/concierge/admin/stay-extension", store);
  assert.equal(extended.status, 200);
  assert.equal(store.stayReservations[0].checkOutDate, "2026-08-19");
});

test("owner operations separates active and upcoming stays and labels manual recovery clearly", async () => {
  const html = await readFile(new URL("../public/concierge-admin.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../public/concierge-admin.js", import.meta.url), "utf8");
  assert.match(html, /<h3>Active stays<\/h3>/);
  assert.match(html, /<h3>Upcoming stays<\/h3>/);
  assert.match(html, />Add missing reservation<\/button>/);
  assert.match(html, />Create direct stay<\/button>/);
  assert.match(html, /House stay code \(shown once\)/);
  assert.doesNotMatch(html, /Upcoming and active reservations|Add fallback stay/);
  assert.match(script, /data-extension-action/);
  assert.match(script, /\/api\/concierge\/admin\/direct-stays/);
  assert.match(script, /\/api\/concierge\/admin\/stay-extension/);
});

test("verified guests can report routine and critical room problems with protected routing", async () => {
  const { env, store, passportBucket } = createEnvironment();
  await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({
      room: "2",
      listingId: "1349840459014476583",
      records: [{ confirmationCode: "HMREPORT22", checkInDate: "2026-08-13", checkOutDate: "2026-08-18" }]
    })
  }), env);
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "2", confirmationCode: "HMREPORT22" })
  }), env, "/api/stay/verify", null, new Date("2026-08-14T08:00:00.000Z"));
  const cookie = verified.headers.get("set-cookie").split(";")[0];
  await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "thai", allGuestsThai: true })
  }), env, "/api/stay/nationality", null, new Date("2026-08-14T08:01:00.000Z"));

  const blockedCritical = new FormData();
  blockedCritical.set("issueType", "active_water_leak");
  const blocked = await handleMaintenanceGuestRequest(new Request("https://guide.example/api/maintenance/report", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie },
    body: blockedCritical
  }), env);
  assert.equal(blocked.status, 400);
  assert.equal((await blocked.json()).error, "reply_contact_required");

  const routineForm = new FormData();
  routineForm.set("issueType", "wifi_problem");
  routineForm.set("details", "Wi-Fi disconnects near the bed.");
  const png = new Uint8Array(200);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  routineForm.set("photo", new Blob([png], { type: "image/png" }), "room.png");
  const routine = await handleMaintenanceGuestRequest(new Request("https://guide.example/api/maintenance/report", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie },
    body: routineForm
  }), env);
  assert.equal(routine.status, 200);
  assert.equal(store.alerts.at(-1).recipientGroup, "support");
  assert.ok([...passportBucket.objects.keys()].some((key) => key.startsWith("maintenance/")));

  const criticalForm = new FormData();
  criticalForm.set("issueType", "electrical_danger");
  criticalForm.set("details", "Burning smell beside the wall switch.");
  criticalForm.set("replyContact", "+66 81 234 5678");
  Object.assign(env, {
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ emergency: [{ label: "Duty team", phone: "+66 81 000 0002" }] }),
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "meta-secret-test"
  });
  const originalFetch = globalThis.fetch;
  let whatsappPayload;
  globalThis.fetch = async (_url, options) => {
    whatsappPayload = JSON.parse(options.body);
    return new Response(JSON.stringify({ messages: [{ id: "wamid.maintenance" }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const critical = await handleMaintenanceGuestRequest(new Request("https://guide.example/api/maintenance/report", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie },
      body: criticalForm
    }), env);
    assert.equal(critical.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(store.alerts.at(-1).recipientGroup, "emergency");
  assert.doesNotMatch(store.alerts.at(-1).summary, /66812345678|81 234 5678/);
  assert.equal("privateReplyContact" in store.alerts.at(-1), false);
  assert.match(whatsappPayload.template.components[0].parameters[4].text, /Guest reply: \+66812345678/);
  assert.equal(store.maintenanceReports.length, 2);
});

test("after-hours spare-key release freshly verifies the active reservation, confirms the fee and never alerts either code", async () => {
  const { env, store } = createEnvironment({
    SPARE_KEY_CODES: JSON.stringify({ "1": "8642" }),
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ urgent: [{ label: "Su", phone: "+66 64 000 0001" }] }),
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test"
  });
  await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ room: "1", listingId: "1376393324098439141", records: [{ confirmationCode: "HMKEY12345", checkInDate: "2026-08-13", checkOutDate: "2026-08-15" }] })
  }), env);
  const afterHours = new Date("2026-08-13T14:00:00.000Z");
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "1", confirmationCode: "HMKEY12345" })
  }), env, "/api/stay/verify", null, afterHours);
  const cookie = verified.headers.get("set-cookie").split(";")[0];

  await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "thai", allGuestsThai: true })
  }), env, "/api/stay/nationality", null, afterHours);

  const missingFreshCode = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ feeAccepted: false })
  }), env, "/api/stay/spare-key", null, afterHours);
  assert.equal(missingFreshCode.status, 400);
  assert.equal((await missingFreshCode.json()).error, "fresh_confirmation_required");

  const wrongFreshCode = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ confirmationCode: "HMWRONG999", feeAccepted: true })
  }), env, "/api/stay/spare-key", null, afterHours);
  assert.equal(wrongFreshCode.status, 403);
  assert.equal((await wrongFreshCode.json()).error, "confirmation_code_mismatch");

  const noFee = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ confirmationCode: "HMKEY12345", feeAccepted: false })
  }), env, "/api/stay/spare-key", null, afterHours);
  assert.equal(noFee.status, 400);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: "wamid.key-release" }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    const released = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: JSON.stringify({ confirmationCode: "HMKEY12345", feeAccepted: true })
    }), env, "/api/stay/spare-key", null, afterHours);
    const body = await released.json();
    assert.equal(body.keyBoxCode, "8642");
    assert.equal(body.lostKeyFeeThb, 500);
    assert.equal(body.teamNotificationSubmitted, true);
    assert.equal(released.headers.get("cache-control"), "no-store, max-age=0");
    assert.equal(store.spareKeyEvents[0].feeAccepted, true);
    assert.equal(store.spareKeyRotations.get("1"), true);
    assert.equal(store.alerts[0].roomVerified, true);
    assert.doesNotMatch(JSON.stringify(store.alerts), /8642/);
    assert.doesNotMatch(JSON.stringify(store.alerts), /HMKEY12345/);

    const repeated = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: JSON.stringify({ confirmationCode: "HMKEY12345", feeAccepted: true })
    }), env, "/api/stay/spare-key", null, afterHours);
    assert.equal(repeated.status, 409);
    assert.equal((await repeated.json()).error, "key_code_rotation_required");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("spare-key release automatically notifies the team and fails safely when WhatsApp submission fails", async () => {
  const { env, store } = createEnvironment({
    SPARE_KEY_CODES: JSON.stringify({ "2": "9753" }),
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ urgent: [
      { label: "Su", phone: "+66 64 000 0001" },
      { label: "Owner", phone: "+66 64 000 0002" }
    ] }),
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test"
  });
  await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ room: "2", listingId: "1349840459014476583", records: [{ confirmationCode: "HMKEYFAIL2", checkInDate: "2026-08-13", checkOutDate: "2026-08-15" }] })
  }), env);
  const afterHours = new Date("2026-08-13T14:00:00.000Z");
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "2", confirmationCode: "HMKEYFAIL2" })
  }), env, "/api/stay/verify", null, afterHours);
  const cookie = verified.headers.get("set-cookie").split(";")[0];

  await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "thai", allGuestsThai: true })
  }), env, "/api/stay/nationality", null, afterHours);

  const originalFetch = globalThis.fetch;
  let automaticAttempts = 0;
  globalThis.fetch = async () => {
    automaticAttempts += 1;
    return new Response(JSON.stringify({ error: { code: 131000 } }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const failed = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: JSON.stringify({ confirmationCode: "HMKEYFAIL2", feeAccepted: true })
    }), env, "/api/stay/spare-key", null, afterHours);
    assert.equal(automaticAttempts, 2);
    assert.equal(failed.status, 503);
    assert.equal((await failed.json()).error, "team_notification_failed");
    assert.equal(store.spareKeyEvents.length, 0);
    assert.equal(store.spareKeyRotations.get("2"), false);
    assert.doesNotMatch(JSON.stringify(store.alerts), /9753/);
  } finally {
    globalThis.fetch = originalFetch;
  }
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
  assert.equal(checked, 43);
});
