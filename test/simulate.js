// Headless playthroughs: bots live full Decembers in the real-time sim with
// every persona — walking, riding, doing activities, talking, answering the
// phone — to catch crashes, stuck states and NaNs. Run: node test/simulate.js
const assert = require("assert");
const D = require("../js/data.js");
const W = require("../js/world-data.js");
const NAV = require("../js/nav.js");
const { Sim, END } = require("../js/sim.js");
const A = require("../js/avatar.js");

const RUNS = Number(process.argv[2]) || 64;
const personas = Object.keys(D.PERSONAS);
const traitIds = Object.keys(D.TRAITS);
const goalIds = Object.keys(D.GOALS);
const results = {};
const seen = { actions: new Set(), endings: {}, chains: new Set(), socials: {}, emotions: new Set(), furniture: 0, approaches: 0, skills: {} };
const SIMS = require("../js/sims-data.js");

// Every place is reachable from every other place in both cities.
for (const city of ["lagos", "abuja"]) {
  const nav = NAV.get(city);
  const ids = Object.keys(nav.places).filter((p) => !nav.places[p].remote);
  for (const a of ids) for (const b of ids) if (a !== b) assert(NAV.placePath(nav, a, b).length, `${city}: no path ${a} → ${b}`);
}
// Every place type's actions exist.
for (const [t, T] of Object.entries(W.TYPES)) for (const a of T.actions) assert(W.ACTIONS[a], `${t}: unknown action ${a}`);

for (let seed = 1; seed <= RUNS; seed++) {
  let x = seed * 7919;
  const pick = (n) => { x = (x * 1103515245 + 12345) % 2147483648; return x % n; };
  const city = seed % 2 ? "lagos" : "abuja";
  const areas = Object.keys(D.AREAS[city]);
  const body = seed % 3 ? "woman" : "man";
  const hairs = Object.keys(D.HAIR[body]);
  const styles = Object.keys(D.STYLES);
  const look = { body, skin: pick(7), hair: hairs[pick(hairs.length)], hairColour: "black", style: styles[pick(styles.length)], colour: pick(10), fabric: "ankara", shades: !!pick(2), chain: !!pick(2), gele: false };
  assert(A.svg(look).includes("</svg>"));
  const persona = personas[seed % personas.length];
  const g = Sim.create({ name: "Bot", look, traits: [traitIds[pick(12)], traitIds[pick(12)]], goal: goalIds[pick(goalIds.length)], persona, city, area: areas[pick(areas.length)] }, seed);
  const placeIds = Object.keys(g.places);

  let steps = 0;
  while (!g.s.over) {
    assert(++steps < 40000, `seed ${seed} (${persona}): stuck at ${g.clock().day} ${g.clock().label}`);
    const s = g.s;
    if (s.event) {
      const ok = s.event.choices.map((c, i) => i).filter((i) => g.canChoose(s.event.choices[i]));
      assert(ok.length, `seed ${seed}: event "${s.event.title}" has no affordable choice`);
      if (s.event.chain) seen.chains.add(s.event.chain);
      g.choose(ok[pick(ok.length)]);
      continue;
    }
    if (s.convo) {
      const opts = g.convoOptions().filter((o) => !o.why);
      assert(opts.length, `seed ${seed}: conversation with no options`);
      const o = steps % 4 === 0 ? opts.find((v) => v.id === "bye") || opts[0] : opts[pick(opts.length)];
      g.convoSay(o.id);
      continue;
    }
    if (s.minigame) {
      seen.minigames = (seen.minigames || 0) + 1;
      if (s.minigame.kind === "dj") g.finishDj(pick(100) / 100, pick(40)); else if (pick(5)) g.finishSelfie(pick(100) / 100); else g.cancelMinigame();
      continue;
    }
    if (s.activity || s.ride) { g.advance(30); continue; }
    const r = pick(20);
    if (r === 0) { g.s.speed = 1 + pick(3); g.advance(20 + pick(90)); continue; }
    if (r === 1 && !g.abilityBlocked()) { g.useAbility(); continue; }
    if (r === 2) {
      const m = s.phone.messages.find((v) => v.choices && !v.done);
      if (m) { const ok = m.choices.map((c, i) => i).filter((i) => g.canChoose(m.choices[i])); if (ok.length) g.reply(m.id, ok[pick(ok.length)]); }
      g.readAll();
      continue;
    }
    if (r === 3) { const items = Object.keys(s.inventory).filter((k) => s.inventory[k] > 0); g.equipItem(items[pick(items.length)]); continue; }
    if (r === 4) { g.wear(s.wardrobe[pick(s.wardrobe.length)]); continue; }
    if (r <= 9) {
      // Go somewhere: walk or ride.
      const to = placeIds[pick(placeIds.length)];
      const opts = g.travelOptions(to).filter((o) => !o.why);
      const o = opts[pick(opts.length)];
      if (!o) { g.advance(30); continue; }
      if (o.mode === "walk") { const p = g.places[to]; g.setPos(p.spot.x, p.spot.z); g.s.place = to; g.advance(o.mins); }
      else g.travel(to, o.mode);
      continue;
    }
    if (!s.place) { const p = g.places.home; g.setPos(p.spot.x, p.spot.z); g.s.place = "home"; }
    if (!s.inside) { g.enter(s.place); continue; }
    if (r <= 12) {
      const here = g.peopleAt(s.place);
      if (here.length) {
        const who = here[pick(here.length)];
        const opts = g.socialOptions(who).filter((o) => !o.why);
        assert(opts.length, `seed ${seed}: no socials with ${who}`);
        const o = opts[pick(opts.length)];
        if (g.startSocial(who, o.sid) && s.activity && s.activity.id === "social") seen.socials[o.sid] = (seen.socials[o.sid] || 0) + 1;
        continue;
      }
    }
    if (r === 13 && s.place === "home") {
      const kinds = Object.keys(SIMS.FURNITURE);
      const k = kinds[pick(kinds.length)];
      if (g.buyFurniture(k, g.furnitureTier(k) + 1)) seen.furniture++;
    }
    if (s.approach) seen.approaches++;
    seen.emotions.add(g.emotion().id);
    const acts = g.actionsAt(s.place).filter((o) => !o.why);
    if (acts.length) { const a = acts[pick(acts.length)]; seen.actions.add(a.id); g.start(a.id); }
    else g.advance(30);

    for (const k of Object.keys(SIMS.NEEDS)) assert(Number.isFinite(s.needs[k]), `seed ${seed}: need ${k} = ${s.needs[k]}`);
    for (const k in s.skills) assert(Number.isFinite(s.skills[k]), `seed ${seed}: skill ${k}`);
    for (const k of ["naira", "usd", "clout", "rep", "conn", "res", "exposure", "followers", "t"]) assert(Number.isFinite(s[k]), `seed ${seed}: ${k} = ${s[k]}`);
    assert(g.peoplePositions().every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)), `seed ${seed}: bad person position`);
    if (steps % 97 === 0) { const st = JSON.parse(JSON.stringify(g.s)); const g2 = new Sim(st, seed); g2.rng = g.rng; Object.assign(g, { s: g2.s }); } // save/load round-trip
  }
  if (g.s.celebState) seen.celebsMet = (seen.celebsMet || 0) + Object.values(g.s.celebState).filter((c) => c.met).length;
  seen.limited = (seen.limited || 0) + g.limitedCount();
  if (g.s.flags.fitDoor) seen.fitChecks = (seen.fitChecks || 0) + Object.keys(g.s.flags.fitDoor).length;
  const e = g.s.ending;
  assert(e && Number.isFinite(e.score) && e.bio, `seed ${seed}: bad ending`);
  assert(g.s.t <= END + 60, `seed ${seed}: clock ran past the end`);
  seen.endings[e.kind] = (seen.endings[e.kind] || 0) + 1;
  for (const k of Object.keys(SIMS.SKILLS)) seen.skills[k] = Math.max(seen.skills[k] || 0, g.skill(k));
  const r = (results[persona] = results[persona] || { runs: 0, score: 0, exposed: 0, mission: 0 });
  r.runs++; r.score += e.score; if (g.s.exposed) r.exposed++; if (e.missionMet) r.mission++;
}

console.log(`${RUNS} simulated Decembers completed (real-time engine).`);
for (const [p, r] of Object.entries(results)) console.log(`  ${p.padEnd(11)} avg score ${Math.round(r.score / r.runs)}  exposed ${r.exposed}/${r.runs}  mission ${r.mission}/${r.runs}`);
console.log("  endings:", JSON.stringify(seen.endings));
console.log(`  distinct actions used: ${seen.actions.size} · story chains reached: ${[...seen.chains].join(", ") || "none"}`);
console.log(`  socials: ${Object.keys(seen.socials).length} kinds, ${Object.values(seen.socials).reduce((a, b) => a + b, 0)} total · approaches seen: ${seen.approaches} · furniture bought: ${seen.furniture}`);
console.log(`  emotions felt: ${[...seen.emotions].join(", ")}`);
console.log(`  best skill levels: ${JSON.stringify(seen.skills)}`);
console.log(`  luxury zone: minigames ${seen.minigames || 0} · celebs met ${seen.celebsMet || 0} · numbered pieces ${seen.limited || 0} · fit checks ${seen.fitChecks || 0} · actions: ${["dj_set", "celeb_selfie", "celeb_reel", "chef_tasting", "browse_drop", "buy_wristband", "styling_session", "store_network"].filter((a) => seen.actions.has(a)).join(", ")}`);
// Old (v3, pre-life-sim) saves load and gain the new fields.
{
  const g = Sim.create({ name: "Old", look: { body: "woman", skin: 2, hair: "knotless", hairColour: "black", style: "glam", colour: 1, fabric: "plain" }, traits: ["foodie", "smooth"], goal: "legend", persona: "ijgb", city: "lagos", area: "lekki" }, 5);
  const st = JSON.parse(JSON.stringify(g.s));
  delete st.skills; delete st.home; delete st.moodlets; delete st.approach; st.strangers.length = 16; st.needs = { energy: 50, belle: 50, vibes: 50 };
  const g2 = new Sim(st, 5);
  assert(g2.s.strangers.length === 30 && g2.s.home && g2.s.skills && Number.isFinite(g2.s.needs.bladder) && g2.emotion().id, "migration failed");
  console.log("  old save migration: ok");
}
