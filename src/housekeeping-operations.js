import { createProtectedOperationsAlert, dispatchConciergeAlert } from "./whatsapp-alerts.js";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";

function getStore(env) {
  if (!env.CONCIERGE_STORE?.getByName) return null;
  return env.CONCIERGE_STORE.getByName("the-house-concierge-global");
}

function bangkokClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now).filter((item) => item.type !== "literal").map((item) => [item.type, item.value]));
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: (Number(parts.hour) * 60) + Number(parts.minute)
  };
}

function taskSummary(task) {
  const priority = task.priority ? "Early check-in requested. Please clean this room first if possible." : "Please prepare this room for the next guest.";
  const departure = task.departingReservationId ? `Checkout ${task.serviceDate} at ${task.checkoutTime || "11:00 AM"}.` : "Room is currently vacant.";
  const arrival = task.requestedArrival
    ? `Requested early arrival: ${task.requestedArrival}.`
    : task.arrivingReservationId ? `Next check-in ${task.serviceDate} from 2:00 PM.` : "No next arrival is currently recorded.";
  return `Housekeeping task. Room ${task.room}. ${departure} ${arrival} ${priority}`;
}

async function createTaskAlert(env, store, task, now) {
  const alert = await createProtectedOperationsAlert({
    env,
    room: task.room,
    roomVerified: true,
    alertType: "housekeeping_turnover",
    severity: "attention",
    recipientGroup: "support",
    summary: taskSummary(task),
    housekeepingTask: task,
    escalationRequired: false,
    now
  });
  if (!alert) return { alert: null, delivery: { attempted: 0, accepted: 0 } };
  const delivery = await dispatchConciergeAlert(alert, env).catch(() => ({ attempted: 0, accepted: 0 }));
  return { alert, delivery };
}

export async function submitEarlyCheckinHousekeepingTask({ env, reservationId, requestedArrival, now = new Date() }) {
  const store = getStore(env);
  if (!store?.getEarlyCheckinHousekeepingContext || !store?.claimHousekeepingTask) {
    return { alert: null, delivery: { attempted: 0, accepted: 0 }, context: null };
  }
  const context = await store.getEarlyCheckinHousekeepingContext(reservationId);
  if (!context) return { alert: null, delivery: { attempted: 0, accepted: 0 }, context: null };
  if (context.readyForReservation) {
    return { alert: null, delivery: { attempted: 0, accepted: 0 }, context, ready: true };
  }
  const claimed = await store.claimHousekeepingTask({
    sourceKey: `early:${reservationId}:${context.checkInDate}`,
    room: context.room,
    serviceDate: context.checkInDate,
    departingReservationId: context.previousSameDayStay?.id || "",
    arrivingReservationId: reservationId,
    requestedArrival,
    checkoutTime: context.previousLateCheckout?.checkoutTime || "11:00 AM",
    priority: true,
    createdAt: now.toISOString()
  });
  const task = claimed?.task;
  if (!task) return { alert: null, delivery: { attempted: 0, accepted: 0 }, context };
  if (!claimed.created && task.alertId && !claimed.priorityUpdated) {
    return { alert: { id: task.alertId, duplicate: true }, delivery: { attempted: 0, accepted: 1 }, context, duplicate: true };
  }
  const sent = await createTaskAlert(env, store, task, now);
  return { ...sent, context, task };
}

export async function processHousekeepingTurnovers(env, now = new Date()) {
  const store = getStore(env);
  if (!store?.getDueHousekeepingTurnovers || !store?.claimHousekeepingTask) return { due: 0, sent: 0 };
  const clock = bangkokClock(now);
  if (clock.minutes < (11 * 60)) return { due: 0, sent: 0 };
  const due = await store.getDueHousekeepingTurnovers(clock.dateKey, clock.minutes);
  let sent = 0;
  for (const item of due) {
    const claimed = await store.claimHousekeepingTask({
      sourceKey: item.sourceKey,
      room: item.room,
      serviceDate: item.serviceDate,
      departingReservationId: item.departingReservationId,
      arrivingReservationId: item.arrivingReservationId,
      requestedArrival: "",
      checkoutTime: item.checkoutTime || "11:00 AM",
      priority: false,
      createdAt: now.toISOString()
    });
    if (!claimed?.created || !claimed.task) continue;
    const outcome = await createTaskAlert(env, store, claimed.task, now);
    if (outcome.delivery.accepted > 0) sent += 1;
  }
  return { due: due.length, sent };
}
