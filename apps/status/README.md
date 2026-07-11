# happo-sai-status — 模擬店ステータス入力アプリ

模擬店団体が「販売状況」「混雑状況」を各 3 択で送信する WebApp と、その API（Cloudflare Workers + D1）。
本体サイト（Cloudflare Pages）の `/explore` は、Pages Functions（[apps/web/functions/api/[[path]].ts](../web/functions/api/%5B%5Bpath%5D%5D.ts)）の Service Binding 経由で同一ドメインの `/api/status` からデータを取得する。

## アーキテクチャ

```
閲覧: ブラウザ → Pages /api/status → Pages Functions (GET のみ)
        → Service Binding STATUS → Worker → D1

更新: 団体スマホ → Worker ドメインの入力 SPA (?t=<トークン>)
        → 同一オリジン POST /api/status → D1

表示: サイネージ端末 → Worker /signage?t=<閲覧トークン>
        → HttpOnly Cookie → D1 の設定・ステータス + R2 の動画
```

- 書き込みは Worker ドメイン直のみ。本体ドメイン経由の POST は 405
- 値の型は [shared/status.ts](../../shared/status.ts) を Worker / 入力 SPA / 本体 SPA で共有

## API

| エンドポイント     | 認証                  | 内容                                       |
| ------------------ | --------------------- | ------------------------------------------ |
| `GET /api/status`  | なし                  | 全団体のステータス一覧                     |
| `GET /api/me`      | Bearer                | トークンに対応する団体と現在値             |
| `POST /api/status` | Bearer                | 自団体の `{ sales, congestion }` を UPSERT |
| `GET /api/signage` | Cookie / Admin Bearer | サイネージ設定と選択団体の最新値           |

管理者用の `/api/signage/*` では設定保存、閲覧 URL 発行、R2 Multipart Upload、動画選択・削除を行う。

`sales`: `available` / `low` / `soldout`、`congestion`: `low` / `medium` / `high`

## ローカル開発

```sh
# 初回: ローカル D1 にスキーマとダミートークンを投入
bunx wrangler d1 migrations apply happo-sai-status --local
bunx wrangler d1 execute happo-sai-status --local --file seed.example.sql

# 入力 SPA をビルドしてから Worker を起動（:8787）
bun run build
bun run dev:worker
```

- 入力 SPA: `http://localhost:8787/?t=dev-token-c1-1`（トークンは [seed.example.sql](seed.example.sql) 参照）
- サイネージは管理者画面の「サイネージ設定」で閲覧 URL を発行して開く
- 本体はリポジトリルートで `bun dev`（:5173）。`/api` は vite の proxy で :8787 に転送される
- 入力 SPA 自体を開発するときは `bun run dev`（:5173 とは別ポートの vite dev。API は proxy で :8787 へ）

## 初回デプロイ

wrangler 未ログインなら先に `bunx wrangler login`。以下すべて `apps/status/` で実行。

1. D1 を作成し、出力された `database_id` で [wrangler.jsonc](wrangler.jsonc) のプレースホルダーを置き換える（コミットして OK）

   ```sh
   bunx wrangler d1 create happo-sai-status
   ```

2. サイネージ動画用 R2 bucket を作成（`wrangler.jsonc` の `bucket_name` と一致させる）

   ```sh
   bunx wrangler r2 bucket create happo-sai-signage
   ```

3. 本番 D1 にスキーマを適用

   ```sh
   bunx wrangler d1 migrations apply happo-sai-status --remote
   ```

4. 本番用トークンを投入（`seed.example.sql` をコピーし、`openssl rand -hex 16` などで生成した推測不能な値に書き換える。**実トークンはコミットしない**）

   ```sh
   cp seed.example.sql seed.prod.sql
   bunx wrangler d1 execute happo-sai-status --remote --file seed.prod.sql
   rm seed.prod.sql
   ```

5. Worker をデプロイ

   ```sh
   bun run deploy
   ```

6. Cloudflare ダッシュボード → Pages プロジェクト → Settings → Bindings（Functions）で Service Binding を追加: 変数名 `STATUS` → Worker `happo-sai-status`（忘れると本体の `/api/status` が 500）

7. main を push（Git 連携で Pages が再ビルドされ `functions/` が有効化）

## 2 回目以降のデプロイ

| 変更した場所                                     | 操作                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `apps/status/`（入力 SPA / Worker API）          | `bun run deploy`                                                                 |
| `apps/web/`（本体 SPA・`functions/`）・`shared/` | `git push` のみ（Pages が自動ビルド）                                            |
| `migrations/` に SQL を追加                      | `bunx wrangler d1 migrations apply happo-sai-status --remote` → `bun run deploy` |

## デプロイ後の確認

- `https://<本体ドメイン>/api/status` が JSON を返す
  - index.html が返る → Pages Functions が未検出
  - 500 → Service Binding 未設定
- `https://happo-sai-status.<account>.workers.dev/?t=<実トークン>` で送信 → 本体 `/explore/events/` のセル展開でバッジに反映（ポーリングは 60 秒間隔）
- 本体ドメインへの `POST /api/status` が 405

## トークン運用

- トークン → 団体の対応は D1 の `org_tokens` テーブル
- 追加・差し替えは SQL で（例: `INSERT OR REPLACE INTO org_tokens (token, org_id) VALUES ('<新トークン>', 'c1-1');` を `--remote` で実行）
- 団体には `https://<Worker ドメイン>/?t=<トークン>` を配布。初回アクセスで localStorage に保存され、URL からは自動で除去される

## 管理者モード

管理者トークンは D1 の `admin_tokens` テーブルで管理する。管理者トークンでアクセスすると入力 SPA が管理者モードになり、以下ができる。

- 団体をセレクトから選んで任意の団体のステータスを代理更新（送信時間の制限を受けない）
- 送信可能時間（submission window）を Day 1 / Day 2 それぞれ設定・解除
- サイネージの表示団体・並び順、固定案内・速報、R2 動画、閲覧 URL を管理

## サイネージ

- `/signage` は 16:9 固定レイアウト。表示団体が 8 件を超える場合は 10 秒ごとにページを切り替える
- 動画は MP4・最大 1 GiB。ブラウザから 16 MiB 単位の Multipart Upload で R2 に保存する
- 発行 URL を最初に開くと閲覧トークンが HttpOnly Cookie に移され、URL から削除される
- 閲覧 URL を再発行すると、以前の URL と Cookie は即時無効になる
- 設定とステータスは 10 秒間隔で更新され、取得失敗時は最後に成功した表示を維持する

送信可能時間の扱い:

- 両日とも未設定なら常に送信可。設定済みの日のいずれかの時間内なら送信可
- 時間外は団体トークンの `POST /api/status` が 403、公開の `GET /api/status` は空配列を返す（本体サイトにステータスが表示されない）

使い方:

```sh
# トークンを注入（ローカルは seed.example.sql の dev-token-admin 済み）
bunx wrangler d1 execute happo-sai-status --remote \
  --command "INSERT OR REPLACE INTO admin_tokens (token) VALUES ('<openssl rand -hex 16 で生成>');"
```

- アクセスは団体と同じく `https://<Worker ドメイン>/?t=<管理者トークン>`（ローカルは `http://localhost:8787/?t=dev-token-admin`）
- 削除は `DELETE FROM admin_tokens WHERE token = '<トークン>';`
