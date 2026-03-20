/**
 * Next.js ミドルウェア
 * 全リクエストに対してSupabase Authのセッションリフレッシュを実行する
 * Edge Runtimeで動作するため、Node.js専用モジュールは使用不可
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    // エラーをサイレントに握りつぶさず、必ずログ出力する
    console.error("ミドルウェアでエラーが発生しました:", error);
    throw error;
  }
}

// 静的ファイルをミドルウェアの対象外にする
export const config = {
  matcher: [
    /*
     * 以下のパスで始まるリクエストを除外する:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico (ファビコン)
     * - 画像ファイル（svg, png, jpg, jpeg, gif, webp）
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
