-- 001: organizations テーブル作成
-- 組織マスタテーブル

CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- org_idをURLパスに使うため、外部からの検索用
-- UUIDのPKインデックスで十分（URLパスにはUUIDをそのまま使用）
