#!/usr/bin/env node
/*
 * lint-art.js: enforces .claude/STYLE_GUIDE.md on the SVG art in star-wars-rpg.jsx.
 *
 *   node .claude/tools/lint-art.js            lint all art, report
 *   node .claude/tools/lint-art.js --quiet    errors and summary only
 *
 * Exit 0 clean, 1 style errors. Run it with validate-world.js before every push that touches art.
 *
 * Rules (errors unless noted):
 *  S1  No gradients, filters, patterns or masks inside art functions. Forms are flat three tone shapes (use <Bev>).
 *      The engine adds outline, rim light and shadow (spriteFx), so art must not bake its own.
 *  S2  No outlined forms: a shape with a fill must not also carry a visible stroke wider than 1.2 (lines and cables are fine).
 *  S3  Prop and ship viewBox must equal the registered footprint times 32 (PROP_DEFS / SHIP_DEFS).
 *  S4  Literal text must fit inside the sprite and be at least 1.6 units tall (0.6 * fontSize per character).
 *  S5  No blur style glows or full viewport animations (world-obj-pulse, scanDown) inside props and ships.
 *  S6  Every literal color in art must be a color in the ART kit (palette). Add new colors to the kit deliberately.
 */
const fs = require('fs');
const path = require('path');
const QUIET = process.argv.includes('--quiet');
const code = fs.readFileSync(process.env.LINT_SRC || path.resolve(__dirname, '../../star-wars-rpg.jsx'), 'utf8');

function bodyOf(name) {
  const m = new RegExp('\\n(?:function|const) ' + name + '\\b').exec(code);
  if (!m) return '';
  const s = m.index + 1;
  const rest = code.slice(s + 10);
  const n = rest.search(/\n(?:function|const|class) [A-Za-z_]/);
  return code.slice(s, n < 0 ? undefined : s + 10 + n);
}
const errors = [], warns = [];
const E = (a, m) => errors.push(`[${a}] ${m}`);
const W = (a, m) => warns.push(`[${a}] ${m}`);

const artFns = [...code.matchAll(/\nfunction ((?:Prop|Ship)[A-Z][A-Za-z]*)\(/g)].map((m) => m[1])
  .filter((n) => !['PropArt', 'PropShadow', 'PropDefs'].includes(n));
const legacyFns = ['NpcPortrait', 'EnemySprite', 'DecorIcon', 'PlayerMarker', 'CollectibleIcon', 'WorldObjectSprite'];
const kitPalette = new Set();
const kit = code.slice(code.indexOf('const ART = {'), code.indexOf('};', code.indexOf('const ART = {')));
for (const m of kit.matchAll(/#[0-9A-Fa-f]{6}/g)) kitPalette.add(m[0].toUpperCase());

// S1 across everything that draws
for (const name of [...artFns, ...legacyFns]) {
  const b = bodyOf(name);
  for (const m of b.matchAll(/<linearGradient|<radialGradient|<filter|<pattern|<mask\b|\bfilter=|\bmask=|(?:fill|stroke)=(?:"|\{`)url\(#/g)) {
    const line = b.slice(0, m.index).split('\n').length;
    E(name, `S1 baked ${m[0].replace(/[<=]/g, '')} (line ${line} of the function). Use flat <Bev> tones; the engine adds the lighting.`);
    break;
  }
}

// element scan for S2, S4, S5, S6 on new art
function elements(b) {
  const out = [], re = /<(rect|path|circle|ellipse|polygon|text|Bev)\b/g; let m;
  while ((m = re.exec(b))) {
    let j = m.index + m[0].length, depth = 0, q = null;
    for (; j < b.length; j++) {
      const ch = b[j];
      if (q) { if (ch === q) q = null; } else if (ch === '"' || ch === '`') q = ch;
      else if (ch === '{') depth++; else if (ch === '}') depth--;
      else if (depth === 0 && ch === '>') break;
    }
    out.push({ tag: m[1], raw: b.slice(m.index, j + 1), end: j + 1 });
  }
  return out;
}
const attr = (raw, n) => { const r = new RegExp('\\b' + n + '=(?:"([^"]*)"|\\{([^}]*)\\})').exec(raw); return r ? (r[1] ?? r[2]) : null; };

for (const name of artFns) {
  const b = bodyOf(name);
  const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(b);
  const W_ = vb ? +vb[1] : 0, H_ = vb ? +vb[2] : 0;
  if (/world-obj-pulse|scanDown/.test(b)) E(name, 'S5 uses world-obj-pulse or scanDown (box shadow pulse / viewport scroll). Use ship-engine, ship-blink, holo-flicker or prop-scan.');
  for (const el of elements(b)) {
    const fill = attr(el.raw, 'fill'), stroke = attr(el.raw, 'stroke'), sw = parseFloat(attr(el.raw, 'strokeWidth') || '1');
    if (el.tag !== 'text' && el.tag !== 'Bev' && fill && fill !== 'none' && !fill.includes('{') && stroke && stroke !== 'none' && sw > 1.2 && !/^#?[0-9a-f]{0}$/.test(stroke))
      E(name, `S2 outlined form (${el.tag}, stroke ${stroke} width ${sw}). Do not outline forms, the engine adds the outline.`);
    if (el.tag === 'Bev' && stroke) E(name, 'S2 <Bev> must not carry a stroke.');
    if (el.tag === 'text') {
      const after = b.slice(el.end, b.indexOf('</text>', el.end));
      const fs_ = parseFloat(attr(el.raw, 'fontSize') || '0');
      if (fs_ && fs_ < 1.6) E(name, `S4 text at fontSize ${fs_} is below 1.6 and unreadable ("${after.slice(0, 24)}").`);
      if (fs_ && W_ && !/[{}<]/.test(after)) {
        const w = after.length * 0.6 * fs_;
        const x = parseFloat(attr(el.raw, 'x') || '0'), anchor = attr(el.raw, 'textAnchor') || 'start';
        const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
        const x1 = x0 + w;
        if (x0 < -0.5 || x1 > W_ + 0.5) E(name, `S4 text "${after.slice(0, 28)}" runs past the sprite edge (${x0.toFixed(0)} to ${x1.toFixed(0)} of ${W_}).`);
      }
    }
  }
}
// S3 viewBox vs footprint
const propDefs = {}, shipDefs = {};
for (const m of code.matchAll(/^\s{2}(\w+):\s+\{ w: (\d+), h: (\d+)/gm)) propDefs[m[1]] = { w: +m[2], h: +m[3] };
const shipBlock = code.slice(code.indexOf('const SHIP_DEFS = {'), code.indexOf('};', code.indexOf('const SHIP_DEFS = {')));
for (const m of shipBlock.matchAll(/(\w+):\s+\{ w: (\d+),\s+h: (\d+)/g)) shipDefs[m[1]] = { w: +m[2], h: +m[3] };
function checkMap(arrBody, re, defs, label) {
  for (const m of arrBody.matchAll(re)) {
    const kind = m[1], comp = m[2], d = defs[kind];
    if (!d) { E(comp, `S3 kind "${kind}" has no footprint registered`); continue; }
    const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(bodyOf(comp));
    if (!vb) { E(comp, 'S3 no viewBox'); continue; }
    if (+vb[1] !== d.w * 32 || +vb[2] !== d.h * 32) E(comp, `S3 ${label} viewBox ${vb[1]}x${vb[2]} does not match footprint ${d.w}x${d.h} tiles (${d.w * 32}x${d.h * 32}).`);
  }
}
checkMap(bodyOf('PropArt'), /case '(\w+)': return <(Prop\w+)/g, propDefs, 'prop');
checkMap(bodyOf('ShipSprite'), /kind === '(\w+)'\) return <(Ship\w+)/g, shipDefs, 'ship');
const offSet = new Map();
for (const name of artFns) {
  for (const m of bodyOf(name).matchAll(/#[0-9A-Fa-f]{6}\b/g)) {
    const h = m[0].toUpperCase();
    if (!kitPalette.has(h)) { if (!offSet.has(h)) offSet.set(h, []); offSet.get(h).push(name); }
  }
}
for (const [h, fns] of offSet) E([...new Set(fns)][0], `S6 color ${h} is not in the ART palette (used ${fns.length}x). Use a kit color, or add it to the ART kit on purpose.`);

const print = (t, a) => { if (a.length) { console.log(`\n${t} (${a.length})`); a.forEach((m, i) => console.log(`  ${i + 1}. ${m}`)); } };
print('STYLE ERRORS', errors); if (!QUIET) print('NOTES', warns);
console.log(`\nLinted ${artFns.length} prop and ship components plus ${legacyFns.length} core art functions.`);
console.log(errors.length ? `RESULT: FAIL (${errors.length} style errors)` : 'RESULT: PASS');
process.exit(errors.length ? 1 : 0);
