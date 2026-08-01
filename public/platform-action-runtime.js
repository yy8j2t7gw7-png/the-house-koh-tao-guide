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
    if (element.dataset.action) return element.dataset.action;

    const linkKey = element.dataset.link || "";
    if (linkKey === "houseWhatsapp") return "contact";
    if (linkKey === "bookingWhatsapp") return "booking";
    if (callLinkKeys.has(linkKey)) return "call";

    const href = element.getAttribute("href") || "";
    if (href.toLowerCase().startsWith("tel:")) return "call";

    return "";
  };

  const applyActions = (root = document) => {
    const elements = [];

    if (root.matches?.("a,button")) elements.push(root);
    root.querySelectorAll?.("a,button").forEach((element) => elements.push(element));

    elements.forEach((element) => {
      const action = inferAction(element);
      if (!action || !labels[action]) return;

      element.dataset.action = action;
      element.textContent = labels[action];
    });
  };

  applyActions();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) applyActions(node);
      });

      if (
        mutation.type === "attributes" &&
        mutation.target instanceof Element
      ) {
        applyActions(mutation.target);
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["href", "data-link", "data-action"]
  });
})();
