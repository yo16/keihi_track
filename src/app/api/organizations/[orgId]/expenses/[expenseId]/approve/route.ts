/**
 * POST /api/organizations/[orgId]/expenses/[expenseId]/approve - 経費を承認する
 * 認証 + approver以上チェック
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail, requireRole } from "@/lib/auth/guard";
import { approveExpense } from "@/lib/db/expenses";

/** POST: 経費を承認 */
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

    // 2. 組織メンバー + approver以上ロールチェック
    const currentMember = await getMemberOrFail(supabase, orgId, user.id);
    requireRole(currentMember, "approver");

    // 3. DB操作: 経費を承認
    const expense = await approveExpense(supabase, orgId, expenseId, user.id);

    // 4. レスポンス返却
    return NextResponse.json({ data: expense });
  }
);
