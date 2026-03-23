/**
 * Next.js Proxy（旧middleware）
 * 全リクエストに対してSupabase Authのセッションリフレッシュを実行する
 * PREVIEW_AUTH_PASSWORD設定時はBasic認証でアクセスを保護する
 */
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Preview環境用Basic認証チェック
 * 環境変数 PREVIEW_AUTH_PASSWORD が設定されている場合のみ有効
 * APIルートは対象外
 */
function checkBasicAuth(request: NextRequest): NextResponse | null {
  const password = process.env.PREVIEW_AUTH_PASSWORD;

  // 環境変数未設定なら素通り（本番環境）
  if (!password) return null;

  // APIルートは対象外
  if (request.nextUrl.pathname.startsWith("/api/")) return null;

  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [, pwd] = decoded.split(":");
      if (pwd === password) return null;
    }
  }

  // 認証失敗: 401を返してBasic認証ダイアログを表示
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Preview Environment"',
    },
  });
}

export default async function proxy(request: NextRequest) {
  try {
    // Basic認証チェック（Preview環境のみ）
    const authResponse = checkBasicAuth(request);
    if (authResponse) return authResponse;

    return await updateSession(request);
  } catch (error) {
    // エラーをサイレントに握りつぶさず、必ずログ出力する
    console.error("プロキシでエラーが発生しました:", error);
    throw error;
  }
}
