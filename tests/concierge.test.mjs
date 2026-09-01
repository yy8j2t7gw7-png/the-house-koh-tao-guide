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
import { handleMaintenanceAdminRequest, handleMaintenanceGuestRequest } from "../src/maintenance-api.js";
import { handleExpenseAdminRequest } from "../src/expense-api.js";
import { handleFinanceAdminRequest } from "../src/finance-api.js";
import {
  learningClusterKey,
  matchKnowledge,
  sanitizeQuestion
} from "../src/concierge-core.js";
import { retrieveApprovedProjectKnowledge } from "../src/project-knowledge.js";
import { handleTranslationRequest } from "../src/i18n-api.js";
import { classifyConciergeAlert, formatBangkokAlertTime, isAfterHours, normalizeBangkokRequestedDate, safeAlertSummary } from "../src/alert-policy.js";
import {
  buildWhatsAppFailureDiagnostic,
  buildWhatsAppStatusPayload,
  buildWhatsAppTemplatePayload,
  createConciergeAlert,
  dispatchConciergeAlert,
  handleWhatsAppWebhook,
  houseEmergencyContact,
  processDueAlertEscalations,
  validateWhatsAppTemplateParameters,
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
import divingCourses from "../public/data/diving-courses.json" with { type: "json" };
import {
  courseChoiceLabels,
  matchDivingCourse,
  roctopusGuidance,
  validDivingGroup
} from "../src/diving-catalog.js";


const OPAQUE_TEST_FIELD_NAMES = new Set([
  "id",
  "alertId",
  "deliveryId",
  "interactionId",
  "reservationId",
  "requestHash",
  "dedupeKey",
  "recipientHash",
  "providerMessageId",
  "traceId"
]);

const OPAQUE_TEST_VALUE_PATTERN = /^[a-z][a-z0-9-]*_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function withoutOpaqueTestIdentifiers(value) {
  if (Array.isArray(value)) return value.map(withoutOpaqueTestIdentifiers);
  if (typeof value === "string" && OPAQUE_TEST_VALUE_PATTERN.test(value)) return "[opaque-test-id]";
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !OPAQUE_TEST_FIELD_NAMES.has(key))
      .map(([key, nested]) => [key, withoutOpaqueTestIdentifiers(nested)])
  );
}

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
    expenseRecords: [],
    incomeRecords: [],
    alerts: [],
    alertDeliveries: [],
    bookingRetrySnapshots: [],
    whatsappDiagnostics: [],
    dismissedDiagnostics: new Set(),
    adminAudit: [],
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
      const alerts = this.alerts.filter((alert) => alert.status !== "resolved").map((alert) => {
        const deliveries = this.alertDeliveries.filter((delivery) => delivery.alertId === alert.id);
        return {
          ...alert,
          attempted: deliveries.filter((delivery) => delivery.status !== "not_configured").length,
          delivered: deliveries.filter((delivery) => ["accepted", "sent", "delivered", "read"].includes(delivery.status)).length,
          failed: deliveries.filter((delivery) => delivery.status === "failed").length
        };
      });
      const deliveryDiagnostics = this.whatsappDiagnostics
        .filter((item) => !this.dismissedDiagnostics.has(item.id))
        .map((item) => ({
          ...item,
          alertStatus: this.alerts.find((alert) => alert.id === item.alertId)?.status || ""
        }));
      return {
        totals: {
          interactions24h: 1, interactions30d: 1, gaps30d: 0, handoffs30d: 0, positive: 0, negative: 0, pending: 0, approved: 0,
          openMaintenanceReports: this.maintenanceReports.filter((item) => item.status !== "resolved").length,
          openAlerts: alerts.length,
          criticalAlerts: alerts.filter((item) => item.severity === "critical").length
        },
        queue: [], approved: [], alerts, recent: [], deliveryDiagnostics,
        maintenanceReports: this.maintenanceReports.map((item) => ({ ...item, hasPhoto: Boolean(item.photoObjectKey), photoObjectKey: undefined }))
      };
    },
    async createExpense(record) {
      this.expenseRecords.push({ ...record, hasReceipt: Boolean(record.receiptObjectKey) });
      this.adminAudit.push({ action: "expense_created", reference: `expense:${record.id}`, createdAt: record.createdAt });
      return { ok: true };
    },
    async listExpenses(month) {
      return this.expenseRecords
        .filter((item) => item.expenseDate.startsWith(month))
        .map((item) => ({ ...item, hasReceipt: Boolean(item.receiptObjectKey) }))
        .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
    },
    async getExpense(id) {
      const item = this.expenseRecords.find((record) => record.id === id);
      return item ? { ...item, hasReceipt: Boolean(item.receiptObjectKey) } : null;
    },
    async findExpenseDuplicates(expenseDate, amountMinor, vendor, currency = "THB") {
      const vendorValue = String(vendor || "").toLowerCase();
      return this.expenseRecords.filter((item) => item.expenseDate === expenseDate && item.amountMinor === amountMinor && item.currency === currency && (!vendorValue || String(item.vendor || "").toLowerCase() === vendorValue));
    },
    async deleteExpense(id, actorHash, now) {
      const index = this.expenseRecords.findIndex((item) => item.id === id);
      if (index < 0) return { ok: false, error: "not_found" };
      this.expenseRecords.splice(index, 1);
      this.adminAudit.push({ action: "expense_deleted", reference: `expense:${id}`, actorHash, createdAt: now });
      return { ok: true, deleted: true };
    },
    async createIncome(record) {
      this.incomeRecords.push({ ...record });
      this.adminAudit.push({ action: "income_created", reference: `income:${record.id}`, createdAt: record.createdAt });
      return { ok: true };
    },
    async listIncome(month) {
      return this.incomeRecords
        .filter((item) => item.incomeDate.startsWith(month))
        .map((item) => ({ ...item }))
        .sort((a, b) => b.incomeDate.localeCompare(a.incomeDate));
    },
    async getIncome(id) {
      return this.incomeRecords.find((item) => item.id === id) || null;
    },
    async findIncomeDuplicates(incomeDate, grossMinor, unit, reference, currency = "THB") {
      const unitValue = String(unit || "").toLowerCase();
      const referenceValue = String(reference || "").toLowerCase();
      return this.incomeRecords.filter((item) => item.incomeDate === incomeDate && item.grossMinor === grossMinor && item.currency === currency
        && (!unitValue || String(item.unit || "").toLowerCase() === unitValue)
        && (!referenceValue || String(item.reference || "").toLowerCase() === referenceValue));
    },
    async deleteIncome(id, actorHash, now) {
      const index = this.incomeRecords.findIndex((item) => item.id === id);
      if (index < 0) return { ok: false, error: "not_found" };
      this.incomeRecords.splice(index, 1);
      this.adminAudit.push({ action: "income_deleted", reference: `income:${id}`, actorHash, createdAt: now });
      return { ok: true, deleted: true };
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
        rotations: [...this.spareKeyRotations.entries()]
          .filter(([, required]) => required)
          .map(([room]) => ({ room, rotationRequired: true })),
        rotationActivity: this.spareKeyEvents
          .filter((item) => ["rotation_cleared_controlled_test", "rotation_cleared_physical"].includes(item.eventType))
          .map(({ id, room, eventType, createdAt }) => ({ id, room, eventType, createdAt }))
          .reverse()
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
      return reservation ? { ...reservation, ...session, reservationId: reservation.id, reservationStatus: reservation.status } : null;
    },
    async revokeVerifiedStaySession(tokenHash, now) {
      const session = this.staySessions.find((item) => item.tokenHash === tokenHash);
      if (session) session.revokedAt = now;
      return { ok: true };
    },
    async replaceDirectStayConfirmationCode(reservationId, confirmationCodeHash, updatedAt) {
      const reservation = this.stayReservations.find((item) => item.id === reservationId);
      if (!reservation) return { ok: false, error: "reservation_not_found" };
      if (reservation.provider !== "direct") return { ok: false, error: "direct_stay_required" };
      if (reservation.status !== "confirmed") return { ok: false, error: "reservation_not_active" };
      if (this.stayReservations.some((item) => item.id !== reservationId && item.confirmationCodeHash === confirmationCodeHash)) {
        return { ok: false, error: "code_collision" };
      }
      reservation.confirmationCodeHash = confirmationCodeHash;
      reservation.updatedAt = updatedAt;
      return { ok: true, reservationId, room: reservation.room, updatedAt };
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
    async startInPersonRegistration(reservationId, requiredPassports, updatedAt) {
      const reservation = this.stayReservations.find((item) => item.id === reservationId && item.status === "confirmed");
      if (!reservation) return { ok: false, error: "reservation_not_found" };
      if (!Number.isInteger(requiredPassports) || requiredPassports < 1 || requiredPassports > 10) {
        return { ok: false, error: "invalid_non_thai_guest_count" };
      }
      const current = this.registrationStatuses.get(reservationId) || {};
      const receivedPassports = this.passportRecords.filter(
        (item) => item.reservationId === reservationId && item.status === "uploaded"
      ).length;
      if (Math.max(Number(current.receivedPassports) || 0, receivedPassports) > 0 || ["passport_complete", "in_person_complete"].includes(current.status)) {
        return { ok: false, error: "registration_evidence_exists" };
      }
      await this.closePendingPassportLinksForReservation(reservationId, updatedAt);
      const value = { guestType: "foreign", requiredPassports, receivedPassports: 0, status: "in_person_pending", updatedAt };
      this.registrationStatuses.set(reservationId, value);
      return { ok: true, ...value };
    },
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
    async resetPendingInPersonRegistration(reservationId, updatedAt) {
      const current = this.registrationStatuses.get(reservationId);
      if (!current || current.status !== "in_person_pending") {
        return { ok: false, error: "in_person_handover_not_pending" };
      }
      const receivedPassports = this.passportRecords.filter(
        (item) => item.reservationId === reservationId && item.status === "uploaded"
      ).length;
      if (Math.max(Number(current.receivedPassports) || 0, receivedPassports) > 0) {
        return { ok: false, error: "registration_reset_requires_staff_review" };
      }
      await this.closePendingPassportLinksForReservation(reservationId, updatedAt);
      this.registrationStatuses.set(reservationId, { status: "not_started", updatedAt });
      return { ok: true, status: "not_started", updatedAt };
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
        releasedForReservation: this.spareKeyRotations.get(room) === true
          && this.spareKeyEvents.some((item) => item.reservationId === reservationId && item.codeReleased),
        rotationRequired: this.spareKeyRotations.get(room) === true
      };
    },
    async recordSpareKeyEvent(record) {
      this.spareKeyEvents.push(record);
      if (record.codeReleased) this.spareKeyRotations.set(record.room, true);
      return { ok: true };
    },
    async claimSpareKeyRelease(record) {
      if (this.spareKeyEvents.some((item) => item.requestHash === record.requestHash)) {
        return { ok: false, error: "lost_key_request_used" };
      }
      if (this.spareKeyRotations.get(record.room) === true) return { ok: false, error: "key_code_rotation_required" };
      this.spareKeyEvents.forEach((item) => {
        if (item.room === record.room && !item.codeReleased
          && ["notification_pending", "notification_accepted"].includes(item.eventType)) item.eventType = "superseded";
      });
      this.spareKeyEvents.push({ ...record, eventType: "notification_pending", feeAccepted: true, codeReleased: false, alertId: "" });
      return { ok: true };
    },
    async authorizeSpareKeyView(record) {
      const target = this.spareKeyEvents.find((item) => item.id === record.id
        && item.reservationId === record.reservationId
        && item.room === record.room
        && item.requestHash === record.requestHash
        && item.eventType === "notification_pending"
        && !item.codeReleased);
      if (!target) return { ok: false };
      Object.assign(target, { eventType: "notification_accepted", alertId: record.alertId || "" });
      return { ok: true };
    },
    async finalizeSpareKeyRelease(record) {
      if (this.spareKeyRotations.get(record.room) === true) return { ok: false, error: "key_code_rotation_required" };
      const target = this.spareKeyEvents.find((item) => item.id === record.id
        && item.reservationId === record.reservationId
        && item.room === record.room
        && item.requestHash === record.requestHash
        && item.eventType === "notification_accepted"
        && !item.codeReleased);
      if (!target) return { ok: false, error: "claim_not_found" };
      Object.assign(target, record, { eventType: "verified_spare_key_release", codeReleased: true });
      this.spareKeyRotations.set(record.room, true);
      return { ok: true };
    },
    async cancelSpareKeyClaim(id) {
      const index = this.spareKeyEvents.findIndex((item) => item.id === id && !item.codeReleased);
      if (index >= 0) this.spareKeyEvents.splice(index, 1);
      return { ok: true };
    },
    async deleteSpareKeyRotationActivity(id) {
      const index = this.spareKeyEvents.findIndex((item) =>
        item.id === id && ["rotation_cleared_controlled_test", "rotation_cleared_physical"].includes(item.eventType));
      if (index < 0) return { ok: false, error: "rotation_activity_not_found" };
      this.spareKeyEvents.splice(index, 1);
      return { ok: true, id };
    },
    async confirmSpareKeyRotation(room, rotationConfirmedAt, resetMode) {
      if (!["controlled_test", "physical_rotation"].includes(resetMode)) return { ok: false, error: "invalid_reset_mode" };
      if (this.spareKeyRotations.get(room) !== true) return { ok: false, error: "rotation_not_required" };
      const latestRelease = this.spareKeyEvents.findLast((item) => item.room === room && item.codeReleased);
      this.spareKeyEvents.push({
        id: `key_reset_${crypto.randomUUID()}`,
        reservationId: latestRelease?.reservationId || "",
        room,
        eventType: resetMode === "controlled_test" ? "rotation_cleared_controlled_test" : "rotation_cleared_physical",
        feeAccepted: false,
        codeReleased: false,
        requestHash: "",
        alertId: "",
        createdAt: rotationConfirmedAt
      });
      this.spareKeyRotations.set(room, false);
      return { ok: true, room, resetMode, rotationConfirmedAt };
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
    async recordAdminAudit(action, reference, now) {
      this.adminAudit.push({ action, reference, bangkokTime: formatBangkokAlertTime(new Date(now)), createdAt: now });
      return { ok: true };
    },
    async resolveMaintenanceReport(id, actorHash, now) {
      const target = this.maintenanceReports.find((item) => item.id === id);
      if (!target) return { ok: false, error: "not_found" };
      if (target.status === "resolved") return { ok: true, unchanged: true, status: "resolved" };
      if (!["open", "acknowledged"].includes(target.status)) return { ok: false, error: "invalid_status" };
      Object.assign(target, { status: "resolved", resolvedAt: now, deleteAfter: now });
      const alert = this.alerts.find((item) => item.id === target.alertId);
      if (alert) Object.assign(alert, { status: "resolved", resolvedAt: now, resolvedByHash: actorHash });
      await this.recordAdminAudit("maintenance_report_resolved", `maintenance:${id}`, now);
      return { ok: true, status: "resolved" };
    },
    async removeMaintenanceReport(id, now) {
      const index = this.maintenanceReports.findIndex((item) => item.id === id);
      if (index < 0) return { ok: false, error: "not_found" };
      if (this.maintenanceReports[index].status !== "resolved") return { ok: false, error: "resolve_required" };
      this.maintenanceReports.splice(index, 1);
      await this.recordAdminAudit("maintenance_report_removed", `maintenance:${id}`, now);
      return { ok: true, removed: true };
    },
    async createAlert(record) {
      const existing = this.alerts.find((alert) => alert.dedupeKey === record.dedupeKey && alert.status !== "resolved");
      if (existing) {
        const deliveries = this.alertDeliveries.filter((delivery) => delivery.alertId === existing.id);
        return {
          created: false,
          alert: {
            ...existing,
            deliveryAttempts: deliveries.length,
            acceptedDeliveries: deliveries.filter((delivery) => ["accepted", "sent", "delivered", "read"].includes(delivery.status)).length
          }
        };
      }
      this.alerts.push({ ...record, status: "open", acknowledgedAt: "", resolvedAt: "", escalatedAt: "" });
      return { created: true };
    },
    async upsertBookingRetrySnapshot(record) {
      if (!record.alertId || !record.bindingHash || !record.reservationId || !record.room || !record.kind || !record.expiresAt) {
        return { ok: false };
      }
      const existing = this.bookingRetrySnapshots.find((item) => item.alertId === record.alertId);
      const value = { ...record, status: "retryable" };
      if (existing) Object.assign(existing, value);
      else this.bookingRetrySnapshots.push(value);
      return { ok: true, alertId: record.alertId };
    },
    async getBookingRetrySnapshots(bindingHash, reservationId, room, nowValue) {
      return this.bookingRetrySnapshots
        .filter((item) => item.bindingHash === bindingHash
          && item.reservationId === reservationId
          && item.room === room
          && ["retryable", "submitted"].includes(item.status)
          && item.expiresAt > nowValue)
        .map((item) => {
          const deliveries = this.alertDeliveries.filter((delivery) => delivery.alertId === item.alertId);
          return {
            ...item,
            deliveryAttempts: deliveries.length,
            acceptedDeliveries: deliveries.filter((delivery) => ["accepted", "sent", "delivered", "read"].includes(delivery.status)).length
          };
        })
        .sort((left, right) => String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt)));
    },
    async setBookingRetrySnapshotStatus(alertId, bindingHash, status, updatedAt) {
      const target = this.bookingRetrySnapshots.find((item) => item.alertId === alertId && item.bindingHash === bindingHash);
      if (target) Object.assign(target, { status, updatedAt });
      return { ok: Boolean(target) };
    },
    async getBookingAlertForRetry(alertId) {
      const alert = this.alerts.find((item) => item.id === alertId
        && item.alertType === "booking_request"
        && ["open", "acknowledged"].includes(item.status));
      if (!alert) return null;
      const deliveries = this.alertDeliveries.filter((delivery) => delivery.alertId === alertId);
      return {
        ...alert,
        deliveryAttempts: deliveries.length,
        acceptedDeliveries: deliveries.filter((delivery) => ["accepted", "sent", "delivered", "read"].includes(delivery.status)).length
      };
    },
    async recordAlertDelivery(record) { this.alertDeliveries.push(record); return { ok: true }; },
    async recordWhatsAppDiagnostic(record) {
      this.whatsappDiagnostics.push(record);
      return { ok: true };
    },
    async dismissWhatsAppDiagnostic(id, now) {
      const target = this.whatsappDiagnostics.find((item) => item.id === id);
      if (!target) return { ok: false, error: "not_found" };
      this.dismissedDiagnostics.add(id);
      await this.recordAdminAudit("whatsapp_diagnostic_dismissed", `alert:${target.alertId}`, now);
      return { ok: true, dismissed: true };
    },
    async clearWhatsAppDiagnosticsForAlert(alertId, now) {
      const alert = this.alerts.find((item) => item.id === alertId);
      if (!alert) return { ok: false, error: "not_found" };
      if (alert.status !== "resolved") return { ok: false, error: "alert_not_resolved" };
      const targets = this.whatsappDiagnostics.filter((item) => item.alertId === alertId);
      targets.forEach((item) => this.dismissedDiagnostics.add(item.id));
      if (targets.length) await this.recordAdminAudit("whatsapp_alert_diagnostics_cleared", `alert:${alertId}`, now);
      return { ok: true, cleared: targets.length };
    },
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
      this.maintenanceReports.filter((item) => item.alertId === id).forEach((item) => Object.assign(item, { status: "resolved", resolvedAt: now, deleteAfter: now }));
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

function verifiedConciergeRequest(question, cookie, extra = {}) {
  return new Request("https://guide.example/api/concierge", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      question,
      room: "11",
      sessionId: "session_verified_1234567890",
      history: [],
      ...extra
    })
  });
}

async function createFailedOpenWaterBooking(env, now, {
  sessionId = "session_failed_open_water_12345",
  requestFactory = (question, extra) => guestRequest(question, { sessionId, ...extra })
} = {}) {
  const ready = await handleConciergeRequest(
    requestFactory("I want to book a PADI Open Water Diver course tomorrow for 4 divers, same for everyone.", {}),
    env,
    undefined,
    now
  );
  const readyBody = await ready.json();
  assert.deepEqual(readyBody.workflow.missing, ["contact"]);
  const failed = await handleConciergeRequest(
    requestFactory("+66 81 234 5678", { workflowState: readyBody.workflow }),
    env,
    undefined,
    new Date(now.getTime() + 100)
  );
  const failedBody = await failed.json();
  assert.equal(failedBody.workflow.status, "delivery_failed");
  assert.match(failedBody.workflow.retryAlertId, /^alert_[A-Za-z0-9-]{20,}$/);
  return { readyBody, failedBody };
}

async function syncAndVerifyStay(env, {
  room = "11",
  confirmationCode = "HMROOM11A",
  checkInDate = "2026-08-27",
  // Keep the shared verified-stay fixture safely active when the historical
  // suite is run on or after 30 Aug 2026. Tests that need a specific checkout
  // date override this value explicitly.
  checkOutDate = "2026-09-30",
  now = new Date("2026-08-28T04:30:00.000Z")
} = {}) {
  const listingId = Object.entries(listingRoomMap).find(([, mappedRoom]) => mappedRoom === room)?.[0];
  assert.ok(listingId, `missing listing for Room ${room}`);
  const sync = await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ room, listingId, records: [{ confirmationCode, checkInDate, checkOutDate }] })
  }), env);
  assert.equal(sync.status, 200);
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room, confirmationCode })
  }), env, "/api/stay/verify", null, now);
  assert.equal(verified.status, 200);
  return verified.headers.get("set-cookie").split(";")[0];
}

async function currentLostKeyRequest(env, cookie, room = "11", now = new Date("2026-08-28T04:30:00.000Z")) {
  const response = await handleStayGuestRequest(new Request(`https://guide.example/api/stay/status?room=${room}`, {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status", null, now);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.verified, true);
  return body;
}

async function viewAuthorizedSpareKey(env, cookie, authorization, now) {
  assert.equal(authorization.canViewSpareKey, true);
  assert.ok(authorization.spareKeyViewToken);
  assert.equal("keyBoxCode" in authorization, false);
  return handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key/view", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ spareKeyViewToken: authorization.spareKeyViewToken })
  }), env, "/api/stay/spare-key/view", null, now);
}

async function markForeignRegistrationPending(env, cookie, count = 2, now = new Date("2026-08-28T04:30:00.000Z")) {
  const response = await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "foreign", nonThaiGuestCount: count, allNonThaiGuestsIncluded: true })
  }), env, "/api/stay/nationality", null, now);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.registrationStatus, "passport_pending");
  return body;
}

async function signedWhatsAppCommand(env, from, text) {
  const raw = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from, text: { body: text } }] } }] }] });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = `sha256=${Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw))).toString("hex")}`;
  return new Request("https://guide.example/api/whatsapp/webhook", {
    method: "POST",
    headers: { "x-hub-signature-256": signature },
    body: raw
  });
}

async function signedWhatsAppButton(env, from, payload, text = "Received") {
  const raw = JSON.stringify({
    entry: [{ changes: [{ value: { messages: [{ from, type: "button", button: { payload, text } }] } }] }]
  });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = `sha256=${Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw))).toString("hex")}`;
  return new Request("https://guide.example/api/whatsapp/webhook", {
    method: "POST",
    headers: { "x-hub-signature-256": signature },
    body: raw
  });
}

test("critical guest requests stay deterministic and room-aware", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const pending = [];
  const response = await handleConciergeRequest(
    guestRequest("I lost my key"),
    env,
    { waitUntil: (promise) => pending.push(promise) },
    new Date("2026-08-28T14:00:00.000Z")
  );
  const body = await response.json();
  await Promise.all(pending);
  assert.equal(response.status, 200);
  assert.equal(body.intentId, "lost_key");
  assert.match(body.answer, /500 THB/);
  assert.equal(body.actions[0].type, "spare-key");
  assert.equal(body.actions[0].label, "Continue securely");
  assert.equal(body.source, "lost-key-policy");
  assert.match(body.interactionId, /^int_/);
  assert.equal(store.interactions[0].room, "6");
  assert.equal(store.interactions[0].learningGap, false);
});

test("every clear lost-key and lockout phrase enters the same protected path before generic routing", async () => {
  const now = new Date("2026-08-28T09:00:00.000Z");
  const { env, store } = createEnvironment({ GUEST_ACCESS_ENFORCEMENT: "true" });
  const cookie = await syncAndVerifyStay(env, { now });
  const phrases = [
    "lost key",
    "I lost my key",
    "lost my key",
    "key lost",
    "locked out",
    "I’m locked out",
    "I am locked out",
    "can’t get into my room",
    "cannot get into my room",
    "forgot my key",
    "I forgot my room key",
    "need spare key",
    "where is my spare key"
  ];

  for (const phrase of phrases) {
    const response = await handleConciergeRequest(verifiedConciergeRequest(phrase, cookie), env, undefined, now);
    const body = await response.json();
    assert.equal(response.status, 200, phrase);
    assert.equal(body.intentId, "lost_key", phrase);
    assert.equal(body.source, "lost-key-policy", phrase);
    assert.equal(body.needsHuman, false, phrase);
    assert.match(body.answer, /500 THB replacement fee/i, phrase);
    assert.equal(body.actions.some((action) => action.type === "spare-key"), true, phrase);
    assert.doesNotMatch(body.answer, /couldn’t reach The House team/i, phrase);
  }

  assert.equal(store.alerts.length, 0);
  assert.equal(store.alertDeliveries.length, 0);
});

test("a repeated lost-key synonym while fee acceptance is pending preserves the protected path without an alert", async () => {
  const now = new Date("2026-08-28T09:00:00.000Z");
  const { env, store } = createEnvironment({ GUEST_ACCESS_ENFORCEMENT: "true" });
  const cookie = await syncAndVerifyStay(env, { now });
  const first = await handleConciergeRequest(verifiedConciergeRequest("I lost my key", cookie), env, undefined, now);
  const firstBody = await first.json();
  const repeated = await handleConciergeRequest(verifiedConciergeRequest("lost key", cookie, {
    history: [
      { role: "user", content: "I lost my key" },
      { role: "assistant", content: firstBody.answer }
    ]
  }), env, undefined, now);
  const repeatedBody = await repeated.json();

  assert.equal(firstBody.intentId, "lost_key");
  assert.equal(repeatedBody.intentId, "lost_key");
  assert.equal(repeatedBody.source, "lost-key-policy");
  assert.equal(repeatedBody.needsHuman, false);
  assert.match(repeatedBody.answer, /500 THB replacement fee/i);
  assert.equal(repeatedBody.actions.some((action) => action.type === "spare-key"), true);
  assert.equal(store.alerts.length, 0);
  assert.equal(store.alertDeliveries.length, 0);
});

test("generic human requests are AI-first, then expose routine contacts only after persistence during open hours", async () => {
  const { env, store } = createEnvironment();
  const saturday0820 = new Date("2026-08-29T01:20:00.000Z");
  const saturday1500 = new Date("2026-08-29T08:00:00.000Z");
  const monday1500 = new Date("2026-08-31T08:00:00.000Z");
  const phrases = [
    "I wanna talk to a human",
    "I want to talk to a human",
    "I need to talk to a human",
    "can I speak to someone",
    "can I talk to someone",
    "I want to speak to someone",
    "human please",
    "can I talk to staff",
    "speak to staff",
    "talk to staff",
    "I need a person",
    "contact the team",
    "talk to the team",
    "speak to reception",
    "reception please",
    "I wanna call you",
    "can I call someone?",
    "call the team",
    "call the hotel"
  ];

  for (const phrase of phrases) {
    const response = await handleConciergeRequest(guestRequest(phrase), env, undefined, saturday0820);
    const body = await response.json();
    assert.equal(body.intentId, "generic_human_contact", phrase);
    assert.equal(body.source, "human-contact-policy", phrase);
    assert.equal(body.needsHuman, false, phrase);
    assert.match(body.answer, /outside normal service hours/i, phrase);
    assert.equal(body.actions.some((action) => action.route === "houseCall"), false, phrase);
    assert.equal(body.actions.some((action) => action.route === "houseWhatsapp"), false, phrase);
    assert.equal(body.actions.some((action) => action.href === "/emergency.html"), true, phrase);
  }

  const open = await handleConciergeRequest(guestRequest("I wanna call you"), env, undefined, saturday1500);
  const openBody = await open.json();
  assert.equal(openBody.intentId, "generic_human_contact");
  assert.match(openBody.answer, /what you need help with/i);
  assert.equal(openBody.actions.some((action) => action.route === "houseWhatsapp"), false);
  assert.equal(openBody.actions.some((action) => action.route === "houseCall"), false);

  const persistent = await handleConciergeRequest(guestRequest("I still need a human", {
    history: [
      { role: "user", content: "I wanna call you" },
      { role: "assistant", content: openBody.answer }
    ]
  }), env, undefined, saturday1500);
  const persistentBody = await persistent.json();
  assert.equal(persistentBody.intentId, "generic_human_contact");
  assert.match(persistentBody.answer, /contact The House team directly/i);
  assert.doesNotMatch(persistentBody.answer, /\bSu\b/i);
  assert.equal(persistentBody.actions.some((action) => action.route === "houseWhatsapp"), true);
  assert.equal(persistentBody.actions.some((action) => action.route === "houseCall"), true);

  const monday = await handleConciergeRequest(guestRequest("I wanna call you"), env, undefined, monday1500);
  const mondayBody = await monday.json();
  assert.match(mondayBody.answer, /outside normal service hours/i);
  assert.equal(mondayBody.actions.some((action) => action.route === "houseCall"), false);
  assert.equal(mondayBody.actions.some((action) => action.route === "houseWhatsapp"), false);
  assert.equal(mondayBody.actions.some((action) => action.href === "/emergency.html"), true);
  assert.equal(store.alerts.length, 0);
  assert.equal(store.alertDeliveries.length, 0);
});

test("inactive historical topics cannot contaminate the production generic-human phrase", async () => {
  const { env, store } = createEnvironment();
  const openHours = new Date("2026-08-29T08:00:00.000Z");
  const closedHours = new Date("2026-08-29T01:20:00.000Z");
  const histories = [
    ["I lost my key", "There is a 500 THB replacement fee.", "cancel", "Okay, the lost-key request was cancelled."],
    ["I want to book diving", "Which diving option would you prefer?", "cancel", "The diving request was cancelled."],
    ["Please clean my room", "What time would be most convenient?", "cancel", "The cleaning request was cancelled."],
    ["My AC is not cold", "I sent the AC problem to the team.", "thanks", "You’re welcome."],
    ["The window lock is broken", "I recorded the maintenance request.", "thanks", "You’re welcome."],
    ["I need luggage storage", "How many bags?", "cancel", "The luggage request was cancelled."],
    ["Where is the hospital?", "Use Emergency help for current medical danger.", "thanks", "You’re welcome."]
  ];
  for (const items of histories) {
    const history = items.map((content, index) => ({ role: index % 2 ? "assistant" : "user", content }));
    const response = await handleConciergeRequest(
      guestRequest("I wanna talk to a human", { history }),
      env,
      undefined,
      openHours
    );
    const body = await response.json();
    assert.equal(body.intentId, "generic_human_contact");
    assert.equal(body.source, "human-contact-policy");
    assert.match(body.answer, /^Of course\./);
    assert.doesNotMatch(body.answer, /500 THB|spare key|lost key|diving|cleaning|\bAC\b|maintenance|window|luggage|Rescue|1669/i);
    assert.equal(body.actions.some((action) => action.route === "houseWhatsapp"), false);
    assert.equal(body.actions.some((action) => action.route === "houseCall"), false);

    const closedResponse = await handleConciergeRequest(
      guestRequest("I wanna talk to a human", { history }),
      env,
      undefined,
      closedHours
    );
    const closedBody = await closedResponse.json();
    assert.equal(closedBody.intentId, "generic_human_contact");
    assert.equal(closedBody.source, "human-contact-policy");
    assert.match(closedBody.answer, /outside normal service hours/i);
    assert.doesNotMatch(closedBody.answer, /500 THB|spare key|lost key|diving|cleaning|\bAC\b|maintenance|window|luggage|Rescue|1669/i);
    assert.equal(closedBody.actions.some((action) => action.route === "houseWhatsapp"), false);
    assert.equal(closedBody.actions.some((action) => action.route === "houseCall"), false);
    assert.equal(closedBody.actions.some((action) => action.href === "/emergency.html"), true);
  }
  assert.equal(store.alerts.length, 0);
});

test("only explicit lost-key workflow state may influence a generic human request", async () => {
  const { env, store } = createEnvironment();
  const first = await handleConciergeRequest(
    guestRequest("I lost my key"),
    env,
    undefined,
    new Date("2026-08-29T08:00:00.000Z")
  );
  const firstBody = await first.json();
  assert.deepEqual(firstBody.workflow, { type: "lost_key", status: "awaiting_fee_acceptance" });
  const history = [
    { role: "user", content: "I lost my key" },
    { role: "assistant", content: firstBody.answer }
  ];
  const open = await handleConciergeRequest(
    guestRequest("I wanna talk to a human", { history, workflowState: firstBody.workflow }),
    env,
    undefined,
    new Date("2026-08-29T08:00:00.000Z")
  );
  const openBody = await open.json();
  assert.equal(openBody.intentId, "generic_human_contact");
  assert.match(openBody.answer, /continue helping with the secure spare-key process/i);
  assert.deepEqual(openBody.workflow, firstBody.workflow);
  assert.equal(openBody.actions.some((action) => action.route === "houseWhatsapp"), false);
  assert.equal(openBody.actions.some((action) => action.route === "houseCall"), false);

  const closed = await handleConciergeRequest(
    guestRequest("I wanna talk to a human", { history, workflowState: firstBody.workflow }),
    env,
    undefined,
    new Date("2026-08-29T01:20:00.000Z")
  );
  const closedBody = await closed.json();
  assert.equal(closedBody.intentId, "generic_human_contact");
  assert.match(closedBody.answer, /continue helping with the secure spare-key process/i);
  assert.match(closedBody.answer, /outside normal service hours/i);
  assert.equal(closedBody.actions.some((action) => action.route === "houseCall"), false);
  assert.equal(closedBody.actions.some((action) => action.route === "houseWhatsapp"), false);
  assert.equal(closedBody.actions.some((action) => action.href === "/emergency.html"), true);

  const transcriptOnly = await handleConciergeRequest(
    guestRequest("I wanna talk to a human", { history }),
    env,
    undefined,
    new Date("2026-08-29T01:20:00.000Z")
  );
  const transcriptOnlyBody = await transcriptOnly.json();
  assert.equal(transcriptOnlyBody.intentId, "generic_human_contact");
  assert.doesNotMatch(transcriptOnlyBody.answer, /lost key|spare-key|500 THB/i);
  assert.equal(transcriptOnlyBody.workflow, null);
  assert.equal(store.alerts.length, 0);
  assert.equal(store.alertDeliveries.length, 0);
  assert.equal(store.spareKeyEvents.length, 0);
});

test("the exact production generic-human phrase bypasses stale LLM context before interpretation", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  let modelCalls = 0;
  globalThis.fetch = async () => {
    modelCalls += 1;
    return new Response(JSON.stringify({
      output: [{
        type: "message",
        content: [{
          type: "output_text",
          text: JSON.stringify({
            answer: "I’ll direct you to The House support team about your lost key. A 500 THB replacement fee applies.",
            intent_id: "lost_key",
            category: "room",
            confidence: 0.9,
            needs_human: true,
            handoff: "stay_support",
            learning_gap: false,
            learning_reason: "none"
          })
        }]
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await handleConciergeRequest(guestRequest("I wanna talk to a human", {
      history: [
        { role: "user", content: "I lost my key" },
        { role: "assistant", content: "There is a 500 THB replacement fee." }
      ]
    }), env, undefined, new Date("2026-08-29T01:20:00.000Z"));
    const body = await response.json();
    assert.equal(modelCalls, 0);
    assert.equal(body.intentId, "generic_human_contact");
    assert.equal(body.source, "human-contact-policy");
    assert.match(body.answer, /outside normal service hours/i);
    assert.doesNotMatch(body.answer, /lost key|spare-key|500 THB/i);
    assert.equal(body.actions.some((action) => ["houseWhatsapp", "houseCall"].includes(action.route)), false);
    assert.equal(body.actions.some((action) => action.href === "/emergency.html"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a current topic-specific lost-key human request keeps 24-hour self-service but obeys contact hours", async () => {
  const { env, store } = createEnvironment();
  const closed = await handleConciergeRequest(
    guestRequest("I need to talk to someone about my lost key"),
    env,
    undefined,
    new Date("2026-08-29T01:20:00.000Z")
  );
  const closedBody = await closed.json();
  assert.equal(closedBody.intentId, "lost_key");
  assert.match(closedBody.answer, /outside normal service hours/i);
  assert.match(closedBody.answer, /secure spare-key process/i);
  assert.match(closedBody.answer, /500 THB replacement fee/i);
  assert.equal(closedBody.actions.some((action) => action.type === "spare-key"), true);
  assert.equal(closedBody.actions.some((action) => ["houseWhatsapp", "houseCall"].includes(action.route)), false);
  assert.equal(closedBody.actions.some((action) => action.href === "/emergency.html"), true);
  assert.deepEqual(closedBody.workflow, { type: "lost_key", status: "awaiting_fee_acceptance" });

  const open = await handleConciergeRequest(
    guestRequest("I need to talk to someone about my lost key"),
    env,
    undefined,
    new Date("2026-08-29T08:00:00.000Z")
  );
  const openBody = await open.json();
  assert.equal(openBody.intentId, "lost_key");
  assert.equal(openBody.actions.some((action) => action.route === "houseWhatsapp"), true);
  assert.equal(openBody.actions.some((action) => action.route === "houseCall"), true);
  assert.equal(store.alerts.length, 0);
  assert.equal(store.alertDeliveries.length, 0);
});

test("an unverified lost-key request sends no alert and exposes no spare-key path", async () => {
  const { env, store } = createEnvironment({
    GUEST_ACCESS_ENFORCEMENT: "true",
    SPARE_KEY_CODES: JSON.stringify({ "11": "9753" }),
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
  let sends = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    sends += 1;
    return new Response(JSON.stringify({ messages: [{ id: "wamid.unverified-key" }] }), { status: 200 });
  };
  try {
    const response = await handleConciergeRequest(
      verifiedConciergeRequest("I lost my key", ""),
      env,
      undefined,
      new Date("2026-08-28T04:30:00.000Z")
    );
    const body = await response.json();
    assert.equal(body.intentId, "lost_key_verification_required");
    assert.match(body.answer, /verify your active stay/i);
    assert.match(body.answer, /haven’t contacted the team yet/i);
    assert.equal(body.actions[0].label, "Complete guest access");
    assert.equal(body.actions.some((action) => action.type === "spare-key"), false);
    assert.equal(store.alerts.length, 0);
    assert.equal(sends, 0);
    assert.doesNotMatch(JSON.stringify(withoutOpaqueTestIdentifiers({ body, interactions: store.interactions })), /9753/);
    const forged = await createConciergeAlert({
      env,
      interactionId: "int_unverified_lost_key_boundary",
      sessionId: "session_unverified_boundary_12345",
      room: "11",
      roomVerified: false,
      question: "I lost my key",
      result: { intentId: "lost_key", category: "room", handoff: "stay_support", needsHuman: true },
      now: new Date("2026-08-28T04:30:00.000Z")
    });
    assert.equal(forged, null);
    assert.equal(store.alerts.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a verified daytime lost-key request asks for this request’s fee acceptance before 24-hour self-service release", async () => {
  const officeHours = new Date("2026-08-28T09:00:00.000Z");
  const { env, store } = createEnvironment({
    GUEST_ACCESS_ENFORCEMENT: "true",
    SPARE_KEY_CODES: JSON.stringify({ "11": "9753" }),
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
  const cookie = await syncAndVerifyStay(env, { now: officeHours });
  await markForeignRegistrationPending(env, cookie, 2, officeHours);
  const outbound = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.office-key-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const response = await handleConciergeRequest(
      verifiedConciergeRequest("I lost my key", cookie),
      env,
      undefined,
      officeHours
    );
    const body = await response.json();
    assert.equal(body.intentId, "lost_key");
    assert.equal(body.source, "lost-key-policy");
    assert.match(body.answer, /500 THB replacement fee/i);
    assert.match(body.answer, /Would you like to continue\?/i);
    assert.doesNotMatch(body.answer, /\b(?:exposed|key-box code|protected|verification state|alert|webhook)\b/i);
    assert.equal(body.actions.some((action) => action.type === "spare-key"), true);
    assert.equal(body.actions.some((action) => action.route === "houseCall"), true);
    assert.equal(store.registrationStatuses.values().next().value.status, "passport_pending");
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound.length, 0);

    const status = await currentLostKeyRequest(env, cookie, "11", officeHours);
    assert.match(status.lostKeyRequestToken, /^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
    const noAcceptance = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: false, lostKeyRequestToken: status.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, officeHours);
    assert.equal(noAcceptance.status, 400);
    assert.equal((await noAcceptance.json()).error, "fee_acceptance_required");
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound.length, 0);

    const accepted = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: status.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, officeHours);
    const acceptedBody = await accepted.json();
    assert.equal(accepted.status, 200);
    assert.equal(acceptedBody.teamNotificationSubmitted, true);
    assert.equal(acceptedBody.canViewSpareKey, true);
    assert.equal("keyBoxCode" in acceptedBody, false);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].alertType, "verified_spare_key_release");
    assert.equal(store.alerts[0].recipientGroup, "lost_key_team");
    assert.equal(store.alerts[0].room, "11");
    assert.equal(outbound.length, 3);
    assert.equal(outbound.every((payload) => payload.template.name === "house_lost_key_alert_v3"), true);
    assert.equal(store.spareKeyEvents[0].feeAccepted, true);
    assert.equal(store.spareKeyEvents[0].codeReleased, false);
    assert.equal(store.spareKeyRotations.get("11") === true, false);
    assert.match(store.alerts[0].summary, /explicitly accepted the 500 THB/i);
    const release = await viewAuthorizedSpareKey(env, cookie, acceptedBody, officeHours);
    const releaseBody = await release.json();
    assert.equal(release.status, 200);
    assert.equal(releaseBody.keyBoxCode, "9753");
    assert.equal(store.spareKeyEvents[0].codeReleased, true);
    assert.equal(store.spareKeyRotations.get("11"), true);
    assert.doesNotMatch(JSON.stringify(withoutOpaqueTestIdentifiers({ body, outbound, alerts: store.alerts, interactions: store.interactions })), /9753/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("nighttime lost-key release matches the same passport-independent, request-bound 24-hour flow", async () => {
  const afterHours = new Date("2026-08-28T16:00:00.000Z");
  const { env, store } = createEnvironment({
    GUEST_ACCESS_ENFORCEMENT: "true",
    SPARE_KEY_CODES: JSON.stringify({ "10": "8642", "11": "9753" }),
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
  const room11Cookie = await syncAndVerifyStay(env, { now: afterHours });
  await markForeignRegistrationPending(env, room11Cookie, 2, afterHours);

  const concierge = await handleConciergeRequest(
    verifiedConciergeRequest("I lost my key", room11Cookie),
    env,
    undefined,
    afterHours
  );
  const conciergeBody = await concierge.json();
  assert.equal(conciergeBody.intentId, "lost_key");
  assert.match(conciergeBody.answer, /500 THB/);
  assert.match(conciergeBody.answer, /Would you like to continue\?/i);
  assert.doesNotMatch(conciergeBody.answer, /after-hours/i);
  assert.doesNotMatch(conciergeBody.answer, /\b(?:notification|key-box code|protected|verification state|alert|webhook)\b/i);
  assert.equal(conciergeBody.actions[0].type, "spare-key");
  assert.equal(store.alerts.length, 0);
  const room11Status = await currentLostKeyRequest(env, room11Cookie, "11", afterHours);

  const noFee = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie: room11Cookie, "content-type": "application/json" },
    body: JSON.stringify({ feeAccepted: false, lostKeyRequestToken: room11Status.lostKeyRequestToken })
  }), env, "/api/stay/spare-key", null, afterHours);
  assert.equal(noFee.status, 400);
  assert.equal((await noFee.json()).error, "fee_acceptance_required");

  const outbound = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.isolated-key-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const accepted = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie: room11Cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: room11Status.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, afterHours);
    const acceptedBody = await accepted.json();
    assert.equal(accepted.status, 200);
    assert.equal("keyBoxCode" in acceptedBody, false);
    assert.equal(store.spareKeyRotations.get("11") === true, false);
    const released = await viewAuthorizedSpareKey(env, room11Cookie, acceptedBody, afterHours);
    const releasedBody = await released.json();
    assert.equal(released.status, 200);
    assert.equal(releasedBody.keyBoxCode, "9753");
    assert.equal(releasedBody.teamNotificationSubmitted, true);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].alertType, "verified_spare_key_release");
    assert.equal(store.alerts[0].recipientGroup, "lost_key_team");
    assert.equal(outbound.length, 3);

    const secondSession = await syncAndVerifyStay(env, { now: afterHours });
    const repeated = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie: secondSession, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: room11Status.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, afterHours);
    assert.equal(repeated.status, 409);
    assert.equal((await repeated.json()).error, "key_code_rotation_required");
    assert.equal(outbound.length, 3);

    const differentStay = await syncAndVerifyStay(env, { confirmationCode: "HMROOM11B", now: afterHours });
    const differentStayAttempt = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie: differentStay, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: room11Status.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, afterHours);
    assert.equal(differentStayAttempt.status, 409);
    assert.equal((await differentStayAttempt.json()).error, "key_code_rotation_required");
    assert.equal(outbound.length, 3);

    const room10Cookie = await syncAndVerifyStay(env, {
      room: "10",
      confirmationCode: "HMROOM10A",
      now: afterHours
    });
    await markForeignRegistrationPending(env, room10Cookie, 1, afterHours);
    const room10Status = await currentLostKeyRequest(env, room10Cookie, "10", afterHours);
    const room10Accepted = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie: room10Cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: room10Status.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, afterHours);
    const room10AcceptedBody = await room10Accepted.json();
    assert.equal(room10Accepted.status, 200);
    assert.equal("keyBoxCode" in room10AcceptedBody, false);
    const room10Release = await viewAuthorizedSpareKey(env, room10Cookie, room10AcceptedBody, afterHours);
    const room10Body = await room10Release.json();
    assert.equal(room10Release.status, 200);
    assert.equal(room10Body.keyBoxCode, "8642");
    assert.equal(outbound.length, 6);
    assert.equal(store.alerts.length, 2);
    assert.deepEqual(store.alerts.map((alert) => alert.room).sort(), ["10", "11"]);
    assert.doesNotMatch(JSON.stringify(withoutOpaqueTestIdentifiers({
      outbound,
      alerts: store.alerts,
      deliveries: store.alertDeliveries,
      diagnostics: store.whatsappDiagnostics || [],
      events: store.spareKeyEvents
    })), /8642|9753/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("lost-key authorization is fresh, session-and-room bound, one-use and reset only after confirmed rotation", async () => {
  const now = new Date("2026-08-28T09:00:00.000Z");
  const later = new Date(now.getTime() + (16 * 60_000));
  const { env, store } = createEnvironment({
    SPARE_KEY_CODES: JSON.stringify({ "10": "8642", "11": "9753" }),
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
  const room11Cookie = await syncAndVerifyStay(env, { now });
  const room11Status = await currentLostKeyRequest(env, room11Cookie, "11", now);
  assert.equal(room11Status.feeAccepted, false);
  assert.ok(room11Status.lostKeyRequestToken);

  const secondRoom11Session = await syncAndVerifyStay(env, { now });
  const staleSession = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie: secondRoom11Session, "content-type": "application/json" },
    body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: room11Status.lostKeyRequestToken })
  }), env, "/api/stay/spare-key", null, now);
  assert.equal(staleSession.status, 400);
  assert.equal((await staleSession.json()).error, "lost_key_request_required");
  assert.equal(store.alerts.length, 0);

  const room10Cookie = await syncAndVerifyStay(env, {
    room: "10",
    confirmationCode: "HMROOM10FRESH",
    now
  });
  const differentRoom = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie: room10Cookie, "content-type": "application/json" },
    body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: room11Status.lostKeyRequestToken })
  }), env, "/api/stay/spare-key", null, now);
  assert.equal(differentRoom.status, 400);
  assert.equal((await differentRoom.json()).error, "lost_key_request_required");
  assert.equal(store.alerts.length, 0);

  const expired = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie: room11Cookie, "content-type": "application/json" },
    body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: room11Status.lostKeyRequestToken })
  }), env, "/api/stay/spare-key", null, later);
  assert.equal(expired.status, 400);
  assert.equal((await expired.json()).error, "lost_key_request_required");
  assert.equal(store.alerts.length, 0);

  const current = await currentLostKeyRequest(env, room11Cookie, "11", later);
  assert.equal(current.feeAccepted, false);
  const noAcceptance = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie: room11Cookie, "content-type": "application/json" },
    body: JSON.stringify({ feeAccepted: false, lostKeyRequestToken: current.lostKeyRequestToken })
  }), env, "/api/stay/spare-key", null, later);
  assert.equal(noAcceptance.status, 400);
  assert.equal((await noAcceptance.json()).error, "fee_acceptance_required");
  assert.equal(store.alerts.length, 0);

  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.request-bound-key-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const accepted = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie: room11Cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: current.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, later);
    const acceptedBody = await accepted.json();
    assert.equal(accepted.status, 200);
    assert.equal("keyBoxCode" in acceptedBody, false);
    assert.equal(store.spareKeyRotations.get("11") === true, false);

    const reloadedRequest = await currentLostKeyRequest(env, room11Cookie, "11", later);
    assert.equal(reloadedRequest.feeAccepted, false);
    assert.notEqual(reloadedRequest.lostKeyRequestToken, current.lostKeyRequestToken);
    const replacementAccepted = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie: room11Cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: reloadedRequest.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, later);
    const replacementAcceptedBody = await replacementAccepted.json();
    assert.equal(replacementAccepted.status, 200);
    assert.equal("keyBoxCode" in replacementAcceptedBody, false);
    const supersededView = await viewAuthorizedSpareKey(env, room11Cookie, acceptedBody, later);
    assert.equal(supersededView.status, 409);
    assert.equal((await supersededView.json()).error, "claim_not_found");

    const released = await viewAuthorizedSpareKey(env, room11Cookie, replacementAcceptedBody, later);
    assert.equal(released.status, 200);
    assert.equal((await released.json()).keyBoxCode, "9753");
    assert.equal(store.spareKeyRotations.get("11"), true);
    assert.equal(outbound.length, 6);

    const locked = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie: room11Cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: current.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, later);
    assert.equal(locked.status, 409);
    assert.equal((await locked.json()).error, "key_code_rotation_required");
    assert.equal(outbound.length, 6);

    env.SPARE_KEY_CODES = JSON.stringify({ "10": "8642", "11": "5319" });
    const reset = await handleStayAdminRequest(new Request("https://guide.example/api/concierge/admin/spare-key-rotation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        room: "11", resetMode: "physical_rotation", confirmed: true, confirmation: "CODE ROTATED"
      })
    }), env, "/api/concierge/admin/spare-key-rotation", store);
    assert.equal(reset.status, 200);
    assert.equal(store.spareKeyRotations.get("11"), false);

    const replay = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie: room11Cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: current.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, later);
    assert.equal(replay.status, 409);
    assert.equal((await replay.json()).error, "lost_key_request_used");
    assert.equal(outbound.length, 6);

    const nextRequest = await currentLostKeyRequest(env, room11Cookie, "11", later);
    assert.equal(nextRequest.feeAccepted, false);
    assert.notEqual(nextRequest.lostKeyRequestToken, current.lostKeyRequestToken);
    const nextAccepted = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie: room11Cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: nextRequest.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, later);
    const nextAcceptedBody = await nextAccepted.json();
    assert.equal(nextAccepted.status, 200);
    assert.equal("keyBoxCode" in nextAcceptedBody, false);
    const nextRelease = await viewAuthorizedSpareKey(env, room11Cookie, nextAcceptedBody, later);
    assert.equal(nextRelease.status, 200);
    assert.equal((await nextRelease.json()).keyBoxCode, "5319");
    assert.equal(outbound.length, 9);
    assert.equal(store.spareKeyEvents.filter((item) => item.codeReleased).length, 2);
    assert.doesNotMatch(JSON.stringify({
      alerts: store.alerts,
      deliveries: store.alertDeliveries,
      events: store.spareKeyEvents,
      outbound
    }), /"(?:keyBoxCode|text)"\s*:\s*"(?:9753|5319)"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("protected owner reset distinguishes controlled tests from physical rotation without reviving historical requests", async () => {
  const now = new Date("2026-08-28T09:00:00.000Z");
  const originalCodeSecret = JSON.stringify({ "11": "9753" });
  const { env, store } = createEnvironment({
    CONCIERGE_ADMIN_TOKEN: "owner-admin-token",
    SPARE_KEY_CODES: originalCodeSecret,
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
  const cookie = await syncAndVerifyStay(env, { now });
  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.owner-reset-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  const adminReset = (body, authorized = true) => handleAdminRequest(new Request(
    "https://guide.example/api/concierge/admin/spare-key-rotation",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authorized ? { authorization: "Bearer owner-admin-token" } : {})
      },
      body: JSON.stringify(body)
    }
  ), env, "/api/concierge/admin/spare-key-rotation");
  try {
    const requestState = await currentLostKeyRequest(env, cookie, "11", now);
    const accepted = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: requestState.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, now);
    const acceptedBody = await accepted.json();
    const released = await viewAuthorizedSpareKey(env, cookie, acceptedBody, now);
    assert.equal(released.status, 200);
    assert.equal((await released.json()).keyBoxCode, "9753");
    assert.equal(store.spareKeyRotations.get("11"), true);

    const unauthorized = await adminReset({
      room: "11", resetMode: "controlled_test", confirmed: true, confirmation: "KEEP EXISTING CODE"
    }, false);
    assert.equal(unauthorized.status, 401);
    assert.equal(store.spareKeyRotations.get("11"), true);

    const cancelled = await adminReset({
      room: "11", resetMode: "controlled_test", confirmed: true, confirmation: ""
    });
    assert.equal(cancelled.status, 400);
    assert.equal(store.spareKeyRotations.get("11"), true);
    assert.equal(store.spareKeyEvents.some((item) => item.eventType === "rotation_cleared_controlled_test"), false);

    const controlled = await adminReset({
      room: "11", resetMode: "controlled_test", confirmed: true, confirmation: "KEEP EXISTING CODE"
    });
    const controlledBody = await controlled.json();
    assert.equal(controlled.status, 200);
    assert.equal(controlledBody.resetMode, "controlled_test");
    assert.equal(store.spareKeyRotations.get("11"), false);
    assert.equal(env.SPARE_KEY_CODES, originalCodeSecret);
    assert.equal(store.spareKeyEvents.at(-1).eventType, "rotation_cleared_controlled_test");

    const historicalView = await viewAuthorizedSpareKey(env, cookie, acceptedBody, now);
    assert.equal(historicalView.status, 409);
    assert.equal((await historicalView.json()).error, "claim_not_found");
    const historicalRequest = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: requestState.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, now);
    assert.equal(historicalRequest.status, 409);
    assert.equal((await historicalRequest.json()).error, "lost_key_request_used");

    const nextRequest = await currentLostKeyRequest(env, cookie, "11", now);
    assert.equal(nextRequest.feeAccepted, false);
    assert.notEqual(nextRequest.lostKeyRequestToken, requestState.lostKeyRequestToken);
    const nextAccepted = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: nextRequest.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, now);
    const nextAcceptedBody = await nextAccepted.json();
    assert.equal("keyBoxCode" in nextAcceptedBody, false);
    const nextReleased = await viewAuthorizedSpareKey(env, cookie, nextAcceptedBody, now);
    assert.equal(nextReleased.status, 200);
    assert.equal(store.spareKeyRotations.get("11"), true);

    env.SPARE_KEY_CODES = JSON.stringify({ "11": "5319" });
    const physical = await adminReset({
      room: "11", resetMode: "physical_rotation", confirmed: true, confirmation: "CODE ROTATED"
    });
    const physicalBody = await physical.json();
    assert.equal(physical.status, 200);
    assert.equal(physicalBody.resetMode, "physical_rotation");
    assert.equal(store.spareKeyRotations.get("11"), false);
    assert.equal(store.spareKeyEvents.at(-1).eventType, "rotation_cleared_physical");

    const operations = await store.getStayOperationsOverview();
    assert.deepEqual(operations.rotationActivity.map((item) => item.eventType), [
      "rotation_cleared_physical",
      "rotation_cleared_controlled_test"
    ]);
    assert.doesNotMatch(JSON.stringify(withoutOpaqueTestIdentifiers({ events: store.spareKeyEvents, activity: operations.rotationActivity })), /9753|5319/);
    assert.equal(outbound.length, 6);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin can delete one key-box reset activity entry without changing rotation state or lost-key history", async () => {
  const now = new Date("2026-08-31T05:30:00.000Z");
  const { env, store } = createEnvironment({ CONCIERGE_ADMIN_TOKEN: "owner-admin-token" });
  store.spareKeyRotations.set("3", true);
  const activityId = `key_reset_${crypto.randomUUID()}`;
  const releaseId = `key_reset_${crypto.randomUUID()}`;
  store.spareKeyEvents.push(
    {
      id: releaseId, reservationId: `stay_${crypto.randomUUID()}`, room: "3",
      eventType: "verified_spare_key_release", feeAccepted: true, codeReleased: true,
      requestHash: "synthetic-request", alertId: "synthetic-alert", createdAt: now.toISOString()
    },
    {
      id: activityId, reservationId: `stay_${crypto.randomUUID()}`, room: "3",
      eventType: "rotation_cleared_controlled_test", feeAccepted: false, codeReleased: false,
      requestHash: "", alertId: "", createdAt: now.toISOString()
    }
  );

  const unauthorized = await handleAdminRequest(new Request(
    "https://guide.example/api/concierge/admin/spare-key-rotation-activity/delete",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId: activityId, confirmed: true }) }
  ), env, "/api/concierge/admin/spare-key-rotation-activity/delete");
  assert.equal(unauthorized.status, 401);

  const invalidTarget = await handleAdminRequest(new Request(
    "https://guide.example/api/concierge/admin/spare-key-rotation-activity/delete",
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer owner-admin-token" },
      body: JSON.stringify({ eventId: releaseId, confirmed: true })
    }
  ), env, "/api/concierge/admin/spare-key-rotation-activity/delete");
  assert.equal(invalidTarget.status, 404);

  const deleted = await handleAdminRequest(new Request(
    "https://guide.example/api/concierge/admin/spare-key-rotation-activity/delete",
    {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer owner-admin-token" },
      body: JSON.stringify({ eventId: activityId, confirmed: true })
    }
  ), env, "/api/concierge/admin/spare-key-rotation-activity/delete");
  assert.equal(deleted.status, 200);
  assert.equal((await deleted.json()).ok, true);
  assert.equal(store.spareKeyEvents.some((item) => item.id === activityId), false);
  assert.equal(store.spareKeyEvents.some((item) => item.id === releaseId), true);
  assert.equal(store.spareKeyRotations.get("3"), true);
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
  assert.equal(body.source, "booking-policy");
  assert.equal(body.intentId, "snorkeling_booking_request");
  assert.equal(body.handoff, "booking");
  assert.match(body.answer, /what date would you like to go snorkeling/i);
  assert.doesNotMatch(body.answer, /how many|country code|payment/i);
  assert.deepEqual(body.workflow.missing.sort(), ["contact", "date", "guests", "option"]);
  assert.doesNotMatch(body.answer, /commission|referral|revenue/i);
  assert.deepEqual(body.actions, []);
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
    OPENAI_API_KEY: "",
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
    assert.equal(payloads.every((item) => item.template.name === "house_luggage_alert_v2"), true);
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

test("a corrected international contact completes the same explicit pending luggage request exactly once", async () => {
  const localContact = "0812345678";
  const internationalContact = "+66 81 234 5678";
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66 64 000 0001" }],
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
    return new Response(JSON.stringify({ messages: [{ id: `wamid.luggage-correction-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const pending = await handleConciergeRequest(guestRequest(
      "Please store 3 bags for departure at 1:00 PM. One bag is fragile."
    ), env);
    const pendingBody = await pending.json();
    assert.equal(pendingBody.workflow.status, "collecting");
    assert.deepEqual(pendingBody.workflow.luggageRequest, {
      context: "Departure",
      requestedDate: "",
      requestedTime: "1:00 PM",
      bagCount: "3",
      notes: "Please store 3 bags for departure at 1:00 PM. One bag is fragile."
    });
    assert.deepEqual(pendingBody.workflow.missing, ["contact"]);

    const rejected = await handleConciergeRequest(guestRequest(localContact, {
      workflowState: pendingBody.workflow,
      history: [
        { role: "user", content: "Please store 3 bags for departure at 1:00 PM. One bag is fragile." },
        { role: "assistant", content: pendingBody.answer }
      ]
    }), env);
    const rejectedBody = await rejected.json();
    assert.match(rejectedBody.answer, /local number/i);
    assert.deepEqual(rejectedBody.workflow.luggageRequest, pendingBody.workflow.luggageRequest);
    assert.deepEqual(rejectedBody.workflow.missing, ["contact"]);
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound.length, 0);

    const completed = await handleConciergeRequest(guestRequest(internationalContact, {
      workflowState: rejectedBody.workflow,
      history: [
        { role: "user", content: "Please store 3 bags for departure at 1:00 PM. One bag is fragile." },
        { role: "assistant", content: pendingBody.answer },
        { role: "user", content: "[contact supplied privately]" },
        { role: "assistant", content: rejectedBody.answer }
      ]
    }), env);
    const completedBody = await completed.json();
    assert.equal(completedBody.workflow.status, "submitted");
    assert.match(completedBody.answer, /luggage request has been sent/i);
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound.length, 3);
    assert.equal(outbound.every((payload) => payload.template.name === "house_luggage_alert_v2"), true);
    assert.equal(outbound.every((payload) => payload.template.language.code === "en"), true);
    assert.equal(outbound.every((payload) => payload.template.components[0].parameters.length === 6), true);
    assert.deepEqual(outbound.map((payload) => payload.to).sort(), ["66640000001", "66810000002", "66820000003"]);
    assert.doesNotMatch(JSON.stringify(outbound), /66960000001/);
    assert.doesNotMatch(JSON.stringify(store.interactions), /0812345678|66812345678|81 234 5678/);
    assert.doesNotMatch(JSON.stringify(store.alerts), /0812345678|66812345678|81 234 5678/);
    assert.doesNotMatch(JSON.stringify(store.alertDeliveries), /0812345678|66812345678|81 234 5678/);

    const fresh = await handleConciergeRequest(guestRequest("I wanna store my luggage"), env);
    const freshBody = await fresh.json();
    assert.equal(freshBody.workflow.status, "collecting");
    assert.deepEqual(freshBody.workflow.missing.sort(), ["bags", "contact", "context", "time"]);
    assert.deepEqual(freshBody.workflow.luggageRequest, {
      context: "",
      requestedDate: "",
      requestedTime: "",
      bagCount: "",
      notes: "I wanna store my luggage"
    });
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the exact arrival-tomorrow luggage correction preserves date and actually submits", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
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
  const now = new Date("2026-08-28T03:00:00.000Z");
  const pending = await handleConciergeRequest(
    guestRequest("Arrival tomorrow, 3 bags."),
    env,
    undefined,
    now
  );
  const pendingBody = await pending.json();
  assert.deepEqual(pendingBody.workflow.missing, ["time", "contact"]);
  assert.equal(pendingBody.workflow.luggageRequest.context, "Arrival");
  assert.equal(pendingBody.workflow.luggageRequest.requestedDate, "29 Aug 2026");
  assert.equal(pendingBody.workflow.luggageRequest.requestedTime, "");
  assert.equal(pendingBody.workflow.luggageRequest.bagCount, "3");

  const timed = await handleConciergeRequest(guestRequest("2:00 PM", {
    workflowState: pendingBody.workflow
  }), env, undefined, now);
  const timedBody = await timed.json();
  assert.deepEqual(timedBody.workflow.missing, ["contact"]);
  assert.equal(timedBody.workflow.luggageRequest.requestedTime, "2:00 PM");

  const rejected = await handleConciergeRequest(guestRequest("0812345678", {
    workflowState: timedBody.workflow
  }), env, undefined, now);
  const rejectedBody = await rejected.json();
  assert.match(rejectedBody.answer, /local number.*\+66/is);
  assert.deepEqual(rejectedBody.workflow.luggageRequest, timedBody.workflow.luggageRequest);
  assert.equal(store.alerts.length, 0);

  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.arrival-luggage-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const completed = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      workflowState: rejectedBody.workflow
    }), env, undefined, now);
    const completedBody = await completed.json();
    assert.equal(completedBody.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound.length, 3);
    assert.equal(outbound.every((payload) => payload.template.name === "house_luggage_alert_v2"), true);
    assert.equal(outbound[0].template.components[0].parameters[4].text, "29 Aug 2026, 2:00 PM");
    assert.match(completedBody.answer, /luggage request has been sent/i);

    const fresh = await handleConciergeRequest(guestRequest("I wanna store my luggage", {
      history: [
        { role: "user", content: "+66 [contact supplied privately]" },
        { role: "assistant", content: completedBody.answer }
      ]
    }), env, undefined, now);
    const freshBody = await fresh.json();
    assert.equal(freshBody.workflow.status, "collecting");
    assert.deepEqual(freshBody.workflow.missing.sort(), ["bags", "contact", "context", "time"]);
    assert.deepEqual(freshBody.workflow.luggageRequest, {
      context: "", requestedDate: "", requestedTime: "", bagCount: "", notes: "I wanna store my luggage"
    });
    assert.equal(store.alerts.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
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
  assert.match(diving.answer, /recommend RAID.*dive safety and buoyancy control/i);
  assert.match(diving.answer, /friendly, professional team/);
  assert.match(diving.answer, /small groups, personal attention/);
  assert.match(diving.answer, /preferred RAID dive centre/i);
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

test("Explore-disabled Concierge retrieval ranks approved beaches, dining, cafés and Bamboo intelligently", async () => {
  const { env } = createEnvironment({ EXPLORE_ENABLED: "false", OPENAI_API_KEY: "" });
  const request = guestRequest("approved local-guide retrieval");

  const generalBars = await retrieveApprovedProjectKnowledge(request, env, "Where should we go for drinks?");
  assert.equal(generalBars[0].name, "Bamboo Beach Bar");
  assert.equal(generalBars[0].preferredByTheHouse, true);

  const quietBeaches = await retrieveApprovedProjectKnowledge(request, env, "Recommend a quiet beach.");
  assert.equal(quietBeaches[0].sourceType, "beach");
  assert.match(quietBeaches[0].name, /Beach|Bay/i);

  const beachOverview = await retrieveApprovedProjectKnowledge(request, env, "What beaches are around Koh Tao?");
  assert.equal(beachOverview.slice(0, 3).every((record) => record.sourceType === "beach"), true);

  const thaiFood = await retrieveApprovedProjectKnowledge(request, env, "Recommend Thai food.");
  assert.equal(thaiFood[0].sourceType, "restaurant");
  assert.match(thaiFood[0].name, /Tukta|Long Thai/i);

  const workCafe = await retrieveApprovedProjectKnowledge(request, env, "Where can I get coffee and work on my laptop?");
  assert.equal(workCafe[0].sourceType, "cafe");
  assert.equal(workCafe[0].name, "Blacktip Café & Workspace");
  assert.match(JSON.stringify(workCafe[0]), /remoteWork|airConditioning/);

  const snorkeling = await retrieveApprovedProjectKnowledge(request, env, "What are good snorkeling spots?");
  assert.equal(snorkeling[0].sourceType, "activity");
  assert.match(snorkeling[0].name, /Snorkelling/i);

  const specificBar = await handleConciergeRequest(
    guestRequest("Where can I get food and cocktails at the same place?"),
    env
  );
  const specificBarBody = await specificBar.json();
  assert.equal(specificBarBody.source, "project-knowledge");
  assert.doesNotMatch(specificBarBody.answer.split("\n")[0], /Bamboo Beach Bar/);
  assert.match(specificBarBody.answer, /Choppers Sports Bar|Natural High Bar|Victor’s Bar/i);
});

test("House beach proximity answers are exact, concise and operationally inert", async () => {
  const { env, store } = createEnvironment({ EXPLORE_ENABLED: "false", OPENAI_API_KEY: "" });
  const closest = await handleConciergeRequest(guestRequest("How far is the beach from the house?"), env);
  const closestBody = await closest.json();
  assert.equal(closestBody.intentId, "closest_beach_from_house");
  assert.match(closestBody.answer, /Mae Haad Beach/i);
  assert.match(closestBody.answer, /around 200 metres/i);
  assert.match(closestBody.answer, /very short walk/i);
  assert.deepEqual(closestBody.actions, []);

  const sairee = await handleConciergeRequest(guestRequest("How far is Sairee Beach?"), env);
  const saireeBody = await sairee.json();
  assert.equal(saireeBody.intentId, "sairee_beach_distance");
  assert.match(saireeBody.answer, /roughly a 20-minute walk/i);
  assert.match(saireeBody.answer, /scooter or taxi is faster/i);
  assert.deepEqual(saireeBody.actions, []);
  assert.equal(store.alerts.length, 0);
});

test("a local-information detour answers directly and preserves a pending cleaning workflow for resumption", async () => {
  const now = new Date("2026-08-25T04:00:00.000Z");
  const { env, store } = createEnvironment({
    EXPLORE_ENABLED: "false",
    OPENAI_API_KEY: "",
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
  const pending = await handleConciergeRequest(guestRequest("Please clean my room."), env, undefined, now);
  const pendingBody = await pending.json();
  assert.equal(pendingBody.workflow.status, "collecting");

  const detour = await handleConciergeRequest(guestRequest("How far is the beach from the house?", {
    workflowState: pendingBody.workflow,
    history: [
      { role: "user", content: "Please clean my room." },
      { role: "assistant", content: pendingBody.answer }
    ]
  }), env, undefined, now);
  const detourBody = await detour.json();
  assert.match(detourBody.answer, /Mae Haad Beach.*200 metres/is);
  assert.doesNotMatch(detourBody.answer, /clean|housekeeping|preferred time/i);
  assert.deepEqual(detourBody.workflow, pendingBody.workflow);
  assert.equal(store.alerts.length, 0);

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: "wamid.cleaning-after-detour" }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    const resumed = await handleConciergeRequest(guestRequest("3:00 PM", {
      workflowState: detourBody.workflow,
      history: [
        { role: "user", content: "Please clean my room." },
        { role: "assistant", content: pendingBody.answer },
        { role: "user", content: "How far is the beach from the house?" },
        { role: "assistant", content: detourBody.answer }
      ]
    }), env, undefined, now);
    const resumedBody = await resumed.json();
    assert.equal(resumedBody.workflow.status, "submitted");
    assert.match(resumedBody.answer, /Preferred time: 3:00 PM/i);
    assert.equal(store.alerts.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a dinner detour ignores stale booking transcript context while retaining the pending booking", async () => {
  const now = new Date("2026-08-29T08:00:00.000Z");
  const { env, store } = createEnvironment({ EXPLORE_ENABLED: "false", OPENAI_API_KEY: "test-key" });
  const pending = await handleConciergeRequest(guestRequest("I want to book a snorkeling trip."), env, undefined, now);
  const pendingBody = await pending.json();
  assert.equal(pendingBody.workflow.type, "booking");
  assert.equal(pendingBody.workflow.status, "collecting");

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
            answer: "The Gallery Restaurant is a strong dinner option from The House’s approved local guide.",
            intent_id: "restaurant_recommendation",
            category: "concierge",
            confidence: 0.92,
            needs_human: false,
            handoff: "none",
            learning_gap: false,
            learning_reason: "none"
          })
        }]
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  let detourBody;
  try {
    const detour = await handleConciergeRequest(guestRequest("Where is good for dinner?", {
      workflowState: pendingBody.workflow,
      history: [
        { role: "user", content: "I want to book a snorkeling trip." },
        { role: "assistant", content: pendingBody.answer }
      ]
    }), env, undefined, now);
    detourBody = await detour.json();
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(detourBody.intentId, "restaurant_recommendation");
  assert.doesNotMatch(detourBody.answer, /snorkel|booking|how many|what date/i);
  assert.equal(detourBody.workflow.type, pendingBody.workflow.type);
  assert.equal(detourBody.workflow.kind, pendingBody.workflow.kind);
  assert.equal(detourBody.workflow.status, pendingBody.workflow.status);
  assert.deepEqual(detourBody.workflow.missing, pendingBody.workflow.missing);
  assert.equal(detourBody.workflow.bookingRequest.activity, pendingBody.workflow.bookingRequest.activity);
  assert.equal(detourBody.workflow.bookingRequest.preferredDate, pendingBody.workflow.bookingRequest.preferredDate);
  assert.deepEqual(capturedRequest.input, [{ role: "user", content: "Where is good for dinner?" }]);
  assert.match(capturedRequest.instructions, /"sourceType":"restaurant"/);
  assert.equal(store.alerts.length, 0);

  const resumed = await handleConciergeRequest(guestRequest("tomorrow", {
    workflowState: detourBody.workflow,
    history: [
      { role: "user", content: "I want to book a snorkeling trip." },
      { role: "assistant", content: pendingBody.answer },
      { role: "user", content: "Where is good for dinner?" },
      { role: "assistant", content: detourBody.answer }
    ]
  }), env, undefined, now);
  const resumedBody = await resumed.json();
  assert.equal(resumedBody.workflow.type, "booking");
  assert.equal(resumedBody.workflow.status, "collecting");
  assert.equal(resumedBody.workflow.missing.includes("preferredDate"), false);
  assert.equal(store.alerts.length, 0);
});

test("snorkeling recommendations stay informational and use approved local records", async () => {
  const { env, store } = createEnvironment({ EXPLORE_ENABLED: "false", OPENAI_API_KEY: "" });
  for (const question of ["What are good snorkeling spots?", "Recommend a beach for snorkeling."]) {
    const response = await handleConciergeRequest(guestRequest(question), env);
    const body = await response.json();
    assert.equal(body.needsHuman, false, question);
    assert.equal(body.handoff, "none", question);
    assert.match(body.answer, /Snorkelling|Bay|Ao Leuk|Hin Wong|Shark Bay/i, question);
    assert.equal(body.workflow, null, question);
  }
  assert.equal(store.alerts.length, 0);
});

test("production snorkeling phrasings bypass the welcome collision and never depend on model compliance", async () => {
  const { env, store } = createEnvironment({ EXPLORE_ENABLED: "false", OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  let modelCalls = 0;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("api.openai.com")) {
      modelCalls += 1;
      return new Response(JSON.stringify({
        output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({
          answer: "I do not have a confirmed snorkeling-location recommendation in the approved information.",
          intent_id: "fallback",
          category: "fallback",
          confidence: 0.2,
          needs_human: true,
          handoff: "stay_support",
          learning_gap: true,
          learning_reason: "missing_fact"
        }) }] }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return originalFetch(input, init);
  };
  try {
    for (const question of [
      "which beach is good for snorkeling",
      "which beach is best for snorkeling",
      "is there good snorkeling"
    ]) {
      const response = await handleConciergeRequest(guestRequest(question), env);
      const body = await response.json();
      assert.equal(response.status, 200, question);
      assert.equal(body.source, "project-knowledge", question);
      assert.notEqual(body.intentId, "welcome", question);
      assert.equal(body.learningGap, false, question);
      assert.equal(body.needsHuman, false, question);
      assert.equal(body.handoff, "none", question);
      assert.match(body.answer, /Ao Leuk|Shark Bay|Hin Wong|Mango Bay/i, question);
      assert.doesNotMatch(body.answer, /I can help with check-in|do not have a confirmed|AI Concierge should not quote/i, question);
      assert.equal(body.workflow, null, question);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(modelCalls, 0);
  assert.equal(store.alerts.length, 0);
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
    assert.match(body.answer, /recommend RAID.*dive safety and buoyancy control/i);
    assert.match(body.answer, /Roctopus Dive.*preferred RAID dive centre/i);
    assert.equal(body.actions[0].type, "prompt");
    assert.equal(body.actions[0].prompt, "I want to book diving.");
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
  assert.match(home, /Required guest registration/);
  assert.match(home, /Complete your guest registration/);
  assert.match(home, /Passport information is required for non-Thai overnight guests\. Thai guests are exempt\./);
  assert.match(home, /TM30 Immigration/);
  assert.match(room, /required TM30 guest registration/);
  [home, room].forEach((html) => {
    assert.match(html, /automatically deleted 14 days after upload/);
    assert.doesNotMatch(html, /data-concierge-prompt="I need my secure passport registration link\."/);
    assert.doesNotMatch(html, /href="\/passport-upload(?:\.html)?"/);
  });
  assert.match(home, /Open my Room page/);
  assert.match(room, /Verify your stay/);
  assert.match(room, /Stay confirmation code/);
  assert.match(room, /Upload passport securely/);
  assert.match(room, /All overnight guests are Thai nationals/);
  assert.match(room, /I understand and want to continue/);
  assert.match(room, />Request spare key<\/button>/);
  assert.equal((room.match(/500 THB/g) || []).length, 1);
  assert.match(room, /id="viewSpareKey"[^>]*>View spare key<\/button>/);
  assert.doesNotMatch(room, /lostKeyConfirmationCode/);
  assert.match(room, /id="openSpareKeyAccess"/);
  assert.match(room, /Secure 24-hour help if you cannot enter your room/);
  assert.match(room, /Secure spare-key access is available 24 hours a day during your stay/);
  assert.doesNotMatch(room, /after-hours spare-key|between 7:30 PM and 10:30 AM/i);
  assert.ok(room.indexOf('id="openSpareKeyAccess"') < room.indexOf('id="spareKeyAccess"'));
  assert.match(room, /id="spareKeyAccess"[^>]*hidden/);
  assert.doesNotMatch(room, /already verified|team will be notified before|never sent through WhatsApp|webhook|notification gate/i);
  assert.match(room, /src="\/registration-entry\.js"/);
  assert.match(registrationEntry, /\/api\/stay\/verify/);
  assert.match(registrationEntry, /\/api\/stay\/passport-link/);
  assert.match(registrationEntry, /\/api\/stay\/spare-key/);
  assert.match(registrationEntry, /JSON\.stringify\(\{ feeAccepted: true, lostKeyRequestToken \}\)/);
  assert.match(registrationEntry, /\/api\/stay\/spare-key\/view/);
  assert.match(registrationEntry, /JSON\.stringify\(\{ spareKeyViewToken \}\)/);
  assert.doesNotMatch(registrationEntry, /spareKeySection\.hidden = false;\s*if \(spareKeyForm\)/);
  assert.match(registrationEntry, /spareKeyTrigger\?\.addEventListener\("click", \(event\) =>/);
  assert.doesNotMatch(registrationEntry, /HOUSE_PRIVATE_REGISTRATION_URL/);
  assert.match(registrationForm, /Option 1 — Upload passport image/);
  assert.doesNotMatch(registrationForm, /Option 2 — Enter the required details/);
  assert.doesNotMatch(registrationForm, /exact required TM30 fields/);
  assert.match(room, /Please conserve water and electricity/);
  assert.match(room, /undersea grid connection, reducing reliance on local diesel generators/);
  assert.match(room, /switch off the air conditioning and lights when you leave the room/);
  assert.match(house, /<b>1,000 THB clearance fee<\/b>/);
  assert.doesNotMatch(house, /<strong>1,000 THB clearance fee<\/strong>/);
  assert.equal(room, canonicalRoom);
  assert.equal(house, canonicalHouse);
});

test("Concierge stay access stays verified while registration remains an independent UI status", async () => {
  const now = new Date("2026-08-29T08:00:00.000Z");
  const { env, store } = createEnvironment({ GUEST_ACCESS_ENFORCEMENT: "true" });
  const statusRequest = (cookie = "", roomQuery = "") => handleStayGuestRequest(new Request(
    `https://guide.example/api/stay/status${roomQuery}`,
    { headers: { origin: "https://guide.example", ...(cookie ? { cookie } : {}) } }
  ), env, "/api/stay/status", null, now);

  const unverified = await statusRequest();
  const unverifiedBody = await unverified.json();
  assert.equal(unverifiedBody.verified, false);
  assert.equal(unverifiedBody.conciergeAccess, "unverified");
  assert.equal(unverifiedBody.registrationIncomplete, false);

  const cookie = await syncAndVerifyStay(env, { now });
  const verified = await statusRequest(cookie);
  const verifiedBody = await verified.json();
  assert.equal(verifiedBody.room, "11");
  assert.equal(verifiedBody.activeStay, true);
  assert.equal(verifiedBody.verified, true);
  assert.equal(verifiedBody.conciergeAccess, "verified");
  assert.equal(verifiedBody.registrationStatus, "not_started");
  assert.equal(verifiedBody.accessGranted, false);
  assert.equal(verifiedBody.registrationIncomplete, true);

  await markForeignRegistrationPending(env, cookie, 2, now);
  const pending = await statusRequest(cookie, "?room=11");
  const pendingBody = await pending.json();
  assert.equal(pendingBody.conciergeAccess, "verified");
  assert.equal(pendingBody.registrationStatus, "passport_pending");
  assert.equal(pendingBody.accessGranted, false);
  assert.equal(pendingBody.registrationIncomplete, true);

  const reservationId = store.stayReservations[0].id;
  store.registrationStatuses.set(reservationId, {
    status: "passport_complete", guestType: "foreign", requiredPassports: 2, receivedPassports: 2
  });
  const complete = await statusRequest(cookie);
  const completeBody = await complete.json();
  assert.equal(completeBody.conciergeAccess, "verified");
  assert.equal(completeBody.accessGranted, true);
  assert.equal(completeBody.registrationIncomplete, false);

  store.registrationStatuses.set(reservationId, {
    status: "thai_exempt", guestType: "thai", requiredPassports: 0, receivedPassports: 0
  });
  const thai = await statusRequest(cookie);
  const thaiBody = await thai.json();
  assert.equal(thaiBody.conciergeAccess, "verified");
  assert.equal(thaiBody.guestType, "thai");
  assert.equal(thaiBody.accessGranted, true);
  assert.equal(thaiBody.registrationIncomplete, false);
});

test("Concierge room header, menu and registration reminder refresh from one authoritative stay status", async () => {
  const [script, registrationEntry, config] = await Promise.all([
    readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8"),
    readFile(new URL("../public/registration-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../public/ai-concierge-config.js", import.meta.url), "utf8")
  ]);
  assert.match(script, /await fetch\("\/api\/stay\/status"/);
  assert.match(script, /status\?\.conciergeAccess === "verified"/);
  assert.match(script, /registrationIncomplete: Boolean\(verified && statusKnown && status\?\.registrationIncomplete === true\)/);
  assert.match(script, /const pendingArrivalActions = \[/);
  assert.match(script, /const availableQuickActions = isPublicAccess[\s\S]*conciergeAccessState\.registrationIncomplete[\s\S]*pendingArrivalActions[\s\S]*cfg\.quickActions/);
  assert.match(script, /panel\.dataset\.stayAccess = nextState\.verified \? "verified" : "unverified"/);
  assert.match(script, /registrationReminder\.hidden = !nextState\.registrationIncomplete/);
  assert.match(script, /selectedRoom = String\(status\.room\);[\s\S]*updateRoomContext\(\)/);
  assert.match(script, /launcher\.addEventListener\("click"[\s\S]*refreshConciergeAccessState\(\)/);
  assert.match(script, /window\.addEventListener\("pageshow", refreshConciergeAccessState\)/);
  assert.match(script, /window\.addEventListener\("house:stay-access-updated"/);
  assert.match(registrationEntry, /conciergeAccess: "verified"/);
  assert.match(registrationEntry, /registrationIncomplete: data\.accessGranted !== true/);
  assert.match(config, /"label": "Guest registration"/);
  assert.match(config, /"label": "Complete guest access"/);
  assert.ok(config.indexOf('"quickActions"') < config.indexOf('"publicQuickActions"'));
});

test("concierge initializes safely and keeps public support buttons concierge-first", async () => {
  const script = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  const pageDeclaration = script.indexOf("const currentPage =");
  const accessDeclaration = script.indexOf("const pageAccessMode =");
  assert.ok(pageDeclaration >= 0 && accessDeclaration > pageDeclaration);
  assert.match(script, /\[data-link="houseWhatsapp"\],\[data-link="houseCall"\]/);
  assert.match(script, /event\.preventDefault\(\);\s*openPanel\(\{ askRoom: true \}\)/);
});

test("browser action rendering and click handling independently hard-gate both routine contacts by Bangkok service hours", async () => {
  const script = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  assert.match(script, /function routineServiceOpen\(date = new Date\(\)\)/);
  assert.match(script, /timeZone: "Asia\/Bangkok"/);
  assert.match(script, /values\.weekday !== "Monday"/);
  assert.match(script, /minutes >= \(10 \* 60 \+ 30\) && minutes < \(19 \* 60 \+ 30\)/);
  assert.match(script, /const routineHouseContact = \["houseCall", "houseWhatsapp"\]\.includes\(action\.route\)/);
  assert.match(script, /if \(!routineServiceOpen\(\) && routineHouseContact\) return null/);
  assert.match(script, /link\.dataset\.routineHouseContact = "true"/);
  assert.match(script, /link\.dataset\.routineHouseCall = "true"/);
  assert.match(script, /\[routeMap\(\)\.houseCall, routeMap\(\)\.houseWhatsapp\]\.includes\(routineContactHref\)/);
  assert.match(script, /if \(routineContact && !routineServiceOpen\(\)\) \{[\s\S]*event\.preventDefault\(\);[\s\S]*outside normal service hours[\s\S]*Emergency help/);
  assert.ok(script.indexOf("if (routineContact && !routineServiceOpen())") < script.indexOf('const emergencyCall = event.target.closest("[data-house-emergency-call]")'));
  assert.match(script, /genericHumanContactRequest\.test\(normalized\)/);
});

test("browser protected workflows keep supplied contacts out of ordinary session history", async () => {
  const script = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  assert.match(script, /redactPrivateContact\(question\)\.slice\(0, 700\)/);
  assert.match(script, /appendMessage\("guest", redactPrivateContact\(question\)\)/);
  assert.doesNotMatch(script, /appendMessage\("guest", question\)/);
  assert.match(script, /privateReplyContact: privateWorkflowContact/);
  assert.match(script, /workflowState: activeWorkflowState/);
  assert.match(script, /const activePrivateWorkflow = result\.workflow\?\.status === "collecting"/);
  assert.match(script, /result\.workflow\?\.status === "delivery_failed"/);
  assert.match(script, /result\.workflow\?\.type === "lost_key" && result\.workflow\?\.status === "awaiting_fee_acceptance"/);
  assert.match(script, /activeWorkflowState = activeWorkflow \? result\.workflow : null/);
  assert.match(script, /result\.workflow\?\.type === "luggage"/);
  assert.match(script, /dataset\.serverQuestion = redactPrivateContact/);
  assert.doesNotMatch(script, /houseConciergeHistory[^\n]{0,200}privateWorkflowContact/);
  assert.doesNotMatch(script, /houseConciergeHistory[^\n]{0,200}activeWorkflowState/);
});

test("protected workflows never fall back to the device-only answer engine", async () => {
  const [script, booking] = await Promise.all([
    readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8"),
    readFile(new URL("../public/concierge-booking.js", import.meta.url), "utf8")
  ]);
  assert.match(script, /function requiresProtectedServer\(question\)/);
  assert.match(script, /function isExplicitBookingRetry\(question\)/);
  assert.match(script, /if \(activeWorkflowState\) return true/);
  assert.match(script, /return isExplicitBookingRetry\(source\)/);
  assert.match(script, /const impliedLuggageRequest = \/\\b\(\?:arrival\|arriving\|departure\|departing\)\\b\/i\.test\(source\)/);
  assert.match(script, /\|\| impliedLuggageRequest/);
  assert.match(script, /if \(requiresProtectedServer\(question\)\) \{[\s\S]*protectedError\.protectedWorkflow = true;[\s\S]*throw protectedError;/);
  assert.match(script, /if \(error\.protectedWorkflow\) \{\s*appendMessage\("concierge", error\.message\);\s*return;/);
  assert.match(script, /I couldn’t securely process that request, so it has not been sent/);
  assert.match(script, /bookingPromptFor/);
  assert.match(script, /I want to book a fishing trip\./);
  assert.match(script, /I want to book ferry tickets\./);
  assert.match(script, /i\\s\+\(\?:need\|want\|would\\s\+like\)/);
  assert.match(script, /make\\s\+\(\?:a\\s\+\)\?\(\?:booking\|reservation\)/);
  assert.match(script, /dirty\|messy\|unclean/);
  assert.match(script, /const lostKeyRequest = \/\\b/);
  assert.match(script, /\|\| lostKeyRequest\.test\(source\)/);
  assert.match(script, /fishing\|snorkel/);
  assert.match(script, /would\\s\+like\\s\+to\|wanna/);
  assert.match(script, /take\\s\+\(\?:me\|us\)/);
  assert.match(script, /HOUSE_CONCIERGE_BOOKING\?\.currentPrompt\?\.\(\)/);
  assert.match(booking, /currentPagePrompt = booking\.conciergePrompt/);
  assert.match(booking, /currentPrompt: \(\) => currentPagePrompt/);
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
  const [concierge, registrationEntry, room, roomAccess] = await Promise.all([
    readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8"),
    readFile(new URL("../public/registration-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../public/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/room-access.html", import.meta.url), "utf8")
  ]);

  assert.match(concierge, /type: "spare-key",\s*label: interpolate/);
  assert.match(concierge, /data-spare-key-access="true"/);
  assert.match(concierge, /link\.dataset\.spareKeyAccess = "true"/);
  assert.match(concierge, /event\.target\.closest\("\[data-spare-key-access\]"\)/);
  assert.match(concierge, /event\.preventDefault\(\);[\s\S]*closePanel\(\);[\s\S]*house:open-spare-key/);
  assert.match(concierge, /window\.location\.assign\(target\.href\)/);
  assert.match(concierge, /The House team will help you regain access/);
  assert.doesNotMatch(concierge, /before any spare-key code can be shown/);
  assert.match(registrationEntry, /window\.addEventListener\("house:open-spare-key", openSpareKeyAccess\)/);
  assert.match(registrationEntry, /window\.addEventListener\("hashchange", \(\) =>/);
  assert.match(registrationEntry, /if \(window\.location\.hash === "#spareKeyAccess"\) openSpareKeyAccess\(\)/);
  assert.match(registrationEntry, /if \(!data\.accessGranted && pendingPage\) \{[\s\S]*renderSpareKey\(data\)/);
  for (const page of [room, roomAccess]) {
    assert.match(page, /id="lostKeyFeeAccepted"[^>]*required/);
    assert.match(page, /I understand and want to continue/);
    assert.match(page, />Request spare key<\/button>/);
    assert.equal((page.match(/500 THB/g) || []).length, 1);
    assert.match(page, /id="spareKeyViewAction" hidden/);
    assert.match(page, /id="viewSpareKey"[^>]*>View spare key<\/button>/);
    assert.match(page, /id="spareKeyContactHelp" hidden/);
    assert.match(page, />Contact The House Concierge<\/a>/);
    assert.doesNotMatch(page, /lostKeyConfirmationCode/);
    assert.doesNotMatch(page, /already verified|team will be notified before|never sent through WhatsApp|webhook|notification gate/i);
  }
  assert.match(roomAccess, /id="openSpareKeyAccess"[^>]*hidden/);
  assert.doesNotMatch(room, /id="lostKeyFeeIntroduction"|id="lostKeyFeeConfirmation"/);
  assert.match(registrationEntry, /spareKeyForm\.hidden = true;[\s\S]*spareKeyContactHelp\.hidden = false/);
  assert.match(registrationEntry, /lost_key_request_used: messages\.keyRequestExpired/);
  assert.match(registrationEntry, /document\.getElementById\(id\)\?\.addEventListener\("click", \(\) => \{\s*if \(feeCheckbox\) feeCheckbox\.checked = false;\s*closeSpareKeyAccess\(\);/);
  assert.match(registrationEntry, /function renderSpareKey\(data\) \{[\s\S]*feeCheckbox\.checked = false;[\s\S]*lostKeyRequestToken = String\(data\.lostKeyRequestToken \|\| ""\)/);
  assert.match(registrationEntry, /lostKeyRequestToken = "";[\s\S]*spareKeyViewToken = String\(data\.spareKeyViewToken \|\| ""\);[\s\S]*spareKeyViewAction\.hidden = false/);
  assert.match(registrationEntry, /api\("\/api\/stay\/spare-key\/view"/);
  assert.match(registrationEntry, /JSON\.stringify\(\{ spareKeyViewToken \}\)/);
  assert.match(registrationEntry, /viewSpareKeyButton\?\.addEventListener\("click"[\s\S]*keyCode\.textContent = data\.keyBoxCode/);
  assert.doesNotMatch(registrationEntry, /(?:localStorage|sessionStorage).*lostKey|lostKey.*(?:localStorage|sessionStorage)/i);
});

test("owner dashboard major sections are independently collapsible, persistent and urgent-safe", async () => {
  const [html, script, styles] = await Promise.all([
    readFile(new URL("../public/concierge-admin.html", import.meta.url), "utf8"),
    readFile(new URL("../public/concierge-admin.js", import.meta.url), "utf8"),
    readFile(new URL("../public/concierge-admin.css", import.meta.url), "utf8")
  ]);
  const sections = [...html.matchAll(/<details class="concierge-admin-section" data-admin-section="([^"]+)"( open)?>/g)];
  assert.deepEqual(sections.map((match) => match[1]), ["stays", "finance", "alerts", "maintenance", "passports", "learning", "approved", "recent"]);
  assert.deepEqual(sections.filter((match) => match[2]).map((match) => match[1]), ["stays", "alerts"]);
  assert.equal((html.match(/<summary class="concierge-admin-section-head">/g) || []).length, sections.length);
  assert.equal((html.match(/data-section-count/g) || []).length, sections.length);
  assert.equal((html.match(/data-section-state/g) || []).length, sections.length);
  assert.match(html, /data-admin-section="maintenance"[\s\S]*id="maintenanceReports"[\s\S]*<\/details>/);
  assert.match(html, /data-admin-section="passports"[\s\S]*id="pendingRegistrations"[\s\S]*id="passportUploads"[\s\S]*<\/details>/);
  assert.match(html, /id="expandAdminSections"[^>]*>Expand all<\/button>/);
  assert.match(html, /id="collapseAdminSections"[^>]*>Collapse all<\/button>/);
  assert.match(html, /id="keyRotationActivity"/);

  assert.match(script, /houseConciergeAdminSections:v5\.11\.27/);
  assert.match(script, /adminSections\.map\(\(section\) => \[section\.dataset\.adminSection, section\.open\]\)/);
  assert.match(script, /typeof saved\[id\] === "boolean"/);
  assert.match(script, /section\.addEventListener\("toggle"/);
  assert.match(script, /summary\?\.setAttribute\("aria-expanded", String\(section\.open\)\)/);
  assert.match(script, /state\.textContent = section\.open \? "Expanded" : "Collapsed"/);
  assert.match(script, /if \(urgent\) setAdminSectionOpen\(section, true, false\)/);
  assert.match(script, /section\.classList\.contains\("has-urgent"\) && !section\.open/);
  assert.match(script, /summary\?\.setAttribute\("aria-disabled", "true"\)/);
  assert.match(script, /summary\?\.removeAttribute\("aria-disabled"\)/);
  assert.match(script, /Urgent · stays open/);
  assert.match(script, /if \(!section\.classList\.contains\("has-urgent"\)\) setAdminSectionOpen\(section, false, false\)/);
  assert.match(script, /setAdminSectionCount\("maintenance", \(data\.maintenanceReports \|\| \[\]\)\.length\)/);
  assert.match(script, /setAdminSectionCount\("passports", \(data\.pendingRegistrations \|\| \[\]\)\.length \+ \(data\.passportUploads \|\| \[\]\)\.length\)/);
  const setter = script.match(/function setAdminSectionOpen\([\s\S]*?\n  \}/)?.[0] || "";
  assert.match(setter, /section\.open = section\.classList\.contains\("has-urgent"\) \? true : Boolean\(open\)/);
  assert.doesNotMatch(setter, /replaceChildren|innerHTML|remove\(/);

  assert.match(script, /data\.rotationActivity \|\| \[\]/);
  assert.match(script, /Controlled admin test — keep existing code/);
  assert.match(script, /Physical key-box code rotated/);
  assert.match(script, /window\.prompt\(prompt\) !== confirmationPhrase/);
  assert.match(script, /confirmationPhrase = controlledTest \? "KEEP EXISTING CODE" : "CODE ROTATED"/);
  assert.match(script, /rotation_cleared_controlled_test/);
  assert.match(script, /existing physical code retained/);
  assert.match(script, /dataset\.rotationActivityId = item\.id/);
  assert.match(script, /dataset\.rotationActivityDelete = ""/);
  assert.match(script, /Delete key-box reset activity\?/);
  assert.match(script, /does not change the current key-box code or rotation-lock state/);
  assert.match(script, /spare-key-rotation-activity\/delete/);

  assert.match(styles, /summary:focus-visible/);
  assert.match(styles, /\.concierge-admin-section-head\{[^}]*min-height:52px/);
  assert.match(styles, /\.concierge-admin-section-head\[aria-disabled="true"\]\{cursor:not-allowed\}/);
  assert.match(styles, /\.concierge-admin-section-summary\{[^}]*flex-wrap:wrap/);
  assert.match(styles, /\.concierge-admin-table-wrap\{overflow:auto/);
  assert.match(styles, /@media\(max-width:760px\)[\s\S]*\.concierge-admin-section-head\{[^}]*flex-direction:column[^}]*min-width:0/);
  assert.match(styles, /@media\(max-width:760px\)[\s\S]*\.concierge-admin-section-summary\{[^}]*min-width:0/);
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
  assert.match(runtime, /\.language-header-button/);
  assert.doesNotMatch(runtime, /\.language-floating-button/);
  assert.match(runtime, /\.ai-concierge-message\.is-guest/);
  assert.match(guideApp, /src = "\/i18n\.js"/);
  assert.match(passport, /src="\/i18n\.js"/);
  assert.doesNotMatch(admin, /src="\/i18n\.js"/);
  assert.match(runtime, /exploreContentDeferred/);
  assert.match(runtime, /element\.closest\("\.section,\.footer"\)/);
  assert.match(runtime, /houseGuideTranslations:v5\.11\.45:/);
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
    "Your in-person passport handover is noted. Please bring the original passports of every non-Thai adult and child staying overnight. The private room guide will open after our team has checked them and completed the TM30 registration.",
    "Luggage storage",
    "Tuesday–Sunday during office working hours, or at Bamboo Beach Bar from 11:00 AM. No storage is currently available before 11:00 AM.",
    "Luggage storage is available Tuesday–Sunday during office working hours. If the office is unavailable, luggage can be stored at Bamboo Beach Bar from 11:00 AM. We do not currently have luggage storage for early-morning arrivals before 11:00 AM.",
    "💧 Please conserve water and electricity",
    "Fresh water is limited on Koh Tao. Electricity reaches the island through an undersea grid connection, reducing reliance on local diesel generators. Please use water and power thoughtfully, and switch off the air conditioning and lights when you leave the room.",
    "Complete your guest registration",
    "Passport information is required for non-Thai overnight guests. Thai guests are exempt.",
    "Access your room guide",
    "Open Concierge",
    "Open Google Maps",
    "Your private room guide",
    "Room location, arrival pictures, Wi-Fi and your full guest guide become available after your stay has been verified and the required guest registration is complete.",
    "Only human waste may be flushed. Put toilet paper, tissues, wipes, sanitary products and all other items in the bin provided. If a blockage is caused by a prohibited item, a 1,000 THB clearance fee applies.",
    "The House – Koh Tao · Simple, comfortable accommodation in Mae Haad.",
    "Enter your stay code to unlock your private room guide.",
    "Use the HM code in your Airbnb trip details, or your private House stay code.",
    "Your code is checked securely.",
    "Stay verified. Complete the short guest registration below.",
    "Choose one option for everyone staying overnight. Mixed groups should choose Foreign guest(s).",
    "No passport information is needed when every overnight guest is Thai.",
    "Passport information is required for every non-Thai adult and child staying overnight.",
    "Required for Thailand's TM30 registration. Passport images stay private and are deleted within 14 days—or sooner after processing.",
    "One passport is required for each non-Thai adult and child staying overnight.",
    "Use one private, single-use form per guest. Images are deleted within 14 days—or sooner.",
    "Upload passports securely",
    "Used only for TM30 registration. Your room guide opens after all required passports are uploaded.",
    "Choice saved. Bring every required original passport to The House. The guide opens after our team completes the check and TM30 registration.",
    "Emergency help remains available without verification.",
    "24-hour spare-key help",
    "Secure spare-key access is available 24 hours a day during your stay.",
    "If your key has been lost, a 500 THB replacement fee applies.",
    "Your spare key is ready.",
    "Use the code below to open the key box next to your room door.",
    "Key-box code",
    "Please take the spare key and close the key box again.",
    "If you need any further help, contact The House Concierge.",
    "I understand and want to continue.",
    "Request spare key",
    "View spare key",
    "Thank you. Your request has been sent to The House team. You can now securely view the spare-key information below.",
    "This lost-key request has expired. Refresh the page and explicitly accept the 500 THB fee again.",
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

test("every guest-facing page exposes a discreet token-free admin footer link", async () => {
  const publicRoot = new URL("../public/", import.meta.url);
  const [runtime, styles] = await Promise.all([
    readFile(new URL("../public/i18n.js", import.meta.url), "utf8"),
    readFile(new URL("../public/design-system.css", import.meta.url), "utf8")
  ]);
  assert.match(runtime, /adminLink\.href = "\/concierge-admin"/);
  assert.match(runtime, /adminLink\.textContent = "Admin Login"/);
  assert.doesNotMatch(runtime, /concierge-admin\?[^"']*(?:token|auth)/i);
  assert.match(styles, /\.admin-footer-link\{[^}]*font-size:12px[^}]*text-decoration:none/);

  const pages = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) await collect(new URL(`${entry.name}/`, directory));
      else if (entry.isFile() && entry.name.endsWith(".html") && entry.name !== "concierge-admin.html") pages.push(new URL(entry.name, directory));
    }
  }
  await collect(publicRoot);
  for (const page of pages) {
    const html = await readFile(page, "utf8");
    const hasStaticLink = /href="\/concierge-admin"/.test(html);
    const inheritsSharedFooter = html.includes('src="/guide-app.js"') || html.includes('src="/i18n.js"');
    assert.ok(hasStaticLink || inheritsSharedFooter, `${page.pathname} has no admin footer access`);
    assert.doesNotMatch(html, /href="\/concierge-admin\?[^"']*(?:token|auth)/i);
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
      body: JSON.stringify({
        language: "es",
        page: "/index.html",
        texts: [
          "Welcome to Koh Tao",
          "I'm here to help. What has happened in your room? Please briefly tell me what the problem is.",
          "Thank you for your request. We’ll bring soap to your room as soon as possible. If you haven’t received it within 30 minutes, please call us using the button below."
        ]
      })
    });
    const approvedResponse = await handleTranslationRequest(approvedRequest, env);
    assert.equal(approvedResponse.status, 200);
    assert.deepEqual((await approvedResponse.json()).translations, ["Bienvenido", "Bienvenido", "Bienvenido"]);

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
  assert.equal(isAfterHours(new Date("2026-08-31T05:00:00.000Z")), false);

  const nighttimeKeyWithoutFee = classifyConciergeAlert({
    result: { needsHuman: true, intentId: "lost_key", category: "room", handoff: "stay_support" },
    question: "I lost my key",
    room: "7",
    now: new Date("2027-08-12T13:00:00.000Z")
  });
  assert.equal(nighttimeKeyWithoutFee, null);
  const daytimeKeyWithoutFee = classifyConciergeAlert({
    result: { needsHuman: true, intentId: "lost_key", category: "room", handoff: "stay_support" },
    question: "I lost my key", room: "2", now: new Date("2027-08-12T05:00:00.000Z")
  });
  assert.equal(daytimeKeyWithoutFee, null);
  const explicitlyAcceptedKey = classifyConciergeAlert({
    result: { needsHuman: true, intentId: "lost_key", category: "room", handoff: "stay_support", confirmedLostKeyFee: true },
    question: "I lost my key", room: "2", now: new Date("2027-08-12T05:00:00.000Z")
  });
  assert.equal(explicitlyAcceptedKey.recipientGroup, "lost_key_team");
  assert.equal(explicitlyAcceptedKey.severity, "urgent");
  assert.equal(explicitlyAcceptedKey.escalationRequired, false);

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
    assert.equal(outbound.every((item) => item.body.template.name === "house_urgent_alert_v2"), true);
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

test("vague urgent wording collects a meaningful incident before offering or sending an alert", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66 64 000 0001" }],
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
    return new Response(JSON.stringify({ messages: [{ id: `wamid.urgent-detail-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const vague = await handleConciergeRequest(guestRequest("There is a serious problem in my room."), env);
    const vagueBody = await vague.json();
    assert.equal(vagueBody.intentId, "urgent_clarification");
    assert.match(vagueBody.answer, /What has happened in your room/i);
    assert.deepEqual(vagueBody.actions, []);
    assert.equal(vagueBody.actions.some((action) => action.action === "confirm_urgent_property"), false);
    assert.equal(vagueBody.workflow.type, "urgent_clarification");
    assert.equal(vagueBody.workflow.status, "collecting");
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound.length, 0);

    const described = await handleConciergeRequest(guestRequest(
      "Water is pouring from the ceiling and my room is flooding.",
      {
        workflowState: vagueBody.workflow,
        history: [
          { role: "user", content: "There is a serious problem in my room." },
          { role: "assistant", content: vagueBody.answer }
        ]
      }
    ), env);
    const describedBody = await described.json();
    assert.equal(describedBody.intentId, "property_emergency");
    assert.equal(describedBody.actions[0].action, "confirm_urgent_property");
    assert.equal(describedBody.actions[0].label, "Send urgent alert");
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound.length, 0);

    const confirmed = await handleConciergeRequest(guestRequest(
      "Water is pouring from the ceiling and my room is flooding.",
      { action: "confirm_urgent_property" }
    ), env);
    const confirmedBody = await confirmed.json();
    assert.match(confirmedBody.answer, /Urgent alert sent/i);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].summary, "Water is pouring from the ceiling and my room is flooding.");
    assert.equal(outbound.length, 3);
    assert.equal(outbound.every((payload) => payload.template.name === "house_urgent_alert_v2"), true);
    assert.equal(outbound.every((payload) => payload.template.language.code === "en"), true);
    assert.equal(outbound.every((payload) => payload.template.components[0].parameters.length === 5), true);
    assert.equal(outbound.every((payload) => payload.template.components[0].parameters[2].text === "Flooding / major water leak"), true);
    assert.equal(outbound.every((payload) => payload.template.components[0].parameters[4].text.toLowerCase().includes("water is pouring from the ceiling")), true);
    assert.deepEqual(outbound.map((payload) => payload.to).sort(), ["66810000002", "66820000003", "66960000001"]);
    assert.doesNotMatch(JSON.stringify(outbound), /66640000001/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("every generic urgent phrase asks what happened without exposing the send action", async () => {
  for (const phrase of [
    "I have an urgent problem.",
    "Urgent help!",
    "Something serious happened.",
    "Something is wrong in my room.",
    "Emergency!"
  ]) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const response = await handleConciergeRequest(guestRequest(phrase), env);
    const body = await response.json();
    assert.equal(body.intentId, "urgent_clarification", phrase);
    assert.match(body.answer, /What has happened/i, phrase);
    assert.deepEqual(body.actions, [], phrase);
    assert.equal(body.workflow.type, "urgent_clarification", phrase);
    assert.equal(store.alerts.length, 0, phrase);
  }
});

test("vague urgent clarification can resolve into medical, routine service or ordinary support", async () => {
  const medical = createEnvironment({ OPENAI_API_KEY: "" });
  const vagueMedical = await handleConciergeRequest(guestRequest("I need urgent help."), medical.env);
  const vagueMedicalBody = await vagueMedical.json();
  assert.equal(vagueMedicalBody.intentId, "urgent_clarification");
  assert.equal(medical.store.alerts.length, 0);
  const medicalFollowUp = await handleConciergeRequest(guestRequest("Someone is unconscious and won't wake up.", {
    workflowState: vagueMedicalBody.workflow,
    history: [
      { role: "user", content: "I need urgent help." },
      { role: "assistant", content: vagueMedicalBody.answer }
    ]
  }), medical.env);
  const medicalBody = await medicalFollowUp.json();
  assert.equal(medicalBody.intentId, "medical_emergency");
  assert.equal(medicalBody.actions[0].route, "rescueCall");
  assert.equal(medicalBody.actions[1].route, "medicalNationalCall");
  assert.equal(medicalBody.actions[2].action, "confirm_urgent_medical");
  assert.equal(medical.store.alerts.length, 0);

  const routine = createEnvironment({
    OPENAI_API_KEY: "",
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
  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.vague-routine-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const vagueRoutine = await handleConciergeRequest(guestRequest("Something is wrong in my room."), routine.env);
    const vagueRoutineBody = await vagueRoutine.json();
    const toiletPaper = await handleConciergeRequest(guestRequest("I need toilet paper.", {
      workflowState: vagueRoutineBody.workflow,
      history: [
        { role: "user", content: "Something is wrong in my room." },
        { role: "assistant", content: vagueRoutineBody.answer }
      ]
    }), routine.env);
    const toiletPaperBody = await toiletPaper.json();
    assert.equal(toiletPaperBody.intentId, "housekeeping_toilet_paper");
    assert.equal(toiletPaperBody.actions.some((action) => action.action === "confirm_urgent_property"), false);
    assert.doesNotMatch(toiletPaperBody.answer, /WhatsApp|phone number|country code/i);
    assert.equal(routine.store.alerts.length, 1);
    assert.equal(routine.store.alerts[0].alertType, "stay_support");
    assert.equal(outbound.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("urgent clarification interrupts pending luggage and never submits stale luggage state", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
  const luggage = await handleConciergeRequest(guestRequest(
    "Please store 3 bags for departure at 1 PM."
  ), env);
  const luggageBody = await luggage.json();
  assert.equal(luggageBody.workflow.type, "luggage");
  assert.deepEqual(luggageBody.workflow.missing, ["contact"]);

  const vague = await handleConciergeRequest(guestRequest("There is a serious problem in my room.", {
    workflowState: luggageBody.workflow,
    history: [
      { role: "user", content: "Please store 3 bags for departure at 1 PM." },
      { role: "assistant", content: luggageBody.answer }
    ]
  }), env);
  const vagueBody = await vague.json();
  assert.equal(vagueBody.intentId, "urgent_clarification");
  assert.equal(vagueBody.workflow.type, "urgent_clarification");
  assert.doesNotMatch(vagueBody.answer, /WhatsApp|phone number|country code/i);
  assert.equal(store.alerts.length, 0);

  const flood = await handleConciergeRequest(guestRequest("Water is pouring through the ceiling.", {
    workflowState: vagueBody.workflow,
    history: [
      { role: "user", content: "There is a serious problem in my room." },
      { role: "assistant", content: vagueBody.answer }
    ]
  }), env);
  const floodBody = await flood.json();
  assert.equal(floodBody.intentId, "property_emergency");
  assert.equal(floodBody.actions[0].action, "confirm_urgent_property");
  assert.equal(store.alerts.length, 0);

  const direct = await handleConciergeRequest(guestRequest("My room is flooding.", {
    workflowState: luggageBody.workflow,
    history: [
      { role: "user", content: "Please store 3 bags for departure at 1 PM." },
      { role: "assistant", content: luggageBody.answer }
    ]
  }), env);
  const directBody = await direct.json();
  assert.equal(directBody.intentId, "property_emergency");
  assert.equal(directBody.actions[0].action, "confirm_urgent_property");
  assert.equal(store.alerts.length, 0);
});

test("the urgent confirmation boundary rejects a vague incident summary", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
      emergency: [{ label: "Owner 1", phone: "+66 81 000 0002" }]
    })
  });
  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: "wamid.should-not-send" }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const response = await handleConciergeRequest(guestRequest("Emergency!", {
      action: "confirm_urgent_property"
    }), env);
    const body = await response.json();
    assert.equal(body.intentId, "urgent_clarification");
    assert.equal(body.actions.some((action) => action.action === "confirm_urgent_property"), false);
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
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
  assert.match(body.answer, /what kind of snorkeling trip/i);
  assert.equal(body.workflow.missing.includes("contact"), true);
  assert.equal(body.workflow.retainPrivateContact, false);
  assert.equal(store.alerts.length, 0);
});

test("unacknowledged critical alerts escalate and authorized WhatsApp replies can resolve them", async () => {
  const recipientSecret = JSON.stringify({
    emergency: [
      { label: "Owner 1", phone: "+66 81 000 0002" },
      { label: "Owner 2", phone: "+66 82 000 0003" }
    ],
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

test("final server action policy removes model-derived routine Contact Us and Call Us actions after hours", async () => {
  const { env } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output: [{
      type: "message",
      content: [{
        type: "output_text",
        text: JSON.stringify({
          answer: "A member of the team can help with that.",
          intent_id: "unusual_support_request",
          category: "stay-support",
          confidence: 0.8,
          needs_human: true,
          handoff: "stay_support",
          learning_gap: false,
          learning_reason: "none"
        })
      }]
    }]
  }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await handleConciergeRequest(
      guestRequest("Could a team member advise me about an unusual personal request?"),
      env,
      undefined,
      new Date("2026-08-28T17:17:00.000Z")
    );
    const body = await response.json();
    assert.equal(body.source, "ai");
    assert.equal(body.actions.some((action) => action.route === "houseWhatsapp"), false);
    assert.equal(body.actions.some((action) => action.route === "houseCall"), false);
    assert.equal(body.actions.some((action) => action.route === "propertyEmergencyCall"), false);
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
    assert.equal(body.source, "booking-policy");
    assert.doesNotMatch(body.answer, /commission|referral payment|revenue share/i);
    assert.match(body.answer, /What would you like to book/i);
    assert.deepEqual(body.workflow.missing, ["kind"]);
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
  assert.equal(taxiBody.workflow.kind, "taxi");
  assert.equal(taxiBody.workflow.status, "collecting");
  assert.deepEqual(taxiBody.actions, []);

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
    { iso: "2026-08-25T03:29:00.000Z", afterHours: true },
    { iso: "2026-08-25T03:30:00.000Z", afterHours: false },
    { iso: "2026-08-25T12:29:00.000Z", afterHours: false },
    { iso: "2026-08-25T12:30:00.000Z", afterHours: true },
    { iso: "2026-08-24T06:00:00.000Z", afterHours: true }
  ];
  for (const item of cases) {
    const result = housekeepingServiceResult("Can I have new toilet paper?", new Date(item.iso));
    assert.ok(result, item.iso);
    assert.equal(result.housekeepingRequest.afterHours, item.afterHours, item.iso);
    if (item.afterHours) {
      assert.match(result.answer, /currently off duty/i, item.iso);
      assert.match(result.answer, /10:30 AM/i, item.iso);
      assert.doesNotMatch(result.answer, /within 30 minutes/i, item.iso);
      assert.deepEqual(result.actions, [], item.iso);
    } else {
      assert.match(result.answer, /send your toilet paper request/i, item.iso);
      assert.doesNotMatch(result.answer, /within 30 minutes/i, item.iso);
      assert.deepEqual(result.actions, [], item.iso);
    }
  }
});

test("routine housekeeping supplies always create one Su-and-owner service alert", async () => {
  const requests = [
    ["Can I have new toilet paper?", /toilet paper/i],
    ["I need fresh towels.", /fresh towels/i],
    ["Towels please.", /fresh towels/i],
    ["There are no towels in my room.", /fresh towels/i],
    ["No towels.", /fresh towels/i],
    ["We don’t have towels.", /fresh towels/i],
    ["Our room has no towels.", /fresh towels/i],
    ["Missing towels.", /fresh towels/i],
    ["No toilet paper.", /toilet paper/i],
    ["We’re out of toilet paper.", /toilet paper/i],
    ["There is no soap.", /soap/i],
    ["Can I have soap?", /soap/i],
    ["Can I have fresh soap?", /soap/i],
    ["Can I have additional toilet paper?", /toilet paper/i]
  ];
  const originalFetch = globalThis.fetch;
  try {
    for (const [question, itemPattern] of requests) {
      const { env, store } = createEnvironment({
        OPENAI_API_KEY: "",
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
      assert.match(body.answer, /I’ve sent (?:a |your )?request for/i, question);
      assert.match(body.answer, itemPattern, question);
      assert.doesNotMatch(body.answer, /request (?:it|them) again|Call Us/i, question);
      assert.deepEqual(body.actions, [], question);
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

test("supply questions stay informational while a verified missing-towel statement alerts immediately", async () => {
  const now = new Date("2026-08-29T08:00:00.000Z");
  const { env, store } = createEnvironment({
    GUEST_ACCESS_ENFORCEMENT: "true",
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
  const cookie = await syncAndVerifyStay(env, { now });
  const nationality = await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "thai", allGuestsThai: true })
  }), env, "/api/stay/nationality", null, new Date(now.getTime() + 10));
  assert.equal(nationality.status, 200);
  const informational = await handleConciergeRequest(
    verifiedConciergeRequest("How often are towels changed?", cookie),
    env,
    undefined,
    now
  );
  const informationalBody = await informational.json();
  assert.equal(informationalBody.needsHuman, false);
  assert.equal(store.alerts.length, 0);

  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.verified-towels-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const actionable = await handleConciergeRequest(
      verifiedConciergeRequest("There are no towels in my room.", cookie),
      env,
      undefined,
      now
    );
    const actionableBody = await actionable.json();
    assert.equal(actionableBody.intentId, "housekeeping_fresh_towels");
    assert.match(actionableBody.answer, /I’ve sent a request for fresh towels/i);
    assert.doesNotMatch(actionableBody.answer, /request (?:it|them) again|Call Us/i);
    assert.deepEqual(actionableBody.actions, []);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].recipientGroup, "support_with_owners");
    assert.deepEqual(outbound.map((item) => item.to).sort(), ["66640000001", "66810000002", "66820000003"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("room cleaning collects a preferred time and submits the same request without contact", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
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
  const openTuesday = new Date("2026-08-25T04:00:00.000Z");
  const pending = await handleConciergeRequest(guestRequest("my room is dirty"), env, undefined, openTuesday);
  const pendingBody = await pending.json();
  assert.equal(pendingBody.workflow.type, "cleaning");
  assert.equal(pendingBody.workflow.status, "collecting");
  assert.deepEqual(pendingBody.workflow.missing, ["preferredTime"]);
  assert.match(pendingBody.answer, /What time would be most convenient/i);
  assert.match(pendingBody.answer, /exact cleaning time may vary/i);
  assert.doesNotMatch(pendingBody.answer, /phone|WhatsApp|country code/i);
  assert.equal(store.alerts.length, 0);

  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.cleaning-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const completed = await handleConciergeRequest(guestRequest("3:30pm", {
      workflowState: pendingBody.workflow,
      history: [
        { role: "user", content: "my room is dirty" },
        { role: "assistant", content: pendingBody.answer }
      ]
    }), env, undefined, openTuesday);
    const completedBody = await completed.json();
    assert.equal(completedBody.workflow.status, "submitted");
    assert.match(completedBody.answer, /Preferred time: 3:30 PM/i);
    assert.match(completedBody.answer, /come as close to your preferred time as possible, depending on availability/i);
    assert.doesNotMatch(completedBody.answer, /until (?:they|the team) repl(?:y|ies)|support team.*reply/i);
    assert.doesNotMatch(completedBody.answer, /send the request to|contact (?:our )?support|scheduled for|phone|WhatsApp/i);
    assert.deepEqual(completedBody.actions, []);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].recipientGroup, "support_with_owners");
    assert.match(store.alerts[0].summary, /Preferred time: 3:30 PM/i);
    assert.equal(outbound.length, 3);
    assert.equal(outbound.every((payload) => payload.template.name === "house_service_alert_v3"), true);
    outbound.forEach((payload) => {
      assert.match(payload.template.components[0].parameters[4].text, /Preferred time: 3:30 PM/i);
    });

    const continuation = await handleConciergeRequest(guestRequest("Thank you", {
      history: [
        { role: "user", content: "my room is dirty" },
        { role: "assistant", content: pendingBody.answer },
        { role: "user", content: "3:30pm" },
        { role: "assistant", content: completedBody.answer }
      ]
    }), env, undefined, openTuesday);
    assert.equal(continuation.status, 200);
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a past same-day cleaning time stays pending and one valid correction submits", async () => {
  const now = new Date("2026-08-28T08:33:00.000Z"); // 15:33 in Bangkok.
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
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
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.past-cleaning-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const pending = await handleConciergeRequest(guestRequest("my room is dirty"), env, undefined, now);
    const pendingBody = await pending.json();
    assert.equal(pendingBody.workflow.status, "collecting");
    assert.equal(pendingBody.workflow.cleaningRequest.requestedDate, "2026-08-28");

    const invalid = await handleConciergeRequest(guestRequest("2pm", {
      workflowState: pendingBody.workflow,
      history: [
        { role: "user", content: "my room is dirty" },
        { role: "assistant", content: pendingBody.answer }
      ]
    }), env, undefined, now);
    const invalidBody = await invalid.json();
    assert.equal(invalidBody.workflow.type, "cleaning");
    assert.equal(invalidBody.workflow.status, "collecting");
    assert.deepEqual(invalidBody.workflow.missing, ["preferredTime"]);
    assert.equal(invalidBody.workflow.cleaningRequest.preferredTime, "");
    assert.equal(invalidBody.workflow.cleaningRequest.requestedDate, "2026-08-28");
    assert.match(invalidBody.answer, /2:00 PM has already passed today/i);
    assert.match(invalidBody.answer, /What time would you prefer instead/i);
    assert.match(invalidBody.answer, /now.*ASAP/i);
    assert.deepEqual(invalidBody.actions, []);
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound.length, 0);

    const corrected = await handleConciergeRequest(guestRequest("4pm", {
      workflowState: invalidBody.workflow,
      history: [
        { role: "user", content: "my room is dirty" },
        { role: "assistant", content: pendingBody.answer },
        { role: "user", content: "2pm" },
        { role: "assistant", content: invalidBody.answer }
      ]
    }), env, undefined, now);
    const correctedBody = await corrected.json();
    assert.equal(correctedBody.workflow.status, "submitted");
    assert.match(correctedBody.answer, /Preferred time: 4:00 PM/i);
    assert.equal(store.alerts.length, 1);
    assert.match(store.alerts[0].summary, /Preferred time: 4:00 PM/i);
    assert.doesNotMatch(store.alerts[0].summary, /Preferred time: 2:00 PM/i);
    assert.equal(outbound.length, 3);
    outbound.forEach((payload) => {
      assert.match(payload.template.components[0].parameters[4].text, /Preferred time: 4:00 PM/i);
      assert.doesNotMatch(payload.template.components[0].parameters[4].text, /Preferred time: 2:00 PM/i);
    });

    const continuation = await handleConciergeRequest(guestRequest("Thank you", {
      history: [
        { role: "user", content: "4pm" },
        { role: "assistant", content: correctedBody.answer }
      ]
    }), env, undefined, now);
    assert.equal(continuation.status, 200);
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cleaning preferences use Bangkok date, current time and operating-day boundaries", async () => {
  const now = new Date("2026-08-28T08:33:00.000Z"); // Friday 15:33 in Bangkok.
  const originalFetch = globalThis.fetch;
  try {
    for (const [question, preference] of [
      ["Please clean my room at 5pm.", "5:00 PM"],
      ["Please clean my room at 17:00.", "5:00 PM"],
      ["Please clean my room now.", "Now"],
      ["Please clean my room ASAP.", "As soon as possible"]
    ]) {
      const { env, store } = createEnvironment({
        WHATSAPP_ACCESS_TOKEN: "meta-test-token",
        WHATSAPP_PHONE_NUMBER_ID: "1234567890",
        WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ support: [{ label: "Su", phone: "+66 64 000 0001" }] })
      });
      globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: `wamid.valid-cleaning-${preference}` }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
      const response = await handleConciergeRequest(guestRequest(question, { sessionId: `session_${preference.replace(/\W/g, "_")}_1234567890` }), env, undefined, now);
      const body = await response.json();
      assert.ok(body.workflow, `${question}: ${JSON.stringify(body)}`);
      assert.equal(body.workflow.status, "submitted", question);
      assert.match(body.answer, new RegExp(preference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), question);
      assert.equal(store.alerts.length, 1, question);
      assert.match(store.alerts[0].summary, new RegExp(`Preferred time: ${preference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"), question);
    }

    for (const [question, testNow, expected] of [
      ["Please clean my room at 20:00.", now, /finishes at 7:30 PM/i],
      ["Please clean my room at 3pm.", new Date("2026-08-24T06:00:00.000Z"), /closed on Mondays.*Tuesday at 10:30 AM/is],
      ["Please clean my room at 9pm.", new Date("2026-08-30T13:00:00.000Z"), /next housekeeping opening is Tuesday at 10:30 AM/i]
    ]) {
      const { env, store } = createEnvironment();
      const response = await handleConciergeRequest(guestRequest(question), env, undefined, testNow);
      const body = await response.json();
      assert.equal(body.workflow.status, "collecting", question);
      assert.match(body.answer, expected, question);
      assert.deepEqual(body.actions, [], question);
      assert.equal(store.alerts.length, 0, question);
    }

    const future = createEnvironment({
      WHATSAPP_ACCESS_TOKEN: "meta-test-token",
      WHATSAPP_PHONE_NUMBER_ID: "1234567890",
      WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ support: [{ label: "Su", phone: "+66 64 000 0001" }] })
    });
    globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: "wamid.future-cleaning" }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
    const futureResponse = await handleConciergeRequest(guestRequest("Please clean my room tomorrow at 2pm."), future.env, undefined, now);
    const futureBody = await futureResponse.json();
    assert.equal(futureBody.workflow.status, "submitted");
    assert.match(futureBody.answer, /2:00 PM on 29 Aug 2026/i);
    assert.equal(future.store.alerts.length, 1);
    assert.match(future.store.alerts[0].summary, /Preferred time: 2:00 PM on 29 Aug 2026/i);

    const context = createEnvironment({
      WHATSAPP_ACCESS_TOKEN: "meta-test-token",
      WHATSAPP_PHONE_NUMBER_ID: "1234567890",
      WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ support: [{ label: "Su", phone: "+66 64 000 0001" }] })
    });
    const contextPending = await handleConciergeRequest(guestRequest("Please clean my room tomorrow."), context.env, undefined, now);
    const contextPendingBody = await contextPending.json();
    assert.equal(contextPendingBody.workflow.cleaningRequest.requestedDate, "2026-08-29");
    const contextComplete = await handleConciergeRequest(guestRequest("2pm", {
      workflowState: contextPendingBody.workflow
    }), context.env, undefined, now);
    const contextCompleteBody = await contextComplete.json();
    assert.equal(contextCompleteBody.workflow.status, "submitted");
    assert.match(contextCompleteBody.answer, /2:00 PM on 29 Aug 2026/i);
    assert.equal(context.store.alerts.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cleaning with a supplied preference does not ask twice", async () => {
  const { env, store } = createEnvironment({
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ support: [{ label: "Su", phone: "+66 64 000 0001" }] })
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: "wamid.cleaning-direct" }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    for (const [requestText, preference] of [
      ["Please clean my room at 3 PM.", "3:00 PM"],
      ["Please clean my room now.", "Now"],
      ["Please clean my room as soon as possible.", "As soon as possible"]
    ]) {
      const response = await handleConciergeRequest(guestRequest(requestText, { sessionId: `session_clean_${preference.replace(/\W/g, "_")}` }), env, undefined, new Date("2026-08-25T04:00:00.000Z"));
      const body = await response.json();
      assert.equal(body.workflow.status, "submitted", requestText);
      assert.match(body.answer, new RegExp(preference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), requestText);
      assert.doesNotMatch(body.answer, /What time would be most convenient/i, requestText);
    }
    assert.equal(store.alerts.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Monday and Sunday-after-hours cleaning use the real next housekeeping day", async () => {
  const cases = [
    {
      now: new Date("2026-08-24T06:00:00.000Z"),
      pattern: /not available on Mondays.*10:30 AM tomorrow/is,
      forbidden: /same-day/i
    },
    {
      now: new Date("2026-08-30T13:00:00.000Z"),
      pattern: /not available on Mondays.*10:30 AM on Tuesday/is,
      forbidden: /tomorrow morning/i
    }
  ];
  for (const item of cases) {
    const { env, store } = createEnvironment();
    const response = await handleConciergeRequest(guestRequest("Please clean my room."), env, undefined, item.now);
    const body = await response.json();
    assert.equal(body.workflow.status, "collecting");
    assert.match(body.answer, item.pattern);
    assert.doesNotMatch(body.answer, item.forbidden);
    assert.deepEqual(body.actions, []);
    assert.equal(store.alerts.length, 0);
  }
});

test("Monday and Sunday-evening cleaning preferences still alert once without Call Us", async () => {
  const cases = [
    [new Date("2026-08-24T06:00:00.000Z"), /Tuesday from 10:30 AM/i],
    [new Date("2026-08-30T13:00:00.000Z"), /Tuesday from 10:30 AM/i]
  ];
  const originalFetch = globalThis.fetch;
  try {
    for (const [now, nextOpeningPattern] of cases) {
      const { env, store } = createEnvironment({
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
        return new Response(JSON.stringify({ messages: [{ id: `wamid.closed-cleaning-${outbound.length}` }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      };
      const pending = await handleConciergeRequest(guestRequest("my room is dirty"), env, undefined, now);
      const pendingBody = await pending.json();
      const completed = await handleConciergeRequest(guestRequest("ASAP", {
        workflowState: pendingBody.workflow
      }), env, undefined, now);
      const completedBody = await completed.json();
      assert.equal(completedBody.workflow.status, "submitted");
      assert.match(completedBody.answer, nextOpeningPattern);
      assert.deepEqual(completedBody.actions, []);
      assert.equal(store.alerts.length, 1);
      assert.equal(store.alerts[0].recipientGroup, "support_with_owners");
      assert.match(store.alerts[0].summary, /Preferred time: As soon as possible/i);
      assert.equal(outbound.length, 3);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("routine housekeeping overrides an older contact-collection workflow without asking for a phone number", async () => {
  const pendingWorkflows = [
    [
      "Please arrange luggage storage after checkout at 3 PM for 2 bags.",
      "What WhatsApp or phone number can our team use to contact you? Please include the country code."
    ],
    [
      "I want to book Fun Diving tomorrow for 2 divers. I am Advanced Open Water certified.",
      "We’d be happy to help arrange your diving. Please tell me your WhatsApp or phone number including the international country code."
    ]
  ];
  const originalFetch = globalThis.fetch;
  try {
    for (const [pendingQuestion, pendingAnswer] of pendingWorkflows) {
      const { env, store } = createEnvironment({
        OPENAI_API_KEY: "",
        WHATSAPP_ACCESS_TOKEN: "meta-test-token",
        WHATSAPP_PHONE_NUMBER_ID: "1234567890",
        WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
          support: [{ label: "Su", phone: "+66 64 000 0001" }],
          booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
          emergency: [
            { label: "Owner 1", phone: "+66 81 000 0002" },
            { label: "Owner 2", phone: "+66 82 000 0003" }
          ]
        })
      });
      const outbound = [];
      globalThis.fetch = async (_url, options) => {
        outbound.push(JSON.parse(options.body));
        return new Response(JSON.stringify({ messages: [{ id: `wamid.soap-${outbound.length}` }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      };
      const response = await handleConciergeRequest(guestRequest("Can I have fresh soap?", {
        history: [
          { role: "user", content: pendingQuestion },
          { role: "assistant", content: pendingAnswer }
        ]
      }), env);
      const body = await response.json();
      assert.equal(body.intentId, "housekeeping_soap", pendingQuestion);
      assert.doesNotMatch(body.answer, /WhatsApp|phone number|country code/i, pendingQuestion);
      assert.equal(store.alerts.length, 1, pendingQuestion);
      assert.equal(store.alerts[0].recipientGroup, "support_with_owners", pendingQuestion);
      assert.equal(outbound.length, 3, pendingQuestion);
      assert.equal(outbound.every((payload) => payload.template.name === "house_service_alert_v3"), true, pendingQuestion);
      assert.equal(outbound.every((payload) => payload.template.language.code === "en"), true, pendingQuestion);
      assert.equal(outbound.every((payload) => payload.template.components[0].parameters.length === 5), true, pendingQuestion);
      assert.equal(outbound.every((payload) => payload.template.components[0].parameters[2].text === "Soap"), true, pendingQuestion);
      assert.deepEqual(outbound.map((payload) => payload.to).sort(), ["66640000001", "66810000002", "66820000003"], pendingQuestion);
      assert.doesNotMatch(JSON.stringify(outbound), /66960000001/, pendingQuestion);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("after-hours housekeeping records the request once and sets next-morning expectations", () => {
  const result = housekeepingServiceResult("Can I have fresh soap?", new Date("2026-08-27T12:30:00.000Z"));
  assert.ok(result);
  assert.match(result.answer, /currently off duty/i);
  assert.match(result.answer, /send your soap request/i);
  assert.match(result.answer, /from 10:30 AM tomorrow/i);
  assert.doesNotMatch(result.answer, /within 30 minutes/i);
  assert.deepEqual(result.actions, []);
});

test("natural routine room and property reports create one protected Su-and-owner service alert", async () => {
  const cases = [
    ["There’s a rat in my roof.", "pest"],
    ["There are ants all over my room.", "pest"],
    ["There is a spider in the bathroom.", "pest"],
    ["My bathroom smells like sewage.", "odor"],
    ["There is a rotten egg smell from the shower.", "odor"],
    ["My AC smells bad.", "odor"],
    ["My AC isn’t cold.", "equipment"],
    ["The fridge isn’t cold.", "equipment"],
    ["The toilet is blocked.", "plumbing"],
    ["The shower has no hot water.", "plumbing"],
    ["The light doesn’t work.", "equipment"],
    ["The Wi-Fi isn’t working.", "equipment"],
    ["Water is dripping from the ceiling.", "condition"]
  ];
  const originalFetch = globalThis.fetch;
  try {
    for (const [question, category] of cases) {
      const { env, store } = createEnvironment({
        OPENAI_API_KEY: "test-key-must-not-be-used",
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
      const outbound = [];
      globalThis.fetch = async (_url, options) => {
        outbound.push(JSON.parse(options.body));
        return new Response(JSON.stringify({ messages: [{ id: `wamid.property-${category}-${outbound.length}` }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      };
      const response = await handleConciergeRequest(guestRequest(question, {
        sessionId: `session_property_${category}_${crypto.randomUUID()}`
      }), env);
      const body = await response.json();
      assert.equal(response.status, 200, question);
      assert.equal(body.source, "service-policy", question);
      assert.equal(body.workflow.type, "property_issue", question);
      assert.equal(body.workflow.status, "monitoring", question);
      assert.equal(body.workflow.issueCategory, category, question);
      assert.equal(body.workflow.notified, true, question);
      assert.match(body.answer, /Thank you for letting us know.*sent this to The House team.*check it as soon as possible/is, question);
      assert.doesNotMatch(body.answer, /alert|protected operation|routing|webhook|WhatsApp or phone number/i, question);
      assert.equal(store.alerts.length, 1, question);
      assert.equal(store.alerts[0].alertType, "stay_support", question);
      assert.equal(store.alerts[0].recipientGroup, "support_with_owners", question);
      assert.equal(outbound.length, 3, question);
      assert.deepEqual(outbound.map((payload) => payload.to).sort(), ["66640000001", "66810000002", "66820000003"], question);
      assert.equal(outbound.every((payload) => payload.template.name === "house_service_alert_v3"), true, question);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("routine pest names, plurals and likely typos send the existing protected service alert with current Meta actions", async () => {
  const exactTerms = [
    "cockroach", "cockroaches", "roach", "roaches", "rat", "rats", "mouse", "mice", "ant", "ants",
    "spider", "spiders", "termite", "termites", "flea", "fleas", "bed bug", "bed bugs", "bedbug", "bedbugs",
    "mosquito", "mosquitoes", "mosquitos", "insect", "insects", "bug", "bugs", "bee", "bees", "wasp", "wasps",
    "hornet", "hornets", "fly", "flies", "fruit fly", "fruit flies", "sand fly", "sand flies", "sandfly", "sandflies",
    "gnat", "gnats", "moth", "moths", "beetle", "beetles", "silverfish", "silver fish", "centipede", "centipedes",
    "millipede", "millipedes", "scorpion", "scorpions", "tick", "ticks", "mite", "mites", "gecko", "geckos",
    "lizard", "lizards", "cricket", "crickets", "grasshopper", "grasshoppers", "earwig", "earwigs", "weevil", "weevils",
    "maggot", "maggots", "larva", "larvae", "worm", "worms", "caterpillar", "caterpillars", "mantis", "mantises", "tokay", "tokays"
  ];
  const typoTerms = [
    "cocroach", "cokroach", "cockraoch", "cockroch", "roch", "roah", "raoch", "ratt", "rta", "annts", "atns", "anst", "mose", "moues",
    "spidr", "sipder", "termte", "termiet", "bed bugg", "mosqito", "mosqutio", "mosqueto",
    "hormet", "fliy", "flys", "waps", "mtoh", "tik", "miet", "wrom", "criket", "betle", "insectt", "silvrfish", "centepede", "milipede", "scorpian", "gekko", "lizzard",
    "grasshoper", "earwigg", "wevil", "maggott", "caterpilar"
  ];
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "model-must-not-be-used-for-pests",
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
    }),
    WHATSAPP_STAFF_ACTIONS_ENABLED: "true",
    WHATSAPP_SERVICE_ACTION_TEMPLATE_NAME: "house_service_alert_actions_v3",
    WHATSAPP_LUGGAGE_ACTION_TEMPLATE_NAME: "house_luggage_alert_actions_v2",
    WHATSAPP_BOOKING_ACTION_TEMPLATE_NAME: "house_booking_alert_actions_v2",
    WHATSAPP_URGENT_ACTION_TEMPLATE_NAME: "house_urgent_alert_actions_v2",
    WHATSAPP_LOST_KEY_ACTION_TEMPLATE_NAME: "house_lost_key_alert_actions_v2"
  });
  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (url, options) => {
    if (String(url).includes("api.openai.com")) throw new Error("Pest reports must not reach the model.");
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.pest-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const cases = [...exactTerms, ...typoTerms];
    for (const [index, term] of cases.entries()) {
      const alertCount = store.alerts.length;
      const outboundCount = outbound.length;
      const response = await handleConciergeRequest(guestRequest(term, {
        sessionId: `session_pest_term_${index}_${crypto.randomUUID()}`
      }), env, undefined, new Date("2026-08-31T03:55:00.000Z"));
      const body = await response.json();
      assert.equal(response.status, 200, term);
      assert.equal(body.source, "service-policy", term);
      assert.equal(body.intentId, "property_issue_pest", term);
      assert.equal(body.workflow?.type, "property_issue", term);
      assert.equal(body.workflow?.issueCategory, "pest", term);
      assert.equal(body.workflow?.status, "monitoring", term);
      assert.equal(body.workflow?.notified, true, term);
      assert.match(body.answer, /Thank you for letting us know.*sent this to The House team.*check it as soon as possible/is, term);
      assert.doesNotMatch(body.answer, /Monday|housekeeping|urgent room issue|cannot confirm|still on|still here/i, term);
      assert.equal(store.alerts.length, alertCount + 1, term);
      const alert = store.alerts.at(-1);
      assert.equal(alert.alertType, "stay_support", term);
      assert.equal(alert.recipientGroup, "support_with_owners", term);
      const deliveries = outbound.slice(outboundCount);
      assert.equal(deliveries.length, 3, term);
      assert.deepEqual(deliveries.map((payload) => payload.to).sort(), ["66640000001", "66810000002", "66820000003"], term);
      for (const payload of deliveries) {
        assert.equal(payload.template.name, "house_service_alert_actions_v3", term);
        assert.equal(payload.template.language.code, "en", term);
        assert.equal(payload.template.components[1].parameters[0].payload, `HOUSE_ALERT|RECEIVED|${alert.id}`, term);
        assert.equal(payload.template.components[2].parameters[0].payload, `HOUSE_ALERT|RESOLVE|${alert.id}`, term);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("expanded pest recognition leaves informational and ambiguous non-pest server wording operationally inert", async () => {
  for (const question of [
    "Are mosquitoes common?",
    "What animals live on Koh Tao?",
    "Can I fly to Bangkok tomorrow?",
    "Is there a flea market on Koh Tao?",
    "My computer mouse is not working",
    "Where can I watch cricket?",
    "There is a bug in the website"
  ]) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const response = await handleConciergeRequest(guestRequest(question), env);
    const body = await response.json();
    assert.notEqual(body.intentId, "property_issue_pest", question);
    assert.notEqual(body.workflow?.type, "property_issue", question);
    assert.equal(store.alerts.length, 0, question);
  }
});

test("the production cockroach sequence stays in the pest workflow on Monday and does not drift into urgent or housekeeping routing", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "model-must-not-be-used-for-pests",
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
  const originalFetch = globalThis.fetch;
  let outbound = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes("api.openai.com")) throw new Error("Cockroach flow must not reach the model.");
    outbound += 1;
    return new Response(JSON.stringify({ messages: [{ id: `wamid.cockroach-${outbound}` }] }), { status: 200 });
  };
  try {
    const monday = new Date("2026-08-31T03:53:00.000Z");
    const first = await handleConciergeRequest(guestRequest("I have a cockroach on the bed"), env, undefined, monday);
    const firstBody = await first.json();
    assert.equal(firstBody.intentId, "property_issue_pest");
    assert.equal(firstBody.workflow.issueCategory, "pest");
    assert.equal(firstBody.workflow.status, "monitoring");
    assert.equal(firstBody.workflow.notified, true);
    assert.match(firstBody.answer, /I’ve sent this to The House team so they can check it as soon as possible/i);
    assert.doesNotMatch(firstBody.answer, /Is the cockroach still|Monday|housekeeping|urgent/i);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].recipientGroup, "support_with_owners");
    assert.equal(outbound, 3);

    const followup = await handleConciergeRequest(guestRequest("Yes it’s still here please send someone", {
      workflowState: firstBody.workflow
    }), env, undefined, new Date(monday.getTime() + 60_000));
    const followupBody = await followup.json();
    assert.equal(followupBody.intentId, "property_issue_pest");
    assert.equal(followupBody.workflow.issueCategory, "pest");
    assert.match(followupBody.answer, /The House team has already been contacted.*check the issue as soon as possible/i);
    assert.doesNotMatch(followupBody.answer, /Monday|housekeeping|urgent room issue|cannot confirm/i);
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("browser protected routing mirrors the pest matcher without turning informational or ambiguous non-pest wording into pest reports", async () => {
  const script = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  const start = script.indexOf("  const ROUTINE_PEST_EXACT");
  const end = script.indexOf("  function requiresProtectedServer(question)");
  assert.ok(start >= 0 && end > start);
  const helperSource = script.slice(start, end).replace(/^  /gm, "");
  const browserPestMatcher = Function(`${helperSource}\nreturn hasRoutinePestReference;`)();
  const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  for (const phrase of [
    "cockroach", "cockroaches", "roach", "ants", "mosquito", "bed bug", "gecko", "silverfish",
    "cocroach", "cockraoch", "mosqito", "sipder", "termte", "centepede", "milipede", "lizzard",
    "I have a cockroach on the bed", "Please help cocroach", "There are fruit flies in the bathroom", "I found a bug in my room"
  ]) {
    assert.equal(browserPestMatcher(normalize(phrase)), true, phrase);
  }
  for (const phrase of [
    "Are mosquitoes common?", "What animals live on Koh Tao?", "Can I fly to Bangkok tomorrow?",
    "Is there a flea market on Koh Tao?", "My computer mouse is not working", "Where can I watch cricket?",
    "There is a bug in the website"
  ]) {
    const normalized = normalize(phrase);
    const informational = /\b(?:what animals live|animals (?:are|is) (?:there|common)|are mosquitoes common|how does (?:the )?(?:ac|air con|air conditioner) work|what is (?:the )?wifi password)\b/.test(normalized);
    assert.equal(!informational && browserPestMatcher(normalized), false, phrase);
  }
});

test("an added detail for the same ongoing property issue continues naturally without a duplicate alert", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
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
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.property-followup-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const first = await handleConciergeRequest(guestRequest("There’s a rat in my roof."), env);
    const firstBody = await first.json();
    assert.equal(firstBody.workflow.status, "monitoring");
    assert.equal(firstBody.workflow.notified, true);
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound.length, 3);

    const followup = await handleConciergeRequest(guestRequest("I can hear scratching directly above the bed.", {
      workflowState: firstBody.workflow
    }), env);
    const followupBody = await followup.json();
    assert.match(followupBody.answer, /already been contacted.*check the issue as soon as possible/i);
    assert.equal(followupBody.workflow.status, "monitoring");
    assert.equal(followupBody.workflow.issueCategory, "pest");
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("property categories keep clean issue buffers across transitions, duplicate reloads and later same-category reports", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
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
  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.property-isolation-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const rat = await handleConciergeRequest(guestRequest("There’s a rat in my roof."), env);
    const ratBody = await rat.json();
    const sewage = await handleConciergeRequest(guestRequest("My bathroom smells like sewage.", {
      workflowState: ratBody.workflow
    }), env);
    const sewageBody = await sewage.json();
    assert.equal(sewageBody.workflow.issueCategory, "odor");
    assert.equal(sewageBody.workflow.notes, "My bathroom smells like sewage.");

    const reloadDuplicate = await handleConciergeRequest(guestRequest("My bathroom smells like sewage."), env);
    const reloadBody = await reloadDuplicate.json();
    assert.match(reloadBody.answer, /already recorded/i);
    assert.equal(reloadBody.workflow.issueCategory, "odor");
    assert.equal(store.alerts.length, 2);

    const ac = await handleConciergeRequest(guestRequest("My AC isn’t cold.", {
      workflowState: structuredClone(reloadBody.workflow)
    }), env);
    const acBody = await ac.json();
    assert.equal(acBody.workflow.issueCategory, "equipment");
    assert.equal(acBody.workflow.notes, "My AC isn’t cold.");
    assert.equal(store.alerts.length, 3);
    assert.match(store.alerts[0].summary, /rat in my roof/i);
    assert.doesNotMatch(store.alerts[0].summary, /sewage|AC isn’t cold/i);
    assert.match(store.alerts[1].summary, /bathroom smells like sewage/i);
    assert.doesNotMatch(store.alerts[1].summary, /rat in my roof|AC isn’t cold/i);
    assert.match(store.alerts[2].summary, /AC isn’t cold/i);
    assert.doesNotMatch(store.alerts[2].summary, /rat in my roof|sewage/i);

    const clicking = await handleConciergeRequest(guestRequest("It also makes a clicking noise.", {
      workflowState: acBody.workflow
    }), env);
    const clickingBody = await clicking.json();
    assert.equal(clickingBody.workflow.issueCategory, "equipment");
    assert.match(clickingBody.workflow.notes, /AC isn’t cold.*clicking noise/i);
    assert.match(clickingBody.answer, /already been contacted/i);
    assert.equal(store.alerts.length, 3);

    const ants = await handleConciergeRequest(guestRequest("There are ants in the bathroom.", {
      workflowState: clickingBody.workflow
    }), env);
    const antsBody = await ants.json();
    assert.equal(antsBody.workflow.issueCategory, "pest");
    assert.equal(antsBody.workflow.notes, "There are ants in the bathroom.");
    assert.equal(store.alerts.length, 4);
    assert.match(store.alerts[3].summary, /ants in the bathroom/i);
    assert.doesNotMatch(store.alerts[3].summary, /AC isn’t cold|clicking noise|sewage|rat in my roof/i);
    assert.equal(outbound.length, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("one concise odor clarification submits the same property workflow and obvious odors do not over-clarify", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ support: [{ label: "Su", phone: "+66 64 000 0001" }] })
  });
  const originalFetch = globalThis.fetch;
  let outbound = 0;
  globalThis.fetch = async () => {
    outbound += 1;
    return new Response(JSON.stringify({ messages: [{ id: `wamid.odor-${outbound}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const vague = await handleConciergeRequest(guestRequest("There’s a strange smell."), env);
    const vagueBody = await vague.json();
    assert.match(vagueBody.answer, /Where does the smell seem to be coming from/i);
    assert.equal(vagueBody.workflow.status, "collecting");
    assert.equal(vagueBody.workflow.issueCategory, "odor_clarification");
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound, 0);

    const clarified = await handleConciergeRequest(guestRequest("It seems to be coming from the bathroom.", {
      workflowState: vagueBody.workflow
    }), env);
    const clarifiedBody = await clarified.json();
    assert.equal(clarifiedBody.workflow.status, "monitoring");
    assert.equal(clarifiedBody.workflow.issueCategory, "odor");
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound, 1);

    const obvious = createEnvironment({ OPENAI_API_KEY: "" });
    const obviousResponse = await handleConciergeRequest(guestRequest("The bathroom smells like sewage."), obvious.env);
    const obviousBody = await obviousResponse.json();
    assert.notEqual(obviousBody.intentId, "property_odor_clarification");
    assert.equal(obvious.store.alerts.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Wi-Fi password stays visible from approved knowledge and bypasses numeric-contact redaction", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "configured-but-should-not-be-used" });
  const originalFetch = globalThis.fetch;
  let modelCalls = 0;
  globalThis.fetch = async (...args) => {
    if (String(args[0]).includes("api.openai.com")) modelCalls += 1;
    throw new Error("The Wi-Fi password path must not call the model.");
  };
  try {
    const response = await handleConciergeRequest(guestRequest("What is the Wi-Fi password?", {
      history: [
        { role: "user", content: "Can you tell me about check-in?" },
        { role: "assistant", content: "Check-in starts at 2 PM and I can help with that." }
      ]
    }), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.intentId, "wifi");
    assert.equal(body.source, "approved");
    assert.match(body.answer, /The Wi-Fi network is .The House./i);
    assert.match(body.answer, /123456789!/);
    assert.doesNotMatch(body.answer, /\[number removed\]|\[contact supplied privately\]/i);
    assert.equal(modelCalls, 0);
    assert.equal(store.alerts.length, 0);

    const pendingCleaning = {
      type: "cleaning",
      status: "collecting",
      missing: ["preferredTime"],
      cleaningRequest: { preferredTime: "", requestedDate: "", notes: "stained sheet" }
    };
    const detourResponse = await handleConciergeRequest(guestRequest("Where is the Wi-Fi password?", {
      workflowState: pendingCleaning,
      history: [{ role: "assistant", content: "What time would be most convenient for cleaning?" }]
    }), env);
    const detourBody = await detourResponse.json();
    assert.equal(detourBody.intentId, "wifi");
    assert.match(detourBody.answer, /123456789!/);
    assert.equal(detourBody.workflow?.type, "cleaning");
    assert.equal(detourBody.workflow?.status, "collecting");
    assert.deepEqual(detourBody.workflow?.missing, ["preferredTime"]);
    assert.equal(modelCalls, 0);
    assert.equal(store.alerts.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("property informational controls remain informational and dirty rooms keep the structured cleaning collector", async () => {
  for (const question of [
    "What animals live on Koh Tao?",
    "Are mosquitoes common?",
    "How does the AC work?",
    "What is the Wi-Fi password?"
  ]) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const response = await handleConciergeRequest(guestRequest(question), env);
    const body = await response.json();
    assert.notEqual(body.workflow?.type, "property_issue", question);
    assert.equal(store.alerts.length, 0, question);
  }

  const cleaning = createEnvironment({ OPENAI_API_KEY: "" });
  const cleaningResponse = await handleConciergeRequest(
    guestRequest("My room is dirty."),
    cleaning.env,
    undefined,
    new Date("2026-08-28T04:00:00.000Z")
  );
  const cleaningBody = await cleaningResponse.json();
  assert.equal(cleaningBody.workflow.type, "cleaning");
  assert.equal(cleaningBody.workflow.status, "collecting");
  assert.deepEqual(cleaningBody.workflow.missing, ["preferredTime"]);
  assert.match(cleaningBody.answer, /What time would be most convenient/i);
  assert.equal(cleaning.store.alerts.length, 0);
});

test("dangerous property phrases enter the urgent confirmation workflow without sending automatically", async () => {
  for (const question of [
    "I smell burning from the socket.",
    "There is smoke coming from the AC.",
    "Water is pouring through the ceiling.",
    "There is a snake inside my room.",
    "The ceiling is falling down."
  ]) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const response = await handleConciergeRequest(guestRequest(question), env);
    const body = await response.json();
    assert.equal(body.intentId, "property_emergency", question);
    assert.equal(body.handoff, "property_emergency", question);
    assert.ok(body.actions.some((action) => action.action === "confirm_urgent_property"), question);
    assert.equal(store.alerts.length, 0, question);
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
  assert.deepEqual(bookingBody.workflow.missing, ["date"]);
  assert.match(bookingBody.answer, /Roctopus Dive/i);
  assert.match(bookingBody.answer, /RAID.*dive safety and buoyancy control/i);
  assert.match(bookingBody.answer, /preferred start or diving date/i);
  assert.doesNotMatch(bookingBody.answer, /how many people|international country code|payment has been received/i);
  assert.equal(bookingBody.actions.some((action) => action.route === "bookingWhatsapp"), false);
  assert.equal(store.alerts.length, 0);
});

test("diving collection enforces conditional course details and international contact", async () => {
  const cases = [
    {
      question: "I want to book Fun Diving tomorrow for 2 divers, same for everyone. My WhatsApp is +66 81 234 5678.",
      missing: "certification"
    },
    {
      question: "I want to book a diving course tomorrow for 2 divers, same for everyone. My WhatsApp is +66 81 234 5678.",
      missing: "agency"
    },
    {
      question: "I want to book Fun Diving tomorrow for 2 divers, same for everyone. I am Advanced Open Water certified. My phone is 081 234 5678.",
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
      `I want to book Fun Diving tomorrow for 2 divers, same for everyone. I am Advanced Open Water certified. My WhatsApp is ${rawContact}. Please arrange a calm morning trip.`
    ), env);
    const body = await response.json();
    assert.equal(body.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].alertType, "booking_request");
    assert.equal(store.alerts[0].recipientGroup, "booking_with_owners");
    assert.equal(outbound.length, 3);
    assert.deepEqual(outbound.map((item) => item.to).sort(), ["66810000002", "66820000003", "66960000001"]);
    assert.equal(outbound.every((item) => item.template.name === "house_booking_alert_v2"), true);
    const parameters = outbound[0].template.components[0].parameters;
    assert.equal(parameters[2].text, "Diving");
    assert.equal(parameters[4].text, "2");
    assert.match(parameters[5].text, /Fun Diving/);
    assert.match(parameters[5].text, /2 × Fun Diving — Advanced Open Water certified/);
    assert.match(parameters[5].text, /Guest reply: \+66812345678/);
    assert.match(body.answer, /check availability/i);
    assert.match(body.answer, /not confirmed.*payment has been received/i);
    assert.doesNotMatch(JSON.stringify(store.interactions), /66812345678|81 234 5678/);
    assert.doesNotMatch(JSON.stringify(store.alerts), /66812345678|81 234 5678/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("agency-specific beginner and continuing courses pass the structured diving gate", async () => {
  const cases = [
    ["PADI Open Water Diver", "I want to book PADI Open Water Diver tomorrow for 2 divers, same for everyone. My WhatsApp is +66 81 234 5678."],
    ["SSI Advanced Open Water Diver", "I want to book SSI Advanced Open Water Diver tomorrow for 2 divers, same for everyone. Current certification is Open Water. My WhatsApp is +66 81 234 5678."],
    ["PADI Rescue Diver", "I want to book PADI Rescue Diver tomorrow for 2 divers, same for everyone. Current certification is Advanced Open Water. My WhatsApp is +66 81 234 5678."]
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: `wamid.course-${crypto.randomUUID()}` }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    for (const [expectedCourse, question] of cases) {
      const { env, store } = createEnvironment({
        OPENAI_API_KEY: "",
        WHATSAPP_ACCESS_TOKEN: "meta-test-token",
        WHATSAPP_PHONE_NUMBER_ID: "1234567890",
        WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ booking: [{ label: "Fah", phone: "+66 96 000 0001" }] })
      });
      const response = await handleConciergeRequest(guestRequest(question), env);
      const body = await response.json();
      assert.equal(body.workflow.status, "submitted", expectedCourse);
      assert.equal(store.alerts.length, 1, expectedCourse);
      assert.match(body.answer, /not confirmed.*payment has been received/i, expectedCourse);
      assert.equal(body.workflow.missing.length, 0, expectedCourse);
      assert.match(`${body.workflow.bookingRequest.groups[0].agency} ${body.workflow.bookingRequest.groups[0].course}`, new RegExp(expectedCourse, "i"));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the bundled v5.11.37 catalog preserves current PADI, SSI and RAID pathways", () => {
  assert.equal(divingCourses.updatedForRelease, "5.11.37");
  assert.deepEqual(divingCourses.houseRecommendation, {
    agency: "RAID",
    reason: "focus on dive safety and buoyancy control",
    preferredProvider: "Roctopus Dive"
  });
  assert.deepEqual(divingCourses.activities.map((item) => item.displayLabel), [
    "Fun Diving", "Try Diving", "Learn / Take a Course", "Professional Training", "Not Sure"
  ]);

  const labels = (agency) => divingCourses.agencies.find((item) => item.code === agency).courses.map((course) => course.displayLabel);
  assert.deepEqual(labels("PADI"), [
    "Scuba Diver", "Open Water Diver", "Advanced Open Water Diver", "Rescue Diver", "Specialty Course",
    "Divemaster", "Assistant Instructor", "Instructor Development Course (IDC)"
  ]);
  assert.deepEqual(labels("SSI"), [
    "Scuba Diver", "Open Water Diver", "Advanced Open Water Diver", "Diver Stress & Rescue", "Specialty Course",
    "Dive Guide", "Divemaster", "Assistant Instructor", "Instructor Training Course (ITC)", "Instructor Evaluation (IE)"
  ]);
  assert.deepEqual(labels("RAID"), [
    "Scuba Diver", "Open Water / Open Water 20", "Explorer 30", "Advanced 35", "Master Rescue", "Specialty Course",
    "Divemaster", "Instructor Development Program (IDP)"
  ]);
  assert.doesNotMatch(JSON.stringify(divingCourses), /Advanced Adventurer|RAID Assistant Instructor/i);
  assert.equal(matchDivingCourse("PADI advanced", "PADI")?.displayLabel, "Advanced Open Water Diver");
  assert.equal(matchDivingCourse("SSI rescue", "SSI")?.displayLabel, "Diver Stress & Rescue");
  assert.equal(matchDivingCourse("RAID advanced", "RAID"), null);
  assert.deepEqual(courseChoiceLabels("RAID", { professional: true }), ["Divemaster", "Instructor Development Program (IDP)"]);

  for (const agency of ["PADI", "SSI", "RAID", ""]) {
    const guidance = roctopusGuidance(agency);
    assert.match(guidance, /recommend RAID.*dive safety and buoyancy control/i, agency || "no preference");
    assert.match(guidance, /Roctopus Dive/i, agency || "no preference");
  }
  assert.match(roctopusGuidance("PADI"), /Roctopus Dive offers RAID training.*PADI.*appropriate provider/i);
  assert.match(roctopusGuidance("SSI"), /Roctopus Dive offers RAID training.*SSI.*appropriate provider/i);
  assert.equal(validDivingGroup({ count: "1", activityType: "Learn / Take a Course", agency: "PADI", course: "Open Water Diver" }), true);
  assert.equal(validDivingGroup({ count: "1", activityType: "Learn / Take a Course", agency: "PADI", course: "Advanced Open Water Diver" }), false);
  assert.equal(validDivingGroup({ count: "1", activityType: "Fun Diving" }), false);
});

test("single-diver Fun, beginner, continuing and professional paths collect only relevant fields", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const cases = [
    {
      name: "Fun Diving",
      question: "I want to book Fun Diving tomorrow for 1 diver. I am Advanced certified.",
      activityType: "Fun Diving",
      certification: "Advanced Open Water"
    },
    {
      name: "PADI Open Water",
      question: "I want to book PADI Open Water Diver tomorrow for 1 diver.",
      activityType: "Learn / Take a Course",
      agency: "PADI",
      course: "Open Water Diver",
      certification: ""
    },
    {
      name: "SSI Advanced Open Water",
      question: "I want to book SSI Advanced Open Water Diver tomorrow for 1 diver. Current certification is Open Water.",
      activityType: "Learn / Take a Course",
      agency: "SSI",
      course: "Advanced Open Water Diver",
      certification: "Open Water"
    },
    {
      name: "RAID Explorer 30",
      question: "I want to book RAID Explorer 30 tomorrow for 1 diver. Current certification is Open Water.",
      activityType: "Learn / Take a Course",
      agency: "RAID",
      course: "Explorer 30",
      certification: "Open Water"
    },
    {
      name: "PADI Divemaster",
      question: "I want to book PADI Divemaster tomorrow for 1 diver. Current certification is Rescue Diver.",
      activityType: "Professional Training",
      agency: "PADI",
      course: "Divemaster",
      certification: "Rescue Diver"
    },
    {
      name: "SSI ITC",
      question: "I want to book SSI Instructor Training Course tomorrow for 1 diver. Current certification is Divemaster.",
      activityType: "Professional Training",
      agency: "SSI",
      course: "Instructor Training Course (ITC)",
      certification: "Divemaster"
    },
    {
      name: "RAID IDP",
      question: "I want to book RAID Instructor Development Program tomorrow for 1 diver. Current certification is Divemaster.",
      activityType: "Professional Training",
      agency: "RAID",
      course: "Instructor Development Program (IDP)",
      certification: "Divemaster"
    }
  ];
  const originalFetch = globalThis.fetch;
  try {
    for (const item of cases) {
      const { env, store } = createEnvironment({
        OPENAI_API_KEY: "",
        WHATSAPP_ACCESS_TOKEN: "meta-test-token",
        WHATSAPP_PHONE_NUMBER_ID: "1234567890",
        WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ booking: [{ label: "Fah", phone: "+66 96 000 0001" }] })
      });
      let sends = 0;
      globalThis.fetch = async () => {
        sends += 1;
        return new Response(JSON.stringify({ messages: [{ id: `wamid.single-path-${sends}` }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      };
      const response = await handleConciergeRequest(guestRequest(item.question, {
        sessionId: `session_single_${item.name.replace(/\W/g, "_")}_12345`
      }), env, undefined, now);
      const body = await response.json();
      assert.deepEqual(body.workflow.missing, ["contact"], item.name);
      const group = body.workflow.bookingRequest.groups[0];
      assert.equal(group.count, "1", item.name);
      assert.equal(group.activityType, item.activityType, item.name);
      assert.equal(group.agency, item.agency || "", item.name);
      assert.equal(group.course, item.course || "", item.name);
      assert.equal(group.currentCertification, item.certification, item.name);
      assert.equal(validDivingGroup(group), true, item.name);

      const completed = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
        sessionId: `session_single_${item.name.replace(/\W/g, "_")}_12345`,
        workflowState: body.workflow
      }), env, undefined, now);
      const completedBody = await completed.json();
      assert.equal(completedBody.workflow.status, "submitted", item.name);
      assert.equal(store.alerts.length, 1, item.name);
      assert.equal(sends, 1, item.name);
    }

    const { env: unsureEnv } = createEnvironment({ OPENAI_API_KEY: "" });
    let unsure = await (await handleConciergeRequest(guestRequest(
      "I want to book diving tomorrow for 1 diver, but I am not sure what I need.",
      { sessionId: "session_unsure_diver_12345" }
    ), unsureEnv, undefined, now)).json();
    assert.equal(unsure.workflow.missing[0], "unsureCertified");
    unsure = await (await handleConciergeRequest(guestRequest("No", {
      sessionId: "session_unsure_diver_12345",
      workflowState: unsure.workflow
    }), unsureEnv, undefined, now)).json();
    assert.ok(unsure.workflow, JSON.stringify(unsure));
    assert.equal(unsure.workflow.missing[0], "goal");
    assert.match(unsure.answer, /Try Diving.*Open Water/i);
    assert.match(unsure.answer, /RAID.*dive safety and buoyancy control/i);
    assert.match(unsure.answer, /Roctopus Dive/i);

    let certifiedUnsure = await (await handleConciergeRequest(guestRequest(
      "I want to book diving tomorrow for 1 diver, but I am not sure what I need.",
      { sessionId: "session_certified_unsure_12345" }
    ), unsureEnv, undefined, now)).json();
    certifiedUnsure = await (await handleConciergeRequest(guestRequest("Yes", {
      sessionId: "session_certified_unsure_12345",
      workflowState: certifiedUnsure.workflow
    }), unsureEnv, undefined, now)).json();
    certifiedUnsure = await (await handleConciergeRequest(guestRequest("Open Water", {
      sessionId: "session_certified_unsure_12345",
      workflowState: certifiedUnsure.workflow
    }), unsureEnv, undefined, now)).json();
    assert.equal(certifiedUnsure.workflow.missing[0], "goal");
    certifiedUnsure = await (await handleConciergeRequest(guestRequest("Dive deeper", {
      sessionId: "session_certified_unsure_12345",
      workflowState: certifiedUnsure.workflow
    }), unsureEnv, undefined, now)).json();
    assert.deepEqual(certifiedUnsure.workflow.missing, ["contact"]);
    assert.match(certifiedUnsure.answer, /continuing education or a suitable specialty course/i);
    assert.match(certifiedUnsure.answer, /dive operator will verify/i);
    assert.match(certifiedUnsure.answer, /RAID.*dive safety and buoyancy control/i);
    assert.match(certifiedUnsure.answer, /Roctopus Dive/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("mixed diving groups allocate every diver once and produce one contact-last owner alert", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
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
    return new Response(JSON.stringify({ messages: [{ id: `wamid.mixed-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    let body = await (await handleConciergeRequest(guestRequest("I wanna go diving."), env, undefined, now)).json();
    const turn = async (question) => {
      body = await (await handleConciergeRequest(guestRequest(question, { workflowState: body.workflow }), env, undefined, now)).json();
      return body;
    };
    await turn("tomorrow");
    await turn("3");
    await turn("Different plans");
    await turn("Fun Diving");
    await turn("1");
    await turn("Advanced");
    assert.equal(body.workflow.missing[0], "groupActivity");
    await turn("PADI Open Water Diver");
    await turn("1");
    assert.equal(body.workflow.missing[0], "groupActivity");
    await turn("SSI Advanced Open Water Diver");
    await turn("1");
    assert.equal(body.workflow.missing[0], "certification");
    await turn("Open Water");
    assert.deepEqual(body.workflow.missing, ["contact"]);
    assert.deepEqual(body.workflow.bookingRequest.groups.map((group) => ({
      count: group.count,
      activityType: group.activityType,
      agency: group.agency,
      course: group.course,
      currentCertification: group.currentCertification
    })), [
      { count: "1", activityType: "Fun Diving", agency: "", course: "", currentCertification: "Advanced Open Water" },
      { count: "1", activityType: "Learn / Take a Course", agency: "PADI", course: "Open Water Diver", currentCertification: "" },
      { count: "1", activityType: "Learn / Take a Course", agency: "SSI", course: "Advanced Open Water Diver", currentCertification: "Open Water" }
    ]);
    assert.equal(body.workflow.bookingRequest.groups.reduce((sum, group) => sum + Number(group.count), 0), 3);

    await turn("+66 81 234 5678");
    assert.equal(body.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].recipientGroup, "booking_with_owners");
    assert.match(store.alerts[0].detailSummary, /1 × Fun Diving[\s\S]*1 × PADI Open Water Diver[\s\S]*1 × SSI Advanced Open Water Diver/);
    assert.equal(outbound.length, 3);
    assert.deepEqual(outbound.map((item) => item.to).sort(), ["66810000002", "66820000003", "66960000001"]);
    for (const payload of outbound) {
      const parameters = payload.template.components[0].parameters;
      assert.equal(payload.template.name, "house_booking_alert_v2");
      assert.equal(parameters.length, 6);
      assert.match(parameters[5].text, /1 × Fun Diving.*1 × PADI Open Water Diver.*1 × SSI Advanced Open Water Diver/);
      assert.equal(/[\r\n\t]/.test(parameters[5].text), false);
      assert.equal(parameters.slice(0, 5).some((parameter) => /66812345678|81 234 5678/.test(parameter.text)), false);
      assert.match(parameters[5].text, /Guest reply: \+66812345678/);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("split-group allocation rejects zero and over-allocation before completing a four-diver request", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ booking: [{ label: "Fah", phone: "+66 96 000 0001" }] })
  });
  const originalFetch = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => {
    sends += 1;
    return new Response(JSON.stringify({ messages: [{ id: `wamid.four-group-${sends}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    let body = await (await handleConciergeRequest(guestRequest(
      "I want to book diving tomorrow for 4 divers with different plans."
    ), env, undefined, now)).json();
    const turn = async (question) => {
      body = await (await handleConciergeRequest(guestRequest(question, { workflowState: body.workflow }), env, undefined, now)).json();
      return body;
    };
    assert.equal(body.workflow.missing[0], "groupActivity");
    assert.match(body.answer, /Roctopus Dive/i);
    assert.match(body.answer, /recommend RAID.*dive safety and buoyancy control/i);
    await turn("Fun Diving");
    await turn("0");
    assert.equal(body.workflow.missing[0], "groupCount");
    assert.equal(body.workflow.bookingRequest.groups[0].count, "");
    assert.match(body.answer, /between 1 and 4 people/i);
    await turn("5");
    assert.equal(body.workflow.missing[0], "groupCount");
    assert.equal(body.workflow.bookingRequest.groups[0].count, "");
    await turn("2");
    await turn("Advanced");
    await turn("RAID Explorer 30");
    await turn("3");
    assert.equal(body.workflow.missing[0], "groupCount");
    assert.match(body.answer, /between 1 and 2 people/i);
    await turn("2");
    await turn("Open Water");
    assert.deepEqual(body.workflow.missing, ["contact"]);
    assert.deepEqual(body.workflow.bookingRequest.groups.map((group) => [group.count, group.activityType, group.agency, group.course]), [
      ["2", "Fun Diving", "", ""],
      ["2", "Learn / Take a Course", "RAID", "Explorer 30"]
    ]);
    assert.equal(body.workflow.bookingRequest.groups.reduce((sum, group) => sum + Number(group.count), 0), 4);
    assert.doesNotMatch(body.answer, /-\d+ (?:person|people)/);
    await turn("+66 81 234 5678");
    assert.equal(body.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);
    assert.equal(sends, 1);
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
      "I want to book Fun Diving tomorrow for 2 divers, same for everyone. I am Advanced Open Water certified. My WhatsApp is +66 81 234 5678."
    ), env);
    const firstBody = await first.json();
    assert.equal(firstBody.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);

    const second = await handleConciergeRequest(guestRequest("I want to book diving.", {
      history: [
        { role: "user", content: "I want to book Fun Diving tomorrow for 2 divers, same for everyone. I am Advanced Open Water certified. My WhatsApp is [contact supplied privately]." },
        { role: "assistant", content: firstBody.answer }
      ]
    }), env);
    const secondBody = await second.json();
    assert.equal(secondBody.workflow.status, "collecting");
    assert.deepEqual(secondBody.workflow.missing, ["date"]);
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
    ["missing structured request", { ...complete, bookingRequest: undefined }],
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

test("supported activity and transport information stays separate from booking intent", async () => {
  const cases = [
    ["What fishing trips are available?", "fishing", "I want to book a fishing trip."],
    ["What taxi services are available?", "taxi", "Can you arrange a taxi?"],
    ["What taxi boat or longtail options are available?", "taxi_boat", "I want to book a taxi boat."],
    ["What ferry routes are available?", "ferry", "I want to book ferry tickets."],
    ["What motorbike taxi options are available?", "motorbike_taxi", "I want to book a motorbike taxi."]
  ];
  for (const [question, kind, prompt] of cases) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const information = await handleConciergeRequest(guestRequest(question), env);
    const informationBody = await information.json();
    assert.equal(informationBody.source, "booking-policy", kind);
    assert.equal(informationBody.needsHuman, false, kind);
    assert.equal(informationBody.handoff, "none", kind);
    assert.equal(informationBody.actions[0].type, "prompt", kind);
    assert.equal(informationBody.actions[0].prompt, prompt, kind);
    assert.doesNotMatch(informationBody.answer, /WhatsApp or phone number/i, kind);
    assert.equal(store.alerts.length, 0, kind);

    const booking = await handleConciergeRequest(guestRequest(informationBody.actions[0].prompt), env);
    const bookingBody = await booking.json();
    assert.equal(bookingBody.workflow.kind, kind, kind);
    assert.equal(bookingBody.workflow.status, "collecting", kind);
    assert.equal(bookingBody.workflow.missing.includes("contact"), true, kind);
    assert.equal(store.alerts.length, 0, kind);
    if (kind === "ferry") {
      assert.doesNotMatch(informationBody.answer, /passport/i);
      assert.doesNotMatch(bookingBody.answer, /passport/i);
      assert.equal(bookingBody.workflow.missing.includes("passport"), false);
    }
  }

  const naturalFishing = createEnvironment({ OPENAI_API_KEY: "" });
  const naturalFishingResponse = await handleConciergeRequest(
    guestRequest("I want to go fishing"),
    naturalFishing.env,
    undefined,
    new Date("2026-08-28T03:00:00.000Z")
  );
  const naturalFishingBody = await naturalFishingResponse.json();
  assert.equal(naturalFishingBody.source, "booking-policy");
  assert.equal(naturalFishingBody.workflow.type, "booking");
  assert.equal(naturalFishingBody.workflow.kind, "fishing");
  assert.equal(naturalFishingBody.workflow.status, "collecting");
  assert.deepEqual(naturalFishingBody.workflow.missing.sort(), ["contact", "date", "guests", "option"]);
  assert.match(naturalFishingBody.answer, /what date would you like to go fishing/i);
  assert.doesNotMatch(naturalFishingBody.answer, /how many|country code|payment/i);
  assert.equal(naturalFishing.store.alerts.length, 0);

  const direct = createEnvironment({ OPENAI_API_KEY: "" });
  const directResponse = await handleConciergeRequest(
    guestRequest("Taxi tomorrow at 9 AM from The House to Mae Haad Pier for two people"),
    direct.env,
    undefined,
    new Date("2026-08-28T03:00:00.000Z")
  );
  const directBody = await directResponse.json();
  assert.equal(directBody.workflow.kind, "taxi");
  assert.deepEqual(directBody.workflow.missing, ["contact"]);
  assert.equal(directBody.workflow.bookingRequest.preferredDate, "29 Aug 2026");
  assert.equal(directBody.workflow.bookingRequest.pickupTime, "9:00 AM");
  assert.equal(directBody.workflow.bookingRequest.pickupLocation, "The House");
  assert.equal(directBody.workflow.bookingRequest.destination, "Mae Haad Pier");
  assert.equal(directBody.workflow.bookingRequest.guestCount, "2");
  assert.equal(direct.store.alerts.length, 0);
});

test("natural fishing and snorkeling requests enter the protected structured workflow immediately", async () => {
  const now = new Date("2026-08-28T08:33:00.000Z");
  const fishingVariants = [
    "I wanna go fishing",
    "I want to go fishing",
    "I would like to go fishing",
    "Can you arrange fishing?",
    "I want a fishing trip",
    "I’d like to book fishing",
    "Take me fishing"
  ];
  for (const question of fishingVariants) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const response = await handleConciergeRequest(guestRequest(question), env, undefined, now);
    const body = await response.json();
    assert.equal(body.source, "booking-policy", question);
    assert.equal(body.workflow.type, "booking", question);
    assert.equal(body.workflow.kind, "fishing", question);
    assert.equal(body.workflow.status, "collecting", question);
    assert.deepEqual(body.workflow.missing.sort(), ["contact", "date", "guests", "option"], question);
    assert.doesNotMatch(body.answer, /^The House can help arrange fishing trips/i, question);
    assert.equal(body.actions.some((action) => action.label === "Book with Us"), false, question);
    assert.equal(store.alerts.length, 0, question);
  }

  const dated = createEnvironment({ OPENAI_API_KEY: "" });
  const datedResponse = await handleConciergeRequest(guestRequest("I wanna go fishing tomorrow"), dated.env, undefined, now);
  const datedBody = await datedResponse.json();
  assert.equal(datedBody.workflow.kind, "fishing");
  assert.equal(datedBody.workflow.bookingRequest.preferredDate, "29 Aug 2026");
  assert.deepEqual(datedBody.workflow.missing.sort(), ["contact", "guests", "option"]);
  assert.equal(dated.store.alerts.length, 0);

  for (const question of ["I wanna go snorkeling", "I would like to go snorkelling", "Take us snorkeling"]) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const response = await handleConciergeRequest(guestRequest(question), env, undefined, now);
    const body = await response.json();
    assert.equal(body.source, "booking-policy", question);
    assert.equal(body.workflow.kind, "snorkeling", question);
    assert.equal(body.workflow.status, "collecting", question);
    assert.equal(body.actions.some((action) => action.label === "Book with Us"), false, question);
    assert.equal(store.alerts.length, 0, question);
  }

  const production = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  let modelCalls = 0;
  globalThis.fetch = async () => {
    modelCalls += 1;
    return new Response(JSON.stringify({
      output: [{
        type: "message",
        content: [{
          type: "output_text",
          text: JSON.stringify({
            answer: "The House can tell you about fishing trips.",
            intent_id: "fishing_information",
            category: "booking",
            confidence: 0.9,
            needs_human: false,
            handoff: "none",
            learning_gap: false,
            learning_reason: "none"
          })
        }]
      }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await handleConciergeRequest(guestRequest("I wanna go fishing"), production.env, undefined, now);
    const body = await response.json();
    assert.equal(modelCalls, 0);
    assert.equal(body.source, "booking-policy");
    assert.equal(body.workflow.kind, "fishing");
    assert.equal(body.workflow.status, "collecting");
    assert.match(body.answer, /what date would you like to go fishing/i);
    assert.doesNotMatch(body.answer, /^The House can tell you about fishing trips/i);
    assert.equal(production.store.alerts.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const information = createEnvironment({ OPENAI_API_KEY: "" });
  const informationResponse = await handleConciergeRequest(guestRequest("What fishing trips do you offer?"), information.env, undefined, now);
  const informationBody = await informationResponse.json();
  assert.equal(informationBody.intentId, "fishing_information");
  assert.equal(informationBody.workflow, null);
  assert.equal(informationBody.actions[0].label, "Book with Us");
  assert.equal(information.store.alerts.length, 0);
  const buttonResponse = await handleConciergeRequest(guestRequest(informationBody.actions[0].prompt), information.env, undefined, now);
  const buttonBody = await buttonResponse.json();
  assert.equal(buttonBody.workflow.kind, "fishing");
  assert.equal(buttonBody.workflow.status, "collecting");
  assert.deepEqual(buttonBody.workflow.missing.sort(), ["contact", "date", "guests", "option"]);
});

test("every supported booking category enters one-question progressive collection from natural intent", async () => {
  const cases = [
    ["I wanna go diving.", "diving", "date", /preferred start or diving date/i],
    ["I want to go fishing.", "fishing", "date", /What date would you like to go fishing/i],
    ["I’d like to go snorkeling tomorrow.", "snorkeling", "guests", /How many people will be joining/i],
    ["Can you arrange a taxi?", "taxi", "date", /What date do you need the taxi/i],
    ["I need a longtail boat.", "taxi_boat", "date", /What date do you need the taxi boat or longtail boat/i],
    ["I want to book the ferry.", "ferry", "date", /What date would you like to travel/i],
    ["I need a motorbike taxi tomorrow.", "motorbike_taxi", "time", /What pickup time would you prefer/i]
  ];
  for (const [question, kind, firstMissing, prompt] of cases) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const response = await handleConciergeRequest(
      guestRequest(question, { sessionId: `session_progressive_${kind}_12345` }),
      env,
      undefined,
      new Date("2026-08-28T03:00:00.000Z")
    );
    const body = await response.json();
    assert.equal(body.source, "booking-policy", question);
    assert.equal(body.workflow.type, "booking", question);
    assert.equal(body.workflow.kind, kind, question);
    assert.equal(body.workflow.status, "collecting", question);
    assert.equal(body.workflow.missing[0], firstMissing, question);
    assert.match(body.answer, prompt, question);
    assert.doesNotMatch(body.answer, /Please provide|number of guests.*option.*contact|date.*how many.*country code|payment has been received/i, question);
    assert.equal(store.alerts.length, 0, question);
  }
});

test("fishing buttons and typed choices update the same preserved progressive state and contact is collected last", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const startQuestion = "I want to go fishing tomorrow with 3 people.";

  const buttonEnvironment = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
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
    return new Response(JSON.stringify({ messages: [{ id: `wamid.progressive-fishing-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const start = await handleConciergeRequest(guestRequest(startQuestion), buttonEnvironment.env, undefined, now);
    const startBody = await start.json();
    assert.deepEqual(startBody.workflow.missing, ["option", "contact"]);
    assert.equal(startBody.workflow.bookingRequest.preferredDate, "29 Aug 2026");
    assert.equal(startBody.workflow.bookingRequest.guestCount, "3");
    assert.deepEqual(startBody.actions.map((action) => action.label), ["Sport fishing", "Food fishing", "Relaxed / family", "Not sure"]);
    assert.equal(buttonEnvironment.store.alerts.length, 0);

    const selected = await handleConciergeRequest(guestRequest(startBody.actions[0].prompt, {
      workflowState: startBody.workflow
    }), buttonEnvironment.env, undefined, now);
    const selectedBody = await selected.json();
    assert.deepEqual(selectedBody.workflow.missing, ["contact"]);
    assert.equal(selectedBody.workflow.bookingRequest.preferredDate, "29 Aug 2026");
    assert.equal(selectedBody.workflow.bookingRequest.guestCount, "3");
    assert.equal(selectedBody.workflow.bookingRequest.option, "Sport fishing");
    assert.match(selectedBody.answer, /country code/i);
    assert.deepEqual(selectedBody.actions, []);
    assert.equal(buttonEnvironment.store.alerts.length, 0);

    const completed = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      workflowState: selectedBody.workflow
    }), buttonEnvironment.env, undefined, now);
    const completedBody = await completed.json();
    assert.equal(completedBody.workflow.status, "submitted");
    assert.equal(buttonEnvironment.store.alerts.length, 1);
    assert.equal(buttonEnvironment.store.alerts[0].recipientGroup, "booking_with_owners");
    assert.equal(outbound.length, 3);
    assert.match(completedBody.answer, /check availability and the current price/i);
    assert.match(completedBody.answer, /not confirmed.*payment has been received/i);

    const typedEnvironment = createEnvironment({ OPENAI_API_KEY: "" });
    const typedStart = await handleConciergeRequest(guestRequest(startQuestion), typedEnvironment.env, undefined, now);
    const typedStartBody = await typedStart.json();
    const typed = await handleConciergeRequest(guestRequest("Food fishing", {
      workflowState: typedStartBody.workflow
    }), typedEnvironment.env, undefined, now);
    const typedBody = await typed.json();
    assert.deepEqual(typedBody.workflow.missing, ["contact"]);
    assert.equal(typedBody.workflow.bookingRequest.preferredDate, selectedBody.workflow.bookingRequest.preferredDate);
    assert.equal(typedBody.workflow.bookingRequest.guestCount, selectedBody.workflow.bookingRequest.guestCount);
    assert.equal(typedBody.workflow.bookingRequest.option, "Food fishing");
    assert.equal(typedEnvironment.store.alerts.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("diving asks only relevant conditional fields and preserves each answer through submission", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ booking: [{ label: "Fah", phone: "+66 96 000 0001" }] })
  });
  const now = new Date("2026-08-28T03:00:00.000Z");
  const originalFetch = globalThis.fetch;
  let outbound = 0;
  globalThis.fetch = async () => {
    outbound += 1;
    return new Response(JSON.stringify({ messages: [{ id: `wamid.progressive-diving-${outbound}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const first = await handleConciergeRequest(guestRequest("I wanna go diving."), env, undefined, now);
    const firstBody = await first.json();
    assert.equal(firstBody.workflow.missing[0], "date");
    assert.match(firstBody.answer, /recommend Roctopus Dive.*RAID.*preferred start or diving date/is);

    const date = await handleConciergeRequest(guestRequest("Tomorrow", { workflowState: firstBody.workflow }), env, undefined, now);
    const dateBody = await date.json();
    assert.equal(dateBody.workflow.missing[0], "guests");
    assert.equal(dateBody.workflow.bookingRequest.preferredDate, "29 Aug 2026");

    const guests = await handleConciergeRequest(guestRequest("2", { workflowState: dateBody.workflow }), env, undefined, now);
    const guestsBody = await guests.json();
    assert.equal(guestsBody.workflow.missing[0], "planMode");
    assert.equal(guestsBody.workflow.bookingRequest.guestCount, "2");
    assert.deepEqual(guestsBody.actions.map((action) => action.label), ["Same for everyone", "Different plans"]);

    const same = await handleConciergeRequest(guestRequest("Same for everyone", {
      workflowState: guestsBody.workflow
    }), env, undefined, now);
    const sameBody = await same.json();
    assert.equal(sameBody.workflow.missing[0], "groupActivity");
    assert.deepEqual(sameBody.actions.map((action) => action.label), [
      "Fun Diving", "Try Diving", "Learn / Take a Course", "Professional Training", "Not Sure"
    ]);
    const learn = await handleConciergeRequest(guestRequest("Learn / Take a Course", { workflowState: sameBody.workflow }), env, undefined, now);
    const learnBody = await learn.json();
    assert.equal(learnBody.workflow.missing[0], "agency");
    assert.match(learnBody.answer, /recommend RAID.*dive safety and buoyancy control/i);
    const agency = await handleConciergeRequest(guestRequest("PADI", { workflowState: learnBody.workflow }), env, undefined, now);
    const agencyBody = await agency.json();
    assert.equal(agencyBody.workflow.missing[0], "course");
    const course = await handleConciergeRequest(guestRequest("Open Water Diver", { workflowState: agencyBody.workflow }), env, undefined, now);
    const courseBody = await course.json();
    assert.deepEqual(courseBody.workflow.missing, ["contact"]);
    assert.equal(courseBody.workflow.bookingRequest.groups[0].agency, "PADI");
    assert.equal(courseBody.workflow.bookingRequest.groups[0].course, "Open Water Diver");
    assert.equal(courseBody.workflow.bookingRequest.groups[0].currentCertification, "");
    assert.match(courseBody.answer, /country code/i);

    const submitted = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      workflowState: courseBody.workflow
    }), env, undefined, now);
    const submittedBody = await submitted.json();
    assert.equal(submittedBody.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound, 1);

    const funEnvironment = createEnvironment({ OPENAI_API_KEY: "" });
    const fun = await handleConciergeRequest(guestRequest("I want to book Fun Diving tomorrow for 2 divers, same for everyone."), funEnvironment.env, undefined, now);
    const funBody = await fun.json();
    assert.deepEqual(funBody.workflow.missing, ["certification", "contact"]);
    assert.match(funBody.answer, /current diving certification/i);
    const certified = await handleConciergeRequest(guestRequest("Advanced Open Water", {
      workflowState: funBody.workflow
    }), funEnvironment.env, undefined, now);
    const certifiedBody = await certified.json();
    assert.deepEqual(certifiedBody.workflow.missing, ["contact"]);
    assert.equal(certifiedBody.workflow.bookingRequest.groups[0].activityType, "Fun Diving");
    assert.equal(certifiedBody.workflow.bookingRequest.groups[0].currentCertification, "Advanced Open Water");
    assert.equal(funEnvironment.store.alerts.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Open Water completes after a rejected local contact is replaced by a valid international contact", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const localContact = "081 234 5678";
  const internationalContact = "+66 81 234 5678";
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
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
  const browserScript = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  const redactSource = browserScript.match(/function redactPrivateContact\(value\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(redactSource);
  const redactPrivateContact = vm.runInNewContext(`(${redactSource})`);
  assert.equal(redactPrivateContact(localContact), "[contact supplied privately]");
  assert.equal(redactPrivateContact(internationalContact), "[contact supplied privately]");
  assert.match(browserScript, /appendMessage\("guest", redactPrivateContact\(question\)\)/);
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.open-water-retry-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const course = await handleConciergeRequest(guestRequest(
      "I want to book PADI Open Water Diver tomorrow for 4 divers, same for everyone."
    ), env, undefined, now);
    const courseBody = await course.json();

    assert.deepEqual(courseBody.workflow.missing, ["contact"]);
    assert.equal(courseBody.workflow.bookingRequest.preferredDate, "29 Aug 2026");
    assert.equal(courseBody.workflow.bookingRequest.guestCount, "4");
    assert.equal(courseBody.workflow.bookingRequest.groups[0].agency, "PADI");
    assert.equal(courseBody.workflow.bookingRequest.groups[0].course, "Open Water Diver");
    assert.equal(courseBody.workflow.bookingRequest.groups[0].currentCertification, "");

    const rejected = await handleConciergeRequest(guestRequest(localContact, {
      workflowState: courseBody.workflow
    }), env, undefined, now);
    const rejectedBody = await rejected.json();
    assert.match(rejectedBody.answer, /local number.*country code.*\+66/is);
    assert.deepEqual(rejectedBody.workflow.missing, ["contact"]);
    assert.equal(rejectedBody.workflow.retainPrivateContact, false);
    assert.deepEqual(rejectedBody.workflow.bookingRequest, courseBody.workflow.bookingRequest);
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound.length, 0);

    const completed = await handleConciergeRequest(guestRequest(internationalContact, {
      workflowState: rejectedBody.workflow
    }), env, undefined, now);
    const completedText = await completed.text();
    const completedBody = JSON.parse(completedText);
    assert.equal(completedBody.workflow.status, "submitted");
    assert.match(completedBody.answer, /sent your request to our booking team/i);
    assert.match(completedBody.answer, /not confirmed.*payment has been received/i);
    assert.doesNotMatch(completedBody.answer, /couldn.t send/i);
    assert.doesNotMatch(completedText, /081 234 5678|\+66 81 234 5678/);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].recipientGroup, "booking_with_owners");
    assert.equal(outbound.length, 3);
    assert.equal(outbound.every((payload) => payload.template.name === "house_booking_alert_v2"), true);
    assert.equal(store.interactions.some((item) => /081 234 5678|\+66 81 234 5678/.test(JSON.stringify(item))), false);
    assert.equal(store.alerts.some((item) => /081 234 5678|\+66 81 234 5678/.test(JSON.stringify(item))), false);

    const firstAttemptEnvironment = createEnvironment({
      OPENAI_API_KEY: "",
      WHATSAPP_ACCESS_TOKEN: "meta-test-token",
      WHATSAPP_PHONE_NUMBER_ID: "1234567890",
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
      META_APP_SECRET: "app-secret-test",
      WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ booking: [{ label: "Fah", phone: "+66 96 000 0001" }] })
    });
    const direct = await handleConciergeRequest(guestRequest(internationalContact, {
      workflowState: courseBody.workflow,
      sessionId: "session_open_water_first_contact_12345"
    }), firstAttemptEnvironment.env, undefined, now);
    const directBody = await direct.json();
    assert.equal(directBody.workflow.status, "submitted");
    assert.equal(firstAttemptEnvironment.store.alerts.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("failed Open Water protected delivery retries the same alert and succeeds only after provider acceptance", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
      support: [{ label: "Su", phone: "+66 64 000 0004" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const outbound = [];
  let acceptDelivery = false;
  console.error = () => {};
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return acceptDelivery
      ? new Response(JSON.stringify({ messages: [{ id: `wamid.open-water-retry-success-${outbound.length}` }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      : new Response(JSON.stringify({ error: { code: 131026, message: "Test recipient delivery failure" } }), {
          status: 400,
          headers: { "content-type": "application/json" }
        });
  };
  try {
    const ready = await handleConciergeRequest(guestRequest(
      "I want to book PADI Open Water Diver tomorrow for 4 divers, same for everyone."
    ), env, undefined, now);
    const readyBody = await ready.json();
    assert.deepEqual(readyBody.workflow.missing, ["contact"]);
    assert.equal(readyBody.workflow.bookingRequest.groups[0].agency, "PADI");
    assert.equal(readyBody.workflow.bookingRequest.groups[0].course, "Open Water Diver");
    assert.equal(readyBody.workflow.bookingRequest.groups[0].currentCertification, "");

    const failed = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      workflowState: readyBody.workflow
    }), env, undefined, now);
    const failedBody = await failed.json();
    assert.match(failedBody.answer, /couldn.t send.*has not been sent/i);
    assert.equal(failedBody.workflow.status, "delivery_failed");
    assert.equal(failedBody.workflow.retainPrivateContact, true);
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound.length, 3);
    assert.equal(store.alertDeliveries.filter((item) => item.status === "accepted").length, 0);

    const bar = await handleConciergeRequest(guestRequest("is there a good bar around", {
      workflowState: failedBody.workflow,
      privateReplyContact: "+66 81 234 5678"
    }), env, undefined, new Date(now.getTime() + 500));
    const barBody = await bar.json();
    assert.doesNotMatch(barBody.answer, /couldn.t send.*booking|booking request automatically/i);
    assert.match(`${barBody.answer} ${JSON.stringify(barBody.actions)}`, /bar|Bamboo|night/i);
    assert.equal(barBody.workflow.status, "delivery_failed");
    assert.equal(outbound.length, 3);
    assert.equal(store.alerts.filter((item) => item.alertType === "booking_request").length, 1);

    acceptDelivery = true;
    const property = await handleConciergeRequest(guestRequest("My AC isn’t cold.", {
      workflowState: failedBody.workflow,
      privateReplyContact: "+66 81 234 5678"
    }), env, undefined, new Date(now.getTime() + 750));
    const propertyBody = await property.json();
    assert.equal(propertyBody.intentId, "property_issue_equipment");
    assert.equal(propertyBody.workflow.type, "property_issue");
    assert.equal(outbound.filter((payload) => payload.template.name === "house_booking_alert_v2").length, 3);
    assert.equal(outbound.filter((payload) => payload.template.name === "house_service_alert_v3").length, 3);

    const retried = await handleConciergeRequest(guestRequest("try my diving booking again", {
      workflowState: barBody.workflow,
      privateReplyContact: "+66 81 234 5678"
    }), env, undefined, new Date(now.getTime() + 1000));
    const retriedBody = await retried.json();
    assert.equal(retriedBody.workflow.status, "submitted");
    assert.match(retriedBody.answer, /diving request has been sent to our booking team/i);
    assert.equal(store.alerts.filter((item) => item.alertType === "booking_request").length, 1);
    assert.equal(store.alerts.length, 2);
    assert.equal(outbound.length, 9);
    assert.equal(store.alertDeliveries.filter((item) => item.stage === "retry" && item.status === "accepted").length, 3);
    assert.equal(store.alerts.some((item) => /\+66 81 234 5678/.test(JSON.stringify(item))), false);

    const duplicate = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      workflowState: readyBody.workflow
    }), env, undefined, new Date(now.getTime() + 2000));
    const duplicateBody = await duplicate.json();
    assert.equal(duplicateBody.workflow.status, "submitted");
    assert.match(duplicateBody.answer, /sent your request to our booking team/i);
    assert.equal(store.alerts.filter((item) => item.alertType === "booking_request").length, 1);
    assert.equal(store.alerts.length, 2);
    assert.equal(outbound.length, 9);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

test("every natural explicit retry phrase reuses one failed alert before generic or model routing", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const sessionId = "session_retry_phrase_variants_12345";
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "must-not-run-for-deterministic-retry",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const outbound = [];
  console.error = () => {};
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /graph\.facebook\.com/);
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ error: { code: 131026, message: "Simulated delivery rejection" } }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const { failedBody } = await createFailedOpenWaterBooking(env, now, { sessionId });
    const alertId = failedBody.workflow.retryAlertId;
    const phrases = [
      "try my diving booking again",
      "retry my diving booking",
      "retry my booking",
      "send my booking again",
      "try sending it again",
      "retry",
      "try again"
    ];
    let workflow = failedBody.workflow;
    for (const [index, phrase] of phrases.entries()) {
      const response = await handleConciergeRequest(guestRequest(phrase, {
        sessionId,
        workflowState: workflow,
        privateReplyContact: "+66 81 234 5678",
        history: [
          { role: "user", content: "There was a medical problem yesterday" },
          { role: "assistant", content: "Call Koh Tao Rescue or 1669" }
        ]
      }), env, undefined, new Date(now.getTime() + 500 + index));
      const body = await response.json();
      assert.equal(body.workflow.status, "delivery_failed", phrase);
      assert.equal(body.workflow.retryAlertId, alertId, phrase);
      assert.match(body.answer, /still couldn.t send your diving request/i, phrase);
      assert.doesNotMatch(body.answer, /preferred date|how many divers|certification|1669|Rescue|medical/i, phrase);
      workflow = body.workflow;
    }
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].id, alertId);
    assert.equal(store.alertDeliveries.filter((item) => item.stage === "retry").length, phrases.length * 3);
    assert.equal(outbound.length, (phrases.length + 1) * 3);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

test("generic try-again wording is not hijacked when no failed booking exists", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
  const response = await handleConciergeRequest(
    guestRequest("try again", { sessionId: "session_no_failed_booking_retry_12345" }),
    env,
    undefined,
    new Date("2026-08-28T03:00:00.000Z")
  );
  const body = await response.json();
  assert.notEqual(body.source, "booking-retry-policy");
  assert.equal(store.alerts.length, 0);
});

test("a reload preserves safe failed-booking fields, recollects only contact and retries the same alert once", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const sessionId = "session_retry_reload_privacy_12345";
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  let acceptDelivery = false;
  let sends = 0;
  console.error = () => {};
  globalThis.fetch = async () => {
    sends += 1;
    return acceptDelivery
      ? new Response(JSON.stringify({ messages: [{ id: `wamid.reload-retry-${sends}` }] }), { status: 200 })
      : new Response(JSON.stringify({ error: { code: 131026, message: "Simulated delivery rejection" } }), { status: 400 });
  };
  try {
    const { failedBody } = await createFailedOpenWaterBooking(env, now, { sessionId });
    const alertId = failedBody.workflow.retryAlertId;
    assert.equal(sends, 3);
    assert.equal(store.bookingRetrySnapshots.length, 1);
    assert.equal("privateReplyContact" in store.bookingRetrySnapshots[0], false);

    const afterReload = await handleConciergeRequest(guestRequest("try my diving booking again", {
      sessionId,
      workflowState: null,
      privateReplyContact: ""
    }), env, undefined, new Date(now.getTime() + 500));
    const reloadBody = await afterReload.json();
    assert.deepEqual(reloadBody.workflow.missing, ["contact"]);
    assert.equal(reloadBody.workflow.retryAlertId, alertId);
    assert.equal(reloadBody.workflow.bookingRequest.preferredDate, "29 Aug 2026");
    assert.equal(reloadBody.workflow.bookingRequest.guestCount, "4");
    assert.equal(reloadBody.workflow.bookingRequest.groups[0].agency, "PADI");
    assert.equal(reloadBody.workflow.bookingRequest.groups[0].course, "Open Water Diver");
    assert.equal(reloadBody.workflow.bookingRequest.groups[0].currentCertification, "");
    assert.match(reloadBody.answer, /still have your diving request details.*privacy.*phone number again/i);
    assert.doesNotMatch(reloadBody.answer, /what date|how many|which diving option|certification level/i);
    assert.equal(sends, 3);

    const local = await handleConciergeRequest(guestRequest("081 234 5678", {
      sessionId,
      workflowState: reloadBody.workflow
    }), env, undefined, new Date(now.getTime() + 600));
    const localBody = await local.json();
    assert.deepEqual(localBody.workflow.missing, ["contact"]);
    assert.equal(localBody.workflow.retryAlertId, alertId);
    assert.equal(localBody.workflow.bookingRequest.groups[0].course, "Open Water Diver");
    assert.match(localBody.answer, /local number.*country code.*\+66/i);
    assert.equal(sends, 3);

    acceptDelivery = true;
    const corrected = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      sessionId,
      workflowState: localBody.workflow
    }), env, undefined, new Date(now.getTime() + 700));
    const correctedBody = await corrected.json();
    assert.equal(correctedBody.workflow.status, "submitted");
    assert.equal(correctedBody.workflow.retryAlertId, alertId);
    assert.match(correctedBody.answer, /diving request has been sent to our booking team/i);
    assert.equal(store.alerts.length, 1);
    assert.equal(sends, 6);

    const alreadySent = await handleConciergeRequest(guestRequest("retry my booking", {
      sessionId,
      workflowState: null,
      privateReplyContact: ""
    }), env, undefined, new Date(now.getTime() + 800));
    const alreadySentBody = await alreadySent.json();
    assert.match(alreadySentBody.answer, /already been sent.*haven.t sent a duplicate/i);
    assert.equal(alreadySentBody.workflow.status, "submitted");
    assert.equal(sends, 6);
    assert.equal(store.alerts.length, 1);
    assert.doesNotMatch(JSON.stringify({
      interactions: store.interactions,
      alerts: store.alerts,
      snapshots: store.bookingRetrySnapshots,
      diagnostics: store.whatsappDiagnostics
    }), /081 234 5678|\+66 81 234 5678/);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

test("failed booking state releases unrelated intents and an isolated explicit retry ignores stale history", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const sessionId = "session_retry_context_isolation_12345";
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "must-not-run-for-these-deterministic-paths",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
      support: [{ label: "Su", phone: "+66 64 000 0004" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const outbound = [];
  let acceptBooking = false;
  console.error = () => {};
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /graph\.facebook\.com/);
    const payload = JSON.parse(options.body);
    outbound.push(payload);
    const booking = payload.template.name === "house_booking_alert_v2";
    return booking && !acceptBooking
      ? new Response(JSON.stringify({ error: { code: 131026, message: "Simulated booking rejection" } }), { status: 400 })
      : new Response(JSON.stringify({ messages: [{ id: `wamid.context-${outbound.length}` }] }), { status: 200 });
  };
  try {
    const { failedBody } = await createFailedOpenWaterBooking(env, now, { sessionId });
    const unrelatedHistory = [
      { role: "user", content: "Someone felt very sick yesterday" },
      { role: "assistant", content: "Call Koh Tao Rescue or 1669 for a medical emergency" },
      { role: "user", content: "I lost my key" },
      { role: "assistant", content: "A lost-key fee applies" },
      { role: "user", content: "There was a sewage smell" },
      { role: "assistant", content: "The property team can inspect it" }
    ];

    const bar = await handleConciergeRequest(guestRequest("is there a good bar around", {
      sessionId,
      workflowState: failedBody.workflow,
      privateReplyContact: "+66 81 234 5678",
      history: unrelatedHistory
    }), env, undefined, new Date(now.getTime() + 500));
    const barBody = await bar.json();
    assert.match(`${barBody.answer} ${JSON.stringify(barBody.actions)}`, /bar|Bamboo|night/i);
    assert.doesNotMatch(barBody.answer, /booking request automatically|Rescue|1669|lost key|sewage/i);
    assert.equal(outbound.filter((payload) => payload.template.name === "house_booking_alert_v2").length, 3);

    const checkout = await handleConciergeRequest(guestRequest("What time is checkout?", {
      sessionId,
      workflowState: failedBody.workflow,
      privateReplyContact: "+66 81 234 5678",
      history: unrelatedHistory
    }), env, undefined, new Date(now.getTime() + 600));
    const checkoutBody = await checkout.json();
    assert.match(checkoutBody.answer, /11:00|11 AM|11\.00/i);
    assert.doesNotMatch(checkoutBody.answer, /booking request automatically|Rescue|1669/i);

    const property = await handleConciergeRequest(guestRequest("My AC isn’t cold.", {
      sessionId,
      workflowState: failedBody.workflow,
      privateReplyContact: "+66 81 234 5678",
      history: unrelatedHistory
    }), env, undefined, new Date(now.getTime() + 700));
    const propertyBody = await property.json();
    assert.equal(propertyBody.intentId, "property_issue_equipment");
    assert.equal(propertyBody.workflow.type, "property_issue");
    assert.equal(outbound.filter((payload) => payload.template.name === "house_booking_alert_v2").length, 3);

    acceptBooking = true;
    const retry = await handleConciergeRequest(guestRequest("try my diving booking again", {
      sessionId,
      workflowState: propertyBody.workflow,
      privateReplyContact: "+66 81 234 5678",
      history: unrelatedHistory
    }), env, undefined, new Date(now.getTime() + 800));
    const retryBody = await retry.json();
    assert.equal(retryBody.workflow.status, "submitted");
    assert.match(retryBody.answer, /diving request has been sent/i);
    assert.doesNotMatch(retryBody.answer, /medical|Rescue|1669|lost key|sewage|\bAC\b/i);
    assert.equal(store.alerts.filter((item) => item.alertType === "booking_request").length, 1);
    assert.equal(outbound.filter((payload) => payload.template.name === "house_booking_alert_v2").length, 6);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

test("booking retry snapshots are bound to the verified stay, room and protected browser session", async () => {
  const now = new Date("2026-08-28T04:30:00.000Z");
  const sessionId = "session_verified_retry_binding_12345";
  const { env, store } = createEnvironment({
    GUEST_ACCESS_ENFORCEMENT: "true",
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "app-secret-test",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const room11Cookie = await syncAndVerifyStay(env, { room: "11", confirmationCode: "HMRETRY11", now });
  await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie: room11Cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "thai", allGuestsThai: true })
  }), env, "/api/stay/nationality", null, new Date(now.getTime() + 10));
  const requestFactory = (question, extra = {}) => verifiedConciergeRequest(question, room11Cookie, {
    sessionId,
    ...extra
  });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  let acceptDelivery = false;
  let sends = 0;
  console.error = () => {};
  globalThis.fetch = async () => {
    sends += 1;
    return acceptDelivery
      ? new Response(JSON.stringify({ messages: [{ id: `wamid.verified-retry-${sends}` }] }), { status: 200 })
      : new Response(JSON.stringify({ error: { code: 131026, message: "Simulated delivery rejection" } }), { status: 400 });
  };
  try {
    const { failedBody } = await createFailedOpenWaterBooking(env, now, { sessionId, requestFactory });
    assert.equal(sends, 3);

    const otherBrowserSession = await handleConciergeRequest(verifiedConciergeRequest("retry my booking", room11Cookie, {
      sessionId: "session_other_browser_123456",
      privateReplyContact: "+66 81 234 5678"
    }), env, undefined, new Date(now.getTime() + 500));
    const otherBrowserBody = await otherBrowserSession.json();
    assert.match(otherBrowserBody.answer, /couldn.t find a failed booking request in this protected session/i);
    assert.equal(sends, 3);

    const room10Cookie = await syncAndVerifyStay(env, {
      room: "10",
      confirmationCode: "HMRETRY10",
      checkInDate: "2026-08-27",
      checkOutDate: "2026-09-30",
      now: new Date(now.getTime() + 600)
    });
    await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie: room10Cookie, "content-type": "application/json" },
      body: JSON.stringify({ nationality: "thai", allGuestsThai: true })
    }), env, "/api/stay/nationality", null, new Date(now.getTime() + 610));
    const otherStay = await handleConciergeRequest(verifiedConciergeRequest("retry my booking", room10Cookie, {
      room: "10",
      sessionId,
      privateReplyContact: "+66 81 234 5678"
    }), env, undefined, new Date(now.getTime() + 700));
    const otherStayBody = await otherStay.json();
    assert.match(otherStayBody.answer, /couldn.t find a failed booking request in this protected session/i);
    assert.equal(sends, 3);

    acceptDelivery = true;
    const correctContext = await handleConciergeRequest(verifiedConciergeRequest("retry my diving booking", room11Cookie, {
      sessionId,
      workflowState: failedBody.workflow,
      privateReplyContact: "+66 81 234 5678"
    }), env, undefined, new Date(now.getTime() + 800));
    const correctBody = await correctContext.json();
    assert.equal(correctBody.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);
    assert.equal(sends, 6);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

test("generic retry asks one concise question when two failed booking categories are ambiguous", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const sessionId = "session_retry_ambiguity_12345";
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    META_APP_SECRET: "app-secret-test",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  let sends = 0;
  console.error = () => {};
  globalThis.fetch = async () => {
    sends += 1;
    return new Response(JSON.stringify({ error: { code: 131026, message: "Simulated delivery rejection" } }), { status: 400 });
  };
  try {
    await createFailedOpenWaterBooking(env, now, { sessionId });
    const fishing = await handleConciergeRequest(guestRequest("I want to book sport fishing tomorrow for 2 people", {
      sessionId
    }), env, undefined, new Date(now.getTime() + 300));
    const fishingBody = await fishing.json();
    assert.deepEqual(fishingBody.workflow.missing, ["contact"]);
    const failedFishing = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      sessionId,
      workflowState: fishingBody.workflow
    }), env, undefined, new Date(now.getTime() + 400));
    const failedFishingBody = await failedFishing.json();
    assert.equal(failedFishingBody.workflow.status, "delivery_failed");
    assert.equal(store.alerts.length, 2);
    assert.equal(sends, 6);

    const ambiguous = await handleConciergeRequest(guestRequest("retry", {
      sessionId,
      privateReplyContact: "+66 81 234 5678"
    }), env, undefined, new Date(now.getTime() + 500));
    const ambiguousBody = await ambiguous.json();
    assert.match(ambiguousBody.answer, /retry your (?:diving request.*fishing(?: trip)? request|fishing(?: trip)? request.*diving request)/i);
    assert.equal(ambiguousBody.actions.length, 2);
    assert.deepEqual(new Set(ambiguousBody.actions.map((action) => action.prompt)), new Set([
      "retry my diving booking",
      "retry my fishing booking"
    ]));
    assert.doesNotMatch(ambiguousBody.answer, /preferred date|certification|phone number/i);
    assert.equal(sends, 6);

    const divingOnly = await handleConciergeRequest(guestRequest("retry my diving booking", {
      sessionId,
      privateReplyContact: "+66 81 234 5678"
    }), env, undefined, new Date(now.getTime() + 600));
    const divingOnlyBody = await divingOnly.json();
    assert.equal(divingOnlyBody.workflow.kind, "diving");
    assert.equal(divingOnlyBody.workflow.status, "delivery_failed");
    assert.equal(store.alerts.length, 2);
    assert.equal(sends, 9);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

test("active bookings acknowledge side questions, preserve one authoritative state and never promise an alternative provider", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
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
    return new Response(JSON.stringify({ messages: [{ id: `wamid.booking-side-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const start = await handleConciergeRequest(guestRequest("I wanna go diving."), env, undefined, now);
    const startBody = await start.json();
    const dateAndPreference = await handleConciergeRequest(guestRequest(
      "Tomorrow but not with Roctopus please, I would like to go with French Kiss Divers.",
      { workflowState: startBody.workflow }
    ), env, undefined, now);
    const preferenceBody = await dateAndPreference.json();
    assert.equal(preferenceBody.workflow.bookingRequest.preferredDate, "29 Aug 2026");
    assert.equal(preferenceBody.workflow.bookingRequest.preferredProvider, "French Kiss Divers");
    assert.equal(preferenceBody.workflow.missing[0], "guests");
    assert.match(preferenceBody.answer, /normally recommend Roctopus Dive/i);
    assert.match(preferenceBody.answer, /booking team can check whether that can be arranged/i);
    assert.match(preferenceBody.answer, /How many people will be diving/i);
    assert.doesNotMatch(preferenceBody.answer, /French Kiss Divers (?:is|has been) (?:available|confirmed|booked)/i);

    const sideQuestion = await handleConciergeRequest(guestRequest("With French Kiss Divers is possible?", {
      workflowState: preferenceBody.workflow
    }), env, undefined, now);
    const sideBody = await sideQuestion.json();
    assert.equal(sideBody.workflow.bookingRequest.preferredDate, "29 Aug 2026");
    assert.equal(sideBody.workflow.bookingRequest.preferredProvider, "French Kiss Divers");
    assert.equal(sideBody.workflow.missing[0], "guests");
    assert.match(sideBody.answer, /French Kiss Divers.*check whether that can be arranged/i);
    assert.match(sideBody.answer, /How many people will be diving/i);
    assert.equal(store.alerts.length, 0);
    assert.equal(outbound.length, 0);

    const updatedProvider = await handleConciergeRequest(guestRequest("or with Master Divers would be even better", {
      workflowState: sideBody.workflow
    }), env, undefined, now);
    const updatedProviderBody = await updatedProvider.json();
    assert.equal(updatedProviderBody.workflow.bookingRequest.preferredProvider, "Master Divers");
    assert.doesNotMatch(updatedProviderBody.answer, /Or With Master Divers/);
    assert.equal(updatedProviderBody.workflow.missing[0], "guests");

    const guests = await handleConciergeRequest(guestRequest("2", { workflowState: updatedProviderBody.workflow }), env, undefined, now);
    const guestsBody = await guests.json();
    const same = await handleConciergeRequest(guestRequest("Same for everyone", { workflowState: guestsBody.workflow }), env, undefined, now);
    const sameBody = await same.json();
    const option = await handleConciergeRequest(guestRequest("Fun Diving", { workflowState: sameBody.workflow }), env, undefined, now);
    const optionBody = await option.json();
    const certification = await handleConciergeRequest(guestRequest("Dive Instructor", { workflowState: optionBody.workflow }), env, undefined, now);
    const certificationBody = await certification.json();
    assert.equal(certificationBody.workflow.bookingRequest.groups[0].currentCertification, "Instructor");
    const submitted = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      workflowState: certificationBody.workflow
    }), env, undefined, now);
    const submittedBody = await submitted.json();
    assert.equal(submittedBody.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);
    assert.match(store.alerts[0].summary, /Preferred provider: Master Divers/i);
    assert.equal(outbound.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("shared booking dates accept European formats and explain past or unparseable input", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  assert.equal(sanitizeQuestion("30-08-2026"), "30-08-2026");
  const cases = [
    ["30.08.2026", "30 Aug 2026"],
    ["30/08/2026", "30 Aug 2026"],
    ["30-08-2026", "30 Aug 2026"],
    ["30 August 2026", "30 Aug 2026"],
    ["30 Aug 2026", "30 Aug 2026"],
    ["August 30 2026", "30 Aug 2026"],
    ["tomorrow", "29 Aug 2026"],
    ["day after tomorrow", "30 Aug 2026"],
    ["next Tuesday", "01 Sept 2026"]
  ];
  for (const [answer, expected] of cases) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const start = await handleConciergeRequest(guestRequest("I wanna go diving.", {
      sessionId: `session_date_${answer.replace(/\W/g, "_")}_12345`
    }), env, undefined, now);
    const startBody = await start.json();
    const response = await handleConciergeRequest(guestRequest(answer, {
      workflowState: startBody.workflow,
      sessionId: `session_date_${answer.replace(/\W/g, "_")}_12345`
    }), env, undefined, now);
    const body = await response.json();
    assert.equal(body.workflow.bookingRequest.preferredDate, expected, answer);
    assert.equal(body.workflow.missing[0], "guests", answer);
    assert.equal(store.alerts.length, 0, answer);
  }

  const pastEnvironment = createEnvironment({ OPENAI_API_KEY: "" });
  const pastStart = await handleConciergeRequest(guestRequest("I wanna go diving."), pastEnvironment.env, undefined, now);
  const pastStartBody = await pastStart.json();
  const past = await handleConciergeRequest(guestRequest("27.07.2026", {
    workflowState: pastStartBody.workflow
  }), pastEnvironment.env, undefined, now);
  const pastBody = await past.json();
  assert.match(pastBody.answer, /27 Jul 2026 has already passed/i);
  assert.match(pastBody.answer, /choose another date/i);
  assert.equal(pastBody.workflow.missing[0], "date");
  assert.equal(pastBody.workflow.bookingRequest.preferredDate, "");
  assert.equal(pastEnvironment.store.alerts.length, 0);

  const invalid = await handleConciergeRequest(guestRequest("31.02.2026", {
    workflowState: pastBody.workflow
  }), pastEnvironment.env, undefined, now);
  const invalidBody = await invalid.json();
  assert.match(invalidBody.answer, /couldn’t understand that date/i);
  assert.match(invalidBody.answer, /30\.08\.2026/);
  assert.equal(invalidBody.workflow.missing[0], "date");
  assert.equal(pastEnvironment.store.alerts.length, 0);

  const fishingEnvironment = createEnvironment({ OPENAI_API_KEY: "" });
  const fishingStart = await handleConciergeRequest(guestRequest("I want to go fishing."), fishingEnvironment.env, undefined, now);
  const fishingStartBody = await fishingStart.json();
  const fishingDate = await handleConciergeRequest(guestRequest("30.08.2026", {
    workflowState: fishingStartBody.workflow
  }), fishingEnvironment.env, undefined, now);
  const fishingBody = await fishingDate.json();
  assert.equal(fishingBody.workflow.bookingRequest.preferredDate, "30 Aug 2026");
  assert.equal(fishingBody.workflow.missing[0], "guests");
  const invalidGuests = await handleConciergeRequest(guestRequest("many", {
    workflowState: fishingBody.workflow
  }), fishingEnvironment.env, undefined, now);
  const invalidGuestsBody = await invalidGuests.json();
  assert.match(invalidGuestsBody.answer, /enter the number of guests, for example 2/i);
  assert.equal(invalidGuestsBody.workflow.missing[0], "guests");
  assert.equal(fishingEnvironment.store.alerts.length, 0);
});

test("diving certification accepts useful sanitized free text and explains unusable answers", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
  const start = await handleConciergeRequest(
    guestRequest("I want to book Fun Diving tomorrow for 2 divers, same for everyone."), env, undefined, now
  );
  const startBody = await start.json();
  assert.equal(startBody.workflow.missing[0], "certification");
  const cases = [
    ["Open Water", "Open Water"],
    ["Advanced", "Advanced Open Water"],
    ["Rescue Diver", "Rescue Diver"],
    ["Divemaster", "Divemaster"],
    ["Dive Master", "Divemaster"],
    ["Instructor", "Instructor"],
    ["Dive Instructor", "Instructor"],
    ["PADI Instructor", "PADI Instructor"],
    ["SSI Divemaster", "SSI Divemaster"]
  ];
  for (const [answer, expected] of cases) {
    const response = await handleConciergeRequest(guestRequest(answer, {
      workflowState: structuredClone(startBody.workflow),
      sessionId: `session_cert_${answer.replace(/\W/g, "_")}_12345`
    }), env, undefined, now);
    const body = await response.json();
    assert.equal(body.workflow.bookingRequest.certificationLevel, expected, answer);
    assert.deepEqual(body.workflow.missing, ["contact"], answer);
    assert.match(body.answer, /country code/i, answer);
  }
  const rejected = await handleConciergeRequest(guestRequest("I don’t know", {
    workflowState: startBody.workflow
  }), env, undefined, now);
  const rejectedBody = await rejected.json();
  assert.match(rejectedBody.answer, /didn’t recognize a certification level/i);
  assert.match(rejectedBody.answer, /Open Water.*Divemaster.*Instructor/i);
  assert.equal(rejectedBody.workflow.missing[0], "certification");
  assert.equal(store.alerts.length, 0);
});

test("non-diving booking side notes are acknowledged without filling or resetting the requested field", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const cases = [
    ["Can you arrange a taxi tomorrow at 9 AM?", "Can they take 3 suitcases?", "pickup", /luggage details.*check/i],
    ["I want to book ferry tickets tomorrow from Koh Tao to Koh Samui.", "Can we bring our bicycles?", "guests", /bring bicycles.*check/i],
    ["I want to go fishing tomorrow with 2 people.", "Can children come?", "option", /children may be joining.*check/i]
  ];
  for (const [startQuestion, sideQuestion, expectedField, acknowledgement] of cases) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const start = await handleConciergeRequest(guestRequest(startQuestion), env, undefined, now);
    const startBody = await start.json();
    assert.equal(startBody.workflow.missing[0], expectedField, startQuestion);
    const side = await handleConciergeRequest(guestRequest(sideQuestion, {
      workflowState: startBody.workflow
    }), env, undefined, now);
    const sideBody = await side.json();
    assert.equal(sideBody.workflow.missing[0], expectedField, sideQuestion);
    assert.match(sideBody.answer, acknowledgement, sideQuestion);
    assert.match(sideBody.workflow.bookingRequest.notes, new RegExp(sideQuestion.replace(/[?]/g, "\\?"), "i"), sideQuestion);
    assert.equal(store.alerts.length, 0, sideQuestion);
  }
});

test("taxi-boat direction buttons preserve the supplied route, time, date and passengers", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
  const now = new Date("2026-08-28T03:00:00.000Z");
  const response = await handleConciergeRequest(guestRequest(
    "I need a longtail boat tomorrow at 9 AM from Mae Haad Pier to Mango Bay for 2 people."
  ), env, undefined, now);
  const body = await response.json();
  assert.deepEqual(body.workflow.missing, ["tripType", "contact"]);
  assert.deepEqual(body.actions.map((action) => action.label), ["One way", "Return"]);
  assert.equal(body.workflow.bookingRequest.preferredDate, "29 Aug 2026");
  assert.equal(body.workflow.bookingRequest.pickupTime, "9:00 AM");
  assert.equal(body.workflow.bookingRequest.pickupLocation, "Mae Haad Pier");
  assert.equal(body.workflow.bookingRequest.destination, "Mango Bay");
  assert.equal(body.workflow.bookingRequest.guestCount, "2");

  const selected = await handleConciergeRequest(guestRequest(body.actions[0].prompt, {
    workflowState: body.workflow
  }), env, undefined, now);
  const selectedBody = await selected.json();
  assert.deepEqual(selectedBody.workflow.missing, ["contact"]);
  assert.equal(selectedBody.workflow.bookingRequest.tripType, "One-way");
  assert.equal(selectedBody.workflow.bookingRequest.pickupLocation, "Mae Haad Pier");
  assert.equal(selectedBody.workflow.bookingRequest.destination, "Mango Bay");
  assert.equal(store.alerts.length, 0);
});

test("fishing, snorkeling and transport bookings submit one protected Fah-and-owner alert", async () => {
  const cases = [
    ["fishing", "I want to book a sport fishing trip tomorrow for 2 guests. My WhatsApp is +66 81 234 5678.", "Fishing trip"],
    ["snorkeling", "I want to book a private snorkeling trip in 3 days for 3 guests. My WhatsApp is +66 81 234 5678.", "Snorkeling trip"],
    ["taxi", "Please arrange a taxi tomorrow at 9 AM from The House to Mae Haad Pier for two people. My WhatsApp is +66 81 234 5678.", "Taxi"],
    ["taxi_boat", "I want to book a return taxi boat tomorrow at 10 AM from Mae Haad Pier to Mango Bay for 2 passengers. My WhatsApp is +66 81 234 5678.", "Taxi boat"],
    ["ferry", "Please book ferry tickets tomorrow from Koh Tao to Koh Samui for 2 travelers. My WhatsApp is +66 81 234 5678.", "Ferry tickets"],
    ["motorbike_taxi", "I want to book a motorbike taxi tomorrow at 8 AM from The House to Sairee for 1 passenger. My WhatsApp is +66 81 234 5678.", "Motorbike taxi"]
  ];
  const originalFetch = globalThis.fetch;
  try {
    for (const [kind, question, activity] of cases) {
      const { env, store } = createEnvironment({
        OPENAI_API_KEY: "",
        WHATSAPP_ACCESS_TOKEN: "meta-test-token",
        WHATSAPP_PHONE_NUMBER_ID: "1234567890",
        WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
          support: [{ label: "Su", phone: "+66 64 000 0001" }],
          booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
          emergency: [
            { label: "Owner 1", phone: "+66 81 000 0002" },
            { label: "Owner 2", phone: "+66 82 000 0003" }
          ]
        })
      });
      const outbound = [];
      globalThis.fetch = async (_url, options) => {
        outbound.push(JSON.parse(options.body));
        return new Response(JSON.stringify({ messages: [{ id: `wamid.${kind}.${outbound.length}` }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      };
      const response = await handleConciergeRequest(
        guestRequest(question, { sessionId: `session_booking_${kind}_12345` }),
        env,
        undefined,
        new Date("2026-08-28T03:00:00.000Z")
      );
      const body = await response.json();
      assert.equal(body.workflow.status, "submitted", kind);
      assert.equal(body.workflow.kind, kind, kind);
      assert.match(body.answer, /check availability and the current price/i, kind);
      assert.match(body.answer, /not confirmed.*payment has been received/i, kind);
      assert.equal(store.alerts.length, 1, kind);
      assert.equal(store.alerts[0].alertType, "booking_request", kind);
      assert.equal(store.alerts[0].recipientGroup, "booking_with_owners", kind);
      assert.equal(outbound.length, 3, kind);
      assert.deepEqual(outbound.map((payload) => payload.to).sort(), ["66810000002", "66820000003", "66960000001"], kind);
      assert.equal(outbound.every((payload) => payload.template.name === "house_booking_alert_v2"), true, kind);
      assert.equal(outbound.every((payload) => payload.template.language.code === "en"), true, kind);
      assert.equal(outbound.every((payload) => payload.template.components[0].parameters.length === 6), true, kind);
      assert.equal(outbound[0].template.components[0].parameters[2].text, activity, kind);
      assert.doesNotMatch(JSON.stringify(outbound), /66640000001/, kind);
      assert.doesNotMatch(JSON.stringify(store.interactions), /66812345678|81 234 5678/, kind);
      assert.doesNotMatch(JSON.stringify(store.alerts), /66812345678|81 234 5678/, kind);
      assert.match(outbound[0].template.components[0].parameters[5].text, /Guest reply: \+66812345678/, kind);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("every supported non-diving booking rejects a local contact without losing fields", async () => {
  const cases = [
    ["fishing", "I want to book a sport fishing trip tomorrow for 2 guests. My phone is 0812345678."],
    ["snorkeling", "I want to book a private snorkeling trip tomorrow for 2 guests. My phone is 0812345678."],
    ["taxi", "Please arrange a taxi tomorrow at 9 AM from The House to Mae Haad Pier for 2 passengers. My phone is 0812345678."],
    ["taxi_boat", "Please book a one-way taxi boat tomorrow at 9 AM from Mae Haad Pier to Shark Bay for 2 passengers. My phone is 0812345678."],
    ["ferry", "Please book ferry tickets tomorrow from Koh Tao to Koh Samui for 2 travelers. My phone is 0812345678."],
    ["motorbike_taxi", "Please arrange a motorbike taxi tomorrow at 9 AM from The House to Sairee for 1 passenger. My phone is 0812345678."]
  ];
  for (const [kind, question] of cases) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const response = await handleConciergeRequest(guestRequest(question), env, undefined, new Date("2026-08-28T03:00:00.000Z"));
    const body = await response.json();
    assert.equal(body.workflow.kind, kind, kind);
    assert.deepEqual(body.workflow.missing, ["contact"], kind);
    assert.match(body.answer, /That looks like a local number/i, kind);
    assert.match(body.answer, /\+66 for Thailand/i, kind);
    assert.equal(store.alerts.length, 0, kind);
    assert.doesNotMatch(JSON.stringify(store.interactions), /0812345678/, kind);
  }
});

test("corrected international contact completes the same taxi request once and a new request starts clean", async () => {
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
  const local = await handleConciergeRequest(guestRequest(
    "Please arrange a taxi tomorrow at 9 AM from The House to Mae Haad Pier for 2 passengers. My phone is 0812345678."
  ), env, undefined, new Date("2026-08-28T03:00:00.000Z"));
  const localBody = await local.json();
  assert.deepEqual(localBody.workflow.missing, ["contact"]);
  assert.equal(localBody.workflow.bookingRequest.pickupLocation, "The House");
  assert.equal(localBody.workflow.bookingRequest.destination, "Mae Haad Pier");
  assert.equal(localBody.workflow.bookingRequest.pickupTime, "9:00 AM");
  assert.equal(localBody.workflow.bookingRequest.guestCount, "2");

  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.taxi-correction-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const corrected = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      workflowState: localBody.workflow,
      history: [
        { role: "user", content: "Please arrange a taxi tomorrow at 9 AM from The House to Mae Haad Pier for 2 passengers. [contact supplied privately]" },
        { role: "assistant", content: localBody.answer }
      ]
    }), env, undefined, new Date("2026-08-28T03:00:00.000Z"));
    const correctedBody = await corrected.json();
    assert.equal(correctedBody.workflow.status, "submitted");
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound.length, 3);
    assert.match(correctedBody.answer, /not confirmed.*payment has been received/i);

    const fresh = await handleConciergeRequest(guestRequest("Can you arrange a taxi?", {
      sessionId: "session_fresh_taxi_123456"
    }), env, undefined, new Date("2026-08-28T03:00:00.000Z"));
    const freshBody = await fresh.json();
    assert.equal(freshBody.workflow.status, "collecting");
    assert.deepEqual(freshBody.workflow.missing.sort(), ["contact", "date", "destination", "guests", "pickup", "time"]);
    assert.equal(freshBody.workflow.bookingRequest.pickupLocation, "");
    assert.equal(freshBody.workflow.bookingRequest.destination, "");
    assert.equal(store.alerts.length, 1);
    assert.equal(outbound.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("booking UI never exposes Fah personal WhatsApp and service hours are guest-visible", async () => {
  const [
    contacts,
    booking,
    app,
    concierge,
    practical,
    modulePractical,
    emergency,
    moduleEmergency,
    activity,
    moduleActivity,
    shop,
    moduleShop
  ] = await Promise.all([
    readFile(new URL("../public/contacts.js", import.meta.url), "utf8"),
    readFile(new URL("../public/concierge-booking.js", import.meta.url), "utf8"),
    readFile(new URL("../public/guide-app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8"),
    readFile(new URL("../public/practical.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/practical/practical.html", import.meta.url), "utf8"),
    readFile(new URL("../public/emergency.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/emergency/emergency.html", import.meta.url), "utf8"),
    readFile(new URL("../public/activity.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/activities/activity.html", import.meta.url), "utf8"),
    readFile(new URL("../public/shop.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/shopping/shop.html", import.meta.url), "utf8")
  ]);
  for (const source of [contacts, booking, app, concierge]) {
    assert.doesNotMatch(source, /wa\.me\/66962741424|\+66962741424|0962741424/);
  }
  assert.match(booking, /whatsappHref: "#concierge-booking"/);
  assert.doesNotMatch(booking, /phoneHref|callLabel/);
  assert.match(app, /bookingWhatsapp: "#concierge-booking"/);
  assert.match(concierge, /Housekeeping &amp; service hours: Tuesday–Sunday, 10:30 AM–7:30 PM/);
  assert.match(concierge, /unavailable on Mondays/);
  for (const page of [practical, modulePractical]) {
    assert.match(page, /Housekeeping &amp; Service Requests/);
    assert.match(page, /Tuesday–Sunday, 10:30 AM–7:30 PM/);
    assert.match(page, /unavailable on Mondays/);
    assert.match(page, /Sunday evening request will be handled from Tuesday at 10:30 AM/);
    assert.match(page, /Help &amp; Emergency/);
  }
  for (const page of [practical, modulePractical, emergency, moduleEmergency]) {
    assert.match(page, /data-link="houseWhatsapp"[^>]*data-action="contact"[^>]*>Contact Us</);
    assert.doesNotMatch(page, /data-link="houseCall"|>Call Us</);
  }
  for (const page of [activity, moduleActivity, shop, moduleShop]) {
    assert.doesNotMatch(page, /booking\.phoneHref|data-action="bookingCall"|>Call Us</);
  }
  for (const page of [activity, moduleActivity]) {
    assert.match(page, /HOUSE_CONCIERGE_BOOKING\.createBooking\(x\.name\)/);
    assert.match(page, /Book with Us/);
  }
});

test("all House map actions retain the single real-device-verified universal Maps URL", async () => {
  const sources = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/house/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/data/concierge-knowledge.json", import.meta.url), "utf8")
  ]);
  const combined = sources.join("\n");
  const verifiedHouseMap = "https://maps.app.goo.gl/5MV4j4B1YzyR1SR69";
  assert.equal((combined.match(new RegExp(verifiedHouseMap.replaceAll(".", "\\."), "g")) || []).length, 5);
  assert.doesNotMatch(combined, /https:\/\/maps\.app\.goo\.gl\/P6dxecrmX6pRWsMb8/);
  assert.doesNotMatch(combined, /https:\/\/share\.google\/xpdhZzm91F88beMAP/);
  for (const html of sources.slice(0, 3)) assert.match(html, /Open Google Maps/);
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
  const response = await handleConciergeRequest(
    guestRequest("Can I borrow a blue umbrella?"),
    env,
    undefined,
    new Date("2026-08-29T08:00:00.000Z")
  );
  const body = await response.json();
  assert.equal(body.intentId, "borrow_umbrella");
  assert.equal(body.source, "approved");
  assert.equal(body.learningGap, false);
  assert.deepEqual(body.actions, []);
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

test("guest in-person passport choice is disabled while authenticated admin can use the in-person exception", async () => {
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

  const guestHandover = await handleStayGuestRequest(new Request("https://guide.example/api/stay/in-person-passports", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ allPassportsInPerson: true })
  }), env, "/api/stay/in-person-passports");
  assert.equal(guestHandover.status, 404);
  assert.equal((await guestHandover.json()).error, "not_found");

  const stillUploadPending = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=3", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status");
  const uploadPendingBody = await stillUploadPending.json();
  assert.equal(uploadPendingBody.registrationStatus, "passport_pending");
  assert.equal(uploadPendingBody.accessGranted, false);

  const unauthorizedStart = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/in-person-registration/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, nonThaiGuestCount: 2, confirmed: true })
  }), env, "/api/concierge/admin/in-person-registration/start");
  assert.equal(unauthorizedStart.status, 401);

  const started = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/in-person-registration/start", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, nonThaiGuestCount: 2, confirmed: true })
  }), env, "/api/concierge/admin/in-person-registration/start");
  assert.equal(started.status, 200);
  const startedBody = await started.json();
  assert.equal(startedBody.status, "in_person_pending");
  assert.equal(startedBody.requiredPassports, 2);

  const locked = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=3", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status");
  assert.equal((await locked.json()).accessGranted, false);

  const completed = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/in-person-registration", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, registrationCompleted: true })
  }), env, "/api/concierge/admin/in-person-registration");
  assert.equal(completed.status, 200);
  assert.equal((await completed.json()).status, "in_person_complete");

  const cannotRestartCompleted = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/in-person-registration/start", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, nonThaiGuestCount: 2, confirmed: true })
  }), env, "/api/concierge/admin/in-person-registration/start");
  assert.equal(cannotRestartCompleted.status, 409);

  const unlocked = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=3", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status");
  assert.equal((await unlocked.json()).accessGranted, true);
  assert.equal(store.registrationStatuses.get(store.stayReservations[0].id).requiredPassports, 2);
});


test("admin can start in-person registration before the guest makes any nationality or guest-count declaration", async () => {
  const { env, store } = createEnvironment();
  await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({
      room: "5",
      listingId: "1504732379219115485",
      records: [{ confirmationCode: "HMINPERSONFRESH5", checkInDate: "2027-08-13", checkOutDate: "2027-08-16" }]
    })
  }), env);
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "5", confirmationCode: "HMINPERSONFRESH5" })
  }), env, "/api/stay/verify", null, new Date("2027-08-14T08:00:00.000Z"));
  const cookie = verified.headers.get("set-cookie").split(";")[0];

  const before = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=5", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status");
  assert.equal((await before.json()).registrationStatus, "not_started");

  const started = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/in-person-registration/start", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, nonThaiGuestCount: 3, confirmed: true })
  }), env, "/api/concierge/admin/in-person-registration/start");
  assert.equal(started.status, 200);
  const startedBody = await started.json();
  assert.equal(startedBody.status, "in_person_pending");
  assert.equal(startedBody.guestType, "foreign");
  assert.equal(startedBody.requiredPassports, 3);

  const after = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=5", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status");
  const afterBody = await after.json();
  assert.equal(afterBody.registrationStatus, "in_person_pending");
  assert.equal(afterBody.requiredPassports, 3);
  assert.equal(afterBody.accessGranted, false);
});


test("admin can reset a pending in-person registration with zero received passports back to not started", async () => {
  const { env, store } = createEnvironment();
  await handleReservationSyncRequest(new Request("https://guide.example/api/reservations/sync", {
    method: "POST",
    headers: { authorization: "Bearer reservation_sync_test_5500", "content-type": "application/json" },
    body: JSON.stringify({
      room: "5",
      listingId: "1504732379219115485",
      records: [{ confirmationCode: "HMRESETREG5", checkInDate: "2027-08-13", checkOutDate: "2027-08-16" }]
    })
  }), env);
  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "5", confirmationCode: "HMRESETREG5" })
  }), env, "/api/stay/verify", null, new Date("2027-08-14T08:00:00.000Z"));
  const cookie = verified.headers.get("set-cookie").split(";")[0];

  await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "foreign", nonThaiGuestCount: 3, allNonThaiGuestsIncluded: true })
  }), env, "/api/stay/nationality");
  const handover = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/in-person-registration/start", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, nonThaiGuestCount: 3, confirmed: true })
  }), env, "/api/concierge/admin/in-person-registration/start");
  assert.equal((await handover.json()).status, "in_person_pending");

  const unauthorized = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/registration-reset", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, confirmed: true })
  }), env, "/api/concierge/admin/registration-reset");
  assert.equal(unauthorized.status, 401);

  const reset = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/registration-reset", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, confirmed: true })
  }), env, "/api/concierge/admin/registration-reset");
  assert.equal(reset.status, 200);
  assert.equal((await reset.json()).status, "not_started");

  const afterReset = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=5", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status");
  const afterResetBody = await afterReset.json();
  assert.equal(afterResetBody.registrationStatus, "not_started");
  assert.equal(afterResetBody.registrationIncomplete, true);
  assert.equal(afterResetBody.accessGranted, false);

  const reselect = await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "foreign", nonThaiGuestCount: 1, allNonThaiGuestsIncluded: true })
  }), env, "/api/stay/nationality");
  assert.equal(reselect.status, 200);
  assert.equal((await reselect.json()).requiredPassports, 1);
});

test("admin registration reset is blocked after passport evidence exists or in-person registration is complete", async () => {
  const { env, store } = createEnvironment();
  const reservationId = "stay_resetguard-12345678901234567890";

  store.registrationStatuses.set(reservationId, {
    guestType: "foreign",
    requiredPassports: 2,
    receivedPassports: 1,
    status: "in_person_pending",
    updatedAt: "2027-08-14T08:00:00.000Z"
  });
  store.passportRecords.push({
    id: "pass_reset_guard_1",
    reservationId,
    status: "uploaded",
    objectKey: "passport/test.jpg"
  });

  const withEvidence = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/registration-reset", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ reservationId, confirmed: true })
  }), env, "/api/concierge/admin/registration-reset");
  assert.equal(withEvidence.status, 409);
  assert.equal((await withEvidence.json()).error, "registration_reset_requires_staff_review");

  store.passportRecords.length = 0;
  store.registrationStatuses.set(reservationId, {
    guestType: "foreign",
    requiredPassports: 2,
    receivedPassports: 0,
    status: "in_person_complete",
    updatedAt: "2027-08-14T08:00:00.000Z"
  });
  const complete = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/registration-reset", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ reservationId, confirmed: true })
  }), env, "/api/concierge/admin/registration-reset");
  assert.equal(complete.status, 409);
  assert.equal((await complete.json()).error, "in_person_handover_not_pending");
});

test("admin UI keeps the in-person exception available before a guest declares a non-Thai count", async () => {
  const script = await readFile(new URL("../public/concierge-admin.js", import.meta.url), "utf8");
  assert.match(script, /Use in-person registration/);
  assert.match(script, /Number of non-Thai overnight guests whose original passports will be checked in person/);
  assert.match(script, /nonThaiGuestCount/);
  assert.match(script, /dataset\.inPersonAction = "start"/);
  assert.match(script, /\/api\/concierge\/admin\/in-person-registration\/start/);
  assert.match(script, /item\.registrationStatus === "in_person_pending"/);
  assert.match(script, /Reset guest registration/);
  assert.match(script, /dataset\.inPersonAction = "reset"/);
  assert.match(script, /\/api\/concierge\/admin\/registration-reset/);
  assert.match(script, /The guest will need to choose the registration option again/);
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
    "whatsapp_delivery_diagnostics",
    "whatsapp_diagnostic_dismissals",
    "concierge_alert_details",
    "booking_retry_snapshots",
    "booking_retry_group_details",
    "maintenance_reports",
    "admin_operation_audit",
    "stay_reservations",
    "stay_checkout_overrides",
    "verified_stay_sessions",
    "stay_registration_requirements",
    "spare_key_events",
    "spare_key_room_state",
    "translation_cache"
  ]) assert.ok(tables.includes(required), `${required} was not initialized`);

  await store.syncStayReservations({
    provider: "airbnb",
    listingId: "1504732379219115485",
    room: "5",
    complete: false,
    syncId: "schema-in-person",
    syncedAt: "2027-08-14T08:00:00.000Z",
    records: [{
      confirmationCodeHash: "schema-in-person-code-hash",
      checkInDate: "2027-08-13",
      checkOutDate: "2027-08-16",
      sourceRefHash: ""
    }]
  });
  const schemaReservation = database.prepare(
    "SELECT id FROM stay_reservations WHERE confirmation_code_hash = ?"
  ).get("schema-in-person-code-hash");
  const schemaInPerson = await store.startInPersonRegistration(
    schemaReservation.id,
    3,
    "2027-08-14T08:01:00.000Z"
  );
  assert.equal(schemaInPerson.ok, true);
  assert.equal(schemaInPerson.status, "in_person_pending");
  assert.equal(schemaInPerson.requiredPassports, 3);
  const schemaRegistration = await store.getStayRegistrationStatus(schemaReservation.id);
  assert.equal(schemaRegistration.guestType, "foreign");
  assert.equal(schemaRegistration.requiredPassports, 3);
  assert.equal(schemaRegistration.status, "in_person_pending");
  database.prepare("DELETE FROM stay_registration_requirements WHERE reservation_id = ?").run(schemaReservation.id);
  database.prepare("DELETE FROM stay_registration_status WHERE reservation_id = ?").run(schemaReservation.id);
  database.prepare("DELETE FROM stay_reservations WHERE id = ?").run(schemaReservation.id);

  const overview = await store.getAdminOverview();
  assert.equal(overview.totals.openAlerts, 0);
  assert.deepEqual(overview.deliveryDiagnostics, []);
  await store.recordAlertDelivery({
    id: "delivery_schema_diagnostic",
    alertId: "alert_schema_diagnostic",
    stage: "initial",
    status: "failed",
    errorCode: "132000",
    createdAt: new Date().toISOString()
  });
  await store.recordWhatsAppDiagnostic({
    id: "diagnostic_schema_test",
    deliveryId: "delivery_schema_diagnostic",
    alertId: "alert_schema_diagnostic",
    stage: "initial",
    templateName: "house_service_alert_v3",
    languageCode: "en_US",
    componentSchema: "body(5)[1:text,2:text,3:text,4:text,5:text]",
    httpStatus: 400,
    errorCode: "132000",
    errorSubcode: "2494073",
    errorType: "OAuthException",
    errorMessage: "Parameter count mismatch",
    errorDetails: "Expected a different count",
    traceId: "SAFE_TRACE",
    failureKind: "template_parameters",
    createdAt: new Date().toISOString()
  });
  const diagnosticOverview = await store.getAdminOverview();
  assert.equal(diagnosticOverview.deliveryDiagnostics.length, 1);
  assert.equal(diagnosticOverview.deliveryDiagnostics[0].templateName, "house_service_alert_v3");
  assert.equal(diagnosticOverview.deliveryDiagnostics[0].componentSchema, "body(5)[1:text,2:text,3:text,4:text,5:text]");
  assert.equal(diagnosticOverview.deliveryDiagnostics[0].legacyDiagnostic, false);
  const retryCreatedAt = new Date().toISOString();
  const retryExpiresAt = new Date(Date.now() + 86_400_000).toISOString();
  const retryAlertId = "alert_schema_booking_retry_123456789";
  await store.createAlert({
    id: retryAlertId,
    interactionId: "int_schema_booking_retry",
    dedupeKey: "schema-booking-retry-dedupe",
    severity: "attention",
    alertType: "booking_request",
    recipientGroup: "booking_with_owners",
    room: "11",
    roomVerified: true,
    summary: "Diving booking request",
    detailSummary: "Diving request — 4 guests\n2 × Fun Diving — Advanced certified\n2 × RAID Explorer 30 — current: Open Water",
    bangkokTime: "28 Aug 2026, 10:00",
    createdAt: retryCreatedAt,
    escalationDueAt: ""
  });
  await store.recordAlertDelivery({
    id: "delivery_schema_booking_retry",
    alertId: retryAlertId,
    stage: "initial",
    recipientHash: "safe-recipient-hash",
    recipientLabel: "Fah",
    providerMessageId: "",
    status: "failed",
    errorCode: "132000",
    createdAt: retryCreatedAt
  });
  assert.deepEqual(await store.upsertBookingRetrySnapshot({
    alertId: retryAlertId,
    bindingHash: "safe-binding-hash",
    reservationId: "stay_schema_retry",
    room: "11",
    kind: "diving",
    activity: "Diving",
    preferredDate: "30 Aug 2026",
    guestCount: "4",
    option: "Open Water Course",
    courseName: "",
    certificationLevel: "",
    preferredProvider: "Master Divers",
    notes: "Private attempt +66 81 234 5678",
    planMode: "different",
    groups: [
      { count: "2", activityType: "Fun Diving", currentCertification: "Advanced Open Water" },
      { count: "2", activityType: "Learn / Take a Course", agency: "RAID", course: "Explorer 30", currentCertification: "Open Water" }
    ],
    createdAt: retryCreatedAt,
    updatedAt: retryCreatedAt,
    expiresAt: retryExpiresAt
  }), { ok: true, alertId: retryAlertId });
  const retrySnapshots = await store.getBookingRetrySnapshots(
    "safe-binding-hash",
    "stay_schema_retry",
    "11",
    retryCreatedAt
  );
  assert.equal(retrySnapshots.length, 1);
  assert.equal(retrySnapshots[0].deliveryAttempts, 1);
  assert.equal(retrySnapshots[0].acceptedDeliveries, 0);
  assert.equal(retrySnapshots[0].notes.includes("+66 81 234 5678"), false);
  assert.equal(retrySnapshots[0].planMode, "different");
  assert.deepEqual(retrySnapshots[0].groups.map((group) => [group.count, group.activityType, group.agency || "", group.course || ""]), [
    ["2", "Fun Diving", "", ""],
    ["2", "Learn / Take a Course", "RAID", "Explorer 30"]
  ]);
  const detailOverview = await store.getAdminOverview();
  assert.match(detailOverview.alerts.find((item) => item.id === retryAlertId).detailSummary, /2 × Fun Diving[\s\S]*2 × RAID Explorer 30/);
  assert.equal((await store.getBookingAlertForRetry(retryAlertId)).id, retryAlertId);
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

test("owner can replace a forgotten direct-stay code without storing plaintext or disturbing an existing verified session", async () => {
  const { env, store } = createEnvironment();
  const created = await handleStayAdminRequest(new Request("https://guide.example/api/concierge/admin/direct-stays", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ room: "7", checkInDate: "2027-08-14", checkOutDate: "2027-08-19" })
  }), env, "/api/concierge/admin/direct-stays", store);
  const original = await created.json();

  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "7", confirmationCode: original.confirmationCode })
  }), env, "/api/stay/verify", null, new Date("2027-08-14T08:00:00.000Z"));
  assert.equal(verified.status, 200);
  const cookie = verified.headers.get("set-cookie").split(";")[0];

  const replaced = await handleStayAdminRequest(new Request("https://guide.example/api/concierge/admin/direct-stay-code", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, confirmed: true })
  }), env, "/api/concierge/admin/direct-stay-code", store);
  assert.equal(replaced.status, 200);
  const replacement = await replaced.json();
  assert.match(replacement.confirmationCode, /^HS[23456789A-HJ-NP-Z]{10}$/);
  assert.notEqual(replacement.confirmationCode, original.confirmationCode);
  assert.equal(replacement.welcomeUrl, "https://guide.example/room/7");
  assert.notEqual(store.stayReservations[0].confirmationCodeHash, replacement.confirmationCode);

  const oldCode = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "7", confirmationCode: original.confirmationCode })
  }), env, "/api/stay/verify", null, new Date("2027-08-14T08:02:00.000Z"));
  assert.equal(oldCode.status, 404);

  const newCode = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "7", confirmationCode: replacement.confirmationCode })
  }), env, "/api/stay/verify", null, new Date("2027-08-14T08:03:00.000Z"));
  assert.equal(newCode.status, 200);

  const existingSession = await handleStayGuestRequest(new Request("https://guide.example/api/stay/status?room=7", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/status", null, new Date("2027-08-14T08:04:00.000Z"));
  assert.equal(existingSession.status, 200);
  assert.equal((await existingSession.json()).verified, true);
});

test("direct-stay code replacement is owner-routed and refuses Airbnb reservations", async () => {
  const { env, store } = createEnvironment();
  store.stayReservations.push({
    id: `stay_${crypto.randomUUID()}`,
    provider: "airbnb",
    listingId: "1384311481900170410",
    room: "3",
    confirmationCodeHash: "synthetic_airbnb_hash",
    checkInDate: "2027-08-14",
    checkOutDate: "2027-08-19",
    status: "confirmed",
    updatedAt: "2027-08-14T00:00:00.000Z"
  });
  const response = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/direct-stay-code", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ reservationId: store.stayReservations[0].id, confirmed: true })
  }), env, "/api/concierge/admin/direct-stay-code");
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "direct_stay_required");
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
  assert.match(script, /Generate new stay code/);
  assert.match(script, /\/api\/concierge\/admin\/direct-stay-code/);
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

test("owners resolve then remove maintenance reports with private-photo cleanup and stable counts", async () => {
  const { env, store, passportBucket } = createEnvironment();
  const targetId = "maint_ownercleanuptarget-1234567890";
  const unrelatedId = "maint_ownercleanupother-1234567890";
  const targetAlertId = "alert_maintenancetarget-1234567890";
  const otherAlertId = "alert_maintenanceother-1234567890";
  const photoObjectKey = "maintenance/2026-08/private-owner-cleanup.png";
  const createdAt = "2026-08-28T03:00:00.000Z";
  store.maintenanceReports.push(
    {
      id: targetId,
      room: "6",
      issueType: "wifi_problem",
      severity: "attention",
      details: "Wi-Fi is unstable; private reply +66 81 234 5678.",
      feeAccepted: false,
      photoObjectKey,
      alertId: targetAlertId,
      status: "open",
      createdAt,
      resolvedAt: "",
      deleteAfter: "2026-09-27T03:00:00.000Z"
    },
    {
      id: unrelatedId,
      room: "8",
      issueType: "ac_not_cooling",
      severity: "attention",
      details: "AC needs checking.",
      feeAccepted: false,
      photoObjectKey: "",
      alertId: otherAlertId,
      status: "open",
      createdAt,
      resolvedAt: "",
      deleteAfter: "2026-09-27T03:00:00.000Z"
    }
  );
  store.alerts.push(
    { id: targetAlertId, status: "open", alertType: "maintenance_wifi_problem", severity: "attention", createdAt },
    { id: otherAlertId, status: "open", alertType: "maintenance_ac_not_cooling", severity: "attention", createdAt }
  );
  passportBucket.objects.set(photoObjectKey, new Uint8Array([1, 2, 3, 4]));

  const adminRequest = (path, body) => handleAdminRequest(new Request(`https://guide.example${path}`, {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify(body)
  }), env, path);
  const overviewRequest = () => handleAdminRequest(new Request("https://guide.example/api/concierge/admin/overview", {
    headers: { authorization: "Bearer admin_token_test_5500" }
  }), env, "/api/concierge/admin/overview");

  const before = await (await overviewRequest()).json();
  assert.equal(before.totals.openMaintenanceReports, 2);
  assert.equal(before.maintenanceReports.find((item) => item.id === targetId).hasPhoto, true);

  const premature = await adminRequest("/api/concierge/admin/maintenance-remove", {
    id: targetId,
    confirmation: "REMOVE RESOLVED REPORT"
  });
  assert.equal(premature.status, 409);
  assert.equal((await premature.json()).error, "resolve_required");
  assert.equal(passportBucket.objects.has(photoObjectKey), true);

  const resolved = await adminRequest("/api/concierge/admin/maintenance-resolve", { id: targetId });
  assert.equal(resolved.status, 200);
  assert.equal(store.maintenanceReports.find((item) => item.id === targetId).status, "resolved");
  assert.equal(store.alerts.find((item) => item.id === targetAlertId).status, "resolved");
  const afterResolve = await (await overviewRequest()).json();
  assert.equal(afterResolve.totals.openMaintenanceReports, 1);
  assert.equal(afterResolve.maintenanceReports.some((item) => item.id === targetId), true);

  const unconfirmed = await adminRequest("/api/concierge/admin/maintenance-remove", { id: targetId });
  assert.equal(unconfirmed.status, 400);
  assert.equal(passportBucket.objects.has(photoObjectKey), true);
  const removed = await adminRequest("/api/concierge/admin/maintenance-remove", {
    id: targetId,
    confirmation: "REMOVE RESOLVED REPORT"
  });
  assert.equal(removed.status, 200);
  assert.equal(passportBucket.objects.has(photoObjectKey), false);
  assert.equal(store.maintenanceReports.some((item) => item.id === targetId), false);
  assert.equal(store.maintenanceReports.some((item) => item.id === unrelatedId), true);
  assert.equal(store.alerts.find((item) => item.id === otherAlertId).status, "open");

  const reloaded = await (await overviewRequest()).json();
  assert.equal(reloaded.totals.openMaintenanceReports, 1);
  assert.equal(reloaded.maintenanceReports.some((item) => item.id === targetId), false);
  assert.equal(reloaded.maintenanceReports.some((item) => item.id === unrelatedId), true);
  assert.deepEqual(store.adminAudit.map((item) => item.action), ["maintenance_report_resolved", "maintenance_report_removed"]);
  assert.equal(store.adminAudit.every((item) => item.bangkokTime === formatBangkokAlertTime(new Date(item.createdAt))), true);
  assert.doesNotMatch(JSON.stringify(store.adminAudit), /66812345678|81 234 5678|private-owner-cleanup|meta|token/i);

  const adminHtml = await readFile(new URL("../public/concierge-admin.html", import.meta.url), "utf8");
  const adminScript = await readFile(new URL("../public/concierge-admin.js", import.meta.url), "utf8");
  assert.match(adminHtml, /<dialog id="adminConfirmDialog"/);
  assert.match(adminScript, /dataset\.maintenanceAction = "resolve"/);
  assert.match(adminScript, /dataset\.maintenanceAction = "remove"/);
  assert.match(adminScript, /confirmAdminAction\(\{[\s\S]*Remove resolved report\?/);
  assert.match(adminScript, /REMOVE RESOLVED REPORT/);
});

test("diagnostic dismissal changes visibility only and clearing remains limited to resolved alerts", async () => {
  const { env, store } = createEnvironment();
  const alertId = "alert_diagnosticparent-1234567890";
  const failedDeliveryId = "delivery_diagnostic_failed_1234567890";
  const firstDiagnosticId = "diagnostic_meta_failure_first_1234567890";
  const secondDiagnosticId = "diagnostic_meta_failure_second_1234567890";
  const createdAt = "2026-08-28T03:00:00.000Z";
  store.alerts.push({
    id: alertId,
    status: "open",
    alertType: "booking_request",
    severity: "attention",
    summary: "Private booking reply +66 81 234 5678; code 9753.",
    createdAt
  });
  store.alertDeliveries.push(
    {
      id: "delivery_diagnostic_accepted_1234567890",
      alertId,
      status: "accepted",
      providerMessageId: "wamid.safe",
      createdAt
    },
    {
      id: failedDeliveryId,
      alertId,
      status: "failed",
      providerMessageId: "",
      errorCode: "132018",
      createdAt
    }
  );
  store.whatsappDiagnostics.push({
    id: firstDiagnosticId,
    deliveryId: failedDeliveryId,
    alertId,
    status: "failed",
    templateName: "house_booking_alert_v2",
    errorCode: "132018",
    failureKind: "template_parameters",
    createdAt
  });

  const adminPost = (path, body) => handleAdminRequest(new Request(`https://guide.example${path}`, {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify(body)
  }), env, path);
  const overview = async () => (await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/overview", {
    headers: { authorization: "Bearer admin_token_test_5500" }
  }), env, "/api/concierge/admin/overview")).json();

  const before = await overview();
  assert.equal(before.deliveryDiagnostics.length, 1);
  assert.equal(before.alerts.find((item) => item.id === alertId).delivered, 1);
  assert.equal(before.alerts.find((item) => item.id === alertId).failed, 1);

  const badConfirmation = await adminPost("/api/concierge/admin/diagnostics/dismiss", { id: firstDiagnosticId });
  assert.equal(badConfirmation.status, 400);
  const dismissed = await adminPost("/api/concierge/admin/diagnostics/dismiss", {
    id: firstDiagnosticId,
    confirmation: "DISMISS DIAGNOSTIC"
  });
  assert.equal(dismissed.status, 200);
  const afterDismiss = await overview();
  assert.equal(afterDismiss.deliveryDiagnostics.length, 0);
  const unchangedAlert = afterDismiss.alerts.find((item) => item.id === alertId);
  assert.equal(unchangedAlert.status, "open");
  assert.equal(unchangedAlert.delivered, 1);
  assert.equal(unchangedAlert.failed, 1);
  assert.equal(store.alertDeliveries.find((item) => item.id === failedDeliveryId).status, "failed");

  store.whatsappDiagnostics.push({
    id: secondDiagnosticId,
    deliveryId: failedDeliveryId,
    alertId,
    templateName: "house_booking_alert_v2",
    errorCode: "132018",
    failureKind: "template_parameters",
    createdAt
  });
  const blockedClear = await adminPost("/api/concierge/admin/diagnostics/clear", {
    alertId,
    confirmation: "CLEAR RESOLVED DIAGNOSTICS"
  });
  assert.equal(blockedClear.status, 409);
  assert.equal((await blockedClear.json()).error, "alert_not_resolved");
  assert.equal((await overview()).deliveryDiagnostics.length, 1);

  const resolved = await adminPost("/api/concierge/admin/alerts/resolve", { id: alertId });
  assert.equal(resolved.status, 200);
  const cleared = await adminPost("/api/concierge/admin/diagnostics/clear", {
    alertId,
    confirmation: "CLEAR RESOLVED DIAGNOSTICS"
  });
  assert.equal(cleared.status, 200);
  assert.equal((await cleared.json()).cleared, 2);
  assert.equal((await overview()).deliveryDiagnostics.length, 0);
  assert.equal(store.alerts.find((item) => item.id === alertId).status, "resolved");
  assert.deepEqual(store.alertDeliveries.map((item) => item.status), ["accepted", "failed"]);
  assert.deepEqual(store.adminAudit.map((item) => item.action), [
    "whatsapp_diagnostic_dismissed",
    "whatsapp_alert_diagnostics_cleared"
  ]);
  assert.equal(store.adminAudit.every((item) => item.bangkokTime === formatBangkokAlertTime(new Date(item.createdAt))), true);
  assert.doesNotMatch(JSON.stringify(store.adminAudit), /66812345678|81 234 5678|9753|wamid|132018|token/i);

  const adminScript = await readFile(new URL("../public/concierge-admin.js", import.meta.url), "utf8");
  assert.match(adminScript, /dataset\.diagnosticAction = item\.alertStatus === "resolved" \? "clear" : "dismiss"/);
  assert.match(adminScript, /parent alert and delivery result will not change/i);
  assert.match(adminScript, /DISMISS DIAGNOSTIC/);
  assert.match(adminScript, /CLEAR RESOLVED DIAGNOSTICS/);
});

test("24-hour spare-key release uses the verified session, confirms the current fee and never alerts the code", async () => {
  const { env, store } = createEnvironment({
    SPARE_KEY_CODES: JSON.stringify({ "1": "8642" }),
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66 64 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    }),
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
  const lostKeyStatus = await currentLostKeyRequest(env, cookie, "1", afterHours);

  const noFee = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ feeAccepted: false, lostKeyRequestToken: lostKeyStatus.lostKeyRequestToken })
  }), env, "/api/stay/spare-key", null, afterHours);
  assert.equal(noFee.status, 400);
  assert.equal((await noFee.json()).error, "fee_acceptance_required");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ messages: [{ id: "wamid.key-release" }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
  try {
    const accepted = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: lostKeyStatus.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, afterHours);
    const acceptedBody = await accepted.json();
    assert.equal(accepted.status, 200);
    assert.equal(acceptedBody.teamNotificationSubmitted, true);
    assert.equal(acceptedBody.canViewSpareKey, true);
    assert.equal("keyBoxCode" in acceptedBody, false);
    assert.equal(store.spareKeyEvents[0].feeAccepted, true);
    assert.equal(store.spareKeyEvents[0].codeReleased, false);
    assert.equal(store.spareKeyRotations.get("1") === true, false);
    const released = await viewAuthorizedSpareKey(env, cookie, acceptedBody, afterHours);
    const body = await released.json();
    assert.equal(body.keyBoxCode, "8642");
    assert.equal(body.lostKeyFeeThb, 500);
    assert.equal(body.teamNotificationSubmitted, true);
    assert.equal(released.headers.get("cache-control"), "no-store, max-age=0");
    assert.equal(store.spareKeyRotations.get("1"), true);
    assert.equal(store.alerts[0].roomVerified, true);
    assert.doesNotMatch(JSON.stringify(withoutOpaqueTestIdentifiers(store.alerts)), /8642/);
    assert.doesNotMatch(JSON.stringify(store.alerts), /HMKEY12345/);

    const repeated = await handleStayGuestRequest(new Request("https://guide.example/api/stay/spare-key", {
      method: "POST",
      headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: lostKeyStatus.lostKeyRequestToken })
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
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66 64 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    }),
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
  const lostKeyStatus = await currentLostKeyRequest(env, cookie, "2", afterHours);

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
      body: JSON.stringify({ feeAccepted: true, lostKeyRequestToken: lostKeyStatus.lostKeyRequestToken })
    }), env, "/api/stay/spare-key", null, afterHours);
    assert.equal(automaticAttempts, 3);
    assert.equal(failed.status, 503);
    assert.equal((await failed.json()).error, "team_notification_failed");
    assert.equal(store.spareKeyEvents.length, 0);
    assert.equal(store.spareKeyRotations.get("2") === true, false);
    assert.doesNotMatch(JSON.stringify(withoutOpaqueTestIdentifiers(store.alerts)), /9753/);
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
  assert.match(html, /<a class="admin-login-link admin-footer-link" href="\/concierge-admin">Admin Login<\/a>/);
  assert.match(html, /id="createPassportUpload"/);
  assert.doesNotMatch(html, /id="providePassportsInPerson"/);
  assert.doesNotMatch(html, /Provide passports in person/);
  assert.doesNotMatch(html, /I will provide all passports in person/);
  assert.match(html, /Enter your stay code to unlock your private room guide/);
  assert.match(html, /Passport information is required for every non-Thai adult and child staying overnight/);
  assert.match(html, /Used only for TM30 registration\. Your room guide opens after all required passports are uploaded\./);
  assert.doesNotMatch(html, /Room location, arrival photos, Wi-Fi and stay instructions remain protected until this is complete/);
  assert.doesNotMatch(html, /This confirms that this permanent link belongs to your booked room/);
  const entry = await readFile(new URL("../public/registration-entry.js", import.meta.url), "utf8");
  assert.doesNotMatch(entry, /\/api\/stay\/in-person-passports/);
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
    const firstBody = await first.json();
    assert.match(firstBody.answer, /what kind of snorkeling trip/i);
    assert.doesNotMatch(firstBody.answer, /country code|payment/i);
    assert.equal(store.alerts.length, 0);
    const option = await handleConciergeRequest(guestRequest("Private trip", {
      workflowState: firstBody.workflow
    }), env);
    const optionBody = await option.json();
    assert.match(optionBody.answer, /country code/i);
    assert.deepEqual(optionBody.workflow.missing, ["contact"]);
    assert.equal(store.alerts.length, 0);
    await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      workflowState: optionBody.workflow
    }), env);
    assert.equal(store.alerts.length, 1);
    assert.doesNotMatch(JSON.stringify(store.interactions), /66812345678|81 234 5678/);
    assert.doesNotMatch(JSON.stringify(store.alerts), /66812345678|81 234 5678/);
    assert.match(payload.template.components[0].parameters[5].text, /Guest reply: \+66812345678/);
    assert.match(payload.template.components[0].parameters[3].text, /\d{2} \w{3,4} \d{4}/);
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

test("all active Meta templates use their exact approved body schemas", () => {
  const recipient = { label: "Team", phone: "66810000002" };
  const env = {
    WHATSAPP_ALERT_TEMPLATE_LANGUAGE: "en_US",
    WHATSAPP_SERVICE_TEMPLATE_NAME: "house_service_alert_v3",
    WHATSAPP_LUGGAGE_TEMPLATE_NAME: "house_luggage_alert_v2",
    WHATSAPP_BOOKING_TEMPLATE_NAME: "house_booking_alert_v2",
    WHATSAPP_URGENT_TEMPLATE_NAME: "house_urgent_alert_v2",
    WHATSAPP_LOST_KEY_TEMPLATE_NAME: "house_lost_key_alert_v3",
    WHATSAPP_STATUS_TEMPLATE_NAME: "house_alert_status_v1"
  };
  const base = {
    id: "alert_schema_reference",
    room: "3",
    createdAt: "2026-08-28T11:00:00.000Z",
    bangkokTime: "28 Aug 2026, 18:00",
    severity: "attention"
  };
  const values = (built) => built.payload.template.components[0].parameters.map((item) => item.text);
  const assertBodyOnly = (built, name, count) => {
    assert.equal(built.ok, true);
    assert.equal(built.payload.template.name, name);
    assert.equal(built.payload.template.language.code, "en");
    assert.equal(built.payload.template.components.length, 1);
    assert.equal(built.payload.template.components[0].type, "body");
    assert.equal(built.payload.template.components[0].parameters.length, count);
    assert.equal(built.payload.template.components.some((component) => component.type === "header"), false);
  };

  const service = buildWhatsAppTemplatePayload({ ...base, alertType: "stay_support", summary: "I need fresh towels." }, recipient, env);
  assertBodyOnly(service, "house_service_alert_v3", 5);
  assert.deepEqual(values(service), [base.id, "Room 3", "Fresh towels", base.bangkokTime, "I need fresh towels."]);

  const luggage = buildWhatsAppTemplatePayload({
    ...base,
    alertType: "luggage_storage",
    summary: "Please store the bags near checkout.",
    luggageRequest: { context: "Departure", bagCount: "2", requestedTime: "3:00 PM" },
    privateReplyContact: "+66 81 234 5678"
  }, recipient, env);
  assertBodyOnly(luggage, "house_luggage_alert_v2", 6);
  assert.deepEqual(values(luggage).slice(0, 5), [base.id, "Room 3", "Departure", "2", "3:00 PM"]);
  assert.match(values(luggage)[5], /Guest reply: \+66812345678/);

  const booking = buildWhatsAppTemplatePayload({
    ...base,
    alertType: "booking_request",
    summary: "Please arrange a calm morning dive.",
    bookingRequest: {
      kind: "diving",
      activity: "Diving",
      preferredDate: "29 Aug 2026",
      guestCount: "2",
      option: "Fun Diving",
      certificationLevel: "Advanced Open Water",
      notes: "Calm morning preferred"
    },
    privateReplyContact: "+66 81 234 5678"
  }, recipient, env);
  assertBodyOnly(booking, "house_booking_alert_v2", 6);
  assert.deepEqual(values(booking).slice(0, 5), [base.id, "Room 3", "Diving", "29 Aug 2026", "2"]);
  assert.match(values(booking)[5], /Fun Diving[\s\S]*Certification: Advanced Open Water[\s\S]*Guest reply: \+66812345678/);

  const urgent = buildWhatsAppTemplatePayload({ ...base, alertType: "property_emergency", severity: "critical", summary: "Water is flooding the room." }, recipient, env);
  assertBodyOnly(urgent, "house_urgent_alert_v2", 5);
  assert.deepEqual(values(urgent), [base.id, "Room 3", "Flooding / major water leak", base.bangkokTime, "Water is flooding the room."]);

  const lostKey = buildWhatsAppTemplatePayload({ ...base, alertType: "verified_spare_key_release", summary: "Verified spare-key release requested." }, recipient, env);
  assertBodyOnly(lostKey, "house_lost_key_alert_v3", 3);
  assert.deepEqual(values(lostKey), [base.id, "Room 3", base.bangkokTime]);

  const status = buildWhatsAppStatusPayload({ ...base, alertType: "stay_support", summary: "Fresh towels" }, recipient, "ACKNOWLEDGED", "Su", env);
  assertBodyOnly(status, "house_alert_status_v1", 5);
  assert.deepEqual(values(status), [base.id, "Room 3", "Fresh towels", "Su", "ACKNOWLEDGED"]);
});

test("Meta BODY serialization removes invalid whitespace without changing booking parameter order or privacy", () => {
  const recipient = { label: "Team", phone: "66810000002" };
  const rawContact = "+66 81 234 5678";
  const alert = {
    id: "alert_whitespace_booking_reference",
    room: "11",
    alertType: "booking_request",
    recipientGroup: "booking_with_owners",
    severity: "attention",
    summary: "I wanna go diving\r\n30.08.2026\tOpen Water     please",
    bangkokTime: "28 Aug 2026, 18:00",
    createdAt: "2026-08-28T11:00:00.000Z",
    bookingRequest: {
      kind: "diving",
      activity: "Diving\tCourse",
      preferredDate: "30.08.2026\r\n09:00",
      guestCount: "4",
      option: "Open Water",
      certificationLevel: "",
      notes: "I wanna go diving\n30.08.2026\tOpen Water      with a calm group"
    },
    privateReplyContact: rawContact
  };
  const built = buildWhatsAppTemplatePayload(alert, recipient, {
    WHATSAPP_BOOKING_TEMPLATE_NAME: "house_booking_alert_v2"
  });
  const parameters = built.payload.template.components[0].parameters;
  const values = parameters.map((parameter) => parameter.text);

  assert.equal(built.ok, true);
  assert.equal(built.payload.template.name, "house_booking_alert_v2");
  assert.equal(built.payload.template.language.code, "en");
  assert.equal(built.payload.template.components.length, 1);
  assert.equal(parameters.length, 6);
  assert.deepEqual(parameters.map((parameter) => parameter.type), ["text", "text", "text", "text", "text", "text"]);
  assert.deepEqual(values.slice(0, 5), [
    alert.id,
    "Room 11",
    "Diving Course",
    "30.08.2026 09:00",
    "4"
  ]);
  assert.match(values[5], /Open Water · I wanna go diving 30\.08\.2026 Open Water with a calm group/);
  assert.match(values[5], /I wanna go diving 30\.08\.2026 Open Water please/);
  assert.match(values[5], /Guest reply: \+66812345678$/);
  values.forEach((value) => {
    assert.doesNotMatch(value, /[\r\n\t]/);
    assert.doesNotMatch(value, /\s{2,}/u);
  });
  assert.equal(values.slice(0, 5).some((value) => /66812345678|81 234 5678/.test(value)), false);
});

test("the centralized Meta text sanitizer protects service, status and future action-template BODY values", () => {
  const recipient = { label: "Team", phone: "66810000002" };
  const base = {
    id: "alert_whitespace_shared_boundary",
    room: "3",
    alertType: "stay_support",
    severity: "attention",
    summary: "Please bring\r\nnew\t towels       to the room.",
    privateReplyContact: "+66 81 234 5678",
    bangkokTime: "28 Aug 2026,\t18:00",
    createdAt: "2026-08-28T11:00:00.000Z"
  };
  const actionMappings = {
    WHATSAPP_STAFF_ACTIONS_ENABLED: "true",
    WHATSAPP_SERVICE_ACTION_TEMPLATE_NAME: "house_service_alert_actions_v3",
    WHATSAPP_LUGGAGE_ACTION_TEMPLATE_NAME: "house_luggage_alert_actions_v2",
    WHATSAPP_BOOKING_ACTION_TEMPLATE_NAME: "house_booking_alert_actions_v2",
    WHATSAPP_URGENT_ACTION_TEMPLATE_NAME: "house_urgent_alert_actions_v2",
    WHATSAPP_LOST_KEY_ACTION_TEMPLATE_NAME: "house_lost_key_alert_actions_v2"
  };
  const cases = [
    buildWhatsAppTemplatePayload(base, recipient, {}),
    buildWhatsAppTemplatePayload(base, recipient, actionMappings),
    buildWhatsAppStatusPayload(base, recipient, "ACKNOWLEDGED", "Su\r\n\t     Team", {
      WHATSAPP_STATUS_TEMPLATE_NAME: "house_alert_status_v1"
    })
  ];

  for (const built of cases) {
    assert.equal(built.ok, true);
    const body = built.payload.template.components.find((component) => component.type === "body");
    assert.ok(body);
    body.parameters.forEach((parameter) => {
      assert.equal(parameter.type, "text");
      assert.doesNotMatch(parameter.text, /[\r\n\t]/);
      assert.doesNotMatch(parameter.text, /\s{2,}/u);
    });
  }
  assert.equal(cases[0].payload.template.components[0].parameters.length, 5);
  assert.equal(cases[0].payload.template.components[0].parameters[4].text, "Please bring new towels to the room. Guest reply: +66812345678");
  assert.equal(cases[1].payload.template.name, "house_service_alert_actions_v3");
  assert.equal(cases[1].payload.template.components[0].parameters.length, 5);
  assert.equal(cases[2].payload.template.components[0].parameters.length, 5);
  assert.equal(cases[2].payload.template.components[0].parameters[3].text, "Su Team");

  const diagnostic = buildWhatsAppFailureDiagnostic({
    built: cases[0],
    response: new Response(JSON.stringify({}), { status: 400 }),
    responseBody: { error: {
      code: 132018,
      message: "There’s an issue with the parameters in your template",
      error_data: { details: "Param text cannot have new-line/tab characters or more than 4 consecutive spaces" }
    } }
  });
  assert.equal(diagnostic.errorCode, "132018");
  assert.equal(diagnostic.failureKind, "template_parameters");
  assert.doesNotMatch(JSON.stringify(diagnostic), /66812345678|81 234 5678|Please bring new towels/);
});

test("release configuration activates the five exact reviewed staff quick-action templates", async () => {
  const wrangler = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
  const vars = wrangler.vars;
  assert.equal(vars.EXPLORE_ENABLED, "false");
  assert.equal(vars.WHATSAPP_STAFF_ACTIONS_ENABLED, "true");
  assert.equal(vars.WHATSAPP_SERVICE_ACTION_TEMPLATE_NAME, "house_service_alert_actions_v3");
  assert.equal(vars.WHATSAPP_LUGGAGE_ACTION_TEMPLATE_NAME, "house_luggage_alert_actions_v2");
  assert.equal(vars.WHATSAPP_BOOKING_ACTION_TEMPLATE_NAME, "house_booking_alert_actions_v2");
  assert.equal(vars.WHATSAPP_URGENT_ACTION_TEMPLATE_NAME, "house_urgent_alert_actions_v2");
  assert.equal(vars.WHATSAPP_LOST_KEY_ACTION_TEMPLATE_NAME, "house_lost_key_alert_actions_v2");
  assert.equal(whatsappAlertConfiguration(vars).staffQuickActionsEnabled, true);
  assert.equal(Object.values(whatsappAlertConfiguration(vars).staffQuickActionTemplates).length, 5);
  const built = buildWhatsAppTemplatePayload({
    id: "alert_release_config_1234567890",
    room: "6",
    alertType: "stay_support",
    severity: "attention",
    summary: "Fresh towels requested.",
    createdAt: "2026-08-29T08:00:00.000Z",
    bangkokTime: "29 Aug 2026, 15:00"
  }, { label: "Su", phone: "66640000001" }, vars);
  assert.equal(built.payload.template.name, "house_service_alert_actions_v3");
  assert.equal(built.payload.template.language.code, "en");
  assert.deepEqual(built.payload.template.components.slice(1).map((component) => component.index), ["0", "1"]);
});

test("staff quick-action templates fail closed and bind both actions to the exact alert", () => {
  const recipient = { label: "Team", phone: "66810000002" };
  const id = "alert_12345678-1234-1234-1234-123456789077";
  const base = {
    id,
    room: "3",
    createdAt: "2026-08-28T11:00:00.000Z",
    bangkokTime: "28 Aug 2026, 18:00",
    severity: "attention",
    summary: "Guest requested assistance."
  };
  const mappings = {
    WHATSAPP_SERVICE_ACTION_TEMPLATE_NAME: "house_service_alert_actions_v3",
    WHATSAPP_LUGGAGE_ACTION_TEMPLATE_NAME: "house_luggage_alert_actions_v2",
    WHATSAPP_BOOKING_ACTION_TEMPLATE_NAME: "house_booking_alert_actions_v2",
    WHATSAPP_URGENT_ACTION_TEMPLATE_NAME: "house_urgent_alert_actions_v2",
    WHATSAPP_LOST_KEY_ACTION_TEMPLATE_NAME: "house_lost_key_alert_actions_v2"
  };
  const disabled = buildWhatsAppTemplatePayload({ ...base, alertType: "stay_support" }, recipient, mappings);
  assert.equal(disabled.payload.template.name, "house_service_alert_v3");
  assert.equal(disabled.payload.template.components.length, 1);

  const partial = buildWhatsAppTemplatePayload({ ...base, alertType: "stay_support" }, recipient, {
    WHATSAPP_STAFF_ACTIONS_ENABLED: "true",
    WHATSAPP_SERVICE_ACTION_TEMPLATE_NAME: "house_service_alert_actions_v3"
  });
  assert.equal(partial.payload.template.name, "house_service_alert_v3");
  assert.equal(partial.payload.template.components.length, 1);

  const env = { ...mappings, WHATSAPP_STAFF_ACTIONS_ENABLED: "true" };
  const fixtures = [
    [{ ...base, alertType: "stay_support" }, "house_service_alert_actions_v3", 5],
    [{ ...base, alertType: "luggage_storage", luggageRequest: { context: "Arrival", requestedDate: "29 Aug 2026", requestedTime: "2:00 PM", bagCount: "3" } }, "house_luggage_alert_actions_v2", 6],
    [{ ...base, alertType: "booking_request", bookingRequest: { kind: "ferry", activity: "Ferry tickets", preferredDate: "29 Aug 2026", guestCount: "2", pickupLocation: "Koh Tao", destination: "Koh Samui", notes: "Morning preferred" } }, "house_booking_alert_actions_v2", 6],
    [{ ...base, alertType: "property_emergency", severity: "critical" }, "house_urgent_alert_actions_v2", 5],
    [{ ...base, alertType: "verified_spare_key_release" }, "house_lost_key_alert_actions_v2", 3]
  ];
  for (const [alert, templateName, bodyCount] of fixtures) {
    const built = buildWhatsAppTemplatePayload(alert, recipient, env);
    assert.equal(built.ok, true, templateName);
    assert.equal(built.payload.template.name, templateName, templateName);
    assert.equal(built.payload.template.language.code, "en", templateName);
    assert.equal(built.payload.template.components[0].parameters.length, bodyCount, templateName);
    assert.deepEqual(built.payload.template.components.slice(1).map((component) => ({
      type: component.type,
      subType: component.sub_type,
      index: component.index,
      parameterType: component.parameters[0].type
    })), [
      { type: "button", subType: "quick_reply", index: "0", parameterType: "payload" },
      { type: "button", subType: "quick_reply", index: "1", parameterType: "payload" }
    ], templateName);
    assert.equal(built.payload.template.components[1].parameters[0].payload, `HOUSE_ALERT|RECEIVED|${id}`, templateName);
    assert.equal(built.payload.template.components[2].parameters[0].payload, `HOUSE_ALERT|RESOLVE|${id}`, templateName);
  }

  const accidentalServiceV1 = {
    ...env,
    WHATSAPP_SERVICE_ACTION_TEMPLATE_NAME: "house_service_alert_actions_v1"
  };
  assert.equal(whatsappAlertConfiguration(accidentalServiceV1).staffQuickActionsEnabled, false);
  const rejectedV1 = buildWhatsAppTemplatePayload({ ...base, alertType: "stay_support" }, recipient, accidentalServiceV1);
  assert.equal(rejectedV1.payload.template.name, "house_service_alert_v3");
  assert.equal(rejectedV1.payload.template.components.length, 1);
});

test("template validation supports deliberate v1 rollback and rejects unknown or malformed schemas", () => {
  const recipient = { label: "Team", phone: "66810000002" };
  const alert = {
    id: "alert_rollback_reference",
    room: "4",
    alertType: "stay_support",
    severity: "attention",
    summary: "Please bring soap.",
    bangkokTime: "28 Aug 2026, 18:00",
    createdAt: "2026-08-28T11:00:00.000Z"
  };
  const legacy = buildWhatsAppTemplatePayload(alert, recipient, { WHATSAPP_SERVICE_TEMPLATE_NAME: "house_service_alert_v1" });
  assert.equal(legacy.ok, true);
  assert.equal(legacy.payload.template.name, "house_service_alert_v1");
  assert.equal(legacy.payload.template.language.code, "en_US");
  assert.equal(legacy.bodyParameterCount, 5);
  assert.deepEqual(validateWhatsAppTemplateParameters("house_service_alert_v3", "service", ["1", "2", "3", "4"]), {
    ok: false,
    name: "house_service_alert_v3",
    errorCode: "parameter_count_mismatch"
  });
  const unknown = buildWhatsAppTemplatePayload(alert, recipient, { WHATSAPP_SERVICE_TEMPLATE_NAME: "unapproved_service_template" });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.errorCode, "unmapped_template");
});

test("every deliberate v1 rollback template keeps its approved English US translation", () => {
  const recipient = { label: "Team", phone: "66810000002" };
  const base = {
    id: "alert_legacy_language_reference",
    room: "4",
    severity: "attention",
    summary: "Legacy rollback check",
    bangkokTime: "28 Aug 2026, 18:00",
    createdAt: "2026-08-28T11:00:00.000Z"
  };
  const cases = [
    buildWhatsAppTemplatePayload({ ...base, alertType: "stay_support" }, recipient, { WHATSAPP_SERVICE_TEMPLATE_NAME: "house_service_alert_v1" }),
    buildWhatsAppTemplatePayload({ ...base, alertType: "luggage_storage", luggageRequest: { context: "Departure", bagCount: "2", requestedTime: "1 PM" } }, recipient, { WHATSAPP_LUGGAGE_TEMPLATE_NAME: "house_luggage_alert_v1" }),
    buildWhatsAppTemplatePayload({ ...base, alertType: "booking_request" }, recipient, { WHATSAPP_BOOKING_TEMPLATE_NAME: "house_booking_alert_v1" }),
    buildWhatsAppTemplatePayload({ ...base, alertType: "property_emergency", severity: "critical" }, recipient, { WHATSAPP_URGENT_TEMPLATE_NAME: "house_urgent_alert_v1" }),
    buildWhatsAppTemplatePayload({ ...base, alertType: "verified_spare_key_release" }, recipient, { WHATSAPP_LOST_KEY_TEMPLATE_NAME: "house_lost_key_alert_v1" })
  ];
  cases.forEach((built) => {
    assert.equal(built.ok, true);
    assert.equal(built.payload.template.language.code, "en_US");
  });
});

test("production 132001 regression sends service v3 as generic English with exactly five BODY parameters", () => {
  const built = buildWhatsAppTemplatePayload({
    id: "alert_production_132001_regression",
    room: "11",
    alertType: "stay_support",
    severity: "attention",
    summary: "I need fresh towels.",
    bangkokTime: "28 Aug 2026, 10:32",
    createdAt: "2026-08-28T03:32:00.000Z"
  }, { label: "Team", phone: "66810000002" }, {
    WHATSAPP_ALERT_TEMPLATE_LANGUAGE: "en_US",
    WHATSAPP_SERVICE_TEMPLATE_NAME: "house_service_alert_v3"
  });
  assert.equal(built.ok, true);
  assert.equal(built.payload.template.name, "house_service_alert_v3");
  assert.equal(built.payload.template.language.code, "en");
  assert.deepEqual(built.payload.template.components.map((component) => component.type), ["body"]);
  assert.equal(built.payload.template.components[0].parameters.length, 5);
  assert.deepEqual(built.payload.template.components[0].parameters.map((parameter) => parameter.type), ["text", "text", "text", "text", "text"]);
  const diagnostic = buildWhatsAppFailureDiagnostic({
    built,
    response: new Response(JSON.stringify({}), { status: 404 }),
    responseBody: { error: {
      type: "OAuthException",
      code: 132001,
      message: "(#132001) Template name does not exist in the translation",
      error_data: { details: "template name (house_service_alert_v3) does not exist in en_US" }
    } }
  });
  assert.equal(diagnostic.httpStatus, 404);
  assert.equal(diagnostic.errorCode, "132001");
  assert.equal(diagnostic.failureKind, "template_or_language");
  assert.equal(diagnostic.languageCode, "en");
});

test("all active templates expose their exact value-free production request shape", () => {
  const recipient = { label: "Team", phone: "66810000002" };
  const env = {
    WHATSAPP_ALERT_TEMPLATE_LANGUAGE: "en_US",
    WHATSAPP_STATUS_TEMPLATE_NAME: "house_alert_status_v1"
  };
  const base = {
    id: "alert_shape_reference",
    room: "11",
    summary: "I need fresh towels.",
    bangkokTime: "28 Aug 2026, 10:32",
    createdAt: "2026-08-28T03:32:00.000Z",
    severity: "attention"
  };
  const cases = [
    [buildWhatsAppTemplatePayload({ ...base, alertType: "stay_support" }, recipient, env), "house_service_alert_v3", 5],
    [buildWhatsAppTemplatePayload({ ...base, alertType: "luggage_storage", luggageRequest: { context: "Departure", bagCount: "2", requestedTime: "1 PM" } }, recipient, env), "house_luggage_alert_v2", 6],
    [buildWhatsAppTemplatePayload({ ...base, alertType: "booking_request" }, recipient, env), "house_booking_alert_v2", 6],
    [buildWhatsAppTemplatePayload({ ...base, alertType: "property_emergency", severity: "critical" }, recipient, env), "house_urgent_alert_v2", 5],
    [buildWhatsAppTemplatePayload({ ...base, alertType: "verified_spare_key_release" }, recipient, env), "house_lost_key_alert_v3", 3],
    [buildWhatsAppStatusPayload(base, recipient, "ACKNOWLEDGED", "Su", env), "house_alert_status_v1", 5]
  ];

  for (const [built, name, count] of cases) {
    const diagnostic = buildWhatsAppFailureDiagnostic({
      built,
      response: new Response(JSON.stringify({}), { status: 400 }),
      responseBody: { error: { code: 131008 } }
    });
    assert.equal(diagnostic.templateName, name);
    assert.equal(diagnostic.languageCode, "en");
    assert.equal(diagnostic.componentSchema, `body(${count})[${Array.from({ length: count }, (_, index) => `${index + 1}:text`).join(",")}]`);
    assert.doesNotMatch(JSON.stringify(diagnostic), /alert_shape_reference|Room 11|fresh towels|66810000002/);
  }
});

test("sanitized Meta diagnostics retain the real provider failure without parameter or recipient data", async () => {
  const rawContact = "+66 81 234 5678";
  const recipients = JSON.stringify({ support: [{ label: "Su", phone: "+66 64 000 0001" }] });
  const alert = {
    id: "alert_production_service_failure",
    recipientGroup: "support",
    room: "11",
    alertType: "stay_support",
    severity: "attention",
    summary: `I need fresh towels. Reply on ${rawContact}`,
    bangkokTime: "28 Aug 2026, 10:32",
    createdAt: "2026-08-28T03:32:00.000Z"
  };
  const { env, store } = createEnvironment({
    WHATSAPP_ACCESS_TOKEN: "EA_TEST_SECRET_SHOULD_NOT_APPEAR_123456789",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    META_APP_SECRET: "meta-app-secret",
    WHATSAPP_ALERT_RECIPIENTS: recipients
  });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const safeLogs = [];
  console.error = (...values) => safeLogs.push(values.join(" "));
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      message: `Template parameter ${alert.summary} was rejected for ${rawContact}`,
      type: "OAuthException",
      code: 132000,
      error_subcode: 2494073,
      error_data: { details: `body parameter ${alert.bangkokTime} has the wrong count` },
      fbtrace_id: "SAFE_TRACE_123"
    }
  }), { status: 400, headers: { "content-type": "application/json" } });
  try {
    assert.deepEqual(await dispatchConciergeAlert(alert, env), { attempted: 1, accepted: 0 });
    assert.equal(store.whatsappDiagnostics.length, 1);
    const diagnostic = store.whatsappDiagnostics[0];
    assert.equal(diagnostic.templateName, "house_service_alert_v3");
    assert.equal(diagnostic.languageCode, "en");
    assert.equal(diagnostic.componentSchema, "body(5)[1:text,2:text,3:text,4:text,5:text]");
    assert.equal(diagnostic.httpStatus, 400);
    assert.equal(diagnostic.errorCode, "132000");
    assert.equal(diagnostic.errorSubcode, "2494073");
    assert.equal(diagnostic.errorType, "OAuthException");
    assert.equal(diagnostic.failureKind, "template_parameters");
    assert.equal(diagnostic.traceId, "SAFE_TRACE_123");
    const retained = JSON.stringify({ diagnostic, safeLogs });
    assert.doesNotMatch(retained, /66812345678|81 234 5678|66640000001|EA_TEST_SECRET|meta-app-secret/);
    assert.doesNotMatch(retained, /I need fresh towels|28 Aug 2026/);
    assert.match(diagnostic.errorMessage, /\[parameter\]/);
    assert.match(diagnostic.errorDetails, /\[parameter\]/);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

test("owner booking alerts expose sanitized alert-bound Meta diagnostics with real attempt counts", async () => {
  const now = new Date("2026-08-28T03:00:00.000Z");
  const sessionId = "session_owner_booking_diagnostic_12345";
  const rawContact = "+66 81 234 5678";
  const accessToken = "EA_OWNER_DIAGNOSTIC_SECRET_123456789";
  const { env } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: accessToken,
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-test",
    META_APP_SECRET: "owner-diagnostic-app-secret",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  console.error = () => {};
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      message: `Booking template rejected for ${rawContact}; Bearer ${accessToken}`,
      type: "OAuthException",
      code: 132000,
      error_subcode: 2494073,
      error_data: { details: `BODY parameter containing ${rawContact} has the wrong count` },
      fbtrace_id: "BOOKING_TRACE_SAFE_24"
    }
  }), { status: 400, headers: { "content-type": "application/json" } });
  try {
    const { failedBody } = await createFailedOpenWaterBooking(env, now, { sessionId });
    const overview = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/overview", {
      headers: { authorization: "Bearer admin_token_test_5500" }
    }), env, "/api/concierge/admin/overview");
    assert.equal(overview.status, 200);
    const body = await overview.json();
    const alert = body.alerts.find((item) => item.id === failedBody.workflow.retryAlertId);
    assert.equal(alert.alertType, "booking_request");
    assert.equal(alert.recipientGroup, "booking_with_owners");
    assert.equal(alert.attempted, 3);
    assert.equal(alert.delivered, 0);
    assert.equal(alert.failed, 3);
    const diagnostic = body.deliveryDiagnostics.find((item) => item.alertId === alert.id);
    assert.equal(diagnostic.templateName, "house_booking_alert_v2");
    assert.equal(diagnostic.languageCode, "en");
    assert.equal(diagnostic.componentSchema, "body(6)[1:text,2:text,3:text,4:text,5:text,6:text]");
    assert.equal(diagnostic.httpStatus, 400);
    assert.equal(diagnostic.errorCode, "132000");
    assert.equal(diagnostic.failureKind, "template_parameters");
    assert.equal(diagnostic.traceId, "BOOKING_TRACE_SAFE_24");
    const retained = JSON.stringify(body);
    assert.doesNotMatch(retained, /66812345678|81 234 5678|66810000002|66820000003|66960000001/);
    assert.doesNotMatch(retained, /EA_OWNER_DIAGNOSTIC_SECRET|owner-diagnostic-app-secret|Bearer/);

    const adminScript = await readFile(new URL("../public/concierge-admin.js", import.meta.url), "utf8");
    assert.match(adminScript, /diagnostics\.find\(\(diagnostic\) => diagnostic\.alertId === item\.id\)/);
    assert.match(adminScript, /WhatsApp delivery failed/);
    assert.match(adminScript, /label: "Template", value: latestDiagnostic\.templateName/);
    assert.match(adminScript, /label: "Language", value: latestDiagnostic\.languageCode/);
    assert.match(adminScript, /label: "Attempted", value: item\.attempted \|\| 0/);
    assert.match(adminScript, /label: "Provider", value: "Meta"/);
    assert.match(adminScript, /concierge-admin-diagnostic-grid/);
    assert.match(adminScript, /Provider message/);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

test("Meta rejection and network failures stay sanitized while partial delivery is truthful", async () => {
  const recipients = JSON.stringify({
    support: [
      { label: "Team A", phone: "+66 64 000 0001" },
      { label: "Team B", phone: "+66 81 000 0002" }
    ]
  });
  const alert = {
    id: "alert_delivery_reference",
    recipientGroup: "support",
    room: "5",
    alertType: "stay_support",
    severity: "attention",
    summary: "I need fresh towels.",
    bangkokTime: "28 Aug 2026, 18:00",
    createdAt: "2026-08-28T11:00:00.000Z"
  };
  const originalFetch = globalThis.fetch;
  try {
    const partial = createEnvironment({
      WHATSAPP_ACCESS_TOKEN: "test-token",
      WHATSAPP_PHONE_NUMBER_ID: "123",
      META_APP_SECRET: "test-secret",
      WHATSAPP_ALERT_RECIPIENTS: recipients
    });
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return calls === 1
        ? new Response(JSON.stringify({ messages: [{ id: "wamid.partial" }] }), { status: 200, headers: { "content-type": "application/json" } })
        : new Response(JSON.stringify({ error: { code: 131008 } }), { status: 400, headers: { "content-type": "application/json" } });
    };
    assert.deepEqual(await dispatchConciergeAlert(alert, partial.env), { attempted: 2, accepted: 1 });
    assert.deepEqual(partial.store.alertDeliveries.map((item) => item.status).sort(), ["accepted", "failed"]);
    assert.equal(partial.store.whatsappDiagnostics.length, 1);
    assert.equal(partial.store.whatsappDiagnostics[0].errorCode, "131008");
    assert.doesNotMatch(JSON.stringify(partial.store.alertDeliveries), /66640000001|66810000002|test-token|test-secret/);

    for (const failure of [
      () => new Response(JSON.stringify({ error: { code: 131008 } }), { status: 400, headers: { "content-type": "application/json" } }),
      () => new Response(JSON.stringify({ error: { code: 2 } }), { status: 500, headers: { "content-type": "application/json" } }),
      () => { throw new TypeError("simulated network timeout"); }
    ]) {
      const current = createEnvironment({
        WHATSAPP_ACCESS_TOKEN: "test-token",
        WHATSAPP_PHONE_NUMBER_ID: "123",
        META_APP_SECRET: "test-secret",
        WHATSAPP_ALERT_RECIPIENTS: recipients
      });
      globalThis.fetch = async () => failure();
      assert.deepEqual(await dispatchConciergeAlert(alert, current.env), { attempted: 2, accepted: 0 });
      assert.equal(current.store.alertDeliveries.every((item) => item.status === "failed"), true);
      assert.equal(current.store.whatsappDiagnostics.length, 2);
      assert.doesNotMatch(JSON.stringify(current.store.alertDeliveries), /66640000001|66810000002|test-token|test-secret|simulated network timeout/);
    }

    const unmapped = createEnvironment({
      WHATSAPP_ACCESS_TOKEN: "test-token",
      WHATSAPP_PHONE_NUMBER_ID: "123",
      META_APP_SECRET: "test-secret",
      WHATSAPP_ALERT_RECIPIENTS: recipients,
      WHATSAPP_SERVICE_TEMPLATE_NAME: "wrong_template_name"
    });
    let networkCalled = false;
    globalThis.fetch = async () => { networkCalled = true; throw new Error("must not run"); };
    assert.deepEqual(await dispatchConciergeAlert(alert, unmapped.env), { attempted: 2, accepted: 0 });
    assert.equal(networkCalled, false);
    assert.equal(unmapped.store.alertDeliveries.every((item) => item.errorCode === "unmapped_template"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("failed service-v3 delivery never produces a misleading guest success", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "not-used",
    WHATSAPP_ACCESS_TOKEN: "test-token",
    WHATSAPP_PHONE_NUMBER_ID: "123",
    META_APP_SECRET: "test-secret",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({ support: [{ label: "Su", phone: "+66 64 000 0001" }] })
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 131008 } }), {
    status: 400,
    headers: { "content-type": "application/json" }
  });
  try {
    const response = await handleConciergeRequest(
      guestRequest("I need fresh towels"),
      env,
      undefined,
      new Date("2026-08-28T09:00:00.000Z")
    );
    const body = await response.json();
    assert.match(body.answer, /couldn’t send that request automatically/i);
    assert.doesNotMatch(body.answer, /team has been notified|sent to The House team/i);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alertDeliveries.every((item) => item.status === "failed"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ACK and RESOLVE propagate status once to other assigned recipients only", async () => {
  const { env, store } = createEnvironment({
    WHATSAPP_ACCESS_TOKEN: "test-token",
    WHATSAPP_PHONE_NUMBER_ID: "123",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify",
    META_APP_SECRET: "status-secret",
    WHATSAPP_STATUS_TEMPLATE_NAME: "house_alert_status_v1",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66 64 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const id = "alert_12345678-1234-1234-1234-123456789088";
  store.alerts.push({ id, alertType: "stay_support", recipientGroup: "support_with_owners", room: "4", status: "open", summary: "Please bring soap", escalationDueAt: "2026-08-28T12:00:00.000Z", createdAt: "2026-08-28T11:00:00.000Z" });
  const outbound = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.status.${outbound.length}` }] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const ack = await signedWhatsAppCommand(env, "66810000002", `ACK ${id}`);
    await handleWhatsAppWebhook(ack, env);
    assert.equal(store.alerts[0].status, "acknowledged");
    assert.equal(outbound.length, 2);
    assert.deepEqual(outbound.map((item) => item.to).sort(), ["66640000001", "66820000003"]);
    outbound.forEach((item) => {
      const parameters = item.template.components[0].parameters.map((entry) => entry.text);
      assert.deepEqual(parameters, [id, "Room 4", "Soap", "Owner 1", "ACKNOWLEDGED"]);
      assert.equal(item.template.name, "house_alert_status_v1");
    });

    const duplicateAck = await signedWhatsAppCommand(env, "66810000002", `ACK ${id}`);
    await handleWhatsAppWebhook(duplicateAck, env);
    assert.equal(outbound.length, 2);

    const resolve = await signedWhatsAppCommand(env, "66820000003", `RESOLVE ${id}`);
    await handleWhatsAppWebhook(resolve, env);
    assert.equal(store.alerts[0].status, "resolved");
    assert.equal(outbound.length, 4);
    assert.deepEqual(outbound.slice(2).map((item) => item.to).sort(), ["66640000001", "66810000002"]);
    outbound.slice(2).forEach((item) => {
      const parameters = item.template.components[0].parameters.map((entry) => entry.text);
      assert.deepEqual(parameters, [id, "Room 4", "Soap", "Owner 2", "RESOLVED"]);
    });
    const duplicateResolve = await signedWhatsAppCommand(env, "66820000003", `RESOLVE ${id}`);
    await handleWhatsAppWebhook(duplicateResolve, env);
    assert.equal(outbound.length, 4);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alertDeliveries.filter((item) => item.stage.startsWith("status_")).length, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Received and Resolve quick replies are authorized, idempotent and actor-excluding", async () => {
  const { env, store } = createEnvironment({
    WHATSAPP_ACCESS_TOKEN: "test-token",
    WHATSAPP_PHONE_NUMBER_ID: "123",
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify",
    META_APP_SECRET: "quick-action-secret",
    WHATSAPP_STATUS_TEMPLATE_NAME: "house_alert_status_v1",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66 64 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const id = "alert_12345678-1234-1234-1234-123456789066";
  store.alerts.push({
    id,
    alertType: "stay_support",
    recipientGroup: "support_with_owners",
    room: "4",
    status: "open",
    summary: "Please bring soap",
    escalationDueAt: "2026-08-28T12:00:00.000Z",
    createdAt: "2026-08-28T11:00:00.000Z"
  });
  const outbound = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.quick-status.${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const receivedPayload = `HOUSE_ALERT|RECEIVED|${id}`;
    await handleWhatsAppWebhook(await signedWhatsAppButton(env, "66640000001", receivedPayload, "Received"), env);
    assert.equal(store.alerts[0].status, "acknowledged");
    assert.deepEqual(outbound.map((payload) => payload.to).sort(), ["66810000002", "66820000003"]);
    assert.doesNotMatch(JSON.stringify(outbound), /66640000001/);
    assert.deepEqual(await store.getDueAlertEscalations("2027-01-01T00:00:00.000Z"), []);

    await handleWhatsAppWebhook(await signedWhatsAppButton(env, "66640000001", receivedPayload, "Received"), env);
    assert.equal(outbound.length, 2);

    const resolvePayload = `HOUSE_ALERT|RESOLVE|${id}`;
    await handleWhatsAppWebhook(await signedWhatsAppButton(env, "66820000003", resolvePayload, "Resolve"), env);
    assert.equal(store.alerts[0].status, "resolved");
    assert.deepEqual(outbound.slice(2).map((payload) => payload.to).sort(), ["66640000001", "66810000002"]);
    assert.doesNotMatch(JSON.stringify(outbound.slice(2)), /66820000003/);

    await handleWhatsAppWebhook(await signedWhatsAppButton(env, "66820000003", resolvePayload, "Resolve"), env);
    assert.equal(outbound.length, 4);

    const unauthorizedId = "alert_12345678-1234-1234-1234-123456789055";
    store.alerts.push({ ...store.alerts[0], id: unauthorizedId, status: "open" });
    await handleWhatsAppWebhook(await signedWhatsAppButton(env, "66990000009", `HOUSE_ALERT|RECEIVED|${unauthorizedId}`, "Received"), env);
    assert.equal(store.alerts[1].status, "open");
    assert.equal(outbound.length, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unauthorized or invalid WhatsApp status commands cannot change alerts or send updates", async () => {
  const { env, store } = createEnvironment({
    WHATSAPP_ACCESS_TOKEN: "test-token",
    WHATSAPP_PHONE_NUMBER_ID: "123",
    META_APP_SECRET: "status-secret",
    WHATSAPP_STATUS_TEMPLATE_NAME: "house_alert_status_v1",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66 64 000 0001" }],
      emergency: [{ label: "Owner", phone: "+66 81 000 0002" }]
    })
  });
  const id = "alert_12345678-1234-1234-1234-123456789077";
  store.alerts.push({ id, alertType: "stay_support", recipientGroup: "support", room: "5", status: "open", summary: "Fresh towels", createdAt: "2026-08-28T11:00:00.000Z" });
  let sends = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { sends += 1; return new Response("{}"); };
  try {
    await handleWhatsAppWebhook(await signedWhatsAppCommand(env, "66810000002", `ACK ${id}`), env);
    await handleWhatsAppWebhook(await signedWhatsAppCommand(env, "66640000001", "ACK alert_00000000-0000-0000-0000-000000000000"), env);
    assert.equal(store.alerts[0].status, "open");
    assert.equal(sends, 0);
    assert.equal(store.alertDeliveries.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});



test("strong human and housekeeper contact requests expose The House team only during service hours", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const openNow = new Date("2026-08-29T08:00:00.000Z"); // Saturday 15:00 Bangkok
  const closedNow = new Date("2026-08-31T08:00:00.000Z"); // Monday 15:00 Bangkok
  const phrases = [
    "I urgently need to talk to a human",
    "I need to personally talk to them",
    "I really need to speak to someone",
    "please call for me",
    "please let me call the housekeeper",
    "can I call the housekeeper"
  ];

  for (const question of phrases) {
    const response = await handleConciergeRequest(guestRequest(question), env, undefined, openNow);
    const body = await response.json();
    assert.equal(body.intentId, "generic_human_contact", question);
    assert.equal(body.source, "human-contact-policy", question);
    assert.match(body.answer, /contact The House team directly/i, question);
    assert.doesNotMatch(body.answer, /\bSu\b/i, question);
    assert.equal(body.actions.some((action) => action.route === "houseWhatsapp"), true, question);
    assert.equal(body.actions.some((action) => action.route === "houseCall"), true, question);
    assert.equal(store.alerts.length, 0, question);
  }

  const closed = await handleConciergeRequest(guestRequest("can I call the housekeeper"), env, undefined, closedNow);
  const closedBody = await closed.json();
  assert.equal(closedBody.intentId, "generic_human_contact");
  assert.doesNotMatch(closedBody.answer, /contact The House team directly/i);
  assert.doesNotMatch(closedBody.answer, /\bSu\b/i);
  assert.equal(closedBody.actions.some((action) => action.route === "houseWhatsapp"), false);
  assert.equal(closedBody.actions.some((action) => action.route === "houseCall"), false);
  assert.equal(closedBody.actions.some((action) => action.href === "/emergency.html"), true);

  const saturdayAfterHours = new Date("2026-08-29T13:00:00.000Z"); // Saturday 20:00 Bangkok
  const afterHours = await handleConciergeRequest(guestRequest("I urgently need to talk to a human"), env, undefined, saturdayAfterHours);
  const afterHoursBody = await afterHours.json();
  assert.equal(afterHoursBody.intentId, "generic_human_contact");
  assert.match(afterHoursBody.answer, /outside normal service hours/i);
  assert.doesNotMatch(afterHoursBody.answer, /contact The House team directly/i);
  assert.doesNotMatch(afterHoursBody.answer, /\bSu\b/i);
  assert.equal(afterHoursBody.actions.some((action) => action.route === "houseWhatsapp"), false);
  assert.equal(afterHoursBody.actions.some((action) => action.route === "houseCall"), false);
  assert.equal(afterHoursBody.actions.some((action) => action.href === "/emergency.html"), true);
});

test("fire cancellation cannot contaminate a later housekeeper-contact turn while genuine smoke continuation stays safety-first", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "not-used" });
  const openNow = new Date("2026-08-29T08:00:00.000Z");

  const fire = await handleConciergeRequest(guestRequest("I have fire in my room"), env, undefined, openNow);
  const fireBody = await fire.json();
  assert.equal(fireBody.intentId, "fire_emergency");
  assert.equal(store.alerts.length, 0);

  const cancelledHistory = [
    { role: "user", content: "I have fire in my room" },
    { role: "assistant", content: fireBody.answer },
    { role: "assistant", content: "Okay — I haven’t contacted The House team." }
  ];

  const contact = await handleConciergeRequest(guestRequest("can I call the housekeeper", { history: cancelledHistory }), env, undefined, openNow);
  const contactBody = await contact.json();
  assert.equal(contactBody.intentId, "generic_human_contact");
  assert.notEqual(contactBody.intentId, "property_emergency");
  assert.match(contactBody.answer, /contact The House team directly/i);
  assert.doesNotMatch(contactBody.answer, /\bSu\b/i);
  assert.equal(contactBody.actions.some((action) => action.route === "houseWhatsapp"), true);
  assert.equal(contactBody.actions.some((action) => action.route === "houseCall"), true);
  assert.equal(contactBody.actions.some((action) => action.action === "confirm_urgent_property"), false);
  assert.equal(store.alerts.length, 0);

  const continuation = await handleConciergeRequest(guestRequest("there is more smoke now", { history: cancelledHistory }), env, undefined, openNow);
  const continuationBody = await continuation.json();
  assert.equal(continuationBody.intentId, "fire_emergency");
  assert.equal(continuationBody.actions[0].route, "rescueCall");
  assert.equal(continuationBody.actions.some((action) => action.action === "confirm_urgent_property"), true);
  assert.equal(store.alerts.length, 0);
});

test("property emergencies expose private-role House emergency calling without naming the responder", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "not-used",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66 64 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Westy", phone: "+66 82 000 0003" }
      ]
    })
  });
  const now = new Date("2026-08-30T06:16:00.000Z");

  const fire = await handleConciergeRequest(guestRequest("There is fire in my room"), env, undefined, now);
  const fireBody = await fire.json();
  assert.equal(fireBody.intentId, "fire_emergency");
  assert.equal(fireBody.actions.some((action) => action.route === "rescueCall"), true);
  assert.equal(fireBody.actions.some((action) => action.route === "propertyEmergencyCall"), true);
  assert.equal(fireBody.actions[1].route, "propertyEmergencyCall");
  assert.equal(fireBody.actions.some((action) => action.action === "confirm_urgent_property"), true);
  assert.match(fireBody.answer, /The House Emergency Support/i);
  assert.doesNotMatch(fireBody.answer, /\b(?:Westy|Su)\b/i);
  assert.equal(store.alerts.length, 0);

  const history = [
    { role: "user", content: "There is fire in my room" },
    { role: "assistant", content: fireBody.answer }
  ];
  const contact = await handleConciergeRequest(guestRequest("Do you have a emergency contact I can call", { history }), env, undefined, now);
  const contactBody = await contact.json();
  assert.equal(contactBody.intentId, "house_emergency_contact");
  assert.equal(contactBody.source, "safety-policy");
  assert.match(contactBody.answer, /call The House Emergency Support/i);
  assert.doesNotMatch(contactBody.answer, /\b(?:Westy|Su)\b/i);
  assert.equal(contactBody.actions[0].route, "propertyEmergencyCall");
  assert.equal(contactBody.actions.some((action) => action.route === "rescueCall"), true);
  assert.equal(contactBody.actions.some((action) => action.action === "confirm_urgent_property"), false);
  assert.equal(store.alerts.length, 0);
});

test("natural stained-bed-sheet wording enters cleaning collection and now submits exactly one service alert", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
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
  const openTuesday = new Date("2026-08-25T04:00:00.000Z");

  for (const phrase of [
    "there is a stain on the sheet",
    "my bed sheet has a stain",
    "the sheets have stains",
    "my bedding is stained"
  ]) {
    const variant = await handleConciergeRequest(guestRequest(phrase), env, undefined, openTuesday);
    const variantBody = await variant.json();
    assert.equal(variantBody.intentId, "housekeeping_room_cleaning", phrase);
    assert.equal(variantBody.workflow.type, "cleaning", phrase);
    assert.deepEqual(variantBody.workflow.missing, ["preferredTime"], phrase);
    assert.equal(store.alerts.length, 0, phrase);
  }

  const pending = await handleConciergeRequest(guestRequest("there is a stain on my bed sheet"), env, undefined, openTuesday);
  const pendingBody = await pending.json();
  assert.equal(pendingBody.intentId, "housekeeping_room_cleaning");
  assert.equal(pendingBody.workflow.type, "cleaning");
  assert.equal(pendingBody.workflow.status, "collecting");
  assert.deepEqual(pendingBody.workflow.missing, ["preferredTime"]);
  assert.match(pendingBody.answer, /What time would be most convenient/i);
  assert.equal(store.alerts.length, 0);

  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.stain-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const completed = await handleConciergeRequest(guestRequest("now", {
      workflowState: pendingBody.workflow,
      history: [
        { role: "user", content: "there is a stain on my bed sheet" },
        { role: "assistant", content: pendingBody.answer }
      ]
    }), env, undefined, openTuesday);
    const completedBody = await completed.json();
    assert.equal(completedBody.intentId, "housekeeping_room_cleaning");
    assert.equal(completedBody.workflow.status, "submitted");
    assert.match(completedBody.answer, /Preferred time: now/i);
    assert.doesNotMatch(completedBody.answer, /support handoff|contact (?:our )?support/i);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].recipientGroup, "support_with_owners");
    assert.equal(outbound.length, 3);

    const unrelated = await handleConciergeRequest(guestRequest("which beach is best for snorkeling", {
      workflowState: completedBody.workflow,
      history: [
        { role: "user", content: "there is a stain on my bed sheet" },
        { role: "assistant", content: pendingBody.answer },
        { role: "user", content: "now" },
        { role: "assistant", content: completedBody.answer }
      ]
    }), env, undefined, openTuesday);
    const unrelatedBody = await unrelated.json();
    assert.notEqual(unrelatedBody.intentId, "room_cleaning");
    assert.match(unrelatedBody.answer, /Ao Leuk|Shark Bay|Hin Wong|Mango Bay|snorkel/i);
    assert.equal(store.alerts.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("cleanup wording plus bare hour completes one automatic service alert without promising a website-chat reply", async () => {
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
  const openSunday = new Date("2026-08-30T03:54:00.000Z"); // 10:54 Bangkok

  for (const phrase of ["I need a clean up", "I need a cleanup", "can I get a clean up"]) {
    const first = await handleConciergeRequest(guestRequest(phrase), env, undefined, openSunday);
    const firstBody = await first.json();
    assert.equal(firstBody.intentId, "housekeeping_room_cleaning", phrase);
    assert.equal(firstBody.source, "service-policy", phrase);
    assert.equal(firstBody.workflow.type, "cleaning", phrase);
    assert.equal(firstBody.workflow.status, "collecting", phrase);
    assert.deepEqual(firstBody.workflow.missing, ["preferredTime"], phrase);
    assert.match(firstBody.answer, /What time would be most convenient/i, phrase);
    assert.doesNotMatch(firstBody.answer, /support team.*reply|send the request to/i, phrase);
    assert.equal(store.alerts.length, 0, phrase);
  }

  const first = await handleConciergeRequest(guestRequest("I need a clean up"), env, undefined, openSunday);
  const firstBody = await first.json();

  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.cleanup-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const completed = await handleConciergeRequest(guestRequest("11", {
      workflowState: firstBody.workflow,
      history: [
        { role: "user", content: "I need a clean up" },
        { role: "assistant", content: firstBody.answer }
      ]
    }), env, undefined, openSunday);
    const completedBody = await completed.json();
    assert.equal(completedBody.intentId, "housekeeping_room_cleaning");
    assert.equal(completedBody.source, "service-policy");
    assert.equal(completedBody.workflow.status, "submitted");
    assert.match(completedBody.answer, /sent your cleaning request to The House team/i);
    assert.match(completedBody.answer, /Preferred time: 11:00 AM/i);
    assert.doesNotMatch(completedBody.answer, /until (?:they|the team) repl(?:y|ies)|support team.*reply|Please send the request/i);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].recipientGroup, "support_with_owners");
    assert.match(store.alerts[0].summary, /Room cleaning request.*Preferred time: 11:00 AM/i);
    assert.deepEqual(completedBody.actions, []);
    assert.equal(outbound.length, 3);
    outbound.forEach((payload) => {
      const parameters = payload.template.components[0].parameters;
      assert.equal(parameters[2].text, "Room cleaning");
      assert.match(parameters[4].text, /Preferred time: 11:00 AM/i);
      assert.doesNotMatch(parameters[4].text, /^Please send the request$/i);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("generic send-request wording cannot create a context-free service alert", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "test-key",
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
  const originalFetch = globalThis.fetch;
  let modelCalls = 0;
  globalThis.fetch = async () => {
    modelCalls += 1;
    return new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({
        answer: "I will send it.", intent_id: "guest_request", category: "stay-support", confidence: 0.9,
        needs_human: true, handoff: "stay_support", learning_gap: false, learning_reason: "none"
      }) }] }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await handleConciergeRequest(guestRequest("Please send the request"), env, undefined, new Date("2026-08-30T04:12:00.000Z"));
    const body = await response.json();
    assert.equal(body.intentId, "request_submission_needs_context");
    assert.equal(body.needsHuman, false);
    assert.equal(body.handoff, "none");
    assert.match(body.answer, /Please tell me what you need/i);
    assert.doesNotMatch(body.answer, /has been sent|sent to The House team/i);
    assert.equal(store.alerts.length, 0);
    assert.equal(modelCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("context-free send-request wording is also blocked when only an unrelated monitoring workflow is stale", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  let modelCalls = 0;
  globalThis.fetch = async () => {
    modelCalls += 1;
    throw new Error("model should not be called");
  };
  try {
    const response = await handleConciergeRequest(guestRequest("Please send the request", {
      workflowState: {
        type: "property_issue",
        status: "monitoring",
        issueCategory: "equipment",
        notified: true,
        notes: "Air conditioner was previously reported."
      }
    }), env, undefined, new Date("2026-08-30T04:12:30.000Z"));
    const body = await response.json();
    assert.equal(body.intentId, "request_submission_needs_context");
    assert.equal(body.needsHuman, false);
    assert.equal(body.handoff, "none");
    assert.match(body.answer, /Please tell me what you need/i);
    assert.doesNotMatch(body.answer, /has been sent|sent to The House team/i);
    assert.equal(store.alerts.length, 0);
    assert.equal(modelCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("bare 3 in an active cleaning collector means 3:00 PM and submits the structured request once", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
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
  const now = new Date("2026-08-30T03:54:00.000Z");
  const first = await handleConciergeRequest(guestRequest("I need a clean up"), env, undefined, now);
  const firstBody = await first.json();
  const originalFetch = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => {
    sends += 1;
    return new Response(JSON.stringify({ messages: [{ id: `wamid.cleanup-three-${sends}` }] }), { status: 200 });
  };
  try {
    const completed = await handleConciergeRequest(guestRequest("3", {
      workflowState: firstBody.workflow
    }), env, undefined, now);
    const body = await completed.json();
    assert.equal(body.workflow.status, "submitted");
    assert.match(body.answer, /Preferred time: 3:00 PM/i);
    assert.equal(store.alerts.length, 1);
    assert.match(store.alerts[0].summary, /Room cleaning request.*Preferred time: 3:00 PM/i);
    assert.equal(sends, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("failed cleaning delivery stays truthful, keeps the collector recoverable and never creates a duplicate alert on retry", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
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
  const now = new Date("2026-08-30T03:54:00.000Z");
  const first = await handleConciergeRequest(guestRequest("I need a clean up"), env, undefined, now);
  const firstBody = await first.json();
  const originalFetch = globalThis.fetch;
  let sends = 0;
  globalThis.fetch = async () => {
    sends += 1;
    return new Response(JSON.stringify({ error: { code: 2, message: "simulated Meta failure" } }), { status: 500 });
  };
  try {
    const failed = await handleConciergeRequest(guestRequest("11", {
      workflowState: firstBody.workflow
    }), env, undefined, now);
    const failedBody = await failed.json();
    assert.equal(failedBody.workflow.status, "collecting");
    assert.match(failedBody.answer, /couldn.t send that request automatically/i);
    assert.doesNotMatch(failedBody.answer, /sent your cleaning request|request has been sent/i);
    assert.deepEqual(failedBody.actions.map((action) => action.label), ["Call Us"]);
    assert.equal(store.alerts.length, 1);
    assert.equal(sends, 3);

    const retry = await handleConciergeRequest(guestRequest("11", {
      workflowState: failedBody.workflow
    }), env, undefined, new Date(now.getTime() + 1000));
    const retryBody = await retry.json();
    assert.equal(retryBody.workflow.status, "collecting");
    assert.match(retryBody.answer, /couldn.t send that request automatically/i);
    assert.equal(store.alerts.length, 1);
    assert.equal(sends, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verified shorthand acknowledgement ignores stale hidden cleaning transcript", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "test-key" });
  const originalFetch = globalThis.fetch;
  let modelCalls = 0;
  globalThis.fetch = async () => {
    modelCalls += 1;
    throw new Error("model should not be called");
  };
  try {
    const response = await handleConciergeRequest(guestRequest("I am already", {
      history: [
        { role: "user", content: "I need a clean up" },
        { role: "assistant", content: "What time would you prefer?" },
        { role: "user", content: "3" },
        { role: "assistant", content: "I have noted 3:00 PM." }
      ]
    }), env, undefined, new Date("2026-08-30T04:13:00.000Z"));
    const body = await response.json();
    assert.equal(body.intentId, "verified_guest_acknowledgement");
    assert.match(body.answer, /guest access is already active.*Room 6/i);
    assert.doesNotMatch(body.answer, /cleaning|preferred time|support/i);
    assert.equal(body.needsHuman, false);
    assert.equal(body.workflow, null);
    assert.equal(store.alerts.length, 0);
    assert.equal(modelCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("browser starts a visible fresh conversation on reload and uses access-aware initial copy", async () => {
  const script = await readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8");
  assert.match(script, /function initialHistory\(\) \{[\s\S]*sessionStorage, "remove", historyStorageKey[\s\S]*return \[\]/);
  assert.doesNotMatch(script, /rememberExchange[\s\S]{0,500}sessionStorage, "set", historyStorageKey/);
  assert.match(script, /function initialConciergeMessage\(\)/);
  assert.match(script, /if \(!conciergeAccessState\.verified\)/);
  assert.match(script, /Your guest access is active/);
  assert.match(script, /Your stay is verified[\s\S]*Find my room[\s\S]*(?:passport image|Guest registration|in-person guest registration)/);
  assert.match(script, /appendMessage\("concierge", initialConciergeMessage\(\)\)/);
  assert.match(script, /activeCleaningWorkflow = result\.workflow\?\.type === "cleaning"[\s\S]*result\.workflow\?\.status === "collecting"/);
  assert.match(script, /const activeWorkflow = activePrivateWorkflow[\s\S]*\|\| activeCleaningWorkflow/);
});

test("diving learning and standalone named-provider turns preserve French Kiss Divers preference without promising availability", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
  const now = new Date("2026-08-29T08:00:00.000Z");

  const start = await handleConciergeRequest(guestRequest("I wanna learn diving"), env, undefined, now);
  const startBody = await start.json();
  assert.equal(startBody.intentId, "diving_booking_request");
  assert.equal(startBody.workflow.type, "booking");
  assert.equal(startBody.workflow.bookingRequest.kind, "diving");
  assert.equal(startBody.workflow.status, "collecting");
  assert.equal(store.alerts.length, 0);

  const shortPreference = await handleConciergeRequest(guestRequest("I wanna go with French kiss", {
    workflowState: startBody.workflow,
    history: [
      { role: "user", content: "I wanna learn diving" },
      { role: "assistant", content: startBody.answer }
    ]
  }), env, undefined, now);
  const shortPreferenceBody = await shortPreference.json();
  assert.equal(shortPreferenceBody.workflow.bookingRequest.preferredProvider, "French Kiss Divers");
  assert.match(shortPreferenceBody.answer, /French Kiss Divers.*check whether that can be arranged/i);
  assert.doesNotMatch(shortPreferenceBody.answer, /French Kiss Divers (?:is|has been) (?:available|confirmed|booked)/i);
  assert.equal(store.alerts.length, 0);

  const namedAfterContext = await handleConciergeRequest(guestRequest("can I go with French Kiss Divers?", {
    workflowState: startBody.workflow,
    history: [
      { role: "user", content: "I wanna learn diving" },
      { role: "assistant", content: startBody.answer }
    ]
  }), env, undefined, now);
  const namedAfterContextBody = await namedAfterContext.json();
  assert.equal(namedAfterContextBody.workflow.bookingRequest.preferredProvider, "French Kiss Divers");
  assert.match(namedAfterContextBody.answer, /French Kiss Divers/i);
  assert.doesNotMatch(namedAfterContextBody.answer, /French Kiss Divers (?:is|has been) (?:available|confirmed|booked)/i);

  const standalone = await handleConciergeRequest(guestRequest("can I go with French Kiss Divers?"), env, undefined, now);
  const standaloneBody = await standalone.json();
  assert.equal(standaloneBody.intentId, "diving_booking_request");
  assert.equal(standaloneBody.workflow.type, "booking");
  assert.equal(standaloneBody.workflow.bookingRequest.kind, "diving");
  assert.equal(standaloneBody.workflow.bookingRequest.preferredProvider, "French Kiss Divers");
  assert.match(standaloneBody.answer, /French Kiss Divers.*check whether that can be arranged/i);
  assert.doesNotMatch(standaloneBody.answer, /French Kiss Divers (?:is|has been) (?:available|confirmed|booked)/i);
  assert.equal(store.alerts.length, 0);
});

test("desktop Concierge expands the conversation while mobile keeps its polished sheet layout", async () => {
  const [styles, script] = await Promise.all([
    readFile(new URL("../public/ai-concierge.css", import.meta.url), "utf8"),
    readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8")
  ]);
  assert.match(styles, /height:min\(84dvh,800px\)/);
  assert.match(styles, /\.ai-concierge-panel\.has-conversation \.ai-concierge-messages[\s\S]*flex:1[\s\S]*max-height:none/);
  assert.match(styles, /\.ai-concierge-panel\.has-conversation \.ai-concierge-context\{display:none\}/);
  assert.match(styles, /@media\(max-width:640px\)[\s\S]*height:min\(92dvh,820px\)[\s\S]*max-height:92dvh/);
  assert.match(styles, /\.ai-concierge-panel\.has-conversation \.ai-concierge-actions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.ai-concierge-message-action\{[^}]*white-space:normal[^}]*overflow-wrap:anywhere/);
  assert.match(styles, /\.ai-concierge-input\{[^}]*font-size:16px/);
  assert.match(script, /panel\.classList\.add\("has-conversation"\)/);
  assert.match(styles, /\.ai-concierge-panel\.has-conversation \.ai-concierge-chat[\s\S]*flex:1/);
  assert.match(styles, /@media\(max-width:640px\)[\s\S]*\.ai-concierge-panel\.has-conversation \.ai-concierge-actions\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media\(max-width:640px\)[\s\S]*\.ai-concierge-panel\.has-conversation \.ai-concierge-action\{min-height:39px/);
  assert.match(styles, /\.ai-concierge-messages\{flex:1;min-height:170px;max-height:none\}/);
  assert.match(styles, /\.ai-concierge-drag-handle\{display:none\}/);
  assert.doesNotMatch(script, /dragHandle\.addEventListener\("touchstart"/);
  assert.doesNotMatch(script, /dragHandle\.addEventListener\("touchmove"/);
  assert.doesNotMatch(script, /distance > 140/);
  assert.doesNotMatch(script, /panel\.addEventListener\("touchstart"/);
});

test("v5.11.28 shared visual system constrains width, hero height, motion and overflow", async () => {
  const [styles, room, guideApp] = await Promise.all([
    readFile(new URL("../public/design-system.css", import.meta.url), "utf8"),
    readFile(new URL("../public/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/guide-app.js", import.meta.url), "utf8")
  ]);
  assert.match(styles, /--content-width:1120px/);
  assert.match(styles, /html\{[^}]*overflow-x:hidden/);
  assert.match(styles, /body\{[^}]*overflow-x:hidden/);
  assert.match(styles, /\.shell\{[\s\S]*width:min\(var\(--content-width\),calc\(100% - 32px\)\)/);
  assert.match(styles, /\.hero\{[\s\S]*min-height:292px/);
  assert.match(styles, /@media\(max-width:760px\)[\s\S]*\.hero\{min-height:246px/);
  assert.match(styles, /@media\(max-width:340px\)[\s\S]*\.hero\{min-height:232px/);
  assert.match(styles, /:where\(a,button,input,select,textarea,summary,\[tabindex\]\):focus-visible/);
  assert.match(styles, /\.btn:disabled,\.btn\[aria-disabled="true"\]/);
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(room, /style="(?:min-)?height:360px"/);
  assert.match(room, /<section class="hero" aria-label="Room location overview">/);
  assert.match(guideApp, /setAttribute\("aria-current", "page"\)/);
});

test("v5.11.28 guest visual contracts keep registration and lost-key consent scan-friendly", async () => {
  const [home, passport, room, roomAccess, stayStyles, passportStyles] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/passport-upload.html", import.meta.url), "utf8"),
    readFile(new URL("../public/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/room-access.html", import.meta.url), "utf8"),
    readFile(new URL("../public/stay-access.css", import.meta.url), "utf8"),
    readFile(new URL("../public/passport-upload.css", import.meta.url), "utf8")
  ]);
  assert.equal((home.match(/class="registration-fact"/g) || []).length, 3);
  assert.match(home, /Every foreign guest/);
  assert.match(home, /Thai nationals are exempt/);
  assert.match(home, /Private and secure/);
  assert.equal((passport.match(/class="passport-fact"/g) || []).length, 3);
  for (const page of [room, roomAccess]) {
    assert.equal((page.match(/500 THB/g) || []).length, 1);
    assert.match(page, /id="lostKeyFeeAccepted"[^>]*required/);
    assert.match(page, /I understand and want to continue/);
    assert.match(page, />Request spare key<\/button>/);
    assert.match(page, /id="spareKeyViewAction" hidden/);
  }
  assert.match(stayStyles, /\.fee-confirmation\{[^}]*min-height:52px/);
  assert.match(stayStyles, /#spareKeyViewAction\{[^}]*border-top/);
  assert.match(stayStyles, /@media\(max-width:650px\)[\s\S]*\.stay-access-actions\{display:grid/);
  assert.match(passportStyles, /\.passport-facts\{[^}]*repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(passportStyles, /@media\(max-width:650px\)[\s\S]*\.passport-facts,\.passport-privacy ul,\.passport-session,\.registration-methods\{grid-template-columns:1fr\}/);
});

test("v5.11.28 landing and room hierarchy use safe imagery, exact guidance and accurate actions", async () => {
  const [home, room, canonicalRoom, roomApp, styles] = await Promise.all([
    readFile(new URL("../public/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/house/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/room-app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/design-system.css", import.meta.url), "utf8")
  ]);
  assert.equal(room, canonicalRoom);
  assert.match(home, /<section class="hero landing-hero">/);
  assert.doesNotMatch(home, /\/assets\/photo-|\/api\/stay\/|arrivalRoomPhoto|roomPhoto/);
  assert.match(styles, /\.landing-hero\{[\s\S]*linear-gradient\(145deg,#214f45/);
  assert.match(home, /<h2 id="registrationTitle">Complete your guest registration<\/h2>/);
  assert.match(home, /Passport information is required for non-Thai overnight guests\. Thai guests are exempt\./);
  assert.equal((home.match(/<li><span>[1-4]<\/span>/g) || []).length, 4);
  assert.match(home, /Access your room guide/);
  assert.match(home, /Room location, arrival pictures, Wi-Fi and your full guest guide become available after your stay has been verified and the required guest registration is complete\./);
  assert.doesNotMatch(home, /after the stay and required guest registration are complete/);
  assert.match(room, /<span class="badge">ROOM LOCATION<\/span>\s*<h2 id="heroRoom">Location<\/h2>/);
  assert.match(roomApp, /getElementById\("heroRoom"\)\.textContent = data\.floor/);
  assert.match(room, /Put toilet paper, tissues, wipes, sanitary products and all other items in the bin provided/);
  assert.match(room, /undersea grid connection, reducing reliance on local diesel generators/);
  assert.ok((home.match(/Open Concierge/g) || []).length >= 3);
  assert.ok((room.match(/Open Concierge/g) || []).length >= 2);
  assert.equal((room.match(/500 THB/g) || []).length, 1);

  const publicRoot = new URL("../public/", import.meta.url);
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
    assert.doesNotMatch(html, /budget-friendly/i, `${page.pathname} retains the obsolete footer wording`);
  }
});

test("v5.11.31 header, mobile spacing, wording and CTA corrections remain intact", async () => {
  const [styles, i18n, room, canonicalRoom, actionRuntime] = await Promise.all([
    readFile(new URL("../public/design-system.css", import.meta.url), "utf8"),
    readFile(new URL("../public/i18n.js", import.meta.url), "utf8"),
    readFile(new URL("../public/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/modules/house/room.html", import.meta.url), "utf8"),
    readFile(new URL("../public/platform-action-runtime.js", import.meta.url), "utf8")
  ]);

  assert.equal(room, canonicalRoom);
  assert.match(i18n, /function addHeaderLanguageButton\(\)/);
  assert.match(i18n, /topbar\.insertBefore\(button, nav\)/);
  assert.doesNotMatch(i18n, /addAlwaysVisibleLanguageButton|document\.body\.appendChild\(button\)|language-floating-button/);
  assert.match(styles, /\.language-header-button\{display:none\}/);
  assert.match(styles, /@media\(max-width:760px\)[\s\S]*\.language-header-button\{position:static/);
  assert.doesNotMatch(styles, /\.language-header-button\{[^}]*position:(?:fixed|sticky)/);

  assert.match(styles, /\.room-guide-page \.grid>\.card\{padding:13px 15px\}/);
  assert.match(room, /Your stay is verified\. Non-Thai overnight guests must also complete the required TM30 guest registration\./);
  assert.match(room, /Passport images are automatically deleted 14 days after upload, or sooner after processing\./);
  assert.doesNotMatch(room, /Guest access is active after the required TM30 Immigration registration/);
  assert.match(room, /data-action="contact" data-action-label="Open Concierge">Open Concierge<\/a>/);
  assert.match(actionRuntime, /const requestedLabel = element\.getAttribute\("data-action-label"\)/);
});

test("v5.11.33 mobile AI Concierge is a stable identifiable pill with no scroll or collision movement", async () => {
  const [styles, script] = await Promise.all([
    readFile(new URL("../public/ai-concierge.css", import.meta.url), "utf8"),
    readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8")
  ]);

  assert.match(script, /launcher\.setAttribute\("aria-label", "Open AI Concierge"\)/);
  assert.match(script, /ai-concierge-launcher-icon is-desktop" aria-hidden="true">✦/);
  assert.match(script, /ai-concierge-launcher-icon is-mobile" aria-hidden="true">💬/);
  assert.match(script, /ai-concierge-launcher-label is-mobile">AI Concierge/);
  assert.doesNotMatch(script, /mobileLauncherLayout|handleMobileLauncherScroll|nearestSafeLauncherTop|rectanglesOverlap|overlapArea|scheduleMobileLauncherLayout|ResizeObserver|--ai-concierge-lift/);
  assert.doesNotMatch(script, /window\.addEventListener\("scroll",[^\n]*Launcher/);

  assert.match(styles, /@media\(max-width:767px\)[\s\S]*width:148px[\s\S]*height:52px/);
  assert.match(styles, /right:calc\(12px \+ env\(safe-area-inset-right\)\)/);
  assert.match(styles, /bottom:calc\(12px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(styles, /body\.ai-concierge-ready\{padding-bottom:calc\(72px \+ env\(safe-area-inset-bottom\)\)\}/);
  assert.match(styles, /\.ai-concierge-launcher-icon\.is-desktop,\.ai-concierge-launcher-label\.is-desktop\{display:none\}/);
  assert.match(styles, /\.ai-concierge-launcher-icon\.is-mobile\{display:grid;font-size:20px\}/);
  assert.doesNotMatch(styles, /is-compact|is-collision-shifted|--ai-concierge-lift/);
});

test("v5.11.33 launcher is removed from the open chat surface and restored on close", async () => {
  const [styles, script] = await Promise.all([
    readFile(new URL("../public/ai-concierge.css", import.meta.url), "utf8"),
    readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8")
  ]);

  assert.match(styles, /\.ai-concierge-launcher\[hidden\]\{display:none\}/);
  assert.match(script, /function openPanel\(options = \{\}\)[\s\S]*launcher\.setAttribute\("aria-expanded", "true"\);[\s\S]*launcher\.hidden = true;[\s\S]*launcher\.setAttribute\("aria-hidden", "true"\);/);
  assert.match(script, /function closePanel\(\)[\s\S]*launcher\.hidden = false;[\s\S]*launcher\.removeAttribute\("aria-hidden"\);[\s\S]*launcher\.setAttribute\("aria-expanded", "false"\);/);
});

test("v5.11.34 moves only the mobile Room 11 crop downward while preserving desktop", async () => {
  const [styles, roomApp, roomData] = await Promise.all([
    readFile(new URL("../public/design-system.css", import.meta.url), "utf8"),
    readFile(new URL("../public/room-app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/room-data.js", import.meta.url), "utf8")
  ]);

  assert.match(roomApp, /document\.body\.dataset\.roomNumber = room/);
  assert.match(styles, /\.room-guide-page \.hero\{min-height:232px;height:232px\}/);
  assert.match(styles, /\.room-guide-page \.hero img\{height:232px;object-position:50% 54%\}/);
  assert.match(styles, /\.room-guide-page\[data-room-number="11"\] \.hero img\{object-position:72% 100%\}/);
  assert.match(styles, /\.room-guide-page\[data-room-number="11"\] \.hero-copy\{right:auto;left:18px;max-width:54%\}/);
  const mobileRoomBlock = styles.match(/@media\(max-width:760px\)\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.match(mobileRoomBlock, /\.room-guide-page\[data-room-number="11"\] \.hero img\{object-position:72% 100%\}/);
  const outsideMobileRoomBlock = styles.replace(/@media\(max-width:760px\)\{[\s\S]*?\n\}/, "");
  assert.doesNotMatch(outsideMobileRoomBlock, /data-room-number="11"[^}]*object-position:72% 100%/);
  assert.doesNotMatch(styles, /\.room-guide-page \.hero\{min-height:208px;height:208px\}/);
  assert.match(roomData, /"11": \{[\s\S]*"photo": "photo-07\.jpeg"[\s\S]*"note": "Room 11 is downstairs and marked clearly in the building photo\."/);
});

test("v5.11.28 owner operations styles distinguish lifecycle, diagnostics and narrow tables", async () => {
  const [styles, script] = await Promise.all([
    readFile(new URL("../public/concierge-admin.css", import.meta.url), "utf8"),
    readFile(new URL("../public/concierge-admin.js", import.meta.url), "utf8")
  ]);
  assert.match(styles, /\.concierge-admin-priority-label\.is-critical,\.concierge-admin-priority-label\.is-urgent/);
  assert.match(styles, /\.concierge-admin-pill\.is-status-acknowledged/);
  assert.match(styles, /\.concierge-admin-alert\.is-resolved/);
  assert.match(styles, /\.concierge-admin-diagnostic-grid\{[^}]*repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.concierge-admin-dialog\{[^}]*width:min\(470px,calc\(100% - 24px\)\)/);
  assert.match(styles, /@media\(max-width:620px\)[\s\S]*td::before\{content:attr\(data-label\)/);
  assert.match(script, /function diagnosticGrid\(fields\)/);
  assert.match(script, /is-status-\$\{status\}/);
  assert.match(script, /status === "resolved" \? " is-resolved"/);
  assert.match(script, /time\.dataset\.label = "Time"/);
  assert.match(script, /result\.dataset\.label = "Result"/);
});

test("explicit human request with a cannot-help reason reaches routine House contact during open hours", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
  const openNow = new Date("2026-08-30T05:57:00.000Z"); // Sunday 12:57 Bangkok
  const response = await handleConciergeRequest(
    guestRequest("I need to talk to a human you can not help me"),
    env,
    undefined,
    openNow
  );
  const body = await response.json();
  assert.equal(body.intentId, "generic_human_contact");
  assert.equal(body.source, "human-contact-policy");
  assert.match(body.answer, /contact The House team directly/i);
  assert.doesNotMatch(body.answer, /\bSu\b/i);
  assert.equal(body.actions.some((action) => action.route === "houseWhatsapp"), true);
  assert.equal(body.actions.some((action) => action.route === "houseCall"), true);
  assert.equal(store.alerts.length, 0);

  const closedNow = new Date("2026-08-30T13:00:00.000Z"); // Sunday 20:00 Bangkok
  const closed = await handleConciergeRequest(
    guestRequest("I need to talk to a human you can not help me"),
    env,
    undefined,
    closedNow
  );
  const closedBody = await closed.json();
  assert.equal(closedBody.intentId, "generic_human_contact");
  assert.match(closedBody.answer, /outside normal service hours/i);
  assert.equal(closedBody.actions.some((action) => action.route === "houseWhatsapp"), false);
  assert.equal(closedBody.actions.some((action) => action.route === "houseCall"), false);
  assert.equal(closedBody.actions.some((action) => action.href === "/emergency.html"), true);
  assert.equal(store.alerts.length, 0);
});

test("broad human-contact phrasing stays deterministic across natural variants", async () => {
  const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
  const openNow = new Date("2026-08-30T06:10:00.000Z"); // Sunday 13:10 Bangkok
  const recognized = [
    "Can I speak with someone?",
    "I want a real person",
    "I need help from a person",
    "Can you connect me to the team?",
    "Please put me through to reception",
    "Can I contact your staff?",
    "I want to speak to a manager",
    "I need customer service",
    "I want a live agent",
    "Can I call the housekeeper?",
    "I need someone",
    "I prefer to talk to a person",
    "Can I speak to a representative?",
    "I need a member of staff",
    "Can you get me a receptionist?",
    "Please connect me with customer support",
    "Could I talk with a support agent?",
    "I need somebody from your team"
  ];
  for (const phrase of recognized) {
    const response = await handleConciergeRequest(guestRequest(phrase), env, undefined, openNow);
    const body = await response.json();
    assert.equal(body.intentId, "generic_human_contact", phrase);
    assert.equal(body.source, "human-contact-policy", phrase);
    assert.equal(body.learningGap, false, phrase);
    assert.equal(store.alerts.length, 0, phrase);
  }

  const direct = [
    "Human please you can't help",
    "Human please you cannot help me",
    "Talk to a human now",
    "Please give me a real person",
    "Connect me to someone please",
    "Transfer me to a person",
    "I really need a human",
    "I still want to speak to someone",
    "The AI can't help me, I want a person",
    "This bot is not helping, connect me to staff",
    "I need to personally speak with a manager",
    "I insist on speaking to a representative",
    "No bot please, get me a member of staff",
    "I still need customer support now"
  ];
  for (const phrase of direct) {
    const response = await handleConciergeRequest(guestRequest(phrase), env, undefined, openNow);
    const body = await response.json();
    assert.equal(body.intentId, "generic_human_contact", phrase);
    assert.equal(body.source, "human-contact-policy", phrase);
    assert.match(body.answer, /contact The House team directly/i, phrase);
    assert.equal(body.actions.some((action) => action.route === "houseWhatsapp"), true, phrase);
    assert.equal(body.actions.some((action) => action.route === "houseCall"), true, phrase);
    assert.doesNotMatch(body.answer, /\bSu\b|\bWesty\b|\bFah\b/i, phrase);
    assert.equal(store.alerts.length, 0, phrase);
  }

  const closed = await handleConciergeRequest(guestRequest("Human please you can't help"), env, undefined, new Date("2026-08-30T13:10:00.000Z"));
  const closedBody = await closed.json();
  assert.equal(closedBody.intentId, "generic_human_contact");
  assert.equal(closedBody.actions.some((action) => action.route === "houseWhatsapp"), false);
  assert.equal(closedBody.actions.some((action) => action.route === "houseCall"), false);
  assert.equal(store.alerts.length, 0);
});

test("stay-extension phrasing always enters the dedicated booking collector", async () => {
  const phrases = [
    "I would like to extend my stay please",
    "I wanna stay longer",
    "Can I extend my stay?",
    "Can we stay longer?",
    "We would like to stay longer",
    "Could we extend our booking?",
    "Can I prolong my reservation?",
    "Would it be possible to stay longer?",
    "Can I stay another night?",
    "Can we add two more nights?",
    "I need 3 extra nights",
    "Can I keep the room for another night?",
    "Extend my booking please",
    "Extend our reservation please",
    "Can we extend by 4 nights?",
    "We'd like another two nights",
    "Can I stay one more night?",
    "I want to stay 5 more nights",
    "Could we have the room for two extra nights?",
    "Stay longer please",
    "One more night please",
    "Two more nights please",
    "Can we stay for longer?",
    "I want to remain for longer",
    "Can we keep our room longer?",
    "Can I have the room for another day?",
    "We need one more day",
    "Can we add two extra days?",
    "Could we stay until tomorrow?",
    "Can I extend?",
    "Extend it please"
  ];
  for (const phrase of phrases) {
    const { env, store } = createEnvironment({ OPENAI_API_KEY: "" });
    const response = await handleConciergeRequest(guestRequest(phrase), env, undefined, new Date("2026-08-30T06:15:00.000Z"));
    const body = await response.json();
    assert.equal(body.intentId, "stay_extension_booking_request", phrase);
    assert.equal(body.source, "booking-policy", phrase);
    assert.equal(body.workflow.type, "booking", phrase);
    assert.equal(body.workflow.kind, "stay_extension", phrase);
    assert.equal(body.workflow.status, "collecting", phrase);
    assert.equal(body.learningGap, false, phrase);
    assert.equal(body.workflow.missing.includes("contact"), true, phrase);
    assert.equal(store.alerts.length, 0, phrase);
  }
});

test("stay extension collects nights then private contact and sends one Fah-and-owner booking alert", async () => {
  const { env, store } = createEnvironment({
    OPENAI_API_KEY: "",
    WHATSAPP_ACCESS_TOKEN: "meta-test-token",
    WHATSAPP_PHONE_NUMBER_ID: "1234567890",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66 64 000 0001" }],
      booking: [{ label: "Fah", phone: "+66 96 000 0001" }],
      emergency: [
        { label: "Owner 1", phone: "+66 81 000 0002" },
        { label: "Owner 2", phone: "+66 82 000 0003" }
      ]
    })
  });
  const now = new Date("2026-08-30T06:20:00.000Z");
  const first = await handleConciergeRequest(guestRequest("I wanna stay longer"), env, undefined, now);
  const firstBody = await first.json();
  assert.equal(firstBody.workflow.kind, "stay_extension");
  assert.deepEqual(firstBody.workflow.missing, ["nights", "contact"]);
  assert.match(firstBody.answer, /How many additional nights/i);
  assert.equal(store.alerts.length, 0);

  const nights = await handleConciergeRequest(guestRequest("2", {
    workflowState: firstBody.workflow,
    history: [
      { role: "user", content: "I wanna stay longer" },
      { role: "assistant", content: firstBody.answer }
    ]
  }), env, undefined, now);
  const nightsBody = await nights.json();
  assert.equal(nightsBody.workflow.kind, "stay_extension");
  assert.deepEqual(nightsBody.workflow.missing, ["contact"]);
  assert.equal(nightsBody.workflow.bookingRequest.extensionNights, "2");
  assert.equal(nightsBody.workflow.bookingRequest.option, "2 additional nights");
  assert.match(nightsBody.answer, /WhatsApp or phone number/i);
  assert.equal(store.alerts.length, 0);

  const local = await handleConciergeRequest(guestRequest("0812345678", {
    workflowState: nightsBody.workflow,
    history: [
      { role: "user", content: "I wanna stay longer" },
      { role: "assistant", content: firstBody.answer },
      { role: "user", content: "2" },
      { role: "assistant", content: nightsBody.answer }
    ]
  }), env, undefined, now);
  const localBody = await local.json();
  assert.deepEqual(localBody.workflow.missing, ["contact"]);
  assert.match(localBody.answer, /local number/i);
  assert.match(localBody.answer, /\+66 for Thailand/i);
  assert.equal(store.alerts.length, 0);

  const originalFetch = globalThis.fetch;
  const outbound = [];
  globalThis.fetch = async (_url, options) => {
    outbound.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ messages: [{ id: `wamid.extension-${outbound.length}` }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  try {
    const completed = await handleConciergeRequest(guestRequest("+66 81 234 5678", {
      workflowState: localBody.workflow,
      history: [
        { role: "user", content: "I wanna stay longer" },
        { role: "assistant", content: firstBody.answer },
        { role: "user", content: "2" },
        { role: "assistant", content: nightsBody.answer }
      ]
    }), env, undefined, now);
    const completedBody = await completed.json();
    assert.equal(completedBody.intentId, "stay_extension_booking_request");
    assert.equal(completedBody.workflow.kind, "stay_extension");
    assert.equal(completedBody.workflow.status, "submitted");
    assert.match(completedBody.answer, /sent your request to our booking team/i);
    assert.match(completedBody.answer, /check availability/i);
    assert.equal(store.alerts.length, 1);
    assert.equal(store.alerts[0].alertType, "booking_request");
    assert.equal(store.alerts[0].recipientGroup, "booking_with_owners");
    assert.equal(outbound.length, 3);
    assert.deepEqual(outbound.map((payload) => payload.to).sort(), ["66810000002", "66820000003", "66960000001"]);
    assert.equal(outbound.every((payload) => payload.template.name === "house_booking_alert_v2"), true);
    const parameters = outbound[0].template.components[0].parameters;
    assert.equal(parameters.length, 6);
    assert.equal(parameters[2].text, "Stay extension");
    assert.equal(parameters[3].text, "2 additional nights");
    assert.equal(parameters[4].text, "Current stay");
    assert.match(parameters[5].text, /Guest reply: \+66812345678/);
    assert.doesNotMatch(JSON.stringify(outbound), /66640000001/);
    assert.doesNotMatch(JSON.stringify(store.interactions), /66812345678|81 234 5678/);
    assert.doesNotMatch(JSON.stringify(store.alerts), /66812345678|81 234 5678/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
function appsScriptFormatDate(date, timeZone, format) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  if (format === "yyyy") return parts.year;
  if (format === "yyyy-MM-dd") return `${parts.year}-${parts.month}-${parts.day}`;
  throw new Error(`unsupported test format ${format}`);
}

async function loadAirbnbSyncContext(overrides = {}) {
  const source = await readFile(new URL("../airbnb-sync/Code.gs", import.meta.url), "utf8");
  const context = vm.createContext({
    console,
    Utilities: { formatDate: appsScriptFormatDate },
    ...overrides
  });
  vm.runInContext(source, context, { filename: "airbnb-sync/Code.gs" });
  return { context, source };
}

test("v5.11.45 Airbnb parser accepts broader HM codes, either House/Room order and yearless dates", async () => {
  const { context } = await loadAirbnbSyncContext();
  assert.equal(context.firstConfirmationCode_("Confirmation HMABC123456789012345"), "HMABC123456789012345");
  assert.equal(context.firstConfirmationCode_("Too short HMABC12"), "");
  assert.equal(context.listingFromText_("The House Koh Tao — Room 6"), "1504212652507496103");
  assert.equal(context.listingFromText_("Room 6 at The House Koh Tao"), "1504212652507496103");
  assert.equal(context.listingFromText_("The House Koh Tao — Room 7"), "");

  const sameYear = context.datesFromEmail_(
    "Check-in Sun, Aug 30\nCheckout Tue, Sep 1",
    new Date("2026-08-30T05:00:00.000Z")
  );
  assert.equal(sameYear.checkInDate, "2026-08-30");
  assert.equal(sameYear.checkOutDate, "2026-09-01");

  const rollover = context.datesFromEmail_(
    "Check-in Wed, Dec 30\nCheckout Sat, Jan 2",
    new Date("2026-12-29T05:00:00.000Z")
  );
  assert.equal(rollover.checkInDate, "2026-12-30");
  assert.equal(rollover.checkOutDate, "2027-01-02");
});

test("v5.11.45 Airbnb Gmail scan does not depend on literal confirmation wording", async () => {
  let query = "";
  const message = {
    getFrom: () => "Airbnb <automated@airbnb.com>",
    getDate: () => new Date("2026-08-30T05:00:00.000Z"),
    getSubject: () => "A guest booked The House Koh Tao Room 6",
    getPlainBody: () => "Guest: Maya\nCode HMFAST123456\nCheck-in Sun, Aug 30\nCheckout Tue, Sep 1",
    getId: () => "test-message-id"
  };
  const { context } = await loadAirbnbSyncContext({
    GmailApp: {
      search(value) {
        query = value;
        return [{ getMessages: () => [message] }];
      }
    }
  });
  const records = context.readAirbnbReservationEmails_({ fullAudit: false, since: new Date("2026-08-30T04:30:00.000Z") });
  assert.match(query, /from:airbnb\.com/);
  assert.doesNotMatch(query, /confirmation code|reservation code|\(.*confirmation/i);
  assert.equal(records.HMFAST123456.listingId, "1504212652507496103");
  assert.equal(records.HMFAST123456.checkInDate, "2026-08-30");
  assert.equal(records.HMFAST123456.checkOutDate, "2026-09-01");
  assert.equal(records.HMFAST123456.guestFirstName, "Maya");
});

test("v5.11.45 Airbnb email fast path posts only trustworthy room-bound partial syncs", async () => {
  const outbound = [];
  const { context } = await loadAirbnbSyncContext({
    UrlFetchApp: {
      fetch(url, options) {
        outbound.push({ url, options });
        return { getResponseCode: () => 200, getContentText: () => "{}" };
      }
    }
  });
  const count = context.postEmailReservations_("https://guide.example", "sync-token", {
    HMFAST123456: {
      listingId: "1504212652507496103",
      checkInDate: "2026-08-30",
      checkOutDate: "2026-09-01",
      guestFirstName: "Maya",
      status: "confirmed",
      sourceRef: "gmail:test"
    },
    HMINCOMPLETE123: {
      listingId: "1504212652507496103",
      checkInDate: "",
      checkOutDate: "2026-09-01",
      status: "confirmed"
    },
    HMROOM7BLOCKED: {
      listingId: "not-an-active-listing",
      checkInDate: "2026-08-30",
      checkOutDate: "2026-09-01",
      status: "confirmed"
    }
  });
  assert.equal(count, 1);
  assert.equal(outbound.length, 1);
  const payload = JSON.parse(outbound[0].options.payload);
  assert.equal(payload.room, "6");
  assert.equal(payload.listingId, "1504212652507496103");
  assert.equal(payload.complete, false);
  assert.equal(payload.records.length, 1);
  assert.equal(payload.records[0].confirmationCode, "HMFAST123456");
});

test("v5.11.45 Airbnb idle five-minute runs skip calendars while hourly safety net reconciles all active rooms", async () => {
  const sourceProperties = (calendarAgeMinutes) => {
    const now = Date.now();
    const values = new Map([
      ["HOUSE_WORKER_ORIGIN", "https://guide.example"],
      ["RESERVATION_SYNC_TOKEN", "sync-token"],
      ["HOUSE_AIRBNB_LAST_SYNC_AT", new Date(now - 5 * 60_000).toISOString()],
      ["HOUSE_AIRBNB_LAST_CALENDAR_AT", new Date(now - calendarAgeMinutes * 60_000).toISOString()],
      ["HOUSE_AIRBNB_LAST_AUDIT_AT", new Date(now - 60 * 60_000).toISOString()]
    ]);
    for (const room of ["1", "2", "3", "4", "5", "6", "8", "9", "10", "11"]) values.set(`AIRBNB_ICAL_ROOM_${room}`, `https://calendar.example/${room}.ics`);
    return values;
  };

  async function run(calendarAgeMinutes) {
    const properties = sourceProperties(calendarAgeMinutes);
    const fetches = [];
    const { context } = await loadAirbnbSyncContext({
      LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
      PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => properties.get(key) || "", setProperty: (key, value) => properties.set(key, value) }) },
      GmailApp: { search: () => [] },
      UrlFetchApp: {
        fetch(url, options = {}) {
          fetches.push({ url, options });
          if (/\.ics$/.test(url)) return { getResponseCode: () => 200, getContentText: () => "BEGIN:VCALENDAR\nEND:VCALENDAR" };
          return { getResponseCode: () => 200, getContentText: () => "{}" };
        }
      }
    });
    context.syncHouseReservationsInternal_(false);
    return { fetches, properties };
  }

  const idle = await run(20);
  assert.equal(idle.fetches.length, 0);

  const due = await run(61);
  assert.equal(due.fetches.filter((item) => /\.ics$/.test(item.url)).length, 10);
  assert.equal(due.fetches.filter((item) => item.url.endsWith("/api/reservations/sync")).length, 10);
  assert.ok(due.properties.get("HOUSE_AIRBNB_LAST_CALENDAR_AT"));
});

test("v5.11.45 Airbnb trigger installer is five-minute and preserves one handler", async () => {
  const deleted = [];
  let everyMinutes = 0;
  let created = 0;
  const existing = [
    { getHandlerFunction: () => "syncHouseReservations" },
    { getHandlerFunction: () => "anotherJob" }
  ];
  const { context, source } = await loadAirbnbSyncContext({
    ScriptApp: {
      getProjectTriggers: () => existing,
      deleteTrigger: (trigger) => deleted.push(trigger),
      newTrigger: () => ({
        timeBased: () => ({
          everyMinutes(value) {
            everyMinutes = value;
            return { create() { created += 1; } };
          }
        })
      })
    }
  });
  context.runFullHouseReservationAudit = () => {};
  context.installHouseReservationTrigger();
  assert.equal(deleted.length, 1);
  assert.equal(everyMinutes, 5);
  assert.equal(created, 1);
  assert.match(source, /everyMinutes\(5\)/);
  assert.doesNotMatch(source, /everyHours\(1\)/);
});

test("v5.11.45 approved Meta action templates use the exact new BODY orders and old mappings fail closed", async () => {
  const vars = JSON.parse(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8")).vars;
  const recipient = { label: "Team", phone: "66810000002" };
  const reference = "alert_12345678-1234-1234-1234-123456789143";
  const base = {
    id: reference,
    room: "6",
    createdAt: "2026-08-30T06:30:00.000Z",
    bangkokTime: "30 Aug 2026, 13:30",
    severity: "attention",
    privateReplyContact: "+66 81 234 5678"
  };
  const values = (built) => built.payload.template.components[0].parameters.map((item) => item.text);

  const service = buildWhatsAppTemplatePayload({ ...base, alertType: "stay_support", summary: "Room cleaning requested at 11:00 AM." }, recipient, vars);
  assert.deepEqual(values(service), ["Room cleaning", "Room 6", "30 Aug 2026, 13:30", "Room cleaning requested at 11:00 AM. Guest reply: +66812345678", reference]);

  const booking = buildWhatsAppTemplatePayload({
    ...base,
    alertType: "booking_request",
    summary: "Ferry booking requested.",
    bookingRequest: { kind: "ferry", activity: "Ferry tickets", preferredDate: "31 Aug 2026", pickupTime: "9:00 AM", guestCount: "2", pickupLocation: "Koh Tao", destination: "Koh Samui", notes: "Morning" }
  }, recipient, vars);
  assert.deepEqual(values(booking).slice(0, 4), ["Ferry tickets", "Room 6", "31 Aug 2026, 9:00 AM", "2"]);
  assert.equal(values(booking)[5], reference);

  const extension = buildWhatsAppTemplatePayload({
    ...base,
    alertType: "booking_request",
    summary: "Guest would like to extend the current stay.",
    bookingRequest: { kind: "stay_extension", activity: "Stay extension", extensionNights: "2", option: "2 additional nights", notes: "" }
  }, recipient, vars);
  assert.deepEqual(values(extension).slice(0, 4), ["Stay extension", "Room 6", "Current stay", "Not provided"]);
  assert.match(values(extension)[4], /2 additional nights/);
  assert.match(values(extension)[4], /Guest reply: \+66812345678/);
  assert.equal(values(extension)[5], reference);

  const luggage = buildWhatsAppTemplatePayload({ ...base, alertType: "luggage_storage", summary: "Please store luggage.", luggageRequest: { context: "Departure", bagCount: "3", requestedDate: "31 Aug 2026", requestedTime: "1:00 PM" } }, recipient, vars);
  assert.deepEqual(values(luggage).slice(0, 4), ["Departure", "Room 6", "3", "31 Aug 2026, 1:00 PM"]);
  assert.equal(values(luggage)[5], reference);

  const urgent = buildWhatsAppTemplatePayload({ ...base, alertType: "property_emergency", severity: "critical", summary: "There is fire in my room." }, recipient, vars);
  assert.deepEqual(values(urgent).slice(0, 3), ["Fire / smoke", "Room 6", "30 Aug 2026, 13:30"]);
  assert.equal(values(urgent)[4], reference);

  const lost = buildWhatsAppTemplatePayload({ ...base, alertType: "verified_spare_key_release", summary: "Verified spare-key request." }, recipient, vars);
  assert.deepEqual(values(lost), ["Room 6", "30 Aug 2026, 13:30", reference]);
  assert.equal(lost.payload.template.components[1].parameters[0].payload, `HOUSE_ALERT|RECEIVED|${reference}`);
  assert.equal(lost.payload.template.components[2].parameters[0].payload, `HOUSE_ALERT|RESOLVE|${reference}`);

  const oldMappings = {
    ...vars,
    WHATSAPP_SERVICE_ACTION_TEMPLATE_NAME: "house_service_alert_actions_v2",
    WHATSAPP_BOOKING_ACTION_TEMPLATE_NAME: "house_booking_alert_actions_v1",
    WHATSAPP_LUGGAGE_ACTION_TEMPLATE_NAME: "house_luggage_alert_actions_v1",
    WHATSAPP_URGENT_ACTION_TEMPLATE_NAME: "house_urgent_alert_actions_v1",
    WHATSAPP_LOST_KEY_ACTION_TEMPLATE_NAME: "house_lost_key_alert_actions_v1"
  };
  assert.equal(whatsappAlertConfiguration(oldMappings).staffQuickActionsEnabled, false);
  const fallback = buildWhatsAppTemplatePayload({ ...base, alertType: "stay_support", summary: "Fresh towels please." }, recipient, oldMappings);
  assert.equal(fallback.payload.template.name, "house_service_alert_v3");
  assert.equal(fallback.payload.template.components.length, 1);
});

test("Owner Admin routes Room 7 direct-stay creation through the real admin router", async () => {
  const { env, store } = createEnvironment();
  const response = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/direct-stays", {
    method: "POST",
    headers: { authorization: "Bearer admin_token_test_5500", "content-type": "application/json" },
    body: JSON.stringify({ room: "7", checkInDate: "2026-08-31", checkOutDate: "2026-09-05" })
  }), env, "/api/concierge/admin/direct-stays");
  assert.equal(response.status, 200);
  const created = await response.json();
  assert.equal(created.room, "7");
  assert.match(created.confirmationCode, /^HS[A-Z0-9]{10}$/);
  assert.equal(created.welcomeUrl, "https://guide.example/room/7");
  assert.equal(store.stayReservations.at(-1).provider, "direct");
  assert.equal(store.stayReservations.at(-1).listingId, "house-direct-7");
});

test("Room 7 is guide-enabled for direct testing while remaining excluded from Airbnb synchronization", async () => {
  assert.equal(Object.values(listingRoomMap).includes("7"), false);

  const { env, store } = createEnvironment();
  const created = await handleStayAdminRequest(new Request("https://guide.example/api/concierge/admin/direct-stays", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ room: "7", checkInDate: "2027-08-14", checkOutDate: "2027-08-16" })
  }), env, "/api/concierge/admin/direct-stays", store);
  assert.equal(created.status, 200);
  const direct = await created.json();
  assert.equal(direct.room, "7");
  assert.equal(direct.welcomeUrl, "https://guide.example/room/7");
  assert.equal(store.stayReservations[0].provider, "direct");
  assert.equal(store.stayReservations[0].listingId, "house-direct-7");

  const verified = await handleStayGuestRequest(new Request("https://guide.example/api/stay/verify", {
    method: "POST",
    headers: { origin: "https://guide.example", "content-type": "application/json" },
    body: JSON.stringify({ room: "7", confirmationCode: direct.confirmationCode })
  }), env, "/api/stay/verify", null, new Date("2027-08-14T08:00:00.000Z"));
  assert.equal(verified.status, 200);
  const cookie = verified.headers.get("set-cookie").split(";")[0];

  const thai = await handleStayGuestRequest(new Request("https://guide.example/api/stay/nationality", {
    method: "POST",
    headers: { origin: "https://guide.example", cookie, "content-type": "application/json" },
    body: JSON.stringify({ nationality: "thai", allGuestsThai: true })
  }), env, "/api/stay/nationality", null, new Date("2027-08-14T08:01:00.000Z"));
  assert.equal(thai.status, 200);

  const content = await handleStayGuestRequest(new Request("https://guide.example/api/stay/room-content?room=7", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/room-content", null, new Date("2027-08-14T08:02:00.000Z"));
  assert.equal(content.status, 200);
  const roomContent = await content.json();
  assert.equal(roomContent.floor, "Downstairs");
  assert.equal(roomContent.note, "Room 7 is downstairs. Follow the building around the corner to reach it.");
  assert.equal(roomContent.roomPhotoUrl, "/api/stay/room-photo?room=7");

  const [roomsHtml, adminHtml, roomApp, registrationEntry, config, indexSource, roomData] = await Promise.all([
    readFile(new URL("../public/rooms.html", import.meta.url), "utf8"),
    readFile(new URL("../public/concierge-admin.html", import.meta.url), "utf8"),
    readFile(new URL("../public/room-app.js", import.meta.url), "utf8"),
    readFile(new URL("../public/registration-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../public/ai-concierge-config.js", import.meta.url), "utf8"),
    readFile(new URL("../src/index.js", import.meta.url), "utf8"),
    readFile(new URL("../public/room-data.js", import.meta.url), "utf8")
  ]);
  assert.match(roomsHtml, /href="\/room\/7" data-room="7">Room 7/);
  const directSelect = adminHtml.match(/<select id="directStayRoom"[\s\S]*?<\/select>/)?.[0] || "";
  const manualAirbnbSelect = adminHtml.match(/<select id="manualStayRoom"[\s\S]*?<\/select>/)?.[0] || "";
  assert.match(directSelect, /value="7">Room 7/);
  assert.doesNotMatch(manualAirbnbSelect, /value="7">Room 7/);
  assert.match(roomApp, /1\|2\|3\|4\|5\|6\|7\|8\|9\|10\|11/);
  assert.match(registrationEntry, /1\|2\|3\|4\|5\|6\|7\|8\|9\|10\|11/);
  assert.match(config, /"roomOptions": \["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"\]/);
  assert.ok(indexSource.includes("const ACTIVE_ROOM_PATH = /^\\/room\\/(1|2|3|4|5|6|7|8|9|10|11)\\/?$/;"));
  assert.match(roomData, /"photo": "room-07-location\.jpeg"/);
  assert.match(roomData, /Room 1 is upstairs\. Follow the path around the side of the house to the staircase at the back\./);
  assert.match(roomData, /Room 4 is upstairs\. Follow the path around the side of the house to the staircase at the back\./);

  const room7Photo = await readFile(new URL("../public/assets/room-07-location.jpeg", import.meta.url));
  assert.ok(room7Photo.length > 100_000);
});

test("verified registration-pending guests receive arrival directions but not the full room guide", async () => {
  const now = new Date("2026-08-31T07:30:00.000Z");
  const { env } = createEnvironment({ GUEST_ACCESS_ENFORCEMENT: "true" });
  const cookie = await syncAndVerifyStay(env, { room: "11", confirmationCode: "HMARRIVAL11", checkInDate: "2026-08-31", checkOutDate: "2026-09-05", now });

  const arrival = await handleStayGuestRequest(new Request("https://guide.example/api/stay/arrival-content?room=11", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/arrival-content", null, now);
  assert.equal(arrival.status, 200);
  const arrivalBody = await arrival.json();
  assert.equal(arrivalBody.room, "11");
  assert.match(arrivalBody.note, /Room 11 is downstairs/i);
  assert.equal(arrivalBody.roomPhotoUrl, "/api/stay/arrival-room-photo?room=11");
  assert.equal(arrivalBody.entrancePhotoUrl, "/api/stay/arrival-entrance-photo?room=11");

  const fullRoom = await handleStayGuestRequest(new Request("https://guide.example/api/stay/room-content?room=11", {
    headers: { origin: "https://guide.example", cookie }
  }), env, "/api/stay/room-content", null, now);
  assert.equal(fullRoom.status, 403);
  assert.equal((await fullRoom.json()).error, "guest_registration_required");
});

test("registration-pending concierge allows find-my-room and reminds about passport registration", async () => {
  const now = new Date("2026-08-31T07:31:00.000Z");
  const { env } = createEnvironment({ GUEST_ACCESS_ENFORCEMENT: "true", OPENAI_API_KEY: "not-used" });
  const cookie = await syncAndVerifyStay(env, { room: "11", confirmationCode: "HMARRIVAL12", checkInDate: "2026-08-31", checkOutDate: "2026-09-05", now });
  await markForeignRegistrationPending(env, cookie, 2, now);

  const response = await handleConciergeRequest(verifiedConciergeRequest("find my room", cookie), env, undefined, now);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.intentId, "find_room");
  assert.equal(body.source, "verified-arrival-policy");
  assert.match(body.answer, /Room 11 is downstairs/i);
  assert.match(body.answer, /upload the remaining required passport image/i);
  assert.ok(body.actions.some((action) => action.href === "/room/11#arrivalAccess"));
  assert.ok(body.actions.some((action) => action.href === "/room/11#verifiedStayAccess"));
});

test("registration-pending guests cannot create service, cleaning, luggage or booking alerts", async () => {
  const now = new Date("2026-08-31T07:32:00.000Z");
  const { env, store } = createEnvironment({ GUEST_ACCESS_ENFORCEMENT: "true", OPENAI_API_KEY: "not-used" });
  const cookie = await syncAndVerifyStay(env, { room: "11", confirmationCode: "HMARRIVAL13", checkInDate: "2026-08-31", checkOutDate: "2026-09-05", now });
  await markForeignRegistrationPending(env, cookie, 1, now);

  for (const question of [
    "I need fresh towels.",
    "Please clean my room at 3 PM.",
    "Please store my luggage after checkout.",
    "I want to book diving tomorrow for 2 people."
  ]) {
    const response = await handleConciergeRequest(verifiedConciergeRequest(question, cookie, {
      sessionId: `session_pending_${crypto.randomUUID().replaceAll("-", "_")}`
    }), env, undefined, now);
    const body = await response.json();
    assert.match(body.intentId, /passport_registration_pending|nationality_selection_required/);
    assert.match(body.answer, /passport registration is not complete|registration/i);
  }
  assert.equal(store.alerts.length, 0);
});

test("pending-access UI exposes only registration, find-room and emergency quick actions", async () => {
  const [script, entry, html] = await Promise.all([
    readFile(new URL("../public/ai-concierge.js", import.meta.url), "utf8"),
    readFile(new URL("../public/registration-entry.js", import.meta.url), "utf8"),
    readFile(new URL("../public/room-access.html", import.meta.url), "utf8")
  ]);
  assert.match(script, /const pendingArrivalActions = \[/);
  assert.match(script, /label: "Find my room"/);
  assert.match(script, /conciergeAccessState\.registrationIncomplete\s*\? pendingArrivalActions/);
  assert.match(script, /contextPrompts\.hidden = nextState\.registrationIncomplete/);
  assert.match(script, /serviceHours\.hidden = isPublicAccess \|\| nextState\.registrationIncomplete/);
  assert.match(entry, /\/api\/stay\/arrival-content\?room=/);
  assert.match(html, /id="arrivalAccess" hidden/);
  assert.match(html, /Please complete guest registration to unlock the full guest guide and service requests/);
  assert.doesNotMatch(html.match(/id="arrivalAccess"[\s\S]*?<\/section>/)?.[0] || "", /Wi-Fi password|Fresh towels|Room cleaning|key-box code/i);
});

test("expense receipt analysis creates an owner-review draft without storing the receipt", async () => {
  const { env, store, passportBucket } = createEnvironment({ OPENAI_API_KEY: "openai-expense-test" });
  const png = new Uint8Array(220);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const form = new FormData();
  form.set("receipt", new Blob([png], { type: "image/png" }), "receipt.png");
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({
        date: "2026-08-23",
        amount: 8190,
        vendor: "Island Hardware",
        description: "Stair construction materials",
        category: "Maintenance",
        paymentMethod: "Cash",
        roomArea: "",
        confidence: 0.93,
        notes: ""
      }) }] }]
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  let response;
  try {
    response = await handleExpenseAdminRequest(new Request("https://guide.example/api/concierge/admin/expenses/analyze", {
      method: "POST",
      body: form
    }), env, "/api/concierge/admin/expenses/analyze", store, "actor_hash_test");
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.draft.amount, 8190);
  assert.equal(body.draft.category, "Maintenance");
  assert.equal(body.draft.vendor, "Island Hardware");
  assert.equal(requestBody.store, false);
  assert.equal(requestBody.model, "gpt-5.6");
  assert.equal(requestBody.input[0].content[1].type, "input_image");
  assert.match(requestBody.input[0].content[1].image_url, /^data:image\/png;base64,/);
  assert.equal(passportBucket.objects.size, 0, "analysis must not create an orphaned stored receipt");
  assert.equal(store.expenseRecords.length, 0, "analysis remains a draft until owner confirmation");
});

test("owner expense save stores private receipt, reports monthly totals, warns duplicates and exports CSV", async () => {
  const { env, store, passportBucket } = createEnvironment();
  const makeForm = (confirmDuplicate = false) => {
    const form = new FormData();
    form.set("date", "2026-08-23");
    form.set("amount", "8190");
    form.set("category", "Maintenance");
    form.set("description", "Stair construction / repair");
    form.set("vendor", "Island Hardware");
    form.set("paymentMethod", "Cash");
    form.set("roomArea", "Room 7");
    form.set("notes", "Owner-confirmed test expense");
    form.set("confirmDuplicate", confirmDuplicate ? "true" : "false");
    const png = new Uint8Array(240);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    form.set("receipt", new Blob([png], { type: "image/png" }), "bill.png");
    return form;
  };

  const saved = await handleExpenseAdminRequest(new Request("https://guide.example/api/concierge/admin/expenses", {
    method: "POST", body: makeForm(false)
  }), env, "/api/concierge/admin/expenses", store, "actor_hash_test");
  assert.equal(saved.status, 201);
  assert.equal(store.expenseRecords.length, 1);
  assert.equal(store.expenseRecords[0].amountMinor, 819000);
  assert.equal(store.expenseRecords[0].currency, "THB");
  assert.equal(store.expenseRecords[0].roomArea, "Room 7");
  assert.ok([...passportBucket.objects.keys()].some((key) => key.startsWith("expenses/2026-08/")));

  const duplicate = await handleExpenseAdminRequest(new Request("https://guide.example/api/concierge/admin/expenses", {
    method: "POST", body: makeForm(false)
  }), env, "/api/concierge/admin/expenses", store, "actor_hash_test");
  assert.equal(duplicate.status, 409);
  const duplicateBody = await duplicate.json();
  assert.equal(duplicateBody.error, "possible_duplicate");
  assert.equal(duplicateBody.duplicates[0].amount, 8190);
  assert.equal(store.expenseRecords.length, 1);

  const list = await handleExpenseAdminRequest(new Request("https://guide.example/api/concierge/admin/expenses?month=2026-08"), env, "/api/concierge/admin/expenses", store, "actor_hash_test");
  const listBody = await list.json();
  assert.equal(listBody.configuration.currency, "THB");
  assert.equal(listBody.totals.amount, 8190);
  assert.equal(listBody.totals.entries, 1);
  assert.equal(listBody.totals.receipts, 1);
  assert.equal(listBody.totals.categories.Maintenance, 8190);
  assert.equal(listBody.records[0].hasReceipt, true);
  assert.equal("receiptObjectKey" in listBody.records[0], false);

  const csv = await handleExpenseAdminRequest(new Request("https://guide.example/api/concierge/admin/expenses/export.csv?month=2026-08"), env, "/api/concierge/admin/expenses/export.csv", store, "actor_hash_test");
  assert.equal(csv.status, 200);
  const text = await csv.text();
  assert.match(text, /Date,Category,Description,Amount \(THB\)/);
  assert.match(text, /2026-08-23,Maintenance,Stair construction \/ repair,8190\.00,Island Hardware,Cash,Room 7/);
});

test("owner can privately download and delete an expense receipt without exposing it publicly", async () => {
  const { env, store, passportBucket } = createEnvironment();
  const objectKey = "expenses/2026-08/private-expense.png";
  await passportBucket.put(objectKey, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]));
  const id = "exp_private-expense-record-1234567890";
  store.expenseRecords.push({
    id, expenseDate: "2026-08-31", category: "Utilities", description: "Water bill",
    amountMinor: 4275000, currency: "THB", vendor: "Water supplier", paymentMethod: "Bank transfer", roomArea: "", notes: "",
    receiptObjectKey: objectKey, receiptMediaType: "image/png", receiptExtension: "png", receiptSizeBytes: 8,
    createdAt: "2026-08-31T08:00:00.000Z"
  });

  const download = await handleExpenseAdminRequest(new Request(`https://guide.example/api/concierge/admin/expense-files/${id}`), env, `/api/concierge/admin/expense-files/${id}`, store, "actor_hash_test");
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("cache-control"), "no-store, max-age=0");
  assert.match(download.headers.get("content-disposition"), /expense-2026-08-31/);

  const removed = await handleExpenseAdminRequest(new Request("https://guide.example/api/concierge/admin/expenses/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, confirmation: "DELETE EXPENSE" })
  }), env, "/api/concierge/admin/expenses/delete", store, "actor_hash_test");
  assert.equal(removed.status, 200);
  assert.equal(store.expenseRecords.length, 0);
  assert.equal(passportBucket.objects.has(objectKey), false);
  assert.ok(store.adminAudit.some((entry) => entry.action === "expense_deleted"));
});

test("expense admin module is isolated, mobile-friendly and routes only through owner admin", async () => {
  const html = await readFile(new URL("../public/concierge-admin.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../public/concierge-admin.js", import.meta.url), "utf8");
  const apiSource = await readFile(new URL("../src/concierge-api.js", import.meta.url), "utf8");
  assert.match(html, /Expenses &amp; private receipts/);
  assert.match(html, /id="expenseReceipt"[^>]+accept="image\/jpeg,image\/png,image\/webp,image\/heic,application\/pdf"/);
  assert.doesNotMatch(html, /id="expenseReceipt"[^>]+capture=/);
  assert.match(html, />Analyze receipt</);
  assert.match(html, />Export finance CSV</);
  assert.match(script, /\/api\/concierge\/admin\/expenses\/analyze/);
  assert.match(script, /Possible duplicate expense/);
  assert.match(apiSource, /handleExpenseAdminRequest/);
  assert.match(apiSource, /path\.includes\("\/expenses"\) \|\| path\.includes\("\/expense-files\/"\)/);
  assert.doesNotMatch(apiSource, /dispatchConciergeAlert\([^)]*expense/i);
});

test("Owner Admin router exposes expense management only after admin authorization", async () => {
  const { env, store } = createEnvironment();
  store.expenseRecords.push({
    id: "exp_admin-router-expense-1234567890",
    expenseDate: "2026-09-01",
    category: "Cleaning",
    description: "Cleaning supplies",
    amountMinor: 15800,
    currency: "THB",
    vendor: "Local shop",
    paymentMethod: "Cash",
    roomArea: "",
    notes: "",
    receiptObjectKey: "",
    receiptMediaType: "",
    receiptExtension: "",
    receiptSizeBytes: 0,
    createdAt: "2026-09-01T07:00:00.000Z"
  });
  const path = "/api/concierge/admin/expenses";
  const denied = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/expenses?month=2026-09"), env, path);
  assert.equal(denied.status, 401);
  const allowed = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/expenses?month=2026-09", {
    headers: { authorization: "Bearer admin_token_test_5500" }
  }), env, path);
  assert.equal(allowed.status, 200);
  const body = await allowed.json();
  assert.equal(body.totals.entries, 1);
  assert.equal(body.records[0].description, "Cleaning supplies");
});

test("expense module keeps property currency, timezone and categories configurable for white-label deployments", async () => {
  const { env, store } = createEnvironment({
    EXPENSE_CURRENCY: "EUR",
    PROPERTY_TIME_ZONE: "Europe/Berlin",
    EXPENSE_CATEGORIES: JSON.stringify(["Operations", "Payroll", "Other"])
  });

  const configurationResponse = await handleExpenseAdminRequest(
    new Request("https://guide.example/api/concierge/admin/expenses?month=2026-09"),
    env,
    "/api/concierge/admin/expenses",
    store,
    "actor_hash_test"
  );
  assert.equal(configurationResponse.status, 200);
  const configurationBody = await configurationResponse.json();
  assert.equal(configurationBody.configuration.currency, "EUR");
  assert.equal(configurationBody.configuration.timeZone, "Europe/Berlin");
  assert.deepEqual(configurationBody.configuration.categories, ["Operations", "Payroll", "Other"]);
  assert.equal(configurationBody.configuration.minorUnitDigits, 2);

  const form = new FormData();
  form.set("date", "2026-09-01");
  form.set("amount", "12.34");
  form.set("category", "Operations");
  form.set("description", "Generic property supplies");
  form.set("vendor", "Example Vendor");
  form.set("paymentMethod", "Card");
  form.set("roomArea", "Reception");
  form.set("notes", "White-label configuration regression");
  const saved = await handleExpenseAdminRequest(new Request("https://guide.example/api/concierge/admin/expenses", {
    method: "POST",
    body: form
  }), env, "/api/concierge/admin/expenses", store, "actor_hash_test");
  assert.equal(saved.status, 201);
  assert.equal(store.expenseRecords[0].currency, "EUR");
  assert.equal(store.expenseRecords[0].amountMinor, 1234);

  const csv = await handleExpenseAdminRequest(
    new Request("https://guide.example/api/concierge/admin/expenses/export.csv?month=2026-09"),
    env,
    "/api/concierge/admin/expenses/export.csv",
    store,
    "actor_hash_test"
  );
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /Amount \(EUR\)/);
});

test("owner income entry calculates net, warns duplicates and combines with expenses in the finance overview", async () => {
  const { env, store } = createEnvironment();
  store.expenseRecords.push({
    id: "exp_finance-expense-record-1234567890",
    expenseDate: "2026-09-01",
    category: "Maintenance",
    description: "Room 7 repair",
    amountMinor: 819000,
    currency: "THB",
    vendor: "Island Hardware",
    paymentMethod: "Cash",
    roomArea: "Room 7",
    notes: "",
    receiptObjectKey: "",
    receiptMediaType: "",
    receiptExtension: "",
    receiptSizeBytes: 0,
    createdAt: "2026-09-01T07:00:00.000Z"
  });

  const payload = {
    date: "2026-09-01",
    category: "Airbnb",
    gross: "3200",
    fees: "480",
    unit: "Room 5",
    description: "3-night Airbnb stay",
    paymentMethod: "Bank transfer",
    reference: "TEST-BOOKING-REF",
    notes: "Owner-confirmed test income"
  };
  const saved = await handleFinanceAdminRequest(new Request("https://guide.example/api/concierge/admin/income", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }), env, "/api/concierge/admin/income", store, "actor_hash_test");
  assert.equal(saved.status, 201);
  assert.equal((await saved.json()).net, 2720);
  assert.equal(store.incomeRecords.length, 1);
  assert.equal(store.incomeRecords[0].grossMinor, 320000);
  assert.equal(store.incomeRecords[0].feesMinor, 48000);
  assert.equal(store.incomeRecords[0].netMinor, 272000);
  assert.equal(store.incomeRecords[0].currency, "THB");
  assert.equal(store.incomeRecords[0].unit, "Room 5");

  const duplicate = await handleFinanceAdminRequest(new Request("https://guide.example/api/concierge/admin/income", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  }), env, "/api/concierge/admin/income", store, "actor_hash_test");
  assert.equal(duplicate.status, 409);
  const duplicateBody = await duplicate.json();
  assert.equal(duplicateBody.error, "possible_duplicate");
  assert.equal(duplicateBody.duplicates[0].gross, 3200);
  assert.equal(duplicateBody.duplicates[0].net, 2720);
  assert.equal(store.incomeRecords.length, 1);

  const invalidFees = await handleFinanceAdminRequest(new Request("https://guide.example/api/concierge/admin/income", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, reference: "DIFFERENT", fees: "4000" })
  }), env, "/api/concierge/admin/income", store, "actor_hash_test");
  assert.equal(invalidFees.status, 400);

  const overview = await handleFinanceAdminRequest(
    new Request("https://guide.example/api/concierge/admin/finance?month=2026-09"),
    env,
    "/api/concierge/admin/finance",
    store,
    "actor_hash_test"
  );
  assert.equal(overview.status, 200);
  const body = await overview.json();
  assert.equal(body.totals.grossIncome, 3200);
  assert.equal(body.totals.fees, 480);
  assert.equal(body.totals.netIncome, 2720);
  assert.equal(body.totals.expenses, 8190);
  assert.equal(body.totals.operatingResult, -5470);
  assert.equal(body.totals.incomeEntries, 1);
  assert.equal(body.totals.expenseEntries, 1);
  assert.equal(body.totals.locations["Room 5"].netIncome, 2720);
  assert.equal(body.totals.locations["Room 7"].expenses, 8190);
  assert.equal(body.income[0].net, 2720);

  const csv = await handleFinanceAdminRequest(
    new Request("https://guide.example/api/concierge/admin/finance/export.csv?month=2026-09"),
    env,
    "/api/concierge/admin/finance/export.csv",
    store,
    "actor_hash_test"
  );
  assert.equal(csv.status, 200);
  const csvText = await csv.text();
  assert.match(csvText, /Type,Date,Category \/ source,Description,Gross income \(THB\),Fees \(THB\),Net income \(THB\),Expense \(THB\),Operating effect \(THB\)/);
  assert.match(csvText, /Income,2026-09-01,Airbnb,3-night Airbnb stay,3200\.00,480\.00,2720\.00,,2720\.00,TEST-BOOKING-REF,Bank transfer,Room 5/);
  assert.match(csvText, /Expense,2026-09-01,Maintenance,Room 7 repair,,,,8190\.00,-8190\.00,Island Hardware,Cash,Room 7/);

  const incomeId = store.incomeRecords[0].id;
  const removed = await handleFinanceAdminRequest(new Request("https://guide.example/api/concierge/admin/income/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: incomeId, confirmation: "DELETE INCOME" })
  }), env, "/api/concierge/admin/income/delete", store, "actor_hash_test");
  assert.equal(removed.status, 200);
  assert.equal(store.incomeRecords.length, 0);
  assert.ok(store.adminAudit.some((entry) => entry.action === "income_deleted"));
});

test("finance admin UI and routes stay owner-only and keep income separate from guest operations", async () => {
  const [html, script, apiSource] = await Promise.all([
    readFile(new URL("../public/concierge-admin.html", import.meta.url), "utf8"),
    readFile(new URL("../public/concierge-admin.js", import.meta.url), "utf8"),
    readFile(new URL("../src/concierge-api.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /Finance — income &amp; expenses/);
  assert.match(html, /id="incomeForm"/);
  assert.match(html, /id="incomeGross"/);
  assert.match(html, /id="incomeFees"/);
  assert.match(html, /id="incomeNet"[^>]+readonly/);
  assert.match(html, /id="financeLocationSummary"/);
  assert.match(html, />Export finance CSV</);
  assert.match(script, /\/api\/concierge\/admin\/income/);
  assert.match(script, /\/api\/concierge\/admin\/finance\?month=/);
  assert.match(script, /Operating result/);
  assert.match(apiSource, /handleFinanceAdminRequest/);
  assert.match(apiSource, /path\.includes\("\/finance"\) \|\| path\.includes\("\/income"\)/);
  assert.doesNotMatch(apiSource, /dispatchConciergeAlert\([^)]*income/i);

  const { env, store } = createEnvironment();
  store.incomeRecords.push({
    id: "inc_admin-router-income-1234567890",
    incomeDate: "2026-09-01",
    category: "Direct booking",
    description: "Direct stay",
    grossMinor: 300000,
    feesMinor: 0,
    netMinor: 300000,
    currency: "THB",
    unit: "Room 7",
    paymentMethod: "Cash",
    reference: "",
    notes: "",
    createdAt: "2026-09-01T08:00:00.000Z"
  });
  const path = "/api/concierge/admin/finance";
  const denied = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/finance?month=2026-09"), env, path);
  assert.equal(denied.status, 401);
  const allowed = await handleAdminRequest(new Request("https://guide.example/api/concierge/admin/finance?month=2026-09", {
    headers: { authorization: "Bearer admin_token_test_5500" }
  }), env, path);
  assert.equal(allowed.status, 200);
  const body = await allowed.json();
  assert.equal(body.totals.netIncome, 3000);
  assert.equal(body.income[0].unit, "Room 7");
});

test("finance module keeps income sources, property currency and timezone configurable for white-label deployments", async () => {
  const { env, store } = createEnvironment({
    EXPENSE_CURRENCY: "EUR",
    PROPERTY_TIME_ZONE: "Europe/Berlin",
    EXPENSE_CATEGORIES: JSON.stringify(["Operations", "Payroll", "Other"]),
    INCOME_CATEGORIES: JSON.stringify(["OTA", "Direct", "Other income"])
  });

  const initial = await handleFinanceAdminRequest(
    new Request("https://guide.example/api/concierge/admin/finance?month=2026-09"),
    env,
    "/api/concierge/admin/finance",
    store,
    "actor_hash_test"
  );
  assert.equal(initial.status, 200);
  const initialBody = await initial.json();
  assert.equal(initialBody.configuration.currency, "EUR");
  assert.equal(initialBody.configuration.timeZone, "Europe/Berlin");
  assert.deepEqual(initialBody.configuration.categories, ["OTA", "Direct", "Other income"]);

  const saved = await handleFinanceAdminRequest(new Request("https://guide.example/api/concierge/admin/income", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      date: "2026-09-01",
      category: "Direct",
      gross: "12.34",
      fees: "1.34",
      unit: "Suite A",
      description: "Generic direct accommodation income",
      paymentMethod: "Card",
      reference: "GENERIC-REF",
      notes: "White-label finance regression"
    })
  }), env, "/api/concierge/admin/income", store, "actor_hash_test");
  assert.equal(saved.status, 201);
  assert.equal(store.incomeRecords[0].currency, "EUR");
  assert.equal(store.incomeRecords[0].grossMinor, 1234);
  assert.equal(store.incomeRecords[0].feesMinor, 134);
  assert.equal(store.incomeRecords[0].netMinor, 1100);

  const csv = await handleFinanceAdminRequest(
    new Request("https://guide.example/api/concierge/admin/finance/export.csv?month=2026-09"),
    env,
    "/api/concierge/admin/finance/export.csv",
    store,
    "actor_hash_test"
  );
  assert.equal(csv.status, 200);
  const text = await csv.text();
  assert.match(text, /Gross income \(EUR\),Fees \(EUR\),Net income \(EUR\),Expense \(EUR\)/);
  assert.match(text, /Suite A/);
});
