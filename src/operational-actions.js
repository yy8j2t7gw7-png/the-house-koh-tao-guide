import { createProtectedOperationsAlert, dispatchConciergeAlert, operationalTaskAssignment } from "./whatsapp-alerts.js";

function cleanText(value, maximum = 500) {
  return String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maximum);
}

export function normalizeOperationalCategory(value) {
  const source = cleanText(value, 80).toLowerCase();
  if (["housekeeping", "cleaning", "linen", "towels"].includes(source)) return "Housekeeping";
  if (["maintenance", "repair", "repairs"].includes(source)) return "Maintenance";
  if (["guest support", "guest_support", "guest", "support"].includes(source)) return "Guest support";
  if (["reservations", "reservation", "booking", "bookings"].includes(source)) return "Reservations";
  if (["owner", "management"].includes(source)) return "Owner";
  if (["urgent", "emergency"].includes(source)) return "Urgent";
  return "General";
}

export function operationalCategoryRoutingKey(category) {
  const value = normalizeOperationalCategory(category).toLowerCase();
  if (value === "housekeeping") return "housekeeping";
  if (value === "maintenance") return "maintenance";
  if (value === "guest support") return "guest_support";
  if (value === "reservations") return "reservations";
  if (value === "owner") return "owner";
  if (value === "urgent") return "urgent";
  return "general";
}

export function operationalCategoryAlertType(category) {
  const key = operationalCategoryRoutingKey(category);
  if (key === "housekeeping") return "booking_task_housekeeping";
  if (key === "maintenance") return "booking_task_maintenance";
  if (key === "guest_support") return "booking_task_guest_support";
  if (key === "reservations") return "booking_task_reservations";
  if (key === "owner") return "booking_task_owner";
  if (key === "urgent") return "booking_task_urgent";
  return "booking_task_general";
}

export function operationalAssignmentPreview(env, category) {
  const assignment = operationalTaskAssignment(env, operationalCategoryRoutingKey(category));
  if (!assignment) return null;
  return {
    key: assignment.key,
    label: assignment.label,
    recipientGroup: assignment.recipientGroup,
    members: assignment.members || []
  };
}

function taskSummary(text, timing = "") {
  const base = cleanText(text, 1200);
  const when = cleanText(timing, 180);
  return when ? `${base} · Timing: ${when}` : base;
}

function bangkokDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function addBangkokDays(dateValue, days) {
  const parts = bangkokDateParts(dateValue);
  const anchor = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00+07:00`);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  const next = bangkokDateParts(anchor);
  return `${next.year}-${next.month}-${next.day}`;
}

export function operationalDueAt(timing, nowValue = new Date().toISOString()) {
  const raw = cleanText(timing, 180);
  if (!raw) return "";
  const source = raw.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  const now = new Date(nowValue);
  const dayOffset = /\btomorrow\b/.test(source) ? 1 : /\btoday\b/.test(source) ? 0 : null;
  if (dayOffset === null) return "";
  const timeMatch = source.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!timeMatch) return "";
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] || 0);
  const meridiem = timeMatch[3] || "";
  if (minute > 59 || hour > 23) return "";
  if (meridiem) {
    if (hour < 1 || hour > 12) return "";
    if (meridiem === "pm" && hour !== 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
  }
  const date = addBangkokDays(now, dayOffset);
  const iso = new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+07:00`);
  return Number.isFinite(iso.getTime()) ? iso.toISOString() : "";
}

export async function createBookingOperationalTask({
  env,
  store,
  reservationId,
  category,
  text,
  timing = "",
  actorHash,
  actorLabel,
  source = "booking_form",
  now = new Date().toISOString()
}) {
  const id = cleanText(reservationId, 120);
  const description = cleanText(text, 1800);
  const normalizedCategory = normalizeOperationalCategory(category);
  if (!id || description.length < 2) return { ok: false, error: "invalid_task" };
  const reservation = await store.getStayReservationById(id);
  if (!reservation) return { ok: false, error: "reservation_not_found" };
  const assignment = operationalTaskAssignment(env, operationalCategoryRoutingKey(normalizedCategory));
  if (!assignment) return { ok: false, error: "task_assignee_unavailable" };

  const activityId = `bact_${crypto.randomUUID()}`;
  const created = await store.mobileCreateReservationActivity({
    id: activityId,
    reservationId: id,
    kind: "task",
    category: normalizedCategory,
    body: taskSummary(description, timing),
    assigneeKey: assignment.key,
    assigneeLabel: assignment.label,
    createdByHash: cleanText(actorHash, 120),
    createdByLabel: cleanText(actorLabel, 120) || "Team member",
    createdAt: now
  });
  if (!created?.ok) return { ok: false, error: created?.error || "activity_create_failed" };

  const alert = await createProtectedOperationsAlert({
    env,
    room: reservation.room,
    roomVerified: true,
    alertType: operationalCategoryAlertType(normalizedCategory),
    severity: normalizedCategory === "Urgent" ? "urgent" : "attention",
    recipientGroup: assignment.recipientGroup,
    summary: `${taskSummary(description, timing)} · Booking task ref ${activityId.slice(-8)}`,
    escalationRequired: normalizedCategory === "Urgent",
    now: new Date(now)
  });
  if (!alert) return { ok: false, error: "operational_alert_create_failed", activityId };
  const taskId = `otask_${crypto.randomUUID()}`;
  const taskCreated = typeof store.mobileCreateOperationalTask === "function"
    ? await store.mobileCreateOperationalTask({
        id: taskId, reservationId: id, room: reservation.room, category: normalizedCategory,
        body: description, timing: cleanText(timing, 180), dueAt: operationalDueAt(timing, now),
        assigneeKey: assignment.key, assigneeLabel: assignment.label, alertId: alert.id,
        source: cleanText(source, 60) || "booking_form", sourceActivityId: activityId,
        createdByHash: cleanText(actorHash, 120), createdByLabel: cleanText(actorLabel, 120) || "Team member",
        createdAt: now
      })
    : { ok: true, id: taskId };
  if (!taskCreated?.ok) return { ok: false, error: taskCreated?.error || "operational_task_store_failed", activityId, alertId: alert.id };
  const delivery = await dispatchConciergeAlert(alert, env).catch(() => ({ attempted: 0, accepted: 0 }));
  await store.mobileLinkReservationActivityAlert(activityId, alert.id, delivery, now);
  if (typeof store.mobileUpdateOperationalTaskDelivery === "function") await store.mobileUpdateOperationalTaskDelivery(taskId, delivery, now);
  const activity = await store.mobileGetReservationActivity(activityId);
  const task = typeof store.mobileGetOperationalTask === "function" ? await store.mobileGetOperationalTask(taskId) : null;
  return {
    ok: true,
    scope: "booking",
    reservation,
    task,
    taskId,
    activity,
    alertId: alert.id,
    delivery,
    assignment: { key: assignment.key, label: assignment.label, members: assignment.members || [] }
  };
}

export async function createRoomOperationalTask({
  env,
  store,
  room,
  category,
  text,
  timing = "",
  actorHash = "",
  actorLabel = "Team member",
  source = "copilot",
  now = new Date().toISOString()
}) {
  const roomValue = cleanText(room, 24);
  const description = cleanText(text, 1800);
  const normalizedCategory = normalizeOperationalCategory(category);
  if (!roomValue || description.length < 2) return { ok: false, error: "invalid_task" };
  const assignment = operationalTaskAssignment(env, operationalCategoryRoutingKey(normalizedCategory));
  if (!assignment) return { ok: false, error: "task_assignee_unavailable" };
  const alert = await createProtectedOperationsAlert({
    env,
    room: roomValue,
    roomVerified: true,
    alertType: operationalCategoryAlertType(normalizedCategory),
    severity: normalizedCategory === "Urgent" ? "urgent" : "attention",
    recipientGroup: assignment.recipientGroup,
    summary: taskSummary(description, timing),
    escalationRequired: normalizedCategory === "Urgent",
    now: new Date(now)
  });
  if (!alert) return { ok: false, error: "operational_alert_create_failed" };
  const taskId = `otask_${crypto.randomUUID()}`;
  const taskCreated = typeof store.mobileCreateOperationalTask === "function"
    ? await store.mobileCreateOperationalTask({
        id: taskId, reservationId: "", room: roomValue, category: normalizedCategory,
        body: description, timing: cleanText(timing, 180), dueAt: operationalDueAt(timing, now),
        assigneeKey: assignment.key, assigneeLabel: assignment.label, alertId: alert.id,
        source: cleanText(source, 60) || "copilot", sourceActivityId: "",
        createdByHash: cleanText(actorHash, 120), createdByLabel: cleanText(actorLabel, 120) || "Team member",
        createdAt: now
      })
    : { ok: true, id: taskId };
  if (!taskCreated?.ok) return { ok: false, error: taskCreated?.error || "operational_task_store_failed", alertId: alert.id };
  const delivery = await dispatchConciergeAlert(alert, env).catch(() => ({ attempted: 0, accepted: 0 }));
  if (typeof store.mobileUpdateOperationalTaskDelivery === "function") await store.mobileUpdateOperationalTaskDelivery(taskId, delivery, now);
  const task = typeof store.mobileGetOperationalTask === "function" ? await store.mobileGetOperationalTask(taskId) : null;
  return {
    ok: true,
    scope: "room",
    room: roomValue,
    task,
    taskId,
    alertId: alert.id,
    delivery,
    assignment: { key: assignment.key, label: assignment.label, members: assignment.members || [] }
  };
}
