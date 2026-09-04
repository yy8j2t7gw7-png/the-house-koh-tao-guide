import { financeBusinessProfile, HOUSE_FINANCE_BUSINESS_ID, resolveFinanceBusinessId } from "./finance-businesses.js";
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const MIN_RECEIPT_BYTES = 32;
const EXPENSE_ID_PATTERN = /^exp_[A-Za-z0-9-]{20,80}$/;
const DEFAULT_EXPENSE_CATEGORIES = [
  "Maintenance", "Cleaning", "Laundry", "Bedroom", "Equipment",
  "Utilities", "Legal Fees", "Salary", "Other"
];

function expenseConfiguration(env, businessId = HOUSE_FINANCE_BUSINESS_ID) {
  const profile = financeBusinessProfile(env, businessId) || financeBusinessProfile(env, HOUSE_FINANCE_BUSINESS_ID);
  const currencyValue = String(profile?.currency || env.EXPENSE_CURRENCY || "THB").trim().toUpperCase();
  const currency = /^[A-Z]{3}$/.test(currencyValue) ? currencyValue : "THB";
  const timeZoneValue = String(profile?.timeZone || env.PROPERTY_TIME_ZONE || "Asia/Bangkok").trim();
  let timeZone = "Asia/Bangkok";
  try {
    new Intl.DateTimeFormat("en", { timeZone: timeZoneValue }).format(new Date());
    timeZone = timeZoneValue;
  } catch (_error) {
    timeZone = "Asia/Bangkok";
  }
  let categories = Array.isArray(profile?.expenseCategories) ? [...profile.expenseCategories] : DEFAULT_EXPENSE_CATEGORIES;
  if (!profile?.expenseCategories) {
    try {
      const parsed = JSON.parse(String(env.EXPENSE_CATEGORIES || "[]"));
      if (Array.isArray(parsed)) {
        const cleaned = [...new Set(parsed.map((item) => cleanText(item, 40)).filter(Boolean))].slice(0, 30);
        if (cleaned.length >= 2) categories = cleaned;
      }
    } catch (_error) {
      categories = DEFAULT_EXPENSE_CATEGORIES;
    }
  }
  let minorUnitDigits = 2;
  try {
    minorUnitDigits = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  } catch (_error) {
    minorUnitDigits = 2;
  }
  minorUnitDigits = Math.max(0, Math.min(3, Number(minorUnitDigits) || 0));
  return {
    businessId: profile?.id || HOUSE_FINANCE_BUSINESS_ID,
    businessName: profile?.name || "The House – Koh Tao",
    businessType: profile?.businessType || "guesthouse",
    locationLabel: profile?.locationLabel || "Room / area",
    incomeUnitLabel: profile?.incomeUnitLabel || "Room / unit",
    locationExamples: profile?.locationExamples || [],
    paymentMethods: Array.isArray(profile?.paymentMethods) ? [...profile.paymentMethods] : ["", "Cash", "Card", "Bank transfer", "Other"],
    currency, timeZone, categories, minorUnitDigits, maxReceiptMb: MAX_RECEIPT_BYTES / (1024 * 1024)
  };
}

function extractionSchema(categories, paymentMethods) {
  return {
  type: "object",
  additionalProperties: false,
  required: ["date", "amount", "vendor", "description", "category", "paymentMethod", "roomArea", "confidence", "notes"],
  properties: {
    date: { type: "string", description: "Expense date as YYYY-MM-DD, or empty string if unreadable." },
    amount: { type: "number", minimum: 0, maximum: 100000000 },
    vendor: { type: "string", maxLength: 160 },
    description: { type: "string", maxLength: 240 },
    category: { type: "string", enum: categories },
    paymentMethod: { type: "string", enum: paymentMethods },
    roomArea: { type: "string", maxLength: 80 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    notes: { type: "string", maxLength: 240 }
  }
  };
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

function cleanText(value, maximum = 500) {
  return String(value || "").trim().replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").slice(0, maximum);
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function validMonth(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

function amountToMinorUnits(value, minorUnitDigits = 2) {
  const numeric = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100000000) return 0;
  const factor = 10 ** Math.max(0, Math.min(3, Number(minorUnitDigits) || 0));
  return Math.round(numeric * factor);
}

function minorUnitsToAmount(value, minorUnitDigits = 2) {
  const factor = 10 ** Math.max(0, Math.min(3, Number(minorUnitDigits) || 0));
  return Math.round(Number(value || 0)) / factor;
}

function ascii(bytes, start, end) {
  return String.fromCharCode(...bytes.slice(start, end));
}

function detectReceipt(bytes) {
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === "%PDF-") {
    return { mediaType: "application/pdf", extension: "pdf", kind: "file" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mediaType: "image/jpeg", extension: "jpg", kind: "image" };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && bytes.slice(0, 8).every((value, index) => value === png[index])) {
    return { mediaType: "image/png", extension: "png", kind: "image" };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return { mediaType: "image/webp", extension: "webp", kind: "image" };
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) {
      return { mediaType: "image/heic", extension: "heic", kind: "file" };
    }
  }
  return null;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunk, bytes.length)));
  }
  return btoa(binary);
}

function extractOutputText(body) {
  for (const item of body?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

function expenseBucket(env) {
  // Future white-label deployments can bind a dedicated bucket without changing module logic.
  return env.EXPENSE_RECEIPTS || env.PASSPORT_UPLOADS || null;
}

async function readReceiptFile(form) {
  const file = form.get("receipt");
  if (!file || typeof file.arrayBuffer !== "function" || Number(file.size) <= 0) return { file: null, bytes: null, detected: null };
  if (Number(file.size) > MAX_RECEIPT_BYTES) throw json({ error: "file_too_large" }, 413);
  if (Number(file.size) < MIN_RECEIPT_BYTES) throw json({ error: "invalid_file" }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectReceipt(bytes);
  if (!detected) throw json({ error: "unsupported_file_type" }, 415);
  return { file, bytes, detected };
}

async function analyzeReceipt(env, bytes, detected, businessId = HOUSE_FINANCE_BUSINESS_ID) {
  if (!env.OPENAI_API_KEY) return { ok: false, error: "expense_extraction_unavailable" };
  const configuration = expenseConfiguration(env, businessId);
  const base64 = bytesToBase64(bytes);
  const fileContent = detected.kind === "image"
    ? { type: "input_image", image_url: `data:${detected.mediaType};base64,${base64}`, detail: "high" }
    : { type: "input_file", filename: `receipt.${detected.extension}`, file_data: base64 };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.EXPENSE_EXTRACTION_MODEL || env.OPENAI_MODEL || "gpt-5.6",
      store: false,
      instructions: `Extract expense information from a receipt, invoice or bill for ${configuration.businessName}, a ${configuration.businessType} business.\n\nRULES\n- Never invent unreadable values.\n- amount must be the final total actually payable/paid in ${configuration.currency} when clearly shown, not a subtotal. If no reliable ${configuration.currency} total is visible, use 0 and explain briefly in notes.\n- date must be YYYY-MM-DD or empty.\n- Choose exactly one supplied category. Use Other when it is available and the category is genuinely uncertain; otherwise choose the closest supplied category.\n- roomArea is optional free text. Populate it only when the document explicitly identifies a room or property area; otherwise return an empty string.\n- Payment method must be returned only when visible or unambiguous; otherwise empty.\n- Keep description short and accounting-friendly.\n- This output is only a draft. The owner will confirm or correct every field before saving.`,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "Extract a draft expense record from this receipt. Return only the structured result." },
          fileContent
        ]
      }],
      reasoning: { effort: "low" },
      max_output_tokens: 1200,
      text: {
        format: {
          type: "json_schema",
          name: "expense_receipt_draft",
          strict: true,
          schema: extractionSchema(configuration.categories, configuration.paymentMethods)
        }
      }
    })
  });
  if (!response.ok) return { ok: false, error: "expense_extraction_failed", status: response.status };
  const text = extractOutputText(await response.json());
  try {
    const draft = JSON.parse(text);
    return {
      ok: true,
      draft: {
        date: validDate(draft.date) ? draft.date : "",
        amount: Number.isFinite(Number(draft.amount)) ? Number(draft.amount) : 0,
        vendor: cleanText(draft.vendor, 160),
        description: cleanText(draft.description, 240),
        category: configuration.categories.includes(draft.category) ? draft.category : (configuration.categories.includes("Other") ? "Other" : configuration.categories[0]),
        paymentMethod: configuration.paymentMethods.includes(draft.paymentMethod) ? draft.paymentMethod : "",
        roomArea: cleanText(draft.roomArea, 80),
        confidence: Math.max(0, Math.min(1, Number(draft.confidence) || 0)),
        notes: cleanText(draft.notes, 240)
      }
    };
  } catch (_error) {
    return { ok: false, error: "expense_extraction_failed" };
  }
}

function privateReceiptDownload(object, record) {
  const extension = record.receiptExtension || "file";
  return new Response(object.body, {
    headers: {
      "content-type": record.receiptMediaType || "application/octet-stream",
      "content-disposition": `attachment; filename="expense-${record.expenseDate}-${record.id}.${extension}"`,
      "cache-control": "no-store, max-age=0",
      "content-security-policy": "default-src 'none'; sandbox",
      "cross-origin-resource-policy": "same-origin",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY"
    }
  });
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function expenseCsv(records, configuration) {
  const currency = configuration.currency;
  const minorUnitDigits = configuration.minorUnitDigits;
  const rows = [["Date", "Category", "Description", `Amount (${currency})`, "Vendor", "Payment method", configuration.locationLabel || "Room / area", "Notes", "Receipt"]];
  records.forEach((item) => rows.push([
    item.expenseDate,
    item.category,
    item.description,
    minorUnitsToAmount(item.amountMinor, minorUnitDigits).toFixed(minorUnitDigits),
    item.vendor,
    item.paymentMethod,
    item.roomArea,
    item.notes,
    item.hasReceipt ? "Yes" : "No"
  ]));
  return `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}`;
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

export async function handleExpenseAdminRequest(request, env, path, store, actorHash = "", access = {}) {
  const downloadMatch = path.match(/^\/api\/concierge\/admin\/expense-files\/(exp_[A-Za-z0-9-]{20,80})$/);
  if (downloadMatch) {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
    const denied = ownerOnly(access);
    if (denied) return denied;
    const scope = requestBusinessScope(request, access);
    if (scope.error) return json({ error: scope.error }, scope.status);
    const businessId = scope.businessId;
    const record = await store.getExpense?.(downloadMatch[1], businessId);
    const bucket = expenseBucket(env);
    if (!record?.receiptObjectKey || !bucket?.get) return json({ error: "not_found" }, 404);
    const object = await bucket.get(record.receiptObjectKey);
    return object?.body ? privateReceiptDownload(object, record) : json({ error: "not_found" }, 404);
  }

  if (path === "/api/concierge/admin/expenses/analyze") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    let form;
    try { form = await request.formData(); } catch (_error) { return json({ error: "invalid_form" }, 400); }
    const scope = scopedBusinessId(form.get("business") || HOUSE_FINANCE_BUSINESS_ID, access);
    if (scope.error) return json({ error: scope.error }, scope.status);
    const businessId = scope.businessId;
    let receipt;
    try { receipt = await readReceiptFile(form); } catch (response) { return response instanceof Response ? response : json({ error: "invalid_file" }, 400); }
    if (!receipt.bytes || !receipt.detected) return json({ error: "receipt_required" }, 400);
    const result = await analyzeReceipt(env, receipt.bytes, receipt.detected, businessId);
    return result.ok ? json(result) : json(result, result.error === "expense_extraction_unavailable" ? 503 : 502);
  }

  if (path === "/api/concierge/admin/expenses/export.csv") {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
    const denied = ownerOnly(access);
    if (denied) return denied;
    const month = new URL(request.url).searchParams.get("month") || "";
    if (!validMonth(month)) return json({ error: "invalid_month" }, 400);
    const scope = requestBusinessScope(request, access);
    if (scope.error) return json({ error: scope.error }, scope.status);
    const businessId = scope.businessId;
    const records = await store.listExpenses?.(month, businessId) || [];
    const configuration = expenseConfiguration(env, businessId);
    return new Response(expenseCsv(records, configuration), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${configuration.businessId === HOUSE_FINANCE_BUSINESS_ID ? `expenses-${month}.csv` : `expenses-${configuration.businessId}-${month}.csv`}"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      }
    });
  }

  if (path === "/api/concierge/admin/expenses/delete") {
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    const denied = ownerOnly(access);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || "");
    const scope = scopedBusinessId(body.business || HOUSE_FINANCE_BUSINESS_ID, access);
    if (scope.error) return json({ error: scope.error }, scope.status);
    const businessId = scope.businessId;
    if (!EXPENSE_ID_PATTERN.test(id) || body.confirmation !== "DELETE EXPENSE") return json({ error: "confirmation_required" }, 400);
    const record = await store.getExpense?.(id, businessId);
    if (!record) return json({ error: "not_found" }, 404);
    const bucket = expenseBucket(env);
    if (record.receiptObjectKey && bucket?.delete) {
      try { await bucket.delete(record.receiptObjectKey); } catch (_error) { return json({ error: "storage_unavailable" }, 503); }
    }
    const outcome = await store.deleteExpense?.(id, actorHash, new Date().toISOString(), businessId);
    return outcome?.ok ? json(outcome) : json({ error: outcome?.error || "not_found" }, 404);
  }

  if (path !== "/api/concierge/admin/expenses") return null;

  if (request.method === "GET") {
    const denied = ownerOnly(access);
    if (denied) return denied;
    const month = new URL(request.url).searchParams.get("month") || "";
    if (!validMonth(month)) return json({ error: "invalid_month" }, 400);
    const scope = requestBusinessScope(request, access);
    if (scope.error) return json({ error: scope.error }, scope.status);
    const businessId = scope.businessId;
    const records = await store.listExpenses?.(month, businessId) || [];
    const configuration = expenseConfiguration(env, businessId);
    const categoryTotals = {};
    let totalMinor = 0;
    let receipts = 0;
    records.forEach((item) => {
      totalMinor += Number(item.amountMinor) || 0;
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + (Number(item.amountMinor) || 0);
      if (item.hasReceipt) receipts += 1;
    });
    return json({
      ok: true,
      month,
      configuration,
      totals: {
        amount: minorUnitsToAmount(totalMinor, configuration.minorUnitDigits),
        entries: records.length,
        receipts,
        categories: Object.fromEntries(Object.entries(categoryTotals).map(([key, value]) => [key, minorUnitsToAmount(value, configuration.minorUnitDigits)]))
      },
      records: records.map((item) => ({ ...item, amount: minorUnitsToAmount(item.amountMinor, configuration.minorUnitDigits), receiptObjectKey: undefined }))
    });
  }

  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "GET, POST" });
  let form;
  try { form = await request.formData(); } catch (_error) { return json({ error: "invalid_form" }, 400); }

  const scope = scopedBusinessId(form.get("business") || HOUSE_FINANCE_BUSINESS_ID, access);
  if (scope.error) return json({ error: scope.error }, scope.status);
  const businessId = scope.businessId;
  const configuration = expenseConfiguration(env, businessId);
  const expenseDate = cleanText(form.get("date"), 10);
  const amountMinor = amountToMinorUnits(form.get("amount"), configuration.minorUnitDigits);
  const category = cleanText(form.get("category"), 40);
  const description = cleanText(form.get("description"), 240);
  const vendor = cleanText(form.get("vendor"), 160);
  const paymentMethod = cleanText(form.get("paymentMethod"), 40);
  const roomArea = cleanText(form.get("roomArea"), 80);
  const notes = cleanText(form.get("notes"), 500);
  const confirmDuplicate = String(form.get("confirmDuplicate") || "") === "true";
  if (!validDate(expenseDate) || !amountMinor || !configuration.categories.includes(category) || description.length < 2) {
    return json({ error: "invalid_expense" }, 400);
  }
  if (!configuration.paymentMethods.includes(paymentMethod)) return json({ error: "invalid_expense" }, 400);

  const duplicates = await store.findExpenseDuplicates?.(expenseDate, amountMinor, vendor, configuration.currency, businessId) || [];
  if (duplicates.length && !confirmDuplicate) {
    if (access?.role === "staff") return json({ error: "possible_duplicate" }, 409);
    return json({
      error: "possible_duplicate",
      duplicates: duplicates.map((item) => ({
        id: item.id,
        expenseDate: item.expenseDate,
        amount: minorUnitsToAmount(item.amountMinor, configuration.minorUnitDigits),
        currency: item.currency || configuration.currency,
        vendor: item.vendor,
        description: item.description,
        category: item.category
      }))
    }, 409);
  }

  let receipt;
  try { receipt = await readReceiptFile(form); } catch (response) { return response instanceof Response ? response : json({ error: "invalid_file" }, 400); }
  const id = `exp_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  let receiptObjectKey = "";
  if (receipt.bytes) {
    const bucket = expenseBucket(env);
    if (!bucket?.put) return json({ error: "receipt_storage_unavailable" }, 503);
    const prefix = businessId === HOUSE_FINANCE_BUSINESS_ID ? "expenses" : `finance/${businessId}/expenses`;
    receiptObjectKey = `${prefix}/${expenseDate.slice(0, 7)}/${crypto.randomUUID()}.${receipt.detected.extension}`;
    try {
      await bucket.put(receiptObjectKey, receipt.bytes, {
        httpMetadata: { contentType: receipt.detected.mediaType },
        customMetadata: { expenseId: id, expenseDate, businessId }
      });
    } catch (_error) {
      return json({ error: "receipt_storage_unavailable" }, 503);
    }
  }

  try {
    await store.createExpense?.({
      id,
      businessId,
      expenseDate,
      category,
      description,
      amountMinor,
      currency: configuration.currency,
      vendor,
      paymentMethod,
      roomArea,
      notes,
      receiptObjectKey,
      receiptMediaType: receipt.detected?.mediaType || "",
      receiptExtension: receipt.detected?.extension || "",
      receiptSizeBytes: receipt.bytes?.byteLength || 0,
      actorHash,
      createdByRole: access?.role === "staff" ? "staff" : "owner",
      createdAt
    });
  } catch (_error) {
    if (receiptObjectKey) await expenseBucket(env)?.delete?.(receiptObjectKey).catch(() => {});
    return json({ error: "expense_save_failed" }, 503);
  }
  return json({ ok: true, id, possibleDuplicateConfirmed: Boolean(duplicates.length && confirmDuplicate) }, 201);
}

export { DEFAULT_EXPENSE_CATEGORIES, expenseConfiguration };
