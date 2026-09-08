# Web Apps for LiSA Papillon Festival 2026

## Apps

- [apps/website/](apps/website/): 公開サイト (Cloudflare Pages)
- [apps/status/](apps/status/): ステータス送信，サイネージ，管理画面 (Cloudflare Workers + D1)

## 利用者向けドキュメント

[docs/](docs/) に書く VitePress を、`main` へ push して GitHub Pages へデプロイします。

## 開発

```sh
cd path/to/lpf-2026/
bun install

# Website
bun run dev

# Status (初回はローカル D1 の初期化が必要です。)
bun run status:dev

# Documents
bun run docs:dev
```

[apps/status/](apps/status/) の詳細は [apps/status/README.md](apps/status/README.md) を参照してください。
