-- 010: receipts バケット作成 + Storage RLS ポリシー

-- バケット作成（既に存在する場合はスキップ）
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- アップロード: 認証済みユーザーかつ所属組織のパスのみ
-- ファイルパスは receipts/{org_id}/{expense_id}/filename の形式
CREATE POLICY "receipts_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid() IS NOT NULL
    AND public.is_member_of((storage.foldername(name))[1]::UUID)
  );

-- 更新（差し替え）: 認証済みユーザーかつ所属組織のパスのみ
CREATE POLICY "receipts_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'receipts'
    AND auth.uid() IS NOT NULL
    AND public.is_member_of((storage.foldername(name))[1]::UUID)
  );
