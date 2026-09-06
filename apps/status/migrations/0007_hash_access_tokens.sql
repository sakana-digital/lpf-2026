CREATE TABLE org_tokens_hashed (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  org_id TEXT NOT NULL UNIQUE
);

-- The group list is kept, but the existing plaintext tokens are revoked instead of migrated.
-- A random hash that cannot be guessed or used is parked here until a new hash replaces it.
INSERT INTO org_tokens_hashed (token_hash, org_id)
  SELECT lower(hex(randomblob(32))), org_id FROM org_tokens;

DROP TABLE org_tokens;
ALTER TABLE org_tokens_hashed RENAME TO org_tokens;

CREATE TABLE admin_tokens_hashed (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64)
);

DROP TABLE admin_tokens;
ALTER TABLE admin_tokens_hashed RENAME TO admin_tokens;
