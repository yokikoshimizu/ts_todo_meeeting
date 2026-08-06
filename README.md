# 会議メモ整理アプリ

会議内容、決定事項、TODOを登録し、必要な情報をあとから探しやすくするWebアプリです。
データはブラウザーのLocalStorageではなく、REST APIを通してSQLiteへ保存します。

## 主な機能

- 会議メモの一覧・詳細表示
- 会議メモの新規登録・編集・削除
- キーワード検索とタグ絞り込み
- TODOの担当者・期限・完了状態の管理
- PC・スマートフォン対応
- API通信中・通信失敗時の状態表示

## 技術構成

- フロントエンド: React / TypeScript / Vite
- バックエンド: Node.js HTTP Server
- データベース: SQLite（Node.js組み込みの`node:sqlite`）

Node.js 24以上が必要です。

## セットアップ

```bash
pnpm install
```

## 開発環境の起動

フロントエンドとAPIをまとめて起動します。

```bash
pnpm dev
```

- フロントエンド: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:3001/api/health>

Viteの開発サーバーは、`/api`へのリクエストをバックエンドへ転送します。

## ビルドと確認

```bash
pnpm build
pnpm preview
```

`pnpm preview`では、APIとビルド済みのフロントエンドを同じサーバーで配信します。
ブラウザーで <http://127.0.0.1:3001> を開いてください。

## APIテスト

```bash
pnpm test:api
```

一時データベースに対して、登録・取得・更新・TODO完了切り替え・削除を確認します。

## API

| Method | Path | 内容 |
| --- | --- | --- |
| `GET` | `/api/health` | APIの稼働確認 |
| `GET` | `/api/meetings` | 会議メモ一覧の取得 |
| `GET` | `/api/meetings/:id` | 会議メモ詳細の取得 |
| `POST` | `/api/meetings` | 会議メモの登録 |
| `PUT` | `/api/meetings/:id` | 会議メモの更新 |
| `DELETE` | `/api/meetings/:id` | 会議メモの削除 |
| `PATCH` | `/api/meetings/:id/action-items/:actionItemId` | TODO完了状態の更新 |

## データベース

初回起動時に`data/meeting-memos.db`が作成され、確認用のサンプルデータが登録されます。
`data`ディレクトリはGitの管理対象外です。

データを初期状態へ戻す場合は、サーバーを停止してから`data/meeting-memos.db`を削除し、再度起動してください。
