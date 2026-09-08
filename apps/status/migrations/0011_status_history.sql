CREATE TABLE org_status_log (
  id INTEGER PRIMARY KEY,
  org_id TEXT NOT NULL,
  sales TEXT NOT NULL CHECK (sales IN ('available', 'paused', 'partial', 'low', 'soldout')),
  congestion TEXT CHECK (congestion IS NULL OR congestion IN ('low', 'medium', 'high')),
  source TEXT NOT NULL CHECK (source IN ('org', 'admin')),
  created_at INTEGER NOT NULL
);

-- The log starts empty: org_status keeps no earlier values to backfill from.
CREATE INDEX org_status_log_org ON org_status_log (org_id, created_at DESC, id DESC);
