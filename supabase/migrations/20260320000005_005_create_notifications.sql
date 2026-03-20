-- 005: notifications テーブル作成
-- アプリ内通知テーブル + インデックス

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
