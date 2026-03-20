/**
 * GET /api/organizations/[orgId]/expenses/[expenseId] - 経費詳細を取得する
 * 認証 + メンバーチェック + ロール別アクセス制御
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail } from "@/lib/auth/guard";
import { getExpense } from "@/lib/db/expenses";

/** GET: 経費詳細を取得 */
export const GET = withErrorHandler(
  async (
    request: NextRequest,
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

    // 2. 組織メンバーチェック（ロール情報を取得）
    const currentMember = await getMemberOrFail(supabase, orgId, user.id);

    // 3. DB操作: 経費詳細を取得
    const expense = await getExpense(supabase, orgId, expenseId);

    // 4. ロール別アクセス制御: userロールは自分の申請のみ閲覧可能
    if (
      currentMember.role === "user" &&
      expense.applicant.user_id !== user.id
    ) {
      throw new ApiError(403, "FORBIDDEN", "この経費へのアクセス権がありません");
    }

    // 5. レスポンス返却
    return NextResponse.json({ data: expense });
  }
);
