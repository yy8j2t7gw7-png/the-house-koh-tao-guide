window.AI_CONCIERGE_CONFIG = {
  "enabled": true,
  "propertyName": "The House",
  "buttonLabel": "Concierge",
  "welcomeTitle": "Welcome",
  "welcomeText": "I’m your AI Concierge. I can help you explore Koh Tao, find useful information and connect you with our team.",
  "placeholder": "Ask me anything…",
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
      "label": "Beaches",
      "icon": "🏖",
      "type": "link",
      "href": "/beaches.html"
    },
    {
      "label": "Restaurants",
      "icon": "🍽",
      "type": "link",
      "href": "/restaurants.html"
    },
    {
      "label": "Diving",
      "icon": "🤿",
      "type": "link",
      "href": "/diving.html"
    },
    {
      "label": "Transport",
      "icon": "🚕",
      "type": "link",
      "href": "/practical.html"
    },
    {
      "label": "Activities",
      "icon": "🎟",
      "type": "link",
      "href": "/activities.html"
    },
    {
      "label": "Contact Us",
      "icon": "💬",
      "type": "contact"
    }
  ],
  "pagePrompts": {
    "activities.html": [
      "Which activity is best for me today?",
      "What can I do if it rains?",
      "Can you help me book an activity through The House?"
    ],
    "activity.html": [
      "Is this suitable for a beginner?",
      "What should I bring?",
      "How do I book this?"
    ],
    "diving.html": [
      "Tell me about learning to dive.",
      "Which course is right for a beginner?",
      "Help me book diving."
    ],
    "beaches.html": [
      "Which beach is best for snorkelling?",
      "Which beach is quietest?",
      "Which beach is easiest to reach?"
    ],
    "restaurants.html": [
      "Recommend authentic Thai food.",
      "Where should I go for sunset dinner?",
      "Which place is best for a relaxed meal?"
    ],
    "restaurant.html": [
      "Tell me more about this restaurant.",
      "Is it suitable for a special dinner?",
      "Show me how to get there."
    ],
    "practical.html": [
      "I need fresh towels.",
      "Please help arrange room cleaning.",
      "I lost my key."
    ],
    "emergency.html": [
      "I need urgent help.",
      "Where is Koh Tao Hospital?",
      "Contact the house team."
    ]
  },
  "appearanceDelayMs": 5000
};
