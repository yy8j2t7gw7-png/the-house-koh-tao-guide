(function () {
  const tokenStorageKey = `housePrivateRegistrationToken:${window.location.pathname}`;
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const fragmentToken = fragment.get("registration") || "";
  const storedToken = window.sessionStorage.getItem(tokenStorageKey) || "";
  const token = fragmentToken || storedToken;
  const validToken = /^[A-Za-z0-9_-]{40,100}$/.test(token);
  const controls = [...document.querySelectorAll("[data-private-registration]")];
  const notes = [...document.querySelectorAll("[data-private-registration-note]")];

  if (validToken) {
    window.sessionStorage.setItem(tokenStorageKey, token);
    const secureUrl = `/passport-upload#token=${token}`;
    window.HOUSE_PRIVATE_REGISTRATION_URL = secureUrl;
    controls.forEach((control) => {
      control.href = secureUrl;
      control.textContent = "Complete Required Registration — Non-Thai Guests";
      control.removeAttribute("aria-disabled");
    });
    notes.forEach((note) => {
      note.innerHTML = "<strong>Your private registration link is ready.</strong> Continue securely below. Do not send passport details in the concierge chat or WhatsApp.";
    });
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    return;
  }

  controls.forEach((control) => {
    control.removeAttribute("aria-disabled");
    control.href = "#guest-registration";
    control.addEventListener("click", (event) => {
      event.preventDefault();
      notes.forEach((note) => {
        note.classList.add("registration-link-missing");
        note.innerHTML = "<strong>Your private registration access is not attached to this page.</strong> Please reopen the private Room welcome link sent by The House. For your security, selecting a room alone cannot open a passport form.";
        note.setAttribute("role", "status");
        note.setAttribute("aria-live", "polite");
      });
      notes[0]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  });
})();
