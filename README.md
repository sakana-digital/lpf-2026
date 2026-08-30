# 八宝祭 (Happo-sai) - LiSA Papillon Festival 2026 公式サイト

## 主な機能

### apps/website/: 公開サイト

- 文化祭の模擬店の状況を表示

### apps/status/: ステータス送信

- 混雑状況，販売状況を表示

## デプロイ

- 本体（Pages）: main に push すると Git 連携で自動ビルド・デプロイ
- 模擬店ステータスアプリ（Workers）: `bun run status:deploy`。初回の手順は [apps/status/README.md](apps/status/README.md) を参照

ステータスアプリはリポジトリルートから `bun run status:dev` で起動できる（入力 SPA をビルドして Worker を :8787 で立ち上げる）。

## トークン運用

平文は D1 に保存せず、SHA-256 ハッシュだけを `org_tokens.token_hash` と `admin_tokens.token_hash` に入れる。団体一覧は [shared/organizations.ts](shared/organizations.ts) が唯一の定義で、公開サイトの表示もトークン発行もここから作る。

### 発行と投入

リポジトリルートで実行する。生成・ハッシュ化・D1 への投入までを 1 コマンドで行い、平文はどこにも書き込まない。

```sh
bun run status:token                        # ローカル D1 に全団体（31 件）
bun run status:token -- --remote            # 本番 D1 に全団体
bun run status:token -- --remote <org_id> # 指定した団体だけ差し替え
bun run status:token -- --remote --admin    # 管理者トークン
```

- 標準出力は `<org_id>` と `<token>` のタブ区切り。配布用にパスワードマネージャーや表計算へ貼る（wrangler の出力は標準エラーへ流すので、そのままパイプできる）
- 全団体に発行しておき、ステータスを出さない団体は管理画面の「表示する団体」で外す
- 配布 URL は団体・管理者とも `https://<Worker ドメイン>/?t=<token>`。初回アクセスで localStorage へ移り、URL からは消える
- 差し替えた瞬間に旧トークンは使えなくなる。`bun run status:deploy` は不要
- `--admin` は `admin_tokens` に自然キーが無いため、既存の管理者トークンをすべて失効させてから 1 件だけ入れる
