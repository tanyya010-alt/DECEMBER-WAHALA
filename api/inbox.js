const db = require("./_lib/db");
const { route, send } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");

// What other players did to you. The client applies the effects, then marks them read.
module.exports = route({
  async GET({ req, res }) {
    const me = await requireUser(req);
    const items = await db()`
      SELECT i.id, i.kind, i.created_at, u.username AS from_username
      FROM inbox i LEFT JOIN users u ON u.id = i.from_user
      WHERE i.user_id = ${me.id} AND NOT i.read ORDER BY i.id LIMIT 30`;
    send(res, 200, { items });
  },
  // Marks everything up to and including the newest item the client has applied.
  async POST({ req, res, body }) {
    const me = await requireUser(req);
    const upTo = Number(body.upTo);
    if (Number.isInteger(upTo) && upTo > 0) await db()`UPDATE inbox SET read = true WHERE user_id = ${me.id} AND id <= ${upTo}`;
    send(res, 200, { ok: true });
  },
});
