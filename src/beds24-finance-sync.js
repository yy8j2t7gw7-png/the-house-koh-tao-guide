import { beds24ApiRequest, roomForBeds24Booking } from "./unified-messaging.js";
import { houseRoomToBeds24RoomId } from "./beds24-channel-manager.js";
import { HOUSE_FINANCE_BUSINESS_ID } from "./finance-businesses.js";

const HOUSE_ROOMS = Object.freeze(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
const AIRBNB_CHANNEL = "airbnb";
const DEFAULT_LOOKBACK_DAYS = 180;
const MAX_LOOKBACK_DAYS = 730;
const MAX_PAGES = 20;

function cleanText(value, maximum = 240) {
  return String(value || "").replace(/\u0000/g, "").trim().replace(/\s+/g, " ").slice(0, maximum);
}

function validDate(value) {
  const text = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function dateFromDateTime(value) {
  const text = cleanText(value, 40);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function shiftedDateOnly(dateOnly, days) {
  const date = new Date(`${dateOnly}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function bangkokDateOnly(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function amountToMinor(value, digits = 2) {
  const factor = 10 ** Math.max(0, Math.min(3, Number(digits) || 0));
  return Math.round(numeric(value) * factor);
}

function minorToAmount(value, digits = 2) {
  const factor = 10 ** Math.max(0, Math.min(3, Number(digits) || 0));
  return (Number(value || 0) / factor).toFixed(Math.max(0, Math.min(3, Number(digits) || 0)));
}

function invoiceItemTotal(item = {}) {
  if (Number.isFinite(Number(item.lineTotal))) return Number(item.lineTotal);
  const quantity = Number.isFinite(Number(item.qty)) ? Number(item.qty) : 1;
  return numeric(item.amount) * quantity;
}

function invoiceItemText(item = {}) {
  return `${cleanText(item.description, 250)} ${cleanText(item.status, 80)}`.toLowerCase();
}

function channelCollectPayment(item = {}) {
  const subtype = Number(item.subType);
  if (subtype === 202) return true;
  if (cleanText(item.type, 20).toLowerCase() !== "payment" && subtype < 200) return false;
  return /(?:channel\s*collect|airbnb.*(?:payout|payment)|(?:payout|payment).*airbnb)/i.test(invoiceItemText(item));
}

function refundPayment(item = {}) {
  const subtype = Number(item.subType);
  return subtype === 213 || /\brefund(?:ed)?\b/i.test(invoiceItemText(item));
}

export function beds24AirbnbPaymentSummary(booking = {}, minorUnitDigits = 2) {
  const items = Array.isArray(booking.invoiceItems) ? booking.invoiceItems : [];
  let actualPayment = 0;
  const paymentItemIds = [];
  const paymentTimes = [];

  items.forEach((item) => {
    if (!channelCollectPayment(item) && !refundPayment(item)) return;
    let value = invoiceItemTotal(item);
    if (refundPayment(item) && value > 0) value = -value;
    actualPayment += value;
    if (item.id !== undefined && item.id !== null) paymentItemIds.push(String(item.id));
    if (item.createTime) paymentTimes.push(cleanText(item.createTime, 40));
  });

  const commission = Math.max(0, numeric(booking.commission));
  const bookingPrice = Math.max(0, numeric(booking.price));
  const actualPaymentMinor = amountToMinor(actualPayment, minorUnitDigits);
  const feesMinor = amountToMinor(commission, minorUnitDigits);
  let grossMinor = amountToMinor(bookingPrice, minorUnitDigits);
  if (grossMinor <= 0 || actualPaymentMinor > grossMinor) grossMinor = Math.max(0, actualPaymentMinor) + feesMinor;

  return {
    actualPaymentMinor,
    grossMinor,
    feesMinor,
    bookingPriceMinor: amountToMinor(bookingPrice, minorUnitDigits),
    paymentItemIds: [...new Set(paymentItemIds)].sort(),
    paymentItemCreateTimes: [...new Set(paymentTimes)].sort()
  };
}

export function beds24FinanceSyncEnabled(env = {}) {
  return String(env.BEDS24_FINANCE_SYNC_ENABLED || "false").toLowerCase() === "true";
}

export function beds24FinanceSyncConfiguration(env = {}) {
  const enabled = beds24FinanceSyncEnabled(env);
  const refreshTokenReady = Boolean(env.BEDS24_REFRESH_TOKEN);
  const roomMapComplete = HOUSE_ROOMS.every((room) => Boolean(houseRoomToBeds24RoomId(room, env)));
  const lookbackCandidate = Number(env.BEDS24_FINANCE_SYNC_LOOKBACK_DAYS);
  const lookbackDays = Number.isFinite(lookbackCandidate)
    ? Math.max(30, Math.min(MAX_LOOKBACK_DAYS, Math.round(lookbackCandidate)))
    : DEFAULT_LOOKBACK_DAYS;
  return {
    enabled,
    ready: enabled && refreshTokenReady && roomMapComplete,
    refreshTokenReady,
    roomMapComplete,
    channel: "Airbnb",
    accountingBasis: "actual_channel_collect_payment",
    lookbackDays,
    schedule: "daily",
    requiredBeds24Scopes: ["read:bookings", "read:bookings-financial"]
  };
}

function bookingExternalSourceId(booking = {}) {
  const id = Number(booking.id);
  return Number.isSafeInteger(id) && id > 0 ? `airbnb-booking:${id}` : "";
}

function bookingReference(booking = {}) {
  const reference = cleanText(booking.apiReference || booking.reference, 80);
  return reference ? `Airbnb ${reference}`.slice(0, 120) : `Beds24 ${String(booking.id || "")}`.slice(0, 120);
}

function paymentObservedDate(booking = {}, existing = null) {
  if (existing?.incomeDate) return validDate(existing.incomeDate);
  return dateFromDateTime(booking.modifiedTime)
    || dateFromDateTime(booking.bookingTime)
    || validDate(booking.departure)
    || bangkokDateOnly();
}

export function beds24AirbnbIncomeRecord(booking = {}, env = {}, existing = null, now = new Date()) {
  if (cleanText(booking.channel, 40).toLowerCase() !== AIRBNB_CHANNEL) return null;
  const externalSourceId = bookingExternalSourceId(booking);
  const room = roomForBeds24Booking(booking, env);
  if (!externalSourceId || !room) return null;

  const minorUnitDigits = Math.max(0, Math.min(3, Number(env.EXPENSE_MINOR_UNIT_DIGITS) || 2));
  const summary = beds24AirbnbPaymentSummary(booking, minorUnitDigits);
  if (summary.actualPaymentMinor <= 0 && !existing) return null;

  const cancelled = cleanText(booking.status, 40).toLowerCase().includes("cancel") || Boolean(booking.cancelTime);
  const refunded = summary.actualPaymentMinor <= 0 && Boolean(existing);
  const sourceStatus = refunded ? "refunded" : cancelled ? "paid_cancelled_booking" : "paid";
  const grossMinor = refunded ? 0 : Math.max(0, summary.grossMinor);
  const feesMinor = refunded ? 0 : Math.max(0, summary.feesMinor);
  const netMinor = refunded ? 0 : Math.max(0, summary.actualPaymentMinor);
  const arrival = validDate(booking.arrival);
  const departure = validDate(booking.departure);
  const dates = arrival && departure ? `${arrival}–${departure}` : "Airbnb stay";
  const bookingPriceText = summary.bookingPriceMinor > 0 ? minorToAmount(summary.bookingPriceMinor, minorUnitDigits) : "not supplied";
  const commissionText = summary.feesMinor > 0 ? minorToAmount(summary.feesMinor, minorUnitDigits) : "0";
  const paymentItemText = summary.paymentItemIds.length ? summary.paymentItemIds.join(",") : "provider payment";

  return {
    businessId: HOUSE_FINANCE_BUSINESS_ID,
    sourceSystem: "beds24",
    sourceExternalId: externalSourceId,
    sourceStatus,
    incomeDate: paymentObservedDate(booking, existing),
    category: "Airbnb",
    description: refunded ? `Airbnb payout refunded · Room ${room} · ${dates}` : `Airbnb payout · Room ${room} · ${dates}`,
    grossMinor,
    feesMinor,
    netMinor,
    currency: cleanText(env.BEDS24_FINANCE_CURRENCY || env.EXPENSE_CURRENCY || "THB", 3).toUpperCase(),
    unit: `Room ${room}`,
    paymentMethod: "Bank transfer",
    reference: bookingReference(booking),
    notes: cleanText(`Auto-synced from Beds24 booking ${String(booking.id)}. Actual channel-collected payment is authoritative for net income. Beds24 booking value: ${bookingPriceText}; commission: ${commissionText}; payment item(s): ${paymentItemText}.`, 500),
    syncedAt: now.toISOString()
  };
}

async function fetchAirbnbBookings(env, store, lookbackDays) {
  const today = bangkokDateOnly();
  const query = {
    channel: AIRBNB_CHANNEL,
    departureFrom: shiftedDateOnly(today, -lookbackDays),
    arrivalTo: shiftedDateOnly(today, 365),
    includeInvoiceItems: true,
    status: ["confirmed", "new", "request", "cancelled"]
  };
  const bookings = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await beds24ApiRequest(env, store, "bookings", { query: { ...query, page } });
    if (Array.isArray(response?.data)) bookings.push(...response.data);
    if (!response?.pages?.nextPageExists) break;
  }
  return bookings;
}

export async function reconcileBeds24Finance(env, options = {}) {
  if (!beds24FinanceSyncEnabled(env)) return { ok: true, ignored: "finance_sync_disabled" };
  const configuration = beds24FinanceSyncConfiguration(env);
  if (!configuration.ready) return { ok: false, error: "beds24_finance_sync_not_ready", configuration };
  const store = options.store || env.CONCIERGE_STORE?.getByName?.("the-house-concierge-global");
  if (!store || typeof store.upsertProviderIncome !== "function") return { ok: false, error: "finance_store_unavailable" };

  const bookings = await fetchAirbnbBookings(env, store, configuration.lookbackDays);
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let refunded = 0;
  const now = options.now instanceof Date ? options.now : new Date();

  for (const booking of bookings) {
    const externalSourceId = bookingExternalSourceId(booking);
    if (!externalSourceId) { skipped += 1; continue; }
    const existing = typeof store.getProviderIncome === "function"
      ? await store.getProviderIncome(HOUSE_FINANCE_BUSINESS_ID, "beds24", externalSourceId)
      : null;
    const record = beds24AirbnbIncomeRecord(booking, env, existing, now);
    if (!record) { skipped += 1; continue; }
    const result = await store.upsertProviderIncome(record);
    if (record.sourceStatus === "refunded") refunded += 1;
    if (result?.created) created += 1;
    else if (result?.updated) updated += 1;
    else unchanged += 1;
  }

  if (typeof store.setMessagingProviderState === "function") {
    await store.setMessagingProviderState("beds24-finance-sync", {
      lastRunAt: now.toISOString(), created, updated, unchanged, skipped, refunded, scanned: bookings.length
    }, new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()).catch(() => {});
  }
  return { ok: true, scanned: bookings.length, created, updated, unchanged, skipped, refunded };
}
