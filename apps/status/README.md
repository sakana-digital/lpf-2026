# ステータス入力アプリ

模擬店団体が「販売状況」（5 択）「混雑状況」（3 択）を送信するアプリと、その API (Cloudflare Workers + D1) です。  
本体サイト（Cloudflare Pages）の `/explore` は、Pages Functions ([apps/website/functions/api/[[path]].ts](../website/functions/api/%5B%5Bpath%5D%5D.ts)) の Service Binding 経由で同一ドメインの `/api/status` からデータを取得します。

## ローカル開発

コマンドはすべてリポジトリルートで実行します。

```sh
# 初回: ローカル D1 にスキーマを適用
bun run status:migrate -- --local
bun run status:seed

# 入力 SPA をビルドして Worker を起動
bun run status:dev
```

- 入力 SPA は末尾に `?t=dev-token-c3-9`、管理者モードは `?t=dev-token-admin` をつけて開きます。
- サイネージは管理者画面の「サイネージ設定」で閲覧 URL を発行して開きます。
- 本体サイトは `bun dev`（:5173）です。`/api` は vite の proxy で :8787 に転送されます。
- 入力 SPA 自体を開発するときは `bun run status:dev:spa` を使います（別ポートの vite dev で、API は proxy で :8787 へ転送されます）。

## デプロイ

### 初回

1. D1 を作成し、出力された `database_id` で [wrangler.jsonc](wrangler.jsonc) のプレースホルダーを置き換えます（コミットして問題ありません）。

   ```sh
   bunx wrangler d1 create happo-sai-status
   ```

2. サイネージ動画・音声用 R2 bucket を作成します（`wrangler.jsonc` の `bucket_name` と一致させます）。

   ```sh
   bunx wrangler r2 bucket create happo-sai-signage
   ```

3. 本番 D1 にスキーマを適用します。

   ```sh
   bun run status:migrate -- --remote
   ```

4. 全団体と管理者のトークンを発行し、`apps/status/tokens.remote.csv` の URL を配布します（[トークン運用](#トークン運用)）。

   ```sh
   bun run status:token -- --remote
   bun run status:token -- --remote --admin
   ```

5. Worker の手動デプロイです。

   ```sh
   bun run status:deploy
   ```

6. Cloudflare ダッシュボード → Pages プロジェクト → Settings → Bindings（Functions）で、変数名 `STATUS` → Worker `happo-sai-status` の Service Binding を追加します。忘れると本体の `/api/status` が 500 になります。

7. main を push します（Git 連携で Pages が再ビルドされ、`functions/` が有効になります）。

### 2回目以降

`migrations/` に SQL を追加したときだけ、push の前に `bun run status:migrate -- --remote` を実行します。

### 既存環境への token hash migration

`0007_hash_access_tokens.sql` は既存の平文トークンを削除します。以下を続けて実行する間アプリは一時的に利用できません。  
更新後は URL を配布し直す必要があります。

```sh
bun run status:migrate -- --remote
bun run status:token -- --remote
bun run status:token -- --remote --admin
```

### デプロイ後の確認

- `https://happo-sai.pages.dev/api/status` が JSON を返すか。
  - index.html が返る場合は、Pages Functions が未検出です。
  - 500 が返る場合は、Service Binding が未設定です。
- 更新されたステータスが公開サイトの `/explore/events/` に表示されるか（キャッシュ 15 秒 + ポーリング 45 秒で最大 60 秒かかります）。
- 本体ドメインへの `POST /api/status` が 405 か。
- push したコミットのデプロイが GitHub 上で成功しているか。

本体サイトは開催日（2026-09-26 / 27）以外は `/api/status` を呼ばないので、それ以外の日は表示を確認できません。

## 運用

### トークン

平文は D1 に保存せず、SHA-256 ハッシュだけを `org_tokens.token_hash` と `admin_tokens.token_hash` に入れます。団体一覧は [shared/organizations.ts](../../shared/organizations.ts) から作ります。

```sh
bun run status:token                      # ローカル D1 に全団体（31 件）
bun run status:token -- --remote          # 本番 D1 に全団体
bun run status:token -- --remote <org_id> # 指定した団体だけ差し替え
bun run status:token -- --remote --admin  # 管理者トークン
```

- 標準出力は `<org_id>` と `<token>` のタブ区切りです（wrangler の出力は標準エラーへ流すので、そのままパイプできます）。
- 同時に `apps/status/tokens.local.csv` / `tokens.remote.csv`（`id,name,url`）を書き出します。gitignore 済みですが、間違って公開しないように注視してください。
- `--admin` は `admin_tokens` に自然キーが無いため、既存の管理者トークンをすべて失効させてから 1 件だけ入れます。

### 管理者モード

管理者 URL でアクセスすると管理者モードになり、以下ができます。

- 団体をセレクトから選んで、任意の団体のステータスを代理更新できます。
- ステータスを表示する団体、表示しない団体を選べます。
- サイネージの表示団体・並び順、固定案内・速報、R2 の動画・音声、閲覧 URL を管理できます。
- ステータスの送信可能時間を設定します。
  - 両日とも未設定なら常に送信できます。設定済みの日は、そのいずれかの時間内なら送信できます。
  - 時間外は団体トークンの `POST /api/status` が 403 になり、公開の `GET /api/status` は空配列を返します（本体サイトにステータスが表示されません）。

### サイネージ

- 16:9 レイアウトです。
- フッターは [shared/schedule.ts](../../shared/schedule.ts) のタイムテーブルから `<まもなく|開催中|次は> <時刻> <企画名 / 団体名> @ <会場>` を表示します。開催中の枠は `10:00-10:30` のように終了時刻まで出し、開始前の枠は開始 10 分前から開始時刻だけを出します。開催中の枠と次の枠を表示します。速報はどちらも上書きします。
- 開催日以外でフッターの見た目を確認するときは `/signage?at=2026-09-26T10:22`（端末のタイムゾーンで解釈）を付けます。
- 動画は MP4・最大 1 GiB、音声は MP3 / M4A・最大 64 MiB です。ブラウザから 16 MiB 単位の Multipart Upload で R2 に保存します。配信は `private, max-age=86400, immutable` です。
- `signage_config.video_start_at` を過ぎるまで動画を出さず `映像準備中` で待ちます。判定は 10 秒ごとのティックなので、開始は最大 10 秒遅れます。null なら常に再生し、管理画面のプレビューは時刻を無視します。
- 音声は `signage_config.audio_start_at` を過ぎたときに 1 回だけ再生します。文化祭終了時刻を入れて使います。null なら再生せず、プレビューでも鳴りません。
- 自動再生は消音でしか始まらないため、端末で「音声を有効にする」を一度押しておく必要があります。動画と音声の両方に効きます。
- 設定とステータスは 60 秒間隔で更新され、取得失敗時は最後に成功した表示を維持します。

## アーキテクチャ

```mermaid
flowchart LR
  viewer["閲覧者のブラウザ"]
  org["団体スマホ<br/>入力 SPA ?t=トークン"]
  signage["サイネージ端末<br/>/signage?t=閲覧トークン<br/>→ HttpOnly Cookie"]

  subgraph main["本体ドメイン（Cloudflare Pages）"]
    fn["Pages Functions<br/>GET のみ・15 秒キャッシュ"]
  end

  subgraph workerDomain["Worker ドメイン（*.workers.dev）"]
    worker["Worker happo-sai-status"]
  end

  d1[("D1<br/>ステータス・設定<br/>トークン")]
  r2[("R2<br/>サイネージ動画")]

  viewer -->|"GET /api/status"| fn
  fn -->|"Service Binding STATUS"| worker
  org -->|"POST /api/status"| worker
  signage -->|"GET /api/signage"| worker
  worker --> d1
  worker --> r2
```

- 値の型は [shared/status.ts](../../shared/status.ts) を全体で共有します。
- 書き込み（`POST /api/status`）は Worker ドメインからのみできます。
- `GET /api/status`
  - Worker ドメイン（`*.workers.dev`）では 404 です。エッジキャッシュを迂回させないためです。
  - Pages Functions がエッジにキャッシュするので、D1 は最大 15 秒に 1 回しか読みません。
  - `hidden_orgs` にある団体を除いて返します。管理者向けの `GET /api/me` は全団体を返します。

### API

| エンドポイント     | 認証                     | 内容                                       |
| ------------------ | ------------------------ | ------------------------------------------ |
| `GET /api/status`  | なし（本体ドメインのみ） | 全団体のステータス一覧                     |
| `GET /api/me`      | Bearer                   | トークンに対応する団体と現在値             |
| `POST /api/status` | Bearer                   | 自団体の `{ sales, congestion }` を UPSERT |
| `GET /api/signage` | Cookie / Admin Bearer    | サイネージ設定と選択団体の最新値           |
| `PUT /api/orgs`    | Admin Bearer             | ステータスを表示しない団体の一覧を保存     |
| `PUT /api/window`  | Admin Bearer             | Day 1 / Day 2 の送信可能時間を保存         |

管理者用の `/api/signage/*` では設定保存、閲覧 URL 発行、R2 Multipart Upload、動画・音声の選択と削除を行います。

#### 各団体が持つ状態

- `sales`: `available | partial | low | paused | soldout`
  > `paused | soldout` は混雑状況を持ちません
- `congestion`: `low | medium | high`
