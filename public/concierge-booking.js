(function () {
  let currentPagePrompt = "";
  const fallback = {
    primaryLabel: "Book with Us"
  };

  function getContact() {
    return window.HOUSE_GUIDE?.bookings || fallback;
  }

  function createBooking(serviceName) {
    const contact = getContact();
    const safeServiceName = String(serviceName || "this service").trim();
    const booking = {
      whatsappHref: "#concierge-booking",
      conciergePrompt: /dive|diving|roctopus/i.test(safeServiceName)
        ? "I want to book diving."
        : `I would like to book ${safeServiceName}.`,
      primaryLabel: contact.primaryLabel || fallback.primaryLabel
    };
    currentPagePrompt = booking.conciergePrompt;
    return booking;
  }

  window.HOUSE_CONCIERGE_BOOKING = {
    createBooking,
    currentPrompt: () => currentPagePrompt
  };
})();
