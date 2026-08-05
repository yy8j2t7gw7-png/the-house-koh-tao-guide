(function () {
  const actions = window.GUEST_GUIDE_ACTIONS || {};

  const labels = {
    contact: actions.contact?.label || "Contact Us",
    booking: actions.booking?.label || "Book with Us",
    call: actions.call?.label || "Call",
    map: actions.map?.label || "Open Map",
    website: actions.website?.label || "Visit Website",
    discover: actions.discover?.label || "Discover →"
  };

  const callLinkKeys = new Set([
    "houseCall",
    "bookingCall",
    "medicalNationalCall",
    "rescueCall",
    "policeCall",
    "touristPoliceCall",
    "hospitalCall"
  ]);

  const inferAction = (element) => {
    const explicit = element.getAttribute("data-action");
    if (explicit) return explicit;

    const linkKey = element.getAttribute("data-link") || "";
    if (linkKey === "houseWhatsapp") return "contact";
    if (linkKey === "bookingWhatsapp") return "booking";
    if (callLinkKeys.has(linkKey)) return "call";

    const href = element.getAttribute("href") || "";
    if (href.toLowerCase().startsWith("tel:")) return "call";

    return "";
  };

  const applyToElement = (element) => {
    if (!(element instanceof Element) || !element.matches("a,button")) return;

    const action = inferAction(element);
    const label = labels[action];
    if (!action || !label) return;

    // Only write attributes/text when they actually differ. This prevents
    // the MutationObserver from repeatedly reacting to its own changes.
    if (element.getAttribute("data-action") !== action) {
      element.setAttribute("data-action", action);
    }

    if (element.textContent.trim() !== label) {
      element.textContent = label;
    }
  };

  const applyActions = (root = document) => {
    if (root instanceof Element && root.matches("a,button")) {
      applyToElement(root);
    }

    root.querySelectorAll?.("a,button").forEach(applyToElement);
  };

  applyActions();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) applyActions(node);
        });
      } else if (
        mutation.type === "attributes" &&
        mutation.target instanceof Element
      ) {
        applyToElement(mutation.target);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href", "data-link", "data-action"]
  });
})();
