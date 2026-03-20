/**
 * POST /api/organizations/[orgId]/expenses - 経費を新規作成する
 * GET  /api/organizations/[orgId]/expenses - 経費一覧を取得する
 * 認証 + メンバーチェック
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail } from "@/lib/auth/guard";
import { createExpense, getExpenses } from "@/lib/db/expenses";
import { createExpenseSchema } from "@/lib/validators/expense";

/** POST: 経費を新規作成 */
export const POST = withErrorHandler(
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

    // 3. リクエストバリデーション
    const body = await request.json();
    const parsed = createExpenseSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues.map((e) => e.message).join(", ");
      throw new ApiError(400, "VALIDATION_ERROR", message);
    }

    // 4. DB操作: 経費を作成
    const expense = await createExpense(supabase, orgId, user.id, parsed.data);

    // 5. レスポンス返却
    return NextResponse.json({ data: expense }, { status: 201 });
  }
);

/** GET: 経費一覧を取得 */
export const GET = withErrorHandler(
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

    // 2. 組織メンバーチェック（ロール情報を取得）
    const currentMember = await getMemberOrFail(supabase, orgId, user.id);

    // 3. クエリパラメータからフィルター条件を取得
    const { searchParams } = new URL(request.url);
    const status = searchParams.getAll("status");
    const dateFrom = searchParams.get("date_from") ?? undefined;
    const dateTo = searchParams.get("date_to") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const cursor = searchParams.get("cursor") ?? undefined;

    // 4. DB操作: ロールに応じた経費一覧を取得
    const result = await getExpenses(supabase, orgId, user.id, currentMember.role, {
      status: status.length > 0 ? status : undefined,
      date_from: dateFrom,
      date_to: dateTo,
      limit,
      cursor,
    });

    // 5. レスポンス返却
    return NextResponse.json(result);
  }
);
