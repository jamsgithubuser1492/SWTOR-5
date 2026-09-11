import React, { useState, useEffect, useCallback } from 'react';

// ==========================================
// 0. GLOBAL IDLE ANIMATIONS
// One shared stylesheet so every living or powered element has its own
// small motion instead of standing perfectly still.
// ==========================================
function GlobalAnimations() {
  return (
    <style>{`
      @keyframes npc-sway { 0%, 100% { transform: translateX(-50%) translateY(0) rotate(0deg); } 50% { transform: translateX(-50%) translateY(-1.5px) rotate(0.6deg); } }
      @keyframes npc-blink { 0%, 92%, 100% { opacity: 0; } 94%, 96% { opacity: 1; } }
      @keyframes lens-flicker { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.9; } }
      @keyframes tail-flick { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(9deg); } }
      @keyframes lekku-sway-l { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-5deg); } }
      @keyframes lekku-sway-r { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(5deg); } }
      @keyframes player-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
      @keyframes ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes shard-bob { 0%, 100% { transform: translateY(0); filter: drop-shadow(0 0 2px rgba(232,201,122,0.4)); } 50% { transform: translateY(-2px); filter: drop-shadow(0 0 5px rgba(232,201,122,0.85)); } }
      @keyframes twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.9; } }
    `}</style>
  );
}

// ==========================================
// 1. PLANET & SHARD DEFINITIONS
// ==========================================

const GRID_SIZE = 13;
const TILE = 26;

const PLANETS = {
  coruscant: {
    id: 'coruscant',
    name: 'Coruscant',
    subtitle: 'Galactic Capital \u00b7 Jedi Temple District',
    description: 'Endless spires and skylanes. Someone up here has been burying the truth.',
    travelCost: 0,
    accent: '#8FA6FF',
    accentGlow: 'rgba(143,166,255,0.25)',
    accentDim: '#3D4A80',
    floorColor: '#242840',
    floorAlt: '#2E3350',
    wallDark: '#0D0E16',
    wallLight: '#181B2C',
    bg: 'radial-gradient(circle at 30% 20%, #171A2C 0%, #0B0C14 70%)',
    ambient: 'traffic',
    npc: {
      x: 8, y: 6, kind: 'jedi', label: 'Jedi Archivist',
      prompt: 'The Archivist lowers her voice. "A Senator has flagged three inquiries into shard smuggling as classified. I should not be telling you this."',
      choices: [
        { text: 'Report this to the Jedi Council.', morality: 18, loyalty: { republic: 10 }, result: 'The Council opens a quiet investigation. You feel lighter for it.' },
        { text: 'Offer to bury it deeper, for a price.', morality: -20, loyalty: { underworld: 12 }, result: 'She hesitates, then hands you a datachip. Some doors do not close cleanly.' },
      ],
    },
    shard: { x: 11, y: 2, label: 'First Shard: buried in Temple archives', reward: 180 },
  },
  ferrowake: {
    id: 'ferrowake',
    name: 'Ferrowake',
    subtitle: 'Forge Moon \u00b7 Outer Foundries',
    description: 'Slag rivers and furnace light. The ore here has started whispering.',
    travelCost: 60,
    accent: '#FF9A5A',
    accentGlow: 'rgba(255,154,90,0.28)',
    accentDim: '#7A3C1E',
    floorColor: '#3A2418',
    floorAlt: '#472C1D',
    wallDark: '#120A06',
    wallLight: '#20120A',
    bg: 'radial-gradient(circle at 70% 80%, #2A150A 0%, #150D08 70%)',
    ambient: 'embers',
    npc: {
      x: 4, y: 9, kind: 'broker', label: 'Foundry Broker',
      prompt: 'The Broker wipes soot from his hands. "Three workers stopped sleeping right after the last shipment. I can pull them off the line, or I can pretend I never noticed."',
      choices: [
        { text: 'Insist he pulls the workers off immediately.', morality: 15, loyalty: { republic: 5 }, result: 'He grumbles but agrees. Fewer shards ship out tainted this week.' },
        { text: 'Tell him to keep production moving.', morality: -18, loyalty: { sithEmpire: 10, underworld: 8 }, result: 'He nods slowly. The furnace glow feels a little colder tonight.' },
      ],
    },
    shard: { x: 2, y: 3, label: 'Second Shard: smelted into a weapon core', reward: 220 },
  },
  verdanth: {
    id: 'verdanth',
    name: 'Verdanth',
    subtitle: 'Ruin World \u00b7 The Sunken Temples',
    description: 'Root systems swallowed the old shrines centuries ago. This is where it started.',
    travelCost: 90,
    accent: '#6FD9A0',
    accentGlow: 'rgba(111,217,160,0.25)',
    accentDim: '#2C5940',
    floorColor: '#1E3327',
    floorAlt: '#26402F',
    wallDark: '#091009',
    wallLight: '#132018',
    bg: 'radial-gradient(circle at 50% 60%, #14261C 0%, #081410 70%)',
    ambient: 'mist',
    npc: {
      x: 9, y: 4, kind: 'warden', label: 'Relic Warden',
      prompt: 'The Warden studies you for a long moment. "The temple remembers what was buried here. It will show itself to you, or it will bury you with it."',
      choices: [
        { text: 'Ask it to show you the truth, whatever the cost.', morality: -8, loyalty: {}, result: 'The ruins shift. Something ancient takes interest in you.' },
        { text: 'Ask the Warden to seal the chamber instead.', morality: 12, loyalty: { republic: 6 }, result: 'The Warden exhales, relieved. "Not every door needs opening."' },
      ],
    },
    shard: { x: 6, y: 10, label: 'Final Shard: the temple\u2019s heart', reward: 260 },
  },
};

const LANDING_PAD = { x: 6, y: 11 };

// ==========================================
// 2. DETERMINISTIC TEXTURE HASH
// Same input always gives the same texture, so the map looks organic
// instead of random per render.
// ==========================================
function hash(x, y) {
  return Math.abs((x * 73856093) ^ (y * 19349663)) % 100;
}

function floorBackground(planet, x, y) {
  const h = hash(x, y);
  if (planet.id === 'coruscant') {
    if (h < 10) return `linear-gradient(180deg, ${planet.accentDim}55, ${planet.floorColor})`;
    if (h < 20) return `linear-gradient(90deg, ${planet.floorAlt}, ${planet.floorColor})`;
    if (h < 26) return `linear-gradient(45deg, ${planet.floorColor} 46%, #E8C97A55 48%, #E8C97A55 50%, ${planet.floorColor} 52%)`;
    return planet.floorColor;
  }
  if (planet.id === 'ferrowake') {
    if (h < 12) return `linear-gradient(135deg, #FF9A5A33, ${planet.floorColor})`;
    if (h < 26) return `linear-gradient(45deg, ${planet.floorAlt}, ${planet.floorColor})`;
    return planet.floorColor;
  }
  if (h < 14) return `radial-gradient(circle at 40% 40%, #6FD9A033, ${planet.floorColor} 75%)`;
  if (h < 28) return `linear-gradient(60deg, ${planet.floorAlt}, ${planet.floorColor})`;
  return planet.floorColor;
}

const DECOR_BY_PLANET = {
  coruscant: ['pillar', 'brazier', 'plant', 'archive', 'insignia'],
  ferrowake: ['pipe', 'girder', 'slag'],
  verdanth: ['root', 'moss', 'rubble'],
};

function decorFor(planet, x, y) {
  const kinds = DECOR_BY_PLANET[planet.id];
  const bucket = Math.floor(15 / kinds.length);
  const h = hash(x * 3 + 7, y * 5 + 11);
  const idx = Math.floor(h / bucket);
  if (h < kinds.length * bucket && idx < kinds.length) return kinds[idx];
  return null;
}

function wallDecorFor(planet, x, y) {
  if (planet.id !== 'coruscant') return null;
  const h = hash(x * 11 + 3, y * 7 + 2);
  return h < 8 ? 'wall_insignia' : null;
}

function wallBackground(planet, x, y) {
  const h = hash(x + 5, y + 5);
  const a = h % 2 === 0 ? planet.wallDark : planet.wallLight;
  if (planet.id === 'coruscant') {
    return `repeating-linear-gradient(180deg, ${a}, ${a} 5px, ${planet.wallDark} 5px, ${planet.wallDark} 10px)`;
  }
  if (planet.id === 'ferrowake') {
    return `repeating-linear-gradient(135deg, ${a}, ${a} 4px, ${planet.wallDark} 4px, ${planet.wallDark} 8px)`;
  }
  return `repeating-linear-gradient(100deg, ${a}, ${a} 4px, ${planet.wallDark} 4px, ${planet.wallDark} 9px)`;
}

// ==========================================
// 3. MAP GENERATION
// ==========================================
function buildMap(planet) {
  const grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      let tile = { type: 'floor' };

      const isBoundary = x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1;
      const isInteriorWall =
        (x === 5 && y > 1 && y < 8) ||
        (x === 9 && y > 4 && y < 11 && x !== LANDING_PAD.x);

      if (isBoundary || isInteriorWall) {
        tile = { type: 'wall' };
      } else if (x === LANDING_PAD.x && y === LANDING_PAD.y) {
        tile = { type: 'landing_pad' };
      } else if (x === planet.npc.x && y === planet.npc.y) {
        tile = { type: 'npc' };
      } else if (x === planet.shard.x && y === planet.shard.y) {
        tile = { type: 'shard' };
      }

      row.push(tile);
    }
    grid.push(row);
  }
  return grid;
}

// ==========================================
// 4. HAND BUILT ICONS (SVG, not emoji)
// ==========================================
function NpcPortrait({ kind, accent }) {
  if (kind === 'jedi') {
    const skin = '#D9B98C';
    const robe = '#3C4166';
    const robeDark = '#2A2E4A';
    const trim = accent;
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <path d="M6 42 L8 22 L22 22 L24 42 Z" fill={robe} />
        <path d="M6 42 L9 24 L15 24 L13 42 Z" fill={robeDark} opacity="0.5" />
        <path d="M9 22 L21 22 L19 12 L11 12 Z" fill={robe} />
        <path d="M14 12 L16 12 L17 22 L13 22 Z" fill={trim} opacity="0.5" />
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
        <rect x="20.3" y="19" width="1.4" height="1.6" fill={trim} />
      </svg>
    );
  }
  if (kind === 'broker') {
    const skin = '#8FBF9E';
    const skinDark = '#5F8C6D';
    const suit = '#5A4230';
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <path d="M8 42 L9 26 L21 26 L22 42 Z" fill={suit} />
        <rect x="10" y="24" width="10" height="14" fill="#3A2A1C" opacity="0.7" />
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
    const skin = '#3E6B52';
    const skinLight = '#5C9678';
    const robe = '#22331F';
    return (
      <svg viewBox="0 0 32 44" width="27" height="37">
        <path d="M7 44 L8 24 L22 24 L23 44 Z" fill={robe} />
        <path d="M9 24 L21 24 L19 14 L11 14 Z" fill={robe} />
        <g style={{ transformBox: 'fill-box', transformOrigin: '0% 100%', animation: 'tail-flick 3.6s ease-in-out infinite' }}>
          <path d="M22 40 C27 39 29 34 26 30" stroke={skin} strokeWidth="2.4" fill="none" />
        </g>
        <ellipse cx="15" cy="10" rx="5.4" ry="5.8" fill={skin} />
        <path d="M15 12 C17 12.5 19 13 20 14 C18 14.6 16 14.4 14.5 13.6 Z" fill={skinLight} />
        <circle cx="12" cy="8" r="0.6" fill={skinLight} opacity="0.6" />
        <circle cx="17.5" cy="7" r="0.5" fill={skinLight} opacity="0.5" />
        <circle cx="14" cy="12.5" r="0.5" fill={skinLight} opacity="0.5" />
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
  return null;
}

function ShardIcon({ accent }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17">
      <polygon points="12,1 19,10 12,23 5,10" fill={accent} />
      <polygon points="12,1 15.5,10 12,15 8.5,10" fill="#FFFFFF" opacity="0.28" />
    </svg>
  );
}

function LandingIcon({ accent }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <g style={{ transformOrigin: '12px 12px', animation: 'ring-spin 7s linear infinite' }}>
        <circle cx="12" cy="12" r="10" fill="none" stroke={accent} strokeWidth="1.3" opacity="0.65" strokeDasharray="6 4" />
      </g>
      <circle cx="12" cy="12" r="5.5" fill="none" stroke={accent} strokeWidth="1.3" />
      <circle cx="12" cy="12" r="1.6" fill={accent} />
    </svg>
  );
}

function DecorIcon({ kind, accent }) {
  const shared = { pointerEvents: 'none' };
  switch (kind) {
    case 'pillar':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" style={shared}>
          <circle cx="12" cy="12" r="8.5" fill="#00000050" />
          <circle cx="12" cy="12" r="8.5" fill="none" stroke={accent} strokeWidth="1" opacity="0.4" />
          <circle cx="12" cy="12" r="5" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.5" />
          <circle cx="12" cy="12" r="1.6" fill={accent} opacity="0.6" />
        </svg>
      );
    case 'brazier': {
      const flicker = `bz-${Math.round(accent.charCodeAt(1))}`;
      return (
        <svg viewBox="0 0 24 24" width="14" height="17" style={shared}>
          <style>{`@keyframes ${flicker} { 0%,100% { opacity: 0.55; } 50% { opacity: 0.95; } }`}</style>
          <path d="M6 17 L18 17 L15 21 L9 21 Z" fill="#00000070" />
          <ellipse cx="12" cy="17" rx="6.5" ry="2" fill="#00000060" />
          <path d="M12 6 C9 9.5 9 12.5 12 14.5 C15 12.5 15 9.5 12 6 Z" fill={accent} opacity="0.8" style={{ animation: `${flicker} 2.4s ease-in-out infinite` }} />
          <path d="M12 8.5 C10.6 10.3 10.6 12 12 13.2 C13.4 12 13.4 10.3 12 8.5 Z" fill="#FFFFFF" opacity="0.55" />
        </svg>
      );
    }
    case 'plant':
      return (
        <svg viewBox="0 0 24 24" width="14" height="16" style={shared}>
          <rect x="9" y="17" width="6" height="5" fill="#00000060" />
          <path d="M12 17 C10 14 8 12 7 8 C10 10 11 13 12 15.5 C13 13 14 10 17 8 C16 12 14 14 12 17 Z" fill={accent} opacity="0.55" />
          <path d="M12 16 C11 13.5 10 12 9.5 9.5 C11 11 11.6 13 12 14.5 Z" fill={accent} opacity="0.35" />
        </svg>
      );
    case 'archive':
      return (
        <svg viewBox="0 0 24 24" width="16" height="15" style={shared}>
          <rect x="3" y="4" width="18" height="16" fill="#00000066" />
          <rect x="5" y="6" width="4" height="4" fill={accent} opacity="0.6" />
          <rect x="10" y="6" width="4" height="4" fill={accent} opacity="0.3" />
          <rect x="15" y="6" width="4" height="4" fill={accent} opacity="0.5" />
          <rect x="5" y="12" width="4" height="4" fill={accent} opacity="0.3" />
          <rect x="10" y="12" width="4" height="4" fill={accent} opacity="0.6" />
          <rect x="15" y="12" width="4" height="4" fill={accent} opacity="0.4" />
        </svg>
      );
    case 'insignia':
      return (
        <svg viewBox="0 0 24 24" width="17" height="17" style={shared}>
          <circle cx="12" cy="12" r="9" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.35" />
          <path d="M12 4 L14 11 L20 12 L14 13 L12 20 L10 13 L4 12 L10 11 Z" fill={accent} opacity="0.3" />
        </svg>
      );
    case 'wall_insignia':
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" style={shared}>
          <circle cx="12" cy="12" r="7" fill="none" stroke={accent} strokeWidth="1" opacity="0.3" />
          <circle cx="12" cy="12" r="3" fill={accent} opacity="0.25" />
        </svg>
      );
    case 'pipe':
      return (
        <svg viewBox="0 0 24 8" width="19" height="7" style={shared}>
          <rect x="1" y="2" width="22" height="4" rx="2" fill="#00000055" />
          <rect x="1" y="2" width="22" height="1.4" fill={accent} opacity="0.35" />
        </svg>
      );
    case 'girder':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" style={shared}>
          <line x1="2" y1="22" x2="22" y2="2" stroke="#00000066" strokeWidth="4" />
          <line x1="2" y1="22" x2="22" y2="2" stroke={accent} strokeWidth="1" opacity="0.3" />
        </svg>
      );
    case 'slag':
      return (
        <svg viewBox="0 0 24 12" width="15" height="8" style={shared}>
          <ellipse cx="12" cy="6" rx="10" ry="4.5" fill={accent} opacity="0.35" />
          <circle cx="9" cy="5" r="1" fill="#FFD9A0" opacity="0.7" />
          <circle cx="14" cy="7" r="0.8" fill="#FFD9A0" opacity="0.55" />
        </svg>
      );
    case 'root':
      return (
        <svg viewBox="0 0 24 24" width="17" height="17" style={shared}>
          <path d="M2 2 Q10 10 4 20 Q14 16 22 22" stroke="#0000004d" strokeWidth="3" fill="none" />
          <path d="M2 2 Q10 10 4 20 Q14 16 22 22" stroke={accent} strokeWidth="1" fill="none" opacity="0.4" />
        </svg>
      );
    case 'moss':
      return (
        <svg viewBox="0 0 24 14" width="15" height="9" style={shared}>
          <circle cx="8" cy="8" r="4" fill={accent} opacity="0.3" />
          <circle cx="15" cy="9" r="3" fill={accent} opacity="0.25" />
          <circle cx="11.5" cy="5.5" r="2.6" fill={accent} opacity="0.35" />
        </svg>
      );
    case 'rubble':
      return (
        <svg viewBox="0 0 24 16" width="15" height="10" style={shared}>
          <polygon points="2,10 8,4 14,8 10,12" fill="#00000055" />
          <polygon points="14,10 20,6 22,12 16,14" fill="#00000044" />
        </svg>
      );
    default:
      return null;
  }
}

function PlayerMarker({ accent, facing }) {
  const skin = '#D9B98C';
  const hair = '#3A2E22';
  const tunic = '#8C8172';
  const vest = '#4A4038';
  const pants = '#5A5548';
  const boots = '#2A241E';
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
          <rect x="17.3" y="19.5" width="1.6" height="3.4" fill="#C9C5BE" />
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

// ==========================================
// 5. AMBIENT PARTICLE LAYER
// ==========================================
function CoruscantBackdrop({ accent, accentDim }) {
  const buildings = [
    { x: 0, w: 40, h: 90 }, { x: 45, w: 30, h: 130 }, { x: 80, w: 50, h: 70 },
    { x: 135, w: 25, h: 160 }, { x: 165, w: 60, h: 100 }, { x: 230, w: 35, h: 140 },
    { x: 270, w: 45, h: 80 }, { x: 320, w: 30, h: 175 }, { x: 500, w: 40, h: 150 },
    { x: 545, w: 60, h: 110 }, { x: 610, w: 30, h: 165 }, { x: 645, w: 50, h: 90 },
    { x: 700, w: 35, h: 145 }, { x: 740, w: 60, h: 100 }, { x: 800, w: 40, h: 130 },
  ];
  return (
    <svg viewBox="0 0 900 200" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 170, opacity: 0.55, pointerEvents: 'none' }}>
      <defs>
        <linearGradient id="coruscantFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0B0C14" stopOpacity="0" />
          <stop offset="100%" stopColor="#0B0C14" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={200 - b.h} width={b.w} height={b.h} fill={accentDim} opacity="0.55" />
          {Array.from({ length: Math.floor(b.h / 18) }).map((_, wi) => (
            <rect key={wi} x={b.x + 6} y={200 - b.h + 8 + wi * 18} width={4} height={4} fill={accent} opacity={(i + wi) % 3 === 0 ? 0.85 : 0.15} />
          ))}
        </g>
      ))}
      {Array.from({ length: 22 }).map((_, i) => (
        <circle
          key={`star-${i}`}
          cx={(i * 137) % 900}
          cy={(i * 53) % 60}
          r={0.8 + (i % 3) * 0.4}
          fill="#FFFFFF"
          style={{ animation: `twinkle ${3 + (i % 4)}s ease-in-out ${(i % 5) * 0.4}s infinite` }}
        />
      ))}
      {/* Jedi Temple: tall central spire flanked by four shorter corner spires */}
      <g transform="translate(365,0)">
        <polygon points="30,200 30,105 60,85 60,200" fill={accentDim} opacity="0.6" />
        <polygon points="130,200 130,85 160,105 160,200" fill={accentDim} opacity="0.6" />
        <polygon points="60,200 60,55 95,25 130,55 130,200" fill={accentDim} opacity="0.75" />
        <polygon points="40,85 47,68 54,85" fill={accent} opacity="0.55" />
        <polygon points="136,85 143,68 150,85" fill={accent} opacity="0.55" />
        <polygon points="82,25 95,4 108,25" fill={accent} opacity="0.85" />
      </g>
      <rect x="0" y="0" width="900" height="200" fill="url(#coruscantFade)" />
    </svg>
  );
}

function SpeederIcon({ accent }) {
  return (
    <svg viewBox="0 0 24 10" width="22" height="9" style={{ overflow: 'visible' }}>
      <rect x="-14" y="4" width="14" height="1.4" fill={accent} opacity="0.35" />
      <path d="M2 5 Q6 2 12 3 L20 4 Q22 5 20 6 L12 7 Q6 8 2 5 Z" fill={accent} opacity="0.95" />
      <circle cx="9" cy="5" r="0.8" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
}

function AmbientLayer({ kind, accent }) {
  const particles = Array.from({ length: 14 });
  if (kind === 'traffic') {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0.7 }}>
        {particles.map((_, i) => {
          const left = (i * 37) % 100;
          const top = 8 + ((i * 13) % 55);
          const delay = (i % 7) * 0.6;
          const duration = 5 + (i % 5);
          return (
            <div key={i} style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, animation: `traffic-drift ${duration}s linear ${delay}s infinite` }}>
              <SpeederIcon accent={accent} />
            </div>
          );
        })}
        <style>{`
          @keyframes traffic-drift { 0% { transform: translateX(-60px); opacity: 0; } 12% { opacity: 0.9; } 88% { opacity: 0.9; } 100% { transform: translateX(60px); opacity: 0; } }
        `}</style>
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0.5 }}>
      {particles.map((_, i) => {
        const left = (i * 37) % 100;
        const delay = (i % 7) * 0.6;
        const duration = 6 + (i % 5);
        const size = kind === 'embers' ? 3 + (i % 3) : kind === 'mist' ? 40 + (i % 4) * 20 : 2;
        const style = {
          position: 'absolute', left: `${left}%`,
          bottom: kind === 'traffic' ? `${(i * 13) % 100}%` : '-10%',
          width: size, height: kind === 'mist' ? size * 0.4 : size,
          borderRadius: kind === 'traffic' ? 2 : '50%',
          background: kind === 'mist' ? `${accent}22` : accent,
          filter: kind === 'mist' ? 'blur(6px)' : 'none',
          animation: `${kind}-drift ${duration}s linear ${delay}s infinite`,
        };
        return <div key={i} style={style} />;
      })}
      <style>{`
        @keyframes embers-drift { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 0.9; } 100% { transform: translateY(-320px); opacity: 0; } }
        @keyframes mist-drift { 0% { transform: translateX(-20px); opacity: 0; } 20% { opacity: 0.7; } 100% { transform: translateX(20px); opacity: 0; } }
      `}</style>
    </div>
  );
}

// ==========================================
// 6. DIALOGUE OVERLAY
// ==========================================
function DialogueOverlay({ npc, onChoose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,4,8,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25 }}>
      <div style={{ width: 'min(92%, 480px)', border: '1px solid #2A2A38', background: '#0E0E16', fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #2A2A38', color: '#E8C97A', fontSize: 13, fontWeight: 600 }}>{npc.label}</div>
        <div style={{ padding: '16px 18px', color: '#C9C5BE', fontSize: 13, lineHeight: 1.6, borderBottom: '1px solid #1C1C26' }}>{npc.prompt}</div>
        {npc.choices.map((choice, i) => (
          <div key={i} onClick={() => onChoose(choice)} style={{ padding: '14px 18px', borderBottom: i < npc.choices.length - 1 ? '1px solid #1C1C26' : 'none', cursor: 'pointer', fontSize: 12.5, color: '#A8ADC0' }}>
            &gt; {choice.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 7. TRAVEL OVERLAY
// ==========================================
function TravelOverlay({ currentPlanetId, credits, onTravel, onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,4,8,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
      <div style={{ width: 'min(92%, 480px)', border: '1px solid #2A2A38', background: '#0E0E16', fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #2A2A38', color: '#8890A8', fontSize: 11, letterSpacing: '0.08em' }}>hyperspace docking manifest</div>
        {Object.values(PLANETS).map((p) => {
          const isCurrent = p.id === currentPlanetId;
          const canAfford = credits >= p.travelCost;
          return (
            <div key={p.id} onClick={() => !isCurrent && canAfford && onTravel(p.id)} style={{ padding: '14px 18px', borderBottom: '1px solid #1C1C26', cursor: isCurrent || !canAfford ? 'default' : 'pointer', opacity: isCurrent ? 0.4 : canAfford ? 1 : 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: p.accent, fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: '#7A7F94', fontSize: 11, marginTop: 2 }}>{p.subtitle}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: '#A8ADC0' }}>{isCurrent ? 'docked here' : p.travelCost === 0 ? 'no fee' : `${p.travelCost} cr`}</div>
            </div>
          );
        })}
        <div onClick={onClose} style={{ padding: '12px 18px', textAlign: 'center', color: '#5A5F74', fontSize: 12, cursor: 'pointer' }}>cancel</div>
      </div>
    </div>
  );
}

// ==========================================
// 8. ALIGNMENT PANEL
// ==========================================
function AlignmentPanel({ alignment }) {
  const { morality, loyalty } = alignment;
  const moralityPct = ((morality + 100) / 200) * 100;
  const bar = (label, value, color) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#7A7F94', marginBottom: 3 }}>
        <span>{label}</span><span>{value}</span>
      </div>
      <div style={{ height: 4, background: '#1C1C26' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
  return (
    <div style={{ border: '1px solid #24242E', padding: 12 }}>
      <div style={{ fontSize: 10, color: '#5A5F74', marginBottom: 10 }}>alignment matrix</div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#7A7F94', marginBottom: 3 }}>
          <span>dark</span><span>light</span>
        </div>
        <div style={{ height: 4, background: 'linear-gradient(90deg, #8B2E1F, #1C1C26 50%, #6FD9A0)' }}>
          <div style={{ position: 'relative', height: '100%' }}>
            <div style={{ position: 'absolute', left: `${moralityPct}%`, top: -3, width: 2, height: 10, background: '#E8C97A' }} />
          </div>
        </div>
      </div>
      {bar('republic standing', loyalty.republic, '#8FA6FF')}
      {bar('sith empire standing', loyalty.sithEmpire, '#FF9A5A')}
      {bar('underworld standing', loyalty.underworld, '#6FD9A0')}
    </div>
  );
}

// ==========================================
// 9. MAIN GAME
// ==========================================
export default function StarWarsRPG() {
  const [planetId, setPlanetId] = useState('coruscant');
  const planet = PLANETS[planetId];

  const [map, setMap] = useState(() => buildMap(PLANETS.coruscant));
  const [pos, setPos] = useState({ x: 2, y: 2 });
  const [facing, setFacing] = useState(1);
  const [credits, setCredits] = useState(340);
  const [inventory, setInventory] = useState(['Comlink', 'Field Rations']);
  const [shardsHeld, setShardsHeld] = useState([]);
  const [alignment, setAlignment] = useState({ morality: 0, loyalty: { republic: 0, sithEmpire: 0, underworld: 0 } });
  const [showTravel, setShowTravel] = useState(false);
  const [activeDialogue, setActiveDialogue] = useState(null);
  const [log, setLog] = useState([`Docked at ${PLANETS.coruscant.name}.`]);
  const [transitioning, setTransitioning] = useState(false);

  const pushLog = useCallback((msg) => setLog((prev) => [msg, ...prev.slice(0, 7)]), []);

  const travelTo = (destId) => {
    const dest = PLANETS[destId];
    setTransitioning(true);
    pushLog(`Jumping to hyperspace: ${dest.name}...`);
    setCredits((c) => c - dest.travelCost);
    setTimeout(() => {
      setPlanetId(destId);
      setMap(buildMap(dest));
      setPos({ x: 2, y: 2 });
      setShowTravel(false);
      setTransitioning(false);
      pushLog(`Arrived at ${dest.name}. ${dest.description}`);
    }, 650);
  };

  const resolveChoice = (choice) => {
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
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (showTravel || activeDialogue || transitioning) return;
      let { x, y } = pos;
      if (e.key === 'w' || e.key === 'ArrowUp') y -= 1;
      else if (e.key === 's' || e.key === 'ArrowDown') y += 1;
      else if (e.key === 'a' || e.key === 'ArrowLeft') { x -= 1; setFacing(-1); }
      else if (e.key === 'd' || e.key === 'ArrowRight') { x += 1; setFacing(1); }
      else return;

      const tile = map[y]?.[x];
      if (!tile || tile.type === 'wall') { pushLog('Blocked.'); return; }
      if (tile.type === 'landing_pad') { setShowTravel(true); return; }
      if (tile.type === 'npc') { setActiveDialogue(planet.npc); return; }

      if (tile.type === 'shard') {
        setCredits((c) => c + planet.shard.reward);
        setShardsHeld((prev) => (prev.includes(planetId) ? prev : [...prev, planetId]));
        pushLog(`${planet.shard.label}. (+${planet.shard.reward} credits)`);
        setMap((prev) => { const next = prev.map((row) => row.slice()); next[y][x] = { type: 'floor' }; return next; });
      }
      setPos({ x, y });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pos, map, planet, planetId, showTravel, activeDialogue, transitioning, pushLog]);

  return (
    <div style={{ minHeight: '100vh', background: planet.bg, color: '#C9C5BE', fontFamily: "'IBM Plex Mono', ui-monospace, monospace", display: 'flex', flexDirection: 'column', gap: 16, padding: 20, position: 'relative', overflow: 'hidden', transition: 'background 0.6s ease' }}>
      <GlobalAnimations />
      {planet.id === 'coruscant' && <CoruscantBackdrop accent={planet.accent} accentDim={planet.accentDim} />}
      <AmbientLayer kind={planet.ambient} accent={planet.accent} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', position: 'relative', zIndex: 2 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: planet.accent, textShadow: `0 0 12px ${planet.accentGlow}` }}>{planet.name}</div>
          <div style={{ fontSize: 11, color: '#7A7F94', marginTop: 2 }}>{planet.subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          <div style={{ fontSize: 11, color: '#5A5F74' }}>{shardsHeld.length}/3 shards</div>
          <div style={{ fontSize: 13, color: '#E8C97A' }}>{credits} cr</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
        <div style={{ border: `1px solid ${planet.accentDim}`, padding: 10, background: planet.wallDark, boxShadow: `0 0 24px ${planet.accentGlow}` }}>
          {map.map((row, y) => (
            <div key={y} style={{ display: 'flex' }}>
              {row.map((tile, x) => {
                const isPlayer = pos.x === x && pos.y === y;
                let background = planet.floorColor;
                if (tile.type === 'floor') background = floorBackground(planet, x, y);
                if (tile.type === 'wall') background = wallBackground(planet, x, y);
                if (tile.type === 'landing_pad') background = `radial-gradient(circle, ${planet.accentDim}66, ${planet.floorColor} 80%)`;
                if (tile.type === 'npc' || tile.type === 'shard') background = floorBackground(planet, x, y);

                return (
                  <div key={x} style={{ width: TILE, height: TILE, position: 'relative', background, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isPlayer ? `inset 0 0 0 1.5px ${planet.accent}` : 'none' }}>
                    {tile.type === 'wall' && wallDecorFor(planet, x, y) && (
                      <DecorIcon kind={wallDecorFor(planet, x, y)} accent={planet.accent} />
                    )}
                    {tile.type === 'floor' && !isPlayer && decorFor(planet, x, y) && (
                      <DecorIcon kind={decorFor(planet, x, y)} accent={planet.accent} />
                    )}
                    {tile.type === 'landing_pad' && !isPlayer && <LandingIcon accent={planet.accent} />}
                    {tile.type === 'npc' && !isPlayer && (
                      <div style={{ position: 'absolute', bottom: 0, left: '50%', zIndex: 5, animation: 'npc-sway 4.2s ease-in-out infinite' }}>
                        <NpcPortrait kind={planet.npc.kind} accent={planet.accent} />
                      </div>
                    )}
                    {tile.type === 'shard' && !isPlayer && (
                      <div style={{ animation: 'shard-bob 2.3s ease-in-out infinite' }}>
                        <ShardIcon accent="#E8C97A" />
                      </div>
                    )}
                    {isPlayer && (
                      <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 6 }}>
                        <PlayerMarker accent={planet.accent} facing={facing} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 10, color: '#5A5F74' }}>WASD or arrow keys to move &middot; walk onto the docking ring to travel</div>
        </div>

        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AlignmentPanel alignment={alignment} />

          <div style={{ border: '1px solid #24242E', padding: 12 }}>
            <div style={{ fontSize: 10, color: '#5A5F74', marginBottom: 8 }}>inventory</div>
            {inventory.map((item, i) => (
              <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: i < inventory.length - 1 ? '1px solid #1C1C26' : 'none' }}>{item}</div>
            ))}
          </div>

          <div style={{ border: '1px solid #24242E', padding: 12, flex: 1, minHeight: 120 }}>
            <div style={{ fontSize: 10, color: '#5A5F74', marginBottom: 8 }}>log</div>
            {log.map((entry, i) => (
              <div key={i} style={{ fontSize: 12, color: i === 0 ? planet.accent : '#6A6F84', padding: '3px 0' }}>{entry}</div>
            ))}
          </div>
        </div>
      </div>

      {showTravel && <TravelOverlay currentPlanetId={planetId} credits={credits} onTravel={travelTo} onClose={() => setShowTravel(false)} />}
      {activeDialogue && <DialogueOverlay npc={activeDialogue} onChoose={resolveChoice} />}
    </div>
  );
}
