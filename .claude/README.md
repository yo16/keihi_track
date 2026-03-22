# batch-dev-db

DB連携アプリケーション向けのバッチ開発ワークフロー。
`batch-dev` をベースに、DB設計・DB操作実装の専門エージェントを追加したもの。

## 概要

1. 人間が仕様書（`docs/specification.md`）を書く
2. `/batch-design` を実行し、アプリケーション設計・DB設計・API設計を行う（→ `docs/design.md`, `docs/db-design.md`）
3. `task-decomposer` スキルで仕様をBeadsタスクに分解・登録する
4. `/batch-start` を実行すると、オープンなタスクを依存関係順に自動で全件実行する
5. 全タスク完了後、`dev` ブランチをGitHubへpushし、`dev → main` のPRを作成する

## batch-devとの違い

| 項目 | batch-dev | batch-dev-db |
|------|-----------|--------------|
| 設計フェーズ | なし | `/batch-design` でアプリケーション設計・DB設計・API設計を実施 |
| DB操作実装 | coderが全て担当 | db-coderがDB操作関数を専門実装 |
| DB特化サービス | なし | supabase-specialistがSupabase固有機能を担当 |
| テスト観点 | 標準テスト | DB操作テスト観点を追加 |
| 環境変数管理 | なし | `.env.sample` で必要な環境変数を管理 |

## ブランチ戦略

```
main ← dev ← feature/t-xxx（タスクごと）
```

- タスクごとに `feature/t-xxx` ブランチを作成して実装
- テスト成功後、`feature/t-xxx` を `dev` へマージ（commit履歴を残す通常マージ）
- featureブランチはマージ後もローカルに残す（ロールバック用）
- 全タスク完了後、`dev` をGitHubへpushしPRを作成

## コマンド

| コマンド | 説明 |
|---------|------|
| `/batch-design` | 設計フェーズの実施（`docs/design.md`, `docs/db-design.md` を出力） |
| `/batch-start` | 全タスク一括実行のエントリーポイント |
| `/batch-task-execute` | 単一タスクの実行（コーディング→テスト→マージ） |
| `/batch-change` | 問題修正・改善・変更の管理（分析→承認→Beads登録→実装） |
| `/batch-push-pr` | dev をGitHubへpushしPRを作成 |
| `/batch-failed` | 失敗時の処理（停止・通知） |

## エージェント

| エージェント | 説明 |
|------------|------|
| `app-designer` | アプリケーション設計スペシャリスト。ページ構成・コンポーネント・状態管理・ディレクトリ構成を設計 |
| `db-designer` | RDB設計スペシャリスト。テーブル設計・API設計を総合的に行う |
| `db-coder` | DB操作実装スペシャリスト。クエリ・トランザクション・マイグレーションを担当 |
| `supabase-specialist` | Supabase特化。Auth・Storage・Realtime・Edge Functions等を担当 |
| `task-planner` | オープンタスクの取得・依存関係に基づく実行順決定 |
| `coder` | コーディング専門（実装・テストコード作成、DB操作はdb-coderに委譲） |
| `tester` | テスト専門（実行・結果分析・修正依頼作成、DB操作テスト観点含む） |
| `beads-manager` | Beadsタスク管理（ステータス更新・notes記録） |
| `git-manager` | ローカルgit操作専門（ブランチ・マージ・commit） |
| `github-manager` | GitHub操作専門（push・PR作成） |

## エージェント間の連携

```
/batch-design 時:
  app-designer ──→ db-designer（データ操作要件を引き渡し）
  db-designer ←→ supabase-specialist（Supabase利用時に相談）

/batch-start → /batch-task-execute 時:
  coder ──→ db-coder（DB操作関数の実装を委譲）
  coder ──→ supabase-specialist（Supabase固有機能の実装を委譲）
  tester ──→ coder / db-coder / supabase-specialist（修正依頼の振り分け）
```

## 失敗時の挙動

- **テスト失敗**: 最大3回リトライ → 超過で自動処理を停止しユーザーへ通知
- **その他の失敗**（git操作エラー、GitHub接続エラー等）: 即座に停止しユーザーへ通知

## 利用先プロジェクトの CLAUDE.md に追記すべき内容

このワークフローを利用するプロジェクトでは、`CLAUDE.md`に以下のセクションを追記する。
各エージェントがプロジェクト固有の情報を正しく理解するために必要となる。

```markdown
## DBサービス
- 使用サービス: Supabase（または PostgreSQL / MySQL 等）
- 接続方式: Supabase Client SDK（または直接接続 等）

## DB操作アーキテクチャ
- アプリケーションからDBへのアクセスは、必ずDB操作用APIを経由する
- DB操作関数は `src/lib/db/` に配置する
- アプリケーションコードがDBに直接クエリを発行しないこと

## API技術スタック
- APIフレームワーク: Next.js API Routes（または Express / Hono 等）
- ランタイム: Node.js（または Deno 等）

## テスト方針
- DB操作のテスト: （モック使用 / テスト用DBに接続 等）
- テストフレームワーク: Jest（または Vitest 等）

## 環境変数
- `.env.sample` に定義された環境変数を `.env` に設定して使用する
- 本番環境での環境変数設定方法: （Vercel環境変数 / dotenv 等）
```

上記はテンプレートであり、プロジェクトの実態に合わせて値を埋める。
`/batch-design` 実行時に db-designer がこの情報を参照して設計方針を決定する。

### 変更管理ルール

```markdown
## 変更管理ルール
- 問題報告・改善要望・変更依頼を受けた場合、即座にコード修正に着手しない
- 必ず `/batch-change` コマンドのプロセスに従う:
  1. 問題・要望の整理
  2. 原因分析
  3. 対応方針の提示 → ユーザー承認
  4. Beadsタスクとして登録（背景・原因・きっかけを記録）
  5. 実装
- どんなに軽微な修正でも、Beadsタスクとして登録・記録する
- 特にトラブル対応では「何が問題だったのか」「発覚のきっかけ」を記録することを重視する
```

## 変更管理の仕組み（4層防御）

問題報告や改善要望が直接コード修正されることを防ぐため、以下の4層で `/batch-change` プロセスへの誘導を行う。

| レイヤー | 仕組み | 役割 |
|---------|--------|------|
| 1. Hook | `scripts/change-gate-hook.sh`（UserPromptSubmit） | キーワード検知で毎回リマインダーを注入 |
| 2. Skill | `change-gate`（shared/skills/） | 自然言語から起動し、ユーザーに確認して `/batch-change` に誘導 |
| 3. Command | `/batch-change` | 分析→承認→Beads登録→実装の正式プロセス |
| 4. CLAUDE.md | 上記「変更管理ルール」セクション | 行動規範としての明文化 |

## 他のDBサービスへの拡張

現在はSupabase向けの `supabase-specialist` を提供しているが、他のDBサービス（PlanetScale、Neon、Firebase等）が必要な場合は、同様のパターンでサービス固有のスペシャリストエージェントを追加できる。
