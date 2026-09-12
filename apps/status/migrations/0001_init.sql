-- Access tokens are only ever stored as their sha256 hex digest.
CREATE TABLE org_tokens (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  org_id TEXT NOT NULL UNIQUE
);

CREATE TABLE admin_tokens (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64)
);

-- Congestion is null while a group is paused or sold out.
-- `test` tells a rehearsal's rows from the real ones, so both live in one table.
CREATE TABLE org_status (
  org_id TEXT NOT NULL,
  test INTEGER NOT NULL DEFAULT 0 CHECK (test IN (0, 1)),
  sales TEXT NOT NULL CHECK (sales IN ('available', 'paused', 'partial', 'low', 'soldout')),
  congestion TEXT CHECK (congestion IS NULL OR congestion IN ('low', 'medium', 'high')),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (org_id, test)
);

-- Every update org_status has ever taken, newest read first.
CREATE TABLE org_status_log (
  id INTEGER PRIMARY KEY,
  org_id TEXT NOT NULL,
  test INTEGER NOT NULL DEFAULT 0 CHECK (test IN (0, 1)),
  sales TEXT NOT NULL CHECK (sales IN ('available', 'paused', 'partial', 'low', 'soldout')),
  congestion TEXT CHECK (congestion IS NULL OR congestion IN ('low', 'medium', 'high')),
  source TEXT NOT NULL CHECK (source IN ('org', 'admin')),
  created_at INTEGER NOT NULL
);

CREATE INDEX org_status_log_org ON org_status_log (test, org_id, created_at DESC, id DESC);

-- One row per festival day; a missing row means the opening hours from shared/timetable.ts.
CREATE TABLE submit_windows (
  day INTEGER PRIMARY KEY CHECK (day IN (1, 2)),
  accept_from INTEGER NOT NULL,
  accept_until INTEGER NOT NULL
);

-- The rehearsal before the festival: while the row exists, groups may send at any time and
-- every read and write lands on the `test = 1` rows, so ending it only deletes those.
CREATE TABLE test_session (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  started_at INTEGER NOT NULL
);

-- A single row: the signage shows every group in STATUS_ORG_IDS, so it keeps no list of its own.
CREATE TABLE signage_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_video_key TEXT,
  video_start_at INTEGER,
  active_audio_key TEXT,
  audio_start_at INTEGER,
  footer_text TEXT NOT NULL DEFAULT '',
  alert_enabled INTEGER NOT NULL DEFAULT 0 CHECK (alert_enabled IN (0, 1)),
  alert_text TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO signage_config (id) VALUES (1);

CREATE TABLE signage_viewer_auth (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  token_hash TEXT NOT NULL CHECK (length(token_hash) = 64),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
