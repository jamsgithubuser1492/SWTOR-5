# Star Wars RPG — Build Roadmap

Read `CHANGELOG.md` first to understand what already exists. This document describes what to build next, in priority order, with the entry conditions each phase requires.

---

## Priority 1: Phase 9B — Short-Term Engagement Wins

**Entry condition:** None. Can be built now.  
**Agent:** Systems Architect (React state wiring) + Holonet Archivist (NPC text variants)  
**File location:** `star-wars-rpg.jsx`

### 9B-1. NPC Repeat Variant Rotation

NPCs currently show the same `repeatPrompt` on every repeat visit. Add an optional `repeatVariants` array to NPC definitions. When present, cycle through variants instead of repeating one line.

```js
// In the NPC interaction keydown handler, where repeatPrompt is selected:
const repeatIdx = completedInteractions.size % (resolvedNpc.repeatVariants?.length || 1);
const repeatText = resolvedNpc.repeatVariants?.[repeatIdx] ?? resolvedNpc.repeatPrompt;
```

Apply first to: Marlo Phase 2, Vane all phases, Oska (promenade vendor), Korvin (bith broker).  
Archivist writes 3 variants per NPC.

### 9B-2. Action Log Grant Highlighting

Items and codex unlocks currently appear in the action log as plain text. Prefix item grants with `[ACQUIRED: Name]` in gold (`#E8C97A`) and codex unlocks with `[CODEX: Title]` in cyan. This requires passing a `type` field to `pushActionLog` or detecting it in the renderer.

### 9B-3. Alignment-Reactive NPC Choices

When `alignment.morality > 50` or `alignment.morality < -50`, certain NPCs offer one additional dialogue choice that reflects the player's known reputation. Gate via `alignment.morality` check in the dialogue overlay renderer (not via questFlags).

Affected NPCs:
- Vane (high morality): "You have a reputation forming, Auxiliary."
- Marlo (low morality): "Word gets around. You have made some interesting choices."

---

## Priority 2: Phase 9C — Medium-Term Engagement Systems

**Entry condition:** 9B complete.  
**Agent:** Systems Architect + Holonet Archivist  

### 9C-1. Inventory-Reactive NPC Prompts

Specific items in the player's inventory should alter NPC prompt text when present. This is NOT a gate (gate = `requires.item`). It is a flavour change — the NPC notices what the player is carrying.

Implementation: in `resolveDialoguePhase`, before returning the resolved NPC, check for an optional `inventoryReactive` array on the NPC definition:
```js
// npc.inventoryReactive: [{ item: 'csf_patrol_armor', promptSuffix: 'You are wearing CSF armor. I see.' }]
```
Append suffix to prompt when item is in inventory.

First applications:
- Marlo Phase 1: notices `csf_patrol_armor` ("You are wearing CSF armor. I see.")
- Vane Phase 0: notices `stolen_manifest` before the player presents it ("You are carrying something. Paperwork, perhaps?")

### 9C-2. Credit Economy Tension

Currently credits accumulate with no meaningful spend. Add small credit costs to 2-3 dialogue choices per zone.

Korvin (bith broker, sky_market) already charges 30cr for Bay 14 intel — that is the prototype pattern. Extend to:
- Marlo Phase 0: offer a 100cr shortcut to his "Jon vouches" trust level as an alternative to having the jon-introduction flag
- Corin (freight_hub): 200cr for Navy relay access (already in plan, confirm it deducts credits via `grants: { credits: -200 }`)

Implement credit deduction: `resolveChoice` already handles `choice.grants.credits` additively. Negative values deduct. Confirm the HUD credit display handles negative grants without going below zero.

### 9C-3. Collectible Rarity Tiers

Add a `rarity` field to collectibles: `common` (cyan icon, 20-80cr), `rare` (gold icon, 150-400cr), `quest` (pulsing white icon, grants flag or codex on collection).

The `works_syndicate_token` should become `quest` rarity and grant the Iron Syndicate codex on pickup.

The collectible renderer in the game panel currently shows a static icon. Update it to vary color/pulse based on `rarity` field.

---

## Priority 3: Phase 9D — Exploration Reward Pass

**Entry condition:** 9B complete.  
**Agent:** Holonet Archivist (world object text) + Systems Architect (discovery flag logic)

### 9D-1. Discovery Flags

When the player finds 5 or more world objects in a single zone, grant a `[zoneId]_explored` flag automatically. Use a `useEffect` watching `questFlags` and `completedInteractions`. When the flag is granted, a bonus dialogue choice unlocks with that zone's key NPC.

Zones to apply first: `sky_market`, `freight_hub`, `the_works`.

### 9D-2. Additional `worldStateVariant` Applications

The `skyline_vista` in sky_market already uses `worldStateVariant`. Extend to:
- `undercity_radio_terminal` (freight_hub): lawful variant adds "three to one the new badge actually stays clean"; underworld variant has the host already know the player's broker contact by name
- `holonet_official_terminal` (the_works): lawful variant mentions Vane by commendation name; underworld variant adds a line about the player's broker activities

---

## Priority 4: Phase 8F — Senate District Full Narrative

**Entry condition:** `senate_line_timer_active` flag system working (from Phase 8E); `evidence_submitted` and `committee_convened` flags defined.  
**Agent:** Cartographer (zone layout) + Holonet Archivist (NPC dialogue) + Systems Architect (world object grant chains)

The `senate_district` zone is currently a placeholder (open floor, one airtaxi terminal). Replace with:

**Layout upgrades:**
- Senate Committee Chamber: cols 16-36, rows 4-18 (walled, interior floor)
- Executive Suite: cols 30-42, rows 2-12 (walled, interior floor)
- Public Rotunda: open floor cols 1-15, rows 1-30
- Penthouse Balcony: cols 36-42, rows 20-30

**New NPCs:**
- `senator_vane_k` (crime_boss kind, x:34,y:8) — the antagonist Senator Corvin Vane
- `senate_committee_aide` (mechanic kind, x:18,y:10) — nervous aide who can convene the committee

**New world objects:**
- `senate_evidence_terminal` (x:20,y:12, requiresItem: `senate_conspiracy_file`, grantsFlag: `evidence_submitted`)
- `vane_office_datacore` (x:38,y:6, requiresItem: `forensic_slicing_suite`, grantsFlag: `datacore_cracked`, grantsItem: `decrypted_senate_audio`)

**Ending D trigger:** `senate_honor_ceremony` world object in csf_academy already exists. Add Ending D: "The Record" — triggers when `evidence_submitted AND committee_convened AND NOT bypass_committee`.

See plan file section "Phase 8F" for full NPC dialogue content.

---

## Priority 5: Phase 8E — The Works Safehouse Siege

**Entry condition:** `sector4_raid_complete` flag set (from Phase 8D / Mission 2 in freight_hub).  
**Agent:** Holonet Archivist + Cartographer

Add to `the_works` zone, revealed progressively when `sector4_raid_complete` is set:

- `syndicate_courtyard_shield` (x:16,y:4, requiresFlag: `sector4_raid_complete`, grantsFlag: `shield_breached`)
- `syndicate_smelter_core` (x:22,y:4, requiresFlag: `shield_breached`, grantsFlag: `smelter_reached`)
- `voss_command_hub` (x:24,y:8, requiresFlag: `smelter_reached`)

Senate transit bomb sequence (three world objects in sequence, each requiring the prior's flag):
- `senate_transit_terminal` (grantsFlag: `senate_line_reached`)
- `bomb_trip_wire` (requiresItem: `forensic_slicing_suite`, grantsFlag: `bomb_wire_cut`)
- `repulsor_coupling` (requiresItem: `tool_hydrospanner` or `calibrated_hydrospanner`, grantsFlag: `bomb_jettisoned`)

When `bomb_wire_cut AND bomb_jettisoned` are both set: grant `senate_line_secured` flag via useEffect.

---

## Priority 6: Phase 8D — Staging Yard Sting (freight_hub Mission 2)

**Entry condition:** `csf_training_complete` flag set (from csf_academy three training modules).  
**Agent:** Holonet Archivist + Systems Architect (flag-conditional NPC spawning)

Add to `freight_hub`:
- `vane_freight` NPC (x:30,y:6, kind: `republic_guard`) — appears when `csf_training_complete` is set; raid briefing dialogue with three route choices
- `jaxxon_v` NPC (x:20,y:8, kind: `crime_boss`) — appears when `freight_hub_investigated AND csf_training_complete` are both set; the raid commander confrontation with three resolution choices

Jon confrontation in `market` zone: when `csf_briefed` is set and `jon_confrontation_done` is NOT set, Jon's dialogue changes to the confrontation scene. Implement as a phase on the existing `jon` NPC using the phase system.

Flag-conditional NPC spawning: add `requiresAllFlags` array to NPC definitions. In zone NPC filtering, exclude NPCs where any required flag is not set.

---

## Priority 7: Phase 9C-3 Senate Timer

**Entry condition:** `senate_line_timer_active` flag and the bomb sequence world objects from Phase 8E.  
**Agent:** Systems Architect

When `senate_line_timer_active` is set, display a countdown in the HUD ("Senate transit departs in: [N] actions"). Each player keypress (movement or interaction) decrements the counter. If it reaches zero before `senate_line_secured` is set, trigger narrative failure state. This is a pure React state addition — no new components needed.

---

## Technical Debt and Ongoing Maintenance

These items are not phases — they are housekeeping that should be applied whenever touching the relevant code:

**NPC label de-duplication:** Two NPCs share the display name "Kaelen." `kaelen_freight` should display as `'Kaelen "Breaker" Voss'`. `kaelen_twi` should display as `'"The Ghost" Kaelen'`. IDs stay unchanged (safe for flag compatibility).

**Phase priority invariant:** Phases with `requiresAllFlags: []` (always-available entry phases) must always be at index 0 in the `phases` array. More specific phases (more flags required) go last. Document this in any NPC definition that uses the phases system.

**Valve chain event:** The `useEffect` watching `valve_a_closed AND valve_b_closed AND valve_c_closed` grants `thermal_leak_resolved` and the `thermal_vest` item. This pattern is the standard for any multi-flag combination trigger. Future chain events follow this same pattern.

**Jaxxon-V and Dax NPC spawning:** Both use the `requiresFlag` (or `requiresAllFlags`) mechanism on the NPC definition. `dax_shipping.requiresFlag = 'dax_named'`. `jaxxon_v.requiresAllFlags = ['freight_hub_investigated', 'csf_training_complete']`.

---

## What NOT to Build in This Pass

Do not attempt the following without a dedicated architectural session:

- Real-time combat system
- Inventory drag and drop
- Training module mini-games (use narrative world object stubs instead)
- Sound effects (no audio infrastructure exists)
- Additional planets beyond Ferrowake and Verdanth (existing zones need content depth first)

---

## Agent Assignment Guide

| Phase | Primary Agent | Secondary Agent |
|---|---|---|
| 9B repeat variants, log highlights | Systems Architect | Holonet Archivist (variant text) |
| 9B alignment-reactive choices | Holonet Archivist | Systems Architect (gate logic) |
| 9C inventory-reactive prompts | Holonet Archivist | Systems Architect (field wiring) |
| 9C credit economy | Holonet Archivist | — |
| 9D discovery flags | Systems Architect | — |
| 9D worldStateVariant text | Holonet Archivist | — |
| 8D raid NPCs and Jon confrontation | Holonet Archivist | Systems Architect (phase wiring) |
| 8E Works siege world objects | Cartographer | Holonet Archivist |
| 8F Senate district layout | Cartographer | Holonet Archivist |
| 8F Senator NPC and aide | Holonet Archivist | State Logic Validator |
| Senate timer HUD | Systems Architect | — |
| NPC label de-duplication | Protocol Droid | — |
