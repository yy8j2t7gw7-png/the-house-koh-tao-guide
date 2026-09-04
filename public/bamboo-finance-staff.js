(function () {
  const BUSINESS_ID = "bamboo-beach-bar";
  const tokenKey = "bambooFinanceStaffToken";
  const login = document.getElementById("staffLogin");
  const loginForm = document.getElementById("staffLoginForm");
  const tokenInput = document.getElementById("staffToken");
  const loginStatus = document.getElementById("loginStatus");
  const workspace = document.getElementById("staffWorkspace");
  const logout = document.getElementById("staffLogout");
  const incomeForm = document.getElementById("incomeForm");
  const incomeStatus = document.getElementById("incomeStatus");
  const expenseForm = document.getElementById("expenseForm");
  const expenseStatus = document.getElementById("expenseStatus");
  const expenseReceipt = document.getElementById("expenseReceipt");
  const expenseAnalyze = document.getElementById("expenseAnalyze");
  const expenseClearReceipt = document.getElementById("expenseClearReceipt");
  const expenseAnalysisStatus = document.getElementById("expenseAnalysisStatus");
  const financeLocationOptions = document.getElementById("financeLocationOptions");

  let token = "";
  let currency = "THB";
  let timeZone = "Asia/Bangkok";
  let minorUnitDigits = 2;
  let incomeCategories = [];
  let expenseCategories = [];
  let paymentMethods = ["", "Cash", "QR code", "Card", "Bank transfer", "Other"];

  function authorizedFetch(path, options = {}) {
    return fetch(path, {
      ...options,
      headers: { ...(options.headers || {}), authorization: `Bearer ${token}` }
    });
  }

  async function api(path, options = {}) {
    const response = await authorizedFetch(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  async function apiForm(path, form) {
    const response = await authorizedFetch(path, { method: "POST", body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function currentDate() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  function formatAmount(value) {
    const amount = Number(value) || 0;
    try {
      return new Intl.NumberFormat("en-TH", { style: "currency", currency, minimumFractionDigits: minorUnitDigits, maximumFractionDigits: minorUnitDigits }).format(amount);
    } catch (_error) {
      return `${currency} ${amount.toFixed(minorUnitDigits)}`;
    }
  }

  function populateSelect(id, values, placeholder) {
    const select = document.getElementById(id);
    const current = select.value;
    select.replaceChildren();
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    select.appendChild(first);
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    if (values.includes(current)) select.value = current;
  }

  function populatePaymentMethods() {
    ["incomePaymentMethod", "expensePaymentMethod"].forEach((id) => {
      const select = document.getElementById(id);
      const required = id === "incomePaymentMethod";
      const current = select.value;
      select.replaceChildren();
      paymentMethods.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value || (required ? "Choose payment method" : "Not specified");
        select.appendChild(option);
      });
      if (paymentMethods.includes(current)) select.value = current;
    });
  }

  function applyConfiguration(configuration = {}) {
    if (/^[A-Z]{3}$/.test(String(configuration.currency || ""))) currency = configuration.currency;
    if (configuration.timeZone) timeZone = String(configuration.timeZone);
    if (Number.isFinite(Number(configuration.minorUnitDigits))) minorUnitDigits = Math.max(0, Math.min(3, Number(configuration.minorUnitDigits) || 0));
    incomeCategories = Array.isArray(configuration.incomeCategories) ? configuration.incomeCategories : [];
    expenseCategories = Array.isArray(configuration.expenseCategories) ? configuration.expenseCategories : [];
    paymentMethods = Array.isArray(configuration.paymentMethods) && configuration.paymentMethods.length ? configuration.paymentMethods : paymentMethods;
    populateSelect("incomeCategory", incomeCategories, "Select source");
    populateSelect("expenseCategory", expenseCategories, "Select category");
    populatePaymentMethods();
    if (incomeCategories.includes("Bar sales")) document.getElementById("incomeCategory").value = "Bar sales";
    const step = minorUnitDigits > 0 ? 1 / (10 ** minorUnitDigits) : 1;
    ["incomeGross", "incomeFees", "expenseAmount"].forEach((id) => { document.getElementById(id).step = String(step); });
    document.getElementById("incomeGross").min = String(step);
    document.getElementById("expenseAmount").min = String(step);
    document.getElementById("incomeGrossLabel").textContent = `Gross income (${currency})`;
    document.getElementById("incomeFeesLabel").textContent = `Fees / commission (${currency})`;
    document.getElementById("expenseAmountLabel").textContent = `Amount (${currency})`;
    if (configuration.incomeUnitLabel) document.getElementById("incomeUnitLabel").textContent = configuration.incomeUnitLabel;
    if (configuration.locationLabel) document.getElementById("expenseLocationLabel").textContent = configuration.locationLabel;
    financeLocationOptions.replaceChildren(...(configuration.locationExamples || []).map((value) => {
      const option = document.createElement("option");
      option.value = value;
      return option;
    }));
  }

  function updateNet() {
    const gross = Math.max(0, Number(document.getElementById("incomeGross").value) || 0);
    const fees = Math.max(0, Number(document.getElementById("incomeFees").value) || 0);
    document.getElementById("incomeNet").value = formatAmount(Math.max(0, gross - fees));
  }

  function resetIncome() {
    incomeForm.reset();
    document.getElementById("incomeDate").value = currentDate();
    document.getElementById("incomeFees").value = "0";
    document.getElementById("incomeDescription").value = "Daily bar sales";
    populatePaymentMethods();
    populateSelect("incomeCategory", incomeCategories, "Select source");
    if (incomeCategories.includes("Bar sales")) document.getElementById("incomeCategory").value = "Bar sales";
    updateNet();
  }

  function resetExpense() {
    expenseForm.reset();
    document.getElementById("expenseDate").value = currentDate();
    populatePaymentMethods();
    populateSelect("expenseCategory", expenseCategories, "Select category");
    expenseAnalysisStatus.textContent = "Upload is optional. You can also enter the bill manually.";
  }

  function expenseFormData(confirmDuplicate = false) {
    const form = new FormData();
    form.set("business", BUSINESS_ID);
    form.set("date", document.getElementById("expenseDate").value);
    form.set("amount", document.getElementById("expenseAmount").value);
    form.set("category", document.getElementById("expenseCategory").value);
    form.set("vendor", document.getElementById("expenseVendor").value);
    form.set("description", document.getElementById("expenseDescription").value);
    form.set("paymentMethod", document.getElementById("expensePaymentMethod").value);
    form.set("roomArea", document.getElementById("expenseRoomArea").value);
    form.set("notes", document.getElementById("expenseNotes").value);
    form.set("confirmDuplicate", confirmDuplicate ? "true" : "false");
    const file = expenseReceipt.files?.[0];
    if (file) form.set("receipt", file, file.name);
    return form;
  }

  async function loginWith(value) {
    token = String(value || "").trim();
    if (!token) return;
    loginStatus.textContent = "Checking staff access…";
    try {
      const result = await api(`/api/concierge/admin/finance/configuration?business=${encodeURIComponent(BUSINESS_ID)}`);
      if (result.role !== "staff") throw Object.assign(new Error("staff_password_required"), { status: 403 });
      applyConfiguration(result.configuration || {});
      window.sessionStorage.setItem(tokenKey, token);
      tokenInput.value = "";
      login.hidden = true;
      workspace.hidden = false;
      resetIncome();
      resetExpense();
      loginStatus.textContent = "Use the Bamboo staff password. It is kept only in this browser tab.";
    } catch (error) {
      token = "";
      window.sessionStorage.removeItem(tokenKey);
      login.hidden = false;
      workspace.hidden = true;
      loginStatus.textContent = [401, 403].includes(error.status) ? "That is not the Bamboo staff password." : "The Bamboo finance service is not available yet.";
    }
  }

  loginForm.addEventListener("submit", (event) => { event.preventDefault(); loginWith(tokenInput.value); });
  logout.addEventListener("click", () => {
    token = "";
    window.sessionStorage.removeItem(tokenKey);
    workspace.hidden = true;
    login.hidden = false;
    loginStatus.textContent = "Use the Bamboo staff password. It is kept only in this browser tab.";
  });

  ["incomeGross", "incomeFees"].forEach((id) => document.getElementById(id).addEventListener("input", updateNet));
  document.getElementById("incomeReset").addEventListener("click", () => { resetIncome(); incomeStatus.textContent = ""; });
  document.getElementById("expenseReset").addEventListener("click", () => { resetExpense(); expenseStatus.textContent = ""; });

  expenseAnalyze.addEventListener("click", async () => {
    const file = expenseReceipt.files?.[0];
    if (!file) { expenseAnalysisStatus.textContent = "Choose a receipt photo or PDF first."; return; }
    expenseAnalyze.disabled = true;
    expenseAnalysisStatus.textContent = "Analyzing receipt… Check every field before submitting.";
    const form = new FormData();
    form.set("business", BUSINESS_ID);
    form.set("receipt", file, file.name);
    try {
      const result = await apiForm("/api/concierge/admin/expenses/analyze", form);
      const draft = result.draft || {};
      if (draft.date) document.getElementById("expenseDate").value = draft.date;
      document.getElementById("expenseAmount").value = Number(draft.amount) > 0 ? String(draft.amount) : "";
      document.getElementById("expenseCategory").value = expenseCategories.includes(draft.category) ? draft.category : "";
      document.getElementById("expenseVendor").value = draft.vendor || "";
      document.getElementById("expenseDescription").value = draft.description || "";
      document.getElementById("expensePaymentMethod").value = paymentMethods.includes(draft.paymentMethod) ? draft.paymentMethod : "";
      document.getElementById("expenseRoomArea").value = draft.roomArea || "";
      document.getElementById("expenseNotes").value = draft.notes || "";
      expenseAnalysisStatus.textContent = "Draft prepared. Check the date, amount, category and description before submitting.";
    } catch (error) {
      expenseAnalysisStatus.textContent = error.message === "expense_extraction_unavailable"
        ? "Automatic receipt analysis is not configured. Enter the bill manually; the receipt can still be attached."
        : "The receipt could not be analyzed automatically. Enter the bill manually; the receipt can still be attached.";
    } finally {
      expenseAnalyze.disabled = false;
    }
  });

  expenseClearReceipt.addEventListener("click", () => {
    expenseReceipt.value = "";
    expenseAnalysisStatus.textContent = "Receipt cleared. You can submit without an attachment or choose another receipt.";
  });

  incomeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.getElementById("incomeSave");
    button.disabled = true;
    incomeStatus.textContent = "Saving…";
    const payload = (confirmDuplicate = false) => ({
      business: BUSINESS_ID,
      date: document.getElementById("incomeDate").value,
      category: document.getElementById("incomeCategory").value,
      gross: document.getElementById("incomeGross").value,
      fees: document.getElementById("incomeFees").value || "0",
      unit: document.getElementById("incomeUnit").value,
      description: document.getElementById("incomeDescription").value,
      paymentMethod: document.getElementById("incomePaymentMethod").value,
      reference: document.getElementById("incomeReference").value,
      notes: document.getElementById("incomeNotes").value,
      confirmDuplicate
    });
    const save = (confirmDuplicate) => api("/api/concierge/admin/income", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload(confirmDuplicate)) });
    try {
      try { await save(false); }
      catch (error) {
        if (error.status !== 409 || error.message !== "possible_duplicate") throw error;
        if (!window.confirm("A similar income entry may already exist. Submit this as a separate entry anyway?")) { incomeStatus.textContent = "Not submitted."; return; }
        await save(true);
      }
      incomeStatus.textContent = "Income submitted successfully. The owner can review it in the owner dashboard.";
      resetIncome();
    } catch (error) {
      incomeStatus.textContent = error.message === "invalid_income" ? "Check the date, amount, category, payment method and description." : "The income could not be submitted.";
    } finally { button.disabled = false; }
  });

  expenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.getElementById("expenseSave");
    button.disabled = true;
    expenseStatus.textContent = "Saving…";
    const save = (confirmDuplicate) => apiForm("/api/concierge/admin/expenses", expenseFormData(confirmDuplicate));
    try {
      try { await save(false); }
      catch (error) {
        if (error.status !== 409 || error.message !== "possible_duplicate") throw error;
        if (!window.confirm("A similar expense may already exist. Submit this as a separate entry anyway?")) { expenseStatus.textContent = "Not submitted."; return; }
        await save(true);
      }
      expenseStatus.textContent = "Expense submitted successfully. The owner can review it in the owner dashboard.";
      resetExpense();
    } catch (error) {
      const messages = {
        invalid_expense: "Check the date, amount, category and description.",
        file_too_large: "The receipt is larger than 10 MB.",
        unsupported_file_type: "Use a JPG, PNG, WEBP, HEIC or PDF receipt.",
        receipt_storage_unavailable: "The private receipt store is unavailable. Nothing was saved."
      };
      expenseStatus.textContent = messages[error.message] || "The expense could not be submitted.";
    } finally { button.disabled = false; }
  });

  document.getElementById("incomeDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("expenseDate").value = new Date().toISOString().slice(0, 10);
  updateNet();
  const existing = window.sessionStorage.getItem(tokenKey) || "";
  if (existing) loginWith(existing);
})();
