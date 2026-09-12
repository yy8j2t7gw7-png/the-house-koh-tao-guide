// Admin-facing booking-source integration catalog.
//
// The House production line remains read-only for provider connectivity: the
// catalog exposes the live House sources plus honest product/demo integration
// slots, connection requirements, and official provider references. A provider
// is never presented as connected until a real connector is installed and
// configured. Future adapters continue to write reservations through the
// canonical reservation model.

function connectionStatus({ connected = false, active = false } = {}) {
  if (connected) return "connected";
  if (active) return "active";
  return "not_connected";
}

function externalProvider({ id, name, description, note, propertySteps, platformSteps, officialLinks }) {
  return {
    id,
    name,
    category: "booking_channel",
    status: "not_connected",
    liveAtHouse: false,
    connectorInstalled: false,
    connectorStatus: "not_installed",
    connectAction: "connector_required",
    description,
    note,
    connectionGuide: {
      propertySteps,
      platformSteps,
      officialLinks
    }
  };
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
        connectorStatus: "installed",
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
        connectorStatus: "built_in",
        connectAction: "built_in",
        description: "Owner-created direct bookings and walk-ins.",
        note: "Built in. No external connection is required."
      },
      externalProvider({
        id: "booking-com",
        name: "Booking.com",
        description: "Prepared integration slot for Booking.com reservations and future two-way property connectivity.",
        note: "The property owner does not need to build an API. The software provider must first install and qualify the Booking.com connector; the hotel can then authorize and map its property.",
        propertySteps: [
          "Keep the property active in the Booking.com Extranet.",
          "Once this product's Booking.com connector is installed, choose it as the property's connectivity provider and approve the requested connection permissions.",
          "Match the Booking.com property, room types and rate plans to the rooms/rates in this system.",
          "Run a connection test covering a new reservation, modification and cancellation before enabling live synchronization."
        ],
        platformSteps: [
          "The software operator must onboard as a Booking.com Connectivity Partner and obtain the required provider/machine-account access.",
          "Implement the required reservation connection and any rates/availability or content capabilities the product will offer.",
          "Complete Booking.com testing/certification requirements before exposing the live Connect action to hotels."
        ],
        officialLinks: [
          { label: "Booking.com Connectivity documentation", url: "https://developers.booking.com/connectivity/docs" },
          { label: "Connectivity Developer Portal", url: "https://developers.booking.com/connectivity/home" }
        ]
      }),
      externalProvider({
        id: "agoda",
        name: "Agoda",
        description: "Prepared integration slot for Agoda reservations, rates and availability.",
        note: "Agoda connectivity is partner-based. A certified/approved connector and Agoda credentials must exist before a hotel can activate the connection here.",
        propertySteps: [
          "Keep the property active in Agoda/YCS.",
          "After this product's Agoda connector is installed, authorize or select the connectivity provider for the property.",
          "Map the Agoda property, room types and rate plans to the corresponding rooms/rates in this system.",
          "Test reservation retrieval, cancellations/modifications and any enabled rate/availability synchronization before going live."
        ],
        platformSteps: [
          "The software operator must apply to become an Agoda Tech/Connectivity Partner.",
          "Obtain the assigned authentication credentials (Agoda's current supply documentation includes OAuth 2.0/client credentials) and implement the required YCS/Direct Supply functions.",
          "Complete Agoda's onboarding/certification process before enabling the live Connect action."
        ],
        officialLinks: [
          { label: "Become an Agoda Tech Partner", url: "https://developer.agoda.com/supply/docs/how-to-become-a-partner" },
          { label: "Agoda Supply API documentation", url: "https://developer.agoda.com/supply" }
        ]
      }),
      externalProvider({
        id: "hostelworld",
        name: "Hostelworld",
        description: "Prepared integration slot for Hostelworld properties and hostel-focused distribution.",
        note: "Hostelworld partner/API access is controlled by Hostelworld. Public API material does not by itself guarantee supply-side channel-manager access, so live enablement must follow Hostelworld's approved onboarding path.",
        propertySteps: [
          "Keep the property active in Hostelworld's Property Manager.",
          "When an approved Hostelworld connector is available in this product, authorize the property connection through the onboarding path supplied by Hostelworld.",
          "Map Hostelworld room/bed products and rates to the corresponding inventory in this system.",
          "Test booking retrieval and any enabled availability/rate synchronization before activating live use."
        ],
        platformSteps: [
          "The software operator must confirm the appropriate Hostelworld partner/connectivity program and obtain the API access assigned for that use case.",
          "Implement only the capabilities Hostelworld approves for the connection; do not assume public affiliate/partner endpoints provide full supply connectivity.",
          "Complete provider testing/onboarding before enabling the Connect action for properties."
        ],
        officialLinks: [
          { label: "Hostelworld Property Manager", url: "https://business.hostelworld.com/en/createaccount" },
          { label: "Hostelworld Partner API reference", url: "https://hpa-partner-api.hostelworld.com/" }
        ]
      }),
      externalProvider({
        id: "expedia-group",
        name: "Expedia Group (Expedia, Hotels.com, Vrbo, Orbitz, Travelocity)",
        description: "Prepared integration slot for Expedia Group lodging connectivity across supported Expedia Group points of sale.",
        note: "Expedia Group currently routes lodging supply connectivity through approved connectivity providers rather than direct API builds by individual properties. Brand/capability availability depends on the connector and Expedia program.",
        propertySteps: [
          "Keep the property active with the relevant Expedia Group lodging brands.",
          "Once this product is an approved Expedia Group connectivity provider, select/authorize it for the property.",
          "Map the Expedia property, room/unit types and rate plans to the matching inventory in this system.",
          "Test reservation lifecycle events and any enabled rates/availability functions before live activation."
        ],
        platformSteps: [
          "The software operator must apply through Expedia Group's Connectivity Hub; individual properties cannot directly build to the lodging supply APIs.",
          "Complete the required commercial, PCI/security and connectivity onboarding steps.",
          "Develop, test and soft-launch the required lodging APIs/capabilities before enabling Connect for hotels."
        ],
        officialLinks: [
          { label: "Expedia Group Connectivity Hub", url: "https://developers.expediagroup.com/supply/lodging" },
          { label: "Expedia Group lodging API overview", url: "https://developers.expediagroup.com/supply/lodging/docs/booking_apis/reservations/getting_started/ui_guidelines/" }
        ]
      }),
      externalProvider({
        id: "trip-com",
        name: "Trip.com",
        description: "Prepared integration slot for Trip.com accommodation reservations and distribution.",
        note: "Trip.com connectivity is intended for lodging connectivity applications such as PMS, channel-manager and reservation-system providers. The connector must be onboarded and tested before properties can activate it here.",
        propertySteps: [
          "Keep the property active with Trip.com.",
          "After this product's Trip.com connector is approved and installed, authorize/connect the property using the workflow supplied by Trip.com.",
          "Map the Trip.com property, room types, rate plans and products to this system.",
          "Test booking confirmation, cancellation/modification and synchronization before going live."
        ],
        platformSteps: [
          "The software operator must contact Trip.com Connectivity with its product/company details and integration requirements.",
          "Complete Trip.com's PCI/PII, documentation and technical onboarding requirements.",
          "Integrate and test the selected Trip.com or OpenTravel APIs before enabling Connect for properties."
        ],
        officialLinks: [
          { label: "Trip.com Connectivity platform", url: "https://connect.trip.com/" }
        ]
      }),
      {
        id: "pms-api",
        name: "Other PMS / API",
        category: "pms_api",
        status: "not_connected",
        liveAtHouse: false,
        connectorInstalled: false,
        connectorStatus: "not_installed",
        connectAction: "connector_required",
        description: "Generic slot for a future PMS, channel manager or custom reservation API.",
        note: "A provider-specific adapter is required. Once installed, reservations normalize into the same canonical model.",
        connectionGuide: {
          propertySteps: [
            "Confirm the external system provides reservation access through an API, webhook, feed or approved connector.",
            "Authorize the connection and map the external property's rooms/units to the rooms in this system.",
            "Test new reservations, modifications and cancellations before enabling live synchronization."
          ],
          platformSteps: [
            "Review the provider's API/authentication and data-protection requirements.",
            "Build an adapter that converts provider reservations into canonical-reservation-v1 without changing downstream House operations.",
            "Add retry, duplicate-event protection, monitoring and a safe disconnect path before production use."
          ],
          officialLinks: []
        }
      }
    ]
  };
}
