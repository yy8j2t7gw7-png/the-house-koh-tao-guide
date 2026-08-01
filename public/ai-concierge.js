
(function () {
  const cfg = window.AI_CONCIERGE_CONFIG;
  if (!cfg || !cfg.enabled) return;

  const contacts = window.HOUSE_GUIDE || {};
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const pagePrompts = cfg.pagePrompts[currentPage] || [];

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

  const actionsHtml = (cfg.quickActions || []).map((action) => {
    if (action.type === "link") {
      return `<a class="ai-concierge-action" href="${action.href}">
        <span aria-hidden="true">${action.icon}</span><span>${action.label}</span>
      </a>`;
    }
    return `<button class="ai-concierge-action" type="button" data-concierge-action="${action.type}">
      <span aria-hidden="true">${action.icon}</span><span>${action.label}</span>
    </button>`;
  }).join("");

  const promptHtml = pagePrompts.length
    ? `<div class="ai-concierge-context">
         <h4>Questions about this page</h4>
         ${pagePrompts.map((prompt) =>
           `<button class="ai-concierge-prompt" type="button" data-prompt="${prompt.replace(/"/g, "&quot;")}">${prompt}</button>`
         ).join("")}
       </div>`
    : "";

  panel.innerHTML = `
    <div class="ai-concierge-drag-handle" aria-hidden="true"></div>
    <div class="ai-concierge-head">
      <div>
        <h2>AI Concierge</h2>
        <p>Available throughout your stay</p>
      </div>
      <button class="ai-concierge-close" type="button" aria-label="Close AI Concierge">×</button>
    </div>
    <div class="ai-concierge-body">
      <div class="ai-concierge-welcome">
        <h3>${cfg.welcomeTitle}</h3>
        <p>${cfg.welcomeText}</p>
      </div>
      <div class="ai-concierge-actions">${actionsHtml}</div>
      ${promptHtml}
      <div class="ai-concierge-chat">
        <div class="ai-concierge-input-row">
          <input class="ai-concierge-input" type="text" placeholder="${cfg.placeholder}" aria-label="Ask the AI Concierge">
          <button class="ai-concierge-send" type="button">Send</button>
        </div>
        <div class="ai-concierge-response" aria-live="polite"></div>
        <p class="ai-concierge-note">The live AI connection will be added in the next phase.</p>
      </div>
    </div>`;

  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  const appearanceDelay = Number.isFinite(cfg.appearanceDelayMs)
    ? cfg.appearanceDelayMs
    : 5000;

  window.setTimeout(() => {
    launcher.classList.add("is-visible");
  }, appearanceDelay);

  const closeButton = panel.querySelector(".ai-concierge-close");
  const input = panel.querySelector(".ai-concierge-input");
  const sendButton = panel.querySelector(".ai-concierge-send");
  const response = panel.querySelector(".ai-concierge-response");

  let lastFocusedElement = null;
  let dragStartY = null;
  let dragCurrentY = null;

  const openPanel = () => {
    lastFocusedElement = document.activeElement;
    backdrop.classList.add("is-open");
    panel.classList.add("is-open");
    document.body.classList.add("ai-concierge-open");
    launcher.setAttribute("aria-expanded", "true");

    window.setTimeout(() => {
      closeButton.focus();
    }, 120);
  };

  const closePanel = () => {
    backdrop.classList.remove("is-open");
    panel.classList.remove("is-open", "is-dragging");
    panel.style.transform = "";
    document.body.classList.remove("ai-concierge-open");
    launcher.setAttribute("aria-expanded", "false");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      window.setTimeout(() => lastFocusedElement.focus(), 80);
    }
  };

  launcher.addEventListener("click", () => {
    panel.classList.contains("is-open") ? closePanel() : openPanel();
  });

  closeButton.addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel);

  panel.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-concierge-action]");
    if (actionButton) {
      const type = actionButton.dataset.conciergeAction;
      if (type === "contact" && contacts.houseSupport?.whatsapp) {
        window.open(contacts.houseSupport.whatsapp, "_blank", "noopener");
      }
      if (type === "booking" && contacts.bookings?.whatsapp) {
        window.open(contacts.bookings.whatsapp, "_blank", "noopener");
      }
    }

    const promptButton = event.target.closest("[data-prompt]");
    if (promptButton) {
      input.value = promptButton.dataset.prompt;
      input.focus();
    }
  });


  const resetDrag = () => {
    dragStartY = null;
    dragCurrentY = null;
    panel.classList.remove("is-dragging");
    panel.style.transform = "";
  };

  panel.addEventListener("touchstart", (event) => {
    if (window.innerWidth > 640 || !panel.classList.contains("is-open")) return;
    if (event.touches.length !== 1) return;

    dragStartY = event.touches[0].clientY;
    dragCurrentY = dragStartY;
    panel.classList.add("is-dragging");
  }, { passive:true });

  panel.addEventListener("touchmove", (event) => {
    if (dragStartY === null || event.touches.length !== 1) return;

    dragCurrentY = event.touches[0].clientY;
    const distance = Math.max(0, dragCurrentY - dragStartY);
    panel.style.transform = `translateY(${distance}px)`;
  }, { passive:true });

  panel.addEventListener("touchend", () => {
    if (dragStartY === null) return;

    const distance = Math.max(0, (dragCurrentY ?? dragStartY) - dragStartY);
    if (distance > 110) {
      closePanel();
    } else {
      resetDrag();
    }
  });

  const showPrototypeResponse = () => {
    const question = input.value.trim();
    if (!question) return;
    response.textContent = "The concierge interface is ready. In the next phase, this question will be answered using The House’s approved guide information.";
    response.classList.add("is-visible");
  };

  sendButton.addEventListener("click", showPrototypeResponse);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") showPrototypeResponse();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanel();

    if (event.key === "Tab" && panel.classList.contains("is-open")) {
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
    }
  });
})();
