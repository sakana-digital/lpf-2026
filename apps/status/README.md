# happo-sai-status — 模擬店ステータス入力アプリ

模擬店団体が「販売状況」（5 択）「混雑状況」（3 択）を送信する WebApp と、その API（Cloudflare Workers + D1）。
本体サイト（Cloudflare Pages）の `/explore` は、Pages Functions（[apps/website/functions/api/[[path]].ts](../website/functions/api/%5B%5Bpath%5D%5D.ts)）の Service Binding 経由で同一ドメインの `/api/status` からデータを取得する。

## アーキテクチャ

```
閲覧: ブラウザ → Pages /api/status → Pages Functions (GET のみ、15 秒キャッシュ)
        → Service Binding STATUS → Worker → D1

更新: 団体スマホ → Worker ドメインの入力 SPA (?t=<トークン>)
        → 同一オリジン POST /api/status → D1

表示: サイネージ端末 → Worker /signage?t=<閲覧トークン>
        → HttpOnly Cookie → D1 の設定・ステータス + R2 の動画
```

- 書き込みは Worker ドメイン直のみ。本体ドメイン経由の POST は 405
- 逆に `GET /api/status` は Worker ドメイン（`*.workers.dev`）では 404。エッジキャッシュを迂回して D1 を叩ける経路を残さないため。`POST` と `/api/me` は Worker ドメインのまま
- `GET /api/status` だけが `public, max-age=15`。Pages Functions がエッジにキャッシュし、D1 は最大 15 秒に 1 回しか読まない。認証つきの応答は `no-store`
- `GET /api/status` は `hidden_orgs` にある団体を除いて返す。管理者向けの `GET /api/me` は全団体を返す
- 値の型は [shared/status.ts](../../shared/status.ts) を Worker / 入力 SPA / 本体 SPA で共有

## API

| エンドポイント     | 認証                     | 内容                                       |
| ------------------ | ------------------------ | ------------------------------------------ |
| `GET /api/status`  | なし（本体ドメインのみ） | 全団体のステータス一覧                     |
| `GET /api/me`      | Bearer                   | トークンに対応する団体と現在値             |
| `POST /api/status` | Bearer                   | 自団体の `{ sales, congestion }` を UPSERT |
| `GET /api/signage` | Cookie / Admin Bearer    | サイネージ設定と選択団体の最新値           |
| `PUT /api/orgs`    | Admin Bearer             | ステータスを表示しない団体の一覧を保存     |

管理者用の `/api/signage/*` では設定保存、閲覧 URL 発行、R2 Multipart Upload、動画選択・削除を行う。

`sales`: `available` / `partial` / `low` / `paused` / `soldout`（`paused` と `soldout` は混雑状況を持たない）、`congestion`: `low` / `medium` / `high`

## ローカル開発

コマンドはすべてリポジトリルートで実行する。

```sh
# 初回: ローカル D1 にスキーマとダミートークンを投入
bun run status:migrate -- --local
bun run status:seed

# 入力 SPA をビルドして Worker を起動（:8787）
bun run status:dev
```

- 入力 SPA: `http://localhost:8787/?t=dev-token-c1-1`（トークンは [seed.example.sql](seed.example.sql) 参照）
- サイネージは管理者画面の「サイネージ設定」で閲覧 URL を発行して開く
- 本体サイトは `bun dev`（:5173）。`/api` は vite の proxy で :8787 に転送される
- 入力 SPA 自体を開発するときは `bun run status:dev:spa`（別ポートの vite dev。API は proxy で :8787 へ）

## 初回デプロイ

wrangler 未ログインなら先に `bunx wrangler login`。以下すべてリポジトリルートで実行。

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
   bun run status:migrate -- --remote
   ```

4. 全団体と管理者のトークンを発行する。出力された平文は配布用としてパスワードマネージャー等へ保存し、**ファイルや Git へ保存しない**（[トークン運用](../../README.md#トークン運用)）

   ```sh
   bun run status:token -- --remote
   bun run status:token -- --remote --admin
   ```

5. Worker をデプロイ

   ```sh
   bun run status:deploy
   ```

6. Cloudflare ダッシュボード → Pages プロジェクト → Settings → Bindings（Functions）で Service Binding を追加: 変数名 `STATUS` → Worker `happo-sai-status`（忘れると本体の `/api/status` が 500）

7. main を push（Git 連携で Pages が再ビルドされ `functions/` が有効化）

## 2 回目以降のデプロイ

| 変更した場所                                         | 操作                                                           |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `apps/status/`（入力 SPA / Worker API）              | `bun run status:deploy`                                        |
| `apps/website/`（本体 SPA・`functions/`）・`shared/` | `git push` のみ（Pages が自動ビルド）                          |
| `migrations/` に SQL を追加                          | `bun run status:migrate -- --remote` → `bun run status:deploy` |

### 既存環境への token hash migration

`0007_hash_access_tokens.sql` は既存の平文トークンを削除する。以下を続けて実行する間、ステータス更新と管理画面は一時的に利用できない。

```sh
bun run status:migrate -- --remote
bun run status:token -- --remote
bun run status:token -- --remote --admin
bun run status:deploy
```

適用後は新しい平文 `token` を使った URL を各団体・管理者へ再配布し、旧 URL は破棄する。

## デプロイ後の確認

- `https://<本体ドメイン>/api/status` が JSON を返す
  - index.html が返る → Pages Functions が未検出
  - 500 → Service Binding 未設定
- `https://happo-sai-status.<account>.workers.dev/?t=<実トークン>` で送信 → 本体 `/explore/events/` のセル展開でバッジに反映（キャッシュ 15 秒 + ポーリング 45 秒で最大 60 秒）
- 本体ドメインへの `POST /api/status` が 405

## トークン運用

発行・配布・差し替え・失効と、平文を失くしたときの手順は [ルートの README](../../README.md#トークン運用) にまとめている。

## 管理者モード

管理者トークンの SHA-256 ハッシュは D1 の `admin_tokens` テーブルで管理する。管理者トークンでアクセスすると入力 SPA が管理者モードになり、以下ができる。

- 団体をセレクトから選んで任意の団体のステータスを代理更新（送信時間の制限を受けない）
- 送信可能時間（submission window）を Day 1 / Day 2 それぞれ設定・解除
- ステータスを表示する団体を選ぶ（外した団体は公開サイトの `GET /api/status` から消える。エッジキャッシュ 15 秒 + 閲覧側のポーリング 45 秒で、消えるまで最大 60 秒）
- サイネージの表示団体・並び順、固定案内・速報、R2 動画、閲覧 URL を管理

アクセスは団体と同じく `https://<Worker ドメイン>/?t=<管理者トークン>`（ローカルは `http://localhost:8787/?t=dev-token-admin`）。登録・失効は [ルートの README](../../README.md#トークン運用) を参照。

## サイネージ

- `/signage` は 16:9 固定レイアウト。1 ページの行数は団体数に応じて 8〜12 で均等配分し、12 件を超える場合は 10 秒ごとにページを切り替える
- フッターは `INFORMATION` の見出しと、常時流れるティッカーで構成する
- ティッカーは [shared/schedule.ts](../../shared/schedule.ts) のタイムテーブルを見て `<まもなく|開催中|次は> <時刻> <企画名 / 団体名> @ <会場>` を出す。開始 10 分前から終了までが対象で、開催中は現在の枠と次の枠を 10 秒ごとに入れ替える。予定が無い時間帯は管理画面の固定案内に戻り、速報はどちらも上書きする
- 企画名と団体名の出し方は公開サイトのタイムテーブルと共通（`slotDisplayName`）
- 開催日以外でフッターの見た目を確認するときは `/signage?at=2026-09-26T10:22`（端末のタイムゾーンで解釈）を付ける。管理画面のプレビューには効かない
- 動画は MP4・最大 1 GiB。ブラウザから 16 MiB 単位の Multipart Upload で R2 に保存する。配信は `private, max-age=86400, immutable`（差し替えると別キーになるので再取得は要らない）
- `signage_config.video_start_at` を過ぎるまで動画を出さず `映像準備中` で待つ。判定は 10 秒ごとのティックなので開始は最大 10 秒遅れる。null なら常に再生し、管理画面のプレビューは時刻を無視する
- 自動再生の条件を満たすため `muted` で始める。`音声を有効にする` を押した端末だけ音が出て、再読み込みで戻る
- 発行 URL を最初に開くと閲覧トークンが HttpOnly Cookie に移され、URL から削除される
- 閲覧 URL を再発行すると、以前の URL と Cookie は即時無効になる
- 設定とステータスは 60 秒間隔で更新され、取得失敗時は最後に成功した表示を維持する

送信可能時間の扱い:

- 両日とも未設定なら常に送信可。設定済みの日のいずれかの時間内なら送信可
- 時間外は団体トークンの `POST /api/status` が 403、公開の `GET /api/status` は空配列を返す（本体サイトにステータスが表示されない）
