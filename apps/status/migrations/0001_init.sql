CREATE TABLE org_status (
  org_id TEXT PRIMARY KEY,
  sales TEXT NOT NULL CHECK (sales IN ('available', 'low', 'soldout')),
  congestion TEXT NOT NULL CHECK (congestion IN ('low', 'medium', 'high')),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE org_tokens (
  token TEXT PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE
);
