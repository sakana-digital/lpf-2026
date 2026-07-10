CREATE TABLE org_status_new (
  org_id TEXT PRIMARY KEY,
  sales TEXT NOT NULL CHECK (sales IN ('available', 'paused', 'partial', 'low', 'soldout')),
  congestion TEXT NOT NULL CHECK (congestion IN ('low', 'medium', 'high')),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO org_status_new SELECT * FROM org_status;

DROP TABLE org_status;

ALTER TABLE org_status_new RENAME TO org_status;
