-- 実運用では平文トークンを保存せず、SHA-256 ハッシュだけをこの形式で投入する。
-- 新しい値は `bun run token:generate` で生成する（seed.sql は gitignore 済み）。
--   bunx wrangler d1 execute happo-sai-status --local --file seed.sql
--   bunx wrangler d1 execute happo-sai-status --remote --file seed.sql
INSERT INTO org_tokens (token_hash, org_id) VALUES
  ('8b709bce1e16d3e4d23764ff532a9902d09c4b07b543d0400c43f7a2e4bbb51a', 'c1-1'),
  ('c8afa90c64349e9005428a1fc611db38797b6e0c5c4150cc646633573a0a09a0', 'c1-2')
ON CONFLICT (org_id) DO UPDATE SET token_hash = excluded.token_hash;

INSERT INTO admin_tokens (token_hash) VALUES
  ('f37837a0953cdad0b2908f982c310813daec9cf4f1950c7b82a22e8d277b0aad');
