(function () {
  const status = document.getElementById("passportStatus");
  const form = document.getElementById("passportForm");
  const fileInput = document.getElementById("passportFile");
  const submit = document.getElementById("passportSubmit");
  const fragment = new URLSearchParams(location.hash.slice(1));
  let token = fragment.get("token") || "";
  history.replaceState(null, "", "/passport-upload");

  function showStatus(message, type = "") {
    status.textContent = message;
    status.className = `passport-status${type ? ` is-${type}` : ""}`;
  }

  function bangkokDate(value) {
    return new Date(value).toLocaleString("en-GB", {
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

  async function validateLink() {
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
      showStatus("This private link is missing or is not valid. Please ask The House for a new link.", "error");
      return;
    }
    try {
      const response = await request("/api/passport-upload/session", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "invalid_or_expired_link");
      document.getElementById("passportRoom").textContent = `Room ${data.room}`;
      document.getElementById("passportExpiry").textContent = `Link expires: ${bangkokDate(data.expiresAt)}`;
      document.getElementById("passportRetention").textContent = `Automatic deletion: ${data.retentionDays} days after upload`;
      form.hidden = false;
      showStatus("Your private link is valid. Choose the passport image when you are ready.", "success");
    } catch (_error) {
      token = "";
      showStatus("This private link has expired, has already been used or is not available. Please ask The House for a new link.", "error");
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
      fileInput.value = "";
      form.hidden = true;
      showStatus(`Thank you. The passport image for Room ${data.room} was received securely. This one-time link is now closed.`, "success");
    } catch (error) {
      const messages = {
        unsupported_file_type: "That file is not a supported passport image. Please choose a JPEG, PNG, WebP or HEIC image.",
        invalid_file: "That image is incomplete or too small. Please choose a clear passport photo.",
        too_large: "The image is larger than 10 MB. Please choose a smaller image.",
        invalid_or_expired_link: "This private link has expired or has already been used. Please ask The House for a new link.",
        link_already_used: "This private link has already been used. Please ask The House for a new link."
      };
      showStatus(messages[error.message] || "The image could not be uploaded securely. Please try again or ask The House for a new link.", "error");
      fileInput.disabled = false;
      submit.disabled = false;
    }
  });

  validateLink();
})();
