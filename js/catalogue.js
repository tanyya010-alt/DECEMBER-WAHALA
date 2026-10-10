// DECEMBER WAHALA — the Buy mode catalogue: every piece of furniture you can
// put in your house, grouped by category, plus wall paint and floors.
// Each item fills one slot in the house (buying a new one sends the old one to
// Storage). `sets` maps onto the older home upgrade levels the sim uses
// (bed / tv / stove / sound / power / cooling / mirror / decor); `boost` adds
// to the effects of an action done at home; `decor` is its style score.
/* global module, require */
(function (root) {
  const isNode = typeof module !== "undefined";
  const SIMS = isNode ? require("./sims-data.js") : root.WORLD.SIMS;

  const CATS = [
    { id: "storage", name: "Storage", icon: "📦" },
    { id: "design", name: "Design", icon: "🎨" },
    { id: "sleep", name: "Sleep", icon: "🛏️" },
    { id: "kitchen", name: "Kitchen", icon: "🍳" },
    { id: "bath", name: "Bath", icon: "🛁" },
    { id: "comfort", name: "Comfort", icon: "🛋️" },
    { id: "fun", name: "Fun", icon: "📺" },
    { id: "skills", name: "Skills", icon: "🎸" },
    { id: "light", name: "Light", icon: "💡" },
  ];

  // Where each slot sits in the house: [x, z, facing], its room, and what you can do there.
  // Lights are drawn in every room. Seats are absolute room coordinates.
  const SLOTS = {
    bed: { cat: "sleep", name: "Bed", at: [-6.6, -4.5, 0], room: "Bedroom", act: ["sleep", "nap"], seats: [[-6.6, -4.6, 0, "lie"]] },
    wardrobe: { cat: "sleep", name: "Wardrobe", at: [-9.35, -1.7, Math.PI / 2], room: "Bedroom", act: ["wardrobe", "practice_speech"] },
    nightstand: { cat: "sleep", name: "Bedside", at: [-9.0, -6.35, 0], room: "Bedroom", act: [] },
    desk: { cat: "skills", name: "Desk", at: [0.2, -6.3, 0], room: "Office", act: ["post_home", "laptop_work"], seats: [[0.2, -5.4, Math.PI, "sit"]] },
    music: { cat: "skills", name: "Music corner", at: [-2.2, -3.2, Math.PI / 2], room: "Office", act: ["play_music"] },
    workout: { cat: "skills", name: "Workout corner", at: [2.3, -3.4, -Math.PI / 2], room: "Office", act: ["workout_home"] },
    counter: { cat: "kitchen", name: "Counter", at: [4.85, -6.35, 0], room: "Kitchen", act: ["snack"] },
    cooker: { cat: "kitchen", name: "Cooker", at: [6.35, -6.35, 0], room: "Kitchen", act: ["cook", "snack"] },
    sink: { cat: "kitchen", name: "Sink", at: [7.85, -6.35, 0], room: "Kitchen", act: [] },
    fridge: { cat: "kitchen", name: "Fridge", at: [9.3, -6.25, 0], room: "Kitchen", act: ["snack"] },
    appliance: { cat: "kitchen", name: "Appliance", at: [9.35, -4.3, -Math.PI / 2], room: "Kitchen", act: ["snack"] },
    water: { cat: "kitchen", name: "Drinking water", at: [9.35, -2.7, -Math.PI / 2], room: "Kitchen", act: [] },
    dining: { cat: "kitchen", name: "Dining table", at: [6.3, -2.9, 0], room: "Kitchen", act: ["host"], seats: [[5.4, -3.9, 0, "sit"], [7.2, -3.9, 0, "sit"], [5.4, -1.9, Math.PI, "sit"], [7.2, -1.9, Math.PI, "sit"]] },
    wash: { cat: "bath", name: "Shower / bath", at: [8.6, 2.65, 0], room: "Bathroom", act: ["shower"] },
    toilet: { cat: "bath", name: "Toilet", at: [9.35, 5.5, -Math.PI / 2], room: "Bathroom", act: ["toilet"] },
    laundry: { cat: "bath", name: "Laundry", at: [6.4, 6.35, 0], room: "Bathroom", act: ["do_laundry"] },
    vanity: { cat: "bath", name: "Mirror", at: [5.2, 3.8, Math.PI / 2], room: "Bathroom", act: ["wardrobe", "practice_speech"] },
    tv: { cat: "fun", name: "TV", at: [-6.2, 0.55, 0], room: "Living room", act: ["tv"], seats: [[-6.9, 4.1, Math.PI, "sit"], [-5.5, 4.1, Math.PI, "sit"]] },
    speaker: { cat: "fun", name: "Sound", at: [-3.7, 0.55, 0], room: "Living room", act: ["dance_home"] },
    gaming: { cat: "fun", name: "Gaming", at: [-8.8, 0.75, 0], room: "Living room", act: ["play_fifa"], seats: [[-8.8, 2.0, Math.PI, "sit"]] },
    gametable: { cat: "fun", name: "Game table", at: [2.3, 3.4, 0], room: "Living room", act: ["game_night"] },
    sofa: { cat: "comfort", name: "Sofa", at: [-6.2, 4.4, Math.PI], room: "Living room", act: ["sit_chill", "tv"], seats: [[-6.9, 4.1, Math.PI, "sit"], [-5.5, 4.1, Math.PI, "sit"]] },
    armchair: { cat: "comfort", name: "Armchair", at: [-2.5, 3.2, -Math.PI / 2], room: "Living room", act: ["sit_chill"], seats: [[-2.6, 3.2, -Math.PI / 2, "sit"]] },
    rug: { cat: "comfort", name: "Rug", at: [-6.2, 2.6, 0], room: "Living room", act: [], walk: true },
    cooling: { cat: "comfort", name: "Cooling", at: [-9.55, 5.8, Math.PI / 2], room: "Living room", act: [] },
    plant: { cat: "comfort", name: "Plant", at: [-2.4, 6.35, 0], room: "Living room", act: [] },
    art: { cat: "design", name: "Wall art", at: [-9.85, 3.4, Math.PI / 2], room: "Living room", act: [], wall: true },
    lights: { cat: "light", name: "Ceiling lights", at: [[-6.2, 2.6], [6.3, -2.9], [-6.6, -3.6], [0.2, -3.6]], room: "Every room", act: [], walk: true, multi: true },
    lamp: { cat: "light", name: "Lamp", at: [-4.1, -6.35, 0], room: "Bedroom", act: [] },
    power: { cat: "light", name: "Power", at: [3.3, 6.2, 0], room: "Living room", act: ["gen"] },
  };

  // [id, slot, name, price, decor, sets, note, boost]
  const I = (id, slot, name, price, decor, sets, note, boost) => ({ id, slot, cat: SLOTS[slot].cat, name, price, decor, sets: sets || {}, note: note || "", boost: boost || null });
  const ITEMS = [
    // Sleep
    I("foam_mattress", "bed", "Foam Mattress", 0, 1, { bed: 0 }, "It's a bed. Technically."),
    I("wood_bed", "bed", "Wooden Bed Frame", 60000, 3, { bed: 0 }, "Off the floor at last."),
    I("ortho_bed", "bed", "Orthopedic Bed", 180000, 5, { bed: 1 }, "Sleep restores energy 30% faster."),
    I("tufted_bed", "bed", "Tufted King Bed", 320000, 8, { bed: 2 }, "Sleep 50% faster and wake up Confident."),
    I("canopy_bed", "bed", "Four-Poster Canopy Bed", 420000, 8, { bed: 2 }, "Royal sleep. Wake up Confident."),
    I("round_bed", "bed", "Rotating Round Bed", 900000, 9, { bed: 2 }, "It spins. You'll never explain why you bought it."),
    I("rack_wardrobe", "wardrobe", "Zip-Up Rack Wardrobe", 0, 1, { mirror: 0 }, "Change outfits."),
    I("wood_wardrobe", "wardrobe", "Wooden Wardrobe", 80000, 4, { mirror: 0 }, "Proper storage for your drip."),
    I("mirror_wardrobe", "wardrobe", "Mirrored Wardrobe", 140000, 5, { mirror: 1 }, "Full-length mirror: practise your charm."),
    I("closet_display", "wardrobe", "Walk-in Closet Display", 350000, 6, { mirror: 1 }, "Lit shelves for every fit you own."),
    I("plastic_stool", "nightstand", "Plastic Stool", 0, 0, {}, "Holds your phone. Barely."),
    I("bedside_table", "nightstand", "Bedside Table", 25000, 2, {}, "With a little lamp."),
    I("hex_nightstand", "nightstand", "Hex Nightstand", 60000, 3, {}, "Gold lamp, wooden hexagon. Very Lekki."),
    I("vanity_table", "nightstand", "Vanity Table", 120000, 5, {}, "Mirror, lights and a stool for getting ready."),
    // Kitchen
    I("kerosene_stove", "cooker", "Kerosene Stove", 0, 0, { stove: 0 }, "Smells like childhood."),
    I("gas_cooker", "cooker", "Gas Cooker", 150000, 3, { stove: 1 }, "Cooking is faster and tastier."),
    I("chef_range", "cooker", "Chef's Range Cooker", 380000, 6, { stove: 2 }, "Cooking skill grows twice as fast."),
    I("cooler_box", "fridge", "Cooler Box", 0, 0, {}, "Ice from the market every morning."),
    I("single_fridge", "fridge", "Single-Door Fridge", 120000, 2, {}, "Cold water at last.", { snack: { belle: 4 } }),
    I("double_fridge", "fridge", "Double-Door Fridge", 380000, 4, {}, "Stocked like a supermarket.", { snack: { belle: 8, vibes: 2 } }),
    I("wood_shelf", "counter", "Wooden Shelf", 20000, 1, {}, "Pots on top, provisions below."),
    I("kitchen_counter", "counter", "Kitchen Counter", 60000, 5, {}, "Space to actually chop things."),
    I("marble_counter", "counter", "Marble Island Counter", 300000, 7, {}, "Waterfall edge. Chef energy.", { cook: { vibes: 4 } }),
    I("plastic_basin", "sink", "Plastic Basin", 0, 0, {}, "Wash, rinse, repeat."),
    I("kitchen_sink", "sink", "Kitchen Sink", 70000, 3, {}, "Running water (when the tank is full)."),
    I("blender", "appliance", "Kitchen Blender", 25000, 1, {}, "Smoothies and pepper mix.", { snack: { vibes: 2 } }),
    I("microwave", "appliance", "Microwave", 55000, 2, {}, "Warm your leftover jollof in 60 seconds.", { snack: { belle: 4 } }),
    I("air_fryer", "appliance", "Air Fryer", 80000, 3, {}, "Plantain without the oil splash.", { snack: { belle: 6, vibes: 2 } }),
    I("sachet_rack", "water", "Pure Water Bags", 5000, 0, {}, "A bag of sachet water by the wall."),
    I("water_dispenser", "water", "Water Dispenser", 45000, 2, {}, "Hot and cold water on tap."),
    I("plastic_table", "dining", "Plastic Table & Chairs", 0, 1, {}, "The owambe classic."),
    I("wood_dining", "dining", "Wooden Dining Set", 95000, 4, {}, "Sunday rice, properly seated.", { host: { vibes: 4 } }),
    I("glass_dining", "dining", "Glass Dining Set", 260000, 7, {}, "Six seats, gold legs, big man energy.", { host: { vibes: 8 } }),
    // Bath
    I("bucket_bowl", "wash", "Bucket & Bowl", 0, 0, {}, "The original Naija shower."),
    I("water_drum", "wash", "Water Drum & Jerrycans", 15000, 1, {}, "For when the tap dries up."),
    I("rain_shower", "wash", "Rain Shower", 220000, 5, {}, "Glass cubicle, rainfall head.", { shower: { vibes: 4 } }),
    I("bathtub", "wash", "Bathtub", 350000, 6, {}, "Long soaks after long days.", { shower: { vibes: 8, energy: 4 } }),
    I("jacuzzi", "wash", "Jacuzzi", 1200000, 9, {}, "Gold rim. Bubbles. Peak soft life.", { shower: { vibes: 15, energy: 8 } }),
    I("wc_toilet", "toilet", "WC Toilet", 0, 1, {}, "Flushes most of the time."),
    I("smart_toilet", "toilet", "Smart Toilet", 250000, 4, {}, "Heated seat. Japanese technology.", { toilet: { vibes: 3 } }),
    I("hand_wash", "laundry", "Washing Bowls", 0, 0, {}, "Hand-wash Saturdays."),
    I("washing_machine", "laundry", "Washing Machine", 180000, 2, {}, "Do laundry in minutes, not hours."),
    I("small_mirror", "vanity", "Small Mirror", 0, 1, { mirror: 0 }, "Check your face before you go out."),
    I("vanity_mirror", "vanity", "Full-Length Mirror", 40000, 3, { mirror: 1 }, "Practise your charm (Charisma)."),
    I("gold_vanity", "vanity", "Gold Vanity Mirror", 200000, 6, { mirror: 1 }, "Hollywood bulbs all round."),
    // Comfort
    I("plastic_chairs", "sofa", "Plastic Chairs", 0, 0, {}, "Two white plastic chairs."),
    I("fabric_sofa", "sofa", "Fabric Sofa", 90000, 3, {}, "Comfy enough for Nollywood marathons."),
    I("red_velvet_sofa", "sofa", "Red Velvet Sofa", 250000, 6, {}, "Aunties will ask where you bought it."),
    I("boucle_sofa", "sofa", "Black Bouclé Sofa", 300000, 6, {}, "Soft, curly, very Lekki."),
    I("leather_sectional", "sofa", "Leather Sectional", 450000, 7, {}, "L-shaped. Seats the whole crew.", { sit_chill: { energy: 4 } }),
    I("cane_chair", "armchair", "Cane Chair", 20000, 2, {}, "Grandma's verandah favourite."),
    I("accent_chair", "armchair", "Yellow Accent Chair", 70000, 4, {}, "A pop of colour."),
    I("massage_chair", "armchair", "Massage Chair", 500000, 6, {}, "Melts the stress away.", { sit_chill: { energy: 10, vibes: 6 } }),
    I("no_rug", "rug", "Bare Floor", 0, 0, {}, "No rug."),
    I("ankara_rug", "rug", "Ankara Rug", 30000, 3, {}, "Bright wax-print colours."),
    I("persian_rug", "rug", "Persian Rug", 150000, 6, {}, "Imported. Allegedly."),
    I("gold_rug", "rug", "Gold-Border Red Rug", 220000, 7, {}, "Red carpet with a gold trim."),
    I("hand_fan", "cooling", "Hand Fan", 0, 0, {}, "Your hand, and a folded paper."),
    I("standing_fan", "cooling", "Standing Fan", 35000, 1, { cooling: 0 }, "Better sleep when there's light."),
    I("ceiling_fan", "cooling", "Ceiling Fan", 60000, 2, { cooling: 0 }, "Whirrs all night."),
    I("split_ac", "cooling", "Split AC", 420000, 3, { cooling: 1 }, "Cool, comfortable, Confident sleep."),
    I("no_plant", "plant", "Empty Corner", 0, 0, {}, "Nothing here yet."),
    I("snake_plant", "plant", "Snake Plant", 15000, 2, {}, "Survives anything, even you."),
    I("potted_palm", "plant", "Potted Palm", 40000, 3, {}, "Beach vibes indoors."),
    I("fiddle_fig", "plant", "Fiddle-Leaf Fig", 65000, 4, {}, "The influencer plant."),
    // Fun
    I("transistor_radio", "tv", "Transistor Radio", 0, 0, { tv: 0 }, "News, highlife and football commentary."),
    I("tv_32", "tv", "32\" Flat TV", 60000, 1, { tv: 0 }, "Nollywood on a small screen."),
    I("tv_65", "tv", "65\" Smart TV", 250000, 3, { tv: 1 }, "TV is twice as fun."),
    I("oled_75", "tv", "75\" OLED Smart TV", 600000, 5, { tv: 1 }, "Blacker than NEPA nights.", { tv: { vibes: 6 } }),
    I("cinema_wall", "tv", "Home Cinema Wall", 1500000, 8, { tv: 1 }, "A wall-sized screen and soundbar.", { tv: { vibes: 12 } }),
    I("no_speaker", "speaker", "No Speaker", 0, 0, {}, "Silence."),
    I("bt_speaker", "speaker", "Bluetooth Speaker", 60000, 1, { sound: 0 }, "Unlocks Dance in your room."),
    I("party_speakers", "speaker", "Party Speakers", 300000, 3, { sound: 1 }, "House parties are legendary."),
    I("home_theatre", "speaker", "Home Theatre System", 450000, 5, { sound: 1 }, "Surround sound for the whole compound.", { dance_home: { vibes: 6 } }),
    I("no_gaming", "gaming", "No Console", 0, 0, {}, "Nothing to play."),
    I("ps5_setup", "gaming", "PS5 Gaming Setup", 520000, 4, { tv: 2 }, "Unlocks Play FIFA. Gaming chair included."),
    I("arcade_cabinet", "gaming", "Retro Arcade Cabinet", 380000, 5, { tv: 2 }, "Street-fighter nights. Unlocks gaming."),
    I("no_gametable", "gametable", "Open Floor", 0, 0, {}, "Nothing here."),
    I("ludo_table", "gametable", "Ludo & Draughts Table", 10000, 1, {}, "Unlocks game night. Arguments guaranteed."),
    I("table_football", "gametable", "Table Football", 120000, 3, {}, "Spin to win.", { game_night: { vibes: 6 } }),
    I("snooker_table", "gametable", "Snooker Table", 650000, 6, {}, "Big man's pastime.", { game_night: { vibes: 12 } }),
    // Skills
    I("study_desk", "desk", "Study Desk", 0, 1, {}, "Work from home. Post from home."),
    I("laptop_desk", "desk", "Laptop Desk & Chair", 90000, 3, {}, "Ergonomic. Your back says thanks.", { laptop_work: { vibes: 3 } }),
    I("content_studio", "desk", "Content Studio Desk", 45000, 4, { decor: 1 }, "Ring light + backdrop: posts from home get more followers."),
    I("gaming_pc", "desk", "RGB Gaming PC Desk", 300000, 5, { decor: 1 }, "Streams and posts glow.", { laptop_work: { vibes: 6 } }),
    I("no_music", "music", "Empty Corner", 0, 0, {}, "Nothing here."),
    I("acoustic_guitar", "music", "Acoustic Guitar", 60000, 2, {}, "Unlocks Practise music (Charisma)."),
    I("keyboard_piano", "music", "Keyboard Piano", 150000, 3, {}, "Church-keyboard skills. Charisma grows faster.", { play_music: { vibes: 4 } }),
    I("dj_decks", "music", "DJ Decks", 400000, 5, {}, "Mix at home (Dancing).", { play_music: { vibes: 8 } }),
    I("no_workout", "workout", "Empty Corner", 0, 0, {}, "Nothing here."),
    I("dumbbells", "workout", "Dumbbell Rack", 30000, 1, {}, "Unlocks Work out at home (Fitness)."),
    I("treadmill", "workout", "Treadmill", 250000, 2, {}, "Run without the Lagos traffic.", { workout_home: { energy: 4 } }),
    I("home_gym", "workout", "Home Gym Station", 600000, 3, {}, "Bench, bar, cables. Fitness grows faster.", { workout_home: { energy: 6, vibes: 4 } }),
    // Light
    I("bare_bulb", "lights", "Bare Bulb", 0, 0, {}, "One bulb per room."),
    I("rechargeable_lamp", "lights", "Rechargeable Lamps", 15000, 1, {}, "Light even when NEPA takes it."),
    I("pendant_cluster", "lights", "Pendant Cluster", 90000, 4, {}, "Three black pendants over every room."),
    I("ring_chandelier", "lights", "LED Ring Chandelier", 180000, 6, {}, "Glowing rings. Very penthouse."),
    I("crystal_chandelier", "lights", "Crystal Chandelier", 350000, 8, {}, "Owambe-hall glamour at home."),
    I("no_lamp", "lamp", "No Lamp", 0, 0, {}, "Dark corner."),
    I("floor_lamp", "lamp", "Floor Lamp", 30000, 2, {}, "Warm reading light."),
    I("arc_lamp", "lamp", "Gold Arc Lamp", 85000, 4, {}, "A sweeping gold arc."),
    I("neon_sign", "lamp", "Neon \"Soft Life\" Sign", 40000, 3, {}, "Pink neon. For the content."),
    I("no_power", "power", "NEPA Only", 0, 0, {}, "Up NEPA! (When they bring light.)"),
    I("small_gen", "power", "Small Generator", 180000, 0, { power: 0 }, "Light whenever NEPA takes it (noisy)."),
    I("big_gen", "power", "Soundproof Generator", 350000, 1, { power: 0 }, "Bigger, quieter, still diesel."),
    I("inverter_solar", "power", "Inverter + Solar", 900000, 2, { power: 1 }, "Silent, constant power at home."),
    // Design: wall art (other design options are paints and floors below)
    I("no_art", "art", "Bare Wall", 0, 0, {}, "Nothing on the wall."),
    I("family_portrait", "art", "Family Portrait", 30000, 3, { decor: 0 }, "Mummy insisted. More fun at home."),
    I("ankara_art", "art", "Ankara Wall Art", 70000, 4, { decor: 0 }, "Your flat feels like home. More fun at home."),
    I("gold_frame_art", "art", "Gold-Framed Abstract", 150000, 6, { decor: 0 }, "Bought at an art fair on the Island."),
  ];
  const BY_ID = Object.fromEntries(ITEMS.map((it) => [it.id, it]));

  const PAINTS = [
    { id: "cream", name: "Classic Cream", price: 0, a: "#e8dcb8", b: "#efe3c4" },
    { id: "sky", name: "Lagos Sky", price: 30000, a: "#7fb0d9", b: "#97c1e3" },
    { id: "mint", name: "Mint Fresh", price: 30000, a: "#8fd1b2", b: "#a6dfc2" },
    { id: "peach", name: "Peach Glow", price: 30000, a: "#f1a882", b: "#f6bb9c" },
    { id: "lilac", name: "Lilac Dream", price: 30000, a: "#b9a3dc", b: "#c9b6e6" },
    { id: "terracotta", name: "Terracotta", price: 35000, a: "#c9724e", b: "#d68866" },
    { id: "charcoal", name: "Charcoal Luxe", price: 45000, a: "#3b3f47", b: "#4a4f58" },
    { id: "goldleaf", name: "Gold Leaf", price: 120000, a: "#d9b45a", b: "#e6c777" },
  ];
  const FLOORS = [
    { id: "terrazzo", name: "Terrazzo", price: 0, a: "#d9d2c5", b: "#cdc4b4" },
    { id: "parquet", name: "Wood Parquet", price: 80000, a: "#b07a48", b: "#a06b3c" },
    { id: "white_marble", name: "White Marble", price: 120000, a: "#efede8", b: "#e2dfd8" },
    { id: "black_marble", name: "Black Marble", price: 150000, a: "#3a3b40", b: "#2c2d31" },
    { id: "ankara_tiles", name: "Ankara Tiles", price: 60000, a: "#e2a33d", b: "#2f7d6b" },
    { id: "concrete", name: "Polished Concrete", price: 50000, a: "#a3a6ab", b: "#989ba0" },
    { id: "checker", name: "Black & White Check", price: 40000, a: "#f2f2f2", b: "#2a2a2a" },
  ];

  // The free starter item in every slot, and the old upgrade levels mapped to items.
  const STARTER = { bed: "foam_mattress", wardrobe: "rack_wardrobe", nightstand: "plastic_stool", desk: "study_desk", music: "no_music", workout: "no_workout",
    counter: "wood_shelf", cooker: "kerosene_stove", sink: "plastic_basin", fridge: "cooler_box", appliance: null, water: "sachet_rack", dining: "plastic_table",
    wash: "bucket_bowl", toilet: "wc_toilet", laundry: "hand_wash", vanity: "small_mirror", tv: "tv_32", speaker: "no_speaker", gaming: "no_gaming", gametable: "no_gametable",
    sofa: "plastic_chairs", armchair: null, rug: "no_rug", cooling: "hand_fan", plant: "no_plant", art: "no_art", lights: "bare_bulb", lamp: "no_lamp", power: "no_power" };
  const LEGACY = {
    bed: ["foam_mattress", "ortho_bed", "tufted_bed"], tv: ["tv_32", "tv_65", "ps5_setup"], stove: ["kerosene_stove", "gas_cooker", "chef_range"],
    sound: ["bt_speaker", "party_speakers"], power: ["small_gen", "inverter_solar"], cooling: ["standing_fan", "split_ac"], mirror: ["rack_wardrobe", "vanity_mirror"], decor: ["ankara_art", "content_studio"],
  };

  // New home actions that the catalogue unlocks.
  Object.assign(SIMS.EXTRA_ACTIONS, {
    play_music: { name: "Practise music", icon: "🎸", mins: 45, fx: { vibes: 10 }, needsSlot: "music", pose: "sit" },
    workout_home: { name: "Work out at home", icon: "🏋🏾", mins: 45, fx: { energy: -8, vibes: 6, hygiene: -12 }, needsSlot: "workout", pose: "workout" },
    game_night: { name: "Game night", icon: "🎱", mins: 60, fx: { vibes: 14, social: 8 }, needsSlot: "gametable", moodlet: "laughed" },
    do_laundry: { name: "Do laundry", icon: "🧺", mins: 60, fx: { hygiene: 12, vibes: -2 } },
  });
  Object.assign(SIMS.SKILL_OF, { play_music: "charisma", workout_home: "fitness" });
  Object.assign(SIMS.POSES, { play_music: "sit", workout_home: "workout", game_night: "stand", do_laundry: "cook" });
  if (root.WORLD && root.WORLD.ACTIONS) Object.assign(root.WORLD.ACTIONS, SIMS.EXTRA_ACTIONS);
  else if (isNode) Object.assign(require("./world-data.js").ACTIONS, SIMS.EXTRA_ACTIONS);

  const CATALOGUE = { CATS, SLOTS, ITEMS, BY_ID, PAINTS, FLOORS, STARTER, LEGACY };
  SIMS.CATALOGUE = CATALOGUE;
  if (isNode) module.exports = CATALOGUE;
})(typeof window !== "undefined" ? window : globalThis);
