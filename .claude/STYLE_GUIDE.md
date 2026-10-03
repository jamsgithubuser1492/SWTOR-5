# Style Guide: Look and Feel

Style version 2. This is the visual bible for the game: brand, world, objects, ships, characters, interface, and motion. It exists so that everything the player sees, whether drawn in the first week or the fiftieth, looks like it belongs to one world.

How it fits with the other documents:

- This guide says **what the game looks like** and how to build it in that look.
- `.claude/DESIGN_STANDARDS.md` says **what must be true before art ships** (visible, faithful, placed, proven) and holds the checklist.
- `.claude/tools/` enforces both: `lint-art.js` (style), `validate-world.js` (placement), `style-sheet.js` and `zone-snapshot.js` (your eyes).

The rule behind everything: **one world, one look.** If a new asset would look out of place beside the core characters in the same scene, it is wrong, however detailed it is.

---

## 1. Brand and tone

**Neon noir in an exhausted galaxy.** The Old Republic cold war era (about 3653 BBY): the Great Galactic War has just ended, the Sacking is recent, corruption is normal, loyalty is expensive. Gritty low fantasy pulp, not heroic spectacle.

Visual pillars:

1. **Dark, muted, lived in.** Floors and walls sit in deep desaturated blues, browns and blacks. Surfaces are worn, patched, stained and scratched. Nothing is clean unless someone wealthy pays to keep it clean.
2. **One light per place.** Every zone has a single signature accent color (the neon of the place). It appears as trim, screens, signage, status lights and the rim glow on sprites. It is the only strong color in the frame.
3. **Readable silhouettes.** At 32 pixels a tile, shape does the talking. Characters, props and ships must be identifiable by silhouette first, material second, detail third.
4. **Story lives in the details.** Handwritten notes, work orders, scratched graffiti, torn flimsi, one cracked seal. The writing in the world is part of the art.

---

## 2. The house style on one page: "cel lit noir"

Every sprite is built from **flat, hard edged shapes in three tones** (highlight, base, shade). There are no baked gradients, filters, patterns, blur glows or outlines inside an asset. The **engine** then lights every sprite the same way when it draws it.

| Layer | Who does it | How |
|---|---|---|
| Form and material | The asset | Flat shapes; `<Bev>` for three tone shading |
| Emissive parts (screens, lamps, engines) | The asset | Flat bright shapes; `<Glow>` for stepped glow rings |
| Hazard striping | The asset | `<Hazard>` |
| Floor shadow under big props and ships | The asset | `<PropShadow>`: two flat translucent ellipses |
| Ink outline, zone colored rim light | The engine | `spriteFx(accent, size)` applied to every sprite wrapper |
| Contact shadow under characters | The engine | `ACTOR_SHADOW` ellipse |

Why this split: the original characters were already flat shapes, so the engine pass lifts them and the new art together without redrawing anything. The old and new art cannot drift apart because the lighting is not drawn into either one.

**Never** draw your own outline, drop shadow, blur, gradient or glow into an asset. You would be double lighting it and it would stand out.

### Building blocks (in `star-wars-rpg.jsx`, the "ART KIT")

- `ART` palette: materials (`steel`, `dark`, `hull`, `pearl`, `brass`, `bronze`, `copper`, `teal`, `red`, `amber`, `rust`, `tan`, `wood`, `canvas`, `beige`, `paper`, `glass`, `deepglass`) each with `hi`, `base`, `shade`; plus `signal`, `story`, `screen`, `skin`, `note`, `brand`, `cloth`.
- `<Bev t="rect|path|circle|ellipse|polygon" c="steel" ...shape attrs />` draws the shade layer offset down right, the highlight offset up left, and the base on top. This is how every solid form is made.
- `<Glow cx cy r c />` three flat concentric rings. `<Hazard x y w h />` amber and black stripes. `<PropShadow cx cy rx ry />`.

---

## 3. Palette

**Every color in art must come from the ART kit.** `lint-art.js` fails on any other hex. If a design truly needs a new color, add it to the kit on purpose (and say why in the commit), do not sprinkle a literal.

### Where the palette comes from

It is derived from the core portraits, enemy sprites and player: slate blues and steel greys (`#5A6A7A`, `#6A7A8A`, `#8A9AB0`), near black inks (`#0A0A0A`, `#1A1A1A`, `#2A2320`), leather and skin browns (`#8A6E4E`, `#C8956A`, `#D9B98C`), brass and gold (`#C8A000`), CSF blue (`#1E3A6A`, `#4A9FFF`), danger red (`#8B0000`, `#CC3030`). Materials are the same hues as the core, in three tones each.

### Materials

| Token | Reads as | Typical use |
|---|---|---|
| `steel` | Structural metal | Consoles, frames, rails, wings |
| `dark` | Shadowed or heavy metal | Bases, housings, engines, cradles |
| `hull` / `pearl` | Painted hull, luxury hull | Republic shuttles, executive yachts |
| `brass` / `bronze` / `copper` | Warm metals | Luxury droids, Kuati bronze, wiring, drive cores |
| `teal` | Heavy loader carapace | KDY loader droids |
| `red` / `amber` / `rust` / `tan` | Painted crates and livery | Cargo, Republic stripe, Czerka |
| `wood` / `canvas` / `cloth` | Organic and soft goods | Bars, stalls, sabacc felt |
| `paper` / `note` | Notes, notices, work orders | Written story details |
| `glass` / `deepglass` | Canopies and viewports | Cockpits, windows |

### Signal, story and screen colors

- `signal`: emissive only (cyan holo and displays, amber warnings, green OK, red alarm, orange sparks). Never use signal colors for solid bodies.
- `story` (fixed meaning everywhere in the game): amber `#E8A030` warnings and flagged status, danger `#FF4422` critical and blast marks, syndicate `#40C840`, Senate `#9966FF`, CSF `#4A9FFF`, tape amber `#FFB800` hazard and crime tape.
- `screen`: dark display glass behind text.

### Zone palettes (the world behind your asset)

Art sits on these floors, so it must separate from them. The six archetypes in `ZONE_ARCHETYPE_PROFILES`:

| Archetype | Floor | Wall | Accent | Ambient |
|---|---|---|---|---|
| exterior | `#1A1C2A` | `#0C0D16` | `#8FA6FF` | traffic |
| interior_cantina | `#1A0C14` | `#0C0608` | `#FF0055` | neon_haze |
| interior_slicer | `#080E0E` | `#040808` | `#00F0FF` | datastream |
| interior_csf | `#181C28` | `#0A0C14` | `#4A9FFF` | traffic |
| interior_warehouse | `#1C1A14` | `#0A0902` | `#FF9900` | steam |
| interior_generic | `#191E30` | `#0A0C14` | `#7AB8E0` | mist |

The accent is passed to every sprite (`accent` prop). Use it for trim and lights on zone integrated things, and let the engine pass add the matching rim glow. Use fixed hardcoded colors only for story specific elements.

Accent discipline: the accent should cover roughly 10 percent of a frame or less. Large areas stay in the muted material colors.

---

## 4. Lighting

- **Light direction:** upper left. Highlights on top and left edges, shade on bottom and right. `<Bev>` does this for you.
- **Rim light:** the zone accent, drawn by the engine at 1.5 to 3 pixels. It is the "neon spill" that ties every sprite to its zone.
- **Ink outline:** 1 pixel (1.5 for ships), drawn by the engine. It is what makes sprites pop off dark floors.
- **Shadows:** flat and hard edged, never blurred. Characters get `ACTOR_SHADOW`. Big props and ships carry their own `<PropShadow>`.
- **Emissive things** (screens, lamps, holograms, engines) are the brightest things in any sprite. They use flat bright shapes with `<Glow>` rings.

---

## 5. Scale and grid

| Thing | Tile footprint | Canvas | Notes |
|---|---|---|---|
| Tile | 1 x 1 | 32 px | Viewport is 20 x 13 tiles (660 x 420 px) |
| NPC portrait | 1 x 1 | viewBox `0 0 30 42`, drawn 26 x 36 | Flat, two tone |
| Player | 1 x 1 | viewBox `0 0 26 36`, drawn 22 x 30 | |
| Tactical enemy sprite | n/a | viewBox `0 0 20 32` of `<rect>` | Pixel art, combat only |
| Floor decor | sub tile | 24 x 24 at 14 to 19 px | Subtle texture, not an interactable |
| Set piece prop | 2 x 2 up to 4 x 2 | `w*32` by `h*32` | `PROP_DEFS` footprint |
| Ship | 5 x 4 up to 14 x 4 | `w*32` by `h*32` | `SHIP_DEFS` footprint |

Proportions: a standing character is about one tile tall (36 px). A console is about two tiles wide. A door is two tiles. A small shuttle is six tiles long. Ships dwarf people; that is the point.

---

## 6. World and environment design

- **Tiles:** floors use the zone's `floorColor` and `floorAlt` with sparse variation; walls use `textureId` (`coruscant`, `ferrowake`, `verdanth`). Keep floors dark and low contrast so sprites read on top.
- **Vertical mood on Coruscant:** sky level is cool blues and whites, mid levels are blue grey with civic order, the undercity is rust, red and amber with grime. Pick the archetype that matches the tier.
- **Set dressing:** each zone needs one or two hero set pieces that tell its story, plus small decor for texture. Story objects must always read stronger than decor.
- **Lanes:** keep walkable lanes at least two tiles wide around large objects and ships. Never let art or a ship block the only route to a door or alcove.
- **Ambient layers:** `traffic`, `embers`, `mist`, `neon_haze`, `datastream`, `steam`, `sky_high`. Choose from the zone archetype.
- **Floor decor** comes from the registered list only (`cargo_crate`, `pipe`, `neon_sign`, `pillar`, `brazier`, `archive`, `girder`, `slag`, `root`, `moss`, `rubble`, `cable_bundle`, `scan_arch`, `warning_beacon`, `hazard_stripe`).
- **Environmental storytelling:** wear, stains, patched cables, handwritten notices. A clean surface needs a reason.

---

## 7. Object design (set pieces)

Method: write the **art brief** from the description (every concrete detail mapped to a visible element), choose a footprint, block the silhouette, build with `<Bev>`, add the emissive element, add the story text.

- **Silhouette first.** Squint: can you tell a fuel rig from a locker bank? Different silhouettes for different jobs.
- **Affordance:** anything the player can use has at least one emissive element (screen, lamp, status light). Dead set dressing does not.
- **Text on art:** quote signage from the description; size it with 0.6 x fontSize per character; keep headline text at 2.4 or larger and fine print at 1.6 or larger. `lint-art.js` checks fit.
- **State:** if the object changes (locked then cleared, damaged then repaired), draw both states.
- **Wear:** add one or two marks of age (scorch, patch, scratch, sticky note). Keep them flat shapes.
- **Animation:** at most one to three small loops (`ship-blink`, `ship-engine`, `holo-flicker`, `prop-scan`).

Reference set pieces: `PropFuelRig` (silhouette and grime), `PropImpoundDoor` (text and hazard), `PropDriveCradle` (tags and state), `PropForgeBar` (written detail), `PropTransitPod` (two subjects in one footprint).

---

## 8. Ship and vehicle design

- **View:** plan (top down), bow pointing anywhere that suits the pad. Landing pad marking and soft floor shadow included in the sprite.
- **Construction:** `<Bev>` for hull panels; panel lines as thin flat strokes; one cockpit canopy (`glass` or `deepglass`); running lights (red port, green starboard) and engine glow.
- **Silhouette by role:** freighters are rounded and asymmetric; military ships are long and symmetric; luxury yachts are swept and slender; haulers are boxy with cargo.
- **Wear tells the owner:** impounded free trader (scorched, patched, clamped); Republic navy (clean, stripe, crest); Czerka (corporate amber, neglected maintenance); House Kuat (pearl and gold, polished).
- **Ships are solid in the world:** declare in `ships`, carve with `carveShips`, bumping examines.

---

## 9. Character design

### NPC portraits (`NpcPortrait`)

- Canvas `0 0 30 42`, drawn 26 x 36. Flat filled paths. A base color and one darker shade shape (usually the same color, darker or at 0.5 to 0.75 opacity) per garment; no gradients, no outlines.
- Face: skin tone from `ART.skin`, two eye dots (`#2A2320`), a one stroke mouth, hair as one flat shape. Species features (Rodian snout and green skin, Twi'lek lekku, Ithorian throat) are silhouette changes, not detail.
- The zone `accent` appears only as small trim (a belt, a lens, a badge).
- Silhouette must say the role: hood for jedi and assassins, helmet for troopers, goggles for slicers and mechanics, coveralls for workers.
- Register every `kind` in `NpcPortrait()`. An unregistered kind renders nothing. `generic` is a plain civilian.
- The engine adds the outline, rim and shadow. Do not draw them.

### Player

`PlayerMarker`: same construction as portraits, 22 x 30, bobbing idle. Treat it as the reference for proportion.

### Tactical enemy sprites (`EnemySprite`)

Pixel art on a 20 x 32 grid of `<rect>` with no strokes and no opacity, rendered `image-rendering: pixelated`. This is the combat screen's own look and it stays pixel art. Do not mix vector shapes into these.

### Animation

Characters idle with `npc-sway` and `npc-blink`; the player bobs. Nothing else on a character moves unless it is a species trait (lekku, tail).

---

## 10. Interface and typography

- **Font:** IBM Plex Mono (monospace fallback) everywhere.
- **Sizes:** 7 to 13 px for HUD text; 16 px for zone titles.
- **Colors:** label `#5A5F74`, body `#A8ADC0`, secondary `#7A7F94`, dim `#3A3F54`, credits gold `#E8C97A`, info cyan `#4ACDFF`, warning `#E8A020`.
- **Panels:** `1px solid #24242E` borders on near black (`#0A0A12`), the zone accent for titles and glow (`box-shadow` with `accentGlow`).
- **Tone of text:** terse, lowercase labels for navigation, uppercase for system notices and signage.

---

## 11. Motion and effects

Allowed keyframes: `ship-blink`, `ship-engine`, `ship-spark`, `holo-flicker`, `prop-scan`, `lens-flicker`, `door-pulse`, `twinkle`, `ring-spin`, `steam-rise`, `mist-drift`, `npc-sway`, `npc-blink`, `player-bob`, `collectible-bob`.

- Pulses are opacity changes of 1 to 4 seconds. No fast flashing.
- Never move a large sprite. Small parts only.
- No blur based glow. Use `<Glow>` rings.
- Inside SVG, set `transformOrigin` in user units (`'201px 80px'`) and use `transformBox:'fill-box'` for scaling about the center.
- Do not use `scanDown` or `world-obj-pulse` inside props or ships.

---

## 12. Faction and culture languages

Extend this table whenever a faction gains art.

| Faction or place | Read as | Colors |
|---|---|---|
| Kuat Drive Yards (industrial) | Working shipyard: hazard striped, steel blue, patched | `steel`, `dark`, `warn` amber and black hazard, brand `#1A8FD0` |
| Kuat executive and House Kuat | Old money: polished, ornate | `brass`, `bronze`, `pearl`, deep blue |
| Republic Navy | Disciplined: grey hull, red stripe and crest | `hull`, `red` stripe, Republic crest |
| CSF and Republic security | Official, armored | CSF blue `#1E3A6A` body, `#4A9FFF` visor and trim |
| Sith and Imperial | Severe: black and red | near black, `#8B0000`, `#CC3030` |
| Mandalorian | Weathered steel | `steel`, scuffed `#5A6A7A` family |
| Czerka | Predatory corporate: red and gold livery | `red`, `brass`, `amber` |
| Syndicate (player) | Lean, green marked | `story.syndicate` `#40C840` |
| Senate | Ceremonial | `story.senate` `#9966FF` |
| Free traders and smugglers | Mismatched, patched, scorched | mixed `steel`, `rust`, `tan`, hand marks |
| Undercity | Grimy, makeshift | `rust`, `dark`, `copper`, amber |

---

## 13. Do and don't

| Do | Don't |
|---|---|
| Build forms with `<Bev>` from the ART palette | Use gradients, blur filters, pattern fills |
| Let the engine add outline, rim and shadow | Draw your own outline or glow |
| Use `<Glow>` rings and flat emissive shapes | Use radial gradient glows |
| Quote the description's signage on the art | Use lorem ipsum or generic labels |
| Check the sprite next to the core row (`style-sheet.js`) | Judge it only in isolation or zoomed in |
| Add one or two wear marks | Leave surfaces factory clean |
| Add a new color to the kit deliberately | Paste a one off hex |
| Keep tactical enemies as pixel art | Mix vector shapes into pixel sprites |
| Use the zone accent for trim and lights | Flood the frame with accent color |

---

## 14. Consistency process

1. Read the description and write the art brief.
2. Build with the ART KIT. Keep the viewBox equal to the footprint times 32.
3. `node .claude/tools/lint-art.js` must pass (flat construction, palette, text fit, scale).
4. `node .claude/tools/validate-world.js --zone <id> --strict` must pass (placement, reachability, registries).
5. `node .claude/tools/style-sheet.js --props <kinds> --ships <kinds> --accent <zone accent> --floor <zone floor>` and look at the PNG. The new art must look like the same game as the core row.
6. `node .claude/tools/zone-snapshot.js <planet> <zone> x,y x,y` and look at the scene at 1x.
7. The Art Director signs off.

---

## 15. Legacy upgrade path and style changelog

**Legacy art** is anything still in the original small outline style: the 28 x 28 line icons in `WorldObjectSprite` and the `iconKind` objects (about 197 across the game, listed by `validate-world.js` as warnings). They already receive the engine lighting pass, so they sit acceptably, but they are small and dim. Upgrade rule: when you touch a zone, convert its objects to set piece art (`propArt`) in the same change.

**Changelog**

- **v2:** Added the ART palette kit and shaded building blocks. Added the engine wide lighting pass (ink outline, zone rim light, contact shadows) applied to characters, the player, objects and ships. Rebuilt all KDY ships and objects in this style. Added `lint-art.js` and `style-sheet.js`.
- **v1:** Original look: flat portraits, pixel combat sprites, dim accent line icons, no shared lighting.

Future candidates: apply the lighting pass to tactical enemy sprites, redraw legacy line icons as set pieces, add a shared portrait palette helper.
