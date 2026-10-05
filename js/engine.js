// DECEMBER WAHALA — game engine. Pure state logic with no DOM, so the whole
// game can be simulated headlessly (see test/simulate.js).
/* global module, require */
(function (root) {
  const D = typeof module !== "undefined" ? require("./data.js") : root.DATA;

  const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
  const naira = (n) => (n < 0 ? "−₦" : "₦") + Math.abs(Math.round(n)).toLocaleString("en-NG");
  const round100 = (n) => Math.round(n / 100) * 100;

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

  // Named conditions, so saved events never hold functions.
  const COND = {
    lightOn: (g) => g.s.light,
    lightOff: (g) => !g.s.light,
    out: (g) => g.s.place !== "home",
    crewInTown: (g) => D.crewInTown(g.s),
    clout30: (g) => g.s.clout >= 30,
    clout60: (g) => g.s.clout >= 60,
    conn50: (g) => g.s.conn >= 50,
    concertDay: (g) => D.isConcertDay(g.s.day),
    arrivals: (g) => D.pendingArrivals(g.s).length > 0,
    lateDecember: (g) => g.s.day >= 15,
    visitor: (g) => !!D.PERSONAS[g.s.persona].visitor,
    canConfess: (g) => !g.s.exposed && !g.s.confessed && g.s.exposure >= 20 && g.s.persona !== "hustler",
  };

  class Game {
    constructor(state, seed) {
      this.s = state;
      this.rng = makeRng(seed);
    }

    // ---------------------------------------------------------- creation
    static create(opts, seed) {
      const P = D.PERSONAS[opts.persona];
      const area = D.AREAS[opts.city][opts.area];
      const npcs = {};
      D.NPCS.forEach((n) => { npcs[n.id] = { rel: n.rel, arrived: !n.from, secret: 0, state: null, romance: 0 }; });
      const s = {
        version: 2,
        name: opts.name || "Ada",
        look: opts.look,
        traits: opts.traits,
        goal: opts.goal,
        persona: opts.persona,
        city: opts.city,
        area: opts.area,
        day: 1, slot: 0, place: "home",
        needs: { energy: 85, belle: 70, vibes: 60 },
        naira: P.start.naira, usd: P.start.usd,
        clout: clamp(P.start.clout + (area.clout || 0), 0, 200),
        rep: P.start.rep,
        conn: clamp(P.start.conn + (area.conn || 0)),
        res: P.resource.start || 0,
        gossip: opts.persona === "aunty" ? P.resource.start : 0,
        exposure: 0, exposed: false, confessed: false,
        fx: 1550 + D.CITIES[opts.city].fxBias,
        light: true, genSlots: 0,
        wardrobe: [opts.look.style],
        npcs,
        flags: { bignights: 0, owambes: 0, owambeTrad: 0, jollof: 0, goat: false, gifts: 0, village: false, ab: {}, fit: {}, posted: 0, guy: false },
        memories: [], achievements: [], log: [], event: null, queue: [], recent: [], news: ["arrived"],
        slotPenalty: 0, over: false, ending: null, vibesLog: [],
      };
      const g = new Game(s, seed);
      if (P.visitor) {
        const stay = area.stay;
        g.payForced(stay, true);
        g.log(`🏨 You booked a place in ${area.name} for December (−${naira(stay)}).`, "action");
      }
      s.startWorth = g.worth();
      g.checkCalendar();
      return g;
    }

    // ---------------------------------------------------------- helpers
    get P() { return D.PERSONAS[this.s.persona]; }
    has(trait) { return this.s.traits.includes(trait); }
    worth() { return this.s.naira + this.s.usd * this.s.fx; }
    city() { return D.CITIES[this.s.city]; }
    areaData() { return D.AREAS[this.s.city][this.s.area]; }
    placeName(p = this.s.place) {
      if (p === "home") return `Home, ${this.areaData().name}`;
      return this.city().places[p].name;
    }
    log(text, type = "info") {
      this.s.log.unshift({ day: this.s.day, slot: this.s.slot, text, type });
      if (this.s.log.length > 100) this.s.log.length = 100;
    }
    hasPower() { return this.s.light || this.s.genSlots > 0; }
    mood() { const n = this.s.needs; return (n.energy + n.belle + n.vibes) / 3; }
    news(type) { (this.s.news = this.s.news || []).push(type); }
    takeNews() { const n = this.s.news || []; this.s.news = []; return n; }
    addMemory(t) { if (t && !this.s.memories.includes(t)) this.s.memories.push(t); }
    unlock(id) {
      if (this.s.achievements.includes(id)) return;
      this.s.achievements.push(id);
      const a = D.ACHIEVEMENTS[id];
      this.log(`🏆 ${a.icon} ${a.name}`, "achieve");
      const news = { baller: "vip", concert: "concert", bigbreak: "bigbreak", influencer: "viral" }[id];
      if (news) this.news(news);
    }
    resKey() { return this.s.persona === "ijgb" ? "usd" : this.s.persona === "aunty" ? "gossip" : "res"; }

    applyFx(fx = {}) {
      for (const k in fx) {
        let v = fx[k];
        if (k === "energy" && v < 0 && this.has("nightcrawler") && this.s.slot >= 2) v = Math.round(v * 0.6);
        this.s.needs[k] = clamp(this.s.needs[k] + v);
      }
    }
    addStat(k, n) {
      if (!n) return;
      const s = this.s;
      if (n > 0) {
        if (k === "rep") n *= (this.has("peacemaker") ? 1.3 : 1) * (this.has("stingy") ? 0.8 : 1);
        if (k === "conn" && this.has("smooth")) n *= 1.25;
        if (k === "clout" && this.has("clout")) n *= 1.2;
      }
      n = Math.round(n);
      if (k === "clout") s.clout = clamp(s.clout + n, 0, 200);
      else if (k === "rep" || k === "conn") s[k] = clamp(s[k] + n);
      else if (k === "res") s.res = clamp(s.res + n);
      else if (k === "gossip") s.gossip = Math.max(0, s.gossip + n);
    }
    addExposure(n) {
      const s = this.s;
      if (!n || s.exposed || s.confessed || s.persona === "hustler") return;
      s.exposure = clamp(s.exposure + n);
      if (s.exposure >= 100 && !s.flags.exposedQueued) { s.flags.exposedQueued = true; this.queue(this.exposedEvent()); }
    }
    relAll(n) {
      for (const id in this.s.npcs) if (this.s.npcs[id].arrived) this.rel(id, n);
    }
    rel(id, n) { this.s.npcs[id].rel = clamp(this.s.npcs[id].rel + n); }

    // ---------------------------------------------------------- money
    price(base, a) {
      if (!base) return 0;
      const s = this.s;
      let m = 1;
      if (s.persona === "ijgb" && !s.exposed) m *= 1.25;
      if (this.has("stingy")) m *= 0.85;
      if (this.has("bigspender") && a && (a.place === "lounge" || a.place === "venue")) m *= 1.1;
      if (s.persona === "aunty" && a && (a.place === "market" || a.place === "hall")) m *= 0.7;
      if (s.flags.guy) m *= 0.5;
      return round100(base * m);
    }
    actionCost(a) {
      if (a.id === "vip" && this.s.flags.freeVip) return 0;
      if (a.id === "concert" && this.s.flags.freeConcert) return 0;
      return this.price(a.cost, a);
    }
    canAfford(n) {
      if (n <= 0) return true;
      const s = this.s;
      return s.naira >= n || (s.persona === "ijgb" && s.naira + s.usd * s.fx >= n);
    }
    pay(n) {
      const s = this.s;
      if (n <= 0) return;
      if (s.naira >= n) { s.naira -= n; return; }
      if (s.persona === "ijgb") {
        const rem = n - Math.max(0, s.naira);
        s.naira = Math.min(s.naira, 0);
        s.usd = Math.max(0, s.usd - Math.ceil(rem / s.fx));
        return;
      }
      s.naira -= n;
    }
    // Pays what it can. Used for penalties that can't be refused.
    payForced(n, anyCurrency) {
      const s = this.s;
      if (anyCurrency || s.persona === "ijgb") { this.payAny(n); return; }
      s.naira -= Math.min(Math.max(0, s.naira), n);
    }
    payAny(n) {
      const s = this.s;
      if (s.naira >= n) { s.naira -= n; return; }
      const rem = n - Math.max(0, s.naira);
      s.naira = Math.min(s.naira, 0);
      s.usd = Math.max(0, s.usd - Math.ceil(rem / s.fx));
    }

    // ---------------------------------------------------------- time
    advance(n) {
      const s = this.s;
      n += s.slotPenalty;
      s.slotPenalty = 0;
      for (let i = 0; i < n && !s.over; i++) {
        this.decay();
        s.slot++;
        if (s.slot > 3) {
          this.log("You never slept. Your body is feeling it.", "bad");
          this.applyFx({ energy: -20, vibes: -5 });
          this.newDay();
        }
        this.checkCalendar();
        if (s.event) break;
      }
      this.checkCrisis();
    }

    decay() {
      const s = this.s;
      for (const k in D.DECAY) s.needs[k] = clamp(s.needs[k] - D.DECAY[k] - (k === "vibes" && this.has("owambe") ? 2 : 0));
      if (!this.hasPower() && s.place === "home") s.needs.vibes = clamp(s.needs.vibes - 3);
      if (s.genSlots > 0) s.genSlots--;
    }

    newDay() {
      const s = this.s;
      D.NPCS.forEach((n) => {
        const st = s.npcs[n.id];
        if (n.from && !st.arrived && n.arrives <= s.day) {
          st.arrived = true;
          st.rel = clamp(st.rel - 15);
          this.addStat("rep", -5);
          this.log(`${n.name} waited at the airport for hours and took a Bolt. They are NOT happy.`, "bad");
        }
      });
      s.vibesLog.push(Math.round(s.needs.vibes));
      // Persona pressure that builds day by day.
      const p = s.persona;
      if (p === "ijgb" && this.worth() < 400000) this.addExposure(6);
      if (p === "influencer") {
        if (s.flags.posted !== s.day) { s.res = clamp(s.res - 12); this.log("📉 No post today. Engagement is dropping.", "bad"); }
        if (s.res < 30) this.addStat("clout", -4);
        if (s.naira < 60000) this.addExposure(3);
      }
      if (p === "pikin") this.addExposure(1);
      if (["wannabe", "japa", "firsttimer", "aunty"].includes(p) && s.exposure > 0) s.exposure = clamp(s.exposure - 2);

      s.day++;
      s.slot = 0;
      s.fx = clamp(s.fx + Math.round((this.rng() - 0.45) * 60), 1350, 1850);
      if (s.day > 31) { this.finish("slept"); return; }
      this.log(`📅 ${D.weekday(s.day)}, ${s.day} December. $1 = ${naira(s.fx)}.`, "day");
    }

    sleep() {
      const s = this.s;
      const power = this.hasPower();
      this.decay();
      this.applyFx({ energy: (power ? 75 : 45) + (this.has("lazy") ? 15 : 0), vibes: power ? 4 : -6 });
      this.log(power ? "😴 You slept well with the fan running." : "🦟 No light. Heat and mosquitoes dealt with you all night.", power ? "good" : "bad");
      if (s.day === 31) { s.slot = 3; this.checkCalendar(); return; }
      this.newDay();
      this.checkCalendar();
    }

    checkCrisis() {
      const s = this.s;
      if (s.over || s.event) return;
      if (s.needs.belle <= 0) {
        this.queue({ title: "Hunger Don Wire You!", icon: "😵", text: "You collapse on the road. Kind strangers buy you agege bread and malt.",
          choices: [{ label: "Eat like it's your last meal", fx: { belle: 35, vibes: -10 }, forced: 3000 }] });
      } else if (s.needs.energy <= 0) {
        this.queue({ title: "Body No Be Firewood", icon: "🥱", text: "You passed out from exhaustion and woke up in your own bed. Who carried you?",
          choices: [{ label: "Wake up groggy", special: "forcesleep" }] });
      }
    }

    // ---------------------------------------------------------- actions
    actionsHere() {
      return D.ACTIONS.filter((a) => a.place === this.s.place).map((a) => ({ a, why: this.blocked(a), cost: this.actionCost(a) }));
    }

    blocked(a) {
      const s = this.s;
      if (a.cond && !COND[a.cond](this)) return "Not available right now";
      if (a.id === "sleep" && s.day === 31) return "Sleep? On crossover day?!";
      if (a.night && s.slot < 2) return "Opens in the evening";
      if (a.premium && !["ijgb", "pikin"].includes(s.persona) && s.clout < 100 && !(a.id === "vip" && s.flags.freeVip)) return "Big money only (or 100 clout)";
      const cost = this.actionCost(a);
      if (cost && !this.canAfford(cost)) return `Need ${naira(cost)}`;
      if (a.style && s.wardrobe.includes(a.style)) return "Already in your wardrobe";
      if (a.fx && a.fx.energy < 0 && s.needs.energy + a.fx.energy < 0) return "Too tired";
      if (a.slots >= 2 && s.slot + a.slots > 4) return "Not enough time left today";
      return null;
    }

    doAction(id) {
      const s = this.s;
      if (s.over || s.event) return;
      const a = D.ACTIONS.find((x) => x.id === id);
      if (!a || a.place !== s.place || this.blocked(a)) return;
      if (a.special === "sleep") { this.sleep(); this.flush(); return; }
      if (a.special === "bdc") return;
      if (a.special === "shop") { this.openShop(); return; }

      const cost = this.actionCost(a);
      if (cost) { this.pay(cost); if (s.flags.guy) { s.flags.guy = false; this.log("📞 Your guy came through. Half price!", "good"); } }
      if (a.id === "vip" && s.flags.freeVip) s.flags.freeVip = false;
      if (a.id === "concert" && s.flags.freeConcert) s.flags.freeConcert = false;

      const fx = { ...(a.fx || {}) };
      if (a.big && fx.vibes) fx.vibes = Math.round(fx.vibes * (this.has("bigspender") ? 1.3 : 1) * (this.has("owambe") ? 1.4 : 1));
      if (a.food) { if (fx.belle) fx.belle = Math.round(fx.belle * (this.has("foodie") ? 1.3 : 1)); if (this.has("foodie")) fx.vibes = (fx.vibes || 0) + 6; }
      if (a.special === "church" && this.has("prayer")) { fx.vibes = (fx.vibes || 0) * 2; this.addStat("rep", 2); }
      this.applyFx(fx);
      this.addStat("clout", a.clout);
      this.addStat("rep", a.rep);
      this.addStat("conn", a.conn);
      if (a.gossip) this.addStat("gossip", a.gossip);
      if (a.relAll) this.relAll(a.relAll);
      if (a.culture && s.persona === "firsttimer") this.addStat("res", a.culture);
      if (a.big) s.flags.bignights++;
      if (a.cheap && s.persona === "influencer") this.addExposure(2);

      let msg = `${a.icon} ${a.name}.`;
      if (a.gig) msg += this.gig(a);
      msg += this.special(a) || "";
      msg += this.fitCheck(a) || "";
      this.log(msg + (cost ? ` (−${naira(cost)})` : ""), "action");
      if (a.memory) this.addMemory(`${a.memory} · ${s.day} Dec`);
      this.advance(a.slots);
      this.checkAchievements();
      this.maybeRandomEvent(0.3);
      this.flush();
    }

    gig(a) {
      const s = this.s;
      let mult = s.persona === "hustler" ? 1 + s.res / 100 : 0.8;
      if (this.has("hustlebrain")) mult *= 1.25;
      if (this.has("lazy")) mult *= 0.8;
      if (a.special === "resale") {
        const win = this.rng() < 0.5 + s.conn / 200;
        if (!win) { this.applyFx({ vibes: -8 }); return " The tickets didn't move. Money gone."; }
      }
      const pay = round100(a.gig * mult * (0.85 + this.rng() * 0.3));
      s.naira += pay;
      if (s.persona === "hustler") {
        this.addStat("res", 6);
        if (s.needs.energy <= 20) { s.slotPenalty = 1; this.applyFx({ vibes: -10 }); this.log("🥵 Burnout! You need to rest before you crash.", "bad"); }
      }
      if (s.persona === "influencer") this.addExposure(3);
      return ` You made ${naira(pay)}.`;
    }

    fitCheck(a) {
      const s = this.s;
      if (a.gig || a.place === "home" || a.slots === 0) return "";
      const style = D.STYLES[s.look.style];
      const key = `${s.day}-${a.place}`;
      if (!style.shines.includes(a.place) || s.flags.fit[key]) return "";
      s.flags.fit[key] = true;
      this.addStat("clout", 3);
      this.applyFx({ vibes: 5 });
      return " 💅🏾 Your fit ate!";
    }

    special(a) {
      const s = this.s;
      switch (a.special) {
        case "gen": s.genSlots += 8; return " The gen roared to life.";
        case "cook":
          s.flags.jollof++;
          if (D.crewInTown(s)) this.relAll(4);
          if (s.flags.jollof >= 3) this.unlock("jollof");
          return " Party jollof with the perfect bottom-pot. 🔥";
        case "buystyle": this.addStyle(a.style); return ` ${D.STYLES[a.style].name} added to your wardrobe.`;
        case "goat": {
          const p = this.price(Math.max(60000, 160000 - this.streetSense() * 1000));
          if (!this.canAfford(p)) { this.applyFx({ vibes: -5 }); return ` The seller wants ${naira(p)}. You don't have it. Even the goat laughed.`; }
          this.pay(p); s.flags.goat = true; this.addStat("rep", 8); this.unlock("goat");
          return ` You got it for ${naira(p)}. The goat is now judging you from the compound.`;
        }
        case "gifts":
          s.flags.gifts++; this.relAll(4); this.addStat("rep", 5);
          return " Wrapped gifts for everybody — even the cousin who never greets.";
        case "vip": this.unlock("baller"); return "";
        case "concert": this.unlock("concert"); return "";
        case "pickup": {
          const list = D.pendingArrivals(s);
          list.forEach((n) => {
            s.npcs[n.id].arrived = true;
            this.rel(n.id, 15);
            this.addStat("rep", 4);
            this.addMemory(`🛬 Picked up ${n.name} from ${n.from}`);
          });
          s.flags.pickups = (s.flags.pickups || 0) + list.length;
          if (s.flags.pickups >= D.NPCS.filter((n) => n.from).length) this.unlock("airport");
          this.applyFx({ vibes: 12 });
          return ` Hugs, screams and ${list.length * 2} heavy suitcases.`;
        }
        case "crash": {
          const chance = 0.55 + (s.look.style === "tradfusion" ? 0.25 : 0) + (this.has("smooth") ? 0.15 : 0);
          if (this.rng() < chance) {
            this.applyFx({ vibes: 22, belle: 35 }); this.addStat("conn", 4); this.addStat("gossip", 1);
            this.addMemory(`🕺🏾 Crashed a wedding and nobody noticed · ${s.day} Dec`);
            return " You blended in perfectly. Jollof, small chops, and you even got a souvenir.";
          }
          this.applyFx({ vibes: -10, belle: 10 }); this.addStat("rep", -6);
          return " The bride's mother asked which side you're from. You said \"both.\" Security walked you out.";
        }
        case "confess": {
          s.confessed = true; s.exposure = 0;
          this.addStat("rep", 6); this.addStat("clout", -8); this.applyFx({ vibes: 12 });
          this.addMemory("🫣 Came clean to the family");
          return ` You told them: "${this.P.secret}" They hugged you. It feels lighter.`;
        }
        default: return "";
      }
    }

    streetSense() {
      const base = { hustler: 70, aunty: 60, wannabe: 50, pikin: 30, influencer: 40, japa: 35, ijgb: 15, firsttimer: 10 }[this.s.persona];
      return base + (this.s.persona === "firsttimer" ? this.s.res / 2 : 0);
    }

    addStyle(style) {
      if (!this.s.wardrobe.includes(style)) this.s.wardrobe.push(style);
      if (this.s.wardrobe.length >= 4) this.unlock("wardrobe");
    }

    wear(style) {
      const s = this.s;
      if (s.place !== "home" || !s.wardrobe.includes(style) || s.event) return false;
      s.look = { ...s.look, style, gele: style === "tradfusion" ? s.look.gele : false };
      this.log(`👗 You changed into your ${D.STYLES[style].name} fit.`, "action");
      return true;
    }

    openShop() {
      const s = this.s;
      const choices = Object.entries(D.STYLES).filter(([k]) => !s.wardrobe.includes(k)).map(([k, st]) => ({
        label: `${st.icon} ${st.name}`, note: st.blurb, cost: this.price(st.price, { place: "mall" }), buyStyle: k, slots: 1,
      }));
      choices.push({ label: "Just window-shop" });
      this.queue({ title: "Fit Shopping", icon: "🛍️", text: "Which look are you adding to your wardrobe? Each one shines in different places.", choices });
      this.flush();
    }

    exchange(usd) {
      const s = this.s;
      usd = Math.floor(usd);
      if (usd <= 0 || usd > s.usd || s.place !== "mall") return false;
      const got = usd * s.fx;
      s.usd -= usd;
      s.naira += got;
      this.log(`💱 Changed $${usd} into ${naira(got)} at ${naira(s.fx)}/$.`, "good");
      return true;
    }

    travel(place, mode) {
      const s = this.s;
      if (s.over || s.event || place === s.place || !this.city().places[place]) return;
      const t = D.TRANSPORT[mode];
      const far = place === "airport" || s.place === "airport";
      const cost = round100(t.cost * this.areaData().travel * (far ? 2 : 1));
      if (cost && !this.canAfford(cost)) { this.log(`Not enough money for ${t.name} (${naira(cost)}).`, "bad"); return; }
      this.pay(cost);
      this.applyFx({ energy: t.energy });
      if (t.cheap || t.walk) { if (s.persona === "influencer") this.addExposure(3); }
      const from = this.placeName();
      s.place = place;
      const chance = (this.city().trafficChance + (this.areaData().traffic || 0) + (s.slot === 2 ? 0.15 : 0)) * t.trafficMod;
      if (t.walk) {
        this.log(`🚶🏾 You trekked from ${from} to ${this.placeName()}. Your legs are not happy.`, "action");
        this.advance(1);
      } else if (this.rng() < chance) {
        this.applyFx({ energy: -6, vibes: -8 });
        const where = s.city === "lagos" ? "Third Mainland Bridge" : "Kubwa Expressway";
        this.log(`🚦 Go-slow on ${where}! ${from} → ${this.placeName()} took forever. (−${naira(cost)})`, "bad");
        this.advance(1);
      } else {
        this.log(`${t.icon} ${from} → ${this.placeName()} by ${t.name}. Smooth! (−${naira(cost)})`, "action");
        if (mode === "okada" && this.rng() < 0.1) { this.applyFx({ energy: -10, vibes: -10 }); this.log("🏍️ The okada man nearly entered a gutter.", "bad"); }
      }
      this.maybeRandomEvent(0.15);
      this.flush();
    }

    // ---------------------------------------------------------- persona ability
    abilityUses() { return this.s.flags.ab[this.s.day] || 0; }
    abilityBlocked() {
      const s = this.s, P = this.P;
      if (s.over || s.event) return "Busy";
      if (this.abilityUses() >= P.ability.perDay) return "Used up for today";
      switch (s.persona) {
        case "ijgb": return s.usd < 100 ? "Need $100" : null;
        case "wannabe": return s.exposed ? "Your cover is blown" : null;
        case "japa": return s.needs.energy < 10 ? "Too tired" : null;
        case "hustler": return s.res < 15 ? "Need 15 hustle" : s.flags.guy ? "Already lined up" : null;
        case "pikin": return s.res < 25 ? "Need 25 influence" : null;
        case "aunty": return s.gossip < 1 ? "No gossip to trade" : null;
        default: return null;
      }
    }
    useAbility() {
      const s = this.s;
      if (this.abilityBlocked()) return;
      s.flags.ab[s.day] = this.abilityUses() + 1;
      let msg = "";
      let slots = 0;
      switch (s.persona) {
        case "ijgb":
          s.usd -= 100; this.applyFx({ vibes: 15 }); this.addStat("clout", 8); this.addStat("rep", 2); this.addStat("conn", 2);
          this.addMemory("💵 Made it rain dollars");
          msg = "💵 You sprayed $100. The whole place is chanting your name.";
          break;
        case "wannabe":
          this.addStat("clout", 10); this.addStat("res", -8); this.addExposure(6);
          msg = "🕶️ \"Back in London, we used to…\" Your story is doing numbers.";
          break;
        case "japa": {
          const gain = 4 + Math.round(s.res / 20);
          this.applyFx({ energy: -8 }); this.addStat("conn", gain); this.addStat("rep", 4); this.addStat("res", 4);
          msg = "📄 You walked three people through the visa process. They're calling you 'Oga'.";
          slots = 1;
          break;
        }
        case "firsttimer":
          this.applyFx({ belle: 30, vibes: 6 }); this.addStat("res", 8); this.addStat("rep", 2); s.flags.hint = true;
          msg = "🤗 An aunty fed you egusi and explained everything. Next culture test, you'll know what to do.";
          slots = 1;
          break;
        case "hustler":
          this.addStat("res", -15); s.flags.guy = true;
          msg = "📞 \"I know a guy.\" Your next purchase is half price.";
          break;
        case "influencer": {
          let gain = 4 + (D.STYLES[s.look.style].shines.includes(s.place) ? 4 : 0) + (s.place === "home" ? -2 : 2);
          if (this.has("clout")) gain = Math.round(gain * 1.5 / 1.2);
          this.addStat("clout", gain); s.res = clamp(s.res + 15); s.flags.posted = s.day;
          msg = `🤳🏾 Posted from ${this.placeName()}. +${gain} clout.`;
          if (s.clout >= 60 && this.rng() < 0.25 && !s.flags.freeVip) { s.flags.freeVip = true; msg += " A lounge DM'd you: free VIP table tonight!"; }
          break;
        }
        case "pikin":
          s.naira += 200000; this.addStat("res", -25); this.addExposure(12);
          msg = "💳 Daddy sent ₦200k. \"Don't spend it all.\" (You will.)";
          break;
        case "aunty":
          this.addStat("gossip", -1); this.addStat("conn", 8); this.addStat("rep", -1); s.flags.guy = true; this.addExposure(8);
          msg = "🗣️ You traded some juicy gist for a favour. Next purchase is half price.";
          break;
      }
      this.log(msg, "good");
      if (slots) this.advance(slots);
      this.checkAchievements();
      this.flush();
    }

    // ---------------------------------------------------------- people
    npcPlace(n, idx) {
      const s = this.s;
      const st = s.npcs[n.id];
      if (!st.arrived) return null;
      const h = (s.day * 7 + s.slot * 13 + idx * 29 + s.day * idx) % n.places.length;
      return n.places[h];
    }
    peopleHere() {
      return D.NPCS.filter((n, i) => this.npcPlace(n, i) === this.s.place);
    }
    peopleAt(place) {
      return D.NPCS.filter((n, i) => this.npcPlace(n, i) === place);
    }
    npcActions(id) {
      const s = this.s;
      const n = D.NPCS.find((x) => x.id === id);
      const st = s.npcs[id];
      const out = [
        { id: "gist", label: "Gist", icon: "💬", desc: "+relationship, small hints" },
        { id: "treat", label: "Treat them", icon: "🍹", desc: naira(this.price(15000)), cost: this.price(15000) },
      ];
      if (st.secret < 100) out.push({ id: "investigate", label: "Investigate", icon: "🕵🏾", desc: "Dig into their story" });
      if (n.romance && st.rel >= 55) out.push({ id: "date", label: "Take on a date", icon: "💞", desc: naira(this.price(35000)), cost: this.price(35000) });
      if (st.secret >= 100 && !st.state) {
        out.push({ id: "protect", label: "Keep their secret", icon: "🤐", desc: "Loyalty pays" });
        out.push({ id: "expose", label: "Expose them", icon: "📣", desc: "Clout now, trust later" });
      }
      return out.map((o) => ({ ...o, why: this.npcBlocked(o) }));
    }
    npcBlocked(o) {
      if (o.cost && !this.canAfford(o.cost)) return `Need ${naira(o.cost)}`;
      if (this.s.needs.energy < 4) return "Too tired";
      return null;
    }
    interact(id, act) {
      const s = this.s;
      if (s.over || s.event) return;
      const n = D.NPCS.find((x) => x.id === id);
      if (!n || !this.peopleHere().includes(n)) return;
      const o = this.npcActions(id).find((x) => x.id === act);
      if (!o || o.why) return;
      const st = s.npcs[id];
      const dig = (amt) => {
        const before = st.secret;
        st.secret = clamp(st.secret + amt * (this.has("gossip") ? 2 : 1) * (s.persona === "aunty" ? 1.5 : 1));
        if (before < 100 && st.secret >= 100) {
          this.unlock("detective");
          if (s.persona === "aunty") this.addStat("gossip", 1);
          return ` 🕵🏾 You found out: ${n.secret}`;
        }
        return st.secret >= 60 && before < 60 ? " Something about their story doesn't add up…" : "";
      };
      let msg = "";
      switch (act) {
        case "gist":
          this.rel(id, 8); this.addStat("conn", 2); this.applyFx({ vibes: 6, energy: -3 });
          if (n.romance && st.rel >= 60) st.romance = clamp(st.romance + 5);
          msg = `💬 You gisted with ${n.name}.` + dig(10);
          break;
        case "treat":
          this.pay(o.cost); this.rel(id, 14); this.applyFx({ vibes: 10, belle: 15 });
          msg = `🍹 You treated ${n.name}. (−${naira(o.cost)})`;
          break;
        case "investigate":
          this.rel(id, -4); this.applyFx({ energy: -5 });
          msg = `🕵🏾 You asked around about ${n.name}.` + dig(30);
          break;
        case "date":
          this.pay(o.cost); this.rel(id, 10); st.romance = clamp(st.romance + 20); this.applyFx({ vibes: 20 });
          this.addMemory(`💞 Date with ${n.name} · ${s.day} Dec`);
          msg = st.romance >= 60 ? `💞 ${n.name} held your hand all evening. This is getting serious.` : `💞 Date with ${n.name}. They laughed at all your jokes.`;
          break;
        case "expose":
          st.state = "exposed"; this.rel(id, -60);
          this.addStat("clout", 18); this.addStat("rep", this.has("peacemaker") ? -20 : -10); this.addStat("conn", -5);
          if (s.persona === "aunty") this.addExposure(15);
          this.unlock("snitch"); this.addMemory(`📣 Exposed ${n.name}`);
          msg = `📣 You told everyone: ${n.secret} The blogs picked it up within the hour.`;
          break;
        case "protect": {
          st.state = "protected"; this.rel(id, 25); this.addStat("rep", 6); this.addStat("conn", 6);
          this.unlock("loyal"); this.addMemory(`🤐 Kept ${n.name}'s secret`);
          const f = n.favour;
          if (f.usd) s.usd += f.usd;
          if (f.conn) this.addStat("conn", f.conn);
          if (f.rep) this.addStat("rep", f.rep);
          if (f.clout) this.addStat("clout", f.clout);
          if (f.vibes) this.applyFx({ vibes: f.vibes });
          if (f.flag) s.flags[f.flag] = true;
          if (f.style) this.addStyle(f.style);
          msg = `🤐 You promised ${n.name} it stays between you. ${f.text}`;
          break;
        }
      }
      this.log(msg, act === "expose" ? "bad" : "good");
      this.advance(act === "protect" || act === "expose" ? 0 : 1);
      this.checkAchievements();
      this.maybeRandomEvent(0.15);
      this.flush();
    }

    // ---------------------------------------------------------- other real players
    // After the server accepts an action on another player, apply your side of it.
    remoteAction(r) {
      const s = this.s;
      if (s.over || s.event) return;
      const who = "@" + r.target;
      let msg;
      if (r.action === "gist") { this.applyFx({ vibes: 6, energy: -3 }); this.addStat("conn", 2); msg = `💬 You gisted with ${who}.`; }
      else if (r.action === "investigate") { this.applyFx({ energy: -5 }); msg = `🕵🏾 You asked around about ${who}.`; }
      else if (r.action === "expose") { msg = `📣 You exposed ${who}. The blogs picked it up within the hour.`; this.unlock("snitch"); this.addMemory(`📣 Exposed ${who}`); if (s.persona === "aunty") this.addExposure(15); }
      else { msg = `🤐 You promised ${who} their secret is safe with you.`; this.unlock("loyal"); this.addMemory(`🤐 Kept ${who}'s secret`); }
      const e = r.effects || {};
      this.addStat("clout", e.clout); this.addStat("rep", e.rep); this.addStat("conn", e.conn);
      if (r.revealed) {
        msg += ` 🕵🏾 You found out: they're really a ${r.truth.personaName}. "${r.truth.secret}"`;
        this.unlock("detective");
        s.flags.playerSecrets = (s.flags.playerSecrets || 0) + 1;
        if (s.persona === "aunty") this.addStat("gossip", 1);
      }
      this.log(msg, r.action === "expose" ? "bad" : "good");
      this.advance(r.action === "expose" || r.action === "protect" ? 0 : 1);
      this.checkAchievements();
      this.flush();
    }

    // Things other players did to you while you were away.
    applyInbox(items) {
      const s = this.s;
      for (const it of items) {
        const who = it.from_username ? "@" + it.from_username : "Someone";
        if (it.kind === "gist") { this.addStat("conn", 1); this.log(`💬 ${who} was gisting with you.`, "info"); }
        else if (it.kind === "discovered") { this.addExposure(10); this.log(`🕵🏾 ${who} found out your secret. Watch your back.`, "bad"); }
        else if (it.kind === "protected") { this.addStat("conn", 8); this.addStat("rep", 3); this.log(`🤐 ${who} knows your secret, and promised to keep it. Real one.`, "good"); }
        else if (it.kind === "exposed") {
          this.log(`📣 ${who} EXPOSED you to the whole city!`, "bad");
          if (!s.exposed && !s.confessed && s.persona !== "hustler") { s.exposure = 99; this.addExposure(1); }
          else { this.addStat("clout", -10); this.addStat("rep", -5); }
        }
      }
      this.flush();
    }

    // ---------------------------------------------------------- events
    queue(ev) { this.s.queue.push(ev); }
    flush() {
      const s = this.s;
      if (!s.event && s.queue.length && !s.over) s.event = s.queue.shift();
    }

    maybeRandomEvent(chance) {
      const s = this.s;
      if (s.over || s.event || s.queue.length || this.rng() > chance) return;
      if (this.has("prayer") && this.rng() < 0.12) { this.log("🙏🏾 Wahala was looking for you today, but God caught it.", "good"); return; }
      const pool = D.RANDOM_EVENTS.filter((e) => (!e.persona || e.persona === s.persona) && (!e.cond || COND[e.cond](this)) && !s.recent.includes(e.id));
      if (!pool.length) return;
      const w = (e) => e.weight * (e.persona ? 1.6 : 1) * (s.persona === "ijgb" && s.exposed && e.persona === "ijgb" ? 0.2 : 1);
      const total = pool.reduce((t, e) => t + w(e), 0);
      let r = this.rng() * total;
      const ev = pool.find((e) => (r -= w(e)) < 0) || pool[0];
      s.recent.unshift(ev.id);
      s.recent.length = Math.min(s.recent.length, 6);
      const choices = ev.choices.map((c) => ({ ...c }));
      if (ev.daddy && s.persona === "pikin" && s.res >= 20) {
        choices.push({ label: "📞 \"Daddy will handle it\"", res: -20, exposure: 12, rep: 4, text: "One phone call. Problem gone." });
      }
      if (s.flags.hint && ev.persona === "firsttimer") {
        choices.forEach((c) => { if (c.culture > 0) c.label = "⭐ " + c.label; });
        s.flags.hint = false;
      }
      this.queue({ id: ev.id, title: ev.title, icon: ev.icon, text: ev.text, choices });
    }

    canChoose(c) {
      const s = this.s;
      if (c.cost && !this.canAfford(c.cost)) return false;
      if (c.usd && s.usd < c.usd) return false;
      if (c.res && c.res < 0 && s.persona === "pikin" && s.res + c.res < 0) return false;
      return true;
    }

    applyOutcome(o) {
      const s = this.s;
      if (o.cost) this.pay(o.cost);
      if (o.forced) this.payForced(o.forced);
      if (o.usd) s.usd = Math.max(0, s.usd - o.usd);
      if (o.naira) s.naira += o.naira;
      if (o.gig) s.naira += round100(o.gig * (s.persona === "hustler" ? 1 + s.res / 100 : 0.8) * (this.has("hustlebrain") ? 1.25 : 1));
      if (o.fx) this.applyFx(o.fx);
      ["clout", "rep", "conn", "gossip"].forEach((k) => this.addStat(k, o[k]));
      if (o.res) {
        if (s.persona === "ijgb" || s.persona === "aunty") { /* other personas' resource fields do nothing here */ } else this.addStat("res", o.res);
      }
      if (o.culture) {
        if (s.persona === "firsttimer") { this.addStat("res", o.culture); if (o.culture < 0) this.addExposure(4); }
      }
      if (o.exposure) this.addExposure(o.exposure);
      if (o.ijgbExposure && s.persona === "ijgb") this.addExposure(o.ijgbExposure);
      if (o.relAll) this.relAll(o.relAll);
      if (o.relTo) for (const id in o.relTo) this.rel(id, o.relTo[id]);
      if (o.gen) s.genSlots += o.gen;
      if (o.flag === "lightOff") s.light = false;
      if (o.flag === "lightOn") s.light = true;
      if (o.big) s.flags.bignights++;
      if (o.memory) this.addMemory(o.memory);
      if (o.unlock) this.unlock(o.unlock);
      if (o.news) this.news(o.news);
      if (o.slots) s.slotPenalty += o.slots;
    }

    choose(i) {
      const s = this.s;
      const ev = s.event;
      if (!ev) return;
      const c = ev.choices[i];
      if (!c || !this.canChoose(c)) return;
      s.event = null;
      let text = c.text ? " " + c.text : "";
      if (c.roll) {
        const r = c.roll;
        const val = r.use === "street" ? this.streetSense() : r.use === "clout" ? s.clout : r.use === "res" ? s.res : s.conn;
        const p = r.base + val / 100 + (this.has("smooth") ? 0.2 : 0);
        const out = this.rng() < p ? r.win : r.lose;
        this.applyOutcome(out);
        text = " " + out.text;
      } else {
        this.applyOutcome(c);
      }
      if (c.buyStyle) {
        this.addStyle(c.buyStyle);
        text = ` ${D.STYLES[c.buyStyle].name} is now in your wardrobe. Change at home.`;
      }
      text += this.resolveSpecial(c) || "";
      this.log(`${ev.icon} ${ev.title} → ${c.label}.${text}`, c.tone || "event");
      if (c.end) { this.finish(c.end); return; }
      if (c.skipTo) this.skipTo(c.skipTo);
      if (s.slotPenalty) { const n = s.slotPenalty; s.slotPenalty = 0; this.advance(n); }
      this.checkAchievements();
      this.checkCalendar();
      this.checkCrisis();
      this.flush();
    }

    resolveSpecial(c) {
      const s = this.s;
      if (!c.special) return "";
      if (c.special === "forcesleep") { s.place = "home"; this.sleep(); return ""; }
      if (c.special.startsWith("bolt_")) {
        const id = c.special.slice(5);
        s.npcs[id].arrived = true;
        return ` ${D.NPCS.find((n) => n.id === id).name} took the Bolt you booked.`;
      }
      if (c.special === "owambe") { s.flags.owambes++; if (s.look.style === "tradfusion") s.flags.owambeTrad++; }
      if (c.special === "village") s.flags.village = true;
      if (c.special === "tour") { const usd = 50 * D.NPCS.filter((n) => n.from && s.npcs[n.id].arrived).length; s.usd += usd; return ` They tipped you $${usd}.`; }
      if (c.special === "own") { s.exposed = true; this.news("exposed"); }
      if (c.special === "bigbreak") { s.flags.bigbreak = true; this.unlock("bigbreak"); }
      return "";
    }

    skipTo(day) {
      const s = this.s;
      while (s.day < day && !s.over) this.newDay();
      s.place = "home";
      this.checkCalendar();
    }

    exposedEvent() {
      const P = this.P;
      return {
        title: "EXPOSED!", icon: "😱",
        text: `It's all over the group chats and the blogs: "${P.secret}" Everyone is looking at you differently.`,
        choices: [
          { label: "Own it and laugh with them", special: "own", clout: -15, rep: 5, fx: { vibes: -10 }, memory: "😱 Got exposed — and owned it" },
          { label: "Deny everything", special: "own", clout: -30, rep: -15, fx: { vibes: -15 }, memory: "😱 Got exposed and denied it" },
        ],
      };
    }

    // ---------------------------------------------------------- calendar
    checkCalendar() {
      const s = this.s;
      if (s.over) return;
      const ev = this.calendarEvent();
      if (ev) this.queue(ev);
      this.flush();
    }

    calendarEvent() {
      const s = this.s;
      const key = `cal_${s.day}_${s.slot}`;
      if (s.flags[key]) return null;
      const mark = () => { s.flags[key] = true; };
      const P = this.P;
      const cityName = this.city().name;

      if (s.day === 1 && s.slot === 0) {
        mark();
        const goal = D.GOALS[s.goal];
        return {
          title: `Welcome to Detty December, ${s.name}!`, icon: "🎄",
          text: `You're a ${P.name} in ${this.areaData().name}, ${cityName}. Your goal: ${goal.icon} ${goal.name} — ${goal.desc} But you're hiding something: ${P.secret} Everyone in this city is hiding something. Who are they really?`,
          choices: [{ label: "Let's gooo! 🇳🇬" }],
        };
      }
      if (s.slot === 0) {
        const landing = D.NPCS.find((n) => n.from && n.arrives === s.day && !s.npcs[n.id].arrived);
        if (landing) {
          mark();
          return {
            title: `${landing.name} Has Landed! ✈️`, icon: "🛬",
            text: `"I'm at ${this.city().places.airport.name}! Abeg come pick me, my data isn't working." — ${landing.name}, from ${landing.from}. Get to the airport today.`,
            choices: [
              { label: "On my way!" },
              { label: "Send them a Bolt link (₦15k)", cost: 15000, relTo: { [landing.id]: -6 }, special: "bolt_" + landing.id },
            ],
          };
        }
      }
      if (s.persona === "hustler" && !s.flags.bigbreakOffered && s.day >= 15 && s.slot === 1 && s.res >= 70 && s.conn >= 55) {
        mark();
        s.flags.bigbreakOffered = true;
        return {
          title: "The Opportunity", icon: "🚀",
          text: "A Lagos events company saw how you've been moving all month. They want you to run logistics for every major concert next year — with an advance.",
          choices: [
            { label: "Take the deal", naira: 800000, conn: 15, rep: 10, special: "bigbreak", memory: "🚀 Landed the deal of a lifetime" },
            { label: "Not now. December first.", fx: { vibes: 6 } },
          ],
        };
      }
      const wd = new Date(D.YEAR, 11, s.day).getDay();
      if (wd === 6 && s.slot === 2 && s.day !== 26) {
        mark();
        const trad = s.look.style === "tradfusion";
        const choices = [
          trad
            ? { label: "Show up in your aso-ebi 💅🏾", fx: { vibes: 30, belle: 35, energy: -10 }, rep: 6, clout: 4, conn: 4, slots: 1, gossip: 1, special: "owambe", memory: `🎊 Owambe slay · ${s.day} Dec` }
            : { label: "Show up (not in aso-ebi) 😬", fx: { vibes: 15, belle: 30, energy: -10 }, slots: 1, rep: -4, conn: 2, special: "owambe" },
          { label: "Spray money on the couple (₦20k)", cost: 20000, fx: { vibes: 25, belle: 30, energy: -10 }, rep: 8, clout: 5, slots: 1, conn: 3, special: "owambe", memory: "💸 Sprayed money at an owambe" },
          { label: "Skip it", fx: { energy: 6 }, rep: -3 },
        ];
        if (s.persona === "aunty") {
          choices.unshift({ news: "owambe", label: "Run the whole show — MC, gele, everything", fx: { vibes: 35, belle: 35, energy: -18 }, rep: 8, conn: 10, clout: 6, slots: 1, gossip: 2, special: "owambe", memory: `👑 Ran the owambe · ${s.day} Dec` });
          choices[choices.length - 1] = { label: "Skip it (FOMO will kill you)", fx: { vibes: -15 }, rep: -6 };
        }
        return {
          title: "Saturday Owambe! 🎊", icon: "💃🏾",
          text: "Your cousin's friend's sister's wedding is today. Live band, small chops, money spraying, and aunties tying gele like architecture.",
          choices,
        };
      }
      if (s.day === 24 && s.slot === 0 && !s.flags.village) {
        mark();
        return {
          title: "Village for Christmas?", icon: "🛖",
          text: "Mama: \"The whole family is going to the village tomorrow. Grandpa wants to see everybody. Bring the diaspora people too!\"",
          choices: [
            { label: "Go to the village (₦60k, back on the 26th)", cost: 60000, fx: { vibes: 25, belle: 40, energy: 20 }, rep: 15, conn: 5, relAll: 8, memory: "🛖 Christmas in the village with Grandpa", unlock: "village", skipTo: 26, special: "village" },
            { label: "Stay in the city", rep: -8 },
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
            { label: "Feast with the family", fx: { belle: 50, vibes: 25 }, rep: bonus, relAll: 10, slots: 1, memory: "🎄 Christmas lunch with the whole family" },
            { label: "Feast, then a Christmas party", fx: { belle: 40, vibes: 35, energy: -15 }, rep: bonus - 3, clout: 5, slots: 2, big: true, memory: "🎄 Christmas lunch and a Christmas party" },
          ],
        };
      }
      if (s.day === 26 && s.slot === 0 && D.crewInTown(s)) {
        mark();
        return {
          title: "Tour Guide Duty", icon: "🗺️",
          text: `The diaspora crew wants you to show them "the real ${cityName}". Street food, picture spots, the works.`,
          choices: [
            { label: "Full city tour (they tip in dollars)", fx: { vibes: 20, energy: -20 }, relAll: 8, conn: 4, slots: 2, special: "tour", memory: `🗺️ Gave the crew a ${cityName} tour` },
            { label: "Send them a Google Maps pin", relAll: -5 },
          ],
        };
      }
      if (s.day === 31 && s.slot === 3) {
        mark();
        const choices = [
          { label: "Crossover service in church 🙏🏾", fx: { vibes: 30 }, rep: 12, memory: "🙏🏾 Crossed over in church", end: "church" },
          { label: "Countdown party (₦50k) 🍾", cost: 50000, fx: { vibes: 45 }, clout: 12, memory: "🍾 Countdown party into the new year", end: "party" },
          { label: "Home with family, fireworks and jollof 🎆", fx: { vibes: 25 }, rep: 6, relAll: 10, memory: "🎆 Crossover at home with family", end: "family" },
        ];
        D.NPCS.filter((n) => n.romance).forEach((n) => {
          const st = s.npcs[n.id];
          if (st.romance >= 60 && st.rel >= 70) choices.push({ label: `Cross over with ${n.name} 💞`, fx: { vibes: 50 }, relTo: { [n.id]: 20 }, unlock: "lover", memory: `💞 New Year's kiss with ${n.name}`, end: "love", partner: n.name });
        });
        return { title: "Crossover Night!", icon: "🎆", text: "It's 11pm on 31st December. Fireworks are already popping. Where will you be at midnight?", choices };
      }
      return null;
    }

    checkAchievements() {
      if (this.s.clout >= 100) this.unlock("influencer");
    }

    // ---------------------------------------------------------- ending
    finish(kind) {
      const s = this.s;
      if (s.over) return;
      s.over = true;
      s.event = null;
      s.queue = [];
      if (kind !== "slept") { this.unlock("survivor"); this.news("crossover"); }
      const worth = this.worth();
      const avgVibes = s.vibesLog.length ? s.vibesLog.reduce((a, b) => a + b, 0) / s.vibesLog.length : s.needs.vibes;
      const revealed = D.NPCS.filter((n) => s.npcs[n.id].secret >= 100).length;
      const goalMet = (() => { s.ending = { kind }; const ok = D.GOALS[s.goal].check(s, worth); s.ending = null; return ok; })();
      let secretPts, secretText;
      if (s.persona === "hustler") { secretPts = s.flags.bigbreak ? 80 : 0; secretText = s.flags.bigbreak ? "You landed the big break." : "The big break never came. Next December."; }
      else if (s.exposed) { secretPts = -40; secretText = "Your secret came out."; }
      else if (s.confessed) { secretPts = 30; secretText = "You came clean on your own terms."; }
      else { secretPts = 60; secretText = "Nobody ever found out."; }
      const resBonus = {
        ijgb: Math.min(30, Math.round(s.usd / 100)), wannabe: Math.round(s.res / 3), japa: Math.round(s.res / 4),
        firsttimer: Math.round(s.res / 2), hustler: Math.round(s.res / 4), influencer: Math.round(s.res / 4),
        pikin: Math.round(s.res / 4), aunty: Math.min(30, s.gossip * 3),
      }[s.persona];
      const parts = {
        vibes: Math.round(avgVibes),
        clout: Math.round(Math.min(s.clout, 150)),
        rep: Math.round(s.rep),
        conn: Math.round(s.conn),
        money: Math.round(clamp((worth - s.startWorth) / 20000, -40, 60)),
        memories: s.memories.length * 10,
        goal: goalMet ? 150 : 0,
        secrets: revealed * 15,
        secret: secretPts,
        persona: resBonus,
        achievements: s.achievements.length * 10,
      };
      const score = Object.values(parts).reduce((a, b) => a + b, 0);
      let title, blurb;
      if (kind === "slept") { title = "Slept Through Crossover 😴"; blurb = "You woke up on 1st January to 47 missed calls and a group chat full of fireworks videos."; }
      else if (score >= 680) { title = "Detty December Legend 👑"; blurb = "People will talk about your December for years. The diaspora crew is already planning next year around you."; }
      else if (score >= 540) { title = "Certified Odogwu 🔥"; blurb = "You balanced family, owambes, secrets and enjoyment like a true pro."; }
      else if (score >= 400) { title = "Survived the Wahala 💪🏾"; blurb = "It wasn't easy, but you made it to January in one piece. Mostly."; }
      else { title = "Wahala Magnet 🧲"; blurb = "Traffic, black tax and NEPA teamed up against you. There's always next December."; }
      const scenes = {
        church: "You crossed over in church, dancing to \"Onise Iyanu\" with Mama.",
        party: "You popped champagne as the clock hit 12. The DJ shouted your name.",
        family: "You watched the fireworks from the balcony with the whole family, jollof in hand.",
        love: "At midnight, you got your New Year's kiss. 💞",
        slept: "",
      };
      s.ending = { kind, title, blurb, scene: scenes[kind], score, parts, worth, goalMet, secretText };
      this.log(`🎆 HAPPY NEW YEAR! ${title}`, "achieve");
    }
  }

  const api = { Game, naira, clamp, COND };
  if (typeof module !== "undefined") module.exports = api;
  else Object.assign(root, api);
})(typeof window !== "undefined" ? window : globalThis);
