# 八宝祭 (Happo-sai) - LiSA Papillon Festival 2026 Official Website

## 主な機能

- 日本語 / 英語の多言語対応（vue-i18n、`/` が日本語・`/en` が英語）
- three.js を用いた演出

## 技術スタック

- [Vue 3](https://vuejs.org/)（beta）
- [Vite+](https://viteplus.dev/)（`vp` CLI）
- [Vue Router](https://router.vuejs.org/)
- [vue-i18n](https://vue-i18n.intlify.dev/)
- [Three.js](https://threejs.org/)
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

### 開発サーバー（ホットリロード）

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

```
src/
├── assets/       # CSS, SVG, 画像
├── components/   # UI コンポーネント
├── composables/  # useSearch, useTheme
├── config/       # ページ定義（pages.ts）
├── locales/      # 多言語リソース（ja.json / en.json）
├── router/       # ルーティング定義
└── views/        # 各ページ
```
