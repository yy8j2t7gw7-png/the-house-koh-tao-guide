import assert from "node:assert/strict";
import test from "node:test";
import { handleOperationsCopilot } from "../src/operations-copilot.js";
import { relevantWorkflows } from "../src/capability-workflow-registry.js";

function testHarness() {
  const alerts = [];
  const audits = [];
  const deliveries = [];
  const operationalTasks = [];
  const ownerBlocks = [];
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
    async getStayReservationForChannelManager(id) { return reservations.find((item) => item.id === id) || null; },
    async cancelOwnerManagedStay(id) { const item = reservations.find((entry) => entry.id === id); if (!item) return { ok: false, error: "reservation_not_found" }; item.status = "cancelled"; return { ok: true, room: item.room }; },
    async findStayOverlap(room, checkInDate, checkOutDate, excludeId = "") { return reservations.find((item) => item.id !== excludeId && item.status === "confirmed" && item.room === room && item.checkInDate < checkOutDate && item.checkOutDate > checkInDate) || null; },
    async syncStayReservations(payload) {
      const record = payload.records?.[0];
      const id = `stay_${crypto.randomUUID().replaceAll("-", "")}`;
      reservations.push({ id, room: payload.room, provider: payload.provider, status: "confirmed", checkInDate: record.checkInDate, checkOutDate: record.checkOutDate, confirmationCodeHash: record.confirmationCodeHash });
      return { upserted: 1 };
    },
    async getStayReservationByCodeHash(codeHash, room) { return reservations.find((item) => item.confirmationCodeHash === codeHash && item.room === room) || null; },
    async mobileCreateOwnerCalendarBlock(record) { ownerBlocks.push({ ...record, status: "active" }); return { ok: true, id: record.id }; },
    async mobileListOwnerCalendarBlocks() { return ownerBlocks; },
    async mobileCancelOwnerCalendarBlock(_tenantId, id) { const block = ownerBlocks.find((item) => item.id === id); if (!block) return { ok: false }; block.status = "cancelled"; return { ok: true }; },
    async mobileRecordAudit(record) { audits.push(record); return { ok: true }; },
    async mobileCreateOperationalTask(record) { operationalTasks.push({ ...record, status: "open", deliveryAttempted: 0, deliveryAccepted: 0 }); return { ok: true, id: record.id }; },
    async mobileUpdateOperationalTaskDelivery(id, delivery) { const task = operationalTasks.find((item) => item.id === id); if (task) { task.deliveryAttempted = Number(delivery.attempted) || 0; task.deliveryAccepted = Number(delivery.accepted) || 0; } return { ok: true }; },
    async mobileListOperationalTasks() { return operationalTasks; },
    async mobileListInventoryItems() { return [
      { id: "inv_toilet", name: "Toilet paper", quantity: 2, reorderPoint: 5, minimumQty: 2, parLevel: 20, unit: "roll", active: 1 }
    ]; },
    async mobileGetOperationalTask(id) { return operationalTasks.find((item) => item.id === id) || null; },
    async createAlert(alert) { alerts.push(alert); return { created: true, alert }; },
    async recordAlertDelivery(record) { deliveries.push(record); return { ok: true }; },
    async recordWhatsAppDiagnostic() { return { ok: true }; }
  };
  const env = {
    CONCIERGE_STORE: { getByName: () => store },
    MOBILE_SESSION_PEPPER: "copilot_test_session_pepper_1234567890",
    CONCIERGE_HASH_SALT: "copilot_test_hash_salt",
    STAY_TOKEN_PEPPER: "copilot_test_stay_pepper_1234567890",
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
    permissions: new Set(["copilot.use", "booking_activity.create", "inventory.view", "direct_stays.manage"]),
    modules: new Set(["core", "bookings", "maintenance", "inventory"]),
    properties: [{ id: "property_test", displayName: "Test Hotel" }],
    now: "2026-09-15T08:30:00.000Z"
  };
  return { store, env, access, alerts, audits, deliveries, operationalTasks, reservations, ownerBlocks };
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
  assert.equal(harness.operationalTasks.length, 1, "confirmed room task must persist in the shared task store");
  assert.equal(harness.operationalTasks[0].room, "6");
  assert.equal(confirmed.body.task.taskId, harness.operationalTasks[0].id);
  assert.ok(harness.audits.some((item) => item.action === "copilot_task_created"));
});

test("Operations Copilot answers the daily attention question deterministically", async () => {
  const harness = testHarness();
  harness.operationalTasks.push({ id: "otask_due", room: "6", category: "Maintenance", body: "Fix toilet", status: "open", dueAt: "2026-09-15T10:00:00.000Z" });
  const outcome = await handleOperationsCopilot({
    request: post({ message: "What needs my attention today?" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.proposal, null);
  assert.match(outcome.body.reply, /needs attention today/i);
  assert.match(outcome.body.reply, /task/i);
});

test("Operations Copilot understands an ordinary room work instruction without the word task", async () => {
  const harness = testHarness();
  const outcome = await handleOperationsCopilot({
    request: post({ message: "Room 6 needs the toilet fixed tomorrow 12 pm" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.confirmationRequired, true);
  assert.equal(outcome.body.proposal?.room, "6");
  assert.equal(outcome.body.proposal?.category, "Maintenance");
  assert.match(outcome.body.proposal?.timing || "", /tomorrow/i);
});

test("Operations Copilot may use validated booking screen context when the instruction is clearly contextual", async () => {
  const harness = testHarness();
  const outcome = await handleOperationsCopilot({
    request: post({ message: "Bring two extra towels", context: { sourcePath: "/bookings/stay_6", reservationId: "stay_6" } }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.confirmationRequired, true);
  assert.equal(outcome.body.proposal?.scope, "booking");
  assert.equal(outcome.body.proposal?.reservationId, "stay_6");
  assert.equal(outcome.body.proposal?.room, "6");
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

test("Operations Copilot daily attention stays available when one live source has an unexpected production shape", async () => {
  const harness = testHarness();
  harness.store.getAdminOverview = async () => ({ maintenanceReports: { unexpected: true }, totals: null });
  harness.store.mobileListOperationalTasks = async () => { throw new Error("temporary_task_store_failure"); };
  const outcome = await handleOperationsCopilot({
    request: post({ message: "What needs my attention today?" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.proposal, null);
  assert.match(outcome.body.reply, /today|operations|urgent/i);
  assert.equal(outcome.body.sourceHealth.tasks, false);
});


test("Operations Copilot creates a property-wide Inventory proposal for a restock instruction without inventing a booking", async () => {
  const harness = testHarness();
  const outcome = await handleOperationsCopilot({
    request: post({ message: "Create a restock task for toilet paper" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.confirmationRequired, true);
  assert.equal(outcome.body.proposal?.scope, "property");
  assert.equal(outcome.body.proposal?.room, "Property");
  assert.equal(outcome.body.proposal?.category, "Inventory");
  assert.equal(outcome.body.proposal?.reservationId, "");
  assert.equal(harness.alerts.length, 0);
});

test("Operations Copilot inventory summary uses live role-filtered stock data", async () => {
  const harness = testHarness();
  const outcome = await handleOperationsCopilot({
    request: post({ message: "What inventory needs restocking?" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.proposal, null);
  assert.match(outcome.body.reply, /toilet paper/i);
  assert.match(outcome.body.reply, /low stock/i);
});

test("v5.11.84 Copilot can safely identify and cancel only a Direct Stay after confirmation", async () => {
  const harness = testHarness();
  harness.reservations.push({ id: "stay_direct-cancel-123456789012", room: "7", provider: "direct", status: "confirmed", checkInDate: "2026-09-16", checkOutDate: "2026-09-17" });
  const proposed = await handleOperationsCopilot({
    request: post({ message: "Cancel the direct stay in room 7 tomorrow" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(proposed.status, 200);
  assert.equal(proposed.body.confirmationRequired, true);
  assert.equal(proposed.body.proposal?.type, "cancel_direct_stay");
  assert.equal(proposed.body.proposal?.reservationId, "stay_direct-cancel-123456789012");
  assert.equal(harness.reservations.find((item) => item.id === "stay_direct-cancel-123456789012")?.status, "confirmed");

  const confirmed = await handleOperationsCopilot({
    request: post({ confirm: true, proposal: proposed.body.proposal }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(confirmed.status, 201);
  assert.equal(confirmed.body.executed, true);
  assert.equal(harness.reservations.find((item) => item.id === "stay_direct-cancel-123456789012")?.status, "cancelled");
  assert.match(confirmed.body.reply, /audit history/i);
});

test("v5.11.84 Copilot proposes Direct Stay creation and calendar blocks without mutating before confirmation", async () => {
  const harness = testHarness();
  const direct = await handleOperationsCopilot({
    request: post({ message: "Create a direct stay in room 8 from 20 September to 22 September 2026" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(direct.status, 200);
  assert.equal(direct.body.proposal?.type, "create_direct_stay");
  assert.equal(direct.body.proposal?.room, "8");
  assert.equal(direct.body.proposal?.checkInDate, "2026-09-20");
  assert.equal(direct.body.proposal?.checkOutDate, "2026-09-22");

  const block = await handleOperationsCopilot({
    request: post({ message: "Block room 9 from 23 September to 25 September 2026 for AC replacement" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(block.status, 200);
  assert.equal(block.body.proposal?.type, "block_room");
  assert.equal(block.body.proposal?.room, "9");
  assert.equal(harness.ownerBlocks.length, 0, "proposal must not create a calendar block");
});

test("v5.11.84 Copilot Direct Stay creation returns the canonical local reservation id without provider protection", async () => {
  const harness = testHarness();
  const proposed = await handleOperationsCopilot({
    request: post({ message: "Create a direct stay in room 8 from 20 September to 22 September 2026" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  const confirmed = await handleOperationsCopilot({
    request: post({ confirm: true, proposal: proposed.body.proposal }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(confirmed.status, 201);
  assert.equal(confirmed.body.action?.type, "create_direct_stay");
  assert.match(confirmed.body.action?.reservationId || "", /^stay_[A-Za-z0-9-]{20,}$/);
  assert.ok(harness.reservations.some((item) => item.id === confirmed.body.action.reservationId && item.provider === "direct"));
});

test("v5.11.84 Copilot calendar block and unblock both require confirmation and preserve canonical availability state", async () => {
  const harness = testHarness();
  const proposedBlock = await handleOperationsCopilot({
    request: post({ message: "Block room 9 from 23 September to 25 September 2026 for AC replacement" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(proposedBlock.status, 200);
  assert.equal(proposedBlock.body.proposal?.type, "block_room");
  assert.equal(harness.ownerBlocks.length, 0);

  const confirmedBlock = await handleOperationsCopilot({
    request: post({ confirm: true, proposal: proposedBlock.body.proposal }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(confirmedBlock.status, 201);
  assert.equal(confirmedBlock.body.executed, true);
  assert.equal(confirmedBlock.body.action?.type, "block_room");
  const block = harness.ownerBlocks.find((item) => item.id === confirmedBlock.body.action?.blockId);
  assert.equal(block?.status, "active");
  const blockerStay = harness.reservations.find((item) => item.id === confirmedBlock.body.action?.reservationId);
  assert.equal(blockerStay?.status, "confirmed");
  assert.equal(blockerStay?.provider, "direct");

  const proposedUnblock = await handleOperationsCopilot({
    request: post({ message: "Unblock room 9 from 23 September 2026" }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(proposedUnblock.status, 200);
  assert.equal(proposedUnblock.body.proposal?.type, "unblock_room");
  assert.equal(block?.status, "active", "unblock proposal must not mutate state");

  const confirmedUnblock = await handleOperationsCopilot({
    request: post({ confirm: true, proposal: proposedUnblock.body.proposal }),
    env: harness.env, store: harness.store, access: harness.access, actorHash: "actor_hash"
  });
  assert.equal(confirmedUnblock.status, 201);
  assert.equal(confirmedUnblock.body.action?.type, "unblock_room");
  assert.equal(block?.status, "cancelled");
  assert.equal(blockerStay?.status, "cancelled");
});
