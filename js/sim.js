// DECEMBER WAHALA — the real-time life sim engine. No DOM and no three.js:
// the world renderer and HUD call into it, and tests drive it headlessly.
//
// Time: s.t is minutes since 1 December, 00:00. At normal speed one real second
// is one game minute. Activities (eating, partying, sleeping) and rides
// fast-forward the clock while they run.
/* global module, require */
(function (root) {
  const isNode = typeof module !== "undefined";
  const D = isNode ? require("./data.js") : root.DATA;
  const W = isNode ? require("./world-data.js") : root.WORLD;
  const NAV = isNode ? require("./nav.js") : root.NAV;

  const DAY = W.DAY;
  const SPEEDS = [0, 1, 4, 15]; // game minutes per real second
  const FAST = 50; // while an activity runs
  const RIDE_FAST = 35; // while riding across town
  const NPC_SPEED = 1.8; // street units per game minute
  const END = 31 * DAY + 30; // 00:30 on 1 January
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
  const hash = (...n) => { let h = 2166136261; for (const v of n) { h ^= v; h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

  function clock(t) {
    const day = Math.floor(t / DAY) + 1;
    const min = Math.floor(t % DAY);
    const hh = Math.floor(min / 60), mm = min % 60;
    const h12 = ((hh + 11) % 12) + 1;
    const wd = W.weekday(day);
    return { day, min, hh, mm, wd, weekday: W.WEEKDAYS[wd], label: `${h12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`, night: hh >= 19 || hh < 6 };
  }
  const fmtMins = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? " " + (m % 60) + "m" : ""}` : `${Math.round(m)} min`);

  const STRANGER_STYLES = ["streetwear", "afrochic", "glam", "y2k", "resort", "tradfusion", "oldmoney", "allblack"];

  class Sim {
    constructor(state, seed) {
      this.s = state;
      this.pathCache = {};
      this.rng = makeRng(seed);
      this.nav = NAV.get(state.city);
      this.places = this.nav.places;
    }

    // ============================================================ creation
    static create(o, seed) {
      const P = D.PERSONAS[o.persona];
      const area = D.AREAS[o.city][o.area];
      const rng = makeRng(seed === undefined ? Math.floor(Math.random() * 1e9) : seed);
      const npcs = {};
      W.NPCS.forEach((n) => {
        npcs[n.id] = { rel: n.rel, trust: 50, romance: 0, met: !!n.family, memory: [], secret: 0, state: null, arrived: !n.from, place: null, move: null, favour: false, lastTalk: -1e9 };
      });
      const strangers = [];
      for (let i = 0; i < 16; i++) {
        const body = rng() < 0.5 ? "woman" : "man";
        const hairs = Object.keys(D.HAIR[body]);
        strangers.push({
          id: "s" + i, name: W.STRANGER_NAMES[i % W.STRANGER_NAMES.length],
          look: { body, skin: Math.floor(rng() * 7), hair: hairs[Math.floor(rng() * hairs.length)], hairColour: rng() < 0.75 ? "black" : "brown",
            style: STRANGER_STYLES[Math.floor(rng() * STRANGER_STYLES.length)], colour: Math.floor(rng() * 11), fabric: ["plain", "ankara", "adire"][Math.floor(rng() * 3)],
            shades: rng() < 0.3, gele: false, beard: body === "man" && rng() < 0.4 ? "shaped" : null },
          rel: 20, met: false, memory: [], place: null, move: null,
        });
      }
      const fx = 1550 + D.CITIES[o.city].fxBias;
      const s = {
        version: 3, name: o.name || "Ada", look: { build: "regular", ...o.look }, traits: o.traits, goal: o.goal, persona: o.persona,
        city: o.city, area: o.area,
        t: W.hm("09:00"), speed: 1,
        pos: null, place: "home", inside: true,
        needs: { energy: 85, belle: 70, vibes: 60 },
        naira: P.start.naira, usd: P.start.usd, startFx: fx, fx,
        clout: clamp(P.start.clout + (area.clout || 0), 0, 200), rep: P.start.rep, conn: clamp(P.start.conn + (area.conn || 0)),
        res: P.resource.start || 0, gossip: o.persona === "aunty" ? 2 : 0,
        followers: { influencer: 3200, wannabe: 1800, pikin: 1500, ijgb: 900, aunty: 700, japa: 600, firsttimer: 300, hustler: 400 }[o.persona],
        exposure: 0, exposed: false, confessed: false,
        light: true, genUntil: 0,
        inventory: { phone: 1, slippers: 1 },
        wardrobe: [o.look.style],
        equip: { shoes: null, bag: null, jewelry: o.look.chain ? "chain" : null },
        npcs, strangers,
        chains: { kemi: { step: "meet", since: 0 }, dayo: { step: "brag", since: 0 }, tobi: { step: "land", since: 0 }, tunde: { step: "vip", since: 0 } },
        phone: { messages: [], posts: [], unread: 0 },
        plans: [], activity: null, ride: null, convo: null,
        stats: { earned: 0, spentDay: 0, bignights: 0, owambes: 0, owambeTrad: 0, secrets: 0, japaHelped: 0, hosted: 0, dates: 0, wahalas: 0, vibesSum: 0, vibesN: 0, avgVibes: 60, posts: 0, startNaira: 0 },
        flags: { ab: {}, fit: {}, posted: 0, guy: false, car: 0, hotelNight: 0, tailor: null, loan: 0, cal: {} },
        partner: null, memories: [], achievements: [], log: [], event: null, queue: [], recent: [], news: ["arrived"],
        over: false, ending: null,
      };
      if (o.persona === "pikin") s.flags.car = 99;
      const sim = new Sim(s, seed);
      if (P.visitor) {
        sim.payAny(area.stay);
        sim.log(`🏨 You booked a flat in ${area.name} for December (−${naira(area.stay)}).`, "action");
      }
      s.stats.startNaira = sim.worthRef();
      // Everyone starts the day where their routine puts them.
      W.NPCS.forEach((def) => { s.npcs[def.id].place = sim.wantedPlace(def, s.t); });
      s.strangers.forEach((st, i) => { st.place = sim.strangerWanted(i, s.t); });
      sim.updateNpcs();
      sim.welcome();
      return sim;
    }

    // ============================================================ helpers
    get P() { return D.PERSONAS[this.s.persona]; }
    has(t) { return this.s.traits.includes(t); }
    clock() { return clock(this.s.t); }
    day() { return Math.floor(this.s.t / DAY) + 1; }
    events(day = this.day()) { return W.eventsOn(day); }
    worth() { return this.s.naira + this.s.usd * this.s.fx; }
    // Fixed reference rate, so the exchange rate moving can't fake a profit.
    worthRef() { return this.s.naira + this.s.usd * this.s.startFx; }
    placeName(id) { const p = this.places[id]; if (!p) return "the street"; return id === "home" ? `Your Flat, ${D.AREAS[this.s.city][this.s.area].name}` : p.name; }
    npcDef(id) { return W.NPCS.find((n) => n.id === id); }
    who(id) { return this.npcDef(id) || this.s.strangers.find((x) => x.id === id); }
    whoState(id) { return this.s.npcs[id] || this.s.strangers.find((x) => x.id === id); }
    log(text, type = "info") {
      const c = this.clock();
      this.s.log.unshift({ t: this.s.t, day: c.day, time: c.label, text, type });
      if (this.s.log.length > 150) this.s.log.length = 150;
    }
    addMemory(t) { if (t && !this.s.memories.includes(t)) this.s.memories.push(t); }
    news(type) { (this.s.news = this.s.news || []).push(type); }
    takeNews() { const n = this.s.news || []; this.s.news = []; return n; }
    unlock(id) {
      if (this.s.achievements.includes(id) || !W.ACHIEVEMENTS[id]) return;
      this.s.achievements.push(id);
      const a = W.ACHIEVEMENTS[id];
      this.log(`🏆 ${a.icon} ${a.name}`, "achieve");
      if (id === "viral") this.news("viral");
      if (id === "bigbreak") this.news("bigbreak");
    }
    hasPower() { return this.s.light || this.s.genUntil > this.s.t; }
    mood() { const n = this.s.needs; return (n.energy + n.belle + n.vibes) / 3; }
    moodLabel() {
      const m = this.mood();
      return m >= 75 ? ["😄", "Very Happy"] : m >= 58 ? ["🙂", "Happy"] : m >= 42 ? ["😐", "Okay"] : m >= 25 ? ["😕", "Stressed"] : ["😫", "Miserable"];
    }
    relLevel(id) {
      const st = this.whoState(id);
      if (!st || !st.met) return "Stranger";
      if (this.s.partner === id) return st.romance >= 85 ? "Relationship" : "Dating";
      if (st.romance >= 30) return "Crush";
      if (st.rel >= 60) return "Friend";
      if (st.rel < 15) return "Enemy";
      return "Acquaintance";
    }
    remembers(id, tag, withinMins) {
      const st = this.whoState(id);
      return !!(st && st.memory.some((m) => m.tag === tag && (!withinMins || this.s.t - m.t <= withinMins)));
    }
    remember(id, tag) {
      const st = this.whoState(id);
      if (!st) return;
      st.memory.push({ tag, t: this.s.t });
      if (st.memory.length > 20) st.memory.shift();
    }

    applyFx(fx = {}) {
      for (const k in fx) {
        let v = fx[k];
        if (k === "energy" && v < 0 && this.has("nightcrawler") && this.clock().night) v = Math.round(v * 0.6);
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
      else if (k === "followers") { s.followers = Math.max(0, s.followers + n); if (s.followers >= 5000) this.unlock("viral"); }
    }
    addExposure(n) {
      const s = this.s;
      if (!n || s.exposed || s.confessed || s.persona === "hustler") return;
      s.exposure = clamp(s.exposure + n);
      if (s.exposure >= 100 && !s.flags.exposedQueued) { s.flags.exposedQueued = true; this.queue(this.exposedEvent()); }
    }
    rel(id, n) { const st = this.whoState(id); if (st) { st.rel = clamp(st.rel + n); if (n > 0) st.met = true; } }
    relAll(n) { for (const id in this.s.npcs) if (this.s.npcs[id].arrived && this.s.npcs[id].met) this.rel(id, n); }

    // ============================================================ money
    priceMult(placeType) {
      const s = this.s;
      let m = 1;
      if (s.persona === "ijgb" && !s.exposed && !s.confessed) m *= 1.25;
      if (this.has("stingy")) m *= 0.85;
      if (this.has("bigspender") && ["club", "lounge", "concert"].includes(placeType)) m *= 1.1;
      if (s.persona === "aunty" && ["market", "hall", "fashion", "salon"].includes(placeType)) m *= 0.7;
      if (this.events().includes("concert") && ["club", "lounge", "suya"].includes(placeType)) m *= 1.15;
      return m;
    }
    price(base, placeType, consume) {
      if (!base) return 0;
      let p = base * this.priceMult(placeType);
      if (this.s.flags.guy) { p *= 0.5; if (consume) { this.s.flags.guy = false; this.log("📞 Your guy came through. Half price!", "good"); } }
      return round100(p);
    }
    canAfford(n) {
      if (n <= 0) return true;
      const s = this.s;
      return s.naira >= n || (s.persona === "ijgb" && s.naira + s.usd * s.fx >= n);
    }
    pay(n) {
      const s = this.s;
      if (n <= 0) return;
      s.stats.spentDay += n;
      if (s.stats.spentDay >= 500000) this.unlock("billionaire");
      if (s.naira >= n) { s.naira -= n; return; }
      if (s.persona === "ijgb") { this.payAny(n); return; }
      s.naira -= n;
    }
    payAny(n) {
      const s = this.s;
      if (s.naira >= n) { s.naira -= n; return; }
      const rem = n - Math.max(0, s.naira);
      s.naira = Math.min(s.naira, 0);
      s.usd = Math.max(0, s.usd - Math.ceil(rem / s.fx));
    }
    payForced(n) { this.s.naira -= Math.min(Math.max(0, this.s.naira), n); }
    earn(n, kind) {
      const s = this.s;
      s.naira += n;
      s.stats.earned += n;
      if (kind) s.stats["earned_" + kind] = (s.stats["earned_" + kind] || 0) + n;
    }

    // ============================================================ the clock
    speedNow() {
      const s = this.s;
      if (s.over || s.event || s.convo) return 0;
      if (s.ride) return RIDE_FAST;
      if (s.activity) return FAST;
      return SPEEDS[s.speed] || 0;
    }
    // Called every frame with real seconds elapsed.
    tick(realSec) {
      const mins = Math.min(realSec, 0.25) * this.speedNow();
      if (mins > 0) this.advance(mins);
    }
    // Moves the clock forward, in small steps so nothing is skipped.
    advance(mins) {
      const s = this.s;
      while (mins > 0 && !s.over && !s.event) {
        const step = Math.min(mins, 5);
        mins -= step;
        const before = s.t;
        s.t += step;
        this.decay(step);
        if (Math.floor(before / DAY) !== Math.floor(s.t / DAY)) this.newDay();
        if (Math.floor(before / 30) !== Math.floor(s.t / 30)) this.halfHourly();
        if (s.activity && s.t >= s.activity.end) this.finishActivity();
        if (s.ride && s.t >= s.ride.end) this.finishRide();
        this.updateNpcs();
        this.checkCrisis();
        if (s.t >= END && !s.over) this.finish("missed");
      }
      this.flush();
    }
    passTime(mins) { const sp = this.s.event; this.s.event = null; this.advance(mins); if (!this.s.event) this.s.event = sp; }

    decay(m) {
      const s = this.s, h = m / 60;
      const sleeping = s.activity && s.activity.id === "sleep";
      if (sleeping) {
        const rate = (this.hasPower() ? 14 : 9) + (this.has("lazy") ? 3 : 0);
        s.needs.energy = clamp(s.needs.energy + rate * h);
        s.needs.belle = clamp(s.needs.belle - 2 * h);
      } else {
        s.needs.energy = clamp(s.needs.energy - 4.2 * h);
        s.needs.belle = clamp(s.needs.belle - 5 * h);
        s.needs.vibes = clamp(s.needs.vibes - (this.has("owambe") ? 3 : 2) * h);
      }
      if (!this.hasPower() && s.place === "home" && s.inside) s.needs.vibes = clamp(s.needs.vibes - 1.5 * h);
    }

    newDay() {
      const s = this.s;
      const day = this.day();
      s.stats.vibesSum += s.needs.vibes; s.stats.vibesN++; s.stats.avgVibes = s.stats.vibesSum / s.stats.vibesN;
      s.stats.spentDay = 0;
      s.fx = clamp(s.fx + Math.round((this.rng() - 0.45) * 50), 1350, 1850);
      const p = s.persona;
      if (p === "ijgb" && this.worth() < 400000) this.addExposure(6);
      if (p === "influencer") {
        if (s.flags.posted < day - 1) { s.res = clamp(s.res - 14); this.log("📉 You didn't post yesterday. Engagement is dropping.", "bad"); }
        if (s.res < 30) this.addStat("clout", -4);
        this.payForced(15000);
        this.log("💳 Soft-life bills: subscriptions, lash refill, car hire (−₦15,000).", "bad");
        if (s.naira < 60000) this.addExposure(3);
      }
      if (p === "pikin") this.addExposure(1);
      if (["wannabe", "japa", "firsttimer", "aunty"].includes(p) && s.exposure > 0) s.exposure = clamp(s.exposure - 2);
      if (s.flags.car && s.flags.car < 99) s.flags.car = 0;
      if (s.flags.tailor && s.flags.tailor.ready <= s.t) {
        this.addStyle(s.flags.tailor.style);
        this.message("fashion", `Your custom ${D.STYLES[s.flags.tailor.style].name} outfit is ready! It's in your wardrobe.`);
        s.flags.tailor = null;
      }
      const ph = W.phase(day);
      if (ph.from === day) this.log(`🗓️ ${ph.name}: ${ph.blurb}`, "day");
      this.log(`📅 ${W.WEEKDAYS[W.weekday(day)]}, ${day} December · $1 = ${naira(s.fx)}`, "day");
      this.morningMessages(day);
    }

    // Things that happen on the half hour: calendar, plans, story chains, people texting.
    halfHourly() {
      const s = this.s;
      const c = this.clock();
      this.calendar(c);
      this.checkPlans();
      this.chainTimers();
      if (c.mm === 0 && c.hh >= 9 && c.hh <= 22 && this.rng() < 0.18) this.randomText();
    }

    checkCrisis() {
      const s = this.s;
      if (s.over || s.event || s.queue.length) return;
      if (s.needs.belle <= 0) {
        s.needs.belle = 30;
        this.queue({ title: "Hunger Don Wire You!", icon: "😵", text: "You nearly faint on the road. A kind stranger buys you agege bread and malt.", choices: [{ label: "Eat like it's your last meal", fx: { vibes: -10 }, forced: 2000 }] });
      } else if (s.needs.energy <= 0 && !(s.activity && s.activity.id === "sleep")) {
        s.needs.energy = 5;
        this.queue({ title: "Body No Be Firewood", icon: "🥱", text: "You're running on nothing. You need to sleep right now.", choices: [{ label: "Sleep it off (6 hours)", special: "forcesleep" }] });
      }
    }

    // ============================================================ people
    schedFor(def, day) {
      const wd = W.weekday(day);
      if (wd === 0 && def.sunday) return def.sunday;
      if (wd === 6 && def.saturday) return def.saturday;
      return def.schedule;
    }
    // Where a person wants to be right now (null = off the streets).
    wantedPlace(def, t) {
      const st = this.s.npcs[def.id];
      if (!st.arrived) return null;
      const c = clock(t);
      let place = null;
      for (const d of [c.day, c.day - 1]) {
        const min = c.min + (d === c.day ? 0 : DAY);
        for (const [a, b, p] of this.schedFor(def, d)) if (min >= a && min < b) place = p;
        if (place) break;
      }
      if (place && !W.isOpen(this.places[place].type, t) && !def.vendor && !["family", "home", "photo", "busstop", "beach"].includes(place)) {
        if (this.places[place].type === "club" || this.places[place].type === "lounge" || this.places[place].type === "concert") return place; // queue outside
        return null;
      }
      return place;
    }
    strangerWanted(i, t) {
      const c = clock(t);
      if (c.hh < 7 && c.hh >= 2) return null;
      const ids = Object.keys(this.places).filter((p) => !this.places[p].remote && p !== "home" && p !== "family");
      const block = Math.floor(c.min / 150);
      const r = hash(c.day, block, i + 7);
      if (r < 0.12) return null;
      return ids[Math.floor(hash(i, c.day, block) * ids.length)];
    }
    updateNpcs() {
      const s = this.s;
      const step = (st, want) => {
        if (st.move && s.t >= st.move.t1) { st.place = st.move.to === "@off" ? null : st.move.to; st.move = null; }
        if (st.move) return;
        if (want === st.place) return;
        const from = st.place || "busstop";
        const to = want || "busstop";
        const len = this.cachedPath(from, to).L;
        if (!st.place) { st.place = from; } // arrives at the bus stop first
        if (from === to || !len) { st.place = want; return; }
        st.move = { from, to: want || "@off", t0: s.t, t1: s.t + len / NPC_SPEED };
      };
      W.NPCS.forEach((def) => {
        const st = s.npcs[def.id];
        if (!st.arrived && def.arrives && (this.day() > def.arrives || (this.day() === def.arrives && clock(s.t).hh >= 19))) {
          st.arrived = true; st.met = true;
          if (!s.flags["picked_" + def.id] && !s.flags["bolt_" + def.id] && !s.plans.some((p) => p.kind === "pickup" && p.npc === def.id)) { this.rel(def.id, -10); this.remember(def.id, "ignored"); this.log(`${def.name} landed and nobody came. They took a Bolt.`, "bad"); }
        }
        step(st, this.wantedPlace(def, s.t));
      });
      s.strangers.forEach((st, i) => step(st, this.strangerWanted(i, s.t)));
    }
    cachedPath(a, b) {
      const k = a + ">" + b;
      if (!this.pathCache[k]) { const pts = NAV.placePath(this.nav, a, b); this.pathCache[k] = { pts, L: NAV.length(pts) }; }
      return this.pathCache[k];
    }
    // Who is standing at a place (not walking).
    peopleAt(placeId) {
      const s = this.s;
      const out = [];
      W.NPCS.forEach((d) => { const st = s.npcs[d.id]; if (st.place === placeId && !st.move) out.push(d.id); });
      s.strangers.forEach((st) => { if (st.place === placeId && !st.move) out.push(st.id); });
      return out;
    }
    // Positions for the renderer: standing spot or interpolated walk.
    peoplePositions() {
      const s = this.s;
      const all = [...W.NPCS.map((d) => [d.id, s.npcs[d.id]]), ...s.strangers.map((st) => [st.id, st])];
      const out = [];
      for (const [id, st] of all) {
        if (st.move) {
          const { pts, L } = this.cachedPath(st.move.from, st.move.to === "@off" ? "busstop" : st.move.to);
          const f = clamp((s.t - st.move.t0) / Math.max(1, st.move.t1 - st.move.t0), 0, 1);
          const p = NAV.pointAt(pts, f * L);
          out.push({ id, x: p.x, z: p.z, heading: p.heading, walking: true });
        } else if (st.place && this.places[st.place] && !this.places[st.place].remote) {
          const pl = this.places[st.place];
          const k = hash(id.length, id.charCodeAt(0), id.charCodeAt(id.length - 1));
          const ang = k * Math.PI * 2;
          const r = 1.2 + k * 2.6;
          out.push({ id, x: pl.spot.x + Math.cos(ang) * r, z: pl.spot.z + Math.sin(ang) * r * 0.6, heading: Math.atan2(pl.door.x - pl.spot.x, pl.door.z - pl.spot.z) + (k - 0.5), walking: false, place: st.place });
        }
      }
      return out;
    }

    // ============================================================ entering places
    enter(placeId) {
      const s = this.s;
      const p = this.places[placeId];
      if (!p || s.over) return false;
      const T = W.TYPES[p.type];
      if (p.type === "club" && W.isOpen("club", s.t)) {
        const ok = this.dressCheck("club");
        if (ok !== true) { this.log(ok, "bad"); this.remember("sule", "embarrassed"); return false; }
      }
      s.place = placeId;
      s.inside = true;
      if (placeId === "restaurant" || placeId === "cafe" || placeId === "lounge") {
        const crush = this.peopleAt(placeId).find((id) => this.s.npcs[id] && this.s.npcs[id].romance >= 30);
        if (crush) this.log(`💓 ${this.who(crush).name} is here.`, "good");
      }
      if (T.kind === "building" && !W.isOpen(p.type, s.t)) this.log(`${p.icon} ${p.name} is closed right now.`, "info");
      this.chainCheck({ at: placeId });
      this.flush();
      return true;
    }
    leave() { this.s.inside = false; }
    dressCheck(kind) {
      const s = this.s;
      if (kind === "club") {
        if (!s.equip.shoes || s.equip.shoes === "slippers") return "🩴 Bouncer Sule: \"Oga, where you dey go with slippers? Go and wear proper shoe.\"";
        if (s.look.style === "resort" && s.clout < 80) return "🌴 Bouncer Sule: \"This is not beach. Next!\"";
      }
      return true;
    }

    // ============================================================ actions
    actionsAt(placeId) {
      const p = this.places[placeId];
      if (!p) return [];
      let ids = [...W.TYPES[p.type].actions];
      if (p.type === "family" && COND.canConfess(this)) ids.push("confess");
      if (p.type === "family" && this.day() === 25 && !this.s.flags.village) ids.unshift("christmas_lunch");
      if (["church", "club", "family", "lounge", "beach"].includes(p.type) && this.day() === 31 && this.clock().hh >= 22) ids.unshift("crossover");
      if (p.type === "hotel" && this.s.flags.hotelNight === this.day()) ids.unshift("sleep");
      return ids.map((id) => ({ id, a: this.actionDef(id), why: this.blocked(id, placeId), cost: this.actionCost(id, placeId) }));
    }
    actionDef(id) { return W.ACTIONS[id] || EXTRA_ACTIONS[id]; }
    actionCost(id, placeId) {
      const a = this.actionDef(id);
      if (!a || !a.cost) return 0;
      if (id === "vip" && (this.s.inventory.vip_band || 0) > 0) return 0;
      return this.price(a.cost, this.places[placeId].type);
    }
    blocked(id, placeId) {
      const s = this.s, a = this.actionDef(id), p = this.places[placeId];
      if (!a) return "Not available";
      if (s.activity || s.ride) return "You're busy";
      const evs = this.events();
      const open = W.isOpen(p.type, s.t) || (p.type === "concert" && W.isOpen("concert", s.t)) || W.TYPES[p.type].hours === null;
      if (!open && !["sleep", "nap", "pickup", "crossover"].includes(id)) {
        if (W.TYPES[p.type].eventOnly) return "Only on concert days";
        return "Closed now";
      }
      if (a.event && !evs.includes(a.event) && !(a.event === "concert" && this.events(this.day() - 1).includes("concert") && this.clock().hh < 2)) return a.event === "owambe" ? "Only on owambe Saturdays" : a.event === "beachparty" ? "Sundays from the 13th" : "Only on concert days";
      if (a.personaOnly && !a.personaOnly.includes(s.persona)) return "Not for your persona";
      if (a.item && !(s.inventory[a.item] > 0)) return `Need a ${W.ITEMS[a.item].name}`;
      if (a.premium && !["ijgb", "pikin"].includes(s.persona) && s.clout < 100 && !(s.inventory.vip_band > 0)) return "Big money only (or 100 clout)";
      if (a.needsPower && !this.hasPower()) return "No light!";
      const cost = this.actionCost(id, placeId);
      if (cost && !this.canAfford(cost)) return `Need ${naira(cost)}`;
      if (a.fx && a.fx.energy < 0 && s.needs.energy + a.fx.energy < 0) return "Too tired";
      if (id === "sleep" && s.needs.energy > 92) return "You're not tired";
      if (id === "broker" && s.conn < 40) return "Need 40 connections";
      if (id === "repay_loan" && !s.flags.loan) return "No loan to repay";
      if (id === "quick_loan" && s.flags.loan) return "Repay your first loan";
      if (id === "pickup" && !D_pending(this).length) return "Nobody is waiting";
      if (id === "picnic" && !this.crewInTown()) return "Your diaspora crew isn't in town yet";
      if (id === "asoebi" && s.wardrobe.includes("tradfusion")) return "Already in your wardrobe";
      if (id === "tailor" && s.flags.tailor) return "Your outfit is still being sewn";
      if (id === "confess" && !COND.canConfess(this)) return "Nothing to confess";
      return null;
    }
    crewInTown() { return W.NPCS.some((n) => n.from && this.s.npcs[n.id].arrived); }

    start(id) {
      const s = this.s;
      const placeId = s.place;
      if (!placeId || s.over || s.event || s.convo) return false;
      const why = this.blocked(id, placeId);
      if (why) { this.log(`Can't do that: ${why}.`, "bad"); return false; }
      const a = this.actionDef(id);
      const p = this.places[placeId];
      // Instant actions open a menu instead of taking time.
      if (["bdc", "bdcbuy", "bdcmall", "shop", "accessories", "hair"].includes(a.special)) { this.openMenu(a.special, placeId); return true; }
      if (a.dress === "owambe" && !["tradfusion", "afrochic"].includes(s.look.style)) this.log("👀 Aunties are looking at your outfit. No aso-ebi?", "bad");
      const cost = this.actionCost(id, placeId);
      if (cost) {
        if (s.flags.guy) { s.flags.guy = false; this.log("📞 Your guy came through. Half price!", "good"); }
        this.pay(cost);
      }
      if (id === "vip" && s.inventory.vip_band > 0) s.inventory.vip_band--;
      let mins = a.mins;
      if (id === "sleep") mins = Math.round(clamp((100 - s.needs.energy) / ((this.hasPower() ? 14 : 9) + (this.has("lazy") ? 3 : 0)) * 60, 60, 600));
      if (id === "crossover" || id === "christmas_lunch") mins = a.mins;
      if (!mins) { this.complete(id, placeId); this.flush(); return true; }
      s.activity = { id, place: placeId, start: s.t, end: s.t + mins, label: a.name, icon: a.icon };
      return true;
    }
    cancelActivity() {
      const s = this.s;
      if (!s.activity) return;
      if (s.activity.id === "sleep") { this.finishActivity(); return; }
      this.log(`You stopped: ${s.activity.label}.`, "info");
      s.activity = null;
    }
    finishActivity() {
      const s = this.s;
      const act = s.activity;
      s.activity = null;
      this.complete(act.id, act.place, act);
    }

    complete(id, placeId, act) {
      const s = this.s;
      const a = this.actionDef(id);
      const p = this.places[placeId];
      const fx = { ...(a.fx || {}) };
      if (a.big && fx.vibes) fx.vibes = Math.round(fx.vibes * (this.has("bigspender") ? 1.3 : 1) * (this.has("owambe") ? 1.4 : 1));
      if (a.food) { if (fx.belle) fx.belle = Math.round(fx.belle * (this.has("foodie") ? 1.3 : 1)); if (this.has("foodie")) fx.vibes = (fx.vibes || 0) + 6; }
      if (a.special === "church" && this.has("prayer")) { fx.vibes = (fx.vibes || 0) * 2; this.addStat("rep", 2); }
      if (id !== "sleep") this.applyFx(fx);
      this.addStat("clout", a.clout);
      this.addStat("rep", a.rep);
      this.addStat("conn", a.conn);
      if (a.gossip) this.addStat("gossip", a.gossip);
      if (a.culture && s.persona === "firsttimer") this.addStat("res", a.culture);
      if (a.big) { s.stats.bignights++; }
      if (a.cheap && s.persona === "influencer") this.addExposure(2);
      if (a.gives) s.inventory[a.gives] = (s.inventory[a.gives] || 0) + 1;
      if (a.cheap && s.persona === "firsttimer") this.addStat("res", 3);
      let msg = `${a.icon} ${a.name}.`;
      if (a.gig) msg += this.gig(a);
      msg += this.special(a, id, placeId) || "";
      msg += this.fitCheck(placeId, a) || "";
      this.log(msg, "action");
      if (a.memory) this.addMemory(a.memory);
      this.checkAchievements();
      if (a.special !== "meet" && a.special !== "sleep" && p && !p.remote) this.maybeEncounter(0.12, "place");
      this.flush();
    }

    gig(a) {
      const s = this.s;
      let mult = s.persona === "hustler" ? 1 + s.res / 100 : 0.8;
      if (this.has("hustlebrain")) mult *= 1.25;
      if (this.has("lazy")) mult *= 0.8;
      const pay = round100(a.gig * mult * (0.85 + this.rng() * 0.3));
      this.earn(pay, a.gigType);
      if (s.persona === "hustler") {
        this.addStat("res", 6);
        if (s.needs.energy <= 20) { this.applyFx({ vibes: -10 }); this.queue({ title: "Burnout!", icon: "🥵", text: "You've been hustling non-stop. Your body is shutting down.", choices: [{ label: "Rest for 3 hours", mins: 180, fx: { energy: 25 } }] }); }
      }
      if (s.persona === "influencer") this.addExposure(3);
      return ` You made ${naira(pay)}.`;
    }

    fitCheck(placeId, a) {
      const s = this.s;
      const p = this.places[placeId];
      if (!p || a.gig || p.type === "home") return "";
      const style = D.STYLES[s.look.style];
      const key = `${this.day()}-${p.type}`;
      if (!style || !style.shines.includes(p.type) || s.flags.fit[key]) return "";
      s.flags.fit[key] = true;
      this.addStat("clout", 3);
      this.applyFx({ vibes: 5 });
      return " 💅🏾 Your fit ate!";
    }

    special(a, id, placeId) {
      const s = this.s;
      const pick = (arr) => arr[Math.floor(this.rng() * arr.length)];
      switch (a.special) {
        case "sleep": {
          const where = placeId === "hotel" ? "in a soft hotel bed" : this.hasPower() ? "with the fan running" : "in the heat (no light)";
          return ` You slept ${where}.`;
        }
        case "cook":
          s.stats.jollof = (s.stats.jollof || 0) + 1;
          if (s.stats.jollof >= 3) this.unlock("jollof");
          return " Party jollof with the perfect bottom-pot. 🔥";
        case "gen": s.genUntil = s.t + 8 * 60; return " The gen roared to life. Light for 8 hours.";
        case "post": return this.post(placeId);
        case "host": {
          s.stats.hosted++;
          const guests = W.NPCS.filter((n) => this.s.npcs[n.id].met && this.s.npcs[n.id].rel >= 40).length;
          this.relAll(5);
          this.addStat("conn", guests * 2);
          this.addMemory(`🎉 Hosted a house party (${guests + 6} guests)`);
          this.news("owambe");
          return ` ${guests + 6} people showed up. The neighbours called it "the party of the year".`;
        }
        case "familytalk": {
          const r = this.rng();
          if (s.persona === "pikin" || (s.persona === "ijgb" && r < 0.5)) { this.blackTax(); return " Then the requests started."; }
          if (r < 0.4) { this.applyFx({ vibes: -4 }); return " Mama asked when you're getting married. Again."; }
          return " Mama prayed for you for twenty minutes straight. You feel covered.";
        }
        case "daddy": {
          if (s.res < 15) return " Daddy didn't pick up.";
          s.naira += 150000; this.addStat("res", -15); this.addExposure(6);
          return " Daddy sent ₦150,000. \"Don't spend it all.\" (You will.)";
        }
        case "rumor": {
          const cands = W.NPCS.filter((n) => n.secret && this.s.npcs[n.id].secret < 100 && (this.s.npcs[n.id].arrived));
          if (!cands.length) return " Nothing new to hear.";
          const n = pick(cands);
          return " " + this.dig(n.id, 25, `You overheard something about ${n.name}.`);
        }
        case "discover": {
          const cands = W.NPCS.filter((n) => n.secret && this.s.npcs[n.id].secret < 100 && this.s.npcs[n.id].arrived);
          if (!cands.length) return "";
          const n = pick(cands);
          return " " + this.dig(n.id, 35, `The aunties were talking about ${n.name}.`);
        }
        case "meet": { this.meet(placeId); return ""; }
        case "remote": {
          const usd = { ijgb: 70, japa: 60, firsttimer: 55 }[s.persona] || 0;
          if (usd) { s.usd += usd; s.stats.earned += usd * s.fx; return ` You earned $${usd}. Abroad salary, Naija prices.`; }
          const pay = round100(20000 * (0.85 + this.rng() * 0.3));
          this.earn(pay, "remote");
          return ` You made ${naira(pay)} freelancing.`;
        }
        case "workout": s.flags.fitDay = this.day(); return " You feel strong. Tomorrow's energy will thank you.";
        case "broker": {
          const pay = round100((s.persona === "hustler" ? 60000 : 35000) * (0.8 + this.rng() * 0.4));
          this.earn(pay, "broker"); this.addStat("conn", 3);
          if (s.persona === "hustler") this.addStat("res", 6);
          return ` You connected an IJGB with a car owner. Your cut: ${naira(pay)}.`;
        }
        case "foodstuff": this.relAll(2); if (this.s.npcs.mama) this.rel("mama", 6); return " Mama is very pleased.";
        case "asoebi": this.addStyle("tradfusion"); return " Trad fusion fit added to your wardrobe.";
        case "goat": {
          const price = this.price(Math.max(60000, 160000 - this.streetSense() * 1000), "market");
          if (!this.canAfford(price)) { this.applyFx({ vibes: -5 }); return ` The seller wants ${naira(price)}. Even the goat laughed at you.`; }
          this.pay(price); s.flags.goat = true; this.addStat("rep", 8); this.unlock("goat");
          return ` You got it for ${naira(price)}. The goat is now judging you from the compound.`;
        }
        case "owambe": {
          s.stats.owambes++;
          this.unlock("first_owambe");
          s.inventory.souvenir = (s.inventory.souvenir || 0) + 1;
          if (["tradfusion", "afrochic"].includes(s.look.style)) { s.stats.owambeTrad++; this.addStat("rep", 5); this.addStat("clout", 3); this.addMemory(`🎊 Slayed an owambe in aso-ebi · ${this.day()} Dec`); return " Your aso-ebi got the aunties talking — in a good way."; }
          this.addStat("rep", -3);
          this.addMemory(`🎊 Owambe · ${this.day()} Dec`);
          return " Great party. The aunties noticed you skipped the aso-ebi, though.";
        }
        case "hotelnight": s.flags.hotelNight = this.day(); return " You can sleep here tonight.";
        case "rentcar": s.flags.car = this.day(); return " The car is yours until midnight. Rides are free (traffic still applies).";
        case "loan": s.naira += 150000; s.flags.loan = 195000; return " ₦150,000 landed. ₦195,000 due before you leave December.";
        case "repay": {
          if (!this.canAfford(s.flags.loan)) return " You don't have enough to repay yet.";
          this.pay(s.flags.loan); s.flags.loan = 0; this.addStat("rep", 2);
          return " Loan repaid. Your credit score breathes.";
        }
        case "tailor": {
          const style = ["tradfusion", "afrochic"].find((x) => !s.wardrobe.includes(x)) || "tradfusion";
          s.flags.tailor = { style, ready: s.t + 2 * DAY };
          return ` Your tailor says it'll be ready in 2 days. (Tailors always say that.)`;
        }
        case "church": return "";
        case "pray": if (this.has("prayer")) { this.applyFx({ vibes: 6 }); s.exposure = clamp(s.exposure - 3); } return "";
        case "party": {
          if (this.clock().hh >= 4 && this.clock().hh < 6) this.unlock("last_standing");
          this.addMemory(`🪩 Partied at ${this.places.club.name} · ${this.day()} Dec`);
          return "";
        }
        case "drama": {
          const r = this.rng();
          s.stats.wahalas++;
          if (r < 0.45) { this.addStat("clout", 8); this.addStat("rep", -6); this.addStat("followers", 300); return " You called out someone's fake designer. The video is going round."; }
          if (r < 0.8) { this.addStat("rep", -10); this.applyFx({ vibes: -10 }); return " It turned into a full fight. Security threw you both out."; }
          this.addStat("clout", 4); return " Nobody cared. Embarrassing.";
        }
        case "vip": this.addMemory(`🍾 VIP table at ${this.places.club.name}`); this.news("vip"); return "";
        case "concert": s.inventory.concert_ticket--; s.inventory.stub = (s.inventory.stub || 0) + 1; this.unlock("concert"); this.addMemory(`🎤 Detty Fest concert · ${this.day()} Dec`); this.news("concert"); return "";
        case "resell": {
          if (this.rng() < 0.5 + s.conn / 200) { const pay = round100(80000 * (s.persona === "hustler" ? 1 + s.res / 100 : 0.8)); this.earn(pay, "resale"); return ` Sold out! You made ${naira(pay)}.`; }
          this.applyFx({ vibes: -8 }); return " Nobody bought. Your feet hurt.";
        }
        case "datecheck": {
          const partner = this.peopleAt(placeId).find((id) => this.s.npcs[id] && this.s.npcs[id].romance >= 30);
          if (partner) { this.s.npcs[partner].romance = clamp(this.s.npcs[partner].romance + 12); this.rel(partner, 6); s.stats.dates++; this.addMemory(`🌇 Sunset with ${this.who(partner).name}`); return ` ${this.who(partner).name} joined you. 💞`; }
          return "";
        }
        case "crew": this.relAll(5); this.addMemory("🧺 Picnic with the crew"); return "";
        case "collab": { const g = Math.round(150 + s.clout * 4); this.addStat("followers", g); this.addStat("conn", 3); return ` +${g} followers.`; }
        case "pickup": {
          const list = D_pending(this);
          list.forEach((n) => {
            const st = s.npcs[n.id];
            st.arrived = true; st.met = true; st.place = "family";
            this.rel(n.id, 15); this.addStat("rep", 4); this.remember(n.id, "helped");
            this.addMemory(`🛬 Picked up ${n.name} from ${n.from}`);
            s.flags["picked_" + n.id] = true;
          });
          if (W.NPCS.filter((n) => n.from).every((n) => s.flags["picked_" + n.id])) this.unlock("airport");
          this.applyFx({ vibes: 12 });
          return ` Hugs, screams and ${list.length * 2} heavy suitcases.`;
        }
        case "christmas": {
          let rep = (s.flags.goat ? 10 : -5) + ((s.inventory.gift_box || 0) > 0 ? 10 : -5);
          if (s.inventory.gift_box > 0) s.inventory.gift_box--;
          this.addStat("rep", rep); this.relAll(10);
          s.flags.christmasDone = true;
          this.addMemory("🎄 Christmas lunch with the whole family");
          return rep > 10 ? " Goat pepper soup, gifts, dancing. Legendary." : " Lovely lunch — but no goat and no gifts? The aunties noticed.";
        }
        case "crossover": { this.crossover(placeId); return ""; }
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
    }
    wear(style) {
      const s = this.s;
      if (!s.wardrobe.includes(style) || s.activity || s.ride) return false;
      s.look = { ...s.look, style, gele: style === "tradfusion" ? s.look.gele : false };
      this.log(`👗 You changed into your ${D.STYLES[style].name} fit.`, "action");
      return true;
    }
    equipItem(item) {
      const s = this.s, it = W.ITEMS[item];
      if (!it || !(s.inventory[item] > 0)) return false;
      if (it.kind === "shoes") s.equip.shoes = item;
      else if (it.kind === "bag") s.equip.bag = s.equip.bag === item ? null : item;
      else if (it.kind === "jewelry") { s.equip.jewelry = s.equip.jewelry === item ? null : item; s.look.chain = s.equip.jewelry === "chain"; }
      else if (it.kind === "food") { s.inventory[item]--; this.applyFx(it.eat); this.log(`${it.icon} You ate the ${it.name.toLowerCase()}.`, "action"); }
      else if (it.kind === "business" && item === "merch") {
        if (!s.place || this.places[s.place].type !== "concert" && this.places[s.place].type !== "beach") { this.log("Sell merch at the concert grounds or the beach.", "bad"); return false; }
        s.inventory.merch--; const pay = round100(it.sell * (s.persona === "hustler" ? 1 + s.res / 100 : 0.9)); this.earn(pay, "merch");
        this.passTime(90);
        this.log(`👕 You sold all your merch for ${naira(pay)}.`, "good");
      }
      return true;
    }
    // Clout from what you're wearing and carrying.
    accessoryClout() {
      const e = this.s.equip;
      return ["shoes", "bag", "jewelry"].reduce((a, k) => a + ((e[k] && W.ITEMS[e[k]].clout) || 0), 0);
    }

    // Menus that need a choice (shops, currency).
    openMenu(kind, placeId) {
      const s = this.s;
      const type = this.places[placeId].type;
      let ev;
      if (kind === "shop") {
        const choices = Object.entries(D.STYLES).filter(([k]) => !s.wardrobe.includes(k)).map(([k, st]) => ({ label: `${st.icon} ${st.name}`, note: st.blurb, cost: this.price(st.price, type), buyStyle: k, mins: 40 }));
        choices.push({ label: "Just looking" });
        ev = { title: "New Fit", icon: "🛍️", text: "Which look are you adding to your wardrobe? Each style eats in different places.", choices };
      } else if (kind === "accessories") {
        const choices = ["sneakers", "heels", "loafers", "boots", "designer_bag", "tiny_bag", "gold_watch", "chain", "perfume", "wine"].filter((k) => !(s.inventory[k] > 0) || W.ITEMS[k].kind === "gift").map((k) => {
          const it = W.ITEMS[k];
          return { label: `${it.icon} ${it.name}`, cost: this.price(it.price || (k === "perfume" ? 55000 : 18000), type), buyItem: k, mins: 15 };
        });
        choices.push({ label: "Nothing today" });
        ev = { title: "Shoes, Bags & Jewellery", icon: "👜", text: "Accessories add clout — and the bouncer checks your shoes.", choices };
      } else if (kind === "hair") {
        const choices = Object.entries(D.HAIR[s.look.body]).filter(([k]) => k !== s.look.hair).map(([k, n]) => ({ label: n, cost: this.price(25000, type), setHair: k, mins: 120 }));
        choices.push({ label: "Keep my hair" });
        ev = { title: "New Hair", icon: "💇🏾", text: "What are we doing today?", choices };
      } else {
        const rate = kind === "bdcmall" ? Math.round(s.fx * 0.95) : kind === "bdcbuy" ? Math.round(s.fx * 1.04) : s.fx;
        if (kind === "bdcbuy") {
          ev = { title: "Buy Dollars", icon: "💱", text: `Mallam Musa sells at ${naira(rate)} per dollar.`, choices: [100, 300].map((u) => ({ label: `Buy $${u}`, cost: u * rate, addUsd: u })).concat([{ label: "Leave" }]) };
        } else {
          ev = { title: kind === "bdcmall" ? "Mall Exchange Desk" : "Sell Dollars", icon: "💱", text: `Today's rate: ${naira(rate)} per $1${kind === "bdcmall" ? " (the mall desk takes a cut — the BDC pays better)" : ""}. You have $${Math.round(s.usd)}.`,
            choices: [50, 100, 500].filter((u) => u <= s.usd).map((u) => ({ label: `Sell $${u} → ${naira(u * rate)}`, sellUsd: u, rate })).concat(s.usd > 0 ? [{ label: `Sell all $${Math.round(s.usd)}`, sellUsd: Math.floor(s.usd), rate }] : []).concat([{ label: "Leave" }]) };
        }
      }
      this.queue(ev);
      this.flush();
    }

    // ============================================================ social media
    post(placeId) {
      const s = this.s;
      const p = this.places[placeId] || this.places.home;
      const base = { photo: 140, club: 100, concert: 170, beach: 90, lounge: 90, mall: 50, restaurant: 60, hall: 80, home: 30 }[p.type] || 40;
      const fit = D.STYLES[s.look.style].shines.includes(p.type) ? 1.5 : 1;
      let gain = base * (1 + s.clout / 150) * fit * (s.persona === "influencer" ? 1.4 : 1) * (this.has("clout") ? 1.3 : 1) * (0.7 + this.rng() * 0.6);
      gain = Math.round(gain + this.accessoryClout() * 10);
      this.addStat("followers", gain);
      this.addStat("clout", 2 + Math.round(fit * 1.5));
      s.stats.posts++;
      s.flags.posted = this.day();
      if (s.persona === "influencer") s.res = clamp(s.res + 15);
      const likes = Math.round(gain * (4 + this.rng() * 6));
      const comments = [];
      const nice = ["This fit is everything 🔥", "Detty December no dey carry last!", "Where is this?? 😍", "Mother is mothering", "Okay soft life 👀", "Na you biko 🙌🏾"];
      comments.push(nice[Math.floor(this.rng() * nice.length)]);
      // Drama: the comment section can turn on you.
      let dramaP = 0.08;
      if (s.persona === "wannabe") dramaP += (100 - s.res) / 300;
      if (s.persona === "influencer" && s.naira < 80000) dramaP += 0.2;
      if (s.persona === "ijgb" && this.worth() < 500000) dramaP += 0.1;
      let drama = false;
      if (this.rng() < dramaP) {
        drama = true;
        comments.push(pickOne(this.rng, ["This guy dey form rich 😂", "Isn't this the same outfit from last week?", "Abeg who you dey impress?", "Borrowed drip spotted 👀"]));
        s.stats.wahalas++;
        this.queue({ title: "Comment Section Wahala", icon: "💬", text: `Someone commented on your post: "${comments[comments.length - 1]}" It has 400 likes.`,
          choices: [
            { label: "Clap back hard", clout: 6, rep: -5, followers: 200, exposure: 6 },
            { label: "Ignore it", fx: { vibes: -6 } },
            { label: "Delete the post", followers: -Math.round(gain / 2), clout: -2 },
          ] });
      }
      s.phone.posts.unshift({ t: s.t, place: p.name, icon: p.icon, likes, gain, comments, drama, style: s.look.style });
      if (s.phone.posts.length > 20) s.phone.posts.length = 20;
      return ` Posted from ${p.name}: +${gain.toLocaleString()} followers, ${likes.toLocaleString()} likes.`;
    }

    // ============================================================ persona ability
    abilityUses() { return this.s.flags.ab[this.day()] || 0; }
    abilityBlocked() {
      const s = this.s, P = this.P;
      if (s.over || s.event || s.activity || s.ride) return "Busy";
      if (this.abilityUses() >= P.ability.perDay) return "Used up for today";
      switch (s.persona) {
        case "ijgb": return s.usd < 100 ? "Need $100" : !s.place || s.place === "home" ? "Go somewhere people can see you" : null;
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
      s.flags.ab[this.day()] = this.abilityUses() + 1;
      let msg = "", mins = 0;
      switch (s.persona) {
        case "ijgb":
          s.usd -= 100; this.applyFx({ vibes: 15 }); this.addStat("clout", 8); this.addStat("rep", 2); this.addStat("conn", 3); this.addStat("followers", 150);
          this.addMemory("💵 Made it rain dollars");
          msg = "💵 You sprayed $100. Everybody is chanting your name.";
          break;
        case "wannabe":
          this.addStat("clout", 10); this.addStat("followers", 200); this.addStat("res", -8); this.addExposure(6);
          msg = "🕶️ \"Back in London, we used to…\" Your story is doing numbers.";
          break;
        case "japa":
          this.applyFx({ energy: -8 }); this.addStat("conn", 4 + Math.round(s.res / 20)); this.addStat("rep", 4); this.addStat("res", 4);
          s.stats.japaHelped++;
          msg = "📄 You walked someone through the whole visa process. They're calling you 'Oga'.";
          mins = 30;
          break;
        case "firsttimer":
          this.applyFx({ belle: 30, vibes: 6 }); this.addStat("res", 8); this.addStat("rep", 2); s.flags.hint = true;
          msg = "🤗 An aunty fed you egusi and explained everything. Next culture test, you'll know what to do.";
          mins = 45;
          break;
        case "hustler":
          this.addStat("res", -15); s.flags.guy = true;
          msg = "📞 \"I know a guy.\" Your next purchase is half price.";
          break;
        case "influencer":
          msg = "🤳🏾" + this.post(s.place || "home");
          break;
        case "pikin":
          s.naira += 200000; this.addStat("res", -25); this.addExposure(12);
          msg = "💳 Daddy's card: ₦200,000. \"Don't spend it all.\"";
          break;
        case "aunty":
          this.addStat("gossip", -1); this.addStat("conn", 8); this.addStat("rep", -1); s.flags.guy = true; this.addExposure(8);
          msg = "🗣️ You traded some juicy gist for a favour. Next purchase is half price.";
          break;
      }
      this.log(msg, "good");
      if (mins) this.passTime(mins);
      this.checkAchievements();
      this.flush();
    }

    // ============================================================ getting around
    trafficLevel(t = this.s.t) {
      const c = clock(t);
      let lvl = 0;
      if ((c.hh >= 7 && c.hh < 10) || (c.hh >= 16 && c.hh < 20)) lvl += 2;
      else if (c.hh >= 10 && c.hh < 16) lvl += 1;
      if (W.eventsOn(c.day).includes("concert") && c.hh >= 15) lvl += 1;
      if (c.day >= 21 && c.day <= 31 && c.hh >= 12) lvl += 1;
      if (this.s.city === "abuja") lvl -= 1;
      lvl += (D.AREAS[this.s.city][this.s.area].traffic || 0) > 0.1 ? 1 : 0;
      return Math.max(0, Math.min(3, lvl));
    }
    rideModes() {
      const s = this.s;
      const modes = {
        danfo: { name: "Danfo", icon: "🚌", base: 500, perUnit: 2, speed: 3.2, wait: 12, traffic: 1.3, needStop: true },
        keke: { name: "Keke", icon: "🛺", base: 600, perUnit: 8, speed: 3.0, wait: 5, traffic: 1.0 },
        okada: { name: "Okada", icon: "🏍️", base: 500, perUnit: 10, speed: 5.0, wait: 3, traffic: 0.35, risky: true },
        bolt: { name: "Bolt", icon: "🚗", base: 1500, perUnit: 45, speed: 5.5, wait: 6, traffic: 1.0 },
      };
      if (s.flags.car === 99 || s.flags.car === this.day()) modes.car = { name: s.flags.car === 99 ? "Daddy's car" : "Rented car", icon: "🚙", base: 0, perUnit: 0, speed: 5.5, wait: 0, traffic: 1.0 };
      return modes;
    }
    // Options for getting from where you are to a place.
    travelOptions(to, from = this.s.pos) {
      const s = this.s;
      const dest = this.places[to];
      if (!dest) return [];
      const start = from || this.places[s.place || "home"].door;
      const dist = dest.remote ? 160 : NAV.length(NAV.pathFromPoint(this.nav, start.x, start.z, to));
      const tl = this.trafficLevel();
      const tMult = [1, 1.5, 2.4, 3.4][tl];
      const out = [];
      const walkMins = Math.round(dist / 6);
      if (!dest.remote) out.push({ mode: "walk", name: "Walk", icon: "🚶🏾", cost: 0, mins: walkMins, base: walkMins, why: null });
      for (const [k, m] of Object.entries(this.rideModes())) {
        const base = Math.round(m.wait + dist / m.speed);
        const mins = Math.round(m.wait + (dist / m.speed) * (1 + (tMult - 1) * m.traffic));
        let cost = round100((m.base + dist * m.perUnit) * (k === "bolt" && (tl >= 2 || clock(s.t).hh >= 23 || clock(s.t).hh < 5) ? 1.8 : 1) * (dest.remote ? 2.5 : 1) * D.AREAS[s.city][s.area].travel);
        if (k === "car") cost = 0;
        let why = null;
        if (m.needStop && (s.place !== "busstop")) why = "Catch it at the bus stop";
        if (dest.remote && ["danfo", "keke", "okada"].includes(k)) why = "Too far — take a Bolt";
        if (k === "okada" && s.city === "lagos" && crossesLagoon(start.z, dest.door.z)) why = "Okada is banned on the bridge";
        if (!why && cost && !this.canAfford(cost)) why = `Need ${naira(cost)}`;
        out.push({ mode: k, name: m.name, icon: m.icon, cost, mins, base, why, risky: m.risky });
      }
      return out;
    }
    trafficLabel() { return ["Light", "Moderate", "Heavy", "Gridlock"][this.trafficLevel()]; }
    travel(to, mode) {
      const s = this.s;
      if (s.over || s.event || s.activity || s.ride || s.convo) return false;
      const opt = this.travelOptions(to).find((o) => o.mode === mode);
      if (!opt || opt.why || mode === "walk") return false;
      this.pay(opt.cost);
      s.inside = false;
      s.ride = { to, mode, start: s.t, end: s.t + opt.mins, icon: opt.icon, name: opt.name, mins: opt.mins, base: opt.base };
      if (s.persona === "influencer" && ["danfo", "keke", "okada"].includes(mode)) this.addExposure(3);
      if (opt.mins > opt.base * 1.6) this.log(`🚦 Traffic: ${this.trafficLabel()}. ${opt.base} min → ${opt.mins} min.`, "bad");
      else this.log(`${opt.icon} ${opt.name} to ${this.placeName(to)}${opt.cost ? ` (−${naira(opt.cost)})` : ""}. ~${opt.mins} min.`, "action");
      return true;
    }
    finishRide() {
      const s = this.s;
      const r = s.ride;
      s.ride = null;
      const dest = this.places[r.to];
      s.pos = { x: dest.spot.x, z: dest.spot.z };
      s.place = r.to;
      s.inside = false;
      if (r.mode === "okada" && this.rng() < 0.12) { this.applyFx({ energy: -8, vibes: -10 }); this.log("🏍️ The okada man nearly entered a gutter. Your heart is still racing.", "bad"); }
      this.log(`📍 Arrived at ${this.placeName(r.to)}.`, "info");
      if (dest.remote) this.enter(r.to);
      else this.maybeEncounter(0.18, "ride");
      this.flush();
    }
    // The world tells the sim where the player is walking.
    setPos(x, z) {
      const s = this.s;
      const prev = s.pos;
      s.pos = { x, z };
      if (prev) {
        s.flags.walked = (s.flags.walked || 0) + Math.hypot(x - prev.x, z - prev.z);
        if (s.flags.walked > 70) { s.flags.walked = 0; this.maybeEncounter(0.25, "walk"); }
      }
      if (s.place && !s.inside) {
        const p = this.places[s.place];
        if (p && Math.hypot(p.door.x - x, p.door.z - z) > 8) s.place = null;
      }
    }

    // ============================================================ encounters
    maybeEncounter(chance, where) {
      const s = this.s;
      if (s.over || s.event || s.queue.length || s.convo || this.rng() > chance) return;
      if (this.has("prayer") && this.rng() < 0.12) { this.log("🙏🏾 Wahala was looking for you today, but God caught it.", "good"); return; }
      // Walking encounters with people.
      if (where === "walk" && this.rng() < 0.4) {
        const r = this.rng();
        const st = s.strangers[Math.floor(this.rng() * s.strangers.length)];
        if (r < 0.35) { st.met = true; this.queue({ title: "Old Classmate!", icon: "🎓", text: `"Ah! ${s.name}? It's me, ${st.name}! UNILAG, 2019!" They want to catch up.`, choices: [{ label: "Catch up properly", mins: 30, conn: 4, fx: { vibes: 8 }, relTo: { [st.id]: 20 } }, { label: "\"Abeg I'm in a hurry\"", relTo: { [st.id]: -5 } }] }); return; }
        if (r < 0.6 && s.followers >= 1500) { this.queue({ title: "Recognised!", icon: "📱", text: `"Wait… are you @${slug(s.name)}? I watch your videos!" A small crowd forms.`, choices: [{ label: "Take selfies with everyone", mins: 20, clout: 5, followers: 120, fx: { vibes: 10 } }, { label: "Wave and keep moving", clout: 1 }] }); return; }
        if (r < 0.8) { this.queue({ title: "Party Tonight?", icon: "🎉", text: `A stranger hands you a flyer. "Party at ${this.places.club.name} tonight. You coming?"`, choices: [{ label: "Maybe!", conn: 1 }, { label: "Ask who's performing", text: "\"Rumour says a surprise guest.\"", fx: { vibes: 3 } }] }); return; }
        this.queue({ title: "Checkpoint Ahead", icon: "🚓", text: "\"Oga, where your particulars? Wetin dey that bag? Find something for the boys.\"", choices: [{ label: "Settle them (₦5k)", cost: 5000, fx: { vibes: -5 } }, { label: "Know your rights", roll: { use: "street", base: 0.35, win: { rep: 3, text: "They waved you on." }, lose: { cost: 10000, mins: 60, text: "They held you for an hour and still collected ₦10k." } } }] });
        s.stats.wahalas++;
        return;
      }
      const pool = D.RANDOM_EVENTS.filter((e) => (!e.persona || e.persona === s.persona) && (!e.cond || (COND[e.cond] && COND[e.cond](this))) && !s.recent.includes(e.id));
      if (!pool.length) return;
      const w = (e) => e.weight * (e.persona ? 1.8 : 1);
      const total = pool.reduce((t, e) => t + w(e), 0);
      let r = this.rng() * total;
      const ev = pool.find((e) => (r -= w(e)) < 0) || pool[0];
      s.recent.unshift(ev.id);
      s.recent.length = Math.min(s.recent.length, 8);
      const choices = ev.choices.map((c) => ({ ...c }));
      if (ev.daddy && s.persona === "pikin" && s.res >= 20) choices.push({ label: "📞 \"Daddy will handle it\"", res: -20, exposure: 12, rep: 4, text: "One phone call. Problem gone." });
      if (s.flags.hint && ev.persona === "firsttimer") { choices.forEach((c) => { if (c.culture > 0) c.label = "⭐ " + c.label; }); s.flags.hint = false; }
      if (["checkpoint", "snatch", "fuel", "nepa"].includes(ev.id)) s.stats.wahalas++;
      this.queue({ id: ev.id, title: ev.title, icon: ev.icon, text: ev.text, choices });
    }

    // ============================================================ modal events
    queue(ev) { this.s.queue.push(ev); }
    flush() { const s = this.s; if (!s.event && s.queue.length && !s.over) s.event = s.queue.shift(); }
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
      if (o.naira) this.earn(o.naira);
      if (o.gig) this.earn(round100(o.gig * (s.persona === "hustler" ? 1 + s.res / 100 : 0.8) * (this.has("hustlebrain") ? 1.25 : 1)), "gig");
      if (o.fx) this.applyFx(o.fx);
      ["clout", "rep", "conn", "gossip", "followers"].forEach((k) => this.addStat(k, o[k]));
      if (o.res && !["ijgb", "aunty"].includes(s.persona)) this.addStat("res", o.res);
      if (o.culture && s.persona === "firsttimer") { this.addStat("res", o.culture); if (o.culture < 0) this.addExposure(4); }
      if (o.exposure) this.addExposure(typeof o.exposure === "object" ? o.exposure[s.persona] || 0 : o.exposure);
      if (o.ijgbExposure && s.persona === "ijgb") this.addExposure(o.ijgbExposure);
      if (o.relAll) this.relAll(o.relAll);
      if (o.relTo) for (const id in o.relTo) this.rel(id, o.relTo[id]);
      if (o.gen) s.genUntil = Math.max(s.genUntil, s.t) + o.gen * 60;
      if (o.flag === "lightOff") s.light = false;
      if (o.flag === "lightOn") s.light = true;
      if (o.big) s.stats.bignights++;
      if (o.memory) this.addMemory(o.memory);
      if (o.unlock) this.unlock(o.unlock);
      if (o.news) this.news(o.news);
      if (o.give) s.inventory[o.give] = (s.inventory[o.give] || 0) + 1;
      if (o.buyStyle) { this.addStyle(o.buyStyle); this.log(`🛍️ ${D.STYLES[o.buyStyle].name} added to your wardrobe. Change at home or right here.`, "good"); }
      if (o.buyItem) { s.inventory[o.buyItem] = (s.inventory[o.buyItem] || 0) + 1; const it = W.ITEMS[o.buyItem]; if (["shoes", "bag", "jewelry"].includes(it.kind)) this.equipItem(o.buyItem); this.log(`${it.icon} Bought: ${it.name}.`, "good"); }
      if (o.setHair) { s.look = { ...s.look, hair: o.setHair }; this.log(`💇🏾 New hair: ${D.HAIR[s.look.body][o.setHair]}.`, "good"); }
      if (o.sellUsd) { const got = o.sellUsd * o.rate; s.usd -= o.sellUsd; s.naira += got; this.log(`💱 Sold $${o.sellUsd} for ${naira(got)}.`, "good"); }
      if (o.japaCount) s.stats.japaHelped++;
      if (o.addUsd) { s.usd += o.addUsd; this.log(`💱 Bought $${o.addUsd}.`, "good"); }
      const mins = (o.mins || 0) + (o.slots || 0) * 120;
      return mins;
    }
    choose(i) {
      const s = this.s;
      const ev = s.event;
      if (!ev) return;
      const c = ev.choices[i];
      if (!c || !this.canChoose(c)) return;
      s.event = null;
      let text = c.text ? " " + c.text : "";
      let mins;
      if (c.roll) {
        const r = c.roll;
        const val = r.use === "street" ? this.streetSense() : r.use === "clout" ? s.clout : r.use === "res" ? s.res : s.conn;
        const p = r.base + val / 100 + (this.has("smooth") ? 0.2 : 0);
        const out = this.rng() < p ? r.win : r.lose;
        mins = this.applyOutcome(out);
        text = " " + out.text;
      } else mins = this.applyOutcome(c);
      text += this.resolveSpecial(c, ev) || "";
      if (c.label && !/^(Leave|Just looking|Nothing today|Keep my hair)$/.test(c.label)) this.log(`${ev.icon} ${ev.title} → ${c.label}.${text}`, c.tone || "event");
      if (c.end) { this.finish(c.end, c.partner); return; }
      if (mins) this.passTime(mins);
      this.checkAchievements();
      this.checkCrisis();
      this.flush();
    }
    resolveSpecial(c, ev) {
      const s = this.s;
      if (!c.special) return "";
      if (c.special === "forcesleep") { s.place = "home"; s.inside = true; s.activity = { id: "sleep", place: "home", start: s.t, end: s.t + 360, label: "Sleep", icon: "😴" }; return ""; }
      if (c.special === "own") { s.exposed = true; this.news("exposed"); this.unlock("caught"); return ""; }
      if (c.special === "village") { s.flags.village = true; this.skipTo(26 * DAY - DAY + W.hm("09:00")); return ""; }
      if (c.special === "bigbreak") { s.flags.bigbreak = true; this.unlock("bigbreak"); return ""; }
      if (c.special.startsWith("bolt_")) { const id = c.special.slice(5); s.npcs[id].arrived = true; s.npcs[id].met = true; s.flags["bolt_" + id] = true; return ` ${this.who(id).name} took the Bolt you booked.`; }
      if (c.special === "chain") return this.chainChoose(c);
      if (c.special === "reply") return this.replyEffects(c);
      return "";
    }
    skipTo(t) {
      const s = this.s;
      while (s.t < t && !s.over) {
        const step = Math.min(5, t - s.t);
        const before = s.t; s.t += step;
        if (Math.floor(before / DAY) !== Math.floor(s.t / DAY)) this.newDay();
      }
      s.place = "home"; s.inside = true; s.pos = null;
      this.updateNpcs();
    }
    exposedEvent() {
      return {
        title: "EXPOSED!", icon: "😱",
        text: `It's all over the group chats and the blogs: "${this.P.secret}" Everyone is looking at you differently.`,
        choices: [
          { label: "Own it and laugh with them", special: "own", clout: -15, rep: 5, followers: -400, fx: { vibes: -10 }, memory: "😱 Got exposed — and owned it" },
          { label: "Deny everything", special: "own", clout: -30, rep: -15, followers: -900, fx: { vibes: -15 }, memory: "😱 Got exposed and denied it" },
        ],
      };
    }

    // ============================================================ conversations
    // Opens a conversation with a named person or a stranger standing nearby.
    talk(id) {
      const s = this.s;
      if (s.over || s.event || s.activity || s.ride) return false;
      const def = this.who(id);
      const st = this.whoState(id);
      if (!def || !st) return false;
      // Story chains take over when it's their moment.
      const chainEv = this.chainCheck({ talk: id }, true);
      if (chainEv) { this.flush(); return true; }
      const first = !st.met;
      st.met = true;
      const named = !!this.npcDef(id);
      s.convo = { id, node: "menu", text: this.opener(id, first), named, asked: false };
      st.lastTalk = s.t;
      return true;
    }
    opener(id, first) {
      const s = this.s;
      const def = this.who(id);
      const st = this.whoState(id);
      const pick = (a) => a[Math.floor(this.rng() * a.length)];
      const ident = this.identity();
      if (this.remembers(id, "exposed")) return "\"After what you did, you still have the mind to come and greet me?\"";
      if (this.remembers(id, "blackmailed")) return "\"You again? Wetin you want now? More money?\"";
      if (this.remembers(id, "embarrassed", 3 * DAY)) return "\"Hmm. After how you embarrassed me the other day…\"";
      if (this.remembers(id, "revealedSecret")) return "\"I heard you've been telling people my business.\"";
      if (this.remembers(id, "ignored", 2 * DAY)) return "\"Ah, so you dey ignore my messages? Okay o.\"";
      if (this.remembers(id, "protected")) return pick(["\"My person! Anything you need, just ask.\"", "\"You're one of the real ones, you know that?\""]);
      if (ident.id === "fraud") return "\"Wait… na you be the fraud wey everybody dey talk about?\"";
      if (ident.id === "celeb" && first) return `"Hold on — are you THE @${slug(s.name)}?"`;
      if (s.partner === id) return pick(["\"There you are. I missed you.\"", "\"Babe! Where have you been all day?\""]);
      if (first && def.role) return `"Hi, I'm ${def.name}." (${def.role})`;
      if (def.lines) return pick(def.lines.hi).replace(/^/, "\"") + "\"";
      return pick(["\"How far? December don land o!\"", "\"Hello! Enjoying the season?\"", "\"Ah, you look familiar. Have we met?\""]);
    }
    // What you can say. Each option is {id, label, why}.
    convoOptions() {
      const s = this.s;
      const c = s.convo;
      if (!c) return [];
      if (c.node === "question") return c.question.a.map((a, i) => ({ id: "answer:" + i, label: a.label, why: a.cost && !this.canAfford(a.cost) ? "Not enough money" : null }));
      const id = c.id;
      const def = this.who(id);
      const st = this.whoState(id);
      const named = c.named;
      const o = [{ id: "gist", label: "💬 Gist" }];
      if (!c.asked) o.push({ id: "ask", label: "🎲 \"So, what's new?\"" });
      if (named && def.secret && st.secret < 100) o.push({ id: "dig", label: "🕵🏾 Ask about their December" });
      const gift = Object.keys(s.inventory).find((k) => W.ITEMS[k] && W.ITEMS[k].kind === "gift" && s.inventory[k] > 0);
      if (gift) o.push({ id: "gift:" + gift, label: `${W.ITEMS[gift].icon} Give ${W.ITEMS[gift].name}` });
      if (named && !def.vendor) o.push({ id: "money", label: "💸 Give ₦10,000", why: this.canAfford(10000) ? null : "Not enough money" });
      if (named && def.romance && !def.family) o.push({ id: "flirt", label: "😏 Flirt" });
      if (named && def.romance && st.romance >= 30 && st.rel >= 50 && s.partner !== id) o.push({ id: "askout", label: "💞 Ask them out" });
      if (named && st.rel >= 60 && !st.favour && !def.vendor) o.push({ id: "favour", label: "🙏🏾 Ask for a favour" });
      if (!named) o.push({ id: "follow", label: "📱 Swap Instagrams" });
      if (named && def.secret && st.secret >= 100 && !st.state) {
        o.push({ id: "keep", label: "🤐 \"Your secret is safe with me\"" });
        o.push({ id: "befriend", label: "🤝 \"I know. I'm on your side.\"" });
        o.push({ id: "tell", label: "🗣️ Tell someone else" });
        o.push({ id: "expose", label: "📣 Expose them" });
        if (!def.family && id !== "seun") o.push({ id: "blackmail", label: "💰 Demand money to keep quiet" });
        if (id !== "nkechi") o.push({ id: "trade", label: "🤝 Trade the info to Mama Nkechi" });
      }
      if (this.s.persona === "japa" && named && !st.japaHelped) o.push({ id: "japa", label: "📄 Explain how to japa" });
      o.push({ id: "bye", label: "👋 Bye" });
      return o.map((x) => ({ why: null, ...x }));
    }
    convoSay(optId) {
      const s = this.s;
      const c = s.convo;
      if (!c) return;
      const id = c.id;
      const def = this.who(id);
      const st = this.whoState(id);
      const named = c.named;
      const pick = (a) => a[Math.floor(this.rng() * a.length)];
      const name = def.name;
      let reply = "";
      let mins = 10;
      if (optId.startsWith("gift:")) {
        const item = optId.slice(5);
        s.inventory[item]--; this.rel(id, W.ITEMS[item].rel); this.remember(id, "gifted");
        if (named && def.romance) st.romance = clamp(st.romance + 6);
        reply = "\"For me?! You shouldn't have!\"";
      } else if (optId.startsWith("answer:")) {
        const a = c.question.a[Number(optId.slice(7))];
        this.rel(id, a.rel || 0);
        this.applyOutcome({ ...a, relTo: undefined, mem: undefined });
        if (a.mem) this.remember(id, a.mem);
        if (a.lie && s.persona === "wannabe") { this.addExposure(5); this.addStat("res", -3); }
        if (a.truth && s.persona === "wannabe") this.addStat("res", 10);
        if (a.japaHelp) s.stats.japaHelped++;
        if (a.styleCheck && D.STYLES[s.look.style].shines.includes(this.places[s.place || "home"].type)) this.addStat("clout", 2);
        reply = a.text || pick(["\"Haha, I hear you.\"", "\"Okay o!\"", "\"Na so.\"", "\"You too much!\""]);
        mins = a.mins || 10;
        c.node = "menu";
      } else switch (optId) {
        case "gist": {
          this.rel(id, 6); this.applyFx({ vibes: 5, energy: -2 }); this.addStat("conn", 1);
          if (named && def.secret) reply = this.dig(id, 8, null) || "";
          reply = (def.lines ? pick(["\"You won't believe what happened at the party last night…\"", "\"December is too sweet this year.\"", "\"Abeg, who you dey see these days?\""]) : pick(["\"This Lagos traffic will kill person.\"", "\"Have you tried the suya at night? Madness.\"", "\"December no dey carry last!\""])) + (reply ? " " + reply : "");
          if (named && def.romance && st.romance >= 20) st.romance = clamp(st.romance + 3);
          break;
        }
        case "ask": {
          c.asked = true;
          const qs = W.QUESTIONS.filter((q) => !q.persona || q.persona.includes(s.persona));
          const q = qs[Math.floor(this.rng() * qs.length)];
          c.question = { q: q.q.replace("{club}", this.places.club.name), a: q.a };
          c.node = "question";
          c.text = `"${c.question.q}"`;
          return;
        }
        case "dig": {
          mins = 20;
          this.rel(id, -3);
          reply = this.dig(id, 25, null) || "\"Why you dey ask me all these questions?\"";
          break;
        }
        case "money": this.pay(10000); this.rel(id, 10); this.remember(id, "gaveMoney"); reply = "\"Ah! God bless you!\""; break;
        case "flirt": {
          const ok = st.rel >= 40 && this.rng() < 0.5 + st.rel / 200 + (this.has("smooth") ? 0.2 : 0);
          if (ok) { st.romance = clamp(st.romance + 12); this.rel(id, 3); this.remember(id, "flirted"); reply = pick(["\"Stop it 🙈… actually don't.\"", "\"You're trouble, you know that?\"", "\"Smooth. Very smooth.\""]); }
          else { this.rel(id, -4); reply = pick(["\"Haha. No.\"", "\"Is that how you talk to everybody?\""]); this.remember(id, "embarrassed"); }
          if (s.partner && s.partner !== id) { this.rel(s.partner, -8); this.log(`👀 Word might get back to ${this.who(s.partner).name}…`, "bad"); }
          break;
        }
        case "askout": {
          if (st.romance >= 50 || this.rng() < st.romance / 80) {
            s.partner = id; st.romance = clamp(st.romance + 15); this.rel(id, 8); s.stats.dates++;
            this.unlock("lover"); this.addMemory(`💞 Started dating ${name}`);
            reply = "\"I thought you'd never ask. Yes!\"";
          } else { st.romance = clamp(st.romance - 5); reply = "\"Let's… take it slow.\""; }
          break;
        }
        case "favour": {
          st.favour = true;
          const f = FAVOURS[id] || { conn: 8, text: "\"Anything for you. I'll put in a word with my people.\"" };
          this.applyOutcome(f);
          reply = f.text;
          break;
        }
        case "follow": this.addStat("followers", 15); this.rel(id, 6); reply = "\"Followed! Tag me in your pictures.\""; break;
        case "japa": st.japaHelped = true; s.stats.japaHelped++; this.rel(id, 10); this.addStat("rep", 4); mins = 30; reply = "\"Ah! This is gold. Thank you!\""; break;
        case "keep": {
          st.state = "protected"; this.rel(id, 15); st.trust = clamp(st.trust + 20); this.remember(id, "protected"); this.unlock("loyal");
          if (!st.favour && FAVOURS[id]) { st.favour = true; this.applyOutcome(FAVOURS[id]); reply = FAVOURS[id].text; } else reply = "\"Thank you. I won't forget this.\"";
          this.addMemory(`🤐 Kept ${name}'s secret`);
          break;
        }
        case "befriend": st.state = "protected"; this.rel(id, 22); this.addStat("conn", 5); this.remember(id, "helped"); reply = "\"…You know? And you're not going to use it? Okay. You're my person now.\""; this.addMemory(`🤝 Became real friends with ${name}`); break;
        case "tell": {
          st.state = "told"; this.addStat("gossip", 1); this.addStat("conn", 3); this.addStat("rep", -2);
          if (this.rng() < 0.4) s.flags.leak = { id, at: s.t + DAY * (1 + this.rng()) };
          reply = `You told a few people what ${name} is hiding. It's spreading.`;
          c.node = "end";
          break;
        }
        case "expose": {
          st.state = "exposed"; st.rel = 0; this.remember(id, "exposed");
          this.addStat("clout", 18); this.addStat("followers", 500); this.addStat("rep", this.has("peacemaker") ? -20 : -10); this.addStat("conn", -5);
          if (def.persona === "wannabe") this.unlock("ijgb_exposed");
          if (s.persona === "aunty") this.addExposure(15);
          if (this.rng() < 0.5) s.flags.revenge = { id, at: s.t + DAY * (1 + this.rng()) };
          this.addMemory(`📣 Exposed ${name}`);
          reply = `You posted it: "${def.secret}" The blogs picked it up within the hour.`;
          c.node = "end";
          break;
        }
        case "blackmail": {
          const amt = BLACKMAIL[id] || 80000;
          st.state = "blackmailed"; this.earn(amt); this.rel(id, -40); this.remember(id, "blackmailed");
          if (this.rng() < 0.45) s.flags.bmLeak = { id, at: s.t + DAY * (1 + this.rng() * 2) };
          reply = `${name} sent ${naira(amt)} with shaking hands. "Happy now?"`;
          c.node = "end";
          break;
        }
        case "trade": {
          st.state = "told"; this.addStat("conn", 10); s.inventory.vip_band = (s.inventory.vip_band || 0) + 1;
          if (this.rng() < 0.3) s.flags.leak = { id, at: s.t + DAY };
          reply = "Mama Nkechi got the gist. You got a VIP wristband and a lot of new 'friends'.";
          c.node = "end";
          break;
        }
        case "bye":
        default: {
          reply = def.lines ? pick(def.lines.bye) : "\"Later!\"";
          s.convo = null;
          this.log(`💬 You talked with ${name}.`, "info");
          this.passTime(mins);
          this.flush();
          return;
        }
      }
      c.text = reply;
      if (c.node === "end") { s.convo = null; this.log(`💬 ${name}: ${reply}`, "event"); }
      this.passTime(mins);
      this.checkAchievements();
      this.flush();
    }
    // Uncover part of someone's secret.
    dig(id, amt, prefix) {
      const s = this.s;
      const def = this.npcDef(id);
      const st = s.npcs[id];
      if (!def || !def.secret || st.secret >= 100) return "";
      const before = st.secret;
      st.secret = clamp(st.secret + amt * (this.has("gossip") ? 2 : 1) * (s.persona === "aunty" ? 1.5 : 1));
      if (st.secret >= 100) {
        s.stats.secrets++;
        if (s.stats.secrets >= 4) this.unlock("amebo");
        if (s.persona === "aunty") this.addStat("gossip", 1);
        this.log(`🕵🏾 Secret uncovered: ${def.name} ${def.secretShort}.`, "achieve");
        return `${prefix ? prefix + " " : ""}🕵🏾 Now you know: ${def.secret}`;
      }
      if (before < 50 && st.secret >= 50) return `${prefix ? prefix + " " : ""}Something about ${def.name}'s story doesn't add up…`;
      return prefix || "";
    }
    // Meeting people at a place: talk to someone who's here.
    meet(placeId) {
      const s = this.s;
      const here = this.peopleAt(placeId).filter((id) => id !== s.partner || true);
      let id = here.length ? here[Math.floor(this.rng() * here.length)] : null;
      if (!id) { id = s.strangers[Math.floor(this.rng() * s.strangers.length)].id; }
      this.talk(id);
    }

    // ============================================================ real players
    // After the server accepts an action on another player, apply your side of it.
    remoteAction(r) {
      const s = this.s;
      const who = "@" + r.target;
      let msg;
      if (r.action === "gist") { this.applyFx({ vibes: 6, energy: -2 }); this.addStat("conn", 2); msg = `💬 You gisted with ${who}.`; }
      else if (r.action === "investigate") { this.applyFx({ energy: -4 }); msg = `🕵🏾 You asked around about ${who}.`; }
      else if (r.action === "expose") { msg = `📣 You exposed ${who}. The blogs picked it up within the hour.`; this.addMemory(`📣 Exposed ${who}`); if (s.persona === "aunty") this.addExposure(15); }
      else { msg = `🤐 You promised ${who} their secret is safe with you.`; this.unlock("loyal"); this.addMemory(`🤐 Kept ${who}'s secret`); }
      const e = r.effects || {};
      this.addStat("clout", e.clout); this.addStat("rep", e.rep); this.addStat("conn", e.conn);
      if (r.revealed) {
        msg += ` 🕵🏾 They're really a ${r.truth.personaName}: "${r.truth.secret}"`;
        s.stats.secrets++;
        if (s.stats.secrets >= 4) this.unlock("amebo");
        if (s.persona === "aunty") this.addStat("gossip", 1);
      }
      this.log(msg, r.action === "expose" ? "bad" : "good");
      this.passTime(r.action === "expose" || r.action === "protect" ? 5 : 20);
      this.checkAchievements();
      this.flush();
    }
    // Things other players did to you while you were away.
    applyInbox(items) {
      const s = this.s;
      for (const it of items) {
        const who = it.from_username ? "@" + it.from_username : "Someone";
        if (it.kind === "gist") { this.addStat("conn", 1); this.log(`💬 ${who} was gisting with you.`, "info"); }
        else if (it.kind === "discovered") { this.addExposure(10); this.message("unknown", `${who} found out your secret. Watch your back. 👀`); }
        else if (it.kind === "protected") { this.addStat("conn", 8); this.addStat("rep", 3); this.message("unknown", `${who} knows your secret — and promised to keep it. Real one. 🤐`); }
        else if (it.kind === "exposed") {
          this.message("unknown", `${who} EXPOSED you to the whole city! 📣`);
          if (!s.exposed && !s.confessed && s.persona !== "hustler") { s.exposure = 99; this.addExposure(1); }
          else { this.addStat("clout", -10); this.addStat("rep", -5); }
        }
      }
      this.flush();
    }

    // ============================================================ phone
    message(from, text, extra = {}) {
      const s = this.s;
      const m = { id: "m" + s.t + "_" + s.phone.messages.length, from, text, t: s.t, read: false, ...extra };
      s.phone.messages.unshift(m);
      if (s.phone.messages.length > 60) s.phone.messages.length = 60;
      s.phone.unread++;
      return m;
    }
    senderName(from) {
      const n = this.npcDef(from);
      return n ? n.name : { family: "Family Group 👨🏾‍👩🏾‍👧🏾", bank: "Naija Trust Bank", fashion: "Àṣà Fashion House", promo: "Detty Fest 🎤", brand: "Brand Partnerships", unknown: "Unknown number" }[from] || from;
    }
    readAll() { this.s.phone.unread = 0; this.s.phone.messages.forEach((m) => { m.read = true; }); }
    reply(msgId, i) {
      const s = this.s;
      const m = s.phone.messages.find((x) => x.id === msgId);
      if (!m || !m.choices || m.done) return;
      const c = m.choices[i];
      if (!c || !this.canChoose(c)) return;
      m.done = c.label;
      if (c.special === "chain") { this.chainChoose(c); this.flush(); return; }
      const mins = this.applyOutcome(c);
      this.replyEffects(c);
      this.resolveSpecial(c);
      this.log(`📱 Replied to ${this.senderName(m.from)}: ${c.label}`, "info");
      if (mins) this.passTime(mins);
      this.flush();
    }
    replyEffects(c) {
      const s = this.s;
      if (c.plan) s.plans.push({ ...c.plan, status: "pending" });
      if (c.rel && c.from) this.rel(c.from, c.rel);
      if (c.mem && c.from) this.remember(c.from, c.mem);
      if (c.blackTaxPaid) this.addStat("res", -0);
      return "";
    }
    morningMessages(day) {
      const s = this.s;
      // Arrivals.
      W.NPCS.filter((n) => n.from && n.arrives === day).forEach((n) => {
        this.message(n.id, `I land at ${this.places.airport.name} by 2pm today! Abeg come pick me 🙏🏾`, {
          choices: [{ label: "On my way (be there 2–6pm)", plan: { kind: "pickup", npc: n.id, place: "airport", start: day * DAY - DAY + W.hm("14:00"), end: day * DAY - DAY + W.hm("18:00") } }, { label: "Send them a Bolt link (₦15k)", cost: 15000, from: n.id, rel: -6, special: "bolt_" + n.id }],
        });
      });
      const ev = W.eventsOn(day);
      if (ev.includes("owambe")) {
        if (s.persona === "aunty") {
          this.message("nkechi", "Today: wedding at the Event Centre 3pm, a 50th at the Rooftop Lounge 6pm, AND a naming ceremony at your family house 1pm. You must show face at all three!! 😩");
        } else this.message("family", `Owambe today at ${this.places.hall.name}, from 3pm. Aso-ebi is compulsory o! 💃🏾`);
      }
      if (ev.includes("concert")) this.message("promo", `DETTY FEST TONIGHT at ${this.places.concert.name}! Gates open 4pm. Tickets at ${this.places.mall.name} or the gate. 🎤🔥`);
      if (ev.includes("beachparty")) this.message("promo", `Beach party at ${this.places.beach.name} today 2–7pm. Bring your crew 🏖️`);
      if (day === 24) this.queue({ title: "Village for Christmas?", icon: "🛖", text: "Mama: \"The whole family is going to the village tomorrow. Grandpa wants to see everybody. Bring the diaspora people too!\"",
        choices: [
          { label: "Go to the village (₦60k, back on the 26th)", cost: 60000, fx: { vibes: 25, belle: 40, energy: 25 }, rep: 15, conn: 5, relAll: 8, memory: "🛖 Christmas in the village with Grandpa", unlock: "village", special: "village" },
          { label: "Stay in the city (Christmas lunch at the family house, 1–4pm)", rep: -4 },
        ] });
      if (day === 25 && !s.flags.village) this.message("mama", "Merry Christmas my pikin! 🎄 Lunch at home 1pm. Don't come empty-handed o.");
      if (day === 31) this.message("family", "Crossover tonight! Where will you be at midnight? Church, club, rooftop, beach or home? 🎆");
      // Black tax and requests.
      const btChance = { ijgb: 0.5, pikin: 0.65, japa: 0.3 }[s.persona] || 0.12;
      if (this.rng() < btChance) this.blackTax();
      // Influencer brand deals.
      if (s.persona === "influencer" && s.followers >= 2500 && this.rng() < 0.45) {
        const pay = round100(30000 + s.followers * 6);
        this.message("brand", `Hi! We'd love a post from ${this.places.lounge.name} tonight. ${naira(pay)} + free drinks. Interested?`, {
          choices: [{ label: "Deal!", plan: { kind: "brand", place: "lounge", start: day * DAY - DAY + W.hm("18:00"), end: day * DAY - DAY + W.hm("23:30"), pay } }, { label: "Not tonight" }],
        });
      }
      // Wannabe questions.
      if (s.persona === "wannabe" && this.rng() < 0.4) this.message("unknown", "Hey! Saw your London posts. Which borough were you in? My cousin is in Croydon!", { choices: [{ label: "\"Croydon too, small world!\"", exposure: 10, clout: 2 }, { label: "Leave it on read", exposure: 2 }] });
      if (s.persona === "japa" && this.rng() < 0.5) this.message("unknown", "Good morning sir/ma. My uncle gave me your number. Please how can I japa? 🙏🏾🙏🏾", { choices: [{ label: "Send a long voice note", mins: 20, rep: 3, conn: 2, japaCount: true }, { label: "\"Google is free\"", rep: -3 }] });
      if (s.persona === "hustler" && !s.flags.bigbreakOffered && day >= 15 && s.res >= 70 && s.conn >= 55) {
        s.flags.bigbreakOffered = true;
        this.queue({ title: "The Opportunity", icon: "🚀", text: "An events company has seen how you move. They want you to run logistics for every major concert next year — with an advance.",
          choices: [{ label: "Take the deal", naira: 800000, conn: 15, rep: 10, special: "bigbreak", memory: "🚀 Landed the deal of a lifetime" }, { label: "Not now. December first.", fx: { vibes: 6 } }] });
      }
      // Gossip from Mama Nkechi.
      if (s.npcs.nkechi.rel >= 50 && this.rng() < 0.35) {
        const cands = W.NPCS.filter((n) => n.secret && s.npcs[n.id].secret < 100 && s.npcs[n.id].arrived && n.id !== "nkechi");
        if (cands.length) { const n = cands[Math.floor(this.rng() * cands.length)]; s.npcs[n.id].secret = clamp(s.npcs[n.id].secret + 20); this.message("nkechi", `Have you noticed something funny about ${n.name}? I'm just saying o 👀`); }
      }
      // Consequences catching up.
      this.consequences();
    }
    blackTax() {
      const s = this.s;
      const asks = s.persona === "pikin"
        ? [["Uncle Bayo", "Your cousin needs a car for Uber. Just ₦500k, you people have plenty.", 500000], ["Aunty Bisi", "Mummy says you're sponsoring the family party. ₦350k.", 350000], ["Your sister", "My wedding is next month. Can you cover the hall? ₦400k 🙏🏾", 400000]]
        : s.persona === "ijgb"
          ? [["Aunty Remi", "My son's phone fell in a gutter. You people have iPhones everywhere abroad 🙏🏾", 250000], ["Cousin Emeka", "They'll send me out of school Monday. ₦200k school fees please.", 200000], ["Uncle Bayo", "Small emergency. Send $100. God will replenish.", 155000]]
          : [["Uncle Bayo", "Small emergency. Send ₦50k. God will replenish.", 50000], ["Family Group", "Contributions for Grandma's 90th — ₦30k each.", 30000]];
      const [who, text, amt] = asks[Math.floor(this.rng() * asks.length)];
      const choices = [{ label: `Send ${naira(amt)}`, cost: amt, rep: 8 }, { label: `Send ${naira(Math.round(amt / 4 / 1000) * 1000)}`, cost: Math.round(amt / 4 / 1000) * 1000, rep: 2 }, { label: "Leave it on read", rep: -6, ijgbExposure: 8 }];
      if (s.persona === "pikin" && s.res >= 20) choices.push({ label: "📞 Tell them to call Daddy", res: -20, exposure: 10, rep: 3 });
      this.message("family", `${who}: ${text}`, { choices });
    }
    randomText() {
      const s = this.s;
      const friends = W.NPCS.filter((n) => s.npcs[n.id].met && s.npcs[n.id].arrived && s.npcs[n.id].rel >= 45 && !n.vendor && !n.family);
      if (!friends.length) return;
      const n = friends[Math.floor(this.rng() * friends.length)];
      const c = this.clock();
      const night = c.hh >= 18;
      const place = night ? (this.rng() < 0.5 ? "club" : "lounge") : ["cafe", "restaurant", "beach", "mall"][Math.floor(this.rng() * 4)];
      const start = s.t + 60, end = s.t + 60 + 240;
      if (n.romance && s.npcs[n.id].romance >= 30 && this.rng() < 0.5) {
        this.message(n.id, `Thinking about you 🙈 ${this.places.lounge.name} later?`, { choices: [{ label: "I'll be there 💞", from: n.id, rel: 3, plan: { kind: "date", npc: n.id, place: "lounge", start, end } }, { label: "Not tonight", from: n.id, rel: -3 }] });
        return;
      }
      if (this.rng() < 0.25) { this.message(n.id, "Abeg I need ₦20k urgently, I'll pay back by weekend 🙏🏾", { choices: [{ label: "Send ₦20,000", cost: 20000, from: n.id, rel: 10, mem: "gaveMoney" }, { label: "I'm broke too", from: n.id, rel: -3 }] }); return; }
      this.message(n.id, `Pull up to ${this.places[place].name} in an hour? 🔥`, { choices: [{ label: "On my way", from: n.id, rel: 2, plan: { kind: "hangout", npc: n.id, place, start, end } }, { label: "Can't today", from: n.id, rel: -2 }] });
    }
    // Did you show up where you said you would?
    checkPlans() {
      const s = this.s;
      for (const p of s.plans) {
        if (p.status !== "pending") continue;
        const there = s.place === p.place && (s.inside || this.places[p.place].kind !== "building") || (s.place === p.place);
        if (s.t >= p.start && s.t <= p.end && there) {
          p.status = "done";
          if (p.kind === "pickup") continue; // handled by the pickup action
          if (p.npc) { this.rel(p.npc, 8); this.remember(p.npc, "attended"); }
          if (p.kind === "date") { const st = s.npcs[p.npc]; st.romance = clamp(st.romance + 10); s.stats.dates++; this.applyFx({ vibes: 18 }); this.log(`💞 Date with ${this.who(p.npc).name}. The city lights, the conversation… 🥹`, "good"); this.addMemory(`💞 Date with ${this.who(p.npc).name} · ${this.day()} Dec`); }
          else if (p.kind === "brand") { this.earn(p.pay, "brand"); this.post(p.place); this.log(`💌 Brand deal done: ${naira(p.pay)}.`, "good"); }
          else if (p.kind === "chain") { /* chain step fires via chainCheck */ }
          else { this.applyFx({ vibes: 10 }); this.log(`🤝 You showed up for ${this.who(p.npc).name}. They noticed.`, "good"); }
        } else if (s.t > p.end) {
          p.status = "missed";
          if (p.kind === "pickup") {
            const st = s.npcs[p.npc];
            if (!s.flags["picked_" + p.npc]) { st.arrived = true; st.met = true; this.rel(p.npc, -15); this.addStat("rep", -5); this.remember(p.npc, "ignored"); this.log(`${this.who(p.npc).name} waited for hours and took a Bolt. They are NOT happy.`, "bad"); }
          } else if (p.npc) { this.rel(p.npc, -10); this.remember(p.npc, "ignored"); this.message(p.npc, p.kind === "date" ? "So you stood me up. Wow. 💔" : "You said you were coming 🙄"); }
        }
      }
      s.plans = s.plans.filter((p) => p.status === "pending" || s.t - p.end < DAY);
    }
    consequences() {
      const s = this.s;
      const f = s.flags;
      if (f.leak && s.t >= f.leak.at) { const id = f.leak.id; f.leak = null; this.rel(id, -25); this.remember(id, "revealedSecret"); this.message(id, "I know you've been telling people my business. I trusted you."); }
      if (f.revenge && s.t >= f.revenge.at) { const id = f.revenge.id; f.revenge = null; this.message(id, "You exposed me? Let's see how you like it. 😈"); this.addExposure(30); s.stats.wahalas++; }
      if (f.bmLeak && s.t >= f.bmLeak.at) { const id = f.bmLeak.id; f.bmLeak = null; f.fraud = true; this.addStat("rep", -25); this.addStat("clout", -10); this.message("unknown", `Screenshots of you blackmailing ${this.who(id).name} are all over Twitter. 😬`); s.stats.wahalas++; this.unlock("caught"); }
    }

    // ============================================================ story chains
    chainCheck(ctx, fromTalk) {
      const s = this.s;
      for (const [cid, ch] of Object.entries(W.CHAINS)) {
        const cs = s.chains[cid];
        if (!cs || !cs.step) continue;
        const step = ch.steps.find((x) => x.id === cs.step);
        if (!step || step.phone) continue;
        const w = step.when;
        if (w.talk && ctx.talk !== w.talk) continue;
        if (w.at && (ctx.at || s.place) !== w.at) continue;
        if (w.at && !w.talk && !ctx.at) continue;
        if (w.day && this.day() < w.day) continue;
        if (w.afterDay && this.day() < w.afterDay) continue;
        if (w.daysAfter) continue; // timed steps fire from chainTimers
        if (w.window) { const plan = s.plans.find((p) => p.kind === "chain" && p.chain === cid && p.status !== "missed"); if (!plan || s.t < plan.start || s.t > plan.end) continue; }
        if (!this.s.npcs[ch.npc].arrived && w.at !== "airport") continue;
        this.fireChainStep(cid, step);
        return true;
      }
      return false;
    }
    chainTimers() {
      const s = this.s;
      for (const [cid, ch] of Object.entries(W.CHAINS)) {
        const cs = s.chains[cid];
        if (!cs || !cs.step) continue;
        const step = ch.steps.find((x) => x.id === cs.step);
        if (!step) continue;
        if (step.phone && step.when.phoneAfterMins && s.t - cs.since >= step.when.phoneAfterMins && !cs.sent) {
          cs.sent = true;
          this.message(step.phone.from, step.phone.text, { choices: step.choices.map((c, i) => ({ ...c, special: "chain", chain: cid, idx: i })) });
        }
        if (step.when.daysAfter && s.t - cs.since >= step.when.daysAfter * DAY && !cs.sent) {
          cs.sent = true;
          this.fireChainStep(cid, step);
        }
        // A missed photoshoot ends Kemi's story quietly.
        if (step.when.window) { const plan = s.plans.find((p) => p.kind === "chain" && p.chain === cid); if (plan && plan.status === "missed") { cs.step = null; this.rel(ch.npc, -8); this.remember(ch.npc, "ignored"); } }
      }
    }
    fireChainStep(cid, step) {
      const ch = W.CHAINS[cid];
      this.queue({ title: ch.title, icon: "📖", text: step.text, chain: cid, choices: step.choices.map((c, i) => ({ ...c, special: "chain", chain: cid, idx: i })) });
    }
    chainChoose(c) {
      const s = this.s;
      const ch = W.CHAINS[c.chain];
      const cs = s.chains[c.chain];
      const npc = ch.npc;
      const target = c.discover || c.expose || c.blackmail;
      if (c.rel) this.rel(npc, c.rel);
      if (c.romance) { s.npcs[npc].romance = clamp(s.npcs[npc].romance + c.romance); if (s.npcs[npc].romance >= 50) { s.partner = npc; this.unlock("lover"); } }
      if (c.mem) this.remember(npc, c.mem);
      if (c.discover) { const st = s.npcs[c.discover]; if (st.secret < 100) { st.secret = 100; s.stats.secrets++; if (s.stats.secrets >= 4) this.unlock("amebo"); this.log(`🕵🏾 Secret uncovered: ${this.who(c.discover).name} ${this.who(c.discover).secretShort}.`, "achieve"); } }
      if (c.expose) { const st = s.npcs[c.expose]; st.state = "exposed"; st.rel = 0; this.remember(c.expose, "exposed"); this.addStat("clout", 18); this.addStat("followers", 500); this.addStat("rep", -10); if (W.NPCS.find((n) => n.id === c.expose).persona === "wannabe") this.unlock("ijgb_exposed"); this.addMemory(`📣 Exposed ${this.who(c.expose).name}`); }
      if (c.blackmail) { const st = s.npcs[c.blackmail]; st.state = "blackmailed"; this.earn(BLACKMAIL[c.blackmail] || 80000); this.remember(c.blackmail, "blackmailed"); if (this.rng() < 0.6) s.flags.bmLeak = { id: c.blackmail, at: s.t + DAY }; }
      if (c.fraud) { s.flags.fraud = true; this.unlock("caught"); }
      if (c.schedule) {
        const start = (this.day() + (c.schedule.dayOffset || 0) - 1) * DAY + W.hm(c.schedule.start);
        s.plans.push({ kind: "chain", chain: c.chain, npc, place: c.schedule.place, start, end: start + c.schedule.window, status: "pending" });
        this.log(`📅 Plan: ${this.placeName(c.schedule.place)}, ${clock(start).weekday} ${clock(start).label}.`, "info");
      }
      this.applyOutcome({ cost: c.cost, conn: c.conn, rep: c.rep, clout: c.clout, followers: c.followers, exposure: c.exposure, give: c.give, gossip: c.gossip });
      void target;
      cs.step = c.next || null;
      cs.since = s.t;
      cs.sent = false;
      if (!c.next) this.addMemory(`📖 ${ch.title} — story complete`);
      return "";
    }

    // ============================================================ calendar
    calendar(c) {
      const s = this.s;
      const key = (k) => `${c.day}:${k}`;
      const once = (k) => { if (s.flags.cal[key(k)]) return false; s.flags.cal[key(k)] = true; return true; };
      const ev = this.events(c.day);
      if (ev.includes("owambe") && c.hh === 22 && once("owambe-miss")) {
        if (!s.stats["owambeDay" + c.day] && s.stats.owambes === (s.flags.owambesBefore || 0)) { /* nothing */ }
      }
      if (c.day === 25 && c.hh === 16 && !s.flags.village && !s.flags.christmasDone && once("xmas-miss")) {
        this.addStat("rep", -15); this.rel("mama", -15); this.message("mama", "You didn't come for Christmas lunch. I'm not angry. Just disappointed. 💔");
      }
      if (c.day === 31 && c.hh === 22 && c.mm === 0 && once("cross")) this.log("🎆 Crossover is close. Get to a church, club, rooftop, beach or home before midnight.", "day");
      if (c.day === 31 && c.hh === 23 && c.mm === 30 && once("cross-last")) this.log("⏰ 30 minutes to midnight!", "day");
    }
    crossover(placeId) {
      const s = this.s;
      const type = this.places[placeId].type;
      const partnerHere = s.partner && this.peopleAt(placeId).includes(s.partner);
      const kind = partnerHere ? "love" : { church: "church", club: "party", lounge: "party", family: "family", beach: "beach" }[type] || "family";
      if (kind === "party") this.addStat("clout", 12);
      if (kind === "church") this.addStat("rep", 12);
      if (kind === "family") { this.addStat("rep", 6); this.relAll(10); }
      this.applyFx({ vibes: 40 });
      this.addMemory({ love: `💞 New Year's kiss with ${s.partner ? this.who(s.partner).name : ""}`, church: "🙏🏾 Crossed over in church", party: "🍾 Countdown party into the new year", family: "🎆 Crossover at home with family", beach: "🎆 Fireworks on the beach" }[kind]);
      this.finish(kind, s.partner);
    }

    // ============================================================ missions & identity
    goalMet(worth) {
      const s = this.s;
      return {
        legend: () => s.stats.bignights >= 8, family: () => s.rep >= 80, owambe: () => s.stats.owambeTrad >= 3,
        love: () => !!(s.ending && s.ending.kind === "love"), viral: () => s.clout >= 120 || s.followers >= 10000,
        money: () => worth >= s.stats.startNaira, padi: () => s.conn >= 80, truth: () => s.stats.secrets >= 4,
      }[s.goal]();
    }
    missionDone() { return W.MISSIONS[this.s.persona].check(this.s); }
    identity() {
      const s = this.s;
      return W.IDENTITIES.find((i) => i.test(s, this.worthRef()));
    }
    quests() {
      const s = this.s;
      const out = [];
      const M = W.MISSIONS[s.persona];
      out.push({ icon: M.icon, title: M.name, sub: M.progress(s), done: M.check(s) });
      const G = D.GOALS[s.goal];
      out.push({ icon: G.icon, title: G.name, sub: G.desc, done: this.goalMet(this.worthRef()) });
      for (const [cid, ch] of Object.entries(W.CHAINS)) {
        const cs = s.chains[cid];
        if (!cs.step || !s.npcs[ch.npc].arrived) continue;
        const step = ch.steps.find((x) => x.id === cs.step);
        const hint = step.when.talk ? `Find and talk to ${this.who(step.when.talk).name}` : step.when.at ? `Be at ${this.placeName(step.when.at)}` : "Wait for news…";
        if (cs.step !== ch.steps[0].id || s.npcs[ch.npc].met) out.push({ icon: "📖", title: ch.title, sub: hint });
        if (out.length >= 4) break;
      }
      const plan = s.plans.find((p) => p.status === "pending");
      if (plan) out.push({ icon: "📅", title: `${this.placeName(plan.place)}`, sub: `${clock(plan.start).weekday} ${clock(plan.start).label}${plan.npc ? " · " + this.who(plan.npc).name : ""}` });
      return out;
    }
    nextEvent() {
      const c = this.clock();
      for (let d = c.day; d <= 31; d++) {
        const ev = W.eventsOn(d);
        const at = (name, hh, place) => ({ name, place, t: (d - 1) * DAY + hh * 60 });
        const list = [];
        if (ev.includes("owambe")) list.push(at("Owambe", 15, "hall"));
        if (ev.includes("concert")) list.push(at("Detty Fest", 19, "concert"));
        if (ev.includes("beachparty")) list.push(at("Beach party", 14, "beach"));
        if (ev.includes("christmas")) list.push(at("Christmas lunch", 13, "family"));
        if (ev.includes("crossover")) list.push(at("Crossover", 23, "church"));
        const next = list.find((e) => e.t + 180 > this.s.t);
        if (next) return { ...next, label: `${d === c.day ? "Today" : W.WEEKDAYS[W.weekday(d)].slice(0, 3) + " " + d}, ${clock(next.t).label}` };
      }
      return null;
    }
    checkAchievements() {
      const s = this.s;
      const friends = W.NPCS.filter((n) => s.npcs[n.id].met && s.npcs[n.id].rel >= 60 && !n.family).length;
      if (friends >= 6) this.unlock("padi");
    }

    // ============================================================ the ending
    finish(kind, partner) {
      const s = this.s;
      if (s.over) return;
      s.over = true; s.event = null; s.queue = []; s.activity = null; s.ride = null; s.convo = null;
      if (kind !== "missed") { this.unlock("survived"); this.news("crossover"); }
      if (!s.exposed && s.rep >= 60 && s.persona !== "hustler") this.unlock("nowahala");
      const worth = this.worthRef();
      if (s.flags.loan) { s.naira -= s.flags.loan; this.log(`📝 The loan app took ${naira(s.flags.loan)} on the way out.`, "bad"); }
      const avgVibes = s.stats.vibesN ? s.stats.vibesSum / s.stats.vibesN : s.needs.vibes;
      s.ending = { kind };
      const goalMet = this.goalMet(worth);
      const missionMet = this.missionDone();
      let secretPts, secretText;
      if (s.persona === "hustler") { secretPts = s.flags.bigbreak ? 80 : 0; secretText = s.flags.bigbreak ? "You landed the big break." : "The big break never came. Next December."; }
      else if (s.exposed) { secretPts = -40; secretText = "Your secret came out."; }
      else if (s.confessed) { secretPts = 30; secretText = "You came clean on your own terms."; }
      else { secretPts = 60; secretText = "Nobody ever found out."; }
      const friends = W.NPCS.filter((n) => s.npcs[n.id].met && s.npcs[n.id].rel >= 60 && !n.family).length;
      const relationships = s.partner ? 1 : 0;
      const parts = {
        vibes: Math.round(avgVibes), clout: Math.round(Math.min(s.clout, 150)), rep: Math.round(s.rep), conn: Math.round(s.conn),
        money: Math.round(clamp((worth - s.stats.startNaira) / 20000, -40, 60)),
        memories: s.memories.length * 8, goal: goalMet ? 120 : 0, mission: missionMet ? 120 : 0,
        secrets: s.stats.secrets * 15, secret: secretPts, friends: friends * 10, achievements: s.achievements.length * 8,
      };
      const score = Object.values(parts).reduce((a, b) => a + b, 0);
      const ident = this.identity();
      const titles = [[900, "Detty December Legend 👑"], [700, "Certified Odogwu 🔥"], [500, "Survived the Wahala 💪🏾"], [-1e9, "Wahala Magnet 🧲"]];
      const title = kind === "missed" ? "Missed Crossover 😴" : titles.find(([n]) => score >= n)[1];
      const scenes = {
        church: "You crossed over in church, dancing to \"Onise Iyanu\" with Mama.",
        party: "You popped champagne as the clock hit 12. The DJ shouted your name.",
        family: "You watched the fireworks from the balcony with the whole family, jollof in hand.",
        beach: "You watched fireworks explode over the water with your toes in the sand.",
        love: `At midnight, ${partner ? this.who(partner).name : "someone special"} kissed you as the fireworks went up. 💞`,
        missed: "You woke up on 1st January to 47 missed calls and a group chat full of fireworks videos.",
      };
      // A one-line verdict built from what actually happened.
      const startN = s.stats.startNaira, endN = worth;
      const bits = [];
      bits.push(startN < 200000 ? "You came into December with almost nothing." : startN > 1500000 ? "You came into December with serious money." : "You came into December with a plan and a budget.");
      if (endN > startN * 1.3) bits.push("Somehow you left richer.");
      else if (endN < startN * 0.4) bits.push("December collected its tax.");
      if (s.stats.secrets >= 3) bits.push(`You learned ${s.stats.secrets} people's secrets.`);
      if (s.partner) bits.push(`And you found ${this.who(s.partner).name}.`);
      else if (friends >= 4) bits.push(`You made ${friends} real friends.`);
      if (s.exposed) bits.push("Yours didn't stay hidden.");
      s.ending = {
        kind, title, scene: scenes[kind], score, parts, goalMet, missionMet, secretText,
        identity: ident, verdict: bits.join(" "),
        bio: {
          started: startN, finished: endN, parties: s.stats.bignights + s.stats.owambes, relationships, friends,
          secrets: s.stats.secrets, wahalas: s.stats.wahalas, followers: s.followers, posts: s.stats.posts,
        },
      };
      this.log(`🎆 HAPPY NEW YEAR! ${title}`, "achieve");
    }
  }

  // Remote and rarely used actions that aren't tied to a place type list.
  const EXTRA_ACTIONS = {
    confess: { name: "Come clean to the family", icon: "🫣", mins: 60, special: "confess" },
    christmas_lunch: { name: "Christmas lunch with the family", icon: "🎄", mins: 180, fx: { belle: 60, vibes: 30 }, big: true, special: "christmas" },
    crossover: { name: "Cross over into the new year here", icon: "🎆", mins: 30, special: "crossover" },
  };

  const FAVOURS = {
    tobi: { usd: 0, conn: 6, text: "\"Cuz, I'll link you with my London people. Proper connections.\"" },
    funke: { conn: 15, rep: 8, text: "\"I'll tell every aunty in Lagos you're a good child.\" Aunties now hail you on sight." },
    chidi: { conn: 15, text: "\"Come, meet my Toronto crew.\" Your connections jump." },
    kemi: { followers: 1500, clout: 15, text: "Kemi gives you a shoutout. Your phone won't stop buzzing." },
    dayo: { give: "vip_band", text: "\"VIP wristband. My guy runs the door.\"" },
    tunde: { give: "concert_ticket", text: "\"Backstage pass for Detty Fest. Don't say I never did anything for you.\"" },
    nkechi: { buyStyle: "tradfusion", text: "\"Take this aso-ebi. Wear it well, my pikin.\"" },
    seun: { followers: 800, clout: 10, fx: { vibes: 10 }, text: "Seun shoots your December photos for free. They're fire." },
    biggie: { give: "vip_band", text: "\"Guest list, VIP, everything. Just tell them Biggie sent you.\"" },
    mamat: { give: "jollof_pack", text: "\"Take this extra jollof. You're too thin.\"" },
    taiwo: { conn: 4, text: "\"Any day you need ride, call me. Na family price.\"" },
    mama: { naira: 30000, text: "Mama presses ₦30,000 into your palm. \"Don't tell your father.\"" },
    sule: { conn: 3, text: "\"No wahala. You fit enter anytime.\"" },
  };
  const BLACKMAIL = { kemi: 150000, dayo: 50000, tunde: 120000, tobi: 80000, funke: 100000, chidi: 60000, nkechi: 120000 };

  const COND = {
    lightOn: (g) => g.s.light,
    lightOff: (g) => !g.s.light,
    out: (g) => !g.s.inside,
    crewInTown: (g) => g.crewInTown(),
    clout30: (g) => g.s.clout >= 30,
    clout60: (g) => g.s.clout >= 60,
    conn50: (g) => g.s.conn >= 50,
    canConfess: (g) => !g.s.exposed && !g.s.confessed && g.s.exposure >= 20 && g.s.persona !== "hustler",
  };
  function D_pending(g) { return W.NPCS.filter((n) => n.from && n.arrives <= g.day() && !g.s.flags["picked_" + n.id] && !g.s.npcs[n.id].arrived); }
  function crossesLagoon(z1, z2) { return Math.min(z1, z2) < W.GRID.water.band[0] && Math.max(z1, z2) > W.GRID.water.band[1]; }
  function pickOne(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function slug(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 16) || "you"; }

  // Rebuild the welcome message for a new December.
  Sim.prototype.welcome = function () {
    const s = this.s;
    const P = this.P;
    const M = W.MISSIONS[s.persona];
    this.queue({
      title: `Welcome to Detty December, ${s.name}!`, icon: "🎄",
      text: `You're a ${P.name} in ${D.AREAS[s.city][s.area].name}, ${D.CITIES[s.city].name}. Your mission: ${M.icon} ${M.name} — ${M.desc} Your secret: ${P.secret} Walk with WASD or the arrow keys (or the joystick on your phone). Press E or tap ✋ to go inside places and talk to people.`,
      choices: [{ label: "Let's gooo! 🇳🇬" }],
    });
    this.flush();
  };

  const api = { Sim, clock, fmtMins, naira, clamp, SPEEDS, DAY, END, COND };
  if (isNode) module.exports = api;
  else root.SIM = api;
})(typeof window !== "undefined" ? window : globalThis);
