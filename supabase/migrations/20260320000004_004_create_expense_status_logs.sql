-- 004: expense_status_logs テーブル作成
-- 経費ステータス変更履歴テーブル + インデックス + old_statusのCHECK制約

CREATE TABLE expense_status_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id    UUID NOT NULL REFERENCES expenses(id),
  changed_by    UUID NOT NULL,
  old_status    TEXT CHECK (old_status IS NULL OR old_status IN ('pending', 'approved', 'rejected', 'deleted')),
  new_status    TEXT NOT NULL CHECK (new_status IN ('pending', 'approved', 'rejected', 'deleted')),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 経費IDごとの履歴取得（時系列）
CREATE INDEX idx_expense_status_logs_expense
  ON expense_status_logs (expense_id, created_at);
