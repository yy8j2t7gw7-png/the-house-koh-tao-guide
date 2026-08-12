window.HOUSE_GUIDE = {
  houseSupport: {
    contactName: "Su",
    phoneDisplay: "+66 64 097 3491",
    phoneTel: "+66640973491",
    whatsapp: "https://wa.me/66640973491",
    primaryLabel: "Contact Us",
    callLabel: "Call"
  },
  bookings: {
    contactName: "Fah",
    phoneDisplay: "+66 96 274 1424",
    phoneTel: "+66962741424",
    whatsapp: "https://wa.me/66962741424",
    primaryLabel: "Book with Us",
    callLabel: "Call Us"
  },
  propertyEmergency: {
    enabled: false,
    role: "24/7 on-call property emergency support",
    contactName: "",
    phoneDisplay: "",
    phoneTel: "",
    whatsapp: "",
    fallbackContactKey: "houseSupport",
    callLabel: "Call Emergency Support"
  },
  requestRouting: {
    staySupport: {
      contactKey: "houseSupport",
      currentHandler: "Su",
      targetConversationOwner: "ai-concierge",
      humanHandoffContactKey: "houseSupport",
      afterHours: {
        timeZone: "Asia/Bangkok",
        start: "19:30",
        end: "10:30",
        spareKeyLocation: "In the key box next to the room door",
        lostKeyFeeThb: 500,
        privateStayLinkRequired: true,
        secureCodeDeliveryEnabled: false,
        notificationPolicy: "configured owners and Su",
        automaticNotificationsEnabled: false
      },
      intents: [
        "fresh towels",
        "room cleaning",
        "lost keys",
        "lockouts",
        "toilet paper",
        "air conditioning",
        "water",
        "Wi-Fi",
        "check-in",
        "checkout",
        "room concerns"
      ]
    },
    commissionableBookings: {
      contactKey: "bookings",
      currentHandler: "Fah",
      intents: [
        "activities",
        "scooter rental",
        "taxis",
        "private transfers",
        "ferry tickets",
        "tours",
        "other commissionable services"
      ]
    },
    propertyEmergency: {
      contactKey: "propertyEmergency",
      availabilityTarget: "24/7",
      temporaryFallbackContactKey: "houseSupport",
      intents: [
        "major water leak",
        "flooding",
        "burst pipe",
        "dangerous electrical problem",
        "smoke or burning smell",
        "serious room or property damage"
      ]
    }
  },
  emergency: {
    medicalNational: {
      label: "National Medical Emergency",
      phoneDisplay: "1669",
      phoneTel: "1669"
    },
    kohTaoRescue: {
      label: "Koh Tao Rescue",
      phoneDisplay: "+66 87 979 0191",
      phoneTel: "+66879790191"
    },
    kohTaoPolice: {
      label: "Koh Tao Police Station",
      phoneDisplay: "+66 77 456 098",
      phoneTel: "+6677456098"
    },
    touristPolice: {
      label: "Tourist Police",
      phoneDisplay: "1155",
      phoneTel: "1155"
    },
    kohTaoHospital: {
      label: "Koh Tao Hospital",
      phoneDisplay: "+66 77 456 490",
      phoneTel: "+6677456490",
      map: "https://www.google.com/maps/search/?api=1&query=Koh+Tao+Hospital+Surat+Thani"
    }
  },
  maps: {
    pharmacy: "https://www.google.com/maps/search/?api=1&query=pharmacy+Mae+Haad+Koh+Tao",
    clinicHospital: "https://www.google.com/maps/search/?api=1&query=clinic+hospital+Koh+Tao",
    atm: "https://www.google.com/maps/search/?api=1&query=ATM+Mae+Haad+Koh+Tao",
    supermarket: "https://www.google.com/maps/search/?api=1&query=supermarket+Mae+Haad+Koh+Tao",
    laundry: "https://www.google.com/maps/search/?api=1&query=laundry+Songserm+Road+Mae+Haad+Koh+Tao"
  }
};
