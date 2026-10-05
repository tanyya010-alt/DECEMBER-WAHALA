const db = require("./_lib/db");
const { route, send } = require("./_lib/http");
const { currentUser } = require("./_lib/auth");

module.exports = route({
  async GET({ req, res }) {
    const user = await currentUser(req);
    if (!user) return send(res, 200, { user: null, save: null });
    await db()`UPDATE users SET last_seen = now() WHERE id = ${user.id}`;
    const save = await db()`SELECT state FROM saves WHERE user_id = ${user.id}`;
    send(res, 200, { user, save: save[0] ? save[0].state : null });
  },
});
