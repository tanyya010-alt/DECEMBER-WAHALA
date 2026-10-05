// Headless playthroughs: random bots play full Decembers to catch crashes,
// stuck states and NaNs. Run: node test/simulate.js
const assert = require("assert");
const D = require("../js/data.js");
const { Game } = require("../js/engine.js");

const places = Object.keys(D.CITIES.lagos.places);
const modes = Object.keys(D.TRANSPORT);
const endings = {};
const RUNS = 400;

for (let seed = 1; seed <= RUNS; seed++) {
  const city = seed % 2 ? "lagos" : "abuja";
  const role = Object.keys(D.ROLES)[seed % 3];
  const g = Game.create({ name: "Bot", city, role }, seed);
  // Separate RNG for the bot so it doesn't share the game's stream.
  let x = seed * 9973;
  const pick = (n) => { x = (x * 1103515245 + 12345) % 2147483648; return x % n; };

  let steps = 0;
  while (!g.s.over) {
    assert(++steps < 5000, `seed ${seed}: game never ended (day ${g.s.day}, slot ${g.s.slot})`);
    const s = g.s;
    if (s.event) {
      const ok = s.event.choices.map((c, i) => i).filter((i) => g.canChoose(s.event.choices[i]));
      assert(ok.length, `seed ${seed}: event "${s.event.title}" has no affordable choice`);
      g.choose(ok[pick(ok.length)]);
      continue;
    }
    const acts = g.actionsHere().filter((o) => !o.why && o.a.special !== "bdc");
    const r = pick(10);
    if (s.place === "mall" && s.usd > 0 && r === 0) g.exchange(Math.min(s.usd, 200));
    else if (r < 3 || !acts.length) g.travel(places[pick(places.length)], modes[pick(modes.length)]);
    else g.doAction(acts[pick(acts.length)].a.id);

    for (const k in s.needs) assert(Number.isFinite(s.needs[k]), `seed ${seed}: need ${k} is ${s.needs[k]}`);
    assert(Number.isFinite(s.naira) && Number.isFinite(s.usd), `seed ${seed}: money NaN`);
    // Save/load round-trip must keep the game playable.
    if (steps % 37 === 0) g.s = JSON.parse(JSON.stringify(g.s));
  }
  assert(g.s.ending && Number.isFinite(g.s.ending.score), `seed ${seed}: bad ending`);
  endings[g.s.ending.title] = (endings[g.s.ending.title] || 0) + 1;
}

console.log(`${RUNS} simulated Decembers completed. Endings:`);
console.log(endings);
