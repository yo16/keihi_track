/**
 * GET /api/organizations/[orgId]/notifications/unread-count - 未読通知件数を取得する
 * 認証 + メンバーチェック
 */
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { ApiError, withErrorHandler } from "@/lib/api/error";
import { getMemberOrFail } from "@/lib/auth/guard";
import { getUnreadCount } from "@/lib/db/notifications";

/** GET: 未読通知件数を取得 */
export const GET = withErrorHandler(
  async (
    _request: NextRequest,
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

    // 3. DB操作: 未読件数を取得
    const result = await getUnreadCount(supabase, orgId, user.id);

    // 4. レスポンス返却
    return NextResponse.json({ data: result });
  }
);
