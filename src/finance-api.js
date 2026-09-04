import { expenseConfiguration } from "./expense-api.js";
import { BAMBOO_FINANCE_BUSINESS_ID, BAMBOO_INCOME_CATEGORIES, HOUSE_FINANCE_BUSINESS_ID, resolveFinanceBusinessId } from "./finance-businesses.js";

const INCOME_ID_PATTERN = /^inc_[A-Za-z0-9-]{20,80}$/;
const DEFAULT_INCOME_CATEGORIES = [
  "Airbnb", "Direct booking", "Stay extension", "Other accommodation", "Other income"
];

function cleanText(value, maximum = 500) {
  return String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maximum);
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function validMonth(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

function amountToMinorUnits(value, minorUnitDigits = 2, allowZero = false) {
  const numeric = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0 || (!allowZero && numeric <= 0) || numeric > 100000000) return allowZero && numeric === 0 ? 0 : -1;
  const factor = 10 ** Math.max(0, Math.min(3, Number(minorUnitDigits) || 0));
  return Math.round(numeric * factor);
}

function minorUnitsToAmount(value, minorUnitDigits = 2) {
  const factor = 10 ** Math.max(0, Math.min(3, Number(minorUnitDigits) || 0));
  return Math.round(Number(value || 0)) / factor;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      ...extraHeaders
    }
  });
}

function incomeConfiguration(env, businessId = HOUSE_FINANCE_BUSINESS_ID) {
  const base = expenseConfiguration(env, businessId);
  const fallback = base.businessId === BAMBOO_FINANCE_BUSINESS_ID ? BAMBOO_INCOME_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
  const envValue = base.businessId === BAMBOO_FINANCE_BUSINESS_ID ? env.BAMBOO_INCOME_CATEGORIES : env.INCOME_CATEGORIES;
  let categories = [...fallback];
  try {
    const parsed = JSON.parse(String(envValue || "[]"));
    if (Array.isArray(parsed)) {
      const cleaned = [...new Set(parsed.map((item) => cleanText(item, 40)).filter(Boolean))].slice(0, 30);
      if (cleaned.length >= 2) categories = cleaned;
    }
  } catch (_error) {
    categories = [...fallback];
  }
  return { ...base, categories };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function cleanLocation(value) {
  return cleanText(value, 80);
}

function financeCsv(expenses, income, configuration) {
  const digits = configuration.minorUnitDigits;
  const includeCreatorRole = configuration.businessId === BAMBOO_FINANCE_BUSINESS_ID;
  const header = [
    "Type", "Date", "Category / source", "Description",
    `Gross income (${configuration.currency})`, `Fees (${configuration.currency})`, `Net income (${configuration.currency})`,
    `Expense (${configuration.currency})`, `Operating effect (${configuration.currency})`,
    "Vendor / reference", "Payment method", configuration.locationLabel || "Room / area", "Notes", "Receipt"
  ];
  if (includeCreatorRole) header.push("Entered by");
  const rows = [header];
  income.forEach((item) => {
    const row = [
      "Income", item.incomeDate, item.category, item.description,
      minorUnitsToAmount(item.grossMinor, digits).toFixed(digits),
      minorUnitsToAmount(item.feesMinor, digits).toFixed(digits),
      minorUnitsToAmount(item.netMinor, digits).toFixed(digits),
      "",
      minorUnitsToAmount(item.netMinor, digits).toFixed(digits),
      item.reference, item.paymentMethod, item.unit, item.notes, ""
    ];
    if (includeCreatorRole) row.push(item.createdByRole === "staff" ? "Staff" : "Owner");
    rows.push(row);
  });
  expenses.forEach((item) => {
    const row = [
      "Expense", item.expenseDate, item.category, item.description,
      "", "", "",
      minorUnitsToAmount(item.amountMinor, digits).toFixed(digits),
      (-minorUnitsToAmount(item.amountMinor, digits)).toFixed(digits),
      item.vendor, item.paymentMethod, item.roomArea, item.notes, item.hasReceipt ? "Yes" : "No"
    ];
    if (includeCreatorRole) row.push(item.createdByRole === "staff" ? "Staff" : "Owner");
    rows.push(row);
  });
  rows.splice(1, rows.length - 1, ...rows.slice(1).sort((a, b) => String(b[1]).localeCompare(String(a[1]))));
  return `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}`;
}

function summarizeFinance(expenses, income, configuration) {
  const expenseCategoryMinor = {};
  const incomeCategoryMinor = {};
  const incomePaymentMethodMinor = {};
  const locationMinor = {};
  let expensesMinor = 0;
  let grossIncomeMinor = 0;
  let feesMinor = 0;
  let netIncomeMinor = 0;

  const location = (name) => {
    const key = cleanLocation(name) || "Unassigned";
    locationMinor[key] ||= { incomeNetMinor: 0, expenseMinor: 0 };
    return locationMinor[key];
  };

  expenses.forEach((item) => {
    const value = Number(item.amountMinor) || 0;
    expensesMinor += value;
    expenseCategoryMinor[item.category] = (expenseCategoryMinor[item.category] || 0) + value;
    location(item.roomArea).expenseMinor += value;
  });
  income.forEach((item) => {
    const gross = Number(item.grossMinor) || 0;
    const fees = Number(item.feesMinor) || 0;
    const net = Number(item.netMinor) || 0;
    grossIncomeMinor += gross;
    feesMinor += fees;
    netIncomeMinor += net;
    incomeCategoryMinor[item.category] = (incomeCategoryMinor[item.category] || 0) + net;
    const paymentKey = cleanText(item.paymentMethod, 40) || "Not specified";
    incomePaymentMethodMinor[paymentKey] = (incomePaymentMethodMinor[paymentKey] || 0) + net;
    location(item.unit).incomeNetMinor += net;
  });

  const convertMap = (source) => Object.fromEntries(Object.entries(source).map(([key, value]) => [key, minorUnitsToAmount(value, configuration.minorUnitDigits)]));
  const locationTotals = Object.fromEntries(Object.entries(locationMinor).map(([key, value]) => [key, {
    netIncome: minorUnitsToAmount(value.incomeNetMinor, configuration.minorUnitDigits),
    expenses: minorUnitsToAmount(value.expenseMinor, configuration.minorUnitDigits),
    operatingResult: minorUnitsToAmount(value.incomeNetMinor - value.expenseMinor, configuration.minorUnitDigits)
  }]));

  return {
    grossIncome: minorUnitsToAmount(grossIncomeMinor, configuration.minorUnitDigits),
    fees: minorUnitsToAmount(feesMinor, configuration.minorUnitDigits),
    netIncome: minorUnitsToAmount(netIncomeMinor, configuration.minorUnitDigits),
    expenses: minorUnitsToAmount(expensesMinor, configuration.minorUnitDigits),
    operatingResult: minorUnitsToAmount(netIncomeMinor - expensesMinor, configuration.minorUnitDigits),
    incomeEntries: income.length,
    expenseEntries: expenses.length,
    entries: income.length + expenses.length,
    incomeCategories: convertMap(incomeCategoryMinor),
    incomePaymentMethods: convertMap(incomePaymentMethodMinor),
    expenseCategories: convertMap(expenseCategoryMinor),
    locations: locationTotals
  };
}

function scopedBusinessId(value, access = {}, fallback = HOUSE_FINANCE_BUSINESS_ID) {
  const businessId = resolveFinanceBusinessId(value || fallback);
  if (!businessId) return { error: "invalid_business", status: 400 };
  if (access?.businessId && businessId !== access.businessId) return { error: "forbidden", status: 403 };
  return { businessId };
}

function requestBusinessScope(request, access = {}, fallback = HOUSE_FINANCE_BUSINESS_ID) {
  const value = new URL(request.url).searchParams.get("business") || fallback;
  return scopedBusinessId(value, access, fallback);
}

function ownerOnly(access = {}) {
  return access?.role === "staff" ? json({ error: "owner_access_required" }, 403) : null;
}

export async function handleFinanceAdminRequest(request, env, path, store, actorHash = "", access = {}) {
  if (path === "/api/concierge/admin/finance/configuration") {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
    const scope = requestBusinessScope(request, access);
    if (scope.error) return json({ error: scope.error }, scope.status);
    const expenseConfig = expenseConfiguration(env, scope.businessId);
    const incomeConfig = incomeConfiguration(env, scope.businessId);
    return json({
      ok: true,
      role: access?.role === "staff" ? "staff" : "owner",
      configuration: {
        ...incomeConfig,
        incomeCategories: [...incomeConfig.categories],
        expenseCategories: [...expenseConfig.categories],
        paymentMethods: [...expenseConfig.paymentMethods]
      }
    });
  }

  if (path === "/api/concierge/admin/finance/export.csv") {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
    const denied = ownerOnly(access);
    if (denied) return denied;
    const month = new URL(request.url).searchParams.get("month") || "";
    if (!validMonth(month)) return json({ error: "invalid_month" }, 400);
    const scope = requestBusinessScope(request, access);
    if (scope.error) return json({ error: scope.error }, scope.status);
    const businessId = scope.businessId;
    const [expenses, income] = await Promise.all([
      store.listExpenses?.(month, businessId) || [],
      store.listIncome?.(month, businessId) || []
    ]);
    const configuration = incomeConfiguration(env, businessId);
    return new Response(financeCsv(expenses, income, configuration), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${configuration.businessId === HOUSE_FINANCE_BUSINESS_ID ? `finance-${month}.csv` : `finance-${configuration.businessId}-${month}.csv`}"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      }
    });
  }

  if (path === "/api/concierge/admin/income/delete") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const denied = ownerOnly(access);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || "");
    const scope = scopedBusinessId(body.business || HOUSE_FINANCE_BUSINESS_ID, access);
    if (scope.error) return json({ error: scope.error }, scope.status);
    const businessId = scope.businessId;
    if (!INCOME_ID_PATTERN.test(id) || body.confirmation !== "DELETE INCOME") return json({ error: "confirmation_required" }, 400);
    const outcome = await store.deleteIncome?.(id, actorHash, new Date().toISOString(), businessId);
    return outcome?.ok ? json(outcome) : json({ error: outcome?.error || "not_found" }, 404);
  }

  if (path === "/api/concierge/admin/income") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const body = await request.json().catch(() => ({}));
    const scope = scopedBusinessId(body.business || HOUSE_FINANCE_BUSINESS_ID, access);
    if (scope.error) return json({ error: scope.error }, scope.status);
    const businessId = scope.businessId;
    const configuration = incomeConfiguration(env, businessId);
    const incomeDate = cleanText(body.date, 10);
    const grossMinor = amountToMinorUnits(body.gross, configuration.minorUnitDigits);
    const feesMinor = amountToMinorUnits(body.fees ?? 0, configuration.minorUnitDigits, true);
    const category = cleanText(body.category, 40);
    const description = cleanText(body.description, 240);
    const unit = cleanLocation(body.unit);
    const paymentMethod = cleanText(body.paymentMethod, 40);
    const reference = cleanText(body.reference, 120);
    const notes = cleanText(body.notes, 500);
    const confirmDuplicate = Boolean(body.confirmDuplicate);
    if (!validDate(incomeDate) || grossMinor <= 0 || feesMinor < 0 || feesMinor > grossMinor || !configuration.categories.includes(category) || description.length < 2 || !configuration.paymentMethods.includes(paymentMethod)) {
      return json({ error: "invalid_income" }, 400);
    }
    const netMinor = grossMinor - feesMinor;
    const duplicates = await store.findIncomeDuplicates?.(incomeDate, grossMinor, unit, reference, configuration.currency, businessId) || [];
    if (duplicates.length && !confirmDuplicate) {
      if (access?.role === "staff") return json({ error: "possible_duplicate" }, 409);
      return json({
        error: "possible_duplicate",
        duplicates: duplicates.map((item) => ({
          id: item.id,
          incomeDate: item.incomeDate,
          gross: minorUnitsToAmount(item.grossMinor, configuration.minorUnitDigits),
          net: minorUnitsToAmount(item.netMinor, configuration.minorUnitDigits),
          category: item.category,
          unit: item.unit,
          reference: item.reference,
          description: item.description
        }))
      }, 409);
    }
    const id = `inc_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    try {
      await store.createIncome?.({
        id, businessId, incomeDate, category, description, grossMinor, feesMinor, netMinor,
        currency: configuration.currency, unit, paymentMethod, reference, notes,
        actorHash, createdByRole: access?.role === "staff" ? "staff" : "owner", createdAt
      });
    } catch (_error) {
      return json({ error: "income_save_failed" }, 503);
    }
    return json({ ok: true, id, net: minorUnitsToAmount(netMinor, configuration.minorUnitDigits), possibleDuplicateConfirmed: Boolean(duplicates.length && confirmDuplicate) }, 201);
  }

  if (path !== "/api/concierge/admin/finance") return null;
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
  const denied = ownerOnly(access);
  if (denied) return denied;
  const month = new URL(request.url).searchParams.get("month") || "";
  if (!validMonth(month)) return json({ error: "invalid_month" }, 400);
  const scope = requestBusinessScope(request, access);
  if (scope.error) return json({ error: scope.error }, scope.status);
  const businessId = scope.businessId;
  const [expenses, income] = await Promise.all([
    store.listExpenses?.(month, businessId) || [],
    store.listIncome?.(month, businessId) || []
  ]);
  const configuration = incomeConfiguration(env, businessId);
  return json({
    ok: true,
    month,
    configuration,
    totals: summarizeFinance(expenses, income, configuration),
    income: income.map((item) => ({
      ...item,
      gross: minorUnitsToAmount(item.grossMinor, configuration.minorUnitDigits),
      fees: minorUnitsToAmount(item.feesMinor, configuration.minorUnitDigits),
      net: minorUnitsToAmount(item.netMinor, configuration.minorUnitDigits)
    }))
  });
}

export { DEFAULT_INCOME_CATEGORIES, incomeConfiguration, summarizeFinance };
