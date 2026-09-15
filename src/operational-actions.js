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

export async function createBookingOperationalTask({
  env,
  store,
  reservationId,
  category,
  text,
  timing = "",
  actorHash,
  actorLabel,
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
  const delivery = await dispatchConciergeAlert(alert, env).catch(() => ({ attempted: 0, accepted: 0 }));
  await store.mobileLinkReservationActivityAlert(activityId, alert.id, delivery, now);
  const activity = await store.mobileGetReservationActivity(activityId);
  return {
    ok: true,
    scope: "booking",
    reservation,
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
  const delivery = await dispatchConciergeAlert(alert, env).catch(() => ({ attempted: 0, accepted: 0 }));
  return {
    ok: true,
    scope: "room",
    room: roomValue,
    alertId: alert.id,
    delivery,
    assignment: { key: assignment.key, label: assignment.label, members: assignment.members || [] }
  };
}
