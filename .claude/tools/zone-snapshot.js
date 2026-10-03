#!/usr/bin/env node
/*
 * zone-snapshot.js: render a zone in the REAL game at real gameplay scale and save a PNG.
 * This is the "does it actually look right when you walk around?" check. Always LOOK at the PNG.
 *
 * Usage:
 *   node .claude/tools/zone-snapshot.js <planet> <zone> [x,y ...] [--out dir]
 *   node .claude/tools/zone-snapshot.js kuat kdy_landing_bay 9,6 24,12
 * Each x,y is a player position (the camera centers on it, 20x13 tiles visible). With no
 * positions it shoots the spawn point. PNGs land in .claude/tools/snapshots/ by default.
 *
 * Requires: cd .claude/tools && npm install   (uses the preinstalled Chromium; never run "playwright install")
 */
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = path.resolve(outIdx >= 0 ? args.splice(outIdx, 2)[1] : path.join(__dirname, 'snapshots'));
const [planet, zone, ...posArgs] = args;
if (!planet || !zone) { console.error('usage: zone-snapshot.js <planet> <zone> [x,y ...] [--out dir]'); process.exit(2); }

const Babel = require('@babel/standalone');
const { chromium } = require('playwright-core');
let code = fs.readFileSync(path.resolve(__dirname, '../../star-wars-rpg.jsx'), 'utf8');

// Patch the initial state so the game boots straight into the requested zone. Fail loudly if the
// source changed and a patch no longer applies, so this tool never silently shoots the wrong thing.
const patches = [
  ["useState('spaceport');", 'useState(window.__Z);'],
  ['useState(() => PLANETS.coruscant.zones.spaceport.buildMap());', 'useState(() => PLANETS[window.__P].zones[window.__Z].buildMap());'],
  ['useState({ x: 14, y: 10 });', 'useState(window.__POS || PLANETS[window.__P].zones[window.__Z].spawnPos);'],
  ["const [planetId, setPlanetId] = useState('coruscant');", 'const [planetId, setPlanetId] = useState(window.__P);'],
];
for (const [a, b] of patches) {
  if (!code.includes(a)) { console.error('Snapshot patch no longer matches the game source:\n  ' + a + '\nUpdate zone-snapshot.js to follow the refactor.'); process.exit(2); }
  code = code.replace(a, b);
}
const js = Babel.transform(code, { presets: ['react'] }).code;
const reactSrc = fs.readFileSync(path.join(__dirname, 'node_modules/react/umd/react.production.min.js'), 'utf8');
const domSrc = fs.readFileSync(path.join(__dirname, 'node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');
fs.mkdirSync(outDir, { recursive: true });
const htmlPath = path.join(outDir, '_harness.html');
fs.writeFileSync(htmlPath, `<html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#040408}</style></head><body><div id="root"></div><script>${reactSrc}</script><script>${domSrc}</script><script>${js.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const positions = posArgs.length ? posArgs.map((s) => { const [x, y] = s.split(',').map(Number); return { x, y }; }) : [null];
  const errors = [];
  for (const pos of positions) {
    const page = await browser.newPage({ viewport: { width: 700, height: 480 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(`window.__P=${JSON.stringify(planet)};window.__Z=${JSON.stringify(zone)};window.__POS=${JSON.stringify(pos)};`);
    await page.goto('file://' + htmlPath);
    await page.waitForTimeout(800);
    const file = path.join(outDir, `${zone}_${pos ? pos.x + '_' + pos.y : 'spawn'}.png`);
    await page.screenshot({ path: file, clip: { x: 16, y: 44, width: 660, height: 420 } });
    console.log('wrote ' + file);
    await page.close();
  }
  await browser.close();
  if (errors.length) { console.error('PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
})().catch((e) => { console.error(e.message); process.exit(1); });
