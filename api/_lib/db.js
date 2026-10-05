// Neon serverless Postgres over HTTP. One client per function instance.
// Tests swap in an in-memory database through global.__DW_TEST_SQL__.
const { neon } = require("@neondatabase/serverless");

let sql = null;
module.exports = function db() {
  if (global.__DW_TEST_SQL__) return global.__DW_TEST_SQL__;
  if (!sql) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
};
