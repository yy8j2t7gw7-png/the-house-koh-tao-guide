window.AI_CONCIERGE_CONFIG = {
  "release": "5.11.26",
  "enabled": true,
  "propertyName": "The House",
  "buttonLabel": "Concierge",
  "welcomeTitle": "Welcome",
  "welcomeText": "Ask naturally in your preferred language about your room, check-in, Wi-Fi, house rules or help during your stay.",
  "initialMessage": "Hello. Booked guests must verify their stay using the Airbnb confirmation code or private House stay code. Thai-only stays need no passport upload. If any foreign guests are staying overnight, passport information is required for every non-Thai guest—not only the booking guest. I can guide you through this or help with an emergency.",
  "placeholder": "Ask about your stay…",
  "apiUrl": "/api/concierge",
  "feedbackUrl": "/api/concierge/feedback",
  "useServerAI": true,
  "historyLimit": 10,
  "engineScriptUrl": "/ai-concierge-engine.js",
  "knowledgeUrl": "/data/concierge-knowledge.json",
  "minimumMatchScore": 0.62,
  "roomOptions": ["1", "2", "3", "4", "5", "6", "8", "9", "10", "11"],
  "translationApprovedRuntimeText": [
    "I'm here to help. What has happened in your room? Please briefly tell me what the problem is.",
    "I'm here to help. What has happened? Please briefly tell me what the problem is.",
    "Thank you for your request. We’ll bring toilet paper to your room as soon as possible. If you haven’t received it within 30 minutes, please call us using the button below.",
    "Thank you for your request. We’ll bring soap to your room as soon as possible. If you haven’t received it within 30 minutes, please call us using the button below.",
    "Thank you for your request. We’ll bring fresh towels to your room as soon as possible. If you haven’t received it within 30 minutes, please call us using the button below.",
    "Thank you for your request. Our housekeeping team is currently off duty, but your request has already been recorded. We’ll bring toilet paper to your room tomorrow morning after 10:30 AM, and you do not need to request it again.",
    "Thank you for your request. Our housekeeping team is currently off duty, but your request has already been recorded. We’ll bring soap to your room tomorrow morning after 10:30 AM, and you do not need to request it again.",
    "Thank you for your request. Our housekeeping team is currently off duty, but your request has already been recorded. We’ll bring fresh towels to your room tomorrow morning after 10:30 AM, and you do not need to request it again.",
    "We’ll be happy to arrange a room cleaning. What time would be most convenient for you? We’ll do our best to accommodate your preferred time, but the exact cleaning time may vary depending on housekeeping availability.",
    "I’m sorry, but housekeeping is not available on Mondays. We can arrange your room cleaning from 10:30 AM tomorrow. What time would be most convenient for you? We’ll do our best to accommodate your preferred time, but the exact cleaning time may vary depending on housekeeping availability.",
    "Housekeeping is currently off duty and is not available on Mondays. We can arrange your room cleaning from 10:30 AM on Tuesday. What time would be most convenient for you? We’ll do our best to accommodate your preferred time, but the exact cleaning time may vary depending on housekeeping availability.",
    "Thank you. We’ve sent your room-cleaning request to our housekeeping team with your preferred time of 3:00 PM. We’ll do our best to accommodate it, but the exact cleaning time may vary depending on availability.",
    "Thank you. We’ve sent your room-cleaning request to our housekeeping team with your preferred time of Now. We’ll do our best to accommodate it, but the exact cleaning time may vary depending on availability.",
    "Thank you. We’ve sent your room-cleaning request to our housekeeping team with your preferred time of As soon as possible. We’ll do our best to accommodate it, but the exact cleaning time may vary depending on availability."
  ],
  "afterHours": {
    "timeZone": "Asia/Bangkok",
    "start": "19:30",
    "end": "10:30",
    "spareKeyLocation": "In the key box next to the room door",
    "lostKeyFeeThb": 500,
    "stayConfirmationRequired": true,
    "secureCodeDeliveryEnabled": true,
    "notificationPolicy": "configured owners and Su",
    "automaticNotificationsEnabled": true
  },
  "requestRouting": {
    "staySupport": {
      "contactKey": "houseSupport",
      "targetConversationOwner": "ai-concierge",
      "humanHandoffContactKey": "houseSupport"
    },
    "conciergeBookings": {
      "contactKey": "structuredConciergeBooking",
      "humanHandoffContactKey": "houseSupport"
    }
  },
  "quickActions": [
    {
      "label": "Guest registration",
      "icon": "🛂",
      "type": "registration"
    },
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
      "type": "spare-key"
    },
    {
      "label": "Urgent problem",
      "icon": "⚠️",
      "type": "prompt",
      "prompt": "There is a serious problem in my room."
    }
  ],
  "publicQuickActions": [
    {
      "label": "Complete guest access",
      "icon": "🛂",
      "type": "registration"
    },
    {
      "label": "Passport not uploaded",
      "icon": "📄",
      "type": "prompt",
      "prompt": "I have not uploaded all required passports yet. What should I do?"
    },
    {
      "label": "Emergency help",
      "icon": "🚨",
      "type": "link",
      "href": "/emergency.html"
    }
  ],
  "pagePrompts": {
    "index.html": [
      "How do I verify my stay?",
      "I have not uploaded all required passports yet.",
      "I need emergency help."
    ],
    "rooms.html": [
      "How do I verify my stay?",
      "Who needs to submit passport information?",
      "I need emergency help."
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
