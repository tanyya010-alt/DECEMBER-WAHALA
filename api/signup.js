const db = require("./_lib/db");
const { route, send, HttpError } = require("./_lib/http");
const { hashPassword, startSession } = require("./_lib/auth");
const { USERNAME } = require("./_lib/game");

module.exports = route({
  async POST({ req, res, body }) {
    const name = String(body.name || "").trim().slice(0, 40);
    const username = String(body.username || "").trim().toLowerCase().replace(/^@/, "");
    const password = String(body.password || "");
    const email = String(body.email || "").trim().slice(0, 120) || null;
    if (!name) throw new HttpError(400, "Enter your name.");
    if (!USERNAME.test(username)) throw new HttpError(400, "Usernames are 3–20 characters: lowercase letters, numbers and _.");
    if (password.length < 6) throw new HttpError(400, "Passwords need at least 6 characters.");
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, "That email doesn't look right.");
    if (body.adult !== true) throw new HttpError(400, "You need to be 18 or older and accept the terms.");
    const taken = await db()`SELECT 1 FROM users WHERE username = ${username}`;
    if (taken.length) throw new HttpError(409, "That username is taken.");
    const rows = await db()`
      INSERT INTO users (username, name, email, pass_hash)
      VALUES (${username}, ${name}, ${email}, ${hashPassword(password)})
      ON CONFLICT (username) DO NOTHING RETURNING id, username, name`;
    if (!rows.length) throw new HttpError(409, "That username is taken.");
    await startSession(req, res, rows[0].id);
    send(res, 201, { user: rows[0], save: null });
  },
});
