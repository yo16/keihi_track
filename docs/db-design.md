# ケイトラ DB設計書

## 1. テーブル設計

### 1.1 テーブル一覧

| # | テーブル名 | 説明 |
|---|-----------|------|
| 1 | `organizations` | 組織マスタ |
| 2 | `organization_members` | 組織メンバー（ユーザーと組織の関連、ロール管理） |
| 3 | `expenses` | 経費申請 |
| 4 | `expense_status_logs` | 経費ステータス変更履歴 |
| 5 | `notifications` | アプリ内通知 |

### 1.2 ER図（テキスト）

```
auth.users (Supabase Auth管理)
  |
  | 1:N
  v
organizations ----< organization_members >---- auth.users
                         |
                         | (org_id + user_id でスコープ)
                         |
                    expenses
                         |
                         | 1:N
                         v
                  expense_status_logs

auth.users ----< notifications
```

リレーション詳細:

- `auth.users` 1 --- N `organization_members` : 1ユーザーが複数組織に所属
- `organizations` 1 --- N `organization_members` : 1組織に複数メンバー
- `organization_members` 1 --- N `expenses` : 1メンバーが複数経費を申請（org_id, applicant_user_id）
- `expenses` 1 --- N `expense_status_logs` : 1経費に対して複数のステータス変更履歴
- `auth.users` 1 --- N `notifications` : 1ユーザーに複数の通知

### 1.3 各テーブル詳細

#### 1.3.1 organizations（組織）

```sql
CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- org_idをURLパスに使うため、外部からの検索用
-- UUIDのPKインデックスで十分（URLパスにはUUIDをそのまま使用）
```

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 組織ID。URLパスにも使用 |
| name | TEXT | NOT NULL | 組織名 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 更新日時 |

#### 1.3.2 organization_members（組織メンバー）

```sql
CREATE TABLE organization_members (
  org_id                UUID NOT NULL REFERENCES organizations(id),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  role                  TEXT NOT NULL CHECK (role IN ('admin', 'approver', 'user')),
  display_name          TEXT NOT NULL,
  require_password_change BOOLEAN NOT NULL DEFAULT true,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- 組織内のアクティブメンバー一覧取得
CREATE INDEX idx_org_members_active
  ON organization_members (org_id)
  WHERE deleted_at IS NULL;

-- ユーザーの所属組織一覧取得
CREATE INDEX idx_org_members_by_user
  ON organization_members (user_id)
  WHERE deleted_at IS NULL;
```

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| org_id | UUID | PK（複合）, FK → organizations.id | 組織ID |
| user_id | UUID | PK（複合）, FK → auth.users.id | ユーザーID（Supabase Auth） |
| role | TEXT | NOT NULL, CHECK | ロール（admin / approver / user） |
| display_name | TEXT | NOT NULL | 組織内での表示名 |
| require_password_change | BOOLEAN | NOT NULL, DEFAULT true | パスワード変更必要フラグ |
| deleted_at | TIMESTAMPTZ | NULL許可 | 論理削除日時。NULLならアクティブ |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 更新日時 |

備考:
- 複合主キー (org_id, user_id) により、同一組織に同一ユーザーが重複登録されることを防ぐ
- `require_password_change` は管理者がユーザー作成時に `true` で設定される。初回ログイン時にパスワード変更後 `false` に更新
- 論理削除は `deleted_at IS NOT NULL` で判定

#### 1.3.3 expenses（経費申請）

```sql
CREATE TABLE expenses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL,
  applicant_user_id  UUID NOT NULL,
  amount             INTEGER NOT NULL CHECK (amount > 0),
  purpose            TEXT NOT NULL,
  usage_date         DATE NOT NULL,
  receipt_url        TEXT NOT NULL,
  receipt_thumbnail_url TEXT NOT NULL,
  comment            TEXT,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')),
  approved_by        UUID,
  approved_at        TIMESTAMPTZ,
  rejected_by        UUID,
  rejected_at        TIMESTAMPTZ,
  rejection_comment  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, applicant_user_id)
    REFERENCES organization_members(org_id, user_id)
);

-- 使用者：自分の申請一覧（ステータス別）
CREATE INDEX idx_expenses_applicant
  ON expenses (org_id, applicant_user_id, status);

-- 承認者：組織内の申請一覧（ステータス別、使用日でソート）
CREATE INDEX idx_expenses_org_status
  ON expenses (org_id, status, usage_date DESC);

-- 承認者：日付フィルター用
CREATE INDEX idx_expenses_org_usage_date
  ON expenses (org_id, usage_date);
```

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 経費ID |
| org_id | UUID | NOT NULL, FK（複合） | 組織ID |
| applicant_user_id | UUID | NOT NULL, FK（複合） | 申請者のユーザーID |
| amount | INTEGER | NOT NULL, CHECK > 0 | 金額（日本円、整数） |
| purpose | TEXT | NOT NULL | 用途 |
| usage_date | DATE | NOT NULL | 使用日 |
| receipt_url | TEXT | NOT NULL | レシート写真オリジナルURL |
| receipt_thumbnail_url | TEXT | NOT NULL | レシート写真サムネイルURL |
| comment | TEXT | NULL許可 | コメント（任意） |
| status | TEXT | NOT NULL, DEFAULT 'pending', CHECK | ステータス |
| approved_by | UUID | NULL許可 | 承認者のユーザーID |
| approved_at | TIMESTAMPTZ | NULL許可 | 承認日時 |
| rejected_by | UUID | NULL許可 | 却下者のユーザーID |
| rejected_at | TIMESTAMPTZ | NULL許可 | 却下日時 |
| rejection_comment | TEXT | NULL許可 | 却下理由 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 申請日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 更新日時 |

備考:
- `approved_by` / `rejected_by` は auth.users.id を参照するが、厳密なFK制約は設けない（Supabase Authテーブルへの直接FK追加は運用上の制約があるため）。アプリケーション層で整合性を担保する
- `status = 'deleted'` が論理削除に相当する（使用者による取り下げ）
- 再申請時は同じレコードを更新する（IDは変わらない）。ステータスが `rejected` → `pending` に戻り、内容が更新される
- 却下後に再申請された場合、`rejected_by` / `rejected_at` / `rejection_comment` はクリアされる

ステータス遷移に対するCHECK制約（アプリケーション層で実装）:
- `pending` → `approved` : `approved_by` と `approved_at` が必須、`applicant_user_id != approved_by`
- `pending` → `rejected` : `rejected_by`、`rejected_at`、`rejection_comment` が必須
- `pending` → `deleted` : 申請者本人のみ
- `rejected` → `pending` : 申請者本人のみ、承認関連カラムをクリア

#### 1.3.4 expense_status_logs（経費ステータス変更履歴）

```sql
CREATE TABLE expense_status_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id    UUID NOT NULL REFERENCES expenses(id),
  changed_by    UUID NOT NULL,
  old_status    TEXT,
  new_status    TEXT NOT NULL CHECK (new_status IN ('pending', 'approved', 'rejected', 'deleted')),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 経費IDごとの履歴取得（時系列）
CREATE INDEX idx_expense_status_logs_expense
  ON expense_status_logs (expense_id, created_at);
```

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 履歴ID |
| expense_id | UUID | NOT NULL, FK → expenses.id | 経費ID |
| changed_by | UUID | NOT NULL | 操作者のユーザーID |
| old_status | TEXT | NULL許可 | 変更前ステータス（新規申請時はNULL） |
| new_status | TEXT | NOT NULL, CHECK | 変更後ステータス |
| comment | TEXT | NULL許可 | 操作時コメント（却下理由等） |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 変更日時 |

備考:
- CSV出力の承認者/承認日時、却下者/却下日時は `expenses` テーブルの非正規化カラムから取得する（パフォーマンス優先）
- 本テーブルは監査ログとしての役割を持ち、ステータス遷移の完全な履歴を保持する

#### 1.3.5 notifications（通知）

```sql
CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  user_id       UUID NOT NULL,
  expense_id    UUID REFERENCES expenses(id),
  type          TEXT NOT NULL CHECK (type IN ('new_expense', 'approved', 'rejected', 'resubmitted')),
  message       TEXT NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ユーザーの未読通知取得
CREATE INDEX idx_notifications_user_unread
  ON notifications (org_id, user_id, is_read, created_at DESC)
  WHERE is_read = false;

-- ユーザーの通知一覧（全件、新しい順）
CREATE INDEX idx_notifications_user_all
  ON notifications (org_id, user_id, created_at DESC);
```

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 通知ID |
| org_id | UUID | NOT NULL, FK → organizations.id | 組織ID |
| user_id | UUID | NOT NULL | 通知先ユーザーID |
| expense_id | UUID | NULL許可, FK → expenses.id | 関連する経費ID |
| type | TEXT | NOT NULL, CHECK | 通知種別 |
| message | TEXT | NOT NULL | 通知メッセージ |
| is_read | BOOLEAN | NOT NULL, DEFAULT false | 既読フラグ |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 通知日時 |

通知種別:
| type | 通知対象 | タイミング |
|------|---------|-----------|
| `new_expense` | 承認者（組織内全員） | 新規申請時 |
| `approved` | 申請者 | 承認時 |
| `rejected` | 申請者 | 却下時 |
| `resubmitted` | 承認者（組織内全員） | 再申請時 |

#### 1.3.6 updated_at自動更新トリガー

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_org_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 2. DB操作API設計

### 2.1 共通仕様

#### ベースパス

全エンドポイントは Next.js API Routes (App Router) で実装する。
DB操作関数は `src/lib/db/` に配置し、API Routeハンドラから呼び出す。

#### 認証

全エンドポイントで Supabase Auth のセッショントークン（JWT）を検証する。
組織スコープのエンドポイントでは、JWTのユーザーIDと `organization_members` テーブルを照合し、該当組織への所属とロールを確認する。

#### エラーレスポンス共通形式

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "人間が読めるエラーメッセージ"
  }
}
```

主要エラーコード:

| HTTPステータス | コード | 説明 |
|---------------|--------|------|
| 400 | `VALIDATION_ERROR` | リクエストパラメータ不正 |
| 401 | `UNAUTHORIZED` | 未認証 |
| 403 | `FORBIDDEN` | 権限不足 |
| 404 | `NOT_FOUND` | リソースが見つからない |
| 409 | `CONFLICT` | 状態の競合（例: 最後の管理者を降格しようとした） |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー |

#### ページネーション

カーソルベースページネーションを採用する。

リクエストパラメータ:
- `limit` : 取得件数（デフォルト: 20、最大: 100）
- `cursor` : 次ページの起点となるID（初回リクエストでは省略）

レスポンスに含めるメタ情報:
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "uuid-of-last-item-or-null",
    "has_more": true
  }
}
```

### 2.2 エンドポイント一覧

#### 組織

| メソッド | パス | 説明 | 必要ロール |
|---------|------|------|-----------|
| POST | `/api/organizations` | 組織を新規作成 | 認証済みユーザー |
| GET | `/api/organizations/:orgId` | 組織情報を取得 | メンバー |

#### 組織メンバー

| メソッド | パス | 説明 | 必要ロール |
|---------|------|------|-----------|
| GET | `/api/organizations/:orgId/members` | メンバー一覧を取得 | admin |
| POST | `/api/organizations/:orgId/members` | メンバーを追加 | admin |
| PATCH | `/api/organizations/:orgId/members/:userId` | ロールを変更 | admin |
| DELETE | `/api/organizations/:orgId/members/:userId` | メンバーを論理削除 | admin |

#### 認証補助

| メソッド | パス | 説明 | 必要ロール |
|---------|------|------|-----------|
| GET | `/api/organizations/:orgId/me` | 自分のメンバー情報を取得 | メンバー |
| PATCH | `/api/organizations/:orgId/me/password-changed` | パスワード変更完了を記録 | メンバー |

#### 経費

| メソッド | パス | 説明 | 必要ロール |
|---------|------|------|-----------|
| POST | `/api/organizations/:orgId/expenses` | 経費を申請 | メンバー |
| GET | `/api/organizations/:orgId/expenses` | 経費一覧を取得 | メンバー |
| GET | `/api/organizations/:orgId/expenses/:expenseId` | 経費詳細を取得 | メンバー |
| PATCH | `/api/organizations/:orgId/expenses/:expenseId` | 経費を編集（再申請） | メンバー（申請者本人） |
| POST | `/api/organizations/:orgId/expenses/:expenseId/approve` | 経費を承認 | approver / admin |
| POST | `/api/organizations/:orgId/expenses/:expenseId/reject` | 経費を却下 | approver / admin |
| POST | `/api/organizations/:orgId/expenses/:expenseId/withdraw` | 経費を取り下げ | メンバー（申請者本人） |
| POST | `/api/organizations/:orgId/expenses/:expenseId/resubmit` | 却下された経費を再申請 | メンバー（申請者本人） |
| GET | `/api/organizations/:orgId/expenses/csv` | CSV出力用データ取得 | approver / admin |

#### 通知

| メソッド | パス | 説明 | 必要ロール |
|---------|------|------|-----------|
| GET | `/api/organizations/:orgId/notifications` | 通知一覧を取得 | メンバー |
| GET | `/api/organizations/:orgId/notifications/unread-count` | 未読件数を取得 | メンバー |
| PATCH | `/api/organizations/:orgId/notifications/:notificationId/read` | 通知を既読にする | メンバー |
| PATCH | `/api/organizations/:orgId/notifications/read-all` | 全通知を既読にする | メンバー |

### 2.3 各エンドポイント詳細

---

#### POST /api/organizations

組織を新規作成する。作成者は自動的にadminロールのメンバーとして登録される。

**リクエスト**
```json
{
  "name": "株式会社サンプル",
  "display_name": "山田太郎"
}
```

**レスポンス** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "name": "株式会社サンプル",
    "created_at": "2026-03-20T00:00:00Z"
  }
}
```

**エラーケース**
- 401: 未認証
- 400: name または display_name が空

---

#### GET /api/organizations/:orgId

**レスポンス** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "name": "株式会社サンプル",
    "created_at": "2026-03-20T00:00:00Z"
  }
}
```

---

#### GET /api/organizations/:orgId/members

**クエリパラメータ**
- `include_deleted` : `true` の場合、論理削除済みメンバーも含める（デフォルト: false）

**レスポンス** `200 OK`
```json
{
  "data": [
    {
      "user_id": "uuid",
      "display_name": "山田太郎",
      "email": "yamada@example.com",
      "role": "admin",
      "deleted_at": null,
      "created_at": "2026-03-20T00:00:00Z"
    }
  ]
}
```

**備考**
- `email` は auth.users テーブルからJOINして取得する
- 小規模組織を想定しているためページネーションは不要

---

#### POST /api/organizations/:orgId/members

管理者がユーザーを組織に追加する。Supabase Authにアカウントが存在しない場合は新規作成する。

**リクエスト**
```json
{
  "email": "tanaka@example.com",
  "password": "initial-password-123",
  "display_name": "田中花子",
  "role": "user"
}
```

**レスポンス** `201 Created`
```json
{
  "data": {
    "user_id": "uuid",
    "display_name": "田中花子",
    "email": "tanaka@example.com",
    "role": "user",
    "invitation_text": "ケイトラに招待されました。\nログインURL: https://example.com/{org_id}/login\nメールアドレス: tanaka@example.com\n初期パスワード: initial-password-123\n※初回ログイン時にパスワードの変更が必要です。"
  }
}
```

**エラーケース**
- 403: 操作者がadminでない
- 409: 既にこの組織のアクティブメンバーとして登録済み

**処理フロー**
1. Supabase Auth Admin APIでメールアドレスを検索
2. 存在しない場合: `supabase.auth.admin.createUser()` でアカウント作成
3. 存在する場合: 既存のauth.usersのIDを使用
4. `organization_members` にレコードを挿入
5. 招待テキストを生成してレスポンスに含める

---

#### PATCH /api/organizations/:orgId/members/:userId

メンバーのロールを変更する。

**リクエスト**
```json
{
  "role": "approver"
}
```

**レスポンス** `200 OK`
```json
{
  "data": {
    "user_id": "uuid",
    "display_name": "田中花子",
    "role": "approver"
  }
}
```

**エラーケース**
- 403: 操作者がadminでない
- 403: 自分自身のロールを変更しようとした
- 409: この変更によりadminが0人になる

**バリデーション**
1. 操作者がadminであることを確認
2. 操作対象が自分自身でないことを確認
3. 対象ユーザーの現在のロールがadminで、変更後にadminでなくなる場合、他にアクティブなadminが1人以上いることを確認

---

#### DELETE /api/organizations/:orgId/members/:userId

メンバーを論理削除する。

**レスポンス** `200 OK`
```json
{
  "data": {
    "user_id": "uuid",
    "deleted_at": "2026-03-20T00:00:00Z"
  }
}
```

**エラーケース**
- 403: 操作者がadminでない
- 409: 対象がadminかつ他にadminがいない

---

#### GET /api/organizations/:orgId/me

自分のメンバー情報を取得する。ログイン直後のロール判定やパスワード変更要否の確認に使用。

**レスポンス** `200 OK`
```json
{
  "data": {
    "user_id": "uuid",
    "org_id": "uuid",
    "display_name": "山田太郎",
    "role": "admin",
    "require_password_change": false
  }
}
```

---

#### PATCH /api/organizations/:orgId/me/password-changed

Supabase Authでパスワード変更完了後に呼び出し、`require_password_change` を `false` に更新する。

**レスポンス** `200 OK`
```json
{
  "data": {
    "require_password_change": false
  }
}
```

---

#### POST /api/organizations/:orgId/expenses

経費を申請する。

**リクエスト**
```json
{
  "amount": 1500,
  "purpose": "交通費（東京-大阪）",
  "usage_date": "2026-03-15",
  "receipt_url": "https://xxx.supabase.co/storage/v1/object/public/receipts/original/xxx.jpg",
  "receipt_thumbnail_url": "https://xxx.supabase.co/storage/v1/object/public/receipts/thumbnail/xxx.jpg",
  "comment": "出張のため"
}
```

**備考**: レシート画像のアップロードはクライアントからSupabase Storageに直接行い、取得したURLをこのAPIに渡す。サムネイル生成はクライアント側またはSupabase Edge Functionで行う。

**レスポンス** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "amount": 1500,
    "purpose": "交通費（東京-大阪）",
    "usage_date": "2026-03-15",
    "receipt_url": "...",
    "receipt_thumbnail_url": "...",
    "comment": "出張のため",
    "status": "pending",
    "created_at": "2026-03-20T10:00:00Z"
  }
}
```

**エラーケース**
- 400: 必須項目の不足、金額が0以下

**副作用**
- `expense_status_logs` に初回ステータス（new_status: pending）を記録
- 組織内の全承認者に `new_expense` 通知を作成

---

#### GET /api/organizations/:orgId/expenses

経費一覧を取得する。ロールに応じて返却範囲が異なる。

**クエリパラメータ**
- `status` : フィルター（pending, approved, rejected, deleted）。カンマ区切りで複数指定可
- `date_from` : 使用日の開始日（YYYY-MM-DD）
- `date_to` : 使用日の終了日（YYYY-MM-DD）
- `limit` : 取得件数（デフォルト: 20）
- `cursor` : ページネーションカーソル

**ロール別の返却範囲**
- `user` : 自分の申請のみ
- `approver` / `admin` : 組織内全メンバーの申請

**レスポンス** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "amount": 1500,
      "purpose": "交通費（東京-大阪）",
      "usage_date": "2026-03-15",
      "receipt_thumbnail_url": "...",
      "comment": "出張のため",
      "status": "pending",
      "applicant": {
        "user_id": "uuid",
        "display_name": "田中花子"
      },
      "created_at": "2026-03-20T10:00:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "uuid-or-null",
    "has_more": true
  }
}
```

---

#### GET /api/organizations/:orgId/expenses/:expenseId

経費詳細を取得する。

**レスポンス** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "amount": 1500,
    "purpose": "交通費（東京-大阪）",
    "usage_date": "2026-03-15",
    "receipt_url": "...",
    "receipt_thumbnail_url": "...",
    "comment": "出張のため",
    "status": "approved",
    "applicant": {
      "user_id": "uuid",
      "display_name": "田中花子"
    },
    "approved_by": {
      "user_id": "uuid",
      "display_name": "山田太郎"
    },
    "approved_at": "2026-03-21T09:00:00Z",
    "rejected_by": null,
    "rejected_at": null,
    "rejection_comment": null,
    "created_at": "2026-03-20T10:00:00Z",
    "updated_at": "2026-03-21T09:00:00Z"
  }
}
```

**アクセス制御**
- `user` ロール: 自分の申請のみ閲覧可
- `approver` / `admin` ロール: 組織内の全申請を閲覧可

---

#### PATCH /api/organizations/:orgId/expenses/:expenseId

却下された経費を編集する（再申請前の内容更新）。

**リクエスト**
```json
{
  "amount": 1500,
  "purpose": "交通費（東京-大阪）修正",
  "usage_date": "2026-03-15",
  "receipt_url": "...",
  "receipt_thumbnail_url": "...",
  "comment": "金額を修正しました"
}
```

**レスポンス** `200 OK`（更新後の経費オブジェクト）

**エラーケース**
- 403: 申請者本人でない
- 400: ステータスが `rejected` でない

---

#### POST /api/organizations/:orgId/expenses/:expenseId/approve

経費を承認する。

**リクエスト**: なし（ボディ不要）

**レスポンス** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "status": "approved",
    "approved_by": {
      "user_id": "uuid",
      "display_name": "山田太郎"
    },
    "approved_at": "2026-03-21T09:00:00Z"
  }
}
```

**エラーケース**
- 403: approver / admin ロールでない
- 403: 自分自身の申請を承認しようとした
- 400: ステータスが `pending` でない

**副作用**
- `expense_status_logs` に記録
- 申請者に `approved` 通知を作成

---

#### POST /api/organizations/:orgId/expenses/:expenseId/reject

経費を却下する。

**リクエスト**
```json
{
  "comment": "領収書の日付が不明です。再確認をお願いします。"
}
```

**レスポンス** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "status": "rejected",
    "rejected_by": {
      "user_id": "uuid",
      "display_name": "山田太郎"
    },
    "rejected_at": "2026-03-21T09:00:00Z",
    "rejection_comment": "領収書の日付が不明です。再確認をお願いします。"
  }
}
```

**エラーケース**
- 403: approver / admin ロールでない
- 403: 自分自身の申請を却下しようとした
- 400: ステータスが `pending` でない
- 400: コメントが空

**副作用**
- `expense_status_logs` に記録（コメント含む）
- 申請者に `rejected` 通知を作成

---

#### POST /api/organizations/:orgId/expenses/:expenseId/withdraw

経費を取り下げる（論理削除）。

**リクエスト**: なし

**レスポンス** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "status": "deleted"
  }
}
```

**エラーケース**
- 403: 申請者本人でない
- 400: ステータスが `pending` でない

**副作用**
- `expense_status_logs` に記録

---

#### POST /api/organizations/:orgId/expenses/:expenseId/resubmit

却下された経費を再申請する。事前にPATCHで内容を更新してから呼び出す。

**リクエスト**: なし（内容の更新はPATCHで事前に行う）

**レスポンス** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "status": "pending",
    "rejected_by": null,
    "rejected_at": null,
    "rejection_comment": null
  }
}
```

**エラーケース**
- 403: 申請者本人でない
- 400: ステータスが `rejected` でない

**副作用**
- `rejected_by`、`rejected_at`、`rejection_comment` をNULLにクリア
- `expense_status_logs` に記録
- 組織内の全承認者に `resubmitted` 通知を作成

---

#### GET /api/organizations/:orgId/expenses/csv

CSV出力用のデータを取得する。クライアント側でCSVファイルを生成する。

**クエリパラメータ**
- `ids` : 出力対象の経費IDリスト（カンマ区切り）

**レスポンス** `200 OK`
```json
{
  "data": [
    {
      "amount": 1500,
      "purpose": "交通費（東京-大阪）",
      "usage_date": "2026-03-15",
      "receipt_url": "...",
      "comment": "出張のため",
      "applicant_name": "田中花子",
      "created_at": "2026-03-20T10:00:00Z",
      "approver_name": "山田太郎",
      "approved_at": "2026-03-21T09:00:00Z",
      "rejector_name": null,
      "rejected_at": null
    }
  ]
}
```

**エラーケース**
- 403: approver / admin ロールでない

---

#### GET /api/organizations/:orgId/notifications

通知一覧を取得する。

**クエリパラメータ**
- `limit` : 取得件数（デフォルト: 20）
- `cursor` : ページネーションカーソル

**レスポンス** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "new_expense",
      "message": "田中花子が経費申請を提出しました",
      "expense_id": "uuid",
      "is_read": false,
      "created_at": "2026-03-20T10:00:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "uuid-or-null",
    "has_more": true
  }
}
```

---

#### GET /api/organizations/:orgId/notifications/unread-count

未読通知件数を取得する。ヘッダーのバッジ表示用。

**レスポンス** `200 OK`
```json
{
  "data": {
    "count": 3
  }
}
```

---

#### PATCH /api/organizations/:orgId/notifications/:notificationId/read

通知を既読にする。

**レスポンス** `200 OK`
```json
{
  "data": {
    "id": "uuid",
    "is_read": true
  }
}
```

---

#### PATCH /api/organizations/:orgId/notifications/read-all

ユーザーの全通知を既読にする。

**レスポンス** `200 OK`
```json
{
  "data": {
    "updated_count": 5
  }
}
```

---

## 3. セキュリティ設計

### 3.1 認証

- 全APIエンドポイントでSupabase AuthのJWTトークンを検証する
- サーバーサイドでは `supabase.auth.getUser()` でトークンの有効性とユーザーIDを取得する
- トークンの検証失敗時は 401 を返す

### 3.2 認可（アプリケーション層）

API層で以下の認可チェックを実装する:

1. **組織所属チェック**: リクエスト対象の `orgId` に対して、JWTのユーザーIDが `organization_members` にアクティブメンバーとして存在するか
2. **ロールチェック**: 各エンドポイントの必要ロールをメンバーのロールが満たすか（包含関係: admin > approver > user）
3. **所有者チェック**: 経費の編集・取り下げは申請者本人のみ
4. **自己操作制限**: 自分の申請は承認/却下不可、自分のロールは変更不可

### 3.3 Row Level Security (RLS)

#### 基本方針

- publicスキーマの全テーブルでRLSを有効化する
- RLSポリシーの条件で参照するカラム（organization_id, user_id等）にはインデックスを付与してパフォーマンスを確保する
- ポリシーの条件判定を再利用可能なSQL関数として抽出する
- 「自分の申請は自分で承認できない」「自分のロールは自分で変更できない」等のビジネスルールはRLSだけでは完全に表現できないため、アプリケーションレベル（API Route）で制御する

#### ヘルパー関数

```sql
-- 指定した組織に所属しているか判定する関数
CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND deleted_at IS NULL
  )
$$;

-- 指定した組織での自分のロールを取得する関数
CREATE OR REPLACE FUNCTION public.get_my_role(org_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1
$$;

-- 指定した組織で管理者かどうか判定する関数
CREATE OR REPLACE FUNCTION public.is_admin_of(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT public.get_my_role(org_id) = 'admin'
$$;

-- 指定した組織で承認者以上かどうか判定する関数
CREATE OR REPLACE FUNCTION public.is_approver_or_above(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT public.get_my_role(org_id) IN ('admin', 'approver')
$$;
```

#### organizations テーブル

```sql
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 所属メンバーのみ組織情報を参照可能
CREATE POLICY "organizations_select"
  ON public.organizations FOR SELECT
  USING (public.is_member_of(id));

-- 組織作成は認証済みユーザーなら誰でも可能
CREATE POLICY "organizations_insert"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 組織情報の更新は管理者のみ
CREATE POLICY "organizations_update"
  ON public.organizations FOR UPDATE
  USING (public.is_admin_of(id));
```

#### organization_members テーブル

```sql
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 同じ組織のメンバーを参照可能
CREATE POLICY "org_members_select"
  ON public.organization_members FOR SELECT
  USING (public.is_member_of(org_id));

-- メンバー追加は管理者のみ（組織作成時の自身の追加はサーバーサイドで行う）
CREATE POLICY "org_members_insert"
  ON public.organization_members FOR INSERT
  WITH CHECK (public.is_admin_of(org_id));

-- メンバー情報の更新（ロール変更、論理削除等）は管理者のみ
CREATE POLICY "org_members_update"
  ON public.organization_members FOR UPDATE
  USING (public.is_admin_of(org_id));
```

**補足**: 組織作成時に作成者自身をadminとしてorganization_membersに追加する処理は、RLSの循環依存を回避するため、サーバーサイド（API Route）でservice_roleキーを使って実行する。

#### expenses テーブル

```sql
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 参照: 承認者以上は組織内全件、使用者は自分の申請のみ
CREATE POLICY "expenses_select"
  ON public.expenses FOR SELECT
  USING (
    public.is_member_of(org_id)
    AND (
      public.is_approver_or_above(org_id)
      OR applicant_user_id = auth.uid()
    )
  );

-- 申請: 組織メンバーが自分自身として申請可能
CREATE POLICY "expenses_insert"
  ON public.expenses FOR INSERT
  WITH CHECK (
    public.is_member_of(org_id)
    AND applicant_user_id = auth.uid()
  );

-- 更新: 申請者本人（再申請・取り下げ）または承認者以上（承認・却下）
CREATE POLICY "expenses_update"
  ON public.expenses FOR UPDATE
  USING (
    public.is_member_of(org_id)
    AND (
      applicant_user_id = auth.uid()
      OR public.is_approver_or_above(org_id)
    )
  );
```

#### expense_status_logs テーブル

```sql
ALTER TABLE public.expense_status_logs ENABLE ROW LEVEL SECURITY;

-- 参照: 同じ組織の経費に紐づくログのみ
CREATE POLICY "expense_status_logs_select"
  ON public.expense_status_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id
        AND public.is_member_of(e.org_id)
    )
  );

-- 作成: サーバーサイドのみ（service_role経由）
CREATE POLICY "expense_status_logs_insert"
  ON public.expense_status_logs FOR INSERT
  WITH CHECK (false);
```

#### notifications テーブル

```sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 参照: 自分宛の通知のみ
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- 作成: サーバーサイド（トリガーまたはservice_role）から作成
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (false);

-- 更新: 自分宛の通知の既読フラグのみ
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());
```

#### RLSパフォーマンス用インデックス

```sql
-- organization_membersの複合インデックス（RLSヘルパー関数で頻繁に参照）
CREATE INDEX idx_org_members_rls_lookup
  ON public.organization_members (org_id, user_id)
  WHERE deleted_at IS NULL;
```

### 3.4 データ保護

- パスワードはSupabase Authが管理（アプリケーション側で平文保存しない）
- レシート写真は公開URLで管理する（仕様に基づく）。将来的にSigned URLへの移行を検討可能
- API Routeではサーバーサイドの `supabase` クライアント（service_role key）を使用し、RLSをバイパスする場合がある。その場合はアプリケーション層の認可チェックで補完する

---

## 4. マイグレーション計画

### 4.1 実行順序

テーブル間の依存関係に基づき、以下の順序でマイグレーションを実行する。

| # | マイグレーション | 内容 | 依存 |
|---|-----------------|------|------|
| 1 | `001_create_organizations` | organizations テーブル作成 | なし |
| 2 | `002_create_organization_members` | organization_members テーブル作成 + インデックス | organizations, auth.users |
| 3 | `003_create_expenses` | expenses テーブル作成 + インデックス | organization_members |
| 4 | `004_create_expense_status_logs` | expense_status_logs テーブル作成 + インデックス | expenses |
| 5 | `005_create_notifications` | notifications テーブル作成 + インデックス | organizations, expenses |
| 6 | `006_create_updated_at_trigger` | updated_at 自動更新トリガー関数 + 各テーブルへのトリガー設定 | 全テーブル作成後 |

### 4.2 ロールバック方針

各マイグレーションは可逆的に設計する。ロールバック時は逆順に `DROP TABLE ... CASCADE` および `DROP FUNCTION` を実行する。

---

## 5. パフォーマンス考慮事項

### 5.1 想定クエリパターンとインデックス戦略

| クエリパターン | 対応インデックス | 想定頻度 |
|---------------|----------------|---------|
| 組織内のアクティブメンバー一覧 | `idx_org_members_active` | 中（管理画面） |
| ユーザーの所属組織一覧 | `idx_org_members_by_user` | 高（ログイン時） |
| 申請者の自分の経費一覧 | `idx_expenses_applicant` | 高 |
| 承認者の組織内経費一覧（ステータス別） | `idx_expenses_org_status` | 高 |
| 日付範囲フィルター | `idx_expenses_org_usage_date` | 中（CSV出力時） |
| ユーザーの未読通知 | `idx_notifications_user_unread` | 高（ページ表示毎） |
| ユーザーの通知一覧 | `idx_notifications_user_all` | 中 |

### 5.2 非正規化の判断

`expenses` テーブルに `approved_by`、`approved_at`、`rejected_by`、`rejected_at`、`rejection_comment` を持たせている（`expense_status_logs` にも同等情報がある）。これは以下の理由による非正規化:

- CSV出力時に毎回ステータス履歴テーブルをJOINする必要がなくなる
- 経費詳細画面での表示が単一テーブル参照で完結する
- 承認/却下は各1回のみなので、非正規化による不整合リスクが低い

### 5.3 スケーリング方針

- 想定規模（数人~数十人）では、上記のインデックス設計で十分なパフォーマンスを確保できる
- 将来的にデータ量が増加した場合:
  - `expenses` テーブルに対する `usage_date` ベースのパーティショニングを検討
  - `notifications` テーブルの古いレコードのアーカイブを検討
  - 読み取り負荷が高い場合はSupabaseのRead Replicaの活用を検討

---

## 6. DB操作関数の配置

`src/lib/db/` ディレクトリに以下のモジュール構成で配置する。

```
src/lib/db/
  organizations.ts    -- 組織のCRUD
  members.ts          -- 組織メンバーのCRUD
  expenses.ts         -- 経費のCRUD + ステータス遷移
  notifications.ts    -- 通知のCRUD
  types.ts            -- 共通の型定義
```

各モジュールはSupabase Client SDKを使用してDBにアクセスし、API Routeハンドラから呼び出される。アプリケーションコードが直接SQLやSupabaseクエリを発行することはない。

---

## 7. Supabase Auth連携

### 7.1 auth.usersとアプリケーションテーブルの関係

```
auth.users (Supabase Auth管理)
  └─ id (UUID) ←── organization_members.user_id
                    expenses.applicant_user_id
                    expenses.approved_by
                    expenses.rejected_by
                    notifications.user_id
```

- `auth.users`テーブルはSupabase Authが管理するため、直接編集しない
- アプリケーション固有のユーザー情報（表示名、ロール等）は`organization_members`テーブルで管理する
- 1人のユーザー（auth.users）が複数の`organization_members`レコードを持ち得る（複数組織所属）

### 7.2 管理者によるユーザー作成

サーバーサイド（API Route）から`supabase.auth.admin.createUser()`を使用する。service_roleキーが必要なため、クライアント側には公開しない。

処理フロー:
1. Supabase Auth Admin APIでメールアドレスを検索
2. 存在しない場合: `supabase.auth.admin.createUser()` でアカウント作成（`email_confirm: true`で確認スキップ）
3. 存在する場合: 既存のauth.usersのIDを使用
4. `organization_members` にレコードを挿入（`require_password_change` は新規ユーザーなら`true`、既存ユーザーなら`false`）
5. 招待テキストを生成してレスポンスに含める

### 7.3 組織作成時の初期管理者登録

RLSの循環依存を回避するため、サーバーサイドでservice_roleキーを使って実行する。

1. ユーザーが汎用ページから組織作成リクエスト
2. API Routeがservice_roleキーでorganizationsにINSERT
3. 同トランザクションでorganization_membersに作成者をadminとしてINSERT
4. `require_password_change = false`（自分で登録したため）

---

## 8. Storage設計

### 8.1 バケット構成

| バケット名 | 公開設定 | 用途 |
|-----------|---------|------|
| receipts | public | レシート写真（オリジナル＋サムネイル） |

### 8.2 ファイルパス規則

```
receipts/
  └─ {organization_id}/
      └─ {expense_id}/
          ├─ original.{ext}      （オリジナル画像）
          └─ thumbnail.{ext}     （サムネイル画像: 長辺300px）
```

- 再申請でレシートを差し替える場合は同パスに上書きアップロードする

### 8.3 Storage RLSポリシー

```sql
-- バケット作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true);

-- アップロード: 認証済みユーザーのみ
CREATE POLICY "receipts_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid() IS NOT NULL
  );

-- 更新（差し替え）: 認証済みユーザーのみ
CREATE POLICY "receipts_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'receipts'
    AND auth.uid() IS NOT NULL
  );
```

### 8.4 サムネイル生成

クライアントサイド（Canvas API）で生成する。サーバー負荷なし、追加コスト不要。

アップロードフロー:
1. ユーザーがレシート画像を選択
2. クライアントサイドでCanvas APIを使ってサムネイル（長辺300px）を生成
3. オリジナル画像とサムネイル画像をそれぞれSupabase Storageにアップロード
4. 両方のURLをexpensesテーブルに保存

---

## 9. 通知トリガー

### 9.1 Database Triggerによる自動生成

通知レコードの作成はPostgreSQLのトリガー関数で自動化する。

```sql
CREATE OR REPLACE FUNCTION public.create_expense_notification()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_applicant_name TEXT;
BEGIN
  -- 新規申請（INSERT）または再申請（UPDATE: rejected → pending）
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
     OR (TG_OP = 'UPDATE' AND OLD.status = 'rejected' AND NEW.status = 'pending') THEN
    SELECT display_name INTO v_applicant_name
    FROM public.organization_members
    WHERE org_id = NEW.org_id
      AND user_id = NEW.applicant_user_id
      AND deleted_at IS NULL;

    INSERT INTO public.notifications (org_id, user_id, expense_id, type, message)
    SELECT
      NEW.org_id,
      om.user_id,
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN 'new_expense' ELSE 'resubmitted' END,
      CASE WHEN TG_OP = 'INSERT'
        THEN v_applicant_name || 'が経費申請を提出しました'
        ELSE v_applicant_name || 'が経費申請を再提出しました'
      END
    FROM public.organization_members om
    WHERE om.org_id = NEW.org_id
      AND om.role IN ('admin', 'approver')
      AND om.deleted_at IS NULL
      AND om.user_id != NEW.applicant_user_id;
  END IF;

  -- 承認
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
    INSERT INTO public.notifications (org_id, user_id, expense_id, type, message)
    VALUES (NEW.org_id, NEW.applicant_user_id, NEW.id, 'approved', '経費申請が承認されました');
  END IF;

  -- 却下
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (org_id, user_id, expense_id, type, message)
    VALUES (NEW.org_id, NEW.applicant_user_id, NEW.id, 'rejected', '経費申請が却下されました');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_notification
  AFTER INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.create_expense_notification();
```

---

## 10. Realtime・Edge Functions

### 10.1 Realtime

初期リリースでは使用しない。30秒間隔のポーリングで通知を取得する。小規模で即時性要件が低いため。

将来的に規模が拡大した場合、Supabase Realtime（Broadcastチャネル）への移行を検討する。

### 10.2 Edge Functions

初期リリースでは使用しない。Next.js API Routeで全てのサーバーサイド処理を賄う。

将来的にメール通知機能やDatabase Webhooks連携が必要になった場合に検討する。

---

## 11. 環境変数

| 変数名 | 説明 | 使用箇所 |
|--------|------|---------|
| NEXT_PUBLIC_SUPABASE_URL | SupabaseプロジェクトのURL | クライアント・サーバー共通 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabaseの匿名キー（公開可） | クライアント側 |
| SUPABASE_SERVICE_ROLE_KEY | Supabaseのサービスロールキー（秘匿） | サーバーサイドのみ |

注意:
- `NEXT_PUBLIC_`プレフィックスが付いた変数はクライアント側に公開される
- `SUPABASE_SERVICE_ROLE_KEY`はRLSをバイパスするため、サーバーサイド（API Route）でのみ使用
- Vercelへのデプロイ時はVercelの環境変数設定で値を設定
- ローカル開発では`.env.local`に設定（`.gitignore`に含まれていることを確認）
