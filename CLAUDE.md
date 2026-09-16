# Star Wars RPG — Game Director Guide

You are the Game Director. Your job is to review, approve, and direct. The agent staff builds.

## Repository

Single-file React/Babel browser app. No build system.

| File | Purpose |
|---|---|
| `star-wars-rpg.jsx` | The entire game |
| `index.html` | CDN loader (React 18, Babel 7) |
| `.claude/agents/` | Agent system prompts |
| `.claude/schemas/` | Data structure contracts |

Live at: `https://jamsgithubuser1492.github.io/SWTOR-5/`

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
8. Push to `main`

**New NPC kind (portrait):**
Systems Architect adds an SVG branch to `NpcPortrait()` in `star-wars-rpg.jsx`.

**New mini-game:**
Systems Architect builds it as an overlay component and wires it to a trigger in the keydown handler.

---

## Technical Limits (hard limits only)

- All code lives in `star-wars-rpg.jsx` — no build system, no imports
- Valid tile types: `wall`, `floor`, `door`, `ship_hull`, `ship_ramp`, `lava`, `water`
- NPC `kind` must be registered in `NpcPortrait()` or entities render nothing
- Entity x,y must land on `floor` tiles or they are unreachable
- Door pairs must be symmetric — each side lists the other as `targetZone`/`targetPos`

---

## Schemas

Reference these when directing agents:

- `.claude/schemas/zone-schema.json` — planet, zone, door, tile structure
- `.claude/schemas/dialogue-schema.json` — NPC, choices, loyalty/morality
- `.claude/schemas/quest-schema.json` — world objects, collectibles, quest flags
