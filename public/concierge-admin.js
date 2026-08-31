(function () {
  const tokenKey = "houseConciergeAdminToken";
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
  const alertStatus = document.getElementById("whatsappAlertStatus");
  const activeStayReservations = document.getElementById("activeStayReservations");
  const upcomingStayReservations = document.getElementById("upcomingStayReservations");
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

  function updateAdminSectionSummaries(data) {
    const stayOperations = data.stayOperations || {};
    setAdminSectionCount("stays", (stayOperations.reservations || []).length + (stayOperations.rotations || []).length);
    setAdminSectionCount("alerts", (data.alerts || []).length);
    setAdminSectionCount("maintenance", (data.maintenanceReports || []).length);
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
      stat(totals.pendingRegistrations, "Passport requests pending"),
      stat(totals.storedPassportFiles, "Passport files stored"),
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
      pendingRegistrations.appendChild(element("div", "concierge-admin-empty", "No active passport requests."));
      return;
    }
    items.forEach((item) => {
      const card = element("article", "concierge-admin-registration-item");
      card.dataset.registrationId = item.id;
      const arrival = item.arrivalAt ? new Date(item.arrivalAt) : null;
      const urgency = arrival && arrival.getTime() <= Date.now() ? "Arrival time has passed—remind now." : `Expected arrival: ${bangkokDate(item.arrivalAt)}`;
      card.append(
        element("strong", "", `Room ${item.room}`),
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
      passportUploads.appendChild(element("div", "concierge-admin-empty", "No passport images are stored."));
      return;
    }
    items.forEach((item) => {
      const card = element("article", "concierge-admin-registration-item");
      card.dataset.registrationId = item.id;
      const size = `${Math.max(1, Math.round(Number(item.sizeBytes || 0) / 1024))} KB`;
      card.append(
        element("strong", "", `Room ${item.room}`),
        element("span", "", `Received: ${bangkokDate(item.uploadedAt)}`),
        element("span", "", `${item.mediaType} · ${size}`),
        element("span", "", `Automatic deletion: ${bangkokDate(item.deleteAfter)}`)
      );
      const actions = element("div", "concierge-admin-card-actions");
      const download = element("button", "secondary", "Download securely");
      download.type = "button";
      download.dataset.passportAction = "download";
      const remove = element("button", "danger", "Delete now");
      remove.type = "button";
      remove.dataset.passportAction = "delete";
      actions.append(download, remove);
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
    renderStayOperations(data.stayOperations || {});
    renderRecent(data.recent || []);
    updateAdminSectionSummaries(data);
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
      loginStatus.textContent = error.status === 401 ? "That access token is not valid." : "The review service is not available yet.";
    }
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginWith(tokenInput.value);
  });

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
    } catch (_error) {
      window.alert("The direct stay could not be created. Check the room and dates.");
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
    const button = event.target.closest("[data-extension-action],[data-in-person-action]");
    if (!button) return;
    const card = button.closest("[data-reservation-id]");
    if (button.dataset.inPersonAction) {
      if (!card?.dataset.reservationId) return;
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
    } catch (_error) {
      button.disabled = false;
      window.alert("The stay could not be extended. Choose a date after the current checkout date.");
    }
  }

  activeStayReservations.addEventListener("click", stayOperationAction);
  upcomingStayReservations.addEventListener("click", stayOperationAction);

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
        link.href = url;
        link.download = `passport-${id}.${extensions[response.headers.get("content-type")] || "image"}`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (button.dataset.passportAction === "reminded") {
        await api("/api/concierge/admin/passport-reminder", { method: "POST", body: JSON.stringify({ id }) });
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
    workspace.hidden = true;
    login.hidden = false;
    tokenInput.focus();
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

  const storedToken = window.sessionStorage.getItem(tokenKey);
  if (storedToken) loginWith(storedToken);
})();
