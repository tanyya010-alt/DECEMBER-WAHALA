// API tests against an in-memory Postgres (pg-mem). Run: node test/api.test.js
const assert = require("assert");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { newDb } = require("pg-mem");
const D = require("../js/data.js");
const { Game } = require("../js/engine.js");

(async () => {
  const mem = newDb();
  const schema = fs.readFileSync(path.join(__dirname, "../db/schema.sql"), "utf8").replace(/--[^\n]*/g, "");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) mem.public.none(stmt);
  const { Client } = mem.adapters.createPg();
  const client = new Client();
  await client.connect();
  global.__DW_TEST_SQL__ = async (strings, ...vals) => {
    const text = strings.reduce((a, s, i) => a + "$" + i + s);
    return (await client.query(text, vals)).rows;
  };

  const routes = {};
  for (const f of fs.readdirSync(path.join(__dirname, "../api"))) if (f.endsWith(".js")) routes[f.slice(0, -3)] = require("../api/" + f);
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, "http://x").pathname.replace(/^\/api\//, "");
    if (!routes[name]) { res.statusCode = 404; return res.end("{}"); }
    routes[name](req, res);
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/api/`;

  function agent() {
    let cookie = "";
    return async (method, route, body) => {
      const r = await fetch(base + route, {
        method, headers: { "content-type": "application/json", cookie },
        body: body ? JSON.stringify(body) : undefined,
      });
      const set = r.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
      return { status: r.status, body: await r.json() };
    };
  }
  const a = agent(), b = agent(), anon = agent();
  const look = { body: "woman", skin: 2, hair: "bob", hairColour: "black", style: "glam", colour: 1, fabric: "sequin" };
  const newState = (persona, name) => Game.create({ name, look, traits: ["smooth", "gossip"], goal: "viral", persona, city: "lagos", area: "yaba" }, 1).s;

  let r = await a("POST", "signup", { name: "Ada", username: "ada_eko", password: "secret1", adult: true });
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  r = await anon("POST", "signup", { name: "X", username: "ada_eko", password: "secret1", adult: true });
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.body.error, "That username is taken.");
  r = await anon("POST", "signup", { name: "X", username: "kid", password: "secret1", adult: false });
  assert.strictEqual(r.status, 400);
  r = await anon("POST", "signup", { name: "X", username: "No Spaces!", password: "secret1", adult: true });
  assert.strictEqual(r.status, 400);
  r = await b("POST", "signup", { name: "Dayo", username: "dayo_london", password: "secret2", adult: true });
  assert.strictEqual(r.status, 201);

  r = await a("GET", "me");
  assert.strictEqual(r.body.user.username, "ada_eko");
  assert.strictEqual(r.body.save, null);

  // Form posts (non-JSON) are refused.
  const form = await fetch(base + "save", { method: "PUT", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "a=1" });
  assert.strictEqual(form.status, 415);

  r = await a("PUT", "save", { state: newState("aunty", "Ada"), news: ["arrived"] });
  assert.strictEqual(r.status, 200, JSON.stringify(r.body));
  r = await b("PUT", "save", { state: newState("wannabe", "Dayo"), news: ["arrived", "not-a-type"] });
  assert.strictEqual(r.status, 200);
  r = await b("PUT", "save", { state: { ...newState("wannabe", "Dayo"), city: "paris" } });
  assert.strictEqual(r.status, 400);
  r = await anon("PUT", "save", { state: newState("ijgb", "Nobody") });
  assert.strictEqual(r.status, 401);

  // The city: Dayo shows up to Ada as a "Real IJGB" with his secret hidden.
  r = await a("GET", "city?city=lagos");
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.people.length, 1);
  const dayo = r.body.people[0];
  assert.strictEqual(dayo.username, "dayo_london");
  assert.strictEqual(dayo.persona, "ijgb");
  assert.strictEqual(dayo.truth, null);
  assert.ok(r.body.feed.some((f) => f.text.includes("@dayo_london just touched down in Lagos")));
  assert.strictEqual(r.body.feed.length, 2);
  r = await anon("GET", "city?city=lagos");
  assert.strictEqual(r.body.people.length, 2);

  // Expose before knowing the secret is refused.
  r = await a("POST", "interact", { target: "dayo_london", action: "expose" });
  assert.strictEqual(r.status, 400);

  // Ada is an Owambe Aunty with the Amebo trait, so she digs fast.
  r = await a("POST", "interact", { target: "dayo_london", action: "investigate" });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.progress, 90);
  r = await a("POST", "interact", { target: "dayo_london", action: "investigate" });
  assert.strictEqual(r.body.progress, 100);
  assert.strictEqual(r.body.revealed, true);
  assert.strictEqual(r.body.truth.persona, "wannabe");
  assert.strictEqual(r.body.truth.secret, D.PERSONAS.wannabe.secret);

  r = await b("GET", "inbox");
  assert.deepStrictEqual(r.body.items.map((i) => i.kind), ["discovered"]);
  assert.strictEqual(r.body.items[0].from_username, "ada_eko");

  r = await a("POST", "interact", { target: "dayo_london", action: "expose" });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.state, "exposed");
  assert.strictEqual(r.body.effects.clout, 18);
  r = await a("POST", "interact", { target: "dayo_london", action: "protect" });
  assert.strictEqual(r.status, 400);

  r = await b("GET", "inbox");
  const kinds = r.body.items.map((i) => i.kind);
  assert.deepStrictEqual(kinds, ["discovered", "exposed"]);
  await b("POST", "inbox", { upTo: Math.max(...r.body.items.map((i) => i.id)) });
  r = await b("GET", "inbox");
  assert.strictEqual(r.body.items.length, 0);

  r = await anon("GET", "city?city=lagos");
  assert.ok(r.body.feed.some((f) => f.text.startsWith("📣 @ada_eko exposed @dayo_london")));

  r = await a("POST", "interact", { target: "ada_eko", action: "gist" });
  assert.strictEqual(r.status, 404);

  // Sessions.
  r = await a("POST", "logout", {});
  assert.strictEqual(r.status, 200);
  r = await a("GET", "me");
  assert.strictEqual(r.body.user, null);
  r = await a("POST", "login", { username: "ada_eko", password: "wrong" });
  assert.strictEqual(r.status, 401);
  r = await a("POST", "login", { username: "@Ada_Eko", password: "secret1" });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.save.persona, "aunty");

  r = await a("DELETE", "save", {});
  assert.strictEqual(r.status, 200);
  r = await a("GET", "me");
  assert.strictEqual(r.body.save, null);

  server.close();
  await client.end();
  console.log("API tests passed.");
})().catch((e) => { console.error(e); process.exit(1); });
