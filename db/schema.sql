-- DECEMBER WAHALA database schema (Postgres / Neon).
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  email       TEXT,
  pass_hash   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- One December per player. state is the full engine state; the other columns
-- are the public bits other players can see on the map.
CREATE TABLE IF NOT EXISTS saves (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state           JSONB NOT NULL,
  city            TEXT NOT NULL,
  area            TEXT NOT NULL,
  place           TEXT NOT NULL,
  day             INTEGER NOT NULL,
  look            JSONB NOT NULL,
  public_persona  TEXT NOT NULL,
  persona         TEXT NOT NULL,
  clout           INTEGER NOT NULL DEFAULT 0,
  exposed         BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saves_city ON saves(city, updated_at DESC);

-- What one player knows about another.
CREATE TABLE IF NOT EXISTS pairs (
  actor     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress  INTEGER NOT NULL DEFAULT 0,
  rel       INTEGER NOT NULL DEFAULT 40,
  state     TEXT,
  PRIMARY KEY (actor, target)
);

-- Things that happened to you while you were away.
CREATE TABLE IF NOT EXISTS inbox (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  from_user  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  payload    JSONB NOT NULL DEFAULT '{}',
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inbox_user ON inbox(user_id, read);

-- The city news ticker.
CREATE TABLE IF NOT EXISTS feed (
  id         SERIAL PRIMARY KEY,
  city       TEXT NOT NULL,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feed_city ON feed(city, created_at DESC);

-- Simple per-user rate limiting for player-to-player actions.
CREATE TABLE IF NOT EXISTS actions_log (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS actions_log_user ON actions_log(user_id, created_at DESC);
