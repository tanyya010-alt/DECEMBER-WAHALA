// DECEMBER WAHALA — game engine. Pure state logic, no DOM, so it can be
// simulated headlessly in tests (see test/simulate.js).

/* global module, require */
const D = typeof module !== "undefined" ? require("./data.js") : window.DATA;

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const naira = (n) => "₦" + Math.round(n).toLocaleString("en-NG");

function makeRng(seed) {
  if (seed === undefined) return Math.random;
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

class Game {
  constructor(state, seed) {
    this.s = state;
    this.rng = makeRng(seed);
  }

  static create({ name, city, role, gender }, seed) {
    const r = D.ROLES[role];
    const people = {};
    D.PEOPLE.forEach((p) => {
      people[p.id] = { rel: p.rel, arrived: !p.from, missed: false };
    });
    const state = {
      version: 1,
      name: name || "Ada",
      gender: gender || "x",
      city, role,
      day: 1, slot: 0,
      place: "home",
      needs: { energy: 85, belle: 70, vibes: 60, social: 55, peace: 70 },
      naira: r.naira, usd: r.usd,
      street: r.street, clout: r.clout, respect: r.respect,
      fx: 1550 + D.CITIES[city].fxBias,
      light: true, genSlots: 0,
      people,
      flags: { jollof: 0, asoebi: false, goat: false, gifts: 0, dates: 0, village: false, owambes: 0 },
      memories: [],
      achievements: [],
      log: [],
      event: null,
      recentEvents: [],
      slotPenalty: 0,
      over: false,
      ending: null,
    };
    const g = new Game(state, seed);
    g.checkCalendar();
    return g;
  }

  // ---------- helpers ----------
  log(text, type = "info") {
    this.s.log.unshift({ day: this.s.day, slot: this.s.slot, text, type });
    if (this.s.log.length > 80) this.s.log.length = 80;
  }
  hasPower() { return this.s.light || this.s.genSlots > 0; }
  cityData() { return D.CITIES[this.s.city]; }
  placeName(p = this.s.place) { return this.cityData().places[p].name; }
  mood() {
    const n = this.s.needs;
    return (n.energy + n.belle + n.vibes + n.social + n.peace) / 5;
  }
  addMemory(text) {
    if (!this.s.memories.includes(text)) this.s.memories.push(text);
  }
  unlock(id) {
    if (!this.s.achievements.includes(id)) {
      this.s.achievements.push(id);
      const a = D.ACHIEVEMENTS[id];
      this.log(`🏆 Achievement unlocked: ${a.icon} ${a.name}`, "achieve");
    }
  }
  applyFx(fx = {}) {
    for (const k in fx) this.s.needs[k] = clamp(this.s.needs[k] + fx[k]);
  }
  applyStats(o) {
    const s = this.s;
    if (o.cost) s.naira -= o.cost;
    if (o.fx) this.applyFx(o.fx);
    if (o.respect) s.respect = clamp(s.respect + o.respect);
    if (o.clout) s.clout = clamp(s.clout + o.clout, 0, 200);
    if (o.street) s.street = clamp(s.street + o.street);
    if (o.rel) this.relAll(o.rel);
  }
  relAll(n) {
    for (const id in this.s.people) {
      const p = this.s.people[id];
      if (p.arrived) p.rel = clamp(p.rel + n);
    }
  }
  rel(id, n) { this.s.people[id].rel = clamp(this.s.people[id].rel + n); }

  // ---------- time ----------
  advance(n) {
    const s = this.s;
    n += s.slotPenalty;
    s.slotPenalty = 0;
    for (let i = 0; i < n && !s.over; i++) {
      this.decay();
      s.slot++;
      if (s.slot > 3) {
        this.log("You no sleep at all. Body dey feel am.", "bad");
        this.applyFx({ energy: -20, peace: -5 });
        this.newDay();
      }
      this.checkCalendar();
      if (s.event) break; // a scheduled event interrupts whatever you were doing
    }
    this.checkCrisis();
  }

  decay() {
    const s = this.s;
    for (const k in D.DECAY) s.needs[k] = clamp(s.needs[k] - D.DECAY[k]);
    if (s.city === "lagos") s.needs.peace = clamp(s.needs.peace - 1);
    if (!this.hasPower() && s.place === "home") s.needs.peace = clamp(s.needs.peace - 3);
    if (s.genSlots > 0) s.genSlots--;
  }

  newDay() {
    const s = this.s;
    // Anyone who landed yesterday and wasn't picked up had to take a Bolt.
    D.PEOPLE.forEach((p) => {
      const st = s.people[p.id];
      if (p.from && !st.arrived && p.arrives <= s.day) {
        st.arrived = true;
        st.missed = true;
        st.rel = clamp(st.rel - 15);
        s.respect = clamp(s.respect - 5);
        this.log(`${p.icon} ${p.name} waited at the airport for hours and finally took a Bolt. They are NOT happy.`, "bad");
      }
    });
    s.day++;
    s.slot = 0;
    const drift = Math.round((this.rng() - 0.45) * 60);
    s.fx = clamp(s.fx + drift, 1350, 1850);
    if (s.day > 31) this.finish("slept");
    else this.log(`📅 ${D.weekday(s.day)}, ${s.day} December. Dollar now ${naira(s.fx)}.`, "day");
  }

  checkCrisis() {
    const s = this.s;
    if (s.over || s.event) return;
    if (s.needs.belle <= 0) {
      s.event = {
        title: "Hunger Don Wire You!", icon: "😵",
        text: "You collapse for road. Kind strangers carry you go chemist and buy you agege bread and malt.",
        choices: [{ label: "Eat the bread like say na your last", fx: { belle: 35, peace: -10 }, cost: Math.min(s.naira, 5000) }],
      };
    } else if (s.needs.energy <= 0) {
      s.event = {
        title: "Body No Be Firewood", icon: "🥱",
        text: "You don pass out from tiredness. You wake up for your bed. Na who carry you come?",
        choices: [{ label: "Wake up groggy", special: "forcesleep" }],
      };
    }
  }

  sleep() {
    const s = this.s;
    const power = this.hasPower();
    this.decay();
    this.applyFx({ energy: power ? 75 : 45, peace: power ? 8 : -4 });
    this.log(power ? "😴 You slept like a baby with AC/fan running." : "🦟 No light. Heat and mosquitoes dealt with you all night.", power ? "good" : "bad");
    if (s.day === 31) {
      // Passed out on the 31st: wake up just in time for crossover night.
      s.slot = 3;
      this.checkCalendar();
      return;
    }
    this.newDay();
    this.checkCalendar();
  }

  // ---------- availability ----------
  actionsHere() {
    return D.ACTIONS.filter((a) => a.place === this.s.place).map((a) => ({ a, why: this.blocked(a) }));
  }

  blocked(a) {
    const s = this.s;
    if (a.cond && !a.cond(s)) return "Not available now";
    if (a.id === "sleep" && s.day === 31) return "Sleep? On crossover day?!";
    if (a.night && s.slot < 2) return "Opens in the evening";
    if (a.cost && s.naira < a.cost) return `Need ${naira(a.cost)}`;
    if (a.needsLight && !this.hasPower()) return "No light!";
    if (a.minClout && s.clout < a.minClout) return `Need ${a.minClout} clout`;
    if (a.fx && a.fx.energy < 0 && s.needs.energy + a.fx.energy < 0) return "Too tired";
    if (a.id === "date" && s.people.kemi.rel < 30) return "Kemi no dey pick your call";
    if (a.slots >= 2 && s.slot + a.slots > 4) return "Not enough time today";
    return null;
  }

  // ---------- player commands ----------
  doAction(id) {
    const s = this.s;
    if (s.over || s.event) return;
    const a = D.ACTIONS.find((x) => x.id === id);
    if (!a || a.place !== s.place) return;
    const why = this.blocked(a);
    if (why) { this.log(`Can't ${a.name.toLowerCase()}: ${why}`, "bad"); return; }

    if (a.special === "sleep") { this.sleep(); return; }
    if (a.special === "bdc") return; // handled by exchange()

    this.applyStats({ cost: a.cost, fx: a.fx, respect: a.respect, clout: a.clout, street: a.street, rel: a.rel });
    let msg = `${a.icon} ${a.name}.`;
    msg += this.special(a) || "";
    this.log(msg + (a.cost ? ` (−${naira(a.cost)})` : ""), "action");
    if (a.memory) this.addMemory(`${a.icon} ${a.name} — ${s.day} Dec`);
    this.advance(a.slots);
    this.checkAchievements();
    this.maybeRandomEvent(0.3);
  }

  special(a) {
    const s = this.s;
    switch (a.special) {
      case "gen":
        s.genSlots += 8;
        return " Gen don roar to life. Small light for the house.";
      case "callmama":
        this.rel("mama", 5);
        if (this.rng() < 0.5) { this.applyFx({ peace: -6 }); return " She asked when you're getting married. Again."; }
        return " She prayed for you for 20 minutes straight. You feel covered.";
      case "asoebi":
        s.flags.asoebi = true;
        return " You don get the family aso-ebi. Owambe ready!";
      case "goat": {
        const price = Math.max(60000, 160000 - s.street * 1200);
        if (s.naira < price) { this.applyFx({ peace: -5 }); return ` The seller said ${naira(price)}. You no get am. Goat laugh you.`; }
        s.naira -= price; s.flags.goat = true; s.respect = clamp(s.respect + 8); s.street = clamp(s.street + 3);
        this.unlock("goat");
        return ` You negotiated it down to ${naira(price)}. The goat is now tied in your compound, judging you.`;
      }
      case "gifts":
        s.flags.gifts++;
        this.rel("mama", 8);
        this.relAll(3);
        s.respect = clamp(s.respect + 4);
        return " Wrapped gifts for everybody — even that cousin wey no dey greet.";
      case "date": {
        s.flags.dates++;
        this.rel("kemi", 12);
        return s.people.kemi.rel >= 70 ? " Kemi is smiling at you like before. 👀" : " Kemi laughed at your jokes. Progress.";
      }
      case "content": {
        let gain = 3 + Math.floor(s.needs.vibes / 25) + (s.flags.asoebi ? 1 : 0);
        if (D.arrivedCount(s) > 0) gain += 3;
        s.clout = clamp(s.clout + gain, 0, 200);
        return ` +${gain} clout. Caption: "Detty December no dey carry last 🇳🇬✨"`;
      }
      case "work": {
        const pay = Math.round(a.pay * (1 + s.street / 200) * (0.85 + this.rng() * 0.3));
        s.naira += pay;
        s.street = clamp(s.street + 2);
        return ` You made ${naira(pay)}. Hustle no dey sleep.`;
      }
      case "pickup": {
        const list = D.pendingArrivals(s);
        list.forEach((p) => {
          const st = s.people[p.id];
          st.arrived = true;
          st.rel = clamp(st.rel + 15);
          s.respect = clamp(s.respect + 4);
          s.usd += 50;
          this.addMemory(`🛬 Picked up ${p.name} from ${p.from}`);
        });
        const all = D.PEOPLE.filter((p) => p.from).every((p) => s.people[p.id].arrived && !s.people[p.id].missed);
        if (all) this.unlock("airportlegend");
        this.applyFx({ social: 20, vibes: 10 });
        return ` Hugs, screams, and ${list.length * 2} heavy suitcases. They gave you $${list.length * 50} "for fuel".`;
      }
      default:
        if (a.id === "cook") {
          s.flags.jollof++;
          if (D.arrivedCount(s) > 0) this.relAll(4);
          if (s.flags.jollof >= 3) this.unlock("jollofking");
          return " Party jollof with the perfect bottom-pot. 🔥";
        }
        if (a.id === "vip") this.unlock("baller");
        if (a.id === "concert") this.unlock("concert");
        return "";
    }
  }

  travel(place, mode) {
    const s = this.s;
    if (s.over || s.event || place === s.place) return;
    const t = D.TRANSPORT[mode];
    let cost = t.cost * (place === "airport" || s.place === "airport" ? 2 : 1);
    if (cost > 0 && s.naira < cost) { this.log(`Not enough money for ${t.name} (${naira(cost)}).`, "bad"); return; }
    s.naira -= cost;
    this.applyFx({ peace: t.peace });
    let chance = this.cityData().trafficChance * t.trafficMod;
    if (s.slot === 2) chance += 0.15; // rush hour
    const from = this.placeName();
    s.place = place;
    if (t.walk) {
      this.applyFx({ energy: -8 });
      this.log(`🚶🏾 You trekked from ${from} to ${this.placeName()} under the harmattan sun. Legs don pain you.`, "action");
      this.advance(1);
    } else if (this.rng() < chance) {
      this.applyFx({ peace: -8, energy: -6 });
      const where = s.city === "lagos" ? "Third Mainland Bridge" : "Kubwa Expressway";
      this.log(`🚦 Go-slow for ${where}! ${from} → ${this.placeName()} took forever. (−${naira(cost)})`, "bad");
      this.advance(1);
    } else {
      this.log(`${t.icon} ${from} → ${this.placeName()} by ${t.name}. Smooth! (−${naira(cost)})`, "action");
      if (mode === "okada" && this.rng() < 0.1) {
        this.applyFx({ energy: -10, peace: -10 });
        this.log("🏍️ The okada man nearly enter gutter. Your heart still dey beat fast.", "bad");
      }
    }
    this.maybeRandomEvent(0.15);
  }

  exchange(usd) {
    const s = this.s;
    usd = Math.floor(usd);
    if (usd <= 0 || usd > s.usd || s.place !== "mall") return false;
    const got = usd * s.fx;
    s.usd -= usd;
    s.naira += got;
    this.log(`💱 Changed $${usd} → ${naira(got)} at ${naira(s.fx)}/$.`, "good");
    return true;
  }

  // ---------- events ----------
  maybeRandomEvent(chance) {
    const s = this.s;
    if (s.over || s.event || this.rng() > chance) return;
    const pool = D.RANDOM_EVENTS.filter((e) => (!e.cond || e.cond(s)) && !s.recentEvents.includes(e.id));
    if (!pool.length) return;
    const total = pool.reduce((t, e) => t + e.weight, 0);
    let r = this.rng() * total;
    const ev = pool.find((e) => (r -= e.weight) < 0) || pool[0];
    s.recentEvents.unshift(ev.id);
    s.recentEvents.length = Math.min(s.recentEvents.length, 4);
    s.event = { id: ev.id, title: ev.title, icon: ev.icon, text: ev.text, choices: ev.choices.map((c, i) => ({ ...c, src: ev.id, idx: i })) };
  }

  canChoose(c) { return !c.cost || this.s.naira >= c.cost; }

  choose(i) {
    const s = this.s;
    if (!s.event) return;
    const c = s.event.choices[i];
    if (!c || !this.canChoose(c)) return;
    const title = s.event.title;
    s.event = null;
    // Functions don't survive save/load, so look the original choice up again.
    const live = c.src ? D.RANDOM_EVENTS.find((e) => e.id === c.src).choices[c.idx] : c;
    this.applyStats(c);
    if (live.apply) live.apply(s);
    if (c.relTo) for (const id in c.relTo) this.rel(id, c.relTo[id]);
    let extra = this.resolveSpecial(c) || "";
    if (c.memory) this.addMemory(c.memory);
    if (c.unlock) this.unlock(c.unlock);
    this.log(`${title} → ${c.label}.${extra}`, c.tone || "event");
    if (c.slots) this.advance(c.slots);
    if (c.end) this.finish(c.end);
    if (c.skipTo) this.skipTo(c.skipTo);
    this.checkAchievements();
    this.checkCalendar(); // a scheduled event may have been waiting behind this one
    this.checkCrisis();
  }

  resolveSpecial(c) {
    const s = this.s;
    const roll = this.rng();
    switch (c.special) {
      case "argue":
        if (roll < s.street / 100) { s.respect = clamp(s.respect + 3); return " They waved you on. Street sense don pay!"; }
        s.naira -= Math.min(s.naira, 10000); s.slotPenalty = 1;
        return " Big mistake. They held you for one hour and still collected ₦10k.";
      case "snatch":
        if (roll < 0.4 + s.street / 200) { s.clout = clamp(s.clout + 3, 0, 200); return " You held am like Chelsea defence. Phone safe!"; }
        s.naira -= Math.min(s.naira, 80000); this.applyFx({ peace: -15 });
        return " Dem collect am. You had to buy a new phone (−₦80,000).";
      case "streettalk":
        if (roll < s.street / 100 + 0.2) { s.street = clamp(s.street + 2); return " \"Ah, na our person!\" They let you pass free."; }
        s.naira -= Math.min(s.naira, 5000);
        return " Your accent betray you. They collected ₦5k.";
      case "forcesleep":
        this.s.place = "home";
        this.sleep();
        return "";
      default:
        return this.calendarSpecial(c);
    }
  }

  skipTo(day) {
    const s = this.s;
    while (s.day < day && !s.over) this.newDay();
    s.place = "home";
    this.checkCalendar();
  }

  checkCalendar() {
    const s = this.s;
    if (s.over || s.event) return;
    const ev = this.calendarEvent();
    if (ev) s.event = ev;
  }

  calendarEvent() {
    const s = this.s;
    const city = this.cityData().name;
    const P = (id) => D.PEOPLE.find((p) => p.id === id);
    const key = `${s.day}-${s.slot}`;
    if (s.flags["cal_" + key]) return null;
    const mark = () => { s.flags["cal_" + key] = true; };

    if (s.day === 1 && s.slot === 0) {
      mark();
      return {
        title: `Welcome to Detty December, ${s.name}!`, icon: "🎄",
        text: `It's 1st December in ${city}. Harmattan dey blow, Christmas lights dey blink, and the IJGBs are coming. ` +
          `Survive 31 days of owambes, traffic, black tax and pure enjoyment. Make memories, keep your family happy, and no let wahala finish you.`,
        choices: [{ label: "Let's gooo! 🇳🇬" }],
      };
    }
    // Airport arrivals: a heads-up on landing day.
    const landing = D.PEOPLE.filter((p) => p.from && p.arrives === s.day && !s.people[p.id].arrived);
    if (landing.length && s.slot === 0) {
      mark();
      const p = landing[0];
      return {
        title: `${p.name} Has Landed! ✈️`, icon: p.icon,
        text: `"I'm at ${this.cityData().places.airport.name}! Abeg come pick me, my data no work and the porters are looking at me somehow." — ${p.name}, from ${p.from}. Get to the airport before the day ends.`,
        choices: [
          { label: "On my way! (go to the airport)" },
          { label: "Send them a Bolt link (₦15k)", cost: 15000, relTo: { [p.id]: -6 }, special: "boltlink_" + p.id },
        ],
      };
    }
    const wd = new Date(D.YEAR, 11, s.day).getDay();
    if (wd === 6 && s.slot === 2 && s.day !== 26) {
      mark();
      const has = s.flags.asoebi;
      return {
        title: "Saturday Owambe! 🎊", icon: "💃🏾",
        text: `Your cousin's friend's sister's wedding is today. Live band, small chops, money spraying, and aunties tying gele like architecture.`,
        choices: [
          has ? { label: "Show up in your aso-ebi 💅", fx: { vibes: 30, social: 25, belle: 35, energy: -10 }, respect: 6, clout: 4, slots: 1, memory: `🎊 Owambe slay on ${s.day} Dec`, special: "owambe" }
            : { label: "Show up without aso-ebi 😬", fx: { vibes: 15, social: 15, belle: 30, energy: -10 }, respect: -4, slots: 1, special: "owambe" },
          { label: "Spray money on the couple (₦20k)", cost: 20000, fx: { vibes: 25, social: 20, belle: 30, energy: -10 }, respect: 8, clout: 5, slots: 1, memory: `💸 Sprayed money at an owambe`, special: "owambe" },
          { label: "Skip it, rest your legs", fx: { peace: 6 }, respect: -3 },
        ],
      };
    }
    if (s.day === 24 && s.slot === 0 && !s.flags.village) {
      mark();
      return {
        title: "To the Village for Christmas?", icon: "🛖",
        text: "Mama: \"The whole family is going to the village tomorrow. Your grandfather wants to see everybody. Bring the diaspora people too!\"",
        choices: [
          { label: "Go to the village (₦60k, back on the 26th)", cost: 60000, fx: { peace: 25, social: 30, vibes: 20, belle: 40 }, respect: 15, relTo: { mama: 15 }, rel: 8, memory: "🛖 Christmas in the village with Grandpa", unlock: "village", skipTo: 26, special: "village" },
          { label: "Stay in the city", respect: -8, relTo: { mama: -12 } },
        ],
      };
    }
    if (s.day === 25 && s.slot === 1 && !s.flags.village) {
      mark();
      let text = "Christmas Day! Everyone is gathering for lunch. ";
      text += s.flags.goat ? "The goat you bought is now pepper soup — legendary. " : "No goat?! Aunties are whispering. ";
      text += s.flags.gifts ? "Your gifts are under the tree and everybody's smiling." : "Nobody got gifts from you. Hmm.";
      const bonus = (s.flags.goat ? 10 : -5) + (s.flags.gifts ? 10 : -5);
      return {
        title: "Merry Christmas! 🎄", icon: "🎅🏾", text,
        choices: [
          { label: "Feast with the family", fx: { belle: 50, social: 35, vibes: 25, peace: 10 }, respect: bonus, rel: 10, slots: 1, memory: "🎄 Christmas lunch with the whole family" },
          { label: "Feast, then rush to a Christmas party", fx: { belle: 40, social: 30, vibes: 35, energy: -15 }, respect: bonus - 3, clout: 5, slots: 2, memory: "🎄 Christmas lunch + Christmas party" },
        ],
      };
    }
    if (s.day === 26 && s.slot === 0) {
      mark();
      if (D.arrivedCount(s) === 0) return null;
      return {
        title: "Tour Guide Duty", icon: "🗺️",
        text: `The diaspora crew wants you to show them "the real ${city}". Tobi wants street food, Chidi wants a spot for pictures, Aunty Funke wants to visit her old school.`,
        choices: [
          { label: "Full city tour (they pay in dollars)", fx: { social: 25, vibes: 20, energy: -20 }, rel: 8, slots: 2, special: "tour", memory: `🗺️ Gave the diaspora crew a ${city} tour` },
          { label: "Send them a Google Maps pin", rel: -5, fx: { peace: 5 } },
        ],
      };
    }
    if (s.day === 31 && s.slot === 3) {
      mark();
      const choices = [
        { label: "Crossover service in church 🙏", fx: { peace: 40, social: 20 }, respect: 12, memory: "🙏 Crossed over in church", end: "church" },
        { label: "Countdown party at the lounge 🍾 (₦50k)", cost: 50000, fx: { vibes: 45, social: 30 }, clout: 12, memory: "🍾 Countdown party into the new year", end: "party" },
        { label: "Home with family, fireworks & jollof 🎆", fx: { social: 30, peace: 20, vibes: 20 }, rel: 10, respect: 6, memory: "🎆 Crossover at home with family", end: "family" },
      ];
      if (s.people.kemi.rel >= 70) {
        choices.push({ label: "Cross over with Kemi 💞", fx: { vibes: 50, social: 40, peace: 20 }, relTo: { kemi: 20 }, unlock: "lover", memory: "💞 New Year's kiss with Kemi", end: "love" });
      }
      return {
        title: "Crossover Night!", icon: "🎆",
        text: "It's 31st December, 11pm. Fireworks are already popping. Where will you be when the clock hits midnight?",
        choices,
      };
    }
    return null;
  }

  // Specials attached to calendar-event choices
  calendarSpecial(c) {
    const s = this.s;
    if (c.special && c.special.startsWith("boltlink_")) {
      const id = c.special.slice(9);
      s.people[id].arrived = true;
      this.log(`🚗 ${D.PEOPLE.find((p) => p.id === id).name} took the Bolt you booked.`, "info");
    }
    if (c.special === "owambe") { s.flags.owambes++; }
    if (c.special === "village") { s.flags.village = true; }
    if (c.special === "tour") {
      const usd = 50 * D.arrivedCount(s);
      s.usd += usd;
      return ` They tipped you $${usd}.`;
    }
    return "";
  }

  checkAchievements() {
    const s = this.s;
    if (s.clout >= 100) this.unlock("influencer");
    if (s.street >= 80) this.unlock("streetsmart");
  }

  // ---------- ending ----------
  finish(kind) {
    const s = this.s;
    if (s.over) return;
    s.over = true;
    if (kind !== "slept") this.unlock("survivor");
    const relVals = Object.values(s.people).filter((p) => p.arrived).map((p) => p.rel);
    const avgRel = relVals.reduce((a, b) => a + b, 0) / relVals.length;
    const worth = s.naira + s.usd * s.fx;
    const parts = {
      memories: s.memories.length * 15,
      respect: Math.round(s.respect),
      clout: Math.round(Math.min(s.clout, 150)),
      family: Math.round(avgRel),
      mood: Math.round(this.mood() / 2),
      money: Math.round(clamp(worth / 20000, -50, 60)),
      achievements: s.achievements.length * 20,
    };
    const score = Object.values(parts).reduce((a, b) => a + b, 0);
    let title, blurb;
    if (kind === "slept") {
      title = "Slept Through Crossover 😴";
      blurb = "You woke up on 1st January to 47 missed calls and a family group chat full of fireworks videos. Wahala.";
    } else if (score >= 550) {
      title = "Detty December Legend 👑";
      blurb = "Songs will be sung about your December. The diaspora crew is already planning to come back next year — for YOU.";
    } else if (score >= 420) {
      title = "Certified Odogwu 🔥";
      blurb = "You balanced family, owambes and enjoyment like a true Naija pro. Respect.";
    } else if (score >= 300) {
      title = "Survived the Wahala 💪";
      blurb = "E no easy, but you made it to January in one piece. Mostly.";
    } else {
      title = "Wahala Magnet 🧲";
      blurb = "Traffic, black tax and NEPA teamed up against you. There's always next December.";
    }
    const endings = {
      church: "You crossed over in church, dancing to \"Onise Iyanu\" with Mama.",
      party: "You popped champagne as the clock hit 12. The DJ shouted your name.",
      family: "You watched fireworks from the balcony with the whole family, jollof plate in hand.",
      love: "At midnight, Kemi held your hand and said, \"This year, we try again.\" 💞",
      slept: "",
    };
    s.ending = { kind, title, blurb, scene: endings[kind], score, parts, worth };
    this.log(`🎆 HAPPY NEW YEAR! ${title}`, "achieve");
  }
}

if (typeof module !== "undefined") module.exports = { Game, naira, clamp };
else window.Game = Game, window.naira = naira;
