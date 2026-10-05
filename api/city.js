const db = require("./_lib/db");
const { route, send, HttpError } = require("./_lib/http");
const { currentUser } = require("./_lib/auth");
const { D } = require("./_lib/game");

// The shared city: who's around, where they are, and the news ticker.
module.exports = route({
  async GET({ req, res, query }) {
    const city = query.city;
    if (!D.CITIES[city]) throw new HttpError(400, "Unknown city.");
    const sql = db();
    const me = await currentUser(req);
    const meId = me ? me.id : 0;
    const [online, total, players, feed] = await Promise.all([
      sql`SELECT count(*)::int AS n FROM users WHERE last_seen > now() - interval '5 minutes'`,
      sql`SELECT count(*)::int AS n FROM users`,
      sql`
        SELECT u.username, u.name, s.look, s.place, s.area, s.day, s.public_persona, s.clout, s.exposed,
               (u.last_seen > now() - interval '5 minutes') AS online,
               p.progress, p.rel, p.state, s.persona
        FROM saves s JOIN users u ON u.id = s.user_id
        LEFT JOIN pairs p ON p.actor = ${meId} AND p.target = s.user_id
        WHERE s.city = ${city} AND s.user_id <> ${meId} AND s.updated_at > now() - interval '3 days'
        ORDER BY u.last_seen DESC LIMIT 60`,
      sql`SELECT text, created_at FROM feed WHERE city = ${city} ORDER BY created_at DESC LIMIT 15`,
    ]);
    send(res, 200, {
      online: online[0].n,
      players: total[0].n,
      people: players.map((p) => {
        const known = (p.progress || 0) >= 100 || p.exposed;
        return {
          username: p.username, name: p.name, look: p.look, place: p.place, area: p.area, day: p.day,
          persona: p.public_persona, clout: p.clout, online: p.online, exposed: p.exposed,
          progress: p.progress || 0, rel: p.rel == null ? 40 : p.rel, state: p.state || null,
          // Only revealed once you've dug it up (or they've been exposed).
          truth: known ? { persona: p.persona, secret: D.PERSONAS[p.persona].secret } : null,
        };
      }),
      feed,
    });
  },
});
