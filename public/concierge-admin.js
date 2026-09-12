(function () {
  const tokenKey = "houseConciergeAdminToken";
  const portalChooser = document.getElementById("adminPortalChooser");
  const houseAdminChoice = document.getElementById("houseAdminChoice");
  const backAdminChoice = document.getElementById("backAdminChoice");
  const adminPortalSwitch = document.getElementById("adminPortalSwitch");
  const login = document.getElementById("adminLogin");
  const loginForm = document.getElementById("adminLoginForm");
  const tokenInput = document.getElementById("adminToken");
  const loginStatus = document.getElementById("loginStatus");
  const workspace = document.getElementById("adminWorkspace");
  const stats = document.getElementById("adminStats");
  const queue = document.getElementById("learningQueue");
  const approved = document.getElementById("approvedKnowledge");
  const recent = document.getElementById("recentQuestions");
  const pendingRegistrations = document.getElementById("pendingRegistrations");
  const passportUploads = document.getElementById("passportUploads");
  const passportLinkForm = document.getElementById("passportLinkForm");
  const passportLinkResult = document.getElementById("passportLinkResult");
  const alerts = document.getElementById("conciergeAlerts");
  const whatsappDeliveryDiagnostics = document.getElementById("whatsappDeliveryDiagnostics");
  const maintenanceReports = document.getElementById("maintenanceReports");
  const expenseMonth = document.getElementById("expenseMonth");
  const expenseSummary = document.getElementById("expenseSummary");
  const expenseCategorySummary = document.getElementById("expenseCategorySummary");
  const expenseForm = document.getElementById("expenseForm");
  const expenseReceipt = document.getElementById("expenseReceipt");
  const expenseAnalyze = document.getElementById("expenseAnalyze");
  const expenseClearReceipt = document.getElementById("expenseClearReceipt");
  const expenseAnalysisStatus = document.getElementById("expenseAnalysisStatus");
  const expenseEntries = document.getElementById("expenseEntries");
  const expenseExport = document.getElementById("expenseExport");
  const expenseReset = document.getElementById("expenseReset");
  const financeSummary = document.getElementById("financeSummary");
  const financeLocationSummary = document.getElementById("financeLocationSummary");
  const incomeForm = document.getElementById("incomeForm");
  const incomeEntries = document.getElementById("incomeEntries");
  const incomeReset = document.getElementById("incomeReset");
  const alertStatus = document.getElementById("whatsappAlertStatus");
  const activeStayReservations = document.getElementById("activeStayReservations");
  const upcomingStayReservations = document.getElementById("upcomingStayReservations");
  const roomHousekeepingStatuses = document.getElementById("roomHousekeepingStatuses");
  const todayOperationsSummary = document.getElementById("todayOperationsSummary");
  const todayOperationsRooms = document.getElementById("todayOperationsRooms");
  const todayHousekeepingTasks = document.getElementById("todayHousekeepingTasks");
  const operationsCalendar = document.getElementById("operationsCalendar");
  const integrationArchitectureStatus = document.getElementById("integrationArchitectureStatus");
  const integrationProviders = document.getElementById("integrationProviders");
  const keyRotations = document.getElementById("keyRotations");
  const keyRotationActivity = document.getElementById("keyRotationActivity");
  const manualStayForm = document.getElementById("manualStayForm");
  const directStayForm = document.getElementById("directStayForm");
  const directStayResult = document.getElementById("directStayResult");
  const directStayCodeResult = document.getElementById("directStayCodeResult");
  const directStayUrlResult = document.getElementById("directStayUrlResult");
  const expandAdminSections = document.getElementById("expandAdminSections");
  const collapseAdminSections = document.getElementById("collapseAdminSections");
  const adminConfirmDialog = document.getElementById("adminConfirmDialog");
  const adminConfirmTitle = document.getElementById("adminConfirmTitle");
  const adminConfirmMessage = document.getElementById("adminConfirmMessage");
  const adminConfirmSubmit = document.getElementById("adminConfirmSubmit");
  const adminSections = [...document.querySelectorAll("details[data-admin-section]")];
  const sectionStateKey = "houseConciergeAdminSections:v5.11.27";
  let token = "";
  let expenseCurrency = "THB";
  let expenseTimeZone = "Asia/Bangkok";
  let expenseCategories = [];
  let incomeCategories = [];
  let expenseMinorUnitDigits = 2;
  let expenseRecords = [];
  let expenseEditingRecord = null;

  function savedAdminSectionState() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(sectionStateKey) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  function persistAdminSectionState() {
    try {
      window.localStorage.setItem(sectionStateKey, JSON.stringify(Object.fromEntries(
        adminSections.map((section) => [section.dataset.adminSection, section.open])
      )));
    } catch (_error) {
      // Section controls remain fully usable when storage is unavailable.
    }
  }

  function syncAdminSectionState(section) {
    const summary = section.querySelector(":scope > summary");
    summary?.setAttribute("aria-expanded", String(section.open));
    const state = summary?.querySelector("[data-section-state]");
    if (state) state.textContent = section.open ? "Expanded" : "Collapsed";
  }

  function setAdminSectionOpen(section, open, persist = true) {
    section.open = section.classList.contains("has-urgent") ? true : Boolean(open);
    syncAdminSectionState(section);
    if (persist) persistAdminSectionState();
  }

  function initializeAdminSections() {
    const saved = savedAdminSectionState();
    adminSections.forEach((section) => {
      const id = section.dataset.adminSection;
      if (typeof saved[id] === "boolean") section.open = saved[id];
      syncAdminSectionState(section);
      section.addEventListener("toggle", () => {
        if (section.classList.contains("has-urgent") && !section.open) {
          setAdminSectionOpen(section, true, false);
          return;
        }
        syncAdminSectionState(section);
        persistAdminSectionState();
      });
    });
  }

  function setAdminSectionCount(id, count) {
    const section = adminSections.find((item) => item.dataset.adminSection === id);
    const target = section?.querySelector("[data-section-count]");
    if (target) {
      target.textContent = String(Number(count) || 0);
      target.setAttribute("aria-label", `${Number(count) || 0} item${Number(count) === 1 ? "" : "s"}`);
    }
  }

  function markUrgentAdminSection(id, urgent) {
    const section = adminSections.find((item) => item.dataset.adminSection === id);
    if (!section) return;
    section.classList.toggle("has-urgent", urgent);
    const summary = section.querySelector(":scope > summary");
    if (urgent) {
      summary?.setAttribute("aria-disabled", "true");
      summary?.setAttribute("title", "This section stays open while urgent work is unresolved.");
    } else {
      summary?.removeAttribute("aria-disabled");
      summary?.removeAttribute("title");
    }
    const summaryGroup = section.querySelector(".concierge-admin-section-summary");
    let badge = summaryGroup?.querySelector("[data-section-urgent]");
    if (urgent && !badge) {
      badge = element("span", "concierge-admin-section-urgent", "Urgent · stays open");
      badge.dataset.sectionUrgent = "";
      summaryGroup?.prepend(badge);
    } else if (!urgent) {
      badge?.remove();
    }
    if (urgent) setAdminSectionOpen(section, true, false);
  }

  function integrationStatusLabel(status) {
    if (status === "connected") return "Connected";
    if (status === "active") return "Active";
    if (status === "error") return "Error";
    return "Not connected";
  }

  function integrationGuide(provider) {
    const guide = provider?.connectionGuide;
    if (!guide || provider.connectAction !== "connector_required") return null;
    const details = element("details", "concierge-admin-integration-guide");
    const summary = element("summary", "", "How to connect");
    details.appendChild(summary);

    const body = element("div", "concierge-admin-integration-guide-body");
    const addSteps = (heading, steps) => {
      const items = Array.isArray(steps) ? steps.filter(Boolean) : [];
      if (!items.length) return;
      body.appendChild(element("strong", "concierge-admin-integration-guide-heading", heading));
      const list = document.createElement("ol");
      list.className = "concierge-admin-integration-steps";
      items.forEach((step) => list.appendChild(element("li", "", step)));
      body.appendChild(list);
    };
    addSteps("For the property owner", guide.propertySteps);
    addSteps("What the software connector requires", guide.platformSteps);

    const links = Array.isArray(guide.officialLinks) ? guide.officialLinks.filter((item) => item?.url && item?.label) : [];
    if (links.length) {
      body.appendChild(element("strong", "concierge-admin-integration-guide-heading", "Official provider information"));
      const linkRow = element("div", "concierge-admin-integration-links");
      links.forEach((item) => {
        const link = element("a", "secondary", item.label);
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        linkRow.appendChild(link);
      });
      body.appendChild(linkRow);
    }
    details.appendChild(body);
    return details;
  }

  function renderIntegrations(integrations = {}) {
    if (!integrationProviders || !integrationArchitectureStatus) return;
    const providers = Array.isArray(integrations.providers) ? integrations.providers : [];
    integrationProviders.replaceChildren();

    const architectureReady = integrations.canonicalReservationModel === true;
    integrationArchitectureStatus.replaceChildren(
      element("strong", "", architectureReady ? "Canonical reservation layer ready" : "Integration architecture unavailable"),
      element("span", "", architectureReady
        ? "Every future booking connector can feed the same reservations, calendar, housekeeping and guest-access workflows. The House itself stays on its existing Airbnb + direct/walk-in setup unless you deliberately add another live connector."
        : "Provider connectors should not be added until the canonical reservation layer is available.")
    );

    providers.forEach((provider) => {
      const card = element("article", "concierge-admin-integration-card");
      const head = element("div", "concierge-admin-integration-head");
      const title = element("div");
      title.append(
        element("strong", "", provider.name || provider.id || "Provider"),
        element("span", "", provider.liveAtHouse ? "The House production" : "Optional product integration")
      );
      const status = element("span", `concierge-admin-integration-status is-${provider.status || "not_connected"}`, integrationStatusLabel(provider.status));
      head.append(title, status);

      const description = element("p", "concierge-admin-integration-description", provider.description || "");
      const note = element("p", "concierge-admin-integration-note", provider.note || "");
      const actions = element("div", "concierge-admin-card-actions");
      const button = element("button", "secondary");
      button.type = "button";

      if (provider.connectAction === "managed_existing_sync") {
        button.textContent = provider.status === "connected" ? "Connected" : "Existing sync needs configuration";
        button.disabled = true;
      } else if (provider.connectAction === "built_in") {
        button.textContent = "Built in";
        button.disabled = true;
      } else {
        button.textContent = "Connect";
        button.disabled = true;
        button.title = "A real provider connector must be installed and approved before this connection can be enabled.";
        const connectorState = element("span", "concierge-admin-integration-connector-state", `Connector status: ${provider.connectorInstalled ? "Installed" : "Not installed"}`);
        actions.append(button, connectorState);
      }
      if (!actions.childNodes.length) actions.append(button);
      card.append(head, description, note, actions);
      const guide = integrationGuide(provider);
      if (guide) card.appendChild(guide);
      integrationProviders.appendChild(card);
    });
    setAdminSectionCount("integrations", providers.length);
  }

  function updateAdminSectionSummaries(data) {
    const stayOperations = data.stayOperations || {};
    const operationsCount = Number(todayOperationsSummary?.dataset.count || 0);
    setAdminSectionCount("operations", operationsCount);
    setAdminSectionCount("integrations", (data.integrations?.providers || []).length);
    setAdminSectionCount("stays", (stayOperations.reservations || []).length + (stayOperations.rotations || []).length);
    setAdminSectionCount("alerts", (data.alerts || []).length);
    setAdminSectionCount("maintenance", (data.maintenanceReports || []).length);
    setAdminSectionCount("finance", Number(expenseEntries?.dataset.count || 0) + Number(incomeEntries?.dataset.count || 0));
    setAdminSectionCount("passports", (data.pendingRegistrations || []).length + (data.passportUploads || []).length);
    setAdminSectionCount("learning", (data.queue || []).length);
    setAdminSectionCount("approved", (data.approved || []).length);
    setAdminSectionCount("recent", (data.recent || []).length);
    markUrgentAdminSection("alerts", (data.alerts || []).some((item) => ["critical", "urgent"].includes(item.severity) && item.status !== "resolved"));
    markUrgentAdminSection("maintenance", (data.maintenanceReports || []).some((item) => ["critical", "urgent"].includes(item.severity) && item.status !== "resolved"));
  }

  initializeAdminSections();

  const categories = [
    "arrival", "booking", "concierge", "departure", "emergency", "fallback",
    "house-rules", "practical", "pre-booking", "property-emergency", "room", "stay-support"
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function diagnosticGrid(fields) {
    const grid = element("dl", "concierge-admin-diagnostic-grid");
    fields.filter((field) => field.value !== "" && field.value !== null && field.value !== undefined).forEach((field) => {
      const item = element("div", "concierge-admin-diagnostic-field");
      item.append(element("dt", "", field.label), element("dd", "", String(field.value)));
      grid.appendChild(item);
    });
    return grid;
  }

  function confirmAdminAction({ title, message, confirmLabel = "Confirm", danger = false }) {
    adminConfirmTitle.textContent = title;
    adminConfirmMessage.textContent = message;
    adminConfirmSubmit.textContent = confirmLabel;
    adminConfirmSubmit.classList.toggle("is-danger", danger);
    adminConfirmDialog.returnValue = "";
    adminConfirmDialog.showModal();
    return new Promise((resolve) => {
      adminConfirmDialog.addEventListener("close", () => resolve(adminConfirmDialog.returnValue === "confirm"), { once: true });
    });
  }

  async function api(path, options = {}) {
    const response = await authorizedFetch(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Request failed");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function apiForm(path, form) {
    const response = await fetch(path, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: form
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "Request failed");
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function authorizedFetch(path, options = {}) {
    return fetch(path, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
  }

  function stat(value, label) {
    const card = element("article", "concierge-admin-stat");
    card.append(element("strong", "", String(value || 0)), element("span", "", label));
    return card;
  }

  function renderStats(totals) {
    stats.replaceChildren(
      stat(totals.interactions24h, "Questions in 24 hours"),
      stat(totals.pending, "Awaiting review"),
      stat(totals.gaps30d, "Knowledge gaps in 30 days"),
      stat(`${totals.positive}/${totals.negative}`, "Helpful / not helpful"),
      stat(totals.pendingRegistrations, "Identity document requests pending"),
      stat(totals.storedPassportFiles, "Identity documents stored"),
      stat(totals.openMaintenanceReports, "Open maintenance reports"),
      stat(totals.openAlerts, "Open concierge alerts"),
      stat(totals.criticalAlerts, "Critical alerts open")
    );
  }

  function bangkokDate(value) {
    if (!value) return "Not set";
    return new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
  }

  function renderPendingRegistrations(items) {
    pendingRegistrations.replaceChildren();
    if (!items.length) {
      pendingRegistrations.appendChild(element("div", "concierge-admin-empty", "No active secure identity-document requests."));
      return;
    }
    items.forEach((item) => {
      const card = element("article", "concierge-admin-registration-item");
      card.dataset.registrationId = item.id;
      const documentType = item.documentType === "thai_id" ? "Thai ID card" : "Foreign passport";
      const arrival = item.arrivalAt ? new Date(item.arrivalAt) : null;
      const urgency = arrival && arrival.getTime() <= Date.now() ? "Arrival time has passed—remind now." : `Expected arrival: ${bangkokDate(item.arrivalAt)}`;
      card.append(
        element("strong", "", `Room ${item.room}`),
        element("span", "", `Document: ${documentType}`),
        element("span", "", urgency),
        element("span", "", `Link expires: ${bangkokDate(item.expiresAt)}`),
        element("span", "", item.reminderSentAt ? `Reminder marked sent: ${bangkokDate(item.reminderSentAt)}` : "Reminder not marked as sent")
      );
      const actions = element("div", "concierge-admin-card-actions");
      const reminded = element("button", "secondary", "Mark reminder sent");
      reminded.type = "button";
      reminded.dataset.passportAction = "reminded";
      const revoke = element("button", "danger", "Revoke link");
      revoke.type = "button";
      revoke.dataset.passportAction = "delete";
      actions.append(reminded, revoke);
      card.appendChild(actions);
      pendingRegistrations.appendChild(card);
    });
  }

  function renderPassportUploads(items) {
    passportUploads.replaceChildren();
    if (!items.length) {
      passportUploads.appendChild(element("div", "concierge-admin-empty", "No guest identity documents are stored."));
      return;
    }
    items.forEach((item) => {
      const card = element("article", "concierge-admin-registration-item");
      card.dataset.registrationId = item.id;
      const size = `${Math.max(1, Math.round(Number(item.sizeBytes || 0) / 1024))} KB`;
      const documentType = item.documentType === "thai_id" ? "thai_id" : "passport";
      card.append(
        element("strong", "", `Room ${item.room}`),
        element("span", "", documentType === "thai_id" ? "Document: Thai ID card" : "Document: Foreign passport"),
        element("span", "", `Received: ${bangkokDate(item.uploadedAt)}`),
        element("span", "", `${item.mediaType} · ${size}`),
        element("span", "", `Automatic deletion: ${bangkokDate(item.deleteAfter)}`),
        element("span", "", documentType === "thai_id"
          ? "TM30: not applicable to Thai ID evidence"
          : item.tm30RegisteredAt ? `TM30 registered: ${bangkokDate(item.tm30RegisteredAt)}` : "TM30: not yet marked registered")
      );
      const actions = element("div", "concierge-admin-card-actions");
      const download = element("button", "secondary", "Download securely");
      download.type = "button";
      download.dataset.passportAction = "download";
      if (documentType === "passport") {
        const tm30 = element("button", "secondary", item.tm30RegisteredAt ? "Undo TM30 registered" : "Mark TM30 registered");
        tm30.type = "button";
        tm30.dataset.passportAction = item.tm30RegisteredAt ? "tm30-unregister" : "tm30-register";
        actions.appendChild(tm30);
      }
      const remove = element("button", "danger", "Delete now");
      remove.type = "button";
      remove.dataset.passportAction = "delete";
      actions.prepend(download);
      actions.append(remove);
      card.appendChild(actions);
      passportUploads.appendChild(card);
    });
  }

  function renderAlerts(items, configuration = {}, diagnostics = []) {
    alerts.replaceChildren();
    alertStatus.textContent = configuration.configured ? "WhatsApp connected" : "WhatsApp setup incomplete";
    alertStatus.className = `concierge-admin-config-status ${configuration.configured ? "is-ready" : "is-missing"}`;
    const counts = Object.entries(configuration.groupCounts || {})
      .map(([group, count]) => `${group}: ${count}`)
      .join(" · ");
    alertStatus.title = counts || "No recipient groups configured";
    if (!items.length) {
      alerts.appendChild(element("div", "concierge-admin-empty", "No open concierge alerts."));
      return;
    }
    items.forEach((item) => {
      const severity = item.severity || "attention";
      const status = item.status || "open";
      const card = element("article", `concierge-admin-alert is-${severity} is-status-${status}`);
      card.dataset.alertId = item.id;
      const head = element("div", "concierge-admin-card-head");
      const title = element("div", "concierge-admin-card-title");
      title.append(
        element("span", `concierge-admin-priority-label is-${severity}`, String(severity).toUpperCase()),
        element("h3", "", String(item.alertType || "guest request").replaceAll("_", " "))
      );
      const meta = element("div", "concierge-admin-card-meta");
      meta.append(
        element("span", "concierge-admin-pill", item.room ? `Room ${item.room} · ${item.roomVerified ? "stay verified" : "guest-selected"}` : "Room not selected"),
        element("span", `concierge-admin-pill is-status-${status}`, status),
        element("span", "concierge-admin-pill", `WhatsApp attempted: ${item.attempted || 0} · accepted: ${item.delivered || 0}`)
      );
      head.append(title, meta);
      card.append(
        head,
        element("p", "concierge-admin-alert-summary", item.detailSummary || item.summary),
        element("span", "concierge-admin-alert-time", `${item.bangkokTime || bangkokDate(item.createdAt)} · Route: ${item.recipientGroup}`)
      );
      const latestDiagnostic = diagnostics.find((diagnostic) => diagnostic.alertId === item.id);
      if (item.alertType === "booking_request" && Number(item.delivered || 0) === 0 && latestDiagnostic) {
        const diagnostic = element("div", "concierge-admin-delivery-failure");
        diagnostic.appendChild(element("h4", "", "WhatsApp delivery failed"));
        const errorCode = latestDiagnostic.errorCode || latestDiagnostic.storedErrorCode;
        diagnostic.appendChild(diagnosticGrid([
          { label: "Channel", value: "WhatsApp" },
          { label: "Provider", value: "Meta" },
          { label: "Template", value: latestDiagnostic.templateName },
          { label: "Language", value: latestDiagnostic.languageCode },
          { label: "Route", value: item.recipientGroup },
          { label: "Attempted", value: item.attempted || 0 },
          { label: "Accepted", value: item.delivered || 0 },
          { label: "HTTP", value: Number(latestDiagnostic.httpStatus || 0) > 0 ? latestDiagnostic.httpStatus : "Not retained" },
          { label: "Meta error code", value: errorCode || "Not supplied" },
          { label: "Category", value: latestDiagnostic.failureKind || "Unclassified" },
          { label: "Recorded", value: bangkokDate(latestDiagnostic.createdAt) }
        ]));
        if (latestDiagnostic.errorMessage) {
          const message = element("div", "concierge-admin-diagnostic-message");
          message.append(element("strong", "", "Provider message"), element("p", "", latestDiagnostic.errorMessage));
          diagnostic.appendChild(message);
        }
        if (latestDiagnostic.errorDetails) {
          const details = element("div", "concierge-admin-diagnostic-message");
          details.append(element("strong", "", "Provider details"), element("p", "", latestDiagnostic.errorDetails));
          diagnostic.appendChild(details);
        }
        card.appendChild(diagnostic);
      }
      if (item.escalationDueAt && !item.acknowledgedAt && !item.escalatedAt) {
        card.appendChild(element("span", "concierge-admin-alert-escalation", `Escalates if not acknowledged by ${bangkokDate(item.escalationDueAt)}`));
      } else if (item.escalatedAt) {
        card.appendChild(element("span", "concierge-admin-alert-escalation", `Escalated ${bangkokDate(item.escalatedAt)}`));
      }
      const actions = element("div", "concierge-admin-card-actions");
      if (item.status === "open") {
        const acknowledge = element("button", "secondary", "Acknowledge");
        acknowledge.type = "button";
        acknowledge.dataset.alertAction = "acknowledge";
        actions.appendChild(acknowledge);
      }
      const resolve = element("button", "", "Resolve");
      resolve.type = "button";
      resolve.dataset.alertAction = "resolve";
      actions.appendChild(resolve);
      card.appendChild(actions);
      alerts.appendChild(card);
    });
  }

  function renderWhatsAppDeliveryDiagnostics(items, alertItems = []) {
    whatsappDeliveryDiagnostics.replaceChildren();
    if (!items.length) {
      whatsappDeliveryDiagnostics.appendChild(element("div", "concierge-admin-empty", "No failed WhatsApp submissions in the last 30 days."));
      return;
    }
    items.forEach((item) => {
      const card = element("article", "concierge-admin-alert concierge-admin-diagnostic-card is-attention");
      card.dataset.diagnosticId = item.id;
      card.dataset.diagnosticAlertId = item.alertId || "";
      card.dataset.diagnosticAlertStatus = item.alertStatus || "";
      const title = item.templateName || "Earlier delivery failure";
      const code = item.errorCode || item.storedErrorCode || "unknown";
      const parentAlert = alertItems.find((alert) => alert.id === item.alertId) || {};
      card.append(element("h4", "", title));
      card.appendChild(diagnosticGrid([
        { label: "Provider", value: "Meta" },
        { label: "Route", value: parentAlert.recipientGroup || "Not retained" },
        { label: "Template", value: title },
        { label: "Language", value: item.languageCode || "Not retained" },
        { label: "Attempted", value: parentAlert.attempted ?? "Not retained" },
        { label: "Accepted", value: parentAlert.delivered ?? "Not retained" },
        { label: "HTTP", value: item.httpStatus || "Not retained" },
        { label: "Meta error code", value: code },
        { label: "Category", value: item.failureKind || "Unclassified" },
        { label: "Stage", value: item.stage || "Send" },
        { label: "Components", value: item.componentSchema || "Not retained" },
        { label: "Type", value: item.errorType || "Not supplied" },
        { label: "Subcode", value: item.errorSubcode || "Not supplied" },
        { label: "Meta trace", value: item.traceId || "Not supplied" },
        { label: "Recorded", value: bangkokDate(item.createdAt) }
      ]));
      if (item.errorMessage) {
        const message = element("div", "concierge-admin-diagnostic-message");
        message.append(element("strong", "", "Provider message"), element("p", "", item.errorMessage));
        card.appendChild(message);
      }
      if (item.errorDetails) {
        const details = element("div", "concierge-admin-diagnostic-message");
        details.append(element("strong", "", "Provider details"), element("p", "", item.errorDetails));
        card.appendChild(details);
      }
      if (item.legacyDiagnostic) {
        card.appendChild(element(
          "p",
          "concierge-admin-alert-escalation",
          "Recorded before safe provider diagnostics were enabled; only the retained error code is available."
        ));
      }
      const actions = element("div", "concierge-admin-card-actions");
      const dismiss = element("button", item.alertStatus === "resolved" ? "danger" : "secondary", item.alertStatus === "resolved" ? "Clear diagnostics" : "Dismiss");
      dismiss.type = "button";
      dismiss.dataset.diagnosticAction = item.alertStatus === "resolved" ? "clear" : "dismiss";
      actions.appendChild(dismiss);
      card.appendChild(actions);
      whatsappDeliveryDiagnostics.appendChild(card);
    });
  }

  function renderMaintenanceReports(items) {
    maintenanceReports.replaceChildren();
    if (!items.length) {
      maintenanceReports.appendChild(element("div", "concierge-admin-empty", "No maintenance reports yet."));
      return;
    }
    items.forEach((item) => {
      const status = item.status || "open";
      const card = element("article", `concierge-admin-alert is-${item.severity || "attention"} is-status-${status}${status === "resolved" ? " is-resolved" : ""}`);
      card.dataset.maintenanceId = item.id;
      const head = element("div", "concierge-admin-card-head");
      const title = element("div", "concierge-admin-card-title");
      title.append(
        element("span", `concierge-admin-priority-label is-${item.severity || "attention"}`, String(item.severity || "attention").toUpperCase()),
        element("h3", "", `Room ${item.room} · ${String(item.issueType || "room issue").replaceAll("_", " ")}`)
      );
      const meta = element("div", "concierge-admin-card-meta");
      meta.append(
        element("span", `concierge-admin-pill is-status-${status}`, status),
        element("span", `concierge-admin-pill ${item.hasPhoto ? "has-private-photo" : "no-private-photo"}`, item.hasPhoto ? "Private photo stored" : "No photo stored")
      );
      head.append(title, meta);
      card.append(
        head,
        element("p", "concierge-admin-alert-summary", item.details || "No additional details supplied."),
        element("span", "concierge-admin-alert-time", `${bangkokDate(item.createdAt)} · Reference ${maintenanceReference(item.room, item.createdAt)}`)
      );
      if (item.feeAccepted) card.appendChild(element("span", "concierge-admin-alert-escalation", "Guest acknowledged the conditional 1,000 THB toilet-clearance fee."));
      const actions = element("div", "concierge-admin-card-actions");
      if (item.hasPhoto) {
        const download = element("button", "secondary", "Download private photo");
        download.type = "button";
        download.dataset.maintenanceAction = "download";
        const remove = element("button", "danger", "Delete photo now");
        remove.type = "button";
        remove.dataset.maintenanceAction = "delete-photo";
        actions.append(download, remove);
      }
      if (["open", "acknowledged"].includes(item.status)) {
        const resolve = element("button", "", "Resolve");
        resolve.type = "button";
        resolve.dataset.maintenanceAction = "resolve";
        actions.appendChild(resolve);
      } else if (item.status === "resolved") {
        const removeReport = element("button", "danger", "Remove");
        removeReport.type = "button";
        removeReport.dataset.maintenanceAction = "remove";
        actions.appendChild(removeReport);
      }
      card.appendChild(actions);
      maintenanceReports.appendChild(card);
    });
  }

  function maintenanceReference(room, createdAt) {
    const date = new Date(createdAt);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date).reduce((result, item) => ({ ...result, [item.type]: item.value }), {});
    return `R${room}-D${parts.year}${parts.month}${parts.day}-T${parts.hour}${parts.minute}${parts.second}`;
  }

  function bangkokOperationsClock() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      minutes: (Number(parts.hour) * 60) + Number(parts.minute)
    };
  }

  function addOperationsDays(dateKey, days) {
    const date = new Date(`${dateKey}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function operationsDateLabel(dateKey) {
    return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("en-GB", {
      timeZone: "UTC", weekday: "short", day: "numeric", month: "short"
    });
  }

  function operationsProviderLabel(provider) {
    if (provider === "direct") return "Direct / walk-in";
    if (provider === "manual") return "Manual Airbnb";
    return "Airbnb";
  }

  function operationsGuestLabel(reservation) {
    const firstName = String(reservation?.guestFirstName || "").trim();
    return firstName ? ` · ${firstName}` : "";
  }

  function checkoutMinutesForOperations(reservation) {
    const late = Number(reservation?.lateCheckoutMinutes || 0);
    return Number.isFinite(late) && late > 660 ? late : 660;
  }

  function housekeepingStatusButtons(room, currentStatus, compact = false) {
    const actions = element("div", compact ? "concierge-admin-room-housekeeping-actions" : "concierge-admin-card-actions");
    actions.dataset.housekeepingRoom = String(room || "");
    ["dirty", "clean", "ready"].forEach((status) => {
      const button = element("button", status === currentStatus ? "" : "secondary", status[0].toUpperCase() + status.slice(1));
      button.type = "button";
      button.dataset.housekeepingStatus = status;
      if (status === currentStatus) button.disabled = true;
      actions.appendChild(button);
    });
    return actions;
  }

  function renderOperationsDashboard(data = {}) {
    if (!todayOperationsSummary || !todayOperationsRooms || !todayHousekeepingTasks || !operationsCalendar) return;
    const reservations = Array.isArray(data.reservations) ? data.reservations : [];
    const statuses = Array.isArray(data.housekeepingStatuses) ? data.housekeepingStatuses : [];
    const tasks = Array.isArray(data.housekeepingTasks) ? data.housekeepingTasks : [];
    const clock = bangkokOperationsClock();
    const today = clock.date;
    const todayArrivals = reservations.filter((item) => item.checkInDate === today);
    const todayDepartures = reservations.filter((item) => item.checkOutDate === today);
    const todayTasks = tasks.filter((item) => item.serviceDate === today);
    const openTodayTasks = todayTasks.filter((item) => !["ready", "resolved"].includes(String(item.status || "").toLowerCase()));
    const readyRooms = statuses.filter((item) => item.status === "ready").length;
    const priorityTasks = openTodayTasks.filter((item) => item.priority).length;
    const operationsCount = todayArrivals.length + todayDepartures.length + openTodayTasks.length;
    todayOperationsSummary.dataset.count = String(operationsCount);
    todayOperationsSummary.replaceChildren(
      stat(todayArrivals.length, "Arrivals today"),
      stat(todayDepartures.length, "Departures today"),
      stat(openTodayTasks.length, priorityTasks ? `Housekeeping open · ${priorityTasks} priority` : "Housekeeping open"),
      stat(readyRooms, "Rooms marked ready")
    );

    const statusByRoom = new Map(statuses.map((item) => [String(item.room), item]));
    const tasksByRoom = new Map();
    todayTasks.forEach((item) => {
      const room = String(item.room || "");
      const current = tasksByRoom.get(room);
      if (!current || Number(Boolean(item.priority)) > Number(Boolean(current.priority)) || String(item.updatedAt || "") > String(current.updatedAt || "")) {
        tasksByRoom.set(room, item);
      }
    });

    todayOperationsRooms.replaceChildren();
    for (let roomNumber = 1; roomNumber <= 11; roomNumber += 1) {
      const room = String(roomNumber);
      const roomReservations = reservations.filter((item) => String(item.room) === room);
      const departures = roomReservations.filter((item) => item.checkOutDate === today);
      const arrivals = roomReservations.filter((item) => item.checkInDate === today);
      const continuing = roomReservations.filter((item) => item.checkInDate < today && item.checkOutDate > today);
      const stillInsideDeparture = departures.find((item) => clock.minutes < checkoutMinutesForOperations(item));
      const nextReservation = roomReservations
        .filter((item) => item.checkInDate > today)
        .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate))[0] || null;
      const housekeeping = statusByRoom.get(room) || { status: "unknown" };
      const task = tasksByRoom.get(room) || null;
      const card = element("article", "concierge-admin-room-card");
      card.dataset.operationRoom = room;
      const head = element("div", "concierge-admin-room-card-head");
      head.appendChild(element("strong", "", `Room ${room}`));
      let state = "Vacant";
      let stateClass = "is-vacant";
      if (departures.length && arrivals.length) {
        state = "Turnover today";
        stateClass = "is-turnover";
      } else if (stillInsideDeparture) {
        state = "Checkout today";
        stateClass = "is-departure";
      } else if (arrivals.length) {
        state = "Arrival today";
        stateClass = "is-arrival";
      } else if (continuing.length) {
        state = "In-house";
        stateClass = "is-occupied";
      }
      head.appendChild(element("span", `concierge-admin-room-state ${stateClass}`, state));
      card.appendChild(head);

      const details = element("div", "concierge-admin-room-card-details");
      departures.forEach((item) => {
        const checkout = item.lateCheckoutTime || "11:00 AM";
        const late = Number(item.lateCheckoutMinutes || 0) > 660 ? ` · late checkout ${checkout}` : ` · checkout ${checkout}`;
        details.appendChild(element("span", "", `Departure: ${operationsProviderLabel(item.provider)}${operationsGuestLabel(item)}${late}`));
      });
      arrivals.forEach((item) => {
        details.appendChild(element("span", "", `Arrival: ${operationsProviderLabel(item.provider)}${operationsGuestLabel(item)}`));
      });
      if (!departures.length && !arrivals.length && continuing[0]) {
        const item = continuing[0];
        details.appendChild(element("span", "", `Current stay: ${operationsProviderLabel(item.provider)}${operationsGuestLabel(item)} · until ${item.checkOutDate}`));
      }
      if (!departures.length && !arrivals.length && !continuing.length && nextReservation) {
        details.appendChild(element("span", "", `Next arrival: ${nextReservation.checkInDate} · ${operationsProviderLabel(nextReservation.provider)}${operationsGuestLabel(nextReservation)}`));
      }
      if (!details.children.length) details.appendChild(element("span", "", "No confirmed stay today."));
      card.appendChild(details);

      const housekeepingRow = element("div", "concierge-admin-room-housekeeping");
      housekeepingRow.appendChild(element("span", `concierge-admin-housekeeping-state is-${String(housekeeping.status || "unknown")}`, `Housekeeping: ${String(housekeeping.status || "unknown").toUpperCase()}`));
      if (task) {
        const taskText = task.priority
          ? `Priority cleaning${task.requestedArrival ? ` · early arrival ${task.requestedArrival}` : ""}`
          : `Task: ${String(task.status || "pending").replaceAll("_", " ")}`;
        housekeepingRow.appendChild(element("span", "concierge-admin-room-task", taskText));
      }
      card.appendChild(housekeepingRow);
      card.appendChild(housekeepingStatusButtons(room, String(housekeeping.status || "unknown"), true));
      todayOperationsRooms.appendChild(card);
    }

    todayHousekeepingTasks.replaceChildren();
    if (!todayTasks.length) {
      todayHousekeepingTasks.appendChild(element("div", "concierge-admin-empty", "No housekeeping turnover tasks recorded for today."));
    } else {
      [...todayTasks].sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)) || Number(a.room) - Number(b.room)).forEach((item) => {
        const card = element("article", "concierge-admin-registration-item");
        card.append(
          element("strong", "", `Room ${item.room}${item.priority ? " · PRIORITY" : ""}`),
          element("span", "", `Checkout: ${item.checkoutTime || "11:00 AM"}`),
          element("span", "", item.requestedArrival ? `Requested early arrival: ${item.requestedArrival}` : "No early-arrival request recorded."),
          element("span", "", `Task status: ${String(item.status || "pending").replaceAll("_", " ")}`)
        );
        todayHousekeepingTasks.appendChild(card);
      });
    }

    const dateKeys = Array.from({ length: 14 }, (_, index) => addOperationsDays(today, index));
    const table = document.createElement("table");
    table.className = "concierge-admin-operations-calendar";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const roomHeader = element("th", "concierge-admin-calendar-room", "Room");
    roomHeader.scope = "col";
    headerRow.appendChild(roomHeader);
    dateKeys.forEach((dateKey) => {
      const th = element("th", dateKey === today ? "is-today" : "", operationsDateLabel(dateKey));
      th.scope = "col";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (let roomNumber = 1; roomNumber <= 11; roomNumber += 1) {
      const room = String(roomNumber);
      const roomReservations = reservations.filter((item) => String(item.room) === room);
      const tr = document.createElement("tr");
      const roomCell = element("th", "concierge-admin-calendar-room", `Room ${room}`);
      roomCell.scope = "row";
      tr.appendChild(roomCell);
      dateKeys.forEach((dateKey) => {
        const arrivals = roomReservations.filter((item) => item.checkInDate === dateKey);
        const departures = roomReservations.filter((item) => item.checkOutDate === dateKey);
        const occupying = roomReservations.filter((item) => item.checkInDate < dateKey && item.checkOutDate > dateKey);
        const cell = document.createElement("td");
        if (dateKey === today) cell.classList.add("is-today");
        if (departures.length && arrivals.length) cell.classList.add("is-turnover");
        else if (arrivals.length) cell.classList.add("is-arrival");
        else if (departures.length) cell.classList.add("is-departure");
        else if (occupying.length) cell.classList.add("is-stay");
        if (departures.length) {
          departures.forEach((item) => {
            const text = item.lateCheckoutTime ? `OUT ${item.lateCheckoutTime}` : "OUT";
            const tag = element("span", "concierge-admin-calendar-tag", text);
            tag.title = `${operationsProviderLabel(item.provider)}${operationsGuestLabel(item)} · checkout`;
            cell.appendChild(tag);
          });
        }
        if (arrivals.length) {
          arrivals.forEach((item) => {
            const tag = element("span", "concierge-admin-calendar-tag", "IN");
            tag.title = `${operationsProviderLabel(item.provider)}${operationsGuestLabel(item)} · arrival`;
            cell.appendChild(tag);
          });
        }
        if (!departures.length && !arrivals.length && occupying.length) {
          const tag = element("span", "concierge-admin-calendar-tag", "STAY");
          tag.title = occupying.map((item) => `${operationsProviderLabel(item.provider)}${operationsGuestLabel(item)}`).join(" / ");
          cell.appendChild(tag);
        }
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    operationsCalendar.replaceChildren(table);
  }

  function renderStayOperations(data = {}) {
    const reservations = data.reservations || [];
    const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    const nowMinutes = (Number(dateParts.hour) * 60) + Number(dateParts.minute);
    const active = reservations
      .filter((item) => item.checkInDate <= today && (item.checkOutDate > today || (item.checkOutDate === today && nowMinutes < 660)))
      .sort((a, b) => a.checkOutDate.localeCompare(b.checkOutDate));
    const upcoming = reservations
      .filter((item) => item.checkInDate > today)
      .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));

    const appendReservation = (container, item, isActive = false) => {
      const card = element("article", "concierge-admin-registration-item");
      card.dataset.reservationId = item.id || "";
      const registrationDetail = item.guestType === "foreign"
        ? item.registrationStatus === "in_person_pending"
          ? `In-person handover requested for all ${item.requiredPassports || 0} non-Thai overnight guests`
          : item.registrationStatus === "in_person_complete"
            ? `In-person passport check and TM30 registration confirmed complete`
            : `${item.receivedPassports || 0} of ${item.requiredPassports || 0} non-Thai guest passports received`
        : item.guestType === "thai" ? "All overnight guests declared Thai" : "Nationality declaration not completed";
      const sourceDetail = item.provider === "direct"
        ? "Source: direct booking or walk-in"
        : item.provider === "manual"
          ? `Source: manually added Airbnb reservation · listing ${item.listingId}`
          : `Source: synchronized Airbnb reservation · listing ${item.listingId}`;
      card.append(
        element("strong", "", `Room ${item.room}`),
        element("span", "", `${item.checkInDate} to ${item.checkOutDate}`),
        element("span", "", sourceDetail),
        element("span", "", `Guest registration: ${String(item.registrationStatus || "not_started").replaceAll("_", " ")}`),
        element("span", "", registrationDetail),
        element("span", "", `Status: ${item.status} · updated ${bangkokDate(item.updatedAt)}`)
      );
      if (["direct", "manual"].includes(item.provider) && item.id) {
        const actions = element("div", "concierge-admin-card-actions");
        if (item.provider === "direct") {
          const newCode = element("button", "secondary", "Generate new stay code");
          newCode.type = "button";
          newCode.dataset.directCodeAction = "generate";
          actions.appendChild(newCode);
        }
        const removeStay = element("button", "danger", "Delete manually added stay");
        removeStay.type = "button";
        removeStay.dataset.stayDeleteAction = "delete";
        actions.appendChild(removeStay);
        card.appendChild(actions);
      }
      if (isActive && item.id) {
        const nextCheckout = new Date(`${item.checkOutDate}T00:00:00Z`);
        nextCheckout.setUTCDate(nextCheckout.getUTCDate() + 1);
        const extension = element("div", "concierge-admin-extension");
        const label = element("label", "", "New checkout date");
        const input = document.createElement("input");
        input.type = "date";
        input.min = nextCheckout.toISOString().slice(0, 10);
        input.value = input.min;
        input.dataset.extensionDate = "";
        const button = element("button", "", "Extend stay");
        button.type = "button";
        button.dataset.extensionAction = "extend";
        label.appendChild(input);
        extension.append(label, button);
        card.appendChild(extension);
      }
      if (
        item.id &&
        !["passport_complete", "in_person_pending", "in_person_complete"].includes(item.registrationStatus)
      ) {
        const actions = element("div", "concierge-admin-card-actions");
        const startInPerson = element("button", "secondary", "Use in-person registration");
        startInPerson.type = "button";
        startInPerson.dataset.inPersonAction = "start";
        startInPerson.dataset.currentPassportCount = Number(item.requiredPassports) > 0 ? String(item.requiredPassports) : "1";
        actions.appendChild(startInPerson);
        card.appendChild(actions);
      }
      if (item.registrationStatus === "in_person_pending" && item.id) {
        const actions = element("div", "concierge-admin-card-actions");
        const complete = element("button", "secondary", "Confirm in-person registration complete");
        complete.type = "button";
        complete.dataset.inPersonAction = "complete";
        const reset = element("button", "secondary", "Reset guest registration");
        reset.type = "button";
        reset.dataset.inPersonAction = "reset";
        actions.append(complete, reset);
        card.appendChild(actions);
      }
      container.appendChild(card);
    };

    activeStayReservations.replaceChildren();
    if (!active.length) activeStayReservations.appendChild(element("div", "concierge-admin-empty", "No active stays today."));
    active.forEach((item) => appendReservation(activeStayReservations, item, true));

    upcomingStayReservations.replaceChildren();
    if (!upcoming.length) upcomingStayReservations.appendChild(element("div", "concierge-admin-empty", "No upcoming synchronized stays."));
    upcoming.forEach((item) => appendReservation(upcomingStayReservations, item));

    roomHousekeepingStatuses.replaceChildren();
    (data.housekeepingStatuses || []).forEach((item) => {
      const card = element("article", "concierge-admin-registration-item");
      card.dataset.housekeepingRoom = item.room;
      card.append(
        element("strong", "", `Room ${item.room}`),
        element("span", "", `Housekeeping: ${String(item.status || "unknown").toUpperCase()}`),
        element("span", "", item.updatedAt ? `Updated ${bangkokDate(item.updatedAt)}` : "No housekeeping status recorded yet")
      );
      card.appendChild(housekeepingStatusButtons(item.room, item.status));
      roomHousekeepingStatuses.appendChild(card);
    });

    keyRotations.replaceChildren();
    const rotations = data.rotations || [];
    if (!rotations.length) keyRotations.appendChild(element("div", "concierge-admin-empty", "No key-box rotation is currently required."));
    rotations.forEach((item) => {
      const card = element("article", "concierge-admin-registration-item");
      card.dataset.rotationRoom = item.room;
      card.append(
        element("strong", "", `Room ${item.room}`),
        element("span", "", item.lastReleasedAt
          ? `Spare-key code released: ${bangkokDate(item.lastReleasedAt)}`
          : `Lost-key release is being processed: ${bangkokDate(item.updatedAt)}`),
        element("span", "", "Choose the truthful reset path below. Normal guest exposure requires physical rotation; only a controlled owner test may retain the current code.")
      );
      const actions = element("div", "concierge-admin-card-actions");
      const rotated = element("button", "danger", "Physical key-box code rotated");
      rotated.type = "button";
      rotated.dataset.rotationAction = "physical_rotation";
      const controlled = element("button", "secondary", "Controlled admin test — keep existing code");
      controlled.type = "button";
      controlled.dataset.rotationAction = "controlled_test";
      actions.append(rotated, controlled);
      card.appendChild(actions);
      keyRotations.appendChild(card);
    });

    keyRotationActivity.replaceChildren();
    const rotationActivity = data.rotationActivity || [];
    if (!rotationActivity.length) keyRotationActivity.appendChild(element("div", "concierge-admin-empty", "No key-box reset activity recorded yet."));
    rotationActivity.forEach((item) => {
      const card = element("article", "concierge-admin-registration-item");
      card.dataset.rotationActivityId = item.id;
      const description = item.eventType === "rotation_cleared_controlled_test"
        ? "Rotation lock cleared — controlled owner test; existing physical code retained."
        : "Rotation lock cleared — physical key-box code rotated.";
      card.append(
        element("strong", "", `Room ${item.room}`),
        element("span", "", description),
        element("span", "", bangkokDate(item.createdAt))
      );
      const actions = element("div", "concierge-admin-card-actions");
      const remove = element("button", "danger", "Delete");
      remove.type = "button";
      remove.dataset.rotationActivityDelete = "";
      actions.appendChild(remove);
      card.appendChild(actions);
      keyRotationActivity.appendChild(card);
    });
  }

  function field(labelText, control, full = false) {
    const wrapper = element("div", `concierge-admin-field${full ? " full" : ""}`);
    const label = element("label", "", labelText);
    if (control.id) label.htmlFor = control.id;
    wrapper.append(label, control);
    return wrapper;
  }

  function queueCard(item) {
    const card = element("article", "concierge-admin-card");
    card.dataset.queueId = item.id;
    const head = element("div", "concierge-admin-card-head");
    head.appendChild(element("h3", "", item.sampleQuestion));
    const meta = element("div", "concierge-admin-card-meta");
    meta.append(
      element("span", "concierge-admin-pill", `${item.occurrences} occurrence${item.occurrences === 1 ? "" : "s"}`),
      element("span", "concierge-admin-pill", `${item.negativeFeedback} negative rating${item.negativeFeedback === 1 ? "" : "s"}`)
    );
    head.appendChild(meta);

    const fields = element("div", "concierge-admin-fields");
    const question = document.createElement("input");
    question.id = `question-${item.id}`;
    question.value = item.sampleQuestion || "";
    question.dataset.reviewField = "questionPattern";
    const intent = document.createElement("input");
    intent.id = `intent-${item.id}`;
    intent.value = item.proposedIntent === "fallback" ? "owner_approved" : (item.proposedIntent || "owner_approved");
    intent.dataset.reviewField = "intentId";
    const category = document.createElement("select");
    category.id = `category-${item.id}`;
    category.dataset.reviewField = "category";
    categories.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      option.selected = name === item.proposedCategory;
      category.appendChild(option);
    });
    const answer = document.createElement("textarea");
    answer.id = `answer-${item.id}`;
    answer.value = item.proposedAnswer || "";
    answer.dataset.reviewField = "answer";
    fields.append(
      field("Guest question or matching phrase", question, true),
      field("Intent identifier", intent),
      field("Category", category),
      field("Approved answer", answer, true)
    );

    const actions = element("div", "concierge-admin-card-actions");
    const approveButton = element("button", "", "Approve and activate");
    approveButton.type = "button";
    approveButton.dataset.reviewAction = "approved";
    const rejectButton = element("button", "danger", "Reject");
    rejectButton.type = "button";
    rejectButton.dataset.reviewAction = "rejected";
    actions.append(approveButton, rejectButton);
    card.append(head, fields, actions);
    return card;
  }

  function renderQueue(items) {
    queue.replaceChildren();
    if (!items.length) {
      queue.appendChild(element("div", "concierge-admin-empty", "Nothing is waiting for review."));
      return;
    }
    items.forEach((item) => queue.appendChild(queueCard(item)));
  }

  function renderApproved(items) {
    approved.replaceChildren();
    if (!items.length) {
      approved.appendChild(element("div", "concierge-admin-empty", "No owner-approved additions yet."));
      return;
    }
    items.forEach((item) => {
      const row = element("article", "concierge-admin-approved-item");
      const copy = element("div");
      copy.append(element("strong", "", item.questionPattern), element("span", "", item.answer));
      const deactivate = element("button", "danger", "Deactivate");
      deactivate.type = "button";
      deactivate.dataset.approvedId = item.id;
      row.append(copy, deactivate);
      approved.appendChild(row);
    });
  }

  function renderRecent(items) {
    recent.replaceChildren();
    items.forEach((item) => {
      const row = document.createElement("tr");
      const time = element("td", "", new Date(item.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" }));
      const room = element("td", "", item.room ? `Room ${item.room}` : "—");
      const question = element("td", "", item.question);
      const result = element("td", "concierge-admin-result", `${item.source} · ${Math.round(Number(item.confidence || 0) * 100)}%`);
      time.dataset.label = "Time";
      room.dataset.label = "Room";
      question.dataset.label = "Question";
      result.dataset.label = "Result";
      row.append(time, room, question, result);
      recent.appendChild(row);
    });
  }

  function currentPropertyDateParts() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: expenseTimeZone, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { date: `${values.year}-${values.month}-${values.day}`, month: `${values.year}-${values.month}` };
  }

  function formatExpenseAmount(value) {
    return new Intl.NumberFormat("en", { style: "currency", currency: expenseCurrency, maximumFractionDigits: expenseMinorUnitDigits }).format(Number(value) || 0);
  }

  function resetExpenseForm({ keepReceipt = false } = {}) {
    const file = keepReceipt ? expenseReceipt.files?.[0] : null;
    expenseEditingRecord = null;
    expenseForm.reset();
    expenseReceipt.disabled = false;
    expenseAnalyze.disabled = false;
    expenseClearReceipt.disabled = false;
    document.getElementById("expenseSave").textContent = "Save expense";
    expenseReset.textContent = "Clear form";
    document.getElementById("expenseDate").value = currentPropertyDateParts().date;
    if (!keepReceipt) expenseAnalysisStatus.textContent = "Upload is optional. You can also enter an expense manually.";
    if (file) expenseAnalysisStatus.textContent = `Receipt selected: ${file.name}`;
  }

  function startExpenseEdit(id) {
    const item = expenseRecords.find((record) => record.id === id);
    if (!item) return;
    expenseEditingRecord = item;
    expenseReceipt.value = "";
    expenseReceipt.disabled = true;
    expenseAnalyze.disabled = true;
    expenseClearReceipt.disabled = true;
    document.getElementById("expenseDate").value = item.expenseDate || "";
    document.getElementById("expenseAmount").value = Number(item.amount) > 0 ? String(item.amount) : "";
    document.getElementById("expenseCategory").value = item.category || "";
    document.getElementById("expenseVendor").value = item.vendor || "";
    document.getElementById("expenseDescription").value = item.description || "";
    document.getElementById("expensePaymentMethod").value = item.paymentMethod || "";
    document.getElementById("expenseRoomArea").value = item.roomArea || "";
    document.getElementById("expenseNotes").value = item.notes || "";
    document.getElementById("expenseSave").textContent = "Save changes";
    expenseReset.textContent = "Cancel edit";
    expenseAnalysisStatus.textContent = item.hasReceipt
      ? "Editing saved expense. The original receipt stays attached and will not be changed."
      : "Editing saved expense. This record has no receipt attachment.";
    expenseForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderExpenseSummary(totals = {}) {
    const summaryCards = [
      [formatExpenseAmount(totals.amount), "Month total"],
      [String(Number(totals.entries) || 0), "Saved expenses"],
      [String(Number(totals.receipts) || 0), "Receipts attached"]
    ].map(([value, label]) => {
      const card = element("article", "concierge-admin-expense-stat");
      card.append(element("strong", "", value), element("span", "", label));
      return card;
    });
    expenseSummary.replaceChildren(...summaryCards);
    const categories = totals.categories || {};
    const entries = Object.entries(categories).filter(([, value]) => Number(value) > 0).sort((a, b) => Number(b[1]) - Number(a[1]));
    expenseCategorySummary.replaceChildren();
    entries.forEach(([category, value]) => expenseCategorySummary.appendChild(element("span", "", `${category}: ${formatExpenseAmount(value)}`)));
  }

  function renderExpenses(records = []) {
    expenseRecords = records.map((item) => ({ ...item }));
    expenseEntries.replaceChildren();
    expenseEntries.dataset.count = String(records.length);
    updateFinanceSectionCount();
    if (!records.length) {
      expenseEntries.appendChild(element("div", "concierge-admin-empty", "No expenses recorded for this month."));
      return;
    }
    records.forEach((item) => {
      const card = element("article", "concierge-admin-expense-item");
      card.dataset.expenseId = item.id;
      const head = element("div", "concierge-admin-expense-item-head");
      const copy = element("div");
      copy.append(
        element("strong", "", `${item.expenseDate} · ${item.category}`),
        element("p", "concierge-admin-expense-description", item.description || "Expense")
      );
      head.append(copy, element("span", "concierge-admin-expense-amount", formatExpenseAmount(item.amount)));
      const meta = element("div", "concierge-admin-expense-meta");
      if (item.vendor) meta.appendChild(element("span", "", item.vendor));
      if (item.paymentMethod) meta.appendChild(element("span", "", item.paymentMethod));
      if (item.roomArea) meta.appendChild(element("span", "", item.roomArea));
      if (item.notes) meta.appendChild(element("span", "", item.notes));
      meta.appendChild(element("span", "", item.hasReceipt ? "Receipt attached" : "No receipt"));
      const actions = element("div", "concierge-admin-card-actions");
      const edit = element("button", "secondary", "Edit expense");
      edit.type = "button";
      edit.dataset.expenseEditId = item.id;
      actions.appendChild(edit);
      if (item.hasReceipt) {
        const receipt = element("button", "secondary", "Download receipt");
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

  function applyExpenseConfiguration(configuration = {}) {
    expenseCurrency = /^[A-Z]{3}$/.test(String(configuration.currency || "")) ? configuration.currency : "THB";
    expenseTimeZone = String(configuration.timeZone || "Asia/Bangkok");
    expenseCategories = Array.isArray(configuration.categories) ? configuration.categories : [];
    expenseMinorUnitDigits = Math.max(0, Math.min(3, Number(configuration.minorUnitDigits) || 0));
    const amountInput = document.getElementById("expenseAmount");
    const minimumAmount = expenseMinorUnitDigits > 0 ? 1 / (10 ** expenseMinorUnitDigits) : 1;
    amountInput.step = String(minimumAmount);
    amountInput.min = String(minimumAmount);
    document.getElementById("expenseAmountLabel").textContent = `Amount (${expenseCurrency})`;
    const select = document.getElementById("expenseCategory");
    const current = select.value;
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select category";
    select.appendChild(placeholder);
    expenseCategories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
    if (expenseCategories.includes(current)) select.value = current;
  }

  function updateFinanceSectionCount() {
    setAdminSectionCount("finance", Number(expenseEntries?.dataset.count || 0) + Number(incomeEntries?.dataset.count || 0));
  }

  function resetIncomeForm() {
    incomeForm.reset();
    document.getElementById("incomeDate").value = currentPropertyDateParts().date;
    document.getElementById("incomeFees").value = "0";
    updateIncomeNetPreview();
  }

  function updateIncomeNetPreview() {
    const gross = Math.max(0, Number(document.getElementById("incomeGross").value) || 0);
    const fees = Math.max(0, Number(document.getElementById("incomeFees").value) || 0);
    document.getElementById("incomeNet").value = formatExpenseAmount(Math.max(0, gross - fees));
  }

  function applyIncomeConfiguration(configuration = {}) {
    if (/^[A-Z]{3}$/.test(String(configuration.currency || ""))) expenseCurrency = configuration.currency;
    if (configuration.timeZone) expenseTimeZone = String(configuration.timeZone);
    if (Number.isFinite(Number(configuration.minorUnitDigits))) expenseMinorUnitDigits = Math.max(0, Math.min(3, Number(configuration.minorUnitDigits) || 0));
    incomeCategories = Array.isArray(configuration.categories) ? configuration.categories : [];
    const step = expenseMinorUnitDigits > 0 ? 1 / (10 ** expenseMinorUnitDigits) : 1;
    ["incomeGross", "incomeFees"].forEach((id) => {
      const input = document.getElementById(id);
      input.step = String(step);
      input.min = id === "incomeGross" ? String(step) : "0";
    });
    document.getElementById("incomeGrossLabel").textContent = `Gross income (${expenseCurrency})`;
    document.getElementById("incomeFeesLabel").textContent = `Fees / commission (${expenseCurrency})`;
    const select = document.getElementById("incomeCategory");
    const current = select.value;
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select source";
    select.appendChild(placeholder);
    incomeCategories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
    if (incomeCategories.includes(current)) select.value = current;
    updateIncomeNetPreview();
  }

  function renderFinanceSummary(totals = {}) {
    const result = Number(totals.operatingResult) || 0;
    const cards = [
      [formatExpenseAmount(totals.netIncome), "Net income"],
      [formatExpenseAmount(totals.expenses), "Expenses"],
      [formatExpenseAmount(result), "Operating result"],
      [String(Number(totals.entries) || 0), "Saved finance entries"]
    ].map(([value, label]) => {
      const card = element("article", "concierge-admin-expense-stat");
      card.append(element("strong", "", value), element("span", "", label));
      return card;
    });
    financeSummary.replaceChildren(...cards);
    financeLocationSummary.replaceChildren();
    Object.entries(totals.locations || {})
      .filter(([name, values]) => name !== "Unassigned" && (Number(values.netIncome) || Number(values.expenses)))
      .sort((a, b) => Math.abs(Number(b[1].operatingResult) || 0) - Math.abs(Number(a[1].operatingResult) || 0))
      .forEach(([name, values]) => {
        financeLocationSummary.appendChild(element("span", "", `${name}: income ${formatExpenseAmount(values.netIncome)} · expenses ${formatExpenseAmount(values.expenses)} · result ${formatExpenseAmount(values.operatingResult)}`));
      });
  }

  function renderIncome(records = []) {
    incomeEntries.replaceChildren();
    incomeEntries.dataset.count = String(records.length);
    updateFinanceSectionCount();
    if (!records.length) {
      incomeEntries.appendChild(element("div", "concierge-admin-empty", "No income recorded for this month."));
      return;
    }
    records.forEach((item) => {
      const card = element("article", "concierge-admin-expense-item");
      card.dataset.incomeId = item.id;
      const head = element("div", "concierge-admin-expense-item-head");
      const copy = element("div");
      copy.append(
        element("strong", "", `${item.incomeDate} · ${item.category}`),
        element("p", "concierge-admin-expense-description", item.description || "Income")
      );
      head.append(copy, element("span", "concierge-admin-expense-amount", formatExpenseAmount(item.net)));
      const meta = element("div", "concierge-admin-expense-meta");
      meta.appendChild(element("span", "", `Gross ${formatExpenseAmount(item.gross)}`));
      if (Number(item.fees) > 0) meta.appendChild(element("span", "", `Fees ${formatExpenseAmount(item.fees)}`));
      if (item.unit) meta.appendChild(element("span", "", item.unit));
      if (item.paymentMethod) meta.appendChild(element("span", "", item.paymentMethod));
      if (item.reference) meta.appendChild(element("span", "", `Ref: ${item.reference}`));
      if (item.notes) meta.appendChild(element("span", "", item.notes));
      const actions = element("div", "concierge-admin-card-actions");
      const remove = element("button", "danger", "Delete income");
      remove.type = "button";
      remove.dataset.incomeDeleteId = item.id;
      actions.appendChild(remove);
      card.append(head, meta, actions);
      incomeEntries.appendChild(card);
    });
  }

  async function loadExpenses() {
    if (!expenseMonth.value) expenseMonth.value = currentPropertyDateParts().month;
    const data = await api(`/api/concierge/admin/expenses?month=${encodeURIComponent(expenseMonth.value)}`);
    applyExpenseConfiguration(data.configuration || {});
    renderExpenseSummary(data.totals || {});
    renderExpenses(data.records || []);
  }

  async function loadFinance() {
    if (!expenseMonth.value) expenseMonth.value = currentPropertyDateParts().month;
    const [financeData] = await Promise.all([
      api(`/api/concierge/admin/finance?month=${encodeURIComponent(expenseMonth.value)}`),
      loadExpenses()
    ]);
    applyIncomeConfiguration(financeData.configuration || {});
    renderFinanceSummary(financeData.totals || {});
    renderIncome(financeData.income || []);
  }

  function fillExpenseDraft(draft = {}) {
    if (draft.date) document.getElementById("expenseDate").value = draft.date;
    document.getElementById("expenseAmount").value = Number(draft.amount) > 0 ? String(draft.amount) : "";
    document.getElementById("expenseCategory").value = draft.category || "Other";
    document.getElementById("expenseVendor").value = draft.vendor || "";
    document.getElementById("expenseDescription").value = draft.description || "";
    document.getElementById("expensePaymentMethod").value = draft.paymentMethod || "";
    document.getElementById("expenseRoomArea").value = draft.roomArea || "";
    document.getElementById("expenseNotes").value = draft.notes || "";
  }

  function expenseFormData(confirmDuplicate = false) {
    const form = new FormData();
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

  function expenseEditPayload(confirmDuplicate = false) {
    return {
      id: expenseEditingRecord?.id || "",
      date: document.getElementById("expenseDate").value,
      amount: document.getElementById("expenseAmount").value,
      category: document.getElementById("expenseCategory").value,
      vendor: document.getElementById("expenseVendor").value,
      description: document.getElementById("expenseDescription").value,
      paymentMethod: document.getElementById("expensePaymentMethod").value,
      roomArea: document.getElementById("expenseRoomArea").value,
      notes: document.getElementById("expenseNotes").value,
      confirmDuplicate
    };
  }

  function showPortalChooser() {
    workspace.hidden = true;
    login.hidden = true;
    portalChooser.hidden = false;
  }

  function showHouseLogin() {
    portalChooser.hidden = true;
    workspace.hidden = true;
    login.hidden = false;
    tokenInput.focus();
  }

  async function loadOverview() {
    const data = await api("/api/concierge/admin/overview");
    renderStats(data.totals || {});
    renderQueue(data.queue || []);
    renderApproved(data.approved || []);
    renderPendingRegistrations(data.pendingRegistrations || []);
    renderPassportUploads(data.passportUploads || []);
    renderMaintenanceReports(data.maintenanceReports || []);
    renderAlerts(data.alerts || [], data.alertConfiguration || {}, data.deliveryDiagnostics || []);
    renderWhatsAppDeliveryDiagnostics(data.deliveryDiagnostics || [], data.alerts || []);
    renderOperationsDashboard(data.stayOperations || {});
    renderStayOperations(data.stayOperations || {});
    renderIntegrations(data.integrations || {});
    renderRecent(data.recent || []);
    updateAdminSectionSummaries(data);
    await loadFinance();
    portalChooser.hidden = true;
    login.hidden = true;
    workspace.hidden = false;
  }

  async function loginWith(value) {
    token = String(value || "").trim();
    if (!token) return;
    loginStatus.textContent = "Checking access…";
    try {
      await loadOverview();
      window.sessionStorage.setItem(tokenKey, token);
      tokenInput.value = "";
      loginStatus.textContent = "The token is kept only in this browser tab.";
    } catch (error) {
      token = "";
      window.sessionStorage.removeItem(tokenKey);
      showHouseLogin();
      loginStatus.textContent = error.status === 401 ? "That access token is not valid." : "The review service is not available yet.";
    }
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginWith(tokenInput.value);
  });

  houseAdminChoice.addEventListener("click", () => {
    showHouseLogin();
    const storedToken = window.sessionStorage.getItem(tokenKey);
    if (storedToken) loginWith(storedToken);
  });

  backAdminChoice.addEventListener("click", showPortalChooser);
  adminPortalSwitch?.addEventListener("click", showPortalChooser);

  expandAdminSections?.addEventListener("click", () => {
    adminSections.forEach((section) => setAdminSectionOpen(section, true, false));
    persistAdminSectionState();
  });

  collapseAdminSections?.addEventListener("click", () => {
    adminSections.forEach((section) => {
      if (!section.classList.contains("has-urgent")) setAdminSectionOpen(section, false, false);
    });
    persistAdminSectionState();
  });

  passportLinkForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = passportLinkForm.querySelector("button[type='submit']");
    const arrivalValue = document.getElementById("passportArrival").value;
    submit.disabled = true;
    try {
      const data = await api("/api/concierge/admin/passport-links", {
        method: "POST",
        body: JSON.stringify({
          room: document.getElementById("passportRoom").value,
          arrivalAt: arrivalValue ? `${arrivalValue}:00+07:00` : "",
          expiresHours: Number(document.getElementById("passportExpiry").value),
          nonThaiConfirmed: document.getElementById("passportNonThai").checked
        })
      });
      document.getElementById("passportReminderMessage").value = data.reminderMessage;
      document.getElementById("passportUploadUrl").value = data.welcomeUrl;
      passportLinkResult.dataset.registrationId = data.id;
      passportLinkResult.hidden = false;
      document.getElementById("passportNonThai").checked = false;
      await loadOverview();
    } catch (error) {
      window.alert(error.message === "passport_upload_unavailable"
        ? "Private passport storage must be configured before links can be created."
        : "The secure request could not be created.");
    } finally {
      submit.disabled = false;
    }
  });

  manualStayForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = manualStayForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await api("/api/concierge/admin/stays", {
        method: "POST",
        body: JSON.stringify({
          room: document.getElementById("manualStayRoom").value,
          confirmationCode: document.getElementById("manualStayCode").value,
          checkInDate: document.getElementById("manualStayCheckIn").value,
          checkOutDate: document.getElementById("manualStayCheckOut").value
        })
      });
      manualStayForm.reset();
      await loadOverview();
    } catch (_error) {
      window.alert("The missing Airbnb reservation could not be saved. Check the room, code and dates.");
    } finally {
      submit.disabled = false;
    }
  });

  directStayForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = directStayForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    directStayResult.hidden = true;
    try {
      const data = await api("/api/concierge/admin/direct-stays", {
        method: "POST",
        body: JSON.stringify({
          room: document.getElementById("directStayRoom").value,
          checkInDate: document.getElementById("directStayCheckIn").value,
          checkOutDate: document.getElementById("directStayCheckOut").value
        })
      });
      directStayCodeResult.value = data.confirmationCode;
      directStayUrlResult.value = data.welcomeUrl;
      directStayResult.hidden = false;
      directStayForm.reset();
      await loadOverview();
    } catch (error) {
      window.alert(error.message === "room_date_conflict"
        ? "This room already has a confirmed stay that overlaps those dates. Delete or correct the existing manually added stay first."
        : "The direct stay could not be created. Check the room and dates.");
    } finally {
      submit.disabled = false;
    }
  });

  document.getElementById("copyDirectStayMessage").addEventListener("click", async () => {
    const message = `Welcome to The House – Koh Tao.\n\nOpen your private Room page:\n${directStayUrlResult.value}\n\nYour private House stay code is: ${directStayCodeResult.value}\n\nKeep this code private. Foreign or mixed groups must complete the secure passport registration for every non-Thai overnight guest.`;
    try {
      await navigator.clipboard.writeText(message);
      window.alert("The guest access message was copied.");
    } catch (_error) {
      window.alert("Copy was not available. Select and copy the code and link above.");
    }
  });

  async function stayOperationAction(event) {
    const button = event.target.closest("[data-extension-action],[data-in-person-action],[data-direct-code-action],[data-stay-delete-action]");
    if (!button) return;
    const card = button.closest("[data-reservation-id]");
    if (button.dataset.stayDeleteAction) {
      if (!card?.dataset.reservationId) return;
      if (!window.confirm("Delete this manually added stay? Guest access for this stay will stop immediately. Synchronized Airbnb stays cannot be deleted here.")) return;
      button.disabled = true;
      try {
        await api("/api/concierge/admin/manual-stay-delete", {
          method: "POST",
          body: JSON.stringify({ reservationId: card.dataset.reservationId, confirmed: true })
        });
        await loadOverview();
      } catch (_error) {
        button.disabled = false;
        window.alert("This manually added stay could not be deleted.");
      }
      return;
    }
    if (button.dataset.directCodeAction) {
      if (!card?.dataset.reservationId) return;
      if (!window.confirm("Generate a new private stay code for this direct stay? The previous code will stop working. Existing verified guest access will remain active.")) return;
      button.disabled = true;
      try {
        const data = await api("/api/concierge/admin/direct-stay-code", {
          method: "POST",
          body: JSON.stringify({ reservationId: card.dataset.reservationId, confirmed: true })
        });
        directStayCodeResult.value = data.confirmationCode;
        directStayUrlResult.value = data.welcomeUrl;
        directStayResult.hidden = false;
        directStayResult.scrollIntoView({ behavior: "smooth", block: "center" });
        await loadOverview();
      } catch (_error) {
        button.disabled = false;
        window.alert("A new stay code could not be generated.");
      }
      return;
    }
    if (button.dataset.inPersonAction) {
      if (!card?.dataset.reservationId) return;
      if (button.dataset.inPersonAction === "start") {
        const currentCount = button.dataset.currentPassportCount || "1";
        const countValue = window.prompt("Number of non-Thai overnight guests whose original passports will be checked in person (1–10):", currentCount);
        if (countValue === null) return;
        const nonThaiGuestCount = Number(String(countValue).trim());
        if (!Number.isInteger(nonThaiGuestCount) || nonThaiGuestCount < 1 || nonThaiGuestCount > 10) {
          window.alert("Enter a whole number from 1 to 10.");
          return;
        }
        if (!window.confirm(`Use the staff-only in-person registration exception for ${nonThaiGuestCount} non-Thai overnight guest${nonThaiGuestCount === 1 ? "" : "s"}? Continue only when the guest cannot or will not use secure passport upload and the original passports will be checked in person.`)) return;
        button.disabled = true;
        try {
          await api("/api/concierge/admin/in-person-registration/start", {
            method: "POST",
            body: JSON.stringify({ reservationId: card.dataset.reservationId, nonThaiGuestCount, confirmed: true })
          });
          await loadOverview();
        } catch (_error) {
          button.disabled = false;
          window.alert("The in-person registration exception could not be started.");
        }
        return;
      }
      if (button.dataset.inPersonAction === "reset") {
        if (!window.confirm("Reset this pending in-person registration? The guest will need to choose the registration option again. Continue?")) return;
        button.disabled = true;
        try {
          await api("/api/concierge/admin/registration-reset", {
            method: "POST",
            body: JSON.stringify({ reservationId: card.dataset.reservationId, confirmed: true })
          });
          await loadOverview();
        } catch (_error) {
          button.disabled = false;
          window.alert("The guest registration could not be reset.");
        }
        return;
      }
      if (!window.confirm("Confirm only after every required non-Thai overnight guest passport has been checked in person and the TM30 registration has been completed. Continue?")) return;
      button.disabled = true;
      try {
        await api("/api/concierge/admin/in-person-registration", {
          method: "POST",
          body: JSON.stringify({ reservationId: card.dataset.reservationId, registrationCompleted: true })
        });
        await loadOverview();
      } catch (_error) {
        button.disabled = false;
        window.alert("The in-person registration could not be confirmed.");
      }
      return;
    }
    const checkOutDate = card?.querySelector("[data-extension-date]")?.value || "";
    if (!card?.dataset.reservationId || !checkOutDate) return;
    if (!window.confirm(`Extend this stay until checkout on ${checkOutDate}?`)) return;
    button.disabled = true;
    try {
      await api("/api/concierge/admin/stay-extension", {
        method: "POST",
        body: JSON.stringify({ reservationId: card.dataset.reservationId, checkOutDate })
      });
      await loadOverview();
    } catch (error) {
      button.disabled = false;
      window.alert(error.message === "room_date_conflict"
        ? "This stay cannot be extended because another confirmed stay already uses this room during those dates."
        : "The stay could not be extended. Choose a date after the current checkout date.");
    }
  }

  activeStayReservations.addEventListener("click", stayOperationAction);
  upcomingStayReservations.addEventListener("click", stayOperationAction);

  async function housekeepingStatusAction(event) {
    const button = event.target.closest("[data-housekeeping-status]");
    if (!button) return;
    const card = button.closest("[data-housekeeping-room]");
    if (!card?.dataset.housekeepingRoom) return;
    const buttons = [...card.querySelectorAll("[data-housekeeping-status]")];
    buttons.forEach((item) => { item.disabled = true; });
    try {
      await api("/api/concierge/admin/housekeeping-status", {
        method: "POST",
        body: JSON.stringify({ room: card.dataset.housekeepingRoom, status: button.dataset.housekeepingStatus })
      });
      await loadOverview();
    } catch (_error) {
      buttons.forEach((item) => { item.disabled = false; });
      window.alert("The room housekeeping status could not be updated.");
    }
  }

  roomHousekeepingStatuses.addEventListener("click", housekeepingStatusAction);
  todayOperationsRooms.addEventListener("click", housekeepingStatusAction);

  keyRotations.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-rotation-action]");
    if (!button) return;
    const card = button.closest("[data-rotation-room]");
    const controlledTest = button.dataset.rotationAction === "controlled_test";
    const confirmationPhrase = controlledTest ? "KEEP EXISTING CODE" : "CODE ROTATED";
    const prompt = controlledTest
      ? `Room ${card.dataset.rotationRoom}: confirm this was a controlled administrative test, no guest or unauthorized person saw the key-box code, and you intentionally choose to retain the current physical code. Type ${confirmationPhrase} to clear the lock.`
      : `Room ${card.dataset.rotationRoom}: first change the physical key-box code, update SPARE_KEY_CODES and deploy it. Type ${confirmationPhrase} only after all three steps are complete.`;
    if (window.prompt(prompt) !== confirmationPhrase) return;
    const buttons = [...card.querySelectorAll("[data-rotation-action]")];
    buttons.forEach((item) => { item.disabled = true; });
    try {
      await api("/api/concierge/admin/spare-key-rotation", {
        method: "POST",
        body: JSON.stringify({
          room: card.dataset.rotationRoom,
          resetMode: button.dataset.rotationAction,
          confirmed: true,
          confirmation: confirmationPhrase
        })
      });
      await loadOverview();
    } catch (_error) {
      buttons.forEach((item) => { item.disabled = false; });
      window.alert("The key-box reset confirmation could not be saved. The rotation lock remains active.");
    }
  });

  keyRotationActivity.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-rotation-activity-delete]");
    if (!button) return;
    const card = button.closest("[data-rotation-activity-id]");
    const eventId = card?.dataset.rotationActivityId || "";
    if (!eventId) return;
    const confirmed = await confirmAdminAction({
      title: "Delete key-box reset activity?",
      message: "This removes only this admin activity-history entry. It does not change the current key-box code or rotation-lock state.",
      confirmLabel: "Delete",
      danger: true
    });
    if (!confirmed) return;
    button.disabled = true;
    try {
      await api("/api/concierge/admin/spare-key-rotation-activity/delete", {
        method: "POST",
        body: JSON.stringify({ eventId, confirmed: true })
      });
      await loadOverview();
    } catch (_error) {
      button.disabled = false;
      window.alert("The key-box reset activity could not be deleted.");
    }
  });

  passportLinkResult.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-target]");
    if (!button) return;
    const control = document.getElementById(button.dataset.copyTarget);
    try {
      await navigator.clipboard.writeText(control.value);
    } catch (_error) {
      control.select();
      document.execCommand("copy");
    }
    const label = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => { button.textContent = label; }, 1400);
  });

  async function passportAction(event) {
    const button = event.target.closest("[data-passport-action]");
    if (!button) return;
    const card = button.closest("[data-registration-id]");
    const id = card.dataset.registrationId;
    button.disabled = true;
    try {
      if (button.dataset.passportAction === "download") {
        const response = await authorizedFetch(`/api/concierge/admin/passport-files/${id}`);
        if (!response.ok) throw new Error("download_failed");
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
        const contentDisposition = response.headers.get("content-disposition") || "";
        const isThaiId = contentDisposition.includes("thai-id-image");
        link.href = url;
        link.download = `${isThaiId ? "thai-id" : "passport"}-${id}.${extensions[response.headers.get("content-type")] || "image"}`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (button.dataset.passportAction === "reminded") {
        await api("/api/concierge/admin/passport-reminder", { method: "POST", body: JSON.stringify({ id }) });
        await loadOverview();
      } else if (button.dataset.passportAction === "tm30-register" || button.dataset.passportAction === "tm30-unregister") {
        const registered = button.dataset.passportAction === "tm30-register";
        if (registered && !window.confirm("Mark this foreign passport as already registered in TM30?")) return;
        if (!registered && !window.confirm("Remove the TM30 registered mark from this passport?")) return;
        await api("/api/concierge/admin/passport-tm30", { method: "POST", body: JSON.stringify({ id, registered }) });
        await loadOverview();
      } else {
        await api("/api/concierge/admin/passport-delete", { method: "POST", body: JSON.stringify({ id }) });
        if (passportLinkResult.dataset.registrationId === id) passportLinkResult.hidden = true;
        await loadOverview();
      }
    } catch (_error) {
      window.alert("The passport action could not be completed.");
    } finally {
      button.disabled = false;
    }
  }

  pendingRegistrations.addEventListener("click", passportAction);
  passportUploads.addEventListener("click", passportAction);
  maintenanceReports.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-maintenance-action]");
    if (!button) return;
    const card = button.closest("[data-maintenance-id]");
    const id = card.dataset.maintenanceId;
    const action = button.dataset.maintenanceAction;
    if (action === "remove") {
      const confirmed = await confirmAdminAction({
        title: "Remove resolved report?",
        message: "Remove this resolved maintenance report? Any remaining private photo will also be permanently deleted.",
        confirmLabel: "Remove report",
        danger: true
      });
      if (!confirmed) return;
    }
    if (action === "delete-photo") {
      const confirmed = await confirmAdminAction({
        title: "Delete private photo?",
        message: "The stored maintenance photo will be permanently deleted. The maintenance report itself will remain.",
        confirmLabel: "Delete photo",
        danger: true
      });
      if (!confirmed) return;
    }
    button.disabled = true;
    try {
      if (action === "download") {
        const response = await authorizedFetch(`/api/concierge/admin/maintenance-files/${id}`);
        if (!response.ok) throw new Error("download_failed");
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
        link.href = url;
        link.download = `maintenance-${id}.${extensions[response.headers.get("content-type")] || "image"}`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (action === "resolve") {
        await api("/api/concierge/admin/maintenance-resolve", { method: "POST", body: JSON.stringify({ id }) });
        await loadOverview();
      } else if (action === "remove") {
        await api("/api/concierge/admin/maintenance-remove", {
          method: "POST",
          body: JSON.stringify({ id, confirmation: "REMOVE RESOLVED REPORT" })
        });
        await loadOverview();
      } else {
        await api("/api/concierge/admin/maintenance-delete", { method: "POST", body: JSON.stringify({ id }) });
        await loadOverview();
      }
    } catch (_error) {
      window.alert("The maintenance action could not be completed. Open reports must be resolved before removal, and private-photo deletion must succeed first.");
    } finally {
      button.disabled = false;
    }
  });
  expenseAnalyze.addEventListener("click", async () => {
    const file = expenseReceipt.files?.[0];
    if (!file) {
      window.alert("Choose or photograph a receipt first.");
      return;
    }
    expenseAnalyze.disabled = true;
    expenseAnalysisStatus.textContent = "Analyzing receipt… Please review every field before saving.";
    try {
      const form = new FormData();
      form.set("receipt", file, file.name);
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

  expenseReset.addEventListener("click", () => resetExpenseForm());

  ["incomeGross", "incomeFees"].forEach((id) => document.getElementById(id).addEventListener("input", updateIncomeNetPreview));
  incomeReset.addEventListener("click", () => resetIncomeForm());

  incomeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = document.getElementById("incomeSave");
    submit.disabled = true;
    const payload = (confirmDuplicate = false) => ({
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
    const save = async (confirmDuplicate = false) => {
      const response = await authorizedFetch("/api/concierge/admin/income", { method: "POST", body: JSON.stringify(payload(confirmDuplicate)) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || "income_save_failed");
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    };
    try {
      try {
        await save(false);
      } catch (error) {
        if (error.status !== 409 || error.message !== "possible_duplicate") throw error;
        const duplicate = error.data?.duplicates?.[0];
        const confirmed = await confirmAdminAction({
          title: "Possible duplicate income",
          message: duplicate
            ? `A ${formatExpenseAmount(duplicate.gross)} gross income entry on ${duplicate.incomeDate} is already recorded${duplicate.unit ? ` for ${duplicate.unit}` : ""}. Save this as a separate income entry anyway?`
            : "A matching income entry may already be recorded. Save this as a separate entry anyway?",
          confirmLabel: "Save anyway",
          danger: true
        });
        if (!confirmed) return;
        await save(true);
      }
      const savedMonth = document.getElementById("incomeDate").value.slice(0, 7);
      resetIncomeForm();
      if (savedMonth) expenseMonth.value = savedMonth;
      await loadFinance();
    } catch (error) {
      window.alert(error.message === "invalid_income"
        ? "Check the date, source, gross amount, fees and description. Fees cannot exceed gross income."
        : "The income entry could not be saved.");
    } finally {
      submit.disabled = false;
    }
  });

  incomeEntries.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest("[data-income-delete-id]");
    if (!deleteButton) return;
    const confirmed = await confirmAdminAction({
      title: "Delete income?",
      message: "Permanently remove this income record?",
      confirmLabel: "Delete income",
      danger: true
    });
    if (!confirmed) return;
    deleteButton.disabled = true;
    try {
      await api("/api/concierge/admin/income/delete", {
        method: "POST",
        body: JSON.stringify({ id: deleteButton.dataset.incomeDeleteId, confirmation: "DELETE INCOME" })
      });
      await loadFinance();
    } catch (_error) {
      deleteButton.disabled = false;
      window.alert("The income entry could not be deleted.");
    }
  });

  expenseMonth.addEventListener("change", () => {
    if (!expenseMonth.value) expenseMonth.value = currentPropertyDateParts().month;
    loadFinance().catch(() => window.alert("Finance records for that month could not be loaded."));
  });

  expenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = document.getElementById("expenseSave");
    submit.disabled = true;
    const save = async (confirmDuplicate = false) => expenseEditingRecord
      ? api("/api/concierge/admin/expenses/update", {
          method: "POST",
          body: JSON.stringify(expenseEditPayload(confirmDuplicate))
        })
      : apiForm("/api/concierge/admin/expenses", expenseFormData(confirmDuplicate));
    try {
      try {
        await save(false);
      } catch (error) {
        if (error.status !== 409 || error.message !== "possible_duplicate") throw error;
        const duplicate = error.data?.duplicates?.[0];
        const confirmed = await confirmAdminAction({
          title: "Possible duplicate expense",
          message: duplicate
            ? `A ${formatExpenseAmount(duplicate.amount)} expense on ${duplicate.expenseDate} is already recorded${duplicate.vendor ? ` for ${duplicate.vendor}` : ""}. ${expenseEditingRecord ? "Save these corrected values anyway?" : "Save this as a separate expense anyway?"}`
            : (expenseEditingRecord ? "A matching expense may already be recorded. Save these corrected values anyway?" : "A matching expense may already be recorded. Save this as a separate expense anyway?"),
          confirmLabel: "Save anyway",
          danger: true
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
        unsupported_file_type: "Use a JPEG, PNG, WebP, HEIC or PDF receipt.",
        file_too_large: "The receipt must be 10 MB or smaller.",
        receipt_storage_unavailable: "Private receipt storage is currently unavailable."
      };
      window.alert(messages[error.message] || "The expense could not be saved.");
    } finally {
      submit.disabled = false;
    }
  });

  expenseEntries.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-expense-edit-id]");
    if (editButton) {
      startExpenseEdit(editButton.dataset.expenseEditId);
      return;
    }
    const receiptButton = event.target.closest("[data-expense-receipt-id]");
    if (receiptButton) {
      receiptButton.disabled = true;
      try {
        const response = await authorizedFetch(`/api/concierge/admin/expense-files/${receiptButton.dataset.expenseReceiptId}`);
        if (!response.ok) throw new Error("download_failed");
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        const disposition = response.headers.get("content-disposition") || "";
        const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `expense-receipt-${receiptButton.dataset.expenseReceiptId}`;
        link.href = url;
        link.download = filename;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (_error) {
        window.alert("The private receipt could not be downloaded.");
      } finally {
        receiptButton.disabled = false;
      }
      return;
    }
    const deleteButton = event.target.closest("[data-expense-delete-id]");
    if (!deleteButton) return;
    const confirmed = await confirmAdminAction({
      title: "Delete expense?",
      message: "Permanently remove this expense record and its private receipt attachment, if present?",
      confirmLabel: "Delete expense",
      danger: true
    });
    if (!confirmed) return;
    deleteButton.disabled = true;
    try {
      await api("/api/concierge/admin/expenses/delete", {
        method: "POST",
        body: JSON.stringify({ id: deleteButton.dataset.expenseDeleteId, confirmation: "DELETE EXPENSE" })
      });
      await loadFinance();
    } catch (_error) {
      deleteButton.disabled = false;
      window.alert("The expense could not be deleted.");
    }
  });

  expenseExport.addEventListener("click", async () => {
    if (!expenseMonth.value) expenseMonth.value = currentPropertyDateParts().month;
    expenseExport.disabled = true;
    try {
      const response = await authorizedFetch(`/api/concierge/admin/finance/export.csv?month=${encodeURIComponent(expenseMonth.value)}`);
      if (!response.ok) throw new Error("export_failed");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance-${expenseMonth.value}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (_error) {
      window.alert("The finance export could not be created.");
    } finally {
      expenseExport.disabled = false;
    }
  });

  whatsappDeliveryDiagnostics.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-diagnostic-action]");
    if (!button) return;
    const card = button.closest("[data-diagnostic-id]");
    const action = button.dataset.diagnosticAction;
    const confirmed = await confirmAdminAction({
      title: action === "clear" ? "Clear resolved diagnostics?" : "Dismiss diagnostic?",
      message: action === "clear"
        ? "Hide all failed-delivery diagnostics for this resolved alert. This does not change its delivery history."
        : "Hide this failed-delivery diagnostic from the operational view. The parent alert and delivery result will not change.",
      confirmLabel: action === "clear" ? "Clear diagnostics" : "Dismiss",
      danger: action === "clear"
    });
    if (!confirmed) return;
    button.disabled = true;
    try {
      if (action === "clear") {
        await api("/api/concierge/admin/diagnostics/clear", {
          method: "POST",
          body: JSON.stringify({ alertId: card.dataset.diagnosticAlertId, confirmation: "CLEAR RESOLVED DIAGNOSTICS" })
        });
      } else {
        await api("/api/concierge/admin/diagnostics/dismiss", {
          method: "POST",
          body: JSON.stringify({ id: card.dataset.diagnosticId, confirmation: "DISMISS DIAGNOSTIC" })
        });
      }
      await loadOverview();
    } catch (_error) {
      button.disabled = false;
      window.alert("The diagnostic visibility could not be updated. Clearing all diagnostics is available only after the parent alert is resolved.");
    }
  });
  alerts.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-alert-action]");
    if (!button) return;
    const card = button.closest("[data-alert-id]");
    button.disabled = true;
    try {
      await api(`/api/concierge/admin/alerts/${button.dataset.alertAction}`, {
        method: "POST",
        body: JSON.stringify({ id: card.dataset.alertId })
      });
      await loadOverview();
    } catch (_error) {
      button.disabled = false;
      window.alert("The alert status could not be updated.");
    }
  });

  document.getElementById("refreshAdmin").addEventListener("click", () => loadOverview().catch(() => {}));
  document.getElementById("adminLogout").addEventListener("click", () => {
    token = "";
    window.sessionStorage.removeItem(tokenKey);
    showPortalChooser();
  });

  queue.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-review-action]");
    if (!button) return;
    const card = button.closest("[data-queue-id]");
    const payload = { id: card.dataset.queueId, status: button.dataset.reviewAction };
    card.querySelectorAll("[data-review-field]").forEach((control) => {
      payload[control.dataset.reviewField] = control.value;
    });
    card.querySelectorAll("button").forEach((control) => { control.disabled = true; });
    try {
      const result = await api("/api/concierge/admin/review", { method: "POST", body: JSON.stringify(payload) });
      if (!result.ok) throw new Error(result.error || "Review failed");
      await loadOverview();
    } catch (error) {
      card.querySelectorAll("button").forEach((control) => { control.disabled = false; });
      window.alert(error.message === "answer_required" ? "Please enter the approved answer first." : "The review could not be saved.");
    }
  });

  approved.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-approved-id]");
    if (!button) return;
    button.disabled = true;
    try {
      await api("/api/concierge/admin/approved", {
        method: "POST",
        body: JSON.stringify({ id: button.dataset.approvedId, active: false })
      });
      await loadOverview();
    } catch (_error) {
      button.disabled = false;
    }
  });

  document.getElementById("exportKnowledge").addEventListener("click", async () => {
    try {
      const data = await api("/api/concierge/admin/export");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `the-house-approved-concierge-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (_error) {
      window.alert("The approved knowledge export could not be created.");
    }
  });

  expenseMonth.value = currentPropertyDateParts().month;
  resetExpenseForm();
  resetIncomeForm();

  showPortalChooser();
})();
