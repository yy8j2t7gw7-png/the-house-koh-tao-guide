const ITEM_CLASSES = new Set(["consumable", "reusable", "asset"]);
const MOVEMENT_TYPES = new Set(["receive", "consume", "transfer", "adjust", "waste", "damage", "lost", "expired", "complimentary", "staff_use", "stocktake"]);
const PO_STATUSES = new Set(["draft", "approved", "ordered", "partial", "received", "cancelled"]);

function cleanText(value, max = 500) { return String(value || "").trim().replace(/\u0000/g, "").slice(0, max); }
function finite(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function nonNegative(value, fallback = 0) { return Math.max(0, finite(value, fallback)); }
function propertyId(access) { return cleanText(access?.properties?.[0]?.id, 100); }
function tenantId(access) { return cleanText(access?.record?.tenantId, 100); }
function now(access) { return cleanText(access?.now, 40) || new Date().toISOString(); }

export const HOTEL_INVENTORY_CATEGORIES = Object.freeze([
  "Housekeeping supplies", "Linen & bedding", "Towels", "Guest toiletries", "Guest amenities", "Bottled water & beverages",
  "Minibar & F&B", "Cleaning chemicals", "Cleaning equipment", "Laundry", "Maintenance - plumbing", "Maintenance - electrical",
  "Maintenance - AC", "Maintenance - general", "Tools", "Locks, keys & keycards", "Batteries & light bulbs", "Office supplies",
  "Safety & emergency", "First aid", "Pool & water treatment", "Garden & grounds", "Pest control", "Staff uniforms", "Other"
]);

export const HOTEL_STARTER_ITEMS = Object.freeze([
  ["Toilet paper", "Housekeeping supplies", "consumable", "roll"], ["Facial tissue", "Housekeeping supplies", "consumable", "box"],
  ["Shampoo", "Guest toiletries", "consumable", "bottle"], ["Shower gel", "Guest toiletries", "consumable", "bottle"],
  ["Hand soap", "Guest toiletries", "consumable", "bottle"], ["Bottled water", "Bottled water & beverages", "consumable", "bottle"],
  ["Coffee", "Guest amenities", "consumable", "sachet"], ["Tea", "Guest amenities", "consumable", "sachet"],
  ["Bath towel", "Towels", "reusable", "piece"], ["Hand towel", "Towels", "reusable", "piece"],
  ["Bed sheet", "Linen & bedding", "reusable", "piece"], ["Pillow case", "Linen & bedding", "reusable", "piece"],
  ["Duvet cover", "Linen & bedding", "reusable", "piece"], ["Laundry detergent", "Laundry", "consumable", "unit"],
  ["Floor cleaner", "Cleaning chemicals", "consumable", "bottle"], ["Bathroom cleaner", "Cleaning chemicals", "consumable", "bottle"],
  ["Trash bag", "Housekeeping supplies", "consumable", "piece"], ["Light bulb", "Batteries & light bulbs", "consumable", "piece"],
  ["AA battery", "Batteries & light bulbs", "consumable", "piece"], ["AAA battery", "Batteries & light bulbs", "consumable", "piece"],
  ["Air-conditioner remote", "Maintenance - AC", "asset", "piece"], ["Television remote", "Maintenance - electrical", "asset", "piece"],
  ["Hairdryer", "Guest amenities", "asset", "piece"], ["Kettle", "Guest amenities", "asset", "piece"], ["First aid kit", "First aid", "reusable", "kit"]
].map(([name, category, itemClass, unit]) => ({ name, category, itemClass, unit })));

function publicItem(item = {}) {
  const qty = finite(item.quantity);
  const minimum = nonNegative(item.minimumQty);
  const reorder = nonNegative(item.reorderPoint);
  const par = nonNegative(item.parLevel);
  const max = nonNegative(item.maximumQty);
  const threshold = reorder > 0 ? reorder : minimum;
  return {
    id: cleanText(item.id, 100), sku: cleanText(item.sku, 80), name: cleanText(item.name, 160), category: cleanText(item.category, 120),
    itemClass: ITEM_CLASSES.has(item.itemClass) ? item.itemClass : "consumable", unit: cleanText(item.unit, 40) || "unit",
    quantity: qty, minimumQty: minimum, reorderPoint: reorder, parLevel: par, maximumQty: max,
    unitCostMinor: Math.max(0, Math.round(finite(item.unitCostMinor))), currency: cleanText(item.currency, 8) || "THB",
    preferredSupplierId: cleanText(item.preferredSupplierId, 100), active: Number(item.active) !== 0,
    lowStock: threshold > 0 && qty <= threshold, outOfStock: qty <= 0,
    suggestedOrderQty: Math.max(0, Math.ceil((par > 0 ? par : max > 0 ? max : threshold) - qty)),
    updatedAt: cleanText(item.updatedAt, 40)
  };
}

export async function inventoryOverview({ store, access }) {
  const tenant = tenantId(access); const property = propertyId(access);
  const [items, locations, suppliers, purchaseOrders, assets] = await Promise.all([
    store.mobileListInventoryItems(tenant, property, 500), store.mobileListInventoryLocations(tenant, property, 100),
    store.mobileListInventorySuppliers(tenant, property, 200), store.mobileListInventoryPurchaseOrders(tenant, property, 100),
    store.mobileListInventoryAssets(tenant, property, 300)
  ]);
  const publicItems = items.map(publicItem);
  const activeItems = publicItems.filter((item) => item.active);
  return {
    items: publicItems, locations, suppliers, purchaseOrders, assets,
    templates: { categories: HOTEL_INVENTORY_CATEGORIES, starterItems: HOTEL_STARTER_ITEMS },
    summary: {
      activeItems: activeItems.length,
      lowStock: activeItems.filter((item) => item.lowStock).length,
      outOfStock: activeItems.filter((item) => item.outOfStock).length,
      inventoryValueMinor: Math.round(activeItems.reduce((sum, item) => sum + item.quantity * item.unitCostMinor, 0)),
      pendingPurchaseOrders: purchaseOrders.filter((po) => !["received", "cancelled"].includes(po.status)).length,
      assets: assets.filter((asset) => asset.status !== "retired").length
    }
  };
}

export async function createInventoryItem({ store, access, body, actorLabel = "" }) {
  const tenant = tenantId(access); const property = propertyId(access); const createdAt = now(access);
  const name = cleanText(body?.name, 160); const category = cleanText(body?.category, 120) || "Other";
  const itemClass = ITEM_CLASSES.has(body?.itemClass) ? body.itemClass : "consumable";
  if (!name || !tenant || !property) return { ok: false, error: "invalid_request" };
  const id = `invitem_${crypto.randomUUID()}`;
  const record = {
    id, tenantId: tenant, propertyId: property, sku: cleanText(body?.sku, 80), name, category, itemClass,
    unit: cleanText(body?.unit, 40) || "unit", minimumQty: nonNegative(body?.minimumQty), reorderPoint: nonNegative(body?.reorderPoint),
    parLevel: nonNegative(body?.parLevel), maximumQty: nonNegative(body?.maximumQty), unitCostMinor: Math.round(nonNegative(body?.unitCostMinor)),
    currency: cleanText(body?.currency, 8) || access?.record?.currency || "THB", preferredSupplierId: cleanText(body?.preferredSupplierId, 100),
    active: true, createdByLabel: cleanText(actorLabel, 100), createdAt
  };
  const result = await store.mobileUpsertInventoryItem(record);
  if (!result?.ok) return result;
  const initialQty = finite(body?.initialQuantity);
  const locationId = cleanText(body?.locationId, 100);
  if (initialQty !== 0 && locationId) {
    await store.mobileCreateInventoryMovement({
      id: `invmove_${crypto.randomUUID()}`, tenantId: tenant, propertyId: property, itemId: id, movementType: "receive",
      quantity: Math.abs(initialQty), fromLocationId: "", toLocationId: locationId, reason: "Initial stock", unitCostMinor: record.unitCostMinor,
      referenceType: "item_setup", referenceId: id, createdByLabel: cleanText(actorLabel, 100), createdAt
    });
  }
  return { ok: true, item: publicItem(await store.mobileGetInventoryItem(tenant, property, id)) };
}

export async function updateInventoryItem({ store, access, body, actorLabel = "" }) {
  const tenant = tenantId(access); const property = propertyId(access); const id = cleanText(body?.id, 100);
  const existing = await store.mobileGetInventoryItem(tenant, property, id);
  if (!existing) return { ok: false, error: "item_not_found" };
  const itemClass = ITEM_CLASSES.has(body?.itemClass) ? body.itemClass : existing.itemClass;
  const result = await store.mobileUpsertInventoryItem({
    ...existing, tenantId: tenant, propertyId: property, id,
    sku: body?.sku === undefined ? existing.sku : cleanText(body.sku, 80), name: body?.name === undefined ? existing.name : cleanText(body.name, 160),
    category: body?.category === undefined ? existing.category : cleanText(body.category, 120), itemClass,
    unit: body?.unit === undefined ? existing.unit : cleanText(body.unit, 40),
    minimumQty: body?.minimumQty === undefined ? existing.minimumQty : nonNegative(body.minimumQty),
    reorderPoint: body?.reorderPoint === undefined ? existing.reorderPoint : nonNegative(body.reorderPoint),
    parLevel: body?.parLevel === undefined ? existing.parLevel : nonNegative(body.parLevel),
    maximumQty: body?.maximumQty === undefined ? existing.maximumQty : nonNegative(body.maximumQty),
    unitCostMinor: body?.unitCostMinor === undefined ? existing.unitCostMinor : Math.round(nonNegative(body.unitCostMinor)),
    currency: body?.currency === undefined ? existing.currency : cleanText(body.currency, 8),
    preferredSupplierId: body?.preferredSupplierId === undefined ? existing.preferredSupplierId : cleanText(body.preferredSupplierId, 100),
    active: body?.active === undefined ? Number(existing.active) !== 0 : Boolean(body.active), updatedByLabel: cleanText(actorLabel, 100), createdAt: now(access)
  });
  if (!result?.ok) return result;
  return { ok: true, item: publicItem(await store.mobileGetInventoryItem(tenant, property, id)) };
}

export async function createInventoryLocation({ store, access, body, actorLabel = "" }) {
  const name = cleanText(body?.name, 120); if (!name) return { ok: false, error: "name_required" };
  const record = { id: `invloc_${crypto.randomUUID()}`, tenantId: tenantId(access), propertyId: propertyId(access), name,
    department: cleanText(body?.department, 100), parentId: cleanText(body?.parentId, 100), active: true, createdByLabel: cleanText(actorLabel, 100), createdAt: now(access) };
  const result = await store.mobileCreateInventoryLocation(record); return result?.ok ? { ok: true, location: result.location } : result;
}

export async function createInventoryMovement({ store, access, body, actorLabel = "" }) {
  const tenant = tenantId(access); const property = propertyId(access); const itemId = cleanText(body?.itemId, 100);
  const item = await store.mobileGetInventoryItem(tenant, property, itemId); if (!item) return { ok: false, error: "item_not_found" };
  const movementType = MOVEMENT_TYPES.has(body?.movementType) ? body.movementType : "adjust";
  const quantity = finite(body?.quantity); if (!Number.isFinite(quantity) || quantity === 0) return { ok: false, error: "quantity_required" };
  const fromLocationId = cleanText(body?.fromLocationId, 100); const toLocationId = cleanText(body?.toLocationId, 100);
  if (movementType === "transfer" && (!fromLocationId || !toLocationId || fromLocationId === toLocationId)) return { ok: false, error: "transfer_locations_required" };
  if (["receive"].includes(movementType) && !toLocationId) return { ok: false, error: "destination_required" };
  if (["consume", "waste", "damage", "lost", "expired", "complimentary", "staff_use"].includes(movementType) && !fromLocationId) return { ok: false, error: "source_required" };
  const result = await store.mobileCreateInventoryMovement({
    id: `invmove_${crypto.randomUUID()}`, tenantId: tenant, propertyId: property, itemId, movementType,
    quantity: Math.abs(quantity), fromLocationId, toLocationId, reason: cleanText(body?.reason, 300), unitCostMinor: Math.round(nonNegative(body?.unitCostMinor, item.unitCostMinor)),
    referenceType: cleanText(body?.referenceType, 80), referenceId: cleanText(body?.referenceId, 120), createdByLabel: cleanText(actorLabel, 100), createdAt: now(access)
  });
  if (!result?.ok) return result;
  return { ok: true, item: publicItem(await store.mobileGetInventoryItem(tenant, property, itemId)), movement: result.movement };
}

export async function createSupplier({ store, access, body, actorLabel = "" }) {
  const name = cleanText(body?.name, 160); if (!name) return { ok: false, error: "name_required" };
  const result = await store.mobileUpsertInventorySupplier({ id: `invsup_${crypto.randomUUID()}`, tenantId: tenantId(access), propertyId: propertyId(access),
    name, contactName: cleanText(body?.contactName, 120), phone: cleanText(body?.phone, 50), email: cleanText(body?.email, 180), notes: cleanText(body?.notes, 500), active: true,
    createdByLabel: cleanText(actorLabel, 100), createdAt: now(access) });
  return result;
}

export async function createPurchaseOrder({ store, access, body, actorLabel = "" }) {
  const lines = Array.isArray(body?.lines) ? body.lines.slice(0, 100) : [];
  if (!lines.length) return { ok: false, error: "lines_required" };
  const tenant = tenantId(access); const property = propertyId(access);
  const validLines = [];
  for (const line of lines) {
    const item = await store.mobileGetInventoryItem(tenant, property, cleanText(line?.itemId, 100));
    const qty = nonNegative(line?.quantity);
    if (!item || qty <= 0) continue;
    validLines.push({ itemId: item.id, quantity: qty, unitCostMinor: Math.round(nonNegative(line?.unitCostMinor, item.unitCostMinor)) });
  }
  if (!validLines.length) return { ok: false, error: "valid_lines_required" };
  const id = `invpo_${crypto.randomUUID()}`; const status = "draft";
  return store.mobileCreateInventoryPurchaseOrder({ id, tenantId: tenant, propertyId: property, supplierId: cleanText(body?.supplierId, 100), status,
    expectedAt: cleanText(body?.expectedAt, 40), notes: cleanText(body?.notes, 500), currency: cleanText(body?.currency, 8) || "THB", lines: validLines,
    createdByLabel: cleanText(actorLabel, 100), createdAt: now(access) });
}


export async function updatePurchaseOrderStatus({ store, access, body, actorLabel = "" }) {
  const id = cleanText(body?.id, 100);
  const status = cleanText(body?.status, 30);
  if (!id || !PO_STATUSES.has(status) || ["partial", "received"].includes(status)) return { ok: false, error: "invalid_purchase_order_status" };
  return store.mobileUpdateInventoryPurchaseOrderStatus({ tenantId: tenantId(access), propertyId: propertyId(access), id, status, updatedByLabel: cleanText(actorLabel, 100), updatedAt: now(access) });
}

export async function receivePurchaseOrder({ store, access, body, actorLabel = "" }) {
  const id = cleanText(body?.id, 100); const locationId = cleanText(body?.locationId, 100); if (!id || !locationId) return { ok: false, error: "invalid_request" };
  const lines = Array.isArray(body?.lines) ? body.lines.slice(0, 100) : [];
  return store.mobileReceiveInventoryPurchaseOrder({ tenantId: tenantId(access), propertyId: propertyId(access), id, locationId, lines,
    createdByLabel: cleanText(actorLabel, 100), createdAt: now(access) });
}

export async function createAsset({ store, access, body, actorLabel = "" }) {
  const name = cleanText(body?.name, 160); if (!name) return { ok: false, error: "name_required" };
  return store.mobileUpsertInventoryAsset({ id: `invasset_${crypto.randomUUID()}`, tenantId: tenantId(access), propertyId: propertyId(access), itemId: cleanText(body?.itemId, 100),
    name, assetTag: cleanText(body?.assetTag, 80), serialNumber: cleanText(body?.serialNumber, 120), room: cleanText(body?.room, 30), locationId: cleanText(body?.locationId, 100),
    status: cleanText(body?.status, 40) || "in_service", purchaseDate: cleanText(body?.purchaseDate, 20), purchaseCostMinor: Math.round(nonNegative(body?.purchaseCostMinor)),
    warrantyUntil: cleanText(body?.warrantyUntil, 20), nextServiceAt: cleanText(body?.nextServiceAt, 20), supplierId: cleanText(body?.supplierId, 100), notes: cleanText(body?.notes, 500), createdByLabel: cleanText(actorLabel, 100), createdAt: now(access) });
}

export async function seedStarterInventory({ store, access, actorLabel = "" }) {
  const tenant = tenantId(access); const property = propertyId(access); const existing = await store.mobileListInventoryItems(tenant, property, 500);
  const existingNames = new Set(existing.map((item) => cleanText(item.name, 160).toLowerCase()));
  let created = 0;
  for (const template of HOTEL_STARTER_ITEMS) {
    if (existingNames.has(template.name.toLowerCase())) continue;
    const outcome = await createInventoryItem({ store, access, actorLabel, body: { ...template, minimumQty: 0, reorderPoint: 0, parLevel: 0, maximumQty: 0, unitCostMinor: 0 } });
    if (outcome.ok) created += 1;
  }
  return { ok: true, created };
}
