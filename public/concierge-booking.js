(function () {
  const fallback = {
    contactName: "The House booking team",
    phoneDisplay: "+66 64 097 3491",
    phoneTel: "+66640973491",
    whatsapp: "",
    primaryLabel: "Book with Us",
    callLabel: "Call Us"
  };

  function getContact() {
    return window.HOUSE_GUIDE?.bookings || fallback;
  }

  function createBooking(serviceName) {
    const contact = getContact();
    const safeServiceName = String(serviceName || "this service").trim();
    return {
      contactName: contact.contactName || fallback.contactName,
      phoneDisplay: contact.phoneDisplay || fallback.phoneDisplay,
      phoneHref: `tel:${contact.phoneTel || fallback.phoneTel}`,
      whatsappHref: "#concierge-booking",
      conciergePrompt: /dive|diving|roctopus/i.test(safeServiceName)
        ? "I want to book diving."
        : `I would like to book ${safeServiceName}.`,
      primaryLabel: contact.primaryLabel || fallback.primaryLabel,
      callLabel: contact.callLabel || fallback.callLabel
    };
  }

  window.HOUSE_CONCIERGE_BOOKING = {
    createBooking
  };
})();
