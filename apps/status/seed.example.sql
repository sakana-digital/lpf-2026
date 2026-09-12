-- Local D1 dummies only. `bun run status:seed` empties org_tokens, admin_tokens and
-- org_status before loading this, so the result always matches this file.
-- Production tokens go straight into D1 through `bun run status:token -- --remote`.

-- c2-3 is one of the food stalls in STATUS_ORG_IDS, so its token is accepted locally
-- sha256('dev-token-c2-3')
INSERT INTO org_tokens (token_hash, org_id) VALUES
  ('9362a80e56ba1ce5059a0870a0bb38a3be1e4a17865b6a829176bbfcb23fbb61', 'c2-3')
ON CONFLICT (org_id) DO UPDATE SET token_hash = excluded.token_hash;

-- sha256('dev-token-admin'). This hash is public, so it must never reach the production admin_tokens
INSERT INTO admin_tokens (token_hash) VALUES
  ('f37837a0953cdad0b2908f982c310813daec9cf4f1950c7b82a22e8d277b0aad')
ON CONFLICT (token_hash) DO NOTHING;

-- Sample rows for checking the input SPA and the signage locally
INSERT INTO org_status (org_id, sales, congestion, updated_at) VALUES
  ('c2-3', 'available', 'low', unixepoch())
ON CONFLICT (org_id, test) DO UPDATE
  SET sales = excluded.sales, congestion = excluded.congestion, updated_at = excluded.updated_at;
