-- Local D1 dummies only. `bun run status:seed` empties org_tokens, admin_tokens and
-- org_status before loading this, so the result always matches this file.
-- Production tokens go straight into D1 through `bun run status:token -- --remote`.

-- c3-9 is not a real class, so the dummies never mix with the production groups
INSERT INTO org_tokens (token_hash, org_id) VALUES
  ('437e16c727dcf8472c334afdd6c5b58514e9e5aeee4fc1b94b6cae76bccc4638', 'c3-9')
ON CONFLICT (org_id) DO UPDATE SET token_hash = excluded.token_hash;

-- This hash is public, so it must never reach the production admin_tokens
INSERT INTO admin_tokens (token_hash) VALUES
  ('f37837a0953cdad0b2908f982c310813daec9cf4f1950c7b82a22e8d277b0aad')
ON CONFLICT (token_hash) DO NOTHING;

-- Sample rows for checking the input SPA and the signage locally
INSERT INTO org_status (org_id, sales, congestion, updated_at) VALUES
  ('c3-9', 'available', 'low', unixepoch())
ON CONFLICT (org_id) DO UPDATE
  SET sales = excluded.sales, congestion = excluded.congestion, updated_at = excluded.updated_at;
