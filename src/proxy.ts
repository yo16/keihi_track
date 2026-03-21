/**
 * Next.js Proxy（旧middleware）
 * 全リクエストに対してSupabase Authのセッションリフレッシュを実行する
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export default async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    // エラーをサイレントに握りつぶさず、必ずログ出力する
    console.error("プロキシでエラーが発生しました:", error);
    throw error;
  }
}
