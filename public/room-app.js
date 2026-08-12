(function () {
  const parts = window.location.pathname.split("/").filter(Boolean);
  let room = null;

  if (parts[0] === "room" && parts[1]) room = parts[1];
  if (!room) {
    const params = new URLSearchParams(window.location.search);
    room = params.get("room");
  }

  const data = window.HOUSE_ROOMS && window.HOUSE_ROOMS[room];
  if (!data) {
    document.getElementById("roomTitle").textContent = "Room link not found";
    document.getElementById("roomNote").textContent = "Please check the link or Contact Us on WhatsApp.";
    return;
  }

  const title = `Welcome to Room ${room}`;
  const photo = `/assets/${data.photo}`;

  document.title = `Room ${room} | The House – Koh Tao`;
  document.getElementById("roomBadge").textContent = `Room ${room} · ${data.floor}`;
  document.getElementById("roomTitle").textContent = title;
  document.getElementById("heroRoom").textContent = `Room ${room}`;
  document.getElementById("roomNote").textContent = data.note;
  document.getElementById("roomPhoto").src = photo;
  document.getElementById("roomPhoto").alt = data.photoStatus === "placeholder"
    ? `Room ${room} arrival photo placeholder`
    : `Room ${room} highlighted on the building`;
  document.getElementById("arrivalRoomPhoto").src = photo;
  document.getElementById("arrivalRoomPhoto").alt = data.photoStatus === "placeholder"
    ? `Room ${room} arrival photo placeholder`
    : `Room ${room} location`;
  document.getElementById("arrivalTitle").textContent = `Finding Room ${room}`;
  document.getElementById("arrivalCaption").innerHTML =
    `<strong>Step 2.</strong> ${data.note}${data.photoStatus === "placeholder" ? " A marked arrival photo will be added later." : ""}`;
})();
