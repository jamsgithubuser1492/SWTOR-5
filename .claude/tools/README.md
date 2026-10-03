# Tools

Automated enforcement for `.claude/DESIGN_STANDARDS.md`. Setup once:

```
cd .claude/tools && npm install
```

| Tool | Purpose |
|---|---|
| `validate-world.js` | Compiles the game and validates every zone: entities on reachable floor tiles, doors, portrait, prop and ship registries, footprint overlaps, objects that only have the legacy tiny icon. Flags `--zone`, `--planet`, `--strict` (warnings fail), `--quiet`. Exit 0 pass, 1 findings, 2 does not compile. |
| `zone-snapshot.js` | Boots the real game in headless Chromium and screenshots a zone at chosen player positions at true gameplay scale. Always open and look at the PNGs. |

Run both before every push that changes zones, objects, ships, portraits, or art. New content must pass `validate-world.js --zone <id> --strict`.

`snapshots/` and `node_modules/` are git ignored.
