(async function () {
  const cfg = window.AI_CONCIERGE_CONFIG;
  if (!cfg || !cfg.enabled) return;

  const pagePath = location.pathname;
  const currentPage = /^\/room\/(?:\d+)\/?$/.test(pagePath)
    ? "room.html"
    : (pagePath.split("/").filter(Boolean).pop() || "index.html");
  const pageAccessMode = document.body.dataset.guestAccess || (currentPage === "emergency.html" ? "public" : "granted");

  const contacts = window.HOUSE_GUIDE || {};
  const roomOptions = (cfg.roomOptions || ["1", "2", "3", "4", "5", "6", "8", "9", "10", "11"]).map(String);
  const pagePrompts = cfg.pagePrompts?.[currentPage] || cfg.defaultPrompts || [];
  const lostKeyRequest = /\b(?:(?:(?:i|we)\s+(?:have\s+)?)?lost\s+(?:(?:my|our|the|a)\s+)?(?:room\s+)?key|(?:(?:my|our|the)\s+)?(?:room\s+)?key\s+(?:is\s+)?(?:lost|missing)|(?:cannot|can['’]?t|unable\s+to)\s+find\s+(?:(?:my|our|the)\s+)?(?:room\s+)?key|(?:(?:i(?:['’]?m|\s+am)?|we(?:['’]?re|\s+are)?)\s+)?locked\s+out|(?:cannot|can['’]?t|unable\s+to)\s+(?:get|go)\s+(?:back\s+)?into\s+(?:my|our|the)\s+room|(?:(?:i|we)\s+)?forgot\s+(?:(?:my|our|the)\s+)?(?:room\s+)?key|(?:(?:i|we)\s+)?need\s+(?:a\s+)?(?:spare|replacement)\s+key|where\s+is\s+(?:(?:my|our|the)\s+)?spare\s+key)\b/i;
  const genericHumanContactRequest = /^(?:(?:please|hello|hi)\s+)?(?:i\s+(?:(?:need|want|would\s+like)\s+to|wanna)\s+(?:talk|speak)\s+(?:to|with)\s+(?:a\s+)?(?:human|person|someone|staff|(?:the\s+)?team|reception)|i\s+(?:(?:need|want|would\s+like)\s+to|wanna)\s+call\s+(?:you|(?:a\s+)?(?:human|person)|someone|staff|(?:the\s+)?team|reception)|(?:can|could)\s+i\s+(?:(?:talk|speak)\s+(?:to|with)|call)\s+(?:a\s+)?(?:you|human|person|someone|staff|(?:the\s+)?team|reception)|(?:talk|speak)\s+(?:to|with)\s+(?:a\s+)?(?:human|person|someone|staff|(?:the\s+)?team|reception)|contact\s+(?:the\s+)?(?:team|staff|reception)|(?:human|person|staff|reception)\s+please|i\s+need\s+(?:a\s+)?(?:human|person)|call\s+(?:the\s+)?(?:team|staff|reception))(?:\s+please)?$/;

  function routineServiceOpen(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const minutes = (Number(values.hour) * 60) + Number(values.minute);
    return values.weekday !== "Monday" && minutes >= (10 * 60 + 30) && minutes < (19 * 60 + 30);
  }

  function normalizeIntentText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

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

  function redactPrivateContact(value) {
    return String(value || "").replace(/(?:\+|00)?\d[\d ()-]{6,20}\d/g, "[contact supplied privately]");
  }

  function internationalContact(value) {
    for (const match of String(value || "").match(/(?:\+|00)\d[\d ()-]{6,20}\d/g) || []) {
      const number = match.replace(/\D/g, "");
      if (number.length >= 8 && number.length <= 15) return match.trim();
    }
    return "";
  }

  function bookingPromptFor(value) {
    const source = String(value || "");
    if (/\b(?:motorbike|motorcycle|scooter)\s+taxi\b/i.test(source)) return "I want to book a motorbike taxi.";
    if (/\b(?:taxi\s+boat|boat\s+taxi|longtail(?:\s+boat)?)\b/i.test(source)) return "I want to book a taxi boat.";
    if (/\bferr(?:y|ies)(?:\s+tickets?)?\b/i.test(source)) return "I want to book ferry tickets.";
    if (/\bfish(?:ing)?\b/i.test(source)) return "I want to book a fishing trip.";
    if (/\bsnorkel(?:ing|ling)?\b/i.test(source)) return "I want to book a snorkeling trip.";
    if (/\b(?:roctopus|dive|diving|scuba)\b/i.test(source)) return "I want to book diving.";
    if (/\btaxi\b/i.test(source)) return "Can you arrange a taxi?";
    return "I would like to make a booking.";
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

  function deriveConciergeAccessState(status = null, statusKnown = false) {
    const verified = statusKnown
      ? Boolean(status?.conciergeAccess === "verified"
        && status?.verified
        && roomOptions.includes(String(status.room || "")))
      : pageAccessMode === "granted";
    return {
      verified,
      registrationIncomplete: Boolean(verified && statusKnown && status?.registrationIncomplete === true),
      registrationStatus: verified ? String(status?.registrationStatus || "not_started") : "not_started"
    };
  }

  async function loadConciergeAccessState() {
    try {
      const response = await fetch("/api/stay/status", {
        credentials: "same-origin",
        headers: { accept: "application/json" }
      });
      if (!response.ok) return deriveConciergeAccessState();
      const status = await response.json().catch(() => ({}));
      if (status.verified && roomOptions.includes(String(status.room || ""))) {
        selectedRoom = String(status.room);
        safeStorage(window.localStorage, "set", "houseRoom", selectedRoom);
      }
      return deriveConciergeAccessState(status, true);
    } catch (_error) {
      return deriveConciergeAccessState();
    }
  }

  let conciergeAccessState = await loadConciergeAccessState();
  let isPublicAccess = !conciergeAccessState.verified;
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
        .map((item) => ({ ...item, content: redactPrivateContact(item.content) }))
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
  let privateWorkflowContact = "";
  let activeWorkflowState = null;
  let requestInFlight = false;

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
      { role: "user", content: redactPrivateContact(question).slice(0, 700) },
      { role: "assistant", content: redactPrivateContact(answer).slice(0, 700) }
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
      bookingWhatsapp: "#concierge-booking",
      bookingCall: contacts.houseSupport?.phoneTel ? `tel:${contacts.houseSupport.phoneTel}` : "",
      propertyEmergencyWhatsapp: propertyEmergency?.whatsapp,
      propertyEmergencyCall: "#house-emergency-call",
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
    const localizedLabel = window.HOUSE_I18N?.t(action.label) || action.label;
    if (action.route === "bookingWhatsapp") {
      return {
        label: interpolate(localizedLabel || "Book with Us", context),
        type: "prompt",
        prompt: bookingPromptFor(`${question} ${action.message || ""}`)
      };
    }
    if (action.route === "bookingCall") action = { ...action, route: "houseCall" };
    const routineHouseCall = action.route === "houseCall";
    const routineHouseContact = ["houseCall", "houseWhatsapp"].includes(action.route);
    if (!routineServiceOpen() && routineHouseContact) return null;
    if (action.type === "server_action" || action.type === "dismiss") {
      return { ...action, label: interpolate(localizedLabel, context), question: redactPrivateContact(question) };
    }
    if (action.type === "prompt") {
      return {
        ...action,
        label: interpolate(localizedLabel, context),
        prompt: interpolate(action.prompt || question, context)
      };
    }
    if (action.type === "registration") {
      const href = selectedRoom ? `/room/${selectedRoom}#verifiedStayAccess` : "";
      return href ? {
        label: interpolate(localizedLabel, context),
        href,
        style: action.style || "",
        external: false
      } : null;
    }
    if (action.type === "spare-key") {
      const href = selectedRoom ? `/room/${selectedRoom}#spareKeyAccess` : "";
      return href ? {
        type: "spare-key",
        label: interpolate(window.HOUSE_I18N?.t(action.label || "Secure spare-key access") || action.label || "Secure spare-key access", context),
        href,
        style: action.style || "",
        external: false
      } : null;
    }
    let href = action.href || routeMap()[action.route] || "";
    if (!href) return null;
    if (window.HOUSE_FEATURES?.explore === false && /^\/(?:activities|activity|bars|bar|beaches|beach|cafes|cafe|diving|explore|restaurants|restaurant|shopping|shop)\.html(?:[?#]|$)/i.test(href)) {
      return null;
    }
    if (action.message && /https:\/\/wa\.me\//i.test(href)) {
      const message = encodeURIComponent(interpolate(action.message, context));
      href += `${href.includes("?") ? "&" : "?"}text=${message}`;
    }
    return {
      label: interpolate(localizedLabel, context),
      href,
      style: action.style || "",
      external: /^https?:/i.test(href),
      routineHouseCall,
      routineHouseContact
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
  launcher.setAttribute("aria-label", "Open AI Concierge");
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "aiConciergePanel");
  launcher.innerHTML = `<span class="ai-concierge-launcher-icon is-desktop" aria-hidden="true">✦</span><span class="ai-concierge-launcher-icon is-mobile" aria-hidden="true">💬</span><span class="ai-concierge-launcher-label is-desktop">${cfg.buttonLabel}</span><span class="ai-concierge-launcher-label is-mobile">AI Concierge</span>`;

  const backdrop = document.createElement("div");
  backdrop.className = "ai-concierge-backdrop";
  backdrop.setAttribute("aria-hidden", "true");

  const panel = document.createElement("section");
  panel.className = "ai-concierge-panel";
  panel.id = "aiConciergePanel";
  panel.setAttribute("aria-label", "AI Concierge");

  function quickActionsMarkup() {
    const availableQuickActions = isPublicAccess ? (cfg.publicQuickActions || []) : (cfg.quickActions || []);
    return availableQuickActions.map((action) => {
      if (action.type === "registration" && selectedRoom) {
        return `<a class="ai-concierge-action" href="/room/${selectedRoom}#verifiedStayAccess">
          <span aria-hidden="true">${action.icon}</span><span>${action.label}</span>
        </a>`;
      }
      if (action.type === "spare-key" && selectedRoom) {
        return `<a class="ai-concierge-action" href="/room/${selectedRoom}#spareKeyAccess" data-spare-key-access="true">
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
  }

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
      <p class="ai-concierge-registration-status" role="status" ${conciergeAccessState.registrationIncomplete ? "" : "hidden"}>Registration incomplete</p>
      <div class="ai-concierge-actions">${quickActionsMarkup()}</div>
      <p class="ai-concierge-service-hours" ${isPublicAccess ? "hidden" : ""}>Housekeeping &amp; service hours: Tuesday–Sunday, 10:30 AM–7:30 PM. Housekeeping is unavailable on Mondays.</p>
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
  const quickActionsContainer = panel.querySelector(".ai-concierge-actions");
  const registrationReminder = panel.querySelector(".ai-concierge-registration-status");
  const serviceHours = panel.querySelector(".ai-concierge-service-hours");

  const mobileLauncherMedia = window.matchMedia("(max-width: 767px)");
  const mobileLauncherLayout = Object.freeze({
    expandedWidth: 148,
    compactSize: 52,
    collisionGap: 10,
    releaseGap: 16,
    scrollDelta: 6,
    collisionThrottleMs: 90,
    downwardDebounceMs: 650,
    upwardDebounceMs: 220
  });
  const importantControlSelector = [
    "a[href]",
    "button",
    "input:not([type='hidden'])",
    "textarea",
    "select",
    "summary",
    "[role='button']",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");
  let launcherLastScrollY = window.scrollY;
  let launcherHoldCompact = false;
  let launcherScrollStopTimer = 0;
  let launcherCollisionTimer = 0;
  let launcherLayoutFrame = 0;
  let launcherLastLayoutAt = 0;
  let launcherLift = 0;
  let launcherBaseBottom = null;
  let launcherResizeObserver = null;
  let launcherScrollDirection = 0;
  let launcherScrollDistance = 0;

  function rectanglesOverlap(first, second, gap = 0) {
    return first.left < second.right + gap
      && first.right > second.left - gap
      && first.top < second.bottom + gap
      && first.bottom > second.top - gap;
  }

  function overlapArea(first, second, gap = 0) {
    const width = Math.max(0, Math.min(first.right, second.right + gap) - Math.max(first.left, second.left - gap));
    const height = Math.max(0, Math.min(first.bottom, second.bottom + gap) - Math.max(first.top, second.top - gap));
    return width * height;
  }

  function visibleImportantControlRects(viewportHeight) {
    return [...document.querySelectorAll(importantControlSelector)]
      .filter((element) => element !== launcher
        && !launcher.contains(element)
        && !panel.contains(element)
        && !backdrop.contains(element)
        && !element.closest(".topbar")
        && !element.hidden
        && element.getAttribute("aria-hidden") !== "true")
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.top < viewportHeight);
  }

  function mobileLauncherMinimumTop(viewportHeight) {
    const topbar = document.querySelector(".topbar");
    const topbarRect = topbar?.getBoundingClientRect();
    const belowHeader = topbarRect
      && topbarRect.bottom > 0
      && topbarRect.top < viewportHeight
      ? topbarRect.bottom + mobileLauncherLayout.collisionGap
      : mobileLauncherLayout.collisionGap;
    return Math.min(belowHeader, viewportHeight - mobileLauncherLayout.compactSize - mobileLauncherLayout.collisionGap);
  }

  function nearestSafeLauncherTop(baseRect, controlRects, minimumTop) {
    const size = mobileLauncherLayout.compactSize;
    const gap = mobileLauncherLayout.collisionGap;
    const horizontallyRelevant = controlRects.filter((rect) =>
      baseRect.left < rect.right + gap && baseRect.right > rect.left - gap
    );
    const candidates = [
      baseRect.top,
      minimumTop,
      ...horizontallyRelevant.map((rect) => rect.top - gap - size)
    ]
      .map((top) => Math.max(minimumTop, Math.min(baseRect.top, top)))
      .filter((top, index, values) => values.indexOf(top) === index)
      .sort((first, second) => second - first);

    const candidateRect = (top) => ({
      left: baseRect.left,
      right: baseRect.right,
      top,
      bottom: top + size
    });
    const safeTop = candidates.find((top) =>
      horizontallyRelevant.every((rect) => !rectanglesOverlap(candidateRect(top), rect, gap))
    );
    if (Number.isFinite(safeTop)) return safeTop;

    return candidates.reduce((bestTop, top) => {
      const score = horizontallyRelevant.reduce(
        (total, rect) => total + overlapArea(candidateRect(top), rect, gap),
        0
      );
      const bestScore = horizontallyRelevant.reduce(
        (total, rect) => total + overlapArea(candidateRect(bestTop), rect, gap),
        0
      );
      return score < bestScore ? top : bestTop;
    }, candidates[0] ?? baseRect.top);
  }

  function setMobileLauncherState(compact, collision, lift) {
    launcher.classList.toggle("is-compact", compact);
    launcher.classList.toggle("is-collision-shifted", lift > 0);
    launcher.dataset.mobileState = compact ? "compact" : "expanded";
    launcher.dataset.collision = collision ? "true" : "false";
    if (launcherLift !== lift) {
      launcherLift = lift;
      launcher.style.setProperty("--ai-concierge-lift", `${lift}px`);
    }
  }

  function resetMobileLauncherState() {
    launcherHoldCompact = false;
    launcherLift = 0;
    launcherBaseBottom = null;
    launcher.classList.remove("is-compact", "is-collision-shifted");
    launcher.style.removeProperty("--ai-concierge-lift");
    launcher.dataset.mobileState = "desktop";
    launcher.dataset.collision = "false";
  }

  function evaluateMobileLauncher() {
    launcherLayoutFrame = 0;
    launcherLastLayoutAt = window.performance.now();
    if (!mobileLauncherMedia.matches) {
      resetMobileLauncherState();
      return;
    }

    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const currentRect = launcher.getBoundingClientRect();
    if (!currentRect.width || !currentRect.height) return;
    if (launcherLift === 0 || launcherBaseBottom === null) launcherBaseBottom = currentRect.bottom;

    const right = currentRect.right;
    const baseBottom = launcherBaseBottom;
    const size = mobileLauncherLayout.compactSize;
    const expandedRect = {
      left: right - mobileLauncherLayout.expandedWidth,
      right,
      top: baseBottom - size,
      bottom: baseBottom
    };
    const compactRect = {
      left: right - size,
      right,
      top: baseBottom - size,
      bottom: baseBottom
    };
    const controlRects = visibleImportantControlRects(viewportHeight);
    const collisionGap = launcher.classList.contains("is-compact")
      ? mobileLauncherLayout.releaseGap
      : mobileLauncherLayout.collisionGap;
    const expandedCollision = controlRects.some((rect) => rectanglesOverlap(expandedRect, rect, collisionGap));
    const compactCollision = controlRects.some((rect) => rectanglesOverlap(compactRect, rect, mobileLauncherLayout.collisionGap));
    const compact = launcherHoldCompact || expandedCollision;
    const safeTop = compact && compactCollision
      ? nearestSafeLauncherTop(compactRect, controlRects, mobileLauncherMinimumTop(viewportHeight))
      : compactRect.top;
    const lift = Math.max(0, Math.round(compactRect.top - safeTop));
    setMobileLauncherState(compact, expandedCollision || compactCollision, lift);
  }

  function scheduleMobileLauncherLayout(immediate = false) {
    if (!mobileLauncherMedia.matches) {
      resetMobileLauncherState();
      return;
    }
    if (immediate && launcherCollisionTimer) {
      window.clearTimeout(launcherCollisionTimer);
      launcherCollisionTimer = 0;
    }
    const elapsed = window.performance.now() - launcherLastLayoutAt;
    const delay = immediate ? 0 : Math.max(0, mobileLauncherLayout.collisionThrottleMs - elapsed);
    if (delay > 0) {
      if (!launcherCollisionTimer) {
        launcherCollisionTimer = window.setTimeout(() => {
          launcherCollisionTimer = 0;
          scheduleMobileLauncherLayout(true);
        }, delay);
      }
      return;
    }
    if (launcherLayoutFrame) return;
    launcherLayoutFrame = window.requestAnimationFrame(evaluateMobileLauncher);
  }

  function handleMobileLauncherScroll() {
    if (!mobileLauncherMedia.matches) return;
    const nextScrollY = window.scrollY;
    const delta = nextScrollY - launcherLastScrollY;
    launcherLastScrollY = nextScrollY;
    const direction = Math.sign(delta);
    if (direction && direction !== launcherScrollDirection) {
      launcherScrollDirection = direction;
      launcherScrollDistance = 0;
    }
    launcherScrollDistance += Math.abs(delta);
    let debounce = 0;

    if (direction > 0 && launcherScrollDistance >= mobileLauncherLayout.scrollDelta) {
      launcherHoldCompact = true;
      launcher.classList.add("is-compact");
      launcher.dataset.mobileState = "compact";
      debounce = mobileLauncherLayout.downwardDebounceMs;
    } else if (direction > 0 && launcher.classList.contains("is-compact")) {
      launcherHoldCompact = true;
      debounce = mobileLauncherLayout.downwardDebounceMs;
    } else if (direction < 0 && launcher.classList.contains("is-compact")) {
      launcherHoldCompact = true;
      debounce = mobileLauncherLayout.upwardDebounceMs;
    }

    scheduleMobileLauncherLayout();
    if (!debounce) return;
    window.clearTimeout(launcherScrollStopTimer);
    launcherScrollStopTimer = window.setTimeout(() => {
      launcherHoldCompact = false;
      launcherScrollDirection = 0;
      launcherScrollDistance = 0;
      scheduleMobileLauncherLayout(true);
    }, debounce);
  }

  function resetMobileLauncherGeometry() {
    launcherLift = 0;
    launcherBaseBottom = null;
    launcher.style.setProperty("--ai-concierge-lift", "0px");
    scheduleMobileLauncherLayout(true);
  }

  launcher.dataset.mobileState = mobileLauncherMedia.matches ? "expanded" : "desktop";
  launcher.dataset.collision = "false";
  window.addEventListener("scroll", handleMobileLauncherScroll, { passive: true });
  window.addEventListener("resize", resetMobileLauncherGeometry, { passive: true });
  window.visualViewport?.addEventListener("resize", resetMobileLauncherGeometry, { passive: true });
  if (typeof mobileLauncherMedia.addEventListener === "function") {
    mobileLauncherMedia.addEventListener("change", resetMobileLauncherGeometry);
  } else {
    mobileLauncherMedia.addListener(resetMobileLauncherGeometry);
  }
  if (typeof ResizeObserver === "function") {
    launcherResizeObserver = new ResizeObserver(() => scheduleMobileLauncherLayout());
    launcherResizeObserver.observe(document.body);
  }
  document.fonts?.ready.then(() => scheduleMobileLauncherLayout(true));

  function appendMessage(role, text, actions = [], question = "", metadata = {}) {
    const message = document.createElement("article");
    message.className = `ai-concierge-message is-${role}`;
    if (role === "guest") message.dataset.i18nSkip = "true";
    const bubble = document.createElement("div");
    bubble.className = "ai-concierge-bubble";
    if (metadata.localized) bubble.dataset.i18nSkip = "true";
    bubble.textContent = interpolate(text, contextValues(question));
    message.appendChild(bubble);

    const resolvedActions = actions.map((action) => resolveAction(action, question)).filter(Boolean);
    if (resolvedActions.length) {
      const actionRow = document.createElement("div");
      actionRow.className = "ai-concierge-message-actions";
      resolvedActions.forEach((action) => {
        const link = action.type === "server_action" || action.type === "dismiss" || action.type === "prompt"
          ? document.createElement("button") : document.createElement("a");
        link.className = `ai-concierge-message-action${action.style === "danger" ? " is-danger" : ""}`;
        if (link.tagName === "A") link.href = action.href;
        else link.type = "button";
        link.textContent = action.label;
        if (action.type === "server_action") {
          link.dataset.serverAction = action.action;
          link.dataset.serverQuestion = redactPrivateContact(action.question || question);
        } else if (action.type === "dismiss") {
          link.dataset.dismissAction = "true";
        } else if (action.type === "prompt") {
          link.dataset.prompt = action.prompt;
        } else if (action.type === "spare-key") {
          link.dataset.spareKeyAccess = "true";
        } else {
          link.dataset.action = "conciergeHandoff";
          link.dataset.conciergeHumanHandoff = "true";
          if (action.routineHouseContact) link.dataset.routineHouseContact = "true";
          if (action.routineHouseCall) link.dataset.routineHouseCall = "true";
          if (action.href === "#house-emergency-call") link.dataset.houseEmergencyCall = "true";
        }
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

  function appendStatus() {
    const status = appendMessage("concierge", "");
    status.classList.add("is-status");
    status.setAttribute("aria-busy", "true");
    status.setAttribute("role", "status");
    const bubble = status.querySelector(".ai-concierge-bubble");
    bubble.dataset.i18nSkip = "true";
    bubble.setAttribute("aria-label", window.HOUSE_I18N?.t("Concierge is thinking") || "Concierge is thinking");
    bubble.innerHTML = `
      <span class="ai-concierge-thinking-dots" aria-hidden="true">
        <span></span><span></span><span></span>
      </span>`;
    return status;
  }

  function updateRoomContext() {
    roomContext.textContent = selectedRoom ? `Room ${selectedRoom}` : "Set your room";
  }

  function applyConciergeAccessState(nextState) {
    conciergeAccessState = nextState;
    isPublicAccess = !nextState.verified;
    panel.dataset.stayAccess = nextState.verified ? "verified" : "unverified";
    quickActionsContainer.innerHTML = quickActionsMarkup();
    registrationReminder.textContent = window.HOUSE_I18N?.t("Registration incomplete") || "Registration incomplete";
    registrationReminder.hidden = !nextState.registrationIncomplete;
    serviceHours.hidden = isPublicAccess;
    updateRoomContext();
    if (selectedRoom) roomSelector.hidden = true;
    window.HOUSE_I18N?.localize?.(quickActionsContainer);
  }

  async function refreshConciergeAccessState() {
    applyConciergeAccessState(await loadConciergeAccessState());
  }

  applyConciergeAccessState(conciergeAccessState);

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
    refreshConciergeAccessState();
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
        privateReplyContact: privateWorkflowContact,
        workflowState: activeWorkflowState,
        page: currentPage,
        language: window.HOUSE_I18N?.language || window.localStorage.getItem("houseGuideLanguage") || "en"
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

  async function runServerAction(button) {
    if (button.disabled) return;
    const question = button.dataset.serverQuestion || "Confirmed urgent property emergency";
    const row = button.closest(".ai-concierge-message-actions");
    row?.querySelectorAll("button").forEach((item) => { item.disabled = true; });
    const status = appendStatus();
    try {
      const response = await fetch(cfg.apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: button.dataset.serverAction,
          question,
          room: selectedRoom || "",
          sessionId,
          history: conversationHistory.slice(-historyLimit),
          language: window.HOUSE_I18N?.language || "en"
        })
      });
      const result = await response.json().catch(() => ({}));
      status.remove();
      if (!response.ok) throw new Error(result.message || "The urgent alert could not be sent.");
      row?.remove();
      deliverAnswer(result, question);
    } catch (error) {
      status.remove();
      appendMessage("concierge", error.message || "The urgent alert could not be sent. Please call The House Emergency Support now.", [
        { label: "Call The House Emergency Support", type: "route", route: "propertyEmergencyCall", style: "danger" }
      ]);
    }
  }

  async function fallbackAnswer(question) {
    if (isPublicAccess) {
      return {
        answer: "Please complete guest access from your permanent Room link. Thai-only stays need only the Airbnb confirmation code or private House stay code and the Thai-national selection. If any foreign guests are staying overnight, securely submit passport information for every non-Thai guest—not only the booking guest. Emergency help remains available without verification.",
        actions: [{ label: "Complete guest access", type: "registration" }],
        source: "public-fallback",
        interactionId: null
      };
    }
    const engine = await loadEngine();
    return { ...engine.answer(question), source: "device-fallback", interactionId: null };
  }

  function isExplicitBookingRetry(question) {
    const source = String(question || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (["retry", "try again", "try it again", "try sending it again"].includes(source)) return true;
    const prefix = "(?:(?:can|could|would) you (?:please )?|please )?";
    const activity = "(?:diving|fishing(?: trip)?|snorkeling(?: trip)?|taxi|ferry(?: tickets?)?|motorbike(?: taxi)?|taxi boat)";
    const target = `(?:it|(?:(?:my|the) )?(?:${activity} )?(?:booking|request))`;
    return new RegExp(`^${prefix}(?:retry(?: ${target})?|(?:try|send|resend)(?: sending)? ${target} again)$`, "i").test(source);
  }

  function requiresProtectedServer(question) {
    if (activeWorkflowState) return true;
    const source = String(question || "");
    const normalized = source.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const impliedLuggageRequest = /\b(?:arrival|arriving|departure|departing)\b/i.test(source)
      && /\b(?:\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bags?|suitcases?|pieces?|luggage\s+items?)\b/i.test(source);
    const propertyInformationControl = /\b(?:what animals live|animals (?:are|is) (?:there|common)|are mosquitoes common|how does (?:the )?(?:ac|air con|air conditioner) work|what is (?:the )?wifi password)\b/.test(normalized);
    const propertyIssue = !propertyInformationControl && (
      /\b(?:rats?|mice|mouse|cockroaches?|roaches?|ants?|spiders?|termites?|fleas?|bed ?bugs?|bees?|wasps?)\b.{0,80}\b(?:in|inside|under|above|behind|all over|everywhere|nest|problem|infestation|room|bathroom|roof|ceiling)\b/.test(normalized)
      || /\b(?:scratching|droppings|animal nest|strange smell|weird smell|unusual smell|sewage smell|rotten egg smell|musty smell|mold smell|mould smell)\b/.test(normalized)
      || /\b(?:bathroom|toilet|shower|drain|sink|tap|faucet|pipe|ac|air con|air conditioner|fan|fridge|refrigerator|tv|light|socket|outlet|wifi|internet|bed|chair|desk|curtain|door|window|lock|furniture)\b.{0,65}\b(?:smells?|stinks?|leak|leaking|drip|dripping|blocked|clogged|overflowing|not cold|isn t cold|not working|doesn t work|isn t working|broken|damaged|stuck|loose|no hot water|no water|low water pressure)\b/.test(normalized)
      || /\b(?:burning smell|smell(?:s|ing)? (?:like )?burning|smoke (?:is )?(?:coming )?from|water (?:is )?pouring|ceiling (?:is )?(?:falling down|collapsing|caving in)|snake)\b/.test(normalized)
    );
    return isExplicitBookingRetry(source)
      || genericHumanContactRequest.test(normalized)
      || /(?:\+|00)?\d[\d ()-]{6,20}\d/.test(source)
      || impliedLuggageRequest
      || /\b(?:luggage|baggage|store\s+(?:my|our)?\s*bags?|room\s+cleaning|clean\s+(?:my|our|the)\s+room)\b/i.test(source)
      || /\b(?:my|our|the)\s+room\s+(?:(?:is|feels|looks|seems)\s+(?:(?:really|very|quite|so)\s+)?(?:dirty|messy|unclean)|needs?\s+(?:a\s+)?clean(?:ing)?)\b/i.test(source)
      || lostKeyRequest.test(source)
      || /(?:^\s*(?:please\s+)?(?:book|reserve|arrange)\b|\b(?:please\s+(?:book|reserve|arrange)|can\s+you\s+(?:book|reserve|arrange)|could\s+you\s+(?:book|reserve|arrange)|help\s+me\s+(?:book|reserve|arrange)|i\s+(?:want|wanna|need|would\s+like)\s+(?:you\s+)?(?:to\s+)?(?:book|reserve|arrange)|book\s+(?:me|us)|make\s+(?:a\s+)?(?:booking|reservation))\b)/i.test(source)
      || /(?:\b(?:i\s+(?:need|want|would\s+like)|can\s+(?:i|we)\s+(?:get|have)|get\s+me|send\s+me)\s+(?:a\s+)?(?:taxi(?:\s+boat)?|longtail\s+boat|motorbike\s+taxi|ferry\s+tickets?)\b|^\s*(?:taxi(?:\s+boat)?|longtail(?:\s+boat)?|motorbike\s+taxi|ferry(?:\s+tickets?)?)\b(?=[\s\S]*\b(?:today|tomorrow|next\s+(?:mon|tues|wednes|thurs|fri|satur|sun)day|in\s+\d{1,3}\s+days?|from|to|at\s+\d)))/i.test(source)
      || /(?:\b(?:i|we)\s+(?:(?:want|need|plan)\s+to|would\s+like\s+to|wanna)\s+(?:(?:go|book|arrange)\s+)?(?:(?:scuba\s+)?div(?:e|ing)|fishing|snorkel(?:ing|ling)?)\b|\b(?:i|we)['’]d\s+like\s+to\s+(?:(?:go|book|arrange)\s+)?(?:(?:scuba\s+)?div(?:e|ing)|fishing|snorkel(?:ing|ling)?)\b|\b(?:i|we)\s+(?:want|need|would\s+like)\s+(?:a\s+)?(?:diving|fishing|snorkel(?:ing|ling)?)\s+(?:trip|tour)\b|\b(?:take\s+(?:me|us)|can\s+you\s+take\s+(?:me|us)|help\s+(?:me|us)\s+(?:go\s+)?)\s*(?:(?:scuba\s+)?div(?:e|ing)|fishing|snorkel(?:ing|ling)?)\b)/i.test(source)
      || propertyIssue;
  }

  function deliverAnswer(result, question) {
    const suppliedContact = internationalContact(question);
    const privateContactWorkflow = result.workflow?.type === "luggage"
      || result.workflow?.type === "booking";
    const activePrivateWorkflow = result.workflow?.status === "collecting"
      || (result.workflow?.type === "booking" && result.workflow?.status === "delivery_failed");
    const activeWorkflow = activePrivateWorkflow
      || (result.workflow?.type === "property_issue" && result.workflow?.status === "monitoring")
      || (result.workflow?.type === "lost_key" && result.workflow?.status === "awaiting_fee_acceptance");
    activeWorkflowState = activeWorkflow ? result.workflow : null;
    if (privateContactWorkflow
      && activePrivateWorkflow
      && result.workflow.retainPrivateContact) {
      privateWorkflowContact = suppliedContact || privateWorkflowContact;
    } else {
      privateWorkflowContact = "";
    }
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
      {
        interactionId: result.interactionId,
        localized: result.language && result.language !== "en"
      }
    );
    rememberExchange(question, result.answer);
  }

  async function submitQuestion(rawQuestion) {
    if (requestInFlight) return;
    const question = String(rawQuestion || input.value).trim();
    if (!question) return;
    if (question.length > 800) {
      appendMessage("concierge", "Please shorten your question to 800 characters or fewer.");
      return;
    }
    panel.classList.add("has-conversation");
    const priorHistory = conversationHistory.slice(-historyLimit);
    input.value = "";
    // Send the original value only to the protected request handler. Every
    // visible guest bubble is redacted immediately for every request type.
    appendMessage("guest", redactPrivateContact(question));
    requestInFlight = true;
    sendButton.disabled = true;
    input.disabled = true;
    const status = appendStatus();

    try {
      let result;
      try {
        result = await askServer(question, priorHistory);
      } catch (serverError) {
        if (serverError.status === 429) throw serverError;
        if (requiresProtectedServer(question)) {
          const protectedError = new Error("I couldn’t securely process that request, so it has not been sent. Please try again in a moment.");
          protectedError.protectedWorkflow = true;
          throw protectedError;
        }
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
      if (error.protectedWorkflow) {
        appendMessage("concierge", error.message);
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
      requestInFlight = false;
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  appendMessage("concierge", cfg.initialMessage || "Hello. What can I help you with during your stay?");
  if (!isPublicAccess) loadEngine().catch(() => {});

  const appearanceDelay = Number.isFinite(cfg.appearanceDelayMs) ? cfg.appearanceDelayMs : 1200;
  window.setTimeout(() => {
    launcher.classList.add("is-visible");
    scheduleMobileLauncherLayout(true);
  }, appearanceDelay);

  launcher.addEventListener("click", () => {
    if (panel.classList.contains("is-open")) {
      closePanel();
      return;
    }
    openPanel();
    refreshConciergeAccessState();
  });
  closeButton.addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel);
  roomContext.addEventListener("click", openRoomSelector);
  panel.querySelector("[data-close-room-selector]").addEventListener("click", closeRoomSelector);

  panel.addEventListener("click", (event) => {
    const possibleRoutineHandoff = event.target.closest('a[data-concierge-human-handoff="true"]');
    const routineContactHref = possibleRoutineHandoff?.getAttribute("href") || "";
    const routineContact = event.target.closest("[data-routine-house-contact],[data-routine-house-call]")
      || ([routeMap().houseCall, routeMap().houseWhatsapp].includes(routineContactHref) ? possibleRoutineHandoff : null);
    if (routineContact && !routineServiceOpen()) {
      event.preventDefault();
      routineContact.closest(".ai-concierge-message-actions")?.remove();
      appendMessage(
        "concierge",
        "Our team is currently outside normal service hours. I can continue helping you here. If this is urgent, please use Emergency help.",
        [{ label: "Emergency help", type: "link", href: "/emergency.html" }]
      );
      return;
    }
    const emergencyCall = event.target.closest("[data-house-emergency-call]");
    if (emergencyCall) {
      event.preventDefault();
      fetch("/api/concierge/emergency-contact", { credentials: "same-origin", headers: { accept: "application/json" } })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("unavailable")))
        .then((contact) => { if (contact.phoneTel) window.location.href = `tel:${contact.phoneTel}`; })
        .catch(() => appendMessage("concierge", "The House emergency call line is temporarily unavailable. Please call Koh Tao Rescue if anyone is in immediate danger."));
      return;
    }
    const spareKeyAccess = event.target.closest("[data-spare-key-access]");
    if (spareKeyAccess) {
      event.preventDefault();
      const target = new URL(spareKeyAccess.href, window.location.href);
      closePanel();
      if (target.pathname === window.location.pathname) {
        if (window.location.hash !== "#spareKeyAccess") history.pushState(null, "", target.href);
        window.dispatchEvent(new CustomEvent("house:open-spare-key"));
      } else {
        window.location.assign(target.href);
      }
      return;
    }
    const serverAction = event.target.closest("[data-server-action]");
    if (serverAction) {
      runServerAction(serverAction);
      return;
    }
    const dismissAction = event.target.closest("[data-dismiss-action]");
    if (dismissAction) {
      dismissAction.closest(".ai-concierge-message-actions")?.remove();
      appendMessage("concierge", window.HOUSE_I18N?.t("Okay — I haven’t contacted The House team.") || "Okay — I haven’t contacted The House team.");
      return;
    }
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
      appendMessage("concierge", selectedRoom
        ? `Open the Room ${selectedRoom} page and verify your Airbnb confirmation code or private House stay code to continue securely.`
        : "Please select your booked room first. Its permanent Room page will verify your Airbnb confirmation code or private House stay code before opening secure registration.");
    } else if (actionButton?.dataset.conciergeAction === "spare-key") {
      appendMessage("concierge", selectedRoom
        ? `Open the lost-key section on your Room ${selectedRoom} page and follow the steps there. The House team will help you regain access.`
        : "Please select your booked room first, then open the lost-key option on your Room page.");
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
    const bookingLink = event.target.closest('[data-action="booking"],[data-link="bookingWhatsapp"],a[href="#concierge-booking"]');
    if (bookingLink && !panel.contains(bookingLink)) {
      event.preventDefault();
      const explicit = bookingLink.dataset.conciergeBookingPrompt
        || window.HOUSE_CONCIERGE_BOOKING?.currentPrompt?.();
      const prompt = explicit || (/diving\.html$/i.test(currentPage) || /(?:roctopus|dive)/i.test(`${location.search} ${bookingLink.textContent || ""}`)
        ? "I want to book diving."
        : "I would like to make a booking.");
      openPanel({ askRoom: true });
      submitQuestion(prompt);
      return;
    }
    const contactLink = event.target.closest('[data-action="contact"],[data-link="houseWhatsapp"],[data-link="houseCall"]');
    if (!contactLink || panel.contains(contactLink) || contactLink.dataset.conciergeHumanHandoff) return;
    event.preventDefault();
    openPanel({ askRoom: true });
  }, true);

  window.addEventListener("house:open-concierge", (event) => {
    openPanel({ askRoom: Boolean(event.detail?.askRoom) });
    if (event.detail?.prompt) submitQuestion(event.detail.prompt);
  });

  window.addEventListener("house:stay-access-updated", (event) => {
    const status = event.detail || {};
    if (status.verified && roomOptions.includes(String(status.room || ""))) {
      selectedRoom = String(status.room);
      safeStorage(window.localStorage, "set", "houseRoom", selectedRoom);
    }
    applyConciergeAccessState(deriveConciergeAccessState(status, true));
  });
  window.addEventListener("pageshow", refreshConciergeAccessState);

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
