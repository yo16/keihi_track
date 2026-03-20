# ケイトラ アプリケーション設計書

## 1. ドキュメント構成

| ドキュメント | 内容 |
|-------------|------|
| `docs/specification.md` | 要件定義 |
| `docs/db-design.md` | DB設計・API設計・RLS・Storage・マイグレーション |
| `docs/app-design.md`（本書） | フロントエンド設計・バックエンド設計・認証フロー・ディレクトリ構成 |

DB設計・APIエンドポイント仕様・RLSポリシー・Storage設計・マイグレーション計画については `docs/db-design.md` を参照のこと。

---

## 2. 技術スタック詳細

| レイヤー | 技術 | バージョン方針 |
|---------|------|--------------|
| フレームワーク | Next.js (App Router) | 最新安定版 |
| 言語 | TypeScript | strict mode |
| UIライブラリ | Tailwind CSS | 最新安定版 |
| UIコンポーネント | shadcn/ui | 必要なコンポーネントのみ追加 |
| フォーム管理 | React Hook Form + Zod | バリデーション統合 |
| Supabaseクライアント | @supabase/supabase-js + @supabase/ssr | Cookie認証対応 |
| テスト | Jest + React Testing Library | ユニットテスト中心 |
| リンター | ESLint + Prettier | Next.js推奨設定 |

---

## 3. ディレクトリ構成

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # ルートレイアウト
│   ├── page.tsx                  # トップ / 汎用ログイン / 組織作成
│   │
│   ├── [orgId]/                  # 組織スコープ
│   │   ├── login/
│   │   │   └── page.tsx          # 組織専用ログイン
│   │   ├── change-password/
│   │   │   └── page.tsx          # パスワード変更
│   │   ├── layout.tsx            # 認証済みレイアウト（ヘッダー + 通知バッジ）
│   │   ├── dashboard/
│   │   │   └── page.tsx          # ダッシュボード（ロール別リダイレクト）
│   │   ├── expenses/
│   │   │   ├── page.tsx          # 申請一覧（使用者: 自分の一覧）
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # 新規経費申請
│   │   │   └── [expenseId]/
│   │   │       └── page.tsx      # 経費詳細 / 編集 / 再申請
│   │   ├── approvals/
│   │   │   └── page.tsx          # 承認待ち一覧（承認者向け）
│   │   ├── reports/
│   │   │   └── page.tsx          # 経費一覧 + フィルター + CSV出力（承認者向け）
│   │   ├── admin/
│   │   │   ├── members/
│   │   │   │   └── page.tsx      # ユーザー管理
│   │   │   └── invite/
│   │   │       └── page.tsx      # 招待テキスト表示
│   │   └── notifications/
│   │       └── page.tsx          # 通知一覧
│   │
│   └── api/                      # API Routes
│       └── organizations/
│           ├── route.ts          # POST: 組織作成
│           └── [orgId]/
│               ├── route.ts      # GET: 組織情報
│               ├── me/
│               │   ├── route.ts              # GET: 自分の情報
│               │   └── password-changed/
│               │       └── route.ts          # PATCH: パスワード変更完了
│               ├── members/
│               │   ├── route.ts              # GET: 一覧, POST: 追加
│               │   └── [userId]/
│               │       └── route.ts          # PATCH: ロール変更, DELETE: 削除
│               ├── expenses/
│               │   ├── route.ts              # GET: 一覧, POST: 新規申請
│               │   ├── csv/
│               │   │   └── route.ts          # POST: CSV用データ取得
│               │   └── [expenseId]/
│               │       ├── route.ts          # GET: 詳細
│               │       ├── approve/
│               │       │   └── route.ts      # POST: 承認
│               │       ├── reject/
│               │       │   └── route.ts      # POST: 却下
│               │       ├── withdraw/
│               │       │   └── route.ts      # POST: 取り下げ
│               │       └── resubmit/
│               │           └── route.ts      # POST: 再申請
│               └── notifications/
│                   ├── route.ts              # GET: 一覧
│                   ├── unread-count/
│                   │   └── route.ts          # GET: 未読数
│                   ├── read-all/
│                   │   └── route.ts          # PATCH: 全既読
│                   └── [notificationId]/
│                       └── read/
│                           └── route.ts      # PATCH: 既読
│
├── components/
│   ├── ui/                       # shadcn/ui コンポーネント
│   ├── layout/
│   │   ├── header.tsx            # ヘッダー（ナビゲーション + 通知バッジ）
│   │   └── sidebar.tsx           # サイドバー（ロール別メニュー）
│   ├── auth/
│   │   ├── login-form.tsx        # ログインフォーム
│   │   ├── org-login-form.tsx    # 組織専用ログインフォーム
│   │   └── change-password-form.tsx  # パスワード変更フォーム
│   ├── expenses/
│   │   ├── expense-form.tsx      # 経費申請フォーム（新規 + 再申請共用）
│   │   ├── expense-list.tsx      # 経費一覧テーブル
│   │   ├── expense-detail.tsx    # 経費詳細表示
│   │   ├── approval-actions.tsx  # 承認 / 却下ボタン + 却下理由入力
│   │   ├── expense-filters.tsx   # フィルター（日付 + ステータス）
│   │   └── csv-export-button.tsx # CSV出力ボタン
│   ├── admin/
│   │   ├── member-list.tsx       # メンバー一覧
│   │   ├── member-form.tsx       # メンバー作成フォーム
│   │   ├── role-change-dialog.tsx  # ロール変更ダイアログ
│   │   └── invite-text.tsx       # 招待テキスト表示 + コピーボタン
│   ├── notifications/
│   │   ├── notification-bell.tsx # ベルアイコン + 未読バッジ
│   │   └── notification-list.tsx # 通知一覧
│   └── shared/
│       ├── receipt-upload.tsx     # レシート画像アップロード + サムネイル生成
│       ├── receipt-viewer.tsx     # レシート画像表示
│       ├── status-badge.tsx       # ステータスバッジ
│       └── pagination.tsx         # ページネーション
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # ブラウザ用Supabaseクライアント
│   │   ├── server.ts             # サーバー用Supabaseクライアント
│   │   ├── middleware.ts          # ミドルウェア用セッション管理
│   │   └── admin.ts              # 管理用クライアント（service_role）
│   ├── db/                        # DB操作関数（→ db-design.md セクション6）
│   │   ├── organizations.ts
│   │   ├── members.ts
│   │   ├── expenses.ts
│   │   ├── notifications.ts
│   │   └── types.ts
│   ├── validators/                # Zodスキーマ
│   │   ├── expense.ts
│   │   ├── member.ts
│   │   ├── organization.ts
│   │   └── auth.ts
│   ├── utils/
│   │   ├── image-resize.ts       # Canvas APIでのサムネイル生成
│   │   ├── csv-export.ts         # CSV生成・ダウンロード
│   │   └── format.ts             # 日付・金額フォーマット
│   └── hooks/
│       ├── use-auth.ts            # 認証状態管理
│       ├── use-notifications.ts   # 通知ポーリング + 未読数管理
│       └── use-org.ts             # 組織コンテキスト管理
│
├── middleware.ts                   # Next.jsミドルウェア（セッションリフレッシュ）
│
└── types/
    ├── database.ts                # Supabase生成型（supabase gen types）
    ├── api.ts                     # APIリクエスト / レスポンス型
    └── index.ts                   # 共通型エクスポート
```

---

## 4. 認証フロー

### 4.1 ログインフロー

```
ユーザー
  │
  ├─ 汎用ページ（/）
  │   │ 組織ID + メールアドレス + パスワード入力
  │   ↓
  │   supabase.auth.signInWithPassword()
  │   │
  │   ├─ 成功 → GET /api/organizations/{orgId}/me
  │   │         │
  │   │         ├─ require_password_change = true
  │   │         │   → /{orgId}/change-password へリダイレクト
  │   │         │
  │   │         └─ require_password_change = false
  │   │             → /{orgId}/dashboard へリダイレクト
  │   │
  │   └─ 失敗 → エラー表示
  │
  └─ 組織専用ページ（/{orgId}/login）
      │ メールアドレス + パスワード入力（orgIdはURLから取得）
      ↓
      （以降同じフロー）
```

### 4.2 セッション管理

- Supabase AuthのJWTトークンをCookieで管理（`@supabase/ssr`）
- Next.jsミドルウェアで全リクエストのセッションをリフレッシュ
- トークン期限切れ時はログインページへリダイレクト

**Edge Runtime制約に関する注意**:
- `middleware.ts` は Edge Runtime で実行されるため、Node.js専用ライブラリ（`jsonwebtoken`, `bcrypt`等）は使用不可
- `@supabase/ssr` は Edge Runtime 対応済み（Web Crypto APIベース）のため問題なし
- middleware.ts 内の catch 節では必ず `console.error` でエラーを出力すること（サイレントな握りつぶしは原因不明の認証エラーを引き起こす）
- 詳細は `.claude/knowledge/nextjs-edge-runtime.md` を参照

### 4.3 ルート保護

| パスパターン | 保護レベル |
|-------------|-----------|
| `/` | 公開（未認証でもアクセス可） |
| `/{orgId}/login` | 公開 |
| `/{orgId}/change-password` | 認証必須 |
| `/{orgId}/dashboard` | 認証必須 + 組織メンバー |
| `/{orgId}/expenses/**` | 認証必須 + 組織メンバー |
| `/{orgId}/approvals` | 認証必須 + 承認者以上 |
| `/{orgId}/reports` | 認証必須 + 承認者以上 |
| `/{orgId}/admin/**` | 認証必須 + 管理者 |
| `/{orgId}/notifications` | 認証必須 + 組織メンバー |

### 4.4 ミドルウェアでの認証チェック

```
リクエスト
  │
  ├─ middleware.ts
  │   ├─ Supabaseセッションリフレッシュ
  │   ├─ 公開パス → そのまま通過
  │   └─ 保護パス
  │       ├─ 未認証 → /{orgId}/login へリダイレクト
  │       └─ 認証済み → そのまま通過
  │
  └─ レイアウト（[orgId]/layout.tsx）
      ├─ GET /api/organizations/{orgId}/me でロール取得
      ├─ ロール不足 → /{orgId}/dashboard へリダイレクト
      └─ OK → ページ描画
```

ミドルウェアでは認証有無のみチェックし、ロール制御はレイアウトコンポーネントで行う。これによりミドルウェアを軽量に保つ。

---

## 5. フロントエンド設計

### 5.1 レイアウト構成

```
ルートレイアウト（app/layout.tsx）
  │ - html, body, フォント設定
  │ - Tailwind CSS のグローバルスタイル
  │
  └─ 組織スコープレイアウト（app/[orgId]/layout.tsx）
       │ - 認証チェック
       │ - 組織コンテキスト提供
       │ - ヘッダー（ロゴ、ナビ、通知ベル、ユーザーメニュー）
       │ - サイドバー（ロール別メニュー）
       │
       └─ ページコンテンツ
```

### 5.2 ロール別ナビゲーション

| メニュー項目 | 使用者 | 承認者 | 管理者 |
|-------------|--------|--------|--------|
| 経費申請 | o | o | o |
| 申請一覧 | o | o | o |
| 承認待ち | - | o | o |
| 経費レポート | - | o | o |
| ユーザー管理 | - | - | o |

### 5.3 レスポンシブ対応

- モバイルファーストで設計（スマホでのレシート撮影が主要ユースケース）
- ブレークポイント:
  - `sm` (640px): スマホ横向き
  - `md` (768px): タブレット
  - `lg` (1024px): デスクトップ
- スマホではサイドバーをハンバーガーメニューに切り替え
- テーブル表示はスマホではカード表示に切り替え

### 5.4 レシート画像処理（クライアントサイド）

```
画像選択
  │
  ├─ Canvas APIでリサイズ
  │   ├─ 長辺300px以下になるようリサイズ比率を計算
  │   ├─ Canvas描画 → Blob変換
  │   └─ サムネイルBlobを生成
  │
  ├─ Supabase Storageにアップロード
  │   ├─ オリジナル: receipts/{orgId}/{expenseId}/original.{ext}
  │   └─ サムネイル: receipts/{orgId}/{expenseId}/thumbnail.{ext}
  │
  └─ 返却されたURLをフォームの値にセット
```

**注意**: expense_idはアップロード時点で未確定の場合がある。一時的なUUIDをクライアントで生成し、経費作成API呼び出し時にそのIDを渡す、またはAPI側で経費作成後にStorageパスを更新する方式を検討する。

### 5.5 CSV出力（クライアントサイド）

```
承認者が一覧でチェックボックスを選択
  │
  ├─ 「CSV出力」ボタンクリック
  │
  ├─ POST /api/organizations/{orgId}/expenses/csv
  │   └─ ボディ: { ids: [選択されたexpense_id配列] }
  │
  ├─ レスポンスデータをCSV文字列に変換
  │   └─ BOM付きUTF-8（Excelでの文字化け防止）
  │
  └─ Blobを作成しダウンロード
```

### 5.6 通知ポーリング

```
useNotifications() フック
  │
  ├─ 30秒間隔でポーリング
  │   └─ GET /api/organizations/{orgId}/notifications/unread-count
  │
  ├─ 未読数をステートで管理
  │   └─ ヘッダーのベルアイコンバッジに反映
  │
  ├─ ページ遷移時にもフェッチ
  │
  └─ 通知一覧ページでは全通知を取得
      └─ GET /api/organizations/{orgId}/notifications
```

---

## 6. バックエンド設計

### 6.1 API Route構成パターン

全API Routeは以下の共通パターンで実装する。

```typescript
// app/api/organizations/[orgId]/expenses/route.ts の例
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMemberOrFail } from '@/lib/auth/guard'
import { createExpenseSchema } from '@/lib/validators/expense'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  // 1. 認証チェック
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '認証が必要です' } },
      { status: 401 }
    )
  }

  // 2. 組織メンバー + ロールチェック
  const member = await getMemberOrFail(params.orgId, user.id)
  // getMemberOrFail は組織所属チェック + ロール取得を行い、
  // 不正な場合は適切なエラーレスポンスをthrowする

  // 3. リクエストバリデーション
  const body = await request.json()
  const parsed = createExpenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
      { status: 400 }
    )
  }

  // 4. DB操作（src/lib/db/ の関数を呼び出す）
  const result = await createExpense(params.orgId, user.id, parsed.data)

  // 5. レスポンス
  return NextResponse.json({ data: result }, { status: 201 })
}
```

### 6.2 認可ガード

```
src/lib/auth/
  └── guard.ts
```

共通の認可チェックを関数として切り出す。

| 関数 | 説明 |
|------|------|
| `getMemberOrFail(orgId, userId)` | 組織メンバーでなければ403 |
| `requireRole(member, minRole)` | 指定ロール以上でなければ403 |
| `requireSelf(member, targetUserId)` | 本人でなければ403 |
| `requireNotSelf(member, targetUserId)` | 本人であれば403（自己承認防止等） |

ロールの比較は包含関係を考慮する: `admin` > `approver` > `user`

### 6.3 Supabaseクライアントの使い分け

| クライアント | 使用場面 | RLS |
|-------------|---------|-----|
| ブラウザ用（`client.ts`） | クライアントコンポーネント | 有効 |
| サーバー用（`server.ts`） | Server Components, API Routes | 有効（ユーザーのセッションで動作） |
| 管理用（`admin.ts`） | ユーザー作成、組織作成初期メンバー登録 | バイパス |

**原則**: サーバー用クライアントを基本とし、RLSバイパスが必要な場合のみ管理用を使用する。管理用クライアント使用時はアプリケーション層で認可チェックを必ず行う。

### 6.4 エラーハンドリング

APIエラーレスポンスは統一フォーマットで返す（→ `db-design.md` セクション2.1 参照）。

```typescript
// src/lib/api/error.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message)
  }
}

// 使用例
throw new ApiError(403, 'FORBIDDEN', '承認権限がありません')
```

API Routeのトップレベルでtry-catchし、ApiErrorを適切なレスポンスに変換する。

---

## 7. 画面設計

### 7.1 画面遷移図

```
/ (トップ / 汎用ログイン)
├─ 組織作成 → /{orgId}/dashboard
└─ ログイン → /{orgId}/login と同じフローへ

/{orgId}/login
└─ ログイン成功
    ├─ パスワード変更必要 → /{orgId}/change-password → /{orgId}/dashboard
    └─ 不要 → /{orgId}/dashboard

/{orgId}/dashboard
├─ [使用者] → /{orgId}/expenses（申請一覧）
├─ [承認者] → /{orgId}/approvals（承認待ち一覧）
└─ [管理者] → /{orgId}/admin/members（ユーザー管理）

/{orgId}/expenses
├─ 新規申請 → /{orgId}/expenses/new → 申請完了 → /{orgId}/expenses
├─ 詳細確認 → /{orgId}/expenses/{id}
│   ├─ [却下済 + 本人] → 編集・再申請
│   └─ [申請中 + 本人] → 取り下げ
└─ 通知ベル → /{orgId}/notifications

/{orgId}/approvals
└─ 申請クリック → /{orgId}/expenses/{id}
    ├─ 承認ボタン
    └─ 却下ボタン → 却下理由入力

/{orgId}/reports
├─ フィルター適用
├─ チェックボックス選択
└─ CSV出力

/{orgId}/admin/members
├─ メンバー追加 → 招待テキスト表示
├─ ロール変更
└─ メンバー削除
```

### 7.2 各画面の要素

#### トップページ（`/`）

- 組織ID入力フィールド
- メールアドレス入力フィールド
- パスワード入力フィールド
- ログインボタン
- 「新規組織を作成」リンク → 組織名入力ダイアログ

#### 組織専用ログイン（`/{orgId}/login`）

- 組織名を表示（組織IDから取得。取得できない場合はエラー表示）
- メールアドレス入力フィールド
- パスワード入力フィールド
- ログインボタン

#### パスワード変更（`/{orgId}/change-password`）

- 新しいパスワード入力
- パスワード確認入力
- 変更ボタン

#### 経費申請フォーム（`/{orgId}/expenses/new`）

- 金額入力（数値、必須）
- 用途入力（テキスト、必須）
- 使用日入力（日付ピッカー、必須）
- レシート写真アップロード（カメラ / ファイル選択、必須）
  - プレビュー表示（サムネイル）
- コメント入力（テキストエリア、任意）
- 申請ボタン

#### 申請一覧（`/{orgId}/expenses`）

- テーブル: 使用日、用途、金額、ステータス、申請日時
- ステータスバッジ（色分け）
- 行クリックで詳細へ遷移

#### 経費詳細（`/{orgId}/expenses/{id}`）

- 全入力項目の表示
- レシート画像表示（サムネイル、クリックでオリジナル表示）
- ステータス表示
- 承認 / 却下情報（該当する場合）
- アクションボタン（ロール + ステータスに応じて表示切替）:
  - 承認者 + 申請中 + 他人の申請 → 承認 / 却下ボタン
  - 使用者 + 申請中 + 自分の申請 → 取り下げボタン
  - 使用者 + 却下 + 自分の申請 → 編集 / 再申請ボタン

#### 承認待ち一覧（`/{orgId}/approvals`）

- テーブル: 申請者名、使用日、用途、金額、申請日時
- 行クリックで詳細（承認 / 却下操作あり）へ遷移
- 自分自身の申請は表示しない

#### 経費レポート（`/{orgId}/reports`）

- フィルターエリア: 日付（from / to）、ステータス選択
- テーブル: チェックボックス、申請者名、使用日、用途、金額、ステータス
- 全選択 / 全解除チェックボックス
- CSV出力ボタン（選択件数表示）

#### ユーザー管理（`/{orgId}/admin/members`）

- メンバー一覧テーブル: 表示名、メールアドレス、ロール、ステータス
- 「メンバー追加」ボタン → メンバー作成フォーム
  - メールアドレス、初期パスワード、表示名、ロール選択
  - 作成完了後、招待テキストをダイアログで表示 + コピーボタン
- ロール変更: ドロップダウンまたはダイアログ
- 削除: 確認ダイアログ付き

#### 通知一覧（`/{orgId}/notifications`）

- 通知リスト: 通知メッセージ、日時、既読/未読
- クリックで関連する経費詳細へ遷移
- 「全て既読にする」ボタン

---

## 8. 状態管理

### 8.1 方針

- グローバル状態は最小限にする
- Server Componentsでデータフェッチし、Client Componentsに渡す
- クライアント側の状態管理にはReact Context + useStateを使用（外部状態管理ライブラリは不使用）

### 8.2 コンテキスト

| コンテキスト | 提供場所 | 内容 |
|-------------|---------|------|
| AuthContext | `[orgId]/layout.tsx` | ユーザー情報、ロール、組織情報 |
| NotificationContext | `[orgId]/layout.tsx` | 未読通知数、ポーリング制御 |

---

## 9. バリデーション

### 9.1 二重バリデーション方針

- **クライアント側**: React Hook Form + Zodスキーマでリアルタイムバリデーション
- **サーバー側**: API Routeで同じZodスキーマを使って再バリデーション

### 9.2 主要バリデーションスキーマ

| スキーマ | フィールド | ルール |
|---------|-----------|--------|
| createExpense | amount | 正の整数、必須 |
| | purpose | 非空文字列、必須 |
| | usage_date | 有効な日付、必須 |
| | receipt_url | 有効なURL、必須 |
| | receipt_thumbnail_url | 有効なURL、必須 |
| | comment | 文字列、任意 |
| createMember | email | メール形式、必須 |
| | password | 8文字以上、必須 |
| | display_name | 非空文字列、必須 |
| | role | 'approver' \| 'user'、必須 |
| rejectExpense | comment | 非空文字列、必須（却下理由） |
| changePassword | password | 8文字以上、必須 |
| | password_confirm | passwordと一致、必須 |

---

## 10. テスト方針

### 10.1 テスト対象と方針

| レイヤー | テスト種別 | ツール | 方針 |
|---------|-----------|-------|------|
| DB操作関数 | 統合テスト | Jest | テスト用Supabaseプロジェクトに接続 |
| API Routes | 統合テスト | Jest | HTTP リクエスト/レスポンスを検証 |
| バリデーション | ユニットテスト | Jest | Zodスキーマの入出力を検証 |
| コンポーネント | ユニットテスト | Jest + RTL | 表示とインタラクションを検証 |
| 認可ガード | ユニットテスト | Jest | ロール別アクセス制御を検証 |

### 10.2 テストディレクトリ

```
__tests__/
  ├── lib/
  │   ├── db/           # DB操作関数のテスト
  │   ├── validators/   # バリデーションのテスト
  │   └── auth/         # 認可ガードのテスト
  ├── api/              # API Routeのテスト
  └── components/       # コンポーネントのテスト
```

---

## 11. デプロイ

### 11.1 Vercel設定

| 設定 | 値 |
|------|-----|
| Framework | Next.js |
| Build Command | `next build` |
| Output Directory | `.next` |
| Node.js Version | 20.x |

### 11.2 環境変数（Vercel）

| 変数 | 設定先 |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production, Preview, Development |
| `SUPABASE_SECRET_KEY` | Production, Preview, Development |

### 11.3 デプロイフロー

```
main ブランチへのマージ → Vercelが自動デプロイ
```

---

## 12. 今後の拡張ポイント

| 機能 | 優先度 | 備考 |
|------|--------|------|
| メール通知 | 低 | Supabase Edge Functions or 外部サービス |
| メール招待 | 低 | メール通知機能に依存 |
| Realtime通知 | 低 | ポーリングからの移行、Supabase Realtime |
| 多言語対応 | スコープ外 | next-intl等の導入 |
| ダークモード | 未定 | Tailwind CSSのdark:プレフィックス |
