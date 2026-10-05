// Applies db/schema.sql. Run: DATABASE_URL=... node db/migrate.js
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");

(async () => {
  const sql = neon(process.env.DATABASE_URL);
  const text = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8").replace(/--[^\n]*/g, "");
  for (const stmt of text.split(";").map((s) => s.trim()).filter(Boolean)) await sql(stmt);
  console.log("Schema applied.");
})().catch((e) => { console.error(e); process.exit(1); });
