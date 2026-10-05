// Local dev server: serves the site and the /api routes.
// Uses DATABASE_URL if set, otherwise an in-memory Postgres (pg-mem).
// Run: node test/dev-server.js [port]
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.join(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };

async function start(port) {
  if (!process.env.DATABASE_URL) {
    const { newDb } = require("pg-mem");
    const mem = newDb();
    const schema = fs.readFileSync(path.join(root, "db/schema.sql"), "utf8").replace(/--[^\n]*/g, "");
    for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) mem.public.none(stmt);
    const { Client } = mem.adapters.createPg();
    const client = new Client();
    await client.connect();
    global.__DW_TEST_SQL__ = async (strings, ...vals) => (await client.query(strings.reduce((a, s, i) => a + "$" + i + s), vals)).rows;
  }
  const routes = {};
  for (const f of fs.readdirSync(path.join(root, "api"))) if (f.endsWith(".js")) routes[f.slice(0, -3)] = require(path.join(root, "api", f));
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname.startsWith("/api/")) {
      const r = routes[url.pathname.slice(5)];
      if (!r) { res.statusCode = 404; return res.end("{}"); }
      return r(req, res);
    }
    const file = path.join(root, url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end("Not found"); }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(port, r));
  return server;
}

if (require.main === module) {
  const port = Number(process.argv[2]) || 3000;
  start(port).then(() => console.log(`December Wahala on http://localhost:${port}`));
}
module.exports = { start };
