const ITEM_CLASSES = new Set(["consumable", "reusable", "asset"]);
const MOVEMENT_TYPES = new Set(["receive", "consume", "transfer", "adjust", "waste", "damage", "lost", "expired", "complimentary", "staff_use", "stocktake"]);
const PO_STATUSES = new Set(["draft", "approved", "ordered", "partial", "received", "cancelled"]);
const SHOPPING_LINE_STATUSES = new Set(["needed", "bought", "partial", "unavailable", "substituted"]);
const SHOPPING_LIST_STATUSES = new Set(["draft", "assigned", "shopping", "awaiting_receipt", "completed", "cancelled"]);

function cleanText(value, max = 500) { return String(value || "").trim().replace(/\u0000/g, "").slice(0, max); }
function finite(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function nonNegative(value, fallback = 0) { return Math.max(0, finite(value, fallback)); }
function tenantId(access) { return cleanText(access?.record?.tenantId, 100); }
function now(access) { return cleanText(access?.now, 40) || new Date().toISOString(); }
function jsonObject(value, fallback = {}) { try { const parsed = JSON.parse(String(value || "{}")); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback; } catch (_error) { return fallback; } }
function requestedPropertyId(access, value = "") {
  const requested = cleanText(value, 100);
  const properties = Array.isArray(access?.properties) ? access.properties.filter((item) => item?.active !== false) : [];
  if (requested) return properties.some((item) => cleanText(item?.id, 100) === requested) ? requested : "";
  return cleanText(properties[0]?.id, 100);
}
function propertyDisplayName(access, propertyId) {
  const properties = Array.isArray(access?.properties) ? access.properties : [];
  const item = properties.find((entry) => cleanText(entry?.id, 100) === propertyId);
  return cleanText(item?.displayName || item?.name || propertyId, 160) || "Property";
}
function staffScopeIncludes(user, propertyId) {
  try {
    const scope = JSON.parse(String(user?.propertyScopeJson || "[]"));
    return !Array.isArray(scope) || !scope.length || scope.includes(propertyId);
  } catch (_error) { return true; }
}
function localPurchaseAllowed(user) {
  if (!user || user.membershipStatus !== "active" || user.userStatus === "disabled") return false;
  if (["owner", "manager"].includes(cleanText(user.role, 20))) return true;
  const overrides = jsonObject(user.permissionOverridesJson, {});
  return overrides["inventory.local_purchase"] === true;
}

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
  const active = Number(item.active) !== 0;
  const setupRequired = active && qty <= 0 && minimum === 0 && reorder === 0 && par === 0 && max === 0 && Number(item.unitCostMinor || 0) === 0;
  const outOfStock = active && !setupRequired && qty <= 0;
  const lowStock = active && !setupRequired && threshold > 0 && qty <= threshold;
  return {
    id: cleanText(item.id, 100), sku: cleanText(item.sku, 80), name: cleanText(item.name, 160), category: cleanText(item.category, 120),
    itemClass: ITEM_CLASSES.has(item.itemClass) ? item.itemClass : "consumable", unit: cleanText(item.unit, 40) || "unit",
    quantity: qty, minimumQty: minimum, reorderPoint: reorder, parLevel: par, maximumQty: max,
    unitCostMinor: Math.max(0, Math.round(finite(item.unitCostMinor))), currency: cleanText(item.currency, 8) || "THB",
    preferredSupplierId: cleanText(item.preferredSupplierId, 100), active,
    setupRequired, lowStock, outOfStock,
    stockStatus: !active ? "inactive" : setupRequired ? "setup_required" : outOfStock ? "out" : lowStock ? "low" : "ok",
    suggestedOrderQty: setupRequired ? 0 : Math.max(0, Math.ceil((par > 0 ? par : max > 0 ? max : threshold) - qty)),
    updatedAt: cleanText(item.updatedAt, 40)
  };
}

export async function inventoryOverview({ store, access, propertyId: requestedProperty = "" }) {
  const tenant = tenantId(access); const property = requestedPropertyId(access, requestedProperty);
  if (!tenant || !property) throw new Error("property_not_available");
  // v5.11.83 seeded every catalogue item as active. Safely retire only untouched blank starter rows.
  if (typeof store.mobileDeactivateUnconfiguredStarterInventory === "function") {
    await store.mobileDeactivateUnconfiguredStarterInventory(tenant, property, HOTEL_STARTER_ITEMS.map((item) => item.name), now(access)).catch(() => {});
  }
  const [items, locations, suppliers, purchaseOrders, assets, shoppingLists, users] = await Promise.all([
    store.mobileListInventoryItems(tenant, property, 500), store.mobileListInventoryLocations(tenant, property, 100),
    store.mobileListInventorySuppliers(tenant, property, 200), store.mobileListInventoryPurchaseOrders(tenant, property, 100),
    store.mobileListInventoryAssets(tenant, property, 300),
    typeof store.mobileListInventoryShoppingLists === "function" ? store.mobileListInventoryShoppingLists(tenant, property, 200) : Promise.resolve([]),
    typeof store.mobileListTenantUsers === "function" ? store.mobileListTenantUsers(tenant) : Promise.resolve([])
  ]);
  const publicItems = items.map(publicItem);
  const activeItems = publicItems.filter((item) => item.active);
  const selectedNames = new Set(activeItems.map((item) => item.name.toLowerCase()));
  const purchaseAssignees = users
    .filter((user) => localPurchaseAllowed(user) && staffScopeIncludes(user, property))
    .map((user) => ({ userId: cleanText(user.userId, 100), displayName: cleanText(user.displayName, 120), role: cleanText(user.role, 20) }))
    .filter((user) => user.userId && user.displayName);
  return {
    property: { id: property, displayName: propertyDisplayName(access, property) },
    properties: (Array.isArray(access?.properties) ? access.properties : []).filter((item) => item?.active !== false).map((item) => ({ id: cleanText(item.id, 100), displayName: cleanText(item.displayName || item.name, 160) })),
    items: activeItems, locations, suppliers, purchaseOrders, assets, shoppingLists, purchaseAssignees,
    templates: {
      categories: HOTEL_INVENTORY_CATEGORIES,
      starterItems: HOTEL_STARTER_ITEMS.map((item) => ({ ...item, selected: selectedNames.has(item.name.toLowerCase()) }))
    },
    summary: {
      activeItems: activeItems.length,
      setupRequired: activeItems.filter((item) => item.setupRequired).length,
      lowStock: activeItems.filter((item) => item.lowStock).length,
      outOfStock: activeItems.filter((item) => item.outOfStock).length,
      inventoryValueMinor: Math.round(activeItems.reduce((sum, item) => sum + item.quantity * item.unitCostMinor, 0)),
      pendingPurchaseOrders: purchaseOrders.filter((po) => !["received", "cancelled"].includes(po.status)).length,
      openShoppingLists: shoppingLists.filter((list) => !["completed", "cancelled"].includes(list.status)).length,
      missingReceipts: shoppingLists.filter((list) => list.receiptRequired && !list.financeExpenseId && ["shopping", "awaiting_receipt"].includes(list.status)).length,
      assets: assets.filter((asset) => asset.status !== "retired").length
    }
  };
}

export async function createInventoryItem({ store, access, body, actorLabel = "" }) {
  const tenant = tenantId(access); const property = requestedPropertyId(access, body?.propertyId); const createdAt = now(access);
  const name = cleanText(body?.name, 160); const category = cleanText(body?.category, 120) || "Other";
  const itemClass = ITEM_CLASSES.has(body?.itemClass) ? body.itemClass : "consumable";
  if (!name || !tenant || !property) return { ok: false, error: "invalid_request" };
  const existing = (await store.mobileListInventoryItems(tenant, property, 500)).find((item) => cleanText(item.name, 160).toLowerCase() === name.toLowerCase());
  const id = existing?.id || `invitem_${crypto.randomUUID()}`;
  const record = {
    ...(existing || {}), id, tenantId: tenant, propertyId: property, sku: body?.sku === undefined ? cleanText(existing?.sku, 80) : cleanText(body?.sku, 80), name, category, itemClass,
    unit: cleanText(body?.unit, 40) || cleanText(existing?.unit, 40) || "unit", minimumQty: nonNegative(body?.minimumQty, existing?.minimumQty), reorderPoint: nonNegative(body?.reorderPoint, existing?.reorderPoint),
    parLevel: nonNegative(body?.parLevel, existing?.parLevel), maximumQty: nonNegative(body?.maximumQty, existing?.maximumQty), unitCostMinor: Math.round(nonNegative(body?.unitCostMinor, existing?.unitCostMinor)),
    currency: cleanText(body?.currency, 8) || cleanText(existing?.currency, 8) || access?.record?.currency || "THB", preferredSupplierId: cleanText(body?.preferredSupplierId ?? existing?.preferredSupplierId, 100),
    active: body?.active === false ? false : true, createdByLabel: cleanText(existing?.createdByLabel || actorLabel, 100), createdAt: cleanText(existing?.createdAt, 40) || createdAt
  };
  const result = await store.mobileUpsertInventoryItem(record);
  if (!result?.ok) return result;
  const initialQty = finite(body?.initialQuantity);
  const locationId = cleanText(body?.locationId, 100);
  if (!existing && initialQty !== 0 && locationId) {
    await store.mobileCreateInventoryMovement({
      id: `invmove_${crypto.randomUUID()}`, tenantId: tenant, propertyId: property, itemId: id, movementType: "receive",
      quantity: Math.abs(initialQty), fromLocationId: "", toLocationId: locationId, reason: "Initial stock", unitCostMinor: record.unitCostMinor,
      referenceType: "item_setup", referenceId: id, createdByLabel: cleanText(actorLabel, 100), createdAt
    });
  }
  return { ok: true, item: publicItem(await store.mobileGetInventoryItem(tenant, property, id)) };
}

export async function activateCatalogueItems({ store, access, body, actorLabel = "" }) {
  const requested = Array.isArray(body?.items) ? body.items.slice(0, 200) : [];
  if (!requested.length) return { ok: false, error: "items_required" };
  const templates = new Map(HOTEL_STARTER_ITEMS.map((item) => [item.name.toLowerCase(), item]));
  const activated = [];
  for (const value of requested) {
    const name = cleanText(typeof value === "string" ? value : value?.name, 160);
    const template = templates.get(name.toLowerCase());
    if (!template) continue;
    const result = await createInventoryItem({ store, access, actorLabel, body: { ...template, propertyId: body?.propertyId, active: true } });
    if (result?.ok) activated.push(result.item);
  }
  return activated.length ? { ok: true, activated } : { ok: false, error: "valid_items_required" };
}

export async function updateInventoryItem({ store, access, body, actorLabel = "" }) {
  const tenant = tenantId(access); const property = requestedPropertyId(access, body?.propertyId); const id = cleanText(body?.id, 100);
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
  const name = cleanText(body?.name, 120); const property = requestedPropertyId(access, body?.propertyId); if (!name || !property) return { ok: false, error: "name_required" };
  const record = { id: `invloc_${crypto.randomUUID()}`, tenantId: tenantId(access), propertyId: property, name,
    department: cleanText(body?.department, 100), parentId: cleanText(body?.parentId, 100), active: true, createdByLabel: cleanText(actorLabel, 100), createdAt: now(access) };
  const result = await store.mobileCreateInventoryLocation(record); return result?.ok ? { ok: true, location: result.location } : result;
}

export async function createInventoryMovement({ store, access, body, actorLabel = "" }) {
  const tenant = tenantId(access); const property = requestedPropertyId(access, body?.propertyId); const itemId = cleanText(body?.itemId, 100);
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
  const name = cleanText(body?.name, 160); const property = requestedPropertyId(access, body?.propertyId); if (!name || !property) return { ok: false, error: "name_required" };
  return store.mobileUpsertInventorySupplier({ id: `invsup_${crypto.randomUUID()}`, tenantId: tenantId(access), propertyId: property,
    name, contactName: cleanText(body?.contactName, 120), phone: cleanText(body?.phone, 50), email: cleanText(body?.email, 180), notes: cleanText(body?.notes, 500), active: true,
    createdByLabel: cleanText(actorLabel, 100), createdAt: now(access) });
}

export async function createPurchaseOrder({ store, access, body, actorLabel = "" }) {
  const lines = Array.isArray(body?.lines) ? body.lines.slice(0, 100) : [];
  if (!lines.length) return { ok: false, error: "lines_required" };
  const tenant = tenantId(access); const property = requestedPropertyId(access, body?.propertyId); const supplierId = cleanText(body?.supplierId, 100);
  if (!supplierId) return { ok: false, error: "supplier_required" };
  const suppliers = await store.mobileListInventorySuppliers(tenant, property, 300);
  if (!suppliers.some((supplier) => supplier.id === supplierId && supplier.active !== false)) return { ok: false, error: "supplier_not_found" };
  const validLines = [];
  for (const line of lines) {
    const item = await store.mobileGetInventoryItem(tenant, property, cleanText(line?.itemId, 100));
    const qty = nonNegative(line?.quantity);
    if (!item || Number(item.active) === 0 || qty <= 0) continue;
    validLines.push({ itemId: item.id, quantity: qty, unitCostMinor: Math.round(nonNegative(line?.unitCostMinor, item.unitCostMinor)) });
  }
  if (!validLines.length) return { ok: false, error: "valid_lines_required" };
  const id = `invpo_${crypto.randomUUID()}`; const status = "draft";
  return store.mobileCreateInventoryPurchaseOrder({ id, tenantId: tenant, propertyId: property, supplierId, status,
    expectedAt: cleanText(body?.expectedAt, 40), notes: cleanText(body?.notes, 500), currency: cleanText(body?.currency, 8) || "THB", lines: validLines,
    createdByLabel: cleanText(actorLabel, 100), createdAt: now(access) });
}

export async function updatePurchaseOrderStatus({ store, access, body, actorLabel = "" }) {
  const id = cleanText(body?.id, 100); const property = requestedPropertyId(access, body?.propertyId);
  const status = cleanText(body?.status, 30);
  if (!id || !property || !PO_STATUSES.has(status) || ["partial", "received"].includes(status)) return { ok: false, error: "invalid_purchase_order_status" };
  return store.mobileUpdateInventoryPurchaseOrderStatus({ tenantId: tenantId(access), propertyId: property, id, status, updatedByLabel: cleanText(actorLabel, 100), updatedAt: now(access) });
}

export async function receivePurchaseOrder({ store, access, body, actorLabel = "" }) {
  const id = cleanText(body?.id, 100); const locationId = cleanText(body?.locationId, 100); const property = requestedPropertyId(access, body?.propertyId);
  if (!id || !locationId || !property) return { ok: false, error: "invalid_request" };
  const lines = Array.isArray(body?.lines) ? body.lines.slice(0, 100) : [];
  return store.mobileReceiveInventoryPurchaseOrder({ tenantId: tenantId(access), propertyId: property, id, locationId, lines,
    createdByLabel: cleanText(actorLabel, 100), createdAt: now(access) });
}

export async function createAsset({ store, access, body, actorLabel = "" }) {
  const name = cleanText(body?.name, 160); const property = requestedPropertyId(access, body?.propertyId); if (!name || !property) return { ok: false, error: "name_required" };
  return store.mobileUpsertInventoryAsset({ id: `invasset_${crypto.randomUUID()}`, tenantId: tenantId(access), propertyId: property, itemId: cleanText(body?.itemId, 100),
    name, assetTag: cleanText(body?.assetTag, 80), serialNumber: cleanText(body?.serialNumber, 120), room: cleanText(body?.room, 30), locationId: cleanText(body?.locationId, 100),
    status: cleanText(body?.status, 40) || "in_service", purchaseDate: cleanText(body?.purchaseDate, 20), purchaseCostMinor: Math.round(nonNegative(body?.purchaseCostMinor)),
    warrantyUntil: cleanText(body?.warrantyUntil, 20), nextServiceAt: cleanText(body?.nextServiceAt, 20), supplierId: cleanText(body?.supplierId, 100), notes: cleanText(body?.notes, 500), createdByLabel: cleanText(actorLabel, 100), createdAt: now(access) });
}

export async function seedStarterInventory() {
  // Legacy compatibility: v5.11.84 no longer activates a catalogue on the hotel's behalf.
  return { ok: true, created: 0, catalogueOnly: true };
}

export async function createShoppingList({ store, access, body, actorLabel = "" }) {
  const tenant = tenantId(access); const property = requestedPropertyId(access, body?.propertyId); if (!tenant || !property) return { ok: false, error: "property_required" };
  const assignedUserId = cleanText(body?.assignedUserId, 100);
  let assignedLabel = "";
  if (assignedUserId) {
    const users = await store.mobileListTenantUsers(tenant);
    const assignee = users.find((user) => user.userId === assignedUserId && staffScopeIncludes(user, property));
    if (!assignee || !localPurchaseAllowed(assignee)) return { ok: false, error: "shopping_list_assignee_not_authorized" };
    assignedLabel = cleanText(assignee.displayName, 120);
  }
  const id = `shoplist_${crypto.randomUUID()}`;
  const result = await store.mobileCreateInventoryShoppingList({
    id, tenantId: tenant, propertyId: property, title: cleanText(body?.title, 160) || `${propertyDisplayName(access, property)} shopping list`,
    assignedUserId, assignedLabel, status: "draft", dueAt: cleanText(body?.dueAt, 40), notes: cleanText(body?.notes, 600),
    receiptRequired: body?.receiptRequired !== false, currency: cleanText(body?.currency, 8) || access?.record?.currency || "THB", createdByLabel: cleanText(actorLabel, 120), createdAt: now(access)
  });
  if (!result?.ok) return result;
  const lines = Array.isArray(body?.lines) ? body.lines.slice(0, 100) : [];
  for (const line of lines) await addShoppingListLine({ store, access, body: { ...line, listId: id, propertyId: property }, actorLabel });
  return { ok: true, shoppingList: await store.mobileGetInventoryShoppingList(tenant, id) };
}

export async function addShoppingListLine({ store, access, body }) {
  const tenant = tenantId(access); const listId = cleanText(body?.listId, 100); const list = await store.mobileGetInventoryShoppingList(tenant, listId);
  if (!list) return { ok: false, error: "shopping_list_not_found" };
  if (["completed", "cancelled"].includes(list.status)) return { ok: false, error: "shopping_list_closed" };
  const property = requestedPropertyId(access, body?.propertyId || list.propertyId); if (!property || property !== list.propertyId) return { ok: false, error: "property_mismatch" };
  const itemId = cleanText(body?.itemId, 100); let item = null;
  if (itemId) item = await store.mobileGetInventoryItem(tenant, property, itemId);
  const requestedItemName = cleanText(body?.itemName, 160);
  if (!item && requestedItemName) {
    const candidates = await store.mobileListInventoryItems(tenant, property, 500);
    item = candidates.find((entry) => Number(entry.active) !== 0 && cleanText(entry.name, 160).toLowerCase() === requestedItemName.toLowerCase()) || null;
  }
  const itemName = cleanText(item?.name || requestedItemName, 160); const quantity = nonNegative(body?.quantity);
  if (!itemName || quantity <= 0) return { ok: false, error: "invalid_shopping_list_line" };
  if (body?.itemId && !item) return { ok: false, error: "inventory_item_not_enabled_for_property" };
  const id = `shopline_${crypto.randomUUID()}`;
  const outcome = await store.mobileAddInventoryShoppingListLine({ id, listId, propertyId: property, itemId: item?.id || "", itemName, quantity,
    unit: cleanText(item?.unit || body?.unit, 40) || "unit", room: cleanText(body?.room, 60), specification: cleanText(body?.specification, 240), notes: cleanText(body?.notes, 500), updatedAt: now(access) });
  return outcome?.ok ? { ok: true, lineId: id, shoppingList: await store.mobileGetInventoryShoppingList(tenant, listId) } : outcome;
}

export async function assignShoppingList({ store, access, body }) {
  const tenant = tenantId(access); const id = cleanText(body?.id, 100); const list = await store.mobileGetInventoryShoppingList(tenant, id); if (!list) return { ok: false, error: "shopping_list_not_found" };
  const userId = cleanText(body?.assignedUserId, 100); const users = await store.mobileListTenantUsers(tenant);
  const assignee = users.find((user) => user.userId === userId && staffScopeIncludes(user, list.propertyId));
  if (!assignee || !localPurchaseAllowed(assignee)) return { ok: false, error: "shopping_list_assignee_not_authorized" };
  return store.mobileAssignInventoryShoppingList({ tenantId: tenant, id, assignedUserId: userId, assignedLabel: cleanText(assignee.displayName, 120), updatedAt: now(access) });
}

export async function updateShoppingListLine({ store, access, body }) {
  const tenant = tenantId(access); const listId = cleanText(body?.listId, 100); const list = await store.mobileGetInventoryShoppingList(tenant, listId); if (!list) return { ok: false, error: "shopping_list_not_found" };
  const lineStatus = cleanText(body?.lineStatus, 30); if (!SHOPPING_LINE_STATUSES.has(lineStatus)) return { ok: false, error: "invalid_line_status" };
  return store.mobileUpdateInventoryShoppingLine({ tenantId: tenant, listId, lineId: cleanText(body?.lineId, 100), lineStatus,
    actualQuantity: nonNegative(body?.actualQuantity), actualCostMinor: Math.round(nonNegative(body?.actualCostMinor)), notes: cleanText(body?.notes, 500), updatedAt: now(access) });
}

export async function updateShoppingListStatus({ store, access, body, actorLabel = "" }) {
  const tenant = tenantId(access); const id = cleanText(body?.id, 100); const status = cleanText(body?.status, 30); if (!id || !SHOPPING_LIST_STATUSES.has(status)) return { ok: false, error: "invalid_shopping_list_status" };
  const list = await store.mobileGetInventoryShoppingList(tenant, id); if (!list) return { ok: false, error: "shopping_list_not_found" };
  if (status === "completed") {
    if (list.receiptRequired && !list.financeExpenseId) return { ok: false, error: "shopping_list_receipt_required" };
    const purchased = (Array.isArray(list.lines) ? list.lines : []).filter((line) => ["bought", "partial", "substituted"].includes(line.lineStatus) && line.itemId && Number(line.actualQuantity) > 0);
    const locationId = cleanText(body?.locationId, 100);
    if (purchased.length && !locationId) return { ok: false, error: "destination_required" };
    for (const line of purchased) {
      const alreadyPosted = typeof store.mobileHasInventoryMovementReference === "function"
        ? await store.mobileHasInventoryMovementReference(tenant, list.propertyId, "shopping_list_line", line.id)
        : false;
      if (alreadyPosted) continue;
      const item = await store.mobileGetInventoryItem(tenant, list.propertyId, line.itemId);
      if (!item || Number(item.active) === 0) continue;
      await store.mobileCreateInventoryMovement({
        id: `invmove_${crypto.randomUUID()}`, tenantId: tenant, propertyId: list.propertyId, itemId: line.itemId, movementType: "receive",
        quantity: Number(line.actualQuantity), fromLocationId: "", toLocationId: locationId, reason: `Local purchase ${id}`,
        unitCostMinor: Number(line.actualCostMinor) > 0 && Number(line.actualQuantity) > 0 ? Math.round(Number(line.actualCostMinor) / Number(line.actualQuantity)) : Math.max(0, Math.round(Number(item.unitCostMinor) || 0)),
        referenceType: "shopping_list_line", referenceId: line.id, createdByLabel: cleanText(actorLabel, 120), createdAt: now(access)
      });
    }
  }
  return store.mobileSetInventoryShoppingListStatus({ tenantId: tenant, id, status, updatedAt: now(access) });
}

export async function linkShoppingListExpense({ store, access, body }) {
  const id = cleanText(body?.id, 100), financeExpenseId = cleanText(body?.financeExpenseId, 100); if (!id || !financeExpenseId) return { ok: false, error: "invalid_request" };
  const expense = typeof store.getExpense === "function" ? await store.getExpense(financeExpenseId) : null;
  if (!expense) return { ok: false, error: "expense_not_found" };
  return store.mobileLinkInventoryShoppingExpense({ tenantId: tenantId(access), id, financeExpenseId, updatedAt: now(access) });
}

export function shoppingListAssignmentMessage(list = {}) {
  const title = cleanText(list.title, 160) || "Shopping list";
  const lines = Array.isArray(list.lines) ? list.lines : [];
  const detail = lines.slice(0, 8).map((line) => `${line.quantity} ${line.unit} ${line.itemName}${line.room ? ` (${line.room})` : ""}`).join(" · ");
  return `${title}${detail ? `: ${detail}` : ""}`.slice(0, 220);
}
