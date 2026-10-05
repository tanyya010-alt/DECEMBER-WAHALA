const db = require("./_lib/db");
const { route, send, HttpError } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");
const { D } = require("./_lib/game");

const ACTIONS = ["gist", "investigate", "expose", "protect"];

// Player-to-player: gist, dig into their story, then expose or protect them.
module.exports = route({
  async POST({ req, res, body }) {
    const me = await requireUser(req);
    const action = body.action;
    if (!ACTIONS.includes(action)) throw new HttpError(400, "Unknown action.");
    const sql = db();
    const [mine] = await sql`SELECT state, city FROM saves WHERE user_id = ${me.id}`;
    if (!mine) throw new HttpError(400, "Start your December first.");
    const [target] = await sql`
      SELECT u.id, u.username, s.persona, s.city, s.place FROM users u JOIN saves s ON s.user_id = u.id
      WHERE u.username = ${String(body.target || "").toLowerCase()}`;
    if (!target || target.id === me.id) throw new HttpError(404, "That player isn't around.");
    if (target.city !== mine.city) throw new HttpError(400, "They're in a different city.");

    const [recent] = await sql`SELECT count(*)::int AS n FROM actions_log WHERE user_id = ${me.id} AND created_at > now() - interval '1 hour'`;
    if (recent.n >= 60) throw new HttpError(429, "Slow down. Try again in a bit.");
    await sql`INSERT INTO actions_log (user_id) VALUES (${me.id})`;

    await sql`INSERT INTO pairs (actor, target) VALUES (${me.id}, ${target.id}) ON CONFLICT DO NOTHING`;
    const [pair] = await sql`SELECT progress, rel, state FROM pairs WHERE actor = ${me.id} AND target = ${target.id}`;
    const traits = (mine.state && mine.state.traits) || [];
    const digMult = (traits.includes("gossip") ? 2 : 1) * (mine.state.persona === "aunty" ? 1.5 : 1);
    const secret = D.PERSONAS[target.persona].secret;
    const truth = { persona: target.persona, personaName: D.PERSONAS[target.persona].name, secret };
    let progress = pair.progress, rel = pair.rel, state = pair.state;
    let result = {};

    if (action === "gist") {
      rel = Math.min(100, rel + 8);
      progress = Math.min(100, progress + Math.round(10 * digMult));
      await sql`INSERT INTO inbox (user_id, kind, from_user) VALUES (${target.id}, 'gist', ${me.id})`;
    } else if (action === "investigate") {
      rel = Math.max(0, rel - 4);
      progress = Math.min(100, progress + Math.round(30 * digMult));
      if (pair.progress < 100 && progress >= 100) {
        await sql`INSERT INTO inbox (user_id, kind, from_user) VALUES (${target.id}, 'discovered', ${me.id})`;
      }
    } else {
      if (progress < 100) throw new HttpError(400, "You don't know their secret yet.");
      if (state) throw new HttpError(400, "You've already made your choice about them.");
      state = action === "expose" ? "exposed" : "protected";
      if (action === "expose") {
        rel = 0;
        await sql`INSERT INTO inbox (user_id, kind, from_user) VALUES (${target.id}, 'exposed', ${me.id})`;
        await sql`INSERT INTO feed (city, text) VALUES (${mine.city}, ${`📣 @${me.username} exposed @${target.username}: "${secret}"`})`;
        result = { clout: 18, rep: -10, conn: -5 };
      } else {
        rel = Math.min(100, rel + 25);
        await sql`INSERT INTO inbox (user_id, kind, from_user) VALUES (${target.id}, 'protected', ${me.id})`;
        result = { rep: 6, conn: 6 };
      }
    }
    await sql`UPDATE pairs SET progress = ${progress}, rel = ${rel}, state = ${state} WHERE actor = ${me.id} AND target = ${target.id}`;
    send(res, 200, {
      action, target: target.username, progress, rel, state, effects: result,
      truth: progress >= 100 ? truth : null,
      revealed: pair.progress < 100 && progress >= 100,
    });
  },
});
