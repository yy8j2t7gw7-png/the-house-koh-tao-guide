# Transport Deep Research Requirements

## Purpose

This specification defines the authoritative research required before the deferred Transport milestone can be implemented. It is a content requirement, not a source of Transport facts. Transport was moved behind the operational concierge priority in v5.4.0.

## Required coverage

### Ferries

- Operators serving Koh Tao
- Routes and connection points
- Official booking and timetable sources
- Pier names and locations
- Check-in requirements and recommended arrival time
- Luggage, bicycle, pet and accessibility rules where published
- Weather cancellation and change procedures
- Night-ferry options and practical limitations
- Island arrival and departure steps
- Same-day onward-connection cautions

### Airports and flights

- Relevant airports for Koh Tao journeys
- Practical surface-transfer connection for each airport
- Typical connection logic without hard-coding unverified schedules
- Minimum sensible connection buffers
- Late-arrival and missed-ferry implications
- Official airline, airport and transfer sources

### Taxis and local transfers

- How Koh Tao taxis operate
- Verified fare guidance or a clear statement when fares are negotiable
- Availability by area and time
- Shared versus private arrangements
- Luggage and group considerations
- Accessibility limitations
- Safe pickup and return planning

### Private transfers

- Verified service types and coverage
- Vehicle and passenger capacity
- Pickup areas
- Booking lead time
- Current price basis where verified
- Cancellation and delay handling
- The House booking route, where applicable

### Scooter rental

- Verified rental providers suitable for guests
- Vehicle types and licensing requirements
- Deposit and passport policies
- Insurance scope and exclusions
- Damage inspection and evidence procedure
- Helmet provision
- Current price basis and rental period
- Delivery and pickup
- Breakdown and accident procedure
- The House booking route, where applicable

### Road safety

- Licence and legal requirements
- Helmet requirements
- High-risk road types and conditions
- Wet-weather and night-riding guidance
- Passenger and luggage considerations
- What to do after a crash
- When a taxi is the safer recommendation

### Parking

- General island parking conventions
- Restricted or risky areas
- Ferry-pier and beach parking considerations
- Property-specific parking facts if applicable

### Fuel

- Verified fuel stations and locations
- Operating hours where official or recently verified
- Fuel types relevant to rental scooters
- Safe refuelling guidance
- Cash and card expectations
- Emergency alternatives, clearly distinguished from preferred options

## Required fields per operator or service

- stable name and ID
- service category
- concise factual description
- areas and routes served
- operating hours or schedule source
- price or fare basis
- booking lead time
- cancellation and change policy
- luggage and capacity
- child suitability
- accessibility
- payment methods
- phone, website, social and map links for internal verification
- booking policy and House-arranged booking status
- safety notes
- last verified date
- primary official sources
- uncertainty or unresolved fields
- AI summary and keywords

## Verification standard

- Prefer official operator, airport, airline, government and port sources.
- Cross-check volatile information with a recent reputable local source where appropriate.
- Record the verification date for every operator or service.
- Do not present inferred or approximate values as confirmed facts.
- Flag conflicts and missing data explicitly.
- Keep operator contacts internally even when public booking must route through The House.

## Booking routing requirement

Every transport or rental record must identify whether it uses `the-house-concierge`. Public booking calls and messages for those records must route to +66 96 274 1424. Generic public labels such as “Book with Us” and “Call Us” are approved.

## Delivery format

Provide the research as a complete Markdown, DOCX or PDF document with a source list and verification dates. Structured JSON may be included, but it does not replace the human-readable research report.
