/**
 * サーバー用Supabaseクライアント
 * Server Components, Route Handlers, Server Actions から使用する
 * Cookie経由でセッションを管理する
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * サーバー環境用のSupabaseクライアントを生成する
 * Next.js の cookies() を使ってセッションCookieを読み書きする
 */
export async function createClient() {
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

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      // すべてのCookieを取得する
      getAll() {
        return cookieStore.getAll();
      },
      // Cookieを設定する（Server ComponentではsetAllが呼ばれても無視される場合がある）
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Componentからの呼び出し時はsetが使えないため、
          // エラーを無視する（セッションリフレッシュはMiddlewareが担当）
        }
      },
    },
  });
}
