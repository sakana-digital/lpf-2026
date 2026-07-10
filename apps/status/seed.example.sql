-- 実運用のトークンはこのファイルを seed.sql にコピーして生成・投入する（seed.sql は gitignore 済み）
--   bunx wrangler d1 execute happo-sai-status --local --file seed.sql
--   bunx wrangler d1 execute happo-sai-status --remote --file seed.sql
INSERT INTO org_tokens (token, org_id) VALUES
  ('dev-token-c1-1', 'c1-1'),
  ('dev-token-c1-2', 'c1-2');

INSERT INTO admin_tokens (token) VALUES
  ('dev-token-admin');
