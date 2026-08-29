(function () {
  const actions = window.GUEST_GUIDE_ACTIONS || {};

  const sourceLabels = {
    contact: actions.contact?.label || "Contact Us",
    booking: actions.booking?.label || "Book with Us",
    bookingCall: actions.bookingCall?.label || "Call Us",
    rescueCall: "Call Koh Tao Rescue",
    medicalEmergencyCall: "Call Medical Emergency 1669",
    call: actions.call?.label || "Call",
    map: actions.map?.label || "Open Map",
    website: actions.website?.label || "Visit Website",
    discover: actions.discover?.label || "Discover →"
  };

  const localizedLabel = (action) => {
    const source = sourceLabels[action];
    return window.HOUSE_I18N?.t(source) || source;
  };

  const callLinkKeys = new Set([
    "houseCall",
    "medicalNationalCall",
    "rescueCall",
    "policeCall",
    "touristPoliceCall",
    "hospitalCall"
  ]);

  const inferAction = (element) => {
    const linkKey = element.getAttribute("data-link") || "";
    if (linkKey === "houseWhatsapp") return "contact";
    if (linkKey === "bookingWhatsapp") return "booking";
    if (linkKey === "bookingCall") return "bookingCall";
    if (linkKey === "rescueCall") return "rescueCall";
    if (linkKey === "medicalNationalCall") return "medicalEmergencyCall";
    if (callLinkKeys.has(linkKey)) return "call";

    const explicit = element.getAttribute("data-action");
    if (explicit) return explicit;

    const href = element.getAttribute("href") || "";
    if (href.toLowerCase().startsWith("tel:")) return "call";

    return "";
  };

  const applyToElement = (element) => {
    if (!(element instanceof Element) || !element.matches("a,button")) return;

    const action = inferAction(element);
    const requestedLabel = element.getAttribute("data-action-label") || "";
    const label = requestedLabel
      ? (window.HOUSE_I18N?.t(requestedLabel) || requestedLabel)
      : localizedLabel(action);
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
  window.addEventListener("house:i18n-ready", () => applyActions());

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
    attributeFilter: ["href", "data-link", "data-action", "data-action-label"]
  });
})();
