# lpf-2026-status — 模擬店ステータス入力アプリ

模擬店団体が「販売状況」「混雑状況」を各 3 択で送信する WebApp と、その API（Cloudflare Workers + D1）。
本体サイト（Cloudflare Pages）の `/explore` は、Pages Functions（[apps/web/functions/api/[[path]].ts](../web/functions/api/%5B%5Bpath%5D%5D.ts)）の Service Binding 経由で同一ドメインの `/api/status` からデータを取得する。

## アーキテクチャ

```
閲覧: ブラウザ → Pages /api/status → Pages Functions (GET のみ)
        → Service Binding STATUS → Worker → D1

更新: 団体スマホ → Worker ドメインの入力 SPA (?t=<トークン>)
        → 同一オリジン POST /api/status → D1
```

- 書き込みは Worker ドメイン直のみ。本体ドメイン経由の POST は 405
- 値の型は [shared/status.ts](../../shared/status.ts) を Worker / 入力 SPA / 本体 SPA で共有

## API

| エンドポイント     | 認証   | 内容                                       |
| ------------------ | ------ | ------------------------------------------ |
| `GET /api/status`  | なし   | 全団体のステータス一覧                     |
| `GET /api/me`      | Bearer | トークンに対応する団体と現在値             |
| `POST /api/status` | Bearer | 自団体の `{ sales, congestion }` を UPSERT |

`sales`: `available` / `low` / `soldout`、`congestion`: `low` / `medium` / `high`

## ローカル開発

```sh
# 初回: ローカル D1 にスキーマとダミートークンを投入
bunx wrangler d1 migrations apply lpf-2026-status --local
bunx wrangler d1 execute lpf-2026-status --local --file seed.example.sql

# 入力 SPA をビルドしてから Worker を起動（:8787）
bun run build
bun run dev:worker
```

- 入力 SPA: `http://localhost:8787/?t=dev-token-c1-1`（トークンは [seed.example.sql](seed.example.sql) 参照）
- 本体はリポジトリルートで `bun dev`（:5173）。`/api` は vite の proxy で :8787 に転送される
- 入力 SPA 自体を開発するときは `bun run dev`（:5173 とは別ポートの vite dev。API は proxy で :8787 へ）

## 初回デプロイ

wrangler 未ログインなら先に `bunx wrangler login`。以下すべて `apps/status/` で実行。

1. D1 を作成し、出力された `database_id` で [wrangler.jsonc](wrangler.jsonc) のプレースホルダーを置き換える（コミットして OK）

   ```sh
   bunx wrangler d1 create lpf-2026-status
   ```

2. 本番 D1 にスキーマを適用

   ```sh
   bunx wrangler d1 migrations apply lpf-2026-status --remote
   ```

3. 本番用トークンを投入（`seed.example.sql` をコピーし、`openssl rand -hex 16` などで生成した推測不能な値に書き換える。**実トークンはコミットしない**）

   ```sh
   cp seed.example.sql seed.prod.sql
   bunx wrangler d1 execute lpf-2026-status --remote --file seed.prod.sql
   rm seed.prod.sql
   ```

4. Worker をデプロイ

   ```sh
   bun run deploy
   ```

5. Cloudflare ダッシュボード → Pages プロジェクト → Settings → Bindings（Functions）で Service Binding を追加: 変数名 `STATUS` → Worker `lpf-2026-status`（忘れると本体の `/api/status` が 500）

6. main を push（Git 連携で Pages が再ビルドされ `functions/` が有効化）

## 2 回目以降のデプロイ

| 変更した場所                                     | 操作                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `apps/status/`（入力 SPA / Worker API）          | `bun run deploy`                                                                |
| `apps/web/`（本体 SPA・`functions/`）・`shared/` | `git push` のみ（Pages が自動ビルド）                                           |
| `migrations/` に SQL を追加                      | `bunx wrangler d1 migrations apply lpf-2026-status --remote` → `bun run deploy` |

## デプロイ後の確認

- `https://<本体ドメイン>/api/status` が JSON を返す
  - index.html が返る → Pages Functions が未検出
  - 500 → Service Binding 未設定
- `https://lpf-2026-status.<account>.workers.dev/?t=<実トークン>` で送信 → 本体 `/explore/events/` のセル展開でバッジに反映（ポーリングは 60 秒間隔）
- 本体ドメインへの `POST /api/status` が 405

## トークン運用

- トークン → 団体の対応は D1 の `org_tokens` テーブル
- 追加・差し替えは SQL で（例: `INSERT OR REPLACE INTO org_tokens (token, org_id) VALUES ('<新トークン>', 'c1-1');` を `--remote` で実行）
- 団体には `https://<Worker ドメイン>/?t=<トークン>` を配布。初回アクセスで localStorage に保存され、URL からは自動で除去される
