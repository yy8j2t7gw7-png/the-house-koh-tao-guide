const ROUTES = Object.freeze({
  housekeeping: Object.freeze({ key: "housekeeping", label: "Housekeeping / guest service", recipientGroup: "support_with_owners" }),
  maintenance: Object.freeze({ key: "maintenance", label: "Maintenance / guest service", recipientGroup: "support_with_owners" }),
  guest_support: Object.freeze({ key: "guest_support", label: "Guest support", recipientGroup: "support_with_owners" }),
  general: Object.freeze({ key: "general", label: "General guest request", recipientGroup: "support_with_owners" }),
  reservations: Object.freeze({ key: "reservations", label: "Bookings / reservations", recipientGroup: "booking_with_owners" }),
  owner: Object.freeze({ key: "owner", label: "Owners", recipientGroup: "owners" }),
  turnover: Object.freeze({ key: "turnover", label: "Routine room turnover", recipientGroup: "support" }),
  room_ready: Object.freeze({ key: "room_ready", label: "Room ready", recipientGroup: "owners" }),
  urgent: Object.freeze({ key: "urgent", label: "Urgent response", recipientGroup: "urgent_response" }),
  lost_key: Object.freeze({ key: "lost_key", label: "Lost key", recipientGroup: "lost_key_team" })
});

function normalized(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function canonicalOperationalCategory(value) {
  const category = normalized(value);
  if (["housekeeping", "cleaning", "room_cleaning", "supplies", "towels", "toilet_paper"].includes(category)) return "housekeeping";
  if (["maintenance", "repair", "repairs", "property_issue", "room_issue"].includes(category)) return "maintenance";
  if (["guest_support", "guest_service", "stay_support", "support"].includes(category)) return "guest_support";
  if (["reservation", "reservations", "booking", "bookings"].includes(category)) return "reservations";
  if (["owner", "owners", "management"].includes(category)) return "owner";
  if (["turnover", "housekeeping_turnover"].includes(category)) return "turnover";
  if (["room_ready", "ready"].includes(category)) return "room_ready";
  if (["urgent", "emergency"].includes(category)) return "urgent";
  if (["lost_key", "spare_key"].includes(category)) return "lost_key";
  return "general";
}

export function operationalRoute(value) {
  return ROUTES[canonicalOperationalCategory(value)] || ROUTES.general;
}

export function operationalRecipientGroup(value) {
  return operationalRoute(value).recipientGroup;
}

export function operationalRouteCatalog() {
  return Object.values(ROUTES).map((item) => ({ ...item }));
}
