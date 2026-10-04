#!/usr/bin/env node
/*
 * validate-world.js: automated enforcement of .claude/DESIGN_STANDARDS.md
 *
 * Usage (from repo root or anywhere):
 *   node .claude/tools/validate-world.js                 all zones, report only
 *   node .claude/tools/validate-world.js --planet kuat   one planet
 *   node .claude/tools/validate-world.js --zone kdy_landing_bay
 *   node .claude/tools/validate-world.js --strict        warnings also fail (use on NEW content)
 *   node .claude/tools/validate-world.js --quiet         errors and summary only
 *
 * Exit code: 0 clean, 1 findings that fail the run, 2 the game file does not compile.
 * Requires: cd .claude/tools && npm install
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const STRICT = flag('strict'), QUIET = flag('quiet');
const onlyPlanet = opt('planet'), onlyZone = opt('zone');

let Babel;
try { Babel = require('@babel/standalone'); } catch (e) { console.error('Run `npm install` in .claude/tools first.'); process.exit(2); }

const SRC = path.resolve(__dirname, '../../star-wars-rpg.jsx');
const code = fs.readFileSync(SRC, 'utf8');
let out;
try { out = Babel.transform(code, { presets: ['react'] }).code; }
catch (e) { console.error('GAME DOES NOT COMPILE (this blanks the whole screen in the browser):\n' + e.message); process.exit(2); }

const exp = `;globalThis.__X = { PLANETS,
  PROP_DEFS: typeof PROP_DEFS !== 'undefined' ? PROP_DEFS : {},
  SHIP_DEFS: typeof SHIP_DEFS !== 'undefined' ? SHIP_DEFS : {},
  SPRITES: typeof WORLD_OBJECT_SPRITES !== 'undefined' ? WORLD_OBJECT_SPRITES : {},
  iconFor: typeof getWorldObjIconKind !== 'undefined' ? getWorldObjIconKind : () => null };`;
const stub = new Proxy(function () {}, { get: (t, k) => (k === 'memo' ? (f) => f : stub), apply: () => stub, construct: () => stub });
const ctx = { React: stub, ReactDOM: stub, window: stub, document: stub,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, console, setTimeout, clearTimeout, setInterval, clearInterval };
ctx.globalThis = ctx;
try { vm.runInNewContext(out + exp, ctx); } catch (e) { /* trailing ReactDOM call is stubbed; ignore */ }
const X = ctx.__X;
if (!X || !X.PLANETS) { console.error('Could not load PLANETS from the game file.'); process.exit(2); }

function bodyOf(name) {
  const i = code.indexOf('function ' + name);
  const c = code.indexOf('const ' + name + ' = ');
  const s = i >= 0 ? i : c;
  if (s < 0) return '';
  const rest = code.slice(s + 10);
  const m = rest.search(/\n(?:function|const|class) [A-Za-z_]/);
  return code.slice(s, m < 0 ? undefined : s + 10 + m);
}
const kindsIn = (name, re) => new Set([...bodyOf(name).matchAll(re)].map((m) => m[1]));
const portraitKinds = kindsIn('NpcPortrait', /kind === '([a-z0-9_]+)'/g);
const spriteKinds = kindsIn('WorldObjectSprite', /kind === '([a-z0-9_]+)'/g);
const propCases = kindsIn('PropArt', /case '([a-z0-9_]+)'/g);
const shipKinds = kindsIn('ShipSprite', /kind === '([a-z0-9_]+)'/g);

const errors = [], warns = [], infos = [];
const E = (z, m) => errors.push(`[${z}] ${m}`);
const W = (z, m) => warns.push(`[${z}] ${m}`);
const I = (z, m) => infos.push(`[${z}] ${m}`);

const allZones = {};
for (const [pid, p] of Object.entries(X.PLANETS)) for (const [zid, z] of Object.entries(p.zones || {})) allZones[zid] = { pid, z };
const idSeen = {};
let zoneCount = 0, objCount = 0, propCount = 0, legacyCount = 0, shipCount = 0;

for (const [zid, { pid, z }] of Object.entries(allZones)) {
  if (onlyPlanet && pid !== onlyPlanet) continue;
  if (onlyZone && zid !== onlyZone) continue;
  zoneCount++;
  const tag = `${pid}/${zid}`;
  let g;
  try { g = z.buildMap(); } catch (e) { E(tag, 'buildMap() threw: ' + e.message); continue; }
  const tile = (x, y) => g[y]?.[x]?.type;
  const walk = (x, y) => { const t = tile(x, y); return t === 'floor' || t === 'door'; };

  const seen = new Set();
  const sp = z.spawnPos || { x: 0, y: 0 };
  if (!walk(sp.x, sp.y)) E(tag, `spawnPos (${sp.x},${sp.y}) is not walkable`);
  const q = [[sp.x, sp.y]]; seen.add(sp.x + ',' + sp.y);
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = x + dx + ',' + (y + dy);
      if (!seen.has(k) && walk(x + dx, y + dy)) { seen.add(k); q.push([x + dx, y + dy]); }
    }
  }

  // ---- entity placement (rule: never on a wall, always reachable) ----
  for (const [kind, arr] of [['object', z.worldObjects], ['npc', z.npcs], ['collectible', z.collectibles]]) {
    for (const o of arr || []) {
      if (o.id) { if (idSeen[o.id]) E(tag, `id "${o.id}" duplicates ${idSeen[o.id]}`); else idSeen[o.id] = tag; }
      const t = tile(o.x, o.y);
      if (t !== 'floor') E(tag, `${kind} "${o.id}" at (${o.x},${o.y}) is on a "${t}" tile. Movement into non-floor tiles is blocked before interaction, so it can never be used.`);
      else if (!seen.has(o.x + ',' + o.y)) E(tag, `${kind} "${o.id}" at (${o.x},${o.y}) is unreachable from spawn.`);
    }
  }
  for (const n of z.npcs || []) if (!portraitKinds.has(n.kind)) E(tag, `npc "${n.id}" kind "${n.kind}" is not registered in NpcPortrait(); it renders nothing.`);

  // ---- doors ----
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    if (g[y][x].type === 'door' && !(z.doors || []).some((d) => d.x === x && d.y === y)) E(tag, `door tile (${x},${y}) has no entry in zone.doors[]`);
  }
  for (const d of z.doors || []) {
    if (tile(d.x, d.y) !== 'door') E(tag, `zone.doors[] entry (${d.x},${d.y}) is on a "${tile(d.x, d.y)}" tile, not a door tile. The engine only travels through tiles of type door, so this exit never works.`);
    const tz = allZones[d.targetZone];
    if (!tz) { E(tag, `door (${d.x},${d.y}) targets unknown zone "${d.targetZone}"`); continue; }
    let tg; try { tg = tz.z.buildMap(); } catch (e) { continue; }
    const tt = tg[d.targetPos?.y]?.[d.targetPos?.x]?.type;
    if (tt !== 'floor') E(tag, `door (${d.x},${d.y}) lands on "${tt}" at (${d.targetPos?.x},${d.targetPos?.y}) in ${d.targetZone}`);
    if (tz.pid === pid && !(tz.z.doors || []).some((b) => b.targetZone === zid)) E(tag, `door to ${d.targetZone} has no return door (links must be symmetric)`);
  }

  // ---- visual standards ----
  const rects = [];
  for (const o of z.worldObjects || []) {
    objCount++;
    const hasProp = !!o.propArt;
    const hasUnique = !!X.SPRITES[o.id];
    const kind = o.iconKind ?? X.iconFor(o.id);
    const hasIcon = !!kind && spriteKinds.has(kind);
    if (!o.description && !o.autoCodex) W(tag, `object "${o.id}" has no description (nothing to read, nothing to design from)`);
    if (hasProp) {
      propCount++;
      const d = X.PROP_DEFS[o.propArt];
      if (!d) { E(tag, `object "${o.id}" propArt "${o.propArt}" has no PROP_DEFS footprint`); continue; }
      if (!propCases.has(o.propArt)) E(tag, `object "${o.id}" propArt "${o.propArt}" has no case in PropArt(); renders nothing`);
      rects.push({ id: o.id, kind: 'prop', x0: o.x - d.ax, y0: o.y - d.ay, x1: o.x - d.ax + d.w - 1, y1: o.y - d.ay + d.h - 1, ox: o.x, oy: o.y });
    } else if (hasUnique || hasIcon) {
      legacyCount++;
      W(tag, `object "${o.id}" uses only the legacy 26px icon ("${hasUnique ? 'unique sprite' : kind}"). Upgrade to propArt so it is readable at gameplay scale.`);
    } else {
      E(tag, `object "${o.id}" has NO visual art (no propArt, no sprite). It renders as an invisible pulse box.`);
    }
  }
  for (const s of z.ships || []) {
    shipCount++;
    const d = X.SHIP_DEFS[s.kind];
    if (!d) { E(tag, `ship "${s.id}" kind "${s.kind}" has no SHIP_DEFS footprint`); continue; }
    if (!shipKinds.has(s.kind)) E(tag, `ship "${s.id}" kind "${s.kind}" has no branch in ShipSprite(); renders nothing`);
    if (!s.description) W(tag, `ship "${s.id}" has no description`);
    rects.push({ id: s.id, kind: 'ship', x0: s.x, y0: s.y, x1: s.x + d.w - 1, y1: s.y + d.h - 1 });
    for (let yy = s.y; yy < s.y + d.h; yy++) for (let xx = s.x; xx < s.x + d.w; xx++) {
      if (tile(xx, yy) !== 'ship_hull') { E(tag, `ship "${s.id}" footprint tile (${xx},${yy}) is "${tile(xx, yy)}", not ship_hull. Call carveShips(g, this.ships) in buildMap().`); xx = 1e9; yy = 1e9; }
    }
  }
  const inR = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
  for (const r of rects) {
    if (r.x0 < 0 || r.y0 < 0 || r.x1 >= z.width || r.y1 >= z.height) E(tag, `${r.kind} "${r.id}" footprint leaves the map`);
    for (const t of rects) if (r.id < t.id) {
      const sameTile = r.kind === 'prop' && t.kind === 'prop' && r.ox === t.ox && r.oy === t.oy;
      if (!sameTile && !(r.x1 < t.x0 || t.x1 < r.x0 || r.y1 < t.y0 || t.y1 < r.y0)) E(tag, `${r.kind} "${r.id}" footprint overlaps ${t.kind} "${t.id}"`);
    }
    for (const c of z.collectibles || []) if (inR(r, c.x, c.y)) E(tag, `${r.kind} "${r.id}" hides collectible "${c.id}"`);
    for (const d of z.doors || []) if (inR(r, d.x, d.y)) E(tag, `${r.kind} "${r.id}" covers door (${d.x},${d.y})`);
    for (const o of z.worldObjects || []) if (o.id !== r.id && inR(r, o.x, o.y) && !(r.kind === 'prop' && o.x === r.ox && o.y === r.oy)) E(tag, `${r.kind} "${r.id}" covers the tile of object "${o.id}"`);
    for (const n of z.npcs || []) if (inR(r, n.x, n.y)) {
      if (r.kind === 'ship') E(tag, `ship "${r.id}" covers npc "${n.id}"`); else I(tag, `prop "${r.id}" sits behind npc "${n.id}" (fine if intentional)`);
    }
  }
}

const print = (title, arr) => { if (arr.length) { console.log(`\n${title} (${arr.length})`); arr.forEach((m, i) => console.log(`  ${i + 1}. ${m}`)); } };
print('ERRORS', errors);
if (!QUIET) { print('WARNINGS', warns); print('NOTES', infos); }
console.log(`\nChecked ${zoneCount} zones, ${objCount} objects (${propCount} with set piece art, ${legacyCount} legacy icon only), ${shipCount} ships.`);
console.log(`${errors.length} errors, ${warns.length} warnings.`);
const fail = errors.length > 0 || (STRICT && warns.length > 0);
console.log(fail ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(fail ? 1 : 0);
