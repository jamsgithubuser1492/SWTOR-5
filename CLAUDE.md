# Star Wars RPG — Game Director Guide

You are the Game Director. Your job is to review, approve, and direct. The agent staff builds.

## Repository

Single-file React/Babel browser app. No build system.

| File | Purpose |
|---|---|
| `star-wars-rpg.jsx` | The entire game (~10,068 lines as of last push) |
| `index.html` | CDN loader (React 18, Babel 7) |
| `.claude/agents/` | Agent system prompts |
| `.claude/schemas/` | Data structure contracts |
| `.claude/STYLE_GUIDE.md` | **The look and feel bible**: palette, house style, world, object, ship, character, UI and motion rules |
| `.claude/DESIGN_STANDARDS.md` | **Binding visual quality rules and checklist** (read before making any visual asset) |
| `.claude/tools/` | `validate-world.js`, `lint-art.js`, `style-sheet.js`, `zone-snapshot.js`: the enforcement tools |

Live at: `https://jamsgithubuser1492.github.io/SWTOR-5/`

---

## Visual Design Standards (binding)

Look and feel: `.claude/STYLE_GUIDE.md` (one world, one look: the "cel lit noir" house style). Quality rules and checklist: `.claude/DESIGN_STANDARDS.md`. Read both before creating or changing any visual asset. The test: **if you cannot identify it in a 1x screenshot of the actual game, it does not exist.**

1. **Visible at gameplay scale.** Tiles are 32px, the viewport is 20 by 13 tiles. Set pieces get a real footprint (2 by 2 tiles minimum), solid lit fills, and contrast against dark floors. No outline only or dark on dark art.
2. **Faithful to the text.** The description is the brief. Write an art brief mapping every concrete detail (counts, colors, signage, damage, states) to a visible element.
3. **House style and Star Wars design language.** Flat three tone shapes built with `<Bev>`/`<Slab>` and colors from the `ART` palette kit; chamfered, greebled, worn, strong silhouette from an iconic shape (STYLE_GUIDE section 1b: used future, lore accurate ships). No baked gradients, filters, or outlines: the engine adds the lighting so old and new art match. Never cartoony.
4. **Placed meaningfully.** Entities on reachable `floor` tiles, never walls. Footprints clear of doors, collectibles, ships, other objects.
5. **Proven in the engine.** Validate, snapshot, look at the images, confirm the live site.

Before any push that touches zones, objects, ships, portraits, or art (one time setup: `cd .claude/tools && npm install`):

```
node .claude/tools/lint-art.js                                   # style, palette, text fit, scale, detail and wear
node .claude/tools/validate-world.js --zone <zone id> --strict   # placement, reachability, registries
node .claude/tools/style-sheet.js --props kind,kind --ships kind # new art next to the core characters
node .claude/tools/zone-snapshot.js <planet> <zone> x,y x,y     # then open and view the PNGs
```

New content must pass `--strict` with zero errors and zero warnings. When you touch a zone, upgrade its legacy 26px icons to set piece art in the same change. Report honestly what was seen by eye versus checked only in code.

---

## Agent Staff

Invoke any agent by saying: **"Act as [agent name] and [task]."**

| Agent | File | What they do |
|---|---|---|
| **The Cartographer** | `cartographer.md` | Converts zone concepts into working JavaScript zone objects |
| **The Holonet Archivist** | `holonet-archivist.md` | Writes NPC dialogue, choices, and world object descriptions |
| **The Systems Architect** | `systems-architect.md` | Builds React components, portrait SVGs, mini-game overlays |
| **The Protocol Droid** | `protocol-qa.md` | Validates data integrity — catches dead door links and unreachable entities |
| **The Loremaster** | `loremaster.md` | Canon accuracy review for Old Republic era lore |
| **The State Logic Validator** | `state-logic-validator.md` | Audits dialogue for broken moral logic and missing states |
| **The World Architect** | `world-architect.md` | Brainstorms and specs new planets and zones |
| **The Art Director** | `art-director.md` | Visual sign off: holds all art to the Design Standards and proves it in the running game |

---

## Pipeline: Adding New Content

**New planet or zone:**
1. World Architect → spec document (you review)
2. Loremaster → canon check
3. Cartographer → zone JavaScript added to `PLANETS` in `star-wars-rpg.jsx`
4. Holonet Archivist → NPC and world object content
5. State Logic Validator → dialogue audit
6. Protocol QA → integrity check
7. Systems Architect → new portrait kinds or mechanics if needed
8. Art Director → visual sign off (`validate-world.js --strict`, `zone-snapshot.js`, images viewed)
9. Push to `main` (bump the `?v=` on the script tag in `index.html`)

**New NPC kind (portrait):**
Systems Architect adds an SVG branch to `NpcPortrait()` in `star-wars-rpg.jsx`. An unregistered kind renders nothing, so the validator must pass.

**New world object, ship, or prop art:**
Holonet Archivist writes a drawable description, Systems Architect or Art Director builds the art to the Design Standards, Art Director signs off.

**New mini-game:**
Systems Architect builds it as an overlay component and wires it to a trigger in the keydown handler.

**New Conquest sector or unit:**
Modify `CONQUEST_SECTORS_INIT` or `CONQUEST_UNIT_TYPES` constants (defined around line 5357). All Conquest logic lives in `CoruscantConquestOverlay` (~lines 8317 onward).

---

## Technical Limits (hard limits only)

- All code lives in `star-wars-rpg.jsx` — no build system, no imports
- Valid tile types: `wall`, `floor`, `door`, `ship_hull`, `ship_ramp`, `lava`, `water`
- NPC `kind` must be registered in `NpcPortrait()` or entities render nothing
- Entity x,y must land on `floor` tiles or they are unreachable
- Ships are large sprites declared in a zone's `ships` array (`{ id, kind, x, y, label, description, grantsFlag }`). Each `kind` needs a `SHIP_DEFS` footprint (w, h in tiles) and a branch in `ShipSprite()`. Call `carveShips(g, this.ships)` at the end of `buildMap()` so the footprint becomes solid `ship_hull`. Bumping the hull shows the description and sets `grantsFlag`. Keep ship footprints clear of entities, doors, and the access paths to alcoves (run a BFS check)
- KDY world objects use big set piece art built from the ART KIT (`Bev`, `Glow`, `Hazard`, `PropShadow`, `ART` palette; no gradients or outlines): add `propArt: 'kind'` (and optional `propVariant`) to the object, give the kind a footprint in `PROP_DEFS` (w, h, plus ax, ay = the object's tile inside the footprint) and a case in `PropArt()`. The art is visual only, drawn behind NPCs and the player. Never place an object or NPC on a `wall` tile (movement is blocked before interaction). Bump the `?v=` on the script tag in `index.html` when you push so browsers drop cached copies
- Door pairs must be symmetric — each side lists the other as `targetZone`/`targetPos`
- All React hooks inside `CoruscantConquestOverlay` must use the `React.useState` / `React.useEffect` form — no shorthand destructuring (single-file Babel constraint)
- `MapView` inside `CoruscantConquestOverlay` is called as a direct function `MapView()` rather than via `React.createElement(MapView, null)` to prevent remount on every render

---

## Schemas

Reference these when directing agents:

- `.claude/schemas/zone-schema.json` — planet, zone, door, tile structure
- `.claude/schemas/dialogue-schema.json` — NPC, choices, loyalty/morality
- `.claude/schemas/quest-schema.json` — world objects, collectibles, quest flags

---

## Current Game State (as of last push to main)

### Story

The player is a rising crime lord on Coruscant in the Old Republic era. The main questline (Inheritance of Shadows) is complete. Key story flags:

| Flag | Meaning |
|---|---|
| `syndicateManagement_active` | Player has founded the syndicate |
| `jon_status_dead` / `jon_status_subjugated` | Outcome of the Jon Vane confrontation |
| `malak_turned` / `malak_dead` | Outcome of the Malak pit fight |
| `sith_contact` | Player has made contact with the Sith underground |

### Zones (all on Coruscant)

27 zones spread across three tiers: sky-level, mid-levels, and undercity. Entry point is `shadow_town`. Key zones:

| Zone ID | Name | Notes |
|---|---|---|
| `shadow_town` | Shadow Town L.1312 | Starting zone, player HQ |
| `penthouse` | Syndicate Penthouse | Syndicate management hub, Conquest access point |
| `sky_market` | Sky-Level Market | Commerce zone |
| `slicer_alleyway` | Slicer Alleyway | Hacker den |
| `freight_hub` | Freight Hub | Industrial zone |
| `the_works` | The Works | Deep industrial |
| `level_1313` | Level 1313 | Undercity |

### Mini-Games

| Type string | Component | Trigger location |
|---|---|---|
| `pit_fight` | `PitFightOverlay` | Malak in shadow_town, Jon in penthouse |
| `signal_siphon` | `SignalSiphonOverlay` | Slicer terminals |
| `terminal_slicing` | `TerminalSlicingOverlay` | Data terminals |
| `speeder_pursuit` | `SpeederPursuitOverlay` | Chase sequences |
| `valve_override` | `ValveOverrideOverlay` | Industrial consoles |
| `conquest` | `CoruscantConquestOverlay` | Sector Control Holo in penthouse |

### NPC Portrait Kinds (registered in `NpcPortrait()`)

`archivist`, `assassin`, `besalisk_boss`, `bith`, `broker`, `cantina_owner`, `crime_boss`, `czerka_liaison`, `deuterium_specialist`, `droid`, `generic`, `imperial_naval_liaison`, `jedi`, `kdy_commander`, `kdy_executive_sentinel`, `kdy_guild_overseer`, `kdy_logistics_officer`, `kdy_ring_sec`, `kdy_security_marine`, `kdy_shipwright`, `kuati_sub_director`, `mechanic`, `medic`, `pit_fighter`, `republic_guard`, `republic_navy_inspector`, `republic_pilot`, `senator`, `slicer`, `smuggler`, `sub_deck_slicer`, `swoop_gang`, `the_architect`, `trandoshan_sniper`, `vectis_droid`, `warden`, `zero_g_welder`

This list is generated from the code. `validate-world.js` is the source of truth.

### Canvas Object Types (rendered in zone canvas, beyond tiles)

Beyond the 7 tile types, the canvas renderer supports world objects with these visual types:

`neon_sign` — glowing text marquee with animated shimmer
`coaxium_barrel` — glowing blue hazardous fuel drum
`plasma_grid` — flickering energy grid floor hazard
`steam_vent` — rising steam particle emitter
`holoscreen` — animated holographic display

---

## Coruscant Conquest Mode

A turn-based strategy overlay accessed from the Sector Control Holo in the penthouse zone.

### Architecture

All Conquest code lives in two places:

1. **Constants** (~line 5357): `CONQUEST_SECTORS_INIT`, `CONQUEST_FACTION_DATA`, `CONQUEST_UNIT_TYPES`, `CONQUEST_BUILDINGS`
2. **Component** (~line 8317): `function CoruscantConquestOverlay({ onSuccess, onFailure, startCredits })`

### Map

16 sectors arranged in a vertical hierarchy from Apex Tier (top) to Depths (bottom):

| Sector ID | Name | Tier | Starting Owner |
|---|---|---|---|
| `sky_lounges` | Senatorial Sky-Lounges L.5100 | Apex | Black Sun HQ |
| `senate_district` | Senate District | Upper Core | Black Sun |
| `upper_levels` | Upper Levels | Upper Core | Neutral |
| `senate_precinct` | Senate Precinct L.1900 | Legislature | CSF |
| `lower_promenade` | Lower Promenade L.1100 | Commerce Belt | Neutral |
| `slicer_alley` | Slicer Alleyway L.1150 | Data Nexus | Neutral |
| `rep_midlevels` | Republic Mid-Levels | Mid-Layers | Neutral |
| `csf_hub` | CSF Training Hub L.1222 | Enforcement | CSF HQ |
| `the_works` | The Works L.005 | Industrial | Exchange |
| `ind_midlevels` | Industrial Mid-Levels | Factory Belt | Neutral |
| `sub_spaceport` | Sub-Surface Spaceport | Docking Ring | Neutral |
| `shadow_town` | Shadow Town L.1312 | Underworld | Player HQ |
| `sub_l2_west` | Sub-Surface L2 West Market | Black Market | Neutral |
| `freight_hub` | Sector 4 Freight Hub L.088 | Logistics | Exchange HQ |
| `undercity` | Undercity | Depths | Neutral |
| `undercity_out` | Undercity Outskirts | Depths | Neutral |

HQ sectors (`isHQ` field set) cannot be captured by any faction.

### Unit Types

| Key | Name | atkCP | defCP | Cost |
|---|---|---|---|---|
| `inf` | Enforcer Infantry | 10 | 12 | 150 CR |
| `snp` | Covert Marksman | 25 | 20 | 350 CR + 1 PWR |
| `tnk` | Assault Tank | 75 | 90 | 1200 CR + 5 PWR |
| `med` | Field Medic | 5 | 15 | 250 CR |
| `drd` | Combat Droid | 35 | 35 | 700 CR + 2 PWR |
| `spc` | Speeder Cavalry | 45 | 25 | 500 CR + 1 PWR |

### Buildings

| ID | Name | defMult | atkMult | incBonus | Cost |
|---|---|---|---|---|---|
| `bunker` | Reinforced Bunker | 1.25 | 1.00 | 0 | 600 CR |
| `turret` | Auto Turret Nest | 1.40 | 1.00 | 0 | 850 CR |
| `rally` | War Rally Point | 1.00 | 1.20 | 0 | 700 CR |
| `armory` | Weapons Armory | 1.00 | 1.15 | 0 | 900 CR |
| `relay` | Black Market Relay | 1.00 | 1.00 | +200 | 1200 CR |
| `slicehub` | Slicing Hub | 1.00 | 1.00 | +250 | 800 CR |
| `substat` | Power Sub-Station | 1.00 | 1.00 | 0 | 500 CR (grants +3 PWR/turn) |
| `medbay` | Field Medical Bay | 1.10 | 1.00 | 0 | 600 CR |

### Combat

When the player attacks a sector, a choice screen appears:

- **Auto-Resolve:** Compares `stagAtkPow()` vs defender `garDefPow(sec)`. Player wins if attack > defense.
- **Manual Tactical:** Launches `TacticalGridCombatOverlay` for a full grid combat session.

Helper functions:
- `garAtkPow(sec)` — garrison attack power with building atkMult applied
- `garDefPow(sec)` — garrison defense power with building defMult applied
- `stagAtkPow()` — staging area attack power (no building bonus on offense)

### Save System

State saved to `localStorage` key `swtor5_conquest_v1` on every state change via `useEffect`. Restored via lazy `useState` initializers on component mount. Fields persisted: `sectors`, `relations`, `res`, `staging`, `turn`, `heat`, `log`, `selectedSec`. A Reset Campaign button in the header clears localStorage and restores defaults.

### Win Condition

Reaching 7,000 CR/turn income triggers victory. The income display turns green when approaching this threshold.

### Crisis Cards (every 3 turns)

| Title | Effect |
|---|---|
| CSF Sector Sweep | Heat +5, income reduced 30% |
| Power Conduit Rupture | Power reserve -8 |
| Underworld Cartel War | Recruits 30% cheaper next turn |
| Black Market Windfall | +500 CR bonus |

---

## Full Feature Inventory (all implemented)

All features listed here are live in `star-wars-rpg.jsx` on `main`.

### Mini-Games

| Type string | Component | Trigger location | Notes |
|---|---|---|---|
| `sabacc` | `SabaccOverlay` | Sabacc tables in `senatorial_lounges`, `sky_market` | 76-card deck, Sabacc Shift dice, Sleeve Swap cheat risk |
| `contraband_market` | `ContrabandMarketOverlay` | Black market terminal in `spice_refining_vaults` | 5 goods, price volatility, heat-aware selling |
| `interrogation` | `InterrogationMatrixOverlay` | Interrogation chamber in `csf_academy`, `senatorial_lounges` | Trait-reactive tactics, 8-round limit |
| `droid_arena` | `DroidArenaOverlay` | Droid arena in `spice_refining_vaults` | Frame selection, mod installation, stat combat |
| `arms_bench` | `ArmsBenchOverlay` | Arms bench in `undercity_outskirts` | Blueprint + mod crafting, thermal rupture risk |
| `shakedown` | `ProtectionShakedownOverlay` | Shakedown targets in `freight_hub` | Fear/Resistance meters, CSF notice accumulation |
| `sky_evasion` | `SkyLaneEvasionOverlay` | Sky lanes in `senatorial_lounges` | Lane-dodge evasion, cargo drop mechanic, hull stat |
| `signal_siphon` | `SignalSiphonOverlay` | Multiple data terminals | Frequency-match timing game |
| `terminal_slicing` | `TerminalSlicingOverlay` | Data terminals | Word-reveal puzzle with limited guesses |
| `speeder_pursuit` | `SpeederPursuitOverlay` | Emergency speeder bays | Dodge obstacles, distance countdown |
| `valve_override` | `ValveOverrideOverlay` | Pressure valves in industrial zones | Sequence timing puzzle |
| `pit_fight` | (via `tactical_combat`) | `malak_pit_entrance` world object in `shadow_town` | Wired to tactical grid combat with `malak_enforcer` profile |
| `tactical_combat` | `TacticalGridCombatOverlay` | Multiple zone encounters | Full 8x6 grid, cover, flanking, overwatch |
| `syndicate_management` | `SyndicateManagementOverlay` | War Table in `penthouse` | Agent roster, contracts, heat, territory income |
| `coruscant_conquest` | `CoruscantConquestOverlay` | Sector Control Holo in `penthouse` | 16-sector strategy mode, localStorage save |

### Zones (all traversable)

30 zones across three tiers: sky, mid, undercity. All have doors connecting to adjacent zones.

| Zone ID | Notable content |
|---|---|
| `senatorial_lounges` | Malis (Black Sun Vigo), sabacc table, sky-lane evasion access |
| `spice_refining_vaults` | Karrn (Exchange Tariff Lord), Grix (Smuggler lieutenant), Vael (Slicer lieutenant), contraband market, droid arena |
| `undercity_outskirts` | Marro (CSF Inspector lieutenant), Kesh (Rogue Sith), The Anzati (assassin-for-hire), arms bench, Jedi ruin fragment |

### NPCs (all zones, all recruitable lieutenants active)

| NPC | Zone | Kind | Flags |
|---|---|---|---|
| Malis | `senatorial_lounges` | `crime_boss` | `black_sun_allied` / `malis_hostile` |
| Karrn | `spice_refining_vaults` | `broker` | `karrn_deal` / `karrn_hostile` |
| Grix | `spice_refining_vaults` | `smuggler` | `grix_recruited` (adds to syndicate roster) |
| Vael | `spice_refining_vaults` | `slicer` | `vael_recruited` (adds to syndicate roster) |
| Marro | `undercity_outskirts` | `republic_guard` | `marro_recruited` (adds to syndicate roster, reduces heat) |
| Kesh | `undercity_outskirts` | `jedi` | `sith_contact` |
| The Anzati | `undercity_outskirts` | `assassin` | `anzati_contracted` |

### Dynamic Heat Events (in SyndicateManagementOverlay.advanceTime)

Each `Advance Time` press checks heat and rolls for a random event:

| Heat Tier | Chance | Events |
|---|---|---|
| Critical (100) | Always | Full CSF Raid: all territories seized, -1200 cr, heat reset to 50 |
| High (70+) | 30% | Courier Ambush (+8 heat), Warehouse Fire Bombing (-500 to -900 cr), Agent Extradition (one agent detained) |
| Mid (40+) | 18% | CSF Customs Shakedown (-30% passive income), Turf War (+6 heat) |

### Syndicate Management (all gaps fixed)

- `syndicateTerritories` populated on activation based on story path (`jon_status_dead` / `jon_status_subjugated`)
- Injured agents recover at 50% chance per Advance Time press
- Lieutenant recruitment flags (`grix_recruited`, `vael_recruited`, `marro_recruited`) auto-add agents to roster via `useEffect`

---

## Gameplay Content Roadmap (not yet built)

Future sessions may add:

- Speeder racing tournament (reuse `SkyLaneEvasionOverlay` in competitive bracket format)
- Sabacc tournament mode (multi-opponent bracket)
- Expanded Black Sun alliance questline with Malis (currently stops at flag grant)
- Sith underground questline continuation from Kesh contact
- Exchange trade monopoly resolution questline from Karrn deal
- More Conquest buildings and a defensive siege mechanic when HQs are threatened
- Dynamic NPC patrol routes (currently all NPCs are stationary)
