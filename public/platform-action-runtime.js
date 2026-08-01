(function () {
  const actionConfig = window.GUEST_GUIDE_ACTIONS || {};

  const normalizeText = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const labelMap = new Map([
    ["Contact Us", actionConfig.contact?.label || "Contact Us"],
    ["Contact Us", actionConfig.contact?.label || "Contact Us"],
    ["Contact Us", actionConfig.contact?.label || "Contact Us"],
    ["Contact Us", actionConfig.contact?.label || "Contact Us"],
    ["Contact Us", actionConfig.contact?.label || "Contact Us"],
    ["Contact Us", actionConfig.contact?.label || "Contact Us"],
    ["contact", actionConfig.contact?.label || "Contact Us"],
    ["book with us", actionConfig.booking?.label || "Book with Us"],
    ["book with us →", actionConfig.booking?.label || "Book with Us"],
    ["website / menu", actionConfig.website?.label || "Visit Website"],
    ["view website / menu", actionConfig.website?.label || "Visit Website"],
    ["visit website", actionConfig.website?.label || "Visit Website"],
    ["explore →", actionConfig.discover?.label || "Discover →"],
    ["view details", actionConfig.discover?.label || "Discover →"],
    ["call", actionConfig.call?.label || "Call"]
  ]);

  const applyLabels = (root = document) => {
    root.querySelectorAll("a, button").forEach((element) => {
      const current = normalizeText(element.textContent);
      const replacement = labelMap.get(current);
      if (replacement) element.textContent = replacement;
    });

    root.querySelectorAll("[data-action]").forEach((element) => {
      const key = element.dataset.action;
      const config = actionConfig[key];
      if (config?.label) element.textContent = config.label;
    });
  };

  applyLabels();

  // Handles buttons rendered later by JavaScript.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          applyLabels(node);
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
