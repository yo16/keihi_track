/**
 * POST /api/organizations/[orgId]/expenses/[expenseId]/reject - 経費を却下する
 * 認証 + approver以上チェック + comment必須
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail, requireRole } from "@/lib/auth/guard";
import { rejectExpense } from "@/lib/db/expenses";
import { rejectExpenseSchema } from "@/lib/validators/expense";

/** POST: 経費を却下 */
export const POST = withErrorHandler(
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

    // 2. 組織メンバー + approver以上ロールチェック
    const currentMember = await getMemberOrFail(supabase, orgId, user.id);
    requireRole(currentMember, "approver");

    // 3. リクエストバリデーション（comment必須）
    const body = await request.json();
    const parsed = rejectExpenseSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((e) => e.message).join(", ");
      throw new ApiError(400, "VALIDATION_ERROR", message);
    }

    // 4. DB操作: 経費を却下
    const expense = await rejectExpense(
      supabase,
      orgId,
      expenseId,
      user.id,
      parsed.data.comment
    );

    // 5. レスポンス返却
    return NextResponse.json({ data: expense });
  }
);
