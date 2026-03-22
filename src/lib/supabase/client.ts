/**
 * ブラウザ用Supabaseクライアント
 * クライアントサイド（React コンポーネント等）から使用する
 */
import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ環境用のSupabaseクライアントを生成する
 * シングルトンではなく、呼び出しごとに新しいクライアントを返す
 * （@supabase/ssr が内部でキャッシュを管理する）
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // 環境変数が未設定の場合、実行時に明確なエラーを出す
  if (!supabaseUrl) {
    throw new Error(
      "環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません。.env.local を確認してください。"
    );
  }
  if (!supabaseKey) {
    throw new Error(
      "環境変数 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY が設定されていません。.env.local を確認してください。"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
