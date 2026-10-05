const db = require("./_lib/db");
const { route, send, HttpError } = require("./_lib/http");
const { verifyPassword, startSession } = require("./_lib/auth");

module.exports = route({
  async POST({ req, res, body }) {
    const username = String(body.username || "").trim().toLowerCase().replace(/^@/, "");
    const rows = await db()`SELECT id, username, name, pass_hash FROM users WHERE username = ${username}`;
    const u = rows[0];
    if (!u || !verifyPassword(String(body.password || ""), u.pass_hash)) throw new HttpError(401, "Wrong username or password.");
    await startSession(req, res, u.id);
    const save = await db()`SELECT state FROM saves WHERE user_id = ${u.id}`;
    send(res, 200, { user: { id: u.id, username: u.username, name: u.name }, save: save[0] ? save[0].state : null });
  },
});
