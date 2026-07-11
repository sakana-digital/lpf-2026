CREATE TABLE org_tokens_hashed (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  org_id TEXT NOT NULL UNIQUE
);

-- 団体一覧は保持するが、既存の平文トークンは移行せず失効させる。
-- 推測・利用できないランダムなハッシュを仮置きし、新しいハッシュで更新する。
INSERT INTO org_tokens_hashed (token_hash, org_id)
  SELECT lower(hex(randomblob(32))), org_id FROM org_tokens;

DROP TABLE org_tokens;
ALTER TABLE org_tokens_hashed RENAME TO org_tokens;

CREATE TABLE admin_tokens_hashed (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64)
);

DROP TABLE admin_tokens;
ALTER TABLE admin_tokens_hashed RENAME TO admin_tokens;
