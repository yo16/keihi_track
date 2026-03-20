-- 003: expenses テーブル作成
-- 経費申請テーブル + インデックス + CHECK制約（自己承認防止）

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
    REFERENCES organization_members(org_id, user_id),
  -- 自分自身の申請は承認できない（DB層での保護）
  CHECK (approved_by IS NULL OR approved_by != applicant_user_id)
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
