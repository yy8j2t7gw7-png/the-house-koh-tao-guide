export const HOUSE_FINANCE_BUSINESS_ID = "the-house-koh-tao";
export const BAMBOO_FINANCE_BUSINESS_ID = "bamboo-beach-bar";

const BAMBOO_EXPENSE_CATEGORIES = [
  "Beverage stock",
  "Food & mixers",
  "Salary",
  "Entertainment",
  "Equipment",
  "Repairs & maintenance",
  "Utilities",
  "Rent",
  "Licences & permits",
  "Marketing",
  "Security",
  "Transport",
  "Cleaning",
  "Other"
];

const BAMBOO_INCOME_CATEGORIES = [
  "Bar sales",
  "Events",
  "Food sales",
  "Other income"
];

const HOUSE_PAYMENT_METHODS = ["", "Cash", "Card", "Bank transfer", "Other"];
const BAMBOO_PAYMENT_METHODS = ["", "Cash", "QR code", "Card", "Bank transfer", "Other"];

function cleanText(value, maximum = 120) {
  return String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maximum);
}

function configuredList(rawValue, fallback) {
  try {
    const parsed = JSON.parse(String(rawValue || "[]"));
    if (Array.isArray(parsed)) {
      const cleaned = [...new Set(parsed.map((item) => cleanText(item, 40)).filter(Boolean))].slice(0, 30);
      if (cleaned.length >= 2) return cleaned;
    }
  } catch (_error) {
    // Fall back to the built-in business profile.
  }
  return [...fallback];
}

export function resolveFinanceBusinessId(value) {
  const candidate = cleanText(value, 80) || HOUSE_FINANCE_BUSINESS_ID;
  if (candidate === HOUSE_FINANCE_BUSINESS_ID || candidate === BAMBOO_FINANCE_BUSINESS_ID) return candidate;
  return null;
}

export function financeBusinessProfile(env, value) {
  const id = resolveFinanceBusinessId(value);
  if (!id) return null;
  if (id === BAMBOO_FINANCE_BUSINESS_ID) {
    return {
      id,
      name: "Bamboo Beach Bar",
      shortName: "Bamboo",
      businessType: "bar",
      currency: cleanText(env.BAMBOO_FINANCE_CURRENCY || env.EXPENSE_CURRENCY || "THB", 12).toUpperCase(),
      timeZone: cleanText(env.BAMBOO_TIME_ZONE || env.PROPERTY_TIME_ZONE || "Asia/Bangkok", 80),
      expenseCategories: configuredList(env.BAMBOO_EXPENSE_CATEGORIES, BAMBOO_EXPENSE_CATEGORIES),
      incomeCategories: configuredList(env.BAMBOO_INCOME_CATEGORIES, BAMBOO_INCOME_CATEGORIES),
      paymentMethods: [...BAMBOO_PAYMENT_METHODS],
      locationLabel: "Area / department",
      incomeUnitLabel: "Area / revenue stream",
      locationExamples: ["Bar", "Beach area", "Storage", "Office", "Events"]
    };
  }
  return {
    id,
    name: "The House – Koh Tao",
    shortName: "The House",
    businessType: "guesthouse",
    currency: cleanText(env.EXPENSE_CURRENCY || "THB", 12).toUpperCase(),
    timeZone: cleanText(env.PROPERTY_TIME_ZONE || "Asia/Bangkok", 80),
    expenseCategories: null,
    incomeCategories: null,
    paymentMethods: [...HOUSE_PAYMENT_METHODS],
    locationLabel: "Room / area",
    incomeUnitLabel: "Room / unit",
    locationExamples: ["Room 1", "Room 2", "Room 3", "Room 4", "Room 5", "Room 6", "Room 7", "Room 8", "Room 9", "Room 10", "Room 11", "Office"]
  };
}

export { BAMBOO_EXPENSE_CATEGORIES, BAMBOO_INCOME_CATEGORIES, BAMBOO_PAYMENT_METHODS, HOUSE_PAYMENT_METHODS };
