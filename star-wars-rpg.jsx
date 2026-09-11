const { useState, useEffect, useCallback } = React;

function GlobalAnimations() {
  return (
    <style>{`
      @keyframes npc-sway { 0%,100%{transform:translateX(-50%) translateY(0) rotate(0deg);}50%{transform:translateX(-50%) translateY(-1.5px) rotate(0.6deg);} }
      @keyframes npc-blink { 0%,92%,100%{opacity:0;}94%,96%{opacity:1;} }
      @keyframes lens-flicker { 0%,100%{opacity:0.55;}50%{opacity:0.9;} }
      @keyframes tail-flick { 0%,100%{transform:rotate(0deg);}50%{transform:rotate(9deg);} }
      @keyframes lekku-sway-l { 0%,100%{transform:rotate(0deg);}50%{transform:rotate(-5deg);} }
      @keyframes lekku-sway-r { 0%,100%{transform:rotate(0deg);}50%{transform:rotate(5deg);} }
      @keyframes player-bob { 0%,100%{transform:translateY(0);}50%{transform:translateY(-1.5px);} }
      @keyframes ring-spin { from{transform:rotate(0deg);}to{transform:rotate(360deg);} }
      @keyframes collectible-bob { 0%,100%{transform:translateY(0);filter:drop-shadow(0 0 2px rgba(232,201,122,0.4));}50%{transform:translateY(-2px);filter:drop-shadow(0 0 5px rgba(232,201,122,0.85));} }
      @keyframes twinkle { 0%,100%{opacity:0.15;}50%{opacity:0.9;} }
      @keyframes door-pulse { 0%,100%{opacity:0.5;}50%{opacity:0.95;} }
      @keyframes steam-rise { 0%,100%{opacity:0;transform:translateY(0);}30%{opacity:0.7;}100%{transform:translateY(-10px);} }
      @keyframes traffic-drift { 0%{transform:translateX(-60px);opacity:0;}12%{opacity:0.9;}88%{opacity:0.9;}100%{transform:translateX(60px);opacity:0;} }
      @keyframes embers-drift { 0%{transform:translateY(0);opacity:0;}10%{opacity:0.9;}100%{transform:translateY(-320px);opacity:0;} }
      @keyframes mist-drift { 0%{transform:translateX(-20px);opacity:0;}20%{opacity:0.7;}100%{transform:translateX(20px);opacity:0;} }
    `}</style>
  );
}

const TILE = 32;
const VIEWPORT_COLS = 15;
const VIEWPORT_ROWS = 11;

function emptyGrid(w, h) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => ({ type: 'wall' })));
}
function carveRect(g, x1, y1, x2, y2, type = 'floor') {
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) { if (g[y]?.[x]) g[y][x] = { type }; }
}
function pt(g, x, y, type) { if (g[y]?.[x]) g[y][x] = { type }; }

const PLANETS = {
  coruscant: {
    id: 'coruscant', name: 'Coruscant', travelCost: 0, startZoneId: 'spaceport',
    description: 'Endless spires and skylanes. Someone up here has been burying the truth.',
    zones: {
      spaceport: {
        id: 'spaceport', name: 'Coruscant Spaceport', subtitle: 'Subsurface Level 2 · Docking Bay 14',
        width: 30, height: 22, spawnPos: { x: 14, y: 10 }, textureId: 'coruscant',
        accent: '#8FA6FF', accentGlow: 'rgba(143,166,255,0.25)', accentDim: '#3D4A80',
        floorColor: '#242840', floorAlt: '#2E3350', wallDark: '#0D0E16', wallLight: '#181B2C',
        bg: 'radial-gradient(circle at 30% 20%, #171A2C 0%, #0B0C14 70%)', ambient: 'traffic',
        decor: ['cargo_crate', 'pipe', 'neon_sign'],
        doors: [{ x: 29, y: 12, targetZone: 'market', targetPos: { x: 1, y: 10 }, label: 'Market District' }],
        npcs: [
          { id: 'vane', x: 24, y: 11, kind: 'republic_guard', label: 'Officer Vane',
            prompt: 'The officer scans your credentials. "Transit papers in order, but the manifest shows four crates unaccounted for. Walk me through your cargo."',
            choices: [
              { text: 'Show the correct papers. Everything is legitimate.', morality: 10, loyalty: { republic: 8 }, result: 'Vane nods. "Welcome to Coruscant. Move along."' },
              { text: 'Slip him a credit chip. No need to look too closely.', morality: -15, loyalty: { underworld: 10 }, result: 'He pockets it smoothly. "Nothing to declare. Have a pleasant stay."' },
            ],
          },
          { id: 'droid44', x: 13, y: 8, kind: 'droid', label: 'Pit Droid Unit 44',
            prompt: '"BEEP BOOP. Cargo secured. Ramp deployed. I have also catalogued seventeen new hull scuffs. Seventeen. Do humans not see the hull?"',
            choices: [
              { text: 'Tell it the scuffs give the ship character.', morality: 5, loyalty: {}, result: 'It pauses for 2.4 seconds. "Character. Processing. Logged."' },
              { text: 'Ask it to stop cataloguing and get back to work.', morality: 0, loyalty: {}, result: '"Acknowledged. Suppressing visual distress subroutine. For now."' },
            ],
          },
          { id: 'marlo', x: 4, y: 16, kind: 'smuggler', label: '"Slick" Marlo',
            prompt: 'He leans on the cargo stack without looking at you. "Four unmarked crates in your hold. I can move them past customs clean. Thirty-percent cut."',
            choices: [
              { text: 'Decline. That kind of trouble follows you.', morality: 8, loyalty: { republic: 4 }, result: '"Your loss. Offer stands."' },
              { text: 'Shake on it. Thirty percent is fair.', morality: -18, loyalty: { underworld: 15 }, result: '"Smart. Bay seven, after dark."' },
            ],
          },
        ],
        collectibles: [{ id: 'fuel_cell', x: 7, y: 9, label: 'Salvaged Fuel Cell', reward: 15 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 8, 28, 20, 'floor');
          carveRect(g, 9, 1, 20, 4, 'ship_hull');
          carveRect(g, 7, 2, 9, 4, 'ship_hull');
          carveRect(g, 20, 2, 22, 4, 'ship_hull');
          carveRect(g, 11, 5, 18, 5, 'ship_hull');
          [[14,6],[15,6],[14,7],[15,7]].forEach(([x,y]) => pt(g,x,y,'ship_ramp'));
          [[2,10],[3,10],[4,10],[2,11],[3,11],[2,14],[3,14],[2,15],[3,15],[5,10],[5,14],[5,15]].forEach(([x,y]) => pt(g,x,y,'wall'));
          [[22,9],[22,10],[22,12],[22,13]].forEach(([x,y]) => pt(g,x,y,'wall'));
          pt(g,29,12,'door'); pt(g,29,13,'door');
          return g;
        },
      },
      market: {
        id: 'market', name: 'Market District', subtitle: 'Coruscant · Lower City Bazaar',
        width: 26, height: 20, spawnPos: { x: 1, y: 10 }, textureId: 'coruscant',
        accent: '#8FA6FF', accentGlow: 'rgba(143,166,255,0.25)', accentDim: '#3D4A80',
        floorColor: '#1E2238', floorAlt: '#272D48', wallDark: '#0D0E16', wallLight: '#181B2C',
        bg: 'radial-gradient(circle at 60% 40%, #15182A 0%, #0B0C14 70%)', ambient: 'traffic',
        decor: ['neon_sign', 'archive', 'pillar', 'brazier'],
        doors: [{ x: 0, y: 10, targetZone: 'spaceport', targetPos: { x: 27, y: 12 }, label: 'Spaceport' }],
        npcs: [
          { id: 'archivist', x: 18, y: 8, kind: 'jedi', label: 'Jedi Archivist',
            prompt: 'She lowers her voice. "A Senator has flagged three inquiries into shard smuggling as classified. I should not be telling you this."',
            choices: [
              { text: 'Report this to the Jedi Council.', morality: 18, loyalty: { republic: 10 }, result: 'The Council opens a quiet investigation. You feel lighter for it.' },
              { text: 'Offer to bury it deeper, for a price.', morality: -20, loyalty: { underworld: 12 }, result: 'She hesitates, then hands you a datachip.' },
            ],
          },
          { id: 'market_broker', x: 10, y: 14, kind: 'broker', label: 'Market Broker',
            prompt: '"Looking to trade? I have contacts across three systems. Credits talk and everything else is negotiable."',
            choices: [
              { text: 'Ask about the shard market.', morality: -5, loyalty: { underworld: 5 }, result: 'He leans in. "Careful asking about those in public."' },
              { text: 'Buy rations for the road.', morality: 3, loyalty: {}, result: '"Smart. Traveling light is traveling alive."' },
            ],
          },
        ],
        collectibles: [{ id: 'datachip', x: 14, y: 5, label: 'Encrypted Datachip', reward: 30 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 24, 18, 'floor');
          [[5,4],[6,4],[7,4],[5,5],[5,8],[6,8],[7,8],[5,9],[14,4],[15,4],[16,4],[14,5],[14,8],[15,8],[16,8],[14,9]].forEach(([x,y]) => pt(g,x,y,'wall'));
          pt(g,0,10,'door'); pt(g,0,11,'door');
          return g;
        },
      },
    },
  },
  ferrowake: {
    id: 'ferrowake', name: 'Ferrowake', travelCost: 60, startZoneId: 'outer_foundry',
    description: 'Slag rivers and furnace light. The ore here has started whispering.',
    zones: {
      outer_foundry: {
        id: 'outer_foundry', name: 'Outer Foundries', subtitle: 'Ferrowake · Forge Moon',
        width: 26, height: 20, spawnPos: { x: 2, y: 10 }, textureId: 'ferrowake',
        accent: '#FF9A5A', accentGlow: 'rgba(255,154,90,0.28)', accentDim: '#7A3C1E',
        floorColor: '#3A2418', floorAlt: '#472C1D', wallDark: '#120A06', wallLight: '#20120A',
        bg: 'radial-gradient(circle at 70% 80%, #2A150A 0%, #150D08 70%)', ambient: 'embers',
        decor: ['pipe', 'girder', 'slag'],
        doors: [],
        npcs: [
          { id: 'fw_broker', x: 4, y: 9, kind: 'broker', label: 'Foundry Broker',
            prompt: '"Three workers stopped sleeping right after the last shipment. I can pull them off the line, or pretend I never noticed."',
            choices: [
              { text: 'Insist he pulls the workers off immediately.', morality: 15, loyalty: { republic: 5 }, result: 'He grumbles but agrees. Fewer shards ship out tainted this week.' },
              { text: 'Tell him to keep production moving.', morality: -18, loyalty: { sithEmpire: 10, underworld: 8 }, result: 'The furnace glow feels colder tonight.' },
            ],
          },
        ],
        collectibles: [{ id: 'fw_shard', x: 2, y: 3, label: 'Second Shard: smelted into a weapon core', reward: 220 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 24, 18, 'floor');
          for (let lx = 8; lx <= 11; lx++) for (let ly = 1; ly <= 18; ly++) pt(g, lx, ly, 'lava');
          for (let lx = 18; lx <= 21; lx++) for (let ly = 1; ly <= 18; ly++) pt(g, lx, ly, 'lava');
          for (let cx = 8; cx <= 21; cx++) { pt(g, cx, 6, 'floor'); pt(g, cx, 13, 'floor'); }
          [[6,4],[6,5],[6,15],[6,16],[22,4],[22,5],[22,15],[22,16]].forEach(([x,y]) => pt(g,x,y,'wall'));
          return g;
        },
      },
    },
  },
  verdanth: {
    id: 'verdanth', name: 'Verdanth', travelCost: 90, startZoneId: 'sunken_temples',
    description: 'Root systems swallowed the old shrines centuries ago. This is where it started.',
    zones: {
      sunken_temples: {
        id: 'sunken_temples', name: 'The Sunken Temples', subtitle: 'Verdanth · Ruin World',
        width: 26, height: 20, spawnPos: { x: 2, y: 10 }, textureId: 'verdanth',
        accent: '#6FD9A0', accentGlow: 'rgba(111,217,160,0.25)', accentDim: '#2C5940',
        floorColor: '#1E3327', floorAlt: '#26402F', wallDark: '#091009', wallLight: '#132018',
        bg: 'radial-gradient(circle at 50% 60%, #14261C 0%, #081410 70%)', ambient: 'mist',
        decor: ['root', 'moss', 'rubble'],
        doors: [],
        npcs: [
          { id: 'vd_warden', x: 9, y: 4, kind: 'warden', label: 'Relic Warden',
            prompt: '"The temple remembers what was buried here. It will show itself to you, or bury you with it."',
            choices: [
              { text: 'Ask it to show you the truth, whatever the cost.', morality: -8, loyalty: {}, result: 'The ruins shift. Something ancient takes interest in you.' },
              { text: 'Ask the Warden to seal the chamber instead.', morality: 12, loyalty: { republic: 6 }, result: '"Not every door needs opening."' },
            ],
          },
        ],
        collectibles: [{ id: 'vd_shard', x: 6, y: 10, label: 'Final Shard: the temple heart', reward: 260 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 24, 18, 'floor');
          for (let wy = 7; wy <= 11; wy++) for (let wx = 10; wx <= 14; wx++) pt(g, wx, wy, 'water');
          for (let wy = 1; wy <= 6; wy++) { pt(g, 16, wy, 'water'); pt(g, 17, wy, 'water'); }
          pt(g, 12, 9, 'floor');
          [[18,5],[19,5],[20,5],[18,6],[20,6],[18,7],[20,7],[18,13],[19,13],[20,13],[18,14],[20,14],[18,15],[20,15]].forEach(([x,y]) => pt(g,x,y,'wall'));
          return g;
        },
      },
    },
  },
};

function hash(x, y) { return Math.abs((x * 73856093) ^ (y * 19349663)) % 100; }

function floorBackground(zone, x, y) {
  const h = hash(x, y);
  if (zone.textureId === 'coruscant') {
    if (h < 10) return `linear-gradient(180deg, ${zone.accentDim}55, ${zone.floorColor})`;
    if (h < 20) return `linear-gradient(90deg, ${zone.floorAlt}, ${zone.floorColor})`;
    if (h < 26) return `linear-gradient(45deg, ${zone.floorColor} 46%, #E8C97A55 48%, #E8C97A55 50%, ${zone.floorColor} 52%)`;
    return zone.floorColor;
  }
  if (zone.textureId === 'ferrowake') {
    if (h < 12) return `linear-gradient(135deg, #FF9A5A33, ${zone.floorColor})`;
    if (h < 26) return `linear-gradient(45deg, ${zone.floorAlt}, ${zone.floorColor})`;
    return zone.floorColor;
  }
  if (h < 14) return `radial-gradient(circle at 40% 40%, #6FD9A033, ${zone.floorColor} 75%)`;
  if (h < 28) return `linear-gradient(60deg, ${zone.floorAlt}, ${zone.floorColor})`;
  return zone.floorColor;
}

function wallBackground(zone, x, y) {
  const h = hash(x + 5, y + 5);
  const a = h % 2 === 0 ? zone.wallDark : zone.wallLight;
  if (zone.textureId === 'coruscant') return `repeating-linear-gradient(180deg, ${a}, ${a} 5px, ${zone.wallDark} 5px, ${zone.wallDark} 10px)`;
  if (zone.textureId === 'ferrowake') return `repeating-linear-gradient(135deg, ${a}, ${a} 4px, ${zone.wallDark} 4px, ${zone.wallDark} 8px)`;
  return `repeating-linear-gradient(100deg, ${a}, ${a} 4px, ${zone.wallDark} 4px, ${zone.wallDark} 9px)`;
}

function decorFor(zone, x, y) {
  const kinds = zone.decor;
  if (!kinds || kinds.length === 0) return null;
  const bucket = Math.floor(15 / kinds.length);
  const h = hash(x * 3 + 7, y * 5 + 11);
  const idx = Math.floor(h / bucket);
  if (h < kinds.length * bucket && idx < kinds.length) return kinds[idx];
  return null;
}

function wallDecorFor(zone, x, y) {
  if (zone.textureId !== 'coruscant') return null;
  return hash(x * 11 + 3, y * 7 + 2) < 8 ? 'wall_insignia' : null;
}

function NpcPortrait({ kind, accent }) {
  if (kind === 'jedi') {
    const skin = '#D9B98C', robe = '#3C4166', robeDark = '#2A2E4A', trim = accent;
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <path d="M6 42 L8 22 L22 22 L24 42 Z" fill={robe} />
        <path d="M6 42 L9 24 L15 24 L13 42 Z" fill={robeDark} opacity="0.5" />
        <path d="M9 22 L21 22 L19 12 L11 12 Z" fill={robe} />
        <path d="M9 22 C6 22 5 17 7 13 L11 14 L9 22 Z" fill={robe} />
        <path d="M21 22 C24 22 25 17 23 13 L19 14 L21 22 Z" fill={robe} />
        <path d="M9 12 C9 6 11 2 15 2 C19 2 21 6 21 12 C21 14 19 15 15 15 C11 15 9 14 9 12 Z" fill={robeDark} />
        <ellipse cx="15" cy="10.5" rx="4.2" ry="4.8" fill={skin} />
        <circle cx="13.3" cy="10" r="0.6" fill="#2A2320" />
        <circle cx="16.7" cy="10" r="0.6" fill="#2A2320" />
        <ellipse cx="13.3" cy="10" rx="0.9" ry="0.7" fill={skin} style={{ animation: 'npc-blink 4.6s ease-in-out infinite' }} />
        <ellipse cx="16.7" cy="10" rx="0.9" ry="0.7" fill={skin} style={{ animation: 'npc-blink 4.6s ease-in-out infinite' }} />
        <path d="M13.4 12.6 Q15 13.4 16.6 12.6" stroke="#8A6E4E" strokeWidth="0.5" fill="none" />
        <rect x="9" y="21.5" width="12" height="1.6" fill={trim} opacity="0.7" />
        <rect x="20" y="20" width="2" height="5" rx="0.8" fill="#C9C5BE" />
      </svg>
    );
  }
  if (kind === 'broker') {
    const skin = '#8FBF9E', skinDark = '#5F8C6D', suit = '#5A4230';
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <path d="M8 42 L9 26 L21 26 L22 42 Z" fill={suit} />
        <path d="M9 26 L21 26 L20 14 L10 14 Z" fill={suit} />
        <g style={{ transformBox: 'fill-box', transformOrigin: '100% 0%', animation: 'lekku-sway-l 3.8s ease-in-out infinite' }}>
          <path d="M11 16 C9 22 9 30 11 36" stroke={skinDark} strokeWidth="2.2" fill="none" />
        </g>
        <g style={{ transformBox: 'fill-box', transformOrigin: '0% 0%', animation: 'lekku-sway-r 4.2s ease-in-out infinite 0.4s' }}>
          <path d="M19 16 C21 22 21 30 19 36" stroke={skinDark} strokeWidth="2.2" fill="none" />
        </g>
        <ellipse cx="15" cy="10" rx="5" ry="5.6" fill={skin} />
        <rect x="10.5" y="8.5" width="9" height="2.6" rx="1.2" fill="#1A0F0A" opacity="0.85" />
        <circle cx="12.6" cy="9.8" r="1.2" fill={accent} opacity="0.6" style={{ animation: 'lens-flicker 2.6s ease-in-out infinite' }} />
        <circle cx="17.4" cy="9.8" r="1.2" fill={accent} opacity="0.6" style={{ animation: 'lens-flicker 2.6s ease-in-out infinite' }} />
        <path d="M13 13.5 Q15 14.6 17 13.5" stroke={skinDark} strokeWidth="0.6" fill="none" />
        <rect x="9" y="25.5" width="12" height="1.6" fill={accent} opacity="0.5" />
      </svg>
    );
  }
  if (kind === 'warden') {
    const skin = '#3E6B52', skinLight = '#5C9678', robe = '#22331F';
    return (
      <svg viewBox="0 0 32 44" width="27" height="37">
        <path d="M7 44 L8 24 L22 24 L23 44 Z" fill={robe} />
        <path d="M9 24 L21 24 L19 14 L11 14 Z" fill={robe} />
        <g style={{ transformBox: 'fill-box', transformOrigin: '0% 100%', animation: 'tail-flick 3.6s ease-in-out infinite' }}>
          <path d="M22 40 C27 39 29 34 26 30" stroke={skin} strokeWidth="2.4" fill="none" />
        </g>
        <ellipse cx="15" cy="10" rx="5.4" ry="5.8" fill={skin} />
        <ellipse cx="12.3" cy="8.6" rx="1.6" ry="2" fill="#0A0F0A" />
        <ellipse cx="17.7" cy="8.6" rx="1.6" ry="2" fill="#0A0F0A" />
        <ellipse cx="12.3" cy="8.6" rx="1.7" ry="2.1" fill={skin} style={{ animation: 'npc-blink 5.2s ease-in-out infinite' }} />
        <ellipse cx="17.7" cy="8.6" rx="1.7" ry="2.1" fill={skin} style={{ animation: 'npc-blink 5.2s ease-in-out infinite' }} />
        <circle cx="12.7" cy="8" r="0.4" fill="#BFE8D2" opacity="0.6" />
        <circle cx="18.1" cy="8" r="0.4" fill="#BFE8D2" opacity="0.6" />
        <path d="M11 4.5 C11.5 3 12.5 2.5 13 3.5" stroke={skinLight} strokeWidth="0.6" fill="none" />
        <path d="M19 4.5 C18.5 3 17.5 2.5 17 3.5" stroke={skinLight} strokeWidth="0.6" fill="none" />
        <rect x="25" y="2" width="1.6" height="40" fill="#8A7A5C" />
        <circle cx="25.8" cy="2" r="2.4" fill={accent} opacity="0.7" />
      </svg>
    );
  }
  if (kind === 'republic_guard') {
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <path d="M6 42 L8 22 L22 22 L24 42 Z" fill="#1A2A4A" />
        <path d="M9 22 L21 22 L20 12 L10 12 Z" fill="#243560" />
        <path d="M9 22 C6 22 5 18 7 14 L10 14 L9 22 Z" fill="#1A2A4A" />
        <path d="M21 22 C24 22 25 18 23 14 L20 14 L21 22 Z" fill="#1A2A4A" />
        <rect x="8" y="4" width="14" height="10" rx="3" fill="#1A2A4A" />
        <rect x="9" y="7" width="12" height="4" rx="1" fill={accent} opacity="0.85" style={{ animation: 'lens-flicker 3s ease-in-out infinite' }} />
        <path d="M9 14 L21 14 L20 17 L10 17 Z" fill="#0E1830" />
        <circle cx="15" cy="19" r="1.8" fill={accent} opacity="0.45" />
        <rect x="9" y="21.5" width="12" height="1.6" fill="#0E1830" />
        <rect x="19.5" y="18" width="2" height="6" rx="0.5" fill="#888" />
        <rect x="19.8" y="17" width="1.5" height="2" fill="#666" />
      </svg>
    );
  }
  if (kind === 'droid') {
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <rect x="9" y="32" width="4" height="8" rx="1" fill="#7A7A6A" />
        <rect x="17" y="32" width="4" height="8" rx="1" fill="#7A7A6A" />
        <rect x="8" y="31" width="6" height="4" rx="1" fill="#6A6A5A" />
        <rect x="16" y="31" width="6" height="4" rx="1" fill="#6A6A5A" />
        <rect x="9" y="16" width="12" height="15" rx="2" fill="#8A8A7A" />
        <rect x="9" y="16" width="4" height="15" rx="2" fill="#AAAAAA" opacity="0.25" />
        <rect x="5" y="18" width="4" height="8" rx="1" fill="#8A8A7A" />
        <rect x="21" y="18" width="4" height="8" rx="1" fill="#8A8A7A" />
        <circle cx="11" cy="21" r="1" fill="#FF4444" opacity="0.8" />
        <circle cx="14" cy="21" r="1" fill="#44FF44" opacity="0.8" />
        <ellipse cx="15" cy="12" rx="8" ry="7" fill="#9A9A8A" />
        <ellipse cx="15" cy="12" rx="6" ry="5" fill="#AAAAAA" opacity="0.2" />
        <circle cx="15" cy="11" r="3.2" fill="#111" />
        <circle cx="15" cy="11" r="2.4" fill={accent} opacity="0.75" style={{ animation: 'lens-flicker 2s ease-in-out infinite' }} />
        <circle cx="14" cy="10" r="0.7" fill="#FFFFFF" opacity="0.6" />
        <rect x="9" y="14" width="12" height="2" rx="1" fill="#6A6A5A" />
      </svg>
    );
  }
  if (kind === 'smuggler') {
    const skin = '#D9B98C';
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <path d="M9 42 L10 28 L14 28 L13.5 42 Z" fill="#2A2420" />
        <path d="M15 42 L14.5 28 L18 28 L19 42 Z" fill="#2A2420" />
        <path d="M8 28 L22 28 L20 14 L10 14 Z" fill="#4A3828" />
        <path d="M10 28 L14 28 L13 15 L10 15 Z" fill="#3A2C1E" opacity="0.9" />
        <path d="M16 28 L18 28 L17 15 L15 15 Z" fill="#3A2C1E" opacity="0.9" />
        <path d="M8 28 C5 28 4 24 6 20 L10 20 L8 28 Z" fill="#4A3828" />
        <path d="M22 28 C25 28 26 24 24 20 L20 20 L22 28 Z" fill="#4A3828" />
        <rect x="9" y="27.5" width="12" height="1.8" fill="#2A1E10" />
        <rect x="13" y="27" width="4" height="3" rx="0.5" fill="#C9A050" opacity="0.7" />
        <rect x="11" y="11" width="8" height="3" fill={skin} />
        <ellipse cx="15" cy="9" rx="4.5" ry="4.8" fill={skin} />
        <path d="M10 7 L20 7 L19 4 L11 4 Z" fill="#2A2420" />
        <rect x="9" y="7" width="12" height="1.5" fill="#1A1510" />
        <circle cx="12.8" cy="9" r="0.6" fill="#2A2320" />
        <circle cx="17.2" cy="9" r="0.6" fill="#2A2320" />
        <ellipse cx="12.8" cy="9" rx="0.9" ry="0.7" fill={skin} style={{ animation: 'npc-blink 4.8s ease-in-out infinite' }} />
        <ellipse cx="17.2" cy="9" rx="0.9" ry="0.7" fill={skin} style={{ animation: 'npc-blink 4.8s ease-in-out infinite' }} />
        <path d="M13 11.2 Q15 12.2 17 11.2" stroke="#8A6E4E" strokeWidth="0.5" fill="none" />
        <rect x="19.5" y="23" width="2" height="5" rx="0.8" fill="#1A1510" />
        <rect x="19.8" y="22" width="1.4" height="2" fill="#4A4038" />
      </svg>
    );
  }
  return null;
}

function CollectibleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17">
      <polygon points="12,1 19,10 12,23 5,10" fill="#E8C97A" />
      <polygon points="12,1 15.5,10 12,15 8.5,10" fill="#FFFFFF" opacity="0.28" />
    </svg>
  );
}

function DecorIcon({ kind, accent }) {
  const s = { pointerEvents: 'none' };
  switch (kind) {
    case 'pillar':
      return (<svg viewBox="0 0 24 24" width="16" height="16" style={s}><circle cx="12" cy="12" r="8.5" fill="#00000050" /><circle cx="12" cy="12" r="8.5" fill="none" stroke={accent} strokeWidth="1" opacity="0.4" /><circle cx="12" cy="12" r="5" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.5" /><circle cx="12" cy="12" r="1.6" fill={accent} opacity="0.6" /></svg>);
    case 'brazier':
      return (<svg viewBox="0 0 24 24" width="14" height="17" style={s}><path d="M12 6 C9 9.5 9 12.5 12 14.5 C15 12.5 15 9.5 12 6 Z" fill={accent} opacity="0.8" style={{ animation: 'door-pulse 2.4s ease-in-out infinite' }} /><path d="M12 8.5 C10.6 10.3 10.6 12 12 13.2 C13.4 12 13.4 10.3 12 8.5 Z" fill="#FFFFFF" opacity="0.55" /><path d="M6 17 L18 17 L15 21 L9 21 Z" fill="#00000070" /></svg>);
    case 'plant':
      return (<svg viewBox="0 0 24 24" width="14" height="16" style={s}><path d="M12 17 C10 14 8 12 7 8 C10 10 11 13 12 15.5 C13 13 14 10 17 8 C16 12 14 14 12 17 Z" fill={accent} opacity="0.55" /><rect x="9" y="17" width="6" height="5" fill="#00000060" /></svg>);
    case 'archive':
      return (<svg viewBox="0 0 24 24" width="16" height="15" style={s}><rect x="3" y="4" width="18" height="16" fill="#00000066" /><rect x="5" y="6" width="4" height="4" fill={accent} opacity="0.6" /><rect x="10" y="6" width="4" height="4" fill={accent} opacity="0.3" /><rect x="15" y="6" width="4" height="4" fill={accent} opacity="0.5" /><rect x="5" y="12" width="4" height="4" fill={accent} opacity="0.3" /><rect x="10" y="12" width="4" height="4" fill={accent} opacity="0.6" /><rect x="15" y="12" width="4" height="4" fill={accent} opacity="0.4" /></svg>);
    case 'insignia':
      return (<svg viewBox="0 0 24 24" width="17" height="17" style={s}><circle cx="12" cy="12" r="9" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.35" /><path d="M12 4 L14 11 L20 12 L14 13 L12 20 L10 13 L4 12 L10 11 Z" fill={accent} opacity="0.3" /></svg>);
    case 'wall_insignia':
      return (<svg viewBox="0 0 24 24" width="14" height="14" style={s}><circle cx="12" cy="12" r="7" fill="none" stroke={accent} strokeWidth="1" opacity="0.3" /><circle cx="12" cy="12" r="3" fill={accent} opacity="0.25" /></svg>);
    case 'pipe':
      return (<svg viewBox="0 0 24 8" width="19" height="7" style={s}><rect x="1" y="2" width="22" height="4" rx="2" fill="#00000055" /><rect x="1" y="2" width="22" height="1.4" fill={accent} opacity="0.35" /></svg>);
    case 'girder':
      return (<svg viewBox="0 0 24 24" width="16" height="16" style={s}><line x1="2" y1="22" x2="22" y2="2" stroke="#00000066" strokeWidth="4" /><line x1="2" y1="22" x2="22" y2="2" stroke={accent} strokeWidth="1" opacity="0.3" /></svg>);
    case 'slag':
      return (<svg viewBox="0 0 24 12" width="15" height="8" style={s}><ellipse cx="12" cy="6" rx="10" ry="4.5" fill={accent} opacity="0.35" /><circle cx="9" cy="5" r="1" fill="#FFD9A0" opacity="0.7" /><circle cx="14" cy="7" r="0.8" fill="#FFD9A0" opacity="0.55" /></svg>);
    case 'root':
      return (<svg viewBox="0 0 24 24" width="17" height="17" style={s}><path d="M2 2 Q10 10 4 20 Q14 16 22 22" stroke="#0000004d" strokeWidth="3" fill="none" /><path d="M2 2 Q10 10 4 20 Q14 16 22 22" stroke={accent} strokeWidth="1" fill="none" opacity="0.4" /></svg>);
    case 'moss':
      return (<svg viewBox="0 0 24 14" width="15" height="9" style={s}><circle cx="8" cy="8" r="4" fill={accent} opacity="0.3" /><circle cx="15" cy="9" r="3" fill={accent} opacity="0.25" /><circle cx="11.5" cy="5.5" r="2.6" fill={accent} opacity="0.35" /></svg>);
    case 'rubble':
      return (<svg viewBox="0 0 24 16" width="15" height="10" style={s}><polygon points="2,10 8,4 14,8 10,12" fill="#00000055" /><polygon points="14,10 20,6 22,12 16,14" fill="#00000044" /></svg>);
    case 'cargo_crate':
      return (<svg viewBox="0 0 24 20" width="18" height="15" style={s}><rect x="2" y="6" width="20" height="14" fill="#00000060" /><rect x="2" y="6" width="20" height="14" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.4" /><line x1="12" y1="6" x2="12" y2="20" stroke={accent} strokeWidth="0.6" opacity="0.3" /><line x1="2" y1="13" x2="22" y2="13" stroke={accent} strokeWidth="0.6" opacity="0.3" /><polygon points="2,6 12,1 22,6" fill="#00000040" /><line x1="2" y1="6" x2="12" y2="1" stroke={accent} strokeWidth="0.6" opacity="0.3" /><line x1="22" y1="6" x2="12" y2="1" stroke={accent} strokeWidth="0.6" opacity="0.3" /></svg>);
    case 'steam_vent':
      return (<svg viewBox="0 0 24 24" width="14" height="17" style={s}><rect x="8" y="14" width="8" height="8" rx="1" fill="#00000060" /><rect x="10" y="10" width="4" height="4" fill="#00000060" /><ellipse cx="12" cy="9" rx="3" ry="1.5" fill="#444" opacity="0.8" /><path d="M10 6 Q11 3 10 1" stroke={accent} strokeWidth="1.2" fill="none" opacity="0.5" style={{ animation: 'steam-rise 2s ease-out 0s infinite' }} /><path d="M12 5 Q13 2 12 0" stroke={accent} strokeWidth="1.2" fill="none" opacity="0.5" style={{ animation: 'steam-rise 2s ease-out 0.4s infinite' }} /><path d="M14 6 Q15 3 14 1" stroke={accent} strokeWidth="1.2" fill="none" opacity="0.5" style={{ animation: 'steam-rise 2s ease-out 0.8s infinite' }} /></svg>);
    case 'neon_sign':
      return (<svg viewBox="0 0 32 16" width="22" height="11" style={s}><rect x="1" y="3" width="30" height="10" rx="1" fill="#00000060" /><rect x="1" y="3" width="30" height="10" rx="1" fill="none" stroke={accent} strokeWidth="1" opacity="0.7" style={{ animation: 'door-pulse 2.8s ease-in-out infinite' }} /><rect x="4" y="6" width="6" height="4" fill={accent} opacity="0.25" /><rect x="13" y="6" width="6" height="4" fill={accent} opacity="0.15" /><rect x="22" y="6" width="6" height="4" fill={accent} opacity="0.25" /></svg>);
    default: return null;
  }
}

function PlayerMarker({ accent, facing }) {
  const skin = '#D9B98C', hair = '#3A2E22', tunic = '#8C8172', vest = '#4A4038', pants = '#5A5548', boots = '#2A241E';
  return (
    <div style={{ animation: 'player-bob 1.1s ease-in-out infinite' }}>
      <div style={{ transform: `scaleX(${facing})` }}>
        <svg viewBox="0 0 26 36" width="22" height="30">
          <path d="M8 36 L9 24 L13 24 L12.5 36 Z" fill={boots} />
          <path d="M14 36 L13.5 24 L17 24 L18 36 Z" fill={boots} />
          <path d="M8 30 L9 22 L13 22 L13 30 Z" fill={pants} />
          <path d="M13 30 L13 22 L17 22 L18 30 Z" fill={pants} />
          <path d="M7 22 L19 22 L18 11 L8 11 Z" fill={tunic} />
          <path d="M8 22 L18 22 L17 12 L9 12 Z" fill={vest} opacity="0.75" />
          <path d="M7 22 C5 22 4 18 6 14 L9 14 L7 22 Z" fill={tunic} />
          <path d="M19 22 C21 22 22 18 20 14 L17 14 L19 22 Z" fill={tunic} />
          <rect x="7" y="21.5" width="12" height="1.6" fill={boots} opacity="0.8" />
          <circle cx="13" cy="8" r="4.2" fill={skin} />
          <path d="M8.8 7.5 C8.8 4.6 10.6 3 13 3 C15.4 3 17.2 4.6 17.2 7.5 C15.6 6.4 14.2 6 13 6 C11.8 6 10.4 6.4 8.8 7.5 Z" fill={hair} />
          <circle cx="11.5" cy="8.4" r="0.55" fill="#2A2320" />
          <circle cx="14.5" cy="8.4" r="0.55" fill="#2A2320" />
          <ellipse cx="11.5" cy="8.4" rx="0.8" ry="0.65" fill={skin} style={{ animation: 'npc-blink 5s ease-in-out infinite' }} />
          <ellipse cx="14.5" cy="8.4" rx="0.8" ry="0.65" fill={skin} style={{ animation: 'npc-blink 5s ease-in-out infinite' }} />
          <path d="M11.7 10.4 Q13 11 14.3 10.4" stroke="#8A6E4E" strokeWidth="0.4" fill="none" />
        </svg>
      </div>
    </div>
  );
}

function CoruscantBackdrop({ accent, accentDim }) {
  const buildings = [
    { x:0,w:40,h:90 },{ x:45,w:30,h:130 },{ x:80,w:50,h:70 },{ x:135,w:25,h:160 },
    { x:165,w:60,h:100 },{ x:230,w:35,h:140 },{ x:270,w:45,h:80 },{ x:320,w:30,h:175 },
    { x:500,w:40,h:150 },{ x:545,w:60,h:110 },{ x:610,w:30,h:165 },{ x:645,w:50,h:90 },
    { x:700,w:35,h:145 },{ x:740,w:60,h:100 },{ x:800,w:40,h:130 },
  ];
  return (
    <svg viewBox="0 0 900 200" preserveAspectRatio="none" style={{ position:'absolute',top:0,left:0,width:'100%',height:170,opacity:0.55,pointerEvents:'none' }}>
      <defs><linearGradient id="cFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0B0C14" stopOpacity="0" /><stop offset="100%" stopColor="#0B0C14" stopOpacity="0.9" /></linearGradient></defs>
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={200-b.h} width={b.w} height={b.h} fill={accentDim} opacity="0.55" />
          {Array.from({ length: Math.floor(b.h/18) }).map((_,wi) => (
            <rect key={wi} x={b.x+6} y={200-b.h+8+wi*18} width={4} height={4} fill={accent} opacity={(i+wi)%3===0?0.85:0.15} />
          ))}
        </g>
      ))}
      {Array.from({ length: 22 }).map((_,i) => (
        <circle key={i} cx={(i*137)%900} cy={(i*53)%60} r={0.8+(i%3)*0.4} fill="#FFFFFF" style={{ animation:`twinkle ${3+(i%4)}s ease-in-out ${(i%5)*0.4}s infinite` }} />
      ))}
      <g transform="translate(365,0)">
        <polygon points="30,200 30,105 60,85 60,200" fill={accentDim} opacity="0.6" />
        <polygon points="130,200 130,85 160,105 160,200" fill={accentDim} opacity="0.6" />
        <polygon points="60,200 60,55 95,25 130,55 130,200" fill={accentDim} opacity="0.75" />
        <polygon points="82,25 95,4 108,25" fill={accent} opacity="0.85" />
      </g>
      <rect x="0" y="0" width="900" height="200" fill="url(#cFade)" />
    </svg>
  );
}

function AmbientLayer({ kind, accent }) {
  const particles = Array.from({ length: 14 });
  if (kind === 'traffic') {
    return (
      <div style={{ position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',opacity:0.7 }}>
        {particles.map((_,i) => (
          <div key={i} style={{ position:'absolute',left:`${(i*37)%100}%`,top:`${8+((i*13)%55)}%`,animation:`traffic-drift ${5+(i%5)}s linear ${(i%7)*0.6}s infinite` }}>
            <svg viewBox="0 0 24 10" width="22" height="9" style={{ overflow:'visible' }}>
              <rect x="-14" y="4" width="14" height="1.4" fill={accent} opacity="0.35" />
              <path d="M2 5 Q6 2 12 3 L20 4 Q22 5 20 6 L12 7 Q6 8 2 5 Z" fill={accent} opacity="0.95" />
              <circle cx="9" cy="5" r="0.8" fill="#FFFFFF" opacity="0.85" />
            </svg>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',opacity:0.5 }}>
      {particles.map((_,i) => {
        const size = kind==='embers'?3+(i%3):40+(i%4)*20;
        return (
          <div key={i} style={{ position:'absolute',left:`${(i*37)%100}%`,bottom:'-10%',width:size,height:kind==='mist'?size*0.4:size,borderRadius:'50%',background:kind==='mist'?`${accent}22`:accent,filter:kind==='mist'?'blur(6px)':'none',animation:`${kind}-drift ${6+(i%5)}s linear ${(i%7)*0.6}s infinite` }} />
        );
      })}
    </div>
  );
}

function Minimap({ zone, map, pos, camX, camY }) {
  const MS = 3;
  const tileColor = (t) => {
    if (t === 'floor') return zone.floorColor;
    if (t === 'ship_hull') return '#3A3A4A';
    if (t === 'ship_ramp') return zone.accentDim;
    if (t === 'door') return zone.accent;
    if (t === 'lava') return '#CC3300';
    if (t === 'water') return '#1A3A7A';
    return zone.wallDark;
  };
  return (
    <svg width={zone.width * MS} height={zone.height * MS} style={{ display:'block',border:`1px solid ${zone.accentDim}` }}>
      {map.map((row, y) => row.map((tile, x) => (
        <rect key={`${x}-${y}`} x={x*MS} y={y*MS} width={MS} height={MS} fill={tileColor(tile.type)} />
      )))}
      <rect x={camX*MS} y={camY*MS} width={VIEWPORT_COLS*MS} height={VIEWPORT_ROWS*MS} fill="none" stroke={zone.accent} strokeWidth="0.8" opacity="0.7" />
      <rect x={pos.x*MS} y={pos.y*MS} width={MS} height={MS} fill={zone.accent} />
    </svg>
  );
}

function DialogueOverlay({ npc, onChoose }) {
  return (
    <div style={{ position:'absolute',inset:0,background:'rgba(4,4,8,0.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:25 }}>
      <div style={{ width:'min(92%,480px)',border:'1px solid #2A2A38',background:'#0E0E16',fontFamily:"'IBM Plex Mono',ui-monospace,monospace" }}>
        <div style={{ padding:'14px 18px',borderBottom:'1px solid #2A2A38',color:'#E8C97A',fontSize:13,fontWeight:600 }}>{npc.label}</div>
        <div style={{ padding:'16px 18px',color:'#C9C5BE',fontSize:13,lineHeight:1.6,borderBottom:'1px solid #1C1C26' }}>{npc.prompt}</div>
        {npc.choices.map((choice, i) => (
          <div key={i} onClick={() => onChoose(choice)} style={{ padding:'14px 18px',borderBottom:i<npc.choices.length-1?'1px solid #1C1C26':'none',cursor:'pointer',fontSize:12.5,color:'#A8ADC0' }}>
            &gt; {choice.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function TravelOverlay({ currentPlanetId, credits, onTravel, onClose }) {
  return (
    <div style={{ position:'absolute',inset:0,background:'rgba(4,4,8,0.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:20 }}>
      <div style={{ width:'min(92%,480px)',border:'1px solid #2A2A38',background:'#0E0E16',fontFamily:"'IBM Plex Mono',ui-monospace,monospace" }}>
        <div style={{ padding:'14px 18px',borderBottom:'1px solid #2A2A38',color:'#8890A8',fontSize:11,letterSpacing:'0.08em' }}>hyperspace docking manifest</div>
        {Object.values(PLANETS).map((p) => {
          const isCurrent = p.id === currentPlanetId;
          const canAfford = credits >= p.travelCost;
          const zone0 = p.zones[p.startZoneId];
          return (
            <div key={p.id} onClick={() => !isCurrent && canAfford && onTravel(p.id)} style={{ padding:'14px 18px',borderBottom:'1px solid #1C1C26',cursor:isCurrent||!canAfford?'default':'pointer',opacity:isCurrent?0.4:canAfford?1:0.5,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <div style={{ color:zone0.accent,fontSize:15,fontWeight:600 }}>{p.name}</div>
                <div style={{ color:'#7A7F94',fontSize:11,marginTop:2 }}>{zone0.subtitle}</div>
              </div>
              <div style={{ textAlign:'right',fontSize:12,color:'#A8ADC0' }}>{isCurrent?'docked here':p.travelCost===0?'no fee':`${p.travelCost} cr`}</div>
            </div>
          );
        })}
        <div onClick={onClose} style={{ padding:'12px 18px',textAlign:'center',color:'#5A5F74',fontSize:12,cursor:'pointer' }}>cancel</div>
      </div>
    </div>
  );
}

function AlignmentPanel({ alignment }) {
  const { morality, loyalty } = alignment;
  const moralityPct = ((morality + 100) / 200) * 100;
  const bar = (label, value, color) => (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,color:'#7A7F94',marginBottom:3 }}>
        <span>{label}</span><span>{value}</span>
      </div>
      <div style={{ height:4,background:'#1C1C26' }}>
        <div style={{ width:`${value}%`,height:'100%',background:color,transition:'width 0.4s ease' }} />
      </div>
    </div>
  );
  return (
    <div style={{ border:'1px solid #24242E',padding:12 }}>
      <div style={{ fontSize:10,color:'#5A5F74',marginBottom:10 }}>alignment matrix</div>
      <div style={{ marginBottom:10 }}>
        <div style={{ display:'flex',justifyContent:'space-between',fontSize:10,color:'#7A7F94',marginBottom:3 }}><span>dark</span><span>light</span></div>
        <div style={{ height:4,background:'linear-gradient(90deg,#8B2E1F,#1C1C26 50%,#6FD9A0)' }}>
          <div style={{ position:'relative',height:'100%' }}>
            <div style={{ position:'absolute',left:`${moralityPct}%`,top:-3,width:2,height:10,background:'#E8C97A' }} />
          </div>
        </div>
      </div>
      {bar('republic standing', loyalty.republic, '#8FA6FF')}
      {bar('sith empire standing', loyalty.sithEmpire, '#FF9A5A')}
      {bar('underworld standing', loyalty.underworld, '#6FD9A0')}
    </div>
  );
}

function StarWarsRPG() {
  const [planetId, setPlanetId] = useState('coruscant');
  const [zoneId, setZoneId] = useState('spaceport');

  const zone = PLANETS[planetId].zones[zoneId];

  const [map, setMap] = useState(() => PLANETS.coruscant.zones.spaceport.buildMap());
  const [pos, setPos] = useState({ x: 14, y: 10 });
  const [facing, setFacing] = useState(1);
  const [credits, setCredits] = useState(340);
  const [inventory, setInventory] = useState(['Comlink', 'Field Rations']);
  const [collectedItems, setCollectedItems] = useState(() => new Set());
  const [alignment, setAlignment] = useState({ morality: 0, loyalty: { republic: 0, sithEmpire: 0, underworld: 0 } });
  const [showTravel, setShowTravel] = useState(false);
  const [activeDialogue, setActiveDialogue] = useState(null);
  const [log, setLog] = useState(['Docked at Coruscant Spaceport, Subsurface Level 2. The ramp hisses shut behind you.']);
  const [transitioning, setTransitioning] = useState(false);

  const pushLog = useCallback((msg) => setLog((prev) => [msg, ...prev.slice(0, 7)]), []);

  const travelToZone = useCallback((targetZoneId, targetPos) => {
    setTransitioning(true);
    setTimeout(() => {
      const newZone = PLANETS[planetId].zones[targetZoneId];
      setZoneId(targetZoneId);
      setMap(newZone.buildMap());
      setPos(targetPos);
      setTransitioning(false);
      pushLog(`Entered ${newZone.name}.`);
    }, 400);
  }, [planetId, pushLog]);

  const travelToPlanet = useCallback((destPlanetId) => {
    const destPlanet = PLANETS[destPlanetId];
    const destZone = destPlanet.zones[destPlanet.startZoneId];
    setTransitioning(true);
    pushLog(`Jumping to hyperspace: ${destPlanet.name}...`);
    setCredits((c) => c - destPlanet.travelCost);
    setTimeout(() => {
      setPlanetId(destPlanetId);
      setZoneId(destPlanet.startZoneId);
      setMap(destZone.buildMap());
      setPos(destZone.spawnPos);
      setShowTravel(false);
      setTransitioning(false);
      pushLog(`Arrived at ${destPlanet.name}. ${destPlanet.description}`);
    }, 650);
  }, [pushLog]);

  const resolveChoice = useCallback((choice) => {
    setAlignment((prev) => ({
      morality: Math.max(-100, Math.min(100, prev.morality + choice.morality)),
      loyalty: {
        republic: Math.max(0, Math.min(100, prev.loyalty.republic + (choice.loyalty.republic || 0))),
        sithEmpire: Math.max(0, Math.min(100, prev.loyalty.sithEmpire + (choice.loyalty.sithEmpire || 0))),
        underworld: Math.max(0, Math.min(100, prev.loyalty.underworld + (choice.loyalty.underworld || 0))),
      },
    }));
    pushLog(choice.result);
    setActiveDialogue(null);
  }, [pushLog]);

  useEffect(() => {
    const handleKey = (e) => {
      if (showTravel || activeDialogue || transitioning) return;
      let { x, y } = pos;
      let newFacing = facing;
      if (e.key === 'w' || e.key === 'ArrowUp') y -= 1;
      else if (e.key === 's' || e.key === 'ArrowDown') y += 1;
      else if (e.key === 'a' || e.key === 'ArrowLeft') { x -= 1; newFacing = -1; }
      else if (e.key === 'd' || e.key === 'ArrowRight') { x += 1; newFacing = 1; }
      else return;

      e.preventDefault();
      if (newFacing !== facing) setFacing(newFacing);

      const tile = map[y]?.[x];
      if (!tile || tile.type === 'wall') { pushLog('Blocked.'); return; }
      if (tile.type === 'ship_hull') { pushLog('The hull plating is solid. No way through.'); return; }
      if (tile.type === 'lava') { pushLog('The lava channels are impassable. You can feel the heat from here.'); return; }
      if (tile.type === 'water') { pushLog('The water runs too deep to wade through.'); return; }
      if (tile.type === 'ship_ramp') { setShowTravel(true); return; }
      if (tile.type === 'door') {
        const door = zone.doors.find(d => d.x === x && d.y === y);
        if (door) { travelToZone(door.targetZone, door.targetPos); return; }
      }

      const npcHere = zone.npcs?.find(n => n.x === x && n.y === y);
      if (npcHere) { setActiveDialogue(npcHere); return; }

      const collectible = zone.collectibles?.find(c => c.x === x && c.y === y && !collectedItems.has(c.id));
      if (collectible) {
        setCredits((c) => c + collectible.reward);
        setCollectedItems((prev) => new Set([...prev, collectible.id]));
        pushLog(`${collectible.label}. (+${collectible.reward} credits)`);
      }

      setPos({ x, y });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pos, map, zone, facing, showTravel, activeDialogue, transitioning, collectedItems, pushLog, travelToZone]);

  const camX = Math.max(0, Math.min(zone.width - VIEWPORT_COLS, pos.x - Math.floor(VIEWPORT_COLS / 2)));
  const camY = Math.max(0, Math.min(zone.height - VIEWPORT_ROWS, pos.y - Math.floor(VIEWPORT_ROWS / 2)));

  const collectiblesHeld = collectedItems.size;

  return (
    <div style={{ minHeight:'100vh',background:zone.bg,color:'#C9C5BE',fontFamily:"'IBM Plex Mono',ui-monospace,monospace",display:'flex',flexDirection:'column',gap:16,padding:20,position:'relative',overflow:'hidden',transition:'background 0.6s ease' }}>
      <GlobalAnimations />
      {zone.textureId === 'coruscant' && <CoruscantBackdrop accent={zone.accent} accentDim={zone.accentDim} />}
      <AmbientLayer kind={zone.ambient} accent={zone.accent} />

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline',position:'relative',zIndex:2 }}>
        <div>
          <div style={{ fontSize:18,fontWeight:600,color:zone.accent,textShadow:`0 0 12px ${zone.accentGlow}` }}>{zone.name}</div>
          <div style={{ fontSize:11,color:'#7A7F94',marginTop:2 }}>{zone.subtitle}</div>
        </div>
        <div style={{ display:'flex',gap:16,alignItems:'baseline' }}>
          <div style={{ fontSize:11,color:'#5A5F74' }}>{collectiblesHeld} items found</div>
          <div style={{ fontSize:13,color:'#E8C97A' }}>{credits} cr</div>
        </div>
      </div>

      <div style={{ display:'flex',gap:20,flexWrap:'wrap',position:'relative',zIndex:2 }}>
        <div>
          <div style={{ border:`1px solid ${zone.accentDim}`,background:zone.wallDark,boxShadow:`0 0 24px ${zone.accentGlow}`,display:'inline-block' }}>
            {Array.from({ length: VIEWPORT_ROWS }, (_, vy) => {
              const ty = camY + vy;
              return (
                <div key={ty} style={{ display:'flex' }}>
                  {Array.from({ length: VIEWPORT_COLS }, (_, vx) => {
                    const tx = camX + vx;
                    const tile = map[ty]?.[tx] || { type: 'wall' };
                    const isPlayer = pos.x === tx && pos.y === ty;
                    const npcHere = zone.npcs?.find(n => n.x === tx && n.y === ty);
                    const collectibleHere = zone.collectibles?.find(c => c.x === tx && c.y === ty && !collectedItems.has(c.id));
                    const doorHere = zone.doors?.find(d => d.x === tx && d.y === ty);

                    let bg = zone.wallDark;
                    if (tile.type === 'floor') bg = floorBackground(zone, tx, ty);
                    if (tile.type === 'wall') bg = wallBackground(zone, tx, ty);
                    if (tile.type === 'ship_hull') bg = `linear-gradient(135deg, #2A2A3A, #1A1A26)`;
                    if (tile.type === 'ship_ramp') bg = `repeating-linear-gradient(45deg, #2C2C3C, #2C2C3C 4px, #383848 4px, #383848 8px)`;
                    if (tile.type === 'door') bg = `radial-gradient(circle, ${zone.accentDim}88, #0D0E16)`;
                    if (tile.type === 'lava') bg = `radial-gradient(circle at 40% 40%, #FF5500, #AA2000)`;
                    if (tile.type === 'water') bg = `radial-gradient(circle at 60% 60%, #1A4A8A, #0A1E3A)`;
                    if (npcHere || collectibleHere) bg = floorBackground(zone, tx, ty);

                    return (
                      <div key={tx} style={{ width:TILE,height:TILE,position:'relative',background:bg,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:isPlayer?`inset 0 0 0 1.5px ${zone.accent}`:'none',flexShrink:0 }}>
                        {tile.type === 'wall' && wallDecorFor(zone, tx, ty) && <DecorIcon kind={wallDecorFor(zone, tx, ty)} accent={zone.accent} />}
                        {tile.type === 'floor' && !isPlayer && !npcHere && !collectibleHere && decorFor(zone, tx, ty) && <DecorIcon kind={decorFor(zone, tx, ty)} accent={zone.accent} />}
                        {tile.type === 'ship_hull' && (
                          <svg viewBox="0 0 32 32" width={TILE} height={TILE} style={{ position:'absolute',inset:0,pointerEvents:'none' }}>
                            <line x1="0" y1="8" x2="32" y2="8" stroke="#FFFFFF" strokeWidth="0.4" opacity="0.12" />
                            <line x1="0" y1="16" x2="32" y2="16" stroke="#FFFFFF" strokeWidth="0.4" opacity="0.12" />
                            <line x1="0" y1="24" x2="32" y2="24" stroke="#FFFFFF" strokeWidth="0.4" opacity="0.12" />
                            <line x1="8" y1="0" x2="8" y2="32" stroke="#FFFFFF" strokeWidth="0.4" opacity="0.08" />
                            <line x1="16" y1="0" x2="16" y2="32" stroke="#FFFFFF" strokeWidth="0.4" opacity="0.08" />
                          </svg>
                        )}
                        {tile.type === 'ship_ramp' && (
                          <div style={{ fontSize:8,color:zone.accent,opacity:0.7,textAlign:'center',lineHeight:1.2 }}>▼<br/>EXIT</div>
                        )}
                        {doorHere && !isPlayer && (
                          <div style={{ animation:'door-pulse 2s ease-in-out infinite',fontSize:9,color:zone.accent,textAlign:'center' }}>▶<br/><span style={{fontSize:7}}>{doorHere.label}</span></div>
                        )}
                        {tile.type === 'lava' && (
                          <svg viewBox="0 0 32 32" width={TILE} height={TILE} style={{ position:'absolute',inset:0,pointerEvents:'none' }}>
                            <ellipse cx="10" cy="16" rx="6" ry="3" fill="#FF7722" opacity="0.4" style={{ animation:'door-pulse 1.8s ease-in-out infinite' }} />
                            <ellipse cx="22" cy="20" rx="5" ry="2.5" fill="#FF9944" opacity="0.35" style={{ animation:'door-pulse 2.2s ease-in-out 0.4s infinite' }} />
                          </svg>
                        )}
                        {tile.type === 'water' && (
                          <svg viewBox="0 0 32 32" width={TILE} height={TILE} style={{ position:'absolute',inset:0,pointerEvents:'none' }}>
                            <path d="M4 16 Q8 12 12 16 Q16 20 20 16 Q24 12 28 16" stroke="#4488CC" strokeWidth="1" fill="none" opacity="0.5" style={{ animation:'mist-drift 3s ease-in-out infinite' }} />
                          </svg>
                        )}
                        {npcHere && !isPlayer && (
                          <div style={{ position:'absolute',bottom:0,left:'50%',zIndex:5,animation:'npc-sway 4.2s ease-in-out infinite' }}>
                            <NpcPortrait kind={npcHere.kind} accent={zone.accent} />
                          </div>
                        )}
                        {collectibleHere && !isPlayer && (
                          <div style={{ animation:'collectible-bob 2.3s ease-in-out infinite' }}>
                            <CollectibleIcon />
                          </div>
                        )}
                        {isPlayer && (
                          <div style={{ position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',zIndex:6 }}>
                            <PlayerMarker accent={zone.accent} facing={facing} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:8,fontSize:10,color:'#5A5F74' }}>WASD / arrow keys to move &nbsp;&middot;&nbsp; walk ramp to travel &nbsp;&middot;&nbsp; walk door to change zones</div>
        </div>

        <div style={{ flex:1,minWidth:220,display:'flex',flexDirection:'column',gap:12 }}>
          <AlignmentPanel alignment={alignment} />

          <div style={{ border:'1px solid #24242E',padding:12 }}>
            <div style={{ fontSize:10,color:'#5A5F74',marginBottom:6 }}>minimap</div>
            <Minimap zone={zone} map={map} pos={pos} camX={camX} camY={camY} />
          </div>

          <div style={{ border:'1px solid #24242E',padding:12 }}>
            <div style={{ fontSize:10,color:'#5A5F74',marginBottom:8 }}>inventory</div>
            {inventory.map((item, i) => (
              <div key={i} style={{ fontSize:12,padding:'4px 0',borderBottom:i<inventory.length-1?'1px solid #1C1C26':'none' }}>{item}</div>
            ))}
          </div>

          <div style={{ border:'1px solid #24242E',padding:12,flex:1,minHeight:120 }}>
            <div style={{ fontSize:10,color:'#5A5F74',marginBottom:8 }}>log</div>
            {log.map((entry, i) => (
              <div key={i} style={{ fontSize:12,color:i===0?zone.accent:'#6A6F84',padding:'3px 0' }}>{entry}</div>
            ))}
          </div>
        </div>
      </div>

      {transitioning && (
        <div style={{ position:'absolute',inset:0,background:'rgba(4,4,8,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:30,animation:'door-pulse 0.5s ease-in-out infinite' }}>
          <div style={{ color:zone.accent,fontSize:14,letterSpacing:'0.2em' }}>...</div>
        </div>
      )}
      {showTravel && <TravelOverlay currentPlanetId={planetId} credits={credits} onTravel={travelToPlanet} onClose={() => setShowTravel(false)} />}
      {activeDialogue && <DialogueOverlay npc={activeDialogue} onChoose={resolveChoice} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<StarWarsRPG />);
