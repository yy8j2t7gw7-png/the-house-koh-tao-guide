(function () {
  const scenarios = {
    water: [["active_water_leak", "Active leak, flooding or water from the ceiling"]],
    toilet: [["toilet_clogged", "Toilet is clogged"], ["toilet_overflowing", "Toilet is overflowing"], ["toilet_not_flushing", "Toilet will not flush"], ["toilet_running_or_leaking", "Toilet keeps running or is leaking"]],
    shower: [["no_water", "No water"], ["low_water_pressure", "Low water pressure"], ["no_hot_water", "No hot water"], ["shower_or_tap_broken", "Shower or tap is broken"], ["drain_problem", "Drain problem"]],
    ac: [["ac_not_cooling", "AC is not cooling"], ["ac_leaking", "AC is leaking"], ["ac_noisy", "AC is unusually noisy"], ["ac_not_turning_on", "AC will not turn on"]],
    electricity: [["no_power", "No power"], ["broken_light", "Light is not working"], ["socket_or_switch", "Socket or switch problem"], ["electrical_danger", "Sparks, smoke, burning smell or exposed wiring"]],
    security: [["door_or_lock", "Door, lock or handle is damaged"], ["room_cannot_secure", "The room cannot be secured"], ["window_problem", "Window problem"]],
    tv: [["tv_power", "TV will not turn on"], ["tv_signal", "No TV signal"], ["tv_remote", "Remote control problem"], ["tv_damaged", "TV appears damaged"]],
    fridge: [["fridge_not_cooling", "Refrigerator is not cooling"], ["fridge_leaking", "Refrigerator is leaking"], ["fridge_noisy", "Refrigerator is unusually noisy"], ["fridge_no_power", "Refrigerator has no power"]],
    fan: [["fan_problem", "Fan problem"]],
    wifi: [["wifi_problem", "Wi-Fi problem"]],
    furniture: [["furniture_problem", "Furniture is damaged"], ["fixture_problem", "A room fixture is damaged"]],
    other: [["other_issue", "Other issue — tell us what happened"]]
  };
  const form = document.getElementById("problemReportForm");
  const categories = document.getElementById("issueCategories");
  const scenarioField = document.getElementById("scenarioField");
  const scenarioHost = document.getElementById("issueScenarios");
  const feeBox = document.getElementById("toiletAcknowledgement");
  const feeInput = document.getElementById("toiletFeeAccepted");
  const details = document.getElementById("problemDetails");
  const photo = document.getElementById("problemPhoto");
  const replyContact = document.getElementById("replyContact");
  const submit = document.getElementById("submitProblem");
  const status = document.getElementById("problemStatus");
  let issueType = "";

  function t(source) { return window.HOUSE_I18N?.t(source) || source; }
  function setStatus(message, working) {
    status.textContent = t(message);
    status.className = `report-status${working ? " is-working" : ""}`;
    status.hidden = false;
  }
  function chooseIssue(value, button) {
    issueType = value;
    scenarioHost.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === button));
    feeBox.hidden = value !== "toilet_clogged";
    if (feeBox.hidden) feeInput.checked = false;
    const critical = ["active_water_leak", "toilet_overflowing", "electrical_danger", "room_cannot_secure"].includes(value);
    replyContact.required = !critical;
    document.getElementById("replyContactHelp").classList.toggle("is-required", !critical);
    submit.disabled = false;
  }
  function showScenarios(category, selectedButton) {
    categories.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === selectedButton));
    issueType = "";
    submit.disabled = true;
    feeBox.hidden = true;
    feeInput.checked = false;
    scenarioHost.replaceChildren();
    (scenarios[category] || []).forEach(([value, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = t(label);
      button.addEventListener("click", () => chooseIssue(value, button));
      scenarioHost.appendChild(button);
    });
    scenarioField.hidden = false;
    if ((scenarios[category] || []).length === 1) chooseIssue(scenarios[category][0][0], scenarioHost.firstElementChild);
    scenarioField.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  categories.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category]");
    if (button) showScenarios(button.dataset.category, button);
  });

  fetch("/api/maintenance/report", { credentials: "same-origin", headers: { accept: "application/json" } })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("access")))
    .then((data) => { document.getElementById("reportRoom").textContent = t("Report for Room {room}").replace("{room}", data.room); })
    .catch(() => { window.location.assign("/rooms.html"); });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!issueType) return;
    if (issueType === "toilet_clogged" && !feeInput.checked) {
      setStatus("Please acknowledge the conditional toilet-clearance fee before sending.", false);
      return;
    }
    if (issueType === "other_issue" && details.value.trim().length < 5) {
      setStatus("Please tell us what happened.", false);
      details.focus();
      return;
    }
    if (photo.files[0]?.size > 10 * 1024 * 1024) {
      setStatus("The photo is larger than 10 MB. Please choose a smaller image.", false);
      return;
    }
    if (replyContact.required && replyContact.value.replace(/\D/g, "").length < 8) {
      setStatus("Please add a phone or WhatsApp number with country code so our team can contact you.", false);
      replyContact.focus();
      return;
    }
    submit.disabled = true;
    setStatus("Sending your report…", true);
    const data = new FormData();
    data.set("issueType", issueType);
    data.set("details", details.value.trim());
    data.set("toiletFeeAccepted", String(feeInput.checked));
    data.set("replyContact", replyContact.value.trim());
    if (photo.files[0]) data.set("photo", photo.files[0]);
    try {
      const response = await fetch("/api/maintenance/report", { method: "POST", credentials: "same-origin", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "send_failed");
      form.hidden = true;
      document.getElementById("problemSuccess").hidden = false;
      document.getElementById("problemReference").textContent = result.reference;
      document.getElementById("problemSuccessMessage").textContent = t(result.critical
        ? "This serious report has been sent to the urgent team. Move away from immediate danger and use Help & Emergency if anyone is at risk."
        : result.notified
          ? "Your report has been sent to our House team."
          : "Your report has been recorded. Please use Contact Us if you need immediate assistance.");
    } catch (error) {
      const messages = {
        file_too_large: "The photo is larger than 10 MB. Please choose a smaller image.",
        unsupported_file_type: "That photo format is not supported. Please choose a JPEG, PNG, WebP or HEIC image.",
        toilet_fee_acknowledgement_required: "Please acknowledge the conditional toilet-clearance fee before sending.",
        details_required: "Please tell us what happened.",
        reply_contact_required: "Please add a phone or WhatsApp number with country code so our team can contact you."
      };
      setStatus(messages[error.message] || "The report could not be sent. Please try again or use Contact Us.", false);
      submit.disabled = false;
    }
  });
})();
