(function () {
  async function loadPlaces() {
    const response = await fetch('/data/places.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load places database.');
    const data = await response.json();
    window.GUEST_GUIDE_PLACES = data;
    document.dispatchEvent(new CustomEvent('guestGuidePlacesReady', { detail: data }));
    return data;
  }
  window.loadGuestGuidePlaces = loadPlaces;
})();
