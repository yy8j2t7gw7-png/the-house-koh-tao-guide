(function () {
  const tokenStorageKey = "housePassportUploadToken";
  const status = document.getElementById("passportStatus");
  const session = document.getElementById("passportSession");
  const form = document.getElementById("passportForm");
  const detailsForm = document.getElementById("passportDetailsForm");
  const divider = document.getElementById("registrationDivider");
  const fileInput = document.getElementById("passportFile");
  const submit = document.getElementById("passportSubmit");
  const detailsSubmit = document.getElementById("passportDetailsSubmit");
  const fragment = new URLSearchParams(location.hash.slice(1));
  let token = fragment.get("token") || window.sessionStorage.getItem(tokenStorageKey) || "";
  if (/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    window.sessionStorage.setItem(tokenStorageKey, token);
  }
  history.replaceState(null, "", "/passport-upload");

  function showStatus(message, type = "") {
    const translated = window.HOUSE_I18N?.t(message) || message;
    status.textContent = translated;
    if (translated !== message) status.dataset.i18nSkip = "true";
    else delete status.dataset.i18nSkip;
    status.className = `passport-status${type ? ` is-${type}` : ""}`;
  }

  function bangkokDate(value) {
    const locales = { en: "en-GB", th: "th-TH", "zh-CN": "zh-CN", ru: "ru-RU", de: "de-DE", fr: "fr-FR", es: "es-ES" };
    return new Date(value).toLocaleString(locales[window.HOUSE_I18N?.language] || "en-GB", {
      timeZone: "Asia/Bangkok",
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  async function request(path, options = {}) {
    return fetch(path, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
  }

  function closePrivateForm() {
    token = "";
    window.sessionStorage.removeItem(tokenStorageKey);
    fileInput.value = "";
    form.hidden = true;
    detailsForm.hidden = true;
    divider.hidden = true;
    session.hidden = true;
  }

  function completionMessage(data) {
    const progress = `${Number(data.receivedPassports) || 1} of ${Number(data.requiredPassports) || 1}`;
    return data.accessGranted
      ? `Thank you. All ${Number(data.requiredPassports) || 1} required passport submissions were received securely. Opening your private Room guide…`
      : `Thank you. Passport submission ${progress} was received securely. Returning to your Room page so you can submit the next required passport…`;
  }

  function finishSubmission(data) {
    closePrivateForm();
    showStatus(completionMessage(data), "success");
    window.setTimeout(() => { window.location.assign(`/room/${encodeURIComponent(data.room)}`); }, 1400);
  }

  async function validateLink() {
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
      showStatus("This private link is missing or is not valid. Return to your verified permanent Room page to create a new secure form.", "error");
      return;
    }
    try {
      const response = await request("/api/passport-upload/session", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "invalid_or_expired_link");
      document.getElementById("passportRoom").textContent = window.HOUSE_I18N?.format("Room {room}", { room: data.room }) || `Room ${data.room}`;
      document.getElementById("passportExpiry").textContent = window.HOUSE_I18N?.format("Link expires: {date}", { date: bangkokDate(data.expiresAt) }) || `Link expires: ${bangkokDate(data.expiresAt)}`;
      document.getElementById("passportRetention").textContent = window.HOUSE_I18N?.format("Automatic deletion: {days} days after submission", { days: data.retentionDays }) || `Automatic deletion: ${data.retentionDays} days after submission`;
      session.hidden = false;
      form.hidden = false;
      detailsForm.hidden = false;
      divider.hidden = false;
      showStatus("Your private link is valid. Choose either a passport image or the required details.", "success");
    } catch (_error) {
      closePrivateForm();
      showStatus("This private link has expired, has already been used or is not available. Return to your verified permanent Room page to create a new secure form.", "error");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showStatus("The image is larger than 10 MB. Please choose a smaller image.", "error");
      return;
    }
    submit.disabled = true;
    fileInput.disabled = true;
    detailsSubmit.disabled = true;
    showStatus("Uploading securely. Please keep this page open…");
    try {
      const response = await request("/api/passport-upload", {
        method: "POST",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "upload_failed");
      finishSubmission(data);
    } catch (error) {
      const messages = {
        unsupported_file_type: "That file is not a supported passport image. Please choose a JPEG, PNG, WebP or HEIC image.",
        invalid_file: "That image is incomplete or too small. Please choose a clear passport photo.",
        too_large: "The image is larger than 10 MB. Please choose a smaller image.",
        invalid_or_expired_link: "This private link has expired or has already been used. Return to your verified permanent Room page to create a new secure form.",
        link_already_used: "This private link has already been used. Return to your verified permanent Room page to create a new secure form."
      };
      showStatus(messages[error.message] || "The image could not be uploaded securely. Please try again or return to your verified permanent Room page.", "error");
      fileInput.disabled = false;
      submit.disabled = false;
      detailsSubmit.disabled = false;
    }
  });

  detailsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      passportNumber: document.getElementById("passportNumber").value,
      fullName: document.getElementById("passportFullName").value,
      birthday: document.getElementById("passportBirthday").value,
      nationality: document.getElementById("passportNationality").value,
      gender: document.getElementById("passportGender").value,
      phoneNumber: document.getElementById("passportPhone").value,
      authorized: document.getElementById("passportDetailsConsent").checked === true
    };
    detailsSubmit.disabled = true;
    submit.disabled = true;
    fileInput.disabled = true;
    showStatus("Submitting the passport details securely. Please keep this page open…");
    try {
      const response = await request("/api/passport-details", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "details_failed");
      detailsForm.reset();
      finishSubmission(data);
    } catch (error) {
      const messages = {
        authorization_required: "Please confirm that you are authorized to submit these passport details.",
        invalid_passport_number: "Please enter the passport number exactly as shown on the passport.",
        invalid_full_name: "Please enter the guest's full name exactly as shown on the passport.",
        invalid_birthday: "Please enter a valid birthday.",
        invalid_nationality: "Please enter the nationality exactly as shown on the passport.",
        invalid_gender: "Please choose the gender / sex shown on the passport.",
        invalid_phone_number: "Please enter a valid phone or WhatsApp number.",
        invalid_or_expired_link: "This private link has expired or has already been used. Return to your verified permanent Room page to create a new secure form.",
        link_already_used: "This private link has already been used. Return to your verified permanent Room page to create a new secure form."
      };
      showStatus(messages[error.message] || "The passport details could not be submitted securely. Please check the fields and try again.", "error");
      detailsSubmit.disabled = false;
      submit.disabled = false;
      fileInput.disabled = false;
    }
  });

  validateLink();
})();
