import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import vm from "node:vm";
import {
  handleAdminRequest,
  handleConciergeRequest,
  handleEmergencyContactRequest,
  handleFeedbackRequest,
  housekeepingServiceResult
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
import { classifyConciergeAlert, isAfterHours, normalizeBangkokRequestedDate, safeAlertSummary } from "../src/alert-policy.js";
import {
  createConciergeAlert,
  handleWhatsAppWebhook,
  houseEmergencyContact,
  processDueAlertEscalations,
  whatsappAlertConfiguration
} from "../src/whatsapp-alerts.js";
import { servePublicLegalPage } from "../src/public-legal.js";
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
          registrationStatus: this.registrationStatuses.get(record.id)?.status || "not_started",
          guestType: this.registrationStatuses.get(record.id)?.guestType || "",
          requiredPassports: this.registrationStatuses.get(record.id)?.requiredPassports || 0,
          receivedPassports: this.registrationStatuses.get(record.id)?.receivedPassports || 0
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
    async setInPersonRegistrationStatus(reservationId, status, updatedAt) {
      const current = this.registrationStatuses.get(reservationId);
      if (!current || current.guestType !== "foreign" || Number(current.requiredPassports) < 1) {
        return { ok: false, error: "foreign_registration_required" };
      }
      if (status === "in_person_complete" && current.status !== "in_person_pending") {
        return { ok: false, error: "in_person_handover_not_requested" };
      }
      if (!["in_person_pending", "in_person_complete"].includes(status)) {
        return { ok: false, error: "invalid_registration_status" };
      }
      const value = { ...current, status, updatedAt };
      this.registrationStatuses.set(reservationId, value);
      return { ok: true, ...value };
    },
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
    async getAlert(id) { return this.alerts.find((alert) => alert.id === id) || null; },
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
  assert.equal(body.actions[0].type, "spare-key");
  assert.equal(body.actions[0].label, "Secure spare-key access");
  assert.equal(body.source, "approved");
  assert.match(body.interactionId, /^int_/);
  assert.equal(store.interactions[0].room, "6");
  assert.equal(store.interactions[0].learningGap, false);
});

test("medical emergencies offer Koh Tao Rescue first and 1669 second", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const response = await handleConciergeRequest(guestRequest("I had an accident"), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.intentId, "medical_emergency");
  assert.equal(body.handoff, "medical_emergency");
  assert.match(body.answer, /Koh Tao Rescue first/i);
  assert.match(body.answer, /1669/);
  assert.equal(body.actions[0].route, "rescueCall");
  assert.equal(body.actions[1].route, "medicalNationalCall");
  assert.equal(body.actions[2].action, "confirm_urgent_medical");
  assert.equal(body.actions[2].label, "Send urgent alert");
  assert.equal(store.alerts.length, 0);
});

test("public concierge protects private knowledge and never sends medical alerts without confirmation", async () => {
  const { env, store } = createEnvironment({ GUEST_ACCESS_ENFORCEMENT: "true" });
  const privateQuestion = await handleConciergeRequest(guestRequest("What is the Wi-Fi password?", { room: "2" }), env);
  const privateBody = await privateQuestion.json();
  assert.equal(privateBody.intentId, "stay_verification_required");
  assert.match(privateBody.answer, /every non-Thai guest/i);
  assert.doesNotMatch(privateBody.answer, /house12345/i);

  const emergency = await handleConciergeRequest(guestRequest("I had a serious accident", { room: "2" }), env);
  const emergencyBody = await emergency.json();
  assert.equal(emergencyBody.intentId, "medical_emergency");
  assert.equal(emergencyBody.handoff, "medical_emergency");
  assert.match(emergencyBody.answer, /Koh Tao Rescue.*1669/s);
  assert.equal(emergencyBody.actions[2].action, "confirm_urgent_medical");
  assert.equal(store.alerts.length, 0);
});

test("activity booking uses guest-service wording and starts the structured Concierge flow", async () => {
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
  assert.equal(body.actions[0].type, "prompt");
  assert.equal(body.actions[0].prompt, "I would like to make a booking.");
  assert.equal(body.actions[1].route, "houseCall");
  assert.equal(body.actions.some((action) => action.route === "bookingWhatsapp"), false);
});

test("luggage storage guidance states every available window without promising early-morning storage", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const response = await handleConciergeRequest(
    guestRequest("Can I store my luggage after checkout?"),
    env
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.intentId, "luggage_storage");
  assert.match(body.answer, /Tuesday–Sunday/);
  assert.match(body.answer, /office working hours/);
  assert.match(body.answer, /Bamboo Beach Bar from 11:00 AM/);
  assert.match(body.answer, /do not currently have luggage storage for early-morning arrivals before 11:00 AM/);
  assert.equal(body.actions[0].href, "/checkout.html");
});

test("an actionable luggage request routes to Su and owners with the dedicated production template", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "not-used",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66 64 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const originalFetch = globalThis.fetch;
  const payloads = [];
  globalThis.fetch = async (_url, options) => {
    payloads.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: "wamid.luggage" }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const pending = await handleConciergeRequest(
      guestRequest("Please arrange luggage storage after checkout at 3 pm for 2 bags."),
      env
    );
    const pendingBody = await pending.json();
    assert.match(pendingBody.answer, /What WhatsApp or phone number/);
    assert.equal(store.alerts.length, 0);
    const response = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      history: [{ role: "user", content: "Please arrange luggage storage after checkout at 3 pm for 2 bags." }, { role: "assistant", content: pendingBody.answer }]
    }), env);
    const body = await response.json();
    assert.equal(body.intentId, "luggage_storage");
    assert.equal(body.needsHuman, true);
    assert.equal(body.handoff, "stay_support");
    assert.equal(store.alerts.at(-1).recipientGroup, "support_with_owners");
    assert.match(body.answer, /sent to The House team/);
    assert.deepEqual(body.actions, []);
    assert.equal(payloads.length, 3);
    assert.deepEqual(payloads.map((item) => item.to).sort(), ["66640000001", "66810000002", "66820000003"]);
    assert.equal(payloads.every((item) => item.template.name === "house_luggage_alert_v1"), true);
    assert.equal(payloads[0].template.components[0].parameters[2].text, "Departure");
    assert.equal(payloads[0].template.components[0].parameters[3].text, "2");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a vague actionable luggage request collects every required field before creating an alert", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const response = await handleConciergeRequest(guestRequest("I wanna store my luggage"), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.intentId, "luggage_storage");
  assert.equal(body.needsHuman, false);
  assert.match(body.answer, /arrival or departure/i);
  assert.match(body.answer, /what time/i);
  assert.match(body.answer, /how many bags/i);
  assert.match(body.answer, /WhatsApp or phone number/i);
  assert.deepEqual(body.workflow.missing.sort(), ["bags", "contact", "context", "time"]);
  assert.equal(store.alerts.length, 0);
});

test("each required luggage field independently blocks submission when missing", async () => {
  const cases = [
    { question: "Please store 2 bags at 1 PM. My WhatsApp is +66 81 234 5678.", missing: "context" },
    { question: "Please store 2 bags for departure. My WhatsApp is +66 81 234 5678.", missing: "time" },
    { question: "Please store my luggage for departure at 1 PM. My WhatsApp is +66 81 234 5678.", missing: "bags" },
    { question: "Please store 2 bags for departure at 1 PM.", missing: "contact" }
  ];

  for (const item of cases) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
    const response = await handleConciergeRequest(guestRequest(item.question), env);
    const body = await response.json();
    assert.equal(response.status, 200, item.missing);
    assert.equal(body.needsHuman, false, item.missing);
    assert.equal(body.workflow.status, "collecting", item.missing);
    assert.equal(body.workflow.missing.includes(item.missing), true, item.missing);
    assert.equal(store.alerts.length, 0, item.missing);
  }
});

test("a local-format luggage contact is rejected until a country code is supplied", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const response = await handleConciergeRequest(guestRequest(
    "Please store 2 bags for departure at 1 PM. My phone is 081 234 5678."
  ), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.workflow.status, "collecting");
  assert.equal(body.workflow.missing.includes("contact"), true);
  assert.match(body.answer, /That looks like a local number/i);
  assert.match(body.answer, /\+66/);
  assert.equal(store.alerts.length, 0);
});

test("a complete luggage request with an international contact submits without redundant questions", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "not-used",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ support: [{ label: "Su", phone: "+66 64 000 0001" }] })
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: "wamid.complete-luggage" }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    const response = await handleConciergeRequest(guestRequest(
      "Please store 3 bags for departure at 1 PM. My WhatsApp is +66 81 234 5678. One bag is fragile."
    ), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.workflow.status, "submitted");
    assert.match(body.answer, /luggage request has been sent/i);
    assert.doesNotMatch(body.answer, /What WhatsApp or phone number/i);
    assert.equal(store.alerts.length, 1);
    assert.match(store.alerts[0].summary, /fragile/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a protected contact retained for the active luggage workflow is not requested again", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "not-used",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ support: [{ label: "Su", phone: "+66 64 000 0001" }] })
  });
  const first = await handleConciergeRequest(guestRequest("I wanna store my luggage. My WhatsApp is +66 81 234 5678."), env);
  const firstBody = await first.json();
  assert.equal(firstBody.workflow.retainPrivateContact, true);
  assert.doesNotMatch(firstBody.answer, /WhatsApp or phone number/i);
  assert.equal(store.alerts.length, 0);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: "wamid.retained-contact" }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    const response = await handleConciergeRequest(guestRequest("It is for departure at 2 PM and I have 2 bags.", {
      privateReplyContact: "+66 81 234 5678",
      history: [
        { role: "user", content: "I wanna store my luggage. [contact supplied privately]" },
        { role: "assistant", content: firstBody.answer }
      ]
    }), env);
    const body = await response.json();
    assert.equal(body.workflow.status, "submitted");
    assert.doesNotMatch(body.answer, /WhatsApp or phone number/i);
    assert.equal(store.alerts.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("luggage contact data stays out of normal interaction, alert and delivery storage", async () => {
  const rawContact = "+66 81 234 5678";
  const digits = "66812345678";
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "not-used",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ support: [{ label: "Su", phone: "+66 64 000 0001" }] })
  });
  const originalFetch = globalThis.fetch;
  let protectedPayload = "";
  globalThis.fetch = async (_url, options) => {
    protectedPayload = options.body;
    return new Response(JSON.stringify({ messages: [{ id: "wamid.private-contact" }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    await handleConciergeRequest(guestRequest(`Please store 2 bags for departure at 1 PM. My WhatsApp is ${rawContact}.`), env);
    assert.doesNotMatch(JSON.stringify(store.interactions), new RegExp(digits));
    assert.doesNotMatch(JSON.stringify(store.interactions), /81 234 5678/);
    assert.doesNotMatch(JSON.stringify(store.alerts), new RegExp(digits));
    assert.doesNotMatch(JSON.stringify(store.alerts), /81 234 5678/);
    assert.doesNotMatch(JSON.stringify(store.alertDeliveries), new RegExp(digits));
    assert.match(protectedPayload, /Guest reply/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a second luggage request starts clean and cannot submit until its own fields are complete", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "not-used",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ support: [{ label: "Su", phone: "+66 64 000 0001" }] })
  });
  const originalFetch = globalThis.fetch;
  const payloads = [];
  globalThis.fetch = async (_url, options) => {
    payloads.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.luggage-${payloads.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const firstQuestion = "Please store 2 bags for departure at 1 PM. My WhatsApp is +66 81 234 5678.";
    const first = await handleConciergeRequest(guestRequest(firstQuestion), env);
    const firstBody = await first.json();
    assert.equal(firstBody.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);
    assert.equal(payloads.length, 1);

    const completedHistory = [
      { role: "user", content: "Please store 2 bags for departure at 1 PM. My WhatsApp is [contact supplied privately]." },
      { role: "assistant", content: firstBody.answer }
    ];
    const second = await handleConciergeRequest(guestRequest("I wanna store my luggage", {
      history: completedHistory
    }), env);
    const secondBody = await second.json();
    assert.equal(secondBody.workflow.status, "collecting");
    assert.deepEqual(secondBody.workflow.missing.sort(), ["bags", "contact", "context", "time"]);
    assert.equal(store.alerts.length, 1);
    assert.equal(payloads.length, 1);

    const third = await handleConciergeRequest(guestRequest(
      "It is for arrival at 4 PM with 3 bags. My WhatsApp is +66 89 876 5432.",
      {
        history: [
          ...completedHistory,
          { role: "user", content: "I wanna store my luggage" },
          { role: "assistant", content: secondBody.answer }
        ]
      }
    ), env);
    const thirdBody = await third.json();
    assert.equal(thirdBody.workflow.status, "submitted");
    assert.equal(store.alerts.length, 2);
    assert.equal(payloads.length, 2);
    const parameters = payloads.at(-1).template.components[0].parameters;
    assert.equal(parameters[2].text, "Arrival");
    assert.equal(parameters[3].text, "3");
    assert.equal(parameters[4].text, "4 PM");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the alert-creation boundary rejects every incomplete luggage submission", async () => {
  const complete = {
    answer: "Request ready.",
    intentId: "luggage_storage",
    category: "stay-support",
    handoff: "stay_support",
    needsHuman: true,
    privateReplyContact: "+66 81 234 5678",
    luggageRequest: { context: "Departure", requestedTime: "1 PM", bagCount: "2" }
  };
  const cases = [
    { label: "missing structured request", result: { ...complete, luggageRequest: undefined } },
    { label: "missing arrival or departure", result: { ...complete, luggageRequest: { ...complete.luggageRequest, context: "" } } },
    { label: "missing requested time", result: { ...complete, luggageRequest: { ...complete.luggageRequest, requestedTime: "" } } },
    { label: "missing bag count", result: { ...complete, luggageRequest: { ...complete.luggageRequest, bagCount: "" } } },
    { label: "missing contact", result: { ...complete, privateReplyContact: "" } },
    { label: "local-format contact", result: { ...complete, privateReplyContact: "081 234 5678" } }
  ];

  for (const item of cases) {
    const { env, store } = createEnvironment();
    const alert = await createConciergeAlert({
      env,
      interactionId: "int_boundary_test",
      sessionId: "session_boundary_test",
      room: "3",
      roomVerified: true,
      question: "Luggage request with missing data",
      result: item.result
    });
    assert.equal(alert, null, item.label);
    assert.equal(store.alerts.length, 0, item.label);
    assert.equal(store.alertDeliveries.length, 0, item.label);
  }
});

test("island resource guidance accurately explains water and electricity conservation", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const response = await handleConciergeRequest(
    guestRequest("Why should I save water and electricity?"),
    env
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.intentId, "island_resource_conservation");
  assert.match(body.answer, /Fresh water is limited on Koh Tao/);
  assert.match(body.answer, /undersea grid connection/);
  assert.match(body.answer, /reduce reliance on local diesel generators/);
  assert.match(body.answer, /switch off the air conditioning and lights/);
  assert.deepEqual(body.actions, []);
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
  assert.equal(diving.actions[0].type, "prompt");
  assert.equal(diving.actions[0].prompt, "I want to book diving.");

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
    assert.equal(body.actions[0].type, "prompt");
    assert.equal(body.actions[0].prompt, "I would like to make a booking.");
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
    body: JSON.stringify({ room: "1", arrivalAt: "2027-08-13T07:00:00.000Z", expiresHours: 24 })
  }), env, "/api/concierge/admin/passport-links");
  assert.equal(rejected.status, 400);
  assert.equal((await rejected.json()).error, "non_thai_confirmation_required");
});

test("main and room welcome pages make required registration prominent", async () => {
  const [home, room, canonicalRoom, house, canonicalHouse, registrationEntry, registrationForm] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/house/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/house.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/house/house.html", import.meta.url), "utf8"),
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
  assert.match(room, /I understand the 500 THB lost-key replacement fee and want to continue/);
  assert.match(room, />Request spare key<\/button>/);
  assert.doesNotMatch(room, /lostKeyConfirmationCode/);
  assert.match(room, /id="openSpareKeyAccess"/);
  assert.match(room, /Secure after-hours help if you cannot enter your room/);
  assert.ok(room.indexOf('id="openSpareKeyAccess"') < room.indexOf('id="spareKeyAccess"'));
  assert.match(room, /id="spareKeyAccess"[^>]*hidden/);
  assert.match(room, /do not need to enter your Airbnb confirmation code again/);
  assert.match(room, /src="\/registration-entry\.js"/);
  assert.match(registrationEntry, /\/api\/stay\/verify/);
  assert.match(registrationEntry, /\/api\/stay\/passport-link/);
  assert.match(registrationEntry, /\/api\/stay\/spare-key/);
  assert.match(registrationEntry, /JSON\.stringify\(\{ feeAccepted: true \}\)/);
  assert.doesNotMatch(registrationEntry, /spareKeySection\.hidden = false;\s*if \(spareKeyForm\)/);
  assert.match(registrationEntry, /spareKeyTrigger\?\.addEventListener\("click", \(event\) =>/);
  assert.doesNotMatch(registrationEntry, /HOUSE_PRIVATE_REGISTRATION_URL/);
  assert.match(registrationForm, /Option 1 — Upload passport image/);
  assert.match(registrationForm, /Option 2 — Enter the required details/);
  assert.match(registrationForm, /exact required TM30 fields/);
  assert.match(room, /Please conserve water and electricity/);
  assert.match(room, /undersea grid connection developed to reduce reliance on local diesel generators/);
  assert.match(room, /switch off the air conditioning and lights whenever you leave the room/);
  assert.match(house, /<b>1,000 THB clearance fee<\/b>/);
  assert.doesNotMatch(house, /<strong>1,000 THB clearance fee<\/strong>/);
  assert.equal(room, canonicalRoom);
  assert.equal(house, canonicalHouse);
});

test("concierge initializes safely and keeps public support buttons concierge-first", async () => {
  const script = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  const pageDeclaration = script.indexOf("const currentPage =");
  const accessDeclaration = script.indexOf("const guestAccessMode =");
  assert.ok(pageDeclaration >= 0 && accessDeclaration > pageDeclaration);
  assert.match(script, /\[data-link="houseWhatsapp"\],\[data-link="houseCall"\]/);
  assert.match(script, /event\.preventDefault\(\);\s*openPanel\(\{ askRoom: true \}\)/);
});

test("browser luggage workflow keeps a supplied contact out of ordinary session history", async () => {
  const script = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  assert.match(script, /redactPrivateContact\(question\)\.slice\(0, 700\)/);
  assert.match(script, /appendMessage\("guest", redactPrivateContact\(question\)\)/);
  assert.doesNotMatch(script, /appendMessage\("guest", question\)/);
  assert.match(script, /privateReplyContact: privateWorkflowContact/);
  assert.match(script, /result\.workflow\?\.type === "luggage"/);
  assert.match(script, /dataset\.serverQuestion = redactPrivateContact/);
  assert.doesNotMatch(script, /houseConciergeHistory[^\n]{0,200}privateWorkflowContact/);
});

test("browser concierge permits only one in-flight question and one rendered answer path", async () => {
  const script = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  assert.match(script, /let requestInFlight = false/);
  assert.match(script, /if \(requestInFlight\) return/);
  assert.match(script, /requestInFlight = true;[\s\S]*const status = appendStatus\(\)/);
  assert.match(script, /finally \{\s*requestInFlight = false;/);
  assert.equal((script.match(/deliverAnswer\(result, question\);/g) || []).length, 2);
});

test("rendered Concierge spare-key CTA opens the protected fee flow", async () => {
  const [concierge, registrationEntry, room] = await Promise.all([
    readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8"),
    readFile(new URL("../public/registration-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../public/room.html", import.meta.url), "utf8")
  ]);

  assert.match(concierge, /type: "spare-key",\s*label: interpolate/);
  assert.match(concierge, /data-spare-key-access="true"/);
  assert.match(concierge, /link\.dataset\.spareKeyAccess = "true"/);
  assert.match(concierge, /event\.target\.closest\("\[data-spare-key-access\]"\)/);
  assert.match(concierge, /event\.preventDefault\(\);[\s\S]*closePanel\(\);[\s\S]*house:open-spare-key/);
  assert.match(concierge, /window\.location\.assign\(target\.href\)/);
  assert.match(registrationEntry, /window\.addEventListener\("house:open-spare-key", openSpareKeyAccess\)/);
  assert.match(registrationEntry, /window\.addEventListener\("hashchange", \(\) =>/);
  assert.match(registrationEntry, /if \(window\.location\.hash === "#spareKeyAccess"\) openSpareKeyAccess\(\)/);
  assert.match(room, /id="lostKeyFeeAccepted"[^>]*required/);
  assert.match(room, />Request spare key<\/button>/);
  assert.match(room, /id="spareKeyContactHelp" hidden/);
  assert.match(room, />Contact The House Concierge<\/a>/);
  assert.doesNotMatch(room, /id="lostKeyFeeIntroduction"|id="lostKeyFeeConfirmation"/);
  assert.match(registrationEntry, /spareKeyForm\.hidden = true;[\s\S]*spareKeyContactHelp\.hidden = false/);
  assert.match(registrationEntry, /\["spare_key_already_released", "key_code_rotation_required"\]/);
  assert.doesNotMatch(room, /lostKeyConfirmationCode/);
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
  assert.match(runtime, /houseGuideTranslations:v5\.11\.14:/);
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
    "Provide passports in person",
    "I will provide all passports in person",
    "Your in-person passport handover is noted. Please bring the original passports of every non-Thai adult and child staying overnight. The private room guide will open after our team has checked them and completed the TM30 registration.",
    "Luggage storage",
    "Tuesday–Sunday during office working hours, or at Bamboo Beach Bar from 11:00 AM. No storage is currently available before 11:00 AM.",
    "Luggage storage is available Tuesday–Sunday during office working hours. If the office is unavailable, luggage can be stored at Bamboo Beach Bar from 11:00 AM. We do not currently have luggage storage for early-morning arrivals before 11:00 AM.",
    "💧 Please conserve water and electricity",
    "Fresh water is limited on Koh Tao. Electricity reaches the island through an undersea grid connection developed to reduce reliance on local diesel generators. Please use water and power thoughtfully, and switch off the air conditioning and lights whenever you leave the room.",
    "Enter your stay code to unlock your private room guide.",
    "Use the HM code in your Airbnb trip details, or your private House stay code.",
    "Your code is checked securely.",
    "Stay verified. Complete the short guest registration below.",
    "Choose one option for everyone staying overnight. Mixed groups should choose Foreign guest(s).",
    "No passport information is needed when every overnight guest is Thai.",
    "Passport information is required for every non-Thai adult and child staying overnight.",
    "Required for Thailand's TM30 registration. Passport images stay private and are deleted within 14 days—or sooner after processing.",
    "Choose a passport option",
    "One passport is required for each non-Thai adult and child staying overnight.",
    "Use one private, single-use form per guest. Images are deleted within 14 days—or sooner.",
    "Bring every required original passport to The House. No upload is needed.",
    "Used only for TM30 registration. Your room guide opens after all passports are uploaded or checked in person.",
    "Choice saved. Bring every required original passport to The House. The guide opens after our team completes the check and TM30 registration.",
    "Emergency help remains available without verification.",
    "After-hours spare-key help",
    "If you are locked out after hours, you can request access to the spare key for your room here.",
    "You are already verified for this room, so you do not need to enter your Airbnb confirmation code again.",
    "I understand the 500 THB lost-key replacement fee and want to continue.",
    "Request spare key",
    "Contact The House Concierge",
    "Send urgent alert",
    "Urgent alert cancelled. No team message was sent.",
    "That looks like a local number. Please send your WhatsApp or phone number including the country code, for example +66 for Thailand."
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

test("Thai-national exemption is bilingual without duplicating fixed Thai copy in Thai mode", async () => {
  const html = await readFile(new URL("../public/room-access.html", import.meta.url), "utf8");
  assert.match(html, /Thai nationals only/);
  assert.match(html, /เฉพาะผู้มีสัญชาติไทยเท่านั้น/);
  assert.match(html, /ไม่ต้องส่งข้อมูลหนังสือเดินทาง หากผู้เข้าพักค้างคืนทุกคนมีสัญชาติไทย/);
  assert.match(html, /ผู้เข้าพักค้างคืนทุกคนมีสัญชาติไทย/);
  assert.match(html, /lang="th" data-i18n-skip/);
  assert.match(html, /html\[lang="th"\] \.thai-exemption-th,html\[lang="th"\] \.thai-button-label\{display:none\}/);
});

test("every guest HTML page loads the shared localization runtime", async () => {
  const publicRoot = new URL("../public/", import.meta.url);
  const guestPages = [];
  const nonGuestPages = new Set(["concierge-admin.html", "privacy.html", "data-deletion.html", "terms.html"]);
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) await collect(new URL(`${entry.name}/`, directory));
      else if (entry.isFile() && entry.name.endsWith(".html") && !nonGuestPages.has(entry.name)) {
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

test("privacy, data protection and terms are reachable from every public HTML page", async () => {
  const publicRoot = new URL("../public/", import.meta.url);
  const runtime = await readFile(new URL("../public/i18n.js", import.meta.url), "utf8");
  assert.match(runtime, /function addLegalFooter\(\)/);
  assert.match(runtime, /addLegalFooter\(\);/);
  assert.match(runtime, /href="\/privacy"/);
  assert.match(runtime, /href="\/data-deletion"/);
  assert.match(runtime, /href="\/terms"/);

  const pages = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) await collect(new URL(`${entry.name}/`, directory));
      else if (entry.isFile() && entry.name.endsWith(".html")) pages.push(new URL(entry.name, directory));
    }
  }
  await collect(publicRoot);

  for (const page of pages) {
    const html = await readFile(page, "utf8");
    const hasStaticLinks = html.includes('href="/privacy"')
      && html.includes('href="/data-deletion"')
      && html.includes('href="/terms"');
    const inheritsSharedFooter = html.includes('src="/guide-app.js"') || html.includes('src="/i18n.js"');
    assert.ok(hasStaticLinks || inheritsSharedFooter, `${page.pathname} has no legal navigation`);
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
          "No passport information is needed when every overnight guest is Thai.",
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
    assert.match(body.translations[3], /^Deutsch: No passport information is needed/);
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
  assert.equal(isAfterHours(new Date("2027-08-12T12:29:00.000Z")), false);
  assert.equal(isAfterHours(new Date("2027-08-12T12:30:00.000Z")), true);
  assert.equal(isAfterHours(new Date("2027-08-13T03:29:00.000Z")), true);
  assert.equal(isAfterHours(new Date("2027-08-13T03:30:00.000Z")), false);

  const afterHoursKey = classifyConciergeAlert({
    result: { needsHuman: true, intentId: "lost_key", category: "room", handoff: "stay_support" },
    question: "I lost my key",
    room: "7",
    now: new Date("2027-08-12T13:00:00.000Z")
  });
  assert.equal(afterHoursKey, null);
  const daytimeKey = classifyConciergeAlert({
    result: { needsHuman: true, intentId: "lost_key", category: "room", handoff: "stay_support" },
    question: "I lost my key", room: "2", now: new Date("2027-08-12T05:00:00.000Z")
  });
  assert.equal(daytimeKey.recipientGroup, "lost_key_team");
  assert.equal(daytimeKey.escalationRequired, false);

  const diveRecommendation = classifyConciergeAlert({
    result: { needsHuman: true, intentId: "diving_recommendation", category: "booking", handoff: "booking" },
    question: "Which dive school do you recommend?",
    room: "1",
    now: new Date("2027-08-12T05:00:00.000Z")
  });
  assert.equal(diveRecommendation, null);
  const mislabeledConversation = classifyConciergeAlert({
    result: { needsHuman: true, intentId: "booking_request", category: "booking", handoff: "booking" },
    question: "I am dying for love",
    room: "1",
    now: new Date("2027-08-12T05:00:00.000Z")
  });
  assert.equal(mislabeledConversation, null);
  const medicalWithoutConfirmation = classifyConciergeAlert({
    result: { needsHuman: true, intentId: "medical_emergency", category: "emergency", handoff: "medical_emergency" },
    question: "I cannot breathe",
    room: "1",
    now: new Date("2027-08-12T05:00:00.000Z")
  });
  assert.equal(medicalWithoutConfirmation, null);
  assert.equal(safeAlertSummary("Passport number AB123456, nationality French, date of birth 1 January 1990").includes("AB123456"), false);
});

test("critical concierge requests require explicit confirmation before sending WhatsApp", async () => {
  const recipients = JSON.stringify({
    support: [{ label: "Su", phone: "+66 64 000 0001" }],
    booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
    emergency: [
      { label: "Owner 1", phone: "+66 81 000 0002" },
      { label: "Owner 2", phone: "+66 82 000 0003" }
    ],
    escalation: [{ label: "24/7 responder", phone: "+66 83 000 0004" }]
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
    const body = await response.json();
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound.length, 0);
    assert.equal(body.actions[0].action, "confirm_urgent_property");
    assert.equal(body.actions[0].label, "Send urgent alert");
    const confirmed = await handleConciergeRequest(
      guestRequest("There is water leakage in my room", { room: "6", action: "confirm_urgent_property" }),
      env,
      {}
    );
    const confirmedBody = await confirmed.json();
    assert.equal(confirmed.status, 200);
    assert.match(confirmedBody.answer, /Urgent alert sent/);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].recipientGroup, "urgent_response");
    assert.equal(outbound.length, 3);
    assert.deepEqual(outbound.map((item) => item.body.to).sort(), ["66810000002", "66820000003", "66960000001"]);
    assert.equal(outbound.every((item) => item.body.template.name === "house_urgent_alert_v1"), true);
    assert.doesNotMatch(JSON.stringify(outbound), /66640000001/);
    assert.doesNotMatch(JSON.stringify(store.alertDeliveries), /66810000002|66820000003|66960000001/);
    assert.equal(whatsappAlertConfiguration(env).configured, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("critical property messages override every stale ordinary contact workflow", async () => {
  const pendingWorkflows = [
    "Please arrange luggage storage after checkout at 3 pm for 2 bags.",
    "Please book snorkelling tomorrow for 2 guests.",
    "Please arrange help for the dripping bathroom tap.",
    "Please send fresh towels to my room."
  ];

  for (const pendingQuestion of pendingWorkflows) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const response = await handleConciergeRequest(guestRequest("I have a water leak and everything is flooded", {
      history: [
        { role: "user", content: pendingQuestion },
        { role: "assistant", content: "What WhatsApp or phone number can our team use to contact you? Please include the country code." }
      ]
    }), env);
    const body = await response.json();

    assert.equal(response.status, 200, pendingQuestion);
    assert.equal(body.intentId, "property_emergency", pendingQuestion);
    assert.equal(body.handoff, "property_emergency", pendingQuestion);
    assert.equal(body.actions[0].action, "confirm_urgent_property", pendingQuestion);
    assert.equal(body.actions[0].label, "Send urgent alert", pendingQuestion);
    assert.doesNotMatch(body.answer, /What WhatsApp or phone number/i, pendingQuestion);
    assert.equal(store.alerts.length, 0, pendingQuestion);
  }
});

test("an interrupted contact workflow cannot be submitted by a later phone number", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
  const urgentQuestion = "I have a water leak and everything is flooded";
  const urgentAnswer = "This sounds serious. Move away from the danger first. Send an urgent alert to The House emergency team now?";
  const response = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
    history: [
      { role: "user", content: "Please arrange luggage storage after checkout at 3 pm for 2 bags." },
      { role: "assistant", content: "What WhatsApp or phone number can our team use to contact you? Please include the country code." },
      { role: "user", content: urgentQuestion },
      { role: "assistant", content: urgentAnswer }
    ]
  }), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.notEqual(body.intentId, "luggage_storage");
  assert.doesNotMatch(body.answer, /luggage request has been sent/i);
  assert.equal(store.alerts.length, 0);
});

test("a contact collected for one workflow cannot satisfy a different later workflow", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
  const response = await handleConciergeRequest(guestRequest("Please book snorkelling tomorrow for 2 guests", {
    history: [
      { role: "user", content: "Please arrange luggage storage after checkout." },
      { role: "assistant", content: "What WhatsApp or phone number can our team use to contact you? Please include the country code." },
      { role: "user", content: "+66 81 234 5678" },
      { role: "assistant", content: "Your luggage request has been sent to The House team ✓ We will handle it from here." }
    ]
  }), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.handoff, "booking");
  assert.match(body.answer, /country code/i);
  assert.equal(store.alerts.length, 0);
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
    createdAt: "2027-08-12T19:00:00.000Z",
    escalationDueAt: "2027-08-12T19:10:00.000Z",
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
    const escalated = await processDueAlertEscalations(env, new Date("2027-08-12T19:11:00.000Z"));
    assert.deepEqual(escalated, { due: 1, sent: 1 });
    assert.equal(outbound[0].to, "66820000003");
    assert.ok(store.alerts[0].escalatedAt);

    const receivedBody = JSON.stringify({
      entry: [{ changes: [{ value: { messages: [{ from: "66820000003", text: { body: `RECEIVED ${alertId}` } }] } }] }]
    });
    const acknowledgementKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.META_APP_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const receivedSignatureBytes = await crypto.subtle.sign("HMAC", acknowledgementKey, new TextEncoder().encode(receivedBody));
    const receivedResponse = await handleWhatsAppWebhook(new Request("https://guide.example/api/whatsapp/webhook", {
      method: "POST",
      headers: { "x-hub-signature-256": `sha256=${Buffer.from(receivedSignatureBytes).toString("hex")}` },
      body: receivedBody
    }), env);
    assert.equal(receivedResponse.status, 200);
    assert.equal(store.alerts[0].status, "acknowledged");

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
    assert.equal(body.actions[0].type, "prompt");
    assert.equal(body.actions[0].prompt, "I would like to make a booking.");
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
    assert.match(body.answer, /What WhatsApp or phone number/);
    assert.deepEqual(body.actions, []);
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
  assert.equal(taxiBody.actions[0].type, "prompt");
  assert.equal(taxiBody.actions[0].prompt, "I would like to make a booking.");

  const callResponse = await handleConciergeRequest(guestRequest("Can you call me tomorrow?"), env);
  const callBody = await callResponse.json();
  assert.notEqual(callBody.handoff, "medical_emergency");
  assert.equal(callBody.source, "fallback");

  const smokeResponse = await handleConciergeRequest(guestRequest("There is smoke in my room"), env);
  const smokeBody = await smokeResponse.json();
  assert.equal(smokeBody.intentId, "property_emergency");
  assert.equal(smokeBody.handoff, "property_emergency");
});

test("figurative, slang and ambiguous safety language cannot create operational alerts", async () => {
  const phrases = [
    "my ass is burning like hell",
    "I am burning inside",
    "I am bloody drunk",
    "I am dying for love",
    "bloody hell",
    "I'm dying laughing"
  ];

  for (const phrase of phrases) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
    const response = await handleConciergeRequest(guestRequest(phrase), env);
    const body = await response.json();
    assert.equal(response.status, 200, phrase);
    assert.equal(body.needsHuman, false, phrase);
    assert.notEqual(body.handoff, "property_emergency", phrase);
    assert.equal(store.alerts.length, 0, phrase);
  }
});

test("medical safety guidance never sends a House alert before explicit confirmation", async () => {
  const phrases = [
    "I am unconscious",
    "Someone is unconscious and won't wake up.",
    "I can't breathe and need emergency help.",
    "I am bleeding heavily and need help."
  ];

  for (const phrase of phrases) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
    const response = await handleConciergeRequest(guestRequest(phrase), env);
    const body = await response.json();
    assert.equal(response.status, 200, phrase);
    assert.equal(body.needsHuman, false, phrase);
    assert.equal(body.actions[0].route, "rescueCall", phrase);
    assert.equal(body.actions[1].route, "medicalNationalCall", phrase);
    assert.equal(body.actions[2].action, "confirm_urgent_medical", phrase);
    assert.equal(body.actions[3].type, "dismiss", phrase);
    assert.equal(store.alerts.length, 0, phrase);
  }
});

test("confirmed medical alerts are sent once while cancel remains a no-send client action", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "not-used",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (url, options) => {
    outbound.push({ url: String(url), body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ messages: [{ id: `wamid.medical-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const medicalMessage = "Someone is unconscious and won't wake up. My number is +66 81 234 5678.";
    const pending = await handleConciergeRequest(guestRequest(medicalMessage), env);
    const pendingBody = await pending.json();
    assert.equal(pendingBody.actions.at(-1).type, "dismiss");
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound.length, 0);

    const confirmed = await handleConciergeRequest(guestRequest(medicalMessage, {
      action: "confirm_urgent_medical"
    }), env);
    const confirmedBody = await confirmed.json();
    assert.equal(confirmed.status, 200);
    assert.match(confirmedBody.answer, /Urgent alert sent/);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].alertType, "medical_emergency");
    assert.doesNotMatch(JSON.stringify(store.alerts), /66812345678|81 234 5678/);
    assert.doesNotMatch(JSON.stringify(outbound), /66812345678|81 234 5678/);
    assert.equal(outbound.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("critical property sentences require confirmation while routine towels remain actionable", async () => {
  for (const phrase of ["There is a fire in my room.", "My room is flooding with water."]) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
    const response = await handleConciergeRequest(guestRequest(phrase), env);
    const body = await response.json();
    const confirmation = body.actions.find((action) => action.action === "confirm_urgent_property");
    assert.ok(confirmation, phrase);
    assert.equal(body.actions.at(-1).type, "dismiss", phrase);
    assert.equal(store.alerts.length, 0, phrase);
  }

  const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const towels = await handleConciergeRequest(guestRequest("Please send fresh towels to my room."), env);
  const towelsBody = await towels.json();
  assert.equal(towelsBody.intentId, "housekeeping_fresh_towels");
  assert.equal(store.alerts.length, 1);
  assert.equal(store.alerts[0].alertType, "stay_support");
});

test("Bangkok housekeeping boundaries switch exactly at 10:30 and 19:30", () => {
  const cases = [
    { iso: "2026-08-27T03:29:00.000Z", afterHours: true },
    { iso: "2026-08-27T03:30:00.000Z", afterHours: false },
    { iso: "2026-08-27T12:29:00.000Z", afterHours: false },
    { iso: "2026-08-27T12:30:00.000Z", afterHours: true }
  ];
  for (const item of cases) {
    const result = housekeepingServiceResult("Can I have new toilet paper?", new Date(item.iso));
    assert.ok(result, item.iso);
    assert.equal(result.housekeepingRequest.afterHours, item.afterHours, item.iso);
    if (item.afterHours) {
      assert.match(result.answer, /currently off duty/i, item.iso);
      assert.match(result.answer, /morning after 10:30 AM/i, item.iso);
      assert.doesNotMatch(result.answer, /within 30 minutes/i, item.iso);
      assert.deepEqual(result.actions, [], item.iso);
    } else {
      assert.match(result.answer, /within 30 minutes/i, item.iso);
      assert.equal(result.actions[0].route, "houseCall", item.iso);
    }
  }
});

test("routine housekeeping supplies always create one Su-and-owner service alert", async () => {
  const requests = [
    ["Can I have new toilet paper?", /toilet paper/i],
    ["I need fresh towels.", /fresh towels/i],
    ["Can I have soap?", /soap/i],
    ["Please clean my room.", /room cleaning|clean the room/i]
  ];
  const originalFetch = globalThis.fetch;
  try {
    for (const [question, itemPattern] of requests) {
      const { env, store } = createEnvironment({
        OPENAI_API_KEY: "not-used",
        WHATSAPP_ACCESS_TOKEN: "meta-test-token",
        WHATSAPP_PHONE_NUMBER_ID: "1234567890",
        WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
          support: [{ label: "Su", phone: "+66 64 000 0001" }],
          emergency: [
            { label: "Owner 1", phone: "+66 81 000 0002" },
            { label: "Owner 2", phone: "+66 82 000 0003" }
          ]
        })
      });
      const outbound = [];
      globalThis.fetch = async (_url, options) => {
        outbound.push(JSON.parse(options.body));
        return new Response(JSON.stringify({ messages: [{ id: `wamid.housekeeping-${outbound.length}` }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      };
      const response = await handleConciergeRequest(guestRequest(question), env);
      const body = await response.json();
      assert.equal(response.status, 200, question);
      assert.match(body.answer, /Thank you for your request/i, question);
      assert.match(body.answer, itemPattern, question);
      assert.doesNotMatch(body.answer, /confirmed information|do not have information|knowledge/i, question);
      assert.equal(store.alerts.length, 1, question);
      assert.equal(store.alerts[0].alertType, "stay_support", question);
      assert.equal(store.alerts[0].recipientGroup, "support_with_owners", question);
      assert.equal(outbound.length, 3, question);
      assert.deepEqual(outbound.map((item) => item.to).sort(), ["66640000001", "66810000002", "66820000003"], question);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fire guidance prioritizes evacuation, Rescue and safe extinguisher use before any House alert", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const response = await handleConciergeRequest(guestRequest("There is a fire in my room."), env);
  const body = await response.json();
  assert.equal(body.intentId, "fire_emergency");
  assert.match(body.answer, /leave the room or building|move to a safe place/i);
  assert.match(body.answer, /Koh Tao Rescue/i);
  assert.match(body.answer, /fire extinguisher.*outside.*wall.*each floor/is);
  assert.match(body.answer, /fire is small.*safe escape route/is);
  assert.equal(body.actions[0].route, "rescueCall");
  assert.ok(body.actions.find((action) => action.action === "confirm_urgent_property"));
  assert.equal(body.actions.at(-1).type, "dismiss");
  assert.doesNotMatch(body.answer, /Rescue.*(?:unknown|unconfirmed|unavailable)/i);
  assert.equal(store.alerts.length, 0);
});

test("figurative language and cancelled alerts use natural guest wording", async () => {
  for (const phrase of ["I am dying for love", "bloody hell", "I'm dying laughing"]) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
    const response = await handleConciergeRequest(guestRequest(phrase), env);
    const body = await response.json();
    assert.match(body.answer, /What can I help you with/i, phrase);
    assert.doesNotMatch(body.answer, /classifier|conversational or figurative language|alert engine|I have not sent an alert/i, phrase);
    assert.equal(store.alerts.length, 0, phrase);
  }
  const script = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  assert.match(script, /Okay — I haven’t contacted The House team\./);
  assert.doesNotMatch(script, /Urgent alert cancelled\. No team message was sent\./);
});

test("find my room returns the dynamic location and a direct Your Room action", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const response = await handleConciergeRequest(guestRequest("find my room", { room: "11" }), env);
  const body = await response.json();
  assert.equal(body.intentId, "find_room");
  assert.match(body.answer, /Room 11 is downstairs/i);
  assert.match(body.answer, /Open Your Room/i);
  assert.doesNotMatch(body.answer, /room-specific page/i);
  assert.deepEqual(body.actions[0], { label: "Your Room", type: "link", href: "/room/11" });
});

test("diving recommendations stay informational while booking starts clean structured collection", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
  const recommendation = await handleConciergeRequest(guestRequest("Which dive school do you recommend?"), env);
  const recommendationBody = await recommendation.json();
  assert.equal(recommendationBody.intentId, "recommended_dive_school");
  assert.equal(recommendationBody.needsHuman, false);
  assert.doesNotMatch(recommendationBody.answer, /WhatsApp or phone number/i);
  assert.equal(store.alerts.length, 0);

  const booking = await handleConciergeRequest(guestRequest("I want to book diving."), env);
  const bookingBody = await booking.json();
  assert.equal(bookingBody.intentId, "diving_booking_request");
  assert.equal(bookingBody.workflow.status, "collecting");
  assert.deepEqual(bookingBody.workflow.missing.sort(), ["contact", "date", "guests", "option"]);
  assert.match(bookingBody.answer, /preferred date/i);
  assert.match(bookingBody.answer, /how many people/i);
  assert.match(bookingBody.answer, /Fun Diving, Open Water, Advanced Open Water, or another course/i);
  assert.match(bookingBody.answer, /international country code/i);
  assert.match(bookingBody.answer, /payment has been received/i);
  assert.equal(bookingBody.actions.some((action) => action.route === "bookingWhatsapp"), false);
  assert.equal(store.alerts.length, 0);
});

test("diving collection enforces conditional course details and international contact", async () => {
  const cases = [
    {
      question: "I want to book Fun Diving tomorrow for 2 divers. My WhatsApp is +66 81 234 5678.",
      missing: "certification"
    },
    {
      question: "I want to book diving tomorrow for 2 divers on another course. My WhatsApp is +66 81 234 5678.",
      missing: "course"
    },
    {
      question: "I want to book Fun Diving tomorrow for 2 divers. I am Advanced Open Water certified. My phone is 081 234 5678.",
      missing: "contact",
      local: true
    }
  ];
  for (const item of cases) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const response = await handleConciergeRequest(guestRequest(item.question), env);
    const body = await response.json();
    assert.equal(body.workflow.status, "collecting", item.missing);
    assert.equal(body.workflow.missing.includes(item.missing), true, item.missing);
    if (item.local) assert.match(body.answer, /\+66/);
    assert.equal(store.alerts.length, 0, item.missing);
  }
});

test("a complete diving request creates one protected Fah-and-owner alert and remains unconfirmed pending payment", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.diving-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const rawContact = "+66 81 234 5678";
    const response = await handleConciergeRequest(guestRequest(
      `I want to book Fun Diving tomorrow for 2 divers. I am Advanced Open Water certified. My WhatsApp is ${rawContact}. Please arrange a calm morning trip.`
    ), env);
    const body = await response.json();
    assert.equal(body.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].alertType, "booking_request");
    assert.equal(store.alerts[0].recipientGroup, "booking_with_owners");
    assert.equal(outbound.length, 3);
    assert.deepEqual(outbound.map((item) => item.to).sort(), ["66810000002", "66820000003", "66960000001"]);
    assert.equal(outbound.every((item) => item.template.name === "house_booking_alert_v1"), true);
    const parameters = outbound[0].template.components[0].parameters;
    assert.equal(parameters[2].text, "Diving");
    assert.equal(parameters[4].text, "2");
    assert.match(parameters[5].text, /Fun Diving/);
    assert.match(parameters[5].text, /Certification: Advanced Open Water/);
    assert.match(parameters[5].text, /Guest reply: \+66812345678/);
    assert.match(body.answer, /check availability/i);
    assert.match(body.answer, /not confirmed.*payment has been received/i);
    assert.doesNotMatch(JSON.stringify(store.interactions), /66812345678|81 234 5678/);
    assert.doesNotMatch(JSON.stringify(store.alerts), /66812345678|81 234 5678/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Open Water, Advanced Open Water and named higher courses pass the structured diving gate", async () => {
  const cases = [
    ["Open Water Course", "I want to book diving tomorrow for 2 divers on the Open Water Course. My WhatsApp is +66 81 234 5678."],
    ["Advanced Open Water Course", "I want to book diving tomorrow for 2 divers on the Advanced Open Water Course. My WhatsApp is +66 81 234 5678."],
    ["Other course", "I want to book diving tomorrow for 2 divers on the Rescue Diver course. My WhatsApp is +66 81 234 5678."]
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: `wamid.course-${crypto.randomUUID()}` }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    for (const [expectedOption, question] of cases) {
      const { env, store } = createEnvironment({
        OPENAI_API_KEY: "",
        WHATSAPP_ACCESS_TOKEN: "meta-test-token",
        WHATSAPP_PHONE_NUMBER_ID: "1234567890",
        WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ booking: [{ label: "Fah", phone: "+66 96 000 0001" }] })
      });
      const response = await handleConciergeRequest(guestRequest(question), env);
      const body = await response.json();
      assert.equal(body.workflow.status, "submitted", expectedOption);
      assert.equal(store.alerts.length, 1, expectedOption);
      assert.match(body.answer, /not confirmed.*payment has been received/i, expectedOption);
      assert.equal(body.workflow.missing.length, 0, expectedOption);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a completed diving request cannot supply stale fields to a new booking", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ booking: [{ label: "Fah", phone: "+66 96 000 0001" }] })
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: `wamid.fresh-${crypto.randomUUID()}` }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    const first = await handleConciergeRequest(guestRequest(
      "I want to book Fun Diving tomorrow for 2 divers. I am Advanced Open Water certified. My WhatsApp is +66 81 234 5678."
    ), env);
    const firstBody = await first.json();
    assert.equal(firstBody.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);

    const second = await handleConciergeRequest(guestRequest("I want to book diving.", {
      history: [
        { role: "user", content: "I want to book Fun Diving tomorrow for 2 divers. I am Advanced Open Water certified. My WhatsApp is [contact supplied privately]." },
        { role: "assistant", content: firstBody.answer }
      ]
    }), env);
    const secondBody = await second.json();
    assert.equal(secondBody.workflow.status, "collecting");
    assert.deepEqual(secondBody.workflow.missing.sort(), ["contact", "date", "guests", "option"]);
    assert.equal(store.alerts.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the final alert boundary rejects incomplete structured diving submissions", async () => {
  const complete = {
    answer: "Request ready.",
    intentId: "diving_booking_request",
    category: "booking",
    handoff: "booking",
    needsHuman: true,
    privateReplyContact: "+66 81 234 5678",
    bookingRequest: {
      kind: "diving",
      activity: "Diving",
      preferredDate: "28 Aug 2026",
      guestCount: "2",
      option: "Fun Diving",
      courseName: "",
      certificationLevel: "Advanced Open Water",
      notes: "Morning preferred"
    }
  };
  const cases = [
    ["missing date", { ...complete, bookingRequest: { ...complete.bookingRequest, preferredDate: "" } }],
    ["missing people", { ...complete, bookingRequest: { ...complete.bookingRequest, guestCount: "" } }],
    ["missing option", { ...complete, bookingRequest: { ...complete.bookingRequest, option: "" } }],
    ["missing Fun certification", { ...complete, bookingRequest: { ...complete.bookingRequest, certificationLevel: "" } }],
    ["missing named other course", { ...complete, bookingRequest: { ...complete.bookingRequest, option: "Other course", courseName: "" } }],
    ["missing contact", { ...complete, privateReplyContact: "" }],
    ["local contact", { ...complete, privateReplyContact: "081 234 5678" }]
  ];
  for (const [label, result] of cases) {
    const { env, store } = createEnvironment();
    const alert = await createConciergeAlert({
      env,
      interactionId: "int_diving_boundary_test",
      sessionId: `session_${label.replaceAll(" ", "_")}`,
      room: "6",
      roomVerified: true,
      question: "Diving request",
      result
    });
    assert.equal(alert, null, label);
    assert.equal(store.alerts.length, 0, label);
  }
});

test("booking UI never exposes Fah personal WhatsApp and service hours are guest-visible", async () => {
  const [contacts, booking, app, concierge, practical, modulePractical] = await Promise.all([
    readFile(new URL("../public/contacts.js", import.meta.url), "utf8"),
    readFile(new URL("../public/concierge-booking.js", import.meta.url), "utf8"),
    readFile(new URL("../public/guide-app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8"),
    readFile(new URL("../public/practical.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/practical/practical.html", import.meta.url), "utf8")
  ]);
  for (const source of [contacts, booking, app, concierge]) {
    assert.doesNotMatch(source, /wa\.me\/66962741424|\+66962741424|0962741424/);
  }
  assert.match(booking, /whatsappHref: "#concierge-booking"/);
  assert.match(app, /bookingWhatsapp: "#concierge-booking"/);
  assert.match(concierge, /Housekeeping &amp; service hours: 10:30 AM–7:30 PM/);
  for (const page of [practical, modulePractical]) {
    assert.match(page, /Housekeeping &amp; Service Requests/);
    assert.match(page, /10:30 AM–7:30 PM/);
    assert.match(page, /following morning after 10:30 AM/);
    assert.match(page, /Help &amp; Emergency/);
  }
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
    body: JSON.stringify({ room: "6", arrivalAt: "2027-08-13T07:00:00.000Z", expiresHours: 72, nonThaiConfirmed: true })
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
    body: JSON.stringify({ room: "5", arrivalAt: "2027-08-13T07:00:00.000Z", expiresHours: 24, nonThaiConfirmed: true })
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
      records: [{ confirmationCode: "HMABC12345", guestFirstName: "Maya", checkInDate: "2027-08-13", checkOutDate: "2027-08-15" }]
    })
  }), env);
  assert.equal(sync.status, 200);
  assert.equal(store.stayReservations.length, 1);
  assert.equal(store.stayReservations[0].room, "2");
  assert.equal(store.stayReservations[0].guestFirstName, "Maya");
  assert.notEqual(store.stayReservations[0].confirmationCodeHash, "HMABC12345");
  assert.doesNotMatch(JSON.stringify(store.stayReservations), /HMABC12345/);

  const mismatch = await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({
      room: "3",
      listingId: "1349840459014476583",
      records: [{ confirmationCode: "HMMISMATCH1", checkInDate: "2027-08-13", checkOutDate: "2027-08-15" }]
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
      records: [{ confirmationCode: "HMROOM1234", checkInDate: "2027-08-13", checkOutDate: "2027-08-15" }]
    })
  }), env);

  const wrongRoom = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "2", confirmationCode: "HMROOM1234" })
  }), env, "/api/stay/verify", null, new Date("2027-08-13T08:00:00.000Z"));
  assert.equal(wrongRoom.status, 404);

  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "1", confirmationCode: "HMROOM1234" })
  }), env, "/api/stay/verify", null, new Date("2027-08-13T08:00:00.000Z"));
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
      records: [{ confirmationCode: "HMALLGUESTS2", checkInDate: "2027-08-13", checkOutDate: "2027-08-15" }]
    })
  }), env);
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "2", confirmationCode: "HMALLGUESTS2" })
  }), env, "/api/stay/verify", null, new Date("2027-08-13T08:00:00.000Z"));
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

test("foreign guests may present every passport in person and only admin completion unlocks the guide", async () => {
  const { env, store } = createEnvironment();
  await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({
      room: "3",
      listingId: "1384302186705645424",
      records: [{ confirmationCode: "HMINPERSON3", checkInDate: "2027-08-13", checkOutDate: "2027-08-16" }]
    })
  }), env);
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "3", confirmationCode: "HMINPERSON3" })
  }), env, "/api/stay/verify", null, new Date("2027-08-14T08:00:00.000Z"));
  const cookie = verified.headers.get("set-cookie").split(";")[0];

  await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "foreign", nonThaiGuestCount: 2, allNonThaiGuestsIncluded: true })
  }), env, "/api/stay/nationality");
  const handover = await handleStayGuestRequest(new Request("https://guide.example/api/stay/in-person-passports", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ allPassportsInPerson: true })
  }), env, "/api/stay/in-person-passports");
  const pendingBody = await handover.json();
  assert.equal(handover.status, 200);
  assert.equal(pendingBody.registrationStatus, "in_person_pending");
  assert.equal(pendingBody.requiredPassports, 2);
  assert.equal(pendingBody.accessGranted, false);

  const locked = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=3", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status");
  assert.equal((await locked.json()).accessGranted, false);

  const unauthorized = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/in-person-registration", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, registrationCompleted: true })
  }), env, "/api/concierge/admin/in-person-registration");
  assert.equal(unauthorized.status, 401);

  const premature = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/in-person-registration", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id })
  }), env, "/api/concierge/admin/in-person-registration");
  assert.equal(premature.status, 400);

  const completed = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/in-person-registration", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, registrationCompleted: true })
  }), env, "/api/concierge/admin/in-person-registration");
  assert.equal(completed.status, 200);
  assert.equal((await completed.json()).status, "in_person_complete");

  const unlocked = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=3", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status");
  assert.equal((await unlocked.json()).accessGranted, true);
  assert.equal(store.registrationStatuses.get(store.stayReservations[0].id).requiredPassports, 2);
});

test("Worker routing keeps the room guide, photos and private knowledge behind completed registration", async () => {
  const source = await readFile(new URL("../src/index.js", import.meta.url), "utf8");
  assert.match(source, /const page = access\.accessGranted \? "\/room\.html" : "\/room-access\.html"/);
  assert.match(source, /PRIVATE_DIRECT_ASSET\.test\(url\.pathname\) \|\| PRIVATE_ROOM_PHOTO\.test\(url\.pathname\)/);
  assert.match(source, /access\.accessGranted \? roomAsset\(request, env, PRIVATE_KNOWLEDGE_PATH\) : notFound\(\)/);
  assert.match(source, /headers\.set\("cache-control", "private, no-store, max-age=0"\)/);
});

test("public legal routes load without guest or admin authorization and keep security headers", async () => {
  const requestedAssets = [];
  const env = {
    ASSETS: {
      async fetch(request) {
        const pathname = new URL(request.url).pathname;
        requestedAssets.push(pathname);
        const source = await readFile(new URL(`../public${pathname}`, import.meta.url), "utf8");
        return new Response(source, { headers: { "content-type": "text/html; charset=utf-8" } });
      }
    }
  };
  const expectations = [
    ["/privacy", "/privacy.html", "Privacy Policy"],
    ["/data-deletion/", "/data-deletion.html", "Data-deletion instructions"],
    ["/terms.html", "/terms.html", "Terms of Use"]
  ];

  for (const [route, asset, heading] of expectations) {
    const response = await servePublicLegalPage(new Request(`https://guide.example${route}`), env);
    assert.equal(response.status, 200);
    assert.match(await response.text(), new RegExp(heading));
    assert.equal(requestedAssets.at(-1), asset);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
    assert.match(response.headers.get("cache-control"), /^public/);
  }
});

test("public legal documents expose no operational credentials or protected secret names", async () => {
  for (const filename of ["privacy.html", "data-deletion.html", "terms.html"]) {
    const source = await readFile(new URL(`../public/${filename}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /SPARE_KEY_CODES|WHATSAPP_ACCESS_TOKEN|CONCIERGE_ADMIN_TOKEN|STAY_TOKEN_PEPPER|AIRBNB_SYNC_TOKEN/);
    assert.doesNotMatch(source, /(?:EAAG|EAAJ)[A-Za-z0-9_-]{20,}/);
  }
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
    syncedAt: "2027-08-13T08:00:00.000Z",
    records: [{
      confirmationCodeHash: "local_schema_confirmation_hash",
      checkInDate: "2027-08-13",
      checkOutDate: "2027-08-15",
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
      records: [{ confirmationCode: "HMSHORTENED2", checkInDate: "2027-08-10", checkOutDate }]
    })
  }), env);
  await sync("2027-08-20");
  const verifiedAt = new Date("2027-08-13T08:00:00.000Z");
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "2", confirmationCode: "HMSHORTENED2" })
  }), env, "/api/stay/verify", null, verifiedAt);
  const cookie = verified.headers.get("set-cookie").split(";")[0];

  await sync("2027-08-13");
  const expired = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=2", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status", null, new Date("2027-08-13T08:01:00.000Z"));
  assert.equal((await expired.json()).verified, false);
});

test("direct and walk-in stays receive a one-time House code and active stays can be extended", async () => {
  const { env, store } = createEnvironment();
  const created = await handleStayAdminRequest(new Request("https://guide.example/api/concierge/admin/direct-stays", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ room: "3", checkInDate: "2027-08-14", checkOutDate: "2027-08-16" })
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
  }), env, "/api/stay/verify", null, new Date("2027-08-14T08:00:00.000Z"));
  assert.equal(verified.status, 200);

  const extended = await handleStayAdminRequest(new Request("https://guide.example/api/concierge/admin/stay-extension", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, checkOutDate: "2027-08-19" })
  }), env, "/api/concierge/admin/stay-extension", store);
  assert.equal(extended.status, 200);
  assert.equal(store.stayReservations[0].checkOutDate, "2027-08-19");
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
  assert.match(script, /function maintenanceReference\(room, createdAt\)/);
  assert.match(script, /item\.checkOutDate === today && nowMinutes < 660/);
  assert.doesNotMatch(script, /Reference \$\{item\.id\}/);
});

test("verified guests can report routine and critical room problems with protected routing", async () => {
  const { env, store, passportBucket } = createEnvironment();
  await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({
      room: "2",
      listingId: "1349840459014476583",
      records: [{ confirmationCode: "HMREPORT22", checkInDate: "2027-08-13", checkOutDate: "2027-08-18" }]
    })
  }), env);
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "2", confirmationCode: "HMREPORT22" })
  }), env, "/api/stay/verify", null, new Date("2027-08-14T08:00:00.000Z"));
  const cookie = verified.headers.get("set-cookie").split(";")[0];
  await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "thai", allGuestsThai: true })
  }), env, "/api/stay/nationality", null, new Date("2027-08-14T08:01:00.000Z"));

  const blockedCritical = new FormData();
  blockedCritical.set("issueType", "active_water_leak");
  const blocked = await handleMaintenanceGuestRequest(new Request("https://guide.example/api/maintenance/report", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie },
    body: blockedCritical
  }), env);
  assert.equal(blocked.status, 200);

  const routineForm = new FormData();
  routineForm.set("issueType", "wifi_problem");
  routineForm.set("details", "Wi-Fi disconnects near the bed.");
  routineForm.set("replyContact", "+66 81 234 5678");
  const png = new Uint8Array(200);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  routineForm.set("photo", new Blob([png], { type: "image/png" }), "room.png");
  const routine = await handleMaintenanceGuestRequest(new Request("https://guide.example/api/maintenance/report", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie },
    body: routineForm
  }), env);
  assert.equal(routine.status, 200);
  const routineBody = await routine.json();
  assert.match(routineBody.reference, /^R2-D\d{8}-T\d{6}$/);
  assert.doesNotMatch(routineBody.reference, /maint_|[a-f0-9]{8}-[a-f0-9-]{27}/i);
  assert.match(store.alerts.at(-1).summary, new RegExp(`^${routineBody.reference} — wifi problem`));
  assert.equal(store.alerts.at(-1).recipientGroup, "support_with_owners");
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
  assert.equal(store.alerts.at(-1).recipientGroup, "urgent_response");
  assert.doesNotMatch(store.alerts.at(-1).summary, /66812345678|81 234 5678/);
  assert.equal("privateReplyContact" in store.alerts.at(-1), false);
  assert.match(whatsappPayload.template.components[0].parameters[4].text, /Guest reply: \+66812345678/);
  assert.equal(store.maintenanceReports.length, 3);
});

test("after-hours spare-key release uses the verified session, confirms the fee and never alerts either code", async () => {
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
    body: JSON.stringify({ room: "1", listingId: "1376393324098439141", records: [{ confirmationCode: "HMKEY12345", checkInDate: "2027-08-13", checkOutDate: "2027-08-15" }] })
  }), env);
  const afterHours = new Date("2027-08-13T14:00:00.000Z");
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

  const noFee = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ feeAccepted: false })
  }), env, "/api/stay/spare-key", null, afterHours);
  assert.equal(noFee.status, 400);
  assert.equal((await noFee.json()).error, "fee_acceptance_required");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: "wamid.key-release" }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    const released = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true })
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
      body: JSON.stringify({ feeAccepted: true })
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
    body: JSON.stringify({ room: "2", listingId: "1349840459014476583", records: [{ confirmationCode: "HMKEYFAIL2", checkInDate: "2027-08-13", checkOutDate: "2027-08-15" }] })
  }), env);
  const afterHours = new Date("2027-08-13T14:00:00.000Z");
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

test("secure guest access uses the shared header and links discreetly to owner login", async () => {
  const html = await readFile(new URL("../public/room-access.html", import.meta.url), "utf8");
  const inlineStyles = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";

  assert.doesNotMatch(inlineStyles, /\.shell\s*\{/);
  assert.doesNotMatch(inlineStyles, /\.topbar\s*\{/);
  assert.doesNotMatch(inlineStyles, /\.nav\s+a\s*\{/);
  assert.match(html, /<a class="admin-login-link" href="\/concierge-admin">Admin login<\/a>/);
  assert.match(html, /id="createPassportUpload"/);
  assert.match(html, /id="providePassportsInPerson"/);
  assert.match(html, /Enter your stay code to unlock your private room guide/);
  assert.match(html, /Passport information is required for every non-Thai adult and child staying overnight/);
  assert.match(html, /Bring every required original passport to The House/);
  assert.doesNotMatch(html, /Room location, arrival photos, Wi-Fi and stay instructions remain protected until this is complete/);
  assert.doesNotMatch(html, /This confirms that this permanent link belongs to your booked room/);
  const entry = await readFile(new URL("../public/registration-entry.js", import.meta.url), "utf8");
  assert.match(entry, /\/api\/stay\/in-person-passports/);
});

test("Bangkok booking dates normalize without inventing a missing time", () => {
  const now = new Date("2026-08-26T03:00:00.000Z");
  assert.equal(normalizeBangkokRequestedDate("tomorrow", now), "27 Aug 2026");
  assert.equal(normalizeBangkokRequestedDate("in 5 days", now), "31 Aug 2026");
  assert.equal(normalizeBangkokRequestedDate("next Friday at 9", now), "28 Aug 2026, 9:00 AM");
});

test("House emergency support resolves Owner 2 or West instead of Su", async () => {
  const env = { WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
    support: [{ label: "Su", phone: "+66 64 000 0001" }],
    emergency: [{ label: "Owner 1", phone: "+66 81 000 0002" }, { label: "West / Owner 2", phone: "+66 82 000 0003" }]
  }) };
  const contact = houseEmergencyContact(env);
  assert.equal(contact.phoneTel, "+66820000003");
  assert.notEqual(contact.phoneTel, "+66640000001");
  const script = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  assert.match(script, /api\/concierge\/emergency-contact/);
});

test("booking contact is required, kept out of stored records and included only in delivery", async () => {
  const { env, store } = createEnvironment({
    WHATSAPP_ACCESS_TOKEN: "token", WHATSAPP_PHONE_NUMBER_ID: "123", WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify", META_APP_SECRET: "secret",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ booking: [{ label: "Fah", phone: "+66 96 000 0001" }] })
  });
  const originalFetch = globalThis.fetch;
  let payload;
  globalThis.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return new Response(JSON.stringify({ messages: [{ id: "wamid.booking.contact" }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const first = await handleConciergeRequest(guestRequest("Please book snorkelling tomorrow for 2 guests"), env);
    assert.match((await first.json()).answer, /country code/);
    assert.equal(store.alerts.length, 0);
    await handleConciergeRequest(guestRequest("+66 81 234 5678", { history: [
      { role: "user", content: "Please book snorkelling tomorrow for 2 guests" },
      { role: "assistant", content: "What WhatsApp or phone number can our team use to contact you? Please include the country code." }
    ] }), env);
    assert.equal(store.alerts.length, 1);
    assert.doesNotMatch(JSON.stringify(store.interactions), /66812345678|81 234 5678/);
    assert.doesNotMatch(JSON.stringify(store.alerts), /66812345678|81 234 5678/);
    assert.match(payload.template.components[0].parameters[5].text, /Guest reply: \+66812345678/);
    assert.match(payload.template.components[0].parameters[3].text, /\d{2} \w{3} \d{4}/);
  } finally { globalThis.fetch = originalFetch; }
});

test("WhatsApp acknowledgement notifies other assigned recipients once without exposing phones", async () => {
  const { env, store } = createEnvironment({
    WHATSAPP_ACCESS_TOKEN: "token", WHATSAPP_PHONE_NUMBER_ID: "123", WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify", META_APP_SECRET: "status-secret",
    WHATSAPP_STATUS_TEMPLATE_NAME: "house_alert_status_v1",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66 64 000 0001" }],
      emergency: [{ label: "Owner 1", phone: "+66 81 000 0002" }, { label: "West / Owner 2", phone: "+66 82 000 0003" }]
    })
  });
  const id = "alert_12345678-1234-1234-1234-123456789099";
  store.alerts.push({ id, alertType: "stay_support", recipientGroup: "support_with_owners", room: "3", status: "open", summary: "Fresh towels", createdAt: new Date().toISOString() });
  const raw = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: "66640000001", text: { body: `RECEIVED ${id}` } }] } }] }] });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.META_APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = `sha256=${Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw))).toString("hex")}`;
  const outbound = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.status.${outbound.length}` }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const request = () => new Request("https://guide.example/api/whatsapp/webhook", { method: "POST", headers: { "x-hub-signature-256": signature }, body: raw });
    await handleWhatsAppWebhook(request(), env);
    await handleWhatsAppWebhook(request(), env);
    assert.equal(store.alerts[0].status, "acknowledged");
    assert.equal(outbound.length, 2);
    assert.deepEqual(outbound.map((item) => item.to).sort(), ["66810000002", "66820000003"]);
    assert.doesNotMatch(JSON.stringify(outbound), /66640000001/);
    assert.equal(store.alerts.length, 1);
  } finally { globalThis.fetch = originalFetch; }
});
