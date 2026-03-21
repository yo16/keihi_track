/**
 * Supabaseセッションリフレッシュ（proxy.tsから呼び出される）
 * リクエストごとにセッショントークンを更新する
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * リクエストのセッションを更新する
 * proxy.tsから呼び出され、Supabase Authのセッションをリフレッシュする
 */
export async function updateSession(request: NextRequest) {
  // デフォルトのレスポンスを生成
  let supabaseResponse = NextResponse.next({
    request,
  });

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

  // ミドルウェア用のSupabaseクライアントを生成
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      // リクエストからCookieを取得する
      getAll() {
        return request.cookies.getAll();
      },
      // レスポンスにCookieを設定する
      setAll(cookiesToSet) {
        // リクエストにもCookieを設定（後続のServer Componentで参照可能にする）
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // 更新されたリクエストヘッダーで新しいレスポンスを生成
        supabaseResponse = NextResponse.next({
          request,
        });
        // レスポンスのCookieを設定
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // セッションのリフレッシュを実行する
  // getUser()を呼ぶことでトークンが自動的にリフレッシュされる
  const { error } = await supabase.auth.getUser();

  if (error) {
    // 無効なリフレッシュトークン等のエラー
    // （DBリセット後、セッション期限切れ、トークン無効化等で発生する）
    // エラーをthrowせず、Supabase関連Cookieをクリアして未認証状態で続行する
    const allCookies = request.cookies.getAll();
    const supabaseCookies = allCookies.filter((c) => c.name.startsWith("sb-"));

    if (supabaseCookies.length > 0) {
      supabaseCookies.forEach(({ name }) => request.cookies.delete(name));
      supabaseResponse = NextResponse.next({ request });
      supabaseCookies.forEach(({ name }) =>
        supabaseResponse.cookies.set(name, "", { maxAge: 0 })
      );
    }
  }

  return supabaseResponse;
}
