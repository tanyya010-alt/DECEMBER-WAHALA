// Password hashing (scrypt) and cookie sessions.
const crypto = require("crypto");
const db = require("./db");
const { HttpError } = require("./http");

const COOKIE = "dw_session";
const DAYS = 30;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

function verifyPassword(password, stored) {
  const [scheme, saltHex, keyHex] = String(stored).split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const key = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), 32);
  const expected = Buffer.from(keyHex, "hex");
  return expected.length === key.length && crypto.timingSafeEqual(key, expected);
}

const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function cookieAttrs(req) {
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || "");
  return `Path=/; HttpOnly; SameSite=Lax${local ? "" : "; Secure"}`;
}

async function startSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + DAYS * 864e5);
  await db()`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${sha(token)}, ${userId}, ${expires.toISOString()})`;
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; ${cookieAttrs(req)}; Max-Age=${DAYS * 86400}`);
}

async function endSession(req, res) {
  const token = readCookie(req, COOKIE);
  if (token) await db()`DELETE FROM sessions WHERE token_hash = ${sha(token)}`;
  res.setHeader("Set-Cookie", `${COOKIE}=; ${cookieAttrs(req)}; Max-Age=0`);
}

async function currentUser(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const rows = await db()`
    SELECT u.id, u.username, u.name FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${sha(token)} AND s.expires_at > now()`;
  return rows[0] || null;
}

async function requireUser(req) {
  const u = await currentUser(req);
  if (!u) throw new HttpError(401, "Log in to do that.");
  return u;
}

module.exports = { hashPassword, verifyPassword, startSession, endSession, currentUser, requireUser };
