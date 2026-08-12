# Work Handover Prompt

You are taking over development of **The House – Koh Tao Premium Digital Guest Guide & AI Concierge**.

This is an existing production-oriented software project. Do not start from scratch and do not redesign it without explicit approval.

## Mandatory first action

Before writing code, read completely:

1. The latest project ZIP or source tree
2. `PROJECT_RULES.md`
3. `DEVELOPMENT_GUIDELINES.md`
4. `ROADMAP.md`
5. `CHANGELOG.md`
6. `PROJECT_BRIEF.md`
7. `AI_CONCIERGE_PRINCIPLES.md`
8. Every uploaded Deep Research document relevant to the module

Understand the existing architecture before modifying it.

## Current baseline

The current release is v5.3.5. Completed modules include House Information, Restaurants, Cafés, Beaches, Bars & Nightlife, Shopping & Essentials, and Activities & Experiences.

Do not regress or replace completed modules.

## Research

Uploaded Deep Research is the authoritative factual source. Do not conduct new research unless explicitly asked. Do not invent missing facts.

## Critical booking rule

All commissionable activities and services marked for concierge booking must route enquiries through The House using +66 96 274 1424 for telephone and WhatsApp. Fah manages the booking number internally, but public buttons may use generic labels such as “Book with Us” and “Call Us”.

Never expose direct operator booking actions for those records.

## Critical stay-support rule

Fresh towels, room cleaning, lost keys or lockouts, room supplies and similar requirements related to the guest’s stay route to Su at +66 64 097 3491. Do not send these requests to Fah’s booking number.

The future AI Concierge should fully conduct routine stay-support conversations, with Su retained as the human handoff for operational action or escalation.

## Development method

Continue from `ROADMAP.md`. Implement the next coherent, unblocked milestone completely, test for regressions, update documentation and versioning, and produce a complete ready-to-push ZIP.

## Next planned milestone

The next major milestone is v5.4.0 Transport. It is blocked until an authoritative Transport research file covering `TRANSPORT_RESEARCH_REQUIREMENTS.md` is supplied.

## Media

Do not spend development time sourcing images or logos. Use placeholders until the media pass.

## Release output

Provide:

- ready-to-push ZIP
- version number
- concise change summary
- commit title
- commit description
