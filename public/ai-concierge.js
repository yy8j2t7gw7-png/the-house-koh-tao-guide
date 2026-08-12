(function () {
  const cfg = window.AI_CONCIERGE_CONFIG;
  if (!cfg || !cfg.enabled) return;

  const contacts = window.HOUSE_GUIDE || {};
  const roomOptions = (cfg.roomOptions || ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]).map(String);
  const pagePath = location.pathname;
  const currentPage = /^\/room\/(?:\d+)\/?$/.test(pagePath)
    ? "room.html"
    : (pagePath.split("/").filter(Boolean).pop() || "index.html");
  const pagePrompts = cfg.pagePrompts?.[currentPage] || cfg.defaultPrompts || [];

  function safeStorage(storage, operation, key, value) {
    try {
      if (operation === "get") return storage.getItem(key);
      if (operation === "remove") return storage.removeItem(key);
      storage.setItem(key, value);
    } catch (_error) {
      return null;
    }
    return null;
  }

  function roomFromPath() {
    const match = location.pathname.match(/^\/room\/(\d+)\/?$/);
    return match && roomOptions.includes(match[1]) ? match[1] : null;
  }

  function initialRoom() {
    const pathRoom = roomFromPath();
    if (pathRoom) {
      safeStorage(window.localStorage, "set", "houseRoom", pathRoom);
      return pathRoom;
    }
    const stored = safeStorage(window.localStorage, "get", "houseRoom");
    return roomOptions.includes(stored) ? stored : null;
  }

  let selectedRoom = initialRoom();
  const sessionStorageKey = "houseConciergeSessionId";
  const historyStorageKey = "houseConciergeHistory";
  const historyLimit = Number.isFinite(cfg.historyLimit) ? cfg.historyLimit : 10;

  function createSessionId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID().replace(/-/g, "_");
    const random = Math.random().toString(36).slice(2);
    return `session_${Date.now().toString(36)}_${random}_${random}`;
  }

  function initialSessionId() {
    const stored = safeStorage(window.sessionStorage, "get", sessionStorageKey);
    if (/^[A-Za-z0-9_-]{16,100}$/.test(stored || "")) return stored;
    const created = createSessionId();
    safeStorage(window.sessionStorage, "set", sessionStorageKey, created);
    return created;
  }

  function initialHistory() {
    try {
      const stored = JSON.parse(safeStorage(window.sessionStorage, "get", historyStorageKey) || "[]");
      if (!Array.isArray(stored)) return [];
      return stored
        .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
        .slice(-historyLimit);
    } catch (_error) {
      return [];
    }
  }

  const sessionId = initialSessionId();
  let conversationHistory = initialHistory();
  let pendingAnswer = null;
  let lastFocusedElement = null;
  let dragStartY = null;
  let dragCurrentY = null;
  let enginePromise = null;

  function contextValues(question = "") {
    return {
      question,
      room: selectedRoom || "",
      roomLabel: selectedRoom ? `Room ${selectedRoom}` : "my room"
    };
  }

  function interpolate(value, context) {
    return String(value || "").replace(/\{(question|room|roomLabel)\}/g, (_match, key) => context[key] || "");
  }

  function rememberExchange(question, answer) {
    conversationHistory.push(
      { role: "user", content: String(question || "").slice(0, 700) },
      { role: "assistant", content: String(answer || "").slice(0, 700) }
    );
    conversationHistory = conversationHistory.slice(-historyLimit);
    safeStorage(window.sessionStorage, "set", historyStorageKey, JSON.stringify(conversationHistory));
  }

  function routeMap() {
    const propertyEmergency = contacts.propertyEmergency?.enabled
      ? contacts.propertyEmergency
      : contacts.houseSupport;
    return {
      houseWhatsapp: contacts.houseSupport?.whatsapp,
      houseCall: contacts.houseSupport?.phoneTel ? `tel:${contacts.houseSupport.phoneTel}` : "",
      bookingWhatsapp: contacts.bookings?.whatsapp,
      bookingCall: contacts.bookings?.phoneTel ? `tel:${contacts.bookings.phoneTel}` : "",
      propertyEmergencyWhatsapp: propertyEmergency?.whatsapp,
      propertyEmergencyCall: propertyEmergency?.phoneTel ? `tel:${propertyEmergency.phoneTel}` : "",
      medicalNationalCall: contacts.emergency?.medicalNational?.phoneTel
        ? `tel:${contacts.emergency.medicalNational.phoneTel}` : "",
      rescueCall: contacts.emergency?.kohTaoRescue?.phoneTel
        ? `tel:${contacts.emergency.kohTaoRescue.phoneTel}` : "",
      policeCall: contacts.emergency?.kohTaoPolice?.phoneTel
        ? `tel:${contacts.emergency.kohTaoPolice.phoneTel}` : "",
      touristPoliceCall: contacts.emergency?.touristPolice?.phoneTel
        ? `tel:${contacts.emergency.touristPolice.phoneTel}` : "",
      hospitalCall: contacts.emergency?.kohTaoHospital?.phoneTel
        ? `tel:${contacts.emergency.kohTaoHospital.phoneTel}` : "",
      hospitalMap: contacts.emergency?.kohTaoHospital?.map,
      pharmacyMap: contacts.maps?.pharmacy,
      atmMap: contacts.maps?.atm,
      supermarketMap: contacts.maps?.supermarket,
      laundryMap: contacts.maps?.laundry
    };
  }

  function resolveAction(action, question) {
    const context = contextValues(question);
    if (action.type === "registration") {
      const href = window.HOUSE_PRIVATE_REGISTRATION_URL || "";
      return href ? {
        label: interpolate(action.label, context),
        href,
        style: action.style || "",
        external: false
      } : null;
    }
    let href = action.href || routeMap()[action.route] || "";
    if (!href) return null;
    if (action.message && /https:\/\/wa\.me\//i.test(href)) {
      const message = encodeURIComponent(interpolate(action.message, context));
      href += `${href.includes("?") ? "&" : "?"}text=${message}`;
    }
    return {
      label: interpolate(action.label, context),
      href,
      style: action.style || "",
      external: /^https?:/i.test(href)
    };
  }

  function loadEngine() {
    if (enginePromise) return enginePromise;
    enginePromise = new Promise((resolve, reject) => {
      const createEngine = () => window.HOUSE_CONCIERGE_ENGINE.create({
        knowledgeUrl: cfg.knowledgeUrl,
        minimumScore: cfg.minimumMatchScore
      }).then(resolve, reject);

      if (window.HOUSE_CONCIERGE_ENGINE?.create) {
        createEngine();
        return;
      }

      const script = document.createElement("script");
      script.src = cfg.engineScriptUrl || "/ai-concierge-engine.js";
      script.async = true;
      script.onload = () => {
        if (window.HOUSE_CONCIERGE_ENGINE?.create) createEngine();
        else reject(new Error("Concierge engine unavailable."));
      };
      script.onerror = () => reject(new Error("Concierge engine could not be loaded."));
      document.head.appendChild(script);
    });
    return enginePromise;
  }

  const launcher = document.createElement("button");
  launcher.className = "ai-concierge-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "aiConciergePanel");
  launcher.innerHTML = `<span aria-hidden="true">✦</span><span>${cfg.buttonLabel}</span>`;

  const backdrop = document.createElement("div");
  backdrop.className = "ai-concierge-backdrop";
  backdrop.setAttribute("aria-hidden", "true");

  const panel = document.createElement("section");
  panel.className = "ai-concierge-panel";
  panel.id = "aiConciergePanel";
  panel.setAttribute("aria-label", "AI Concierge");

  const quickActionsHtml = (cfg.quickActions || []).map((action) => {
    if (action.type === "registration" && window.HOUSE_PRIVATE_REGISTRATION_URL) {
      return `<a class="ai-concierge-action" href="${window.HOUSE_PRIVATE_REGISTRATION_URL}">
        <span aria-hidden="true">${action.icon}</span><span>${action.label}</span>
      </a>`;
    }
    if (action.type === "link") {
      return `<a class="ai-concierge-action" href="${action.href}">
        <span aria-hidden="true">${action.icon}</span><span>${action.label}</span>
      </a>`;
    }
    if (action.type === "prompt") {
      return `<button class="ai-concierge-action" type="button" data-quick-prompt="${action.prompt.replace(/"/g, "&quot;")}">
        <span aria-hidden="true">${action.icon}</span><span>${action.label}</span>
      </button>`;
    }
    return `<button class="ai-concierge-action" type="button" data-concierge-action="${action.type}">
      <span aria-hidden="true">${action.icon}</span><span>${action.label}</span>
    </button>`;
  }).join("");

  const promptHtml = pagePrompts.length
    ? `<div class="ai-concierge-context">
         <h4>Common questions</h4>
         ${pagePrompts.map((prompt) =>
           `<button class="ai-concierge-prompt" type="button" data-prompt="${prompt.replace(/"/g, "&quot;")}">${prompt}</button>`
         ).join("")}
       </div>`
    : "";

  const roomButtons = roomOptions.map((room) =>
    `<button type="button" data-select-room="${room}">Room ${room}</button>`
  ).join("");

  panel.innerHTML = `
    <div class="ai-concierge-drag-handle" aria-hidden="true"></div>
    <div class="ai-concierge-head">
      <div>
        <h2>AI Concierge</h2>
        <button class="ai-concierge-room-context" type="button" data-change-room>
          ${selectedRoom ? `Room ${selectedRoom}` : "Set your room"}
        </button>
      </div>
      <button class="ai-concierge-close" type="button" aria-label="Close AI Concierge">×</button>
    </div>
    <div class="ai-concierge-body">
      <div class="ai-concierge-welcome">
        <h3>${cfg.welcomeTitle}</h3>
        <p>${cfg.welcomeText}</p>
      </div>
      <div class="ai-concierge-actions">${quickActionsHtml}</div>
      ${promptHtml}
      <div class="ai-concierge-room-selector" ${selectedRoom ? "hidden" : ""}>
        <div class="ai-concierge-room-selector-head">
          <strong>Which room are you staying in?</strong>
          <button type="button" data-close-room-selector aria-label="Close room selector">×</button>
        </div>
        <p>Selecting your room lets the concierge prepare the right support message.</p>
        <div class="ai-concierge-room-options">${roomButtons}</div>
      </div>
      <div class="ai-concierge-chat">
        <div class="ai-concierge-messages" aria-live="polite" aria-label="Concierge conversation"></div>
        <form class="ai-concierge-input-row">
          <input class="ai-concierge-input" type="text" placeholder="${cfg.placeholder}" aria-label="Ask the AI Concierge" autocomplete="off">
          <button class="ai-concierge-send" type="submit">Send</button>
        </form>
        <p class="ai-concierge-note">Answers use approved information from The House. Please do not share passport, payment or key-box details here.</p>
      </div>
    </div>`;

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
  document.body.appendChild(launcher);
  document.body.classList.add("ai-concierge-ready");

  const closeButton = panel.querySelector(".ai-concierge-close");
  const input = panel.querySelector(".ai-concierge-input");
  const form = panel.querySelector(".ai-concierge-input-row");
  const sendButton = panel.querySelector(".ai-concierge-send");
  const messages = panel.querySelector(".ai-concierge-messages");
  const roomContext = panel.querySelector(".ai-concierge-room-context");
  const roomSelector = panel.querySelector(".ai-concierge-room-selector");

  function appendMessage(role, text, actions = [], question = "", metadata = {}) {
    const message = document.createElement("article");
    message.className = `ai-concierge-message is-${role}`;
    const bubble = document.createElement("div");
    bubble.className = "ai-concierge-bubble";
    bubble.textContent = interpolate(text, contextValues(question));
    message.appendChild(bubble);

    const resolvedActions = actions.map((action) => resolveAction(action, question)).filter(Boolean);
    if (resolvedActions.length) {
      const actionRow = document.createElement("div");
      actionRow.className = "ai-concierge-message-actions";
      resolvedActions.forEach((action) => {
        const link = document.createElement("a");
        link.className = `ai-concierge-message-action${action.style === "danger" ? " is-danger" : ""}`;
        link.href = action.href;
        link.textContent = action.label;
        link.dataset.action = "conciergeHandoff";
        link.dataset.conciergeHumanHandoff = "true";
        if (action.external) {
          link.target = "_blank";
          link.rel = "noopener";
        }
        actionRow.appendChild(link);
      });
      message.appendChild(actionRow);
    }

    if (role === "concierge" && /^int_[A-Za-z0-9-]{20,}$/.test(metadata.interactionId || "")) {
      const feedback = document.createElement("div");
      feedback.className = "ai-concierge-feedback";
      feedback.dataset.feedbackFor = metadata.interactionId;
      feedback.innerHTML = `
        <span>Was this helpful?</span>
        <button type="button" data-feedback-rating="up" aria-label="This answer was helpful">Yes</button>
        <button type="button" data-feedback-rating="down" aria-label="This answer was not helpful">No</button>`;
      message.appendChild(feedback);
    }

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  function appendStatus(text) {
    const status = appendMessage("concierge", text);
    status.classList.add("is-status");
    status.setAttribute("aria-busy", "true");
    return status;
  }

  function updateRoomContext() {
    roomContext.textContent = selectedRoom ? `Room ${selectedRoom}` : "Set your room";
  }

  function openRoomSelector() {
    roomSelector.hidden = false;
    roomSelector.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function closeRoomSelector() {
    roomSelector.hidden = true;
  }

  function setRoom(room) {
    if (!roomOptions.includes(room)) return;
    selectedRoom = room;
    safeStorage(window.localStorage, "set", "houseRoom", room);
    updateRoomContext();
    closeRoomSelector();
    appendMessage("concierge", `Thank you. I’ll use Room ${room} for this conversation.`);
    if (pendingAnswer) {
      appendMessage(
        "concierge",
        pendingAnswer.result.answer,
        pendingAnswer.result.actions,
        pendingAnswer.question,
        { interactionId: pendingAnswer.result.interactionId }
      );
      rememberExchange(pendingAnswer.question, pendingAnswer.result.answer);
      pendingAnswer = null;
    }
    input.focus();
  }

  function openPanel(options = {}) {
    lastFocusedElement = document.activeElement;
    backdrop.classList.add("is-open");
    panel.classList.add("is-open");
    document.body.classList.add("ai-concierge-open");
    launcher.setAttribute("aria-expanded", "true");
    window.setTimeout(() => {
      if (options.askRoom && !selectedRoom) openRoomSelector();
      input.focus();
    }, 120);
  }

  function closePanel() {
    backdrop.classList.remove("is-open");
    panel.classList.remove("is-open", "is-dragging");
    panel.style.transform = "";
    document.body.classList.remove("ai-concierge-open");
    launcher.setAttribute("aria-expanded", "false");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      window.setTimeout(() => lastFocusedElement.focus(), 80);
    }
  }

  async function askServer(question, history) {
    if (!cfg.useServerAI || !cfg.apiUrl) throw new Error("Server concierge disabled.");
    const response = await fetch(cfg.apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        question,
        room: selectedRoom || "",
        sessionId,
        history,
        page: currentPage
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.answer) {
      const error = new Error(result.message || "The server concierge is unavailable.");
      error.status = response.status;
      throw error;
    }
    return result;
  }

  async function fallbackAnswer(question) {
    const engine = await loadEngine();
    return { ...engine.answer(question), source: "device-fallback", interactionId: null };
  }

  function deliverAnswer(result, question) {
    if (result.category === "stay-support" && !selectedRoom) {
      pendingAnswer = { result, question };
      appendMessage("concierge", "Before I continue, which room are you staying in?");
      openRoomSelector();
      return;
    }
    appendMessage(
      "concierge",
      result.answer,
      result.actions,
      question,
      { interactionId: result.interactionId }
    );
    rememberExchange(question, result.answer);
  }

  async function submitQuestion(rawQuestion) {
    const question = String(rawQuestion || input.value).trim();
    if (!question) return;
    if (question.length > 800) {
      appendMessage("concierge", "Please shorten your question to 800 characters or fewer.");
      return;
    }
    const priorHistory = conversationHistory.slice(-historyLimit);
    input.value = "";
    appendMessage("guest", question);
    sendButton.disabled = true;
    input.disabled = true;
    const status = appendStatus("Checking the approved information…");

    try {
      let result;
      try {
        result = await askServer(question, priorHistory);
      } catch (serverError) {
        if (serverError.status === 429) throw serverError;
        result = await fallbackAnswer(question);
      }
      status.remove();
      deliverAnswer(result, question);
    } catch (error) {
      status.remove();
      if (error.status === 429) {
        appendMessage("concierge", error.message || "Please wait a moment before sending another question.");
        return;
      }
      appendMessage(
        "concierge",
        "I cannot load the approved answers right now. You can still ask our team for help.",
        [{
          label: "Ask a Human",
          type: "route",
          route: "houseWhatsapp",
          message: "Hello, I am staying at The House and need help with: {question}"
        }],
        question
      );
    } finally {
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  appendMessage("concierge", cfg.initialMessage || "Hello. What can I help you with during your stay?");
  loadEngine().catch(() => {});

  const appearanceDelay = Number.isFinite(cfg.appearanceDelayMs) ? cfg.appearanceDelayMs : 1200;
  window.setTimeout(() => launcher.classList.add("is-visible"), appearanceDelay);

  launcher.addEventListener("click", () => {
    panel.classList.contains("is-open") ? closePanel() : openPanel();
  });
  closeButton.addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel);
  roomContext.addEventListener("click", openRoomSelector);
  panel.querySelector("[data-close-room-selector]").addEventListener("click", closeRoomSelector);

  panel.addEventListener("click", (event) => {
    const feedbackButton = event.target.closest("[data-feedback-rating]");
    if (feedbackButton) {
      const feedback = feedbackButton.closest("[data-feedback-for]");
      const buttons = [...feedback.querySelectorAll("button")];
      buttons.forEach((button) => { button.disabled = true; });
      fetch(cfg.feedbackUrl || "/api/concierge/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          interactionId: feedback.dataset.feedbackFor,
          rating: feedbackButton.dataset.feedbackRating
        })
      }).then((response) => {
        feedback.innerHTML = response.ok
          ? "<span>Thank you. Your feedback helps improve the concierge.</span>"
          : "<span>Feedback could not be saved.</span>";
      }).catch(() => {
        feedback.innerHTML = "<span>Feedback could not be saved.</span>";
      });
      return;
    }
    const roomButton = event.target.closest("[data-select-room]");
    if (roomButton) {
      setRoom(roomButton.dataset.selectRoom);
      return;
    }
    const quickPrompt = event.target.closest("[data-quick-prompt]");
    if (quickPrompt) {
      submitQuestion(quickPrompt.dataset.quickPrompt);
      return;
    }
    const promptButton = event.target.closest("[data-prompt]");
    if (promptButton) {
      submitQuestion(promptButton.dataset.prompt);
      return;
    }
    const actionButton = event.target.closest("[data-concierge-action]");
    if (actionButton?.dataset.conciergeAction === "contact") {
      appendMessage("concierge", "Tell me what you need. If I cannot resolve it, I will give you the correct human contact option.");
      input.focus();
    } else if (actionButton?.dataset.conciergeAction === "registration") {
      appendMessage("concierge", "Please open the private Room welcome link sent by The House. The registration button there opens the secure form directly.");
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuestion();
  });

  document.addEventListener("click", (event) => {
    const promptTrigger = event.target.closest("[data-concierge-prompt]");
    if (promptTrigger && !panel.contains(promptTrigger)) {
      event.preventDefault();
      openPanel({ askRoom: true });
      submitQuestion(promptTrigger.dataset.conciergePrompt);
      return;
    }
    const contactLink = event.target.closest('[data-action="contact"],[data-link="houseWhatsapp"]');
    if (!contactLink || panel.contains(contactLink) || contactLink.dataset.conciergeHumanHandoff) return;
    event.preventDefault();
    openPanel({ askRoom: true });
  }, true);

  window.addEventListener("house:open-concierge", (event) => {
    openPanel({ askRoom: Boolean(event.detail?.askRoom) });
    if (event.detail?.prompt) submitQuestion(event.detail.prompt);
  });

  const resetDrag = () => {
    dragStartY = null;
    dragCurrentY = null;
    panel.classList.remove("is-dragging");
    panel.style.transform = "";
  };

  panel.addEventListener("touchstart", (event) => {
    if (window.innerWidth > 640 || !panel.classList.contains("is-open") || event.touches.length !== 1) return;
    dragStartY = event.touches[0].clientY;
    dragCurrentY = dragStartY;
    panel.classList.add("is-dragging");
  }, { passive: true });

  panel.addEventListener("touchmove", (event) => {
    if (dragStartY === null || event.touches.length !== 1) return;
    dragCurrentY = event.touches[0].clientY;
    panel.style.transform = `translateY(${Math.max(0, dragCurrentY - dragStartY)}px)`;
  }, { passive: true });

  panel.addEventListener("touchend", () => {
    if (dragStartY === null) return;
    const distance = Math.max(0, (dragCurrentY ?? dragStartY) - dragStartY);
    if (distance > 110) closePanel();
    else resetDrag();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanel();
    if (event.key !== "Tab" || !panel.classList.contains("is-open")) return;
    const focusable = [...panel.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])'
    )].filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
