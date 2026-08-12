window.AI_CONCIERGE_CONFIG = {
  "release": "5.4.0",
  "enabled": true,
  "propertyName": "The House",
  "buttonLabel": "Concierge",
  "welcomeTitle": "Welcome",
  "welcomeText": "Ask me about your room, check-in, Wi-Fi, towels, cleaning, house rules, checkout or help during your stay.",
  "initialMessage": "Hello. What can I help you with during your stay?",
  "placeholder": "Ask about your stay…",
  "engineScriptUrl": "/ai-concierge-engine.js",
  "knowledgeUrl": "/data/concierge-knowledge.json",
  "minimumMatchScore": 0.44,
  "roomOptions": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"],
  "afterHours": {
    "timeZone": "Asia/Bangkok",
    "start": "19:30",
    "end": "10:30",
    "spareKeyLocation": "In the key box next to the room door",
    "lostKeyFeeThb": 500,
    "privateStayLinkRequired": true,
    "secureCodeDeliveryEnabled": false,
    "notificationPolicy": "configured owners and Su",
    "automaticNotificationsEnabled": false
  },
  "requestRouting": {
    "staySupport": {
      "contactKey": "houseSupport",
      "targetConversationOwner": "ai-concierge",
      "humanHandoffContactKey": "houseSupport"
    },
    "commissionableBookings": {
      "contactKey": "bookings",
      "humanHandoffContactKey": "bookings"
    }
  },
  "quickActions": [
    {
      "label": "Check-in",
      "icon": "🕑",
      "type": "prompt",
      "prompt": "What time is check-in?"
    },
    {
      "label": "Wi-Fi",
      "icon": "📶",
      "type": "prompt",
      "prompt": "What is the Wi-Fi password?"
    },
    {
      "label": "Fresh towels",
      "icon": "🛏",
      "type": "prompt",
      "prompt": "I need fresh towels."
    },
    {
      "label": "Room cleaning",
      "icon": "🧹",
      "type": "prompt",
      "prompt": "Please clean my room."
    },
    {
      "label": "Lost key",
      "icon": "🔑",
      "type": "prompt",
      "prompt": "I lost my key."
    },
    {
      "label": "Urgent problem",
      "icon": "⚠️",
      "type": "prompt",
      "prompt": "There is a serious problem in my room."
    }
  ],
  "pagePrompts": {
    "index.html": [
      "What time is check-in?",
      "What is the Wi-Fi password?",
      "Where is The House?"
    ],
    "rooms.html": [
      "Where is my room?",
      "How does self check-in work?",
      "What is the Wi-Fi password?"
    ],
    "room.html": [
      "I need fresh towels.",
      "Please clean my room.",
      "I lost my key."
    ],
    "house.html": [
      "Can I smoke?",
      "What time are quiet hours?",
      "Can I bring an overnight visitor?"
    ],
    "practical.html": [
      "I need fresh towels.",
      "Please help arrange room cleaning.",
      "I lost my key."
    ],
    "emergency.html": [
      "I need urgent help.",
      "Where is Koh Tao Hospital?",
      "I lost my key."
    ],
    "checkout.html": [
      "What time is check-out?",
      "Where do I leave the key?",
      "Can I check out late?"
    ],
    "activity.html": [
      "How do I book an activity?"
    ],
    "diving.html": [
      "How do I book an activity?"
    ]
  },
  "defaultPrompts": [
    "What time is check-in?",
    "What is the Wi-Fi password?",
    "I need help with my stay."
  ],
  "appearanceDelayMs": 1200
};
