/**
 * POST /api/organizations/[orgId]/expenses/csv - CSV出力用の経費データを取得する
 * 認証 + approver以上チェック
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail, requireRole } from "@/lib/auth/guard";
import { getExpensesForCsv } from "@/lib/db/expenses";

/** POST: CSV出力用の経費データを取得 */
export const POST = withErrorHandler(
  async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ) => {
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

    // 3. リクエストバリデーション（ids配列が必須）
    const body = await request.json();

    if (
      !body.ids ||
      !Array.isArray(body.ids) ||
      body.ids.length === 0 ||
      !body.ids.every((id: unknown) => typeof id === "string")
    ) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "idsは1つ以上の文字列を含む配列である必要があります"
      );
    }

    // 4. DB操作: CSV出力用データを取得
    const rows = await getExpensesForCsv(supabase, orgId, body.ids as string[]);

    // 5. レスポンス返却
    return NextResponse.json({ data: rows });
  }
);
