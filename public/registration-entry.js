(function () {
  const match = window.location.pathname.match(/^\/room\/(1|2|3|4|5|6|8|9|10|11)\/?$/);
  const room = match?.[1] || "";
  if (!room) return;

  const pendingPage = document.body.dataset.guestAccess !== "granted";
  const verificationForm = document.getElementById("stayVerificationForm");
  const confirmationInput = document.getElementById("airbnbConfirmationCode");
  const verificationFields = document.getElementById("stayVerificationFields");
  const verificationStatus = document.getElementById("stayVerificationStatus");
  const nationalityPanel = document.getElementById("nationalityPanel");
  const progressPanel = document.getElementById("passportProgressPanel");
  const progressText = document.getElementById("passportProgressText");
  const registrationStatus = document.getElementById("registrationStatus");
  const passportButton = document.getElementById("createPassportUpload");
  const inPersonButton = document.getElementById("providePassportsInPerson");
  const inPersonChoice = document.getElementById("inPersonPassportChoice");
  const progressTitle = document.getElementById("passportProgressTitle");
  const thaiButton = document.getElementById("confirmThaiNational");
  const foreignButton = document.getElementById("startForeignRegistration");
  const foreignCount = document.getElementById("nonThaiGuestCount");
  const allForeignGuestsConfirmed = document.getElementById("confirmAllNonThaiGuests");
  const spareKeyTrigger = document.getElementById("openSpareKeyAccess");
  const spareKeyClose = document.getElementById("closeSpareKeyAccess");
  const spareKeySection = document.getElementById("spareKeyAccess");
  const spareKeyForm = document.getElementById("spareKeyForm");
  const spareKeyStatus = document.getElementById("spareKeyStatus");
  const feeCheckbox = document.getElementById("lostKeyFeeAccepted");
  const spareKeyContactHelp = document.getElementById("spareKeyContactHelp");
  const keyResult = document.getElementById("spareKeyResult");
  const keyCode = document.getElementById("spareKeyCode");
  const keyLocation = document.getElementById("spareKeyLocation");

  const messages = {
    verifying: "Verifying your stay…",
    verified: "Stay verified. Complete the short guest registration below.",
    wrongCode: "That confirmation code does not match an active or upcoming reservation for this Room link. Check the HM code shown in your Airbnb trip details or the private House stay code provided to you, then try again.",
    rateLimited: "Too many attempts. Please wait a minute before trying again.",
    unavailable: "Secure stay verification is temporarily unavailable. Please contact the concierge for help.",
    nationalitySaving: "Saving your guest type securely…",
    passportCreating: "Opening a private one-time passport form…",
    passportProgress: "{received} of {required} required passport submissions received.",
    allPassportsRequired: "One passport is required for each non-Thai adult and child staying overnight.",
    passportError: "A secure upload form could not be opened. Please try again.",
    passportOptions: "Choose a passport option",
    inPersonSaving: "Recording your choice to provide passports in person…",
    inPersonPending: "Choice saved. Bring every required original passport to The House. The guide opens after our team completes the check and TM30 registration.",
    inPersonError: "The in-person passport option could not be saved. Please try again.",
    nationalityError: "The guest type could not be saved. Please check the information and try again.",
    countError: "Enter the number of non-Thai people who will stay overnight in this room.",
    allGuestsError: "Confirm that the number includes every non-Thai adult and child staying overnight, not only the Airbnb booking guest.",
    keyDaytime: "Automatic spare-key access is available only after hours, from 7:30 PM until 10:30 AM Bangkok time. During the day, please ask the concierge for help.",
    keyNotActive: "Spare-key access starts at check-in and ends at 11:00 AM on checkout day.",
    keyAlreadyReleased: "A spare key has already been provided for this stay. For security, another code cannot be released automatically. Please contact The House Concierge and we will help you.",
    keyRotation: "Another spare-key code cannot be released until the key box has been reset. Please contact The House Concierge and we will help you.",
    keyUnavailable: "Automatic spare-key access is not available right now. Please contact the concierge for urgent help.",
    keyConfirmFee: "Please confirm the 500 THB lost-key replacement fee before continuing.",
    keyRateLimited: "Too many confirmation attempts. Please wait a minute before trying again.",
    keyReleasing: "Notifying The House team and preparing your spare-key access…",
    keyReady: "Your spare key is ready.",
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

  function showRegistration(data) {
    if (verificationFields) verificationFields.hidden = true;
    setStatus(verificationStatus, messages.verified, "success");
    if (data.guestType === "foreign" || ["passport_pending", "passport_complete", "in_person_pending", "in_person_complete"].includes(data.registrationStatus)) {
      if (nationalityPanel) nationalityPanel.hidden = true;
      if (progressPanel) progressPanel.hidden = false;
      const received = Number(data.receivedPassports) || 0;
      const required = Math.max(1, Number(data.requiredPassports) || 1);
      const inPersonPending = data.registrationStatus === "in_person_pending";
      if (progressTitle) progressTitle.textContent = inPersonPending ? "Passports will be provided in person" : "Choose a passport option";
      if (inPersonChoice) inPersonChoice.hidden = inPersonPending;
      if (progressText) progressText.textContent = inPersonPending
        ? messages.inPersonPending
        : `${format(messages.passportProgress, { received, required })} ${messages.allPassportsRequired}`;
      setStatus(registrationStatus, inPersonPending
        ? messages.inPersonPending
        : format(messages.passportProgress, { received, required }),
      data.registrationStatus === "passport_complete" || data.registrationStatus === "in_person_complete" ? "success" : "attention");
      window.HOUSE_I18N?.localize?.(progressPanel);
      return;
    }
    if (nationalityPanel) nationalityPanel.hidden = false;
    if (progressPanel) progressPanel.hidden = true;
  }

  function renderSpareKey(data) {
    if (!spareKeySection) return;
    if (spareKeyTrigger) spareKeyTrigger.hidden = false;
    if (spareKeyForm) spareKeyForm.hidden = true;
    if (spareKeyContactHelp) spareKeyContactHelp.hidden = true;
    if (feeCheckbox) feeCheckbox.checked = false;
    if (!data.activeStay) setStatus(spareKeyStatus, messages.keyNotActive, "attention");
    else if (!data.afterHours) setStatus(spareKeyStatus, messages.keyDaytime, "attention");
    else if (data.keyCodeRotationRequired) {
      setStatus(spareKeyStatus, messages.keyRotation, "error");
      if (spareKeyContactHelp) spareKeyContactHelp.hidden = false;
    } else if (data.spareKeyReleased) {
      setStatus(spareKeyStatus, messages.keyAlreadyReleased, "attention");
      if (spareKeyContactHelp) spareKeyContactHelp.hidden = false;
    }
    else {
      if (spareKeyStatus) spareKeyStatus.hidden = true;
      if (spareKeyForm) spareKeyForm.hidden = false;
    }
  }

  function openSpareKeyAccess() {
    if (!spareKeySection) return;
    spareKeySection.hidden = false;
    spareKeyTrigger?.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => spareKeySection.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function closeSpareKeyAccess() {
    if (!spareKeySection) return;
    spareKeySection.hidden = true;
    spareKeyTrigger?.setAttribute("aria-expanded", "false");
    if (window.location.hash === "#spareKeyAccess") history.replaceState(null, "", window.location.pathname + window.location.search);
    spareKeyTrigger?.focus();
  }

  async function loadStatus() {
    try {
      const data = await api(`/api/stay/status?room=${encodeURIComponent(room)}`);
      if (!data.verified) return;
      if (data.accessGranted && pendingPage) return window.location.reload();
      if (!data.accessGranted && pendingPage) showRegistration(data);
      if (!data.accessGranted && pendingPage) {
        renderSpareKey(data);
        if (window.location.hash === "#spareKeyAccess") openSpareKeyAccess();
      } else if (data.accessGranted && !pendingPage) {
        renderSpareKey(data);
        if (window.location.hash === "#spareKeyAccess") openSpareKeyAccess();
      }
    } catch (_error) {
      // Keep the safe verification screen available.
    }
  }

  verificationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const confirmationCode = String(confirmationInput?.value || "").trim();
    if (!confirmationCode) return;
    const submit = verificationForm.querySelector('button[type="submit"]');
    setBusy(submit, true);
    setStatus(verificationStatus, messages.verifying, "working");
    try {
      await api("/api/stay/verify", { method: "POST", body: JSON.stringify({ room, confirmationCode }) });
      if (confirmationInput) confirmationInput.value = "";
      showRegistration(await api(`/api/stay/status?room=${encodeURIComponent(room)}`));
    } catch (error) {
      const message = error.code === "rate_limited" ? messages.rateLimited
        : error.code === "reservation_not_found" ? messages.wrongCode : messages.unavailable;
      setStatus(verificationStatus, message, "error");
    } finally {
      setBusy(submit, false);
    }
  });

  thaiButton?.addEventListener("click", async () => {
    setBusy(thaiButton, true);
    setStatus(registrationStatus, messages.nationalitySaving, "working");
    try {
      await api("/api/stay/nationality", { method: "POST", body: JSON.stringify({ nationality: "thai", allGuestsThai: true }) });
      window.location.reload();
    } catch (_error) {
      setStatus(registrationStatus, messages.nationalityError, "error");
      setBusy(thaiButton, false);
    }
  });

  foreignButton?.addEventListener("click", async () => {
    const count = Number(foreignCount?.value);
    if (!Number.isInteger(count) || count < 1 || count > 10) {
      setStatus(registrationStatus, messages.countError, "error");
      foreignCount?.focus();
      return;
    }
    if (!allForeignGuestsConfirmed?.checked) {
      setStatus(registrationStatus, messages.allGuestsError, "error");
      allForeignGuestsConfirmed?.focus();
      return;
    }
    setBusy(foreignButton, true);
    setStatus(registrationStatus, messages.nationalitySaving, "working");
    try {
      const data = await api("/api/stay/nationality", { method: "POST", body: JSON.stringify({ nationality: "foreign", nonThaiGuestCount: count, allNonThaiGuestsIncluded: true }) });
      showRegistration(data);
      setStatus(registrationStatus, messages.passportOptions, "attention");
      setBusy(foreignButton, false);
    } catch (_error) {
      setStatus(registrationStatus, messages.nationalityError, "error");
      setBusy(foreignButton, false);
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

  inPersonButton?.addEventListener("click", async () => {
    setBusy(inPersonButton, true);
    setStatus(registrationStatus, messages.inPersonSaving, "working");
    try {
      const data = await api("/api/stay/in-person-passports", {
        method: "POST",
        body: JSON.stringify({ allPassportsInPerson: true })
      });
      showRegistration(data);
      setStatus(registrationStatus, messages.inPersonPending, "success");
    } catch (_error) {
      setStatus(registrationStatus, messages.inPersonError, "error");
      setBusy(inPersonButton, false);
    }
  });

  spareKeyTrigger?.addEventListener("click", (event) => {
    event.preventDefault();
    openSpareKeyAccess();
  });
  window.addEventListener("house:open-spare-key", openSpareKeyAccess);
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#spareKeyAccess") openSpareKeyAccess();
  });
  spareKeyClose?.addEventListener("click", closeSpareKeyAccess);
  ["cancelLostKeyRequest"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => {
      if (feeCheckbox) feeCheckbox.checked = false;
      closeSpareKeyAccess();
    });
  });

  spareKeyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!feeCheckbox?.checked) return setStatus(spareKeyStatus, messages.keyConfirmFee, "error");
    const submit = spareKeyForm.querySelector('button[type="submit"]');
    setBusy(submit, true);
    setStatus(spareKeyStatus, messages.keyReleasing, "working");
    try {
      const data = await api("/api/stay/spare-key", { method: "POST", body: JSON.stringify({ feeAccepted: true }) });
      spareKeyForm.hidden = true;
      keyCode.textContent = data.keyBoxCode;
      keyLocation.textContent = data.location;
      keyResult.hidden = false;
      setStatus(spareKeyStatus, messages.keyReady, "success");
    } catch (error) {
      const lookup = { rate_limited: messages.keyRateLimited, fee_acceptance_required: messages.keyConfirmFee, active_stay_required: messages.keyNotActive, available_after_hours_only: messages.keyDaytime, spare_key_already_released: messages.keyAlreadyReleased, key_code_rotation_required: messages.keyRotation };
      setStatus(spareKeyStatus, lookup[error.code] || messages.keyUnavailable, "error");
      if (["spare_key_already_released", "key_code_rotation_required"].includes(error.code)) {
        spareKeyForm.hidden = true;
        if (spareKeyContactHelp) spareKeyContactHelp.hidden = false;
      } else {
        setBusy(submit, false);
      }
    }
  });

  document.getElementById("copySpareKeyCode")?.addEventListener("click", async (event) => {
    try {
      await navigator.clipboard.writeText(keyCode?.textContent || "");
      event.currentTarget.textContent = messages.copied;
      window.setTimeout(() => { event.currentTarget.textContent = messages.copy; }, 1600);
    } catch (_error) {
      // The selectable code remains visible if clipboard access is denied.
    }
  });

  loadStatus();
})();
