import assert from "node:assert/strict";
import test from "node:test";
import { handleOperationsCopilot } from "../src/operations-copilot.js";
import { relevantWorkflows } from "../src/capability-workflow-registry.js";

function testHarness() {
  const alerts = [];
  const audits = [];
  const deliveries = [];
  const reservations = [{
    id: "stay_6", room: "6", guestDisplayName: "Anna Example", guestFirstName: "Anna",
    checkInDate: "2026-09-15", checkOutDate: "2026-09-18", status: "confirmed"
  }];
  const store = {
    async getStayOperationsOverview() {
      return { reservations, housekeepingStatuses: [{ room: "6", status: "ready", updatedAt: "2026-09-15T08:00:00Z" }], housekeepingTasks: [] };
    },
    async getAdminOverview() { return { maintenanceReports: [], totals: { pendingRegistrations: 0 } }; },
    async getStayReservationById(id) { return reservations.find((item) => item.id === id) || null; },
    async mobileRecordAudit(record) { audits.push(record); return { ok: true }; },
    async createAlert(alert) { alerts.push(alert); return { created: true, alert }; },
    async recordAlertDelivery(record) { deliveries.push(record); return { ok: true }; },
    async recordWhatsAppDiagnostic() { return { ok: true }; }
  };
  const env = {
    CONCIERGE_STORE: { getByName: () => store },
    MOBILE_SESSION_PEPPER: "copilot_test_session_pepper_1234567890",
    CONCIERGE_HASH_SALT: "copilot_test_hash_salt",
    WHATSAPP_ALERT_RECIPIENTS: JSON.stringify({
      support: [{ label: "Su", phone: "+66640000004" }],
      booking: [{ label: "Fah", phone: "+66960000001" }],
      emergency: [{ label: "Owner 1", phone: "+66810000002" }, { label: "Owner 2", phone: "+66820000003" }]
    })
  };
  const access = {
    record: {
      tenantId: "tenant_test", userId: "user_owner", membershipId: "membership_owner",
      displayName: "Owner", role: "owner"
    },
    permissions: new Set(["copilot.use", "booking_activity.create"]),
    modules: new Set(["core", "bookings", "maintenance"]),
    properties: [{ id: "property_test", displayName: "Test Hotel" }],
    now: "2026-09-15T08:30:00.000Z"
  };
  return { store, env, access, alerts, audits, deliveries };
}

function post(body) {
  return new Request("https://example.test/api/mobile/v1/copilot/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("Operations Copilot registry retrieves practical hotel workflows", () => {
  const items = relevantWorkflows("Guest wants late checkout until 2 pm", 5);
  assert.equal(items[0]?.id, "late_checkout");
  assert.match(items[0]?.summary || "", /2:00 PM/);
  assert.ok(items[0]?.steps?.length >= 3);
});

test("Operations Copilot proposes a room task before executing anything", async () => {
  const harness = testHarness();
  const outcome = await handleOperationsCopilot({
    request: post({ message: "Create a maintenance task for room 6, toilet is broken" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.confirmationRequired, true);
  assert.equal(outcome.body.proposal?.room, "6");
  assert.equal(outcome.body.proposal?.category, "Maintenance");
  assert.match(outcome.body.proposal?.signature || "", /^[a-f0-9]{64}$/);
  assert.equal(harness.alerts.length, 0, "proposal must not create an alert");
  assert.deepEqual(harness.audits.map((item) => item.action), ["copilot_task_proposed"]);
});

test("Operations Copilot executes the exact signed proposal only after confirmation", async () => {
  const harness = testHarness();
  const proposed = await handleOperationsCopilot({
    request: post({ message: "Create a maintenance task for room 6, toilet is broken" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  const confirmed = await handleOperationsCopilot({
    request: post({ confirm: true, proposal: proposed.body.proposal }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(confirmed.status, 201);
  assert.equal(confirmed.body.executed, true);
  assert.equal(confirmed.body.task.room, "6");
  assert.equal(confirmed.body.task.category, "Maintenance");
  assert.equal(harness.alerts.length, 1);
  assert.equal(harness.alerts[0].room, "6");
  assert.match(harness.alerts[0].summary, /toilet is broken/i);
  assert.ok(harness.audits.some((item) => item.action === "copilot_task_created"));
});

test("Operations Copilot refuses an unknown room instead of guessing", async () => {
  const harness = testHarness();
  const outcome = await handleOperationsCopilot({
    request: post({ message: "Create a maintenance task for room 99, toilet is broken" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.proposal, null);
  assert.match(outcome.body.reply, /couldn.t match that room/i);
  assert.equal(harness.alerts.length, 0);
});

test("Operations Copilot signed proposal cannot be changed during confirmation", async () => {
  const harness = testHarness();
  const proposed = await handleOperationsCopilot({
    request: post({ message: "Create a maintenance task for room 6, toilet is broken" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  const tampered = { ...proposed.body.proposal, description: "Do something different" };
  const confirmed = await handleOperationsCopilot({
    request: post({ confirm: true, proposal: tampered }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(confirmed.status, 409);
  assert.equal(confirmed.body.error, "copilot_proposal_invalid_or_expired");
  assert.equal(harness.alerts.length, 0);
});
