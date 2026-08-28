(async function () {
  const match = window.location.pathname.match(/^\/room\/(1|2|3|4|5|6|8|9|10|11)\/?$/);
  const room = match?.[1] || "";
  const titleElement = document.getElementById("roomTitle");
  const noteElement = document.getElementById("roomNote");
  if (!room || !titleElement || !noteElement) return;

  try {
    const response = await fetch(`/api/stay/room-content?room=${encodeURIComponent(room)}`, {
      credentials: "same-origin",
      headers: { accept: "application/json" }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      window.location.assign(`/room/${encodeURIComponent(room)}`);
      return;
    }

    const title = data.guestFirstName
      ? `Welcome ${data.guestFirstName} to Room ${room}`
      : `Welcome to Room ${room}`;
    document.title = `Room ${room} | The House – Koh Tao`;
    document.getElementById("roomBadge").textContent = `Room ${room} · ${data.floor}`;
    titleElement.textContent = title;
    document.getElementById("heroRoom").textContent = data.floor;
    noteElement.textContent = data.note;

    const roomPhoto = document.getElementById("roomPhoto");
    const arrivalRoomPhoto = document.getElementById("arrivalRoomPhoto");
    const entrancePhoto = document.getElementById("entrancePhoto");
    roomPhoto.src = data.roomPhotoUrl;
    roomPhoto.alt = `Room ${room} highlighted on the building`;
    arrivalRoomPhoto.src = data.roomPhotoUrl;
    arrivalRoomPhoto.alt = `Room ${room} location`;
    entrancePhoto.src = data.entrancePhotoUrl;
    document.getElementById("arrivalTitle").textContent = `Finding Room ${room}`;
    document.getElementById("arrivalCaption").innerHTML = `<strong>Step 2.</strong> ${data.note}`;
  } catch (_error) {
    titleElement.textContent = "Private room information unavailable";
    noteElement.textContent = "Please refresh the page or contact the concierge for help.";
  }
})();
