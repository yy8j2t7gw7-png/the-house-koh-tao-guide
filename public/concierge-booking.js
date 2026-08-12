(function () {
  const fallback = {
    contactName: "Fah",
    phoneDisplay: "+66 96 274 1424",
    phoneTel: "+66962741424",
    whatsapp: "https://wa.me/66962741424",
    primaryLabel: "Book with Us",
    callLabel: "Call Us"
  };

  function getContact() {
    return window.HOUSE_GUIDE?.bookings || fallback;
  }

  function createBooking(serviceName) {
    const contact = getContact();
    const safeServiceName = String(serviceName || "this service").trim();
    const message = encodeURIComponent(
      `Hello, I am staying at The House Koh Tao and would like to book: ${safeServiceName}. Please send me availability and the best option. Thank you.`
    );

    return {
      contactName: contact.contactName || fallback.contactName,
      phoneDisplay: contact.phoneDisplay || fallback.phoneDisplay,
      phoneHref: `tel:${contact.phoneTel || fallback.phoneTel}`,
      whatsappHref: `${contact.whatsapp || fallback.whatsapp}?text=${message}`,
      primaryLabel: contact.primaryLabel || fallback.primaryLabel,
      callLabel: contact.callLabel || fallback.callLabel
    };
  }

  window.HOUSE_CONCIERGE_BOOKING = {
    createBooking
  };
})();
