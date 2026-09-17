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
        decor: ['cargo_crate', 'pipe', 'neon_sign'],
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
        accent: '#8FA6FF', accentGlow: 'rgba(143,166,255,0.25)', accentDim: '#3D4A80',
        floorColor: '#1E2238', floorAlt: '#272D48', wallDark: '#0D0E16', wallLight: '#181B2C',
        bg: 'radial-gradient(circle at 60% 40%, #15182A 0%, #0B0C14 70%)', ambient: 'traffic',
        decor: ['neon_sign', 'archive', 'pillar', 'brazier'],
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
        bg: 'radial-gradient(circle at 40% 30%, #111622 0%, #080A12 70%)', ambient: 'traffic',
        decor: ['archive', 'pipe', 'cargo_crate'],
        doors: [
          { x: 9, y: 13, targetZone: 'apartments', targetPos: { x: 6, y: 5 }, label: 'Residential Corridor' },
        ],
        worldObjects: [
          { id: 'jon_datapad', x: 12, y: 3, label: 'Encrypted Datapad', description: 'Manifest fragments. Three hub codes, three timestamps, forty-eight hours apart. Someone who knew the routing schedules. The Broken Circle is written in the margin in red.', once: true },
          { id: 'slicing_bench', x: 14, y: 8, label: 'Slicing Workbench', description: 'A tangle of stripped datachips and bypass leads. Jon apparently does his best work at 0300.', once: false },
        ],
        npcs: [
          { id: 'jon_apartment', x: 5, y: 3, kind: 'smuggler', label: 'Jon', questNpc: true,
            repeatPrompt: 'Jon is studying cargo manifests on his terminal. "Those three hub sites are still open. Find out who coordinated those strikes."',
            prompt: 'Here is the situation. Someone new is moving through the lower levels — fast, organized, and ruthless. Three major Republic transport hubs got hit in forty-eight hours. They did not steal credits. They took military-grade power converters, encrypted datanodes, and weapons manifests. Black Sun is denying it. The Exchange is rattled. Whoever this is, they are building something. I need eyes on those three hit sites before customs seals them. That is where you come in.',
            choices: [
              { text: 'I am in. Give me everything you have on the attack sites.', morality: 0, loyalty: { underworld: 8 }, result: 'Jon slides a datapad across the table and transfers 200 credits. "Speeder clearance codes are on your pad. Hit the Airtaxi terminal in the docking bay — all mid and lower level sectors are open to you now."', grants: { credits: 200, flags: ['speeder_transit_unlocked', 'chapter1_active'] } },
              { text: 'What is in it for me beyond the credits?', morality: 0, loyalty: { underworld: 5 }, result: 'Jon leans back. "First mover advantage. Whoever hit those hubs left things behind. Cargo, intel, leverage. You get first pick." He transfers 200 credits and uploads the clearance codes.', grants: { credits: 200, flags: ['speeder_transit_unlocked', 'chapter1_active'] } },
              { text: 'I need more upfront to walk into a war zone.', morality: -8, loyalty: { underworld: 10 }, result: 'Jon sighs and pushes across an extra hundred. "Three hundred. Now get moving before the CSF seals the scene." He uploads the clearance codes.', grants: { credits: 300, flags: ['speeder_transit_unlocked', 'chapter1_active'] } },
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
      hub_site_alpha: {
        id: 'hub_site_alpha', name: 'Speeder Docking Bay 1', subtitle: 'Coruscant · Mid-Levels · Sector 4 · CSF Cordon',
        width: 28, height: 18, spawnPos: { x: 4, y: 10 }, textureId: 'coruscant',
        accent: '#8FA6FF', accentGlow: 'rgba(143,166,255,0.22)', accentDim: '#3D4A80',
        floorColor: '#1A1E35', floorAlt: '#222840', wallDark: '#0C0E18', wallLight: '#161A2C',
        bg: 'radial-gradient(circle at 20% 30%, #141828 0%, #090B14 70%)', ambient: 'traffic',
        decor: ['cargo_crate', 'pipe', 'neon_sign'],
        doors: [],
        worldObjects: [
          { id: 'airtaxi_hub_alpha', x: 4, y: 14, label: 'AirTaxi Terminal', description: 'Coruscant AirTaxi Network. Clearance required for restricted sectors.', once: false },
          { id: 'alpha_manifest', x: 22, y: 7, label: 'Shipping Manifest Terminal', description: 'Power converter units — 40 crates, military spec. Datanodes — encrypted, series 7. Destination redacted. Loading confirmed 48 hours ago. The receiving bay code traces back to a dummy shell corp: Broken Circle Holdings.', once: true },
        ],
        npcs: [
          { id: 'vane_hub', x: 15, y: 12, kind: 'republic_guard', label: 'Officer Vane',
            repeatPrompt: 'Vane watches the empty bay. "Still nothing. Someone planned this precisely."',
            prompt: '"You are cleared, but this is an active CSF scene. Whatever you take from that terminal gets logged. Power converters and datanodes — forty crates. Nothing left behind except one partial manifesto with a circle insignia we have never seen before."',
            choices: [
              { text: 'Share what I know about the syndicate.', morality: 8, loyalty: { republic: 10 }, result: 'Vane nods slowly. "The Broken Circle. New name. I will flag it. That is useful — thank you."' },
              { text: 'Keep quiet and take mental notes.', morality: -3, loyalty: { underworld: 5 }, result: 'You note everything without sharing it. Vane watches you go, his expression unreadable.' },
            ],
          },
        ],
        collectibles: [{ id: 'alpha_credit_chip', x: 20, y: 14, label: 'Confiscated Credit Chip', reward: 30 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 26, 16, 'floor');
          carveRect(g, 8, 4, 18, 10, 'wall');
          carveRect(g, 9, 5, 17, 9, 'floor');
          [[3,3],[4,3],[3,4],[3,5]].forEach(([x,y]) => pt(g,x,y,'wall'));
          [[23,3],[23,4],[23,5],[24,3]].forEach(([x,y]) => pt(g,x,y,'wall'));
          return g;
        },
      },
      hub_site_beta: {
        id: 'hub_site_beta', name: 'Lower Industrial Docks', subtitle: 'Coruscant · Lower Levels · Black Sun Territory',
        width: 30, height: 20, spawnPos: { x: 2, y: 8 }, textureId: 'coruscant',
        accent: '#FF7A5A', accentGlow: 'rgba(255,122,90,0.22)', accentDim: '#7A2A1E',
        floorColor: '#221814', floorAlt: '#2A1E18', wallDark: '#100A08', wallLight: '#1C1210',
        bg: 'radial-gradient(circle at 60% 80%, #1E1008 0%, #0E0806 70%)', ambient: 'embers',
        decor: ['cargo_crate', 'pipe', 'slag'],
        doors: [],
        worldObjects: [
          { id: 'airtaxi_hub_beta', x: 2, y: 16, label: 'AirTaxi Terminal', description: 'Coruscant AirTaxi Network. Clearance required for restricted sectors.', once: false },
          { id: 'beta_data_terminal', x: 15, y: 8, label: 'Overloaded Data Terminal', description: 'The manifest fragments are scrambled but the routing node prefix is legible: BC-NEXUS-7. The same signature appears on the Sector 4 job. Someone coordinated these hits from the same command channel.', once: true },
        ],
        npcs: [
          { id: 'blacksun_lt', x: 5, y: 10, kind: 'crime_boss', label: 'Black Sun Lieutenant',
            repeatPrompt: 'The lieutenant narrows their eyes. "I have nothing more to say to you."',
            prompt: '"My people did not do this. Whoever hit these docks knew our schedules — that takes an inside source or something worse. We are looking too. And if you find them before we do, you bring them to me first."',
            choices: [
              { text: 'Agree to bring them the information.', morality: -10, loyalty: { underworld: 15 }, result: '"Smart. Black Sun has a long memory for favors and for debts."' },
              { text: 'Make no promises.', morality: 2, loyalty: {}, result: '"Then we have nothing further to discuss." They turn away, watching the docks.' },
            ],
          },
          { id: 'beta_dock_worker', x: 27, y: 15, kind: 'mechanic', label: 'Dock Worker',
            repeatPrompt: 'The worker stares at the floor. They have said everything they are willing to say.',
            prompt: 'They keep their voice low. "They moved fast. Grey coats, no insignia. Left one crate behind — too hot to carry maybe. I heard one of them say: the Circle needs the third shipment by end of cycle."',
            choices: [
              { text: 'Thank them and offer 50 credits for the risk.', morality: 8, loyalty: {}, result: 'They pocket the credits quickly. "Get out of here. If they come back and see you talking to me, we are both done."' },
              { text: 'Press them for more details.', morality: -5, loyalty: { underworld: 5 }, result: '"That is everything. I swear. Please — just go."' },
            ],
          },
        ],
        collectibles: [{ id: 'beta_manifest_frag', x: 24, y: 14, label: 'Manifest Fragment', reward: 20 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 28, 18, 'floor');
          carveRect(g, 10, 5, 20, 12, 'wall');
          carveRect(g, 11, 6, 19, 11, 'floor');
          carveRect(g, 25, 1, 28, 8, 'wall');
          carveRect(g, 26, 2, 27, 7, 'floor');
          [[2,3],[2,4],[2,5],[3,3]].forEach(([x,y]) => pt(g,x,y,'wall'));
          return g;
        },
      },
      hub_site_gamma: {
        id: 'hub_site_gamma', name: 'The Works Sub-Level', subtitle: 'Coruscant · Undercity · Abandoned Processing Plant',
        width: 26, height: 18, spawnPos: { x: 15, y: 3 }, textureId: 'coruscant',
        accent: '#FF8C42', accentGlow: 'rgba(255,140,66,0.25)', accentDim: '#7A3C1E',
        floorColor: '#2A1A0E', floorAlt: '#321E10', wallDark: '#100A06', wallLight: '#1C1008',
        bg: 'radial-gradient(circle at 50% 60%, #221408 0%, #100C06 70%)', ambient: 'embers',
        decor: ['pipe', 'slag', 'rubble'],
        doors: [],
        worldObjects: [
          { id: 'airtaxi_hub_gamma', x: 10, y: 14, label: 'AirTaxi Terminal', description: 'Coruscant AirTaxi Network. Emergency access unit. Clearance required for restricted sectors.', once: false },
          { id: 'syndicate_cache', x: 12, y: 3, label: 'Syndicate Supply Cache', description: 'Cracked open. Inside: an empty weapons case, a coded frequency tablet, and a patch. A broken circle of white on black. The Broken Circle. They were here. Whatever they built, they have moved it already.', once: true },
          { id: 'geothermal_junction', x: 3, y: 4, label: 'Geothermal Junction', description: 'Superheated gas vents from the deep processing shafts below. The whole sub-level sits on top of something very hot.', once: false },
        ],
        npcs: [
          { id: 'gamma_loader', x: 12, y: 8, kind: 'warden', label: 'Injured Cargo Loader',
            repeatPrompt: 'The loader is drifting in and out of consciousness. They have told you everything they can.',
            prompt: 'They are slumped against the junction housing, one arm badly burned. "They left me. Said I saw too much. The circle — white circle on black. Kept saying the third shipment closes the triangle. Some kind of weapon assembly. They are building it somewhere in the deep infrastructure — somewhere no one goes anymore."',
            choices: [
              { text: 'Stabilise them and call for a medic.', morality: 12, loyalty: { republic: 8 }, result: 'You bind the burns and transmit a medical alert. "Thank you," they whisper. "The circle — stop the circle."', grants: { flags: ['syndicate_identified', 'gamma_witness_saved'] } },
              { text: 'Extract everything useful and leave quickly.', morality: -10, loyalty: { underworld: 8 }, result: 'You get the coordinates of the loading bay they came from. The loader watches you go, too weak to call after you.', grants: { flags: ['syndicate_identified'] } },
            ],
          },
        ],
        collectibles: [{ id: 'gamma_syndicate_token', x: 20, y: 12, label: 'Broken Circle Token', reward: 10 }],
        buildMap() {
          const g = emptyGrid(this.width, this.height);
          carveRect(g, 1, 1, 24, 16, 'floor');
          carveRect(g, 1, 1, 8, 8, 'wall');
          carveRect(g, 2, 2, 7, 7, 'floor');
          carveRect(g, 18, 8, 24, 16, 'wall');
          carveRect(g, 19, 9, 23, 15, 'floor');
          [[9,1],[10,1],[11,1]].forEach(([x,y]) => pt(g,x,y,'wall'));
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

function Minimap({ zone, map, pos, camX, camY, npcPositions, completedInteractions }) {
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
      {zone.npcs?.map((npc) => {
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

function DialogueOverlay({ npc, onChoose }) {
  return (
    <div style={{ position:'absolute',inset:0,background:'rgba(4,4,8,0.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:25 }}>
      <div style={{ width:'min(92%,480px)',border:'1px solid #2A2A38',background:'#0E0E16',fontFamily:"'IBM Plex Mono',ui-monospace,monospace" }}>
        <div style={{ padding:'14px 18px',borderBottom:'1px solid #2A2A38',color:'#E8C97A',fontSize:13,fontWeight:600 }}>{npc.label}</div>
        <div style={{ padding:'16px 18px',color:'#C9C5BE',fontSize:13,lineHeight:1.6,borderBottom:'1px solid #1C1C26' }}>{npc.prompt}</div>
        {npc.choices.map((choice, i) => (
          <div key={i} onClick={() => onChoose(choice, npc.id)} style={{ padding:'14px 18px',borderBottom:i<npc.choices.length-1?'1px solid #1C1C26':'none',cursor:'pointer',fontSize:12.5,color:'#A8ADC0' }}>
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

const SPEEDER_DESTINATIONS = [
  { id: 'spaceport',      name: 'Sub-Surface Spaceport',   level: 'Sub-Surface L2',        cost: 0,  requiredFlag: null,                       targetZone: 'spaceport',      targetPos: { x: 14, y: 10 } },
  { id: 'market',         name: 'West Market District',     level: 'Sub-Surface L2',        cost: 0,  requiredFlag: null,                       targetZone: 'market',         targetPos: { x: 2,  y: 10 } },
  { id: 'hub_site_alpha', name: 'Speeder Docking Bay 1',    level: 'Mid-Levels / Sector 4', cost: 25, requiredFlag: 'speeder_transit_unlocked', targetZone: 'hub_site_alpha', targetPos: { x: 4,  y: 10 } },
  { id: 'hub_site_beta',  name: 'Lower Industrial Docks',   level: 'Lower Levels',          cost: 50, requiredFlag: 'speeder_transit_unlocked', targetZone: 'hub_site_beta',  targetPos: { x: 2,  y: 8  } },
  { id: 'hub_site_gamma', name: 'The Works Sub-Level',      level: 'Undercity Deep Vector', cost: 75, requiredFlag: 'speeder_transit_unlocked', targetZone: 'hub_site_gamma', targetPos: { x: 15, y: 3  } },
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
  const [completedInteractions, setCompletedInteractions] = useState(() => new Set());
  const [alignment, setAlignment] = useState({ morality: 0, loyalty: { republic: 0, sithEmpire: 0, underworld: 0 } });
  const [showTravel, setShowTravel] = useState(false);
  const [activeDialogue, setActiveDialogue] = useState(null);
  const [actionLog, setActionLog] = useState([{ text: 'Docked at Coruscant Spaceport, Subsurface Level 2. The ramp hisses shut behind you.', zone: 'spaceport' }]);
  const [transitioning, setTransitioning] = useState(false);
  const [questFlags, setQuestFlags] = useState({});
  const [showSpeeder, setShowSpeeder] = useState(false);
  const [npcPositions, setNpcPositions] = useState({});
  const posRef = React.useRef(pos);

  const pushActionLog = useCallback((msg, zoneLabel) => {
    setActionLog((prev) => [{ text: msg, zone: zoneLabel || '' }, ...prev.slice(0, 49)]);
  }, []);

  const setFlag = useCallback((key) => setQuestFlags((prev) => ({ ...prev, [key]: true })), []);

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
  useEffect(() => { setNpcPositions({}); }, [zoneId]);
  useEffect(() => {
    const tickId = setInterval(() => {
      setNpcPositions((prev) => {
        const next = { ...prev };
        const playerPos = posRef.current;
        zone.npcs?.forEach((npc) => {
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
    setAlignment((prev) => ({
      morality: Math.max(-100, Math.min(100, prev.morality + choice.morality)),
      loyalty: {
        republic: Math.max(0, Math.min(100, prev.loyalty.republic + (choice.loyalty.republic || 0))),
        sithEmpire: Math.max(0, Math.min(100, prev.loyalty.sithEmpire + (choice.loyalty.sithEmpire || 0))),
        underworld: Math.max(0, Math.min(100, prev.loyalty.underworld + (choice.loyalty.underworld || 0))),
      },
    }));
    if (choice.grants?.credits) setCredits((c) => c + choice.grants.credits);
    if (choice.grants?.flags) choice.grants.flags.forEach((f) => setFlag(f));
    pushActionLog(choice.result, zoneId);
    setActiveDialogue(null);
  }, [zoneId, pushActionLog, setFlag]);

  useEffect(() => {
    const handleKey = (e) => {
      if (showTravel || activeDialogue || transitioning || showSpeeder) return;
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

      const npcHere = zone.npcs?.find((n) => {
        const p = npcPositions[n.id] || { x: n.x, y: n.y };
        return p.x === x && p.y === y;
      });
      if (npcHere) {
        if (npcHere.triggersOverlay === 'speeder') {
          if (!questFlags.speeder_transit_unlocked) { pushActionLog('RESTRICTED TRANSIT: Sector clearance pass required.', zoneId); setPos({ x, y }); return; }
          setShowSpeeder(true); setPos({ x, y }); return;
        }
        if (completedInteractions.has(npcHere.id) && !npcHere.repeatable) {
          pushActionLog(npcHere.repeatPrompt || `${npcHere.label} nods but says nothing new.`, zoneId);
          return;
        }
        setActiveDialogue(npcHere);
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
          pushActionLog(`[${worldObjHere.label}] ${worldObjHere.description}`, zoneId);
          if (worldObjHere.once) setCompletedInteractions((prev) => new Set([...prev, worldObjHere.id]));
        }
        setPos({ x, y });
        return;
      }

      const collectible = zone.collectibles?.find(c => c.x === x && c.y === y && !collectedItems.has(c.id));
      if (collectible) {
        setCredits((c) => c + collectible.reward);
        setCollectedItems((prev) => new Set([...prev, collectible.id]));
        pushActionLog(`${collectible.label}. (+${collectible.reward} credits)`, zoneId);
      }

      setPos({ x, y });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [pos, map, zone, zoneId, facing, showTravel, activeDialogue, transitioning, showSpeeder, questFlags, npcPositions, collectedItems, completedInteractions, pushActionLog, travelToZone]);

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
                  const npcHere = zone.npcs?.find((n) => { const p = npcPositions[n.id] || { x: n.x, y: n.y }; return p.x === tx && p.y === ty; });
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
          <Minimap zone={zone} map={map} pos={pos} camX={camX} camY={camY} npcPositions={npcPositions} completedInteractions={completedInteractions} />
        </div>
      </div>

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
        </div>
        <div style={{ flex:'1 1 200px',border:'1px solid #24242E',padding:10 }}>
          <AlignmentPanel alignment={alignment} />
        </div>
        <div style={{ flex:'1 1 150px',border:'1px solid #24242E',padding:10 }}>
          <div style={{ fontSize:10,color:'#5A5F74',marginBottom:8 }}>inventory</div>
          {inventory.map((item, i) => (
            <div key={i} style={{ fontSize:11,padding:'3px 0',borderBottom:i<inventory.length-1?'1px solid #1C1C26':'none',color:'#A8ADC0' }}>{item}</div>
          ))}
        </div>
        <div style={{ flex:'2 1 260px',border:'1px solid #24242E',padding:10,maxHeight:160,overflowY:'auto' }}>
          <div style={{ fontSize:10,color:'#5A5F74',marginBottom:8 }}>action log</div>
          {actionLog.map((entry, i) => (
            <div key={i} style={{ fontSize:11,color:i===0?zone.accent:'#6A6F84',padding:'2px 0',lineHeight:1.5 }}>{entry.text}</div>
          ))}
        </div>
      </div>

      {transitioning && (
        <div style={{ position:'absolute',inset:0,background:'rgba(4,4,8,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:30,animation:'door-pulse 0.5s ease-in-out infinite' }}>
          <div style={{ color:zone.accent,fontSize:14,letterSpacing:'0.2em' }}>...</div>
        </div>
      )}
      {showTravel && <TravelOverlay currentPlanetId={planetId} credits={credits} onTravel={travelToPlanet} onClose={() => setShowTravel(false)} />}
      {activeDialogue && <DialogueOverlay npc={activeDialogue} onChoose={resolveChoice} />}
      {showSpeeder && <SpeederOverlay credits={credits} questFlags={questFlags} currentZoneId={zoneId} onTravel={(dest) => { setCredits((c) => c - dest.cost); setShowSpeeder(false); travelToZone(dest.targetZone, dest.targetPos); }} onClose={() => setShowSpeeder(false)} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<StarWarsRPG />);
