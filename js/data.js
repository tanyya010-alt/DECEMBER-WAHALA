// DECEMBER WAHALA — static game data. Shared by the browser UI and the
// headless simulation test. Pure data plus a few small helper functions.

const YEAR = 2026;
const SLOTS = ["Morning", "Afternoon", "Evening", "Night"];
const SLOT_ICONS = ["🌅", "☀️", "🌆", "🌙"];

const NEEDS = {
  energy: { label: "Energy", icon: "⚡" },
  belle: { label: "Belle", icon: "🍛" },
  vibes: { label: "Vibes", icon: "🔥" },
};
const DECAY = { energy: 5, belle: 7, vibes: 4 };

const STATS = {
  clout: { label: "Clout", icon: "📱", desc: "How known you are. Posts, VIP, fits." },
  rep: { label: "Reputation", icon: "🤝🏾", desc: "Whether people trust you. Different from clout." },
  conn: { label: "Connections", icon: "🔗", desc: "Who you know. Opens VIP, discounts, gigs." },
};

// ---------------------------------------------------------------- LOOKS
const SKIN = ["#c98d63", "#a96f4a", "#8d5a3b", "#7a4a2e", "#653b24", "#52301d", "#3e2416"];
const HAIR_COLOURS = {
  black: { name: "Jet black", hex: "#141110" },
  brown: { name: "Dark brown", hex: "#3b2417" },
  ginger: { name: "Ginger", hex: "#c0602a" },
  burgundy: { name: "Burgundy", hex: "#6e1f33" },
  honey: { name: "Honey blonde", hex: "#c9954a" },
  platinum: { name: "Platinum", hex: "#e9dcc0" },
};
const OUTFIT_COLOURS = ["#2f7de1", "#1fae68", "#e2483d", "#f59e2e", "#8b5cf6", "#ec4899", "#14b8a6", "#1c2333", "#f3ede0", "#c9a227", "#c0c4cc"];

const HAIR = {
  woman: {
    bonestraight: "Bone-straight wig",
    bodywave: "Body-wave wig",
    frontal: "HD lace frontal",
    bob: "Sleek bob",
    knotless: "Knotless braids",
    fulani: "Fulani braids",
    bun: "Sleek bun",
    afro: "Natural afro",
    curly: "Wet-look curls",
  },
  man: {
    lowfade: "Low fade",
    buzz: "Buzz cut",
    waves: "Waves",
    curls: "Short curls",
    locs: "Locs",
    cornrows: "Cornrows",
    taper: "Taper fade",
  },
};

const FABRICS = { plain: "Plain", ankara: "Ankara", adire: "Adire", asooke: "Aso-oke", sequin: "Sequin" };

// Where each look "eats". Matching your fit to the place gives a bonus.
const STYLES = {
  streetwear: { name: "Luxury streetwear", icon: "🧢", blurb: "Oversized shirt, baggy jeans, designer sneakers, statement shades.", shines: ["concert", "mall", "hustle", "suya"], price: 120000 },
  afrochic: { name: "Afro-chic", icon: "🌺", blurb: "Ankara and Adire with modern cuts — corsets, skirts, trousers.", shines: ["photo", "mall", "hall", "cafe"], price: 70000 },
  glam: { name: "Party glam", icon: "✨", blurb: "Bodycon, minis, sequins, metallics, feathers.", shines: ["lounge", "concert", "club"], price: 150000 },
  oldmoney: { name: "Old money", icon: "🥂", blurb: "Tailored, neutral, clean. Loafers and quiet luxury.", shines: ["lounge", "church", "restaurant", "hotel"], price: 180000 },
  y2k: { name: "Y2K", icon: "🦋", blurb: "Low-rise, crop tops, tiny bags, denim on denim.", shines: ["concert", "beach", "mall", "fastfood"], price: 60000 },
  allblack: { name: "All-black", icon: "🖤", blurb: "Black on black. Leather, boots, dark shades, silver.", shines: ["club", "lounge", "concert"], price: 90000 },
  resort: { name: "Resort", icon: "🌴", blurb: "Linen sets, flowy pieces, crochet, colourful shirts.", shines: ["beach", "photo", "suya"], price: 65000 },
  tradfusion: { name: "Trad fusion", icon: "👑", blurb: "Agbada, kaftan, aso-ebi and gele — styled for now.", shines: ["hall", "church", "family"], price: 80000 },
  christmas: { name: "Christmas fit", icon: "🎄", blurb: "Red, white and festive. Matching-family-pyjamas energy.", shines: ["family", "church", "mall"], price: 55000 },
};

// ---------------------------------------------------------------- TRAITS
const TRAITS = {
  bigspender: { name: "Big Spender", icon: "💸", desc: "Parties and VIP hit harder. Money flies, though." },
  owambe: { name: "Owambe Spirit", icon: "🎉", desc: "Always ready to spray. Parties give extra vibes, but you get bored faster." },
  foodie: { name: "Foodie", icon: "🍲", desc: "Lives for jollof. Food fills you more and lifts your vibes." },
  smooth: { name: "Smooth Talker", icon: "😏", desc: "Mouth sweet like honey. Bluffs and haggling work more often." },
  clout: { name: "Clout Chaser", icon: "📸", desc: "Everything is content. Posting gives 50% more clout." },
  prayer: { name: "Prayer Warrior", icon: "🙏🏾", desc: "Church refills you. Sometimes bad luck just… passes you by." },
  stingy: { name: "Stingy", icon: "🪙", desc: "Pays 15% less for everything. People notice." },
  lazy: { name: "Lazy Bone", icon: "😴", desc: "Sleep restores more. Gigs pay less." },
  peacemaker: { name: "Peacemaker", icon: "🕊️", desc: "Reputation grows faster. Exposing people hurts you more." },
  gossip: { name: "Amebo", icon: "👀", desc: "Uncovers other people's secrets twice as fast." },
  nightcrawler: { name: "Night Crawler", icon: "🦉", desc: "Night actions drain less energy." },
  hustlebrain: { name: "Hustle Brain", icon: "💼", desc: "Sees money everywhere. Gigs pay 25% more." },
};

// ---------------------------------------------------------------- GOALS
const GOALS = {
  legend: { name: "Detty Legend", icon: "🎤", desc: "Have 8 big nights out (concerts, parties, VIP).", check: (s) => s.flags.bignights >= 8 },
  family: { name: "Family Favourite", icon: "👨🏾‍👩🏾‍👧🏾", desc: "End December with 80+ reputation.", check: (s) => s.rep >= 80 },
  owambe: { name: "Owambe Royalty", icon: "👑", desc: "Attend 3 owambes in trad or aso-ebi.", check: (s) => s.flags.owambeTrad >= 3 },
  love: { name: "Love by Crossover", icon: "💞", desc: "Cross over into the new year with someone special.", check: (s) => s.ending && s.ending.kind === "love" },
  viral: { name: "Go Viral", icon: "📈", desc: "Reach 120 clout.", check: (s) => s.clout >= 120 },
  money: { name: "Leave With Money", icon: "🏦", desc: "End December richer than you started.", check: (s, worth) => worth >= s.startWorth },
  padi: { name: "Everybody's Padi", icon: "🤝🏾", desc: "Reach 80 connections.", check: (s) => s.conn >= 80 },
  truth: { name: "Who Are You Really?", icon: "🕵🏾", desc: "Uncover 4 people's secrets.", check: (s) => Object.values(s.npcs).filter((n) => n.secret >= 100).length + (s.flags.playerSecrets || 0) >= 4 },
};

// ---------------------------------------------------------------- PERSONAS
// score: points from traits and goal that decide which persona you become.
const PERSONAS = {
  ijgb: {
    name: "Real IJGB", icon: "🧳", tagline: "\"I Just Got Back.\" With real dollars.",
    start: { naira: 200000, usd: 3000, clout: 45, rep: 50, conn: 20 },
    visitor: true,
    resource: { key: "usd", label: "Dollars", icon: "💵" },
    good: "Abroad Price — you can pay in dollars anywhere and unlock premium experiences.",
    bad: "You Came Back With Money — vendors charge you 25% more and family requests never stop.",
    ability: { name: "Dollar Rain", icon: "💵", desc: "Spray $100 on the spot. Big vibes, big clout.", perDay: 1 },
    secret: "The dollars are mostly on a credit card. You're not as rich as everyone thinks.",
    win: "Enjoy December without letting family demands drain you.",
    score: { bigspender: 2, prayer: 1, family: 2, foodie: 1 },
  },
  wannabe: {
    name: "Wannabe IJGB", icon: "🎭", tagline: "Fake accent. Borrowed drip. Never left Naija.",
    start: { naira: 70000, usd: 0, clout: 60, rep: 45, conn: 30 },
    resource: { key: "res", label: "Authenticity", icon: "🎭", start: 60 },
    good: "Fake It — pump your clout for free.",
    bad: "Expose Him! — certain questions can blow your cover.",
    ability: { name: "Fake It", icon: "🕶️", desc: "+10 clout for free. Costs authenticity.", perDay: 2 },
    secret: "You've never left Nigeria. \"London\" is your cousin's Instagram.",
    win: "Finish December with your cover story intact.",
    score: { smooth: 3, clout: 2, viral: 2, legend: 1 },
  },
  japa: {
    name: "Japa Returnee", icon: "✈️", tagline: "New PR, new accent, old friends.",
    start: { naira: 150000, usd: 2000, clout: 40, rep: 55, conn: 30 },
    visitor: true,
    resource: { key: "res", label: "Japa Knowledge", icon: "📄", start: 60 },
    good: "I Know The Process — help people with visa info for connections and respect.",
    bad: "\"How Do I Come?\" — everybody wants to japa through you.",
    ability: { name: "I Know The Process", icon: "📄", desc: "Give visa advice. +Connections +Reputation.", perDay: 2 },
    secret: "You're struggling abroad: two jobs, one couch, and a lot of debt.",
    win: "Help without being drained — and don't let them find out how hard it is over there.",
    score: { peacemaker: 2, hustlebrain: 1, money: 2, padi: 2, truth: 1 },
  },
  firsttimer: {
    name: "First-Timer Diaspora", icon: "👶🏾", tagline: "Born abroad. First Naija December. Wide eyes.",
    start: { naira: 150000, usd: 1500, clout: 35, rep: 50, conn: 10 },
    visitor: true,
    resource: { key: "res", label: "Culture Points", icon: "🪘", start: 0 },
    good: "Auntie Adoption — aunties take you under their wing, feed you and teach you.",
    bad: "Culture Shock — Naija situations catch you off guard.",
    ability: { name: "Auntie Adoption", icon: "🤗", desc: "An aunty feeds you and teaches you. +Culture.", perDay: 1 },
    secret: "You don't understand half the culture you pretend to get.",
    win: "Earn your culture points and come out a true Naija child.",
    score: { foodie: 2, prayer: 1, love: 2, peacemaker: 1, family: 1 },
  },
  hustler: {
    name: "Local Hustler", icon: "💪🏾", tagline: "December is not for enjoyment. December is for collection.",
    start: { naira: 50000, usd: 0, clout: 20, rep: 50, conn: 45 },
    resource: { key: "res", label: "Hustle", icon: "💼", start: 20 },
    good: "I Know A Guy — find a cheaper alternative for almost anything.",
    bad: "Burnout — hustling drains energy fast.",
    ability: { name: "I Know A Guy", icon: "📞", desc: "Your next purchase is half price. Costs hustle.", perDay: 1 },
    secret: "A once-in-a-lifetime opportunity is coming. If you play it right, it changes everything.",
    win: "Stack the money everyone else is spending — without burning out.",
    score: { hustlebrain: 3, stingy: 2, money: 3, lazy: -2 },
  },
  influencer: {
    name: "Soft-Life Influencer", icon: "📱", tagline: "Living the soft life. On camera, at least.",
    start: { naira: 120000, usd: 0, clout: 80, rep: 40, conn: 35 },
    resource: { key: "res", label: "Engagement", icon: "💬", start: 70 },
    good: "Post It — turn almost anything into content. Brands send free experiences.",
    bad: "Engagement — stop posting and it drops. Your lifestyle costs more than your income.",
    ability: { name: "Post It", icon: "🤳🏾", desc: "Post from wherever you are. +Clout +Engagement.", perDay: 3 },
    secret: "You're almost broke. The \"brand deals\" are mostly you.",
    win: "Stay on top of the feed without the money running out.",
    score: { clout: 3, viral: 3, bigspender: 1 },
  },
  pikin: {
    name: "Chief's Pikin", icon: "👑", tagline: "Daddy's name opens doors. And wallets. Mostly yours.",
    start: { naira: 900000, usd: 500, clout: 55, rep: 45, conn: 40 },
    resource: { key: "res", label: "Family Influence", icon: "🏛️", start: 80 },
    good: "Daddy Will Handle It — some expensive problems just disappear.",
    bad: "Black Tax — the richer you look, the more relatives ask.",
    ability: { name: "Daddy's Card", icon: "💳", desc: "Get ₦200k from Daddy. Costs influence.", perDay: 1 },
    secret: "The family money isn't yours. Daddy's business is shakier than anyone knows.",
    win: "Enjoy the money you have — before the relatives take it all.",
    score: { bigspender: 3, legend: 2, nightcrawler: 1 },
  },
  aunty: {
    name: "Owambe Aunty / Uncle", icon: "💃🏾", tagline: "Everybody knows you. You know everybody's business.",
    start: { naira: 250000, usd: 0, clout: 40, rep: 60, conn: 70 },
    resource: { key: "gossip", label: "Gossip", icon: "🗣️", start: 2 },
    good: "Everybody Knows Me — discounts at markets and events, invites others can't get.",
    bad: "FOMO — too many events, and you can't attend them all.",
    ability: { name: "Trade Gossip", icon: "🗣️", desc: "Trade one piece of gossip for a favour.", perDay: 2 },
    secret: "You know everyone's secrets — and you're the reason half of them got out.",
    win: "Be at every event that matters and keep everyone's secrets… or don't.",
    // The "owambe" key matches both the Owambe Spirit trait and the Owambe Royalty goal.
    score: { owambe: 3, gossip: 3, padi: 1, truth: 1 },
  },
};

// ---------------------------------------------------------------- PLACES
const AREAS = {
  lagos: {
    yaba: { name: "Yaba", blurb: "Mainland, cheap, central. Tech bros everywhere.", stay: 150000, travel: 1.0, traffic: 0, clout: 0, x: 330, y: 190 },
    surulere: { name: "Surulere", blurb: "Owambe headquarters. Aunties know you by name.", stay: 120000, travel: 1.0, traffic: 0.05, conn: 10, clout: 0, x: 220, y: 235 },
    lekki: { name: "Lekki Phase 1", blurb: "Close to the beach and lounges. Traffic on the bridge, though.", stay: 450000, travel: 1.3, traffic: 0.1, clout: 10, x: 760, y: 470 },
    ikoyi: { name: "Ikoyi", blurb: "Old money and quiet streets. Everybody wants to be you.", stay: 800000, travel: 1.5, traffic: -0.1, clout: 20, x: 610, y: 395 },
    ajah: { name: "Ajah", blurb: "Cheap and far. Traffic is a lifestyle.", stay: 90000, travel: 0.9, traffic: 0.2, clout: -5, x: 915, y: 500 },
  },
  abuja: {
    gwarinpa: { name: "Gwarinpa", blurb: "Family estates, cheap and calm.", stay: 120000, travel: 1.0, traffic: 0, clout: 0, x: 230, y: 130 },
    wuse2: { name: "Wuse 2", blurb: "Restaurants and lounges on every street.", stay: 400000, travel: 1.2, traffic: 0.05, clout: 10, x: 470, y: 300 },
    maitama: { name: "Maitama", blurb: "Embassies and big men. Very quiet money.", stay: 750000, travel: 1.5, traffic: -0.1, clout: 20, x: 620, y: 150 },
    asokoro: { name: "Asokoro", blurb: "Gated and green. Politicians are your neighbours.", stay: 700000, travel: 1.4, traffic: -0.1, clout: 15, conn: 5 },
    kubwa: { name: "Kubwa", blurb: "Cheap, busy and far. The expressway owns your time.", stay: 80000, travel: 0.9, traffic: 0.15, clout: -5, x: 90, y: 70 },
  },
};

// Map coordinates are on a 1000 x 640 canvas.
const CITIES = {
  lagos: {
    name: "Lagos", trafficChance: 0.42, fxBias: 0,
    tagline: "Eko o ni baje. Traffic go baje you sha.",
    places: {
      home: { name: "Home", icon: "🏠", x: 260, y: 170 },
      airport: { name: "Murtala Muhammed Airport", icon: "✈️", x: 140, y: 78 },
      mall: { name: "Ikeja City Mall", icon: "🛍️", x: 370, y: 128 },
      hustle: { name: "Computer Village", icon: "📱", x: 560, y: 92 },
      buka: { name: "Amala Shitta", icon: "🍲", x: 180, y: 290 },
      hall: { name: "Surulere Event Centre", icon: "🎊", x: 330, y: 260 },
      church: { name: "Parish, Ebute Metta", icon: "⛪", x: 470, y: 230 },
      market: { name: "Balogun Market", icon: "🧺", x: 400, y: 440 },
      culture: { name: "Freedom Park", icon: "🎭", x: 470, y: 500 },
      lounge: { name: "Victoria Island Lounges", icon: "🍾", x: 660, y: 452 },
      venue: { name: "Eko Atlantic Festival Grounds", icon: "🎤", x: 560, y: 560 },
      beach: { name: "Oniru Beach", icon: "🏖️", x: 790, y: 545 },
    },
  },
  abuja: {
    name: "Abuja", trafficChance: 0.16, fxBias: -20,
    tagline: "Clean roads, big men, bigger owambes.",
    places: {
      home: { name: "Home", icon: "🏠", x: 220, y: 160 },
      airport: { name: "Nnamdi Azikiwe Airport", icon: "✈️", x: 120, y: 560 },
      mall: { name: "Jabi Lake Mall", icon: "🛍️", x: 300, y: 300 },
      hustle: { name: "Banex Plaza", icon: "📱", x: 520, y: 250 },
      buka: { name: "Area 11 Suya Spot", icon: "🍢", x: 610, y: 400 },
      hall: { name: "Abuja Event Centre", icon: "🎊", x: 430, y: 380 },
      church: { name: "Parish in Garki", icon: "⛪", x: 690, y: 470 },
      market: { name: "Wuse Market", icon: "🧺", x: 460, y: 170 },
      culture: { name: "Arts & Crafts Village", icon: "🎭", x: 560, y: 540 },
      lounge: { name: "Maitama Lounges", icon: "🍾", x: 700, y: 170 },
      venue: { name: "Eagle Square Concert Grounds", icon: "🎤", x: 800, y: 330 },
      beach: { name: "Millennium Park", icon: "🌳", x: 830, y: 220 },
    },
  },
};

const TRANSPORT = {
  trek: { name: "Trek", icon: "🚶🏾", cost: 0, energy: -8, trafficMod: 0, walk: true },
  danfo: { name: "Danfo", icon: "🚌", cost: 700, energy: -4, trafficMod: 1.0, cheap: true },
  okada: { name: "Okada", icon: "🏍️", cost: 1500, energy: -3, trafficMod: 0.4, cheap: true },
  ride: { name: "Bolt", icon: "🚗", cost: 6500, energy: 0, trafficMod: 1.0 },
};

// ---------------------------------------------------------------- PEOPLE
// Other people in town. Each one is hiding something.
const NPCS = [
  { id: "tobi", name: "Cousin Tobi", persona: "ijgb", from: "London 🇬🇧", arrives: 11, rel: 50, places: ["lounge", "beach", "venue", "buka", "home"],
    look: { body: "man", skin: 3, hair: "waves", hairColour: "black", style: "streetwear", colour: 7, fabric: "plain", shades: true, chain: true },
    note: "Says \"innit\" every two minutes.", secret: "He lost his job in London in June. The trip is on his overdraft.",
    favour: { text: "Tobi quietly sends you $200: \"for keeping my business private, cuz.\"", usd: 200 } },
  { id: "funke", name: "Aunty Funke", persona: "japa", from: "Houston 🇺🇸", arrives: 16, rel: 40, places: ["hall", "church", "market", "home"],
    look: { body: "woman", skin: 4, hair: "frontal", hairColour: "burgundy", style: "tradfusion", colour: 9, fabric: "asooke", gele: true },
    note: "Brought 6 suitcases. 4 are for other people.", secret: "Her 'Houston mansion' is a one-bedroom she shares with two nurses.",
    favour: { text: "Aunty Funke vouches for you at every party. Aunties now hail you on sight.", conn: 15, rep: 8 } },
  { id: "chidi", name: "Chidi", persona: "japa", from: "Toronto 🇨🇦", arrives: 19, rel: 55, places: ["lounge", "venue", "buka", "beach"],
    look: { body: "man", skin: 5, hair: "locs", hairColour: "black", style: "resort", colour: 6, fabric: "adire", shades: true },
    note: "Your guy from uni. Just got PR, now on 'soft life'.", secret: "He works three jobs and sleeps on a friend's couch in Brampton.",
    favour: { text: "Chidi introduces you to his Toronto crew. Your connections jump.", conn: 15 } },
  { id: "kemi", name: "Kemi", persona: "influencer", from: null, arrives: 0, rel: 45, romance: true, places: ["lounge", "beach", "mall", "venue", "culture"],
    look: { body: "woman", skin: 2, hair: "bonestraight", hairColour: "honey", style: "glam", colour: 8, fabric: "sequin", chain: true },
    note: "Your ex. Or are you? It's complicated.", secret: "Her 'brand deals' are paid for with a loan app.",
    favour: { text: "Kemi gives you a shoutout to her followers. Your phone won't stop buzzing.", clout: 20 } },
  { id: "dayo", name: "Dayo", persona: "wannabe", from: null, arrives: 0, rel: 40, places: ["lounge", "venue", "mall", "beach"],
    look: { body: "man", skin: 2, hair: "taper", hairColour: "black", style: "allblack", colour: 7, fabric: "plain", shades: true, chain: true },
    note: "Says he's 'from London'. Can't name a single tube stop.", secret: "Dayo has never left Lagos. The 'London' pictures are from a mall in Lekki.",
    favour: { text: "Dayo, grateful, gets you free VIP entry at his friend's lounge.", flag: "freeVip" } },
  { id: "tunde", name: "Big Tunde", persona: "pikin", from: null, arrives: 0, rel: 45, places: ["lounge", "venue", "beach", "mall"],
    look: { body: "man", skin: 4, hair: "lowfade", hairColour: "black", style: "oldmoney", colour: 8, fabric: "plain", chain: true },
    note: "Senator's son. Pops champagne for fun.", secret: "His father's accounts were frozen last month. He's spending what's left.",
    favour: { text: "Big Tunde hands you a backstage pass to the Detty Fest concert.", flag: "freeConcert" } },
  { id: "nkechi", name: "Mama Nkechi", persona: "aunty", from: null, arrives: 0, rel: 50, places: ["hall", "market", "church", "buka"],
    look: { body: "woman", skin: 5, hair: "bun", hairColour: "black", style: "tradfusion", colour: 4, fabric: "ankara", gele: true },
    note: "Owambe royalty. Knows where the bodies are buried.", secret: "She's been borrowing to keep up appearances at every party.",
    favour: { text: "Mama Nkechi gives you the family aso-ebi for free. \"My pikin, wear am well.\"", style: "tradfusion" } },
  { id: "seun", name: "Seun", persona: "hustler", from: null, arrives: 0, rel: 45, romance: true, places: ["hustle", "venue", "buka", "culture"],
    look: { body: "man", skin: 6, hair: "cornrows", hairColour: "black", style: "streetwear", colour: 1, fabric: "plain" },
    note: "Event photographer. Always busy, always smiling.", secret: "He's secretly building a startup and just got a meeting with investors.",
    favour: { text: "Seun shoots your December photos for free. The pictures are fire.", clout: 15, vibes: 10 } },
];

// ---------------------------------------------------------------- ACTIONS
// fx: needs. clout/rep/conn: stats. res: persona resource. slots: time.
// big: counts as a "big night". gig: pay in naira (affected by hustle).
// premium: only Real IJGB, Chief's Pikin or 100+ clout.
const ACTIONS = [
  // HOME
  { id: "sleep", place: "home", name: "Sleep", icon: "😴", slots: 0, special: "sleep", desc: "Sleep till morning." },
  { id: "nap", place: "home", name: "Take a nap", icon: "🛌", slots: 1, fx: { energy: 22 } },
  { id: "cook", place: "home", name: "Cook party jollof", icon: "🥘", slots: 1, cost: 8000, fx: { belle: 40, vibes: 6 }, food: true, special: "cook" },
  { id: "noodles", place: "home", name: "Indomie and egg", icon: "🍜", slots: 1, cost: 1500, fx: { belle: 22 }, food: true, cheap: true },
  { id: "host", place: "home", name: "Host the crew", icon: "🏡", slots: 1, cost: 30000, fx: { vibes: 18, energy: -8 }, conn: 4, rep: 3, relAll: 6, cond: "crewInTown" },
  { id: "gen", place: "home", name: "Buy fuel for the gen", icon: "⛽", slots: 1, cost: 12000, special: "gen", desc: "Light for 8 time slots." },
  { id: "confess", place: "home", name: "Come clean to family", icon: "🫣", slots: 1, special: "confess", desc: "Tell the truth about your secret before someone else does.", cond: "canConfess" },

  // MARKET
  { id: "asoebi", place: "market", name: "Buy aso-ebi (trad fusion fit)", icon: "🧵", slots: 1, cost: 45000, special: "buystyle", style: "tradfusion", desc: "No aso-ebi, no owambe. Na law." },
  { id: "afrochic", place: "market", name: "Get an Ankara piece sewn", icon: "🪡", slots: 1, cost: 40000, special: "buystyle", style: "afrochic" },
  { id: "goat", place: "market", name: "Haggle for the Christmas goat", icon: "🐐", slots: 1, special: "goat" },
  { id: "foodstuff", place: "market", name: "Buy foodstuff for the house", icon: "🛒", slots: 1, cost: 30000, rep: 5, conn: 2 },
  { id: "smallchops", place: "market", name: "Sell small chops", icon: "🥟", slots: 1, gig: 18000, fx: { energy: -12 }, gigType: "food" },

  // MALL
  { id: "shop", place: "mall", name: "Shop a new fit", icon: "🛍️", slots: 1, special: "shop", desc: "Add a new style to your wardrobe." },
  { id: "gifts", place: "mall", name: "Shop Christmas gifts", icon: "🎁", slots: 1, cost: 60000, special: "gifts" },
  { id: "cinema", place: "mall", name: "Catch a movie", icon: "🎬", slots: 1, cost: 7000, fx: { vibes: 16 } },
  { id: "eatout", place: "mall", name: "Eat somewhere fancy", icon: "🍽️", slots: 1, cost: 25000, fx: { belle: 40, vibes: 10 }, clout: 2, food: true },
  { id: "bdc", place: "mall", name: "Change dollars", icon: "💱", slots: 0, special: "bdc" },

  // HUSTLE
  { id: "phones", place: "hustle", name: "Sell phones for your guy", icon: "📦", slots: 1, gig: 22000, fx: { energy: -14 }, gigType: "sales" },
  { id: "delivery", place: "hustle", name: "Do delivery runs", icon: "🛵", slots: 1, gig: 16000, fx: { energy: -16 }, gigType: "delivery" },
  { id: "rides", place: "hustle", name: "Drive for Bolt", icon: "🚗", slots: 2, gig: 45000, fx: { energy: -20 }, gigType: "rides" },
  { id: "merch", place: "hustle", name: "Print and sell Detty merch", icon: "👕", slots: 1, cost: 20000, gig: 50000, fx: { energy: -12 }, gigType: "merch", cond: "lateDecember" },

  // BUKA
  { id: "amala", place: "buka", name: "Chop amala and gbegiri", icon: "🍲", slots: 1, cost: 3500, fx: { belle: 45, vibes: 6 }, food: true, cheap: true },
  { id: "suya", place: "buka", name: "Suya and cold drink", icon: "🍢", slots: 1, cost: 5000, fx: { belle: 25, vibes: 10 }, food: true, cheap: true },
  { id: "pepsoup", place: "buka", name: "Pepper soup gist session", icon: "🌶️", slots: 1, cost: 8000, fx: { belle: 20, vibes: 8 }, conn: 6, gossip: 1 },

  // HALL
  { id: "crash", place: "hall", name: "Crash a random wedding", icon: "🕺🏾", slots: 1, special: "crash", desc: "Jollof, small chops and a live band. Just don't get caught." },
  { id: "network", place: "hall", name: "Network with the aunties", icon: "🗣️", slots: 1, fx: { energy: -6 }, conn: 8, gossip: 1 },
  { id: "setup", place: "hall", name: "Event setup gig", icon: "🪑", slots: 1, gig: 25000, fx: { energy: -18 }, gigType: "setup" },

  // CHURCH
  { id: "service", place: "church", name: "Attend service", icon: "🙏🏾", slots: 1, fx: { vibes: 12 }, rep: 5, special: "church" },
  { id: "carol", place: "church", name: "Carol practice", icon: "🎶", slots: 1, fx: { vibes: 14 }, rep: 3, conn: 3 },

  // CULTURE
  { id: "art", place: "culture", name: "Catch the art show", icon: "🖼️", slots: 1, cost: 5000, fx: { vibes: 14 }, culture: 8 },
  { id: "dance", place: "culture", name: "Learn the new dance", icon: "💃🏾", slots: 1, cost: 3000, fx: { vibes: 16, energy: -10 }, clout: 3, culture: 10 },
  { id: "souvenir", place: "culture", name: "Buy souvenirs to take back", icon: "🪘", slots: 1, cost: 25000, rep: 3, culture: 5, cond: "visitor" },

  // LOUNGE
  { id: "party", place: "lounge", name: "Turn up at the lounge", icon: "🪩", slots: 1, cost: 25000, fx: { vibes: 26, energy: -14 }, clout: 4, big: true, night: true, memory: "🪩 Turned up at the lounge" },
  { id: "vip", place: "lounge", name: "Book a VIP table", icon: "🍾", slots: 1, cost: 400000, fx: { vibes: 40, energy: -18 }, clout: 18, conn: 6, big: true, night: true, premium: true, special: "vip", memory: "🍾 Booked a VIP table with sparklers" },
  { id: "promo", place: "lounge", name: "Promote tonight's party", icon: "📣", slots: 1, gig: 30000, fx: { energy: -12 }, conn: 4, night: true, gigType: "promo" },

  // BEACH
  { id: "chill", place: "beach", name: "Chill and catch breeze", icon: "🌴", slots: 1, cost: 3000, fx: { vibes: 14, energy: 6 } },
  { id: "picnic", place: "beach", name: "Picnic with the crew", icon: "🧺", slots: 1, cost: 18000, fx: { vibes: 18, belle: 15 }, relAll: 5, cond: "crewInTown", memory: "🧺 Picnic with the crew" },
  { id: "dayparty", place: "beach", name: "Hit the beach day-party", icon: "🥂", slots: 1, cost: 30000, fx: { vibes: 28, energy: -12 }, clout: 5, big: true, memory: "🥂 Beach day-party" },
  { id: "yacht", place: "beach", name: "Private boat party", icon: "🛥️", slots: 2, cost: 350000, fx: { vibes: 45, energy: -16 }, clout: 20, conn: 8, big: true, premium: true, memory: "🛥️ Private boat party" },

  // VENUE
  { id: "concert", place: "venue", name: "Detty Fest concert", icon: "🎤", slots: 2, cost: 85000, fx: { vibes: 50, energy: -25 }, clout: 10, big: true, cond: "concertDay", special: "concert", memory: "🎤 Detty Fest concert" },
  { id: "photo", place: "venue", name: "Event photography gig", icon: "📸", slots: 1, gig: 40000, fx: { energy: -14 }, conn: 3, gigType: "photo", cond: "concertDay" },
  { id: "resale", place: "venue", name: "Resell concert tickets", icon: "🎟️", slots: 1, cost: 60000, gig: 110000, fx: { energy: -8 }, gigType: "resale", cond: "concertDay", special: "resale" },
  { id: "warmup", place: "venue", name: "Hang at the warm-up stage", icon: "🎶", slots: 1, cost: 10000, fx: { vibes: 18 }, clout: 2 },

  // AIRPORT
  { id: "pickup", place: "airport", name: "Pick up arriving family", icon: "🛬", slots: 1, special: "pickup", cond: "arrivals" },
  { id: "spot", place: "airport", name: "Watch IJGBs arrive in matching tracksuits", icon: "👀", slots: 1, fx: { vibes: 8 }, gossip: 1 },
];

const CONCERT_DAYS = [20, 26, 27, 28];

// ---------------------------------------------------------------- EVENTS
// Choice fields: label, cost (naira), usd, fx, clout, rep, conn, res, culture,
// exposure, gossip, slots, memory, flag, roll {use, base, win, lose}, daddy.
const RANDOM_EVENTS = [
  // --- universal
  { id: "nepa", title: "NEPA Don Take Light!", icon: "🔌", weight: 7, cond: "lightOn",
    text: "The whole street don black out. Your neighbour's gen don start dey shout like Agege bread machine.",
    choices: [
      { label: "Endure am", fx: { vibes: -8 }, flag: "lightOff" },
      { label: "Tap from neighbour's gen (₦10k)", cost: 10000, flag: "lightOff", gen: 4 },
    ] },
  { id: "upnepa", title: "UP NEPA!!", icon: "💡", weight: 5, cond: "lightOff",
    text: "Light don come back! The whole street shouts \"UP NEPA!\" at the same time.",
    choices: [{ label: "Charge every single device", fx: { vibes: 8 }, flag: "lightOn" }] },
  { id: "marriage", title: "\"When Are You Bringing Someone?\"", icon: "💍", weight: 6,
    text: "One aunty you don't even know corners you: \"Ehen! You never marry? Your mates are carrying twins o!\"",
    choices: [
      { label: "Smile: \"By God's grace, ma\"", fx: { vibes: -6 }, rep: 3 },
      { label: "Ask about her own daughter's wedding", fx: { vibes: 10 }, rep: -6, gossip: 1 },
    ] },
  { id: "checkpoint", title: "Checkpoint Wahala", icon: "🚓", weight: 4, cond: "out",
    text: "\"Oga, where your particulars? Wetin dey that bag? You fit find something for the boys?\"",
    choices: [
      { label: "Settle them (₦5k)", cost: 5000, fx: { vibes: -5 } },
      { label: "Know your rights", roll: { use: "street", base: 0.35, win: { rep: 3, text: "They waved you on." }, lose: { cost: 10000, slots: 1, text: "They held you for an hour and still collected ₦10k." } } },
    ] },
  { id: "fuel", title: "Fuel Scarcity!", icon: "⛽", weight: 3,
    text: "Petrol stations have queues to the next street. Black market boys are selling at double.",
    choices: [
      { label: "Join the queue", fx: { energy: -12, vibes: -6 }, slots: 1 },
      { label: "Buy black market (₦20k)", cost: 20000, gen: 8 },
      { label: "Forget the gen", fx: { vibes: -4 } },
    ] },
  { id: "jollofwar", title: "Jollof War", icon: "🍚", weight: 3, cond: "crewInTown",
    text: "Tobi's Ghanaian friend from London just said Ghana jollof is better. The whole room has gone quiet.",
    choices: [
      { label: "Defend Naija jollof with your life", fx: { vibes: 12 }, clout: 3 },
      { label: "Diplomacy: \"Both are nice\"", rep: 2, fx: { vibes: -4 } },
    ] },
  { id: "snatch", title: "Phone Snatcher!", icon: "🏃🏾", weight: 2, cond: "out",
    text: "A boy on a bike nearly snatches your phone in traffic!",
    choices: [
      { label: "Hold it tight!", roll: { use: "street", base: 0.45, win: { clout: 3, text: "You held on like Chelsea defence. Phone safe!" }, lose: { cost: 80000, fx: { vibes: -15 }, text: "They got it. New phone: ₦80,000." } } },
      { label: "Let it go, life first", cost: 80000, fx: { vibes: -10 } },
    ] },
  { id: "harmattan", title: "Harmattan Don Land", icon: "🌫️", weight: 3,
    text: "Dust everywhere. Lips cracking, everybody coughing, visibility like ten metres.",
    choices: [{ label: "Rub Vaseline and move on", fx: { energy: -4 } }] },
  { id: "groupchat", title: "Family Group Chat", icon: "📢", weight: 4,
    text: "\"Everybody should contribute ₦30k for Grandma's 90th. List starts now.\" Your name is next.",
    choices: [
      { label: "Contribute ₦30k", cost: 30000, rep: 7 },
      { label: "Type \"Noted 🙏🏾\" and disappear", rep: -6, ijgbExposure: 8 },
    ] },
  { id: "viral", title: "You Don Go Viral!", icon: "📈", weight: 2, cond: "clout30",
    text: "Your video of Aunty Funke bargaining with a Lagos mechanic has two million views.",
    choices: [{ label: "Enjoy the fame", clout: 15, fx: { vibes: 12 }, news: "viral" }] },
  { id: "freeinvite", title: "You're On The List", icon: "📩", weight: 3, cond: "conn50",
    text: "A friend of a friend added you to the guest list for tonight's rooftop party. Free entry, free drinks.",
    choices: [
      { label: "Go! (1 slot)", fx: { vibes: 24, energy: -10 }, clout: 5, conn: 3, slots: 1, big: true, memory: "🌃 Free rooftop party" },
      { label: "Pass", fx: { vibes: -3 } },
    ] },

  // --- Real IJGB
  { id: "ij_iphone", title: "Aunty Wants an iPhone", icon: "📱", weight: 8, persona: "ijgb",
    text: "\"My dear, how is abroad? Ehen, my son's phone fell inside gutter. You people have iPhone everywhere there.\"",
    choices: [
      { label: "Buy it ($700)", usd: 700, rep: 10 },
      { label: "\"I'll send something small\" ($100)", usd: 100, rep: 2 },
      { label: "\"Abroad is hard too, ma\"", rep: -6, exposure: 12 },
    ] },
  { id: "ij_fees", title: "School Fees Emergency", icon: "🎓", weight: 6, persona: "ijgb",
    text: "Your cousin: \"They'll send me out of school on Monday if I don't pay ₦400k. You're the only one who can help.\"",
    choices: [
      { label: "Pay it ($300)", usd: 300, rep: 10 },
      { label: "Pay half ($150)", usd: 150, rep: 4 },
      { label: "Say you'll check and ghost", rep: -8, exposure: 10 },
    ] },
  { id: "ij_driver", title: "\"Na ₦45k, Oga\"", icon: "🚕", weight: 6, persona: "ijgb", cond: "out",
    text: "The driver heard your accent and quoted triple the normal price with a straight face.",
    choices: [
      { label: "Just pay, you're tired", cost: 45000 },
      { label: "Argue in your best pidgin", roll: { use: "street", base: 0.25, win: { cost: 15000, culture: 0, text: "He laughed and gave you the real price." }, lose: { cost: 30000, fx: { vibes: -8 }, text: "\"Your pidgin get accent o.\" You paid ₦30k." } } },
    ] },
  { id: "ij_unlimited", title: "\"Abeg Settle the Bill\"", icon: "🧾", weight: 5, persona: "ijgb",
    text: "Twelve friends ordered everything on the menu, then the waiter walked straight to you with the bill.",
    choices: [
      { label: "Pay the ₦250k bill", cost: 250000, conn: 8, clout: 4 },
      { label: "Split it", rep: -3, exposure: 8 },
    ] },

  // --- Wannabe IJGB
  { id: "wb_uni", title: "\"Which University Did You Attend?\"", icon: "🎓", weight: 8, persona: "wannabe",
    text: "A UK-born guest lights up: \"Oh you were in London? Which uni? I was at King's!\"",
    choices: [
      { label: "Bluff: \"Uhh… University of London… Central\"", roll: { use: "res", base: 0.05, win: { clout: 5, text: "She nodded. You survived." }, lose: { exposure: 30, res: -10, text: "\"That's not a place.\" Silence. Phones come out." } } },
      { label: "Change the topic to jollof", res: -4, exposure: 6 },
      { label: "Admit you did your degree in UNILAG", res: 20, exposure: -20, clout: -8, rep: 6 },
    ] },
  { id: "wb_lang", title: "She Switched to Yoruba", icon: "🗣️", weight: 6, persona: "wannabe",
    text: "Mid-conversation, someone switches to Yoruba to test you: \"Ṣe o ti jẹun?\" You've been pretending you forgot it abroad.",
    choices: [
      { label: "\"Sorry, my Yoruba is rusty from abroad\"", roll: { use: "res", base: 0.1, win: { clout: 3, text: "They bought it. Barely." }, lose: { exposure: 22, text: "\"Rusty? You answered your mum in Yoruba yesterday.\"" } } },
      { label: "Answer fluently and laugh it off", res: 10, exposure: 10, rep: 4 },
    ] },
  { id: "wb_outfit", title: "\"Isn't That Tunde's Jacket?\"", icon: "🧥", weight: 5, persona: "wannabe", cond: "out",
    text: "Someone squints at your designer jacket: \"Wait… Big Tunde wore this exact one last week. Same stain.\"",
    choices: [
      { label: "\"There are many of these in London\"", roll: { use: "res", base: 0.1, win: { text: "They let it slide." }, lose: { exposure: 25, clout: -5, text: "Big Tunde walked in. Wearing nothing on top. Looking for his jacket." } } },
      { label: "Laugh: \"Okay, I borrowed it\"", exposure: 8, rep: 3, clout: -3 },
    ] },
  { id: "wb_story", title: "The London Story Doesn't Add Up", icon: "🇬🇧", weight: 5, persona: "wannabe",
    text: "\"You said you lived in Peckham. Then Manchester. Then Peckham again. Which one?\"",
    choices: [
      { label: "\"I moved around a lot, innit\"", roll: { use: "res", base: 0.15, win: { clout: 2, text: "Smooth. Nobody followed up." }, lose: { exposure: 20, text: "They opened Google Maps. On you." } } },
      { label: "Excuse yourself to the bathroom", fx: { vibes: -6 }, exposure: 5 },
    ] },

  // --- Japa Returnee
  { id: "jp_how", title: "\"Please, How Did You Japa?\"", icon: "🛂", weight: 9, persona: "japa",
    text: "Your barber, his brother, and two strangers in line all want to know your exact process. Right now.",
    choices: [
      { label: "Explain everything (1 slot)", slots: 1, fx: { energy: -10 }, rep: 6, conn: 6, res: 3 },
      { label: "\"Send me a DM\"", rep: -2 },
    ] },
  { id: "jp_sponsor", title: "\"Can You Sponsor Me?\"", icon: "📝", weight: 6, persona: "japa",
    text: "Your old classmate asks you to sponsor his visa. \"I'll pay you back once I land.\"",
    choices: [
      { label: "Promise to try", rep: 4, exposure: 8 },
      { label: "Be honest: \"Bro, I can barely sponsor myself\"", rep: 2, exposure: 18, conn: -3 },
      { label: "Give him the official links instead", res: 5, rep: 3 },
    ] },
  { id: "jp_pack", title: "Take This Back Abroad", icon: "🧳", weight: 5, persona: "japa",
    text: "Your mum packed 15kg of garri, crayfish and dried fish for 'your aunty in Mississauga'.",
    choices: [
      { label: "Pay for the extra bag ($150)", usd: 150, rep: 8 },
      { label: "Sneak half of it out", rep: -4, fx: { vibes: 4 } },
    ] },
  { id: "jp_close", title: "Old Friends, New Energy", icon: "🫂", weight: 5, persona: "japa",
    text: "People who ignored you for three years are suddenly calling you 'my brother'. One wants to know how much you earn.",
    choices: [
      { label: "Exaggerate a little", clout: 5, exposure: 15 },
      { label: "\"It's not as rosy as it looks\"", rep: 5, exposure: 10, conn: 3 },
    ] },

  // --- First-Timer Diaspora (culture: the correct choice earns culture points)
  { id: "ft_child", title: "\"My Child!\"", icon: "🤗", weight: 7, persona: "firsttimer",
    text: "Every woman over 40 calls you 'my child' and asks if you've eaten. You haven't met any of them before.",
    choices: [
      { label: "Kneel or bow and say \"Good afternoon, ma\"", culture: 10, rep: 4 },
      { label: "Offer a handshake and say \"Hey!\"", culture: -5, exposure: 8, rep: -3 },
    ] },
  { id: "ft_light", title: "Why Did the Power Go Off?", icon: "🔦", weight: 6, persona: "firsttimer",
    text: "Mid-shower, total darkness. Everyone else in the house kept talking like nothing happened.",
    choices: [
      { label: "Shout \"UP NEPA!\" when it returns", culture: 10, fx: { vibes: 6 } },
      { label: "Ask who to call to report the outage", culture: -4, exposure: 6, fx: { vibes: -4 } },
    ] },
  { id: "ft_midnight", title: "Why Does the Party Start at Midnight?", icon: "🕛", weight: 6, persona: "firsttimer",
    text: "The invite said 8pm. You arrived at 8pm. The DJ is still setting up. The host is at the salon.",
    choices: [
      { label: "Leave and come back at 11pm like a local", culture: 10, fx: { energy: 6 } },
      { label: "Wait and complain on Instagram", culture: -5, exposure: 8, fx: { vibes: -8 } },
    ] },
  { id: "ft_food", title: "Is This Spicy?", icon: "🌶️", weight: 5, persona: "firsttimer",
    text: "Aunty serves you pepper soup and watches you closely. \"It's not spicy at all.\"",
    choices: [
      { label: "Finish the whole bowl, sweating", culture: 10, fx: { belle: 25, vibes: -2 }, rep: 4 },
      { label: "Ask for milk", culture: -4, exposure: 6, fx: { vibes: 4 } },
    ] },

  // --- Local Hustler
  { id: "hs_gig", title: "Your Guy Needs Help", icon: "📞", weight: 6, persona: "hustler",
    text: "\"Bro, my event photographer disappeared. ₦60k for tonight. You dey?\"",
    choices: [
      { label: "Take the gig (2 slots)", slots: 2, gig: 60000, fx: { energy: -20 }, res: 8 },
      { label: "Rest. Burnout is real.", fx: { energy: 8 } },
    ] },
  { id: "hs_connect", title: "Two People Need Each Other", icon: "🔗", weight: 5, persona: "hustler",
    text: "An IJGB needs a car for the week, and your cousin has one sitting idle. You could connect them for a cut.",
    choices: [
      { label: "Broker the deal", naira: 40000, conn: 5, res: 6 },
      { label: "Just introduce them for free", conn: 8, rep: 4 },
    ] },

  // --- Soft-Life Influencer
  { id: "in_brand", title: "A Brand Slid Into Your DMs", icon: "💌", weight: 6, persona: "influencer", cond: "clout60",
    text: "A new cocktail bar wants you to post tonight. They'll cover your table and give you ₦50k.",
    choices: [
      { label: "Accept (1 slot)", slots: 1, naira: 50000, fx: { vibes: 20, energy: -8 }, clout: 6, res: 10, big: true },
      { label: "\"My rate is ₦300k\"", roll: { use: "clout", base: -0.2, win: { naira: 300000, clout: 4, text: "They paid! You're a business now." }, lose: { clout: -2, text: "Seen. No reply." } } },
    ] },
  { id: "in_bill", title: "The Soft Life Bill", icon: "💳", weight: 5, persona: "influencer",
    text: "Your monthly subscriptions, lash refill and car hire are all due today. ₦85k.",
    choices: [
      { label: "Pay it", cost: 85000 },
      { label: "Skip the lashes this month", res: -10, clout: -4, fx: { vibes: -6 } },
    ] },
  { id: "in_seen", title: "Caught at the Bus Stop", icon: "📸", weight: 4, persona: "influencer", cond: "out",
    text: "Someone recognizes you waiting for a danfo. \"Wait… aren't you the one with the Range Rover posts?\"",
    choices: [
      { label: "\"My driver is coming\"", roll: { use: "res", base: 0.2, win: { text: "They believed you." }, lose: { exposure: 20, text: "The danfo conductor shouted your name. Loudly." } } },
      { label: "Laugh: \"Soft life on a budget!\"", rep: 4, clout: 2, exposure: 8 },
    ] },

  // --- Chief's Pikin
  { id: "pk_car", title: "\"Your Cousin Needs a Car\"", icon: "🚙", weight: 7, persona: "pikin",
    text: "Your uncle: \"Emeka is starting Uber. You people have plenty cars. Just give him one, nau.\"",
    daddy: true,
    choices: [
      { label: "Send ₦500k toward a car", cost: 500000, rep: 10 },
      { label: "\"Let him take danfo like everybody\"", rep: -5 },
    ] },
  { id: "pk_uncle", title: "Uncle Needs ₦500k", icon: "💼", weight: 7, persona: "pikin",
    text: "\"Small business opportunity. Very sure. I'll return it in January.\" (He has said this since 2019.)",
    daddy: true,
    choices: [
      { label: "Give it", cost: 500000, rep: 8 },
      { label: "Give ₦100k", cost: 100000, rep: 2 },
      { label: "Refuse politely", rep: -7 },
    ] },
  { id: "pk_party", title: "Mummy Says You Must Sponsor It", icon: "🎂", weight: 5, persona: "pikin",
    text: "\"Your aunty's 60th is on Saturday. Mummy has told everybody you're sponsoring the drinks.\"",
    daddy: true,
    choices: [
      { label: "Sponsor it (₦350k)", cost: 350000, rep: 10, conn: 6 },
      { label: "Sponsor half and pray", cost: 150000, rep: 3 },
      { label: "Disappoint Mummy", rep: -8, fx: { vibes: -6 } },
    ] },

  // --- Owambe Aunty / Uncle
  { id: "au_fomo", title: "Three Parties, One Saturday", icon: "📅", weight: 6, persona: "aunty",
    text: "A naming ceremony in Surulere, a 50th in Ikeja and an engagement on the Island. They all said you MUST come.",
    choices: [
      { label: "Hit all three (2 slots)", slots: 2, fx: { energy: -30, vibes: 25, belle: 30 }, conn: 10, gossip: 2 },
      { label: "Pick the engagement", slots: 1, fx: { vibes: 15, belle: 20 }, conn: 4, gossip: 1, rep: -3 },
      { label: "Stay home and feel it", fx: { vibes: -12 } },
    ] },
  { id: "au_secret", title: "Someone Told You Something", icon: "🤫", weight: 5, persona: "aunty",
    text: "At the hair salon, a woman whispers something about a very famous family. \"Don't tell anybody o.\"",
    choices: [
      { label: "Keep it to yourself", gossip: 1, rep: 3 },
      { label: "Tell your group chat", gossip: 2, clout: 4, exposure: 12, rep: -4 },
    ] },
];

// ---------------------------------------------------------------- ACHIEVEMENTS
const ACHIEVEMENTS = {
  jollof: { name: "Jollof Royalty", icon: "🥘", desc: "Cook party jollof 3 times." },
  baller: { name: "Big Spender", icon: "🍾", desc: "Book a VIP table." },
  airport: { name: "Airport Legend", icon: "✈️", desc: "Pick up every arriving relative yourself." },
  influencer: { name: "Naija Famous", icon: "📈", desc: "Reach 100 clout." },
  concert: { name: "Detty Fest Veteran", icon: "🎤", desc: "Attend a Detty Fest concert." },
  village: { name: "Village People Approved", icon: "🛖", desc: "Go to the village for Christmas." },
  goat: { name: "Goat Negotiator", icon: "🐐", desc: "Buy the Christmas goat." },
  lover: { name: "Crossover Kiss", icon: "💞", desc: "Cross over with someone special." },
  detective: { name: "Amebo Detective", icon: "🕵🏾", desc: "Uncover a secret." },
  loyal: { name: "Secret Keeper", icon: "🤐", desc: "Protect someone's secret." },
  snitch: { name: "Village Broadcaster", icon: "📣", desc: "Expose someone's secret." },
  wardrobe: { name: "Fit Check Champion", icon: "💅🏾", desc: "Own 4 different styles." },
  survivor: { name: "Wahala Survivor", icon: "🛡️", desc: "Make it to crossover night." },
  bigbreak: { name: "The Big Break", icon: "🚀", desc: "Land the opportunity of a lifetime." },
};

// ---------------------------------------------------------------- HELPERS
function isConcertDay(day) { return CONCERT_DAYS.includes(day); }
function weekday(day) {
  return new Date(YEAR, 11, day).toLocaleDateString("en-GB", { weekday: "long" });
}
function crewInTown(s) {
  return NPCS.some((n) => n.from && s.npcs[n.id].arrived);
}
function pendingArrivals(s) {
  return NPCS.filter((n) => n.from && n.arrives <= s.day && !s.npcs[n.id].arrived);
}
function personaFor(traits, goal) {
  let best = null;
  let bestScore = -Infinity;
  Object.entries(PERSONAS).forEach(([id, p], i) => {
    let sc = 0;
    traits.forEach((t) => { sc += p.score[t] || 0; });
    sc += p.score[goal] || 0;
    sc -= i * 0.01; // stable tie-break
    if (sc > bestScore) { bestScore = sc; best = id; }
  });
  return best;
}

const DATA = {
  YEAR, SLOTS, SLOT_ICONS, NEEDS, DECAY, STATS, SKIN, HAIR_COLOURS, OUTFIT_COLOURS, HAIR, FABRICS,
  STYLES, TRAITS, GOALS, PERSONAS, AREAS, CITIES, TRANSPORT, NPCS, ACTIONS, CONCERT_DAYS,
  RANDOM_EVENTS, ACHIEVEMENTS,
  isConcertDay, weekday, crewInTown, pendingArrivals, personaFor,
};
if (typeof module !== "undefined") module.exports = DATA;
else window.DATA = DATA;
