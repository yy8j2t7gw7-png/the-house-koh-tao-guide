import { beds24ApiRequest } from "./unified-messaging.js";
import { houseRoomToBeds24RoomId } from "./beds24-channel-manager.js";

const HOUSE_ROOMS = Object.freeze(["1","2","3","4","5","6","7","8","9","10","11"]);
const MAX_RANGE_DAYS = 62;

function cleanText(value, maximum = 120) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, maximum);
}

function validDate(value) {
  const date = cleanText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "";
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : "";
}

function shiftedDateOnly(dateOnly, days) {
  const date = new Date(`${dateOnly}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function rangeDays(from, to) {
  if (!from || !to || to < from) return Infinity;
  const start = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function beds24RateInventoryWritesEnabled(env = {}) {
  return String(env.BEDS24_RATE_INVENTORY_WRITES_ENABLED || "false").toLowerCase() === "true";
}

export function beds24ListingsRatesConfiguration(env = {}) {
  const roomMap = HOUSE_ROOMS.map((room) => ({ room, beds24RoomId: houseRoomToBeds24RoomId(room, env) }));
  const roomMapComplete = roomMap.every((item) => Boolean(item.beds24RoomId))
    && new Set(roomMap.map((item) => item.beds24RoomId)).size === HOUSE_ROOMS.length;
  const credentialsReady = Boolean(env.BEDS24_REFRESH_TOKEN);
  const writesEnabled = beds24RateInventoryWritesEnabled(env);
  return {
    provider: "beds24",
    readable: credentialsReady && roomMapComplete,
    writesEnabled,
    writeReady: credentialsReady && roomMapComplete && writesEnabled,
    roomMapComplete,
    credentialsReady,
    independentFromChannelManager: true,
    fullChannelManagerEnabled: String(env.BEDS24_CHANNEL_MANAGER_ENABLED || "false").toLowerCase() === "true",
    supportedWrites: ["price1", "inventory"],
    scope: "explicit_room_date_cells"
  };
}

function calendarRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
}

function numericOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeCalendarRows(response, env, from, to) {
  const reverse = new Map(
    HOUSE_ROOMS.map((room) => [String(houseRoomToBeds24RoomId(room, env)), room]).filter(([id]) => id)
  );
  const out = [];
  for (const row of calendarRows(response)) {
    const providerRoomId = String(row?.roomId || row?.roomID || "");
    const room = reverse.get(providerRoomId);
    if (!room) continue;

    const entries = Array.isArray(row?.calendar) ? row.calendar : [row];
    for (const item of entries) {
      const start = validDate(item?.date || item?.from || item?.startDate || from);
      const end = validDate(item?.to || item?.endDate || start);
      if (!start) continue;
      for (let date = start, guard = 0; date && date <= (end || start) && guard < MAX_RANGE_DAYS; date = shiftedDateOnly(date, 1), guard += 1) {
        if (date < from || date > to) continue;
        const price = numericOrNull(item?.price1 ?? item?.p1 ?? item?.dailyPrice1);
        const inventory = numericOrNull(item?.numAvail ?? item?.inventory ?? item?.i ?? item?.availability);
        const minStay = numericOrNull(item?.minStay ?? item?.m);
        out.push({
          room,
          providerRoomId,
          date,
          price1: price,
          inventory,
          minStay,
          rawSource: "beds24_calendar"
        });
      }
    }
  }
  const byKey = new Map();
  for (const item of out) byKey.set(`${item.room}:${item.date}`, item);
  return [...byKey.values()].sort((a,b) => Number(a.room)-Number(b.room) || a.date.localeCompare(b.date));
}

export async function getBeds24ListingsRates(env, store, { from, to } = {}) {
  const configuration = beds24ListingsRatesConfiguration(env);
  const start = validDate(from);
  const end = validDate(to);
  const days = rangeDays(start, end);
  if (!start || !end || days > MAX_RANGE_DAYS) {
    return { ok: false, error: "invalid_date_range", configuration, rows: [] };
  }
  if (!configuration.readable) {
    return { ok: false, error: "beds24_listings_rates_not_ready", configuration, rows: [] };
  }
  const roomIds = HOUSE_ROOMS.map((room) => Number(houseRoomToBeds24RoomId(room, env))).filter(Number.isFinite);
  const response = await beds24ApiRequest(env, store, "inventory/rooms/calendar", {
    query: {
      roomId: roomIds,
      startDate: start,
      endDate: end,
      includeNumAvail: true,
      includePrices: true,
      includeMinStay: true
    }
  });
  return { ok: true, configuration, from: start, to: end, rows: normalizeCalendarRows(response, env, start, end) };
}

function assertWriteCell(input = {}) {
  const room = cleanText(input.room, 4);
  const date = validDate(input.date);
  if (!HOUSE_ROOMS.includes(room) || !date) return { ok: false, error: "invalid_cell" };
  const hasPrice = input.price1 !== undefined && input.price1 !== null && input.price1 !== "";
  const hasInventory = input.inventory !== undefined && input.inventory !== null && input.inventory !== "";
  if (!hasPrice && !hasInventory) return { ok: false, error: "no_changes" };

  let price1 = null;
  if (hasPrice) {
    price1 = Number(input.price1);
    if (!Number.isFinite(price1) || price1 < 0 || price1 > 1_000_000) return { ok: false, error: "invalid_price" };
    price1 = Math.round(price1 * 100) / 100;
  }

  let inventory = null;
  if (hasInventory) {
    inventory = Number(input.inventory);
    if (!Number.isInteger(inventory) || ![0,1].includes(inventory)) return { ok: false, error: "invalid_inventory" };
  }
  return { ok: true, room, date, price1, inventory, hasPrice, hasInventory };
}

export async function writeBeds24ListingRateCell(env, store, input = {}) {
  const configuration = beds24ListingsRatesConfiguration(env);
  if (!configuration.writeReady) return { ok: false, error: "rate_inventory_writes_disabled", configuration };
  const cell = assertWriteCell(input);
  if (!cell.ok) return { ...cell, configuration };
  const roomId = houseRoomToBeds24RoomId(cell.room, env);
  if (!roomId) return { ok: false, error: "room_mapping_missing", configuration };

  const calendar = { from: cell.date, to: cell.date };
  if (cell.hasPrice) calendar.price1 = cell.price1;
  if (cell.hasInventory) calendar.inventory = cell.inventory;

  const response = await beds24ApiRequest(env, store, "inventory/rooms/calendar", {
    method: "POST",
    body: [{ roomId: Number(roomId), calendar: [calendar] }]
  });
  const first = Array.isArray(response) ? response[0] : Array.isArray(response?.data) ? response.data[0] : response;
  if (first?.success === false || (Array.isArray(first?.errors) && first.errors.length)) {
    return { ok: false, error: "beds24_calendar_write_failed", provider: first, configuration };
  }
  return {
    ok: true,
    room: cell.room,
    providerRoomId: roomId,
    date: cell.date,
    price1: cell.hasPrice ? cell.price1 : undefined,
    inventory: cell.hasInventory ? cell.inventory : undefined,
    configuration
  };
}
