/**
 * PATCH /api/organizations/[orgId]/me/password-changed
 * パスワード変更完了を記録する
 * 認証 + メンバーチェック
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail } from "@/lib/auth/guard";
import { markPasswordChanged } from "@/lib/db/members";

export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    const { orgId } = await context.params;

    // 1. 認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ApiError(401, "UNAUTHORIZED", "認証が必要です");
    }

    // 2. 組織メンバーチェック
    await getMemberOrFail(supabase, orgId, user.id);

    // 3. DB操作: パスワード変更済みフラグを更新
    await markPasswordChanged(supabase, orgId, user.id);

    // 4. レスポンス返却
    return NextResponse.json({ data: { success: true } });
  }
);
