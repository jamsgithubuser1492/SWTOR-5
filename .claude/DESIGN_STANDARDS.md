# Visual Design Standards

These rules are binding for every visual asset in the game: world objects, ships, NPC portraits, decor, enemy sprites, and whole zones. They exist because of a real failure. We once shipped 41 "designed" objects that nobody could see in play, an NPC that rendered as nothing, and an object placed inside a wall. Every one of those passed review because the review looked at the code and a sprite sheet, never at the game.

The test is simple. **If you cannot identify the thing in a 1x screenshot of the actual game, it does not exist.**

---

## The Five Laws

### 1. Visible at gameplay scale

The game draws a 20 by 13 tile viewport. One tile is 32 pixels. Players see the world at roughly 660 by 420 pixels. Design for that, not for a zoomed preview.

- Set piece objects get a real footprint of at least 2 by 2 tiles (figures and wall mounted narrow items may be 1 by 2). A 26 pixel icon is a legacy size and is not acceptable for new work.
- Use solid, lit fills. Outline only art and dark translucent fills (like `#00000060`) vanish against the dark floors and are banned.
- Mid tones of the art must separate from the floor behind them. Floors sit between `#111820` and `#281E12`. Lit steel (`#64738A` to `#AAB7C6`), brass, bronze, copper, saturated accents, and glow all read. Black on black does not.
- Anything the player must notice (an interactable, a quest item, a ship) needs a clear silhouette and at least one bright or emissive element.

### 2. Faithful to the written text

The description is the design brief. A player who reads the text and then looks at the art should recognise every concrete detail.

- Before drawing, write an art brief: a list of every visual detail in the description (counts, colors, materials, signage text, damage, states) and the element that will show it. Twelve lockers means twelve lockers. "Third from the right, second row, cracked seal" means exactly that cell is cracked.
- Put literal signage text on the art when the description quotes it. Keep it short enough to fit (see Specs).
- Show state. If an object has locked and unlocked states (Vectis before and after clearance), the art must change with the state.
- Era and lore: Old Republic, Kuat Drive Yards flavor where relevant. KDY reads as hazard amber and black striping, blue steel, Kuati stepped arch bronze, brass and copper luxury droids, teal grey heavy loader carapace. The Loremaster signs off on ship classes and designations.
- If the text does not give enough to draw, ask the Holonet Archivist for a richer description rather than inventing contradicting detail.

### 3. Lit and shaded

Flat shapes look cheap and read poorly. Every asset needs:

- Light from the upper left: a bright top edge highlight, a gradient from light to dark (top to bottom or corner to corner), and a darker underside.
- A soft elliptical contact shadow on the floor.
- Distinct materials: steel, brass, bronze, copper, glass, felt, wood, cloth should look different from each other.
- Glow for anything emissive (screens, lamps, engines, holograms).
- A small amount of life: one to three animated elements per asset (blinking lights, scanning line, pulsing glow). More is noise.

### 4. Placed meaningfully

Art that cannot be reached or that hides other things is a bug.

- Every NPC, collectible, and world object must stand on a `floor` tile that is reachable from the zone spawn. The engine blocks movement into any non floor tile before interaction runs, so an object on a wall can never be used.
- Reachability means a real walk from spawn, not "next to a reachable tile".
- An art footprint must stay clear of doors, collectibles, ships, and the tiles of other objects. It may sit behind an NPC on purpose (a bartender behind a bar).
- Ships are solid. Their footprint is carved as `ship_hull` with `carveShips(g, this.ships)` so the player walks around them, and they must never block the only path into an alcove or toward a door.
- Place things where the fiction says. A fuel rig belongs near the ship it refuels, a transit pod near the transit board.

### 5. Proven in the engine

Nothing is done until it has been seen running.

- Run the validator on the zones you touched with `--strict` and get a pass.
- Take in game snapshots at two or more player positions and actually look at them (open the PNG). Check the asset at 1x.
- After pushing, confirm the live site serves the new file and that the cache busting `?v=` in `index.html` was bumped.
- Report honestly. State what you verified visually and what you only verified in code. Never write "visible" about something you did not look at.

---

## Tooling that enforces the laws

Setup once: `cd .claude/tools && npm install`

| Command | What it does |
|---|---|
| `node .claude/tools/validate-world.js --zone <id> --strict` | Compiles the game, checks entities on floor and reachable, door integrity, portrait registry, prop and ship registries, footprint overlaps, and flags every object that only has the legacy icon. Exit 0 means pass. |
| `node .claude/tools/validate-world.js --planet <id>` | Same for a whole planet. |
| `node .claude/tools/validate-world.js` | Whole game baseline. |
| `node .claude/tools/zone-snapshot.js <planet> <zone> x,y x,y` | Boots the real game in headless Chromium at the given player positions and saves PNGs to `.claude/tools/snapshots/`. Open them. |

The validator reads the registries from the code itself, so it cannot drift the way hand written lists do.

---

## Specs by asset type

### Set piece art for world objects (`propArt`)

1. Add `propArt: 'kind'` (and optional `propVariant: 'name'`) to the world object in the zone.
2. Add the kind to `PROP_DEFS`: `{ w, h, ax, ay }` where w and h are the footprint in tiles and `ax, ay` is where the object's own tile sits inside that footprint.
3. Add a `case` in `PropArt()` and write the component. Use `viewBox="0 0 W H"` with `W = w * 32` and `H = h * 32`, and `style={PROP_STYLE}`.
4. Use `<PropDefs p="xx" />` for the shared steel, dark, brass, bronze, copper, teal, red, glass, blue and amber gradients, the hazard stripe pattern, and the soft shadow filter. Give each prop a unique two or three letter prefix. Inline SVGs share one id space across the page, so reused ids collide.
5. Text in SVG: a monospace character is about `0.6 * fontSize` wide. Maximum characters = `available width / (0.6 * fontSize)`. Check text at 3x on a contact sheet, then at 1x in game. Small decorative text can go down to about 1.8 but headline text must read.
6. Props draw at z index 2, below ships (3), NPCs (5), the player (6) and overlays (20 and up). The art is visual only. The player still interacts by walking onto the object tile.
7. `once` objects disappear after use. Design accordingly.

### Ships (`ships` array)

1. Declare `{ id, kind, x, y, label, description, grantsFlag }` in the zone's `ships`.
2. Add the kind to `SHIP_DEFS` (footprint in tiles) and a branch in `ShipSprite()`.
3. Call `carveShips(g, this.ships)` at the end of `buildMap()`.
4. Bumping the hull shows the description and sets `grantsFlag`. Write the description from the same art brief as the sprite.
5. Draw with plan view lighting, a landing pad marking, a soft shadow, running lights, and engine glow. Keep a clear walking lane around the footprint.

### NPC portraits (`NpcPortrait`)

- Every NPC `kind` must have a branch in `NpcPortrait()`. An unregistered kind renders nothing and gives no error. The validator catches this.
- `generic` is a real, plain civilian portrait. Use a specific kind whenever the NPC has a role, species, or faction look.

### Floor decor, enemy sprites, canvas object types

Follow the Systems Architect prompt. The same five laws apply: legible at 1x, lit, placed on valid tiles, verified in the engine.

### Animation keyframes already defined

`ship-blink`, `ship-engine`, `ship-spark`, `holo-flicker`, `prop-scan`, `lens-flicker`, `twinkle`, `ring-spin`, `steam-rise`, `door-pulse`, `mist-drift`. For rotation inside SVG set `transformOrigin` in user units (for example `'201px 80px'`) and `transformBox:'fill-box'` for scaling about the center. Do not use `scanDown` inside props (it travels the whole viewport).

---

## Definition of Done (copy into the commit message or report)

- [ ] Art brief written: every concrete detail in the text maps to a visible element
- [ ] Footprint meets Law 1, fills are solid and lit, shadow and highlight present
- [ ] Registered everywhere it must be (`PROP_DEFS` and `PropArt`, `SHIP_DEFS` and `ShipSprite`, `NpcPortrait`)
- [ ] `validate-world.js --zone <id> --strict` passes
- [ ] `zone-snapshot.js` run at 2+ positions and the images were viewed
- [ ] Text fits and is legible at 1x
- [ ] Pushed, `?v=` in `index.html` bumped, live file confirmed to contain the new code
- [ ] Report states what was seen with eyes versus checked in code

---

## Anti patterns (each one has already bitten us)

| Anti pattern | Why it fails | Instead |
|---|---|---|
| Dark fill with a thin accent outline at 26px | Invisible on dark floors | Solid lit art at a real footprint |
| Judging art from a zoomed sprite sheet | Hides the real scale | Always snapshot the scene at 1x |
| Counting "adjacent to a reachable tile" as reachable | Engine blocks walking into walls | BFS to the tile itself, on a floor tile |
| Using a portrait `kind` that is not registered | Renders nothing, no error | Run the validator, register the kind |
| Documentation that lists registries by hand | Drifts from code | Trust the validator, which reads the code |
| Duplicate SVG gradient ids across props | Wrong gradient renders | Unique prefix per prop |
| Text wider than its panel | Clipped, unreadable | Use the character width formula, check at 3x and 1x |
| Declaring done without looking | Ships invisible work | Law 5 |
| Shipping a syntax slip (an unescaped apostrophe in a single quoted string) | Blank screen | The validator compiles the file first |

---

## Legacy debt policy

Older zones still use 26 pixel icons and a few have placement errors. The validator reports them as warnings and errors. The rule going forward:

- New content must pass `--strict` with zero errors and zero warnings.
- When you touch a zone for any reason, bring its objects up to this standard in the same change (the boy scout rule).
- Do not hide legacy debt. Report the validator baseline whenever it changes.
