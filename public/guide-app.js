(function () {
  const cfg = window.HOUSE_GUIDE;
  if (!cfg) return;

  const routes = {
    houseWhatsapp: cfg.houseSupport.whatsapp,
    houseCall: `tel:${cfg.houseSupport.phoneTel}`,
    bookingWhatsapp: cfg.bookings.whatsapp,
    bookingCall: `tel:${cfg.bookings.phoneTel}`,
    medicalNationalCall: `tel:${cfg.emergency.medicalNational.phoneTel}`,
    rescueCall: `tel:${cfg.emergency.kohTaoRescue.phoneTel}`,
    policeCall: `tel:${cfg.emergency.kohTaoPolice.phoneTel}`,
    touristPoliceCall: `tel:${cfg.emergency.touristPolice.phoneTel}`,
    hospitalCall: `tel:${cfg.emergency.kohTaoHospital.phoneTel}`,
    hospitalMap: cfg.emergency.kohTaoHospital.map,
    pharmacyMap: cfg.maps.pharmacy,
    atmMap: cfg.maps.atm,
    supermarketMap: cfg.maps.supermarket,
    laundryMap: cfg.maps.laundry
  };

  document.querySelectorAll("[data-link]").forEach((el) => {
    const value = routes[el.dataset.link];
    if (value) el.setAttribute("href", value);
  });

  const textRoutes = {
    housePhone: cfg.houseSupport.phoneDisplay,
    bookingPhone: cfg.bookings.phoneDisplay,
    rescuePhone: cfg.emergency.kohTaoRescue.phoneDisplay,
    policePhone: cfg.emergency.kohTaoPolice.phoneDisplay,
    hospitalPhone: cfg.emergency.kohTaoHospital.phoneDisplay
  };

  document.querySelectorAll("[data-text]").forEach((el) => {
    const value = textRoutes[el.dataset.text];
    if (value) el.textContent = value;
  });
})();
