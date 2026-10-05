// DECEMBER WAHALA — static game data (cities, roles, people, actions, events).
// Shared by the browser UI and the headless simulation test.

const YEAR = 2026;
const SLOTS = ["Morning", "Afternoon", "Evening", "Night"];
const SLOT_ICONS = ["🌅", "☀️", "🌆", "🌙"];

const NEEDS = {
  energy: { label: "Energy", icon: "⚡" },
  belle: { label: "Belle", icon: "🍛" },
  vibes: { label: "Vibes", icon: "🎉" },
  social: { label: "Social", icon: "💬" },
  peace: { label: "Peace of Mind", icon: "🧘" },
};

// Decay per time slot. Lagos is harder on your peace of mind.
const DECAY = { energy: 6, belle: 8, vibes: 5, social: 4, peace: 2 };

const CITIES = {
  lagos: {
    name: "Lagos",
    tagline: "Eko o ni baje. Traffic go baje you sha.",
    trafficChance: 0.45,
    fxBias: 0,
    places: {
      home: { name: "Your Flat, Yaba", icon: "🏠" },
      market: { name: "Balogun Market", icon: "🧺" },
      mall: { name: "Ikeja City Mall", icon: "🛍️" },
      lounge: { name: "Victoria Island Lounges", icon: "🍾" },
      outdoor: { name: "Lekki Beach", icon: "🏖️" },
      church: { name: "Parish on Ikorodu Road", icon: "⛪" },
      hustle: { name: "Computer Village", icon: "📱" },
      airport: { name: "Murtala Muhammed Airport", icon: "✈️" },
      venue: { name: "Eko Atlantic Festival Grounds", icon: "🎤" },
    },
  },
  abuja: {
    name: "Abuja",
    tagline: "Clean roads, big men, bigger owambes.",
    trafficChance: 0.18,
    fxBias: -20,
    places: {
      home: { name: "Your Flat, Gwarinpa", icon: "🏠" },
      market: { name: "Wuse Market", icon: "🧺" },
      mall: { name: "Jabi Lake Mall", icon: "🛍️" },
      lounge: { name: "Maitama Lounges", icon: "🍾" },
      outdoor: { name: "Millennium Park", icon: "🌳" },
      church: { name: "Parish in Garki", icon: "⛪" },
      hustle: { name: "Banex Plaza", icon: "📱" },
      airport: { name: "Nnamdi Azikiwe Airport", icon: "✈️" },
      venue: { name: "Eagle Square Concert Grounds", icon: "🎤" },
    },
  },
};

const ROLES = {
  ijgb: {
    name: "IJGB Returnee",
    icon: "🧳",
    blurb: "\"I Just Got Back\" from London. Dollars in pocket, but Naija streets go school you.",
    naira: 150000, usd: 1500, street: 10, clout: 40, respect: 50,
  },
  hustler: {
    name: "Local Hustler",
    icon: "💪",
    blurb: "You never comot Naija. Street sense full ground, but money never land.",
    naira: 120000, usd: 0, street: 60, clout: 20, respect: 45,
  },
  pikin: {
    name: "Chief's Pikin",
    icon: "👑",
    blurb: "Papa get money, so the whole family dey expect you to run the show.",
    naira: 600000, usd: 300, street: 25, clout: 55, respect: 35,
  },
};

const TRANSPORT = {
  trek: { name: "Trek (free)", icon: "🚶🏾", cost: 0, peace: -2, trafficMod: 0, walk: true },
  danfo: { name: "Danfo / Keke", icon: "🚌", cost: 700, peace: -4, trafficMod: 1.0 },
  okada: { name: "Okada", icon: "🏍️", cost: 1500, peace: -6, trafficMod: 0.4 },
  ride: { name: "Bolt / Uber", icon: "🚗", cost: 6500, peace: 0, trafficMod: 1.0 },
};

// People who matter this December. "arrives" = the day they land at the airport.
const PEOPLE = [
  { id: "mama", name: "Mama", icon: "👩🏾‍🦱", from: null, arrives: 0, rel: 60, note: "Wants grandchildren. Yesterday." },
  { id: "tobi", name: "Cousin Tobi", icon: "🧑🏾‍🎤", from: "London 🇬🇧", arrives: 11, rel: 50, note: "Says \"innit\" every two minutes." },
  { id: "funke", name: "Aunty Funke", icon: "👩🏾‍💼", from: "Houston 🇺🇸", arrives: 16, rel: 40, note: "Brought 6 suitcases. 4 are for other people." },
  { id: "chidi", name: "Chidi", icon: "🧑🏾‍💻", from: "Toronto 🇨🇦", arrives: 19, rel: 55, note: "Your guy from uni. Just got PR, now on \"soft life\"." },
  { id: "kemi", name: "Kemi", icon: "💃🏾", from: null, arrives: 0, rel: 45, note: "Your ex... or are you? It's complicated." },
];

// Actions available at each place type. effects apply to needs/stats.
// slots = time slots consumed. cost = naira. cond(state) gates availability.
const ACTIONS = [
  // HOME
  { id: "sleep", place: "home", name: "Sleep", icon: "😴", slots: 0, desc: "Sleep till morning. Light dey? Better sleep.", special: "sleep" },
  { id: "nap", place: "home", name: "Take a nap", icon: "🛌", slots: 1, fx: { energy: 22, peace: 4 } },
  { id: "cook", place: "home", name: "Cook party jollof", icon: "🍲", slots: 1, cost: 8000, fx: { belle: 40, vibes: 5 }, skill: true, desc: "Smoky bottom pot. Family go hail." },
  { id: "noodles", place: "home", name: "Indomie & egg", icon: "🍜", slots: 1, cost: 1500, fx: { belle: 22 } },
  { id: "nolly", place: "home", name: "Watch Nollywood", icon: "📺", slots: 1, fx: { vibes: 12, energy: 4 }, needsLight: true },
  { id: "gen", place: "home", name: "Buy fuel for generator", icon: "⛽", slots: 1, cost: 12000, desc: "Fills the gen. Light for 8 slots.", special: "gen" },
  { id: "host", place: "home", name: "Host the diaspora crew", icon: "🏡", slots: 1, cost: 25000, fx: { social: 30, vibes: 15, energy: -8 }, cond: (s) => arrivedCount(s) > 0, rel: 6, respect: 3 },
  { id: "callmama", place: "home", name: "Call Mama", icon: "📞", slots: 1, fx: { social: 12, peace: -3 }, special: "callmama" },

  // MARKET
  { id: "asoebi", place: "market", name: "Buy aso-ebi fabric", icon: "🧵", slots: 1, cost: 45000, fx: { vibes: 6 }, special: "asoebi", desc: "No aso-ebi, no owambe. Na law." },
  { id: "haggle", place: "market", name: "Haggle for Christmas goat", icon: "🐐", slots: 1, special: "goat", desc: "Price depends on your street sense." },
  { id: "suyamkt", place: "market", name: "Buy suya & zobo", icon: "🍢", slots: 1, cost: 4000, fx: { belle: 25, vibes: 6 } },
  { id: "foodstuff", place: "market", name: "Buy foodstuff for the house", icon: "🛒", slots: 1, cost: 30000, fx: { peace: 8 }, respect: 4, street: 2 },

  // MALL
  { id: "gifts", place: "mall", name: "Shop Christmas gifts", icon: "🎁", slots: 1, cost: 60000, special: "gifts" },
  { id: "cinema", place: "mall", name: "Catch a movie", icon: "🎬", slots: 1, cost: 7000, fx: { vibes: 18, social: 6 } },
  { id: "eatout", place: "mall", name: "Eat at a fancy restaurant", icon: "🍽️", slots: 1, cost: 22000, fx: { belle: 40, vibes: 10 }, clout: 2 },
  { id: "bdc", place: "mall", name: "Change dollars at the BDC", icon: "💱", slots: 0, special: "bdc" },

  // LOUNGE
  { id: "party", place: "lounge", name: "Turn up at the lounge", icon: "🪩", slots: 1, cost: 20000, fx: { vibes: 28, social: 20, energy: -14 }, clout: 4, memory: true, night: true },
  { id: "vip", place: "lounge", name: "Book VIP table & spray money", icon: "💸", slots: 1, cost: 250000, fx: { vibes: 40, social: 30, energy: -18 }, clout: 18, memory: true, night: true, desc: "Sparklers. Bottle girls. Pure vawulence." },
  { id: "date", place: "lounge", name: "Take Kemi on a date", icon: "💞", slots: 1, cost: 35000, fx: { vibes: 20, social: 25 }, special: "date", memory: true },

  // OUTDOOR
  { id: "chill", place: "outdoor", name: "Chill and catch breeze", icon: "🌴", slots: 1, cost: 3000, fx: { peace: 18, vibes: 10 } },
  { id: "picnic", place: "outdoor", name: "Picnic with the diaspora crew", icon: "🧺", slots: 1, cost: 18000, fx: { social: 25, vibes: 18, belle: 15 }, cond: (s) => arrivedCount(s) > 0, rel: 5, memory: true },
  { id: "content", place: "outdoor", name: "Shoot content for Instagram", icon: "🤳", slots: 1, fx: { vibes: 6, energy: -5 }, special: "content" },

  // CHURCH
  { id: "service", place: "church", name: "Attend service", icon: "🙏", slots: 1, fx: { peace: 25, social: 10 }, respect: 3 },
  { id: "choir", place: "church", name: "Join carol practice", icon: "🎶", slots: 1, fx: { vibes: 12, social: 15, peace: 8 }, respect: 2 },

  // HUSTLE
  { id: "phones", place: "hustle", name: "Sell phones for your guy", icon: "📦", slots: 1, fx: { energy: -14, peace: -6 }, special: "work", pay: 22000 },
  { id: "pos", place: "hustle", name: "Run a POS stand", icon: "🏧", slots: 1, fx: { energy: -10, peace: -4 }, special: "work", pay: 15000 },
  { id: "mc", place: "hustle", name: "MC / hype-man gig", icon: "🎙️", slots: 2, fx: { energy: -20, vibes: 10 }, special: "work", pay: 70000, minClout: 35, night: true },

  // AIRPORT
  { id: "pickup", place: "airport", name: "Pick up arriving family", icon: "🛬", slots: 1, special: "pickup", cond: (s) => pendingArrivals(s).length > 0 },
  { id: "planespot", place: "airport", name: "Watch IJGBs arrive in matching tracksuits", icon: "👀", slots: 1, fx: { vibes: 8 } },

  // VENUE
  { id: "concert", place: "venue", name: "Attend the Detty Fest concert", icon: "🎤", slots: 2, cost: 85000, fx: { vibes: 50, social: 25, energy: -25 }, clout: 10, memory: true, cond: (s) => isConcertDay(s.day), desc: "Afrobeats royalty on one stage." },
  { id: "beachfest", place: "venue", name: "Hit the day-party", icon: "🥂", slots: 1, cost: 30000, fx: { vibes: 30, social: 18, energy: -12 }, clout: 5, memory: true, cond: (s) => !isConcertDay(s.day) },
];

const CONCERT_DAYS = [20, 26, 27, 28];

function isConcertDay(day) { return CONCERT_DAYS.includes(day); }
function arrivedCount(s) { return PEOPLE.filter((p) => p.from && s.people[p.id].arrived).length; }
function pendingArrivals(s) {
  return PEOPLE.filter((p) => p.from && p.arrives <= s.day && !s.people[p.id].arrived && !s.people[p.id].missed);
}
function weekday(day) {
  return new Date(YEAR, 11, day).toLocaleDateString("en-GB", { weekday: "long" });
}

// Random wahala and blessings. weight; cond gates; choices resolve them.
const RANDOM_EVENTS = [
  {
    id: "nepa", title: "NEPA Don Take Light!", icon: "🔌", weight: 9,
    cond: (s) => s.light,
    text: "The whole street don black out. Your neighbour's gen don start dey shout like Agege bread machine.",
    choices: [
      { label: "Endure am", fx: { peace: -10 }, apply: (s) => { s.light = false; } },
      { label: "Pay ₦10k to tap from neighbour's gen", cost: 10000, apply: (s) => { s.light = false; s.genSlots = Math.max(s.genSlots, 4); } },
    ],
  },
  {
    id: "lightback", title: "UP NEPA!!", icon: "💡", weight: 6,
    cond: (s) => !s.light,
    text: "Light don come back! The whole street shout \"UP NEPA!\" at the same time.",
    choices: [{ label: "Charge every single device", fx: { vibes: 8, peace: 6 }, apply: (s) => { s.light = true; } }],
  },
  {
    id: "marriage", title: "\"When Are You Bringing Someone?\"", icon: "💍", weight: 7,
    text: "One aunty you no even sabi corner you: \"Ehen! You never marry? Your mates are carrying twins o!\"",
    choices: [
      { label: "Smile and say \"By God's grace\"", fx: { peace: -6 }, respect: 2 },
      { label: "Tell her you're focused on your career", fx: { peace: -2 }, respect: -3, street: 1 },
      { label: "Ask about her own daughter's wedding", fx: { vibes: 10 }, respect: -6 },
    ],
  },
  {
    id: "blacktax", title: "Black Tax Alert", icon: "📲", weight: 8,
    text: "Uncle Bayo on WhatsApp: \"My son, small emergency. Send ₦50,000 urgently. God will replenish.\"",
    choices: [
      { label: "Send am (₦50k)", cost: 50000, respect: 6, fx: { peace: 4 } },
      { label: "Send ₦10k with \"na wetin I get\"", cost: 10000, respect: 1 },
      { label: "Leave am on read", respect: -5, fx: { peace: -4 } },
    ],
  },
  {
    id: "checkpoint", title: "Checkpoint Wahala", icon: "🚓", weight: 5,
    text: "\"Oga, where your particulars? Wetin dey that bag? You fit find something for the boys?\"",
    choices: [
      { label: "Settle them (₦5k)", cost: 5000, fx: { peace: -5 } },
      { label: "Know your rights, argue am", fx: { peace: -12 }, street: 3, special: "argue" },
    ],
  },
  {
    id: "fuelq", title: "Fuel Scarcity!", icon: "⛽", weight: 4,
    text: "Petrol stations don form queue reach next street. Black market boys dey sell for double.",
    choices: [
      { label: "Join the queue (lose time)", fx: { energy: -12, peace: -8 }, apply: (s) => { s.slotPenalty = 1; } },
      { label: "Buy black market (₦20k)", cost: 20000, apply: (s) => { s.genSlots += 8; } },
      { label: "Forget gen, live like ancestors", fx: { peace: -4 } },
    ],
  },
  {
    id: "jollofwar", title: "Jollof War", icon: "🍚", weight: 4,
    cond: (s) => arrivedCount(s) > 0,
    text: "Cousin Tobi's Ghanaian friend from London just said Ghana jollof is better. The whole room has gone quiet.",
    choices: [
      { label: "Defend Naija jollof with your life", fx: { vibes: 12, social: 8 }, clout: 3 },
      { label: "Diplomacy: \"Both are nice\"", fx: { peace: 4 }, respect: -2 },
    ],
  },
  {
    id: "dollarrain", title: "Diaspora Blessing", icon: "💵", weight: 5,
    cond: (s) => arrivedCount(s) > 0,
    text: "Aunty Funke squeezes something into your palm. \"Take this, buy yourself something. Don't tell your mother.\"",
    choices: [{ label: "\"Thank you ma!\" (+$100)", apply: (s) => { s.usd += 100; }, fx: { vibes: 10 } }],
  },
  {
    id: "phonesnatch", title: "Phone Snatcher!", icon: "🏃🏾", weight: 3,
    cond: (s) => s.place !== "home",
    text: "One boy on bike nearly snatch your phone for traffic!",
    choices: [
      { label: "Hold am tight!", special: "snatch" },
      { label: "Let it go, life first", cost: 80000, fx: { peace: -15 } },
    ],
  },
  {
    id: "groupchat", title: "Owambe Contribution", icon: "📢", weight: 5,
    text: "Family group chat: \"Everybody should contribute ₦30k for Grandma's 90th. List starts now.\" Your name is next.",
    choices: [
      { label: "Contribute ₦30k", cost: 30000, respect: 7 },
      { label: "Type \"Noted 🙏\" and disappear", respect: -6, fx: { peace: 3 } },
    ],
  },
  {
    id: "agbero", title: "Agbero Levy", icon: "🧢", weight: 4,
    cond: (s) => s.city === "lagos" && s.place !== "home",
    text: "\"Owner of the road! Drop something for the boys!\"",
    choices: [
      { label: "Drop ₦2k", cost: 2000 },
      { label: "Speak street language", special: "streettalk" },
    ],
  },
  {
    id: "viral", title: "You Don Go Viral!", icon: "📈", weight: 3,
    cond: (s) => s.clout >= 30,
    text: "Your video of Aunty Funke negotiating with a Lagos mechanic has 2 million views.",
    choices: [{ label: "Enjoy the fame", clout: 15, fx: { vibes: 15 } }],
  },
  {
    id: "rain", title: "Unexpected Harmattan Dust", icon: "🌫️", weight: 4,
    text: "Harmattan dust don cover everywhere. Lips cracking, everybody coughing, visibility like 10 metres.",
    choices: [{ label: "Rub Vaseline and move on", fx: { peace: -4, energy: -4 } }],
  },
];

const ACHIEVEMENTS = {
  jollofking: { name: "Jollof Royalty", icon: "👑", desc: "Cooked party jollof 3 times." },
  baller: { name: "Big Spender", icon: "💸", desc: "Booked a VIP table." },
  airportlegend: { name: "Airport Legend", icon: "✈️", desc: "Picked up every arriving family member." },
  influencer: { name: "Naija Influencer", icon: "🤳", desc: "Reached 100 clout." },
  streetsmart: { name: "Street Certified", icon: "🧠", desc: "Reached 80 street sense." },
  concert: { name: "Detty Fest Veteran", icon: "🎤", desc: "Attended a Detty Fest concert." },
  village: { name: "Village People Approved", icon: "🛖", desc: "Went to the village for Christmas." },
  goat: { name: "Goat Negotiator", icon: "🐐", desc: "Bought the Christmas goat." },
  lover: { name: "Lover Boy/Girl", icon: "💞", desc: "Kemi said yes to the crossover." },
  survivor: { name: "Wahala Survivor", icon: "🛡️", desc: "Survived all 31 days of December." },
};

const DATA = {
  YEAR, SLOTS, SLOT_ICONS, NEEDS, DECAY, CITIES, ROLES, TRANSPORT, PEOPLE, ACTIONS,
  CONCERT_DAYS, RANDOM_EVENTS, ACHIEVEMENTS,
  isConcertDay, arrivedCount, pendingArrivals, weekday,
};
if (typeof module !== "undefined") module.exports = DATA;
else window.DATA = DATA;
