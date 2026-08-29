# Release Notes v5.11.37

## Outcome

v5.11.37 is a narrow production correction built directly from deployed v5.11.36. It fixes five real Concierge production regressions without changing the current live Meta template mappings, Room UI, local-guide content, lost-key security, recipient routes, secrets or storage schemas.

The five corrected production behaviors are:

- stronger/direct human or housekeeper requests can now reach Su cleanly during routine service hours;
- cancelled fire history no longer traps a later unrelated staff-contact request in the urgent flow;
- **there is a stain on my bed sheet** now enters the real cleaning collector so **now** completes the request and sends one service alert;
- **French Kiss Divers** preference is honored when the guest starts with **I wanna learn diving** or asks about the provider before an existing diving collector was active;
- authorized Wi-Fi-password questions now return the approved numeric password instead of **[number removed]**.

## 1. Human contact is easier without removing the AI-first step

The first ordinary request such as **I need to talk to a human** may still ask what help is needed first.

During Tuesday–Sunday 10:30–19:30 Bangkok time, clearly stronger or explicit staff-contact wording now immediately exposes the existing routine contact routes to Su. Covered forms include:

- **I urgently need to talk to a human**;
- **I need to personally talk to them**;
- **I really need to speak to someone**;
- **please call for me**;
- **please let me call the housekeeper**;
- **can I call the housekeeper**.

The guest-facing answer is concise: **You can contact Su directly using the options below.** The existing Contact Us / Call Us actions are reused. The system still does not claim that it can place a telephone call for the guest.

Monday and closed-hours behavior is unchanged: routine Su contact actions are suppressed and Emergency Help remains available.

## 2. Fire cancellation no longer contaminates the next topic

A real production sequence produced a new urgent confirmation after the guest had already cancelled a fire alert and then simply asked **can I call the housekeeper**.

v5.11.37 makes the exact current staff-contact turn deterministic before stale fire transcript history can influence it.

At the same time, genuine dependent fire follow-ups remain protected. With recent fire context, wording such as **there is more smoke now** is treated as a fire continuation and receives the existing evacuation/Rescue/extinguisher guidance plus the deliberate House urgent-confirmation action.

No House alert is created merely from either the contact question or the fire guidance; the urgent property alert still requires deliberate confirmation.

## 3. Stained bed linen uses the deterministic cleaning workflow

The following natural forms are now recognized as cleaning/linen service requests:

- **there is a stain on my bed sheet**;
- **there is a stain on the sheet**;
- **my bed sheet has a stain**;
- **the sheets have stains**;
- **my bedding is stained**.

If the preferred time is missing, the Concierge asks only for that field. A reply such as **now** or **ASAP** continues the same workflow and creates exactly one normal service alert to Su plus both owners after successful protected delivery.

The response keeps the existing truthful timing qualification, makes no 30-minute promise and does not send the guest to a generic support handoff. Once submitted, an unrelated next question routes normally and cannot duplicate the cleaning alert.

## 4. French Kiss Divers preference is respected in the production path

**I wanna learn diving** now establishes structured diving context instead of falling back to the generic RAID/Roctopus recommendation.

If the guest then says **I wanna go with French kiss**, the existing diving context is enough to record the canonical preference **French Kiss Divers**.

A standalone **can I go with French Kiss Divers?** is also recognized deterministically as a diving/provider turn. The Concierge may state the normal House recommendation once, but it must acknowledge the guest's explicit choice and explain that the booking team can check whether that can be arranged.

The request does **not** mean French Kiss Divers is available, confirmed or booked. Normal structured booking requirements remain in force and no alert is created until every required field plus the protected international contact is complete.


## 5. Approved Wi-Fi password remains visible

A verified Room 6 production check found that **What is the Wi-Fi password?** could display the correct network name while replacing the numeric password with **[number removed]**.

The Wi-Fi fact itself was still present in approved knowledge. The failure happened when the answer passed through model-result privacy sanitization, whose telephone-number protection also matched the nine-digit Wi-Fi password.

v5.11.37 now treats Wi-Fi-password questions as authoritative approved room information after guest access has been granted. They bypass transcript-dependent model handling and return the approved `wifi` knowledge answer directly. The generic privacy sanitizer is deliberately left intact for contacts, logs and model output.

A Wi-Fi question also behaves as a safe information detour during an existing ordinary workflow: the password is answered and the pending workflow is preserved for resumption. Public/unverified access rules remain unchanged.

## Preserved behavior

- v5.11.36 deterministic snorkeling answers and model bypass;
- `EXPLORE_ENABLED=false` and approved local-guide retrieval;
- Mae Haad / Sairee guidance and Bamboo priority;
- Tuesday–Sunday 10:30–19:30 Bangkok housekeeping/routine-contact hours, Monday closed;
- protected 24/7 lost-key authorization, 500 THB request-bound fee consent, notification gate and rotation lock;
- fire/medical safety actions and deliberate urgent House confirmation;
- structured diving, fishing, snorkeling and transport booking workflows;
- luggage collection, protected contact handling and retry boundaries;
- current production Meta staff-action mappings with internal **RECEIVED / RESOLVE** commands;
- universal House Maps destination;
- mobile Room 11 `72% 100%` crop and stable mobile Concierge;
- passport retention, stay verification, Airbnb sync, owner console and Admin diagnostics;
- secrets, recipient mappings, webhook authorization and privacy boundaries.

## Meta replacements remain pending

v5.11.37 does **not** activate the newer human-friendly templates created in Meta:

- `house_service_alert_actions_v3`;
- `house_booking_alert_actions_v2`;
- `house_luggage_alert_actions_v2`;
- `house_urgent_alert_actions_v2`;
- `house_lost_key_alert_actions_v2`.

Production continues with the currently active template configuration until all five replacements are Active and a separate activation release is explicitly authorized. Their visible **Resolved** button must still map internally to the existing `RESOLVE` command.

## Validation

- Complete automated suite: **196 passed, 0 failed**.
- Five new production regression contracts cover human/Su contact, fire topic switching, stained-linen collection, French Kiss Divers preference and Wi-Fi-password visibility.
- Natural stained-linen variants and Monday routine-contact suppression are included.
- Existing v5.11.36 snorkeling, cleaning detour, booking detour, luggage, lost-key, emergency and Meta lifecycle tests remain in the complete suite.

## Production smoke test

After deployment, test these first:

1. **I need to talk to a human** → AI-first question remains.
2. **I urgently need to talk to a human** → direct Su routine contact options during open hours.
3. **can I call the housekeeper** → direct Su contact options; no alert.
4. **I have fire in my room** → fire guidance; cancel the House alert; then **can I call the housekeeper** → routine contact, not urgent flow.
5. From fire context, **there is more smoke now** → fire safety remains active.
6. **there is a stain on my bed sheet** → asks for preferred time; **now** → one service alert, no generic handoff.
7. **I wanna learn diving** → structured collector; **I wanna go with French kiss** → French Kiss Divers preference retained without availability promise.
8. Standalone **can I go with French Kiss Divers?** → preference acknowledged, no confirmation promise.
9. **What is the Wi-Fi password?** → approved numeric password is visible; no **[number removed]** placeholder, including after prior chat history.
10. Re-run the three v5.11.36 snorkeling production phrases → approved deterministic recommendations.
11. Spot-check one current Meta quick action and verified lost-key flow → unchanged.

## Rollback

This release changes no data schema, secrets, recipient mappings or live Meta template configuration. If v5.11.37 causes an unexpected regression, redeploy deployed v5.11.36. No migration is required.
