/**
 * GET /api/me - 自分のメンバー情報を取得する
 * 認証チェック + getMemberOrFailでorgIdを自動特定
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail } from "@/lib/auth/guard";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // 1. 認証チェック
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ApiError(401, "UNAUTHORIZED", "認証が必要です");
  }

  // 2. 組織メンバーチェック（userIdのみで検索、orgIdは戻り値から取得）
  const member = await getMemberOrFail(supabase, user.id);

  // 3. レスポンス返却（必要なフィールドのみ返す）
  return NextResponse.json({
    data: {
      user_id: member.user_id,
      org_id: member.org_id,
      display_name: member.display_name,
      role: member.role,
    },
  });
});
