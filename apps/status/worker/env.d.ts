/// <reference types="@cloudflare/workers-types" />

/** Bindings declared in wrangler.jsonc. `bun run cf-typegen` prints the generated shape. */
export interface Env {
  DB: D1Database
  SIGNAGE_MEDIA: R2Bucket
  ASSETS: Fetcher
}
