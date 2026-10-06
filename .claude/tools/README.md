# Tools

Automated enforcement for `.claude/DESIGN_STANDARDS.md`. Setup once:

```
cd .claude/tools && npm install
```

| Tool | Purpose |
|---|---|
| `lint-art.js` | Style linter for the SVG art: flat construction only, every color in the ART palette, text fits, viewBox matches footprint. Enforces `STYLE_GUIDE.md`. |
| `style-sheet.js` | Renders new props, ships and NPCs next to the core characters under the same lighting for a consistency review (`--props`, `--ships`, `--npcs`, `--accent`, `--floor`). |
| `validate-world.js` | Compiles the game and validates every zone: entities on reachable floor tiles, doors (every `zone.doors[]` entry must sit on a door tile), portrait, prop and ship registries, footprint overlaps (props flagged `backdrop` in PROP_DEFS are exempt), objects that only have the legacy tiny icon. Flags `--zone`, `--planet`, `--strict` (warnings fail), `--quiet`. Exit 0 pass, 1 findings, 2 does not compile. |
| `zone-snapshot.js` | Boots the real game in headless Chromium and screenshots a zone at chosen player positions at true gameplay scale. Always open and look at the PNGs. `--flags a,b` starts the game with those quest flags set, so you can shoot a zone with add on packages installed. |

Run lint-art, validate-world and style-sheet before every push that changes zones, objects, ships, portraits, or art. New content must pass `validate-world.js --zone <id> --strict`.

`snapshots/` and `node_modules/` are git ignored.
