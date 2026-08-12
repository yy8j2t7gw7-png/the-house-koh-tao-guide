(function () {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const token = fragment.get("registration") || "";
  const validToken = /^[A-Za-z0-9_-]{40,100}$/.test(token);
  const controls = [...document.querySelectorAll("[data-private-registration]")];
  const notes = [...document.querySelectorAll("[data-private-registration-note]")];

  if (validToken) {
    const secureUrl = `/passport-upload#token=${token}`;
    window.HOUSE_PRIVATE_REGISTRATION_URL = secureUrl;
    controls.forEach((control) => {
      control.href = secureUrl;
      control.textContent = "Complete Required Registration";
      control.removeAttribute("aria-disabled");
    });
    notes.forEach((note) => {
      note.innerHTML = "<strong>Your private registration link is ready.</strong> Continue securely below. Do not send passport details in the concierge chat or WhatsApp.";
    });
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    return;
  }

  controls.forEach((control) => {
    control.addEventListener("click", (event) => event.preventDefault());
  });
})();
