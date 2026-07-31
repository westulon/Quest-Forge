/* ============================================================
   QUEST FORGE: RUNNER'S PATH
   data.js — program structure, narrative, equipment, formulas
   ============================================================
   The interval structure below matches the NHS "Couch to 5K"
   plan exactly (9 weeks, 3 runs/week, 5-min warm-up + 5-min
   cool-down walk around each session). Source: nhs.uk Better
   Health "Couch to 5K running plan" page.
   ============================================================ */

// ---------- tiny helpers to build phase lists ----------
function run(sec)  { return { type: 'run',  duration: sec, label: 'Run'  }; }
function walk(sec) { return { type: 'walk', duration: sec, label: 'Walk' }; }
const WARMUP  = { type: 'warmup',  duration: 300, label: 'Warm-up Walk' };
const COOLDOWN = { type: 'cooldown', duration: 300, label: 'Cool-down Walk' };

function buildSession(opts) {
  const phases = [WARMUP, ...opts.intervals, COOLDOWN];
  const totalSeconds = phases.reduce((a, p) => a + p.duration, 0);
  const runSeconds = phases.filter(p => p.type === 'run').reduce((a, p) => a + p.duration, 0);
  return {
    id: `w${opts.week}r${opts.runNumber}`,
    week: opts.week,
    runNumber: opts.runNumber,
    region: opts.region,
    title: opts.title,
    flavor: opts.flavor,
    milestone: opts.milestone || null,
    phases,
    totalSeconds,
    runSeconds
  };
}

// ---------- the frame narrative ----------
// Bramble — the Guild's last quartermaster — recurs throughout: she opens
// the story, greets you at the start of every region, reacts when you light
// that region's Beacon, and gives the finale speech. She's also the shop's
// "voice", which is what gives every purchase an in-world reason to exist.

const PROLOGUE = {
  title: 'A Guild in Need',
  text: `Long ago, the Windrunner Guild kept the Old Road alive — nine signal Beacons, one for every stretch of the realm, lit by runners who carried word, courage, and company between the Sleepy Village and the far Kingdom gates. But the Beacons have stood dark for years. The last of the old Windrunners retired long ago, and the Guild's only quartermaster — a sharp-eyed old badger named Bramble — has been waiting a long while for a new recruit.

Today, that's you.

"About time," Bramble grins, tossing over a well-worn pair of boots. "Nine Beacons between here and the Kingdom, and not one of them lit. Let's see what you're made of — starting with the Village road. Small steps first. Big ones come later."`
};

const FINALE_SPEECH = `Bramble doesn't say anything for a moment — just looks out at nine Beacons glowing along the horizon, Village to Kingdom, every mile lit at once.

Then: "Windrunner," she says, like she's been saving the word all this time. "Full and proper. Go on, then — go see your name added to the old stone. You've more than earned it."`;

const SHOP_INTRO = `"Guild coffers are thin, always have been," Bramble says, waving a hand at her wares. "But your quest-gold's good here. Treat yourself — you've earned it."`;

// ---------- the 9 regions (one per week) ----------
// `arrival` shows once, before the region's first quest. `beacon` shows once,
// on completing the region's last quest (the last quest of week 9 gets the
// FINALE_SPEECH on top of its beacon text — see showQuestCompleteModal).
const REGIONS = [
  { week: 1, name: 'The Sleepy Village', icon: 'village',
    arrival: null,
    beacon: "The Village Beacon flares to life. Somewhere in the Guild hall, an old bell rings for the first time in years." },
  { week: 2, name: 'The Whispering Woods', icon: 'woods',
    arrival: `"The Village Beacon's lit — nicely done." Bramble hands over a woven satchel. "Next stretch runs through the Whispering Woods. Folk say the trees still remember every runner who's passed through. Don't mind the whispering. It's just the leaves being nosy."`,
    beacon: "The Woodland Beacon catches — and just for a moment, the trees go quiet, like they're listening." },
  { week: 3, name: 'The Rolling Hills', icon: 'hills',
    arrival: `"Two Beacons down, seven to go." Bramble squints at the horizon. "The Rolling Hills are next — proper hills, not the woodland kind. Longer running stretches today. You've earned the legs for it."`,
    beacon: "The Hilltop Beacon blazes across the valley — bright enough to see from three villages over." },
  { week: 4, name: 'The Old Stone Bridge', icon: 'bridge',
    arrival: `"The Hills didn't slow you down one bit." Bramble taps a worn map. "Ahead lies the Old Stone Bridge — the halfway marker every Windrunner remembers crossing. Get across, and the Kingdom starts to feel real."`,
    beacon: "The Bridge Beacon lights the old stones gold. Halfway to the Kingdom — official, and lit." },
  { week: 5, name: 'The Enchanted Grove', icon: 'grove',
    arrival: `"Halfway Beacon lit — that's no small thing." Bramble's voice drops, a touch more serious. "The Enchanted Grove is where it gets real: your longest stretches yet, building to your very first twenty minutes running, start to finish, no stopping. Every Windrunner remembers their first. Today, you write yours."`,
    beacon: "The Grove Beacon glimmers to life — and for a moment, the whole grove seems to hum along with it." },
  { week: 6, name: "The Dragon's Foothills", icon: 'foothills',
    arrival: `Bramble doesn't grin this time — just nods, once. "The Foothills. Beyond them lives the Dragon who's guarded the old boundary stone since before I was your age. She's no fighter — but she respects a runner who's earned their stripes. Twenty-five minutes, unbroken, waits at the end of this stretch. Go earn them."`,
    beacon: "The Foothill Beacon roars alight. Somewhere higher up, something ancient stirs, and watches." },
  { week: 7, name: 'The Misty Peaks', icon: 'peaks',
    arrival: `"Dragon's foothills behind you, twenty-five whole minutes in your legs." Bramble hands over a thicker cloak. "The Misty Peaks are next. Cold, quiet, easy to lose the path — but you won't. You know this pace now."`,
    beacon: "The Peak Beacon burns clear through the mist, visible for miles in every direction." },
  { week: 8, name: "The Dragon's Lair", icon: 'lair',
    arrival: `"This is it — the Lair itself." Bramble's eyes are bright. "She's been watching your Beacons light up one by one, you know. Dragons notice these things. Twenty-eight minutes, and I'd wager she finally steps aside and lets a proper Windrunner through."`,
    beacon: "The Lair Beacon catches — and the Dragon dips her head, just once, as you pass." },
  { week: 9, name: 'The Kingdom of Five-K', icon: 'kingdom',
    arrival: `Bramble can barely keep still. "Eight Beacons lit, and the whole Guild's talking about the recruit who's about to light the ninth. Thirty minutes stands between you and the title of Windrunner — full and proper, name carved on the old stone and everything. I'll be waiting at the gate."`,
    beacon: "The ninth and final Beacon roars alight. For the first time in a generation, the whole Old Road glows — Village to Kingdom, every mile lit at once." }
];

// ---------- the 27 quests, exact NHS intervals ----------
const QUESTS = [
  // WEEK 1 — identical x3
  buildSession({ week:1, runNumber:1, region:'The Sleepy Village',
    title:'First Steps Into Legend',
    flavor:"Every great adventurer starts somewhere — today, it's your front door.",
    intervals:[ ...Array(7).fill(0).flatMap(()=>[run(60),walk(90)]), run(60) ] }),
  buildSession({ week:1, runNumber:2, region:'The Sleepy Village',
    title:'Finding Your Feet',
    flavor:'The village path feels a little more familiar today. Same steady rhythm: run, walk, repeat.',
    intervals:[ ...Array(7).fill(0).flatMap(()=>[run(60),walk(90)]), run(60) ] }),
  buildSession({ week:1, runNumber:3, region:'The Sleepy Village',
    title:'One Step Further',
    flavor:"Last quest before you leave the village behind. You've nearly mastered this rhythm.",
    intervals:[ ...Array(7).fill(0).flatMap(()=>[run(60),walk(90)]), run(60) ] }),

  // WEEK 2 — identical x3
  buildSession({ week:2, runNumber:1, region:'The Whispering Woods',
    title:'Into the Whispering Woods',
    flavor:'The trees lean in close and the path winds ahead. Your running legs grow a little stronger.',
    intervals:[ ...Array(5).fill(0).flatMap(()=>[run(90),walk(120)]), run(90) ] }),
  buildSession({ week:2, runNumber:2, region:'The Whispering Woods',
    title:'Deeper Down the Trail',
    flavor:"Same woodland path, same steady pace — you're more sure-footed with every quest.",
    intervals:[ ...Array(5).fill(0).flatMap(()=>[run(90),walk(120)]), run(90) ] }),
  buildSession({ week:2, runNumber:3, region:'The Whispering Woods',
    title:'Master of the Woodland Path',
    flavor:'The final woodland trial. The Whispering Woods have nothing left to teach you.',
    intervals:[ ...Array(5).fill(0).flatMap(()=>[run(90),walk(120)]), run(90) ] }),

  // WEEK 3 — identical x3
  buildSession({ week:3, runNumber:1, region:'The Rolling Hills',
    title:'Over the First Hill',
    flavor:'The woods give way to open hills. Longer running stretches today — you are ready for them.',
    intervals:[ run(90),walk(90),run(180),walk(180),run(90),walk(90),run(180) ] }),
  buildSession({ week:3, runNumber:2, region:'The Rolling Hills',
    title:'Finding Your Stride',
    flavor:'Same hills, same challenge — but notice how much steadier your breathing feels now.',
    intervals:[ run(90),walk(90),run(180),walk(180),run(90),walk(90),run(180) ] }),
  buildSession({ week:3, runNumber:3, region:'The Rolling Hills',
    title:'Hilltop Victory',
    flavor:'One more climb and the hills are conquered. Look how far you can see from up here!',
    intervals:[ run(90),walk(90),run(180),walk(180),run(90),walk(90),run(180) ] }),

  // WEEK 4 — identical x3
  buildSession({ week:4, runNumber:1, region:'The Old Stone Bridge',
    title:'Crossing the Old Bridge',
    flavor:'An ancient bridge marks the road ahead. The running stretches get longer still.',
    intervals:[ run(180),walk(90),run(300),walk(150),run(180),walk(90),run(300) ] }),
  buildSession({ week:4, runNumber:2, region:'The Old Stone Bridge',
    title:'Halfway to the Castle',
    flavor:'You can see the towers in the distance now. Keep that steady rhythm going.',
    intervals:[ run(180),walk(90),run(300),walk(150),run(180),walk(90),run(300) ] }),
  buildSession({ week:4, runNumber:3, region:'The Old Stone Bridge',
    title:"The Bridge Keeper's Approval",
    flavor:"The keeper nods as you pass — you've earned the right to cross for good.",
    intervals:[ run(180),walk(90),run(300),walk(150),run(180),walk(90),run(300) ] }),

  // WEEK 5 — three DIFFERENT runs, ending in first 20-min continuous run
  buildSession({ week:5, runNumber:1, region:'The Enchanted Grove',
    title:'The Grove Awakens',
    flavor:'Magic hums in the air of the Enchanted Grove. Your longest running stretches yet begin here.',
    intervals:[ run(300),walk(180),run(300),walk(180),run(300) ] }),
  buildSession({ week:5, runNumber:2, region:'The Enchanted Grove',
    title:'The Longest Path Yet',
    flavor:'Just one more push before the biggest milestone of your journey so far.',
    intervals:[ run(480),walk(300),run(480) ] }),
  buildSession({ week:5, runNumber:3, region:'The Enchanted Grove',
    title:'The Twenty-Minute Triumph',
    milestone:'First continuous 20-minute run',
    flavor:'This is it — your first ever 20 minutes of running without stopping. Legends are made today.',
    intervals:[ run(1200) ] }),

  // WEEK 6 — three DIFFERENT runs, ending in first 25-min continuous run
  buildSession({ week:6, runNumber:1, region:"The Dragon's Foothills",
    title:'Foothills of the Dragon',
    flavor:"You can feel the mountain's presence already. Back to intervals, to build even more strength.",
    intervals:[ run(300),walk(180),run(480),walk(180),run(300) ] }),
  buildSession({ week:6, runNumber:2, region:"The Dragon's Foothills",
    title:'Climbing Higher',
    flavor:'The path steepens, but so does your resolve. Almost at the next big milestone.',
    intervals:[ run(600),walk(180),run(600) ] }),
  buildSession({ week:6, runNumber:3, region:"The Dragon's Foothills",
    title:'The Twenty-Five Minute Legend',
    milestone:'First continuous 25-minute run',
    flavor:'Twenty-five minutes, start to finish, no stopping. You are becoming unstoppable.',
    intervals:[ run(1500) ] }),

  // WEEK 7 — identical x3, continuous 25 min
  buildSession({ week:7, runNumber:1, region:'The Misty Peaks',
    title:'Into the Mist',
    flavor:'The peaks are shrouded in mist, but you know this pace now. Twenty-five steady minutes.',
    intervals:[ run(1500) ] }),
  buildSession({ week:7, runNumber:2, region:'The Misty Peaks',
    title:'Above the Clouds',
    flavor:"Same climb, same strength. You're not even surprised by how good this feels anymore.",
    intervals:[ run(1500) ] }),
  buildSession({ week:7, runNumber:3, region:'The Misty Peaks',
    title:'Master of the Mountain',
    flavor:"The final peak of the week. You've made the mountain feel almost easy.",
    intervals:[ run(1500) ] }),

  // WEEK 8 — identical x3, continuous 28 min
  buildSession({ week:8, runNumber:1, region:"The Dragon's Lair",
    title:'The Lair Awaits',
    flavor:"Twenty-eight minutes stand between you and the dragon's door. You're ready.",
    intervals:[ run(1680) ] }),
  buildSession({ week:8, runNumber:2, region:"The Dragon's Lair",
    title:'Facing the Dragon',
    flavor:'Same brave distance as before — the dragon is starting to recognise your footsteps.',
    intervals:[ run(1680) ] }),
  buildSession({ week:8, runNumber:3, region:"The Dragon's Lair",
    title:"The Dragon's Respect",
    flavor:'One last 28-minute run, and the dragon steps aside to let you pass. Not from fear — respect.',
    intervals:[ run(1680) ] }),

  // WEEK 9 — identical x3, continuous 30 min, FINALE
  buildSession({ week:9, runNumber:1, region:'The Kingdom of Five-K',
    title:'The Final Trial Begins',
    flavor:"Thirty minutes. You've trained your whole journey for this.",
    intervals:[ run(1800) ] }),
  buildSession({ week:9, runNumber:2, region:'The Kingdom of Five-K',
    title:'One Step From Legend',
    flavor:'Just one more thirty-minute run between you and the title of Hero of Five-K.',
    intervals:[ run(1800) ] }),
  buildSession({ week:9, runNumber:3, region:'The Kingdom of Five-K',
    title:'Hero of Five-K!',
    milestone:'Programme complete — 30 continuous minutes',
    flavor:'This is the one. Thirty minutes, and the whole kingdom will know your name. Go be a legend.',
    intervals:[ run(1800) ] })
];

// ---------- equipment shop ----------
// Every "tier 0" item is free and auto-owned by new characters.
const EQUIPMENT = {
  weapon: [
    { id:'wpn0', name:"Wooden Practice Sword", price:0,   desc:'Every recruit starts with one of these. Bramble\'s had hers since her own first day.' },
    { id:'wpn1', name:'Iron Shortsword',       price:60,  desc:'"Lighter than it looks," Bramble says. "Won\'t slow your stride one bit."' },
    { id:'wpn2', name:"Ranger's Bow",          price:150, desc:'For runners who like to watch the road ahead, not just the ground underfoot.' },
    { id:'wpn3', name:'Sunforged Blade',       price:300, desc:'Bramble whistles low at this one. "Now that\'s a blade with some history. Wear it well."' },
    { id:'wpn4', name:'Crystal Staff of the Grove', price:500, desc:'"Found this one myself, years back," Bramble admits. "Never did work out all it does. Hums when you run, though."' }
  ],
  armor: [
    { id:'arm0', name:"Traveler's Tunic",  price:0,   desc:'Standard Guild issue. Comfy, sturdy, gets the job done.' },
    { id:'arm1', name:'Leather Vest',      price:50,  desc:'"A bit more official-looking," says Bramble. "Might get you a nod from the Guild elders."' },
    { id:'arm2', name:"Ranger's Coat",     price:140, desc:'Deep green, plenty of pockets. Popular with anyone spending real time in the Woods.' },
    { id:'arm3', name:'Chainmail Vest',    price:280, desc:'Jingles with every stride — Bramble claims she can hear a wearer coming from two hills away.' },
    { id:'arm4', name:'Gilded Plate',      price:480, desc:'Traditionally worn by Windrunners who\'ve lit at least half the Beacons. You\'ll have earned it.' }
  ],
  head: [
    { id:'hat0', name:'Bare Head',            price:0,   desc:'Wind in your hair. Some runners never wear anything else.' },
    { id:'hat1', name:"Traveler's Hood",      price:40,  desc:'Keeps the sun out of your eyes on the long stretches.' },
    { id:'hat2', name:"Scout's Cap & Feather",price:100, desc:'The feather does nothing useful. Bramble insists it "improves morale."' },
    { id:'hat3', name:'Iron Helm',            price:220, desc:'Heavier than most runners like — but a few swear it keeps their head clear.' },
    { id:'hat4', name:'Golden Circlet',       price:400, desc:'Worn, by tradition, only by Windrunners who\'ve relit every Beacon on the Old Road.' }
  ],
  boots: [
    { id:'boo0', name:'Worn Sandals',          price:0,   desc:'They\'ve carried plenty of recruits their first few miles. They\'ll carry you too.' },
    { id:'boo1', name:'Trail Boots',           price:45,  desc:'"Real grip for real trails," Bramble says, eyeing the Hills on the map ahead.' },
    { id:'boo2', name:"Swift Runner's Boots",  price:120, desc:'Somehow make every stride feel a touch lighter. No one\'s quite sure how.' },
    { id:'boo3', name:'Windwalker Boots',      price:260, desc:'Bramble swears past Windrunners barely touched the ground in these.' },
    { id:'boo4', name:'Boots of the Seven Leagues', price:450, desc:'The stuff of Guild legend. Every Windrunner wants a pair eventually.' }
  ],
  cape: [
    { id:'cap0', name:'No Cape',            price:0,   desc:'Sensible. Capes are, Bramble admits, "a bit of a liability in high wind."' },
    { id:'cap1', name:'Simple Cloak',       price:60,  desc:'A dependable travelling companion, rain or shine.' },
    { id:'cap2', name:"Adventurer's Cape",  price:160, desc:'Billows dramatically. Bramble finds this "deeply unnecessary" and "very fun."' },
    { id:'cap3', name:'Starlight Cape',     price:320, desc:'Faintly sparkly, even in daylight. No one — including Bramble — knows why.' }
  ],
  companion: [
    { id:'pet0', name:'Traveling Alone',        price:0,   desc:'Just you, your feet, and the Old Road.' },
    { id:'pet1', name:'Fox Cub "Ember"',        price:90,  desc:'Wandered into the Guild hall one day and never really left. Loyal, if a little nosy.' },
    { id:'pet2', name:'Owl "Sage"',             price:180, desc:'Keeps watch from a nearby branch on every quest. Bramble insists Sage is "extremely judgmental."' },
    { id:'pet3', name:'Wolf Pup "Storm"',       price:350, desc:'Guild-raised since a pup. Never once met a run he didn\'t want to join.' },
    { id:'pet4', name:'Baby Dragon "Whisper"',  price:600, desc:'A gift, Bramble says carefully, "from an old friend in the Foothills." She won\'t say more than that.' }
  ]
};

const EQUIPMENT_SLOTS = ['weapon','armor','head','boots','cape','companion'];

function defaultEquipped() {
  return { weapon:'wpn0', armor:'arm0', head:'hat0', boots:'boo0', cape:'cap0', companion:'pet0' };
}

// ---------- reward + leveling formulas ----------
// XP and gold scale with actual minutes spent running in that session,
// so effort is what's rewarded (not raw session count).
function questRewards(quest) {
  const runMinutes = quest.runSeconds / 60;
  const xp = Math.round(runMinutes * 8) + 10;
  const gold = Math.round(runMinutes * 3) + 10;
  return { xp, gold };
}

// Cumulative XP needed to REACH level n (n=1 is the start).
function totalXpForLevel(n) {
  if (n <= 1) return 0;
  return Math.floor(80 * Math.pow(n, 1.6));
}

function levelFromXp(totalXp) {
  let level = 1;
  while (totalXpForLevel(level + 1) <= totalXp) level++;
  return level;
}

function xpProgress(totalXp) {
  const level = levelFromXp(totalXp);
  const floor = totalXpForLevel(level);
  const ceil = totalXpForLevel(level + 1);
  return { level, floor, ceil, current: totalXp - floor, needed: ceil - floor };
}

const LEVEL_TITLES = [
  'Sleepy-Village Sleeper','Path Finder','Trail Walker','Woodland Wanderer','Hill Climber',
  'Bridge Crosser','Grove Runner','Foothill Scout','Peak Chaser','Mist Runner',
  'Dragon\'s Neighbour','Kingdom Adventurer','Trailblazer','Storm Outrunner','Five-K Hero',
  'Realm Champion','Legend of the Long Run'
];
function levelTitle(level) {
  const idx = Math.min(level - 1, LEVEL_TITLES.length - 1);
  return LEVEL_TITLES[Math.max(idx, 0)];
}
