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

4. 本番用トークンと SHA-256 ハッシュを生成する。表示された `token` は配布用としてパスワードマネージャー等へ保存し、D1 には `sha256` だけを投入する。**実トークンはファイルやGitへ保存しない**

   ```sh
   bun run token:generate
   cp seed.example.sql seed.sql
   # seed.sql の token_hash を、生成された sha256 で置き換える
   bunx wrangler d1 execute happo-sai-status --remote --file seed.sql
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

### 既存環境への token hash migration

`0007_hash_access_tokens.sql` は既存の平文トークンを削除するため、適用前に全団体・管理者の新しい `token` と `sha256` を生成し、`seed.sql` を完成させておく。以下を続けて実行する間、ステータス更新と管理画面は一時的に利用できない。

```sh
bunx wrangler d1 migrations apply happo-sai-status --remote
bunx wrangler d1 execute happo-sai-status --remote --file seed.sql
bun run deploy
```

適用後は新しい平文 `token` を使った URL を各団体・管理者へ再配布し、旧 URL は破棄する。

## デプロイ後の確認

- `https://<本体ドメイン>/api/status` が JSON を返す
  - index.html が返る → Pages Functions が未検出
  - 500 → Service Binding 未設定
- `https://happo-sai-status.<account>.workers.dev/?t=<実トークン>` で送信 → 本体 `/explore/events/` のセル展開でバッジに反映（ポーリングは 60 秒間隔）
- 本体ドメインへの `POST /api/status` が 405

## トークン運用

- 平文トークンはD1へ保存せず、`org_tokens.token_hash` と `admin_tokens.token_hash` に SHA-256 ハッシュだけを保存する
- 新しいトークンは `bun run token:generate` で生成し、平文の `token` を配布、`sha256` を `seed.sql` 経由でD1へ投入する
- 団体トークンの追加・差し替えは `INSERT INTO org_tokens (token_hash, org_id) VALUES ('<sha256>', 'c1-1') ON CONFLICT (org_id) DO UPDATE SET token_hash = excluded.token_hash;` を `seed.sql` に記述して実行する
- 団体には `https://<Worker ドメイン>/?t=<トークン>` を配布。初回アクセスで localStorage に保存され、URL からは自動で除去される
- migration `0007_hash_access_tokens.sql` の適用時に既存の団体・管理者トークンはすべて失効する。適用直後に新しいハッシュを投入してから Worker をデプロイする

## 管理者モード

管理者トークンの SHA-256 ハッシュは D1 の `admin_tokens` テーブルで管理する。管理者トークンでアクセスすると入力 SPA が管理者モードになり、以下ができる。

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

本番用管理者トークンの登録:

```sh
bun run token:generate
# 出力された sha256 を seed.sql の admin_tokens に記入
bunx wrangler d1 execute happo-sai-status --remote --file seed.sql
```

- アクセスは団体と同じく `https://<Worker ドメイン>/?t=<管理者トークン>`（ローカルは `http://localhost:8787/?t=dev-token-admin`）
- 管理者トークンの失効は該当する `token_hash` を削除する。新しいハッシュへ差し替えれば旧トークンは利用できなくなる
