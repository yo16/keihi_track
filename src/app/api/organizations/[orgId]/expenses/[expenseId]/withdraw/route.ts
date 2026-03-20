/**
 * POST /api/organizations/[orgId]/expenses/[expenseId]/withdraw - 経費を取り下げる
 * 認証 + メンバーチェック（申請者本人のみ）
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail } from "@/lib/auth/guard";
import { withdrawExpense } from "@/lib/db/expenses";

/** POST: 経費を取り下げ */
export const POST = withErrorHandler(
  async (
    _request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    const { orgId, expenseId } = await context.params;

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

    // 3. DB操作: 経費を取り下げ（本人チェックはDB関数内で実行）
    const expense = await withdrawExpense(supabase, orgId, expenseId, user.id);

    // 4. レスポンス返却
    return NextResponse.json({ data: expense });
  }
);
