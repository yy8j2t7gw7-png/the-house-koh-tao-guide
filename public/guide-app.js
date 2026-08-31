(function loadHouseI18n() {
  if (window.HOUSE_I18N || window.HOUSE_I18N_LOADING) return;
  window.HOUSE_I18N_LOADING = true;
  const script = document.createElement("script");
  script.src = "/i18n.js";
  script.onload = () => { window.HOUSE_I18N_LOADING = false; };
  script.onerror = () => { window.HOUSE_I18N_LOADING = false; };
  document.head.appendChild(script);
})();

(function loadGuestFeatures() {
  window.HOUSE_FEATURES = { explore: false, ...(window.HOUSE_FEATURES || {}) };
  document.documentElement.classList.add("explore-disabled");
  fetch("/api/features", { headers: { accept: "application/json" } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("Feature config unavailable.")))
    .then((features) => {
      window.HOUSE_FEATURES.explore = Boolean(features.exploreEnabled);
      document.documentElement.classList.toggle("explore-enabled", window.HOUSE_FEATURES.explore);
      document.documentElement.classList.toggle("explore-disabled", !window.HOUSE_FEATURES.explore);
      window.dispatchEvent(new CustomEvent("house:features-ready", { detail: window.HOUSE_FEATURES }));
    })
    .catch(() => {
      // Explore remains safely hidden when live feature configuration is unavailable.
    });
})();

(function markCurrentNavigationItem() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const currentHref = /^\/room\/(?:1|2|3|4|5|6|7|8|9|10|11)$/.test(pathname)
    ? "/rooms.html"
    : pathname.endsWith(".html") ? pathname
    : pathname === "/rooms" ? "/rooms.html"
      : pathname === "/house" ? "/house.html"
        : pathname === "/practical" ? "/practical.html"
          : pathname === "/emergency" ? "/emergency.html"
            : pathname === "/checkout" ? "/checkout.html"
              : `${pathname}.html`;
  document.querySelectorAll(".topbar .nav a").forEach((link) => {
    if (link.getAttribute("href") === currentHref) link.setAttribute("aria-current", "page");
  });
})();

(function () {
  const cfg = window.HOUSE_GUIDE;
  if (!cfg) return;

  const routes = {
    houseWhatsapp: cfg.houseSupport.whatsapp,
    houseCall: `tel:${cfg.houseSupport.phoneTel}`,
    bookingWhatsapp: "#concierge-booking",
    bookingCall: `tel:${cfg.houseSupport.phoneTel}`,
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
