const db = require("./_lib/db");
const { route, send, HttpError } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");
const { NEWS, validState, publicPersona, publicLook } = require("./_lib/game");

module.exports = route({
  async PUT({ req, res, body }) {
    const user = await requireUser(req);
    const st = body.state;
    const bad = validState(st);
    if (bad) throw new HttpError(400, bad);
    if (JSON.stringify(st).length > 250000) throw new HttpError(413, "Save is too large.");
    const sql = db();
    await sql`
      INSERT INTO saves (user_id, state, city, area, place, day, look, public_persona, persona, clout, exposed, updated_at)
      VALUES (${user.id}, ${JSON.stringify(st)}, ${st.city}, ${st.area}, ${st.place}, ${st.day}, ${JSON.stringify(publicLook(st.look))},
              ${publicPersona(st.persona)}, ${st.persona}, ${Math.round(st.clout) || 0}, ${!!st.exposed}, now())
      ON CONFLICT (user_id) DO UPDATE SET state = EXCLUDED.state, city = EXCLUDED.city, area = EXCLUDED.area,
        place = EXCLUDED.place, day = EXCLUDED.day, look = EXCLUDED.look, public_persona = EXCLUDED.public_persona,
        persona = EXCLUDED.persona, clout = EXCLUDED.clout, exposed = EXCLUDED.exposed, updated_at = now()`;
    await sql`UPDATE users SET last_seen = now() WHERE id = ${user.id}`;
    const news = Array.isArray(body.news) ? body.news.filter((n) => NEWS[n]).slice(0, 3) : [];
    for (const n of news) await sql`INSERT INTO feed (city, text) VALUES (${st.city}, ${NEWS[n](user.username, st)})`;
    send(res, 200, { ok: true });
  },
  // Start over: delete your December (your account stays).
  async DELETE({ req, res }) {
    const user = await requireUser(req);
    const sql = db();
    await sql`DELETE FROM saves WHERE user_id = ${user.id}`;
    await sql`DELETE FROM pairs WHERE actor = ${user.id} OR target = ${user.id}`;
    await sql`DELETE FROM inbox WHERE user_id = ${user.id}`;
    send(res, 200, { ok: true });
  },
});
