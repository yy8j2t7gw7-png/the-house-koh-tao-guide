(function () {
  const BUSINESS_ID = "bamboo-beach-bar";
  const tokenKey = "bambooFinanceOwnerToken";
  const login = document.getElementById("adminLogin");
  const loginForm = document.getElementById("adminLoginForm");
  const tokenInput = document.getElementById("adminToken");
  const loginStatus = document.getElementById("loginStatus");
  const workspace = document.getElementById("adminWorkspace");
  const logout = document.getElementById("adminLogout");
  const expenseMonth = document.getElementById("expenseMonth");
  const financeSummary = document.getElementById("financeSummary");
  const financeLocationSummary = document.getElementById("financeLocationSummary");
  const financePaymentSummary = document.getElementById("financePaymentSummary");
  const expenseSummary = document.getElementById("expenseSummary");
  const expenseCategorySummary = document.getElementById("expenseCategorySummary");
  const expenseForm = document.getElementById("expenseForm");
  const expenseReceipt = document.getElementById("expenseReceipt");
  const expenseAnalyze = document.getElementById("expenseAnalyze");
  const expenseClearReceipt = document.getElementById("expenseClearReceipt");
  const expenseAnalysisStatus = document.getElementById("expenseAnalysisStatus");
  const expenseEntries = document.getElementById("expenseEntries");
  const expenseExport = document.getElementById("expenseExport");
  const expensePrint = document.getElementById("expensePrint");
  const expenseReset = document.getElementById("expenseReset");
  const incomeForm = document.getElementById("incomeForm");
  const incomeEntries = document.getElementById("incomeEntries");
  const incomeReset = document.getElementById("incomeReset");
  const confirmDialog = document.getElementById("adminConfirmDialog");
  const confirmTitle = document.getElementById("adminConfirmTitle");
  const confirmMessage = document.getElementById("adminConfirmMessage");
  const confirmSubmit = document.getElementById("adminConfirmSubmit");
  const financeLocationOptions = document.getElementById("financeLocationOptions");

  let token = "";
  let currency = "THB";
  let timeZone = "Asia/Bangkok";
  let minorUnitDigits = 2;
  let expenseCategories = [];
  let incomeCategories = [];
  let paymentMethods = ["", "Cash", "QR code", "Card", "Bank transfer", "Other"];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function businessUrl(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}business=${encodeURIComponent(BUSINESS_ID)}`;
  }

  function authorizedFetch(path, options = {}) {
    return fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        authorization: `Bearer ${token}`
      }
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

  function confirmAction({ title, message, confirmLabel = "Confirm", danger = false }) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmSubmit.textContent = confirmLabel;
    confirmSubmit.classList.toggle("is-danger", danger);
    confirmDialog.returnValue = "";
    confirmDialog.showModal();
    return new Promise((resolve) => {
      confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "confirm"), { once: true });
    });
  }

  function currentDateParts() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    return { date: `${get("year")}-${get("month")}-${get("day")}`, month: `${get("year")}-${get("month")}` };
  }

  function formatAmount(value) {
    const amount = Number(value) || 0;
    try {
      return new Intl.NumberFormat("en-TH", {
        style: "currency",
        currency,
        minimumFractionDigits: minorUnitDigits,
        maximumFractionDigits: minorUnitDigits
      }).format(amount);
    } catch (_error) {
      return `${currency} ${amount.toFixed(minorUnitDigits)}`;
    }
  }

  function applyConfiguration(configuration = {}) {
    if (/^[A-Z]{3}$/.test(String(configuration.currency || ""))) currency = configuration.currency;
    if (configuration.timeZone) timeZone = String(configuration.timeZone);
    if (Number.isFinite(Number(configuration.minorUnitDigits))) minorUnitDigits = Math.max(0, Math.min(3, Number(configuration.minorUnitDigits) || 0));
    expenseCategories = Array.isArray(configuration.expenseCategories) ? configuration.expenseCategories : expenseCategories;
    incomeCategories = Array.isArray(configuration.categories) ? configuration.categories : incomeCategories;
    paymentMethods = Array.isArray(configuration.paymentMethods) && configuration.paymentMethods.length ? configuration.paymentMethods : paymentMethods;
    populatePaymentMethods();
    const step = minorUnitDigits > 0 ? 1 / (10 ** minorUnitDigits) : 1;
    document.getElementById("expenseAmount").step = String(step);
    document.getElementById("expenseAmount").min = String(step);
    document.getElementById("incomeGross").step = String(step);
    document.getElementById("incomeGross").min = String(step);
    document.getElementById("incomeFees").step = String(step);
    document.getElementById("expenseAmountLabel").textContent = `Amount (${currency})`;
    document.getElementById("incomeGrossLabel").textContent = `Gross income (${currency})`;
    document.getElementById("incomeFeesLabel").textContent = `Fees / commission (${currency})`;
    if (configuration.locationLabel) document.getElementById("expenseLocationLabel").textContent = configuration.locationLabel;
    if (configuration.incomeUnitLabel) document.getElementById("incomeUnitLabel").textContent = configuration.incomeUnitLabel;
    if (Array.isArray(configuration.locationExamples)) {
      financeLocationOptions.replaceChildren(...configuration.locationExamples.map((value) => {
        const option = document.createElement("option");
        option.value = value;
        return option;
      }));
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
      const current = select.value;
      select.replaceChildren();
      paymentMethods.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value || "Not specified";
        select.appendChild(option);
      });
      if (paymentMethods.includes(current)) select.value = current;
    });
  }

  function renderFinanceSummary(totals = {}) {
    const cards = [
      [formatAmount(totals.netIncome), "Net income"],
      [formatAmount(totals.expenses), "Expenses"],
      [formatAmount(totals.operatingResult), "Operating result"],
      [String(Number(totals.entries) || 0), "Saved finance entries"]
    ].map(([value, label]) => {
      const card = element("article", "concierge-admin-expense-stat");
      card.append(element("strong", "", value), element("span", "", label));
      return card;
    });
    financeSummary.replaceChildren(...cards);
    financePaymentSummary.replaceChildren();
    Object.entries(totals.incomePaymentMethods || {})
      .filter(([, value]) => Number(value))
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .forEach(([method, value]) => financePaymentSummary.appendChild(element("span", "", `${method}: ${formatAmount(value)}`)));
    financeLocationSummary.replaceChildren();
    Object.entries(totals.locations || {})
      .filter(([name, values]) => name !== "Unassigned" && (Number(values.netIncome) || Number(values.expenses)))
      .sort((a, b) => Math.abs(Number(b[1].operatingResult) || 0) - Math.abs(Number(a[1].operatingResult) || 0))
      .forEach(([name, values]) => {
        financeLocationSummary.appendChild(element("span", "", `${name}: income ${formatAmount(values.netIncome)} · expenses ${formatAmount(values.expenses)} · result ${formatAmount(values.operatingResult)}`));
      });
  }

  function renderExpenseSummary(totals = {}) {
    const cards = [
      [formatAmount(totals.amount), "Monthly expenses"],
      [String(Number(totals.entries) || 0), "Expense entries"],
      [String(Number(totals.receipts) || 0), "Receipts attached"]
    ].map(([value, label]) => {
      const card = element("article", "concierge-admin-expense-stat");
      card.append(element("strong", "", value), element("span", "", label));
      return card;
    });
    expenseSummary.replaceChildren(...cards);
    expenseCategorySummary.replaceChildren();
    Object.entries(totals.categories || {})
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .forEach(([category, value]) => expenseCategorySummary.appendChild(element("span", "", `${category}: ${formatAmount(value)}`)));
  }

  function renderIncome(records = []) {
    incomeEntries.replaceChildren();
    if (!records.length) {
      incomeEntries.appendChild(element("div", "concierge-admin-empty", "No Bamboo income recorded for this month."));
      return;
    }
    records.forEach((item) => {
      const card = element("article", "concierge-admin-expense-item");
      const head = element("div", "concierge-admin-expense-item-head");
      const copy = element("div");
      copy.append(element("strong", "", `${item.incomeDate} · ${item.category}`), element("p", "concierge-admin-expense-description", item.description || "Income"));
      head.append(copy, element("span", "concierge-admin-expense-amount", formatAmount(item.net)));
      const meta = element("div", "concierge-admin-expense-meta");
      meta.appendChild(element("span", "", `Gross ${formatAmount(item.gross)}`));
      if (Number(item.fees) > 0) meta.appendChild(element("span", "", `Fees ${formatAmount(item.fees)}`));
      if (item.unit) meta.appendChild(element("span", "", item.unit));
      if (item.paymentMethod) meta.appendChild(element("span", "", item.paymentMethod));
      if (item.reference) meta.appendChild(element("span", "", `Ref: ${item.reference}`));
      if (item.notes) meta.appendChild(element("span", "", item.notes));
      meta.appendChild(element("span", "", item.createdByRole === "staff" ? "Entered by staff" : "Entered by owner"));
      const actions = element("div", "concierge-admin-card-actions");
      const remove = element("button", "danger", "Delete income");
      remove.type = "button";
      remove.dataset.incomeDeleteId = item.id;
      actions.appendChild(remove);
      card.append(head, meta, actions);
      incomeEntries.appendChild(card);
    });
  }

  function renderExpenses(records = []) {
    expenseEntries.replaceChildren();
    if (!records.length) {
      expenseEntries.appendChild(element("div", "concierge-admin-empty", "No Bamboo expenses recorded for this month."));
      return;
    }
    records.forEach((item) => {
      const card = element("article", "concierge-admin-expense-item");
      const head = element("div", "concierge-admin-expense-item-head");
      const copy = element("div");
      copy.append(element("strong", "", `${item.expenseDate} · ${item.category}`), element("p", "concierge-admin-expense-description", item.description));
      head.append(copy, element("span", "concierge-admin-expense-amount", formatAmount(item.amount)));
      const meta = element("div", "concierge-admin-expense-meta");
      if (item.vendor) meta.appendChild(element("span", "", item.vendor));
      if (item.paymentMethod) meta.appendChild(element("span", "", item.paymentMethod));
      if (item.roomArea) meta.appendChild(element("span", "", item.roomArea));
      if (item.notes) meta.appendChild(element("span", "", item.notes));
      meta.appendChild(element("span", "", item.createdByRole === "staff" ? "Entered by staff" : "Entered by owner"));
      const actions = element("div", "concierge-admin-card-actions");
      if (item.hasReceipt) {
        const receipt = element("button", "secondary", "Open receipt");
        receipt.type = "button";
        receipt.dataset.expenseReceiptId = item.id;
        actions.appendChild(receipt);
      }
      const remove = element("button", "danger", "Delete expense");
      remove.type = "button";
      remove.dataset.expenseDeleteId = item.id;
      actions.appendChild(remove);
      card.append(head, meta, actions);
      expenseEntries.appendChild(card);
    });
  }

  async function loadFinance() {
    if (!expenseMonth.value) expenseMonth.value = currentDateParts().month;
    const month = encodeURIComponent(expenseMonth.value);
    const [financeData, expenseData] = await Promise.all([
      api(businessUrl(`/api/concierge/admin/finance?month=${month}`)),
      api(businessUrl(`/api/concierge/admin/expenses?month=${month}`))
    ]);
    applyConfiguration({ ...expenseData.configuration, ...financeData.configuration, expenseCategories: expenseData.configuration?.categories || [] });
    populateSelect("expenseCategory", expenseCategories, "Select category");
    populateSelect("incomeCategory", incomeCategories, "Select source");
    renderFinanceSummary(financeData.totals || {});
    renderIncome(financeData.income || []);
    renderExpenseSummary(expenseData.totals || {});
    renderExpenses(expenseData.records || []);
    resetDateDefaults(false);
  }

  function resetDateDefaults(force = true) {
    const today = currentDateParts();
    if (force || !document.getElementById("incomeDate").value) document.getElementById("incomeDate").value = today.date;
    if (force || !document.getElementById("expenseDate").value) document.getElementById("expenseDate").value = today.date;
    if (!expenseMonth.value) expenseMonth.value = today.month;
  }

  function resetIncomeForm() {
    incomeForm.reset();
    document.getElementById("incomeFees").value = "0";
    resetDateDefaults(true);
    updateIncomeNetPreview();
  }

  function resetExpenseForm() {
    expenseForm.reset();
    expenseAnalysisStatus.textContent = "Upload is optional. You can also enter an expense manually.";
    resetDateDefaults(true);
  }

  function updateIncomeNetPreview() {
    const gross = Math.max(0, Number(document.getElementById("incomeGross").value) || 0);
    const fees = Math.max(0, Number(document.getElementById("incomeFees").value) || 0);
    document.getElementById("incomeNet").value = formatAmount(Math.max(0, gross - fees));
  }

  function fillExpenseDraft(draft = {}) {
    if (draft.date) document.getElementById("expenseDate").value = draft.date;
    document.getElementById("expenseAmount").value = Number(draft.amount) > 0 ? String(draft.amount) : "";
    document.getElementById("expenseCategory").value = expenseCategories.includes(draft.category) ? draft.category : "";
    document.getElementById("expenseVendor").value = draft.vendor || "";
    document.getElementById("expenseDescription").value = draft.description || "";
    document.getElementById("expensePaymentMethod").value = draft.paymentMethod || "";
    document.getElementById("expenseRoomArea").value = draft.roomArea || "";
    document.getElementById("expenseNotes").value = draft.notes || "";
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
    loginStatus.textContent = "Checking access…";
    try {
      await loadFinance();
      window.sessionStorage.setItem(tokenKey, token);
      tokenInput.value = "";
      login.hidden = true;
      workspace.hidden = false;
      loginStatus.textContent = "Use the Bamboo owner password. It is kept only in this browser tab.";
    } catch (error) {
      token = "";
      window.sessionStorage.removeItem(tokenKey);
      login.hidden = false;
      workspace.hidden = true;
      loginStatus.textContent = [401, 403].includes(error.status) ? "That is not the Bamboo owner password." : "The Bamboo finance service is not available yet.";
    }
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginWith(tokenInput.value);
  });

  logout.addEventListener("click", () => {
    token = "";
    window.sessionStorage.removeItem(tokenKey);
    workspace.hidden = true;
    login.hidden = false;
    loginStatus.textContent = "Use the Bamboo owner password. It is kept only in this browser tab.";
  });

  expenseMonth.addEventListener("change", () => loadFinance().catch(() => window.alert("Bamboo finance records for that month could not be loaded.")));
  ["incomeGross", "incomeFees"].forEach((id) => document.getElementById(id).addEventListener("input", updateIncomeNetPreview));
  incomeReset.addEventListener("click", resetIncomeForm);
  expenseReset.addEventListener("click", resetExpenseForm);

  expenseAnalyze.addEventListener("click", async () => {
    const file = expenseReceipt.files?.[0];
    if (!file) {
      expenseAnalysisStatus.textContent = "Choose a receipt photo or PDF first.";
      return;
    }
    expenseAnalyze.disabled = true;
    expenseAnalysisStatus.textContent = "Analyzing receipt… Please review every field before saving.";
    const form = new FormData();
    form.set("business", BUSINESS_ID);
    form.set("receipt", file, file.name);
    try {
      const result = await apiForm("/api/concierge/admin/expenses/analyze", form);
      fillExpenseDraft(result.draft || {});
      const confidence = Math.round((Number(result.draft?.confidence) || 0) * 100);
      expenseAnalysisStatus.textContent = `Draft prepared (${confidence}% extraction confidence). Check the date, total, category and description before saving.`;
    } catch (error) {
      expenseAnalysisStatus.textContent = error.message === "expense_extraction_unavailable"
        ? "Automatic receipt analysis is not configured. Enter the expense manually; the receipt can still be attached."
        : "The receipt could not be analyzed automatically. Enter or correct the expense manually; the receipt can still be attached.";
    } finally {
      expenseAnalyze.disabled = false;
    }
  });

  expenseClearReceipt.addEventListener("click", () => {
    expenseReceipt.value = "";
    expenseAnalysisStatus.textContent = "Receipt cleared. You can save the expense without an attachment or choose another receipt.";
  });

  incomeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = document.getElementById("incomeSave");
    submit.disabled = true;
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
    const save = (confirmDuplicate = false) => api("/api/concierge/admin/income", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload(confirmDuplicate))
    });
    try {
      try {
        await save(false);
      } catch (error) {
        if (error.status !== 409 || error.message !== "possible_duplicate") throw error;
        const duplicate = error.data?.duplicates?.[0];
        const confirmed = await confirmAction({
          title: "Possible duplicate income",
          message: duplicate ? `A ${formatAmount(duplicate.gross)} gross Bamboo income entry on ${duplicate.incomeDate} may already exist. Save this as a separate income entry anyway?` : "A matching Bamboo income entry may already exist. Save this separately anyway?",
          confirmLabel: "Save anyway"
        });
        if (!confirmed) return;
        await save(true);
      }
      const savedMonth = document.getElementById("incomeDate").value.slice(0, 7);
      resetIncomeForm();
      if (savedMonth) expenseMonth.value = savedMonth;
      await loadFinance();
    } catch (error) {
      window.alert(error.message === "invalid_income" ? "Check the date, amount, source and description." : "The Bamboo income could not be saved.");
    } finally {
      submit.disabled = false;
    }
  });

  expenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = document.getElementById("expenseSave");
    submit.disabled = true;
    const save = (confirmDuplicate = false) => apiForm("/api/concierge/admin/expenses", expenseFormData(confirmDuplicate));
    try {
      try {
        await save(false);
      } catch (error) {
        if (error.status !== 409 || error.message !== "possible_duplicate") throw error;
        const duplicate = error.data?.duplicates?.[0];
        const confirmed = await confirmAction({
          title: "Possible duplicate expense",
          message: duplicate ? `A ${formatAmount(duplicate.amount)} Bamboo expense on ${duplicate.expenseDate}${duplicate.vendor ? ` for ${duplicate.vendor}` : ""} may already exist. Save this separately anyway?` : "A matching Bamboo expense may already exist. Save this separately anyway?",
          confirmLabel: "Save anyway"
        });
        if (!confirmed) return;
        await save(true);
      }
      const savedMonth = document.getElementById("expenseDate").value.slice(0, 7);
      resetExpenseForm();
      if (savedMonth) expenseMonth.value = savedMonth;
      await loadFinance();
    } catch (error) {
      const messages = {
        invalid_expense: "Check the date, amount, category and description.",
        file_too_large: "The receipt is larger than 10 MB.",
        unsupported_file_type: "Use a JPG, PNG, WEBP, HEIC or PDF receipt.",
        receipt_storage_unavailable: "The private receipt store is unavailable. Nothing was saved."
      };
      window.alert(messages[error.message] || "The Bamboo expense could not be saved.");
    } finally {
      submit.disabled = false;
    }
  });

  incomeEntries.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-income-delete-id]");
    if (!button) return;
    const confirmed = await confirmAction({ title: "Delete income?", message: "Permanently remove this Bamboo income record?", confirmLabel: "Delete income", danger: true });
    if (!confirmed) return;
    try {
      await api("/api/concierge/admin/income/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: button.dataset.incomeDeleteId, business: BUSINESS_ID, confirmation: "DELETE INCOME" })
      });
      await loadFinance();
    } catch (_error) {
      window.alert("The Bamboo income could not be deleted.");
    }
  });

  expenseEntries.addEventListener("click", async (event) => {
    const receiptButton = event.target.closest("[data-expense-receipt-id]");
    if (receiptButton) {
      try {
        const response = await authorizedFetch(businessUrl(`/api/concierge/admin/expense-files/${receiptButton.dataset.expenseReceiptId}`));
        if (!response.ok) throw new Error("receipt_failed");
        const blob = await response.blob();
        const disposition = response.headers.get("content-disposition") || "";
        const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `bamboo-expense-receipt-${receiptButton.dataset.expenseReceiptId}`;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      } catch (_error) {
        window.alert("The private receipt could not be opened.");
      }
      return;
    }
    const deleteButton = event.target.closest("[data-expense-delete-id]");
    if (!deleteButton) return;
    const confirmed = await confirmAction({ title: "Delete expense?", message: "Permanently remove this Bamboo expense record and its private receipt attachment, if present?", confirmLabel: "Delete expense", danger: true });
    if (!confirmed) return;
    try {
      await api("/api/concierge/admin/expenses/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: deleteButton.dataset.expenseDeleteId, business: BUSINESS_ID, confirmation: "DELETE EXPENSE" })
      });
      await loadFinance();
    } catch (_error) {
      window.alert("The Bamboo expense could not be deleted.");
    }
  });

  expensePrint.addEventListener("click", () => {
    if (!expenseMonth.value) expenseMonth.value = currentDateParts().month;
    window.print();
  });

  expenseExport.addEventListener("click", async () => {
    if (!expenseMonth.value) expenseMonth.value = currentDateParts().month;
    expenseExport.disabled = true;
    try {
      const response = await authorizedFetch(businessUrl(`/api/concierge/admin/finance/export.csv?month=${encodeURIComponent(expenseMonth.value)}`));
      if (!response.ok) throw new Error("export_failed");
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `bamboo-finance-${expenseMonth.value}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (_error) {
      window.alert("The Bamboo finance export could not be created.");
    } finally {
      expenseExport.disabled = false;
    }
  });

  resetDateDefaults(true);
  updateIncomeNetPreview();
  const existing = window.sessionStorage.getItem(tokenKey) || "";
  if (existing) loginWith(existing);
})();
