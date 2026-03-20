# ケイトラ（keihi_track）

経費管理システム「ケイトラ」のプロジェクト。

## 仕様書

- `docs/specification.md` に要件定義を記載

## 技術スタック

- フロントエンド: Next.js + TypeScript
- データベース: Supabase (PostgreSQL)
- 認証: Supabase Auth
- ファイルストレージ: Supabase Storage
- デプロイ: Vercel
- UI言語: 日本語のみ

## DBサービス

- 使用サービス: Supabase
- 接続方式: Supabase Client SDK

## DB操作アーキテクチャ

- アプリケーションからDBへのアクセスは、必ずDB操作用APIを経由する
- DB操作関数は `src/lib/db/` に配置する
- アプリケーションコードがDBに直接クエリを発行しないこと

## API技術スタック

- APIフレームワーク: Next.js API Routes (App Router)
- ランタイム: Node.js

## テスト方針

- DB操作のテスト: テスト用のSupabaseプロジェクトに接続
- テストフレームワーク: Jest

## 環境変数

- `.env.sample` に定義された環境変数を `.env.local` に設定して使用する
- 本番環境での環境変数設定: Vercel環境変数

## Bashコマンドの実行ルール

- `&&`, `;`, `|` 等で複数のコマンドをチェインして実行しないこと
- 理由: `settings.json` の `permissions.allow` パターンマッチはコマンド先頭にマッチするため、`cd ... && bd list` のようなチェインは許可パターンに合致せず、毎回ユーザーに許可を求めてしまう
- 複数のコマンドが必要な場合は、1つずつ個別に実行する
