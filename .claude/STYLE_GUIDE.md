# Style Guide: Look and Feel

Style version 3. This is the visual bible for the game: brand, world, objects, ships, characters, interface, and motion. It exists so that everything the player sees, whether drawn in the first week or the fiftieth, looks like it belongs to one world.

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

## 1b. The Star Wars design language

Everything must feel like **Star Wars**, not generic sci fi and not a cartoon. These are the franchise's own design principles (Lucas, McQuarrie and the Lucasfilm art department; Doug Chiang's published guidelines) translated into rules for this game.

**The principles**

1. **Strong silhouette, three second rule.** A design must be recognisable in profile and its purpose understood in about three seconds. Build the silhouette from a few bold primary shapes before adding any detail.
2. **Iconic shapes.** Star Wars is built from a small family of forms: wedges, saucers and discs, domes, cones, spindles and cylinders, hammerheads and prongs. Start from one of these.
3. **Used future.** Nothing is new. Everything is worn, patched, scorched and repaired with mismatched parts. This is the "lived in universe".
4. **Greebles.** Lucas's word for small functional surface detail (pipes, vents, panel lines, antennae, light rows). Simple shapes get their visual complexity from greebles, not from decoration.
5. **Hard edged, functional geometry.** Machines are angular and chamfered, built from facets and panels. Avoid soft pill shapes, perfect circles for everything, and "cute" proportions. Sleek means long, low, tapered, and precise.
6. **Visual contrast and unified aesthetic.** Clear palettes per faction; nothing stands out of the world it belongs to. Beautiful, never glossy.
7. **Familiar yet exotic.** Real world industrial objects (cranes, pallets, consoles, lockers) dressed in alien detail.
8. **Toy factor last.** Add flair only after silhouette, purpose and believability are solved.

**What cartoony looks like (avoid):** rounded pill rectangles, uniform thick outlines, glossy gradients, oversized round gauges and lenses, saturated candy colors, clean uncluttered surfaces, big friendly eyes on droids.

**What Star Wars looks like (aim for):** chamfered slabs, panel seams and rivets, vent louvres, rows of tiny colored lights and toggle banks, exposed cable runs, hazard decals, dark recesses, muted weathered metals with one small bright emissive accent, scorch marks and scuffs.

**Old Republic era ship language** (from the lore, applied to our ships)

- **Republic:** Corellian influenced, rounded and bulbous capital ships in white with red stripes. The Valor class cruiser is the model: a bulbous center section, gun batteries on the front, sides and stern, a dorsal command tower, seven thrusters on a ventral tower, hangars lining the sides.
- **Sith Empire:** aggressive wedge and dagger hulls, black with red, split prongs on the largest ships (the Harrower class dreadnought).
- **Corellian freighters:** the saucer with a cockpit tube and forward prongs; asymmetric, patched, overloaded.
- **Kuat Drive Yards:** heavy industrial shipyard work: gantries, drydocks, hazard striping, steel blue hulls, ships built and rebuilt in the open.
- **Luxury and executive craft:** slender, polished, swept, pearl and gold.

**Console and tech language:** consoles are chunky and analog: wedge shaped housings, button and toggle banks, small amber, green or cyan readouts, vents, exposed cable. Holograms are cyan line art with scan lines and a flicker, projected from an emitter. Droids are functional machines: slender brass protocol droids with visible actuators, boxy teal loaders, never cute.

Sources consulted: Doug Chiang's four principles and five guidelines of Star Wars design (vfxblog), the Wookieepedia entries for the Valor class cruiser, Hammerhead class cruiser and Harrower class dreadnought, and accounts of the original trilogy's used future design by Ralph McQuarrie and George Lucas.

---

## 2. The house style on one page: "cel lit noir"

Every sprite is built from **flat, hard edged shapes in three tones** (highlight, base, shade). There are no baked gradients, filters, patterns, blur glows or outlines inside an asset. The **engine** then lights every sprite the same way when it draws it.

| Layer | Who does it | How |
|---|---|---|
| Form and material | The asset | Flat shapes; `<Bev>` for three tone shading |
| Emissive parts (screens, lamps, engines) | The asset | Flat bright shapes; `<Glow>` for stepped glow rings |
| Hazard striping | The asset | `<Hazard>` |
| Floor shadow under big props and ships | The asset | `<PropShadow>`: two flat translucent ellipses |
| Ink outline and rim light (characters, player, small icons) | The engine | `spriteFx(accent)` applied to every character wrapper |
| Soft zone colored rim glow only (large props and ships, so their surface detail reads) | The engine | `spriteFx(accent, 'prop' or 'ship')` |
| Contact shadow under characters | The engine | `ACTOR_SHADOW` ellipse |

Why this split: the original characters were already flat shapes, so the engine pass lifts them and the new art together without redrawing anything. The old and new art cannot drift apart because the lighting is not drawn into either one.

**Never** draw your own outline, drop shadow, blur, gradient or glow into an asset. Large props and ships are deliberately not outlined by the engine: their panel lines, greebles and chamfered edges carry the form. You would be double lighting it and it would stand out.

### Building blocks (in `star-wars-rpg.jsx`, the "ART KIT")

- `ART` palette (weathered and muted, used future): materials (`steel`, `dark`, `hull`, `pearl`, `brass`, `bronze`, `copper`, `teal`, `red`, `amber`, `rust`, `tan`, `wood`, `canvas`, `beige`, `paper`, `glass`, `deepglass`, `concrete`, `stone`, `moss`, `sand`, `fabric`) each with `hi`, `base`, `shade`; plus `signal`, `story`, `screen`, `skin`, `note`, `brand`, `cloth`.
- `<Bev t="rect|path|circle|ellipse|polygon" c="steel" ...shape attrs />` draws the shade layer offset down right, the highlight offset up left, and the base on top. This is how every solid form is made.
- `<Slab x y w h k c />` a chamfered box (cut corners). Use it instead of rounded rects.
- Surface detail (greebles): `<Seams>` panel lines, `<Rivets>`, `<Vent>` louvres, `<Greeble>` clusters of small boxes, `<Lights>` rows of status lights, `<Toggles>` console button banks, `<Cable>` thick cable runs.
- Wear: `<Grime>` dark streaks and `<Scuff>` bright scratches. Every prop and ship needs both detail and wear (the linter enforces it).
- Scene helpers (reuse, do not rewrite): `<Screen>` a lit display with a clamped title and rows of text, `<Glyph k="cog|gear|chain|star|drop|wave|eye|env|badge|coin|key">` small emblems, `<Bust>` a three tone head and shoulders figure, `<CrateBox>` a chamfered cargo box. `SCR` holds the four screen colorways (cyan, amber, green, red).
- Helpers: `ngon(cx,cy,rx,ry,n)` for faceted discs and hexes, `pts([[x,y],...])` for polygon points, `rng(seed)` for deterministic variation.
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

- **Silhouette first.** Squint: can you tell a fuel rig from a locker bank? Different silhouettes for different jobs. Apply the three second rule.
- **Chamfer, don't round.** Build bodies with `<Slab>`, polygons and `ngon` facets. Rounded rects over 2 units are rejected by the linter.
- **Greeble and wear every surface** with `<Seams>`, `<Rivets>`, `<Vent>`, `<Greeble>`, `<Lights>`, `<Toggles>`, `<Grime>`, `<Scuff>`.
- **Affordance:** anything the player can use has at least one emissive element (screen, lamp, status light). Dead set dressing does not.
- **Text on art:** quote signage from the description; size it with 0.6 x fontSize per character; keep headline text at 2.4 or larger and fine print at 1.6 or larger. `lint-art.js` checks fit.
- **State:** if the object changes (locked then cleared, damaged then repaired), draw both states.
- **Wear:** add one or two marks of age (scorch, patch, scratch, sticky note). Keep them flat shapes.
- **Animation:** at most one to three small loops (`ship-blink`, `ship-engine`, `holo-flicker`, `prop-scan`).

### The reusable prop library (Coruscant and beyond)

Before drawing a new object, look here. Most objects are an existing kind with a new variant. A `variant` is a key into a small config table inside the component (screen text, colorway, state), so adding one is a few lines, not a new drawing. To add a variant, extend that kind's table (for example `CONSOLE_CFG`, `KIOSK_CFG`, `TAXI_CFG`, `BOARD_LIST`) and set `propVariant` on the object.

| Kind | Footprint (tiles) | Variants |
|---|---|---|
| `console` | 2x2 | `customs`, `zillow`, `newsfeed`, `exchange`, `dispatch`, `siphon`, `manifest088`, `crane`, `radio`, `freight`, `fuel`, `pit`, `surveil`, `derelict`, `oza`, `registry`, `vault`, `transmission`, `shipping`, `slush`, `exchange_bm`, `reclaim`, `induction`, `module_a`, `module_b`, `warrant`, `rook`, `hnn_official`, `frost`, `syndicate`, `substation`, `assembly`, `republic_old`, `architect` |
| `kiosk` | 3x2 | `hnn`, `senate`, `manifest`, `drinks`, `refuel`, `collapsed`, `slicer` |
| `airtaxi` | 2x2 | `clean`, `worn`, `cracked`, `dark`, `jury`, `ancient`, `scorched`, `rigged`, `official`, `private` |
| `comm_relay` | 2x2 | `node`, `hub`, `puck` |
| `server_stack` | 2x3 | `archive`, `black_market`, `republic` |
| `board` | 3x2 | `baylog`, `departures`, `bulletin`, `warrants`, `patrol`, `manifest`, `prisoners`, `cellog`, `wanted`, `analysis`, `faction`, `betting`, `register`, `ops`, `clipboard`, `resistance` |
| `sign_array` | 4x2 | `vendor`, `exhaust` |
| `shopfront` | 4x2 | `sallys`, `goods` |
| `apt_door` | 2x2 | `jon`, `dexter`, `trex` |
| `wall_marks` | 3x2 | `free`, `tags`, `drain`, `alley`, `blacksun`, `stamp` |
| `skyline` | 4x2 | `promenade`, `lanes`, `viewport` |
| `elevator_door` | 2x2 | (none) |
| `datapad_table` | 2x2 | `jon`, `lounge`, `card`, `warm`, `logbook`, `canister` |
| `crate_stack` | 3x2 | `agri`, `weapons`, `syndicate`, `arms`, `arms_cache`, `locker`, `stash`, `false_panel`, `ruin`, `lockbox`, `hidden`, `resist`, `survey` |
| `container_stack` | 4x2 | (none) |
| `cargo_container` | 3x2 | (none) |
| `drum_array` | 3x2 | (none) |
| `hab_block` | 4x3 | (none) |
| `evidence_locker` | 3x2 | (none) |
| `weapon_rack` | 3x2 | `vibro`, `pauldron` |
| `medic_crate` | 2x2 | (none) |
| `scrap_bin` | 2x2 | (none) |
| `fuel_hose` | 2x2 | (none) |
| `storage_alcoves` | 3x2 | (none) |
| `archive_cabinet` | 2x2 | `dossier`, `sealed`, `minutes`, `ledger` |
| `workbench` | 3x2 | `slicing`, `arms` |
| `cargo_lift` | 3x2 | (none) |
| `vault_door` | 3x3 | (none) |
| `security_gate` | 3x2 | (none) |
| `junction_box` | 2x2 | `csf`, `rail`, `vent` |
| `leaking_pipe` | 3x2 | `plasma`, `coolant` |
| `pressure_valve` | 2x2 | `a`, `b`, `c`, `refinery` |
| `steam_vent` | 2x2 | (none) |
| `access_hatch` | 2x2 | `crawl`, `panel`, `sealed`, `ancient` |
| `scanner_arch` | 3x2 | `customs`, `platform` |
| `damper_array` | 3x2 | (none) |
| `power_tap` | 2x2 | (none) |
| `drop_shaft` | 3x2 | (none) |
| `catwalk_junction` | 3x3 | (none) |
| `floor_grate` | 2x2 | (none) |
| `drain_channel` | 3x2 | (none) |
| `support_pillar` | 2x3 | (none) |
| `radiator` | 3x2 | (none) |
| `fluid_slick` | 3x2 | (none) |
| `crane_arm` | 4x3 | (none) |
| `landing_beacon` | 2x2 | (none) |
| `ceiling_tap` | 2x3 | (none) |
| `tactical_table` | 3x3 | `war`, `conquest`, `drill`, `bador` |
| `vendor_stall` | 3x2 | `fruit`, `droid_repair`, `caf` |
| `gorg_spit` | 3x2 | (none) |
| `booth` | 3x2 | `private`, `corner`, `senators`, `detention`, `flight`, `curtain` |
| `guard_post` | 3x2 | (none) |
| `interrogation_rig` | 3x2 | (none) |
| `ceremony_dais` | 3x2 | (none) |
| `monitor_wall` | 4x2 | (none) |
| `roster_wall` | 3x2 | (none) |
| `trophy_wall` | 4x2 | (none) |
| `duel_ring` | 3x3 | (none) |
| `arena_ring` | 5x4 | (none) |
| `pit_gate` | 3x2 | `pit`, `droid` |
| `rail_run` | 4x2 | (none) |
| `fighter_altar` | 2x2 | (none) |
| `kyber_cluster` | 3x2 | `cavern` |
| `survey_marker` | 2x2 | (none) |
| `containment_seal` | 3x2 | (none) |
| `ruin_stone` | 3x2 | (none) |
| `outcast_camp` | 4x3 | (none) |
| `lux_skiff` | 4x3 | (none) |
| `speeder_wreck` | 4x2 | (none) |
| `speeder_bay` | 3x2 | (none) |
| `fountain` | 3x2 | (none) |
| `scorch_wall` | 3x2 | (none) |
| `sentry_post` | 3x2 | (none) |
| `maglev_crane` | 3x3 | (none) |
| `capacitor_bank` | 3x3 | (none) |
| `scan_wreck` | 4x2 | (none) |
| `crater_glass` | 4x3 | (none) |
| `rebreather_rack` | 3x2 | (none) |
| `sentinel_droid` | 2x3 | (none) |
| `hypercore` | 3x3 | (none) |
| `bridge_console` | 4x2 | (none) |

Reference set pieces: `PropFuelRig` (silhouette and grime), `PropImpoundDoor` (text and hazard), `PropDriveCradle` (tags and state), `PropForgeBar` (written detail), `PropTransitPod` (two subjects in one footprint).

---

## 8. Ship and vehicle design

- **View:** plan (top down), bow pointing anywhere that suits the pad. Landing pad marking and soft floor shadow included in the sprite.
- **Construction:** faceted polygon hulls with `<Bev>`; panel seams, `<Greeble>` clusters, vents and turrets; one faceted cockpit canopy (`glass` or `deepglass`); running lights (red port, green starboard) and `<Glow>` engine exhausts. Real lore silhouettes: see section 1b.
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
| Build forms with `<Bev>` and `<Slab>` from the ART palette | Use gradients, blur filters, pattern fills |
| Chamfer corners, greeble surfaces, add wear | Use rounded pills, clean factory surfaces, cute proportions |
| Start from a strong silhouette in an iconic shape | Start from detail |
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
3. `node .claude/tools/lint-art.js` must pass (flat construction, palette, text fit, scale, no pill shapes, surface detail and wear).
4. `node .claude/tools/validate-world.js --zone <id> --strict` must pass (placement, reachability, registries).
5. `node .claude/tools/style-sheet.js --props <kinds> --ships <kinds> --accent <zone accent> --floor <zone floor>` and look at the PNG. The new art must look like the same game as the core row.
6. `node .claude/tools/zone-snapshot.js <planet> <zone> x,y x,y` and look at the scene at 1x.
7. The Art Director signs off.

---

## 15. Legacy upgrade path and style changelog

**Legacy art** is anything still in the original small outline style: the 28 x 28 line icons in `WorldObjectSprite` and the `iconKind` objects. Every world object on Coruscant and Kuat is now set piece art, so `validate-world.js` reports no legacy icons. They already receive the engine lighting pass, so they sit acceptably, but they are small and dim. Upgrade rule: when you touch a zone, convert its objects to set piece art (`propArt`) in the same change.

**Changelog**

- **v4:** All 199 Coruscant world objects and the 19 remaining Kuat (Bador and Zora IV) objects rebuilt as set pieces from a reusable library of 81 kinds (section 7). Kit gained the `concrete`, `stone`, `moss`, `sand` and `fabric` materials, extra neon and signal colors, and the shared `Screen`, `Glyph`, `Bust` and `CrateBox` helpers. The validator now also checks that every `zone.doors[]` entry sits on a door tile (three Coruscant exits had silently never worked).
- **v3:** Star Wars design language (section 1b) written from the franchise's own principles and Old Republic lore. Palette made weathered and muted. Kit gained `Slab`, `Seams`, `Rivets`, `Vent`, `Greeble`, `Lights`, `Toggles`, `Grime`, `Scuff`, `Cable`, `ngon`. All ships and objects redrawn: the Valor cruiser now follows its lore (bulbous hull, command tower, side hangars, gun batteries, seven thrusters), the freighter is a Corellian saucer with cockpit tube and prong, consoles are chunky and greebled. Large props and ships no longer get the engine outline. Linter gained no pill shapes (S7) and used future detail and wear (S8) rules.
- **v2:** Added the ART palette kit and shaded building blocks. Added the engine wide lighting pass (ink outline, zone rim light, contact shadows) applied to characters, the player, objects and ships. Rebuilt all KDY ships and objects in this style. Added `lint-art.js` and `style-sheet.js`.
- **v1:** Original look: flat portraits, pixel combat sprites, dim accent line icons, no shared lighting.

Future candidates: apply the lighting pass to tactical enemy sprites, redraw legacy line icons as set pieces, add a shared portrait palette helper.


## v5 changelog: Kuati Forward Directorate Hub (Bador)

- 16 new prop kinds: `landing_pad`, `thoroughfare`, `hq_dome`, `floor_inlay` (backdrop ground pieces), `bacta_pod`, `repulsor_crane`, `robotics_bench`, `weapon_bench`, `target_range`, `fuel_diag_terminal`, `sanctum_holo`, `command_board`, `kuati_terminal` (variants `security`, `manifest`, `ledger`), `facility_sign` (variants `medic`, `goods`, `trike`, `barracks`, `hq`), `kuati_banner`, `terminal_bank`.
- Backdrop props (`backdrop: true` in PROP_DEFS) are large ground level pieces that sit under other props, NPCs and doors. The validator skips footprint overlap checks for them.
- Kuati palette, used for noble and command architecture: alabaster `ART.pearl`, slate blue `ART.deepglass`, burnished gold `ART.brass`, cyan holo light `ART.signal.cyan`. Industrial and manufacturing areas keep the amber, rust and hazard stripe palette.
- 11 new NPC portrait kinds: `k_series_droid`, `ge3_protocol`, `binary_loader`, `gnk_power`, `kuati_astromech`, `zabrak_techwright`, `devaronian_inspector`, `nautolan_engineer`, `kdy_contractor`, `cyborg_mechanic`, `kuati_officer`. `kdy_commander` was redrawn as Commander Vael (slate blue coat, alabaster epaulets, gold clasps, cyan cybernetic optic).


## v6 changelog: Senatorial Sky-Lounges

- 13 new prop kinds: `skyline_vista` (backdrop, variants `plain`, `hud`), `crest_inlay` (backdrop), `repulsor_chandelier` (backdrop, animated float), `conversation_pit`, `news_column`, `obsidian_bar`, `holo_fountain`, `decanter_pedestal`, `terrarium`, `brass_register`, `macro_binocular`, `glass_overhang`, `tint_console`.
- New `ART.sky` materials for dusk: amber, ember, rose, plum, violet, indigo, haze, spire, spireHi. A gradient sky is built from flat bands, per the house style.
- Palette for the Senate District: deep garnet velvet (`ART.red` and `ART.fabric`), electrum and gold leaf (`ART.brass`), obsidian (`ART.dark`), royal azure (`ART.deepglass`), warm sandstone (`ART.sand`), transparisteel blue tint (`ART.glass`).
- New portrait kinds: `senator_horace`, `kuati_baroness`, `sis_agent`, `twilek_diplomat`, `alsakan_aristocrat`, `czerka_executive`, `lux_sommelier`, `sv_tray_droid`, `sweep_drone`, `black_sun_envoy`.
- New keyframes: `skyline-lane`, `skyline-lane-rev`, `skyline-fly`, `skyline-fly-rev`, `cast-sweep`.
