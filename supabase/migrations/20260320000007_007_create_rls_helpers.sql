-- 007: RLS ヘルパー関数4つ
-- パラメータ名は _org_id を使用（カラム名衝突回避）

-- 指定した組織に所属しているか判定する関数
CREATE OR REPLACE FUNCTION public.is_member_of(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = _org_id
      AND user_id = auth.uid()
      AND deleted_at IS NULL
  )
$$;

-- 指定した組織での自分のロールを取得する関数
CREATE OR REPLACE FUNCTION public.get_my_role(_org_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.organization_members
  WHERE org_id = _org_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1
$$;

-- 指定した組織で管理者かどうか判定する関数
CREATE OR REPLACE FUNCTION public.is_admin_of(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT public.get_my_role(_org_id) = 'admin'
$$;

-- 指定した組織で承認者以上かどうか判定する関数
CREATE OR REPLACE FUNCTION public.is_approver_or_above(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT public.get_my_role(_org_id) IN ('admin', 'approver')
$$;
