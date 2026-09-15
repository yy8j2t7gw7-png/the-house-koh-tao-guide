import test from "node:test";
import assert from "node:assert/strict";
import {
  createAsset, createPurchaseOrder, updatePurchaseOrderStatus, inventoryOverview, activateCatalogueItems,
  createShoppingList, addShoppingListLine, assignShoppingList, updateShoppingListLine, updateShoppingListStatus, linkShoppingListExpense
} from "../src/inventory-api.js";
import { normalizeStaffLanguage, staffLanguageLabel, translateOperatorText } from "../src/staff-translation.js";

const access = {
  now: "2026-09-15T12:00:00.000Z",
  record: { tenantId: "tenant_house", currency: "THB" },
  properties: [{ id: "property_house" }]
};

test("v5.11.83 purchase orders always start as draft and use the guarded status transition path", async () => {
  let created = null;
  let transitioned = null;
  const store = {
    async mobileListInventorySuppliers() {
      return [{ id: "supplier_1", name: "Island Supply", active: true }];
    },
    async mobileGetInventoryItem(_tenant, _property, id) {
      return id === "item_tp" ? { id, unitCostMinor: 800 } : null;
    },
    async mobileCreateInventoryPurchaseOrder(record) {
      created = record;
      return { ok: true, purchaseOrder: { ...record } };
    },
    async mobileUpdateInventoryPurchaseOrderStatus(record) {
      transitioned = record;
      return { ok: true, purchaseOrder: { id: record.id, status: record.status } };
    }
  };
  const createdResult = await createPurchaseOrder({ store, access, actorLabel: "Owner", body: {
    supplierId: "supplier_1", status: "received", lines: [{ itemId: "item_tp", quantity: 24, unitCostMinor: 750 }]
  }});
  assert.equal(createdResult.ok, true);
  assert.equal(created.status, "draft");
  assert.equal(created.lines[0].quantity, 24);

  const transitionResult = await updatePurchaseOrderStatus({ store, access, actorLabel: "Owner", body: { id: created.id, status: "approved" } });
  assert.equal(transitionResult.ok, true);
  assert.equal(transitioned.status, "approved");
  assert.equal(transitioned.tenantId, "tenant_house");
  assert.equal(transitioned.propertyId, "property_house");

  const invalid = await updatePurchaseOrderStatus({ store, access, body: { id: created.id, status: "received" } });
  assert.deepEqual(invalid, { ok: false, error: "invalid_purchase_order_status" });
});

test("v5.11.83 asset register preserves next service date for preventive maintenance", async () => {
  let stored = null;
  const store = {
    async mobileUpsertInventoryAsset(record) { stored = record; return { ok: true, asset: record }; }
  };
  const result = await createAsset({ store, access, actorLabel: "Owner", body: {
    name: "Room 6 AC", room: "6", serialNumber: "AC-6001", warrantyUntil: "2028-09-15", nextServiceAt: "2026-12-15"
  }});
  assert.equal(result.ok, true);
  assert.equal(stored.nextServiceAt, "2026-12-15");
  assert.equal(stored.room, "6");
});

test("v5.11.83 staff translation keeps property working language configurable and supports guest-language resync", async () => {
  assert.equal(normalizeStaffLanguage("de-DE"), "de");
  assert.equal(staffLanguageLabel("th"), "Thai");
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body));
    return {
      ok: true,
      async json() {
        return { output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ translation: "ได้ครับ เช็กเอาต์สายได้ถึง 14:00 น.", detected_source_language: "en", target_language: "th" }) }] }] };
      }
    };
  };
  try {
    const result = await translateOperatorText({ OPENAI_API_KEY: "test", OPENAI_TRANSLATION_MODEL: "test-model" }, {
      text: "Yes, late checkout is possible until 2:00 PM.", targetLanguage: "match_reference", referenceText: "สวัสดีครับ ขอเช็กเอาต์สายได้ไหมครับ"
    });
    assert.equal(result.translation, "ได้ครับ เช็กเอาต์สายได้ถึง 14:00 น.");
    assert.equal(result.targetLanguage, "th");
    assert.match(calls[0].instructions, /same natural language used by the REFERENCE TEXT/);
    assert.match(calls[0].instructions, /Preserve meaning, tone, politeness/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("v5.11.84 starter catalogue stays optional and only explicitly selected items become active stock", async () => {
  const items = [];
  const store = {
    async mobileDeactivateUnconfiguredStarterInventory() { return { ok: true }; },
    async mobileListInventoryItems() { return items; },
    async mobileListInventoryLocations() { return []; },
    async mobileListInventorySuppliers() { return []; },
    async mobileListInventoryPurchaseOrders() { return []; },
    async mobileListInventoryAssets() { return []; },
    async mobileListInventoryShoppingLists() { return []; },
    async mobileListTenantUsers() { return []; },
    async mobileUpsertInventoryItem(record) {
      const index = items.findIndex((item) => item.id === record.id);
      const stored = { ...record, quantity: index >= 0 ? Number(items[index].quantity || 0) : 0, updatedAt: access.now };
      if (index >= 0) items[index] = stored; else items.push(stored);
      return { ok: true };
    },
    async mobileGetInventoryItem(_tenant, _property, id) { return items.find((item) => item.id === id) || null; }
  };

  const before = await inventoryOverview({ store, access });
  assert.equal(before.items.length, 0);
  assert.equal(before.summary.outOfStock, 0);
  assert.equal(before.templates.starterItems.length > 20, true);

  const activated = await activateCatalogueItems({ store, access, actorLabel: "Owner", body: { items: ["Toilet paper", "Bottled water"] } });
  assert.equal(activated.ok, true);
  assert.equal(activated.activated.length, 2);
  const after = await inventoryOverview({ store, access });
  assert.deepEqual(after.items.map((item) => item.name).sort(), ["Bottled water", "Toilet paper"]);
  assert.equal(after.summary.activeItems, 2);
  assert.equal(after.summary.setupRequired, 2);
  assert.equal(after.summary.outOfStock, 0, "unconfigured activated items are setup-required, not assumed out-of-stock");
});

test("v5.11.84 formal purchase orders cannot exist without a real active supplier", async () => {
  const baseStore = {
    async mobileListInventorySuppliers() { return []; },
    async mobileGetInventoryItem() { return { id: "item_tp", unitCostMinor: 500 }; },
    async mobileCreateInventoryPurchaseOrder() { throw new Error("must_not_create"); }
  };
  const missing = await createPurchaseOrder({ store: baseStore, access, actorLabel: "Owner", body: { lines: [{ itemId: "item_tp", quantity: 2 }] } });
  assert.deepEqual(missing, { ok: false, error: "supplier_required" });

  const unknown = await createPurchaseOrder({ store: baseStore, access, actorLabel: "Owner", body: { supplierId: "supplier_missing", lines: [{ itemId: "item_tp", quantity: 2 }] } });
  assert.deepEqual(unknown, { ok: false, error: "supplier_not_found" });
});

test("v5.11.84 local shopping lists support item-level property/room context and only authorized purchasers", async () => {
  const lists = new Map();
  const items = [{ id: "item_tp", name: "Toilet paper", active: 1, unit: "pack", unitCostMinor: 2000 }];
  const users = [
    { userId: "staff_buy", displayName: "Aum", role: "staff", membershipStatus: "active", userStatus: "active", propertyScopeJson: JSON.stringify(["property_house"]), permissionOverridesJson: JSON.stringify({ "inventory.local_purchase": true }) },
    { userId: "staff_no", displayName: "Viewer", role: "staff", membershipStatus: "active", userStatus: "active", propertyScopeJson: JSON.stringify(["property_house"]), permissionOverridesJson: "{}" }
  ];
  const store = {
    async mobileListTenantUsers() { return users; },
    async mobileCreateInventoryShoppingList(record) { lists.set(record.id, { ...record, lines: [] }); return { ok: true }; },
    async mobileGetInventoryShoppingList(_tenant, id) { return lists.get(id) || null; },
    async mobileGetInventoryItem(_tenant, _property, id) { return items.find((item) => item.id === id) || null; },
    async mobileListInventoryItems() { return items; },
    async mobileAddInventoryShoppingListLine(record) { lists.get(record.listId).lines.push({ ...record, lineStatus: "needed", actualQuantity: 0, actualCostMinor: 0 }); return { ok: true }; },
    async mobileAssignInventoryShoppingList({ id, assignedUserId, assignedLabel }) { Object.assign(lists.get(id), { assignedUserId, assignedLabel, status: "assigned" }); return { ok: true, shoppingList: lists.get(id) }; }
  };

  const rejected = await createShoppingList({ store, access, actorLabel: "Owner", body: { assignedUserId: "staff_no", title: "Supplies" } });
  assert.deepEqual(rejected, { ok: false, error: "shopping_list_assignee_not_authorized" });

  const created = await createShoppingList({ store, access, actorLabel: "Owner", body: { assignedUserId: "staff_buy", title: "House run" } });
  assert.equal(created.ok, true);
  const listId = created.shoppingList.id;
  const line = await addShoppingListLine({ store, access, body: { listId, itemId: "item_tp", quantity: 4, room: "Room 6", specification: "3-ply" } });
  assert.equal(line.ok, true);
  assert.equal(line.shoppingList.lines[0].room, "Room 6");
  assert.equal(line.shoppingList.lines[0].propertyId, "property_house");
  assert.equal(line.shoppingList.lines[0].quantity, 4);

  const assigned = await assignShoppingList({ store, access, body: { id: listId, assignedUserId: "staff_buy" } });
  assert.equal(assigned.ok, true);
  assert.equal(lists.get(listId).assignedLabel, "Aum");
});

test("v5.11.84 receipt-required shopping list cannot complete until Finance is linked and then posts purchased stock once", async () => {
  const movements = [];
  const list = {
    id: "shoplist_test", tenantId: "tenant_house", propertyId: "property_house", status: "awaiting_receipt", receiptRequired: true, financeExpenseId: "",
    lines: [{ id: "shopline_tp", itemId: "item_tp", itemName: "Toilet paper", lineStatus: "bought", actualQuantity: 5, actualCostMinor: 10000 }]
  };
  const store = {
    async mobileGetInventoryShoppingList() { return list; },
    async mobileHasInventoryMovementReference(_tenant, _property, type, id) { return movements.some((m) => m.referenceType === type && m.referenceId === id); },
    async mobileGetInventoryItem() { return { id: "item_tp", active: 1, unitCostMinor: 1500 }; },
    async mobileCreateInventoryMovement(record) { movements.push(record); return { ok: true }; },
    async mobileSetInventoryShoppingListStatus({ status }) { list.status = status; return { ok: true, shoppingList: list }; },
    async getExpense(id) { return id === "expense_1" ? { id, propertyId: "property_house" } : null; },
    async mobileLinkInventoryShoppingExpense({ financeExpenseId }) { list.financeExpenseId = financeExpenseId; return { ok: true, shoppingList: list }; }
  };

  const blocked = await updateShoppingListStatus({ store, access, actorLabel: "Owner", body: { id: list.id, status: "completed", locationId: "loc_main" } });
  assert.deepEqual(blocked, { ok: false, error: "shopping_list_receipt_required" });

  const linked = await linkShoppingListExpense({ store, access, body: { id: list.id, financeExpenseId: "expense_1" } });
  assert.equal(linked.ok, true);
  const completed = await updateShoppingListStatus({ store, access, actorLabel: "Owner", body: { id: list.id, status: "completed", locationId: "loc_main" } });
  assert.equal(completed.ok, true);
  assert.equal(movements.length, 1);
  assert.equal(movements[0].quantity, 5);
  assert.equal(movements[0].referenceType, "shopping_list_line");
  assert.equal(movements[0].referenceId, "shopline_tp");
  assert.equal(movements[0].unitCostMinor, 2000);

  await updateShoppingListStatus({ store, access, actorLabel: "Owner", body: { id: list.id, status: "completed", locationId: "loc_main" } });
  assert.equal(movements.length, 1, "retries must be idempotent for stock posting");
});
