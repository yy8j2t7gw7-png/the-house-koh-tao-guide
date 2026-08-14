# The House – Koh Tao v5.11.2

## Release summary

v5.11.2 improves the essential guest journey before launch. It shortens secure verification, makes the Thai-national exemption immediately understandable in English and Thai, adds precise luggage-storage guidance, and introduces fact-checked room guidance for conserving Koh Tao's limited resources.

## Guest-facing changes

- The secure verification journey is shorter and more action-led while retaining every essential requirement.
- The Thai-only exemption is shown in English and Thai on the default English page. Fixed Thai helper lines are hidden when the full interface is already Thai, preventing duplication.
- Foreign and mixed groups are still told that a passport is required for every non-Thai adult and child staying overnight.
- Guests may still choose a private single-use upload or present every required original passport to The House in person.
- The page still explains the TM30 purpose, private handling and 14-day maximum image-retention rule.
- Luggage guidance now states the available office and Bamboo Beach Bar windows and clearly says that storage before 11:00 AM is not currently available.
- The verified room summary now politely asks guests to conserve fresh water and electricity and to switch off air conditioning and lights when leaving.
- The conditional 1,000 THB toilet-clearance fee remains bold but appears naturally within the normal rule text.

## Concierge and language coverage

- Added approved deterministic answers for luggage storage and island resource conservation.
- Added reviewed guest-facing translations in English, Thai, Simplified Chinese, Russian, German, French and Spanish.
- The fixed Thai exemption remains visible beside English on the default page and is excluded from automatic retranslation.

## Production steps after push

1. Deploy v5.11.2 through the existing GitHub and Cloudflare workflow.
2. Open a permanent room link in English and confirm the Thai-only choice displays both English and Thai.
3. Switch the page to Thai and confirm the helper lines are not duplicated.
4. Test a non-sensitive all-Thai registration and a foreign or mixed registration with more than one guest.
5. Confirm the room and Departure pages show the luggage guidance and conservation notice correctly on desktop and mobile.

## Validation

- All 52 automated tests pass.
- The suite covers bilingual Thai-exemption presentation, seven-language operational copy, luggage windows, resource-conservation facts, concise verification, canonical page parity and secure registration safeguards.
- JavaScript syntax, JSON parsing, bundled Worker output, release metadata and archive contents are checked before delivery.
