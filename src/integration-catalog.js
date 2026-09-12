// Admin-facing booking-source integration catalog.
//
// This module is intentionally read-only in The House production line. It
// exposes the current live sources plus product-ready provider slots without
// pretending that an external booking API is connected before a real connector
// exists. Future provider adapters can extend this registry while continuing to
// write reservations through the canonical reservation model.

function connectionStatus({ connected = false, active = false } = {}) {
  if (connected) return "connected";
  if (active) return "active";
  return "not_connected";
}

export function integrationAdminOverview(env = {}) {
  const reservationSyncConfigured = Boolean(
    env.CONCIERGE_STORE && env.RESERVATION_SYNC_TOKEN && env.STAY_TOKEN_PEPPER
  );

  return {
    canonicalReservationModel: true,
    connectorContract: "canonical-reservation-v1",
    providers: [
      {
        id: "airbnb",
        name: "Airbnb",
        category: "booking_channel",
        status: connectionStatus({ connected: reservationSyncConfigured }),
        liveAtHouse: true,
        connectorInstalled: true,
        connectAction: "managed_existing_sync",
        description: "Existing Airbnb reservation sync used by The House.",
        note: reservationSyncConfigured
          ? "Connected through the existing House reservation-sync workflow."
          : "The existing House reservation-sync credentials are not fully configured."
      },
      {
        id: "direct",
        name: "Direct / Walk-in",
        category: "built_in",
        status: connectionStatus({ active: true }),
        liveAtHouse: true,
        connectorInstalled: true,
        connectAction: "built_in",
        description: "Owner-created direct bookings and walk-ins.",
        note: "Built in. No external connection is required."
      },
      {
        id: "booking-com",
        name: "Booking.com",
        category: "booking_channel",
        status: "not_connected",
        liveAtHouse: false,
        connectorInstalled: false,
        connectAction: "connector_required",
        description: "Prepared provider slot for the commercial product/demo architecture.",
        note: "A Booking.com-specific connector and credentials must be added before Connect can be enabled."
      },
      {
        id: "agoda",
        name: "Agoda",
        category: "booking_channel",
        status: "not_connected",
        liveAtHouse: false,
        connectorInstalled: false,
        connectAction: "connector_required",
        description: "Prepared provider slot for the commercial product/demo architecture.",
        note: "An Agoda-specific connector and credentials must be added before Connect can be enabled."
      },
      {
        id: "pms-api",
        name: "Other PMS / API",
        category: "pms_api",
        status: "not_connected",
        liveAtHouse: false,
        connectorInstalled: false,
        connectAction: "connector_required",
        description: "Generic slot for a future PMS, channel manager or custom reservation API.",
        note: "A provider-specific adapter is required. Once installed, reservations normalize into the same canonical model."
      }
    ]
  };
}
