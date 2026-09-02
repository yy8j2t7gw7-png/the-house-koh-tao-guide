(function () {
  const tokenStorageKey = "housePassportUploadToken";
  const status = document.getElementById("passportStatus");
  const form = document.getElementById("passportForm");
  const fileInput = document.getElementById("passportFile");
  const submit = document.getElementById("passportSubmit");
  const title = document.getElementById("identityDocumentTitle");
  const intro = document.getElementById("identityDocumentIntro");
  const factOne = document.getElementById("identityFactOne");
  const factTwo = document.getElementById("identityFactTwo");
  const factThree = document.getElementById("identityFactThree");
  const privacyStorage = document.getElementById("identityPrivacyStorage");
  const privacyPurpose = document.getElementById("identityPrivacyPurpose");
  const uploadOptionTitle = document.getElementById("identityUploadOptionTitle");
  const uploadOptionText = document.getElementById("identityUploadOptionText");
  const fileTitle = document.getElementById("identityFileTitle");
  const fileText = document.getElementById("identityFileText");
  const consentText = document.getElementById("identityConsentText");
  const helpText = document.getElementById("identityHelpText");
  const fragment = new URLSearchParams(location.hash.slice(1));
  let token = fragment.get("token") || window.sessionStorage.getItem(tokenStorageKey) || "";
  let documentType = "passport";
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

  function applyDocumentCopy(type) {
    documentType = type === "thai_id" ? "thai_id" : "passport";
    if (documentType !== "thai_id") return;
    document.title = "Secure Thai ID Information | The House";
    if (title) title.textContent = "Thai ID information";
    if (intro) intro.textContent = "Please use this private form to upload one clear Thai ID-card image for a reservation where all overnight guests were declared as Thai nationals.";
    if (factOne) factOne.innerHTML = "<strong>Thai-only declaration check</strong><span>This document confirms that the Thai-only registration option was selected appropriately before the private guest guide opens.</span>";
    if (factTwo) factTwo.innerHTML = "<strong>One image for the reservation</strong><span>Only one clear Thai ID-card image is required for a Thai-only reservation.</span>";
    if (factThree) factThree.innerHTML = "<strong>No TM30 passport registration</strong><span>This Thai ID upload is not a foreign-guest TM30 passport registration and is not marked as TM30 processing.</span>";
    if (privacyStorage) privacyStorage.textContent = "Your Thai ID image goes to private document storage. It is not sent through WhatsApp or the AI Concierge.";
    if (privacyPurpose) privacyPurpose.textContent = "The document is used only to verify the Thai-only guest registration declaration, not marketing or AI training.";
    if (uploadOptionTitle) uploadOptionTitle.textContent = "Upload Thai ID-card image";
    if (uploadOptionText) uploadOptionText.textContent = "Use one clear image showing the Thai ID card. Do not upload another person's ID.";
    if (fileTitle) fileTitle.textContent = "Choose a clear Thai ID-card image";
    if (fileText) fileText.textContent = "JPEG, PNG, WebP or HEIC; maximum 10 MB.";
    if (consentText) consentText.textContent = "I am authorized to submit this Thai ID-card image to The House for the guest registration described above.";
    if (helpText) helpText.textContent = "Do not paste Thai ID details into the AI Concierge. If this one-time form has expired, return to your verified permanent Room page and create a new secure upload form.";
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

  async function validateLink() {
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
      showStatus("This private link is missing or is not valid. Return to your verified permanent Room page to create a new secure form.", "error");
      return;
    }
    try {
      const response = await request("/api/passport-upload/session", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "invalid_or_expired_link");
      applyDocumentCopy(data.documentType);
      document.getElementById("passportRoom").textContent = window.HOUSE_I18N?.format("Room {room}", { room: data.room }) || `Room ${data.room}`;
      document.getElementById("passportExpiry").textContent = window.HOUSE_I18N?.format("Link expires: {date}", { date: bangkokDate(data.expiresAt) }) || `Link expires: ${bangkokDate(data.expiresAt)}`;
      document.getElementById("passportRetention").textContent = window.HOUSE_I18N?.format("Automatic deletion: {days} days after upload", { days: data.retentionDays }) || `Automatic deletion: ${data.retentionDays} days after upload`;
      form.hidden = false;
      showStatus(documentType === "thai_id"
        ? "Your private link is valid. Choose the Thai ID-card image when you are ready."
        : "Your private link is valid. Choose the passport image when you are ready.", "success");
    } catch (_error) {
      token = "";
      window.sessionStorage.removeItem(tokenStorageKey);
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
    showStatus("Uploading securely. Please keep this page open…");
    try {
      const response = await request("/api/passport-upload", {
        method: "POST",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "upload_failed");
      token = "";
      window.sessionStorage.removeItem(tokenStorageKey);
      fileInput.value = "";
      form.hidden = true;
      const progress = `${Number(data.receivedPassports) || 1} of ${Number(data.requiredPassports) || 1}`;
      const completeMessage = data.documentType === "thai_id"
        ? "Thank you. The Thai ID image was received securely. Opening your private Room guide…"
        : data.accessGranted
          ? `Thank you. All ${Number(data.requiredPassports) || 1} required passport submissions were received securely. Opening your private Room guide…`
          : `Thank you. Passport submission ${progress} was received securely. Returning to your Room page so you can upload the next required passport…`;
      showStatus(completeMessage, "success");
      window.setTimeout(() => { window.location.assign(`/room/${encodeURIComponent(data.room)}`); }, 1400);
    } catch (error) {
      const messages = {
        unsupported_file_type: documentType === "thai_id" ? "That file is not a supported Thai ID image. Please choose a JPEG, PNG, WebP or HEIC image." : "That file is not a supported passport image. Please choose a JPEG, PNG, WebP or HEIC image.",
        invalid_file: documentType === "thai_id" ? "That image is incomplete or too small. Please choose a clear Thai ID-card photo." : "That image is incomplete or too small. Please choose a clear passport photo.",
        too_large: "The image is larger than 10 MB. Please choose a smaller image.",
        invalid_or_expired_link: "This private link has expired or has already been used. Return to your verified permanent Room page to create a new secure form.",
        link_already_used: "This private link has already been used. Return to your verified permanent Room page to create a new secure form."
      };
      showStatus(messages[error.message] || "The image could not be uploaded securely. Please try again or return to your verified permanent Room page.", "error");
      fileInput.disabled = false;
      submit.disabled = false;
    }
  });

  validateLink();
})();
