import { beds24ApiRequest, roomForBeds24Booking } from "./unified-messaging.js";
import { houseRoomToBeds24RoomId } from "./beds24-channel-manager.js";
import { HOUSE_FINANCE_BUSINESS_ID } from "./finance-businesses.js";

const HOUSE_ROOMS = Object.freeze(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
const DEFAULT_LOOKBACK_DAYS = 180;
const MAX_LOOKBACK_DAYS = 730;
const MAX_IMPORT_RANGE_DAYS = 730;
const MAX_PAGES = 40;
const PROVIDER_FETCH_MARGIN_DAYS = 120;

const OTA_PROVIDERS = Object.freeze({
  airbnb: Object.freeze({
    key: "airbnb",
    label: "Airbnb",
    channelValues: Object.freeze(["airbnb"]),
    category: "Airbnb",
    externalPrefix: "airbnb-booking",
    implemented: true
  }),
  booking: Object.freeze({ key: "booking", label: "Booking.com", channelValues: Object.freeze(["booking", "booking.com"]), category: "Booking.com", externalPrefix: "bookingcom-booking", implemented: false }),
  expedia: Object.freeze({ key: "expedia", label: "Expedia", channelValues: Object.freeze(["expedia"]), category: "Expedia", externalPrefix: "expedia-booking", implemented: false }),
  vrbo: Object.freeze({ key: "vrbo", label: "Vrbo", channelValues: Object.freeze(["vrbo"]), category: "Vrbo", externalPrefix: "vrbo-booking", implemented: false }),
  agoda: Object.freeze({ key: "agoda", label: "Agoda", channelValues: Object.freeze(["agoda"]), category: "Agoda", externalPrefix: "agoda-booking", implemented: false }),
  hostelworld: Object.freeze({ key: "hostelworld", label: "Hostelworld", channelValues: Object.freeze(["hostelworld"]), category: "Hostelworld", externalPrefix: "hostelworld-booking", implemented: false }),
  trip: Object.freeze({ key: "trip", label: "Trip.com", channelValues: Object.freeze(["trip.com", "trip"]), category: "Trip.com", externalPrefix: "tripcom-booking", implemented: false })
});

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

function daysBetweenInclusive(from, to) {
  const start = new Date(`${from}T12:00:00Z`).getTime();
  const end = new Date(`${to}T12:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return Infinity;
  return Math.floor((end - start) / 86_400_000) + 1;
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

function invoiceCharge(item = {}) {
  const type = cleanText(item.type, 20).toLowerCase();
  const subtype = Number(item.subType);
  if (type === "payment" || subtype >= 200) return false;
  return type === "charge" || (Number.isFinite(subtype) && subtype > 0 && subtype < 200);
}

function sourceStatusStarts(value, prefix) {
  return cleanText(value, 40).toLowerCase().startsWith(prefix);
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

function normalizeProviderKey(value) {
  const key = cleanText(value, 40).toLowerCase();
  if (key === "booking.com") return "booking";
  if (key === "trip.com") return "trip";
  return key || "airbnb";
}

function providerDefinition(value) {
  return OTA_PROVIDERS[normalizeProviderKey(value)] || null;
}

export function otaFinanceProviderCatalog() {
  return Object.values(OTA_PROVIDERS).map((provider) => ({
    key: provider.key,
    label: provider.label,
    implemented: provider.implemented
  }));
}

export function beds24AirbnbPaymentSummary(booking = {}, minorUnitDigits = 2) {
  const items = Array.isArray(booking.invoiceItems) ? booking.invoiceItems : [];
  let actualPayment = 0;
  let invoiceCharges = 0;
  let explicitExpectedPayout = 0;
  let hasRefund = false;
  const paymentItemIds = [];
  const paymentTimes = [];

  items.forEach((item) => {
    if (invoiceCharge(item)) {
      const value = invoiceItemTotal(item);
      if (value > 0) invoiceCharges += value;
      if (/expected\s+payout/i.test(invoiceItemText(item)) && value > 0) explicitExpectedPayout += value;
    }
    if (!channelCollectPayment(item) && !refundPayment(item)) return;
    let value = invoiceItemTotal(item);
    if (refundPayment(item)) {
      hasRefund = true;
      if (value > 0) value = -value;
    }
    actualPayment += value;
    if (item.id !== undefined && item.id !== null) paymentItemIds.push(String(item.id));
    if (item.createTime) paymentTimes.push(cleanText(item.createTime, 40));
  });

  const commission = Math.max(0, numeric(booking.commission));
  const bookingPrice = Math.max(0, numeric(booking.price));
  const actualPaymentMinor = amountToMinor(actualPayment, minorUnitDigits);
  const feesMinor = amountToMinor(commission, minorUnitDigits);
  const bookingPriceMinor = amountToMinor(bookingPrice, minorUnitDigits);
  const invoiceChargesMinor = amountToMinor(invoiceCharges, minorUnitDigits);
  const calculatedExpectedMinor = Math.max(0, bookingPriceMinor - feesMinor);
  let expectedPayoutMinor = amountToMinor(explicitExpectedPayout, minorUnitDigits);
  let expectedSource = expectedPayoutMinor > 0 ? "invoice_expected_payout" : "";
  if (expectedPayoutMinor <= 0 && calculatedExpectedMinor > 0) {
    expectedPayoutMinor = calculatedExpectedMinor;
    expectedSource = "booking_less_commission";
  }
  if (expectedPayoutMinor <= 0 && invoiceChargesMinor > 0) {
    expectedPayoutMinor = invoiceChargesMinor;
    expectedSource = "invoice_charges";
  }

  let grossMinor = bookingPriceMinor;
  if (grossMinor <= 0 || Math.max(actualPaymentMinor, expectedPayoutMinor) > grossMinor) {
    grossMinor = Math.max(0, actualPaymentMinor, expectedPayoutMinor) + feesMinor;
  }

  return {
    actualPaymentMinor,
    expectedPayoutMinor,
    expectedSource,
    invoiceChargesMinor,
    grossMinor,
    feesMinor,
    bookingPriceMinor,
    hasRefund,
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
    historicalImportReady: refreshTokenReady && roomMapComplete,
    refreshTokenReady,
    roomMapComplete,
    channel: "Airbnb",
    provider: "airbnb",
    providers: otaFinanceProviderCatalog(),
    accountingBasis: "expected_then_actual_channel_collect_payment",
    lookbackDays,
    maxHistoricalImportDays: MAX_IMPORT_RANGE_DAYS,
    schedule: "daily",
    requiredBeds24Scopes: ["read:bookings", "read:bookings-financial"]
  };
}

function bookingExternalSourceId(booking = {}, providerKey = "airbnb") {
  const provider = providerDefinition(providerKey);
  const id = Number(booking.id);
  return provider && Number.isSafeInteger(id) && id > 0 ? `${provider.externalPrefix}:${id}` : "";
}

function bookingReference(booking = {}, providerKey = "airbnb") {
  const provider = providerDefinition(providerKey);
  const reference = cleanText(booking.apiReference || booking.reference, 80);
  return reference ? `${provider?.label || "OTA"} ${reference}`.slice(0, 120) : `Beds24 ${String(booking.id || "")}`.slice(0, 120);
}

function paymentObservedDate(booking = {}, summary = {}, existing = null) {
  const paymentDates = (Array.isArray(summary.paymentItemCreateTimes) ? summary.paymentItemCreateTimes : [])
    .map(dateFromDateTime).filter(Boolean).sort();
  if (paymentDates.length) return paymentDates[paymentDates.length - 1];
  if (sourceStatusStarts(existing?.sourceStatus, "paid") && validDate(existing?.incomeDate)) return validDate(existing.incomeDate);
  return dateFromDateTime(booking.modifiedTime)
    || validDate(existing?.incomeDate)
    || dateFromDateTime(booking.bookingTime)
    || validDate(booking.departure)
    || bangkokDateOnly();
}

function expectedPayoutDate(booking = {}, existing = null) {
  if (sourceStatusStarts(existing?.sourceStatus, "expected") && validDate(existing?.incomeDate)) return validDate(existing.incomeDate);
  return validDate(booking.arrival)
    || validDate(booking.departure)
    || dateFromDateTime(booking.bookingTime)
    || bangkokDateOnly();
}

export function beds24AirbnbIncomeRecord(booking = {}, env = {}, existing = null, now = new Date()) {
  return beds24ProviderIncomeRecord(booking, env, existing, now, "airbnb");
}

export function beds24ProviderIncomeRecord(booking = {}, env = {}, existing = null, now = new Date(), providerKey = "airbnb") {
  const provider = providerDefinition(providerKey);
  if (!provider?.implemented) return null;
  if (!provider.channelValues.includes(cleanText(booking.channel, 40).toLowerCase())) return null;
  const externalSourceId = bookingExternalSourceId(booking, provider.key);
  const room = roomForBeds24Booking(booking, env);
  if (!externalSourceId || !room) return null;

  const minorUnitDigits = Math.max(0, Math.min(3, Number(env.EXPENSE_MINOR_UNIT_DIGITS) || 2));
  const summary = beds24AirbnbPaymentSummary(booking, minorUnitDigits);
  const cancelled = cleanText(booking.status, 40).toLowerCase().includes("cancel") || Boolean(booking.cancelTime);
  const existingPaid = sourceStatusStarts(existing?.sourceStatus, "paid");
  const existingExpected = sourceStatusStarts(existing?.sourceStatus, "expected");
  const hasActual = summary.actualPaymentMinor > 0;
  const hasExpected = summary.expectedPayoutMinor > 0 && (!cancelled || summary.expectedSource !== "booking_less_commission");

  let sourceStatus = "";
  let grossMinor = 0;
  let feesMinor = 0;
  let netMinor = 0;
  let incomeDate = "";
  let description = "";
  let authoritative = "";

  if (hasActual) {
    sourceStatus = cancelled ? "paid_cancelled_booking" : "paid";
    grossMinor = Math.max(0, summary.grossMinor);
    feesMinor = Math.max(0, summary.feesMinor);
    netMinor = Math.max(0, summary.actualPaymentMinor);
    incomeDate = paymentObservedDate(booking, summary, existing);
    description = `${provider.label} payout · Room ${room}`;
    authoritative = "Actual channel-collected payment is authoritative for net income.";
  } else if (summary.hasRefund && existing) {
    sourceStatus = "refunded";
    incomeDate = paymentObservedDate(booking, summary, existing);
    description = `${provider.label} payout refunded · Room ${room}`;
    authoritative = "The provider-reported refund has cleared this previously imported payout.";
  } else if (summary.hasRefund) {
    return null;
  } else if (existingPaid) {
    // Never downgrade a settled payout merely because a later provider response temporarily omits payment rows.
    sourceStatus = existing.sourceStatus || "paid";
    grossMinor = Math.max(0, Number(existing.grossMinor) || 0);
    feesMinor = Math.max(0, Number(existing.feesMinor) || 0);
    netMinor = Math.max(0, Number(existing.netMinor) || 0);
    incomeDate = validDate(existing.incomeDate) || paymentObservedDate(booking, summary, existing);
    description = cleanText(existing.description, 240) || `${provider.label} payout · Room ${room}`;
    authoritative = "Previously settled provider payment preserved because the current Beds24 response contains no refund evidence.";
  } else if (hasExpected) {
    sourceStatus = cancelled ? "expected_cancelled_booking" : "expected_payout";
    grossMinor = Math.max(0, summary.grossMinor);
    feesMinor = Math.max(0, summary.feesMinor);
    netMinor = Math.max(0, summary.expectedPayoutMinor);
    incomeDate = expectedPayoutDate(booking, existing);
    description = `${provider.label} expected payout · Room ${room}`;
    authoritative = `Provisional expected payout from Beds24 (${summary.expectedSource || "booking financials"}); it will be reconciled automatically when the actual channel-collected payment arrives.`;
  } else if (cancelled && existingExpected) {
    sourceStatus = "voided";
    incomeDate = validDate(existing.incomeDate) || expectedPayoutDate(booking, existing);
    description = `${provider.label} expected payout voided · Room ${room}`;
    authoritative = "The provisional expected payout was cleared because the booking is cancelled and no payable amount remains.";
  } else if (existingExpected) {
    // Preserve a provisional row across temporary provider omissions unless there is positive cancellation/refund evidence.
    sourceStatus = existing.sourceStatus || "expected_payout";
    grossMinor = Math.max(0, Number(existing.grossMinor) || 0);
    feesMinor = Math.max(0, Number(existing.feesMinor) || 0);
    netMinor = Math.max(0, Number(existing.netMinor) || 0);
    incomeDate = validDate(existing.incomeDate) || expectedPayoutDate(booking, existing);
    description = cleanText(existing.description, 240) || `${provider.label} expected payout · Room ${room}`;
    authoritative = "Previously imported provisional payout preserved because the current Beds24 response does not contain a newer financial state.";
  } else {
    return null;
  }

  const arrival = validDate(booking.arrival);
  const departure = validDate(booking.departure);
  const dates = arrival && departure ? `${arrival}–${departure}` : `${provider.label} stay`;
  const bookingPriceText = summary.bookingPriceMinor > 0 ? minorToAmount(summary.bookingPriceMinor, minorUnitDigits) : "not supplied";
  const commissionText = summary.feesMinor > 0 ? minorToAmount(summary.feesMinor, minorUnitDigits) : "0";
  const expectedText = summary.expectedPayoutMinor > 0 ? minorToAmount(summary.expectedPayoutMinor, minorUnitDigits) : "not supplied";
  const actualText = summary.actualPaymentMinor > 0 ? minorToAmount(summary.actualPaymentMinor, minorUnitDigits) : "not yet reported";
  const paymentItemText = summary.paymentItemIds.length ? summary.paymentItemIds.join(",") : "none yet";

  return {
    businessId: HOUSE_FINANCE_BUSINESS_ID,
    sourceSystem: "beds24",
    sourceExternalId: externalSourceId,
    sourceStatus,
    incomeDate,
    category: provider.category,
    description: `${description} · ${dates}`,
    grossMinor,
    feesMinor,
    netMinor,
    currency: cleanText(env.BEDS24_FINANCE_CURRENCY || env.EXPENSE_CURRENCY || "THB", 3).toUpperCase(),
    unit: `Room ${room}`,
    paymentMethod: hasActual || existingPaid ? "Bank transfer" : "Expected OTA payout",
    reference: bookingReference(booking, provider.key),
    notes: cleanText(`Auto-synced from Beds24 booking ${String(booking.id)}. ${authoritative} Beds24 booking value: ${bookingPriceText}; commission: ${commissionText}; expected payout: ${expectedText}; actual payment: ${actualText}; payment item(s): ${paymentItemText}.`, 500),
    syncedAt: now.toISOString()
  };
}

async function fetchProviderBookings(env, store, providerKey, from, to) {
  const provider = providerDefinition(providerKey);
  if (!provider?.implemented) return [];
  const query = {
    channel: provider.channelValues[0],
    departureFrom: shiftedDateOnly(from, -PROVIDER_FETCH_MARGIN_DAYS),
    arrivalTo: shiftedDateOnly(to, PROVIDER_FETCH_MARGIN_DAYS),
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

function rangeValid(from, to) {
  return Boolean(validDate(from) && validDate(to) && daysBetweenInclusive(from, to) <= MAX_IMPORT_RANGE_DAYS);
}

export async function reconcileBeds24FinanceRange(env, options = {}) {
  const providerKey = normalizeProviderKey(options.provider || "airbnb");
  const provider = providerDefinition(providerKey);
  if (!provider?.implemented) return { ok: false, error: "finance_provider_not_implemented", provider: providerKey };
  const configuration = beds24FinanceSyncConfiguration(env);
  if (!options.force && !beds24FinanceSyncEnabled(env)) return { ok: true, ignored: "finance_sync_disabled", provider: providerKey };
  if (!configuration.historicalImportReady) return { ok: false, error: "beds24_finance_sync_not_ready", configuration };

  const now = options.now instanceof Date ? options.now : new Date();
  const today = bangkokDateOnly(now);
  const from = validDate(options.from) || shiftedDateOnly(today, -configuration.lookbackDays);
  const to = validDate(options.to) || today;
  if (!rangeValid(from, to)) return { ok: false, error: "invalid_finance_import_range", maxDays: MAX_IMPORT_RANGE_DAYS };

  const store = options.store || env.CONCIERGE_STORE?.getByName?.("the-house-concierge-global");
  if (!store || typeof store.upsertProviderIncome !== "function") return { ok: false, error: "finance_store_unavailable" };

  const bookings = await fetchProviderBookings(env, store, providerKey, from, to);
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let refunded = 0;
  let expected = 0;
  let paid = 0;
  let reconciled = 0;
  let voided = 0;
  let outsideRange = 0;

  for (const booking of bookings) {
    const externalSourceId = bookingExternalSourceId(booking, providerKey);
    if (!externalSourceId) { skipped += 1; continue; }
    const existing = typeof store.getProviderIncome === "function"
      ? await store.getProviderIncome(HOUSE_FINANCE_BUSINESS_ID, "beds24", externalSourceId)
      : null;
    const record = beds24ProviderIncomeRecord(booking, env, existing, now, providerKey);
    if (!record) { skipped += 1; continue; }
    if (record.incomeDate < from || record.incomeDate > to) { outsideRange += 1; continue; }
    const previousSourceStatus = existing?.sourceStatus || "";
    const result = await store.upsertProviderIncome(record);
    if (record.sourceStatus === "refunded") refunded += 1;
    if (sourceStatusStarts(record.sourceStatus, "expected")) expected += 1;
    if (sourceStatusStarts(record.sourceStatus, "paid")) paid += 1;
    if (record.sourceStatus === "voided") voided += 1;
    if (result?.updated && sourceStatusStarts(previousSourceStatus, "expected") && sourceStatusStarts(record.sourceStatus, "paid")) reconciled += 1;
    if (result?.created) created += 1;
    else if (result?.updated) updated += 1;
    else unchanged += 1;
  }

  const result = {
    ok: true,
    provider: providerKey,
    providerLabel: provider.label,
    from,
    to,
    scanned: bookings.length,
    imported: created + updated + unchanged,
    created,
    updated,
    unchanged,
    skipped,
    outsideRange,
    refunded,
    expected,
    paid,
    reconciled,
    voided,
    completedAt: now.toISOString()
  };
  if (typeof store.setMessagingProviderState === "function") {
    await store.setMessagingProviderState(`beds24-finance-sync:${providerKey}`, result, new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()).catch(() => {});
    await store.setMessagingProviderState("beds24-finance-sync", result, new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()).catch(() => {});
  }
  return result;
}

export async function reconcileBeds24Finance(env, options = {}) {
  const configuration = beds24FinanceSyncConfiguration(env);
  const now = options.now instanceof Date ? options.now : new Date();
  const today = bangkokDateOnly(now);
  return reconcileBeds24FinanceRange(env, {
    ...options,
    provider: options.provider || "airbnb",
    from: options.from || shiftedDateOnly(today, -configuration.lookbackDays),
    to: options.to || today,
    force: options.force === true,
    now
  });
}
