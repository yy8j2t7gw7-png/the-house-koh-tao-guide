(function () {
  const match = window.location.pathname.match(/^\/room\/(1|2|3|4|5|6|8|9|10|11)\/?$/);
  const room = match?.[1] || "";
  if (!room) return;

  const verificationSection = document.getElementById("verifiedStayAccess");
  const verificationForm = document.getElementById("stayVerificationForm");
  const confirmationInput = document.getElementById("airbnbConfirmationCode");
  const verificationStatus = document.getElementById("stayVerificationStatus");
  const verificationFields = document.getElementById("stayVerificationFields");
  const verifiedPanel = document.getElementById("verifiedStayPanel");
  const verifiedDates = document.getElementById("verifiedStayDates");
  const registrationStatus = document.getElementById("registrationStatus");
  const passportButton = document.getElementById("createPassportUpload");
  const thaiButton = document.getElementById("confirmThaiNational");
  const spareKeySection = document.getElementById("spareKeyAccess");
  const spareKeyForm = document.getElementById("spareKeyForm");
  const spareKeyStatus = document.getElementById("spareKeyStatus");
  const feeCheckbox = document.getElementById("lostKeyFeeAccepted");
  const keyResult = document.getElementById("spareKeyResult");
  const keyCode = document.getElementById("spareKeyCode");
  const keyLocation = document.getElementById("spareKeyLocation");

  if (!verificationSection || !verificationForm) return;

  const messages = {
    verifying: "Verifying your Airbnb stay…",
    verified: "Stay verified for Room {room}.",
    wrongCode: "That confirmation code does not match an active or upcoming Room {room} reservation. Check the code shown in your Airbnb trip details and try again.",
    rateLimited: "Too many attempts. Please wait a minute before trying again.",
    unavailable: "Secure stay verification is temporarily unavailable. Please contact the concierge for help.",
    passportCreating: "Opening your secure one-time passport form…",
    passportReceived: "Passport information received securely. If another non-Thai guest is staying overnight, you can upload another passport.",
    thaiExempt: "Thai-national exemption recorded. No passport upload is required because all overnight guests on this reservation are Thai nationals.",
    registrationRequired: "Registration is still required for each non-Thai overnight guest.",
    passportError: "A secure upload form could not be opened. Please try again.",
    thaiError: "The exemption could not be saved. Please try again.",
    stayDates: "Verified stay: {checkIn} to {checkOut}.",
    keyDaytime: "Automatic spare-key access is available only after hours, from 7:30 PM until 10:30 AM Bangkok time. During the day, please ask the concierge for help.",
    keyNotActive: "Spare-key access starts at check-in and ends at 11:00 AM on checkout day.",
    keyAlreadyReleased: "The spare key has already been released for this reservation. Please contact the concierge for assistance.",
    keyRotation: "Automatic release is temporarily paused while the key-box code is changed. The urgent team has been notified; please contact the concierge.",
    keyUnavailable: "Automatic spare-key access is not available right now. Please contact the concierge for urgent help.",
    keyConfirmFee: "Please confirm the 500 THB lost-key replacement fee before continuing.",
    keyReleasing: "Verifying the after-hours request and notifying the team…",
    keyReady: "Spare key access approved for Room {room}.",
    copied: "Code copied.",
    copy: "Copy code"
  };

  function format(source, values = {}) {
    if (window.HOUSE_I18N?.format) return window.HOUSE_I18N.format(source, values);
    let output = source;
    Object.entries(values).forEach(([key, value]) => { output = output.replaceAll(`{${key}}`, value); });
    return output;
  }

  function setStatus(element, text, state = "") {
    if (!element) return;
    element.textContent = text;
    element.dataset.state = state;
    element.hidden = false;
    window.HOUSE_I18N?.localize?.(element);
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: "same-origin",
      headers: { accept: "application/json", ...(options.body ? { "content-type": "application/json" } : {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || "request_failed");
      error.code = data.error || "request_failed";
      throw error;
    }
    return data;
  }

  function registrationCopy(status) {
    if (status === "passport_received") return messages.passportReceived;
    if (status === "thai_exempt") return messages.thaiExempt;
    return messages.registrationRequired;
  }

  function renderVerified(data) {
    verificationFields.hidden = true;
    verifiedPanel.hidden = false;
    spareKeySection.hidden = false;
    setStatus(verificationStatus, format(messages.verified, { room }), "success");
    verifiedDates.textContent = format(messages.stayDates, { checkIn: data.checkInDate || "—", checkOut: data.checkOutDate || "—" });
    setStatus(registrationStatus, registrationCopy(data.registrationStatus), data.registrationStatus === "not_started" ? "attention" : "success");
    passportButton.textContent = data.registrationStatus === "passport_received"
      ? "Upload another non-Thai guest passport"
      : "Upload passport securely";
    passportButton.disabled = false;
    thaiButton.disabled = ["thai_exempt", "passport_received"].includes(data.registrationStatus);

    spareKeyForm.hidden = true;
    if (!data.activeStay) setStatus(spareKeyStatus, messages.keyNotActive, "attention");
    else if (!data.afterHours) setStatus(spareKeyStatus, messages.keyDaytime, "attention");
    else if (data.keyCodeRotationRequired) setStatus(spareKeyStatus, messages.keyRotation, "error");
    else if (data.spareKeyReleased) setStatus(spareKeyStatus, messages.keyAlreadyReleased, "attention");
    else {
      spareKeyStatus.hidden = true;
      spareKeyForm.hidden = false;
    }

    if (window.location.hash === "#spareKeyAccess") spareKeySection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadStatus() {
    try {
      const data = await api(`/api/stay/status?room=${encodeURIComponent(room)}`);
      if (data.verified) renderVerified(data);
    } catch (_error) {
      // The verification form remains available as the safe fallback.
    }
  }

  verificationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const confirmationCode = String(confirmationInput.value || "").trim();
    if (!confirmationCode) return;
    const submit = verificationForm.querySelector('button[type="submit"]');
    setBusy(submit, true);
    setStatus(verificationStatus, messages.verifying, "working");
    try {
      await api("/api/stay/verify", { method: "POST", body: JSON.stringify({ room, confirmationCode }) });
      confirmationInput.value = "";
      renderVerified(await api(`/api/stay/status?room=${encodeURIComponent(room)}`));
    } catch (error) {
      const message = error.code === "rate_limited"
        ? messages.rateLimited
        : error.code === "reservation_not_found"
          ? format(messages.wrongCode, { room })
          : messages.unavailable;
      setStatus(verificationStatus, message, "error");
    } finally {
      setBusy(submit, false);
    }
  });

  passportButton?.addEventListener("click", async () => {
    setBusy(passportButton, true);
    setStatus(registrationStatus, messages.passportCreating, "working");
    try {
      const data = await api("/api/stay/passport-link", { method: "POST", body: "{}" });
      window.location.assign(data.uploadUrl);
    } catch (_error) {
      setStatus(registrationStatus, messages.passportError, "error");
      setBusy(passportButton, false);
    }
  });

  thaiButton?.addEventListener("click", async () => {
    setBusy(thaiButton, true);
    try {
      const data = await api("/api/stay/thai-exemption", { method: "POST", body: JSON.stringify({ allGuestsThai: true }) });
      setStatus(registrationStatus, registrationCopy(data.registrationStatus), "success");
    } catch (_error) {
      setStatus(registrationStatus, messages.thaiError, "error");
      setBusy(thaiButton, false);
    }
  });

  spareKeyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!feeCheckbox.checked) {
      setStatus(spareKeyStatus, messages.keyConfirmFee, "error");
      return;
    }
    const submit = spareKeyForm.querySelector('button[type="submit"]');
    setBusy(submit, true);
    setStatus(spareKeyStatus, messages.keyReleasing, "working");
    try {
      const data = await api("/api/stay/spare-key", { method: "POST", body: JSON.stringify({ feeAccepted: true }) });
      spareKeyForm.hidden = true;
      keyCode.textContent = data.keyBoxCode;
      keyLocation.textContent = data.location;
      keyResult.hidden = false;
      setStatus(spareKeyStatus, format(messages.keyReady, { room }), "success");
    } catch (error) {
      const lookup = {
        fee_acceptance_required: messages.keyConfirmFee,
        active_stay_required: messages.keyNotActive,
        available_after_hours_only: messages.keyDaytime,
        spare_key_already_released: messages.keyAlreadyReleased,
        key_code_rotation_required: messages.keyRotation
      };
      setStatus(spareKeyStatus, lookup[error.code] || messages.keyUnavailable, "error");
      setBusy(submit, false);
    }
  });

  document.getElementById("copySpareKeyCode")?.addEventListener("click", async (event) => {
    try {
      await navigator.clipboard.writeText(keyCode.textContent || "");
      event.currentTarget.textContent = messages.copied;
      window.setTimeout(() => { event.currentTarget.textContent = messages.copy; }, 1600);
    } catch (_error) {
      // The large, selectable code remains visible if clipboard access is denied.
    }
  });

  document.querySelectorAll('[data-concierge-action="registration"],[data-private-registration]').forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      verificationSection.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!verifiedPanel.hidden) passportButton?.focus();
      else confirmationInput?.focus();
    });
  });

  loadStatus();
})();
