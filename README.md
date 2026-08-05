# Guest Guide Platform with AI Concierge — The House v4.7.1

Gallery Restaurant Loading Fix

- Fixed an infinite MutationObserver loop in the central action-button runtime.
- The issue was triggered on The Gallery page because it contains a telephone `Call` action.
- Action labels and `data-action` attributes are now updated only when their values actually differ.
- The Gallery page now loads normally.
- Other restaurant pages and action labels remain unchanged.
