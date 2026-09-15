export const COPILOT_REGISTRY_VERSION = "2026-09-15.1";

const WORKFLOWS = [
  {
    id: "daily_attention",
    title: "What needs attention today",
    keywords: ["attention", "today", "priority", "priorities", "what now", "what needs", "to do", "todo", "next"],
    summary: "Taoedge can summarize today's operational pressure using the live information your role is allowed to see: arrivals, departures, room readiness, pending housekeeping, maintenance, registration and Inbox attention.",
    steps: [
      "Start with anything urgent or safety-related.",
      "Check rooms that must turn over for arrivals, especially dirty rooms and priority housekeeping.",
      "Review open maintenance and pending registrations that could affect a guest stay.",
      "If your role can see the Inbox, review guest conversations that need a human response.",
      "Turn anything that requires staff action into a room- or booking-linked task so it is routed and logged."
    ],
    next: "Ask ‘What needs my attention today?’ for a plain-language summary based on the current permitted operational data."
  },
  {
    id: "bookings_calendar",
    title: "Bookings and calendar",
    keywords: ["booking", "reservation", "calendar", "arrival", "departure", "guest", "room"],
    summary: "See current and upcoming stays across connected sources, open a booking, and review its operational activity.",
    steps: [
      "Open Bookings or Calendar to find the stay.",
      "Open the booking to see room, dates, guest details allowed for your role, communication options and task history.",
      "Use Add to booking for an internal note or a task that should notify the responsible team."
    ],
    next: "If something needs doing for a stay, create a booking task so it is logged against that reservation."
  },
  {
    id: "booking_tasks",
    title: "Booking tasks and alerts",
    keywords: ["task", "assign", "notify", "alert", "remind", "follow up", "booking task"],
    summary: "Operational tasks can be attached to a booking and routed to the correct team. Taoedge keeps the task in the booking activity and sends the configured operational alert.",
    steps: [
      "Describe what needs to be done and identify the room or booking.",
      "Choose the task type such as Housekeeping, Maintenance, Guest support, Reservations or Owner.",
      "Taoedge shows the proposed task and who will be notified before it is created.",
      "After confirmation, the task is logged and the normal alert route is used."
    ],
    next: "Use the Support Chat when you want to create the task in plain language instead of opening the booking manually."
  },
  {
    id: "guest_messaging",
    title: "Guest messages and AI review",
    keywords: ["message", "inbox", "whatsapp", "airbnb", "guest reply", "approve", "draft"],
    summary: "The Unified Inbox brings supported guest conversations together. AI can prepare replies, but sending a reply and creating an operational task are separate decisions.",
    steps: [
      "Open Inbox and select the guest conversation.",
      "Review the AI draft. You can reject it, regenerate it, approve without sending, approve and send, or edit and send.",
      "If the guest message also requires staff action, Taoedge asks separately whether the operational task should be created.",
      "Approving wording alone never authorizes a task or alert."
    ],
    next: "For information-only questions, no staff alert should be created. For a real request, confirm the operational action separately."
  },
  {
    id: "housekeeping",
    title: "Housekeeping and room readiness",
    keywords: ["housekeeping", "clean", "dirty", "ready", "towel", "linen", "room ready", "turnover"],
    summary: "Rooms move through dirty, clean and ready states. Turnover and early-arrival information can influence housekeeping priority.",
    steps: [
      "Open Operations to see room readiness and housekeeping work.",
      "Use Dirty when the room still needs cleaning, Clean when cleaning is complete but final readiness is not confirmed, and Ready when the room is prepared for the guest.",
      "A confirmed earlier departure can make a room available to housekeeping sooner.",
      "An approved late checkout keeps the room from being treated as available at the normal checkout time."
    ],
    next: "If a specific room needs extra work, create a Housekeeping task and describe exactly what is needed."
  },
  {
    id: "maintenance",
    title: "Maintenance",
    keywords: ["maintenance", "broken", "leak", "toilet", "aircon", "air con", "ac", "electric", "repair", "damage"],
    summary: "Maintenance issues can be reported from operations or created as tasks against a room or booking. Alerts are routed through the configured maintenance team.",
    steps: [
      "Identify the room and describe the problem clearly.",
      "Use normal attention for routine defects; use urgent or critical only when the situation genuinely needs faster escalation.",
      "Taoedge records the issue and sends the configured operational alert.",
      "Resolve the issue in Taoedge when the work is completed."
    ],
    next: "If you already know the room and problem, you can ask Support Chat to create the maintenance task for you."
  },
  {
    id: "guest_services",
    title: "Guest services and activity requests",
    keywords: ["tour", "activity", "diving", "taxi", "transfer", "service booking", "guest service", "excursion"],
    summary: "A guest asking for an activity or service can be answered with approved information, and an actual booking/request can be routed to the configured guest-service team.",
    steps: [
      "First separate a general information question from an actual request to arrange something.",
      "For information, answer from approved property knowledge without creating an unnecessary staff alert.",
      "For an actual request, collect the details the service needs and route the actionable request through the configured guest-service workflow.",
      "Do not expose internal commission or supplier arrangements to guests."
    ],
    next: "If the guest wants Taoedge to arrange something, make sure the request has enough details before routing it."
  },
  {
    id: "emergencies",
    title: "Emergencies and urgent incidents",
    keywords: ["emergency", "medical", "injury", "fire", "flood", "danger", "urgent incident", "rescue"],
    summary: "Real emergencies must be handled as emergencies, not as ordinary hotel tasks. Taoedge should give the approved emergency guidance and use urgent operational escalation only when appropriate.",
    steps: [
      "Put immediate safety first and use the property's approved emergency contacts and instructions.",
      "For medical emergencies at The House, the approved guidance offers Koh Tao Rescue first and Thailand emergency medical service 1669 second.",
      "Use an Urgent operational task only for a genuine urgent property action that staff must handle.",
      "Do not delay emergency help while waiting for an ordinary task workflow."
    ],
    next: "If someone may be in danger, follow emergency guidance immediately rather than treating it as normal maintenance."
  },
  {
    id: "late_checkout",
    title: "Late checkout",
    keywords: ["late checkout", "checkout late", "2 pm", "14:00", "200 baht"],
    summary: "Late checkout can be approved up to 2:00 PM with the configured 200 THB service fee. The guest must explicitly accept the fee before the operational alert is sent.",
    steps: [
      "Explain the 200 THB late-checkout fee.",
      "Obtain the guest's explicit acceptance for that request.",
      "Only after acceptance should the operational team be notified.",
      "A same-day upcoming booking does not automatically block late checkout up to 2:00 PM; the incoming guest can be asked to arrive from 3:00 PM when needed."
    ],
    next: "Do not promise a later time than 2:00 PM unless property policy is changed by an authorized owner."
  },
  {
    id: "early_checkin",
    title: "Early check-in",
    keywords: ["early check in", "early check-in", "arrive early", "early arrival"],
    summary: "Early check-in depends on whether the previous guest has left and whether the room is ready.",
    steps: [
      "If the current guest is still inside, explain that cleaning starts after checkout and that early check-in cannot be promised yet.",
      "If the room is vacant and already Ready, early check-in may be possible.",
      "When an early arrival matters operationally, housekeeping can be prioritized without promising an impossible time."
    ],
    next: "Check room readiness first, then tell the guest what is actually possible."
  },
  {
    id: "departure_planning",
    title: "Departure planning",
    keywords: ["departure", "leaving", "checkout time", "extension", "stay longer"],
    summary: "The day-before-checkout assistant can capture the guest's planned departure time and extension interest. Confirmed departure information feeds housekeeping planning.",
    steps: [
      "Use the guest's confirmed planned departure time for operational planning.",
      "If a guest has approved late checkout or an extension, Taoedge should not send contradictory standard checkout wording.",
      "Extension interest should be handled through the reservation workflow rather than assumed to be approved."
    ],
    next: "When a guest wants to extend, verify availability and the approved booking process before confirming it."
  },
  {
    id: "lost_key",
    title: "Lost key",
    keywords: ["lost key", "spare key", "key box", "500 baht"],
    summary: "Lost-key handling is protected. Spare-key release is available 24/7 only after the active stay is verified, the 500 THB fee is explained and accepted, and the required protected notifications are sent.",
    steps: [
      "Verify the current active stay.",
      "Explain the 500 THB lost-key fee and get explicit acceptance.",
      "Use the protected lost-key flow so the required team members are notified.",
      "The key-box code is shown only on the protected guest page; do not expose it in normal messages or support chat."
    ],
    next: "Never bypass the protected lost-key process or reveal the code through an ordinary chat."
  },
  {
    id: "luggage",
    title: "Luggage storage",
    keywords: ["luggage", "bags", "storage", "store bags"],
    summary: "Luggage storage follows the property's current office-hours and after-hours operating policy.",
    steps: [
      "During office hours, use the office storage process.",
      "Outside office hours, follow the approved Bamboo Beach Bar handoff process when applicable.",
      "Do not promise early-morning storage when no approved storage point is available."
    ],
    next: "If the guest is making an actual storage request, create or route the operational request rather than answering only with general policy."
  },
  {
    id: "registration",
    title: "Guest registration and passports",
    keywords: ["passport", "tm30", "registration", "thai guest", "foreign guest", "documents"],
    summary: "Registration and passport handling is separate from lost-key verification. Foreign guests may need passport details for registration; Thai nationals follow the approved exemption wording.",
    steps: [
      "Use the secure registration/upload flow for identity documents.",
      "Do not ask staff without permission to access guest identity documents.",
      "External passport receipt may create a review task, but it does not automatically mean secure registration is complete.",
      "Follow the configured retention and privacy controls for identity documents."
    ],
    next: "If the status is unclear, check Guest documents & TM30 or the booking's registration status instead of asking the guest to resend sensitive documents unnecessarily."
  },
  {
    id: "finance",
    title: "Finance and OTA income",
    keywords: ["finance", "income", "expense", "payout", "airbnb payout", "receipt", "bill", "profit"],
    summary: "Finance separates expected/provisional OTA income from settled cash and supports controlled expense submission and historical Airbnb/Beds24 backfill.",
    steps: [
      "Use Finance to review income, expenses and operating result if your role has permission.",
      "Expected Airbnb payouts remain marked as provisional until the actual channel-collected payment is reconciled.",
      "Historical imports are designed to be rerun safely without creating duplicates.",
      "Expense submission permission does not automatically grant permission to view full Finance reports."
    ],
    next: "If you cannot see Finance, your role may not have permission; ask an owner rather than sharing financial data outside the authorized view."
  },
  {
    id: "listings_rates",
    title: "Listings & Rates",
    keywords: ["rate", "rates", "availability", "listing", "inventory", "beds24", "ota", "channel manager"],
    summary: "Listings & Rates provides controlled provider visibility and narrowly scoped write testing. The full Channel Manager remains separately gated.",
    steps: [
      "Use Listings & Rates to inspect provider status and controlled rate/availability functions that the backend explicitly enables.",
      "Provider credentials stay on the server.",
      "A successful API response alone is not treated as proof that an OTA calendar has fully propagated.",
      "Do not assume the full Channel Manager is active unless Taoedge explicitly reports that capability."
    ],
    next: "When changing provider data, use the narrow review-before-write controls and verify synchronization state afterwards."
  },
  {
    id: "direct_stays",
    title: "Direct stays",
    keywords: ["direct stay", "walk in", "walk-in", "manual booking", "owner booking"],
    summary: "Authorized users can create owner-managed direct stays through protected booking controls.",
    steps: [
      "Check the room and dates before creating the stay.",
      "Use Direct stay so the booking enters the same operational calendar instead of keeping it outside Taoedge.",
      "For changes or cancellation, use the protected direct-stay controls so availability reopening remains conflict-aware."
    ],
    next: "After creating or cancelling a direct stay, check the distribution/synchronization state before assuming every OTA has updated."
  },
  {
    id: "security_permissions",
    title: "Roles, permissions and security",
    keywords: ["permission", "staff access", "manager", "owner", "security", "session", "device", "license"],
    summary: "Owners, managers and staff see different parts of Taoedge. The backend, not the app screen, decides what each signed-in user is allowed to read or change.",
    steps: [
      "Use Team & access to manage delegated permissions where supported.",
      "Use Security to review and revoke active sessions/devices when needed.",
      "Do not share owner credentials or provider credentials with staff.",
      "A hidden button is not a security boundary; protected actions are always checked by the server."
    ],
    next: "If a user cannot perform an action, check their assigned permission rather than trying to work around the restriction."
  },
  {
    id: "notifications",
    title: "Notifications",
    keywords: ["notification", "push", "alert setting", "message alert"],
    summary: "Device notification preferences can be adjusted by category, but they never expand the user's backend permissions.",
    steps: [
      "Open Settings to control guest-message, operations, housekeeping, maintenance, OTA-sync and AI-lifecycle notifications.",
      "Keep important operational alerts enabled on the devices responsible for acting on them.",
      "Changing a device notification preference does not change who is authorized to view or perform the underlying action."
    ],
    next: "If an operational alert is missing, check both the task route and the receiving device's notification settings."
  },
  {
    id: "diagnostics",
    title: "Diagnostics and connection status",
    keywords: ["diagnostics", "not working", "connection", "integration", "sync problem", "provider status", "version", "technical status"],
    summary: "Owners can use Diagnostics to check whether the app is connected to the expected Taoedge backend and whether important platform capabilities are reachable. This is mainly for troubleshooting, not normal daily hotel work.",
    steps: [
      "If a normal operation is not behaving as expected, first retry the normal screen once.",
      "Owners can open Diagnostics to check app/backend reachability and capability status.",
      "A provider/API acceptance is not the same as completed OTA propagation; use the synchronization status where available.",
      "Do not change provider credentials or broaden write permissions just to clear a display problem."
    ],
    next: "Use Diagnostics when something appears technically disconnected; otherwise stay in the normal operational workflow."
  },
  {
    id: "hotel_inventory_status",
    title: "Hotel stock and inventory",
    keywords: ["stock", "restock", "inventory left", "supplies", "minimum stock", "linen stock", "amenity stock", "warehouse"],
    summary: "The dedicated hotel stock/Inventory, Assets and Procurement module is planned but is not yet part of this production release. Do not confuse hotel stock with OTA room availability in Listings & Rates.",
    steps: [
      "For current production, use the existing housekeeping/maintenance workflows for operational requests involving supplies.",
      "Do not claim that Taoedge currently tracks stock counts, minimum stock or purchase orders unless the Inventory module has been released for this property.",
      "Listings & Rates inventory means room availability on booking channels, not physical hotel stock."
    ],
    next: "Until the Inventory module is released, create a clear operational task when staff need to restock or obtain supplies."
  },
  {
    id: "support_chat",
    title: "AI Support Chat",
    keywords: ["support", "help", "what do i do", "how do i", "next step", "copilot"],
    summary: "AI Support Chat explains Taoedge in plain hotel language and can propose permitted operational actions from natural-language instructions.",
    steps: [
      "Ask normally, for example: ‘What do I do with an early check-in request?’",
      "For tasks, include the room or booking and what needs to be done when you know it.",
      "Taoedge asks for missing information instead of guessing.",
      "Any consequential action is shown for confirmation before it is executed."
    ],
    next: "Use Support Chat as the first place to ask what to do next; it should guide you to the correct Taoedge workflow without technical wording."
  }
];

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreWorkflow(workflow, question) {
  const source = normalize(question);
  if (!source) return 0;
  let score = 0;
  for (const keyword of workflow.keywords || []) {
    const term = normalize(keyword);
    if (term && source.includes(term)) score += term.includes(" ") ? 6 : 3;
  }
  if (source.includes(normalize(workflow.title))) score += 8;
  return score;
}

export function relevantWorkflows(question, limit = 7) {
  const ranked = WORKFLOWS
    .map((workflow) => ({ workflow, score: scoreWorkflow(workflow, question) }))
    .sort((a, b) => b.score - a.score);
  const selected = ranked.filter((item) => item.score > 0).slice(0, limit).map((item) => item.workflow);
  if (selected.length) return selected;
  return WORKFLOWS.filter((workflow) => ["support_chat", "bookings_calendar", "booking_tasks", "housekeeping", "maintenance", "guest_messaging"].includes(workflow.id));
}

export function workflowRegistrySummary() {
  return WORKFLOWS.map(({ id, title, summary, next }) => ({ id, title, summary, next }));
}

export function workflowById(id) {
  return WORKFLOWS.find((item) => item.id === id) || null;
}
