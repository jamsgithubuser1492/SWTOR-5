# Star Wars RPG — Agent Changelog

**File:** `star-wars-rpg.jsx` · **Current size:** ~2600 lines  
**Live:** https://jamsgithubuser1492.github.io/SWTOR-5/

---

## Quick-Reference: What Exists Right Now

### Planets and Zones

| Planet | Zone ID | Status | Notes |
|---|---|---|---|
| coruscant | spaceport | Full | Opening chapter, Jon intro |
| coruscant | market | Full | Jon shop, opening arc hub |
| coruscant | apartments | Full | Player home base |
| coruscant | plaza | Full | Sub-surface public space |
| coruscant | commercial | Full | Shopping district |
| coruscant | jons_apt_int | Full | Jon interior apartment |
| coruscant | sky_market | Full | L.1450 hub, Marlo + Vane phased NPCs |
| coruscant | freight_hub | Full | L.088 Sector 4, Jax + Kaelen + Corin |
| coruscant | the_works | Full | L.005 undercity, Vex + 7-N4 + Sula + Marla |
| coruscant | csf_academy | Full | L.1222 Republic training hub |
| coruscant | lower_sky_market | Full | L.1100 gang territory, Marlo + Rook |
| coruscant | senate_district | Placeholder | Floor only, one airtaxi terminal |
| ferrowake | outer_foundry | Full | Separate planet, independent arc |
| verdanth | sunken_temples | Full | Separate planet, independent arc |

### Constants (do not rebuild these)

**`ITEMS`** (line ~1494) — 30 item definitions including:
`comlink`, `field_rations`, `stolen_manifest`, `scrambler_keycard`, `encrypted_shard`, `forged_clearance`, `buyers_id`, `csf_aux_pass`, `tool_hydrospanner`, `item_transit_pass`, `item_spice_vial`, `item_blaster_parts`, `item_code_cylinder`, `item_brandy`, `csf_patrol_armor`, `republic_badge`, `senate_honor_cross`, `surface_clearance`, `csf_aux_badge`, `forensic_slicing_suite`, `emp_grenade`, `level_088_transit_pass`, `encrypted_gang_holo_log`, `senate_conspiracy_file`, `csf_stun_carbine`, `level_005_keycard`, `thermal_vest`, `calibrated_hydrospanner`, `decrypted_senate_audio`, `master_senate_transit_drive`

**`CODEX_ENTRIES`** (line ~1527) — 9 entries:
`codex-jon-network`, `codex-docking-bay-14`, `codex-phrik-alloy`, `codex-iron-syndicate`, `codex-csf-protocol`, `codex-csf-chain-of-custody`, `codex-sector-4-freight-corridors`, `codex-coruscant-undercity-strata`, `codex-the-works-forges`

**`SPEEDER_DESTINATIONS`** (line ~1606) — 8 destinations:
`spaceport`, `market`, `sky_market` (25cr, flag: `speeder_transit_unlocked`), `freight_hub` (50cr, flag: `speeder_transit_unlocked`), `the_works` (75cr, flag: `speeder_transit_unlocked`), `csf_academy` (0cr, flag: `republic_path_open`), `lower_sky_market` (0cr, flag: `marlo_sky_talked`), `senate_district` (100cr, flag: `rook_eliminated`)

### Systems and Functions

| System | Location | What it does |
|---|---|---|
| `resolveDialoguePhase(npc, questFlags)` | Before StarWarsRPG | Evaluates NPC `phases` array; last matching phase wins; returns merged NPC with `_activePhaseId` |
| `isNpcVisible(npc, questFlags)` | Before StarWarsRPG | Returns false if any `hideAfterFlags` flag is set, or if `requiresFlag` is not set; used in all 4 NPC processing sites |
| `ZONE_ARCHETYPE_PROFILES` | Before StarWarsRPG | Six ready-made visual profiles (`exterior`, `interior_cantina`, `interior_slicer`, `interior_csf`, `interior_warehouse`, `interior_generic`); Cartographer copies from here instead of inventing values |
| `completedInteractions` | State | Uses `npc.id + ':' + phaseId` as key so each phase is a fresh first encounter |
| `questFlags` | State | All story flags; set via `setFlag(flag)` helper |
| `worldState` | useMemo | Derives `'lawful'` / `'underworld'` / `'neutral'` from flag counts |
| `currentObjective` | useMemo | Returns highest relevant objective string based on questFlags |
| `suspicionMeter` | State (0-100) | Deception risk; amber above 0, red above 60; shown in HUD |
| `choiceFeedback` | State | Transient morality/loyalty delta string; auto-clears after 2.8 seconds |
| `worldStateVariant` | World object field | `worldObjHere.worldStateVariant?.[worldState] ?? worldObjHere.description` |
| `addItem(itemDef)` | Callback | Adds to inventory; stacks qty if item already present |
| `unlockCodex(entry)` | Callback | Adds codex entry; marks as unread; deduplicates |
| `grantsItem` | World object field | Grants item on first interaction (once-guarded) |
| `grantsCodex` | World object field | Unlocks codex entry on interaction |
| `grantsFlag` | World object field | Sets quest flag on interaction |
| `requiresFlag` | NPC field | NPC only spawns when flag is set |
| `hideAfterFlags` | NPC field | NPC becomes invisible once any listed flag is set |
| `SignalSiphonOverlay` | Component | Hacking puzzle mini-game; triggered by world objects with `triggersOverlay: 'signal_siphon'` |
| `SpeederPursuitOverlay` | Component | Chase sequence mini-game; triggered by world objects with `triggersOverlay: 'speeder_pursuit'` |
| `ValveOverrideOverlay` | Component | Timed valve control mini-game; triggered by world objects with `triggersOverlay: 'valve_override'` |

### NPC Kinds (registered in `NpcPortrait()`)

`jedi`, `broker`, `warden`, `republic_guard`, `droid`, `smuggler`, `bith`, `swoop_gang`, `cantina_owner`, `crime_boss`, `mechanic`, `slicer`

Any kind not on this list renders nothing. New kinds require a Systems Architect SVG branch in `NpcPortrait()`.

### Valid Tile Types

`wall`, `floor`, `door`, `ship_hull`, `ship_ramp`, `lava`, `water`

### AirTaxi Terminal Convention

World objects whose `id.startsWith('airtaxi_')` trigger the `SpeederOverlay` when interacted with. All six story Coruscant zones have a working airtaxi terminal on a reachable floor tile. The player needs `speeder_transit_unlocked` to use mid-level destinations (set by Jon's dialogue in the `market` zone).

---

## Session History (newest first)

### Session 9 — Environmental Visual Grammar
**Commit:** `527b999`

Added the `ZONE_ARCHETYPE_PROFILES` constant (before `StarWarsRPG()`, after `CODEX_ENTRIES`), providing six ready-made visual profiles that the Cartographer copies rather than inventing values from scratch.

New `DecorIcon` kinds: `cable_bundle`, `scan_arch`, `warning_beacon`, `hazard_stripe`.

New `AmbientLayer` modes: `neon_haze` (slow magenta blobs for cantinas), `datastream` (vertical cyan scan lines for slicer dens), `steam` (rising white wisps for industrial zones). CSS keyframes for `drift`, `rise`, and `scanDown` added to the existing `<style>` block.

Door threshold light bar: a 3px accent-colored `div` added at the top of every door tile in the viewport renderer.

`decorFor(zone, x, y, map)`: optional fourth `map` argument enables `hazard_stripe` placement on floor tiles adjacent to `lava` or `water` tiles. Both call sites in the viewport floor renderer updated to pass `map`.

All 9 Coruscant zones updated to match their archetype assignments: `spaceport`, `market`, `sky_market` as exterior; `jons_apt_int` as interior_generic; `freight_hub`, `the_works` as interior_warehouse; `csf_academy`, `senate_district` as interior_csf; `lower_sky_market` as interior_cantina.

---

### Session 8 — Jon as Primary Character Arc
**Commit:** `0a94526`

Added `isNpcVisible(npc, questFlags)` helper before `StarWarsRPG()`. Checks `npc.hideAfterFlags` (array of flags; NPC hides if any are set) and `npc.requiresFlag` (NPC shows only when flag is set). Applied at all four NPC processing sites: movement tick, keydown find, viewport render find, and minimap map.

Jon removed from the spaceport after `met_jon_spaceport` is set (`hideAfterFlags: ['met_jon_spaceport']`).

7-phase Jon apartment dialogue tree added to `jons_apt_int`: Phase 0 (mission briefing), Phase 1 (Bay 14 direction), Phase 2 (Bay 14 debrief), Phase 3 (sky-market debrief, path-sensitive), Phase 4 (CSF badge confrontation), Phase 5 (post-confrontation resolution), Phase 6 (post-raid endgame reveal), Phase 7 (final resolution). All phases gate via `requiresAllFlags` and `requiresNoneFlags`.

Four story milestone objectives added to the `currentObjective` useMemo chain.

New codex entry: `codex-jon-backstory` (unlocks during Phase 6 debrief).

Two ambient world objects added to `jons_apt_int`: `bay14_analysis_board` (x:8, y:4) and `faction_tension_chart` (x:3, y:6).

---

### Session 7 — Three Mini-Game Overlays
**Commit:** `9fb4440`

Built three overlay mini-game components, each wired to the existing world object `triggersOverlay` pattern:

- **`SignalSiphonOverlay`**: hacking puzzle triggered by world objects with `triggersOverlay: 'signal_siphon'`. Player intercepts a data stream by matching frequency nodes.
- **`SpeederPursuitOverlay`**: chase sequence triggered by world objects with `triggersOverlay: 'speeder_pursuit'`. Player navigates a lane-based speeder chase.
- **`ValveOverrideOverlay`**: timed valve control triggered by world objects with `triggersOverlay: 'valve_override'`. Player sequences three valve toggles against a pressure timer.

Each overlay sets a quest flag on completion and clears itself via the existing overlay dismissal pattern. All three are wired to existing quest flags and world object triggers in the relevant zones.

---

### Session 6 — Zone Interconnectivity Fix
**Commit:** `9a9d61d`

Fixed four airtaxi terminal accessibility bugs that prevented the player from leaving certain zones:

- **sky_market**: Airtaxi alcove at x:35,y:20 was fully walled off. Added floor tile at x:34,y:20 to open the corridor.
- **lower_sky_market**: Airtaxi at x:36,y:13 was inside the Rook safehouse wall carve. Moved to x:20,y:24 on the open promenade.
- **csf_academy**: No airtaxi terminal existed. Added `airtaxi_csf_academy` at x:38,y:22.
- **senate_district**: `worldObjects` array was empty. Added `airtaxi_senate_district` at x:40,y:28.

---

### Session 5 — Sky-Market Immersion Pass
**Commit:** `9246846`

Added four HUD overlay systems to `star-wars-rpg.jsx`:

- **`choiceFeedback` flash**: After any dialogue choice with a morality or loyalty delta, a banner displays the delta string for 2.8 seconds above the game panel.
- **`suspicionMeter` bar**: Amber HUD bar in the navigation panel. Turns red above 60. Increments when `deceiver_path` (+25), `vane_suspicious_raised` (+20), or `jaxxon_deal` (+30) flags are granted.
- **`currentObjective` panel**: Reads the highest active story objective from questFlags and displays it next to the action log. Also shows the current `worldState` value.
- **`worldStateVariant` support**: World objects can now carry a `worldStateVariant: { lawful: '...', underworld: '...' }` field. The handler selects the variant text based on `worldState`.

Three new sky_market ambient NPCs added:
- `bith_rumor_broker` (Korvin, x:8,y:5, kind:bith, mobile:true) — info broker, pay-for-intel model
- `lounge_patron` (Sevra, x:4,y:7, kind:cantina_owner) — socialite with cargo gossip
- `senate_aide_promenade` (Parvus, x:22,y:13, kind:mechanic, mobile:true) — nervous Senate aide, sets `vane_ambiguous_hinted`

Five new sky_market world objects:
- `skyline_vista` (x:19,y:1) with `worldStateVariant` text per alignment
- `holonet_kiosk` (x:14,y:14) — HNN false narrative
- `lounge_corner_conversation` (x:7,y:9, once:true) — sets `corner_deal_witnessed`
- `promenade_patrol_log` (x:24,y:18) — CSF patrol reduction notice
- `bith_exchange` (x:8,y:4, once:true) — sets `bith_exchange_done`

Phase 9 gameplay mechanics optimization scope written into plan file.

---

### Session 4 — Phased Dialogue System and Sky-Market Expansion
**Commits:** `1fb1481`, `e8e36a9`

Built `resolveDialoguePhase(npc, questFlags)` before the `StarWarsRPG` function. Phase logic: phases evaluated in order, last matching phase wins. Phase matching uses `requiresAllFlags`, `requiresAnyFlag`, `requiresNoneFlags`.

Updated `completedInteractions` to use phase-aware key: `npc.id + ':' + activePhaseId`.

Replaced flat `marlo_sky` and `vane_sky` NPC definitions with three-phase phased versions (see plan for full dialogue content).

Added Jon comlink world object to sky_market at x:5,y:13 (once:true).

Added Aurebesh Lounge environmental objects: `lounge_bar_terminal`, `lounge_private_booth` (sets `syndicate_watchers_seen`, grants Iron Syndicate codex), `lounge_datapad` (sets `credit_trail_found`).

Added CSF Precinct environmental objects: `precinct_evidence_locker`, `precinct_comms_station`, `precinct_wanted_board`.

New quest flags from this session: `marlo_sky_intro`, `marlo_rook_hinted`, `marlo_terms_known`, `works_briefed_by_marlo`, `vane_sky_intro`, `vane_negotiation_started`, `vane_procedure_explained`, `vane_backup_revealed`, `syndicate_watchers_seen`, `credit_trail_found`.

---

### Session 3 — Inventory, Codex, Story Zones, Republic Arc
**Commit:** `f515c70`

Built Phase 1 (Inventory and Codex):
- Replaced string inventory with structured `{ id, name, type, iconKind, qty, value, description }` objects
- Added `InventoryOverlay` component (I hotkey, story slots concept)
- Added `CodexOverlay` component (C hotkey, category tabs, unread badge)
- Added `ITEMS` constant (30 items) and `CODEX_ENTRIES` constant (9 entries)
- Added `addItem` and `unlockCodex` callbacks
- Extended `resolveChoice` grants block to handle items and codex

Built Phase 2 (Story Zone Expansion):
- Replaced placeholder hub zones with `sky_market`, `freight_hub`, `the_works`
- Each zone has full buildMap, NPC array, worldObjects array, collectibles array

Built Phase 3 (Republic Arc):
- Added `csf_academy` zone with Vane, Sergeant Torren, Voren, Kaelen informant, Medic Daya
- Added training module world objects (module_a_terminal, module_b_terminal, holding_block_b)
- Added `lower_sky_market` zone with phased Marlo and Rook

Built Phase 3 Extended (Full Campaign):
- Full freight_hub NPC roster: Jax, Kaelen "Breaker" Voss, Corin, Dax (flag-gated)
- Full the_works NPC roster: Vex, 7-N4, Sula, Kaelen "The Ghost", Marla
- Rianna captive / sub-level extraction side quest
- Campaign endings A (Shield of Coruscant), B (Shadow Agent), C (Duty's Sacrifice)
- Plasma valve chain event via `useEffect` watching valve flags
- All new quest flags from campaign arc (see plan for full list)

Built Phase 5 (Dialogue Requires System):
- `meetsRequires(choice)` checks `choice.requires.item` against inventory and `choice.requires.flag` against questFlags
- Choices that fail requirements render dimmed with "(requires [item name])" appended

---

### Session 2 — Living World Pass
**Commit:** `27d2b21`

- NPC movement tick (1.5 second interval, mobile NPCs drift on floor tiles)
- `posRef` for smooth position tracking
- Minimap quest markers (gold dot on questNpc-flagged NPCs not yet completed)
- Repeatable service NPCs (Oska in sky_market)

---

### Session 1 — Opening Chapter
**Commit:** `2a58323`

- Jon partner NPC with full dialogue tree in `market` zone
- `SpeederOverlay` component with `SPEEDER_DESTINATIONS` array
- AirTaxi droid flow (`triggersOverlay: 'speeder'`)
- Three placeholder hub zones (later replaced)
- 11 NPC portrait SVGs in `NpcPortrait()` component

---

### Session 0 — Agent System Foundation
**Commits:** `95e55c7` through `a68575b`

- `CLAUDE.md` with Game Director instructions and agent pipeline
- 7 agent files in `.claude/agents/`
- 3 schemas in `.claude/schemas/` (zone, dialogue, quest)
