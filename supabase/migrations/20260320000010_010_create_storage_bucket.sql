-- 010: receipts バケット作成 + Storage RLS ポリシー

-- バケット作成（既に存在する場合はスキップ）
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 参照: 認証済みユーザーのみ（upsert時のファイル存在確認に必要）
CREATE POLICY "receipts_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.uid() IS NOT NULL
  );

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
