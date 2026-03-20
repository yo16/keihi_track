-- 002: organization_members テーブル作成
-- 組織メンバー（ユーザーと組織の関連、ロール管理）

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
