/**
 * GET /auth/callback
 * Supabase Auth コールバック（Server-side）
 *
 * 2つのフローに対応:
 * 1. PKCEフロー: ?code=xxx → exchangeCodeForSession
 * 2. 招待メール（メールテンプレート変更後）: ?token_hash=xxx&type=invite → verifyOtp
 *
 * redirect_to パラメータがあればそこへ、なければトップページへリダイレクト。
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const redirectTo = searchParams.get("redirect_to") || "/";

  const supabase = await createClient();

  // フロー1: PKCEフロー（code パラメータ）
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("セッション交換エラー:", error);
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent("認証処理中にエラーが発生しました")}`
      );
    }

    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // フロー2: 招待メールのtoken_hash（メールテンプレートでPKCEフローに変更後）
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email",
    });

    if (error) {
      console.error("トークン検証エラー:", error);
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent("招待リンクが無効または期限切れです。管理者に再度招待を依頼してください。")}`
      );
    }

    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // どちらのパラメータもない場合はトップページへ
  return NextResponse.redirect(`${origin}/`);
}
