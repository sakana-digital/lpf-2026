CREATE TABLE signage_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  org_ids TEXT NOT NULL DEFAULT '[]',
  active_video_key TEXT,
  footer_text TEXT NOT NULL DEFAULT '',
  alert_enabled INTEGER NOT NULL DEFAULT 0 CHECK (alert_enabled IN (0, 1)),
  alert_text TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO signage_config (id) VALUES (1);

CREATE TABLE signage_viewer_auth (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  token_hash TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
