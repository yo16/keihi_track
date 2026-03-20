/**
 * 管理用Supabaseクライアント
 * service_roleキーを使用し、RLS（Row Level Security）をバイパスする
 * サーバーサイド専用 - クライアントサイドでは絶対に使用しないこと
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * 管理者権限のSupabaseクライアントを生成する
 * RLSをバイパスするため、管理系バッチ処理やシステム操作専用
 * 注意: このクライアントはサーバーサイドでのみ使用すること
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  // 環境変数が未設定の場合、実行時に明確なエラーを出す
  if (!supabaseUrl) {
    throw new Error(
      "環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません。.env.local を確認してください。"
    );
  }
  if (!supabaseSecretKey) {
    throw new Error(
      "環境変数 SUPABASE_SECRET_KEY が設定されていません。.env.local を確認してください。"
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      // 管理クライアントではブラウザのセッション永続化を無効にする
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
