-- 008: 全テーブルの RLS 有効化 + ポリシー作成 + RLS用インデックス

-- ============================================================
-- organizations テーブル
-- ============================================================
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

-- ============================================================
-- organization_members テーブル
-- ============================================================
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

-- ============================================================
-- expenses テーブル
-- ============================================================
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

-- ============================================================
-- expense_status_logs テーブル
-- ============================================================
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

-- ============================================================
-- notifications テーブル
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 参照: 自分宛かつ所属組織の通知のみ（複数組織所属時の組織間分離を保証）
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (
    user_id = auth.uid()
    AND public.is_member_of(org_id)
  );

-- 作成: サーバーサイド（トリガーまたはservice_role）から作成
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (false);

-- 更新: 自分宛かつ所属組織の通知の既読フラグのみ
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING (
    user_id = auth.uid()
    AND public.is_member_of(org_id)
  );

-- ============================================================
-- RLSパフォーマンス用インデックス
-- ============================================================

-- organization_membersの複合インデックス（RLSヘルパー関数で頻繁に参照）
CREATE INDEX idx_org_members_rls_lookup
  ON public.organization_members (org_id, user_id)
  WHERE deleted_at IS NULL;
