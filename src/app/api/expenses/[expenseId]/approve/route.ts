/**
 * POST /api/expenses/[expenseId]/approve - 経費を承認する
 * 認証 + approver以上チェック
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail, requireRole } from "@/lib/auth/guard";
import { approveExpense } from "@/lib/db/expenses";
import { notifyApproved } from "@/lib/email/send-notification";

/** POST: 経費を承認 */
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

    // 2. 組織メンバー + approver以上ロールチェック、orgIdを取得
    const currentMember = await getMemberOrFail(supabase, user.id);
    requireRole(currentMember, "approver");
    const orgId = currentMember.org_id;

    // 3. リクエストボディからコメントを取得（任意）
    let comment: string | null = null;
    try {
      const body = await request.json();
      if (body?.comment && typeof body.comment === "string") {
        comment = body.comment.trim() || null;
      }
    } catch {
      // ボディなしの場合は無視（後方互換）
    }

    // 4. DB操作: 経費を承認
    const expense = await approveExpense(supabase, orgId, expenseId, user.id, comment);

    // 5. メール通知: 申請者に承認を通知（fire-and-forget）
    notifyApproved(orgId, expenseId, expense.applicant_user_id).catch((err) => {
      console.error("[メール通知エラー] 承認通知の送信に失敗:", err);
    });

    // 6. レスポンス返却
    return NextResponse.json({ data: expense });
  }
);
