/**
 * POST /api/organizations/[orgId]/expenses/[expenseId]/resubmit - 経費を再申請する
 * 認証 + メンバーチェック（申請者本人のみ）
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail } from "@/lib/auth/guard";
import { resubmitExpense } from "@/lib/db/expenses";
import { resubmitExpenseSchema } from "@/lib/validators/expense";
import { notifyResubmitted } from "@/lib/email/send-notification";

/** POST: 経費を再申請 */
export const POST = withErrorHandler(
  async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
    const { expenseId } = await context.params;

    // 1. 認証チェック
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ApiError(401, "UNAUTHORIZED", "認証が必要です");
    }

    // 2. 組織メンバーチェック（表示名をメール通知で使用）、orgIdを取得
    const currentMember = await getMemberOrFail(supabase, user.id);
    const orgId = currentMember.org_id;

    // 3. リクエストバリデーション
    const body = await request.json();
    const parsed = resubmitExpenseSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((e) => e.message).join(", ");
      throw new ApiError(400, "VALIDATION_ERROR", message);
    }

    // 4. DB操作: 経費を再申請（本人チェックはDB関数内で実行）
    const expense = await resubmitExpense(
      supabase,
      orgId,
      expenseId,
      user.id,
      parsed.data
    );

    // 5. メール通知: 承認者全員に再申請を通知（fire-and-forget）
    notifyResubmitted(orgId, currentMember.display_name).catch((err) => {
      console.error("[メール通知エラー] 再申請通知の送信に失敗:", err);
    });

    // 6. レスポンス返却
    return NextResponse.json({ data: expense });
  }
);
