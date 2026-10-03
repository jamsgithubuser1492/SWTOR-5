#!/usr/bin/env node
/*
 * style-sheet.js: put new art next to the core game's characters, under the same engine lighting pass,
 * on a real floor color, so style drift is obvious. This is the consistency check for .claude/STYLE_GUIDE.md.
 *
 *   node .claude/tools/style-sheet.js --props fuel_rig,holo_table --ships valor_frame
 *   node .claude/tools/style-sheet.js --props forge_bar --accent #8A6A3A --floor #201A10 --zoom 1
 *   node .claude/tools/style-sheet.js --npcs kdy_shipwright,kdy_ring_sec
 *
 * Options: --props a,b  --ships a,b  --npcs a,b  --accent #hex  --floor #hex  --zoom N (default 2)  --out file.png
 * Writes a PNG (default .claude/tools/snapshots/style-sheet.png). Open it and compare. If the new art looks like
 * it came from a different game than the core row, it fails review.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const list = (n) => (opt(n, '') || '').split(',').filter(Boolean);
const accent = opt('accent', '#3A7AB0'), floor = opt('floor', '#141A20'), zoom = +opt('zoom', 2);
const out = path.resolve(opt('out', path.join(__dirname, 'snapshots', 'style-sheet.png')));
const Babel = require('@babel/standalone'), React = require('react'), RDS = require('react-dom/server');
const { chromium } = require('playwright-core');

let js = Babel.transform(fs.readFileSync(path.resolve(__dirname, '../../star-wars-rpg.jsx'), 'utf8'), { presets: ['react'] }).code
  + '\n;globalThis.__X={NpcPortrait,PlayerMarker,PropArt,ShipSprite,PROP_DEFS,SHIP_DEFS,spriteFx,ACTOR_SHADOW};';
const stub = new Proxy(function () {}, { get: () => stub, apply: () => stub, construct: () => stub });
const ctx = { React, ReactDOM: stub, window: stub, document: stub, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, console, setTimeout, clearTimeout, setInterval, clearInterval };
ctx.globalThis = ctx;
try { vm.runInNewContext(js, ctx); } catch (e) { /* trailing ReactDOM call is stubbed */ }
const X = ctx.__X; const h = React.createElement;
const html = (el) => RDS.renderToStaticMarkup(el);
const actor = (el) => `<div style="position:relative;width:48px;height:44px;display:flex;align-items:flex-end;justify-content:center"><div style="${Object.entries(X.ACTOR_SHADOW).map(([k, v]) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + ':' + (typeof v === 'number' && !['zIndex'].includes(k) ? v + 'px' : v)).join(';')}"></div><div style="position:relative;z-index:5;filter:${X.spriteFx(accent)}">${html(el)}</div></div>`;
const core = ['smuggler', 'jedi', 'republic_guard', 'mechanic', 'droid'].map((k) => [k, actor(h(X.NpcPortrait, { kind: k, accent }))]);
core.push(['player', actor(h(X.PlayerMarker, { accent, facing: 1 }))]);
const npcs = list('npcs').map((k) => [k, actor(h(X.NpcPortrait, { kind: k, accent }))]);
const big = (kind, def, el, size) => `<div style="position:relative;width:${def.w * 32}px;height:${def.h * 32}px;filter:${X.spriteFx(accent, size)}">${html(el)}</div>`;
const props = list('props').map((k) => [k, big(k, X.PROP_DEFS[k], h(X.PropArt, { kind: k, variant: k === 'terminal' ? 'engineering' : k === 'holo_table' ? 'fleet' : undefined }), 'prop')]);
const ships = list('ships').map((k) => [k, big(k, X.SHIP_DEFS[k], h(X.ShipSprite, { kind: k, accent }), 'ship')]);
const row = (title, items) => items.length ? `<div class="t">${title}</div><div class="r">${items.map(([n, g]) => `<div class="c"><div class="z">${g}</div><div>${n}</div></div>`).join('')}</div>` : '';
const page = `<html><body style="margin:0;background:${floor};color:#7A7F94;font:10px monospace;padding:12px"><style>@keyframes npc-blink{0%,100%{opacity:0}}@keyframes player-bob{0%,100%{transform:none}}@keyframes door-pulse{0%,100%{opacity:.7}}@keyframes lens-flicker{0%,100%{opacity:.7}}@keyframes ship-blink{0%,100%{opacity:.15}50%{opacity:1}}@keyframes ship-engine{0%,100%{opacity:.3}50%{opacity:.85}}@keyframes ship-spark{0%,100%{opacity:0}50%{opacity:1}}@keyframes holo-flicker{0%,100%{opacity:.8}50%{opacity:1}}@keyframes prop-scan{from{transform:translateY(0)}to{transform:translateY(26px)}}@keyframes twinkle{0%,100%{opacity:.2}50%{opacity:.9}}@keyframes ring-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes steam-rise{0%{opacity:0}}.t{margin:8px 0 4px;color:#A8ADC0}.r{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}.c{text-align:center}.z{zoom:${zoom};background:${floor};padding:4px}</style>${row('CORE GAME (reference)', core)}${row('NPCs under review', npcs)}${row('PROPS under review', props)}${row('SHIPS under review', ships)}</body></html>`;
fs.mkdirSync(path.dirname(out), { recursive: true });
const tmp = path.join(path.dirname(out), '_style_sheet.html'); fs.writeFileSync(tmp, page);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1500, height: 700 } });
  await p.goto('file://' + tmp); await p.waitForTimeout(300);
  await p.screenshot({ path: out, fullPage: true }); await b.close(); console.log('wrote ' + out);
})();
