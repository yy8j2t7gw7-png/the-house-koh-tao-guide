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
  let token = "";

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
      stat(totals.storedPassportFiles, "Passport files stored")
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
    renderRecent(data.recent || []);
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
          expiresHours: Number(document.getElementById("passportExpiry").value)
        })
      });
      document.getElementById("passportReminderMessage").value = data.reminderMessage;
      document.getElementById("passportUploadUrl").value = data.uploadUrl;
      passportLinkResult.dataset.registrationId = data.id;
      passportLinkResult.hidden = false;
      await loadOverview();
    } catch (error) {
      window.alert(error.message === "passport_upload_unavailable"
        ? "Private passport storage must be configured before links can be created."
        : "The secure request could not be created.");
    } finally {
      submit.disabled = false;
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
