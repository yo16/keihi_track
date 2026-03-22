# Supabase Storage の RLS ポリシー設計

## 適用条件
- Supabase Storage を使用している
- RLS（Row Level Security）を有効にしてアクセス制御を行う

## 制約・注意点

### upsert には SELECT + INSERT + UPDATE の3ポリシーが必要
- `supabase.storage.from("bucket").upload(path, file, { upsert: true })` は内部的に以下を実行する:
  1. **SELECT** — ファイルの存在確認
  2. **INSERT** （新規）または **UPDATE**（上書き）— ファイルの書き込み
- INSERT ポリシーだけでは `upsert: true` 時にRLS違反（`new row violates row-level security policy`）が発生する
- **必ず SELECT / INSERT / UPDATE の3ポリシーを定義すること**

```sql
-- SELECT（upsertのファイル存在確認に必要）
CREATE POLICY "bucket_select" ON storage.objects FOR SELECT
USING (bucket_id = 'my_bucket' AND auth.uid() IS NOT NULL);

-- INSERT（新規アップロード）
CREATE POLICY "bucket_upload" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'my_bucket' AND auth.uid() IS NOT NULL);

-- UPDATE（上書きアップロード）
CREATE POLICY "bucket_update" ON storage.objects FOR UPDATE
USING (bucket_id = 'my_bucket' AND auth.uid() IS NOT NULL);
```

### `.from("bucket")` と upload パスの関係
- `.from("my_bucket").upload(path, file)` の `path` はバケット内の相対パス
- バケット名をパスに含めてはいけない
```
❌ .from("receipts").upload("receipts/org_id/file.jpg")  → パスが二重
✅ .from("receipts").upload("org_id/file.jpg")           → 正しい
```

### `storage.foldername()` による組織チェックは避ける
- RLSポリシーで `(storage.foldername(name))[1]::UUID` のようにパスからUUIDを抽出する方法は、型変換エラー（PostgreSQL error code `22P02`: invalid_text_representation）を引き起こす場合がある
- `@supabase/ssr` 環境で特に発生しやすい
- 代わりに `auth.uid() IS NOT NULL` でシンプルに認証チェックするか、`auth.jwt()->>'sub'` でユーザーIDベースの制御を行う

### public バケットのアクセス制御
- public バケットは**ダウンロード（GET）のみRLSをバイパス**する
- アップロード（INSERT）、更新（UPDATE）、削除（DELETE）は**RLSが適用される**
- public バケットでもアップロード用のRLSポリシーは必須

## テスト戦略
- Storage の RLS ポリシーはモックテストでは検証できない（Supabase側でSQLとして評価されるため）
- 手動テストまたはE2Eテストで、実際にファイルアップロードを行って検証すること
- チェックポイント:
  - 認証済みユーザーでアップロードが成功すること
  - 未認証状態でアップロードが拒否されること
  - `upsert: true` で上書きアップロードが成功すること

## 背景
Supabase Storage でレシート画像のアップロード機能を実装した際、INSERT ポリシーのみ定義して `upsert: true` でアップロードしたところ、RLS違反エラー（`new row violates row-level security policy`）が発生した。SELECT ポリシーが存在しなかったため、upsert 内部のファイル存在確認（SELECT）がRLSで拒否されていた。また当初は `storage.foldername(name)[1]::UUID` でパスから組織IDを抽出するポリシーを設定していたが、PostgreSQL の型変換エラー（22P02）が発生し、シンプルな `auth.uid() IS NOT NULL` チェックに変更した。Supabase公式ドキュメント（Storage Access Control）に「upsertにはSELECTとUPDATE権限が追加で必要」と明記されていたが、実装時に見落としていた。
