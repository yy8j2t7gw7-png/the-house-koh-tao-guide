import test from "node:test";
import assert from "node:assert/strict";
import { createAsset, createPurchaseOrder, updatePurchaseOrderStatus } from "../src/inventory-api.js";
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
