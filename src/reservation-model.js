// Canonical reservation primitives for The House production line.
//
// This module deliberately does not add booking channels or change live behavior.
// It gives every existing reservation source the same internal shape so future
// product/demo adapters can target one contract without branching guest or
// operations logic by provider.

function text(value, maximum) {
  return String(value || "").trim().slice(0, maximum);
}

export function normalizeReservationProvider(value, fallback = "airbnb") {
  return text(value || fallback, 24) || fallback;
}

export function normalizeReservationStatus(value) {
  return value === "cancelled" ? "cancelled" : "confirmed";
}

export function reservationSourceCapabilities(providerValue) {
  const provider = normalizeReservationProvider(providerValue);
  return Object.freeze({
    provider,
    ownerManaged: provider === "direct" || provider === "manual",
    synchronized: provider === "airbnb",
    directConfirmationCode: provider === "direct"
  });
}

export function normalizeReservationSyncPayload(payload = {}) {
  const provider = normalizeReservationProvider(payload.provider);
  const records = Array.isArray(payload.records) ? payload.records.slice(0, 250) : [];
  return {
    provider,
    room: text(payload.room, 4),
    listingId: text(payload.listingId, 32),
    syncId: text(payload.syncId, 100),
    syncedAt: text(payload.syncedAt, 40),
    complete: payload.complete === true,
    records: records.map((record = {}) => ({
      confirmationCodeHash: text(record.confirmationCodeHash, 100),
      guestFirstName: text(record.guestFirstName, 40),
      checkInDate: text(record.checkInDate, 10),
      checkOutDate: text(record.checkOutDate, 10),
      status: normalizeReservationStatus(record.status),
      sourceRefHash: text(record.sourceRefHash, 100)
    }))
  };
}

export function canonicalReservationFromStorage(row = {}) {
  const provider = normalizeReservationProvider(row.provider);
  const capabilities = reservationSourceCapabilities(provider);
  return {
    reservationId: text(row.id || row.reservationId, 100),
    source: {
      provider,
      listingId: text(row.listingId, 32),
      sourceRefHash: text(row.sourceRefHash, 100)
    },
    room: text(row.room, 4),
    guest: {
      firstName: text(row.guestFirstName, 40)
    },
    stay: {
      checkInDate: text(row.checkInDate, 10),
      checkOutDate: text(row.checkOutDate, 10),
      status: normalizeReservationStatus(row.status)
    },
    capabilities,
    updatedAt: text(row.updatedAt, 40)
  };
}

export function legacyStayReservationView(canonical = {}) {
  return {
    id: text(canonical.reservationId, 100),
    provider: normalizeReservationProvider(canonical.source?.provider),
    listingId: text(canonical.source?.listingId, 32),
    room: text(canonical.room, 4),
    guestFirstName: text(canonical.guest?.firstName, 40),
    checkInDate: text(canonical.stay?.checkInDate, 10),
    checkOutDate: text(canonical.stay?.checkOutDate, 10),
    status: normalizeReservationStatus(canonical.stay?.status),
    updatedAt: text(canonical.updatedAt, 40)
  };
}
