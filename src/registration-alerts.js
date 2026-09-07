import {
  createProtectedOperationsAlert,
  dispatchConciergeAlert
} from "./whatsapp-alerts.js";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

function getStore(env) {
  if (!env.CONCIERGE_STORE?.getByName) return null;
  return env.CONCIERGE_STORE.getByName("the-house-concierge-global");
}

function bangkokParts(now) {
  const shifted = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  const iso = shifted.toISOString();
  return {
    date: iso.slice(0, 10),
    hour: shifted.getUTCHours()
  };
}

async function sendOwnerRegistrationAlert({ env, room, alertType, summary, passportId = "", now }) {
  const alert = await createProtectedOperationsAlert({
    env,
    room,
    roomVerified: true,
    alertType,
    severity: "attention",
    recipientGroup: "owners",
    summary,
    escalationRequired: false,
    now
  });
  if (!alert || alert.duplicate) return { attempted: 0, accepted: 0, alert };
  if (passportId) {
    const store = getStore(env);
    if (!store || typeof store.linkPassportAlert !== "function") {
      return { attempted: 0, accepted: 0, alert, error: "passport_alert_link_unavailable" };
    }
    const linked = await store.linkPassportAlert(alert.id, passportId, now.toISOString()).catch(() => null);
    if (!linked?.ok) return { attempted: 0, accepted: 0, alert, error: linked?.error || "passport_alert_link_failed" };
  }
  const delivery = await dispatchConciergeAlert(alert, env);
  return { ...delivery, alert };
}

export async function notifyPassportUploadedOwners({ env, room, passportId, requiredPassports, receivedPassports, now = new Date() }) {
  const required = Math.max(1, Number(requiredPassports) || 1);
  const received = Math.max(1, Math.min(required, Number(receivedPassports) || 1));
  return sendOwnerRegistrationAlert({
    env,
    room,
    alertType: "passport_received",
    summary: `${received} of ${required} required passport${required === 1 ? "" : "s"} ${received === 1 ? "has" : "have"} been uploaded.`,
    passportId,
    now
  });
}

export async function processRegistrationReminderAlerts(env, now = new Date()) {
  const store = getStore(env);
  if (!store) return { checkInDue: 0, checkInSent: 0, tm30Due: 0, tm30Sent: 0 };
  const { date, hour } = bangkokParts(now);
  let checkInDue = 0;
  let checkInSent = 0;
  let tm30Due = 0;
  let tm30Sent = 0;

  if (hour >= 20 && typeof store.claimCheckinPassportReminders === "function") {
    const due = await store.claimCheckinPassportReminders(date, now.toISOString(), 25);
    checkInDue = due.length;
    for (const item of due) {
      let accepted = 0;
      try {
        const required = Math.max(0, Number(item.requiredPassports) || 0);
        const received = Math.max(0, Number(item.receivedPassports) || 0);
        const missing = required > received ? required - received : 0;
        const partialProgress = required > 0 && received > 0 && missing > 0;
        let summary;
        if (partialProgress) {
          summary = `${received} of ${required} passports ${received === 1 ? "has" : "have"} been uploaded. ${missing} passport${missing === 1 ? " is" : "s are"} still missing. Please check with the guest.`;
        } else if (required > 0) {
          summary = `No passports have been uploaded yet. ${required} passport${required === 1 ? " is" : "s are"} still missing. Please check with the guest.`;
        } else {
          summary = `Guest registration is still incomplete. Please check with the guest.`;
        }
        const outcome = await sendOwnerRegistrationAlert({
          env,
          room: item.room,
          alertType: partialProgress ? "passport_checkin_partial" : "passport_checkin_missing",
          summary,
          now
        });
        accepted = Number(outcome.accepted) || 0;
      } catch (_error) {
        accepted = 0;
      }
      await store.completeCheckinPassportReminder(item.reservationId, accepted > 0, now.toISOString()).catch(() => {});
      if (accepted > 0) checkInSent += 1;
    }
  }

  if (typeof store.claimTm30PassportReminders === "function") {
    const due = await store.claimTm30PassportReminders(now.toISOString(), 25);
    tm30Due = due.length;
    for (const item of due) {
      let accepted = 0;
      try {
        const outcome = await sendOwnerRegistrationAlert({
          env,
          room: item.room,
          alertType: "passport_tm30_overdue",
          summary: `The passport was uploaded more than 24 hours ago and is still not marked as TM30 registered. Please complete the TM30 registration.`,
          now
        });
        accepted = Number(outcome.accepted) || 0;
      } catch (_error) {
        accepted = 0;
      }
      await store.completeTm30PassportReminder(item.id, accepted > 0, now.toISOString()).catch(() => {});
      if (accepted > 0) tm30Sent += 1;
    }
  }

  return { checkInDue, checkInSent, tm30Due, tm30Sent };
}
