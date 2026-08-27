# 八宝祭 (Happo-sai) - LiSA Papillon Festival 2026 Official Website

## 主な機能

### apps/website/: 公開サイト

- 文化祭の模擬店の状況を表示

### apps/status/: ステータス送信

- 混雑状況，販売状況を表示

## 技術スタック

- [Vue 3](https://vuejs.org/)（beta）
- [Vite+](https://viteplus.dev/)（`vp` CLI）
- [Vue Router](https://router.vuejs.org/)
- [vue-i18n](https://vue-i18n.intlify.dev/)
- TypeScript
- [Bun](https://bun.sh/) (パッケージマネージャ)

## 推奨エディタ環境

[VS Code](https://code.visualstudio.com/) と推奨拡張機能を利用してください。リポジトリを開くと [.vscode/extensions.json](.vscode/extensions.json) の推奨拡張機能が自動的に提案されます。

- [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)（`Vue.volar`）
- [Vite+ 拡張パック](https://marketplace.visualstudio.com/items?itemName=VoidZero.vite-plus-extension-pack)（`VoidZero.vite-plus-extension-pack`）

## セットアップ

```sh
bun install
```

### 開発サーバーの起動

```sh
bun dev
```

### 型チェック＆本番ビルド

型チェック（`vue-tsc`）と本番ビルド（`vp build`）をまとめて実行します。

```sh
bun run build
```

### 本番ビルドのプレビュー

```sh
bun run preview
```

### フォーマット

```sh
bun run format
```

## ディレクトリ構成

Bun workspaces によるモノレポ構成。各アプリを `apps/` 配下に置き、アプリ間で共有する型・定数だけを `shared/` に置く。

```
shared/                 # アプリ間で共有する型・定数（現状は status.ts のみ）
apps/
├── website/            # 本体サイト（Cloudflare Pages）
│   ├── src/
│   │   ├── assets/     # CSS, SVG, 画像
│   │   ├── components/ # UI コンポーネント（icons / layout / ui / 機能別）
│   │   ├── composables/# コンポーネントに紐づく Vue コンポーザブル
│   │   ├── stores/     # アプリ全体で共有する状態（theme / search / bookmarks）
│   │   ├── lib/        # Vue に依存しない純粋なロジック
│   │   ├── config/     # ページ定義・団体・スケジュールなどの静的データ
│   │   ├── locales/    # 多言語リソース（ja.json / en.json）
│   │   ├── router/     # ルーティング定義
│   │   └── views/      # 各ページ
│   ├── functions/      # Pages Functions（SSR メタ / sitemap、/api を Worker へプロキシ）
│   └── public/         # 静的アセット
└── status/             # 模擬店ステータス入力アプリ（Cloudflare Workers + D1）
```

`src/config/pages.ts` は SPA・Pages Functions・`vite.config.ts` の 3 つのバンドルから読まれるため、
alias を含め一切の import を持たせないこと。

ルートには workspace 設定と、`bun dev` などを `vp run` で `apps/website` へ委譲するスクリプトのみを置く。

## デプロイ

- 本体（Pages）: main に push すると Git 連携で自動ビルド・デプロイ
- 模擬店ステータスアプリ（Workers）: 手順は [apps/status/README.md](apps/status/README.md) を参照
