// DECEMBER WAHALA — life-sim layer: needs, emotions and moodlets, skills,
// social interactions, venue interiors with clickable objects, and home
// furniture you can buy. Extends WORLD (world-data.js).
/* global module, require */
(function (root) {
  const W = typeof module !== "undefined" ? require("./world-data.js") : root.WORLD;

  // ------------------------------------------------------------ needs
  const NEEDS = {
    belle: { label: "Belle", icon: "🍛", decay: 5 },
    energy: { label: "Energy", icon: "⚡", decay: 4.2 },
    bladder: { label: "Bladder", icon: "🚽", decay: 9 },
    hygiene: { label: "Hygiene", icon: "🛁", decay: 3.2 },
    vibes: { label: "Fun", icon: "🎉", decay: 2.5 },
    social: { label: "Social", icon: "💬", decay: 3 },
  };

  // ------------------------------------------------------------ emotions
  // Like The Sims: the strongest stack of moodlets decides how you feel.
  const EMOTIONS = {
    fine: { name: "Fine", icon: "🙂", color: "#20b46e" },
    happy: { name: "Happy", icon: "😊", color: "#f2b632" },
    confident: { name: "Confident", icon: "😎", color: "#2f7de1" },
    flirty: { name: "Flirty", icon: "😘", color: "#ec4899" },
    energized: { name: "Energized", icon: "⚡", color: "#f59e2e" },
    playful: { name: "Playful", icon: "😜", color: "#14b8a6" },
    focused: { name: "Focused", icon: "🧐", color: "#6366f1" },
    inspired: { name: "Inspired", icon: "💡", color: "#06b6d4" },
    tense: { name: "Tense", icon: "😬", color: "#e5484d" },
    sad: { name: "Sad", icon: "😢", color: "#3b82f6" },
    angry: { name: "Angry", icon: "😠", color: "#dc2626" },
    embarrassed: { name: "Embarrassed", icon: "😳", color: "#db2777" },
    uncomfortable: { name: "Uncomfortable", icon: "😣", color: "#92400e" },
    bored: { name: "Bored", icon: "😑", color: "#64748b" },
  };

  // Timed moodlets: emotion, weight and how long they last (hours).
  const MOODLETS = {
    stressed: { emotion: "tense", w: 2, h: 1, label: "Stressed Out", icon: "😤" },
    fomo: { emotion: "tense", w: 2, h: 6, label: "FOMO (slower energy recovery)", icon: "🥲" },
    showed_up: { emotion: "happy", w: 2, h: 4, label: "Showed Up for the Crew", icon: "🫶🏾" },
    flat_drama: { emotion: "angry", w: 2, h: 4, label: "Flatmate Wahala", icon: "🍲" },
    no_sleep_noise: { emotion: "angry", w: 2, h: 4, label: "Neighbour Kept Me Up", icon: "🔊" },
    sweet_encounter: { emotion: "flirty", w: 2, h: 5, label: "Someone Smiled at Me", icon: "😊" },
    near_fight: { emotion: "tense", w: 2, h: 3, label: "Almost Got Into a Fight", icon: "😬" },
    fit_approved: { emotion: "confident", w: 2, h: 4, label: "Fit Approved", icon: "💅🏾" },
    cheap_fit: { emotion: "embarrassed", w: 2, h: 3, label: "Failed the Fit Check", icon: "🙈" },
    debtor: { emotion: "tense", w: 3, h: 6, label: "Owing Money", icon: "💸" },
    starstruck: { emotion: "playful", w: 2, h: 5, label: "Starstruck", icon: "🤩" },
    dj_hype: { emotion: "energized", w: 2, h: 4, label: "The Crowd Went Wild", icon: "🎛️" },
    dj_flop: { emotion: "embarrassed", w: 1, h: 2, label: "Cleared the Dance Floor", icon: "🦗" },
    left_on_read: { emotion: "embarrassed", w: 1, h: 2, label: "Ignored by a Celeb", icon: "🫥" },
    double_clout: { emotion: "confident", w: 1, h: 0.5, label: "Double Clout", icon: "✨" },
    ate_well: { emotion: "happy", w: 1, h: 3, label: "Ate Something Good", icon: "😋" },
    great_food: { emotion: "happy", w: 2, h: 4, label: "Party Jollof Perfection", icon: "🥘" },
    slept_well: { emotion: "energized", w: 1, h: 4, label: "Well Rested", icon: "😴" },
    hot_night: { emotion: "uncomfortable", w: 1, h: 3, label: "Hot Night, No Light", icon: "🥵" },
    fresh: { emotion: "happy", w: 1, h: 3, label: "Freshly Showered", icon: "🛁" },
    partied: { emotion: "playful", w: 2, h: 4, label: "Partied Hard", icon: "🪩" },
    danced: { emotion: "energized", w: 1, h: 3, label: "Danced It Out", icon: "💃🏾" },
    big_spender: { emotion: "confident", w: 3, h: 6, label: "Big Spender Energy", icon: "🍾" },
    butterflies: { emotion: "flirty", w: 2, h: 5, label: "Butterflies", icon: "🦋" },
    flirted: { emotion: "flirty", w: 1, h: 2, label: "Had a Flirty Chat", icon: "😘" },
    rejected: { emotion: "embarrassed", w: 2, h: 4, label: "Rejected", icon: "💔" },
    caught: { emotion: "embarrassed", w: 3, h: 12, label: "Caught in 4K", icon: "📹" },
    spilled_tea: { emotion: "playful", w: 1, h: 4, label: "Spilled the Tea", icon: "🫖" },
    argued: { emotion: "angry", w: 2, h: 3, label: "Got Into an Argument", icon: "😤" },
    insulted: { emotion: "angry", w: 2, h: 3, label: "Insulted", icon: "🗯️" },
    complimented: { emotion: "confident", w: 1, h: 3, label: "Got a Compliment", icon: "🌟" },
    laughed: { emotion: "playful", w: 1, h: 2, label: "Had a Good Laugh", icon: "😂" },
    blessed: { emotion: "happy", w: 1, h: 5, label: "Blessed and Covered", icon: "🙏🏾" },
    aso_ebi: { emotion: "confident", w: 2, h: 6, label: "Aso-ebi Slay", icon: "👑" },
    owambe: { emotion: "happy", w: 2, h: 4, label: "Owambe Vibes", icon: "🎊" },
    detty_high: { emotion: "energized", w: 2, h: 6, label: "Detty Fest High", icon: "🎤" },
    fit_ate: { emotion: "confident", w: 1, h: 3, label: "Fit Check Passed", icon: "💅🏾" },
    go_slow: { emotion: "tense", w: 1, h: 2, label: "Stuck in Go-slow", icon: "🚦" },
    black_tax: { emotion: "tense", w: 1, h: 4, label: "Black Tax Pressure", icon: "📲" },
    workout: { emotion: "energized", w: 2, h: 3, label: "Post-workout Glow", icon: "💪🏾" },
    christmas: { emotion: "happy", w: 3, h: 12, label: "Merry Christmas", icon: "🎄" },
    gossip: { emotion: "playful", w: 1, h: 2, label: "Juicy Gist", icon: "🤫" },
    entertained: { emotion: "happy", w: 1, h: 2, label: "Entertained", icon: "📺" },
    focused_work: { emotion: "focused", w: 1, h: 3, label: "In the Zone", icon: "🧐" },
    inspired_art: { emotion: "inspired", w: 2, h: 3, label: "Inspired", icon: "💡" },
    money_rain: { emotion: "confident", w: 2, h: 4, label: "Made It Rain", icon: "💸" },
    accident: { emotion: "embarrassed", w: 3, h: 6, label: "Had an Accident", icon: "🙈" },
    fomo: { emotion: "sad", w: 1, h: 4, label: "FOMO", icon: "📵" },
    shade: { emotion: "playful", w: 1, h: 2, label: "Threw Shade", icon: "💅🏾" },
    lonely_hug: { emotion: "happy", w: 1, h: 3, label: "Warm Hug", icon: "🤗" },
    embarrassed_small: { emotion: "embarrassed", w: 1, h: 2, label: "That Backfired", icon: "😅" },
    luxury_sleep: { emotion: "confident", w: 1, h: 4, label: "Slept Like Royalty", icon: "👑" },
    cool_comfy: { emotion: "happy", w: 1, h: 3, label: "Cool and Comfy", icon: "❄️" },
    burnt: { emotion: "embarrassed", w: 1, h: 2, label: "Burnt the Food", icon: "🔥" },
    level_up: { emotion: "confident", w: 2, h: 3, label: "Getting Better!", icon: "⭐" },
    approached: { emotion: "happy", w: 1, h: 2, label: "Someone Came to Say Hi", icon: "👋🏾" },
    shaded: { emotion: "angry", w: 1, h: 2, label: "Got Shaded", icon: "🙄" },
    new_friend: { emotion: "happy", w: 1, h: 4, label: "Made a New Friend", icon: "🤝🏾" },
    official: { emotion: "flirty", w: 3, h: 10, label: "It's Official!", icon: "💞" },
  };

  // Moodlets that come from doing things.
  const ACTION_MOODLETS = {
    lekki_hangout: "ate_well", lekki_lounge_chat: "laughed", lekki_club_night: "partied", house_party: "partied", street_hang: "laughed",
    chef_tasting: "great_food", styling_session: "fit_approved", buy_wristband: "big_spender", store_network: "flirted",
    eat_amala: "ate_well", fast_food: "ate_well", family_food: "ate_well", coffee: "ate_well", suya: "ate_well", takeaway_jollof: "ate_well",
    fine_dining: "great_food", owambe_eat: "great_food", christmas_lunch: "christmas",
    party: "partied", dance: "danced", beach_party: "partied", owambe_attend: "owambe", concert: "detty_high", vip: "big_spender",
    workout: "workout", tv: "entertained", cinema: "entertained", play_fifa: "laughed",
    work_shift: "focused_work", remote_work: "focused_work", laptop_work: "focused_work",
    photoshoot: "inspired_art", collab: "inspired_art", beach_photos: "inspired_art",
    service: "blessed", pray: "blessed", carol: "blessed",
    salon_gossip: "gossip", owambe_gossip: "gossip", gist_vendor: "gossip",
    new_hair: "complimented", start_drama: "argued", sunset_drinks: "flirted", host: "partied",
    firepit_chill: "laughed", rooftop_party: "partied", chef_dinner: "great_food", wine_tasting: "flirted", movie_night: "entertained", content_shoot: "inspired_art", penthouse_party: "partied", book_penthouse: "big_spender", pool_swim: "fresh", daybed_lounge: "entertained", beach_brunch: "great_food", sundowner: "flirted", vip_cabana: "big_spender", beachclub_party: "partied",
  };

  // What each emotion does. soc: social success; cats: per-category bonus;
  // xp: skill gain multiplier (or per-skill); pay: gig pay; posts: follower gain.
  const EMO_FX = {
    fine: {},
    happy: { soc: 0.06, xp: 1.1 },
    confident: { soc: 0.12, posts: 1.15 },
    flirty: { cats: { romantic: 0.2 } },
    energized: { xpSkill: { fitness: 1.5, dancing: 1.5 } },
    playful: { cats: { funny: 0.2, mischief: 0.1 } },
    focused: { xpSkill: { hustle: 1.5, cooking: 1.2 }, pay: 1.15 },
    inspired: { xpSkill: { photography: 1.5 }, posts: 1.25 },
    tense: { soc: -0.08, cats: { mean: 0.1 } },
    sad: { soc: -0.1, cats: { romantic: -0.2 } },
    angry: { cats: { friendly: -0.25, romantic: -0.25, funny: -0.15, mean: 0.25 } },
    embarrassed: { soc: -0.15 },
    uncomfortable: { soc: -0.1, xp: 0.75 },
    bored: { xp: 0.8 },
  };

  // Where crowds go: place types by time of day (weights).
  function crowdWeights(c, events) {
    const h = c.hh, wd = c.wd, w = {};
    const add = (t, n) => { w[t] = (w[t] || 0) + n; };
    if (h >= 21 || h < 3) add("beachclub", 6);
    else if (h >= 11 && (wd === 0 || wd === 6 || events.includes("beachparty"))) add("beachclub", 5);
    else if (h >= 11) add("beachclub", 3.5);
    if (h >= 22 || h < 4) { add("club", 6); add("lounge", h < 2 || h >= 22 ? 3 : 0); add("suya", 3); if (events.includes("concert")) add("concert", 6); }
    else if (h >= 17) { add("lounge", 3); add("suya", h >= 18 ? 3 : 0); add("restaurant", 3); add("fastfood", 2); add("mall", 2); add("beach", h < 19 ? 2 : 0); add("photo", 1); if (events.includes("concert")) add("concert", 6); if (events.includes("owambe")) add("hall", 5); }
    else if (h >= 7) {
      add("market", 2); add("mall", 2); add("cafe", 2); add("mamaput", 2); add("fastfood", 1); add("busstop", 2); add("salon", 1); add("fashion", 1); add("gym", h < 10 ? 2 : 1); add("photo", 1); add("hustle", 1); add("bdc", 1);
      if (wd >= 1 && wd <= 5) { add("office", 3); add("bank", 1); }
      if (h >= 12 && h < 15) { add("mamaput", 3); add("restaurant", 2); add("fastfood", 2); }
      if (wd === 0 && h < 13) add("church", 8);
      if (events.includes("owambe") && h >= 14) add("hall", 6);
      if (events.includes("beachparty") && h >= 13) add("beach", 6);
      if (wd === 6 || wd === 0) add("beach", 2);
    } else add("busstop", 1);
    return w;
  }

  // Moodlets that come and go with your needs and surroundings (no timer).
  function needMoodlets(s, hasPower, atHome) {
    const n = s.needs, out = [];
    if (n.belle < 10) out.push({ id: "starving", emotion: "uncomfortable", w: 3, label: "Starving", icon: "😵" });
    else if (n.belle < 25) out.push({ id: "hungry", emotion: "uncomfortable", w: 1, label: "Hungry", icon: "🍛" });
    if (n.energy < 8) out.push({ id: "exhausted", emotion: "uncomfortable", w: 3, label: "Exhausted", icon: "🥱" });
    else if (n.energy < 22) out.push({ id: "tired", emotion: "uncomfortable", w: 1, label: "Tired", icon: "😪" });
    if (n.bladder < 15) out.push({ id: "gottago", emotion: "uncomfortable", w: 2, label: "Gotta Go!", icon: "🚽" });
    if (n.hygiene < 25) out.push({ id: "smelly", emotion: "embarrassed", w: 1, label: "Smelly", icon: "🦨" });
    if (n.social < 22) out.push({ id: "lonely", emotion: "sad", w: 1, label: "Lonely", icon: "😶" });
    if (n.vibes < 22) out.push({ id: "bored", emotion: "bored", w: 1, label: "Bored", icon: "😑" });
    if (n.vibes > 80) out.push({ id: "fun", emotion: "happy", w: 1, label: "Having a Blast", icon: "🥳" });
    if (s.naira < 20000 && s.usd < 20) out.push({ id: "broke", emotion: "tense", w: 1, label: "Broke", icon: "💸" });
    if (atHome && !hasPower) out.push({ id: "nolight", emotion: "uncomfortable", w: 1, label: "No Light", icon: "🔌" });
    if (s.exposed) out.push({ id: "exposedfeel", emotion: "embarrassed", w: 1, label: "Everyone Knows", icon: "😱" });
    return out;
  }

  // ------------------------------------------------------------ skills
  const SKILLS = {
    charisma: { name: "Charisma", icon: "🗣️", desc: "Better conversations, flirting and favours." },
    cooking: { name: "Cooking", icon: "🍳", desc: "Better meals and party jollof." },
    dancing: { name: "Dancing", icon: "💃🏾", desc: "More fun and clout on the dance floor." },
    fitness: { name: "Fitness", icon: "💪🏾", desc: "Energy drains slower." },
    photography: { name: "Photography", icon: "📸", desc: "More followers from every post." },
    hustle: { name: "Hustle", icon: "💼", desc: "Gigs and deals pay more." },
  };
  const SKILL_OF = {
    lekki_lounge_chat: "charisma", lekki_club_night: "dancing", house_party: "dancing", neighbour_gist: "charisma",
    store_network: "charisma", styling_session: "photography",
    cook: "cooking", takeaway_jollof: null,
    party: "dancing", dance: "dancing", owambe_attend: "dancing", beach_party: "dancing", dance_home: "dancing", concert: "dancing",
    workout: "fitness", chores: "fitness", pool_swim: "fitness", beachclub_party: "dancing", rooftop_party: "dancing", firepit_chill: "charisma", content_shoot: "photography", penthouse_party: "charisma", wine_tasting: "charisma",
    post_home: "photography", club_photos: "photography", beach_photos: "photography", photoshoot: "photography", collab: "photography",
    work_shift: "hustle", sell_phones: "hustle", delivery: "hustle", small_chops: "hustle", conductor_gig: "hustle", event_setup: "hustle", concert_photo_gig: "photography", resell_tickets: "hustle", broker: "hustle", remote_work: "hustle", laptop_work: "hustle",
    gist_vendor: "charisma", salon_gossip: "charisma", owambe_network: "charisma", club_network: "charisma", lounge_network: "charisma", lobby_network: "charisma", gym_network: "charisma", practice_speech: "charisma", restaurant_meet: "charisma", cafe_meet: "charisma", mall_meet: "charisma", office_gist: "charisma",
  };
  const skillLevel = (xp) => Math.min(10, Math.floor(Math.sqrt((xp || 0) / 12)));

  // ------------------------------------------------------------ extra actions
  // Added to the action list: hygiene, bladder, drinks, home upgrades, etc.
  const EXTRA_ACTIONS = {
    shower: { name: "Take a shower", icon: "🚿", mins: 20, fx: { hygiene: 100 }, moodlet: "fresh", pose: "hide" },
    toilet: { name: "Use the toilet", icon: "🚽", mins: 6, fx: { bladder: 100 }, pose: "hide" },
    drinks: { name: "Order drinks", icon: "🍹", mins: 25, cost: 6000, fx: { vibes: 8, social: 6, bladder: -18 }, pose: "drink" },
    request_song: { name: "Request a song", icon: "🎧", mins: 10, cost: 5000, fx: { vibes: 6 }, moodlet: "laughed" },
    spray_money: { name: "Spray money on the celebrants", icon: "💸", mins: 15, cost: 20000, fx: { vibes: 14 }, rep: 4, clout: 3, event: "owambe", moodlet: "money_rain", pose: "dance" },
    play_fifa: { name: "Play FIFA", icon: "🎮", mins: 90, fx: { vibes: 22, energy: -4 }, needsPower: true, needsFurniture: ["tv", 2], moodlet: "laughed", pose: "sit" },
    dance_home: { name: "Dance in your room", icon: "🔊", mins: 45, fx: { vibes: 12, energy: -6 }, needsFurniture: ["sound", 0], pose: "dance" },
    practice_speech: { name: "Practise your charm in the mirror", icon: "🪞", mins: 30, fx: { vibes: 2 }, needsFurniture: ["mirror", 1] },
    snack: { name: "Make Indomie and egg", icon: "🍜", mins: 20, cost: 1500, fx: { belle: 28 }, food: true, cheap: true, pose: "cook" },
    office_gist: { name: "Gist at the water cooler", icon: "🚰", mins: 20, fx: { social: 15 }, conn: 2 },
    sit_chill: { name: "Sit and relax", icon: "🛋️", mins: 30, fx: { energy: 6, vibes: 3 }, pose: "sit" },
    wardrobe: { name: "Change outfit", icon: "👗", mins: 0, special: "wardrobe" },
  };

  // How your Sim looks while doing each action.
  const POSES = {
    lekki_hangout: "eat", lekki_lounge_chat: "talk", lekki_club_night: "dance", house_party: "dance", street_hang: "talk", neighbour_gist: "talk",
    chef_tasting: "eat", styling_session: "stand", store_network: "talk", buy_wristband: "stand",
    eat_amala: "eat", fine_dining: "eat", fast_food: "eat", coffee: "eat", family_food: "eat", owambe_eat: "eat", suya: "eat", christmas_lunch: "eat",
    sleep: "lie", nap: "lie", tv: "sit", laptop_work: "sit", remote_work: "sit", work_shift: "sit", service: "sit", sunset_drinks: "sit", vip: "sit", new_hair: "sit", salon_gossip: "sit", pool_day: "lie", chill: "sit", visit_family: "sit", lobby_network: "sit", cinema: "hide", picnic: "sit",
    post_home: "phone", club_photos: "phone", beach_photos: "phone", photoshoot: "phone", collab: "phone",
    pray: "pray", carol: "sing", party: "dance", dance: "dance", owambe_attend: "dance", beach_party: "dance", concert: "dance",
    workout: "workout", chores: "workout", cook: "cook", takeaway_jollof: "stand",
    firepit_chill: "sit", rooftop_party: "dance", chef_dinner: "eat", wine_tasting: "drink", movie_night: "sit", content_shoot: "phone", penthouse_party: "dance", pool_swim: "swim", daybed_lounge: "lie", beach_brunch: "eat", sundowner: "drink", vip_cabana: "sit", beachclub_party: "dance",
  };

  // ------------------------------------------------------------ social interactions
  // cat: friendly, funny, romantic, mean, mischief, naija, secret.
  // base: success chance before relationship, charisma and mood.
  const SOCIALS = {
    greet: { cat: "friendly", name: "Greet", icon: "👋🏾", mins: 3, base: 0.95, ok: { rel: 2, social: 6 }, bubble: "👋🏾" },
    gist: { cat: "friendly", name: "Gist", icon: "💬", mins: 15, base: 0.85, ok: { rel: 6, social: 16, dig: 6 }, fail: { rel: -1, social: 6 }, bubble: "💬" },
    compliment_fit: { cat: "friendly", name: "Compliment their outfit", icon: "🌟", mins: 6, base: 0.8, ok: { rel: 5, social: 8 }, fail: { rel: -1 }, bubble: "🌟" },
    ask_december: { cat: "friendly", name: "Ask about their December", icon: "🕵🏾", mins: 20, base: 0.7, ok: { rel: 2, social: 12, dig: 28 }, fail: { rel: -4, social: 6, dig: 8 }, bubble: "❓", needsSecret: true },
    share_food: { cat: "friendly", name: "Share your food", icon: "🍢", mins: 10, base: 0.95, ok: { rel: 10, social: 10 }, bubble: "🍢", needsItemKind: "food" },
    give_gift: { cat: "friendly", name: "Give a gift", icon: "🎁", mins: 6, base: 0.97, ok: { rel: 12, social: 6, romance: 4 }, bubble: "🎁", needsItemKind: "gift" },
    hug: { cat: "friendly", name: "Hug", icon: "🤗", mins: 3, base: 0.75, ok: { rel: 6, social: 10, moodlet: "lonely_hug" }, fail: { rel: -5, moodlet: "rejected" }, bubble: "🤗", minRel: 55 },
    joke: { cat: "funny", name: "Tell a Naija joke", icon: "😂", mins: 8, base: 0.65, ok: { rel: 6, social: 12, moodlet: "laughed" }, fail: { rel: -3, social: 4 }, bubble: "😂" },
    imitate_ijgb: { cat: "funny", name: "Do your best IJGB accent", icon: "🇬🇧", mins: 8, base: 0.6, ok: { rel: 6, social: 10, moodlet: "laughed" }, fail: { rel: -4 }, bubble: "🤣" },
    flirt: { cat: "romantic", name: "Flirt", icon: "😏", mins: 8, base: 0.5, ok: { romance: 10, rel: 2, social: 10, moodlet: "flirted" }, fail: { romance: -3, rel: -3, moodlet: "rejected" }, bubble: "💕", romantic: true, minRel: 25 },
    compliment_looks: { cat: "romantic", name: "Compliment their looks", icon: "😍", mins: 6, base: 0.6, ok: { romance: 8, social: 8 }, fail: { romance: -2, rel: -2 }, bubble: "😍", romantic: true, minRel: 30 },
    ask_date: { cat: "romantic", name: "Ask on a date", icon: "🌇", mins: 6, base: 0.55, ok: { romance: 6, plan: "date" }, fail: { romance: -4, moodlet: "rejected" }, bubble: "🌇", romantic: true, minRomance: 25 },
    kiss: { cat: "romantic", name: "Kiss", icon: "💋", mins: 4, base: 0.6, ok: { romance: 14, social: 10, moodlet: "butterflies" }, fail: { romance: -6, rel: -4, moodlet: "rejected" }, bubble: "💋", romantic: true, minRomance: 55 },
    make_official: { cat: "romantic", name: "Ask to make it official", icon: "💞", mins: 10, base: 0.5, ok: { romance: 15, partner: true, moodlet: "butterflies" }, fail: { romance: -8, moodlet: "rejected" }, bubble: "💞", romantic: true, minRomance: 60, notPartner: true },
    insult: { cat: "mean", name: "Insult", icon: "🗯️", mins: 5, base: 0.85, ok: { rel: -14, moodlet: "shade", them: "angry" }, fail: { rel: -6, moodlet: "insulted" }, bubble: "🗯️" },
    argue: { cat: "mean", name: "Argue", icon: "😤", mins: 15, base: 0.5, ok: { rel: -8, rep: 1 }, fail: { rel: -10, moodlet: "argued" }, bubble: "😤" },
    throw_shade: { cat: "mean", name: "Throw shade", icon: "💅🏾", mins: 5, base: 0.7, ok: { rel: -6, clout: 2, moodlet: "shade" }, fail: { rel: -4, moodlet: "embarrassed_small" }, bubble: "💅🏾" },
    gossip: { cat: "mischief", name: "Gossip about someone", icon: "🤫", mins: 15, base: 0.75, ok: { rel: 4, social: 10, gossip: 1, rumor: true, moodlet: "gossip" }, fail: { rel: -3, rep: -2 }, bubble: "🤫" },
    investigate: { cat: "mischief", name: "Ask around about them", icon: "🔎", mins: 25, base: 0.8, ok: { dig: 32, rel: -2 }, fail: { dig: 10, rel: -6 }, bubble: "🔎", needsSecret: true },
    prank: { cat: "mischief", name: "Prank them", icon: "🃏", mins: 8, base: 0.5, ok: { rel: 4, moodlet: "laughed" }, fail: { rel: -8 }, bubble: "🃏" },
    spray: { cat: "naija", name: "Spray them money (₦10k)", icon: "💸", mins: 5, base: 0.98, cost: 10000, ok: { rel: 8, clout: 2, moodlet: "money_rain" }, bubble: "💸" },
    beg: { cat: "naija", name: "Beg for small money", icon: "🙏🏾", mins: 6, base: 0.45, ok: { naira: 15000, rel: -2, rep: -1 }, fail: { rel: -5, rep: -2, moodlet: "rejected" }, bubble: "🙏🏾", minRel: 50 },
    ask_favour: { cat: "naija", name: "Ask them to link you up", icon: "🔗", mins: 10, base: 0.75, ok: { favour: true }, fail: { rel: -2 }, bubble: "🔗", minRel: 60, once: true },
    follow_ig: { cat: "naija", name: "Swap Instagrams", icon: "📱", mins: 4, base: 0.9, ok: { rel: 4, followers: 15 }, bubble: "📱" },
    explain_japa: { cat: "naija", name: "Explain how to japa", icon: "📄", mins: 30, base: 0.9, ok: { rel: 10, rep: 4, japa: true }, bubble: "✈️", persona: ["japa"], once: true },
    keep: { cat: "secret", name: "\"Your secret is safe with me\"", icon: "🤐", mins: 10, secretAction: "keep" },
    befriend: { cat: "secret", name: "\"I know. I'm on your side.\"", icon: "🤝🏾", mins: 15, secretAction: "befriend" },
    tell: { cat: "secret", name: "Tell someone else", icon: "🗣️", mins: 10, secretAction: "tell" },
    trade: { cat: "secret", name: "Trade it to Mama Nkechi", icon: "🔁", mins: 10, secretAction: "trade" },
    expose: { cat: "secret", name: "Expose them", icon: "📣", mins: 10, secretAction: "expose" },
    blackmail: { cat: "secret", name: "Demand money to keep quiet", icon: "💰", mins: 10, secretAction: "blackmail" },
  };
  const SOCIAL_CATS = {
    friendly: { name: "Friendly", icon: "😊" }, funny: { name: "Funny", icon: "😂" }, romantic: { name: "Romantic", icon: "💕" },
    mean: { name: "Mean", icon: "😠" }, mischief: { name: "Mischief", icon: "🤫" }, naija: { name: "Naija", icon: "🇳🇬" }, secret: { name: "Their Secret", icon: "🕵🏾" },
  };
  const REPLIES = {
    ok: ["\"Haha, you too much!\"", "\"Na so o!\"", "\"I like you, you know that?\"", "\"Exactly what I was thinking.\"", "\"Ehen! Tell me more.\""],
    fail: ["\"Hmm. Okay.\"", "\"Why would you say that?\"", "\"Abeg, not today.\"", "\"Is that how you talk to everybody?\"", "\"I'm going to pretend I didn't hear that.\""],
    romantic_ok: ["\"Stop it 🙈… actually don't.\"", "\"You're trouble, you know that?\"", "\"Smooth. Very smooth.\""],
    romantic_fail: ["\"Haha. No.\"", "\"Let's keep it friendly, abeg.\""],
    mean_ok: ["\"You have mind o!\"", "\"Wow. Okay.\""],
  };

  // ------------------------------------------------------------ home furniture (buy mode)
  const FURNITURE = {
    bed: { name: "Bed", icon: "🛏️", tiers: [
      { name: "Foam mattress", price: 0, note: "It's a bed. Technically." },
      { name: "Orthopedic bed", price: 180000, note: "Sleep restores energy 30% faster." },
      { name: "King-size luxury bed", price: 450000, note: "Sleep 50% faster and wake up Confident." },
    ] },
    tv: { name: "TV", icon: "📺", tiers: [
      { name: "Small TV", price: 0, note: "Nollywood on a 24-inch." },
      { name: "55\" smart TV", price: 250000, note: "TV is twice as fun." },
      { name: "TV + PS5 setup", price: 520000, note: "Unlocks Play FIFA. Very fun." },
    ] },
    stove: { name: "Kitchen", icon: "🍳", tiers: [
      { name: "Kerosene stove", price: 0, note: "Smells like childhood." },
      { name: "Gas cooker", price: 150000, note: "Cooking is faster and tastier." },
      { name: "Chef's kitchen", price: 380000, note: "Cooking skill grows twice as fast." },
    ] },
    sound: { name: "Sound", icon: "🔊", tiers: [
      { name: "Bluetooth speaker", price: 60000, note: "Unlocks Dance in your room." },
      { name: "Big sound system", price: 300000, note: "House parties are legendary." },
    ] },
    power: { name: "Power", icon: "🔋", tiers: [
      { name: "Small generator", price: 180000, note: "Light whenever NEPA takes it (noisy)." },
      { name: "Inverter + solar", price: 900000, note: "Silent, constant power at home." },
    ] },
    cooling: { name: "Cooling", icon: "❄️", tiers: [
      { name: "Standing fan", price: 35000, note: "Better sleep when there's light." },
      { name: "Split AC", price: 420000, note: "Cool, comfortable, Confident sleep." },
    ] },
    mirror: { name: "Mirror", icon: "🪞", tiers: [
      { name: "Small mirror", price: 0, note: "Change outfits." },
      { name: "Full-length mirror", price: 40000, note: "Unlocks practising your charm (Charisma)." },
    ] },
    decor: { name: "Decor", icon: "🖼️", tiers: [
      { name: "Ankara wall art", price: 70000, note: "Your flat feels like home. More fun at home." },
      { name: "Ring light + backdrop", price: 45000, note: "Posts from home get more followers." },
    ] },
  };
  // Starting home: -1 means you don't own one yet.
  const START_HOME = { bed: 0, tv: 0, stove: 0, sound: -1, power: -1, cooling: -1, mirror: 0, decor: -1 };

  // ------------------------------------------------------------ interiors
  // Rooms are w × d, centred on 0,0, entered from the south (front) edge.
  // Objects: k = kind (how it's drawn), x/z position, r = rotation,
  // act = actions it offers, seats = where people sit, stand or dance.
  const T = (k, x, z, act, extra = {}) => ({ k, x, z, act: act || [], ...extra });
  const tableSet = (x, z, act, label = "Table") => T("table", x, z, act, { label, icon: "🍽️", seats: [[x - 1.3, z, Math.PI / 2, "sit"], [x + 1.3, z, -Math.PI / 2, "sit"], [x, z - 1.3, 0, "sit"], [x, z + 1.3, Math.PI, "sit"]] });
  const INTERIORS = {
    home: { w: 12, d: 10, floor: ["#e9dcc5", "#d9c7a8"], wall: "#f0d9b5", light: 0xffe2b8, objects: [
      T("bed", -3.8, -2.9, ["sleep", "nap"], { label: "Bed", icon: "🛏️", furniture: "bed", seats: [[-3.8, -3.0, 0, "lie"]] }),
      T("wardrobe", -5.4, 1.6, ["wardrobe", "practice_speech"], { label: "Mirror & wardrobe", icon: "🪞", furniture: "mirror" }),
      T("desk", 1.6, -4.2, ["post_home", "laptop_work"], { label: "Desk", icon: "💻", furniture: "decor", seats: [[1.6, -3.2, Math.PI, "sit"]] }),
      T("tv", 4.4, -1.4, ["tv", "play_fifa"], { label: "TV", icon: "📺", furniture: "tv", seats: [[4.4, 1.4, Math.PI, "sit"]] }),
      T("stove", 4.8, 2.8, ["cook", "snack"], { label: "Kitchen", icon: "🍳", furniture: "stove" }),
      T("fridge", 2.6, 4.2, ["snack"], { label: "Cooler", icon: "🧊" }),
      T("table", -1.2, 2.2, ["host"], { label: "Dining table", icon: "🍽️", seats: [[-2.4, 2.2, Math.PI / 2, "sit"], [0, 2.2, -Math.PI / 2, "sit"]] }),
      T("shower", -5.0, 4.0, ["shower", "toilet"], { label: "Bathroom", icon: "🚿" }),
      T("speaker", 0, -4.3, ["dance_home", "gen"], { label: "Speaker & power", icon: "🔊", furniture: "sound" }),
    ] },
    family: { w: 16, d: 12, floor: ["#e8d5b5", "#d7c09a"], wall: "#f3dfbf", light: 0xffe4c2, objects: [
      tableSet(-3, -1, ["family_food", "christmas_lunch"], "Dining table"),
      T("sofa", 4, -3.5, ["visit_family", "ask_daddy", "confess", "crossover"], { label: "Living room", icon: "🛋️", seats: [[3, -3.2, 0, "sit"], [5, -3.2, 0, "sit"], [4, -1.2, Math.PI, "sit"]] }),
      T("tv", 4, -5.3, [], { label: "TV" }),
      T("broom", -6.5, 4, ["chores"], { label: "Chores corner", icon: "🧹" }),
      T("shower", 6.5, 4, ["shower", "toilet"], { label: "Bathroom", icon: "🚿" }),
      T("plant", -7, -5, []),
    ] },
    mamaput: { w: 14, d: 10, floor: ["#f1e3c8", "#e2cfa8"], wall: "#f6b26b", light: 0xffd9a0, objects: [
      T("pots", 0, -3.8, ["takeaway_jollof", "gist_vendor"], { label: "Food counter", icon: "🍲", w: 6, vendorSpot: [0, -2.6, Math.PI] }),
      tableSet(-3.6, 1, ["eat_amala"], "Table"), tableSet(3.6, 1, ["eat_amala"], "Table"),
      T("toilet", 6, -4, ["toilet"], { label: "Toilet", icon: "🚽" }),
    ] },
    fastfood: { w: 14, d: 10, floor: ["#fde2e2", "#f8caca"], wall: "#ffcdd2", light: 0xfff1f1, objects: [
      T("counter", 0, -3.8, ["fast_food", "takeaway_chicken"], { label: "Order counter", icon: "🍗", w: 7, vendorSpot: [0, -4.6, 0] }),
      tableSet(-3.8, 1.2, ["fast_food"]), tableSet(3.8, 1.2, ["fast_food"]),
      T("toilet", 6, -4, ["toilet"], { label: "Toilet", icon: "🚽" }),
    ] },
    restaurant: { w: 16, d: 12, floor: ["#3e2c23", "#4a362b"], wall: "#fff8e1", light: 0xffe6b8, objects: [
      tableSet(-4.5, -2, ["chef_tasting", "fine_dining", "restaurant_meet"]), tableSet(0, -2, ["fine_dining", "restaurant_meet"]), tableSet(4.5, -2, ["chef_tasting", "fine_dining"]),
      tableSet(-2.2, 2.8, ["fine_dining", "restaurant_meet"]), tableSet(2.2, 2.8, ["fine_dining"]),
      T("bar", 6.8, 3.5, ["drinks"], { label: "Bar", icon: "🍷", w: 1.2, d: 4, seats: [[5.8, 2.4, Math.PI / 2, "sit"], [5.8, 4.4, Math.PI / 2, "sit"]] }),
      T("toilet", -7, 4.6, ["toilet"], { label: "Toilet", icon: "🚽" }),
    ] },
    cafe: { w: 14, d: 10, floor: ["#efebe9", "#d7ccc8"], wall: "#efebe9", light: 0xfff3e0, objects: [
      T("counter", -3, -3.8, ["coffee"], { label: "Coffee bar", icon: "☕", w: 6, vendorSpot: [-3, -4.6, 0] }),
      tableSet(-3.5, 1.4, ["coffee", "laptop_work", "cafe_meet"]), tableSet(2, 1.4, ["coffee", "laptop_work"]),
      T("sofa", 4.8, -3.4, ["cafe_meet", "sit_chill"], { label: "Sofa corner", icon: "🛋️", seats: [[4, -3.1, 0, "sit"], [5.6, -3.1, 0, "sit"]] }),
    ] },
    club: { w: 18, d: 14, floor: ["#1d1b2e", "#2a2642"], wall: "#14121f", light: 0xff4fd8, dark: true, objects: [
      T("dancefloor", 0, -0.5, ["party", "dance", "start_drama", "crossover"], { label: "Dance floor", icon: "🪩", w: 8, d: 6, seats: [[-2, -2, 0, "dance"], [0, -1.8, 0, "dance"], [2, -2, 0, "dance"], [-2.4, 0.6, 0, "dance"], [0.2, 0.8, 0, "dance"], [2.4, 0.4, 0, "dance"], [-1, 2, 0, "dance"], [1.4, 2.1, 0, "dance"]] }),
      T("bar", 7, 0, ["drinks", "club_meet"], { label: "Bar", icon: "🍸", w: 1.4, d: 8, seats: [[5.8, -2, Math.PI / 2, "drink"], [5.8, 0, Math.PI / 2, "drink"], [5.8, 2, Math.PI / 2, "drink"]], vendorSpot: [7.9, 0, -Math.PI / 2] }),
      T("dj", 0, -5.6, ["request_song"], { label: "DJ booth", icon: "🎧", vendorSpot: [0, -6.2, 0] }),
      T("couch", -6.6, -3.5, ["vip", "club_network"], { label: "VIP section", icon: "🍾", seats: [[-7.2, -2.6, Math.PI / 2, "sit"], [-7.2, -4.4, Math.PI / 2, "sit"], [-5.6, -5.4, 0, "sit"]] }),
      T("photowall", -6.6, 3.8, ["club_photos"], { label: "Photo wall", icon: "📸" }),
      T("toilet", 7.6, 6, ["toilet"], { label: "Toilets", icon: "🚽" }),
    ] },
    // The IJGB luxury shortlet penthouse: double-height glass, glossy white floors,
    // open-plan kitchen and wine wall, floating stairs over an indoor garden.
    // Neon Palm, Lekki: restaurant up front, lounge sofas, club floor at the back.
    lekkilounge: { w: 20, d: 14, floor: ["#231a33", "#2c2140"], wall: "#1a1426", light: 0xff6ad5, dark: true, objects: [
      tableSet(-6.5, 3.2, ["lekki_hangout", "lekki_lounge_chat"]), tableSet(-2.5, 3.2, ["lekki_hangout"]), tableSet(-6.5, -0.6, ["lekki_hangout", "lekki_lounge_chat"]),
      T("dancefloor", 3.2, -1.6, ["lekki_club_night", "dance"], { label: "Club floor", icon: "💃🏾", w: 7, d: 5, seats: [[1.4, -3, 0, "dance"], [3.2, -2.6, 0, "dance"], [5, -3, 0, "dance"], [2, -0.6, 0, "dance"], [4.4, -0.4, 0, "dance"], [3.2, 0.4, 0, "dance"]] }),
      T("dj", 3.2, -5.8, ["request_song"], { label: "DJ booth", icon: "🎧", vendorSpot: [3.2, -6.4, 0] }),
      T("bar", 8.6, 1.5, ["drinks", "lekki_lounge_chat"], { label: "Neon bar", icon: "🍸", w: 1.4, d: 6, seats: [[7.4, -0.4, Math.PI / 2, "drink"], [7.4, 1.5, Math.PI / 2, "drink"], [7.4, 3.4, Math.PI / 2, "drink"]], vendorSpot: [9.4, 1.5, -Math.PI / 2] }),
      T("couch", -8.6, -4.4, ["lekki_lounge_chat", "sit_chill"], { label: "Lounge corner", icon: "🛋️", seats: [[-9.2, -3.6, Math.PI / 2, "sit"], [-9.2, -5.2, Math.PI / 2, "sit"]] }),
      T("photowall", -3.6, -5.8, ["club_photos"], { label: "Neon photo wall", icon: "📸" }),
      T("plant", -9.2, 5.8, [], {}), T("plant", 9.2, 5.8, [], {}),
      T("toilet", 8.8, -5.4, ["toilet"], { label: "Toilets", icon: "🚽" }),
    ] },
    // Designer concept store: numbered drops under glass, a stylist and a velvet-roped launch lounge.
    conceptstore: { w: 16, d: 11, floor: ["#efe9df", "#e6dfd3"], wall: "#f7f3ec", light: 0xfff4e2, objects: [
      T("vitrine", -5.4, -3.8, ["browse_drop"], { label: "Numbered drop", icon: "💎" }),
      T("vitrine", -2.2, -3.8, ["browse_drop"], { label: "Numbered drop", icon: "💎" }),
      T("vitrine", 1, -3.8, ["browse_drop"], { label: "Numbered drop", icon: "💎" }),
      T("counter", 5.2, -3.6, ["buy_wristband"], { label: "Concierge desk", icon: "🎫", w: 3.4, vendorSpot: [5.2, -4.5, 0] }),
      T("rack", -4.6, 1.2, ["browse_drop"], { label: "Limited rail", icon: "🧥", w: 4 }),
      T("mirror", 6.9, 1.4, ["styling_session", "wardrobe"], { label: "Stylist's mirror", icon: "🪞" }),
      T("velvet", 1.6, 0.6, ["store_network"], { label: "Velvet rope", icon: "🥂", w: 4, d: 0.4 }),
      T("sofa", 1.6, 2.8, ["store_network", "sit_chill"], { label: "VIP launch lounge", icon: "🥂", seats: [[0.8, 2.9, 0, "sit"], [2.4, 2.9, 0, "sit"]] }),
      T("plant", -7, 4.4, [], {}), T("plant", 7, -4.6, [], {}),
    ] },
    shortlet: { w: 26, d: 18, glass: true, height: 5.2, floor: ["#f6f7f9", "#eef0f3"], wall: "#f7f7f5", light: 0xffffff, objects: [
      T("kitchen", 6.5, -7.9, ["chef_dinner", "cook", "snack"], { label: "Chef's kitchen", icon: "👨🏾‍🍳", w: 9, d: 1.2, vendorSpot: [6.5, -6.9, Math.PI] }),
      T("island", 6.5, -4.4, ["chef_dinner", "wine_tasting"], { label: "Kitchen island", icon: "🍸", w: 5, d: 1.4, seats: [[4.9, -3.2, Math.PI, "sit"], [6.5, -3.2, Math.PI, "sit"], [8.1, -3.2, Math.PI, "sit"]] }),
      T("dining", 6.5, 0.6, ["chef_dinner", "penthouse_party"], { label: "Dining table", icon: "🍽️", w: 6, d: 1.6, seats: [[4.2, -0.6, 0, "sit"], [6.5, -0.6, 0, "sit"], [8.8, -0.6, 0, "sit"], [4.2, 1.8, Math.PI, "sit"], [6.5, 1.8, Math.PI, "sit"], [8.8, 1.8, Math.PI, "sit"]] }),
      T("winewall", -12, -2.8, ["wine_tasting"], { label: "Wine wall", icon: "🍷", w: 1.1, d: 4.6 }),
      T("stairs", -7.6, -7.2, ["content_shoot"], { label: "Floating staircase", icon: "🤳🏾", w: 5, d: 2.6 }),
      T("tv", -2.6, -4.6, ["movie_night", "tv"], { label: "Cinema screen", icon: "🎬", w: 3, d: 0.8 }),
      T("sectional", -2.6, 0.4, ["movie_night", "sit_chill", "penthouse_party"], { label: "Sectional sofa", icon: "🛋️", w: 6, d: 3, seats: [[-3.6, 0.6, Math.PI, "sit"], [-2.3, 0.6, Math.PI, "sit"], [-1.0, 0.6, Math.PI, "sit"], [0.0, 0.6, Math.PI, "sit"], [-4.7, -0.5, Math.PI / 2, "sit"]] }),
      T("bedlux", 9.6, 6.2, ["sleep", "nap", "wardrobe"], { label: "Master bed", icon: "🛏️", seats: [[9.6, 6.3, 0, "lie"]] }),
      T("curvechairs", 3.6, 6.6, ["sit_chill", "content_shoot"], { label: "Lounge chairs", icon: "🛋️", w: 3.6, d: 1.6, seats: [[2.6, 6.4, Math.PI, "sit"], [4.6, 6.4, Math.PI, "sit"]] }),
      T("concierge", -1.6, 7.6, ["book_penthouse"], { label: "Concierge tablet", icon: "🔑" }),
      T("shower", -11.6, 7.4, ["shower", "toilet"], { label: "Spa bathroom", icon: "🛁" }),
    ] },
    // High-octane rooftop club and DJ hub, open to the city skyline.
    lounge: { w: 26, d: 18, open: true, setting: "rooftop", floor: ["#5c6168", "#52575e"], wall: "#6b7078", light: 0xffc46b, stringLights: true, objects: [
      T("djstage", 0, -7.4, ["dj_set", "request_song"], { label: "DJ hub", icon: "🎛️", w: 8, d: 2.6, vendorSpot: [0, -7.6, 0] }),
      T("dancedeck", 0, -3.6, ["rooftop_party", "dance", "crossover"], { label: "Dance floor", icon: "💃🏾", w: 9, d: 4, seats: [[-3, -4, 0, "dance"], [-1, -3.4, 0, "dance"], [1, -4.1, 0, "dance"], [3, -3.5, 0, "dance"], [-2, -2.4, 0, "dance"], [2, -2.5, 0, "dance"]] }),
      T("firepit", -6.5, 3.4, ["firepit_chill", "sit_chill"], { label: "Fire pit lounge", icon: "🔥", w: 4.4, d: 1.2, seats: [[-8, 1.9, 0, "sit"], [-6.5, 1.9, 0, "sit"], [-5, 1.9, 0, "sit"], [-8, 4.9, Math.PI, "sit"], [-6.5, 4.9, Math.PI, "sit"], [-5, 4.9, Math.PI, "sit"]] }),
      T("firepit", 5.5, 4.6, ["firepit_chill", "sunset_drinks", "lounge_network"], { label: "Fire pit lounge", icon: "🔥", w: 4.4, d: 1.2, seats: [[4, 3.1, 0, "sit"], [5.5, 3.1, 0, "sit"], [7, 3.1, 0, "sit"], [4, 6.1, Math.PI, "sit"], [5.5, 6.1, Math.PI, "sit"], [7, 6.1, Math.PI, "sit"]] }),
      T("shedbar", 10.5, -4, ["drinks", "sunset_drinks"], { label: "Shed bar", icon: "🍸", w: 3.6, d: 1.2, seats: [[9.6, -2.8, Math.PI, "drink"], [11.4, -2.8, Math.PI, "drink"]], vendorSpot: [10.5, -5.3, 0] }),
      T("cabana", -10.5, -4.5, ["vip_cabana", "lounge_network"], { label: "Blue-lit cabana", icon: "🍾", tint: 0x5b6cff, seats: [[-10.9, -4.6, Math.PI / 2, "sit"], [-10.1, -4.0, Math.PI / 2, "sit"]] }),
      T("cabana", -10.5, 0.5, ["vip_cabana", "lounge_network"], { label: "Blue-lit cabana", icon: "🍾", tint: 0xb04bff, seats: [[-10.9, 0.4, Math.PI / 2, "sit"], [-10.1, 1.0, Math.PI / 2, "sit"]] }),
      T("pillars", 9.5, 4.4, ["club_photos"], { label: "Light pillars", icon: "📸", w: 3.4, d: 3.4 }),
      T("toilet", 11.6, 7.4, ["toilet"], { label: "Toilets", icon: "🚽" }),
    ] },
    mall: { w: 20, d: 14, floor: ["#f5f5f5", "#e0e0e0"], wall: "#e1f5fe", light: 0xffffff, objects: [
      T("shop", -7, -5, ["buy_gifts"], { label: "Gift shop", icon: "🎁", w: 4.5, vendorSpot: [-7, -5.8, 0] }),
      T("kiosk", -1, -5, ["buy_ticket"], { label: "Detty Fest tickets", icon: "🎟️", w: 3, vendorSpot: [-1, -5.8, 0] }),
      T("cinema", 5.5, -5.6, ["cinema"], { label: "Cinema", icon: "🎬", w: 6 }),
      T("kiosk", 7.6, 1.5, ["mall_bdc"], { label: "Exchange desk", icon: "💱", w: 2.5, vendorSpot: [8.6, 1.5, -Math.PI / 2] }),
      T("bench", -3, 2, ["mall_meet", "sit_chill"], { label: "Benches", icon: "🪑", seats: [[-3.8, 2, 0, "sit"], [-2.2, 2, 0, "sit"]] }),
      T("bench", 2, 2, ["mall_meet", "sit_chill"], { label: "Benches", icon: "🪑", seats: [[1.2, 2, 0, "sit"], [2.8, 2, 0, "sit"]] }),
      T("xtree", -7.6, 3.5, []),
      T("toilet", 8.6, 5.6, ["toilet"], { label: "Toilets", icon: "🚽" }),
    ] },
    fashion: { w: 14, d: 10, floor: ["#fce4ec", "#f8bbd0"], wall: "#fce4ec", light: 0xfff0f6, objects: [
      T("rack", -4.5, -3.6, ["buy_outfit"], { label: "Clothing racks", icon: "👗", w: 5 }),
      T("rack", 1.5, -3.6, ["buy_outfit"], { label: "New arrivals", icon: "🛍️", w: 5 }),
      T("counter", 5, 1, ["buy_accessory"], { label: "Shoes, bags & jewellery", icon: "👜", w: 1.4, d: 4, vendorSpot: [5.8, 1, -Math.PI / 2] }),
      T("desk", -4.5, 2, ["tailor"], { label: "Tailor", icon: "🪡", vendorSpot: [-4.5, 1, Math.PI] }),
      T("mirror", 0, 3.8, ["wardrobe"], { label: "Fitting mirror", icon: "🪞" }),
    ] },
    salon: { w: 12, d: 10, floor: ["#ffffff", "#f3e5f5"], wall: "#f8c8dc", light: 0xfff0f6, objects: [
      T("salonchair", -3, -3, ["new_hair"], { label: "Stylist chair", icon: "💇🏾", seats: [[-3, -3, Math.PI, "sit"]], vendorSpot: [-3, -2, Math.PI] }),
      T("salonchair", 1, -3, ["new_hair"], { label: "Stylist chair", icon: "💇🏾", seats: [[1, -3, Math.PI, "sit"]] }),
      T("dryer", 4, 1.5, ["salon_gossip"], { label: "Dryers", icon: "🤫", seats: [[4, 1.5, -Math.PI / 2, "sit"], [4, 3.2, -Math.PI / 2, "sit"]] }),
      T("bench", -3, 2.5, ["sit_chill"], { label: "Waiting bench", icon: "🪑", seats: [[-3.8, 2.5, Math.PI, "sit"], [-2.2, 2.5, Math.PI, "sit"]] }),
    ] },
    gym: { w: 16, d: 12, floor: ["#cfd8dc", "#b0bec5"], wall: "#cfd8dc", light: 0xffffff, objects: [
      T("treadmill", -5, -3.5, ["workout"], { label: "Treadmills", icon: "🏃🏾", seats: [[-5, -3.5, Math.PI, "workout"]] }),
      T("treadmill", -2, -3.5, ["workout"], { label: "Treadmills", icon: "🏃🏾", seats: [[-2, -3.5, Math.PI, "workout"]] }),
      T("weights", 3, -3.2, ["workout"], { label: "Weights", icon: "🏋🏾", seats: [[3, -2.4, Math.PI, "workout"], [5, -2.4, Math.PI, "workout"]] }),
      T("bench", 0, 2.5, ["gym_network", "sit_chill"], { label: "Bench", icon: "💪🏾", seats: [[-0.8, 2.5, Math.PI, "sit"], [0.8, 2.5, Math.PI, "sit"]] }),
      T("shower", 6.5, 4, ["shower", "toilet"], { label: "Showers", icon: "🚿" }),
    ] },
    office: { w: 16, d: 12, floor: ["#eceff1", "#cfd8dc"], wall: "#b0c4de", light: 0xffffff, objects: [
      T("desk", -5, -3, ["work_shift", "remote_work"], { label: "Desk", icon: "💻", seats: [[-5, -2, Math.PI, "sit"]] }),
      T("desk", -1.5, -3, ["work_shift", "remote_work"], { label: "Desk", icon: "💻", seats: [[-1.5, -2, Math.PI, "sit"]] }),
      T("desk", 2, -3, ["work_shift", "remote_work"], { label: "Desk", icon: "💻", seats: [[2, -2, Math.PI, "sit"]] }),
      T("cooler", 6, -4, ["office_gist"], { label: "Water cooler", icon: "🚰" }),
      T("sofa", -4, 3.5, ["sit_chill"], { label: "Break area", icon: "🛋️", seats: [[-4.8, 3.2, Math.PI, "sit"], [-3.2, 3.2, Math.PI, "sit"]] }),
      T("toilet", 6.6, 4.4, ["toilet"], { label: "Toilet", icon: "🚽" }),
    ] },
    church: { w: 16, d: 14, floor: ["#e8e0d0", "#d8ccb4"], wall: "#fafafa", light: 0xfff6dd, objects: [
      T("altar", 0, -5.2, ["pray"], { label: "Altar", icon: "🕯️" }),
      T("choir", 5.5, -4, ["carol"], { label: "Choir stand", icon: "🎶", seats: [[5, -4, 0, "sing"], [6.2, -4, 0, "sing"]] }),
      ...[-1.2, 1.2, 3.6].flatMap((z) => [-3, 3].map((x) => T("pew", x, z, ["service", "crossover"], { label: "Pews", icon: "🙏🏾", seats: [[x - 1.2, z, Math.PI, "sit"], [x, z, Math.PI, "sit"], [x + 1.2, z, Math.PI, "sit"]] }))),
    ] },
    hall: { w: 20, d: 14, floor: ["#fff3e0", "#ffe0b2"], wall: "#fff3e0", light: 0xffe0b2, objects: [
      T("dancefloor", 0, -1, ["owambe_attend", "spray_money"], { label: "Dance floor", icon: "💃🏾", w: 7, d: 5, seats: [[-2, -2.4, 0, "dance"], [0, -2, 0, "dance"], [2, -2.2, 0, "dance"], [-1, 0.4, 0, "dance"], [1.4, 0.6, 0, "dance"]] }),
      T("stage", 0, -5.8, ["spray_money"], { label: "Live band", icon: "🎺", w: 8 }),
      tableSet(-6.5, 1.5, ["owambe_eat", "owambe_network"], "Guest table"), tableSet(6.5, 1.5, ["owambe_eat", "owambe_network"], "Guest table"),
      tableSet(-3, 4.6, ["owambe_eat", "owambe_gossip"], "Aunties' table"), tableSet(3, 4.6, ["owambe_eat"], "Guest table"),
      T("crates", -8.6, -5, ["event_setup"], { label: "Chairs to set up", icon: "🪑" }),
    ] },
    hotel: { w: 16, d: 12, floor: ["#d7ccc8", "#bcaaa4"], wall: "#d7ccc8", light: 0xfff3e0, objects: [
      T("counter", -4, -4, ["book_night", "rent_car"], { label: "Reception", icon: "🛎️", w: 5, vendorSpot: [-4, -4.8, 0] }),
      T("sofa", 4, -3.5, ["lobby_network", "sit_chill"], { label: "Lobby", icon: "🛋️", seats: [[3.2, -3.2, 0, "sit"], [4.8, -3.2, 0, "sit"]] }),
      T("pool", 3, 2.6, ["pool_day"], { label: "Pool", icon: "🏊🏾", w: 6, d: 3.6 }),
      T("bed", -5.4, 3, ["sleep"], { label: "Your room (if booked)", icon: "🛏️", seats: [[-5.4, 2.9, 0, "lie"]] }),
      T("shower", -1.6, 4.4, ["shower", "toilet"], { label: "Bathroom", icon: "🚿" }),
    ] },
    bank: { w: 12, d: 10, floor: ["#e8eaf6", "#c5cae9"], wall: "#c5cae9", light: 0xffffff, objects: [
      T("counter", 0, -3.6, ["quick_loan", "repay_loan"], { label: "Customer service", icon: "🏦", w: 8, vendorSpot: [0, -4.4, 0] }),
      T("bench", 0, 1.5, ["sit_chill"], { label: "Waiting chairs", icon: "🪑", seats: [[-1, 1.5, Math.PI, "sit"], [1, 1.5, Math.PI, "sit"]] }),
    ] },
    bdc: { w: 10, d: 8, floor: ["#e8f5e9", "#c8e6c9"], wall: "#c8e6c9", light: 0xffffff, objects: [
      T("counter", 0, -2.8, ["bdc_sell", "bdc_buy"], { label: "Mallam Musa's counter", icon: "💱", w: 6, vendorSpot: [0, -3.6, 0] }),
    ] },
    // VIP Beach Club: open-air, day-to-night. Pool and daybeds by day, pergola
    // sundowners at dusk, DJ, moving lights and glowing LEDs at night.
    beachclub: { w: 28, d: 20, open: true, setting: "beach", floor: ["#c99b6d", "#bd8f62"], wall: "#ffffff", light: 0xfff1d6, stringLights: true, objects: [
      T("pool", -2, 1.5, ["pool_swim"], { label: "Infinity pool", icon: "🏊🏾", w: 11, d: 5.5, seats: [[-5.5, 1.5, 0, "swim"], [-2.5, 0.6, 0.6, "swim"], [0.5, 2.4, -1.2, "swim"], [2.8, 1, 2.2, "swim"]] }),
      ...[-6, -3, 0, 3].map((x) => T("lounger", x, 5.6, ["daybed_lounge"], { label: "Sunbed", icon: "🏖️", seats: [[x, 5.7, Math.PI, "lie"]] })),
      T("cabana", -11, -2.5, ["vip_cabana", "daybed_lounge"], { label: "VIP cabana", icon: "🍾", seats: [[-11.4, -2.6, Math.PI / 2, "sit"], [-10.6, -2.0, Math.PI / 2, "sit"], [-11, -3.2, Math.PI / 2, "lie"]] }),
      T("cabana", -11, 4, ["vip_cabana", "daybed_lounge"], { label: "VIP cabana", icon: "🍾", seats: [[-11.4, 3.9, Math.PI / 2, "sit"], [-10.6, 4.5, Math.PI / 2, "sit"]] }),
      T("cabana", 11.5, 4.5, ["vip_cabana", "daybed_lounge"], { label: "VIP cabana", icon: "🍾", seats: [[11.9, 4.4, -Math.PI / 2, "sit"], [11.1, 5.0, -Math.PI / 2, "sit"]] }),
      T("pergola", 10, -4.5, ["sundowner", "sit_chill", "lounge_network"], { label: "Pergola lounge", icon: "🌅", seats: [[8.3, -5.6, 0, "sit"], [9.6, -5.6, 0, "sit"], [10.9, -5.6, 0, "sit"], [12.1, -4.4, -Math.PI / 2, "sit"]] }),
      T("glowbar", 0, -8, ["drinks", "sundowner", "beach_brunch"], { label: "Beach bar", icon: "🍹", w: 7, d: 1.3, seats: [[-2.4, -6.7, Math.PI, "drink"], [0, -6.7, Math.PI, "drink"], [2.4, -6.7, Math.PI, "drink"]], vendorSpot: [0, -9.1, 0] }),
      T("dj", -7, -8, ["dj_set", "request_song"], { label: "DJ booth", icon: "🎧", vendorSpot: [-7, -8.9, 0] }),
      T("dancedeck", -5.5, -4.6, ["beachclub_party", "dance"], { label: "Dance deck", icon: "💃🏾", w: 7, d: 3.4, seats: [[-7.5, -5, 0, "dance"], [-5.6, -4.4, 0, "dance"], [-3.7, -5, 0, "dance"], [-6.6, -3.8, 0, "dance"], [-4.4, -3.6, 0, "dance"]] }),
      tableSet(5.5, 1.5, ["beach_brunch"], "Brunch table"),
      T("ringlight", -12.5, -7.8, [], { label: "Light sculpture" }),
      T("shower", 12.5, -8.5, ["shower", "toilet"], { label: "Showers & toilets", icon: "🚿" }),
    ] },
    hustle: { w: 16, d: 12, floor: ["#fff8e1", "#ffecb3"], wall: "#ffe082", light: 0xffffff, objects: [
      T("counter", -4.5, -3.8, ["sell_phones"], { label: "Phone stall", icon: "📦", w: 5, vendorSpot: [-4.5, -4.6, 0] }),
      T("counter", 3, -3.8, ["merch_stock"], { label: "Merch printer", icon: "👕", w: 4 }),
      T("desk", 4.5, 2.5, ["broker"], { label: "Deal desk", icon: "🔗", seats: [[4.5, 3.5, Math.PI, "sit"]] }),
      T("bike", -5, 2.6, ["delivery"], { label: "Delivery bike", icon: "🛵" }),
    ] },
  };

  // Outdoor objects at open places, offered when you click them.
  const OUTDOOR = {
    market: [{ label: "Food & fabric stalls", icon: "🧺", act: ["foodstuff", "asoebi", "goat", "small_chops"] }],
    busstop: [{ label: "Danfo", icon: "🚌", act: ["conductor_gig"] }, { label: "Bus stop bench", icon: "👀", act: ["people_watch"] }],
    suya: [{ label: "Suya grill", icon: "🍢", act: ["suya", "suya_hang"] }],
    concert: [{ label: "Main stage", icon: "🎤", act: ["concert", "concert_photo_gig", "resell_tickets", "crossover"] }],
    beach: [{ label: "Beach", icon: "🏖️", act: ["chill", "picnic", "beach_party", "beach_photos", "crossover"] }],
    photo: [{ label: "Detty Wall", icon: "📸", act: ["photoshoot", "collab"] }],
    lekkistreet: [{ label: "Party house", icon: "🏠", act: ["house_party"] }, { label: "The close", icon: "🛵", act: ["street_hang", "neighbour_gist"] }],
  };

  // Venue atmosphere moodlets (no timer: they last while you're there).
  const ATMOSPHERE = {
    lekkilounge: { emotion: "playful", w: 1, label: "Lekki Energy", icon: "🌴" },
    conceptstore: { emotion: "confident", w: 1, label: "Retail Therapy", icon: "💎" },
    club: { emotion: "playful", w: 1, label: "Party Atmosphere", icon: "🪩", night: true },
    lounge: { emotion: "energized", w: 1, label: "Rooftop Energy", icon: "🌃" },
    shortlet: { emotion: "confident", w: 1, label: "Living Large", icon: "🥂" },
    hall: { emotion: "happy", w: 1, label: "Owambe Energy", icon: "🎊" },
    concert: { emotion: "energized", w: 1, label: "Crowd Energy", icon: "🎤" },
    beach: { emotion: "happy", w: 1, label: "Sea Breeze", icon: "🌊" },
    church: { emotion: "happy", w: 1, label: "Peaceful Place", icon: "🕊️" },
    office: { emotion: "focused", w: 1, label: "Work Mode", icon: "💼" },
    gym: { emotion: "energized", w: 1, label: "Gym Energy", icon: "🏋🏾" },
    photo: { emotion: "inspired", w: 1, label: "Picture Perfect", icon: "📸" },
    beachclub: { emotion: "playful", w: 1, label: "Beach Club Vibes", icon: "🏝️" },
  };

  const SIMS = { NEEDS, EMOTIONS, MOODLETS, needMoodlets, SKILLS, SKILL_OF, skillLevel, EXTRA_ACTIONS, POSES, SOCIALS, SOCIAL_CATS, REPLIES, FURNITURE, START_HOME, INTERIORS, OUTDOOR, ACTION_MOODLETS, EMO_FX, crowdWeights, ATMOSPHERE };
  Object.assign(W.ACTIONS, EXTRA_ACTIONS);
  if (!W.ACHIEVEMENTS.skilled) W.ACHIEVEMENTS.skilled = { icon: "⭐", name: "Skilled", desc: "Reach level 5 in any skill." };
  if (!W.ACHIEVEMENTS.nest) W.ACHIEVEMENTS.nest = { icon: "🛋️", name: "Soft Life Flat", desc: "Upgrade five things in your home." };
  W.SIMS = SIMS;
  if (typeof module !== "undefined") module.exports = SIMS;
  else root.SIMS_DATA = SIMS;
})(typeof window !== "undefined" ? window : globalThis);
