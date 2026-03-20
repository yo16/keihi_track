/**
 * GET /api/organizations/[orgId]/notifications - 通知一覧を取得する
 * 認証 + メンバーチェック
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail } from "@/lib/auth/guard";
import { getNotifications } from "@/lib/db/notifications";

/** GET: 通知一覧を取得 */
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

    // 2. 組織メンバーチェック
    await getMemberOrFail(supabase, orgId, user.id);

    // 3. クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const cursor = searchParams.get("cursor") ?? undefined;

    // 4. DB操作: 通知一覧を取得
    const result = await getNotifications(
      supabase,
      orgId,
      user.id,
      limit,
      cursor
    );

    // 5. レスポンス返却
    return NextResponse.json(result);
  }
);
