
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

  document.body.appendChild(panel);
  document.body.appendChild(launcher);

  const closeButton = panel.querySelector(".ai-concierge-close");
  const input = panel.querySelector(".ai-concierge-input");
  const sendButton = panel.querySelector(".ai-concierge-send");
  const response = panel.querySelector(".ai-concierge-response");

  const openPanel = () => {
    panel.classList.add("is-open");
    launcher.setAttribute("aria-expanded", "true");
  };

  const closePanel = () => {
    panel.classList.remove("is-open");
    launcher.setAttribute("aria-expanded", "false");
  };

  launcher.addEventListener("click", () => {
    panel.classList.contains("is-open") ? closePanel() : openPanel();
  });

  closeButton.addEventListener("click", closePanel);

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
  });
})();
