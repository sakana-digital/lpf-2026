-- ローカル D1 専用のダミー。`bun run status:seed` が org_tokens / admin_tokens / org_status を
-- 空にしてから流すので、実行後の状態は必ずこのファイルの中身と一致する。
-- 本番のトークンは `bun run status:token -- --remote` が直接 D1 に入れるため、ここは通らない。

-- c3-9 は実在しない組なので、ダミーが本番の団体と混ざらない
INSERT INTO org_tokens (token_hash, org_id) VALUES
  ('437e16c727dcf8472c334afdd6c5b58514e9e5aeee4fc1b94b6cae76bccc4638', 'c3-9')
ON CONFLICT (org_id) DO UPDATE SET token_hash = excluded.token_hash;

-- このハッシュは公開されているので、本番の admin_tokens に入れてはいけない
INSERT INTO admin_tokens (token_hash) VALUES
  ('f37837a0953cdad0b2908f982c310813daec9cf4f1950c7b82a22e8d277b0aad')
ON CONFLICT (token_hash) DO NOTHING;

-- ローカルで入力 SPA とサイネージの表示を確認するためのサンプル
INSERT INTO org_status (org_id, sales, congestion, updated_at) VALUES
  ('c3-9', 'available', 'low', unixepoch())
ON CONFLICT (org_id) DO UPDATE
  SET sales = excluded.sales, congestion = excluded.congestion, updated_at = excluded.updated_at;
