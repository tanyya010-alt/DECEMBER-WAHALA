// DECEMBER WAHALA — the world: streets, places, people, items, calendar,
// missions, story chains and conversations. Pure data plus small helpers.
/* global module */
(function (root) {
  const hm = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0); };
  const DAY = 1440;

  // ------------------------------------------------------------ street grid
  // x runs east, z runs south. Blocks sit between roads; doors face a road.
  const GRID = {
    cols: [-52, -26, 0, 26, 52],
    rows: [-40, -20, 18, 38],
    blockW: 20, blockD: 14,
    vRoads: [-65, -39, -13, 13, 39, 65],
    hRoads: [-50, -30, -10, 8, 28, 48],
    roadW: 6,
    water: { band: [-7, 5], bridges: [-39, 13] }, // lagoon between rows 1 and 2
    beach: [51, 62],
    bounds: { x: [-68, 68], z: [-53, 63] },
  };

  // ------------------------------------------------------------ place types
  // hours: [open, close] in minutes; close > 1440 means past midnight.
  // days: weekdays (0 = Sunday) when open; omitted = every day.
  const TYPES = {
    home: { icon: "🏠", kind: "building", h: 11, color: "#e9c99b", roof: "#b5523b", hours: null, actions: ["sleep", "nap", "cook", "tv", "post_home", "host", "gen"] },
    family: { icon: "🏡", kind: "building", h: 6, color: "#f3dfbf", roof: "#7a3e2b", hours: null, actions: ["visit_family", "family_food", "chores", "ask_daddy"] },
    mamaput: { icon: "🍲", kind: "building", h: 4.5, color: "#f6b26b", roof: "#2e7d32", hours: [hm("07:00"), hm("21:00")], actions: ["eat_amala", "takeaway_jollof", "gist_vendor"] },
    salon: { icon: "💈", kind: "building", h: 5, color: "#f8c8dc", roof: "#c2185b", hours: [hm("08:00"), hm("20:00")], actions: ["new_hair", "salon_gossip"] },
    gym: { icon: "🏋🏾", kind: "building", h: 6, color: "#cfd8dc", roof: "#37474f", hours: [hm("06:00"), hm("22:00")], actions: ["workout", "gym_network"] },
    office: { icon: "💼", kind: "building", h: 14, color: "#b0c4de", roof: "#455a64", hours: [hm("08:00"), hm("18:00")], days: [1, 2, 3, 4, 5], actions: ["work_shift", "remote_work"] },
    church: { icon: "⛪", kind: "building", h: 9, color: "#fafafa", roof: "#8d6e63", hours: [hm("06:00"), hm("21:00")], actions: ["service", "carol", "pray"] },
    busstop: { icon: "🚌", kind: "open", hours: null, actions: ["conductor_gig", "people_watch"] },
    market: { icon: "🧺", kind: "open", hours: [hm("07:00"), hm("19:00")], actions: ["foodstuff", "asoebi", "goat", "small_chops"] },
    hustle: { icon: "📱", kind: "building", h: 7, color: "#ffe082", roof: "#f57f17", hours: [hm("08:00"), hm("19:00")], actions: ["sell_phones", "delivery", "merch_stock", "broker"] },
    hall: { icon: "🎊", kind: "building", h: 8, color: "#fff3e0", roof: "#ad1457", hours: [hm("09:00"), hm("23:00")], actions: ["owambe_attend", "owambe_eat", "owambe_network", "owambe_gossip", "event_setup"] },
    hotel: { icon: "🏨", kind: "building", h: 20, color: "#d7ccc8", roof: "#4e342e", hours: null, actions: ["book_night", "pool_day", "lobby_network", "rent_car"] },
    bank: { icon: "🏦", kind: "building", h: 9, color: "#c5cae9", roof: "#283593", hours: [hm("08:00"), hm("16:00")], days: [1, 2, 3, 4, 5], actions: ["quick_loan", "repay_loan"] },
    bdc: { icon: "💱", kind: "building", h: 4, color: "#c8e6c9", roof: "#1b5e20", hours: [hm("09:00"), hm("18:00")], actions: ["bdc_sell", "bdc_buy"] },
    mall: { icon: "🛍️", kind: "building", h: 10, color: "#e1f5fe", roof: "#0277bd", hours: [hm("10:00"), hm("21:00")], actions: ["buy_gifts", "buy_ticket", "cinema", "mall_meet", "mall_bdc"] },
    fashion: { icon: "👗", kind: "building", h: 6, color: "#fce4ec", roof: "#6a1b9a", hours: [hm("10:00"), hm("20:00")], actions: ["buy_outfit", "buy_accessory", "tailor"] },
    cafe: { icon: "☕", kind: "building", h: 5, color: "#efebe9", roof: "#6d4c41", hours: [hm("07:00"), hm("20:00")], actions: ["coffee", "laptop_work", "cafe_meet"] },
    restaurant: { icon: "🍽️", kind: "building", h: 6, color: "#fff8e1", roof: "#bf360c", hours: [hm("12:00"), hm("23:00")], actions: ["fine_dining", "restaurant_meet"] },
    fastfood: { icon: "🍗", kind: "building", h: 5, color: "#ffcdd2", roof: "#c62828", hours: [hm("08:00"), hm("23:00")], actions: ["fast_food", "takeaway_chicken"] },
    suya: { icon: "🍢", kind: "open", hours: [hm("17:00"), hm("26:00")], actions: ["suya", "suya_hang"] },
    club: { icon: "🪩", kind: "building", h: 8, color: "#1d1b2e", roof: "#000000", neon: "#ff3dbb", hours: [hm("22:00"), hm("28:00")], actions: ["party", "dance", "club_meet", "club_network", "club_photos", "start_drama", "vip"] },
    concert: { icon: "🎤", kind: "open", hours: [hm("16:00"), hm("25:00")], eventOnly: "concert", actions: ["concert", "concert_photo_gig", "resell_tickets"] },
    lounge: { icon: "🌇", kind: "building", h: 16, color: "#263238", roof: "#ffb300", neon: "#ffb300", hours: [hm("17:00"), hm("26:00")], actions: ["sunset_drinks", "firepit_chill", "rooftop_party", "lounge_network", "club_photos"] },
    beach: { icon: "🏖️", kind: "open", hours: [hm("08:00"), hm("19:00")], actions: ["chill", "beach_party", "picnic", "beach_photos"] },
    photo: { icon: "📸", kind: "open", hours: null, actions: ["photoshoot", "collab"] },
    airport: { icon: "✈️", kind: "remote", hours: null, actions: ["pickup", "watch_arrivals"] },
    shortlet: { icon: "🔑", kind: "building", h: 8, color: "#f4f4f2", roof: "#8a6b4a", hours: null, actions: ["book_penthouse", "chef_dinner", "wine_tasting", "movie_night", "content_shoot", "penthouse_party"] },
    beachclub: { icon: "🏝️", kind: "building", h: 4, color: "#fbf7ef", roof: "#d8a93b", hours: [hm("10:00"), hm("27:00")], actions: ["pool_swim", "daybed_lounge", "beach_brunch", "sundowner", "vip_cabana", "beachclub_party"] },
  };

  // Where each place sits: [column, row, doorSide, xOffset, width].
  const SLOTS = [
    ["family", 0, 0, "S", 0, 18], ["home", 1, 0, "S", 0, 14], ["mamaput", 2, 0, "S", 0, 14],
    ["salon", 3, 0, "S", -5, 9], ["gym", 3, 0, "S", 5, 9], ["office", 4, 0, "S", 0, 16],
    ["church", 0, 1, "S", 0, 14], ["busstop", 1, 1, "S", 0, 16], ["market", 2, 1, "S", 0, 18],
    ["hustle", 3, 1, "S", 0, 16], ["hall", 4, 1, "S", 0, 18],
    ["hotel", 0, 2, "S", 0, 14], ["bank", 1, 2, "S", -5, 9], ["bdc", 1, 2, "S", 5, 8], ["mall", 2, 2, "S", 0, 19],
    ["fashion", 3, 2, "S", -5, 9], ["cafe", 3, 2, "S", 5, 9], ["restaurant", 4, 2, "S", 0, 16],
    ["fastfood", 0, 3, "S", 0, 14], ["suya", 1, 3, "S", 0, 14], ["club", 2, 3, "S", 0, 18],
    ["concert", 3, 3, "S", 0, 20], ["lounge", 4, 3, "S", 0, 14],
  ];

  const NAMES = {
    lagos: {
      family: "Family House", home: "Your Flat", mamaput: "Mama T's Kitchen", salon: "Cuts & Curls", gym: "Iron Paradise Gym",
      office: "Yaba Tech Hub", church: "Grace Assembly", busstop: "Ojuelegba Bus Stop", market: "Tejuosho Market",
      hustle: "Computer Village", hall: "Eko Event Centre", hotel: "Eko Grand Hotel", bank: "Naija Trust Bank",
      bdc: "Mallam Musa BDC", mall: "Palms Mall", fashion: "Àṣà Fashion House", cafe: "Bean & Breeze Café",
      restaurant: "Island Grill", fastfood: "Chop Republic", suya: "Mallam Suya Spot", club: "Club Eko",
      concert: "Eko Atlantic Festival Grounds", lounge: "Sky Rooftop Lounge", beach: "Oniru Beach",
      photo: "The Detty Wall", airport: "Murtala Muhammed Airport", beachclub: "Eko Shores Beach Club", shortlet: "Ocean Crest Penthouse",
    },
    abuja: {
      family: "Family House", home: "Your Flat", mamaput: "Mama Cass Kitchen", salon: "Wuse Cuts & Curls", gym: "Capital Fitness",
      office: "Abuja Tech Hub", church: "Living Faith Parish", busstop: "Berger Bus Stop", market: "Wuse Market",
      hustle: "Banex Plaza", hall: "Abuja Event Centre", hotel: "Capital Grand Hotel", bank: "Naija Trust Bank",
      bdc: "Zone 4 BDC", mall: "Jabi Lake Mall", fashion: "Àṣà Fashion House", cafe: "Bean & Breeze Café",
      restaurant: "Wuse 2 Grill", fastfood: "Chop Republic", suya: "Area 11 Suya", club: "Club Maitama",
      concert: "Eagle Square Concert Grounds", lounge: "Sky Lounge Maitama", beach: "Jabi Lakeside",
      photo: "Millennium Park Arch", airport: "Nnamdi Azikiwe Airport", beachclub: "Jabi Shores Lakeside Club", shortlet: "Maitama Hills Penthouse",
    },
  };

  // Builds the list of places for a city with positions, doors and footprints.
  function buildPlaces(city) {
    const out = {};
    for (const [id, col, row, side, off, w] of SLOTS) {
      const t = TYPES[id];
      const cx = GRID.cols[col] + off;
      const cz = GRID.rows[row];
      const d = t.kind === "open" ? GRID.blockD : GRID.blockD - 2;
      const doorZ = side === "S" ? cz + GRID.blockD / 2 : cz - GRID.blockD / 2;
      out[id] = {
        id, type: id, name: NAMES[city][id], icon: t.icon, kind: t.kind,
        x: cx, z: cz, w, d, h: t.h || 0, side,
        door: { x: cx, z: doorZ + (side === "S" ? 0.6 : -0.6) },
        spot: { x: cx, z: doorZ + (side === "S" ? 2.2 : -2.2) }, // where people hang out
      };
    }
    out.beach = { id: "beach", type: "beach", name: NAMES[city].beach, icon: TYPES.beach.icon, kind: "open", x: -8, z: 56, w: 40, d: 10, h: 0, side: "N", door: { x: -8, z: 54 }, spot: { x: -8, z: 55 } };
    out.photo = { id: "photo", type: "photo", name: NAMES[city].photo, icon: TYPES.photo.icon, kind: "open", x: 40, z: 56, w: 12, d: 8, h: 0, side: "N", door: { x: 40, z: 54 }, spot: { x: 40, z: 55 } };
    out.beachclub = { id: "beachclub", type: "beachclub", name: NAMES[city].beachclub, icon: TYPES.beachclub.icon, kind: "building", x: 23, z: 56.5, w: 18, d: 9, h: 4, side: "N", door: { x: 23, z: 51.4 }, spot: { x: 23, z: 50.2 } };
    out.shortlet = { id: "shortlet", type: "shortlet", name: NAMES[city].shortlet, icon: TYPES.shortlet.icon, kind: "building", x: -48, z: 56.5, w: 18, d: 9, h: 8, side: "N", door: { x: -48, z: 51.4 }, spot: { x: -48, z: 50.2 } };
    out.airport = { id: "airport", type: "airport", name: NAMES[city].airport, icon: TYPES.airport.icon, kind: "remote", x: -66, z: -50, w: 0, d: 0, h: 0, side: "N", door: { x: -66, z: -50 }, spot: { x: -66, z: -50 }, remote: true };
    return out;
  }

  function isOpen(type, t) {
    const T = TYPES[type];
    if (!T.hours) return true;
    const day = Math.floor(t / DAY) + 1;
    const min = t % DAY;
    const [o, c] = T.hours;
    const okDay = (d) => (!T.days || T.days.includes(weekday(d))) && (!T.eventOnly || eventsOn(d).includes(T.eventOnly));
    if (min >= o && min < Math.min(c, DAY)) return okDay(day);
    if (c > DAY && min < c - DAY) return okDay(day - 1);
    return false;
  }

  // 1 December 2026 is a Tuesday.
  function weekday(day) { return (day + 1) % 7; }
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // ------------------------------------------------------------ calendar
  const CONCERT_DAYS = [20, 26, 27, 28];
  const PHASES = [
    { from: 1, to: 7, name: "Warm-up", blurb: "The city is waking up. Christmas lights are going up." },
    { from: 8, to: 14, name: "Diaspora Arrivals", blurb: "The IJGBs are landing. Airports are full of matching tracksuits." },
    { from: 15, to: 20, name: "It's Getting Serious", blurb: "Every weekend is booked. Traffic is getting creative." },
    { from: 21, to: 24, name: "Peak December", blurb: "Gridlock, surge pricing and a party on every street." },
    { from: 25, to: 25, name: "Christmas", blurb: "Merry Christmas! Jollof, family and too many questions." },
    { from: 26, to: 30, name: "Post-Christmas Madness", blurb: "Concerts back-to-back. Nobody has slept." },
    { from: 31, to: 31, name: "Crossover", blurb: "The last night of the year. Where will you be at midnight?" },
  ];
  function phase(day) { return PHASES.find((p) => day >= p.from && day <= p.to) || PHASES[PHASES.length - 1]; }
  function eventsOn(day) {
    const e = [];
    if (CONCERT_DAYS.includes(day)) e.push("concert");
    if (weekday(day) === 6) e.push("owambe");
    if (weekday(day) === 0 && day >= 13) e.push("beachparty");
    if (day === 25) e.push("christmas");
    if (day === 31) e.push("crossover");
    return e;
  }

  // ------------------------------------------------------------ actions
  // mins: duration. cost: naira. fx: needs change over the action.
  // Optional: clout, rep, conn, followers, culture, gossip, gig (earn), big (counts as a night out),
  // food, premium, event (needs world event), item (needs item), gives (adds item), dress (dress-code check).
  const ACTIONS = {
    // Home
    sleep: { name: "Sleep", icon: "😴", mins: 0, special: "sleep", desc: "Sleep until you're rested (or until morning)." },
    nap: { name: "Take a nap", icon: "🛌", mins: 60, fx: { energy: 18 } },
    cook: { name: "Cook party jollof", icon: "🥘", mins: 60, cost: 8000, fx: { belle: 45, vibes: 6 }, food: true, special: "cook" },
    tv: { name: "Watch Nollywood", icon: "📺", mins: 90, fx: { vibes: 12, energy: 4 }, needsPower: true },
    post_home: { name: "Film a get-ready-with-me", icon: "🤳🏾", mins: 30, special: "post" },
    host: { name: "Host a house party", icon: "🎉", mins: 240, cost: 120000, fx: { vibes: 35, energy: -20 }, conn: 10, clout: 8, big: true, special: "host", desc: "Invite everyone you know." },
    gen: { name: "Buy fuel for the gen", icon: "⛽", mins: 20, cost: 12000, special: "gen" },
    // Family house
    visit_family: { name: "Sit with the family", icon: "👨🏾‍👩🏾‍👧🏾", mins: 60, fx: { vibes: 8 }, rep: 4, special: "familytalk" },
    family_food: { name: "Eat Mama's food", icon: "🍛", mins: 40, fx: { belle: 50 }, rep: 1, food: true },
    chores: { name: "Help with chores", icon: "🧹", mins: 90, fx: { energy: -12 }, rep: 6 },
    ask_daddy: { name: "Ask Daddy for money", icon: "💳", mins: 30, special: "daddy", personaOnly: ["pikin"] },
    // Food
    eat_amala: { name: "Eat amala and ewedu", icon: "🍲", mins: 30, cost: 3000, fx: { belle: 45, vibes: 5 }, food: true, cheap: true },
    takeaway_jollof: { name: "Buy takeaway jollof", icon: "🥡", mins: 10, cost: 3500, gives: "jollof_pack" },
    gist_vendor: { name: "Gist with the vendor", icon: "🗣️", mins: 20, fx: { vibes: 4 }, gossip: 1, special: "rumor" },
    fast_food: { name: "Eat fried chicken and chips", icon: "🍗", mins: 25, cost: 4500, fx: { belle: 35, vibes: 4 }, food: true },
    takeaway_chicken: { name: "Takeaway chicken bucket", icon: "🪣", mins: 10, cost: 12000, gives: "chicken_bucket" },
    fine_dining: { name: "Eat at the grill", icon: "🍽️", mins: 75, cost: 28000, fx: { belle: 50, vibes: 12 }, clout: 2, food: true },
    restaurant_meet: { name: "Meet people", icon: "🤝🏾", mins: 30, special: "meet" },
    suya: { name: "Buy suya and zobo", icon: "🍢", mins: 20, cost: 4000, fx: { belle: 25, vibes: 8 }, food: true, cheap: true },
    suya_hang: { name: "Hang out at the suya spot", icon: "🌙", mins: 60, fx: { vibes: 10 }, conn: 3, special: "meet" },
    coffee: { name: "Coffee and small chops", icon: "☕", mins: 30, cost: 5500, fx: { belle: 12, energy: 10, vibes: 4 }, food: true },
    laptop_work: { name: "Remote work on your laptop", icon: "💻", mins: 180, fx: { energy: -15 }, special: "remote", desc: "Abroad salary, Naija prices." },
    cafe_meet: { name: "Meet someone", icon: "👋🏾", mins: 30, special: "meet" },
    // Grooming and fitness
    new_hair: { name: "Change your hairstyle", icon: "💇🏾", mins: 120, cost: 25000, special: "hair" },
    salon_gossip: { name: "Gossip under the dryer", icon: "🤫", mins: 60, fx: { vibes: 6 }, gossip: 1, special: "rumor" },
    workout: { name: "Work out", icon: "🏋🏾", mins: 60, fx: { energy: -14, vibes: 12 }, special: "workout" },
    gym_network: { name: "Chat with gym regulars", icon: "💪🏾", mins: 30, conn: 3, special: "meet" },
    // Work
    work_shift: { name: "Work a shift", icon: "💼", mins: 240, fx: { energy: -18, vibes: -4 }, gig: 30000, gigType: "office" },
    remote_work: { name: "Hot-desk and work remotely", icon: "🖥️", mins: 180, cost: 3000, fx: { energy: -12 }, special: "remote" },
    sell_phones: { name: "Sell phones for your guy", icon: "📦", mins: 180, fx: { energy: -16 }, gig: 24000, gigType: "sales" },
    delivery: { name: "Do delivery runs", icon: "🛵", mins: 180, fx: { energy: -20 }, gig: 20000, gigType: "delivery" },
    merch_stock: { name: "Buy merch stock", icon: "👕", mins: 30, cost: 30000, gives: "merch" },
    broker: { name: "Connect two people for a cut", icon: "🔗", mins: 60, special: "broker", desc: "Needs 40+ connections." },
    conductor_gig: { name: "Be a danfo conductor for a shift", icon: "🚌", mins: 180, fx: { energy: -20, vibes: -4 }, gig: 15000, gigType: "transport" },
    people_watch: { name: "Watch the city go by", icon: "👀", mins: 30, fx: { vibes: 4 }, special: "meet" },
    // Market
    foodstuff: { name: "Buy foodstuff for the house", icon: "🛒", mins: 45, cost: 30000, rep: 5, special: "foodstuff" },
    asoebi: { name: "Buy aso-ebi fabric", icon: "🧵", mins: 40, cost: 45000, special: "asoebi", desc: "Ready-made trad fusion fit." },
    goat: { name: "Haggle for the Christmas goat", icon: "🐐", mins: 60, special: "goat" },
    small_chops: { name: "Sell small chops", icon: "🥟", mins: 180, fx: { energy: -14 }, gig: 20000, gigType: "food" },
    // Owambe hall
    owambe_attend: { name: "Attend the owambe", icon: "💃🏾", mins: 180, fx: { vibes: 30, energy: -14, belle: 30 }, conn: 4, big: true, event: "owambe", special: "owambe", dress: "owambe" },
    owambe_eat: { name: "Eat jollof and small chops", icon: "🍛", mins: 30, fx: { belle: 40, vibes: 6 }, event: "owambe", food: true },
    owambe_network: { name: "Network with the aunties", icon: "🤝🏾", mins: 60, conn: 8, event: "owambe", special: "meet" },
    owambe_gossip: { name: "Gossip in the corner", icon: "🤫", mins: 45, gossip: 2, event: "owambe", special: "discover" },
    event_setup: { name: "Event setup gig", icon: "🪑", mins: 240, fx: { energy: -22 }, gig: 30000, gigType: "setup" },
    // Hotel
    book_night: { name: "Book a room for tonight", icon: "🛏️", mins: 10, cost: 85000, special: "hotelnight" },
    // The IJGB luxury shortlet penthouse.
    book_penthouse: { name: "Book the penthouse for tonight", icon: "🔑", mins: 10, cost: 350000, clout: 6, special: "penthouse" },
    chef_dinner: { name: "Private chef dinner", icon: "👨🏾‍🍳", mins: 90, cost: 60000, fx: { belle: 60, vibes: 16, social: 6 }, food: true, clout: 2 },
    wine_tasting: { name: "Wine tasting at the wine wall", icon: "🍷", mins: 40, cost: 30000, fx: { vibes: 12, social: 6 }, clout: 1 },
    movie_night: { name: "Movie night on the big screen", icon: "🎬", mins: 120, fx: { vibes: 20, energy: 6 } },
    content_shoot: { name: "Shoot content for the 'gram", icon: "🤳🏾", mins: 40, special: "post", clout: 3 },
    penthouse_party: { name: "Throw a penthouse party", icon: "🥂", mins: 240, cost: 180000, fx: { vibes: 40, energy: -20, social: 30 }, clout: 12, conn: 8, big: true, needsBooking: true, special: "host" },
    // VIP Beach Club: day-to-night zones.
    pool_swim: { name: "Swim in the infinity pool", icon: "🏊🏾", mins: 45, fx: { vibes: 14, energy: -6, hygiene: 10 }, clout: 1 },
    daybed_lounge: { name: "Lounge on a daybed", icon: "🏖️", mins: 60, cost: 15000, fx: { energy: 10, vibes: 10 }, window: [10, 19] },
    beach_brunch: { name: "Bottomless brunch", icon: "🥂", mins: 90, cost: 35000, fx: { belle: 40, vibes: 14, social: 10 }, food: true, clout: 2, window: [10, 16] },
    sundowner: { name: "Sundowner cocktails at the pergola", icon: "🌅", mins: 60, cost: 18000, fx: { vibes: 16, social: 10 }, clout: 2, window: [16, 21], special: "datecheck" },
    vip_cabana: { name: "Book a VIP cabana (bottle service)", icon: "🍾", mins: 180, cost: 250000, fx: { vibes: 38, social: 20, energy: -10 }, clout: 14, conn: 6, big: true, premium: true, special: "vip" },
    beachclub_party: { name: "Party at the DJ set", icon: "🎧", mins: 180, cost: 20000, fx: { vibes: 34, energy: -18 }, clout: 6, big: true, dress: "club", window: [21, 3], special: "party" },
    // High-octane rooftop: fire pits and a DJ hub over the city.
    firepit_chill: { name: "Chill by the fire pit", icon: "🔥", mins: 60, cost: 8000, fx: { vibes: 14, social: 12, energy: 4 }, clout: 1 },
    rooftop_party: { name: "Rooftop DJ night", icon: "🎛️", mins: 180, cost: 25000, fx: { vibes: 34, energy: -18 }, clout: 6, big: true, dress: "club", window: [21, 2], special: "party" },
    pool_day: { name: "Pool day", icon: "🏊🏾", mins: 120, cost: 15000, fx: { vibes: 18, energy: 6 }, clout: 3 },
    lobby_network: { name: "Network in the lobby", icon: "🧳", mins: 45, conn: 5, special: "meet" },
    rent_car: { name: "Rent a car for the day", icon: "🚙", mins: 20, cost: 80000, special: "rentcar" },
    // Money
    quick_loan: { name: "Take a quick loan (₦150k)", icon: "📝", mins: 30, special: "loan", desc: "Repay ₦195,000 before you leave December." },
    repay_loan: { name: "Repay your loan", icon: "✅", mins: 15, special: "repay" },
    bdc_sell: { name: "Sell dollars", icon: "💵", mins: 0, special: "bdc" },
    bdc_buy: { name: "Buy dollars", icon: "💱", mins: 0, special: "bdcbuy" },
    mall_bdc: { name: "Change dollars (mall desk)", icon: "💱", mins: 0, special: "bdcmall" },
    // Mall and fashion
    buy_gifts: { name: "Buy Christmas gifts", icon: "🎁", mins: 45, cost: 25000, gives: "gift_box" },
    buy_ticket: { name: "Buy a Detty Fest ticket", icon: "🎟️", mins: 10, cost: 60000, gives: "concert_ticket" },
    cinema: { name: "Catch a movie", icon: "🎬", mins: 130, cost: 7000, fx: { vibes: 16 } },
    mall_meet: { name: "Window-shop and meet people", icon: "👋🏾", mins: 30, special: "meet" },
    buy_outfit: { name: "Buy a new fit", icon: "🛍️", mins: 40, special: "shop" },
    buy_accessory: { name: "Buy shoes, bags or jewellery", icon: "👜", mins: 30, special: "accessories" },
    tailor: { name: "Order a custom native outfit", icon: "🪡", mins: 30, cost: 60000, special: "tailor", desc: "Ready in 2 days." },
    // Church
    service: { name: "Attend service", icon: "🙏🏾", mins: 120, fx: { vibes: 12 }, rep: 5, special: "church" },
    carol: { name: "Carol practice", icon: "🎶", mins: 90, fx: { vibes: 14 }, rep: 3, conn: 3 },
    pray: { name: "Quiet prayer", icon: "🕯️", mins: 20, fx: { vibes: 6 }, special: "pray" },
    // Nightlife
    party: { name: "Party", icon: "🪩", mins: 180, cost: 25000, fx: { vibes: 30, energy: -18 }, clout: 4, big: true, dress: "club", special: "party" },
    dance: { name: "Dance", icon: "💃🏾", mins: 60, fx: { vibes: 16, energy: -12 }, clout: 2, dress: "club" },
    club_meet: { name: "Meet people", icon: "🥂", mins: 30, special: "meet", dress: "club" },
    club_network: { name: "Network in the VIP area", icon: "🍾", mins: 60, conn: 6, dress: "club", special: "meet" },
    club_photos: { name: "Take photos", icon: "📸", mins: 20, special: "post", dress: "club" },
    start_drama: { name: "Start drama", icon: "😤", mins: 30, special: "drama", dress: "club" },
    vip: { name: "Book a VIP table and spray money", icon: "💸", mins: 180, cost: 400000, fx: { vibes: 45, energy: -20 }, clout: 18, conn: 8, big: true, premium: true, dress: "club", special: "vip" },
    concert: { name: "Watch the Detty Fest concert", icon: "🎤", mins: 240, fx: { vibes: 55, energy: -25 }, clout: 10, big: true, event: "concert", item: "concert_ticket", special: "concert" },
    concert_photo_gig: { name: "Event photography gig", icon: "📷", mins: 180, fx: { energy: -16 }, gig: 45000, gigType: "photo", event: "concert" },
    resell_tickets: { name: "Resell tickets at the gate", icon: "🎟️", mins: 90, fx: { energy: -8 }, special: "resell", event: "concert" },
    sunset_drinks: { name: "Sunset drinks", icon: "🍹", mins: 90, cost: 22000, fx: { vibes: 18 }, clout: 3, special: "datecheck" },
    lounge_network: { name: "Network with big people", icon: "🕴🏾", mins: 60, conn: 7, special: "meet", dress: "club" },
    // Outdoors
    chill: { name: "Chill and catch breeze", icon: "🌴", mins: 60, cost: 2000, fx: { vibes: 14, energy: 6 } },
    beach_party: { name: "Beach party", icon: "🥂", mins: 180, cost: 20000, fx: { vibes: 32, energy: -14 }, clout: 5, big: true, event: "beachparty" },
    picnic: { name: "Picnic with the crew", icon: "🧺", mins: 90, cost: 15000, fx: { vibes: 18, belle: 15 }, special: "crew" },
    beach_photos: { name: "Shoot beach content", icon: "🤳🏾", mins: 30, special: "post" },
    photoshoot: { name: "Do a photoshoot", icon: "📸", mins: 60, special: "post", desc: "Best spot in the city for content." },
    collab: { name: "Collab with a creator", icon: "🎬", mins: 90, special: "collab" },
    // Airport
    pickup: { name: "Pick up arriving family", icon: "🛬", mins: 40, special: "pickup" },
    watch_arrivals: { name: "Watch IJGBs land in matching tracksuits", icon: "👀", mins: 30, fx: { vibes: 6 }, gossip: 1 },
  };

  // ------------------------------------------------------------ items
  const ITEMS = {
    phone: { name: "Phone", icon: "📱", kind: "gear" },
    jollof_pack: { name: "Takeaway jollof", icon: "🥡", kind: "food", eat: { belle: 35, vibes: 4 } },
    chicken_bucket: { name: "Chicken bucket", icon: "🪣", kind: "food", eat: { belle: 40, vibes: 6 }, share: true },
    gift_box: { name: "Wrapped gift", icon: "🎁", kind: "gift", rel: 12 },
    perfume: { name: "Designer perfume", icon: "🧴", kind: "gift", rel: 18 },
    wine: { name: "Bottle of wine", icon: "🍷", kind: "gift", rel: 10 },
    concert_ticket: { name: "Detty Fest ticket", icon: "🎟️", kind: "ticket" },
    vip_band: { name: "VIP wristband", icon: "🎫", kind: "ticket" },
    merch: { name: "Detty merch (20 pieces)", icon: "👕", kind: "business", sell: 70000 },
    souvenir: { name: "Owambe souvenir plate", icon: "🍽️", kind: "collectible" },
    stub: { name: "Concert wristband stub", icon: "🎗️", kind: "collectible" },
    slippers: { name: "Pam slippers", icon: "🩴", kind: "shoes", clout: -2 },
    sneakers: { name: "Designer sneakers", icon: "👟", kind: "shoes", clout: 3, price: 90000 },
    heels: { name: "Party heels", icon: "👠", kind: "shoes", clout: 3, price: 70000 },
    loafers: { name: "Leather loafers", icon: "🥿", kind: "shoes", clout: 2, price: 60000 },
    boots: { name: "Leather boots", icon: "🥾", kind: "shoes", clout: 3, price: 75000 },
    designer_bag: { name: "Designer-looking bag", icon: "👜", kind: "bag", clout: 4, price: 120000 },
    tiny_bag: { name: "Tiny Y2K bag", icon: "👛", kind: "bag", clout: 2, price: 35000 },
    gold_watch: { name: "Gold watch", icon: "⌚", kind: "jewelry", clout: 5, price: 200000 },
    chain: { name: "Gold chain", icon: "📿", kind: "jewelry", clout: 2, price: 45000 },
  };

  // ------------------------------------------------------------ people
  // Schedules: [from, to, place]. Times past midnight use >24:00.
  // "off" means away from the streets (home, asleep).
  const S = (rows) => rows.map(([a, b, p]) => [hm(a), hm(b), p]);
  const NPCS = [
    { id: "mama", name: "Mama", role: "Your mother", persona: null, group: ["owambe"], family: true, rel: 65,
      look: { body: "woman", skin: 4, hair: "bun", hairColour: "black", style: "tradfusion", colour: 2, fabric: "ankara", gele: true },
      schedule: S([["07:00", "09:00", "market"], ["09:00", "13:00", "family"], ["13:00", "15:00", "church"], ["15:00", "22:00", "family"]]),
      sunday: S([["08:00", "12:00", "church"], ["12:00", "22:00", "family"]]),
      lines: { hi: ["My pikin! Have you eaten?", "Come and greet your mother properly.", "You look thin. Are they not feeding you?"], bye: ["Go well. Don't come home late!", "Remember who you are."] } },
    { id: "kemi", name: "Kemi", role: "Influencer · your ex", persona: "influencer", group: ["influencers", "richkids", "creatives"], romance: true, rel: 40,
      look: { body: "woman", skin: 2, hair: "bonestraight", hairColour: "honey", style: "glam", colour: 8, fabric: "sequin", chain: true },
      schedule: S([["10:00", "13:00", "cafe"], ["13:00", "16:00", "photo"], ["16:00", "19:00", "mall"], ["19:00", "22:00", "lounge"], ["22:00", "27:00", "club"]]),
      secret: "Her 'Range Rover' is rented by the hour, and her brand deals are paid for with a loan app.", secretShort: "fakes her rich lifestyle",
      lines: { hi: ["Babe! You're giving December energy.", "Are you following me around? 😏", "Quick, take my picture first."], bye: ["Tag me o!", "Don't be a stranger."] } },
    { id: "dayo", name: "Dayo", role: "Says he's 'from London'", persona: "wannabe", group: ["influencers"], rel: 40,
      look: { body: "man", skin: 2, hair: "taper", hairColour: "black", style: "allblack", colour: 7, fabric: "plain", shades: true, chain: true },
      schedule: S([["11:00", "14:00", "mall"], ["14:00", "18:00", "fashion"], ["18:00", "22:00", "suya"], ["22:00", "28:00", "club"]]),
      secret: "Dayo has never left Lagos. The 'London' photos are from a Lekki mall.", secretShort: "has never left Nigeria",
      lines: { hi: ["Wagwan! Back in London we— anyway.", "Bruv, Lagos is mad innit.", "You good? Proper December vibes."], bye: ["Laters, bruv.", "Link me later, innit."] } },
    { id: "tunde", name: "Big Tunde", role: "Senator's son", persona: "pikin", group: ["richkids"], rel: 40,
      look: { body: "man", skin: 4, hair: "lowfade", hairColour: "black", style: "oldmoney", colour: 8, fabric: "plain", chain: true },
      schedule: S([["12:00", "15:00", "restaurant"], ["15:00", "18:00", "beach"], ["18:00", "22:00", "lounge"], ["22:00", "28:00", "club"]]),
      secret: "His father's accounts were frozen last month. He's spending the last of it.", secretShort: "is secretly broke",
      lines: { hi: ["Ah! My guy. Drinks are on me. As usual.", "You know who my father is, abi?", "Tonight we're doing VIP. Come."], bye: ["Later. Call me if you need anything.", "Stay up."] } },
    { id: "nkechi", name: "Mama Nkechi", role: "Owambe royalty", persona: "aunty", group: ["owambe"], rel: 45,
      look: { body: "woman", skin: 5, hair: "bun", hairColour: "black", style: "tradfusion", colour: 4, fabric: "asooke", gele: true },
      schedule: S([["08:00", "12:00", "market"], ["12:00", "16:00", "salon"], ["16:00", "19:00", "church"], ["19:00", "21:00", "mamaput"]]),
      saturday: S([["08:00", "12:00", "market"], ["12:00", "23:00", "hall"]]),
      secret: "She's been borrowing heavily to keep up appearances at every party.", secretShort: "is drowning in debt",
      lines: { hi: ["Ehen! Come here, let me tell you something.", "Did you hear what happened at the wedding?", "Your aso-ebi will be ready, don't worry."], bye: ["I'll call you with the gist.", "Don't tell anybody I told you o."] } },
    { id: "seun", name: "Seun", role: "Event photographer", persona: "hustler", group: ["hustlers", "creatives", "uni"], romance: true, rel: 45,
      look: { body: "man", skin: 6, hair: "cornrows", hairColour: "black", style: "streetwear", colour: 1, fabric: "plain" },
      schedule: S([["08:00", "12:00", "hustle"], ["12:00", "14:00", "mamaput"], ["14:00", "18:00", "photo"], ["18:00", "22:00", "suya"], ["22:00", "25:00", "club"]]),
      secret: "He's secretly building a startup and just got a meeting with investors.", secretShort: "has a secret investor meeting",
      lines: { hi: ["Hold that pose— okay, natural light is good.", "December is harvest season, abeg.", "You dey find work? I get gig."], bye: ["Make we link up.", "Send me your pictures later."] } },
    { id: "tobi", name: "Cousin Tobi", role: "Real IJGB from London", persona: "ijgb", group: ["diaspora"], arrives: 11, from: "London 🇬🇧", rel: 50,
      look: { body: "man", skin: 3, hair: "waves", hairColour: "black", style: "streetwear", colour: 7, fabric: "plain", shades: true, chain: true },
      schedule: S([["10:00", "13:00", "family"], ["13:00", "16:00", "fastfood"], ["16:00", "20:00", "beach"], ["20:00", "26:00", "club"]]),
      secret: "He lost his job in London in June. This trip is on his overdraft.", secretShort: "lost his job abroad",
      lines: { hi: ["Cuz! It's hot, innit. Why is it this hot?", "Where's the best jollof? Real talk.", "My mum packed three suitcases of gifts. None for me."], bye: ["Safe, cuz.", "Laters!"] } },
    { id: "funke", name: "Aunty Funke", role: "Japa aunty from Houston", persona: "japa", group: ["diaspora", "owambe"], arrives: 16, from: "Houston 🇺🇸", rel: 40,
      look: { body: "woman", skin: 4, hair: "frontal", hairColour: "burgundy", style: "tradfusion", colour: 9, fabric: "asooke", gele: true },
      schedule: S([["09:00", "12:00", "church"], ["12:00", "15:00", "market"], ["15:00", "19:00", "mall"], ["19:00", "22:00", "family"]]),
      secret: "Her 'Houston mansion' is a one-bedroom she shares with two nurses.", secretShort: "lives in a shared one-bedroom",
      lines: { hi: ["My dear! In America we don't do this traffic.", "Have you seen my sixth suitcase?", "You must come to Houston. Somehow."], bye: ["God bless you, my child.", "Call me before I travel back."] } },
    { id: "chidi", name: "Chidi", role: "Your uni guy, now in Toronto", persona: "japa", group: ["diaspora", "uni"], arrives: 19, from: "Toronto 🇨🇦", rel: 55,
      look: { body: "man", skin: 5, hair: "locs", hairColour: "black", style: "resort", colour: 6, fabric: "adire", shades: true },
      schedule: S([["10:00", "13:00", "cafe"], ["13:00", "17:00", "gym"], ["17:00", "21:00", "restaurant"], ["21:00", "26:00", "lounge"]]),
      secret: "He works three jobs and sleeps on a friend's couch in Brampton.", secretShort: "is struggling in Canada",
      lines: { hi: ["Omo! Look at you. Lagos treating you well?", "The cold over there is not normal, bro.", "Soft life only this December."], bye: ["Let's link before I fly.", "Respect, bro."] } },
    { id: "biggie", name: "Promoter Biggie", role: "Club promoter", persona: null, group: ["hustlers"], rel: 35,
      look: { body: "man", skin: 6, hair: "buzz", hairColour: "black", style: "allblack", colour: 7, fabric: "plain", chain: true, beard: "full" },
      schedule: S([["17:00", "21:00", "suya"], ["21:00", "28:00", "club"]]),
      lines: { hi: ["VIP or regular? Talk to me.", "Tonight is going to be mad. Guest list?", "I know everybody, you know."], bye: ["Tell your friends!", "Pull up later."] } },
    { id: "mamat", name: "Mama T", role: "Runs the best mama put", persona: null, group: ["owambe"], vendor: "mamaput", rel: 45,
      look: { body: "woman", skin: 5, hair: "bun", hairColour: "black", style: "afrochic", colour: 3, fabric: "ankara", gele: true },
      schedule: S([["07:00", "21:00", "mamaput"]]),
      lines: { hi: ["Customer! Amala dey, ewedu dey, gbegiri dey.", "You don chop today?", "Sit down, I go serve you sharp sharp."], bye: ["Come back tomorrow o!", "Greet your mama for me."] } },
    { id: "sule", name: "Bouncer Sule", role: "Club security", persona: null, group: [], vendor: "club", rel: 30,
      look: { body: "man", skin: 6, hair: "buzz", hairColour: "black", style: "allblack", colour: 7, fabric: "plain", shades: true, beard: "shaped" },
      schedule: S([["21:00", "29:00", "club"]]),
      lines: { hi: ["Wristband?", "Step aside, oga.", "No slippers inside this club."], bye: ["Enjoy.", "Move along."] } },
    { id: "taiwo", name: "Uncle Taiwo", role: "Danfo driver", persona: null, group: ["hustlers"], vendor: "busstop", rel: 40,
      look: { body: "man", skin: 5, hair: "lowfade", hairColour: "brown", style: "resort", colour: 3, fabric: "plain", beard: "shaped" },
      schedule: S([["06:00", "22:00", "busstop"]]),
      lines: { hi: ["Ojuelegba! Ojuelegba! Enter with your change!", "Traffic don start for bridge o.", "My pikin, where you dey go?"], bye: ["Shift body!", "Safe journey."] } },
  ];

  const GROUPS = {
    uni: { name: "University friends", icon: "🎓" },
    richkids: { name: "Rich kids", icon: "💎" },
    hustlers: { name: "Street hustlers", icon: "💼" },
    creatives: { name: "Creatives", icon: "🎨" },
    influencers: { name: "Influencers", icon: "📸" },
    diaspora: { name: "Diaspora crowd", icon: "✈️" },
    owambe: { name: "Owambe crowd", icon: "👑" },
  };

  // Strangers walking around. Their looks are generated from these pools.
  const STRANGER_NAMES = ["Emeka", "Halima", "Bisi", "Yusuf", "Ngozi", "Femi", "Zainab", "Kunle", "Amaka", "Ibrahim", "Tolu", "Chiamaka", "Segun", "Fatima", "Obinna", "Ronke", "Musa", "Adaeze", "Wale", "Hauwa", "Chuka", "Temi", "Dapo", "Ifeoma", "Sani", "Lola", "Uche", "Kemi B.", "Tunji", "Aisha"];

  // ------------------------------------------------------------ conversations
  // Questions people ask you. Each answer moves relationship, reputation, money or secrets.
  const QUESTIONS = [
    { q: "Guy, you dey go {club} tonight?", a: [
      { label: "Of course. Where else?", rel: 4, clout: 1, mem: "partyplans" },
      { label: "I no get money for that one.", rel: 2, rep: 2, exposure: { influencer: 6, ijgb: 8, wannabe: 4 } },
      { label: "Who dey perform?", rel: 3, text: "\"Rumour says a surprise guest. Big one.\"" },
      { label: "Why you wan know?", rel: -5 },
    ] },
    { q: "So when are you getting married?", a: [
      { label: "By God's grace.", rel: 3, rep: 2 },
      { label: "I'm focused on my career.", rel: 0, rep: -1 },
      { label: "When you pay for the wedding.", rel: -6, vibes: 6 },
    ] },
    { q: "Which part of London you dey stay before?", persona: ["wannabe", "ijgb"], a: [
      { label: "Peckham, innit.", lie: true, rel: 2 },
      { label: "Let's not talk about London.", rel: -2, exposure: { wannabe: 6 } },
      { label: "I've never actually been. I just like the accent.", truth: true, rel: 4, rep: 4, clout: -6 },
    ] },
    { q: "Abeg, you fit help me with something small? ₦20k.", a: [
      { label: "Send ₦20,000", cost: 20000, rel: 10, rep: 4, mem: "gaveMoney" },
      { label: "I'm managing too, sorry.", rel: -4 },
      { label: "Pretend you didn't hear", rel: -8, mem: "ignored" },
    ] },
    { q: "Please, how did you japa? I'm serious.", persona: ["japa", "ijgb"], a: [
      { label: "Explain the whole process", mins: 30, rel: 10, rep: 5, conn: 4, japaHelp: true },
      { label: "Send me an email.", rel: -2 },
      { label: "Abroad is not what you think.", rel: 2, rep: 2, exposure: { japa: 8, ijgb: 6 } },
    ] },
    { q: "Is this your real accent?", persona: ["firsttimer"], a: [
      { label: "Yes! I grew up in Manchester.", rel: 3, culture: 2 },
      { label: "Abeg, na my accent be this.", rel: 4, culture: 6, text: "They laughed — and approved." },
    ] },
    { q: "You see the new dance? Show me!", a: [
      { label: "Do the dance", vibes: 8, clout: 2, rel: 5 },
      { label: "My knees are on leave.", rel: 1 },
    ] },
    { q: "Which jollof is better, Naija or Ghana?", a: [
      { label: "Naija. Next question.", rel: 6, vibes: 4 },
      { label: "Both are nice.", rel: -3, culture: -2 },
      { label: "Ghana.", rel: -12, vibes: 4, text: "The silence was loud." },
    ] },
    { q: "Are you going to the owambe on Saturday?", a: [
      { label: "I wouldn't miss it.", rel: 5, mem: "partyplans" },
      { label: "Only if the jollof is good.", rel: 3 },
      { label: "Owambes are too long.", rel: -4 },
    ] },
    { q: "You get Instagram? Follow me back.", a: [
      { label: "Follow back", rel: 5, followers: 20 },
      { label: "I'll check later.", rel: -2 },
    ] },
    { q: "This your outfit… where you buy am?", a: [
      { label: "Àṣà Fashion House, custom.", rel: 3, clout: 2, styleCheck: true },
      { label: "Abroad, of course.", lie: true, rel: 2, exposure: { wannabe: 8 } },
      { label: "Market. ₦8k. Still hard.", rel: 6, rep: 3 },
    ] },
  ];

  // ------------------------------------------------------------ story chains
  // Each chain is a sequence of steps. A step triggers when its condition is met
  // (talking to someone, being somewhere, a date) and offers choices.
  const CHAINS = {
    kemi: {
      title: "The Range Rover", npc: "kemi",
      steps: [
        { id: "meet", when: { talk: "kemi" }, text: "Kemi looks you up and down. \"We should shoot content together sometime. You have a face for engagement.\"",
          choices: [{ label: "Let's do it", rel: 6, next: "invite" }, { label: "Maybe. Are you still angry at me?", rel: 3, next: "invite", text: "\"Angry is a strong word.\"" }] },
        { id: "invite", when: { phoneAfterMins: 240 }, phone: { from: "kemi", text: "Shoot at the Detty Wall tomorrow 2pm? Wear something nice 📸" },
          choices: [{ label: "I'll be there", rel: 4, next: "shoot", schedule: { place: "photo", start: "14:00", dayOffset: 1, window: 240 } }, { label: "Can't make it", rel: -6, mem: "ignored", next: null }] },
        { id: "shoot", when: { at: "photo", window: true }, text: "Mid-shoot, Kemi's phone rings. \"No, I'll return the Range by 6… Yes I know it's ₦80k an hour.\" She sees you heard everything.",
          choices: [
            { label: "🤐 \"I didn't hear anything.\"", rel: 15, discover: "kemi", mem: "protected", next: "dayo_ask", followers: 300 },
            { label: "🤝 \"Your secret is safe. Teach me the hustle.\"", rel: 22, discover: "kemi", mem: "helped", next: "dayo_ask", text: "She laughs, relieved. \"Okay, you're actually cool.\"" },
            { label: "🕵🏾 \"Wait, the car isn't yours?\"", rel: -8, discover: "kemi", next: "dayo_ask" },
          ] },
        { id: "dayo_ask", when: { phoneAfterMins: 600 }, phone: { from: "dayo", text: "Bruv. Heard Kemi's car is rented 😂 Post it and you'll blow up. I'll repost." },
          choices: [
            { label: "📣 Post it", expose: "kemi", next: "fallout_exposed" },
            { label: "💰 Ask Kemi for money to keep quiet", blackmail: "kemi", next: "fallout_blackmail" },
            { label: "🤐 Ignore Dayo", rel: 4, next: "fallout_loyal" },
          ] },
        { id: "fallout_exposed", when: { talk: "kemi" }, text: "Kemi's eyes are red. \"After everything? You posted it? My brand deals are gone.\"",
          choices: [{ label: "Apologise", rel: 6, rep: 3, next: null }, { label: "\"It was the truth.\"", rel: -10, clout: 4, next: null }] },
        { id: "fallout_blackmail", when: { daysAfter: 2 }, text: "Kemi posted screenshots of your messages asking for money. The comments are not kind.",
          choices: [{ label: "Delete your account for a day", rep: -12, clout: -10, mem: "blackmailed", next: null, fraud: true }] },
        { id: "fallout_loyal", when: { talk: "kemi" }, text: "\"Dayo told me he asked you to post. You didn't.\" Kemi hugs you. \"Crossover with me?\"",
          choices: [{ label: "💞 Yes", romance: 25, rel: 10, next: null }, { label: "Let's stay friends", rel: 10, next: null }] },
      ],
    },
    dayo: {
      title: "Which Tube Stop?", npc: "dayo",
      steps: [
        { id: "brag", when: { talk: "dayo" }, text: "\"Back in London I was running things, bruv. Zone 1, innit.\"",
          choices: [
            { label: "\"Which tube stop is closest to you?\"", next: "quiz" },
            { label: "Nod along", rel: 4, next: "quiz" },
          ] },
        { id: "quiz", when: { talk: "dayo" }, text: "Dayo hesitates. \"The… London one. Big Ben Station.\" Tobi, standing nearby, nearly chokes.",
          choices: [
            { label: "🤐 Change the subject for him", rel: 15, discover: "dayo", mem: "protected", next: "favour" },
            { label: "😂 Laugh out loud", rel: -15, discover: "dayo", mem: "embarrassed", clout: 3, next: "revenge" },
            { label: "🗣️ Tell Tobi later", discover: "dayo", gossip: 1, next: "revenge" },
          ] },
        { id: "favour", when: { phoneAfterMins: 300 }, phone: { from: "dayo", text: "You covered for me. Respect. Guest list at the club tonight is yours, VIP." },
          choices: [{ label: "Accept", give: "vip_band", rel: 6, next: null }] },
        { id: "revenge", when: { daysAfter: 2 }, text: "Dayo has been telling people your December is 'all fake'. Someone asks if it's true.",
          choices: [{ label: "Laugh it off", rep: -3, exposure: 10, next: null }, { label: "Confront Dayo", rel: -10, rep: 2, next: null }] },
      ],
    },
    tobi: {
      title: "Cousin From London", npc: "tobi",
      steps: [
        { id: "land", when: { day: 11, at: "airport" }, text: "Tobi drops his bags and hugs you. \"Cuz! Thank God you came. My card isn't working here.\"",
          choices: [{ label: "Pay for his Bolt home (₦15k)", cost: 15000, rel: 10, mem: "helped", next: "borrow" }, { label: "\"Card will work tomorrow.\"", rel: 2, next: "borrow" }] },
        { id: "borrow", when: { talk: "tobi", afterDay: 13 }, text: "Tobi lowers his voice. \"Can you lend me ₦100k? I'll send pounds when I'm back. Promise.\"",
          choices: [
            { label: "Lend it", cost: 100000, rel: 15, mem: "gaveMoney", next: "truth" },
            { label: "\"Why do you need it, cuz?\"", next: "truth" },
            { label: "Refuse", rel: -10, next: null },
          ] },
        { id: "truth", when: { talk: "tobi" }, text: "\"I lost my job in June. Everyone thinks I'm balling. Please don't tell my mum.\"",
          choices: [
            { label: "🤐 \"It stays between us.\"", rel: 20, discover: "tobi", mem: "protected", next: null },
            { label: "📣 Tell the family group chat", discover: "tobi", expose: "tobi", next: null },
            { label: "🤝 Help him find remote work", discover: "tobi", rel: 25, conn: 5, mem: "helped", next: null },
          ] },
      ],
    },
    tunde: {
      title: "Card Declined", npc: "tunde",
      steps: [
        { id: "vip", when: { talk: "tunde", at: "club" }, text: "\"VIP tonight. Everything on me.\" Twenty minutes later, the waiter comes back: \"Oga, card declined.\" Twice.",
          choices: [
            { label: "Pay the ₦150k bill quietly", cost: 150000, rel: 25, discover: "tunde", mem: "helped", next: "thanks" },
            { label: "📸 Record it", discover: "tunde", clout: 6, rel: -20, mem: "embarrassed", next: "angry" },
            { label: "Slip out", rel: -5, discover: "tunde", next: null },
          ] },
        { id: "thanks", when: { phoneAfterMins: 300 }, phone: { from: "tunde", text: "Daddy's accounts are frozen. You're the only one who knows. Thank you. I won't forget." },
          choices: [{ label: "\"I've got you.\"", rel: 10, conn: 10, mem: "protected", next: null }] },
        { id: "angry", when: { talk: "tunde" }, text: "\"Delete that video. Now. You don't know who you're dealing with.\"",
          choices: [{ label: "Delete it", rel: 5, next: null }, { label: "💰 \"₦300k and it's gone.\"", blackmail: "tunde", next: null }, { label: "📣 Post it", expose: "tunde", next: null }] },
      ],
    },
  };

  // ------------------------------------------------------------ missions
  const MISSIONS = {
    ijgb: { name: "Enjoy without going broke", icon: "🧳", desc: "End December with 60+ average vibes and at least $500 left.", check: (s) => s.stats.avgVibes >= 60 && s.usd >= 500, progress: (s) => `Vibes ${Math.round(s.stats.avgVibes || s.needs.vibes)} / 60 · $${Math.round(s.usd)} / $500` },
    wannabe: { name: "Survive without being exposed", icon: "🎭", desc: "Make it to crossover with your cover story intact.", check: (s) => !s.exposed && s.over, progress: (s) => s.exposed ? "Exposed 😱" : `Exposure risk ${Math.round(s.exposure)}%` },
    japa: { name: "Help 3 people relocate", icon: "📄", desc: "Use 'I Know The Process' or answer japa questions properly three times.", check: (s) => s.stats.japaHelped >= 3, progress: (s) => `${s.stats.japaHelped || 0} / 3 helped` },
    firsttimer: { name: "Become a true Naija child", icon: "🪘", desc: "Earn 100 culture points.", check: (s) => s.res >= 100, progress: (s) => `${Math.round(s.res)} / 100 culture` },
    hustler: { name: "Make ₦300,000", icon: "💪🏾", desc: "Earn ₦300,000 from gigs and deals before 31 December.", check: (s) => s.stats.earned >= 300000, progress: (s) => `₦${Math.round(s.stats.earned || 0).toLocaleString()} / ₦300,000` },
    influencer: { name: "Reach 10,000 followers", icon: "📱", desc: "Post, collab and go viral.", check: (s) => s.followers >= 10000, progress: (s) => `${Math.round(s.followers).toLocaleString()} / 10,000 followers` },
    pikin: { name: "Throw the party of the year", icon: "👑", desc: "Host a house party or book VIP — and keep 30+ family influence.", check: (s) => s.stats.hosted >= 1 && s.res >= 30, progress: (s) => `${s.stats.hosted ? "Party thrown ✓" : "No party yet"} · Influence ${Math.round(s.res)}` },
    aunty: { name: "Discover 5 major secrets", icon: "🗣️", desc: "Dig into people's stories until you know the truth.", check: (s) => s.stats.secrets >= 5, progress: (s) => `${s.stats.secrets || 0} / 5 secrets` },
  };

  const IDENTITIES = [
    { id: "fraud", name: "Biggest Fraud of December", icon: "🤥", test: (s) => s.flags.fraud || (s.exposed && s.persona === "wannabe") },
    { id: "royalty", name: "Owambe Royalty", icon: "👑", test: (s) => s.stats.owambeTrad >= 2 },
    { id: "amebo", name: "Professional Amebo", icon: "🗣️", test: (s) => s.stats.secrets >= 4 },
    { id: "celeb", name: "Instagram Celebrity", icon: "📸", test: (s) => s.followers >= 8000 || s.clout >= 120 },
    { id: "heartbreaker", name: "Heartbreaker", icon: "💔", test: (s) => s.stats.dates >= 3 && !s.partner },
    { id: "lover", name: "December Lover", icon: "❤️", test: (s) => !!s.partner },
    { id: "padi", name: "Everybody's Padi", icon: "🔥", test: (s) => s.conn >= 85 && s.rep >= 70 },
    { id: "hustler", name: "December Hustler", icon: "💼", test: (s) => s.stats.earned >= 200000 },
    { id: "party", name: "Party Animal", icon: "🎉", test: (s) => s.stats.bignights >= 6 },
    { id: "moneybag", name: "Money Bag", icon: "💰", test: (s, worth) => worth >= 3000000 },
    { id: "newbie", name: "Fresh in the City", icon: "🌱", test: () => true },
  ];

  const ACHIEVEMENTS = {
    first_owambe: { name: "First Owambe", icon: "🎊", desc: "Attend your first owambe." },
    survived: { name: "Survived Detty December", icon: "🛡️", desc: "Make it to crossover." },
    billionaire: { name: "Billionaire Lifestyle", icon: "💸", desc: "Spend ₦500,000 in a single day." },
    caught: { name: "Caught in 4K", icon: "📹", desc: "Get exposed." },
    padi: { name: "Everybody's Padi", icon: "🔥", desc: "Become friends with 6 people." },
    nowahala: { name: "No Wahala", icon: "😌", desc: "Finish December with your secret safe and 60+ reputation." },
    amebo: { name: "Professional Amebo", icon: "🗣️", desc: "Discover 4 secrets." },
    ijgb_exposed: { name: "IJGB Exposed", icon: "🇬🇧", desc: "Expose a fake IJGB." },
    lover: { name: "December Lover", icon: "💞", desc: "Start a relationship." },
    last_standing: { name: "Last Man Standing", icon: "🌅", desc: "Still partying at 4am." },
    jollof: { name: "Jollof Royalty", icon: "🥘", desc: "Cook party jollof 3 times." },
    airport: { name: "Airport Legend", icon: "✈️", desc: "Pick up every arriving relative yourself." },
    concert: { name: "Detty Fest Veteran", icon: "🎤", desc: "Attend a Detty Fest concert." },
    village: { name: "Village People Approved", icon: "🛖", desc: "Go to the village for Christmas." },
    goat: { name: "Goat Negotiator", icon: "🐐", desc: "Buy the Christmas goat." },
    viral: { name: "Gone Viral", icon: "📈", desc: "Reach 5,000 followers." },
    loyal: { name: "Secret Keeper", icon: "🤐", desc: "Protect someone's secret." },
    bigbreak: { name: "The Big Break", icon: "🚀", desc: "Land the opportunity of a lifetime." },
  };

  const WD = {
    hm, DAY, GRID, TYPES, SLOTS, NAMES, buildPlaces, isOpen, weekday, WEEKDAYS, CONCERT_DAYS, PHASES, phase, eventsOn,
    ACTIONS, ITEMS, NPCS, GROUPS, STRANGER_NAMES, QUESTIONS, CHAINS, MISSIONS, IDENTITIES, ACHIEVEMENTS,
  };
  if (typeof module !== "undefined") module.exports = WD;
  else root.WORLD = WD;
})(typeof window !== "undefined" ? window : globalThis);
