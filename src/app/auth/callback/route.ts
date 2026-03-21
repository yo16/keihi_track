/**
 * GET /auth/callback
 * Supabase Auth コールバック（Server-side）
 * 招待メールのリンククリック後にリダイレクトされるRoute Handler。
 * PKCEフローの code をセッションに交換し、
 * user_metadataの org_id を取得して set-password ページへ転送する。
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("セッション交換エラー:", error);
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent("認証処理中にエラーが発生しました")}`
      );
    }

    if (data.user) {
      const orgId = data.user.user_metadata?.org_id;

      if (orgId) {
        // 招待ユーザー: パスワード設定ページへ
        return NextResponse.redirect(`${origin}/${orgId}/set-password`);
      }
    }
  }

  // codeがない or orgIdが取得できない場合はトップページへ
  return NextResponse.redirect(`${origin}/`);
}
