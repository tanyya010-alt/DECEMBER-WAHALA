// Headless playthroughs: bots play full Decembers with every persona to catch
// crashes, stuck states and NaNs. Run: node test/simulate.js
const assert = require("assert");
const D = require("../js/data.js");
const { Game } = require("../js/engine.js");
const A = require("../js/avatar.js");

const RUNS = 480;
const places = Object.keys(D.CITIES.lagos.places);
const modes = Object.keys(D.TRANSPORT);
const personas = Object.keys(D.PERSONAS);
const results = {};

// Every trait/goal combination maps to a persona.
const traitIds = Object.keys(D.TRAITS);
for (const g of Object.keys(D.GOALS)) assert(D.personaFor([traitIds[0], traitIds[1]], g));

for (let seed = 1; seed <= RUNS; seed++) {
  let x = seed * 9973;
  const pick = (n) => { x = (x * 1103515245 + 12345) % 2147483648; return x % n; };
  const city = seed % 2 ? "lagos" : "abuja";
  const areas = Object.keys(D.AREAS[city]);
  const body = seed % 3 ? "woman" : "man";
  const hairs = Object.keys(D.HAIR[body]);
  const styles = Object.keys(D.STYLES);
  const look = { body, skin: pick(7), hair: hairs[pick(hairs.length)], hairColour: "black", style: styles[pick(styles.length)], colour: pick(10), fabric: "ankara", shades: !!pick(2), chain: !!pick(2), gele: false };
  assert(A.svg(look).includes("</svg>"));
  const persona = personas[seed % personas.length];
  const g = Game.create({ name: "Bot", look, traits: [traitIds[pick(12)], traitIds[pick(12)]], goal: Object.keys(D.GOALS)[pick(8)], persona, city, area: areas[pick(areas.length)] }, seed);

  let steps = 0;
  while (!g.s.over) {
    assert(++steps < 6000, `seed ${seed} (${persona}): never ended at day ${g.s.day} slot ${g.s.slot}`);
    const s = g.s;
    if (s.event) {
      const ok = s.event.choices.map((c, i) => i).filter((i) => g.canChoose(s.event.choices[i]));
      assert(ok.length, `seed ${seed}: event "${s.event.title}" has no affordable choice`);
      g.choose(ok[pick(ok.length)]);
      continue;
    }
    const r = pick(14);
    const acts = g.actionsHere().filter((o) => !o.why && o.a.special !== "bdc");
    const people = g.peopleHere();
    if (r === 0 && !g.abilityBlocked()) g.useAbility();
    else if (r === 1 && people.length) {
      const n = people[pick(people.length)];
      const opts = g.npcActions(n.id).filter((o) => !o.why);
      if (opts.length) g.interact(n.id, opts[pick(opts.length)].id);
    } else if (r === 2 && s.place === "mall" && s.usd > 0) g.exchange(Math.min(s.usd, 300));
    else if (r === 3 && s.place === "home") g.wear(s.wardrobe[pick(s.wardrobe.length)]);
    else if (r < 7 || !acts.length) g.travel(places[pick(places.length)], modes[pick(modes.length)]);
    else g.doAction(acts[pick(acts.length)].a.id);

    for (const k in s.needs) assert(Number.isFinite(s.needs[k]), `seed ${seed}: need ${k} = ${s.needs[k]}`);
    for (const k of ["naira", "usd", "clout", "rep", "conn", "res", "exposure"]) assert(Number.isFinite(s[k]), `seed ${seed}: ${k} = ${s[k]}`);
    if (steps % 41 === 0) g.s = JSON.parse(JSON.stringify(g.s)); // save/load round-trip
  }
  const e = g.s.ending;
  assert(e && Number.isFinite(e.score), `seed ${seed}: bad ending`);
  const r = (results[persona] = results[persona] || { runs: 0, score: 0, exposed: 0, titles: {} });
  r.runs++; r.score += e.score; if (g.s.exposed) r.exposed++;
  r.titles[e.title] = (r.titles[e.title] || 0) + 1;
}

console.log(`${RUNS} simulated Decembers completed.`);
for (const [p, r] of Object.entries(results)) {
  console.log(`${p.padEnd(11)} avg score ${Math.round(r.score / r.runs)}  exposed ${r.exposed}/${r.runs}  `, JSON.stringify(r.titles));
}
