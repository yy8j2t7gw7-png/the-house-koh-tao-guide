# Guest Guide Platform with AI Concierge — The House v4.4.2

Definitive Action Button Fix

- Emergency and external telephone buttons display “Call”.
- The House WhatsApp support displays “Contact Us”.
- Booking WhatsApp displays “Book with Us”.
- The action runtime now identifies buttons by `data-link`, `data-action`, or `tel:` destination.
- Dynamically assigned telephone links are corrected after `guide-app.js` runs.
- Removed the previous text-based normalization that incorrectly turned “Contact” into “Contact Us”.
