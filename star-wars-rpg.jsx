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
      @keyframes world-obj-pulse { 0%,100%{opacity:0.25;box-shadow:0 0 4px #4ACDFF33;}50%{opacity:0.65;box-shadow:0 0 10px #4ACDFF88;} }
      @keyframes scanDown { from{transform:translateY(0);opacity:0.8;}to{transform:translateY(120vh);opacity:0;} }
      @keyframes drift { from{transform:translate(0,0) scale(1);}to{transform:translate(10px,-8px) scale(1.1);} }
      @keyframes rise { from{transform:translateY(0);opacity:0.5;}to{transform:translateY(-60px);opacity:0;} }
    `}</style>
  );
}

const TILE = 32;
const VIEWPORT_COLS = 20;
const VIEWPORT_ROWS = 13;

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
        width: 32, height: 22, spawnPos: { x: 14, y: 10 }, textureId: 'coruscant',
        accent: '#8FA6FF', accentGlow: 'rgba(143,166,255,0.25)', accentDim: '#3D4A80',
        floorColor: '#242840', floorAlt: '#2E3350', wallDark: '#0D0E16', wallLight: '#181B2C',
        bg: 'radial-gradient(circle at 30% 20%, #171A2C 0%, #0B0C14 70%)', ambient: 'traffic',
        decor: ['cargo_crate', 'pipe', 'neon_sign', 'girder'],
        doors: [
          { x: 31, y: 12, targetZone: 'market', targetPos: { x: 1, y: 10 }, label: 'Market' },
          { x: 31, y: 13, targetZone: 'market', targetPos: { x: 1, y: 11 }, label: 'Market' },
        ],
        worldObjects: [
          { id: 'customs_terminal', x: 22, y: 9, label: 'Customs Terminal', description: 'A flickering datapad logs your entry. Transit clearance: provisional.', once: false },
          { id: 'fueling_conduit', x: 8, y: 18, label: 'Fueling Conduit', description: 'The conduit hisses with residual pressurised fuel. Someone left this running.', once: true },
        ],
        npcs: [
          { id: 'vane', x: 24, y: 11, kind: 'republic_guard', label: 'Officer Vane',
            repeatPrompt: 'Vane gives you a curt nod. You are already cleared.',
            prompt: 'The officer scans your credentials. "Transit papers in order, but the manifest shows four crates unaccounted for. Walk me through your cargo."',
            choices: [
              { text: 'Show the correct papers. Everything is legitimate.', morality: 10, loyalty: { republic: 8 }, result: 'Vane nods. "Welcome to Coruscant. Move along."' },
              { text: 'Slip him a credit chip. No need to look too closely.', morality: -15, loyalty: { underworld: 10 }, result: 'He pockets it smoothly. "Nothing to declare. Have a pleasant stay."' },
            ],
          },
          { id: 'droid44', x: 13, y: 8, kind: 'droid', label: 'Pit Droid Unit 44', mobile: true,
            repeatPrompt: 'Unit 44 is deep in a cataloguing cycle. It does not look up.',
            prompt: '"BEEP BOOP. Cargo secured. Ramp deployed. I have also catalogued seventeen new hull scuffs. Seventeen. Do humans not see the hull?"',
            choices: [
              { text: 'Tell it the scuffs give the ship character.', morality: 5, loyalty: {}, result: 'It pauses for 2.4 seconds. "Character. Processing. Logged."' },
              { text: 'Ask it to stop cataloguing and get back to work.', morality: 0, loyalty: {}, result: '"Acknowledged. Suppressing visual distress subroutine. For now."' },
            ],
          },
          { id: 'marlo', x: 4, y: 16, kind: 'smuggler', label: '"Slick" Marlo', mobile: true,
            repeatPrompt: 'Marlo gives you a lazy two-finger salute. The offer already stands.',
            prompt: 'He leans on the cargo stack without looking at you. "Four unmarked crates in your hold. I can move them past customs clean. Thirty-percent cut."',
            choices: [
              { text: 'Decline. That kind of trouble follows you.', morality: 8, loyalty: { republic: 4 }, result: '"Your loss. Offer stands."' },
              { text: 'Shake on it. Thirty percent is fair.', morality: -18, loyalty: { underworld: 15 }, result: '"Smart. Bay seven, after dark."' },
            ],
          },
          { id: 'jon_spaceport', x: 6, y: 10, kind: 'smuggler', label: 'Jon', questNpc: true,
            hideAfterFlags: ['met_jon_spaceport'],
            repeatPrompt: 'Jon gives you a knowing look. "Head over to my place through the market. You know where I am."',
            prompt: 'Well, look who finally made it off the transport vector intact. Good to see a face that is not collecting a bounty or issuing a customs citation. I have got a partner opening and something worth your time — but not out here in the landing bay.',
            choices: [
              { text: 'Good to see you too. Lead the way.', morality: 5, loyalty: { underworld: 5 }, result: 'Jon claps you on the shoulder. "Follow me through the West Market. Keep your blaster hand loose." He gestures toward the Market District exit.', grants: { flags: ['met_jon_spaceport'] } },
              { text: 'Skip it. What is the opportunity?', morality: 0, loyalty: {}, result: 'Jon lowers his voice. "Not here — too many ears on the landing pad. My apartment. Through the market." He nods toward the exit.', grants: { flags: ['met_jon_spaceport'] } },
              { text: 'I work alone. This better be worth my time.', morality: -5, loyalty: { underworld: 3 }, result: 'Jon smirks. "It will be. My place. West Residential, through the market. You will know the door." He walks away first.', grants: { flags: ['met_jon_spaceport'] } },
            ],
          },
        ],
        collectibles: [{ id: 'fuel_cell', x: 7, y: 9, label: 'Salvaged Fuel Cell', reward: 15 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 8, 30, 20, 'floor');
          carveRect(g, 9, 1, 20, 4, 'ship_hull');
          carveRect(g, 7, 2, 9, 4, 'ship_hull');
          carveRect(g, 20, 2, 22, 4, 'ship_hull');
          carveRect(g, 11, 5, 18, 5, 'ship_hull');
          [[14,6],[15,6],[14,7],[15,7]].forEach(([x,y]) => pt(g,x,y,'ship_ramp'));
          [[2,10],[3,10],[4,10],[2,11],[3,11],[2,14],[3,14],[2,15],[3,15],[5,10],[5,14],[5,15]].forEach(([x,y]) => pt(g,x,y,'wall'));
          [[22,9],[22,10],[22,12],[22,13]].forEach(([x,y]) => pt(g,x,y,'wall'));
          pt(g,31,12,'door'); pt(g,31,13,'door');
          return g;
        },
      },
      market: {
        id: 'market', name: 'Market District', subtitle: 'Coruscant · Lower City Bazaar',
        width: 32, height: 22, spawnPos: { x: 1, y: 10 }, textureId: 'coruscant',
        accent: '#8FA6FF', accentGlow: 'rgba(143,166,255,0.18)', accentDim: '#3A4880',
        floorColor: '#1A1C2A', floorAlt: '#222438', wallDark: '#0C0D16', wallLight: '#181A28',
        bg: 'radial-gradient(circle at 50% 10%, #141628 0%, #080A14 70%)', ambient: 'traffic',
        decor: ['cargo_crate', 'pipe', 'neon_sign', 'girder'],
        doors: [
          { x: 0, y: 10, targetZone: 'spaceport', targetPos: { x: 29, y: 12 }, label: 'Spaceport' },
          { x: 0, y: 11, targetZone: 'spaceport', targetPos: { x: 29, y: 13 }, label: 'Spaceport' },
          { x: 16, y: 0, targetZone: 'apartments', targetPos: { x: 14, y: 18 }, label: 'Apartments' },
          { x: 17, y: 0, targetZone: 'apartments', targetPos: { x: 15, y: 18 }, label: 'Apartments' },
          { x: 31, y: 10, targetZone: 'plaza', targetPos: { x: 1, y: 10 }, label: 'Plaza' },
          { x: 31, y: 11, targetZone: 'plaza', targetPos: { x: 1, y: 11 }, label: 'Plaza' },
        ],
        worldObjects: [
          { id: 'wanted_holo', x: 20, y: 4, label: 'Wanted Holo-Poster', description: 'A Republic bounty. The face on the poster looks vaguely familiar.', once: false },
          { id: 'scrap_bin', x: 6, y: 17, label: 'Scrap Bin', description: 'Buried under junk you find a cracked power cell and a half-eaten protein bar. You take neither.', once: true },
        ],
        npcs: [
          { id: 'archivist', x: 8, y: 6, kind: 'jedi', label: 'Jedi Archivist Sera',
            repeatPrompt: 'Sera gives you a meaningful look. She has already said too much.',
            prompt: 'She lowers her voice. "A Senator has flagged three inquiries into shard smuggling as classified. I should not be telling you this."',
            choices: [
              { text: 'Report this to the Jedi Council.', morality: 18, loyalty: { republic: 10 }, result: 'The Council opens a quiet investigation. You feel lighter for it.' },
              { text: 'Offer to bury it deeper, for a price.', morality: -20, loyalty: { underworld: 12 }, result: 'She hesitates, then hands you a datachip.' },
            ],
          },
          { id: 'market_broker', x: 16, y: 14, kind: 'broker', label: 'Market Broker Eliss',
            repeatPrompt: 'Eliss taps her comm and waves you off. She is with another client.',
            prompt: '"Looking to trade? I have contacts across three systems. Credits talk and everything else is negotiable."',
            choices: [
              { text: 'Ask about the shard market.', morality: -5, loyalty: { underworld: 5 }, result: 'She leans in. "Careful asking about those in public."' },
              { text: 'Buy rations for the road.', morality: 3, loyalty: {}, result: '"Smart. Traveling light is traveling alive."' },
            ],
          },
          { id: 'jax', x: 24, y: 10, kind: 'broker', label: 'Scrap Trader Jax',
            repeatPrompt: 'Jax is counting credits and ignores you.',
            prompt: 'The Rodian tips his goggles. "You have the look of someone who finds things they are not supposed to find. I pay well for those kinds of finds."',
            choices: [
              { text: 'Ask what he is looking for specifically.', morality: -3, loyalty: { underworld: 6 }, result: '"Old Republic code cylinders. Jedi tech. Anything that makes the Senate nervous."' },
              { text: 'Tell him you are not that kind of person.', morality: 6, loyalty: { republic: 4 }, result: '"Sure you are not. Come back when you change your mind."' },
            ],
          },
          { id: 'sgt_kren', x: 10, y: 17, kind: 'republic_guard', label: 'Sgt. Kren',
            repeatPrompt: 'Kren is watching the crowd. He does not acknowledge you again.',
            prompt: '"Move along. Market patrols are doubled after the disturbance in the plaza. Nothing to worry about if you have nothing to hide."',
            choices: [
              { text: 'Ask what the disturbance was.', morality: 2, loyalty: { republic: 3 }, result: '"Above your clearance level. Move along."' },
              { text: 'Slip past without engaging.', morality: 0, loyalty: {}, result: 'He watches you go. You feel his eyes on the back of your neck.' },
            ],
          },
          { id: 'bith_busker', x: 26, y: 17, kind: 'bith', label: 'Bith Busker',
            repeatPrompt: 'The Bith is lost in the music. The melody pulls at something old in your memory.',
            prompt: 'The large-headed musician plays a melancholy cantina tune on a kloo horn. He pauses when he notices you. "Request? The first one is free."',
            choices: [
              { text: 'Ask for the old Jedi hymn your master used to play.', morality: 8, loyalty: {}, result: 'He plays it slowly. The notes fall through the market noise like stones in water.' },
              { text: 'Toss him a credit chip and walk on.', morality: 3, loyalty: {}, result: 'He nods, then returns to his melody.' },
            ],
          },
        ],
        collectibles: [{ id: 'datachip', x: 14, y: 5, label: 'Encrypted Datachip', reward: 30 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 30, 20, 'floor');
          [[5,4],[6,4],[7,4],[5,5],[5,8],[6,8],[7,8],[5,9],[14,4],[15,4],[16,4],[14,5],[14,8],[15,8],[16,8],[14,9]].forEach(([x,y]) => pt(g,x,y,'wall'));
          [[22,4],[23,4],[24,4],[22,5],[22,8],[23,8],[24,8],[22,9]].forEach(([x,y]) => pt(g,x,y,'wall'));
          pt(g,0,10,'door'); pt(g,0,11,'door');
          pt(g,16,0,'door'); pt(g,17,0,'door');
          pt(g,31,10,'door'); pt(g,31,11,'door');
          return g;
        },
      },
      apartments: {
        id: 'apartments', name: 'Residential Sector West', subtitle: 'Coruscant · Subsurface Level 2',
        width: 30, height: 22, spawnPos: { x: 14, y: 18 }, textureId: 'coruscant',
        accent: '#A8B8FF', accentGlow: 'rgba(168,184,255,0.2)', accentDim: '#404880',
        floorColor: '#1C2034', floorAlt: '#242840', wallDark: '#0C0D14', wallLight: '#161828',
        bg: 'radial-gradient(circle at 50% 70%, #13162A 0%, #090A12 70%)', ambient: 'traffic',
        decor: ['pipe', 'neon_sign', 'archive'],
        doors: [
          { x: 14, y: 21, targetZone: 'market', targetPos: { x: 16, y: 1 }, label: 'Market' },
          { x: 15, y: 21, targetZone: 'market', targetPos: { x: 17, y: 1 }, label: 'Market' },
          { x: 6, y: 4, targetZone: 'jons_apt_int', targetPos: { x: 9, y: 11 }, label: "Jon's Apt" },
        ],
        worldObjects: [
          { id: 'jon_apt', x: 6, y: 7, label: "Jon's Apartment", description: 'The smell of caf and burnt wiring. The inner door is unlocked.', once: false },
          { id: 'dexter_apt', x: 6, y: 15, label: "Dexter's Apartment", description: 'Smells of grease and something frying. A note on the door: Back in 20. Help yourself to the caf.', once: true },
          { id: 'zillow_terminal', x: 24, y: 6, label: 'Zillow Housing Terminal', description: 'Vacancy listings for Subsurface Level 2: zero. Vacancy listings for Level 5 and above: three thousand. The price makes your eyes water.', once: false },
          { id: 'speeder_shell', x: 22, y: 16, label: 'Abandoned Speeder Shell', description: 'The repulsor coils are stripped. Someone was living in here recently. The bedroll is still warm.', once: true },
        ],
        npcs: [
          { id: 'anxious_tenant', x: 12, y: 10, kind: 'smuggler', label: 'Anxious Tenant', mobile: true,
            repeatPrompt: 'The tenant glances at you, then back at their door. Whatever they know, they have decided not to share more of it.',
            prompt: 'The human presses against the corridor wall as you pass. "You are not with the inspection team? Good. They have been through three times this week. Something is happening. Something big."',
            choices: [
              { text: 'Ask what kind of something.', morality: 0, loyalty: {}, result: '"Heard shouting from the Dexter place. And men in grey coats who are not Republic and not Sith. Something in between."' },
              { text: 'Reassure them and keep moving.', morality: 5, loyalty: {}, result: '"Easy for you to say." They disappear behind a locked door.' },
            ],
          },
          { id: 'jn7', x: 20, y: 12, kind: 'droid', label: 'Maintenance Droid JN-7', mobile: true,
            repeatPrompt: 'JN-7 is patching the same wall panel it has been patching for three weeks. Progress: 12 percent.',
            prompt: '"MAINTENANCE CYCLE: ongoing. Current fault list: 847 items. Estimated completion time: 14 years. Requesting additional allocation of repair foam." It looks at you hopefully.',
            choices: [
              { text: 'Tell it that you do not have any repair foam.', morality: 0, loyalty: {}, result: '"Logged as anticipated. Fault 848: insufficient foam allocation." It turns back to the wall.' },
              { text: 'Ask what the worst fault on the list is.', morality: 2, loyalty: {}, result: '"Fault 1: the building is slowly rotating. 0.04 degrees per standard year. In 9,000 years it will face the wrong way entirely."' },
            ],
          },
        ],
        collectibles: [{ id: 'apt_key', x: 18, y: 9, label: 'Unclaimed Apt Key', reward: 20 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 28, 20, 'floor');
          carveRect(g, 3, 3, 10, 11, 'wall');
          carveRect(g, 4, 4, 9, 10, 'floor');
          carveRect(g, 3, 13, 10, 19, 'wall');
          carveRect(g, 4, 14, 9, 18, 'floor');
          carveRect(g, 19, 3, 27, 9, 'wall');
          carveRect(g, 20, 4, 26, 8, 'floor');
          [[6,11],[6,12],[6,13]].forEach(([x,y]) => pt(g,x,y,'floor'));
          pt(g,14,21,'door'); pt(g,15,21,'door'); pt(g,6,4,'door');
          return g;
        },
      },
      plaza: {
        id: 'plaza', name: 'Commemorative Plaza', subtitle: 'Coruscant · Subsurface Level 2',
        width: 32, height: 22, spawnPos: { x: 1, y: 10 }, textureId: 'coruscant',
        accent: '#7AC8FF', accentGlow: 'rgba(122,200,255,0.22)', accentDim: '#2A5A80',
        floorColor: '#192030', floorAlt: '#20293A', wallDark: '#0B0F16', wallLight: '#141C26',
        bg: 'radial-gradient(circle at 50% 50%, #121C2A 0%, #08100A 70%)', ambient: 'traffic',
        decor: ['pillar', 'brazier', 'neon_sign'],
        doors: [
          { x: 0, y: 10, targetZone: 'market', targetPos: { x: 29, y: 10 }, label: 'Market' },
          { x: 0, y: 11, targetZone: 'market', targetPos: { x: 29, y: 11 }, label: 'Market' },
          { x: 31, y: 10, targetZone: 'commercial', targetPos: { x: 1, y: 10 }, label: 'Commercial' },
          { x: 31, y: 11, targetZone: 'commercial', targetPos: { x: 1, y: 11 }, label: 'Commercial' },
        ],
        worldObjects: [
          { id: 'memorial_fountain', x: 15, y: 10, label: 'Memorial Fountain', description: 'The inscription reads: In memory of the Fallen of Malachor. The water runs blue-white, fed from far above.', once: false },
          { id: 'public_datapad', x: 8, y: 5, label: 'Public Datapad', description: 'The newsfeed headline: SENATE VOTES TO EXTEND EMERGENCY POWERS. Below it, someone has scratched two words in Basic: they know.', once: false },
          { id: 'graffiti_tag', x: 24, y: 17, label: 'Graffiti Tag', description: 'Spray-etched into the durasteel wall: a stylised flame over a broken chain. The symbol of the Free Coruscant movement.', once: true },
        ],
        npcs: [
          { id: 'calla_ren', x: 10, y: 7, kind: 'jedi', label: "Senator's Aide Calla Ren",
            repeatPrompt: 'Calla notices you again and smiles thinly. She has nothing more to share in public.',
            prompt: 'She speaks without looking at you, watching the plaza. "The Senator I work for has received three death threats this week. All three were traced back to a single Level 1 address. All three were dismissed as crank messages."',
            choices: [
              { text: 'Offer to look into the address.', morality: 5, loyalty: { republic: 8 }, result: 'She slips you a datachip without changing expression. "I did not give you that."' },
              { text: 'Tell her the Senate should handle its own security.', morality: -2, loyalty: {}, result: '"The Senate is handling it. That is precisely the problem."' },
            ],
          },
          { id: 'swoop_informant', x: 22, y: 15, kind: 'swoop_gang', label: 'Swoop Gang Informant',
            repeatPrompt: 'He tilts his head toward a corner. Still watching. Still waiting for something from you.',
            prompt: 'He is leaning against the memorial base like he owns it. "You want information? Everything costs. But I will tell you this for free: the men in grey coats meet here at third-bell. Every. Night."',
            choices: [
              { text: 'Ask what they are meeting about.', morality: -5, loyalty: { underworld: 8 }, result: '"That will cost you. Five hundred credits. Then we talk."' },
              { text: 'Report this to Sgt. Kren in the market.', morality: 10, loyalty: { republic: 6 }, result: 'He sees the intention in your eyes and melts back into the crowd.' },
            ],
          },
        ],
        collectibles: [{ id: 'plaza_cred', x: 26, y: 6, label: 'Dropped Credit Chip', reward: 25 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 30, 20, 'floor');
          carveRect(g, 12, 8, 18, 13, 'water');
          pt(g, 15, 10, 'floor'); pt(g, 15, 11, 'floor');
          [[4,4],[5,4],[4,5],[25,4],[26,4],[26,5],[4,16],[5,16],[4,17],[25,16],[26,16],[26,17]].forEach(([x,y]) => pt(g,x,y,'wall'));
          pt(g,0,10,'door'); pt(g,0,11,'door');
          pt(g,31,10,'door'); pt(g,31,11,'door');
          return g;
        },
      },
      commercial: {
        id: 'commercial', name: 'Commercial Sector', subtitle: 'Coruscant · Entertainment District',
        width: 30, height: 22, spawnPos: { x: 1, y: 10 }, textureId: 'coruscant',
        accent: '#FF9ADE', accentGlow: 'rgba(255,154,222,0.2)', accentDim: '#802060',
        floorColor: '#201828', floorAlt: '#2A2034', wallDark: '#100C18', wallLight: '#1A1424',
        bg: 'radial-gradient(circle at 40% 30%, #1A1028 0%, #0A0810 70%)', ambient: 'traffic',
        decor: ['neon_sign', 'pillar', 'brazier'],
        doors: [
          { x: 0, y: 10, targetZone: 'plaza', targetPos: { x: 29, y: 10 }, label: 'Plaza' },
          { x: 0, y: 11, targetZone: 'plaza', targetPos: { x: 29, y: 11 }, label: 'Plaza' },
          { x: 14, y: 21, targetZone: 'speeder1', targetPos: { x: 13, y: 1 }, label: 'Speeder Bay 1' },
          { x: 15, y: 21, targetZone: 'speeder1', targetPos: { x: 14, y: 1 }, label: 'Speeder Bay 1' },
        ],
        worldObjects: [
          { id: 'sallys_cantina', x: 10, y: 8, label: "Sally's Cantina", description: 'The neon sign buzzes: SALLYS. No apostrophe. Inside you hear laughter and the clink of glasses. The door is open.', once: false },
          { id: 'goods_store', x: 24, y: 6, label: 'Goods, Trades and Treasure', description: 'A cluttered shop front. The owner has priced everything at exactly twice what it is worth. Standard practice.', once: false },
          { id: 'trex_keypad', x: 20, y: 15, label: "Trex's Apt Keypad", description: 'A reinforced door with a seven-digit keypad. Three of the digits are worn smooth from repeated use.', once: true },
        ],
        npcs: [
          { id: 'sally', x: 8, y: 12, kind: 'cantina_owner', label: 'Sally',
            repeatPrompt: 'Sally slides a drink down the bar without looking at you. She remembers what you ordered.',
            prompt: '"Sit. Drink. Whatever you are about to ask me, the answer is: I did not see anything, I do not know anything, and my establishment has nothing to do with it. That said." She leans in. "You look like you need to know things."',
            choices: [
              { text: 'Ask about the men in grey coats.', morality: 0, loyalty: { underworld: 5 }, result: '"Heard of them. They call themselves the Regulators. Private security. Very private. Very well-paid."' },
              { text: 'Just order the caf and say nothing.', morality: 3, loyalty: {}, result: 'She nods approvingly. "The smart ones always order caf first."' },
            ],
          },
          { id: 'trex', x: 22, y: 12, kind: 'crime_boss', label: 'Trex',
            repeatPrompt: 'Trex watches you from across the room. His yellow eyes do not blink.',
            prompt: 'The Trandoshan crime lord crosses his thick arms. "I know who you are. I know what ship you came in on. And I know you have been asking questions that other people have stopped asking." He smiles. It shows a great many teeth.',
            choices: [
              { text: 'Hold his gaze. You are not intimidated.', morality: 0, loyalty: { underworld: 10 }, result: 'He laughs, a low rumbling sound. "Good. Sit. We have business to discuss."' },
              { text: 'Back away slowly. This is above your weight.', morality: 5, loyalty: {}, result: '"Wise." He does not follow. That is almost worse.' },
            ],
          },
        ],
        collectibles: [{ id: 'cantina_token', x: 6, y: 5, label: 'Casino Token', reward: 35 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 28, 20, 'floor');
          carveRect(g, 4, 3, 14, 14, 'wall');
          carveRect(g, 5, 4, 13, 13, 'floor');
          carveRect(g, 18, 3, 27, 10, 'wall');
          carveRect(g, 19, 4, 26, 9, 'floor');
          [[9,14],[10,14],[11,14],[12,14]].forEach(([x,y]) => pt(g,x,y,'floor'));
          pt(g,0,10,'door'); pt(g,0,11,'door');
          pt(g,14,21,'door'); pt(g,15,21,'door');
          return g;
        },
      },
      speeder1: {
        id: 'speeder1', name: 'Speeder Docking Bay 1', subtitle: 'Coruscant · Subsurface Level 2',
        width: 28, height: 20, spawnPos: { x: 13, y: 2 }, textureId: 'coruscant',
        accent: '#6AFFCC', accentGlow: 'rgba(106,255,204,0.2)', accentDim: '#1A6048',
        floorColor: '#162028', floorAlt: '#1E2A34', wallDark: '#0A1018', wallLight: '#121C26',
        bg: 'radial-gradient(circle at 60% 80%, #101820 0%, #080C10 70%)', ambient: 'traffic',
        decor: ['pipe', 'girder', 'cargo_crate'],
        doors: [
          { x: 13, y: 0, targetZone: 'commercial', targetPos: { x: 14, y: 19 }, label: 'Commercial' },
          { x: 14, y: 0, targetZone: 'commercial', targetPos: { x: 15, y: 19 }, label: 'Commercial' },
          { x: 27, y: 9, targetZone: 'speeder2', targetPos: { x: 1, y: 9 }, label: 'Bay 2' },
          { x: 27, y: 10, targetZone: 'speeder2', targetPos: { x: 1, y: 10 }, label: 'Bay 2' },
        ],
        worldObjects: [
          { id: 'airtaxi_terminal', x: 11, y: 5, label: 'AirTaxi Terminal', description: 'The schedule board lists forty-seven routes. Twenty-nine are marked SUSPENDED. You wonder what happened on the other twenty-nine.', once: false },
          { id: 'refuel_kiosk', x: 20, y: 5, label: 'Refueling Kiosk', description: 'Out of order. A handwritten sign reads: Use Bay 2. Bay 2 is also probably out of order.', once: true },
          { id: 'bay_log', x: 6, y: 14, label: 'Speeder Bay Log', description: 'Last entry: Speeder Unit 7 departed 03:14. Destination: classified. Pilot: classified. Good luck finding that one.', once: true },
        ],
        npcs: [
          { id: 'at9', x: 16, y: 8, kind: 'droid', label: 'AirTaxi Droid AT-9', triggersOverlay: 'speeder',
            repeatPrompt: 'AT-9 chirps twice and resumes its departure countdown. It has a job to do.',
            prompt: '"AIRTAXI UNIT AT-9. DESTINATION QUERY. CURRENT WAIT TIME: 4 MINUTES. CURRENT QUEUE: 0 PASSENGERS. QUERY: ARE YOU A PASSENGER?"',
            choices: [
              { text: 'Yes. Take me to the Senate District.', morality: 0, loyalty: { republic: 3 }, result: '"BOOKING CONFIRMED. RATE: 80 CREDITS. DO YOU HAVE 80 CREDITS?" You do not answer.' },
              { text: 'No. Just browsing.', morality: 0, loyalty: {}, result: '"QUERY: HOW DOES ONE BROWSE A TAXI. LOGGED AS ANOMALOUS BEHAVIOUR."' },
            ],
          },
          { id: 'duvall', x: 24, y: 10, kind: 'mechanic', label: 'Speeder Mechanic Duvall',
            repeatPrompt: 'Duvall is back under the speeder. Only their boots are visible.',
            prompt: 'The mechanic slides out from under a battered airspeeder. "If you are here about the stolen coils, I told the guard already: someone took them between second and third bell. I sleep like a rock and I do not apologise for it."',
            choices: [
              { text: 'Ask if they saw anyone unusual near the bay.', morality: 3, loyalty: { republic: 4 }, result: '"Grey coat. No insignia. Moved like they had done it before." They slide back under the speeder. Interview over.' },
              { text: 'Offer to help track down the coils.', morality: 8, loyalty: {}, result: '"Appreciate it. Check the Abandoned Cargo in Bay 2. People dump things there."' },
            ],
          },
        ],
        collectibles: [{ id: 'speeder_part', x: 8, y: 10, label: 'Stripped Actuator', reward: 20 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 26, 18, 'floor');
          carveRect(g, 1, 1, 6, 4, 'ship_hull');
          carveRect(g, 21, 1, 26, 4, 'ship_hull');
          carveRect(g, 1, 15, 6, 18, 'ship_hull');
          carveRect(g, 21, 15, 26, 18, 'ship_hull');
          [[3,7],[4,7],[3,8],[4,8],[3,12],[4,12],[3,13],[4,13]].forEach(([x,y]) => pt(g,x,y,'wall'));
          [[23,7],[24,7],[23,8],[24,8],[23,12],[24,12],[23,13],[24,13]].forEach(([x,y]) => pt(g,x,y,'wall'));
          pt(g,13,0,'door'); pt(g,14,0,'door');
          pt(g,27,9,'door'); pt(g,27,10,'door');
          return g;
        },
      },
      speeder2: {
        id: 'speeder2', name: 'Speeder Docking Bay 2', subtitle: 'Coruscant · Subsurface Level 2',
        width: 28, height: 20, spawnPos: { x: 1, y: 9 }, textureId: 'coruscant',
        accent: '#6AFFCC', accentGlow: 'rgba(106,255,204,0.2)', accentDim: '#1A6048',
        floorColor: '#141E28', floorAlt: '#1C2830', wallDark: '#080E14', wallLight: '#101820',
        bg: 'radial-gradient(circle at 40% 70%, #0E1620 0%, #060C10 70%)', ambient: 'traffic',
        decor: ['pipe', 'girder', 'cargo_crate'],
        doors: [
          { x: 0, y: 9, targetZone: 'speeder1', targetPos: { x: 25, y: 9 }, label: 'Bay 1' },
          { x: 0, y: 10, targetZone: 'speeder1', targetPos: { x: 25, y: 10 }, label: 'Bay 1' },
        ],
        worldObjects: [
          { id: 'airtaxi_terminal2', x: 10, y: 5, label: 'AirTaxi Terminal 2', description: 'This one actually works. The wait time reads: 47 minutes. You decide to walk.', once: false },
          { id: 'departure_board', x: 18, y: 5, label: 'Departure Board', description: 'One entry is highlighted in red: FLIGHT C-7 OVERDUE. LAST CONTACT: 06:22. That was three days ago.', once: true },
          { id: 'cargo_container', x: 22, y: 14, label: 'Abandoned Cargo Container', description: 'Duvall was right. Inside you find a set of repulsor coils, a crate of unmarked credit chips, and a datapad with a single message: DO NOT OPEN THIS.', once: true },
        ],
        npcs: [
          { id: 'at11', x: 15, y: 8, kind: 'droid', label: 'AirTaxi Droid AT-11', triggersOverlay: 'speeder',
            repeatPrompt: 'AT-11 pulses its running lights at you. You have been logged as a repeat non-passenger.',
            prompt: '"AIRTAXI UNIT AT-11. NOTE: THIS UNIT IS AWARE IT IS THE LESS POPULAR UNIT. NOTE: THIS UNIT HAS FEELINGS ABOUT THAT. DESTINATION QUERY."',
            choices: [
              { text: 'Tell it you prefer AT-11 to AT-9.', morality: 5, loyalty: {}, result: '"LOGGED AS PREFERRED PASSENGER. RATE: STANDARD MINUS FIVE PERCENT. BECAUSE YOU ARE KIND."' },
              { text: 'Ask about Flight C-7.', morality: 2, loyalty: { republic: 3 }, result: '"FLIGHT C-7 IS A RESTRICTED QUERY. THIS UNIT IS ALSO VERY NERVOUS ABOUT FLIGHT C-7."' },
            ],
          },
        ],
        collectibles: [{ id: 'bay2_chip', x: 6, y: 14, label: 'Unsigned Credit Chip', reward: 45 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 26, 18, 'floor');
          carveRect(g, 1, 1, 6, 4, 'ship_hull');
          carveRect(g, 21, 1, 26, 4, 'ship_hull');
          carveRect(g, 1, 15, 6, 18, 'ship_hull');
          carveRect(g, 21, 15, 26, 18, 'ship_hull');
          [[3,7],[4,7],[3,8],[4,8],[3,12],[4,12],[3,13],[4,13]].forEach(([x,y]) => pt(g,x,y,'wall'));
          pt(g,0,9,'door'); pt(g,0,10,'door');
          return g;
        },
      },
      jons_apt_int: {
        id: 'jons_apt_int', name: "Jon's Apartment", subtitle: "Coruscant · West Residential · Level 2",
        width: 18, height: 14, spawnPos: { x: 9, y: 11 }, textureId: 'coruscant',
        accent: '#7AB8E0', accentGlow: 'rgba(122,184,224,0.18)', accentDim: '#2A4A60',
        floorColor: '#191E30', floorAlt: '#202540', wallDark: '#0A0C14', wallLight: '#141828',
        bg: 'radial-gradient(circle at 50% 50%, #141828 0%, #080A14 70%)', ambient: 'mist',
        decor: ['archive', 'pipe', 'cargo_crate'],
        doors: [
          { x: 9, y: 13, targetZone: 'apartments', targetPos: { x: 6, y: 5 }, label: 'Residential Corridor' },
        ],
        worldObjects: [
          { id: 'jon_datapad', x: 12, y: 3, label: 'Encrypted Datapad', description: 'Manifest fragments. Three hub codes, three timestamps, forty-eight hours apart. Someone who knew the routing schedules. The Broken Circle is written in the margin in red.', once: true },
          { id: 'slicing_bench', x: 14, y: 8, label: 'Slicing Workbench', description: 'A tangle of stripped datachips and bypass leads. Jon apparently does his best work at 0300.', once: false },
          { id: 'bay14_analysis_board', x: 8, y: 4, once: false, label: 'Bay 14 Analysis Board', description: 'A holographic display pinned with freight logs, blast pattern analyses, and three photographs labeled UNKNOWN. Jon has been working this case longer than he let on. One note in his handwriting reads: "Transit codes -- mine. How?"' },
          { id: 'faction_tension_chart', x: 3, y: 6, once: false, label: 'Coruscant Faction Chart', description: 'A layered map of Coruscant levels with colored overlays: blue for CSF jurisdiction, red for Iron Syndicate activity, amber for contested freight corridors. The Senate District is circled three times in a different color than the others. No label. Just the circle.' },
        ],
        npcs: [
          { id: 'jon_apartment', x: 5, y: 3, kind: 'smuggler', label: 'Jon', questNpc: true,
            prompt: 'Here is the situation. Someone is moving stolen Phrik alloy through the lower levels -- military-grade material that has no business being in civilian freight lanes. Docking Bay 14 is the last confirmed point of entry. I need a partner I can trust to find out who is behind it before it disappears into the infrastructure.',
            choices: [
              { text: 'I am in. Give me everything you have.', morality: 5, loyalty: { underworld: 8 }, result: 'He slides a datapad across the table. "Bay 14. Start at the dock manifest kiosk and work backward. Whatever was moved through there, someone went to great lengths to pretend it did not exist." He pauses. "Be careful. The people who make things disappear do not appreciate witnesses."', grants: { credits: 200, flags: ['chapter1_active', 'speeder_transit_unlocked'] } },
              { text: 'What is in it for me beyond the credits?', morality: 0, loyalty: { underworld: 5 }, result: '"Answers. If you want to know why the Bay 14 cargo is important enough to kill for, you need to follow the thread. The credits are upfront. The answers are earned."', grants: { credits: 200, flags: ['chapter1_active', 'speeder_transit_unlocked'] } },
              { text: 'I need more upfront. This sounds dangerous.', morality: -3, loyalty: {}, result: 'He does not blink. "Three hundred. Because you are right. And because I need someone who knows the value of their own skin." He counts out the extra hundred from a lockbox.', grants: { credits: 300, flags: ['chapter1_active', 'speeder_transit_unlocked'] } },
            ],
            repeatPrompt: 'Jon is at the terminal running cargo projections. "Bay 14. Start there."',
            phases: [
              {
                id: 'phase_mission_brief',
                requiresAllFlags: [],
                requiresNoneFlags: ['chapter1_active'],
                prompt: 'Here is the situation. Someone is moving stolen Phrik alloy through the lower levels -- military-grade material that has no business being in civilian freight lanes. Docking Bay 14 is the last confirmed point of entry. I need a partner I can trust to find out who is behind it before it disappears into the infrastructure.',
                choices: [
                  { text: 'I am in. Give me everything you have.', morality: 5, loyalty: { underworld: 8 }, result: 'He slides a datapad across the table. "Bay 14. Start at the dock manifest kiosk and work backward. Whatever was moved through there, someone went to great lengths to pretend it did not exist." He pauses. "Be careful. The people who make things disappear do not appreciate witnesses."', grants: { credits: 200, flags: ['chapter1_active', 'speeder_transit_unlocked'] } },
                  { text: 'What is in it for me beyond the credits?', morality: 0, loyalty: { underworld: 5 }, result: '"Answers. If you want to know why the Bay 14 cargo is important enough to kill for, you need to follow the thread. The credits are upfront. The answers are earned."', grants: { credits: 200, flags: ['chapter1_active', 'speeder_transit_unlocked'] } },
                  { text: 'I need more upfront. This sounds dangerous.', morality: -3, loyalty: {}, result: 'He does not blink. "Three hundred. Because you are right. And because I need someone who knows the value of their own skin." He counts out the extra hundred from a lockbox.', grants: { credits: 300, flags: ['chapter1_active', 'speeder_transit_unlocked'] } },
                ],
                repeatPrompt: 'Jon is at the terminal running cargo projections. "Bay 14. Start there."',
              },
              {
                id: 'phase_bay14_direction',
                requiresAllFlags: ['chapter1_active'],
                requiresNoneFlags: ['freight_hub_investigated'],
                prompt: '"You have the transit pass. Sector 4 Freight Hub is your first stop -- that is where Bay 14 logs in and out. Talk to the dock engineer if you can find one willing to say anything. The official record has been sanitized. The physical evidence has not."',
                choices: [
                  { text: '"Is there anything in particular I should look for?"', morality: 5, loyalty: { underworld: 5 }, result: '"Blast marks that do not match a fuel fire. Cargo crates logged as agricultural that weigh three times what they should. And anyone who looks like they were paid to be somewhere else when the loading happened."', grants: { flags: ['bay14_method_known'] } },
                  { text: '"Do you have contacts at the hub who can smooth my entry?"', morality: 0, loyalty: { underworld: 5 }, result: '"One. Corin. He runs a salvage shop on Platform 04. Tell him the hydronspan ratio is off. He will know what it means." He says it like it costs him something.', grants: { flags: ['jax_jon_vouched'] } },
                  { text: '"I will handle it. No need for contacts."', morality: -3, loyalty: {}, result: '"Your call. Just remember -- down at Level 088, independent only means you have no backup."' },
                ],
                repeatPrompt: 'Jon is cross-referencing freight routes on a holographic display. "Level 088 is not going to investigate itself."',
              },
              {
                id: 'phase_bay14_debrief',
                requiresAllFlags: ['freight_hub_investigated'],
                requiresNoneFlags: ['jon_bay14_briefed', 'marlo_sky_talked', 'vane_sky_cooperated'],
                prompt: '"You found something. I can tell. Sit down." He shuts off his terminal and gives you his full attention for the first time.',
                choices: [
                  { text: '"Two unmarked lifters. Grey coats. Republic security codes that checked out clean."', morality: 5, loyalty: { underworld: 8 }, result: '"Republic codes in civilian freight lanes. That is an inside job. Someone with Senate access signed those passes." He stands and walks to the viewport. "The alloy is going somewhere specific. Sky-Market Level 1450 is the next thread -- find out who brokered the move. There is a man called Slick Marlo at the Aurebesh Lounge, and an Officer Vane at the precinct across the promenade. Pick your approach. And do not mention my name first -- not to either of them."', grants: { flags: ['jon_bay14_briefed', 'sky_market_direction_given'], codex: ['codex-jon-backstory'] } },
                  { text: '"The dock was stripped before I arrived. But I found a forged keycard and testimony from the engineer."', morality: 8, loyalty: { republic: 5 }, result: '"Testimony is a start. The keycard is better. Someone forged Republic-grade clearance -- that narrows the suspect pool considerably." He transfers coordinates to your datapad. "Sky-Market District, Level 1450. Two contacts: Marlo at the Aurebesh Lounge and Officer Vane at the CSF precinct. Do not use my name. Let them come to you."', grants: { flags: ['jon_bay14_briefed', 'sky_market_direction_given'], codex: ['codex-jon-backstory'] } },
                ],
                repeatPrompt: '"Sky-Market is the next step. Level 1450. And do not use my name up there."',
              },
              {
                id: 'phase_sky_debrief_marlo',
                requiresAllFlags: ['marlo_sky_talked'],
                requiresNoneFlags: ['vane_sky_cooperated', 'jon_sky_market_debriefed'],
                prompt: '"Marlo. Of course it is Marlo." He rubs the back of his neck. "He is good at finding buyers. He is very good at not being the one who ends up in custody. What did he tell you about the Syndicate?"',
                choices: [
                  { text: '"The alloy is going to The Works. The buyer has Senate credentials."', morality: -3, loyalty: { underworld: 10 }, result: '"A Senate-backed buyer running Phrik through an underbelly broker. Someone is building something off the books and using the Republic\'s own infrastructure to do it. This is bigger than Bay 14." He opens a new route file. "Marlo\'s connections are useful, but if the Republic traces the alloy, your name is near his. Stay aware of that."', grants: { flags: ['jon_sky_market_debriefed', 'iron_syndicate_senate_link_known'] } },
                  { text: '"He gave me the Buyer\'s ID. Iron Syndicate is the real operation."', morality: 0, loyalty: { underworld: 8 }, result: '"Iron Syndicate. I have heard that name twice in the last month. Both times from people who stopped talking shortly after." He does not say it lightly. "This goes beyond a freight dispute. Watch yourself."', grants: { flags: ['jon_sky_market_debriefed', 'iron_syndicate_senate_link_known'] } },
                ],
                repeatPrompt: '"The Syndicate is the thread. Pull it carefully."',
              },
              {
                id: 'phase_sky_debrief_vane',
                requiresAllFlags: ['vane_sky_cooperated'],
                requiresNoneFlags: ['marlo_sky_talked', 'jon_sky_market_debriefed'],
                prompt: '"You went Republic. I did not see that coming." He is not angry -- he is recalibrating. "Officer Vane is exactly who he looks like: a man who believes the system still works. He is either going to be the best ally you have ever had, or he is going to get you both killed."',
                choices: [
                  { text: '"He gave me a CSF Auxiliary Pass and sent me to the Academy. I am going in officially."', morality: 12, loyalty: { republic: 10 }, result: '"Then I am the unofficial version. You will need both." He leans back. "The CSF has access I do not have. I have contacts the CSF cannot touch. We cover more ground this way -- as long as Vane does not find out you are running two ledgers."', grants: { flags: ['jon_sky_market_debriefed', 'jon_republic_aware'] } },
                  { text: '"I wanted information and the badge was the fastest path. I am not a true believer."', morality: 0, loyalty: { underworld: 5 }, result: '"Good. Believers make bad operators." He almost smiles. "Use the CSF access. Just do not let Vane decide you are his. That conversation gets complicated."', grants: { flags: ['jon_sky_market_debriefed', 'deceiver_path_hinted'] } },
                ],
                repeatPrompt: '"You are running with the Republic now. Keep me in the loop."',
              },
              {
                id: 'phase_sky_debrief_both',
                requiresAllFlags: ['marlo_sky_talked', 'vane_sky_cooperated'],
                requiresNoneFlags: ['jon_sky_market_debriefed'],
                prompt: '"You worked both sides at the Sky-Market." He sets down his drink. "That is either very smart or very reckless. With Marlo and Vane both believing you are their contact, you have leverage -- and a very short window before they compare notes."',
                choices: [
                  { text: '"I can manage both. The Syndicate is what matters."', morality: 0, loyalty: {}, result: '"Then manage them. But have an exit plan ready. When Marlo and Vane discover each other, you want to be the one holding the manifest, not caught between their arguments."', grants: { flags: ['jon_sky_market_debriefed', 'double_contact_known'] } },
                ],
                repeatPrompt: '"Both sides think you are theirs. That clock is ticking."',
              },
              {
                id: 'phase_csf_confrontation',
                requiresAllFlags: ['csf_briefed'],
                requiresNoneFlags: ['jon_confrontation_done'],
                prompt: '"A CSF badge. Are you insane? I brought you in as a partner to run cargo, not to hand my operation over to Republic guards!" He is pacing. This is the angriest you have seen him.',
                choices: [
                  { text: '"This badge is the ultimate cover. I can scrub our manifests from inside the CSF database."', morality: -12, loyalty: { underworld: 15 }, result: 'He stops pacing. A long silence. "You are saying you can run our operation from inside the CSF." He works through it. "That is either brilliant or the most dangerous thing I have ever heard you say." He unlocks the Inside Man path.', grants: { flags: ['jon_confrontation_done', 'inside_man_path'] } },
                  { text: '"The underbelly is collapsing, Jon. Work with me legally or this operation does not survive."', morality: 15, loyalty: { republic: 15, underworld: -20 }, result: 'He looks at you for a long time. Then he locks his workbench and walks to the door. "If you genuinely believe that, then we want different things." He steps out. His shop closes temporarily.', grants: { flags: ['jon_confrontation_done', 'jon_gone_straight_warned', 'jon_shop_closed'] } },
                  { text: '"Vane is using me to find the alloy location. Once I have it, I drop the badge and we take the score."', morality: -5, loyalty: { underworld: 10 }, result: 'He studies you for a long time. "You are playing a very dangerous game with a man who is good at it." He nods slowly. "Alright. But if Vane gets close enough to see through you, the deal ends. No heroics on my behalf."', grants: { flags: ['jon_confrontation_done', 'deceiver_path'], credits: 200 } },
                ],
                repeatPrompt: 'Jon has returned. He is quieter than before. Watching you more carefully.',
              },
              {
                id: 'phase_post_confrontation_inside_man',
                requiresAllFlags: ['inside_man_path'],
                requiresNoneFlags: ['sector4_raid_complete'],
                prompt: '"I have been thinking about what you said. If you genuinely have CSF database access -- and I mean genuine write access, not just read -- then we have an opportunity here that does not come around twice in a career."',
                choices: [
                  { text: '"I can scrub manifests before Vane sees them. Which routes are the priority?"', morality: -15, loyalty: { underworld: 20 }, result: '"The Level 088 freight lines are the cleanest to sanitize. Vane never looks past the manifest header." He slides you a list. "Do not be greedy. One route at a time."', grants: { flags: ['inside_man_routes_known'] } },
                  { text: '"I want to keep this limited to the Bay 14 investigation. Not a permanent arrangement."', morality: -5, loyalty: { underworld: 8 }, result: '"Fair. Bay 14 only. When it is done, the badge goes back and we are what we were." He accepts the limit without argument.', grants: { flags: ['inside_man_limited'] } },
                ],
                repeatPrompt: '"Sector 4 is the active operation. Stay focused on the alloy."',
              },
              {
                id: 'phase_post_confrontation_republic',
                requiresAllFlags: ['jon_gone_straight_warned'],
                requiresNoneFlags: ['sector4_raid_complete'],
                prompt: 'He is back. His workbench is unlocked but his manner is different. Careful. Like someone who knows the ground is uncertain and is choosing each step deliberately.',
                choices: [
                  { text: '"I did not come back to push you. I came back because you are still my best lead on the Senate connection."', morality: 8, loyalty: { republic: 5 }, result: '"That is the only reason I opened the door." He sits. "What do you need?"', grants: { flags: ['jon_republic_truce'] } },
                  { text: '"I meant what I said. The Republic path is the only one that ends cleanly."', morality: 15, loyalty: { republic: 10 }, result: '"I know you did. I am still not sure I believe you are right." He looks out the viewport. "But I am still here. That has to count for something."', grants: { flags: ['jon_republic_truce', 'jon_softening'] } },
                ],
                repeatPrompt: '"We are still talking. That is something."',
              },
              {
                id: 'phase_post_confrontation_deceiver',
                requiresAllFlags: ['deceiver_path'],
                requiresNoneFlags: ['sector4_raid_complete'],
                prompt: '"How is Vane treating you? Playing along well?" He says it like a test.',
                choices: [
                  { text: '"He trusts me. We are close to the Senate authorization codes."', morality: -8, loyalty: { underworld: 12 }, result: '"Good. When you have the codes, we pull the alloy before the CSF even knows where to look. Have a transport on standby."', grants: { flags: ['deceiver_active'] } },
                  { text: '"I am having second thoughts about burning Vane."', morality: 5, loyalty: { republic: 5 }, result: '"Second thoughts now?" He is very still. "Do not tell Vane anything. But do not commit to the score either until you have decided." He means both halves equally.', grants: { flags: ['deceiver_wavering'] } },
                ],
                repeatPrompt: '"Vane is useful until he is not. You know what comes after."',
              },
              {
                id: 'phase_endgame_reveal',
                requiresAllFlags: ['sector4_raid_complete'],
                requiresNoneFlags: ['jon_endgame_known'],
                prompt: '"You walked out of Sector 4 in one piece. I was not certain you would." He pauses. "Sit down. There is something about the Bay 14 route I should have told you at the start."',
                choices: [
                  { text: '"Tell me."', morality: 5, loyalty: { underworld: 8, republic: 5 }, result: '"Three years ago I ran cargo on the Scylla route -- before it became a cover operation. I did not know what was in the sealed containers. When I found out, I shut the route down. Someone used my old transit codes to reopen it. Whoever is behind the Bay 14 Syndicate operation did not build from nothing. They built from what I left behind." He does not ask for forgiveness. "The Senate connection means this goes higher than either of us can reach alone. But the Level 005 route ends at a Senate transit terminal. If you can get there before the shipment departs, you can stop it."', grants: { flags: ['jon_endgame_known', 'senate_personal_stake_revealed'], codex: ['codex-jon-backstory'] } },
                  { text: '"You owe me an explanation. Start talking."', morality: -5, loyalty: {}, result: '"Yes. I do." He tells you. The same information. Without the apology. The obligation is settled. The weight stays.', grants: { flags: ['jon_endgame_known', 'senate_personal_stake_revealed'], codex: ['codex-jon-backstory'] } },
                ],
                repeatPrompt: '"The Senate transit terminal is the end of the thread. Go finish it."',
              },
              {
                id: 'phase_finale',
                requiresAllFlags: ['senate_line_secured'],
                prompt: '"It is done." He says it quietly. No celebration. Just acknowledgment. "Whatever path you took to get here -- Republic badge, underworld leverage, or something in between -- the alloy is gone and the Senator is exposed." He looks at the viewport. "I am going to close the apartment for a while. Let things settle." A pause. "You did good work."',
                choices: [
                  { text: '"What happens to your operation now?"', morality: 0, loyalty: {}, result: '"Smaller. Cleaner. The old routes are burned. But I still know people." He almost smiles. "I will find something."' },
                  { text: '"It did not have to go this way. But I am glad you were in it."', morality: 8, loyalty: { underworld: 5, republic: 5 }, result: '"Yeah." He picks up his jacket. "Me too." He means it.', grants: { flags: ['jon_farewell_warm'] } },
                  { text: '"We should talk about what comes next. There is more work to be done."', morality: 5, loyalty: { underworld: 8 }, result: '"There is always more work." He locks the terminal. "Give me a week. Then come back." He walks to the door without turning around. The invitation is open.', grants: { flags: ['jon_future_open'] } },
                ],
                repeatPrompt: '"It is done. The rest is the Republic\'s problem now."',
              },
            ],
          },
        ],
        collectibles: [],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 16, 12, 'floor');
          carveRect(g, 1, 1, 4, 4, 'wall');
          carveRect(g, 13, 1, 16, 4, 'wall');
          pt(g, 9, 13, 'door');
          return g;
        },
      },
      sky_market: {
        id: 'sky_market', name: 'Sky-Market District', subtitle: 'Coruscant · Upper Mid-Levels · L.1450',
        width: 38, height: 26, spawnPos: { x: 4, y: 13 }, textureId: 'coruscant',
        accent: '#E8A030', accentGlow: 'rgba(232,160,48,0.30)', accentDim: '#7A4E10',
        floorColor: '#2C2016', floorAlt: '#3C2A18', wallDark: '#14100A', wallLight: '#241A0C',
        bg: 'radial-gradient(circle at 50% 0%, #3A2008 0%, #221408 20%, #0E0A06 55%, #080604 100%)', ambient: 'traffic',
        decor: ['pillar', 'neon_sign', 'brazier', 'neon_sign', 'cargo_crate', 'pipe', 'girder'],
        doors: [
          { x: 0, y: 12, targetZone: 'sky_customs', targetPos: { x: 33, y: 12 }, label: 'Skyway Customs' },
          { x: 0, y: 13, targetZone: 'sky_customs', targetPos: { x: 33, y: 13 }, label: 'Skyway Customs' },
          { x: 15, y: 25, targetZone: 'heat_sink_slums', targetPos: { x: 15, y: 1 }, label: 'Heat Sink Slums' },
        ],
        worldObjects: [
          { id: 'jon_arrival_comlink', x: 5, y: 13, once: true, label: 'Incoming Comlink', description: "Jon's voice crackles over the encrypted channel. \"Watch your back up there. Level 1450 looks clean, but the vultures here wear tailored suits instead of gang colors. If someone's liquidating a shipment of stolen Phrik alloy, they'll need a broker registered with the Sky-Market Exchange to clear the credit transfers. Check out the Aurebesh Lounge and find Slick Marlo — or talk to Officer Vane at the precinct if you want to play this by the book. Either way: do not mention my name first.\" The channel closes." },
          { id: 'sky_market_terminal', x: 20, y: 7, once: false, label: 'Trade Exchange Terminal', description: 'Live credit-transfer rates across fourteen systems. One manifest flagged for anomalous routing: SCYLLA FREIGHT. Destination: redacted. Shipper: redacted.' },
          { id: 'csf_bulletin', x: 28, y: 14, once: false, label: 'CSF Bulletin Board', description: 'Three active investigations listed. Two marked classified. The third — Cargo Anomaly / Bay 14 — shows status: CLOSED. Filed by: Vane, T. Closure date: two days after the incident.' },
          { id: 'lounge_bar_terminal', x: 5, y: 5, once: false, label: 'Lounge Drink Terminal', description: 'A rotating holographic menu. Thirty-seven varieties of exotic spirits from fourteen systems. One local special listed as "Bay 14 Blend." Whoever named it has a sense of humor or information you do not.' },
          { id: 'lounge_private_booth', x: 9, y: 8, once: true, label: 'Occupied Booth', description: 'Two figures in grey coats sit with their backs to the room. Neither is drinking. Both are watching the exit. Iron Syndicate field observers — if they recognize you, they will report your presence at the lounge to Vex.', grantsFlag: 'syndicate_watchers_seen', grantsCodex: 'codex-iron-syndicate' },
          { id: 'lounge_datapad', x: 3, y: 9, once: true, label: 'Left Behind Datapad', description: 'Encrypted but partially readable. Credit transfers totaling 840,000 credits routed through three shell corporations to a Coruscant financial account. The destination account number matches one field on the Scylla manifest.', grantsFlag: 'credit_trail_found' },
          { id: 'precinct_evidence_locker', x: 29, y: 6, once: false, label: 'Evidence Locker — Bay 14', description: "CASE STATUS: CLOSED. PRIMARY EVIDENCE: destroyed in dock fire. PHYSICAL SAMPLES: none recovered. WITNESS STATEMENTS: sealed under Senate Directive 1182-C. The locker is padlocked with a standard CSF code seal. Vane's name is on the closure authorization." },
          { id: 'precinct_comms_station', x: 33, y: 5, once: false, label: 'CSF Dispatch Station', description: 'Twelve active patrol frequencies. Six are handling routine traffic violations. Five are static. One — Sector 4 Channel B — is broadcasting a continuous loop: "All units stand by. Sector 4 incident classified pending Senate review."' },
          { id: 'precinct_wanted_board', x: 29, y: 9, once: false, label: 'Sector 4 Active Warrants Board', description: 'Fourteen open warrants. Nine are standard Black Sun identifiers. Four are listed as CLASSIFIED with Senate clearance required to view. The fifteenth entry — Bay 14 strike team — shows status: SUSPENDED. Effective date: two days after the incident.' },
          { id: 'airtaxi_sky_market', x: 35, y: 20, once: false, label: 'AirTaxi Terminal', description: 'Coruscant AirTaxi Network terminal. Departs on demand.' },
          { id: 'skyline_vista', x: 19, y: 1, once: false, label: 'Promenade Skyline Overlook', description: 'The promenade edge opens onto open air and three thousand meters of vertical city. Speeders stream in tight formation lanes. Above: the Senate dome, catching the last reflected light from the planet\'s artificial sun cycle. Below: nothing visible. The lower levels begin where the light stops.',
            worldStateVariant: {
              lawful: 'The view from the law: the Republic\'s skyline, lit and ordered, everything it protects visible from one glance. The lower levels are down there somewhere, past the point where the light gives up.',
              underworld: 'The view from the other side: that Senate dome is where the authorization codes came from. Everything clean and lit up top, everything complicated below. You are already on the wrong level for clean.',
            },
          },
          { id: 'holonet_kiosk', x: 14, y: 14, once: false, label: 'HoloNet News Kiosk', description: '[HNN — PRIORITY FEED] "The Coruscant Port Authority today confirmed that a routine fuel-line incident at Sub-Surface Docking Bay 14 has been fully resolved. Port Director Hadras stated that all cargo logs were destroyed in the secondary fire, consistent with standard emergency protocol. Senate Commerce Committee Chair confirmed there is no active investigation." The kiosk screen cycles to a weather advisory. Coruscant does not have weather.' },
          { id: 'lounge_corner_conversation', x: 7, y: 9, once: true, label: 'Overheard Corner Table', description: 'Two men in expensive suits are speaking just below audible. One places a datacard on the table. The other shakes his head. The first slides it closer. The second looks out the window for a long moment, then pockets it. Neither man acknowledges that you passed. The datacard is gone.', grantsFlag: 'corner_deal_witnessed' },
          { id: 'promenade_patrol_log', x: 24, y: 18, once: false, label: 'CSF Patrol Route Terminal', description: 'A public-facing transit safety board maintained by the CSF. Patrol schedule for Sector 4: suspended pending Senate review. Patrol schedule for Sky-Market Promenade: reduced to single-officer rotating shift. The reduction took effect two days after the Bay 14 incident. The authorization is signed: Vane, T.' },
          { id: 'overhead_traffic_lanes', x: 18, y: 2, once: false, label: 'Open-Air Promenade Edge', description: 'The skyway opens above you. Repulsorlift traffic moves in tight formation lanes a hundred meters overhead — freight skiffs, executive speeders, municipal transports. The lanes are color-coded by altitude and clearance tier. A constant low-frequency vibration moves through the durasteel walkway beneath your feet. Somewhere below, Level 1222 looks up through the same open air.' },
          { id: 'aurebesh_neon_sign', x: 16, y: 11, once: false, label: 'Aurebesh Neon Sign Array', description: 'A bank of hand-lettered Aurebesh signs in electric blue and deep crimson mark the vendors along the concourse edge. EXCHANGE CERTIFIED. PHRIK-FREE MATERIALS. SENATE-APPROVED TRANSIT. BEST RATES BETWEEN THE LEVELS. One sign at the end of the row has been unplugged. It read: SCYLLA FREIGHT — REGISTERED CARRIER. The housing still glows faintly from residual charge.' },
          { id: 'vendor_stall_twi', x: 10, y: 15, once: false, label: "Twi'lek Fruit Stand", description: "A canopied stall made from canvas weave and a repurposed cargo-crate frame. Lelani, a green-lekku Twi'lek vendor, is arguing cheerfully in three languages with a Ishi Tib buyer over the price of something that glows orange. The canopy overhead is patched in four places with a different fabric each time. It has survived longer than the district's last three CSF precinct commanders." },
          { id: 'droid_repair_kiosk', x: 22, y: 17, once: false, label: 'Droid Repair Kiosk', description: 'A narrow stall crammed with disassembled photoreceptors, motivator housings, and at least three different droid torsos in various states of rebuild. The proprietor — a pair of heavily tattooed human hands, the rest of the body hidden behind a parts rack — is precision-soldering a restraining bolt without looking up. A handwritten sign reads: NO DROIDS REFUSED. NO QUESTIONS ASKED. PAYMENT UPFRONT.' },
          { id: 'freight_crane_alpha', x: 30, y: 20, once: false, label: 'Freight Terrace Crane Arm', description: 'A heavy industrial crane arm extends from the terrace edge over the open air, weighted with a repulsor counterbalance. Below, on a cantilevered platform you can only partially see, a cargo skiff is being unloaded by two astromech units stacking standardized Czerka containers. The crane arm bears three inspection seals, none of which match the current registration cycle.' },
          { id: 'landing_pad_beacon', x: 14, y: 21, once: false, label: 'Landing Pad 1450 Beacon', description: 'A red collision beacon mounted to the terrace railing flashes in three-second intervals, keeping skiff pilots on approach path. The pad below is rated for two medium-class freighters simultaneously. Currently: four skiffs, two of them unmarked, parked in a configuration that leaves no room for a legitimate arrival. Nobody has filed a complaint with the port authority in six days.' },
          { id: 'repulsor_fluid_slick', x: 22, y: 20, once: false, label: 'Repulsor Fluid Slick', description: 'A wide iridescent puddle has spread from a leaking repulsor stall fitting across the walkway surface. The fluid catches every neon sign in the concourse and renders them in elongated reflections across the durasteel: electric blue, magenta, amber. Standing in it, you can read the entire Aurebesh sign row backwards in the ground beneath your feet.' },
          { id: 'maintenance_strut_a', x: 8, y: 20, once: false, label: 'Ferro-Concrete Support Pillar', description: 'One of the ribbed ferro-concrete support pillars that holds the promenade above the freight terraces. The surface is layered with stenciled Aurebesh tags going back decades — territorial markers, love declarations, gang warnings, one very detailed accusation against a port official that has never been scrubbed. Copper conduit runs up the pillar face in bundled loops, patched at two separate points with wire that does not match.' },
          { id: 'floor_grate_vista', x: 15, y: 23, once: false, label: 'Conduit Underdeck Grate', description: 'A heavy transpariesteel floor grate gives a direct view down through the promenade substructure to the Conduit Underdeck. Exposed municipal piping runs in parallel lines below. Harsh yellow work lights illuminate narrow maintenance catwalks that run the full length of the market floor from beneath. A CSF security node blinks amber at the far end of a catwalk. Someone has been down there recently — a boot print in the condensation on the grate surface.' },
          { id: 'steam_vent_municipal', x: 8, y: 23, once: false, label: 'Municipal Steam Vent', description: 'A ventilation shaft access point built into the promenade deck. At irregular intervals it exhales a column of hot industrial steam that catches the amber light and briefly turns the lower walkway into something resembling a cloudscape. The vent connects to the underdeck thermal management system for the levels below. Maintenance logs on the panel beside it show no scheduled servicing in eleven months.' },
          { id: 'conduit_security_node', x: 22, y: 23, once: true, label: 'Underdeck Security Node', description: 'A CSF-issue security node mounted to the underside of the promenade deck, accessible from the maintenance catwalk. It controls the patrol-droid routing across the lower freight terraces. The casing is standard Republic manufacture — but the firmware version is three cycles out of date. Someone who knew what they were doing could slice it and redirect the patrol pattern entirely.', grantsFlag: 'conduit_node_seen' },
          { id: 'maintenance_catwalk_junction', x: 30, y: 23, once: false, label: 'Maintenance Catwalk Junction', description: 'The narrow catwalk beneath the promenade splits here into three branches: east to the freight crane platforms, west back under the Aurebesh Lounge, and straight down via a ladder access to the Level 1222 ventilation spine. The junction is unmarked. The ladder rungs disappear into darkness forty meters below the grate. Above you, through the floor, you can hear market vendors and the faint pulse of Aurebesh neon.' },
        ],
        npcs: [
          { id: 'marlo_sky', x: 6, y: 7, kind: 'broker', label: '"Slick" Marlo',
            prompt: 'He does not look up from his drink. "You have the look of someone who wandered three hundred levels off course. Give me one reason I should not have my guard droids show you the long way down."',
            repeatPrompt: 'Marlo is watching the exits. His glass stays full.',
            phases: [
              {
                id: 'phase_intro',
                requiresAllFlags: [],
                prompt: 'He does not look up from his drink. "You have the look of someone who wandered three hundred levels off course. Give me one reason I should not have my guard droids show you the long way down."',
                repeatPrompt: 'Marlo is watching the exits. His glass stays full.',
                choices: [
                  { text: 'Lay the Scylla manifest on the table. "Because I know what came off Bay 14."', morality: -5, loyalty: { underworld: 15 }, requires: { item: 'stolen_manifest' }, result: 'He leans forward. The bored expression drops. "That alloy is going to Level 005. Someone is building armor down there. Combat-grade. Phrik-plated." He names a buyer. You gain the Buyer\'s Encrypted ID.', grants: { items: ['buyers_id'], flags: ['marlo_sky_talked'], codex: ['codex-iron-syndicate'] } },
                  { text: '"Jon sends his regards. We have a mutual interest in the Bay 14 shipment."', morality: -3, loyalty: { underworld: 8 }, result: 'He studies you. "Jon is careful about who he vouches for. Sit down. This conversation just became interesting." He does not commit — but he does not call the droids either.', grants: { flags: ['marlo_sky_intro'] } },
                  { text: '"Step aside. I have business with the CSF precinct across the promenade."', morality: 8, loyalty: { republic: 5 }, result: 'He raises an eyebrow. "Bold choice. Enjoy the view from the precinct lockup." He turns back to his drink.' },
                ],
              },
              {
                id: 'phase_warmed',
                requiresAllFlags: ['marlo_sky_intro'],
                requiresNoneFlags: ['marlo_sky_talked'],
                prompt: '"Jon vouches. That is something. But vouching is not evidence, and I deal in evidence. You want in on this conversation, you bring me something with teeth."',
                repeatPrompt: 'Marlo has one eye on you, one on the promenade. He is always measuring something.',
                choices: [
                  { text: 'Show him the Scylla manifest. "This has teeth."', morality: -5, loyalty: { underworld: 15 }, requires: { item: 'stolen_manifest' }, result: '"Now we are talking. That alloy is earmarked for The Works, Level 005. The buyer is moving fast. You want the name — you work with me on a distribution problem first." He slides you the Buyer\'s ID. "The Iron Syndicate is the real prize here. Everything else is noise."', grants: { items: ['buyers_id'], flags: ['marlo_sky_talked'], codex: ['codex-iron-syndicate'] } },
                  { text: '"What distribution problem?"', morality: 0, loyalty: { underworld: 5 }, result: '"Black Sun controls the transit lifts on Levels 1100 to 1300. If I cannot move cargo through that corridor, my entire network stalls. Rook is the problem. You might be the solution." He refills his glass.', grants: { flags: ['marlo_rook_hinted'] } },
                  { text: '"I am not your fixer. I want the buyer\'s name first."', morality: 0, loyalty: {}, result: '"Names cost trust. Trust costs time. Come back when you have both." He is not angry. He is patient. That is somehow worse.' },
                ],
              },
              {
                id: 'phase_partner',
                requiresAllFlags: ['marlo_sky_talked'],
                prompt: '"The Buyer\'s ID points to a Senate financial sub-account. Someone very senior is very nervous. The alloy is already in transit to Level 005. If you can get to Vex before the crucible fires, you can intercept the entire shipment." He leans back. "Or you work the Senate angle. Your call."',
                repeatPrompt: 'Marlo is reading a credit ticker on his personal display. He speaks without looking up. "The timer on that crucible is not decorative."',
                choices: [
                  { text: '"Tell me everything you know about the Iron Syndicate\'s operation in The Works."', morality: -3, loyalty: { underworld: 10 }, result: '"Three levels of Syndicate security. Plasma channels that double as kill corridors. And a droid archivist that the Syndicate left running by accident — 7-N4. It knows things its masters do not realize it knows."', grants: { flags: ['works_briefed_by_marlo'], codex: ['codex-iron-syndicate'] } },
                  { text: '"What is your cut of this, Marlo?"', morality: 0, loyalty: {}, result: '"Territory. Not credits. If the Syndicate falls, the mid-level freight routes open up. I get the lanes. You get the glory. Everybody wins." He means every word.', grants: { flags: ['marlo_terms_known'] } },
                ],
              },
            ],
          },
          { id: 'vane_sky', x: 30, y: 7, kind: 'republic_guard', label: 'Officer Vane',
            prompt: 'He is reviewing a holographic flight manifest when you approach. "This precinct is not a tourist stop. State your business or clear the promenade."',
            repeatPrompt: 'Vane watches the promenade traffic. His hand stays near his weapon.',
            phases: [
              {
                id: 'phase_intro',
                requiresAllFlags: [],
                prompt: 'He is reviewing a holographic flight manifest when you approach. "This precinct is not a tourist stop. State your business or clear the promenade."',
                repeatPrompt: 'Vane watches the promenade traffic. His hand stays near his weapon.',
                choices: [
                  { text: 'Place the Scylla manifest on his holo-table. "Bay 14 was not an accident."', morality: 15, loyalty: { republic: 15 }, requires: { item: 'stolen_manifest' }, result: '"This confirms Phrik alloy logged under false Senate credentials. Inside job." His expression hardens. "Take this CSF Auxiliary Pass. Get into Sector 4 and pull names. Report back to me directly." He pauses. "Welcome aboard, Auxiliary."', grants: { items: ['csf_aux_pass'], flags: ['vane_sky_cooperated', 'republic_path_open'], codex: ['codex-csf-protocol'] } },
                  { text: '"I want to join the CSF. Formally. Whatever the fast track looks like."', morality: 12, loyalty: { republic: 12 }, result: '"You do not join the CSF by walking into a precinct on the promenade. But I can sponsor an Auxiliary Corps application. Come back when you have evidence to back it up. Then we talk."', grants: { flags: ['vane_sky_intro'] } },
                  { text: '"I am looking into the Bay 14 raid. Freelance."', morality: 0, loyalty: {}, result: '"Freelance investigators are not sanctioned by the Republic. If you find anything relevant you will turn it over to this precinct. Understood?" He returns to his manifest without waiting for an answer.', grants: { flags: ['vane_sky_intro'] } },
                  { text: 'Say nothing and leave.', morality: 0, loyalty: {}, result: 'He does not acknowledge your departure.' },
                ],
              },
              {
                id: 'phase_returned',
                requiresAllFlags: ['vane_sky_intro'],
                requiresNoneFlags: ['vane_sky_cooperated'],
                prompt: '"You came back. I noted that." He sets his manifest aside. "Most people who come to a CSF precinct on business do not return once I turn them away. That tells me something. What changed?"',
                repeatPrompt: 'He is watching you now. Not the promenade. You.',
                choices: [
                  { text: 'Present the Scylla manifest. "I found what you need."', morality: 15, loyalty: { republic: 15 }, requires: { item: 'stolen_manifest' }, result: 'He takes the manifest and reads it in silence. The promenade noise drops away. "Inside job. Senate-level clearance codes. This is not Black Sun — this is someone with real authority." He stands. "Auxiliary Corps. Provisional commission. Take this pass and get into Sector 4. Names, dates, chain of custody. Everything." A beat. "Do not make me regret this."', grants: { items: ['csf_aux_pass'], flags: ['vane_sky_cooperated', 'republic_path_open'], codex: ['codex-csf-protocol'] } },
                  { text: '"I know who owns the Bay 14 alloy. But I need a Republic guarantee first."', morality: 5, loyalty: { republic: 5 }, result: '"A guarantee of what?" His eyes narrow. "If you are negotiating immunity for a contact, I need to know the contact\'s name and their exposure before I can commit to anything. I am not in the business of blank pardons."', grants: { flags: ['vane_negotiation_started'] } },
                  { text: '"I changed my mind. I am not ready to work with the Republic."', morality: 0, loyalty: {}, result: '"Then do not take up my time." He picks up his manifest. But he does not tell you to leave. The offer is still open.' },
                ],
              },
              {
                id: 'phase_cooperating',
                requiresAllFlags: ['vane_sky_cooperated'],
                prompt: '"Sector 4 is the priority. Every hour we wait, the evidence chain degrades. I need a name attached to those Senate clearance codes before the Iron Syndicate buries this deeper."',
                repeatPrompt: '"Sector 4. Every hour matters, Auxiliary."',
                choices: [
                  { text: '"What happens when we get the name?"', morality: 5, loyalty: { republic: 8 }, result: '"We build a file. A proper one. Chain of custody, witness testimony, physical evidence. When it goes to a Senate tribunal, it has to be bulletproof. One procedural error and whoever signed those codes walks free." He taps his badge. "That is not happening on my watch."', grants: { flags: ['vane_procedure_explained'] } },
                  { text: '"If this goes wrong in Sector 4, what backup do I have?"', morality: 8, loyalty: { republic: 8 }, result: '"Officially, none. Unofficially, I have two units on standby at Level 1088 Outpost. If you light the emergency beacon on your pass, they respond within four minutes." He pauses. "Try not to need them."', grants: { flags: ['vane_backup_revealed'] } },
                ],
              },
            ],
          },
          { id: 'promenade_vendor', x: 20, y: 15, kind: 'cantina_owner', label: 'Promenade Vendor Oska',
            repeatPrompt: 'Oska polishes a glass and pretends not to notice you.',
            prompt: '"Upper levels, lower prices if you know how to ask. What are you after?"',
            choices: [
              { text: 'Ask about the men in grey coats on the promenade.', morality: 0, loyalty: {}, result: '"Grey coats? I know the ones. They spend credits like they have too many of them. Never buy food. Always watching the transit lifts."', grants: { codex: ['codex-iron-syndicate'] } },
              { text: 'Buy a bottle of Corellian Reserve.', morality: 0, loyalty: { underworld: 2 }, result: 'She produces a bottle from under the cart without a word. "Sixty credits. Do not tell anyone where you got it."', grants: { items: ['item_brandy'] } },
            ],
          },
          { id: 'bith_rumor_broker', x: 8, y: 5, kind: 'bith', label: 'Korvin — Information Broker', mobile: true,
            repeatPrompt: 'Korvin taps his dome-shaped skull rhythmically. He is processing something. Or composing.',
            prompt: '"Sound carries further than people assume at this altitude. I have excellent hearing. I sell what I hear. Thirty credits per item. Or you tell me something interesting and I reciprocate."',
            choices: [
              { text: 'Pay thirty credits for local intelligence. "What do you know about Bay 14?"', morality: 0, loyalty: {}, result: '"The official story is a dock fire. My ears say otherwise. Fourteen grey coats with Republic clearance codes walked a Phrik shipment out of a sealed dock while the alarms were looped. Two dock hands disappeared that night. One resurfaced on Level 1100. Ask for Rook."', grants: { flags: ['bith_intel_purchased'], codex: ['codex-docking-bay-14'] } },
              { text: 'Offer information in trade. "The Syndicate has observers in the lounge right now."', morality: 0, loyalty: {}, result: '"I know. I told them where to sit for the best sightlines." He pauses. "I work for everyone. That is how I survive. But I will tell you this for free — the one they are watching is not you. Not yet."', grants: { flags: ['bith_exchange_done'] } },
              { text: 'Ask him about Marlo.', morality: -2, loyalty: { underworld: 3 }, result: '"Marlo? Brilliant man. Paranoid man. He once had a business rival\'s ship impounded for six months over a missing cargo seal. The cargo seal was not missing. It was Marlo. He makes patience look like aggression."' },
            ],
          },
          { id: 'lounge_patron', x: 4, y: 7, kind: 'cantina_owner', label: 'High-Society Patron Sevra', mobile: false,
            repeatPrompt: 'Sevra swirls her glass and watches the promenade through the lounge window. She has opinions.',
            prompt: 'She glances at you sideways. "You do not look like someone with a Sky-Market Exchange account. Are you lost, or are you one of those investigators the Senate keeps sending down here to pretend they care?"',
            choices: [
              { text: '"I am looking into a cargo irregularity. Discreetly."', morality: 5, loyalty: {}, result: '"Discreet. From a person who just walked into the most visible bar on Level 1450." She sets down her glass. "The irregularity you mean closed two months ago. Officially. Someone very senior wanted it closed. Everyone on this promenade knows. Nobody says it."', grants: { flags: ['sevra_hinted'] } },
              { text: '"What is the Bay 14 Blend, exactly?"', morality: 0, loyalty: {}, result: '"That is what we call dark humor around here. The barkeep invented it after the dock fire. Named it before the CSF closed the case. He knew the fire story was false. We all did." She finishes her drink. "It tastes like something burning that should not be burning."' },
            ],
          },
          { id: 'senate_aide_promenade', x: 22, y: 13, kind: 'mechanic', label: 'Senate Aide Parvus', mobile: true,
            repeatPrompt: 'Parvus is reviewing a datapad with the focused anxiety of someone who knows exactly how much trouble they are in.',
            prompt: 'He nearly walks into you and flinches back. A Senate aide pin glints on his collar. "I am not here. Officially. If anyone asks, I was at a budget subcommittee hearing all afternoon."',
            choices: [
              { text: '"Who sent you down here?"', morality: 5, loyalty: { republic: 5 }, result: '"Nobody. I came voluntarily. Which is worse, legally." He glances over his shoulder. "The sub-account that cleared the Bay 14 cargo passes through my committee. I did not sign off on it. I do not know who did. I came here to find out and I am starting to wish I had not."', grants: { flags: ['senate_aide_met'], codex: ['codex-docking-bay-14'] } },
              { text: '"If you know something about Bay 14, you should go directly to Officer Vane."', morality: 10, loyalty: { republic: 8 }, result: '"Vane?" He goes pale. "You think Vane is clean? The closure authorization on this case has his name on it. That could mean he was ordered to close it. Or it could mean something worse." He pockets his datapad. "I need to think about this more carefully."', grants: { flags: ['vane_ambiguous_hinted'] } },
              { text: '"Say nothing. Take his datapad ID and walk away."', morality: -5, loyalty: { underworld: 5 }, result: 'He watches you go with the expression of someone calculating whether to report this or add it to the list of things they are pretending not to know.', grants: { flags: ['aide_id_noted'] } },
            ],
          },
        ],
        collectibles: [{ id: 'sky_market_datachip', x: 14, y: 19, label: 'Sliced Comm Fragment', reward: 40 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 36, 24, 'floor');
          carveRect(g, 1, 3, 12, 11, 'wall');
          carveRect(g, 2, 4, 11, 10, 'floor');
          carveRect(g, 26, 3, 36, 11, 'wall');
          carveRect(g, 27, 4, 35, 10, 'floor');
          carveRect(g, 34, 18, 36, 22, 'wall');
          pt(g, 35, 19, 'floor'); pt(g, 35, 20, 'floor'); pt(g, 35, 21, 'floor'); pt(g, 34, 20, 'floor');
          pt(g, 12, 7, 'floor');
          pt(g, 26, 7, 'floor');
          carveRect(g, 3, 21, 33, 21, 'wall');
          pt(g, 14, 21, 'floor'); pt(g, 22, 21, 'floor');
          pt(g, 0, 12, 'door'); pt(g, 0, 13, 'door');
          pt(g, 15, 25, 'door');
          return g;
        },
      },
      sky_customs: {
        id: 'sky_customs', name: 'Skyway Customs & Concourse Dock', subtitle: 'Coruscant · L.1450 — Entry Gate',
        width: 36, height: 24, spawnPos: { x: 4, y: 12 }, textureId: 'coruscant',
        accent: '#00C4D4', accentGlow: 'rgba(0,196,212,0.25)', accentDim: '#006070',
        floorColor: '#1A1E24', floorAlt: '#222830', wallDark: '#0A0C12', wallLight: '#141C24',
        bg: 'radial-gradient(circle at 50% 30%, #101828 0%, #08090E 70%)', ambient: 'traffic',
        decor: ['pillar', 'archive', 'neon_sign'],
        doors: [
          { x: 35, y: 12, targetZone: 'sky_market', targetPos: { x: 1, y: 12 }, label: 'Sky-Market Promenade' },
          { x: 35, y: 13, targetZone: 'sky_market', targetPos: { x: 1, y: 13 }, label: 'Sky-Market Promenade' },
        ],
        worldObjects: [
          { id: 'airtaxi_sky_customs', x: 2, y: 12, once: false, label: 'AirTaxi Terminal', description: 'Coruscant AirTaxi Network terminal. Level 1450 Customs Concourse departure point.' },
          { id: 'customs_scanner_archway', x: 12, y: 7, once: false, label: 'Cargo Scanner Archway', description: 'A Republic-standard cargo scan archway. The readout shows the last twelve items processed. Eleven of them are flagged with a yellow query. None have been followed up. The twelfth is flagged red: PHRIK ALLOY TRACE. The flag was manually cleared three months ago. The operator ID on the clearance is: REDACTED.' },
          { id: 'manifest_kiosk', x: 18, y: 12, once: true, label: 'Cargo Manifest Registry', description: 'A public cargo manifest terminal. Searching "Scylla Freight" returns zero results. Searching the Bay 14 berth number returns a single entry: CASE CLOSED. RECORDS PURGED. AUTHORIZATION: SENATE DIRECTIVE 1182-C. The terminal\'s own activity log shows the purge command was issued from this terminal, from this building, at the same time the dock fire was reported.', grantsFlag: 'customs_manifest_checked' },
          { id: 'caf_stand', x: 6, y: 6, once: false, label: 'Caf Stand — Northwest Concourse', description: 'A battered chrome caf dispenser and a fold-out table. A hand-lettered sign reads: BEST CAF BETWEEN THE LEVELS. A smaller sign below it reads: ONLY CAF BETWEEN THE LEVELS. The proprietor is a tired-looking Duros who refills your cup without being asked and does not charge you for it. "New faces are good for business," he says. "Old faces are bad for my nerves."' },
          { id: 'detention_alcove', x: 6, y: 17, once: false, label: 'CSF Detention Alcove', description: 'A small holding area with two retention rings and a broken binder lock. The cell log shows fourteen detentions in the past six months. Thirteen were released within four hours. The fourteenth — listed only as GREY COAT, NO ID — was transferred off-site per Senate Directive 1182-C. No destination logged. The transfer was authorized by the same officer who filed the Bay 14 closure.' },
          { id: 'flight_control_booth', x: 28, y: 7, once: true, label: 'Flight Control Booth', description: 'The customs concourse flight control station. The arrival log for the night of the Bay 14 incident shows a twelve-minute gap in the record — all arrivals logged, then nothing, then resuming as if the gap does not exist. The station officer filed a "technical malfunction" report for those twelve minutes. The report was accepted without inquiry.', grantsFlag: 'flight_gap_found' },
          { id: 'siphon_terminal', x: 22, y: 7, once: true, label: 'Cargo Feed Splice Terminal', description: 'A secondary manifest feed terminal. The uplink is live. Splicing into the customs broadcast frequency would expose every clearance override logged in the past six months. The security lock runs on a frequency-keyed cipher.', triggersMinigame: 'signal_siphon', grantsFlag: 'customs_manifest_decrypted', grantsCodex: 'codex-sector-4-freight-corridors' },
        ],
        npcs: [
          { id: 'csf_customs_officer', x: 16, y: 12, kind: 'republic_guard', label: 'CSF Customs Officer Rael',
            prompt: '"This is a controlled transit point. All cargo entering the Sky-Market District must be logged and scanned. Present your manifest or step aside."',
            repeatPrompt: 'Officer Rael watches the concourse with the patience of someone who has been watching concourses for a very long time.',
            choices: [
              { text: '"I am CSF Auxiliary. I need access to the manifest registry."', morality: 8, loyalty: { republic: 8 }, requires: { item: 'csf_aux_pass' }, result: '"Auxiliary clearance noted. The registry terminal is at the center concourse. I would warn you that certain records have been — expunged. Senate directive. I am not permitted to say more." He steps aside.', grants: { flags: ['rael_cooperated'] } },
              { text: '"What happened to the Bay 14 cargo records?"', morality: 5, loyalty: { republic: 5 }, result: '"I am not authorized to discuss active or closed Senate-directed case files. If you have a formal inquiry, file it with the Port Authority. Processing time is six to eight standard weeks." He does not make eye contact when he says it.', grants: { flags: ['rael_deflected'] } },
              { text: '"I am looking for someone who was transferred out of your detention alcove."', morality: 3, loyalty: {}, result: '"Transfers off-site are handled by a dedicated Senate liaison. I do not have access to those records, and I would advise you not to press on that topic in this building." He pauses. "I am saying that as a courtesy."', grants: { flags: ['rael_warned'] } },
            ],
          },
          { id: 'ast4_security_droid', x: 28, y: 16, kind: 'droid', label: 'AST-4 Security Droid', mobile: true,
            prompt: '"SCANNING. CLEARANCE LEVEL: insufficient for restricted concourse areas. RECOMMEND: proceed to public manifest kiosk. THREAT ASSESSMENT: pending."',
            repeatPrompt: 'AST-4 tracks your movement with its photoreceptor array. The threat assessment percentage has gone up.',
            choices: [
              { text: '"Run diagnostic. Who last accessed the flight control booth?"', morality: 0, loyalty: {}, result: '"DIAGNOSTIC REQUEST: access log for Flight Control Booth, past ninety days. RESULT: twenty-two authorized entries. ANOMALY: one entry, one hundred and twelve days ago, logged under a Senate clearance tier that does not correspond to any known customs authority level. CLASSIFICATION: above my pay grade." It resumes scanning.' },
              { text: '"Stand down. Auxiliary clearance."', morality: 3, loyalty: { republic: 5 }, requires: { item: 'csf_aux_pass' }, result: '"CLEARANCE VERIFIED: Auxiliary Corps provisional. THREAT ASSESSMENT: revised to: unlikely. RECOMMENDATION: try not to do anything that changes that assessment." It pivots away.' },
            ],
          },
        ],
        collectibles: [{ id: 'customs_chip', x: 30, y: 17, label: 'Dropped Clearance Chip', reward: 25 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 34, 22, 'floor');
          carveRect(g, 1, 3, 10, 10, 'wall');
          carveRect(g, 2, 4, 9, 9, 'floor');
          pt(g, 10, 7, 'floor');
          carveRect(g, 1, 13, 10, 20, 'wall');
          carveRect(g, 2, 14, 9, 19, 'floor');
          pt(g, 10, 16, 'floor');
          carveRect(g, 22, 3, 34, 10, 'wall');
          carveRect(g, 23, 4, 33, 9, 'floor');
          pt(g, 22, 7, 'floor');
          carveRect(g, 22, 13, 34, 20, 'wall');
          carveRect(g, 23, 14, 33, 19, 'floor');
          pt(g, 22, 16, 'floor');
          pt(g, 35, 12, 'door'); pt(g, 35, 13, 'door');
          return g;
        },
      },
      heat_sink_slums: {
        id: 'heat_sink_slums', name: 'Heat Sink Slums & Cantina Alley', subtitle: 'Coruscant · L.1450 — Residential Underbelly',
        width: 36, height: 28, spawnPos: { x: 15, y: 2 }, textureId: 'coruscant',
        accent: '#FF5520', accentGlow: 'rgba(255,85,32,0.28)', accentDim: '#802010',
        floorColor: '#1A1008', floorAlt: '#261606', wallDark: '#0A0602', wallLight: '#160C06',
        bg: 'radial-gradient(circle at 50% 90%, #2A1008 0%, #160804 30%, #080402 75%, #050202 100%)',
        ambient: 'embers', decor: ['pipe', 'neon_sign', 'brazier', 'cargo_crate'],
        doors: [
          { x: 15, y: 0, targetZone: 'sky_market', targetPos: { x: 15, y: 24 }, label: 'Sky-Market Promenade' },
          { x: 16, y: 0, targetZone: 'sky_market', targetPos: { x: 16, y: 24 }, label: 'Sky-Market Promenade' },
          { x: 20, y: 27, targetZone: 'catwalk_underdeck', targetPos: { x: 20, y: 1 }, label: 'Catwalk Underdeck' },
          { x: 21, y: 27, targetZone: 'catwalk_underdeck', targetPos: { x: 21, y: 1 }, label: 'Catwalk Underdeck' },
        ],
        worldObjects: [
          { id: 'airtaxi_heat_sink', x: 16, y: 20, once: false, label: 'AirTaxi Terminal', description: 'A battered AirTaxi terminal mounted to the underdeck support strut. The casing is cracked and the screen flickers, but it works. Barely.' },
          { id: 'cantina_entrance_sign', x: 8, y: 4, once: false, label: 'Cantina Sign — The Exhaust', description: 'A hand-painted sign above the cantina entrance reads THE EXHAUST in faded Aurebesh. Below, someone has added in smaller lettering: "Est. after the last time this level flooded." The door is open. The smell of grilled protein and something spiced with too much heat wafts out.' },
          { id: 'cantina_gorg_spit', x: 5, y: 8, once: false, label: 'Gorg Spit — The Exhaust', description: 'A rotating gorg spit occupies the corner of the cantina near the bar. Whatever the gorg ate before it became the gorg, it was clearly living its best life. The fat drips and sizzles. The cantina keep claims the spit has not been turned off in three years. Nobody has contradicted this.' },
          { id: 'sabacc_table', x: 10, y: 10, once: true, label: 'Sabacc Table — Back Corner', description: 'Four players, a mixed pile of credits and vouchers, and a fifth person watching from behind a column. The watcher is not playing. The watcher is counting cards. Nobody at the table has noticed. You have.', grantsFlag: 'sabacc_observer_seen' },
          { id: 'hab_capsule_stack', x: 28, y: 8, once: false, label: 'Hab Capsule Block', description: 'Forty-eight stacked sleep capsules in a converted freight container, each one a meter and a half of foam mat and a ventilation slot. The occupancy board shows thirty-nine occupied. Rate: two credits per sleep cycle. The manager\'s station is empty — the manager lives in capsule forty-seven.' },
          { id: 'exhaust_radiator_vent', x: 32, y: 20, once: false, label: 'Thermal Exhaust Radiator', description: 'A massive heat-sink radiator panel mounted to the outer wall, channeling heat from the manufacturing zones below upward through the residential level. On cold cycles it is a gathering point — a dozen residents crouch near the vents for warmth. The panel is rated for industrial output. The residential zone it is venting through is not.' },
          { id: 'informant_booth', x: 20, y: 18, once: true, label: 'Curtained Booth', description: 'A makeshift privacy booth constructed from cargo curtain and wire frame. A datapad left on the table inside displays a partial credit transfer log — the same shell corporation chain visible on the lounge datapad upstairs, traced one step further to an account registered under the Senate District financial authority. Someone has been following the same thread you have.', grantsFlag: 'informant_found' },
        ],
        npcs: [
          { id: 'reelo_informant', x: 22, y: 18, kind: 'broker', label: 'Reelo — Street Broker',
            prompt: '"I do not know you. I do not do business with people I do not know. Unless—" he glances at the booth behind him, "—you are the one who has been following the credit trail. In that case, we have something to discuss."',
            repeatPrompt: 'Reelo keeps one hand under the table. He has not decided whether he trusts you yet.',
            choices: [
              { text: '"I found the same shell accounts. Bay 14. Senate financial authority."', morality: 0, loyalty: { underworld: 8 }, result: '"Then you are either very smart or very stupid for following it this far. The account connects to a sub-committee that does not appear in the public Senate directory. Three people know it exists. Two of them work for the Iron Syndicate." He pauses. "I am not one of those two."', grants: { flags: ['reelo_talked', 'senate_subcommittee_named'] } },
              { text: '"Who has been sitting in this booth?"', morality: 5, loyalty: {}, result: '"Someone who asks the right questions and leaves before they can be asked back. Like you should be doing right now." He nods at the door.' },
              { text: '"What do you know about the Catwalk Underdeck?"', morality: -3, loyalty: { underworld: 5 }, result: '"Maintenance access for the levels below. The Syndicate uses it as a route to move cargo without hitting the transit checkpoints. If you go down there, go armed and go quiet."', grants: { flags: ['underdeck_warned'] } },
            ],
          },
          { id: 'cantina_keep_mirra', x: 8, y: 7, kind: 'cantina_owner', label: 'Mirra — Cantina Keep',
            prompt: '"Food is hot. Caf is strong. The sabacc table in the back is none of my business and has never existed. What do you want?"',
            repeatPrompt: 'Mirra refills glasses without being asked and forgets faces on purpose.',
            choices: [
              { text: '"What do you know about the Iron Syndicate on this level?"', morality: -5, loyalty: { underworld: 5 }, result: '"They do not drink here. They do not eat here. They sit in the hab block and watch the transit corridors. I know this because my cantina is on the transit corridor and they are not subtle." She wipes the bar. "I stopped knowing things a month ago. It is healthier."', grants: { flags: ['mirra_hinted'] } },
              { text: '"Is there a way down to the Catwalk Underdeck from here?"', morality: 0, loyalty: {}, result: '"South corridor, past the exhaust radiator. Maintenance hatch. You did not hear it from me." She moves to the other end of the bar.', grants: { flags: ['underdeck_access_known'] } },
            ],
          },
        ],
        collectibles: [{ id: 'slum_cred_chip', x: 14, y: 24, label: 'Stashed Cred Chip', reward: 35 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 34, 26, 'floor');
          carveRect(g, 1, 3, 14, 14, 'wall');
          carveRect(g, 2, 4, 13, 13, 'floor');
          pt(g, 14, 8, 'floor');
          carveRect(g, 18, 3, 34, 14, 'wall');
          carveRect(g, 19, 4, 33, 13, 'floor');
          pt(g, 18, 8, 'floor');
          pt(g, 15, 0, 'door'); pt(g, 16, 0, 'door');
          pt(g, 20, 27, 'door'); pt(g, 21, 27, 'door');
          return g;
        },
      },
      catwalk_underdeck: {
        id: 'catwalk_underdeck', name: 'Vent Sector 14-Sub — Catwalk Underdeck', subtitle: 'Coruscant · L.1450 — Industrial Substructure',
        width: 40, height: 22, spawnPos: { x: 20, y: 2 }, textureId: 'coruscant',
        accent: '#C87800', accentGlow: 'rgba(200,120,0,0.22)', accentDim: '#604000',
        floorColor: '#0E0C08', floorAlt: '#161208', wallDark: '#060402', wallLight: '#0E0A06',
        bg: 'radial-gradient(circle at 50% 100%, #180C00 0%, #0C0800 40%, #050402 80%, #030202 100%)',
        ambient: 'embers', decor: ['pipe', 'girder', 'slag'],
        doors: [
          { x: 20, y: 0, targetZone: 'heat_sink_slums', targetPos: { x: 20, y: 26 }, label: 'Heat Sink Slums' },
          { x: 21, y: 0, targetZone: 'heat_sink_slums', targetPos: { x: 21, y: 26 }, label: 'Heat Sink Slums' },
        ],
        worldObjects: [
          { id: 'airtaxi_underdeck', x: 2, y: 11, once: false, label: 'AirTaxi Terminal', description: 'A stripped-down AirTaxi terminal bolted to the underdeck strut framework. The screen is dark but the interface responds. Someone installed this without filing a permit.' },
          { id: 'security_junction_box', x: 22, y: 6, once: true, label: 'CSF Patrol Routing Junction', description: 'A Republic-standard security routing node controlling patrol droid movements across the lower freight terraces. The firmware is three cycles out of date. The patrol schedule loaded into memory routes all droids away from Corridor 14-Sub between the third and fifth hour of the sleep cycle — a twelve-minute window, recurring. The window matches the Bay 14 incident timeline exactly.', grantsFlag: 'patrol_window_found', grantsCodex: 'codex-csf-protocol' },
          { id: 'hydraulic_damper', x: 6, y: 6, once: false, label: 'Hydraulic Damper Array', description: 'The underdeck is held together by a series of hydraulic dampers that absorb the structural vibration from the freight terraces above. Each damper is stamped with a maintenance date. The most recent stamp is eight months old. The recommended interval is thirty days. The noise from above — a constant low throb — makes more sense now.' },
          { id: 'conduit_tap_node', x: 32, y: 14, once: true, label: 'Unauthorized Power Tap Node', description: 'A jury-rigged power tap drilled directly into the municipal conduit line and drawing a continuous bleed of current to somewhere below. The cable runs down through a floor grate and disappears. The draw is small enough to stay below automated monitoring thresholds. Someone who knew exactly how the monitoring worked installed this.', grantsFlag: 'power_tap_found' },
          { id: 'drop_shaft_view', x: 7, y: 17, once: false, label: 'Vertical Drop Shaft', description: 'An open maintenance shaft drops straight down from the underdeck floor into the levels below. No safety railing. A flickering work light thirty meters down illuminates a narrow platform, and below that — nothing visible. The shaft connects to the Level 1222 ventilation spine. If you could get down there without falling, you could move between levels without touching a single transit checkpoint.' },
          { id: 'syndicate_marker', x: 30, y: 18, once: true, label: 'Iron Syndicate Transit Marker', description: 'A small iron chain emblem, stamp-pressed into the conduit housing — the Iron Syndicate\'s territorial marker. This route belongs to them. The stamp is recent: the metal around the impression is still bright, not yet oxidized. They have been using this underdeck as a cargo transit route within the last few days.', grantsFlag: 'syndicate_route_found' },
        ],
        npcs: [
          { id: 'maintenance_droid_14sub', x: 20, y: 14, kind: 'droid', label: 'Maintenance Droid M-7', mobile: true,
            prompt: '"UNIT M-7. ASSIGNED: underdeck thermal monitoring, Vent Sector 14-Sub. CURRENT STATUS: thermal readings nominal. ANOMALY LOG: seventeen unauthorized access events in the past month. REPORTING STATUS: none filed. Reporting terminal offline for seven months."',
            repeatPrompt: 'M-7 resumes its patrol route, logging thermal readings that nobody will read.',
            choices: [
              { text: '"Who has been accessing this sector without authorization?"', morality: 0, loyalty: {}, result: '"ACCESS LOG: seventeen events. Biometric match: none. Cargo mass estimate per event: substantial. Route: north entry, south conduit access, repeat. ASSESSMENT: organized. CONCERN LEVEL: high. FILED REPORTS: zero. Reporting terminal offline."', grants: { flags: ['underdeck_traffic_logged'] } },
              { text: '"Are you connected to the CSF patrol routing system?"', morality: 5, loyalty: { republic: 5 }, result: '"CONNECTED: yes, passive monitoring only. LAST PATROL UNIT IN THIS SECTOR: forty-three days ago. PATROL SCHEDULE: modified. REASON FOR MODIFICATION: system-level override, authorization unknown. CONCERN LEVEL: very high. Filed reports: zero. Reporting terminal offline."', grants: { flags: ['patrol_gap_confirmed'] } },
            ],
          },
        ],
        collectibles: [{ id: 'catwalk_cred_chip', x: 36, y: 10, label: 'Dropped Maintenance Chit', reward: 45 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 38, 20, 'floor');
          carveRect(g, 15, 2, 25, 10, 'wall');
          carveRect(g, 16, 3, 24, 9, 'floor');
          pt(g, 15, 6, 'floor');
          pt(g, 25, 6, 'floor');
          carveRect(g, 2, 13, 12, 20, 'wall');
          carveRect(g, 3, 14, 11, 19, 'floor');
          pt(g, 7, 13, 'floor');
          carveRect(g, 28, 12, 28, 18, 'lava');
          pt(g, 20, 0, 'door'); pt(g, 21, 0, 'door');
          return g;
        },
      },
      freight_hub: {
        id: 'freight_hub', name: 'Sector 4 Freight Hub', subtitle: 'Coruscant · Industrial Mid-Levels · Sector 4',
        width: 40, height: 28, spawnPos: { x: 2, y: 14 }, textureId: 'coruscant',
        accent: '#FF8C42', accentGlow: 'rgba(255,140,66,0.18)', accentDim: '#7A3A10',
        floorColor: '#1C1A14', floorAlt: '#24221A', wallDark: '#0A0902', wallLight: '#161408',
        bg: 'radial-gradient(circle at 30% 70%, #181410 0%, #08070A 70%)', ambient: 'steam',
        decor: ['cargo_crate', 'pipe', 'girder', 'warning_beacon', 'slag'],
        doors: [
          { x: 20, y: 27, targetZone: 'mag_rail_corridor', targetPos: { x: 20, y: 1 }, label: 'Mag-Rail Corridor' },
          { x: 21, y: 27, targetZone: 'mag_rail_corridor', targetPos: { x: 21, y: 1 }, label: 'Mag-Rail Corridor' },
        ],
        worldObjects: [
          { id: 'bay14_crime_scene', x: 20, y: 6, once: true, label: 'Bay 14 Blast Marks', description: 'The dock wall is scorched. Not from a fuel fire — the scorch pattern is from shaped charges placed against the loading manifest kiosk. Someone destroyed the primary records on the way out.' },
          { id: 'discarded_keycard', x: 32, y: 18, once: true, label: 'Discarded Passcode', description: 'Half-melted but readable: an underworld bypass key. Grants sub-level transit without checkpoint flags. You pocket it.', grantsItem: 'scrambler_keycard' },
          { id: 'shipping_crate_b14', x: 10, y: 20, once: true, label: 'Unsealed Shipping Crate', description: 'Marked as "agricultural supplies." Contains Glitterstim vials and unregistered blaster power packs. Clearly staged to be found.', grantsItem: 'item_spice_vial' },
          { id: 'customs_terminal_088', x: 26, y: 4, once: true, label: 'Customs Manifest Registry', description: 'Three containers marked with Senate sub-committee routing stamps. One flags as anomalous — destination redacted, shipper redacted, authorization code valid. The code traces to a sub-committee that officially does not exist.' },
          { id: 'crane_node_088', x: 22, y: 4, once: true, label: 'Crane Automation Node', description: 'The bay exterior crane control system. A code input here can drop a heavy repulsor-crate onto the loading yard — opening a breach point into the warehouse without triggering external alarms.' },
          { id: 'undercity_radio_terminal', x: 4, y: 4, once: false, label: 'Under-Grit Radio Intercept', description: '[Signal 104.9 Sub-Grit — Unauthorized] "They are calling Docking Bay 14 a logistical delay while Black Sun heavy gunners run it like a private toll booth. CSF sent fresh academy blood into Sector 4. Place your bets at Vond\'s shop — three to one the new badge sells out before end of shift..."' },
          { id: 'vond_vendor', x: 8, y: 24, once: false, label: '"Greasy" Vond — Scrap and Salvage', description: '"If it fell off the back of a freighter, I have it. No warranties. Once you walk off my platform, we do not know each other." Sells: Scrambler Keycard, Blaster Parts, Freighter Repair Kit.' },
          { id: 'airtaxi_freight_hub', x: 38, y: 6, once: false, label: 'AirTaxi Terminal', description: 'Transit terminal. Level access pending clearance.' },
        ],
        npcs: [
          { id: 'jax_freight', x: 18, y: 6, kind: 'mechanic', label: 'Dock Engineer Jax',
            repeatPrompt: 'Jax is running diagnostics on a loading claw. He does not acknowledge you.',
            prompt: '"Whatever you are here for, I did not see anything. Go find someone else."',
            choices: [
              { text: '"The CSF sent me. Here is my Auxiliary Pass."', morality: 5, loyalty: { republic: 8 }, requires: { item: 'csf_aux_pass' }, result: 'He glances at the pass and exhales. "Fine. I was in the maintenance shaft when they came through. Fourteen of them. Grey coats. Republic security codes that checked out clean. They loaded the Phrik onto two unmarked lifters and went sub-level."', grants: { flags: ['jax_talked', 'freight_hub_investigated'], codex: ['codex-docking-bay-14'] } },
              { text: 'Offer him 200 credits and ask what he saw.', morality: -8, loyalty: { underworld: 8 }, result: 'He pockets the credits without counting them. "Two lifters. Unmarked. Grey coats with Republic codes. Went down. That is all I am giving you."', grants: { flags: ['jax_bribed', 'freight_hub_investigated'] } },
              { text: '"I know you were in the shaft. Tell me what you saw or I will tell them you were."', morality: -15, loyalty: { underworld: 12 }, result: 'His jaw tightens. "You are going to fit right in around here." He tells you what he saw.', grants: { flags: ['jax_intimidated', 'freight_hub_investigated'] } },
            ],
          },
          { id: 'kaelen_freight', x: 6, y: 22, kind: 'swoop_gang', label: 'Kaelen "Breaker" Voss',
            repeatPrompt: 'Kaelen is tinkering with his swoop\'s repulsor coils.',
            prompt: '"Your business does not belong down here. Mine does. Those are different things."',
            choices: [
              { text: '"You were hired as a distraction during the Bay 14 raid. I am not here to arrest you."', morality: 0, loyalty: { underworld: 6 }, result: '"You are smarter than you look. Yeah, someone paid us to race through the bay and make noise while they loaded up. Paid well. Did not ask questions."', grants: { flags: ['kaelen_talked'] } },
              { text: 'Challenge him to a race for the information.', morality: 5, loyalty: { underworld: 10 }, result: '"Ha. I like you. We race. You win, you get what you want. You lose, you owe me a favor." He transfers everything he knows. [Race mini-game placeholder]', grants: { flags: ['kaelen_raced'] } },
            ],
          },
          { id: 'corin_088', x: 10, y: 18, kind: 'mechanic', label: '"Fixer" Corin',
            repeatPrompt: 'Corin is calibrating a blaster power cell. He does not pause when you enter.',
            prompt: '"You wear that CSF armor like it is supposed to mean something down here. I used to wear the Navy crest. Know what it bought me? A pink slip and a tin eye."',
            choices: [
              { text: '"The Navy leaves a lot of good people behind. I am just trying to keep people safe down here."', morality: 5, loyalty: {}, result: '"Safe? In Sector 4? (He sets down his hydrospanner.) You are either brand new or completely soft. If you need your stun-output upgraded, I will not charge top credit."', grants: { flags: ['corin_friendly'] } },
              { text: '"I need access to restricted Navy frequency relays."', morality: -5, loyalty: { underworld: 8 }, result: '"Now that is dangerous. Two hundred credits and your word you did not hear it from me."', grants: { flags: ['corin_relay_unlocked'] } },
            ],
          },
          { id: 'dax_shipping', x: 10, y: 6, kind: 'mechanic', label: 'Dax — Shipping Clerk',
            repeatPrompt: 'Dax is checking cargo seals with excessive attention to detail.',
            prompt: 'He glances past you before speaking. "I have been waiting for someone to come asking. I cannot keep filing phantom manifests. If they find out I talked to you, I am dead."',
            choices: [
              { text: '"You are protected under Republic witness protocols. Talk to me."', morality: 8, loyalty: { republic: 10 }, requires: { item: 'csf_aux_badge' }, result: '"Three containers, Platform 09. Logged under Senate clearance codes that trace back to a sub-committee that officially does not exist. I kept a copy of the routing data."', grants: { flags: ['dax_talked', 'phantom_freight_resolved'], codex: ['codex-sector-4-freight-corridors'] } },
              { text: '"Give me the data and I will make sure your name stays out of the report."', morality: 0, loyalty: { underworld: 5 }, result: '"My name better not appear anywhere. Here." He transfers a file. "Now leave."', grants: { flags: ['dax_talked_unofficial'] } },
            ],
          },
        ],
        collectibles: [
          { id: 'freight_hub_credit', x: 24, y: 22, label: 'Dropped Pay Chip', reward: 60 },
          { id: 'stolen_spark_rig', x: 34, y: 18, label: "Jax's Calibration Rig", reward: 0, grantsItem: 'calibrated_hydrospanner' },
        ],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 38, 26, 'floor');
          carveRect(g, 15, 2, 25, 10, 'wall');
          carveRect(g, 16, 3, 24, 9, 'floor');
          carveRect(g, 30, 14, 38, 22, 'wall');
          carveRect(g, 31, 15, 37, 21, 'floor');
          pt(g, 30, 18, 'floor');
          pt(g, 20, 10, 'floor');
          carveRect(g, 37, 4, 39, 8, 'wall');
          carveRect(g, 38, 5, 38, 7, 'floor');
          pt(g, 37, 6, 'floor');
          pt(g, 20, 27, 'door'); pt(g, 21, 27, 'door');
          return g;
        },
      },
      mag_rail_corridor: {
        id: 'mag_rail_corridor', name: 'Sector 4 Mag-Rail Station', subtitle: 'Coruscant · L.088 — Freight Transit Corridor',
        width: 42, height: 26, spawnPos: { x: 20, y: 2 }, textureId: 'coruscant',
        accent: '#6090C0', accentGlow: 'rgba(96,144,192,0.22)', accentDim: '#203060',
        floorColor: '#181614', floorAlt: '#201E1A', wallDark: '#080706', wallLight: '#141210',
        bg: 'radial-gradient(circle at 50% 50%, #101420 0%, #08090E 70%)', ambient: 'traffic',
        decor: ['pipe', 'girder', 'cargo_crate', 'neon_sign'],
        doors: [
          { x: 20, y: 0, targetZone: 'freight_hub', targetPos: { x: 20, y: 26 }, label: 'Sector 4 Freight Hub' },
          { x: 21, y: 0, targetZone: 'freight_hub', targetPos: { x: 21, y: 26 }, label: 'Sector 4 Freight Hub' },
          { x: 41, y: 13, targetZone: 'fueling_depot', targetPos: { x: 1, y: 13 }, label: 'Fueling Depot' },
        ],
        worldObjects: [
          { id: 'airtaxi_mag_rail', x: 4, y: 13, once: false, label: 'AirTaxi Terminal', description: 'A CSF-maintained AirTaxi terminal serving the Sector 4 freight corridor. The departure board shows three routes. Two are suspended pending security review.' },
          { id: 'mag_rail_manifest_board', x: 20, y: 5, once: false, label: 'Cargo Manifest Display Board', description: 'A wall-mounted manifest board listing every freight car scheduled through the Sector 4 mag-rail in the current cycle. Car 14-B is listed twice — once as agricultural supplies, once as cleared industrial equipment. The two entries have different weights. The discrepancy is flagged in amber. The flag has been open for eleven days.' },
          { id: 'platform_security_scanner', x: 14, y: 13, once: true, label: 'Platform Security Scanner', description: 'A Republic-standard cargo scanner mounted at the platform gate. The scan log shows that three freight cars in the past month were cleared without completing a full scan cycle. Each clearance was manually authorized. The authorization code is the same each time — a Senate-tier override that should not exist at this checkpoint level.', grantsFlag: 'scanner_override_found' },
          { id: 'north_platform_terminal', x: 8, y: 7, once: false, label: 'North Platform Freight Terminal', description: 'The loading terminal for the north bay platforms. Consignment records go back fourteen months. The system shows no gap in the record sequence — but three consignment numbers have been reused. Reused consignment numbers overwrite the original entry. Whatever moved through those numbers the first time has been erased.' },
          { id: 'east_cargo_bay_locker', x: 34, y: 7, once: true, label: 'Sealed Cargo Bay Locker', description: 'A standard freight locker with a non-standard lock — the override code is a military-issue cipher, not a Republic transit cipher. Inside: three manifest strips printed on thermal flimsi, each listing the same destination account. The account number matches the shell corporation routing from the Scylla manifest.', grantsFlag: 'freight_chain_confirmed', grantsCodex: 'codex-sector-4-freight-corridors' },
          { id: 'south_platform_crate_stack', x: 8, y: 19, once: false, label: 'Numbered Cargo Stack — Platform South', description: 'Forty-eight standardized gray containers stacked three high on the south loading platform. Each bears a Senate commerce committee seal. Each seal is from a different committee session. The committees do not overlap in their stated jurisdictions. What they all share: a signature from the same undersecretary, on the same date, for cargoes described as "legislative materials."' },
          { id: 'rail_junction_box', x: 26, y: 19, once: true, label: 'Rail Junction Control Box', description: 'The mag-rail switching junction for the Sector 4 corridor. The switching schedule shows a recurring twelve-minute hold every fourth cycle — the rail is stopped, the platform cameras are on maintenance loop, and no personnel are scheduled. The hold began eight months ago. It runs like clockwork. Nothing in the official record explains it.', grantsFlag: 'rail_window_found' },
          { id: 'pursuit_start', x: 34, y: 19, once: true, label: 'Emergency Speeder Bay', description: 'A single repulsor speeder, engine warm, tethered to a quick-release bay mount. A Syndicate courier was spotted boarding the mag-rail three minutes ago heading for The Works. This speeder can intercept if you move now. The rail corridor is active.', triggersMinigame: 'speeder_pursuit', grantsFlag: 'chase_resolved' },
        ],
        npcs: [
          { id: 'checkpoint_officer_drel', x: 20, y: 13, kind: 'republic_guard', label: 'Checkpoint Officer Drel',
            prompt: '"Transit checkpoint, Sector 4 corridor. State your business and present your transit documentation."',
            repeatPrompt: 'Officer Drel watches the cargo flow with the practiced attention of someone who has learned to see what he is allowed to see and nothing else.',
            choices: [
              { text: '"CSF Auxiliary. I need access to the cargo scan logs."', morality: 8, loyalty: { republic: 8 }, requires: { item: 'csf_aux_pass' }, result: '"Auxiliary clearance. Noted." He steps aside from the terminal. "The logs are current. The anomalies in them are not my jurisdiction. That is what I have been told. Officially." He does not look at you when he says it.', grants: { flags: ['drel_cooperated'] } },
              { text: '"What is the standard protocol when a Senate override clears cargo without a full scan?"', morality: 5, loyalty: { republic: 5 }, result: '"The standard protocol is to log the override and file a query with the Senate transit authority. Processing time on those queries is eight to twelve weeks. In eight months I have filed twenty-two queries. I have received zero responses." He picks up his datapad. "Standard protocol."', grants: { flags: ['drel_queried'] } },
              { text: '"What moves through here at the twelve-minute rail hold?"', morality: -3, loyalty: { underworld: 8 }, result: '"I do not work that shift. Neither does anyone else. That is the point." He lowers his voice. "Whatever moves in those twelve minutes has full Senate clearance and leaves no scan record. That is all I can tell you without losing this job."', grants: { flags: ['rail_hold_confirmed'] } },
            ],
          },
          { id: 'cargo_runner_essa', x: 8, y: 18, kind: 'smuggler', label: 'Essa — Cargo Runner', mobile: true,
            prompt: '"You have that look. CSF adjacent. Not quite official. Working an angle." She props a crate with her shoulder and keeps her hands visible. "I am just moving freight. Legitimate freight. Certified and sealed."',
            repeatPrompt: 'Essa moves between crates with the efficiency of someone who knows exactly where the cameras are.',
            choices: [
              { text: '"What do you know about the twelve-minute rail hold?"', morality: -5, loyalty: { underworld: 10 }, result: '"Who told you about that?" She sets down the crate. "That hold is Syndicate time. Nobody uses those twelve minutes who is not paying the Syndicate for them. I know because I used to be on that schedule. I left. Some opportunities are not worth the company."', grants: { flags: ['essa_talked', 'syndicate_rail_confirmed'] } },
              { text: '"I am looking for where the Phrik shipment went after Bay 14."', morality: 0, loyalty: {}, result: '"The Works. Level 005. That is not a secret. What is a secret is how it got there without crossing a single checkpoint. Rail hold. Sealed car. Nobody asked questions because nobody who asks questions lasts long in this corridor."', grants: { flags: ['essa_phrik_route'] } },
              { text: '"Move some of my cargo. Off the record."', morality: -10, loyalty: { underworld: 8 }, result: '"How much? What kind? Where?" She is already doing the math. "If it is anything that glows, I charge double." ', grants: { flags: ['essa_contracted'] } },
            ],
          },
        ],
        collectibles: [{ id: 'mag_rail_chip', x: 36, y: 19, label: 'Freight Transit Chip', reward: 40 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 40, 24, 'floor');
          carveRect(g, 1, 3, 14, 12, 'wall');
          carveRect(g, 2, 4, 13, 11, 'floor');
          pt(g, 14, 7, 'floor');
          carveRect(g, 1, 15, 14, 23, 'wall');
          carveRect(g, 2, 16, 13, 22, 'floor');
          pt(g, 14, 19, 'floor');
          carveRect(g, 26, 3, 40, 12, 'wall');
          carveRect(g, 27, 4, 39, 11, 'floor');
          pt(g, 26, 7, 'floor');
          pt(g, 20, 0, 'door'); pt(g, 21, 0, 'door');
          pt(g, 41, 13, 'door');
          return g;
        },
      },
      fueling_depot: {
        id: 'fueling_depot', name: 'Sector 4 Fueling Depot', subtitle: 'Coruscant · L.088 — Repulsor Fueling Station',
        width: 38, height: 26, spawnPos: { x: 2, y: 13 }, textureId: 'coruscant',
        accent: '#D06000', accentGlow: 'rgba(208,96,0,0.22)', accentDim: '#602800',
        floorColor: '#161210', floorAlt: '#1E1814', wallDark: '#060402', wallLight: '#120E08',
        bg: 'radial-gradient(circle at 30% 70%, #160C04 0%, #080604 70%)', ambient: 'embers',
        decor: ['pipe', 'cargo_crate', 'slag', 'girder'],
        doors: [
          { x: 0, y: 13, targetZone: 'mag_rail_corridor', targetPos: { x: 40, y: 13 }, label: 'Mag-Rail Corridor' },
          { x: 18, y: 25, targetZone: 'drainage_pipes', targetPos: { x: 18, y: 1 }, label: 'Lower Drainage' },
          { x: 19, y: 25, targetZone: 'drainage_pipes', targetPos: { x: 19, y: 1 }, label: 'Lower Drainage' },
        ],
        worldObjects: [
          { id: 'airtaxi_fueling_depot', x: 16, y: 13, once: false, label: 'AirTaxi Terminal', description: 'A weather-beaten AirTaxi terminal on the depot concourse. The routing display is covered in fuel-transfer grime but functional.' },
          { id: 'fuel_register_terminal', x: 6, y: 6, once: true, label: 'Fuel Transfer Register', description: 'The bay fuel accounting terminal. Cross-referencing usage logs against departure manifests reveals a forty-liter discrepancy per cycle — consistent for six months. The fuel is not being logged as waste. It is not being logged at all. Forty liters per cycle is enough to run a mid-size repulsor platform continuously for eighteen hours.', grantsFlag: 'fuel_discrepancy_found' },
          { id: 'bay_b_work_order', x: 26, y: 6, once: true, label: 'Bay B Work Order Clipboard', description: 'A physical clipboard of maintenance work orders. The third sheet from the bottom is printed on different flimsi from the rest — thicker, higher grade, the kind used for official Senate documents. The work order it describes is routine repulsor servicing. The authorization signature at the bottom is not a depot supervisor. It is a Senate sub-committee seal. A fueling depot work order, sealed by the Senate.', grantsFlag: 'bay_b_order_found' },
          { id: 'maintenance_pit_console', x: 8, y: 19, once: true, label: 'Maintenance Pit Access Console', description: 'The control console for the below-deck maintenance pit. The activity log shows seventeen access events in the past two months. Each entry lists the same user ID: TEMP-TRANSIT. Temp transit IDs are issued for single-use clearance and expire in four hours. These ones were all used on the same day, at the same time, for the same access — which should be impossible for single-use IDs.', grantsFlag: 'temp_id_exploit_found' },
          { id: 'fuel_drum_stack', x: 28, y: 19, once: false, label: 'Repulsor Fuel Drum Array', description: 'Fifty sealed drums of Type-4 repulsor fuel stacked in the depot\'s overflow area. Each drum is stamped with a Republic Military supply chain code — civilian depots are not authorized to hold military-grade fuel. The authorization exemption on the stack is signed by the same Senate sub-committee that cleared the Bay 14 cargo.' },
        ],
        npcs: [
          { id: 'depot_mechanic_torb', x: 6, y: 5, kind: 'mechanic', label: 'Fuel Tech Torb',
            prompt: '"Keep clear of the active bays. Republic safety code requires a three-meter buffer during pressurized transfer. Also, who are you and how did you get past the corridor checkpoint?"',
            repeatPrompt: 'Torb works with the deliberate precision of someone who has seen what fuel fires look like up close.',
            choices: [
              { text: '"CSF Auxiliary. I am investigating a fuel accounting discrepancy."', morality: 8, loyalty: { republic: 8 }, requires: { item: 'csf_aux_pass' }, result: '"The register." He exhales. "I flagged that four months ago. Submitted the form to the depot supervisor. She submitted it to the freight authority. They submitted it to the Senate transit liaison. I stopped hearing about it two days later. The form number I submitted? It no longer exists in the system."', grants: { flags: ['torb_talked', 'fuel_flag_buried'] } },
              { text: '"What is stored in Bay B?"', morality: 0, loyalty: {}, result: '"Military-grade Type-4. We are not supposed to have it. We have had it for six months. I asked about it once. I was reassigned to night shift the next day. I stopped asking."', grants: { flags: ['bay_b_military_fuel'] } },
              { text: '"Is there a way down to the lower drainage level from here?"', morality: -3, loyalty: { underworld: 5 }, result: '"The south hatch past the maintenance pit. I would not go down there. The drainage runs directly under the fuel storage array. One bad coupling and the whole sub-level goes." He pauses. "People go down anyway."', grants: { flags: ['drainage_access_known'] } },
            ],
          },
          { id: 'smuggler_contact_voss', x: 28, y: 6, kind: 'smuggler', label: 'Voss — Depot Contact',
            prompt: '"You are in the wrong bay. Unless you are looking for me. In which case: how did you know to look here, and who sent you?"',
            repeatPrompt: 'Voss watches you with professional patience. He has more information than he is showing.',
            choices: [
              { text: '"Essa from the mag-rail corridor pointed me this way."', morality: -5, loyalty: { underworld: 10 }, requires: { flag: 'essa_talked' }, result: '"Essa. She is careful about who she sends." He relaxes a fraction. "Then you already know the shape of the operation. The fuel discrepancy, the Senate work orders, the Syndicate rail window. You are putting it together. Good. Someone should."', grants: { flags: ['voss_depot_talked', '088_operation_shape_known'] } },
              { text: '"I need a route to Level 005 that does not cross a checkpoint."', morality: -10, loyalty: { underworld: 12 }, result: '"The drainage hatch. South of the maintenance pit. Follow the main channel east until you hit the ventilation junction. Left at the junction, down the service ladder, and you are on Level 005. Do not touch the walls — the drainage carries thermal runoff from the level above. Hot enough to burn through a boot."', grants: { flags: ['drainage_route_to_005'] } },
              { text: '"What does the Iron Syndicate use this depot for?"', morality: 0, loyalty: {}, result: '"Staging. The Syndicate does not store cargo here. They move it. This is a transit point — cargo in from the mag-rail, transferred to vehicles here, down through the drainage to Level 005. The fuel discrepancy covers the vehicle fuel. Everything else is on paper that is officially perfect."', grants: { flags: ['voss_syndicate_explained'], codex: ['codex-iron-syndicate'] } },
            ],
          },
        ],
        collectibles: [{ id: 'depot_cred', x: 32, y: 22, label: 'Dropped Fuel Chit', reward: 55 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 36, 24, 'floor');
          carveRect(g, 1, 2, 12, 11, 'wall');
          carveRect(g, 2, 3, 11, 10, 'floor');
          pt(g, 12, 6, 'floor');
          carveRect(g, 22, 2, 36, 11, 'wall');
          carveRect(g, 23, 3, 35, 10, 'floor');
          pt(g, 22, 6, 'floor');
          carveRect(g, 2, 15, 14, 23, 'wall');
          carveRect(g, 3, 16, 13, 22, 'floor');
          pt(g, 14, 19, 'floor');
          pt(g, 0, 13, 'door');
          pt(g, 18, 25, 'door'); pt(g, 19, 25, 'door');
          return g;
        },
      },
      drainage_pipes: {
        id: 'drainage_pipes', name: 'Sector 4 Lower Drainage', subtitle: 'Coruscant · L.088 — Sub-Level Maintenance Tunnels',
        width: 36, height: 22, spawnPos: { x: 18, y: 2 }, textureId: 'coruscant',
        accent: '#208040', accentGlow: 'rgba(32,128,64,0.20)', accentDim: '#0C3020',
        floorColor: '#0E100C', floorAlt: '#161A12', wallDark: '#040602', wallLight: '#0C0E08',
        bg: 'radial-gradient(circle at 50% 100%, #0C1408 0%, #060A04 50%, #030502 100%)',
        ambient: 'embers', decor: ['pipe', 'slag', 'rubble'],
        doors: [
          { x: 18, y: 0, targetZone: 'fueling_depot', targetPos: { x: 18, y: 24 }, label: 'Fueling Depot' },
          { x: 19, y: 0, targetZone: 'fueling_depot', targetPos: { x: 19, y: 24 }, label: 'Fueling Depot' },
        ],
        worldObjects: [
          { id: 'airtaxi_drainage', x: 2, y: 11, once: false, label: 'AirTaxi Terminal', description: 'An ancient AirTaxi terminal grafted onto the drainage tunnel wall. It should not work. It does. The destination list shows zones that are no longer accessible from any other terminal.' },
          { id: 'drainage_channel_main', x: 14, y: 11, once: false, label: 'Main Drainage Channel', description: 'A wide channel cut through the durasteel floor carries thermal runoff from the fueling depot above. The liquid moves slowly, hot enough to steam in the cold tunnel air. The color is the pale amber of industrial lubricant mixed with coolant fluid. Whatever process generates this much waste runs continuously. The channel is not on any Level 088 maintenance map.' },
          { id: 'syndicate_cache_drainage', x: 6, y: 7, once: true, label: 'Maintenance Alcove Cache', description: 'Behind a false panel in the maintenance alcove wall: a sealed container marked with the iron chain emblem. Inside, three cargo relay chips — each one a transit authorization for a different Level 005 loading dock. Each authorization is blank, ready to be written with any cargo description. A full set of ready-made blank transit passes for The Works.', grantsFlag: 'transit_pass_cache_found', grantsItem: 'scrambler_keycard' },
          { id: 'drainage_graffiti_wall', x: 24, y: 7, once: false, label: 'Drainage Tunnel Wall', description: 'The tunnel wall is layered with markings going back decades — maintenance crew tallies, territorial tags from three different gang factions, one very detailed Aurebesh map of the drainage system drawn in conductive paint that still faintly glows. The Iron Syndicate\'s iron chain emblem appears four times, each one over a different gang\'s markings. The Syndicate has been here longer than anyone admits.' },
          { id: 'junction_box_drainage', x: 28, y: 16, once: true, label: 'Ventilation Junction Control', description: 'The junction control box for the Level 088 ventilation spine. The routing table inside has been modified — Level 005 airflow is being vented up through this drainage system instead of out through the designated exhaust ports. The modification is deliberate. Someone is using the drainage vents to circulate air to Level 005 workers without triggering environmental monitoring on that level.', grantsFlag: 'vent_route_005_found' },
          { id: 'syndicate_marker_drainage', x: 32, y: 18, once: true, label: 'Recent Syndicate Transit Mark', description: 'A fresh iron chain emblem stamp on the tunnel floor — the mark is crisp, the metal around it bright. This route was used within the last forty-eight hours. The cargo moved east along the main channel, turned south at the junction, and went down. Toward Level 005.', grantsFlag: 'fresh_syndicate_trail' },
        ],
        npcs: [
          { id: 'fugitive_mek', x: 30, y: 17, kind: 'mechanic', label: 'Mek — Level 005 Fugitive',
            prompt: 'He is pressed into a maintenance alcove, coated in drainage grime, and holding a broken hydrospanner like a weapon. "Stay back. I know what you are. Syndicate does not send two." He squints. "You are not dressed like Syndicate."',
            repeatPrompt: 'Mek keeps one eye on the tunnel behind you. He has not decided whether staying here is worse than moving.',
            choices: [
              { text: '"I am not Syndicate. I am investigating them. What do you know?"', morality: 5, loyalty: { republic: 5 }, result: '"Investigating." He laughs, one short sound. "Good luck with that. I worked their Level 005 loading operation for four months before I realized what I was loading. When I tried to stop, they sealed the level. I got out through the drainage. I have been here for six days."', grants: { flags: ['mek_met', 'mek_escaped_005'] } },
              { text: '"Tell me the layout of the Level 005 loading operation."', morality: 0, loyalty: {}, result: '"Three main bays. Two are Phrik processing — they are smelting it into armor plating. The third is assembly. They are not building weapons. They are building people. Combat exoskeletons. Phrik-plated. Something that can walk through a blaster wall and not stop." He swallows. "I helped build six of them before I understood what they were."', grants: { flags: ['mek_005_layout', 'syndicate_exoskeleton_known'] } },
              { text: '"I can get you out of the drainage. But you tell me everything first."', morality: 8, loyalty: { republic: 8 }, result: '"Everything. Fine." Over the next twenty minutes, he gives you names, delivery schedules, cargo codes, and the location of every Syndicate guard post on Level 005. "Now get me out of here before the next transit cycle comes through."', grants: { flags: ['mek_full_intel', 'works_layout_known'], codex: ['codex-the-works-forges'] } },
            ],
          },
        ],
        collectibles: [{ id: 'drainage_cred', x: 14, y: 18, label: 'Waterlogged Credit Chip', reward: 70 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 34, 20, 'floor');
          carveRect(g, 1, 3, 10, 10, 'wall');
          carveRect(g, 2, 4, 9, 9, 'floor');
          pt(g, 10, 6, 'floor');
          carveRect(g, 20, 3, 34, 10, 'wall');
          carveRect(g, 21, 4, 33, 9, 'floor');
          pt(g, 20, 6, 'floor');
          carveRect(g, 22, 13, 34, 20, 'wall');
          carveRect(g, 23, 14, 33, 19, 'floor');
          pt(g, 22, 16, 'floor');
          carveRect(g, 12, 10, 16, 14, 'water');
          pt(g, 18, 0, 'door'); pt(g, 19, 0, 'door');
          return g;
        },
      },
      the_works: {
        id: 'the_works', name: 'The Works', subtitle: 'Coruscant · Undercity · The Works L.005',
        width: 36, height: 24, spawnPos: { x: 2, y: 12 }, textureId: 'coruscant',
        accent: '#FF4444', accentGlow: 'rgba(255,68,68,0.2)', accentDim: '#660000',
        floorColor: '#14100A', floorAlt: '#1C160E', wallDark: '#060402', wallLight: '#100C06',
        bg: 'radial-gradient(circle at 50% 80%, #140800 0%, #050302 70%)', ambient: 'steam',
        decor: ['pipe', 'girder', 'slag', 'rubble', 'warning_beacon', 'brazier'],
        doors: [
          { x: 20, y: 23, targetZone: 'cooling_ducts', targetPos: { x: 20, y: 1 }, label: 'Cooling Ducts' },
          { x: 21, y: 23, targetZone: 'cooling_ducts', targetPos: { x: 21, y: 1 }, label: 'Cooling Ducts' },
        ],
        worldObjects: [
          { id: 'syndicate_cargo_cache', x: 18, y: 10, once: true, label: 'Syndicate Cargo Cache', description: 'Stacked crates stamped with a stylised iron chain. Inside: Phrik plating cut to pauldron dimensions, half-assembled combat chassis, and one empty Jedi archive canister. Someone opened it already.' },
          { id: 'plasma_conduit_005', x: 8, y: 18, once: false, label: 'Leaking Plasma Conduit', description: 'The pipe groans under pressure. A slow leak fills the air with acrid chemical haze. This entire sub-level is one spark away from a chain event.' },
          { id: 'sub_station_terminal', x: 10, y: 20, once: true, label: 'Deep Sub-Station Controls', description: 'Power sub-station 3. Slicing this terminal disables ambient thermal hazards in the surrounding corridor.', grantsItem: null },
          { id: 'syndicate_relay_node', x: 24, y: 6, once: true, label: 'Syndicate Relay Node', description: 'Iron Syndicate tactical communications. Slicing this intercepts live patrol data — every enemy position in The Works becomes visible on your minimap for the duration of the assault.' },
          { id: 'plasma_valve_a', x: 4, y: 18, once: true, label: 'Pressure Valve Alpha', description: 'Main coolant line junction. The pressure gauge reads critical. One override and the flow stabilizes.', triggersMinigame: 'valve_override', grantsFlag: 'valve_a_closed' },
          { id: 'plasma_valve_b', x: 14, y: 20, once: true, label: 'Pressure Valve Beta', description: 'Secondary coolant junction. Steam vents from the seal around the handle.', triggersMinigame: 'valve_override', grantsFlag: 'valve_b_closed' },
          { id: 'plasma_valve_c', x: 8, y: 14, once: true, label: 'Pressure Valve Gamma', description: 'Tertiary coolant junction. Closing this one stabilizes the entire pressure network.', triggersMinigame: 'valve_override', grantsFlag: 'valve_c_closed' },
          { id: 'krell_vendor', x: 28, y: 20, once: false, label: 'Krell — Black Market Arms', description: '"The Republic does not come down this far. My blasters hit harder, run hotter, and do not leave serial numbers." Sells: Spice Vial, Plasma Core Overcharger, Environmental Filter.' },
          { id: 'holonet_official_terminal', x: 30, y: 20, once: false, label: 'HNN Official Feed', description: '[HNN Priority Core Broadcast] "The Senate Committee on Inner-Rim Trade commended the CSF for maintaining unprecedented safety standards across the Mid-Levels. Reports of industrial smuggling near Level 088 have been dismissed as isolated logistical delays." The broadcast loops. The terminal is covered in soot.' },
          { id: 'airtaxi_the_works', x: 34, y: 12, once: false, label: 'AirTaxi Terminal', description: 'A terminal barely functioning under the heat. Miracle it still works.' },
        ],
        npcs: [
          { id: 'vex', x: 22, y: 7, kind: 'crime_boss', label: 'Vex',
            repeatPrompt: 'Vex watches you from the shadows. His enforcers track your movement.',
            prompt: '"I do not know how you got this deep. I know you will not be leaving the same way." He signals two enforcers. Then pauses. "Unless you have something worth my time."',
            choices: [
              { text: 'Reveal that you know about the Phrik armor project.', morality: -10, loyalty: { underworld: 15 }, result: '"Interesting. You have done your homework. The Iron Syndicate builds to last. We are not selling. We are equipping. The question is: which side of that equation do you want to be on?"', grants: { flags: ['vex_met', 'iron_syndicate_known'], codex: ['codex-iron-syndicate'] } },
              { text: '"I am here to stop whatever you are building."', morality: 18, loyalty: { republic: 15 }, result: '"Bold." He gestures. The enforcers advance. "Bring me their comlink when you are done." [Combat placeholder — dialogue resolves with escape and flag]', grants: { flags: ['vex_hostile', 'iron_syndicate_known'] } },
            ],
          },
          { id: 'unit_7n4', x: 4, y: 5, kind: 'droid', label: 'Archivist Droid 7-N4',
            repeatPrompt: '7-N4 resumes archiving temperature data. Progress: 94.7 percent.',
            prompt: '"ARCHIVE ACCESS: corrupted. MEMORY CORE: partially functional. I was left behind when the warehouse was abandoned. QUERY: do you require ambient temperature data?"',
            choices: [
              { text: 'Give it the Sith Memory Prism. "Can you decrypt this?"', morality: 0, loyalty: {}, requires: { item: 'encrypted_shard' }, result: '"DECRYPTION: initiating. This is a Sith-era holocron shard. The content describes a weapon design — specifically, a melee platform armored in Phrik that resists both blaster and lightsaber damage. The Iron Syndicate intends to mass-produce this design. ARCHIVE ENTRY CREATED."', grants: { flags: ['shard_decrypted', 'syndicate_weapon_known'], codex: ['codex-iron-syndicate', 'codex-phrik-alloy'] } },
              { text: 'Ask it what was stored here before the Iron Syndicate arrived.', morality: 5, loyalty: {}, result: '"This facility last logged Republic military materiel eighteen months ago. Current occupants arrived nine months ago with Phrik alloy and Jedi archive canisters. ASSESSMENT: occupation is unauthorized. CONCERN LEVEL: high."', grants: { codex: ['codex-docking-bay-14'] } },
            ],
          },
          { id: 'sula_anvil', x: 20, y: 18, kind: 'mechanic', label: 'Sula "The Anvil"',
            repeatPrompt: 'Sula is hammering a cooling piece of alloy. She does not stop when you speak.',
            prompt: '"Phrik is not just metal, officer. It is the bones of the galaxy. The Syndicate thinks they can melt it down with cheap thermal charges to build dirty bombs? It is an insult to the craft."',
            choices: [
              { text: '"Can Phrik alloy be stabilized if it is already exposed to plasma heat?"', morality: 5, loyalty: {}, result: '"Not without cryogenic cooling. If they heat that core past three thousand degrees, it is not a shipment anymore — it is a critical melt." She pulls up a schematic. "The emergency coolant valves are in the lower sub-station. Use them before the Syndicate ignites the crucible."', grants: { flags: ['sula_informed', 'coolant_method_known'] } },
              { text: '"Join us. Help CSF shut down the Syndicate\'s crucible for good."', morality: 8, loyalty: { republic: 8 }, result: '"I do not care about your politics. But I will not let them ruin my foundry. Give me droid cover for my back and I will cut their power lines myself."', grants: { flags: ['sula_allied'] } },
            ],
          },
          { id: 'kaelen_twi', x: 6, y: 20, kind: 'smuggler', label: '"The Ghost" Kaelen',
            repeatPrompt: 'Kaelen is crouched behind a burned power cell stack, watching both exits.',
            prompt: '"Do not shoot! I am just wiping terminal logs! The Syndicate took my sister. They said if I did not override the security grid for Docking Bay 14, they would throw her into the thermal vents!"',
            choices: [
              { text: '"You aided an armed attack on a CSF perimeter. Come with me."', morality: 3, loyalty: { republic: 10 }, result: '"No! You do not understand — the Syndicate owns the precinct holding cells! I will not last an hour!" His cybernetic optic flickers in genuine fear.', grants: { flags: ['kaelen_twi_arrested'] } },
              { text: '"Tell me where your sister is. If I save her, you hand over every encryption key you have."', morality: 8, loyalty: { republic: 8 }, result: '"They are keeping her in Sub-Level 3 holding cells! Save her, and I will slice the main door to the Senate transit line for you!"', grants: { flags: ['kaelen_twi_deal', 'sub_level_extraction_available'] } },
            ],
          },
          { id: 'marla_foreman', x: 8, y: 20, kind: 'cantina_owner', label: 'Marla — Sub-Level Foreman',
            repeatPrompt: 'Marla is directing workers away from the venting steam. She looks exhausted.',
            prompt: '"Keep your filters tight today. The Syndicate is running the smelters at maximum. There is a pressure valve venting into the residential catwalks — if it ruptures, we lose thirty families."',
            choices: [
              { text: '"Point me to the main pressure valves. I will shut them down."', morality: 12, loyalty: { republic: 10 }, result: '"Sub-smelting level, three valves in sequence. The maintenance droids down there have gone rogue — watch yourself."', grants: { flags: ['thermal_leak_active'] } },
              { text: '"I have got bigger problems than a pipe valve."', morality: -5, loyalty: {}, result: 'She stares at you. "The people living on those catwalks do not."' },
            ],
          },
        ],
        collectibles: [{ id: 'works_syndicate_token', x: 12, y: 20, label: 'Iron Syndicate Token', reward: 0 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 34, 22, 'floor');
          carveRect(g, 10, 6, 14, 6, 'lava');
          carveRect(g, 20, 14, 24, 14, 'lava');
          carveRect(g, 28, 4, 28, 18, 'lava');
          carveRect(g, 15, 2, 27, 12, 'wall');
          carveRect(g, 16, 3, 26, 11, 'floor');
          carveRect(g, 2, 2, 8, 8, 'wall');
          carveRect(g, 3, 3, 7, 7, 'floor');
          pt(g, 5, 8, 'floor');
          pt(g, 15, 7, 'floor');
          pt(g, 20, 23, 'door'); pt(g, 21, 23, 'door');
          return g;
        },
      },
      cooling_ducts: {
        id: 'cooling_ducts', name: 'Cooling Ducts', subtitle: 'Coruscant · Undercity · L.005 Cooling Infrastructure',
        width: 36, height: 26, spawnPos: { x: 20, y: 2 }, textureId: 'coruscant',
        accent: '#40B8C0', accentGlow: 'rgba(64,184,192,0.2)', accentDim: '#1A5860',
        floorColor: '#0E1416', floorAlt: '#141C1E', wallDark: '#040608', wallLight: '#0C1214',
        bg: 'radial-gradient(circle at 50% 40%, #081214 0%, #040608 70%)', ambient: 'embers',
        decor: ['pipe', 'girder', 'slag'],
        doors: [
          { x: 20, y: 0, targetZone: 'the_works', targetPos: { x: 20, y: 22 }, label: 'The Works' },
          { x: 21, y: 0, targetZone: 'the_works', targetPos: { x: 21, y: 22 }, label: 'The Works' },
          { x: 35, y: 13, targetZone: 'syndicate_command', targetPos: { x: 1, y: 13 }, label: 'Syndicate Command' },
        ],
        worldObjects: [
          { id: 'airtaxi_cooling_ducts', x: 2, y: 13, label: 'AirTaxi Terminal', description: 'A terminal barely functional in the thermal haze. Emergency transit only.' },
          { id: 'coolant_manifold', x: 10, y: 13, label: 'Coolant Manifold Junction', description: 'Superchilled gas hisses through cracked seals. The flow rate is wrong — someone has been bleeding coolant toward the smelter cores.' },
          { id: 'duct_access_panel', x: 20, y: 18, once: true, label: 'Duct Access Panel', description: 'A maintenance crawl route into the syndicate warehouse. Wide enough for a person. The hinges are freshly oiled.', grantsFlag: 'duct_route_found' },
          { id: 'frost_buildup_terminal', x: 6, y: 5, once: true, label: 'Frost-Coated Terminal', description: 'Temperature logs. The cooling system was deliberately throttled twelve days ago — precisely when the Iron Syndicate began the final stage of their armor production run.', grantsFlag: 'coolant_sabotage_confirmed', grantsCodex: 'codex-the-works-forges' },
          { id: 'watcher_post', x: 26, y: 5, once: false, label: 'Observation Post', description: 'A crude sentry position overlooking the main duct junction. Scorch marks from a blaster. Someone held this position against something — or someone — coming from the south.' },
        ],
        npcs: [
          { id: 'cooling_tech_ardis', x: 6, y: 7, kind: 'mechanic', label: 'Maintenance Tech Ardis',
            prompt: '"The cooling systems are failing and nobody topside cares. If the thermal regulation collapses, the entire sub-level vaporizes. I cannot fix this alone."',
            repeatPrompt: 'Ardis is rerouting coolant lines with improvised patches. The work is never done.',
            choices: [
              { text: '"Tell me what you know about the Iron Syndicate using this duct system."', morality: 5, loyalty: { republic: 8 }, result: '"They come through at second shift — always the same route, always twelve of them. They carry plating. Combat weight. Whoever they are building it for, it is not a sport."', grants: { flags: ['duct_syndicate_observed'] } },
              { text: '"I will help stabilize the cooling flow. Point me to the valves."', morality: 10, loyalty: { republic: 5 }, result: '"The three main junctions are at sub-level four. I have a bypass rig but I cannot hold the pressure alone. If you can reach the east manifold, I can lock the rest."', grants: { flags: ['ardis_allied'] } },
            ],
          },
          { id: 'syndicate_watcher_kael', x: 28, y: 7, kind: 'swoop_gang', label: 'Syndicate Watcher', mobile: true,
            prompt: '"You are not supposed to be down here. Nobody is supposed to be down here."',
            repeatPrompt: 'The watcher tracks your movement with cold professional attention.',
            choices: [
              { text: '"I am maintenance crew. Checking the thermal seals."', morality: -5, loyalty: { underworld: 5 }, result: '"Maintenance does not wear that look. Move along before I file a report."', grants: { flags: ['watcher_bluffed'] } },
              { text: '"Stand down. CSF Auxiliary. Step away from the post."', morality: 8, loyalty: { republic: 10 }, result: 'He backs up two steps, hand near his weapon. He does not reach for it. "You have thirty seconds to get out of here before my relief arrives."', grants: { flags: ['watcher_backed_down'] } },
            ],
          },
        ],
        collectibles: [{ id: 'cooling_chip', x: 30, y: 20, label: 'Cryo-Canister Valve Cap', reward: 50 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 34, 24, 'floor');
          carveRect(g, 1, 3, 10, 12, 'wall');
          carveRect(g, 2, 4, 9, 11, 'floor');
          pt(g, 5, 3, 'floor');
          carveRect(g, 22, 3, 34, 12, 'wall');
          carveRect(g, 23, 4, 33, 11, 'floor');
          pt(g, 28, 3, 'floor');
          carveRect(g, 12, 5, 12, 20, 'water');
          carveRect(g, 20, 8, 20, 22, 'water');
          pt(g, 20, 0, 'door'); pt(g, 21, 0, 'door');
          pt(g, 35, 13, 'door');
          return g;
        },
      },
      syndicate_command: {
        id: 'syndicate_command', name: 'Syndicate Command', subtitle: 'Coruscant · Undercity · Iron Syndicate Operations Hub',
        width: 38, height: 26, spawnPos: { x: 2, y: 13 }, textureId: 'coruscant',
        accent: '#C03030', accentGlow: 'rgba(192,48,48,0.2)', accentDim: '#601010',
        floorColor: '#120A08', floorAlt: '#1A100E', wallDark: '#060202', wallLight: '#0E0806',
        bg: 'radial-gradient(circle at 40% 60%, #160804 0%, #060202 70%)', ambient: 'embers',
        decor: ['pipe', 'girder', 'slag', 'rubble'],
        doors: [
          { x: 0, y: 13, targetZone: 'cooling_ducts', targetPos: { x: 34, y: 13 }, label: 'Cooling Ducts' },
          { x: 18, y: 25, targetZone: 'extraction_vault', targetPos: { x: 18, y: 1 }, label: 'Extraction Vault' },
          { x: 19, y: 25, targetZone: 'extraction_vault', targetPos: { x: 19, y: 1 }, label: 'Extraction Vault' },
        ],
        worldObjects: [
          { id: 'airtaxi_syndicate_command', x: 2, y: 13, label: 'AirTaxi Terminal', description: 'Syndicate-rigged transit terminal. The departure codes are wrong — it still works.' },
          { id: 'command_data_terminal', x: 7, y: 5, once: true, label: 'Iron Syndicate Command Terminal', description: 'Active. Unencrypted. The Syndicate was confident nobody would reach this level. Shipping manifests, crew rotations, and one file simply labeled EXTRACTION TIMETABLE.', grantsFlag: 'syndicate_plans_found', grantsCodex: 'codex-iron-syndicate' },
          { id: 'armory_rack', x: 28, y: 18, once: true, label: 'Syndicate Armory Rack', description: 'Phrik-composite pauldrons. Six sets, each sized for Republic-standard troopers. The Syndicate is not planning to sell this armor — they are equipping their own people to look like Republic soldiers.', grantsFlag: 'armor_ruse_discovered' },
          { id: 'comm_relay_hub', x: 18, y: 13, once: false, label: 'Encrypted Comm Relay', description: 'Burst-transmitting on a Senate sub-frequency. The source is Level 1900. Someone very senior is listening to every operation report from this room.' },
        ],
        npcs: [
          { id: 'syndicate_lt_braeven', x: 7, y: 7, kind: 'crime_boss', label: 'Lt. Braeven — Iron Syndicate',
            prompt: '"You survived the cooling ducts. That is either impressive or a problem. I have not decided." He does not move for his weapon. A subordinate does that for him.',
            repeatPrompt: 'Braeven has retreated to the back of the command room. His subordinates watch the door.',
            choices: [
              { text: '"Stand down. I know about the armor ruse. I know about the Senate contact. This ends here."', morality: 10, loyalty: { republic: 15 }, result: '"You know what you were allowed to know. The armor production is already complete. The extraction is already scheduled. You are three hours too late, officer."', grants: { flags: ['braeven_confronted', 'extraction_timetable_known'] } },
              { text: '"I want in. The Senate contact, the armor, the full operation. Name your price."', morality: -15, loyalty: { underworld: 20 }, result: 'A long pause. "You have nerve. That is either rare or a trap. The vault below holds the final shipment. If you get it out without CSF interference, we split forty percent." He means it.', grants: { flags: ['braeven_deal', 'extraction_timetable_known'] } },
              { text: '"Tell me where the prisoners are being held."', morality: 8, loyalty: { republic: 8 }, result: '"Prisoners? We do not keep prisoners. We keep leverage." He gestures south. "The vault. But you will not like what you find there."', grants: { flags: ['vault_location_confirmed'] } },
            ],
          },
        ],
        collectibles: [{ id: 'syndicate_command_chip', x: 32, y: 6, label: 'Iron Syndicate Access Chip', reward: 0 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 36, 24, 'floor');
          carveRect(g, 1, 2, 14, 12, 'wall');
          carveRect(g, 2, 3, 13, 11, 'floor');
          pt(g, 7, 2, 'floor');
          carveRect(g, 22, 14, 36, 24, 'wall');
          carveRect(g, 23, 15, 35, 23, 'floor');
          pt(g, 28, 14, 'floor');
          carveRect(g, 18, 4, 18, 20, 'lava');
          pt(g, 0, 13, 'door');
          pt(g, 18, 25, 'door'); pt(g, 19, 25, 'door');
          return g;
        },
      },
      extraction_vault: {
        id: 'extraction_vault', name: 'Extraction Vault', subtitle: 'Coruscant · Undercity · Iron Syndicate Secure Storage',
        width: 36, height: 22, spawnPos: { x: 18, y: 2 }, textureId: 'coruscant',
        accent: '#A04000', accentGlow: 'rgba(160,64,0,0.2)', accentDim: '#501800',
        floorColor: '#100C08', floorAlt: '#180E0A', wallDark: '#050202', wallLight: '#0C0806',
        bg: 'radial-gradient(circle at 50% 70%, #120800 0%, #050202 70%)', ambient: 'embers',
        decor: ['pipe', 'girder', 'slag', 'rubble'],
        doors: [
          { x: 18, y: 0, targetZone: 'syndicate_command', targetPos: { x: 18, y: 24 }, label: 'Syndicate Command' },
          { x: 19, y: 0, targetZone: 'syndicate_command', targetPos: { x: 19, y: 24 }, label: 'Syndicate Command' },
        ],
        worldObjects: [
          { id: 'airtaxi_extraction_vault', x: 2, y: 10, label: 'AirTaxi Terminal', description: 'Emergency transit. The Syndicate kept an exit route. Of course they did.' },
          { id: 'vault_main_door', x: 11, y: 10, once: true, label: 'Vault Main Door', description: 'Phrik-reinforced. A standard slicer rig will not touch it. But the magnetic coupling on the secondary hinge is corroded — a calibrated hydrospanner could shear it clean.', grantsFlag: 'vault_door_assessed' },
          { id: 'vault_interior_cache', x: 18, y: 10, once: true, label: 'Syndicate Arms Cache', description: 'Twenty completed Phrik pauldrons. Six sets of Republic trooper underarmor, modified for the Syndicate frame. And one sealed Senate diplomatic pouch — addressed to a committee chair, from an account that does not officially exist.', grantsFlag: 'vault_contents_found', grantsItem: 'senate_conspiracy_file' },
          { id: 'vault_east_access', x: 25, y: 10, once: true, label: 'East Vault Exit', description: 'The secondary egress. A repulsor-lift is rigged to move the armor cache to a waiting transport. Whoever designed this operation planned every detail.', grantsFlag: 'vault_exit_found' },
          { id: 'syndicate_prisoner_log', x: 22, y: 15, once: true, label: 'Prisoner Transfer Log', description: 'Four detainees. Two transferred to Level 001 — the log does not say why. One released on Senate authority. One still listed as active: RIANNA, T. — Sub-Level 3, Block B.', grantsFlag: 'rianna_location_confirmed' },
        ],
        npcs: [
          { id: 'rianna_vault', x: 18, y: 10, kind: 'warden', label: 'Rianna',
            prompt: '"Back off! I told your people — I do not know any encryption keys! You burn this cell and you get nothing!"',
            repeatPrompt: 'Rianna stays pressed against the vault wall, pipe in hand, watching every shadow.',
            choices: [
              { text: '"Stand down. CSF Auxiliary. Kaelen sent me."', morality: 8, loyalty: { republic: 8 }, requires: { item: 'csf_aux_badge' }, result: '"CSF? Up on Level 1222 that badge means something. Down here it means you work for a better-funded cartel. Prove it." A pause. "Kaelen. He actually found someone." She lowers the pipe. "Lead the way."', grants: { flags: ['rianna_rescued'] } },
              { text: '"We have forty seconds before this room goes thermal. Keep the pipe. Walk now."', morality: 5, loyalty: {}, result: '"Clear and direct. I like you better than the goons." She moves.', grants: { flags: ['rianna_rescued'] } },
            ],
          },
        ],
        collectibles: [{ id: 'vault_credit_chip', x: 30, y: 18, label: 'Syndicate Operational Reserve Chip', reward: 200 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 34, 20, 'floor');
          carveRect(g, 11, 4, 25, 16, 'wall');
          carveRect(g, 12, 5, 24, 15, 'floor');
          pt(g, 11, 10, 'floor');
          pt(g, 25, 10, 'floor');
          carveRect(g, 6, 6, 6, 14, 'lava');
          carveRect(g, 28, 6, 28, 14, 'lava');
          pt(g, 18, 0, 'door'); pt(g, 19, 0, 'door');
          return g;
        },
      },
      csf_academy: {
        id: 'csf_academy', name: 'CSF Tactical Training Hub', subtitle: 'Coruscant · Republic District · CSF Precinct Command',
        width: 42, height: 30, spawnPos: { x: 2, y: 15 }, textureId: 'coruscant',
        accent: '#4A9FFF', accentGlow: 'rgba(74,159,255,0.2)', accentDim: '#1A4A80',
        floorColor: '#181C28', floorAlt: '#1E2430', wallDark: '#0A0C14', wallLight: '#141820',
        bg: 'radial-gradient(circle at 50% 30%, #10182A 0%, #080C14 70%)', ambient: 'traffic',
        decor: ['archive', 'pillar', 'scan_arch'],
        doors: [],
        worldObjects: [
          { id: 'induction_terminal', x: 10, y: 6, once: true, label: 'CSF Induction Terminal', description: 'Your Auxiliary Corps enrollment is confirmed. Designation: AX-7. Access level: provisional. Supervisor: Vane, T. Welcome to the Coruscant Security Force.', grantsItem: 'csf_aux_badge' },
          { id: 'drill_holotable', x: 20, y: 6, once: false, label: 'Tactical Holotable', description: 'A 3D grid of Sector 4 showing current patrol routes, Black Sun safe house locations, and three markers labeled UNKNOWN — each in a different sub-level. Someone is mapping something.' },
          { id: 'holding_cell_log', x: 6, y: 25, once: true, label: 'Cell Block Log', description: 'Entry 847: Detainee refuses to identify employing organization. Grey coat. No ID chip. Transferred off-site per Senate directive 1182-C. Authorized by: [REDACTED].' },
          { id: 'module_a_terminal', x: 36, y: 12, once: true, label: 'Training Module A: Non-Lethal Combat', description: 'Simulated Iron Syndicate droids in live-fire configuration. Stun your way through the course. Lethal discharges are flagged. Sergeant Torren is watching.', grantsFlag: 'module_a_complete' },
          { id: 'module_b_terminal', x: 36, y: 16, once: true, label: 'Training Module B: Forensic Slicing', description: 'A reconstructed simulation of Docking Bay 14 — manifest kiosks, scorched terminals, altered shipping logs. Identify the code-trail left by the strike team. CSF Chain of Custody Protocol codex unlocked.', grantsItem: 'forensic_slicing_suite', grantsCodex: 'codex-csf-chain-of-custody', grantsFlag: 'module_b_complete' },
          { id: 'holding_block_b', x: 6, y: 24, once: true, label: 'Training Module C: High-Stress Interrogation', description: 'A captured Black Sun informant in Holding Block B. You have thirty minutes. No weapons discharges. No civil rights violations on record.' },
          { id: 'senate_honor_ceremony', x: 20, y: 14, once: true, label: 'Senate Honor Ceremony Terminal', description: 'The Senate Honor Cross is awarded in a formal ceremony. Officer Vane promotes you to Special Lead Investigator of the CSF Auxiliary Division.' },
          { id: 'airtaxi_csf_academy', x: 38, y: 22, once: false, label: 'AirTaxi Terminal', description: 'Republic transit terminal. Authorized personnel only. Connects to the Coruscant AirTaxi Network.' },
        ],
        npcs: [
          { id: 'vane_academy', x: 6, y: 6, kind: 'republic_guard', label: 'Officer Vane',
            repeatPrompt: 'Vane is reviewing case files. He glances up. "Sector 4. We need that name."',
            prompt: '"You made it. The Auxiliary Corps runs accelerated courses for candidates with field experience. You already have that. Walk through the drill yard and talk to the training sergeant."',
            choices: [
              { text: '"I am ready to bring order to the underbelly, Detective."', morality: 8, loyalty: { republic: 10 }, result: '"Good. Start by keeping your eyes open and your mind off credits."', grants: { flags: ['csf_briefed', 'csf_duty_stance'], items: ['csf_aux_badge'] } },
              { text: '"This badge better give me open access to restricted transport lanes."', morality: 3, loyalty: { republic: 5 }, result: '"It gives you authority — and responsibility. Do not abuse it." He hands you the badge without ceremony.', grants: { flags: ['csf_briefed', 'csf_transit_unlocked'], items: ['csf_aux_badge'] } },
              { text: '"Does this mean CSF will stay out of Jon\'s sector in the Mid-Levels?"', morality: 0, loyalty: { republic: 3 }, result: '"If your friend obeys Republic code, he has nothing to fear. If he does not — you will be the one arresting him." He watches your face carefully.', grants: { flags: ['csf_briefed', 'vane_suspicious_of_jon'], items: ['csf_aux_badge'] } },
            ],
          },
          { id: 'training_sgt', x: 22, y: 16, kind: 'republic_guard', label: 'Sergeant Torren',
            repeatPrompt: 'Torren watches the drill yard. He has eyes on everyone simultaneously.',
            prompt: '"Fresh Auxiliary. Vane vouches for you which is the only reason I am not sending you back up the lift. Run the drill circuit. Keep your hands off the live-fire range until I clear you."',
            choices: [
              { text: '"Yes, Sergeant. Where do I start?"', morality: 8, loyalty: { republic: 10 }, result: '"Perimeter first. Then the obstacle rig. Then we see if you can tell the difference between a stun setting and a full discharge." He almost smiles.', grants: { flags: ['drill_accepted'], items: ['csf_patrol_armor'] } },
              { text: '"I have field experience. Skip the basics."', morality: 0, loyalty: {}, result: '"Everyone has field experience. Nobody has the Republic way. Do the circuit." He turns away. Discussion over.' },
            ],
          },
          { id: 'talo_voren', x: 10, y: 24, kind: 'republic_guard', label: 'Detective Talo Voren',
            repeatPrompt: 'Voren is annotating a case file. He does not look up.',
            prompt: 'He leans against the viewport glass watching the interrogation room, chewing a stim-stick. "Look at you — fresh boots, clean badge. You think we are fighting a war down here? It is a plumbing problem. You leak enough credits to the right bosses, the pipe stops bursting."',
            choices: [
              { text: '"If we ignore the small crimes, Black Sun controls the entire district."', morality: 8, loyalty: { republic: 5 }, result: '"Black Sun already controls the district. We just negotiate the rent. You will learn." He spits his stim-stick onto the floor and walks.' },
              { text: '"Where do you draw the line between keeping the peace and corruption?"', morality: 3, loyalty: {}, result: '"When civilians start dying. Until then? It is grease on the gears. Keep that in mind when you are out on Platform 12."', grants: { codex: ['codex-sector-4-freight-corridors'] } },
            ],
          },
          { id: 'kaelen_informant', x: 6, y: 26, kind: 'swoop_gang', label: 'Black Sun Informant "Kaelen"',
            repeatPrompt: '"I have nothing to add to my statement." He means it.',
            prompt: 'He sits handcuffed to the interrogation chair, staring at a fixed point on the wall. "I already told the last officer everything I know. Which is nothing."',
            choices: [
              { text: '"We recovered your encrypted cylinder from Docking Bay 14."', morality: 5, loyalty: { republic: 10 }, requires: { flag: 'module_b_complete' }, result: 'He flinches. "My cylinder? That is impossible — I dumped it." He pauses. "Fine. Platform 09. Ask for Dax. He logged the phantom manifests."', grants: { flags: ['module_c_complete', 'dax_named', 'phantom_freight_available'] } },
              { text: '"Talk, and Vane reduces your sentence to mid-level probation."', morality: 8, loyalty: { republic: 8 }, result: '"Probation. Sure. And I grow wings and fly to Naboo." He leans back. "I want it in writing. Then I talk."', grants: { flags: ['module_c_complete', 'legal_pressure_used'] } },
            ],
          },
          { id: 'csf_medic', x: 36, y: 10, kind: 'mechanic', label: 'Field Medic Daya',
            repeatPrompt: 'Daya is annotating injury reports. There are many.',
            prompt: '"Injuries are a policy violation in the training center. Which is convenient since I only have bacta patches and sarcasm."',
            choices: [
              { text: 'Ask for a medpac for the field.', morality: 3, loyalty: {}, result: '"Sign the requisition form. The form requires clearance. The clearance requires a supervisor signature. The supervisor is at lunch." She hands you one anyway. "This did not happen."' },
              { text: 'Ask what the injury rate is in the field.', morality: 0, loyalty: {}, result: '"For Auxiliaries? Ask someone who came back." She returns to her datapad.' },
            ],
          },
        ],
        collectibles: [],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 40, 28, 'floor');
          carveRect(g, 2, 2, 14, 10, 'wall');
          carveRect(g, 3, 3, 13, 9, 'floor');
          carveRect(g, 32, 4, 40, 18, 'wall');
          carveRect(g, 33, 5, 39, 17, 'floor');
          carveRect(g, 2, 22, 12, 28, 'wall');
          carveRect(g, 3, 23, 11, 27, 'floor');
          pt(g, 14, 6, 'floor');
          pt(g, 32, 11, 'floor');
          pt(g, 7, 22, 'floor');
          return g;
        },
      },
      lower_sky_market: {
        id: 'lower_sky_market', name: 'Lower Sky-Market Promenade', subtitle: 'Coruscant · Lower Mid-Levels · L.1100',
        width: 38, height: 26, spawnPos: { x: 2, y: 13 }, textureId: 'coruscant',
        accent: '#FF0055', accentGlow: 'rgba(255,0,85,0.22)', accentDim: '#660022',
        floorColor: '#1A0C14', floorAlt: '#22101C', wallDark: '#0C0608', wallLight: '#180C10',
        bg: 'radial-gradient(circle at 50% 40%, #1A080E 0%, #080406 70%)', ambient: 'neon_haze',
        decor: ['neon_sign', 'brazier', 'pillar', 'pipe', 'cargo_crate'],
        doors: [],
        worldObjects: [
          { id: 'marlo_hideout_board', x: 4, y: 10, once: false, label: 'Ops Planning Board', description: 'A holographic layout of three Coruscant levels. Marlo\'s territory in red. Rook\'s in blue. Significant overlap. Someone has been drawing lines.' },
          { id: 'rook_comms_terminal', x: 28, y: 16, once: true, label: "Rook's Comm Array", description: 'The speeder nav system is wired into this terminal. One code cylinder could redirect his entire route.' },
          { id: 'airtaxi_lower_sky_market', x: 20, y: 24, once: false, label: 'AirTaxi Terminal', description: 'Coruscant AirTaxi Network. Exit from lower promenade.' },
        ],
        npcs: [
          { id: 'marlo_1100', x: 8, y: 8, kind: 'broker', label: '"Slick" Marlo',
            repeatPrompt: 'Marlo watches the promenade through a one-way panel. He is always watching.',
            prompt: '"Welcome to the neighborhood. Rook operates out of the east side. He is Black Sun, old guard — thinks the territory is his because it was his father\'s. I disagree. Here is what I need from you."',
            choices: [
              { text: '"What exactly are we talking about doing to Rook?"', morality: -5, loyalty: { underworld: 12 }, result: '"Nothing flashy. His speeder runs a fixed route every night cycle. You slice the navcom and redirect it into a traffic barrier. Looks like an accident. Clean."', grants: { flags: ['rook_mission_briefed'] } },
              { text: '"I will look into it. No promises."', morality: 0, loyalty: { underworld: 5 }, result: '"Promises are for people who have something to lose. Just do it."', grants: { flags: ['rook_mission_observed'] } },
            ],
          },
          { id: 'rook_contact', x: 30, y: 17, kind: 'crime_boss', label: '"Rook"',
            repeatPrompt: '"Rook" has security droids flanking him now. He has heard enough.',
            prompt: 'He does not turn around. "You are either very brave or very stupid for coming in here. Which is it?"',
            choices: [
              { text: '"Marlo sent me. But I am not here to finish the job he thinks I am here for."', morality: 10, loyalty: { republic: 8 }, result: '"Interesting. You are telling me Marlo wants me removed. You could have just done it and collected. What are you after?"', grants: { flags: ['rook_warned'] } },
              { text: 'Carry out the mission: slice his comm array to reroute his speeder.', morality: -20, loyalty: { underworld: 20 }, result: 'The job is clean. The report in the morning cycles lists a speeder malfunction. Marlo\'s territory expands by morning. You do not sleep well.', grants: { flags: ['rook_eliminated'] } },
            ],
          },
        ],
        collectibles: [{ id: 'gang_cred', x: 18, y: 20, label: 'Stashed Credit Brick', reward: 150 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 36, 24, 'floor');
          carveRect(g, 2, 3, 14, 12, 'wall');
          carveRect(g, 3, 4, 13, 11, 'floor');
          carveRect(g, 24, 12, 36, 22, 'wall');
          carveRect(g, 25, 13, 35, 21, 'floor');
          pt(g, 14, 8, 'floor');
          pt(g, 24, 17, 'floor');
          return g;
        },
      },
      senate_district: {
        id: 'senate_district', name: 'Senate District Vaults', subtitle: 'Coruscant · Senate Precinct · L.1900',
        width: 44, height: 32, spawnPos: { x: 2, y: 16 }, textureId: 'coruscant',
        accent: '#4A9FFF', accentGlow: 'rgba(74,159,255,0.20)', accentDim: '#1A4A80',
        floorColor: '#181C28', floorAlt: '#1E2430', wallDark: '#0A0C14', wallLight: '#141820',
        bg: 'radial-gradient(circle at 50% 30%, #10182A 0%, #080C14 70%)', ambient: 'traffic',
        decor: ['pillar', 'archive', 'scan_arch'],
        doors: [], worldObjects: [
          { id: 'airtaxi_senate_district', x: 40, y: 28, once: false, label: 'Senate Express Terminal', description: 'A high-security transit terminal. Coruscant AirTaxi Network — Senate District access point.' },
        ], npcs: [], collectibles: [],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 42, 30, 'floor');
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

function decorFor(zone, x, y, map) {
  if (map) {
    const neighbors = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];
    const adjacentHazard = neighbors.some(([nx,ny]) => {
      const t = map[ny]?.[nx];
      return t && (t.type === 'lava' || t.type === 'water');
    });
    if (adjacentHazard && Math.abs(hash(x*3, y*7)) % 2 === 0) return 'hazard_stripe';
  }
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
  if (kind === 'bith') {
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <path d="M7 42 L8 24 L22 24 L23 42 Z" fill="#2A2E4A" />
        <path d="M9 24 L21 24 L19 16 L11 16 Z" fill="#3C4166" />
        <ellipse cx="15" cy="10" rx="8" ry="9" fill="#E8E4DC" />
        <ellipse cx="15" cy="10" rx="6.5" ry="7.5" fill="#F0EDE8" opacity="0.4" />
        <ellipse cx="11.5" cy="11" rx="2.4" ry="3" fill="#111010" />
        <ellipse cx="18.5" cy="11" rx="2.4" ry="3" fill="#111010" />
        <path d="M13 17.5 Q15 18.2 17 17.5" stroke="#BDB9B0" strokeWidth="0.5" fill="none" />
        <rect x="8" y="23.5" width="14" height="1.5" fill={accent} opacity="0.5" />
      </svg>
    );
  }
  if (kind === 'swoop_gang') {
    const skin = '#C8A882', jacket = '#1A1714', scar = '#8A5A4A';
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <path d="M7 42 L9 26 L21 26 L23 42 Z" fill={jacket} />
        <path d="M9 26 L21 26 L19 13 L11 13 Z" fill={jacket} />
        <path d="M9 26 C6 26 5 21 7 17 L10 17 L9 26 Z" fill={jacket} />
        <path d="M21 26 C24 26 25 21 23 17 L20 17 L21 26 Z" fill={jacket} />
        <ellipse cx="15" cy="9.5" rx="4.8" ry="5.2" fill={skin} />
        <path d="M10 7 C10 4 12 2 15 2 C18 2 20 4 20 7 Z" fill="#2A2420" />
        <path d="M12.5 9.5 L14.5 11 L13 12.5" stroke={scar} strokeWidth="0.8" fill="none" opacity="0.85" />
        <circle cx="12.8" cy="9" r="0.6" fill="#2A2320" />
        <circle cx="17.2" cy="9" r="0.6" fill="#2A2320" />
        <ellipse cx="12.8" cy="9" rx="0.9" ry="0.7" fill={skin} style={{ animation: 'npc-blink 5s ease-in-out infinite' }} />
        <ellipse cx="17.2" cy="9" rx="0.9" ry="0.7" fill={skin} style={{ animation: 'npc-blink 5s ease-in-out infinite' }} />
        <rect x="18.5" y="22" width="2" height="5" rx="0.7" fill="#2A2420" />
        <rect x="9" y="25.5" width="12" height="1.5" fill="#FF4444" opacity="0.3" />
      </svg>
    );
  }
  if (kind === 'cantina_owner') {
    const skin = '#D4A882', apron = '#C8B89A', shirt = '#4A5068';
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <path d="M8 42 L9 26 L21 26 L22 42 Z" fill={shirt} />
        <path d="M9 26 L21 26 L19 14 L11 14 Z" fill={shirt} />
        <path d="M9 26 C6 26 5 22 7 18 L10 18 L9 26 Z" fill={shirt} />
        <path d="M21 26 C24 26 25 22 23 18 L20 18 L21 26 Z" fill={shirt} />
        <path d="M11 14 L19 14 L18 26 L12 26 Z" fill={apron} opacity="0.75" />
        <ellipse cx="15" cy="9.5" rx="4.5" ry="5" fill={skin} />
        <path d="M10.5 6 C10.5 3 12.5 2 15 2 C17.5 2 19.5 3 19.5 6 C18 5 16 4.8 15 4.8 C14 4.8 12 5 10.5 6 Z" fill="#2A1E1A" />
        <path d="M19 6 C20 8 20 12 19 14" stroke="#2A1E1A" strokeWidth="1.5" fill="none" />
        <circle cx="12.6" cy="9.5" r="0.6" fill="#2A2320" />
        <circle cx="17.4" cy="9.5" r="0.6" fill="#2A2320" />
        <ellipse cx="12.6" cy="9.5" rx="0.9" ry="0.7" fill={skin} style={{ animation: 'npc-blink 4.4s ease-in-out infinite' }} />
        <ellipse cx="17.4" cy="9.5" rx="0.9" ry="0.7" fill={skin} style={{ animation: 'npc-blink 4.4s ease-in-out infinite' }} />
        <path d="M13 12 Q15 13 17 12" stroke="#8A6E4E" strokeWidth="0.5" fill="none" />
        <rect x="9" y="25.5" width="12" height="1.5" fill={apron} opacity="0.6" />
      </svg>
    );
  }
  if (kind === 'crime_boss') {
    const scales = '#4A7A3A', scalesDark = '#2E5026', eye = '#CCAA00';
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <path d="M5 42 L8 24 L22 24 L25 42 Z" fill="#2A2018" />
        <path d="M8 24 L22 24 L20 12 L10 12 Z" fill="#3A2C1A" />
        <path d="M8 24 C4 24 2 18 5 13 L9 14 L8 24 Z" fill="#2A2018" />
        <path d="M22 24 C26 24 28 18 25 13 L21 14 L22 24 Z" fill="#2A2018" />
        <ellipse cx="15" cy="8.5" rx="5.5" ry="6" fill={scales} />
        <ellipse cx="15" cy="8.5" rx="4" ry="4.5" fill={scalesDark} opacity="0.3" />
        <ellipse cx="12" cy="7.5" rx="2" ry="2.8" fill="#0A0A0A" />
        <ellipse cx="18" cy="7.5" rx="2" ry="2.8" fill="#0A0A0A" />
        <circle cx="12" cy="7" r="0.6" fill={eye} opacity="0.9" />
        <circle cx="18" cy="7" r="0.6" fill={eye} opacity="0.9" />
        <path d="M11 12.5 Q15 14 19 12.5" stroke={scalesDark} strokeWidth="0.8" fill="none" />
        <path d="M13 4 L15 1 L17 4" fill={scalesDark} opacity="0.7" />
        <rect x="8" y="23.5" width="14" height="1.5" fill={accent} opacity="0.4" />
      </svg>
    );
  }
  if (kind === 'mechanic') {
    const skin = '#C9A882', coveralls = '#4A4E58', goggle = '#3A3A42', lens = '#5ABFCC';
    return (
      <svg viewBox="0 0 30 42" width="26" height="36">
        <path d="M8 42 L9 26 L21 26 L22 42 Z" fill={coveralls} />
        <path d="M9 26 L21 26 L19 13 L11 13 Z" fill={coveralls} />
        <path d="M9 26 C6 26 5 21 7 17 L10 17 L9 26 Z" fill={coveralls} />
        <path d="M21 26 C24 26 25 21 23 17 L20 17 L21 26 Z" fill={coveralls} />
        <ellipse cx="15" cy="9.5" rx="4.8" ry="5.2" fill={skin} />
        <path d="M10.5 6.5 C10.5 3.5 12.2 2 15 2 C17.8 2 19.5 3.5 19.5 6.5 Z" fill="#3A2E22" />
        <rect x="10" y="4.5" width="10" height="3.5" rx="1.5" fill={goggle} />
        <circle cx="12.5" cy="6" r="1.4" fill={lens} opacity="0.75" />
        <circle cx="17.5" cy="6" r="1.4" fill={lens} opacity="0.75" />
        <line x1="14" y1="6" x2="16" y2="6" stroke={goggle} strokeWidth="0.7" />
        <circle cx="12.8" cy="10" r="0.6" fill="#2A2320" />
        <circle cx="17.2" cy="10" r="0.6" fill="#2A2320" />
        <ellipse cx="12.8" cy="10" rx="0.9" ry="0.7" fill={skin} style={{ animation: 'npc-blink 4.2s ease-in-out infinite' }} />
        <ellipse cx="17.2" cy="10" rx="0.9" ry="0.7" fill={skin} style={{ animation: 'npc-blink 4.2s ease-in-out infinite' }} />
        <path d="M13.2 12.5 Q15 13.3 16.8 12.5" stroke="#8A6E4E" strokeWidth="0.5" fill="none" />
        <rect x="9" y="25.5" width="12" height="1.5" fill={accent} opacity="0.4" />
      </svg>
    );
  }
  if (kind === 'slicer') {
    return (
      <svg viewBox="0 0 48 48" style={{ width: '100%', height: '100%' }}>
        <circle cx="24" cy="18" r="12" fill="#1A2A2A"/>
        <rect x="14" y="14" width="20" height="10" rx="5" fill="#003040" stroke="#00F0FF" strokeWidth="1.5"/>
        <rect x="16" y="16" width="7" height="6" rx="3" fill="#00C8D4" opacity="0.7"/>
        <rect x="25" y="16" width="7" height="6" rx="3" fill="#00C8D4" opacity="0.7"/>
        <line x1="23" y1="19" x2="25" y2="19" stroke="#00F0FF" strokeWidth="1"/>
        <line x1="10" y1="17" x2="14" y2="18" stroke="#00C8D4" strokeWidth="1.5"/>
        <line x1="38" y1="17" x2="34" y2="18" stroke="#00C8D4" strokeWidth="1.5"/>
        <rect x="18" y="28" width="12" height="14" rx="3" fill="#0C1818"/>
        <line x1="22" y1="24" x2="21" y2="30" stroke="#00F0FF" strokeWidth="1" opacity="0.7"/>
        <line x1="26" y1="24" x2="27" y2="30" stroke="#00C8D4" strokeWidth="1" opacity="0.7"/>
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
    case 'cable_bundle':
      return (<svg viewBox="0 0 24 24" width="16" height="16" style={s}><g><line x1="8" y1="2" x2="8" y2="22" stroke="#00C8D4" strokeWidth="1.5" opacity="0.7"/><line x1="11" y1="2" x2="11" y2="22" stroke="#00F0FF" strokeWidth="1" opacity="0.5"/><line x1="14" y1="2" x2="14" y2="22" stroke="#00C8D4" strokeWidth="1.5" opacity="0.7"/><rect x="6" y="9" width="10" height="2" rx="1" fill="#005060" opacity="0.8"/><rect x="6" y="15" width="10" height="2" rx="1" fill="#005060" opacity="0.8"/></g></svg>);
    case 'scan_arch':
      return (<svg viewBox="0 0 24 24" width="16" height="16" style={s}><g><path d="M4 22 L4 6 Q12 2 20 6 L20 22" stroke="#00CCFF" strokeWidth="2" fill="none" opacity="0.8"/><line x1="4" y1="14" x2="20" y2="14" stroke="#00CCFF" strokeWidth="1" opacity="0.5" strokeDasharray="2,2"/><rect x="2" y="20" width="20" height="3" rx="1" fill="#1A4A80" opacity="0.7"/></g></svg>);
    case 'warning_beacon':
      return (<svg viewBox="0 0 24 24" width="16" height="16" style={s}><g><rect x="9" y="14" width="6" height="8" rx="1" fill="#804800"/><ellipse cx="12" cy="12" rx="5" ry="4" fill="#FF9900" opacity="0.9"/><ellipse cx="12" cy="12" rx="3" ry="2.5" fill="#FFCC00"/><rect x="10" y="4" width="4" height="8" rx="1" fill="#606060"/></g></svg>);
    case 'hazard_stripe':
      return (<svg viewBox="0 0 24 24" width="16" height="16" style={s}><g><rect x="2" y="18" width="20" height="4" fill="#1A1A00"/><rect x="2" y="18" width="4" height="4" fill="#FF9900" opacity="0.9"/><rect x="10" y="18" width="4" height="4" fill="#FF9900" opacity="0.9"/><rect x="18" y="18" width="4" height="4" fill="#FF9900" opacity="0.9"/></g></svg>);
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
  if (kind === 'neon_haze') {
    const neonParticles = Array.from({ length: 10 }, (_, i) => i);
    return (
      <div style={{ position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',opacity:0.7 }}>
        {neonParticles.map((i) => (
          <div key={i} style={{
            position:'absolute',
            width:`${30+(i*17)%40}px`,height:`${20+(i*13)%30}px`,
            borderRadius:'50%',
            background:i%2===0?'rgba(255,0,85,0.12)':'rgba(180,0,100,0.10)',
            left:`${(i*23)%90}%`,top:`${(i*31)%80}%`,
            animation:`drift ${6+(i%4)}s ease-in-out ${i*0.7}s infinite alternate`,
            filter:'blur(8px)',pointerEvents:'none',
          }} />
        ))}
      </div>
    );
  }
  if (kind === 'datastream') {
    const dsParticles = Array.from({ length: 8 }, (_, i) => i);
    return (
      <div style={{ position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',opacity:0.7 }}>
        {dsParticles.map((i) => (
          <div key={i} style={{
            position:'absolute',width:'1px',
            height:`${40+(i*19)%40}%`,
            background:i%3===0?'rgba(0,240,255,0.25)':'rgba(0,180,200,0.15)',
            left:`${10+i*12}%`,top:'-10%',
            animation:`scanDown ${3+(i%3)}s linear ${i*0.4}s infinite`,
            pointerEvents:'none',
          }} />
        ))}
      </div>
    );
  }
  if (kind === 'steam') {
    const steamParticles = Array.from({ length: 12 }, (_, i) => i);
    return (
      <div style={{ position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',opacity:0.5 }}>
        {steamParticles.map((i) => (
          <div key={i} style={{
            position:'absolute',
            width:`${8+(i*7)%16}px`,height:`${8+(i*7)%16}px`,
            borderRadius:'50%',
            background:'rgba(200,180,160,0.08)',
            left:`${(i*19)%88}%`,bottom:`${(i*13)%40}%`,
            animation:`rise ${4+(i%5)}s ease-out ${i*0.5}s infinite`,
            filter:'blur(4px)',pointerEvents:'none',
          }} />
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

function Minimap({ zone, map, pos, camX, camY, npcPositions, completedInteractions, questFlags = {} }) {
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
      {zone.npcs?.filter(npc => isNpcVisible(npc, questFlags)).map((npc) => {
        const p = (npcPositions && npcPositions[npc.id]) || { x: npc.x, y: npc.y };
        const done = completedInteractions?.has(npc.id);
        const isQuest = npc.questNpc && !done;
        const color = isQuest ? '#FFD700' : done ? '#333' : zone.accentDim;
        return <rect key={npc.id} x={p.x*MS} y={p.y*MS} width={MS} height={MS} fill={color} />;
      })}
      <rect x={camX*MS} y={camY*MS} width={VIEWPORT_COLS*MS} height={VIEWPORT_ROWS*MS} fill="none" stroke={zone.accent} strokeWidth="0.8" opacity="0.7" />
      <rect x={pos.x*MS} y={pos.y*MS} width={MS} height={MS} fill={zone.accent} />
    </svg>
  );
}

function DialogueOverlay({ npc, onChoose, inventory = [], questFlags = {} }) {
  const meetsRequires = (choice) => {
    if (!choice.requires) return true;
    if (choice.requires.item && !inventory.some(i => i.id === choice.requires.item)) return false;
    if (choice.requires.flag && !questFlags[choice.requires.flag]) return false;
    return true;
  };
  return (
    <div style={{ position:'absolute',inset:0,background:'rgba(4,4,8,0.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:25 }}>
      <div style={{ width:'min(92%,480px)',border:'1px solid #2A2A38',background:'#0E0E16',fontFamily:"'IBM Plex Mono',ui-monospace,monospace" }}>
        <div style={{ padding:'14px 18px',borderBottom:'1px solid #2A2A38',color:'#E8C97A',fontSize:13,fontWeight:600 }}>{npc.label}</div>
        <div style={{ padding:'16px 18px',color:'#C9C5BE',fontSize:13,lineHeight:1.6,borderBottom:'1px solid #1C1C26' }}>{npc.prompt}</div>
        {npc.choices.map((choice, i) => {
          const meets = meetsRequires(choice);
          const reqLabel = !meets && choice.requires?.item ? ` (requires ${ITEMS[choice.requires.item]?.name || choice.requires.item})` : (!meets && choice.requires?.flag ? ` (requires: ${choice.requires.flag})` : '');
          return (
            <div key={i} onClick={() => meets && onChoose(choice, npc.id)}
              style={{ padding:'14px 18px',borderBottom:i<npc.choices.length-1?'1px solid #1C1C26':'none',cursor:meets?'pointer':'not-allowed',fontSize:12.5,color:meets?'#A8ADC0':'#4A4F64',opacity:meets?1:0.5 }}>
              &gt; {choice.text}<span style={{color:'#E8C97A88',fontSize:11}}>{reqLabel}</span>
            </div>
          );
        })}
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

const ITEMS = {
  comlink:                    { id:'comlink',                    name:'Comlink',                               type:'gear',       iconKind:'tool',     value:0,   description:'Encrypted comlink. Jon is on speed-dial.' },
  field_rations:              { id:'field_rations',              name:'Field Rations',                         type:'consumable', iconKind:'supply',   value:5,   description:'Tasteless. Effective.' },
  stolen_manifest:            { id:'stolen_manifest',            name:'Scylla Freight Manifest',               type:'quest',      iconKind:'datapad',  value:150, description:'Encrypted cargo log from Docking Bay 14. Lists Phrik alloy and Jedi archive crates as cargo, both reported destroyed in a dock fire. Someone is lying.' },
  scrambler_keycard:          { id:'scrambler_keycard',          name:'Underworld Passcode',                   type:'quest',      iconKind:'keycard',  value:0,   description:'A blackmarket security bypass. Grants transit access across mid and lower levels without checkpoint flags.' },
  encrypted_shard:            { id:'encrypted_shard',            name:'Sith Memory Prism',                    type:'quest',      iconKind:'artifact', value:400, description:'A fist-sized crystal that whispers in ancient Sith. It grows warm when near the dark side of the Force.' },
  forged_clearance:           { id:'forged_clearance',           name:'Blank Senate Transit Pass',             type:'quest',      iconKind:'keycard',  value:0,   description:'An unfilled Republic surface-clearance form. With the right seal it opens the Senate District.' },
  buyers_id:                  { id:'buyers_id',                  name:"Buyer's Encrypted ID",                 type:'quest',      iconKind:'datapad',  value:0,   description:"A scrambled credit transfer signature. Someone at the top of Coruscant's financial tier is purchasing stolen military alloys." },
  csf_aux_pass:               { id:'csf_aux_pass',               name:'CSF Auxiliary Pass',                   type:'quest',      iconKind:'keycard',  value:0,   description:'Provisional law-enforcement clearance for Sector 4. Signed by Officer Vane.' },
  tool_hydrospanner:          { id:'tool_hydrospanner',          name:"Slicer's Hydrospanner",                type:'tool',       iconKind:'tool',     value:60,  description:"Modified to interface with panel-lock bypass ports. Standard issue on every scoundrel's belt." },
  item_transit_pass:          { id:'item_transit_pass',          name:'Coruscant Transit Pass',               type:'gear',       iconKind:'keycard',  value:0,   description:'Unlimited speeder access between Sub-Surface, Mid-Levels, and Lower Levels. Jon organized it.' },
  item_spice_vial:            { id:'item_spice_vial',            name:'Glitterstim Spice Vial',               type:'contraband', iconKind:'supply',   value:80,  description:'Highly illegal telepathic booster. Confiscated on sight by any Republic checkpoint.' },
  item_blaster_parts:         { id:'item_blaster_parts',         name:'Unregistered Blaster Parts',           type:'contraband', iconKind:'gear',     value:120, description:'Scraped serial numbers. Military-grade power packs that should not exist in civilian hands.' },
  item_code_cylinder:         { id:'item_code_cylinder',         name:'Blank Code Cylinder',                  type:'tool',       iconKind:'tool',     value:40,  description:'High-security key blank. Write any access code into it with the right slicer rig.' },
  item_brandy:                { id:'item_brandy',                name:'Corellian Reserve Brandy',             type:'consumable', iconKind:'supply',   value:25,  description:'Smooth. Expensive. Opens doors that credits alone cannot.' },
  csf_patrol_armor:           { id:'csf_patrol_armor',           name:'CSF Patrol Armor',                     type:'gear',       iconKind:'gear',     value:200, description:'Standard Coruscant Security Force tactical plate. Carries the weight of the law.' },
  republic_badge:             { id:'republic_badge',             name:'Republic Duty Badge',                  type:'gear',       iconKind:'keycard',  value:0,   description:'Your commission as a CSF Auxiliary Agent. Opens checkpoints. Closes doors.' },
  senate_honor_cross:         { id:'senate_honor_cross',         name:'Senate Honor Cross',                   type:'gear',       iconKind:'artifact', value:0,   description:"The Republic's highest civilian commendation. Costs more than it pays." },
  surface_clearance:          { id:'surface_clearance',          name:'Surface Landing Clearance',            type:'quest',      iconKind:'keycard',  value:0,   description:"Permanent access to Coruscant's surface levels and the Senate District. Hard-won." },
  csf_aux_badge:              { id:'csf_aux_badge',              name:'CSF Auxiliary Badge',                  type:'gear',       iconKind:'keycard',  value:0,   description:'Your official commission as a Coruscant Security Force Auxiliary. Designation AX-7. Signed by Officer Vane.' },
  forensic_slicing_suite:     { id:'forensic_slicing_suite',     name:'Forensic Slicing Suite',               type:'tool',       iconKind:'tool',     value:120, description:'A CSF-issue datapad rig for isolating corrupted code trails, altering customs manifests, and bypassing lower-tier security seals.' },
  emp_grenade:                { id:'emp_grenade',                name:'EMP Grenade',                          type:'consumable', iconKind:'supply',   value:90,  description:'Republic-issue electromagnetic pulse charge. Disables droid systems and powered locks in a short radius. Non-lethal. Mostly.' },
  level_088_transit_pass:     { id:'level_088_transit_pass',     name:'Level 088 Priority Transit Pass',      type:'quest',      iconKind:'keycard',  value:0,   description:'CSF-authorized speeder clearance to Level 088 Police Outpost 88. Bypass all mid-level checkpoints.' },
  encrypted_gang_holo_log:    { id:'encrypted_gang_holo_log',    name:'Encrypted Gang Holo-Log',              type:'quest',      iconKind:'datapad',  value:0,   description:'Black-market credit transactions routed to Level 005. Names, amounts, and Senate authorization stamps that should not exist.' },
  senate_conspiracy_file:     { id:'senate_conspiracy_file',     name:'Verified Senate Conspiracy File',      type:'quest',      iconKind:'datapad',  value:0,   description:"Authenticated records linking a sitting Senator to the Docking Bay 14 raid and the Iron Syndicate's Phrik operation." },
  csf_stun_carbine:           { id:'csf_stun_carbine',           name:'Modified Heavy Stun Carbine',          type:'gear',       iconKind:'gear',     value:280, description:'Seized from a Black Sun lieutenant. Modified for high-yield stun delivery. Hits like a wall.' },
  level_005_keycard:          { id:'level_005_keycard',          name:'Level 005 Security Override',          type:'quest',      iconKind:'keycard',  value:0,   description:'A security terminal keycard from the Sector 4 raid commander. Opens Iron Syndicate blast doors in The Works.' },
  thermal_vest:               { id:'thermal_vest',               name:'Reinforced Thermal Vest',              type:'gear',       iconKind:'gear',     value:150, description:'Insulated against plasma discharge and steam vent hazards. Required for extended operations in Level 005.' },
  calibrated_hydrospanner:    { id:'calibrated_hydrospanner',    name:'Calibrated Hydrospanner',              type:'tool',       iconKind:'tool',     value:80,  description:"Jax's custom calibration rig. Grants +1 to all mechanical and repair checks." },
  decrypted_senate_audio:     { id:'decrypted_senate_audio',     name:'Decrypted Senate Audio Log',           type:'quest',      iconKind:'datapad',  value:0,   description:'A recovered audio record exposing a Senate aide coordinating weapons trafficking through underbelly drop points.' },
  master_senate_transit_drive:{ id:'master_senate_transit_drive',name:'Master Senate Transit Decryption Drive',type:'quest',      iconKind:'datapad',  value:0,   description:"Kaelen's personal slicer drive. Contains every Syndicate bypass code for the Senate transit line." },
};

const CODEX_ENTRIES = {
  'codex-jon-network': {
    id:'codex-jon-network', title:"Jon's Smuggling Network", category:'dossier',
    summary:'An old friend operating in the Coruscant underworld.',
    body:[
      'Jon served two tours with the Republic Special Forces during the last Sith Wars before a disciplinary discharge that he has never fully explained. He went into private contracting, then cargo running, then something he prefers to call independent logistics.',
      'His Coruscant operation is small but clean. Three ships, six contacts, one rule: no weapons of mass destruction. Everything else is negotiable.',
      'He wants a partner he can trust with more than a manifest. He wants someone who will ask the right questions when the cargo stops making sense.',
    ],
  },
  'codex-jon-backstory': {
    id:'codex-jon-backstory', title:"Jon's Coruscant History", category:'dossier',
    summary:'Your contact ran the Scylla route before it became a cover operation.',
    body:[
      'Three years before the Bay 14 incident, Jon ran the Scylla Freight route as legitimate cargo transport. He moved sealed containers for a client he knew as a Senate logistics contact. When he discovered one container held Jedi archive materials, he shut the route down and walked away.',
      'Someone later used his old transit authentication codes to reopen the route under a shell company. The Bay 14 strike team had inside knowledge of his operational patterns because they were built from them.',
      'Jon has never confirmed to any Republic authority what he carried or who hired him. He would rather carry the guilt privately than subject former crew members to investigation.',
    ],
  },
  'codex-docking-bay-14': {
    id:'codex-docking-bay-14', title:'Docking Bay 14 Incident', category:'story',
    summary:'A cargo hijacking that official records call a dock fire.',
    body:[
      'Three standard cycles ago, Docking Bay 14 at the Sub-Surface Spaceport logged a catastrophic fuel line rupture. Two crewmembers listed as casualties. Cargo manifest: destroyed.',
      'The recovered Scylla Freight shipping log tells a different story. The cargo included seventeen crates of unrefined Phrik alloy and four sealed containers tagged with Jedi Temple archive seals.',
      'No fuel rupture. A strike team with CSF-grade clearance codes walked the cargo out in broad light.',
    ],
  },
  'codex-phrik-alloy': {
    id:'codex-phrik-alloy', title:'Phrik Alloy', category:'lore',
    summary:'A rare metal resistant to lightsaber cuts.',
    body:[
      'Phrik is a rare metallic compound found in deep core mining operations. Its molecular structure resists lightsaber plasma, making it one of the few materials in the galaxy that can survive direct contact with an active blade.',
      'The Old Republic restricted Phrik extraction to licensed military contractors after its use in Mandalorian combat armor during the Sith Wars. Off-book stockpiles exist, but moving them requires either Senate authorization or a very good forger.',
    ],
  },
  'codex-iron-syndicate': {
    id:'codex-iron-syndicate', title:'The Iron Syndicate', category:'factions',
    summary:'A rising power in the Coruscant underworld. Motive unknown.',
    body:[
      'First surfaced in CSF intelligence reports eight months ago. Initially dismissed as a rebranded Black Sun cell. Current assessment: distinct organization, distinct goals.',
      'They do not move spice. They do not run protection. They acquire materials with military applications and move them into The Works, where they disappear.',
      'Three witnesses who saw their operations have filed no follow-up reports. The Republic investigator assigned to the case was transferred off-world.',
    ],
  },
  'codex-csf-protocol': {
    id:'codex-csf-protocol', title:'Coruscant Security Force', category:'factions',
    summary:"The Republic's planetary law enforcement arm on Coruscant.",
    body:[
      'The CSF maintains order across all publicly accessible levels of Coruscant, from the Sub-Surface transit hubs to the Senate District. They answer to the Republic Senate, which in practice means they answer to whoever controls the appropriations committee.',
      'Subsurface patrol is understaffed by thirty percent. Officers routinely look the other way on minor contraband to focus resources on organized crime, or on whatever the Senate\'s current priority happens to be.',
    ],
  },
  'codex-csf-chain-of-custody': {
    id:'codex-csf-chain-of-custody', title:'CSF Chain of Custody Protocol', category:'lore',
    summary:'Republic law enforcement evidentiary standards.',
    body:[
      'The Coruscant Security Force mandates strict documentation for all evidence recovered in active investigations. Each item must be logged, sealed, and countersigned by a supervising officer before it can be used in prosecution.',
      'Violations of chain-of-custody result in evidence suppression, which is why organizations like the Iron Syndicate specifically target manifest kiosks and archive terminals before withdrawing from a crime scene.',
    ],
  },
  'codex-sector-4-freight-corridors': {
    id:'codex-sector-4-freight-corridors', title:'Sector 4 Freight Corridors', category:'lore',
    summary:"The industrial transit network beneath Coruscant's mid-levels.",
    body:[
      "Sector 4 serves as the junction point for all heavy freight moving between Coruscant's sub-surface spaceports and the upper manufacturing tiers. Forty-two automated crane platforms and twelve active docking bays process an estimated six million tonnes of cargo per standard day.",
      'CSF jurisdiction in the sector is technically absolute but practically negotiated. Three different cartel networks pay informal fees to keep their manifests unscanned. The CSF collects revenue from each, reports none of it, and files quarterly commendations for reduced crime rates.',
    ],
  },
  'codex-coruscant-undercity-strata': {
    id:'codex-coruscant-undercity-strata', title:'Coruscant Undercity Stratification', category:'lore',
    summary:"The vertical structure of Coruscant's lower levels.",
    body:[
      "Coruscant is built upon its own history. Layer upon layer of durasteel, ferro-concrete, and abandoned infrastructure stretch downward over five thousand levels. While the upper thousand levels capture the sun, levels below 100 exist in perpetual twilight.",
      "Level 088 serves as the structural junction for regional freight lines, a grease-slick cavern spanning hundreds of square kilometers. Republic law is not enforced through courtrooms here, but negotiated through local cartel proxies and overworked CSF outposts.",
      "Level 005 represents the boundary of sustainable industrial life. Below lies the toxic abyss of Level 001, unmapped ruins, ancient structural pylons, and hazardous chemical runoff. The Works were built for magma-fed smelting foundries. Today they provide refuge for those who wish to disappear entirely from the Republic Census.",
    ],
  },
  'codex-the-works-forges': {
    id:'codex-the-works-forges', title:"The Works: Coruscant's Forges", category:'lore',
    summary:"The ancient industrial heart of Coruscant's undercity.",
    body:[
      "The Works were among the earliest structures on the planet that would become Coruscant. Generations of deep-core foundry families worked these forges, and their descendants still live in the lower levels, maintaining equipment that the Republic has officially declared decommissioned.",
      "The Iron Syndicate chose The Works not for its secrecy alone, but for its infrastructure, plasma conduits capable of achieving forge temperatures that commercial smelters cannot reach, and drainage tunnels wide enough to move military hardware without detection.",
    ],
  },
};

const SPEEDER_DESTINATIONS = [
  { id: 'spaceport',         name: 'Sub-Surface Spaceport',       level: 'Sub-Surface L2',        cost: 0,   requiredFlag: null,                       targetZone: 'spaceport',         targetPos: { x: 14, y: 10 } },
  { id: 'market',            name: 'West Market District',         level: 'Sub-Surface L2',        cost: 0,   requiredFlag: null,                       targetZone: 'market',            targetPos: { x: 2,  y: 10 } },
  { id: 'sky_market',        name: 'Sky-Market District L.1450',   level: 'Upper Mid-Levels',      cost: 25,  requiredFlag: 'speeder_transit_unlocked', targetZone: 'sky_market',        targetPos: { x: 4,  y: 13 } },
  { id: 'freight_hub',       name: 'Sector 4 Freight Hub L.088',   level: 'Industrial Mid-Levels', cost: 50,  requiredFlag: 'speeder_transit_unlocked', targetZone: 'freight_hub',       targetPos: { x: 2,  y: 14 } },
  { id: 'the_works',         name: 'The Works L.005',              level: 'Undercity',             cost: 75,  requiredFlag: 'speeder_transit_unlocked', targetZone: 'the_works',         targetPos: { x: 2,  y: 12 } },
  { id: 'csf_academy',       name: 'CSF Training Hub L.1222',      level: 'Republic Mid-Levels',   cost: 0,   requiredFlag: 'republic_path_open',       targetZone: 'csf_academy',       targetPos: { x: 2,  y: 15 } },
  { id: 'lower_sky_market',  name: 'Lower Promenade L.1100',       level: 'Lower Mid-Levels',      cost: 0,   requiredFlag: 'marlo_sky_talked',         targetZone: 'lower_sky_market',  targetPos: { x: 2,  y: 13 } },
  { id: 'senate_district',   name: 'Senate Precinct L.1900',       level: 'Upper Levels',          cost: 100, requiredFlag: 'rook_eliminated',          targetZone: 'senate_district',   targetPos: { x: 2,  y: 16 } },
];

function SpeederOverlay({ credits, questFlags, currentZoneId, onTravel, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0a1a2a', border: '2px solid #00e5ff', borderRadius: 8, padding: '28px 36px', minWidth: 420, maxWidth: 560, color: '#d0eaff', fontFamily: 'monospace' }}>
        <div style={{ color: '#00e5ff', fontWeight: 'bold', fontSize: 17, marginBottom: 6, letterSpacing: 2 }}>CORUSCANT AIRTAXI NETWORK</div>
        <div style={{ color: '#6fa8c0', fontSize: 12, marginBottom: 20 }}>Select destination. Credits on hand: {credits} CR</div>
        {SPEEDER_DESTINATIONS.filter(d => d.targetZone !== currentZoneId).map(dest => {
          const locked = dest.requiredFlag && !questFlags[dest.requiredFlag];
          const canAfford = credits >= dest.cost;
          const available = !locked && canAfford;
          return (
            <div key={dest.id} onClick={() => available && onTravel(dest)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', marginBottom: 8, borderRadius: 5, cursor: available ? 'pointer' : 'not-allowed', background: available ? '#0d2233' : '#0a1218', border: `1px solid ${available ? '#00e5ff44' : '#222'}`, opacity: locked ? 0.45 : canAfford ? 1 : 0.6 }}>
              <div>
                <div style={{ color: locked ? '#556' : '#b8e0ff', fontWeight: 'bold', fontSize: 14 }}>{dest.name}</div>
                <div style={{ color: '#4a7a90', fontSize: 11 }}>{dest.level}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 13 }}>
                {locked ? <span style={{ color: '#556' }}>CLEARANCE REQUIRED</span>
                  : dest.cost === 0 ? <span style={{ color: '#6fd9a0' }}>FREE</span>
                  : <span style={{ color: canAfford ? '#00e5ff' : '#e57' }}>{dest.cost} CR</span>}
              </div>
            </div>
          );
        })}
        <div onClick={onClose} style={{ marginTop: 18, textAlign: 'center', color: '#6fa8c0', fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}>[ CLOSE TERMINAL ]</div>
      </div>
    </div>
  );
}

function InventoryOverlay({ inventory, onClose, onStorySlotChange }) {
  const [selectedItem, setSelectedItem] = React.useState(null);
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [storySlots, setStorySlots] = React.useState([null, null]);

  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'i' || e.key === 'I' || e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const CATEGORIES = ['all', 'gear', 'quest', 'contraband', 'tool', 'consumable'];
  const filtered = activeCategory === 'all' ? inventory : inventory.filter(it => it.type === activeCategory);
  const typeColor = { quest:'#E8C97A', tool:'#4ACDFF', gear:'#8FA6FF', contraband:'#FF5555', consumable:'#6FD9A0' };
  const iconChar = { datapad:'≡', keycard:'◈', tool:'⚙', supply:'◆', gear:'▣', artifact:'◉' };

  const equipToSlot = (si) => {
    if (!selectedItem) return;
    const ns = [...storySlots]; ns[si] = selectedItem.id; setStorySlots(ns);
    onStorySlotChange && onStorySlotChange(ns);
  };

  return (
    <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:28 }}>
      <div style={{ width:'min(96%,740px)',border:'1px solid #2A2A38',background:'#0A0A12',fontFamily:"'IBM Plex Mono',ui-monospace,monospace",maxHeight:'90vh',display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'12px 18px',borderBottom:'1px solid #2A2A38',color:'#4ACDFF',fontSize:12,fontWeight:600,letterSpacing:'0.15em' }}>HOLONET INVENTORY SYSTEM</div>
        <div style={{ display:'flex',flex:1,overflow:'hidden' }}>
          <div style={{ width:320,borderRight:'1px solid #1C1C26',padding:12,display:'flex',flexDirection:'column',gap:8 }}>
            <div style={{ fontSize:9,color:'#5A5F74' }}>ACTIVE STORY SLOTS</div>
            <div style={{ display:'flex',gap:6,marginBottom:4 }}>
              {[0,1].map(si => {
                const slotItem = storySlots[si] ? inventory.find(it => it.id === storySlots[si]) : null;
                return (
                  <div key={si} onClick={() => equipToSlot(si)}
                    style={{ flex:1,height:48,border:`1px solid ${selectedItem?'#4ACDFF88':'#2A2A38'}`,background:'#0E0E1A',display:'flex',alignItems:'center',justifyContent:'center',cursor:selectedItem?'pointer':'default',fontSize:10,color:'#5A5F74',borderRadius:2 }}>
                    {slotItem ? <span style={{color:typeColor[slotItem.type]||'#A8ADC0'}}>{iconChar[slotItem.iconKind]||'?'} {slotItem.name.slice(0,14)}</span> : <span>SLOT {si+1}</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginBottom:4 }}>
              {CATEGORIES.map(cat => (
                <div key={cat} onClick={() => setActiveCategory(cat)}
                  style={{ padding:'2px 8px',fontSize:9,border:`1px solid ${activeCategory===cat?'#4ACDFF':'#2A2A38'}`,color:activeCategory===cat?'#4ACDFF':'#5A5F74',cursor:'pointer',textTransform:'uppercase' }}>{cat}</div>
              ))}
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4,overflowY:'auto' }}>
              {filtered.map(item => (
                <div key={item.id} onClick={() => setSelectedItem(item)}
                  style={{ aspectRatio:'1',border:`1px solid ${selectedItem?.id===item.id?typeColor[item.type]||'#A8ADC0':'#2A2A38'}`,background:selectedItem?.id===item.id?'#141420':'#0E0E18',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative',padding:2 }}>
                  <div style={{ fontSize:16,color:typeColor[item.type]||'#A8ADC0' }}>{iconChar[item.iconKind]||'?'}</div>
                  {item.qty > 1 && <div style={{ position:'absolute',bottom:2,right:4,fontSize:8,color:'#E8C97A' }}>x{item.qty}</div>}
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex:1,padding:16,display:'flex',flexDirection:'column',gap:10 }}>
            {selectedItem ? (
              <>
                <div style={{ color:typeColor[selectedItem.type]||'#A8ADC0',fontSize:14,fontWeight:600 }}>{selectedItem.name}</div>
                <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                  <span style={{ padding:'2px 8px',background:typeColor[selectedItem.type]||'#333',color:'#0A0A12',fontSize:9,fontWeight:700,textTransform:'uppercase',borderRadius:2 }}>{selectedItem.type}</span>
                  {selectedItem.value > 0 && <span style={{ fontSize:10,color:'#E8C97A' }}>{selectedItem.value} cr</span>}
                  {selectedItem.qty > 1 && <span style={{ fontSize:10,color:'#6A6F84' }}>qty: {selectedItem.qty}</span>}
                </div>
                <div style={{ fontSize:12,color:'#A8ADC0',lineHeight:1.7,borderTop:'1px solid #1C1C26',paddingTop:10 }}>{selectedItem.description}</div>
                <div style={{ marginTop:'auto',fontSize:10,color:'#4ACDFF88' }}>Click a story slot above to equip.</div>
              </>
            ) : (
              <div style={{ color:'#5A5F74',fontSize:11,marginTop:40,textAlign:'center' }}>Select an item to view details.</div>
            )}
          </div>
        </div>
        <div style={{ padding:'8px 18px',borderTop:'1px solid #1C1C26',fontSize:9,color:'#5A5F74' }}>[I] or [ESC] to close</div>
      </div>
    </div>
  );
}

function CodexOverlay({ codex, setCodex, onClose }) {
  const [activeTab, setActiveTab] = React.useState('story');
  const [selectedEntry, setSelectedEntry] = React.useState(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === 'c' || e.key === 'C' || e.key === 'Escape') {
        setCodex(prev => prev.map(en => ({ ...en, unread: false })));
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, setCodex]);

  const TABS = ['story', 'lore', 'dossier', 'factions'];
  const tabColor = { story:'#E8C97A', lore:'#8FA6FF', dossier:'#6FD9A0', factions:'#FF8C42' };
  const filtered = codex.filter(en => en.category === activeTab);

  return (
    <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:28 }}>
      <div style={{ width:'min(96%,740px)',border:'1px solid #2A2A38',background:'#0A0A12',fontFamily:"'IBM Plex Mono',ui-monospace,monospace",maxHeight:'90vh',display:'flex',flexDirection:'column' }}>
        <div style={{ padding:'12px 18px',borderBottom:'1px solid #2A2A38',color:'#E8C97A',fontSize:12,fontWeight:600,letterSpacing:'0.1em' }}>HOLONET DATAPAD — DECLASSIFIED ARCHIVES</div>
        <div style={{ display:'flex',flex:1,overflow:'hidden' }}>
          <div style={{ width:240,borderRight:'1px solid #1C1C26',display:'flex',flexDirection:'column' }}>
            <div style={{ display:'flex',borderBottom:'1px solid #1C1C26' }}>
              {TABS.map(tab => (
                <div key={tab} onClick={() => { setActiveTab(tab); setSelectedEntry(null); }}
                  style={{ flex:1,padding:'8px 4px',textAlign:'center',fontSize:9,textTransform:'uppercase',cursor:'pointer',color:activeTab===tab?tabColor[tab]:'#5A5F74',borderBottom:activeTab===tab?`2px solid ${tabColor[tab]}`:'2px solid transparent' }}>{tab}</div>
              ))}
            </div>
            <div style={{ flex:1,overflowY:'auto',padding:6 }}>
              {filtered.length === 0 && <div style={{ color:'#3A3F54',fontSize:10,padding:8 }}>No entries.</div>}
              {filtered.map(entry => (
                <div key={entry.id} onClick={() => setSelectedEntry(entry)}
                  style={{ padding:'8px 10px',borderBottom:'1px solid #14141E',cursor:'pointer',background:selectedEntry?.id===entry.id?'#141420':'transparent',display:'flex',alignItems:'center',gap:6 }}>
                  {entry.unread && <div style={{ width:6,height:6,borderRadius:'50%',background:'#E8C97A',flexShrink:0 }} />}
                  <div>
                    <div style={{ fontSize:11,color:selectedEntry?.id===entry.id?tabColor[entry.category]:'#A8ADC0' }}>{entry.title}</div>
                    <div style={{ fontSize:9,color:'#5A5F74',marginTop:2 }}>{entry.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex:1,padding:16,overflowY:'auto' }}>
            {selectedEntry ? (
              <>
                <div style={{ color:tabColor[selectedEntry.category],fontSize:14,fontWeight:600,marginBottom:6 }}>{selectedEntry.title}</div>
                <div style={{ display:'inline-block',padding:'2px 8px',background:tabColor[selectedEntry.category]+'22',border:`1px solid ${tabColor[selectedEntry.category]}44`,color:tabColor[selectedEntry.category],fontSize:9,textTransform:'uppercase',marginBottom:12,borderRadius:2 }}>{selectedEntry.category}</div>
                {selectedEntry.body.map((para, i) => (
                  <div key={i} style={{ fontSize:12,color:'#A8ADC0',lineHeight:1.8,marginBottom:12 }}>{para}</div>
                ))}
              </>
            ) : (
              <div style={{ color:'#5A5F74',fontSize:11,marginTop:40,textAlign:'center' }}>Select an entry to read.</div>
            )}
          </div>
        </div>
        <div style={{ padding:'8px 18px',borderTop:'1px solid #1C1C26',fontSize:9,color:'#5A5F74' }}>[C] or [ESC] to close</div>
      </div>
    </div>
  );
}

function resolveDialoguePhase(npc, questFlags) {
  if (!npc.phases || npc.phases.length === 0) return npc;
  let active = npc.phases[0];
  for (const phase of npc.phases) {
    const allMet = (phase.requiresAllFlags || []).every(f => questFlags[f]);
    const noneMet = !(phase.requiresNoneFlags || []).some(f => questFlags[f]);
    const anyMet = !phase.requiresAnyFlag || phase.requiresAnyFlag.some(f => questFlags[f]);
    if (allMet && noneMet && anyMet) active = phase;
  }
  return {
    ...npc,
    prompt: active.prompt ?? npc.prompt,
    choices: active.choices ?? npc.choices,
    repeatPrompt: active.repeatPrompt ?? npc.repeatPrompt,
    _activePhaseId: active.id,
  };
}

function SignalSiphonOverlay({ onSuccess, onFailure }) {
  const [stage, setStage] = React.useState(1);
  const [selectedFreq, setSelectedFreq] = React.useState(null);
  const [gridPos, setGridPos] = React.useState({ x: 0, y: 0 });
  const [timeLeft, setTimeLeft] = React.useState(20);
  const [message, setMessage] = React.useState('');
  const timerRef = React.useRef(null);
  const FREQS = ['108.4 MHz', '114.8 MHz', '121.3 MHz'];
  const CORRECT_FREQ = '114.8 MHz';
  const BLOCKED = [[0,2],[2,0],[2,3]];
  const isBlocked = (x, y) => BLOCKED.some(([bx, by]) => bx === x && by === y);

  React.useEffect(() => {
    if (stage !== 2) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); onFailure(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [stage]);

  const handleFreqSelect = (freq) => {
    if (selectedFreq) return;
    setSelectedFreq(freq);
    if (freq === CORRECT_FREQ) {
      setMessage('Signal locked. Bypass grid initializing...');
      setTimeout(() => setStage(2), 900);
    } else {
      setMessage('Frequency mismatch. Security ping detected.');
      setTimeout(onFailure, 1200);
    }
  };

  React.useEffect(() => {
    if (stage !== 2) return;
    const handler = (e) => {
      e.preventDefault();
      setGridPos(prev => {
        let { x, y } = prev;
        if (e.key === 'ArrowUp' && y > 0 && !isBlocked(x, y - 1)) y -= 1;
        else if (e.key === 'ArrowDown' && y < 3 && !isBlocked(x, y + 1)) y += 1;
        else if (e.key === 'ArrowLeft' && x > 0 && !isBlocked(x - 1, y)) x -= 1;
        else if (e.key === 'ArrowRight' && x < 3 && !isBlocked(x + 1, y)) x += 1;
        if (x === 3 && y === 3) { clearInterval(timerRef.current); setTimeout(onSuccess, 200); }
        return { x, y };
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stage]);

  const ov = { position:'fixed', inset:0, background:'rgba(0,0,0,0.93)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:50 };
  const pan = { background:'#080C14', border:'1px solid #4A9FFF', borderRadius:6, padding:28, minWidth:360, color:'#C9C5BE', fontFamily:"'IBM Plex Mono',monospace" };

  if (stage === 1) return (
    <div style={ov}>
      <div style={pan}>
        <div style={{ color:'#4A9FFF', fontSize:13, letterSpacing:'0.15em', marginBottom:18 }}>SIGNAL SIPHON — FREQUENCY LOCK</div>
        <div style={{ fontSize:11, color:'#8A8F9E', marginBottom:18 }}>Select the active customs uplink frequency.</div>
        {FREQS.map(f => (
          <div key={f} onClick={() => handleFreqSelect(f)} style={{ padding:'10px 16px', margin:'6px 0', background:'#101828', border:`1px solid ${selectedFreq===f?'#4A9FFF':'#2A3050'}`, borderRadius:4, cursor:'pointer', color: selectedFreq===f?'#4A9FFF':'#C9C5BE', transition:'border-color 0.2s' }}>
            {f}
          </div>
        ))}
        {message && <div style={{ marginTop:14, color:'#FF6060', fontSize:11 }}>{message}</div>}
        <div style={{ marginTop:18, fontSize:10, color:'#404858' }}>Click to select</div>
      </div>
    </div>
  );

  return (
    <div style={ov}>
      <div style={pan}>
        <div style={{ color:'#4A9FFF', fontSize:13, letterSpacing:'0.15em', marginBottom:8 }}>BYPASS GRID — REACH TARGET</div>
        <div style={{ fontSize:11, color:'#8A8F9E', marginBottom:6 }}>Arrow keys to move. Avoid [X] nodes. Reach [T].</div>
        <div style={{ fontSize:11, color:'#E8C97A', marginBottom:14 }}>TIME: {timeLeft}s</div>
        {[0,1,2,3].map(row => (
          <div key={row} style={{ display:'flex', gap:6, marginBottom:6 }}>
            {[0,1,2,3].map(col => {
              const isPlayer = gridPos.x === col && gridPos.y === row;
              const isTarget = col === 3 && row === 3;
              const blocked = isBlocked(col, row);
              return (
                <div key={col} style={{ width:52, height:52, border:'1px solid', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, borderColor: blocked?'#442020':isTarget?'#E8C97A':'#2A3050', background: isPlayer?'#1A3A5A':blocked?'#1A0808':isTarget?'#2A2408':'#0E1220', color: isPlayer?'#4A9FFF':isTarget?'#E8C97A':blocked?'#442020':'#6A7090', fontWeight: isPlayer||isTarget?700:400 }}>
                  {isPlayer ? 'S' : isTarget ? 'T' : blocked ? 'X' : col===0&&row===0&&!isPlayer ? '·' : '·'}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop:10, fontSize:10, color:'#404858' }}>Arrow keys · Reach T to complete</div>
      </div>
    </div>
  );
}

function SpeederPursuitOverlay({ onSuccess, onFailure }) {
  const gameRef = React.useRef({ lane: 1, distance: 300, shield: 3, turbo: 100, heat: 0, phase: 1, obstacles: [], running: true, tickCount: 0 });
  const [display, setDisplay] = React.useState({ lane: 1, distance: 300, shield: 3, turbo: 100, phase: 1, obstacles: [], message: '' });
  const intervalRef = React.useRef(null);
  const LANE_NAMES = ['LEFT', 'CENTER', 'RIGHT'];
  const OBS_TYPES = ['freighter', 'laser_gate', 'swoop'];

  React.useEffect(() => {
    intervalRef.current = setInterval(() => {
      const g = gameRef.current;
      if (!g.running) return;
      g.tickCount++;
      g.distance = Math.max(0, g.distance - 2);
      if (g.tickCount % (g.phase === 3 ? 12 : g.phase === 2 ? 15 : 20) === 0) {
        const type = OBS_TYPES[Math.floor(Math.random() * OBS_TYPES.length)];
        g.obstacles = [...g.obstacles, { type, lane: Math.floor(Math.random() * 3), pos: 12 }];
      }
      g.obstacles = g.obstacles.map(o => ({ ...o, pos: o.pos - 1 }));
      let message = '';
      const colliders = g.obstacles.filter(o => o.pos <= 1 && o.lane === g.lane);
      colliders.forEach(o => {
        if (o.type === 'freighter') { g.turbo = Math.min(100, g.turbo + 20); message = 'Drafting freighter — turbo charge!'; }
        else if (o.type === 'laser_gate') { g.shield--; message = 'Laser gate hit! Shield down.'; }
        else if (o.type === 'swoop') { g.shield--; message = 'Swoop impact! Shield down.'; }
      });
      g.obstacles = g.obstacles.filter(o => o.pos > 1 || o.lane !== g.lane);
      if (g.distance <= 200 && g.phase < 2) { g.phase = 2; message = 'PHASE 2: pursuit intensifying.'; }
      if (g.distance <= 100 && g.phase < 3) { g.phase = 3; message = 'PHASE 3: final stretch!'; }
      if (g.shield <= 0) { g.running = false; clearInterval(intervalRef.current); setDisplay(d => ({ ...d, shield: 0, message: 'Shield depleted. Pursuit failed.' })); setTimeout(onFailure, 1400); return; }
      if (g.distance <= 0) { g.running = false; clearInterval(intervalRef.current); setDisplay(d => ({ ...d, distance: 0, message: 'Target distance reached!' })); setTimeout(onSuccess, 900); return; }
      setDisplay({ lane: g.lane, distance: g.distance, shield: g.shield, turbo: Math.round(g.turbo), phase: g.phase, obstacles: [...g.obstacles], message });
    }, 60);
    return () => clearInterval(intervalRef.current);
  }, []);

  React.useEffect(() => {
    const handler = (e) => {
      const g = gameRef.current;
      if (!g.running) return;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') { g.lane = Math.max(0, g.lane - 1); e.preventDefault(); }
      else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { g.lane = Math.min(2, g.lane + 1); e.preventDefault(); }
      else if (e.key === ' ') { if (g.turbo >= 50) { g.turbo -= 50; g.distance = Math.max(0, g.distance - 30); } e.preventDefault(); }
      else if (e.key === 'e' || e.key === 'E') { g.obstacles = g.obstacles.filter(o => !(o.type === 'swoop' && o.lane === g.lane)); e.preventDefault(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const ov = { position:'fixed', inset:0, background:'rgba(0,0,0,0.93)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:50 };
  const pan = { background:'#080604', border:'1px solid #FF6030', borderRadius:6, padding:24, minWidth:420, color:'#C9C5BE', fontFamily:"'IBM Plex Mono',monospace" };

  const shieldBar = display.shield > 0 ? '█'.repeat(display.shield) + '░'.repeat(Math.max(0, 3 - display.shield)) : '░░░';

  return (
    <div style={ov}>
      <div style={pan}>
        <div style={{ color:'#FF6030', fontSize:13, letterSpacing:'0.15em', marginBottom:8 }}>SPEEDER PURSUIT — PHASE {display.phase}</div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#8A8F9E', marginBottom:14 }}>
          <span>DIST: <span style={{ color:'#E8C97A' }}>{display.distance}</span></span>
          <span>SHIELD: [{shieldBar}]</span>
          <span>TURBO: {display.turbo}%</span>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {LANE_NAMES.map((lname, i) => {
            const obsInLane = display.obstacles.filter(o => o.lane === i);
            const isPlayer = display.lane === i;
            return (
              <div key={i} style={{ flex:1, height:110, background: isPlayer?'#1A1006':'#080604', border:`1px solid ${isPlayer?'#FF6030':'#2A1A10'}`, borderRadius:4, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'4px 6px', position:'relative', overflow:'hidden' }}>
                {obsInLane.map((o, idx) => (
                  <div key={idx} style={{ position:'absolute', top:`${Math.max(2, Math.min(85, (12-o.pos)/12*100))}%`, left:4, right:4, height:14, background: o.type==='freighter'?'#303030':o.type==='laser_gate'?'#6000C0':'#C02020', borderRadius:2, fontSize:9, color:'#DDD', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {o.type==='freighter'?'■':o.type==='laser_gate'?'⚡':'◆'}
                  </div>
                ))}
                <div style={{ fontSize:16, color: isPlayer?'#FF6030':'#3A2010', textAlign:'center' }}>▲</div>
                <div style={{ fontSize:8, color:'#5A3020', textAlign:'center', marginTop:1 }}>{lname}</div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize:11, color:'#E8C97A', minHeight:16, marginBottom:8 }}>{display.message}</div>
        <div style={{ fontSize:10, color:'#4A3020' }}>A/D: lane · Space: turbo burst · E: EMP swoop</div>
      </div>
    </div>
  );
}

function ValveOverrideOverlay({ onSuccess, onFailure }) {
  const [pressure, setPressure] = React.useState(50);
  const [target] = React.useState(() => 65 + Math.floor(Math.random() * 20));
  const [timeLeft, setTimeLeft] = React.useState(8);
  const [locked, setLocked] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const lockedRef = React.useRef(false);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); if (!lockedRef.current) onFailure(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const handler = (e) => {
      if (lockedRef.current) return;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') { setPressure(p => Math.max(0, p - 5)); e.preventDefault(); }
      else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { setPressure(p => Math.min(100, p + 5)); e.preventDefault(); }
      else if (e.key === ' ' || e.key === 'Enter') {
        if (lockedRef.current) return;
        lockedRef.current = true;
        setLocked(true);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  React.useEffect(() => {
    if (!locked) return;
    const diff = Math.abs(pressure - target);
    if (diff <= 8) { setMessage('Pressure stabilized. Valve locked.'); setTimeout(onSuccess, 1000); }
    else { setMessage(`Off by ${diff} units. Pressure spike detected.`); setTimeout(onFailure, 1200); }
  }, [locked]);

  const ov = { position:'fixed', inset:0, background:'rgba(0,0,0,0.93)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:50 };
  const pan = { background:'#080402', border:'1px solid #FF4444', borderRadius:6, padding:28, minWidth:360, color:'#C9C5BE', fontFamily:"'IBM Plex Mono',monospace" };
  const barPct = pressure;
  const tStart = Math.max(0, target - 8);
  const inZone = Math.abs(pressure - target) <= 8;

  return (
    <div style={ov}>
      <div style={pan}>
        <div style={{ color:'#FF4444', fontSize:13, letterSpacing:'0.15em', marginBottom:8 }}>PRESSURE VALVE OVERRIDE</div>
        <div style={{ fontSize:11, color:'#8A8F9E', marginBottom:16 }}>Match pressure to the green target zone, then lock. Timer: {timeLeft}s</div>
        <div style={{ position:'relative', height:36, background:'#160604', borderRadius:4, marginBottom:8, overflow:'hidden', border:'1px solid #3A1010' }}>
          <div style={{ position:'absolute', left:`${tStart}%`, width:'16%', height:'100%', background:'rgba(60,180,60,0.2)', borderLeft:'2px solid #40C040', borderRight:'2px solid #40C040' }} />
          <div style={{ position:'absolute', left:`${barPct}%`, top:0, bottom:0, width:4, background: inZone?'#40C040':'#FF4444', transform:'translateX(-50%)', transition:'left 0.1s, background 0.2s', borderRadius:2 }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:16 }}>
          <span style={{ color:'#604040' }}>0</span>
          <span>PRESSURE: <span style={{ color: inZone?'#40C040':'#FF6060', fontWeight:700 }}>{pressure}</span></span>
          <span style={{ color:'#604040' }}>100</span>
        </div>
        {message && <div style={{ fontSize:11, color: message.includes('stabilized')?'#40C040':'#FF6060', marginBottom:10 }}>{message}</div>}
        <div style={{ fontSize:10, color:'#503030' }}>A/D: adjust · Space or Enter: lock</div>
      </div>
    </div>
  );
}

function isNpcVisible(npc, questFlags) {
  if (npc.hideAfterFlags && npc.hideAfterFlags.some(f => questFlags[f])) return false;
  if (npc.requiresFlag && !questFlags[npc.requiresFlag]) return false;
  return true;
}

const ZONE_ARCHETYPE_PROFILES = {
  exterior: {
    ambient: 'traffic',
    decor: ['cargo_crate', 'pipe', 'neon_sign', 'girder'],
    floorColor: '#1A1C2A', floorAlt: '#222438',
    wallDark: '#0C0D16', wallLight: '#181A28',
    accent: '#8FA6FF', accentGlow: 'rgba(143,166,255,0.18)', accentDim: '#3A4880',
    bg: 'radial-gradient(circle at 50% 10%, #141628 0%, #080A14 70%)',
  },
  interior_cantina: {
    ambient: 'neon_haze',
    decor: ['neon_sign', 'brazier', 'pillar', 'neon_sign'],
    floorColor: '#1A0C14', floorAlt: '#22101C',
    wallDark: '#0C0608', wallLight: '#180C10',
    accent: '#FF0055', accentGlow: 'rgba(255,0,85,0.22)', accentDim: '#660022',
    bg: 'radial-gradient(circle at 50% 40%, #1A080E 0%, #080406 70%)',
  },
  interior_slicer: {
    ambient: 'datastream',
    decor: ['archive', 'pipe', 'neon_sign', 'cable_bundle'],
    floorColor: '#080E0E', floorAlt: '#0C1414',
    wallDark: '#040808', wallLight: '#0C1010',
    accent: '#00F0FF', accentGlow: 'rgba(0,240,255,0.20)', accentDim: '#005060',
    bg: 'radial-gradient(circle at 30% 60%, #060E0E 0%, #040808 70%)',
  },
  interior_csf: {
    ambient: 'traffic',
    decor: ['pillar', 'archive', 'scan_arch'],
    floorColor: '#181C28', floorAlt: '#1E2430',
    wallDark: '#0A0C14', wallLight: '#141820',
    accent: '#4A9FFF', accentGlow: 'rgba(74,159,255,0.20)', accentDim: '#1A4A80',
    bg: 'radial-gradient(circle at 50% 30%, #10182A 0%, #080C14 70%)',
  },
  interior_warehouse: {
    ambient: 'steam',
    decor: ['cargo_crate', 'girder', 'pipe', 'warning_beacon', 'slag'],
    floorColor: '#1C1A14', floorAlt: '#24221A',
    wallDark: '#0A0902', wallLight: '#161408',
    accent: '#FF9900', accentGlow: 'rgba(255,153,0,0.18)', accentDim: '#804800',
    bg: 'radial-gradient(circle at 30% 70%, #181410 0%, #08070A 70%)',
  },
  interior_generic: {
    ambient: 'mist',
    decor: ['archive', 'pipe', 'cargo_crate'],
    floorColor: '#191E30', floorAlt: '#1E2438',
    wallDark: '#0A0C14', wallLight: '#141820',
    accent: '#7AB8E0', accentGlow: 'rgba(122,184,224,0.18)', accentDim: '#2A5870',
    bg: 'radial-gradient(circle at 50% 50%, #141828 0%, #080A14 70%)',
  },
};

function StarWarsRPG() {
  const [planetId, setPlanetId] = useState('coruscant');
  const [zoneId, setZoneId] = useState('spaceport');

  const zone = PLANETS[planetId].zones[zoneId];

  const [map, setMap] = useState(() => PLANETS.coruscant.zones.spaceport.buildMap());
  const [pos, setPos] = useState({ x: 14, y: 10 });
  const [facing, setFacing] = useState(1);
  const [credits, setCredits] = useState(340);
  const [inventory, setInventory] = useState([
    { id: 'comlink',       name: 'Comlink',       type: 'gear',       iconKind: 'tool',   qty: 1, value: 0,  description: "Standard-issue encrypted comlink. Jon's frequency is already stored." },
    { id: 'field_rations', name: 'Field Rations', type: 'consumable', iconKind: 'supply', qty: 2, value: 5,  description: 'Compressed nutrient bars. Tasteless. Effective.' },
  ]);
  const [codex, setCodex] = useState([]);
  const [showInventory, setShowInventory] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [collectedItems, setCollectedItems] = useState(() => new Set());
  const [completedInteractions, setCompletedInteractions] = useState(() => new Set());
  const [alignment, setAlignment] = useState({ morality: 0, loyalty: { republic: 0, sithEmpire: 0, underworld: 0 } });
  const [showTravel, setShowTravel] = useState(false);
  const [activeDialogue, setActiveDialogue] = useState(null);
  const [actionLog, setActionLog] = useState([{ text: 'Docked at Coruscant Spaceport, Subsurface Level 2. Your contact Jon is supposed to be waiting near Docking Bay 14.', zone: 'spaceport' }]);
  const [transitioning, setTransitioning] = useState(false);
  const [questFlags, setQuestFlags] = useState({});
  const [showSpeeder, setShowSpeeder] = useState(false);
  const [npcPositions, setNpcPositions] = useState({});
  const [suspicionMeter, setSuspicionMeter] = useState(0);
  const [choiceFeedback, setChoiceFeedback] = useState(null);
  const [activeMinigame, setActiveMinigame] = useState(null);
  const posRef = React.useRef(pos);
  const questFlagsRef = React.useRef(questFlags);

  const worldState = React.useMemo(() => {
    const repTotal = (questFlags.csf_duty_stance ? 1 : 0) + (questFlags.jaxxon_arrested ? 1 : 0)
      + (questFlags.vane_record_commend ? 1 : 0) + (questFlags.jon_gone_straight_warned ? 1 : 0);
    const uwTotal = (questFlags.inside_man_path ? 1 : 0) + (questFlags.jaxxon_deal ? 1 : 0)
      + (questFlags.rook_eliminated ? 1 : 0) + (questFlags.marlo_sky_talked ? 1 : 0);
    if (repTotal > uwTotal) return 'lawful';
    if (uwTotal > repTotal) return 'underworld';
    return 'neutral';
  }, [questFlags]);

  const currentObjective = React.useMemo(() => {
    if (questFlags.senate_line_secured) return 'Arc complete. Return to the CSF Academy.';
    if (questFlags.bomb_reached) return 'Neutralize the weapon on the Senate transit line.';
    if (questFlags.sector4_raid_complete && !questFlags.jon_endgame_known) return 'Debrief Jon on the raid. He has intel on the Senate connection you need.';
    if (questFlags.sector4_raid_complete) return 'Pursue the Iron Syndicate to Level 005. Find Vex.';
    if (questFlags.csf_briefed && !questFlags.jon_confrontation_done) return 'Jon needs to see your CSF badge. Return to his apartment now.';
    if (questFlags.csf_training_complete) return 'Report to Vane at Sector 4 Freight Hub.';
    if (questFlags.csf_briefed) return 'Complete all three training modules at the CSF Academy.';
    if ((questFlags.marlo_sky_talked || questFlags.vane_sky_cooperated) && !questFlags.jon_sky_market_debriefed) return 'Check in with Jon. He will want to know which side you picked at the Sky-Market.';
    if (questFlags.republic_path_open) return 'Travel to CSF Tactical Command, Level 1222.';
    if (questFlags.marlo_sky_talked) return 'Follow the Phrik trail to Level 005. Reach The Works.';
    if (questFlags.marlo_sky_intro || questFlags.vane_sky_intro) return 'Return to Sky-Market District with evidence from Bay 14.';
    if (questFlags.freight_hub_investigated && !questFlags.jon_bay14_briefed) return 'Report to Jon at his apartment. He needs to know what you found at Bay 14.';
    if (questFlags.met_jon_spaceport) return 'Locate the Scylla Freight manifest. Start at Docking Bay 14.';
    return 'Find your contact Jon at Coruscant Spaceport, Docking Bay 14.';
  }, [questFlags]);

  const pushActionLog = useCallback((msg, zoneLabel) => {
    setActionLog((prev) => [{ text: msg, zone: zoneLabel || '' }, ...prev.slice(0, 49)]);
  }, []);

  const setFlag = useCallback((key) => setQuestFlags((prev) => ({ ...prev, [key]: true })), []);

  const addItem = useCallback((itemDef) => setInventory(prev => {
    const ex = prev.find(i => i.id === itemDef.id);
    if (ex) return prev.map(i => i.id === itemDef.id ? { ...i, qty: (i.qty || 1) + 1 } : i);
    return [...prev, { ...itemDef, qty: 1 }];
  }), []);

  const unlockCodex = useCallback((entry) => setCodex(prev => {
    if (prev.find(e => e.id === entry.id)) return prev;
    return [...prev, { ...entry, unread: true }];
  }), []);

  const travelToZone = useCallback((targetZoneId, targetPos) => {
    setTransitioning(true);
    setTimeout(() => {
      const newZone = PLANETS[planetId].zones[targetZoneId];
      setZoneId(targetZoneId);
      setMap(newZone.buildMap());
      setPos(targetPos);
      setTransitioning(false);
      pushActionLog(`Entered ${newZone.name}.`, targetZoneId);
    }, 400);
  }, [planetId, pushActionLog]);

  const travelToPlanet = useCallback((destPlanetId) => {
    const destPlanet = PLANETS[destPlanetId];
    const destZone = destPlanet.zones[destPlanet.startZoneId];
    setTransitioning(true);
    pushActionLog(`Jumping to hyperspace: ${destPlanet.name}...`, zoneId);
    setCredits((c) => c - destPlanet.travelCost);
    setTimeout(() => {
      setPlanetId(destPlanetId);
      setZoneId(destPlanet.startZoneId);
      setMap(destZone.buildMap());
      setPos(destZone.spawnPos);
      setShowTravel(false);
      setTransitioning(false);
      pushActionLog(`Arrived at ${destPlanet.name}. ${destPlanet.description}`, destPlanet.startZoneId);
    }, 650);
  }, [zoneId, pushActionLog]);

  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => { questFlagsRef.current = questFlags; }, [questFlags]);
  useEffect(() => { setNpcPositions({}); }, [zoneId]);
  useEffect(() => {
    const tickId = setInterval(() => {
      setNpcPositions((prev) => {
        const next = { ...prev };
        const playerPos = posRef.current;
        zone.npcs?.filter(npc => isNpcVisible(npc, questFlagsRef.current || {})).forEach((npc) => {
          if (!npc.mobile) return;
          const cur = prev[npc.id] || { x: npc.x, y: npc.y };
          const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
          dirs.sort(() => Math.random() - 0.5);
          for (const { dx, dy } of dirs) {
            const nx = cur.x + dx, ny = cur.y + dy;
            const tile = map[ny]?.[nx];
            if (!tile || tile.type !== 'floor') continue;
            if (nx === playerPos.x && ny === playerPos.y) continue;
            const occupied = zone.npcs.some((n) => {
              if (n.id === npc.id) return false;
              const np = prev[n.id] || { x: n.x, y: n.y };
              return np.x === nx && np.y === ny;
            });
            if (occupied) continue;
            next[npc.id] = { x: nx, y: ny };
            break;
          }
        });
        return next;
      });
    }, 1500);
    return () => clearInterval(tickId);
  }, [zone, map]);

  const resolveChoice = useCallback((choice, npcId) => {
    setCompletedInteractions((prev) => new Set([...prev, npcId]));
    const moralityDelta = choice.morality || 0;
    const loyaltyDeltas = choice.loyalty || {};
    setAlignment((prev) => ({
      morality: Math.max(-100, Math.min(100, prev.morality + moralityDelta)),
      loyalty: {
        republic: Math.max(0, Math.min(100, prev.loyalty.republic + (loyaltyDeltas.republic || 0))),
        sithEmpire: Math.max(0, Math.min(100, prev.loyalty.sithEmpire + (loyaltyDeltas.sithEmpire || 0))),
        underworld: Math.max(0, Math.min(100, prev.loyalty.underworld + (loyaltyDeltas.underworld || 0))),
      },
    }));
    const feedbackParts = [];
    if (moralityDelta > 0) feedbackParts.push(`+${moralityDelta} LIGHT`);
    else if (moralityDelta < 0) feedbackParts.push(`${moralityDelta} DARK`);
    if (loyaltyDeltas.republic) feedbackParts.push(`${loyaltyDeltas.republic > 0 ? '+' : ''}${loyaltyDeltas.republic} REPUBLIC`);
    if (loyaltyDeltas.underworld) feedbackParts.push(`${loyaltyDeltas.underworld > 0 ? '+' : ''}${loyaltyDeltas.underworld} UNDERWORLD`);
    if (feedbackParts.length > 0) {
      setChoiceFeedback(feedbackParts.join('  '));
      setTimeout(() => setChoiceFeedback(null), 2800);
    }
    if (choice.grants?.credits) setCredits((c) => c + choice.grants.credits);
    if (choice.grants?.flags) {
      choice.grants.flags.forEach((f) => {
        setFlag(f);
        if (f === 'deceiver_path') setSuspicionMeter(prev => Math.min(100, prev + 25));
        if (f === 'vane_suspicious_raised') setSuspicionMeter(prev => Math.min(100, prev + 20));
        if (f === 'jaxxon_deal') setSuspicionMeter(prev => Math.min(100, prev + 30));
      });
    }
    if (choice.grants?.items) choice.grants.items.forEach(id => { if (ITEMS[id]) addItem(ITEMS[id]); });
    if (choice.grants?.codex) choice.grants.codex.forEach(id => { if (CODEX_ENTRIES[id]) unlockCodex(CODEX_ENTRIES[id]); });
    pushActionLog(choice.result, zoneId);
    setActiveDialogue(null);
  }, [zoneId, pushActionLog, setFlag, addItem, unlockCodex]);

  useEffect(() => {
    const handleKey = (e) => {
      if (showTravel || activeDialogue || transitioning || showSpeeder || showInventory || showCodex || activeMinigame) return;
      if (e.key === 'i' || e.key === 'I') { setShowInventory(v => !v); return; }
      if (e.key === 'c' || e.key === 'C') { setShowCodex(v => !v); return; }
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
      if (!tile || tile.type === 'wall') { pushActionLog('Blocked.', zoneId); return; }
      if (tile.type === 'ship_hull') { pushActionLog('The hull plating is solid. No way through.', zoneId); return; }
      if (tile.type === 'lava') { pushActionLog('The lava channels are impassable. You can feel the heat from here.', zoneId); return; }
      if (tile.type === 'water') { pushActionLog('The water runs too deep to wade through.', zoneId); return; }
      if (tile.type === 'ship_ramp') { setShowTravel(true); return; }
      if (tile.type === 'door') {
        const door = zone.doors.find(d => d.x === x && d.y === y);
        if (door) { travelToZone(door.targetZone, door.targetPos); return; }
      }

      const npcHere = zone.npcs?.filter(n => isNpcVisible(n, questFlags)).find((n) => {
        const p = npcPositions[n.id] || { x: n.x, y: n.y };
        return p.x === x && p.y === y;
      });
      if (npcHere) {
        if (npcHere.triggersOverlay === 'speeder') {
          if (!questFlags.speeder_transit_unlocked) { pushActionLog('RESTRICTED TRANSIT: Sector clearance pass required.', zoneId); setPos({ x, y }); return; }
          setShowSpeeder(true); setPos({ x, y }); return;
        }
        const resolvedNpc = resolveDialoguePhase(npcHere, questFlags);
        const interactionKey = resolvedNpc._activePhaseId
          ? resolvedNpc.id + ':' + resolvedNpc._activePhaseId
          : resolvedNpc.id;
        if (completedInteractions.has(interactionKey) && !resolvedNpc.repeatable) {
          pushActionLog(resolvedNpc.repeatPrompt || `${resolvedNpc.label} nods but says nothing new.`, zoneId);
          return;
        }
        setCompletedInteractions((prev) => new Set([...prev, interactionKey]));
        setActiveDialogue(resolvedNpc);
        return;
      }

      const worldObjHere = zone.worldObjects?.find(wo => wo.x === x && wo.y === y);
      if (worldObjHere) {
        if (worldObjHere.id.startsWith('airtaxi_')) {
          if (!questFlags.speeder_transit_unlocked) { pushActionLog('RESTRICTED TRANSIT: Sector clearance pass required.', zoneId); setPos({ x, y }); return; }
          setShowSpeeder(true); setPos({ x, y }); return;
        }
        const alreadySeen = worldObjHere.once && completedInteractions.has(worldObjHere.id);
        if (!alreadySeen) {
          const woDesc = worldObjHere.worldStateVariant?.[worldState] ?? worldObjHere.description;
          pushActionLog(`[${worldObjHere.label}] ${woDesc}`, zoneId);
          if (worldObjHere.grantsItem && ITEMS[worldObjHere.grantsItem]) {
            addItem(ITEMS[worldObjHere.grantsItem]);
            pushActionLog(`Acquired: ${ITEMS[worldObjHere.grantsItem].name}`, zoneId);
          }
          if (worldObjHere.triggersMinigame && !completedInteractions.has(worldObjHere.id)) {
            const successCb = () => {
              if (worldObjHere.grantsFlag) setFlag(worldObjHere.grantsFlag);
              if (worldObjHere.grantsItem && ITEMS[worldObjHere.grantsItem]) { addItem(ITEMS[worldObjHere.grantsItem]); pushActionLog(`Acquired: ${ITEMS[worldObjHere.grantsItem].name}`, zoneId); }
              if (worldObjHere.grantsCodex && CODEX_ENTRIES[worldObjHere.grantsCodex]) unlockCodex(CODEX_ENTRIES[worldObjHere.grantsCodex]);
              if (worldObjHere.once) setCompletedInteractions(prev => new Set([...prev, worldObjHere.id]));
              pushActionLog(`[${worldObjHere.label}] Override successful.`, zoneId);
              setActiveMinigame(null);
            };
            const failCb = () => {
              pushActionLog(`[${worldObjHere.label}] Attempt failed. Security alert triggered.`, zoneId);
              setActiveMinigame(null);
            };
            setActiveMinigame({ type: worldObjHere.triggersMinigame, context: worldObjHere, onSuccess: successCb, onFailure: failCb });
            setPos({ x, y });
            return;
          }
          if (worldObjHere.grantsCodex && CODEX_ENTRIES[worldObjHere.grantsCodex]) unlockCodex(CODEX_ENTRIES[worldObjHere.grantsCodex]);
          if (worldObjHere.grantsFlag) setFlag(worldObjHere.grantsFlag);
          if (worldObjHere.once) setCompletedInteractions((prev) => new Set([...prev, worldObjHere.id]));
        }
        setPos({ x, y });
        return;
      }

      const collectible = zone.collectibles?.find(c => c.x === x && c.y === y && !collectedItems.has(c.id));
      if (collectible) {
        if (collectible.reward > 0) setCredits((c) => c + collectible.reward);
        setCollectedItems((prev) => new Set([...prev, collectible.id]));
        if (collectible.grantsItem && ITEMS[collectible.grantsItem]) { addItem(ITEMS[collectible.grantsItem]); pushActionLog(`${collectible.label}. Acquired: ${ITEMS[collectible.grantsItem].name}`, zoneId); }
        else pushActionLog(`${collectible.label}.${collectible.reward > 0 ? ` (+${collectible.reward} credits)` : ''}`, zoneId);
      }

      setPos({ x, y });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pos, map, zone, zoneId, facing, showTravel, activeDialogue, transitioning, showSpeeder, showInventory, showCodex, activeMinigame, questFlags, npcPositions, collectedItems, completedInteractions, pushActionLog, travelToZone, addItem, unlockCodex, setFlag]);

  const camX = Math.max(0, Math.min(zone.width - VIEWPORT_COLS, pos.x - Math.floor(VIEWPORT_COLS / 2)));
  const camY = Math.max(0, Math.min(zone.height - VIEWPORT_ROWS, pos.y - Math.floor(VIEWPORT_ROWS / 2)));

  return (
    <div style={{ minHeight:'100vh',background:zone.bg,color:'#C9C5BE',fontFamily:"'IBM Plex Mono',ui-monospace,monospace",display:'flex',flexDirection:'column',gap:10,padding:'16px 16px 20px',position:'relative',overflow:'hidden',transition:'background 0.6s ease' }}>
      <GlobalAnimations />
      {zone.textureId === 'coruscant' && <CoruscantBackdrop accent={zone.accent} accentDim={zone.accentDim} />}
      <AmbientLayer kind={zone.ambient} accent={zone.accent} />

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline',position:'relative',zIndex:2 }}>
        <div>
          <span style={{ fontSize:16,fontWeight:600,color:zone.accent,textShadow:`0 0 12px ${zone.accentGlow}` }}>{zone.name}</span>
          <span style={{ fontSize:11,color:'#7A7F94',marginLeft:10 }}>{zone.subtitle}</span>
        </div>
        <div style={{ fontSize:12,color:'#E8C97A' }}>{credits} cr &nbsp;&middot;&nbsp; <span style={{color:'#6A7090'}}>{collectedItems.size} items</span></div>
      </div>

      <div style={{ position:'relative',display:'inline-block',alignSelf:'flex-start',zIndex:2 }}>
        <div style={{ border:`1px solid ${zone.accentDim}`,background:zone.wallDark,boxShadow:`0 0 24px ${zone.accentGlow}` }}>
          {Array.from({ length: VIEWPORT_ROWS }, (_, vy) => {
            const ty = camY + vy;
            return (
              <div key={ty} style={{ display:'flex' }}>
                {Array.from({ length: VIEWPORT_COLS }, (_, vx) => {
                  const tx = camX + vx;
                  const tile = map[ty]?.[tx] || { type: 'wall' };
                  const isPlayer = pos.x === tx && pos.y === ty;
                  const npcHere = zone.npcs?.filter(n => isNpcVisible(n, questFlags)).find((n) => { const p = npcPositions[n.id] || { x: n.x, y: n.y }; return p.x === tx && p.y === ty; });
                  const collectibleHere = zone.collectibles?.find(c => c.x === tx && c.y === ty && !collectedItems.has(c.id));
                  const doorHere = zone.doors?.find(d => d.x === tx && d.y === ty);
                  const worldObjHere = zone.worldObjects?.find(wo => wo.x === tx && wo.y === ty && !(wo.once && completedInteractions.has(wo.id)));
                  const npcDone = npcHere && completedInteractions.has(npcHere.id);

                  let bg = zone.wallDark;
                  if (tile.type === 'floor') bg = floorBackground(zone, tx, ty);
                  if (tile.type === 'wall') bg = wallBackground(zone, tx, ty);
                  if (tile.type === 'ship_hull') bg = 'linear-gradient(135deg, #2A2A3A, #1A1A26)';
                  if (tile.type === 'ship_ramp') bg = 'repeating-linear-gradient(45deg, #2C2C3C, #2C2C3C 4px, #383848 4px, #383848 8px)';
                  if (tile.type === 'door') bg = `radial-gradient(circle, ${zone.accentDim}88, #0D0E16)`;
                  if (tile.type === 'lava') bg = 'radial-gradient(circle at 40% 40%, #FF5500, #AA2000)';
                  if (tile.type === 'water') bg = 'radial-gradient(circle at 60% 60%, #1A4A8A, #0A1E3A)';
                  if (npcHere || collectibleHere) bg = floorBackground(zone, tx, ty);

                  return (
                    <div key={tx} style={{ width:TILE,height:TILE,position:'relative',background:bg,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:isPlayer?`inset 0 0 0 1.5px ${zone.accent}`:'none',flexShrink:0 }}>
                      {tile.type === 'wall' && wallDecorFor(zone, tx, ty) && <DecorIcon kind={wallDecorFor(zone, tx, ty)} accent={zone.accent} />}
                      {tile.type === 'floor' && !isPlayer && !npcHere && !collectibleHere && decorFor(zone, tx, ty, map) && <DecorIcon kind={decorFor(zone, tx, ty, map)} accent={zone.accent} />}
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
                      {tile.type === 'door' && (
                        <div style={{ position:'absolute',top:0,left:0,right:0,height:'3px',background:zone.accent,opacity:0.7,borderRadius:'1px 1px 0 0' }} />
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
                      {worldObjHere && !isPlayer && !npcHere && !collectibleHere && (
                        <div style={{ position:'absolute',inset:3,border:'1px solid #4ACDFF55',borderRadius:2,animation:'world-obj-pulse 2.5s ease-in-out infinite',pointerEvents:'none' }} />
                      )}
                      {npcHere && !isPlayer && (
                        <div style={{ position:'absolute',bottom:0,left:'50%',zIndex:5,animation:'npc-sway 4.2s ease-in-out infinite',filter:npcDone?'grayscale(0.6) brightness(0.7)':'none' }}>
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
        <div style={{ position:'absolute',bottom:6,right:6,zIndex:10,background:'rgba(4,4,8,0.80)',padding:4,border:`1px solid ${zone.accentDim}55` }}>
          <div style={{ fontSize:8,color:'#5A5F74',marginBottom:2 }}>minimap</div>
          <Minimap zone={zone} map={map} pos={pos} camX={camX} camY={camY} npcPositions={npcPositions} completedInteractions={completedInteractions} questFlags={questFlags} />
        </div>
      </div>

      {choiceFeedback && (
        <div style={{ position:'fixed',top:24,left:'50%',transform:'translateX(-50%)',zIndex:50,background:'rgba(4,4,8,0.92)',border:`1px solid ${zone.accentDim}`,padding:'6px 18px',fontSize:11,letterSpacing:'0.12em',color:zone.accent,pointerEvents:'none',animation:'door-pulse 0.4s ease-out' }}>
          {choiceFeedback}
        </div>
      )}

      <div style={{ display:'flex',gap:10,flexWrap:'wrap',position:'relative',zIndex:2 }}>
        <div style={{ flex:'0 0 170px',border:'1px solid #24242E',padding:10,fontSize:11 }}>
          <div style={{ color:'#5A5F74',marginBottom:8,fontSize:10 }}>navigation</div>
          <div style={{ color:'#A8ADC0',marginBottom:4 }}>WASD / arrows to move</div>
          <div style={{ color:'#6A6F84',fontSize:10,marginBottom:2 }}>walk ramp to open travel</div>
          <div style={{ color:'#6A6F84',fontSize:10,marginBottom:8 }}>walk door to change zone</div>
          <div style={{ color:'#7A7F94',borderTop:'1px solid #1C1C26',paddingTop:8,fontSize:10 }}>
            <div>zone: <span style={{color:zone.accent}}>{zone.id}</span></div>
            <div>pos: {pos.x},{pos.y}</div>
          </div>
          {suspicionMeter > 0 && (
            <div style={{ marginTop:8,borderTop:'1px solid #1C1C26',paddingTop:8 }}>
              <div style={{ fontSize:9,color:'#E8A020',marginBottom:3 }}>SUSPICION</div>
              <div style={{ height:4,background:'#1C1A12',borderRadius:2 }}>
                <div style={{ height:'100%',width:`${suspicionMeter}%`,background: suspicionMeter > 60 ? '#FF4422' : '#E8A020',borderRadius:2,transition:'width 0.6s ease' }} />
              </div>
            </div>
          )}
        </div>
        <div style={{ flex:'1 1 200px',border:'1px solid #24242E',padding:10 }}>
          <AlignmentPanel alignment={alignment} />
        </div>
        <div style={{ flex:'1 1 150px',border:'1px solid #24242E',padding:10 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8 }}>
            <div style={{ fontSize:10,color:'#5A5F74' }}>inventory</div>
            <div style={{ display:'flex',gap:6 }}>
              <div onClick={() => setShowInventory(true)} style={{ fontSize:9,padding:'2px 6px',border:'1px solid #4ACDFF44',color:'#4ACDFF',cursor:'pointer' }}>[I]</div>
              <div onClick={() => setShowCodex(true)} style={{ fontSize:9,padding:'2px 6px',border:`1px solid ${codex.some(e => e.unread)?'#E8C97A':'#44443A'}`,color:codex.some(e => e.unread)?'#E8C97A':'#6A6F84',cursor:'pointer',position:'relative' }}>
                [C]{codex.filter(e => e.unread).length > 0 && <span style={{ position:'absolute',top:-4,right:-4,background:'#E8C97A',color:'#0A0A12',fontSize:8,borderRadius:'50%',width:12,height:12,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700 }}>{codex.filter(e => e.unread).length}</span>}
              </div>
            </div>
          </div>
          {inventory.map((item, i) => (
            <div key={item.id} style={{ fontSize:11,padding:'3px 0',borderBottom:i<inventory.length-1?'1px solid #1C1C26':'none',color:'#A8ADC0',display:'flex',justifyContent:'space-between' }}>
              <span>{item.name}</span>
              {item.qty > 1 && <span style={{color:'#E8C97A',fontSize:10}}>x{item.qty}</span>}
            </div>
          ))}
        </div>
        <div style={{ flex:'2 1 260px',border:'1px solid #24242E',padding:10,maxHeight:160,overflowY:'auto' }}>
          <div style={{ fontSize:10,color:'#5A5F74',marginBottom:8 }}>action log</div>
          {actionLog.map((entry, i) => (
            <div key={i} style={{ fontSize:11,color:i===0?zone.accent:'#6A6F84',padding:'2px 0',lineHeight:1.5 }}>{entry.text}</div>
          ))}
        </div>
        <div style={{ flex:'1 1 200px',border:`1px solid ${zone.accentDim}55`,padding:10,alignSelf:'flex-start' }}>
          <div style={{ fontSize:9,color:'#5A5F74',marginBottom:6,letterSpacing:'0.08em' }}>ACTIVE OBJECTIVE</div>
          <div style={{ fontSize:11,color:zone.accent,lineHeight:1.6 }}>{currentObjective}</div>
          <div style={{ marginTop:8,fontSize:9,color:'#3A3F54' }}>world: <span style={{color: worldState==='lawful'?'#4A9FFF':worldState==='underworld'?'#FF3366':'#7A7F94'}}>{worldState}</span></div>
        </div>
      </div>

      {transitioning && (
        <div style={{ position:'absolute',inset:0,background:'rgba(4,4,8,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:30,animation:'door-pulse 0.5s ease-in-out infinite' }}>
          <div style={{ color:zone.accent,fontSize:14,letterSpacing:'0.2em' }}>...</div>
        </div>
      )}
      {showTravel && <TravelOverlay currentPlanetId={planetId} credits={credits} onTravel={travelToPlanet} onClose={() => setShowTravel(false)} />}
      {activeDialogue && <DialogueOverlay npc={activeDialogue} onChoose={resolveChoice} inventory={inventory} questFlags={questFlags} />}
      {showSpeeder && <SpeederOverlay credits={credits} questFlags={questFlags} currentZoneId={zoneId} onTravel={(dest) => { setCredits((c) => c - dest.cost); setShowSpeeder(false); travelToZone(dest.targetZone, dest.targetPos); }} onClose={() => setShowSpeeder(false)} />}
      {showInventory && <InventoryOverlay inventory={inventory} onClose={() => setShowInventory(false)} />}
      {showCodex && <CodexOverlay codex={codex} setCodex={setCodex} onClose={() => setShowCodex(false)} />}
      {activeMinigame && activeMinigame.type === 'signal_siphon' && <SignalSiphonOverlay onSuccess={activeMinigame.onSuccess} onFailure={activeMinigame.onFailure} />}
      {activeMinigame && activeMinigame.type === 'speeder_pursuit' && <SpeederPursuitOverlay onSuccess={activeMinigame.onSuccess} onFailure={activeMinigame.onFailure} />}
      {activeMinigame && activeMinigame.type === 'valve_override' && <ValveOverrideOverlay onSuccess={activeMinigame.onSuccess} onFailure={activeMinigame.onFailure} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<StarWarsRPG />);
